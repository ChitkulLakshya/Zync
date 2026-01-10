const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const User = require('../models/User');
const { encrypt } = require('../utils/encryption');
const { getUserInstallationId, getInstallationRepositories, checkGithubConfig } = require('../utils/githubService');
const axios = require('axios');

// POST /api/github/callback - Exchange OAuth code for access token
router.post('/callback', verifyToken, async (req, res) => {
  const { code } = req.body;
  const userId = req.user.uid;

  if (!code) {
    return res.status(400).json({ message: 'Authorization code is required' });
  }

  try {
    // Exchange code for access token
    const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: process.env.VITE_GITHUB_CLIENT_ID,
      client_secret: process.env.VITE_GITHUB_CLIENT_SECRET,
      code,
    }, {
      headers: { Accept: 'application/json' }
    });

    const { access_token, error, error_description } = tokenResponse.data;

    if (error || !access_token) {
      console.error('GitHub Token Error:', error, error_description);
      return res.status(400).json({ message: 'Failed to authenticate with GitHub', details: error_description });
    }

    // Fetch GitHub User Profile
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    const githubUser = userResponse.data;

    // Update User in MongoDB
    // Ensure we update strictly defined fields
    await User.findOneAndUpdate(
      { uid: userId },
      {
        $set: {
          'integrations.github.connected': true,
          'integrations.github.accessToken': access_token,
          'integrations.github.username': githubUser.login,
          'integrations.github.id': githubUser.id,
        }
      }
    );

    res.json({ message: 'GitHub connected successfully', username: githubUser.login });

  } catch (error) {
    console.error('GitHub Callback Exception:', error.response?.data || error.message);
    res.status(500).json({ message: 'Internal Server Error during GitHub connection' });
  }
});

// POST /api/github/settings - Save GitHub App Credentials
router.post('/settings', verifyToken, async (req, res) => {
  const { appId, privateKey } = req.body;
  const userId = req.user.uid;

  if (!appId || !privateKey) {
    return res.status(400).json({ message: 'App ID and Private Key are required' });
  }

  try {
    const encryptedAppId = encrypt(appId);
    const encryptedPrivateKey = encrypt(privateKey);

    await User.findOneAndUpdate(
      { uid: userId },
      {
        $set: {
          'integrations.github.encryptedAppId': encryptedAppId,
          'integrations.github.encryptedPrivateKey': encryptedPrivateKey
        }
      }
    );

    res.json({ message: 'GitHub settings saved successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error saving settings' });
  }
});

// GET /api/github/settings - Check if configured
router.get('/settings', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const user = await User.findOne({ uid: userId });
    
    // Check if both fields exist
    const isConfigured = !!(user?.integrations?.github?.encryptedAppId && user?.integrations?.github?.encryptedPrivateKey);
    
    res.json({ configured: isConfigured });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/github/repos - Fetch repos for current user
router.get('/repos', verifyToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const user = await User.findOne({ uid: userId });

    // Method 1: OAuth Access Token (Priority)
    if (user?.integrations?.github?.accessToken) {
        try {
            const reposResponse = await axios.get('https://api.github.com/user/repos', {
                params: {
                    sort: 'updated',
                    per_page: 20,
                    affiliation: 'owner,collaborator'
                },
                headers: { 
                    Authorization: `Bearer ${user.integrations.github.accessToken}`,
                    Accept: 'application/vnd.github.v3+json'
                }
            });
            return res.json({ repos: reposResponse.data, connected: true, method: 'oauth' });
        } catch (error) {
            console.error('Error fetching repos with access token:', error.response?.data || error.message);
            // If 401, token might be expired. Continue to other methods or return error.
            if (error.response?.status === 401) {
                // Optionally mark disconnected
            }
        }
    }

    // Method 2: Legacy/Manual App Configuration
    // Ensure user has configured their app first
    const isConfigured = await checkGithubConfig(userId);
    if (!isConfigured) {
       return res.status(400).json({ 
         message: 'GitHub not connected. Please connect your account.',
         configured: false
       });
    }

    const installationId = await getUserInstallationId(userId);

    if (!installationId) {
      return res.status(400).json({ 
        message: 'GitHub App not installed. Please install your Zync GitHub App.',
        connected: false 
      });
    }

    const repos = await getInstallationRepositories(userId, installationId); // Pass userId to decrypt keys
    res.json({ repos, connected: true, method: 'app' });

  } catch (error) {
    console.error('Error fetching repos:', error);
    res.status(500).json({ message: 'Failed to fetch repositories' });
  }
});

// POST /api/github/save-installation - Save installation ID after App callback
router.post('/save-installation', verifyToken, async (req, res) => {
  const { installationId } = req.body;
  const userId = req.user.uid;

  if (!installationId) return res.status(400).json({ message: 'Installation ID required' });

  try {
    await User.findOneAndUpdate(
      { uid: userId },
      { 
        $set: { 
          'integrations.github.connected': true,
          'integrations.github.installationId': installationId.toString()
        } 
      }
    );
    res.json({ message: 'GitHub connected successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

