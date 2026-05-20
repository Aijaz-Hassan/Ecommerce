# Lumen Lane Ecommerce

This workspace contains a full-stack ecommerce project built with:

- React + Vite frontend
- Spring Boot + Maven backend
- MySQL database
- JWT authentication with Spring Security

## Included tasks from the screenshots

- DB connection configuration
- User entity and repository
- Basic layered Spring Boot structure
- Register API with validation
- BCrypt password encryption
- React registration UI
- Frontend connected to register API
- Login API with credential validation
- JWT authentication and token generation
- Secured APIs with authentication filter
- Protected routes on the frontend
- Login/logout flow
- Product entity and repository
- Add Product API
- Get All Products API

## Password reset email

The forgot-password flow sends real email through SMTP. Before starting the backend, configure these environment variables:

```powershell
$env:MAIL_USERNAME="your-email@gmail.com"
$env:MAIL_PASSWORD="your-gmail-app-password"
$env:MAIL_FROM="your-email@gmail.com"
$env:SUPPORT_EMAIL="your-email@gmail.com"
$env:MAIL_SENDER_NAME="Lumen Lane Support"
```

For Gmail, `MAIL_PASSWORD` must be a Gmail App Password, not your normal Gmail password. After setting these values, restart Spring Boot. The backend startup log should say password reset email is configured with the SMTP host, sender, and support address. If it says email is not configured, the reset endpoint will return `Unable to send reset email. Please try again later.`

The email account you use for `MAIL_USERNAME` should be the real support mailbox for the site, for example `support@yourdomain.com` if you have domain email. If you use Gmail for local testing, use that Gmail address for `MAIL_FROM` and `SUPPORT_EMAIL`.

## Project structure

- `backend` - Spring Boot API
- `frontend` - React storefront

## MySQL setup

1. Create or use a local MySQL server.
2. Update the password in [application.properties](/D:/Front-end/backend/src/main/resources/application.properties).
3. The backend uses the database `ecommerce_store` and can create it automatically.

## Backend run

Maven is not installed in the current environment, but the project is configured for Maven.

1. Install Maven locally or open the backend in an IDE with Maven support.
2. Run:

```powershell
cd D:\Front-end\backend
mvn spring-boot:run
```

The backend will start on `http://localhost:8080`.

## Frontend run

1. Install dependencies:

```powershell
cd D:\Front-end\frontend
npm install
```

2. Start the app:

```powershell
npm run dev
```

The frontend will start on `http://localhost:5173`.

## Notes

- The first registered user becomes `ROLE_ADMIN`, which unlocks the Add Product page.
- Product creation requires a valid JWT token from an admin login.
- The products page shows fallback preview items when the backend is not running yet.
- A ready-to-import Postman collection is available at [Lumen-Lane-APIs.postman_collection.json](/D:/Front-end/postman/Lumen-Lane-APIs.postman_collection.json).
