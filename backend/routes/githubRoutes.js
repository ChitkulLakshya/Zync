const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware'); // Your Firebase Auth middleware
const User = require('../models/User');
const axios = require('axios');
const CryptoJS = require("crypto-js"); // Make sure to npm install crypto-js

// Helper to encrypt tokens
const encryptToken = (token) => {
  return CryptoJS.AES.encrypt(token, process.env.ENCRYPTION_KEY).toString();
};

// Helper to decrypt tokens (for use in /repos)
const decryptToken = (ciphertext) => {
  const bytes = CryptoJS.AES.decrypt(ciphertext, process.env.ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// 1. CONNECT ROUTE (Matches your Firebase Frontend)
// POST /api/github/connect
router.post('/connect', verifyToken, async (req, res) => {
  const { accessToken, username } = req.body; // Receive token directly
  const userId = req.user.uid; // Extracted from verifyToken middleware

  if (!accessToken) {
    return res.status(400).json({ message: 'Access Token is required' });
  }

  try {
    // Optional: Verify the token is valid by fetching the user profile from GitHub
    // This ensures we don't save a garbage token
    let githubUsername = username;
    if (!githubUsername) {
      const userResponse = await axios.get('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      githubUsername = userResponse.data.login;
    }

    // Encrypt the token before saving
    const encryptedToken = encryptToken(accessToken);

    // Update User in MongoDB
    await User.findOneAndUpdate(
      { uid: userId }, // Find by Firebase UID
      {
        $set: {
          'integrations.github.connected': true,
          'integrations.github.accessToken': encryptedToken, // Save Encrypted!
          'integrations.github.username': githubUsername,
          'integrations.github.connectedAt': new Date()
        }
      },
      { new: true, upsert: true }
    );

    res.json({ message: 'GitHub connected successfully', username: githubUsername });

  } catch (error) {
    console.error('GitHub Connect Error:', error.message);
    res.status(500).json({ message: 'Failed to connect GitHub account' });
  }
});

// 2. GET REPOS ROUTE
// GET /api/github/repos
router.get('/repos', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const user = await User.findOne({ uid: userId });

    if (!user || !user.integrations?.github?.accessToken) {
      return res.status(400).json({ 
        message: 'GitHub not connected', 
        connected: false 
      });
    }

    // Decrypt the token
    const decryptedToken = decryptToken(user.integrations.github.accessToken);

    // Fetch Repos from GitHub
    const reposResponse = await axios.get('https://api.github.com/user/repos', {
      params: {
        sort: 'updated',
        per_page: 20,
        visibility: 'all', // Get private and public
        affiliation: 'owner,collaborator'
      },
      headers: { 
        Authorization: `Bearer ${decryptedToken}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    res.json({ 
      repos: reposResponse.data, 
      connected: true, 
      username: user.integrations.github.username 
    });

  } catch (error) {
    console.error('Error fetching repos:', error.message);
    
    // Handle Token Expiry (401)
    if (error.response?.status === 401) {
      return res.status(401).json({ message: 'GitHub token expired. Please reconnect.', connected: false });
    }

    res.status(500).json({ message: 'Failed to fetch repositories' });
  }
});

module.exports = router;