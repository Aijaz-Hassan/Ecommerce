package com.ecommerce.store.service;

import com.ecommerce.store.entity.User;
import jakarta.annotation.PostConstruct;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class EmailService implements PasswordResetEmailSender {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final String mailHost;
    private final String mailUsername;
    private final String mailPassword;
    private final String mailFrom;
    private final String senderName;
    private final String supportEmail;

    public EmailService(
        ObjectProvider<JavaMailSender> mailSenderProvider,
        @Value("${spring.mail.host:}") String mailHost,
        @Value("${spring.mail.username:}") String mailUsername,
        @Value("${spring.mail.password:}") String mailPassword,
        @Value("${app.mail.from:${spring.mail.username:}}") String mailFrom,
        @Value("${app.mail.sender-name:Lumen Lane Support}") String senderName,
        @Value("${app.mail.support-address:${app.mail.from:${spring.mail.username:}}}") String supportEmail
    ) {
        this.mailSenderProvider = mailSenderProvider;
        this.mailHost = mailHost;
        this.mailUsername = mailUsername;
        this.mailPassword = mailPassword;
        this.mailFrom = mailFrom;
        this.senderName = senderName;
        this.supportEmail = supportEmail;
    }

    @PostConstruct
    void logMailConfigurationStatus() {
        if (!isConfigured()) {
            logger.warn("Password reset email is not configured. Set MAIL_USERNAME, MAIL_PASSWORD, MAIL_FROM, and SUPPORT_EMAIL before starting the backend.");
            return;
        }
        logger.info("Password reset email configured with SMTP host {}, sender {}, and support address {}", mailHost, mailFrom, supportEmail);
    }

    @Override
    public void sendPasswordResetEmail(User user, String resetUrl, int expirationMinutes) {
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null || !isConfigured()) {
            logger.warn("Password reset email is not configured. MAIL_USERNAME, MAIL_PASSWORD, MAIL_FROM, and SUPPORT_EMAIL are required.");
            throw new IllegalStateException("Unable to send reset email. Please try again later.");
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(user.getEmail());
            helper.setSubject("Reset your Lumen Lane password");
            helper.setFrom(mailFrom, senderName);
            helper.setReplyTo(supportEmail);
            helper.setText(buildResetEmail(user, resetUrl, expirationMinutes), true);
            mailSender.send(message);
        } catch (Exception exception) {
            logger.warn("Password reset email failed for {}", user.getEmail(), exception);
            throw new IllegalStateException("Unable to send reset email. Please try again later.");
        }
    }

    private String buildResetEmail(User user, String resetUrl, int expirationMinutes) {
        String name = isBlank(user.getFullName()) ? "there" : user.getFullName();
        return """
            <div style="font-family:Arial,sans-serif;background:#f6f2eb;padding:32px;color:#231815">
              <div style="max-width:560px;margin:auto;background:#fffaf4;border-radius:20px;padding:28px;box-shadow:0 18px 50px rgba(35,24,21,.12)">
                <h1 style="margin:0 0 12px;font-size:28px">Reset your password</h1>
                <p style="line-height:1.6">Hi %s, we received a request to reset your Lumen Lane password.</p>
                <a href="%s" style="display:inline-block;margin:18px 0;padding:14px 22px;border-radius:999px;background:#e85d3f;color:#fff;text-decoration:none;font-weight:700">Reset Password</a>
                <p style="line-height:1.6">This secure link expires in %d minutes. If you did not request this, you can safely ignore this email.</p>
                <p style="line-height:1.6;font-size:13px;color:#6f625d">Need help? Reply to this email or contact %s.</p>
              </div>
            </div>
            """.formatted(name, resetUrl, expirationMinutes, supportEmail);
    }

    private boolean isConfigured() {
        return !isBlank(mailHost)
            && !isBlank(mailUsername)
            && !isBlank(mailPassword)
            && !isBlank(mailFrom)
            && !isBlank(supportEmail);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
