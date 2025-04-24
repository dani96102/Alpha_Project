// server/firebase-admin.js
const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const { getEnvOrThrow } = require('./utils');

let db;

function initializeFirebaseAdmin() {
  if (admin.apps.length) {
     console.log('Firebase Admin already initialized.');
     db = getFirestore();
     return db;
  }
  try {
    // روش پیشنهادی: ذخیره کلید به صورت Base64 در متغیر محیطی
    const serviceAccountBase64 = getEnvOrThrow('FIREBASE_SERVICE_ACCOUNT_BASE64');
    const serviceAccountJson = Buffer.from(serviceAccountBase64, 'base64').toString('utf8');
    const serviceAccount = JSON.parse(serviceAccountJson);

    // یا اگر فایل کلید رو کنار سرور دارید (کمتر امن، مخصوصا در گیت)
    // const serviceAccount = require('./path/to/your/serviceAccountKey.json');

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    db = getFirestore();
    console.log('Firebase Admin Initialized Successfully.');
    return db;
  } catch (error) {
    console.error('Firebase Admin Initialization Failed:', error);
    process.exit(1); // خروج از برنامه چون بدون دیتابیس کار نمی‌کنه
  }
}

// db رو export می‌کنیم تا بقیه جاها استفاده کنن
module.exports = { initializeFirebaseAdmin, db };