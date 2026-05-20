package com.ecommerce.store;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.hamcrest.Matchers.hasItem;

import com.ecommerce.store.entity.User;
import com.ecommerce.store.service.PasswordResetEmailSender;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
class AuthAndProductApiTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private CapturingPasswordResetEmailSender emailService;

    @BeforeEach
    void resetEmailServiceMock() {
        emailService.reset();
    }

    @TestConfiguration
    static class PasswordResetEmailTestConfig {
        @Bean
        @Primary
        CapturingPasswordResetEmailSender capturingPasswordResetEmailSender() {
            return new CapturingPasswordResetEmailSender();
        }
    }

    static class CapturingPasswordResetEmailSender implements PasswordResetEmailSender {
        private User user;
        private String resetUrl;
        private int expirationMinutes;

        @Override
        public void sendPasswordResetEmail(User user, String resetUrl, int expirationMinutes) {
            this.user = user;
            this.resetUrl = resetUrl;
            this.expirationMinutes = expirationMinutes;
        }

        void reset() {
            user = null;
            resetUrl = null;
            expirationMinutes = 0;
        }
    }

    @Test
    void registerApiCreatesUserAndReturnsToken() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "fullName": "Test User",
                      "email": "test.user@example.com",
                      "password": "Demo1234"
                    }
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.token").isNotEmpty())
            .andExpect(jsonPath("$.email").value("test.user@example.com"));
    }

    @Test
    void loginApiValidatesCredentials() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "fullName": "Login User",
                      "email": "login.user@example.com",
                      "password": "Demo1234"
                    }
                    """))
            .andExpect(status().isCreated());

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "email": "login.user@example.com",
                      "password": "Demo1234"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").isNotEmpty())
            .andExpect(jsonPath("$.email").value("login.user@example.com"));
    }

    @Test
    void forgotPasswordSendsResetLinkToRegisteredEmailAndAllowsPasswordReset() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "fullName": "Reset User",
                      "email": "reset.user@example.com",
                      "password": "Demo1234"
                    }
                    """))
            .andExpect(status().isCreated());

        mockMvc.perform(post("/api/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "email": "reset.user@example.com"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("A password reset link has been sent to your email."));

        assertThat(emailService.user.getEmail()).isEqualTo("reset.user@example.com");
        assertThat(emailService.expirationMinutes).isEqualTo(15);

        String resetToken = tokenFromResetUrl(emailService.resetUrl);
        mockMvc.perform(get("/api/auth/reset-password/validate")
                .param("token", resetToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.valid").value(true));

        mockMvc.perform(post("/api/auth/reset-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "token": "%s",
                      "newPassword": "NewDemo123!",
                      "confirmPassword": "NewDemo123!"
                    }
                    """.formatted(resetToken)))
            .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "email": "reset.user@example.com",
                      "password": "NewDemo123!"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").isNotEmpty());
    }

    @Test
    void forgotPasswordRejectsUnregisteredEmailWithoutSendingMail() throws Exception {
        mockMvc.perform(post("/api/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "email": "missing.user@example.com"
                    }
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("Unable to send reset email. Please try again later."));

        assertThat(emailService.resetUrl).isNull();
    }

    @Test
    void getProductsApiIsPublic() throws Exception {
        mockMvc.perform(get("/api/products"))
            .andExpect(status().isOk());
    }

    @Test
    void addProductApiRequiresAdminRole() throws Exception {
        mockMvc.perform(post("/api/products")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "name": "Aurora Headset",
                      "description": "Premium audio device",
                      "price": 199.99,
                      "category": "Audio",
                      "imageUrl": "https://example.com/headset.jpg",
                      "stock": 25
                    }
                    """))
            .andExpect(status().isForbidden());
    }

    @Test
    void addProductApiWorksForAdmin() throws Exception {
        mockMvc.perform(post("/api/products")
                .with(user("admin@example.com").roles("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "name": "Aurora Headset",
                      "description": "Premium audio device",
                      "price": 199.99,
                      "category": "Audio",
                      "imageUrl": "https://example.com/headset.jpg",
                      "stock": 25
                    }
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.name").value("Aurora Headset"));
    }

    @Test
    void getProductByIdApiReturnsRequestedProduct() throws Exception {
        MvcResult createResult = mockMvc.perform(post("/api/products")
                .with(user("admin@example.com").roles("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "name": "Orbit Lamp",
                      "description": "Ambient desk light",
                      "price": 89.99,
                      "category": "Lighting",
                      "imageUrl": "https://example.com/lamp.jpg",
                      "stock": 8
                    }
                    """))
            .andExpect(status().isCreated())
            .andReturn();

        JsonNode createdProduct = objectMapper.readTree(createResult.getResponse().getContentAsString());
        long productId = createdProduct.get("id").asLong();

        mockMvc.perform(get("/api/products/" + productId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Orbit Lamp"));
    }

    @Test
    void getAllProductsSupportsSearchAndCategoryFilter() throws Exception {
        mockMvc.perform(post("/api/products")
                .with(user("admin@example.com").roles("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "name": "Sky Speaker",
                      "description": "Portable audio device",
                      "price": 129.99,
                      "category": "Audio",
                      "imageUrl": "https://example.com/speaker.jpg",
                      "stock": 18
                    }
                    """))
            .andExpect(status().isCreated());

        mockMvc.perform(post("/api/products")
                .with(user("admin@example.com").roles("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "name": "Canvas Keyboard",
                      "description": "Mechanical workspace keyboard",
                      "price": 159.99,
                      "category": "Workspace",
                      "imageUrl": "https://example.com/keyboard.jpg",
                      "stock": 10
                    }
                    """))
            .andExpect(status().isCreated());

        mockMvc.perform(get("/api/products")
                .param("search", "speaker"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[*].name", hasItem("Sky Speaker")));

        mockMvc.perform(get("/api/products")
                .param("category", "Workspace"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].category").value("Workspace"));
    }

    @Test
    void deleteProductApiWorksForAdmin() throws Exception {
        MvcResult createResult = mockMvc.perform(post("/api/products")
                .with(user("admin@example.com").roles("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "name": "Delete Me",
                      "description": "To be removed",
                      "price": 49.99,
                      "category": "Audio",
                      "imageUrl": "https://example.com/delete.jpg",
                      "stock": 4
                    }
                    """))
            .andExpect(status().isCreated())
            .andReturn();

        JsonNode createdProduct = objectMapper.readTree(createResult.getResponse().getContentAsString());
        long productId = createdProduct.get("id").asLong();

        mockMvc.perform(delete("/api/products/" + productId)
                .with(user("admin@example.com").roles("ADMIN")))
            .andExpect(status().isNoContent());
    }

    @Test
    void updateProductApiWorksForAdmin() throws Exception {
        MvcResult createResult = mockMvc.perform(post("/api/products")
                .with(user("admin@example.com").roles("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "name": "Original Product",
                      "description": "Original description",
                      "price": 79.99,
                      "category": "Lighting",
                      "imageUrl": "https://example.com/original.jpg",
                      "stock": 12
                    }
                    """))
            .andExpect(status().isCreated())
            .andReturn();

        JsonNode createdProduct = objectMapper.readTree(createResult.getResponse().getContentAsString());
        long productId = createdProduct.get("id").asLong();

        mockMvc.perform(put("/api/products/" + productId)
                .with(user("admin@example.com").roles("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "name": "Updated Product",
                      "description": "Updated description",
                      "price": 89.99,
                      "category": "Workspace",
                      "imageUrl": "https://example.com/updated.jpg",
                      "stock": 9
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Updated Product"))
            .andExpect(jsonPath("$.category").value("Workspace"));
    }

    @Test
    void getUsersApiIsAdminOnly() throws Exception {
        mockMvc.perform(get("/api/auth/users"))
            .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/auth/users")
                .with(user("admin@example.com").roles("ADMIN")))
            .andExpect(status().isOk());
    }

    @Test
    void cartApisAndAdminSummaryWork() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "fullName": "Cart User",
                      "email": "cart.user@example.com",
                      "password": "Demo1234"
                    }
                    """))
            .andExpect(status().isCreated());

        MvcResult createResult = mockMvc.perform(post("/api/products")
                .with(user("admin@example.com").roles("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "name": "Purchase Product",
                      "description": "Bought item",
                      "price": 99.99,
                      "category": "Audio",
                      "imageUrl": "https://example.com/purchase.jpg",
                      "stock": 10
                    }
                    """))
            .andExpect(status().isCreated())
            .andReturn();

        JsonNode createdProduct = objectMapper.readTree(createResult.getResponse().getContentAsString());
        long productId = createdProduct.get("id").asLong();

        MvcResult addToCartResult = mockMvc.perform(post("/api/cart/items")
                .with(user("cart.user@example.com").roles("CUSTOMER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "productId": %d,
                      "quantity": 2
                    }
                    """.formatted(productId)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.customerEmail").value("cart.user@example.com"))
            .andExpect(jsonPath("$.items[0].productName").value("Purchase Product"))
            .andReturn();

        JsonNode cartPayload = objectMapper.readTree(addToCartResult.getResponse().getContentAsString());
        long cartItemId = cartPayload.path("items").get(0).path("id").asLong();

        mockMvc.perform(get("/api/cart")
                .with(user("cart.user@example.com").roles("CUSTOMER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].quantity").value(2));

        mockMvc.perform(put("/api/cart/items/" + cartItemId)
                .with(user("cart.user@example.com").roles("CUSTOMER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "productId": %d,
                      "quantity": 3
                    }
                    """.formatted(productId)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].quantity").value(3));

        mockMvc.perform(get("/api/cart/admin-summary")
                .with(user("admin@example.com").roles("ADMIN")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].customerEmail").value("cart.user@example.com"))
            .andExpect(jsonPath("$[0].items[0].quantity").value(3));

        mockMvc.perform(post("/api/cart/checkout/session")
                .with(user("cart.user@example.com").roles("CUSTOMER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.provider").value("demo"));

        mockMvc.perform(post("/api/cart/checkout/confirm")
                .with(user("cart.user@example.com").roles("CUSTOMER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "provider": "demo",
                      "orderId": "demo-checkout",
                      "paymentId": "demo-payment"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.message").value("Payment recorded successfully and cart cleared."));

        mockMvc.perform(get("/api/purchases/my")
                .with(user("cart.user@example.com").roles("CUSTOMER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].items[0].productName").value("Purchase Product"));

        mockMvc.perform(get("/api/cart")
                .with(user("cart.user@example.com").roles("CUSTOMER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items").isEmpty());
    }

    @Test
    void cartItemsAreIsolatedPerAuthenticatedUser() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "fullName": "First Cart User",
                      "email": "first.cart@example.com",
                      "password": "Demo1234"
                    }
                    """))
            .andExpect(status().isCreated());

        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "fullName": "Second Cart User",
                      "email": "second.cart@example.com",
                      "password": "Demo1234"
                    }
                    """))
            .andExpect(status().isCreated());

        MvcResult createResult = mockMvc.perform(post("/api/products")
                .with(user("admin@example.com").roles("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "name": "Shared Product",
                      "description": "Same product in separate carts",
                      "price": 199.99,
                      "category": "Audio",
                      "imageUrl": "https://example.com/shared.jpg",
                      "stock": 20
                    }
                    """))
            .andExpect(status().isCreated())
            .andReturn();

        JsonNode createdProduct = objectMapper.readTree(createResult.getResponse().getContentAsString());
        long productId = createdProduct.get("id").asLong();

        mockMvc.perform(post("/api/cart/items")
                .with(user("first.cart@example.com").roles("CUSTOMER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "productId": %d,
                      "quantity": 1
                    }
                    """.formatted(productId)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.customerEmail").value("first.cart@example.com"))
            .andExpect(jsonPath("$.items[0].quantity").value(1));

        mockMvc.perform(post("/api/cart/items")
                .with(user("second.cart@example.com").roles("CUSTOMER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "productId": %d,
                      "quantity": 3
                    }
                    """.formatted(productId)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.customerEmail").value("second.cart@example.com"))
            .andExpect(jsonPath("$.items[0].quantity").value(3));

        mockMvc.perform(get("/api/cart")
                .with(user("first.cart@example.com").roles("CUSTOMER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.customerEmail").value("first.cart@example.com"))
            .andExpect(jsonPath("$.items[0].quantity").value(1));

        mockMvc.perform(get("/api/cart")
                .with(user("second.cart@example.com").roles("CUSTOMER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.customerEmail").value("second.cart@example.com"))
            .andExpect(jsonPath("$.items[0].quantity").value(3));
    }

    @Test
    void orderCheckoutApiCreatesOrderAndCalculatesTotalPrice() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "fullName": "Order Entity User",
                      "email": "order.entity.user@example.com",
                      "password": "Demo1234"
                    }
                    """))
            .andExpect(status().isCreated());

        MvcResult createResult = mockMvc.perform(post("/api/products")
                .with(user("admin@example.com").roles("ADMIN"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "name": "Checkout Product",
                      "description": "Checkout item",
                      "price": 100.00,
                      "category": "Audio",
                      "imageUrl": "https://example.com/checkout.jpg",
                      "stock": 10
                    }
                    """))
            .andExpect(status().isCreated())
            .andReturn();

        JsonNode createdProduct = objectMapper.readTree(createResult.getResponse().getContentAsString());
        long productId = createdProduct.get("id").asLong();

        mockMvc.perform(post("/api/cart/items")
                .with(user("order.entity.user@example.com").roles("CUSTOMER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "productId": %d,
                      "quantity": 2
                    }
                    """.formatted(productId)))
            .andExpect(status().isCreated());

        MvcResult checkoutResult = mockMvc.perform(post("/api/orders/checkout")
                .with(user("order.entity.user@example.com").roles("CUSTOMER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "paymentProvider": "demo",
                      "paymentReference": "demo-order-payment",
                      "recipientName": "Order Entity User",
                      "phoneNumber": "9876543210",
                      "addressLine1": "221 Market Road",
                      "addressLine2": "Near River View",
                      "city": "Hyderabad",
                      "state": "Telangana",
                      "postalCode": "500001",
                      "country": "India"
                    }
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.orderNumber").isNotEmpty())
            .andExpect(jsonPath("$.subtotal").value(200.00))
            .andExpect(jsonPath("$.taxAmount").value(36.00))
            .andExpect(jsonPath("$.shippingAmount").value(49.00))
            .andExpect(jsonPath("$.totalAmount").value(285.00))
            .andExpect(jsonPath("$.city").value("Hyderabad"))
            .andExpect(jsonPath("$.trackingLocation").value("Order confirmed at the seller desk"))
            .andReturn();

        JsonNode checkoutOrder = objectMapper.readTree(checkoutResult.getResponse().getContentAsString());
        long orderId = checkoutOrder.get("id").asLong();

        mockMvc.perform(get("/api/orders/my")
                .with(user("order.entity.user@example.com").roles("CUSTOMER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].paymentProvider").value("DEMO"));

        mockMvc.perform(get("/api/orders/history")
                .with(user("order.entity.user@example.com").roles("CUSTOMER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray());

        mockMvc.perform(get("/api/products/" + productId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.stock").value(8));

        mockMvc.perform(get("/api/orders/admin-summary")
                .with(user("admin@example.com").roles("ADMIN")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].customerEmail").value("order.entity.user@example.com"))
            .andExpect(jsonPath("$[0].items[0].remainingStock").value(8));

        mockMvc.perform(put("/api/orders/my/" + orderId + "/cancel")
                .with(user("order.entity.user@example.com").roles("CUSTOMER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "reason": "Delivery timing no longer works for me."
                    }
                    """))
            .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/products/" + productId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.stock").value(10));

        mockMvc.perform(get("/api/orders/my")
                .with(user("order.entity.user@example.com").roles("CUSTOMER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isEmpty());
    }

    private String tokenFromResetUrl(String resetUrl) {
        String marker = "token=";
        int tokenStart = resetUrl.indexOf(marker);
        assertThat(tokenStart).isGreaterThanOrEqualTo(0);
        return resetUrl.substring(tokenStart + marker.length());
    }
}
