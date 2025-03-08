// const admin = require("firebase-admin");
// const serviceAccount = require("../firebaseConfig.json");
// admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
// const db = admin.firestore();
// module.exports = { db };

const admin = require("firebase-admin");

// Parse Firebase credentials from environment variable
const serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIALS);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

module.exports = { db };
