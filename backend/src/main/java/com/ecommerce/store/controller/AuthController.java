package com.ecommerce.store.controller;

import com.ecommerce.store.dto.auth.AuthResponse;
import com.ecommerce.store.dto.auth.ForgotPasswordRequest;
import com.ecommerce.store.dto.auth.LoginRequest;
import com.ecommerce.store.dto.auth.RegisterRequest;
import com.ecommerce.store.dto.auth.ResetPasswordRequest;
import com.ecommerce.store.dto.auth.ResetTokenValidationResponse;
import com.ecommerce.store.dto.auth.UpdateProfileRequest;
import com.ecommerce.store.dto.auth.UserResponse;
import com.ecommerce.store.service.AuthService;
import jakarta.validation.Valid;
import java.security.Principal;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse register(@Valid @RequestBody RegisterRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/forgot-password")
    public Map<String, String> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.requestPasswordReset(request);
        return Map.of("message", "A password reset link has been sent to your email.");
    }

    @PostMapping("/forgot-password/resend")
    public Map<String, String> resendForgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.resendPasswordReset(request);
        return Map.of("message", "A password reset link has been sent to your email.");
    }

    @GetMapping("/reset-password/validate")
    public ResetTokenValidationResponse validateResetToken(@RequestParam String token) {
        return authService.validateResetToken(token);
    }

    @PostMapping("/reset-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
    }

    @GetMapping("/me")
    public UserResponse getCurrentUser(Principal principal) {
        return authService.getCurrentUser(principal.getName());
    }

    @PutMapping("/me")
    public UserResponse updateCurrentUser(@Valid @RequestBody UpdateProfileRequest request, Principal principal) {
        return authService.updateProfile(principal.getName(), request);
    }

    @PutMapping("/me/password")
    public UserResponse updatePassword(@RequestBody Map<String, String> request, Principal principal) {
        return authService.updatePassword(principal.getName(), request);
    }

    @PutMapping("/me/settings")
    public UserResponse updateSettings(@RequestBody Map<String, Object> request, Principal principal) {
        return authService.updateSettings(principal.getName(), request);
    }

    @DeleteMapping("/me")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCurrentUser(Principal principal) {
        authService.deleteCurrentUser(principal.getName());
    }

    @GetMapping("/users")
    public List<UserResponse> getAllUsers() {
        return authService.getAllUsers();
    }

    @DeleteMapping("/users/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUser(@PathVariable Long id, Principal principal) {
        authService.deleteUser(id, principal.getName());
    }
}
