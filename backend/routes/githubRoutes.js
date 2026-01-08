const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const User = require('../models/User');
const { encrypt } = require('../utils/encryption');
const { getUserInstallationId, getInstallationRepositories, checkGithubConfig } = require('../utils/githubService');

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
    
    // Ensure user has configured their app first
    const isConfigured = await checkGithubConfig(userId);
    if (!isConfigured) {
       return res.status(400).json({ 
         message: 'GitHub App settings not configured. Please set your App ID and Private Key.',
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
    res.json({ repos, connected: true });

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

