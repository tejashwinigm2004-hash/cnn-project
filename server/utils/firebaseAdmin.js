const admin = require('firebase-admin');
 
let serviceAccount;
 
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Production (Render): credentials stored as a JSON string in an env var
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  // Local dev: fall back to the local file (kept out of git via .gitignore)
  serviceAccount = require('../firebase-service-account.json');
}
 
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
 
module.exports = admin;