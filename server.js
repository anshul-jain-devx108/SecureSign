const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const cron = require("node-cron");
const session = require("express-session");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/authRoutes");
const { db } = require("./config/firebaseConfig");
const { getAccessToken } = require("./services/authService");

dotenv.config();
const app = express();

// ✅ Validate required environment variables
if (!process.env.SESSION_SECRET) {
  console.error("❌ Missing SESSION_SECRET in .env file!");
  process.exit(1); // Exit to prevent running with an insecure setup
}

// ✅ Configure CORS securely
const allowedOrigins = ["http://localhost:8080"]; // 🔹 Add production frontend domain later

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());
app.use(cookieParser()); // ✅ Cookie parser before session

// ✅ Session Middleware (Handles Authentication)
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // 🔹 Secure cookies in production
      sameSite: "None",
      maxAge: 24 * 60 * 60 * 1000, // 1 day expiration
    },
  })
);

// ✅ API Routes
app.use("/auth", authRoutes);

// ✅ Scheduled Token Refresh Every 30 Minutes
cron.schedule("*/30 * * * *", async () => {
  console.log("🔄 Running token refresh job...");

  try {
    const snapshot = await db.collection("users").get();
    snapshot.forEach(async (doc) => {
      const userData = doc.data();
      const expiryDate = userData.tokens?.expiry_date || 0;

      if (expiryDate > Date.now()) {
        console.log(`✅ Token still valid for ${doc.id}, skipping refresh.`);
        return;
      }

      console.log(`🔄 Refreshing token for user: ${doc.id}`);
      try {
        await getAccessToken(doc.id);
        console.log(`✅ Successfully refreshed token for ${doc.id}`);
      } catch (refreshError) {
        console.error(`❌ Error refreshing token for ${doc.id}:`, refreshError);
      }
    });
  } catch (error) {
    console.error("❌ Error fetching users for token refresh:", error);
  }
});

// ✅ Start Server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on port ${PORT}`);
// });
// Listen on 0.0.0.0 instead of localhost
const PORT = process.env.port || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
