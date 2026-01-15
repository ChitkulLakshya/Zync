const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    // Attempt to initialize using GCP_SERVICE_ACCOUNT_KEY env var if present
    if (process.env.GCP_SERVICE_ACCOUNT_KEY) {
      // Handle potential string formatting issues from .env
      let serviceAccount = process.env.GCP_SERVICE_ACCOUNT_KEY;
      if (typeof serviceAccount === 'string') {
        try {
          serviceAccount = JSON.parse(serviceAccount);
        } catch (e) {
          console.error("Failed to parse GCP_SERVICE_ACCOUNT_KEY JSON", e);
        }
      }

      console.log("Initializing Firebase Admin with project_id:", serviceAccount.project_id);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      // Fallback to default credentials (file path or auto-discovery)
      console.log("Initializing Firebase Admin with default credentials");
      admin.initializeApp();
    }
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
    console.log('Middleware 401: Auth header missing or invalid:', authHeader);
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
    return res.status(403).json({ message: `Unauthorized: ${error.message}` });
  }
};

module.exports = verifyToken;
