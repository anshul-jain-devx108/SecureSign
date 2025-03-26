const express = require("express");
const cookieParser = require("cookie-parser");
const {
  getAuthURL,
  getTokens,
  getUserInfo,
  saveUser,
  getAccessToken,
  logoutUser,
} = require("../services/authService");

const router = express.Router();
router.use(cookieParser());

// ✅ Redirect User to Google OAuth
router.get("/google", (req, res) => {
  console.log("🔗 Redirecting user to Google OAuth...");
  res.redirect(getAuthURL());
});

// ✅ Middleware: Check Authentication (Uses Cookie)
const checkAuth = (req, res, next) => {
  const authToken = req.cookies.authToken;
  if (!authToken) {
    return res.status(401).json({ authenticated: false, message: "❌ Unauthorized" });
  }
  next();
};

// ✅ Auth Status Endpoint
router.get("/check", checkAuth, (req, res) => {
  res.json({ authenticated: true });
});

// ✅ Handle Google OAuth Callback
// router.get("/callback", async (req, res) => {
//   const code = req.query.code;
//   if (!code) return res.status(400).json({ error: "❌ Missing authorization code" });

//   try {
//     // Exchange code for tokens
//     const tokens = await getTokens(code);
//     console.log("✅ Received Tokens:", tokens);

//     // Fetch user info using access token
//     const userInfo = await getUserInfo(tokens.access_token);
//     console.log("👤 Google User Info:", userInfo);

//     if (!userInfo.email) throw new Error("❌ No email found in Google response");

//     const userId = userInfo.email; // Use email as document ID
//     await saveUser(userId, tokens, userInfo);
//     console.log(`✅ User ${userId} authenticated & saved`);

//     // 🔹 Set secure, HTTP-only cookies for session management
//     res.cookie("authToken", tokens.access_token, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "None",
//       maxAge: 24 * 60 * 60 * 1000, // 1 day expiration
//     });

//     res.cookie("userId", userId, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "None", // Strict
//       maxAge: 24 * 60 * 60 * 1000,
//     });

//     // Redirect to frontend dashboard
//     res.redirect("https://learn-sphere-ai-powered-educational-platform.vercel.app/dashboard"); // 🔹 Change to your frontend URL
//     // res.json({ message: "Login successful", user: req.user });  // ✅ Send a response instead

//   } catch (error) {
//     console.error("❌ Auth Callback Error:", error);
//     res.status(500).json({ error: error.message });
//   }
// });

// router.get("/callback", async (req, res) => {
//   const code = req.query.code;
//   if (!code) return res.status(400).json({ error: "❌ Missing authorization code" });

//   try {
//     const tokens = await getTokens(code);
//     const userInfo = await getUserInfo(tokens.access_token);

//     if (!userInfo.email) throw new Error("❌ No email found in Google response");

//     const userId = userInfo.email;
//     await saveUser(userId, tokens, userInfo);

//     // Set cookies (or JWT if using local storage)
//     res.cookie("authToken", tokens.access_token, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "None",
//       maxAge: 24 * 60 * 60 * 1000,
//     });

//     res.cookie("userId", userId, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === "production",
//       sameSite: "None",
//       maxAge: 24 * 60 * 60 * 1000,
//     });

//     // ✅ Instead of redirecting, send JSON response
//     res.json({ success: true, user: userInfo });

//   } catch (error) {
//     console.error("❌ Auth Callback Error:", error);
//     res.status(500).json({ error: error.message });
//   }
// });

router.get("/callback", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).json({ error: "❌ Missing authorization code" });

  try {
    const tokens = await getTokens(code);
    const userInfo = await getUserInfo(tokens.access_token);

    if (!userInfo.email) throw new Error("❌ No email found in Google response");

    const userId = userInfo.email;
    await saveUser(userId, tokens, userInfo);

    // ✅ Redirect user to frontend with token
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?token=${tokens.access_token}`);
  } catch (error) {
    console.error("❌ Auth Callback Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get Access Token (Auto-Refresh if Expired)
router.get("/token", async (req, res) => {
  const userId = req.cookies.userId; // 🔹 Extract user ID from cookie
  if (!userId) return res.status(401).json({ error: "❌ Unauthorized: User not logged in" });

  try {
    const { access_token } = await getAccessToken(userId);
    res.json({ access_token }); // ✅ Only return access token
  } catch (error) {
    console.error("❌ Token Fetch Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ Logout User (Clear Cookie)
router.get("/logout", async (req, res) => {
  const userId = req.cookies.userId; // 🔹 Extract user ID from cookie
  if (!userId) return res.status(401).json({ error: "❌ Unauthorized: User not logged in" });

  try {
    await logoutUser(userId);
    res.clearCookie("authToken");
    res.clearCookie("userId");
    res.json({ message: `🚪 User ${userId} logged out successfully!` });
  } catch (error) {
    console.error("❌ Logout Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ Success Page
router.get("/success", (req, res) => {
  res.send("<h2>✅ Authentication Successful!</h2><p>You can now close this window.</p>");
});

module.exports = router;
