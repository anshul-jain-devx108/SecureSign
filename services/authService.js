const { OAuth2Client } = require("google-auth-library");
const { db } = require("../config/firebaseConfig");
const dotenv = require("dotenv");
const fetch = require("node-fetch");
const crypto = require("crypto");
const winston = require("winston");

dotenv.config();

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI_PRODUCTION
);

// Logger setup
const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [new winston.transports.Console({ format: winston.format.simple() })],
});

// Encryption Setup (AES-256-CTR)
const algorithm = "aes-256-ctr";

// Ensure ENCRYPTION_KEY exists
if (!process.env.ENCRYPTION_KEY) {
  throw new Error("❌ ENCRYPTION_KEY is missing in environment variables.");
}
const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, "salt", 32);

/**
 * Encrypt refresh token (Handles empty values)
 */
const encryptToken = (token) => {
  if (!token) return "";  // Prevent encrypting undefined tokens
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  return iv.toString("hex") + ":" + cipher.update(token, "utf8", "hex") + cipher.final("hex");
};

/**
 * Decrypt refresh token (Handles empty values)
 */
const decryptToken = (encryptedToken) => {
  if (!encryptedToken) return "";  // Prevent decrypting empty values
  const [ivHex, encryptedData] = encryptedToken.split(":");
  const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(ivHex, "hex"));
  return decipher.update(encryptedData, "hex", "utf8") + decipher.final("utf8");
};

/**
 * Generate Google OAuth URL
 */
const getAuthURL = () => {
  return client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/gmail.modify", 
      "https://www.googleapis.com/auth/gmail.compose",  // Added
      "https://www.googleapis.com/auth/gmail.send",     // Added
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile"
      "https://www.googleapis.com/auth/drive.file", // Added: Read and write access to app-created files
      "https://www.googleapis.com/auth/drive"   
    ],
    prompt: "consent",
  });
};

/**
 * Exchange Code for Tokens
 */
const getTokens = async (code) => {
  try {
    const { tokens } = await client.getToken(code);
    return tokens;
  } catch (error) {
    logger.error("❌ Failed to exchange code for tokens:", error);
    throw new Error("OAuth token exchange failed");
  }
};

/**
 * Fetch Google User Info
 */
const getUserInfo = async (accessToken) => {
  try {
    const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new Error("Failed to fetch user info");
    return await response.json();
  } catch (error) {
    logger.error("❌ Error fetching user info:", error);
    throw new Error("Failed to retrieve user information");
  }
};

/**
 * Save User in Firestore (Handles missing refresh tokens)
 */
const saveUser = async (userId, tokens, userInfo) => {
  try {
    const userRef = db.collection("users").doc(userId);
    const expiryDate = Date.now() + (tokens.expires_in || 3600) * 1000;

    // Encrypt refresh token only if it exists
    const encryptedRefreshToken = tokens.refresh_token ? encryptToken(tokens.refresh_token) : "";

    const tokenData = {
      access_token: tokens.access_token,
      refresh_token: encryptedRefreshToken,
      expiry_date: expiryDate,
      token_type: tokens.token_type,
    };

    await userRef.set(
      {
        user_id: userId,
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        tokens: tokenData,
        updated_at: new Date(),
      },
      { merge: true }
    );

    logger.info(`✅ User ${userId} saved successfully.`);
  } catch (error) {
    logger.error("❌ Error saving user data:", error);
  }
};

/**
 * Get Access Token (Auto-Refresh if Expired)
 */
const getAccessToken = async (userId) => {
  const userRef = db.collection("users").doc(userId);
  const doc = await userRef.get();
  if (!doc.exists) throw new Error("User not found");

  let { tokens } = doc.data();
  if (!tokens.expiry_date) throw new Error("Token expiry date missing!");

  // If access token is still valid, return it
  if (tokens.expiry_date > Date.now()) {
    return { access_token: tokens.access_token, refresh_token: decryptToken(tokens.refresh_token) };
  }

  // Refresh access token
  logger.info(`🔄 Token expired, refreshing for user: ${userId}`);
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: decryptToken(tokens.refresh_token),
        grant_type: "refresh_token",
      }),
    });
    const newTokens = await response.json();
    if (!response.ok) throw new Error(newTokens.error);

    tokens.access_token = newTokens.access_token;
    tokens.expiry_date = Date.now() + newTokens.expires_in * 1000;
    await userRef.update({ tokens });

    logger.info(`✅ Access token refreshed successfully for ${userId}`);
    return { access_token: tokens.access_token, refresh_token: decryptToken(tokens.refresh_token) };
  } catch (error) {
    logger.error("❌ Error refreshing token:", error);
    throw new Error("Failed to refresh access token");
  }
};

/**
 * Logout User (Clears Tokens)
 */
const logoutUser = async (userId) => {
  try {
    const userRef = db.collection("users").doc(userId);
    await userRef.update({ tokens: {} });
    logger.info(`🚪 User ${userId} logged out successfully.`);
  } catch (error) {
    logger.error("❌ Error logging out user:", error);
  }
};

module.exports = { getAuthURL, getTokens, getUserInfo, saveUser, getAccessToken, logoutUser };
