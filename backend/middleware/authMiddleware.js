const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    // Attempt to initialize with default credentials or service account
    // For local dev, ensure GOOGLE_APPLICATION_CREDENTIALS is set
    // or provide serviceAccountKey.json
    admin.initializeApp();
  } catch (error) {
    console.warn("Firebase Admin failed to initialize:", error.message);
  }
}

/**
 * Middleware to verify Firebase ID Token
 */
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(403).json({ message: 'Unauthorized: Invalid token' });
  }
};

module.exports = verifyToken;
