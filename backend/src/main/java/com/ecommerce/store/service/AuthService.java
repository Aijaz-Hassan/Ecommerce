package com.ecommerce.store.service;

import com.ecommerce.store.dto.auth.AuthResponse;
import com.ecommerce.store.dto.auth.ForgotPasswordRequest;
import com.ecommerce.store.dto.auth.LoginRequest;
import com.ecommerce.store.dto.auth.RegisterRequest;
import com.ecommerce.store.dto.auth.ResetPasswordRequest;
import com.ecommerce.store.dto.auth.ResetTokenValidationResponse;
import com.ecommerce.store.dto.auth.UpdateProfileRequest;
import com.ecommerce.store.dto.auth.UserResponse;
import com.ecommerce.store.entity.PasswordResetToken;
import com.ecommerce.store.entity.User;
import com.ecommerce.store.exception.BadRequestException;
import com.ecommerce.store.repository.CartRepository;
import com.ecommerce.store.repository.OrderRepository;
import com.ecommerce.store.repository.PasswordResetTokenRepository;
import com.ecommerce.store.repository.PurchaseRepository;
import com.ecommerce.store.repository.UserRepository;
import com.ecommerce.store.security.JwtService;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final CartRepository cartRepository;
    private final OrderRepository orderRepository;
    private final PurchaseRepository purchaseRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordResetEmailSender emailService;
    private final SecureRandom secureRandom = new SecureRandom();
    private final Map<String, LocalDateTime> resetRequestTracker = new ConcurrentHashMap<>();
    private final String frontendUrl;
    private final int resetExpirationMinutes;
    private final int resetRateLimitMinutes;

    public AuthService(
        UserRepository userRepository,
        PasswordEncoder passwordEncoder,
        AuthenticationManager authenticationManager,
        JwtService jwtService,
        CartRepository cartRepository,
        OrderRepository orderRepository,
        PurchaseRepository purchaseRepository,
        PasswordResetTokenRepository passwordResetTokenRepository,
        PasswordResetEmailSender emailService,
        @Value("${app.frontend-url:http://localhost:5173}") String frontendUrl,
        @Value("${app.password-reset.expiration-minutes:15}") int resetExpirationMinutes,
        @Value("${app.password-reset.rate-limit-minutes:2}") int resetRateLimitMinutes
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.cartRepository = cartRepository;
        this.orderRepository = orderRepository;
        this.purchaseRepository = purchaseRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.emailService = emailService;
        this.frontendUrl = frontendUrl;
        this.resetExpirationMinutes = resetExpirationMinutes;
        this.resetRateLimitMinutes = resetRateLimitMinutes;
    }

    public AuthResponse register(RegisterRequest request) {
        String email = clean(request.getEmail()).toLowerCase();
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new BadRequestException("An account with this email already exists");
        }

        User user = new User();
        user.setFullName(request.getFullName());
        user.setName(email);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        boolean adminExists = userRepository.existsByRoleIn(List.of("ROLE_ADMIN", "ADMIN", "role_admin", "admin"));
        user.setRole(adminExists ? "ROLE_CUSTOMER" : "ROLE_ADMIN");

        User savedUser = userRepository.save(user);
        String token = jwtService.generateToken(
            org.springframework.security.core.userdetails.User.withUsername(savedUser.getEmail())
                .password(savedUser.getPassword())
                .roles(normalizeRole(savedUser.getRole()).replace("ROLE_", ""))
                .build(),
            Map.of("role", savedUser.getRole(), "fullName", savedUser.getFullName())
        );
        return new AuthResponse(token, toUserResponse(savedUser));
    }

    public AuthResponse login(LoginRequest request) {
        String email = clean(request.getEmail()).toLowerCase();
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(email, request.getPassword())
        );

        User user = userRepository.findByEmailIgnoreCase(email)
            .orElseThrow(() -> new BadRequestException("User not found"));

        String token = jwtService.generateToken(
            org.springframework.security.core.userdetails.User.withUsername(user.getEmail())
                .password(user.getPassword())
                .roles(normalizeRole(user.getRole()).replace("ROLE_", ""))
                .build(),
            Map.of("role", user.getRole(), "fullName", user.getFullName())
        );

        return new AuthResponse(token, toUserResponse(user));
    }

    public UserResponse getCurrentUser(String email) {
        return toUserResponse(findUser(email));
    }

    public UserResponse updateProfile(String email, UpdateProfileRequest request) {
        User user = findUser(email);
        user.setFullName(request.getFullName().trim());
        user.setPhoneNumber(clean(request.getPhoneNumber()));
        user.setProfilePictureUrl(clean(request.getProfilePictureUrl()));
        user.setAddressLine1(clean(request.getAddressLine1()));
        user.setAddressLine2(clean(request.getAddressLine2()));
        user.setCity(clean(request.getCity()));
        user.setState(clean(request.getState()));
        user.setPostalCode(clean(request.getPostalCode()));
        user.setCountry(clean(request.getCountry()));
        return toUserResponse(userRepository.save(user));
    }

    public UserResponse updatePassword(String email, Map<String, String> request) {
        User user = findUser(email);
        String currentPassword = clean(request.get("currentPassword"));
        String newPassword = clean(request.get("newPassword"));
        String confirmPassword = clean(request.get("confirmPassword"));
        if (currentPassword == null) {
            throw new BadRequestException("Current password is required");
        }
        if (newPassword == null || newPassword.length() < 8) {
            throw new BadRequestException("Password must be at least 8 characters");
        }
        if (confirmPassword == null) {
            throw new BadRequestException("Confirm password is required");
        }
        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new BadRequestException("Current password is incorrect");
        }
        if (!newPassword.equals(confirmPassword)) {
            throw new BadRequestException("New password and confirm password must match");
        }
        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new BadRequestException("New password must be different from the current password");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPasswordChangedAt(LocalDateTime.now());
        return toUserResponse(userRepository.save(user));
    }

    public UserResponse updateSettings(String email, Map<String, Object> request) {
        User user = findUser(email);
        String language = clean(asString(request.get("language")));
        if (language == null) {
            throw new BadRequestException("Language is required");
        }
        if (!List.of("en", "hi", "es", "fr", "de").contains(language)) {
            throw new BadRequestException("Selected language is not supported");
        }
        user.setDarkModeEnabled(Boolean.TRUE.equals(request.get("darkModeEnabled")));
        user.setOrderNotificationsEnabled(Boolean.TRUE.equals(request.get("orderNotificationsEnabled")));
        user.setMarketingNotificationsEnabled(Boolean.TRUE.equals(request.get("marketingNotificationsEnabled")));
        user.setLanguage(language);
        return toUserResponse(userRepository.save(user));
    }

    @Transactional
    public void requestPasswordReset(ForgotPasswordRequest request) {
        String cleanedEmail = clean(request.getEmail());
        if (cleanedEmail == null) {
            return;
        }
        String email = cleanedEmail.toLowerCase();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime allowedAt = resetRequestTracker.get(email);
        if (allowedAt != null && now.isBefore(allowedAt)) {
            return;
        }

        Optional<User> resetUser = userRepository.findByEmailIgnoreCase(email);
        if (resetUser.isEmpty()) {
            throw new BadRequestException("Unable to send reset email. Please try again later.");
        }

        User user = resetUser.get();
        passwordResetTokenRepository.markActiveTokensUsedForUser(user);
        String rawToken = generateRawToken();
        PasswordResetToken token = new PasswordResetToken();
        token.setUser(user);
        token.setTokenHash(hashToken(rawToken));
        token.setExpiresAt(now.plusMinutes(resetExpirationMinutes));
        passwordResetTokenRepository.save(token);
        String resetUrl = frontendUrl + "/reset-password?token=" + rawToken;
        emailService.sendPasswordResetEmail(user, resetUrl, resetExpirationMinutes);
        resetRequestTracker.put(email, now.plusMinutes(resetRateLimitMinutes));
    }

    @Transactional(readOnly = true)
    public ResetTokenValidationResponse validateResetToken(String token) {
        if (token == null || token.isBlank()) {
            return new ResetTokenValidationResponse(false, "Reset token is required", null);
        }
        return passwordResetTokenRepository.findByTokenHashAndUsedFalse(hashToken(token))
            .filter((resetToken) -> resetToken.getExpiresAt().isAfter(LocalDateTime.now()))
            .map((resetToken) -> new ResetTokenValidationResponse(true, "Reset token is valid", resetToken.getExpiresAt()))
            .orElseGet(() -> new ResetTokenValidationResponse(false, "Reset link is invalid or expired", null));
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException("New password and confirm password must match");
        }
        if (!isStrongPassword(request.getNewPassword())) {
            throw new BadRequestException("Password must include uppercase, lowercase, number, and special character");
        }

        PasswordResetToken resetToken = passwordResetTokenRepository.findByTokenHashAndUsedFalse(hashToken(request.getToken()))
            .orElseThrow(() -> new BadRequestException("Reset link is invalid or expired"));
        if (resetToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            resetToken.setUsed(true);
            passwordResetTokenRepository.save(resetToken);
            throw new BadRequestException("Reset link is invalid or expired");
        }

        User user = resetToken.getUser();
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setPasswordChangedAt(LocalDateTime.now());
        userRepository.save(user);
        passwordResetTokenRepository.markActiveTokensUsedForUser(user);
    }

    @Transactional
    public void resendPasswordReset(ForgotPasswordRequest request) {
        requestPasswordReset(request);
    }

    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
            .map(this::toUserResponse)
            .toList();
    }

    public void deleteUser(Long userId, String currentUserEmail) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new BadRequestException("User not found"));

        if (user.getEmail().equalsIgnoreCase(currentUserEmail)) {
            throw new BadRequestException("You cannot delete your own admin account");
        }

        if (isAdminRole(user.getRole())) {
            long adminCount = userRepository.countByRoleIn(List.of("ROLE_ADMIN", "ADMIN", "role_admin", "admin"));
            if (adminCount <= 1) {
                throw new BadRequestException("At least one admin user must remain");
            }
        }

        cartRepository.deleteByUser(user);
        userRepository.delete(user);
    }

    public void deleteCurrentUser(String email) {
        User user = findUser(email);
        if (isAdminRole(user.getRole())) {
            long adminCount = userRepository.countByRoleIn(List.of("ROLE_ADMIN", "ADMIN", "role_admin", "admin"));
            if (adminCount <= 1) {
                throw new BadRequestException("At least one admin user must remain");
            }
        }
        if (orderRepository.existsByUser(user) || purchaseRepository.existsByUser(user)) {
            throw new BadRequestException("Accounts with order history cannot be deleted automatically");
        }
        cartRepository.deleteByUser(user);
        userRepository.delete(user);
    }

    private User findUser(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new BadRequestException("User not found"));
    }

    private String clean(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return value.trim();
    }

    private String generateRawToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(token.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new BadRequestException("Unable to process reset token");
        }
    }

    private boolean isStrongPassword(String password) {
        return password != null
            && password.length() >= 8
            && password.matches(".*[A-Z].*")
            && password.matches(".*[a-z].*")
            && password.matches(".*\\d.*")
            && password.matches(".*[^A-Za-z0-9].*");
    }

    private String asString(Object value) {
        return value == null ? null : value.toString();
    }

    private boolean isAdminRole(String role) {
        return "ROLE_ADMIN".equals(normalizeRole(role));
    }

    private String normalizeRole(String role) {
        String normalizedRole = role == null ? "" : role.trim().toUpperCase();
        if ("ADMIN".equals(normalizedRole) || "ROLE_ADMIN".equals(normalizedRole)) {
            return "ROLE_ADMIN";
        }
        return "ROLE_CUSTOMER";
    }

    private UserResponse toUserResponse(User user) {
        return new UserResponse(
            user.getId(),
            user.getFullName(),
            user.getEmail(),
            normalizeRole(user.getRole()),
            user.getPhoneNumber(),
            user.getProfilePictureUrl(),
            user.getAddressLine1(),
            user.getAddressLine2(),
            user.getCity(),
            user.getState(),
            user.getPostalCode(),
            user.getCountry(),
            Boolean.TRUE.equals(user.getDarkModeEnabled()),
            user.getOrderNotificationsEnabled() == null || Boolean.TRUE.equals(user.getOrderNotificationsEnabled()),
            Boolean.TRUE.equals(user.getMarketingNotificationsEnabled()),
            user.getLanguage() == null ? "en" : user.getLanguage(),
            user.getCreatedAt()
        );
    }
}
