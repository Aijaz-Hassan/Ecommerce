package com.ecommerce.store.service;

import com.ecommerce.store.entity.User;

public interface PasswordResetEmailSender {
    void sendPasswordResetEmail(User user, String resetUrl, int expirationMinutes);
}
