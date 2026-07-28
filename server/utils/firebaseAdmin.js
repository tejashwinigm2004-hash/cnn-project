const admin = require('firebase-admin');
 
let serviceAccount;
 
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Production (Render): credentials stored as a JSON string in an env var
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  // Local dev: fall back to the local file (kept out of git via .gitignore)
  serviceAccount = require('../firebase-service-account.json');
}
 
// Guard against re-initializing on hot reloads, without relying on admin.apps
// (which behaves inconsistently across firebase-admin versions).
try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} catch (err) {
  // Ignore "already exists" errors from re-initialization; rethrow anything else.
  if (!/already exists/i.test(err.message)) {
    throw err;
  }
}
 
module.exports = admin;