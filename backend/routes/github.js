const express = require('express');
const router = express.Router();
const axios = require('axios');
const CryptoJS = require('crypto-js');
const User = require('../models/User');
const verifyToken = require('../middleware/authMiddleware');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  console.warn("WARNING: ENCRYPTION_KEY is not defined in environment variables. GitHub token encryption will fail or be insecure.");
}

// Helper functions for encryption/decryption using crypto-js
const encryptToken = (token) => {
  return CryptoJS.AES.encrypt(token, ENCRYPTION_KEY).toString();
};

const decryptToken = (ciphertext) => {
  const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// POST /connect - Validate and save GitHub token
router.post('/connect', verifyToken, async (req, res) => {
  const { accessToken, username } = req.body;
  const uid = req.user.uid;

  if (!accessToken || !username) {
    return res.status(400).json({ message: 'Access token and username are required' });
  }

  try {
    // 1. Validate the token with GitHub
    await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    // 2. Encrypt the token
    const encryptedToken = encryptToken(accessToken);

    // 3. Update User in MongoDB
    const updatedUser = await User.findOneAndUpdate(
      { uid },
      {
        $set: {
          'integrations.github.connected': true,
          'integrations.github.accessToken': encryptedToken,
          'integrations.github.username': username,
          'integrations.github.connectedAt': new Date()
        }
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ 
      message: 'GitHub connected successfully', 
      username: updatedUser.integrations.github.username 
    });

  } catch (error) {
    console.error('Error connecting GitHub:', error.message);
    if (error.response && error.response.status === 401) {
      return res.status(401).json({ message: 'Invalid GitHub access token' });
    }
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// GET /repos - Fetch user's repositories
router.get('/repos', verifyToken, async (req, res) => {
  const uid = req.user.uid;

  try {
    // 1. Find User
    const user = await User.findOne({ uid });

    if (!user || !user.integrations?.github?.connected || !user.integrations?.github?.accessToken) {
      return res.status(400).json({ message: 'GitHub account not connected' });
    }

    // 2. Decrypt Token
    let accessToken;
    try {
      accessToken = decryptToken(user.integrations.github.accessToken);
    } catch (err) {
      console.error("Decryption failed:", err);
      return res.status(500).json({ message: 'Failed to decrypt access token' });
    }
    
    if (!accessToken) {
       return res.status(500).json({ message: 'Invalid stored token' });
    }

    // 3. Fetch Repositories from GitHub
    const githubResponse = await axios.get('https://api.github.com/user/repos', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json'
      },
      params: {
        sort: 'updated',
        visibility: 'all',
        per_page: 100 
      }
    });

    res.json(githubResponse.data);

  } catch (error) {
    console.error('Error fetching GitHub repos:', error.message);

    // 4. Handle 401 (Expired/Revoked Token)
    if (error.response && error.response.status === 401) {
      // Disconnect GitHub in DB
      await User.findOneAndUpdate(
        { uid },
        { 
          $set: { 'integrations.github.connected': false } 
        }
      );
      return res.status(401).json({ message: 'GitHub token expired. Please reconnect.' });
    }

    res.status(500).json({ message: 'Failed to fetch repositories' });
  }
});

module.exports = router;
