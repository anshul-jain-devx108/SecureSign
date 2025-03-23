# Centralized Authentication Service API Documentation

## Overview
This API provides authentication and authorization services using Google OAuth2. It securely stores user credentials and tokens in Firebase Firestore and supports automatic token refresh via a scheduled job.

## Technologies Used
- **Node.js** with Express.js
- **Firebase Firestore** for data storage
- **Google OAuth2 API** for authentication
- **Docker** for containerization
- **Winston** for logging
- **Node-cron** for scheduled token refresh

## Setup Instructions

### Prerequisites
1. Create a `.env` file and add the following environment variables:
   ```env
   SESSION_SECRET=your_session_secret
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_REDIRECT_URI_PRODUCTION=your_google_redirect_uri
   FIREBASE_PRIVATE_KEY=your_firebase_private_key
   FIREBASE_PROJECT_ID=your_firebase_project_id
   ENCRYPTION_KEY=your_encryption_key
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Start the server:
   ```sh
   npm start
   ```

## API Endpoints

### Authentication Routes

#### 1. Redirect to Google OAuth
- **Endpoint:** `GET /auth/google`
- **Description:** Redirects the user to the Google OAuth consent screen.

#### 2. OAuth Callback
- **Endpoint:** `GET /auth/callback`
- **Description:** Handles Google OAuth response, exchanges code for tokens, and stores user info.

#### 3. Check Authentication Status
- **Endpoint:** `GET /auth/check`
- **Description:** Returns authentication status of the user.
- **Headers:** Requires authentication token in cookies.

#### 4. Get Access Token (Auto-refresh if expired)
- **Endpoint:** `GET /auth/token`
- **Description:** Retrieves a valid access token for the authenticated user.

#### 5. Logout
- **Endpoint:** `GET /auth/logout`
- **Description:** Logs out the user and clears session cookies.

### Scheduled Tasks
- **Token Refresh Job:** Runs every 30 minutes to refresh expired tokens.

### Security Features
- **Session management** using `express-session`
- **Token encryption** using AES-256-CTR
- **CORS configuration** for controlled access
- **Rate limiting** to prevent abuse
- **Secure cookies** enabled in production

## Docker Deployment
1. Build the Docker image:
   ```sh
   docker build -t auth-service .
   ```
2. Run the container:
   ```sh
   docker run -p 5000:5000 --env-file .env auth-service
   ```

## Logging
- **Winston logger** is used for structured logging.
- Logs include errors, token refresh actions, and user authentication status.

## Future Improvements
- Implement role-based access control (RBAC).
- Integrate additional authentication providers.
- Add API rate limiting for enhanced security.

---
**Author:** [Anshul Jain]  
**Version:** 1.0.0
