import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();

import serviceAccount from process.env.FIREBASE_CREDENTIALS;

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

export default admin;
