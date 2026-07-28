const admin = require('firebase-admin');
const { initializeApp, getApps, cert } = require('firebase-admin/app');

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // Production (Render): credentials stored as a JSON string in an env var
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  // Local dev: fall back to the local file (kept out of git via .gitignore)
  serviceAccount = require('../firebase-service-account.json');
}

// Use the modular initializeApp/getApps/cert functions (stable in firebase-admin v13+),
// instead of the old admin.initializeApp/admin.credential.cert namespace API which is
// no longer reliably available on the default export.
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

// Keep exporting the top-level `admin` object so any code elsewhere that does
// admin.auth(), admin.messaging(), etc. continues to work unchanged.
module.exports = admin;