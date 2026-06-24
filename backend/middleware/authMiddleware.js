const { getFirestoreAdmin } = require('../services/firebaseAdmin');
const { getApps, initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

if (!getApps().length) {
  // Prefer service-account init from shared helper.
  getFirestoreAdmin();

  // Fallback for environments that only provide ADC.
  if (!getApps().length) {
    try {
      initializeApp();
      console.log('Initializing Firebase Admin with default credentials');
    } catch (error) {
      console.warn('Firebase Admin failed to initialize:', error.message);
    }
  }
}

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('Middleware 401: Auth header missing or invalid:', authHeader);
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(403).json({ message: `Unauthorized: ${error.message}` });
  }
};

module.exports = verifyToken;
