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
  const { accessToken } = req.body;
  const uid = req.user.uid;

  if (!accessToken) {
    return res.status(400).json({ message: 'Access token is required' });
  }

  try {
    // 1. Validate the token with GitHub and get the actual username
    const githubResponse = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    // Use the login (username) from GitHub, not the display name
    const githubUsername = githubResponse.data.login;

    // 2. Encrypt the token
    const encryptedToken = encryptToken(accessToken);

    // 3. Update User in MongoDB
    const updatedUser = await User.findOneAndUpdate(
      { uid },
      {
        $set: {
          'integrations.github.connected': true,
          'integrations.github.accessToken': encryptedToken,
          'integrations.github.username': githubUsername,
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
      username: githubUsername
    });

  } catch (error) {
    console.error('Error connecting GitHub:', error.message);
    if (error.response && error.response.status === 401) {
      return res.status(401).json({ message: 'Invalid GitHub access token' });
    }
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// DELETE /disconnect - Unlink GitHub account
router.delete('/disconnect', verifyToken, async (req, res) => {
  const uid = req.user.uid;

  try {
    const updatedUser = await User.findOneAndUpdate(
      { uid },
      {
        $set: {
          'integrations.github.connected': false,
          'integrations.github.accessToken': null,
          'integrations.github.username': null,
          'integrations.github.installationId': null
        }
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'GitHub disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting GitHub:', error.message);
    res.status(500).json({ message: 'Failed to disconnect GitHub' });
  }
});

// POST /callback - OAuth callback to exchange code for access token
router.post('/callback', verifyToken, async (req, res) => {
  const { code } = req.body;
  const uid = req.user.uid;

  if (!code) {
    return res.status(400).json({ message: 'Authorization code is required' });
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('Missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET');
    return res.status(500).json({ message: 'Server configuration error' });
  }

  try {
    // 1. Exchange code for access token
    const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: clientId,
      client_secret: clientSecret,
      code: code
    }, {
      headers: {
        Accept: 'application/json'
      }
    });

    const { access_token, error, error_description } = tokenResponse.data;

    if (error || !access_token) {
      console.error('GitHub OAuth error:', error, error_description);
      return res.status(400).json({ message: error_description || 'Failed to exchange code for token' });
    }

    // 2. Get user info from GitHub
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    const githubUser = userResponse.data;

    // 3. Encrypt and save the token
    const encryptedToken = encryptToken(access_token);

    const updatedUser = await User.findOneAndUpdate(
      { uid },
      {
        $set: {
          'integrations.github.connected': true,
          'integrations.github.accessToken': encryptedToken,
          'integrations.github.username': githubUser.login,
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
      username: githubUser.login
    });

  } catch (error) {
    console.error('Error in GitHub OAuth callback:', error.message);
    res.status(500).json({ message: 'Failed to complete GitHub authentication' });
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

// POST /install - Save Installation ID from Callback
router.post('/install', verifyToken, async (req, res) => {
  const { installationId } = req.body;
  const uid = req.user.uid;

  if (!installationId) {
    return res.status(400).json({ message: 'Installation ID required' });
  }

  try {
    const updatedUser = await User.findOneAndUpdate(
      { uid },
      {
        $set: {
          'integrations.github.installationId': installationId.toString(),
          'integrations.github.connected': true,
          'integrations.github.connectedAt': new Date()
        }
      },
      { new: true }
    );

    res.json({ message: 'GitHub App Installation Connected', user: updatedUser });
  } catch (error) {
    console.error('Error saving installation ID:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /user-repos - Fetch all repos accessible to the GitHub App Installation
router.get('/user-repos', verifyToken, async (req, res) => {
  const uid = req.user.uid;

  try {
    const user = await User.findOne({ uid });

    // Check if App is installed
    if (!user || !user.integrations?.github?.installationId) {
      return res.status(400).json({
        message: 'GitHub App not installed',
        notInstalled: true
      });
    }

    const installationId = user.integrations.github.installationId;
    const appId = process.env.GITHUB_APP_ID;
    let privateKey = process.env.GITHUB_PRIVATE_KEY?.replace(/\\n/g, '\n');

    // Validate Config
    if (!appId || !privateKey) {
      console.error('Missing GITHUB_APP_ID or GITHUB_PRIVATE_KEY');
      return res.status(500).json({ message: 'Server configuration error: Missing GitHub credentials' });
    }

    // Fix multiline key if needed (dotenv might read it as one line with \n chars if not quoted)
    privateKey = privateKey.replace(/\\n/g, '\n');

    // Basic validation of key format
    if (!privateKey.includes('BEGIN RSA PRIVATE KEY') || privateKey.length < 50) {
      console.error('Invalid GITHUB_PRIVATE_KEY format. Length:', privateKey.length);
      return res.status(500).json({
        message: 'Server configuration error: Invalid GitHub Private Key format',
        hint: 'Ensure the key is wrapped in double quotes in .env if it is multiline.'
      });
    }

    // Initialize Octokit App
    const { App } = await import('octokit');
    let app;
    try {
      app = new App({
        appId,
        privateKey,
      });
    } catch (err) {
      console.error("Failed to initialize Octokit App:", err.message);
      return res.status(500).json({ message: 'Internal Server Error: Failed to initialize GitHub App' });
    }

    // Get Installation Octokit (Authenticated as the App for this Installation)
    let octokit;
    console.log(`Attempting to get installation octokit for ID: ${installationId} (type: ${typeof installationId})`);
    try {
      // Ensure installationId is a number
      const numericInstallationId = parseInt(installationId, 10);
      if (isNaN(numericInstallationId)) {
        console.error(`Invalid installationId format: ${installationId}`);
        await User.findOneAndUpdate({ uid }, { $set: { 'integrations.github.connected': false } });
        return res.status(400).json({ message: 'Invalid GitHub installation ID. Please reinstall the app.', notInstalled: true });
      }
      octokit = await app.getInstallationOctokit(numericInstallationId);
    } catch (err) {
      console.error(`Failed to get installation octokit for ID ${installationId}:`, err.message, err.status);
      if (err.status === 404 || err.status === 401) {
        // Installation deleted, revoked, or ID is invalid
        await User.findOneAndUpdate({ uid }, { $set: { 'integrations.github.connected': false } });
        return res.status(404).json({ message: 'GitHub App installation not found or access revoked. Please reinstall.', notInstalled: true });
      }
      throw err;
    }

    // Fetch Repositories (paginated)
    try {
      const response = await octokit.request('GET /installation/repositories', {
        per_page: 100
      });

      const repos = response.data.repositories.map(repo => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        private: repo.private,
        owner: repo.owner.login,
        html_url: repo.html_url
      }));

      res.json(repos);
    } catch (requestErr) {
      console.error("Error fetching repositories from GitHub:", requestErr.message);
      const status = requestErr.status || requestErr.response?.status;
      if (status === 404) {
        // Installation ID is invalid or was removed
        await User.findOneAndUpdate({ uid }, { $set: { 'integrations.github.connected': false, 'integrations.github.installationId': null } });
        return res.status(400).json({ message: 'GitHub App installation not found. Please reinstall the app.', notInstalled: true });
      }
      if (status === 401 || status === 403) {
        await User.findOneAndUpdate({ uid }, { $set: { 'integrations.github.connected': false, 'integrations.github.installationId': null } });
        return res.status(401).json({ message: 'GitHub App authentication failed. Installation might be suspended.', notInstalled: true });
      }
      // For any other error, also clear the installation to allow re-auth
      await User.findOneAndUpdate({ uid }, { $set: { 'integrations.github.connected': false, 'integrations.github.installationId': null } });
      return res.status(500).json({ message: 'Failed to fetch repositories. Please try reinstalling the GitHub App.', notInstalled: true, error: requestErr.message });
    }

  } catch (error) {
    console.error('Error fetching installation repos:', error);
    // Clear installation on any error to prevent stuck states
    if (req.user?.uid) {
      await User.findOneAndUpdate({ uid: req.user.uid }, { $set: { 'integrations.github.connected': false, 'integrations.github.installationId': null } });
    }
    res.status(500).json({
      message: 'Failed to fetch repositories. Please reinstall the GitHub App.',
      notInstalled: true,
      error: error.message
    });
  }
});

// GET /stats - Fetch GitHub user stats (public profile info)
router.get('/stats', verifyToken, async (req, res) => {
  const uid = req.user.uid;

  try {
    const user = await User.findOne({ uid });

    if (!user || !user.integrations?.github?.connected || !user.integrations?.github?.accessToken) {
      return res.json({ connected: false, message: 'GitHub account not connected' });
    }

    const accessToken = decryptToken(user.integrations.github.accessToken);
    const username = user.integrations.github.username;

    // Fetch user profile
    const userResponse = await axios.get(`https://api.github.com/users/${username}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    res.json({
      login: userResponse.data.login,
      name: userResponse.data.name,
      avatar_url: userResponse.data.avatar_url,
      bio: userResponse.data.bio,
      public_repos: userResponse.data.public_repos,
      followers: userResponse.data.followers,
      following: userResponse.data.following,
      created_at: userResponse.data.created_at,
      html_url: userResponse.data.html_url
    });
  } catch (error) {
    console.error('Error fetching GitHub stats:', error.message);
    res.status(500).json({ message: 'Failed to fetch GitHub stats' });
  }
});

// GET /events - Fetch recent GitHub events/activity
router.get('/events', verifyToken, async (req, res) => {
  const uid = req.user.uid;

  try {
    const user = await User.findOne({ uid });

    if (!user || !user.integrations?.github?.connected || !user.integrations?.github?.accessToken) {
      return res.json({ connected: false, message: 'GitHub account not connected' });
    }

    const accessToken = decryptToken(user.integrations.github.accessToken);
    const username = user.integrations.github.username;

    // Fetch user events
    const eventsResponse = await axios.get(`https://api.github.com/users/${username}/events?per_page=30`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    // Map and filter relevant events
    const events = eventsResponse.data.map(event => ({
      id: event.id,
      type: event.type,
      repo: event.repo.name,
      created_at: event.created_at,
      payload: {
        action: event.payload?.action,
        ref: event.payload?.ref,
        commits: event.payload?.commits?.slice(0, 3)?.map(c => ({
          sha: c.sha?.substring(0, 7),
          message: c.message?.substring(0, 80)
        }))
      }
    }));

    res.json(events);
  } catch (error) {
    console.error('Error fetching GitHub events:', error.message);
    res.status(500).json({ message: 'Failed to fetch GitHub events' });
  }
});

// GET /contributions - Fetch contribution data (approximated from events)
router.get('/contributions', verifyToken, async (req, res) => {
  const uid = req.user.uid;

  try {
    const user = await User.findOne({ uid });

    if (!user || !user.integrations?.github?.connected || !user.integrations?.github?.accessToken) {
      return res.json({ connected: false, message: 'GitHub account not connected' });
    }

    const accessToken = decryptToken(user.integrations.github.accessToken);
    const username = user.integrations.github.username;

    // Fetch contributions via GraphQL for accuracy
    const query = `
      query($username: String!, $from: DateTime!, $to: DateTime!) {
        user(login: $username) {
          contributionsCollection(from: $from, to: $to) {
            contributionCalendar {
              totalContributions
              weeks {
                contributionDays {
                  contributionCount
                  date
                  color
                }
              }
            }
          }
        }
      }
    `;

    // Determine date range
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const from = new Date(`${year}-01-01T00:00:00Z`).toISOString();
    const to = new Date(`${year}-12-31T23:59:59Z`).toISOString();

    const graphqlResponse = await axios.post(
      'https://api.github.com/graphql',
      {
        query,
        variables: {
          username,
          from,
          to
        }
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (graphqlResponse.data.errors) {
      console.error('GraphQL Errors:', graphqlResponse.data.errors);
      throw new Error('GraphQL Error');
    }

    const calendar = graphqlResponse.data.data.user.contributionsCollection.contributionCalendar;

    // Flatten the weeks structure for the frontend
    const contributions = [];
    calendar.weeks.forEach(week => {
      week.contributionDays.forEach(day => {
        contributions.push({
          date: day.date,
          count: day.contributionCount,
          level: 0 // Will be calculated by frontend or logic can be added here
        });
      });
    });

    res.json(contributions);
  } catch (error) {
    console.error('Error fetching contributions:', error.message);
    res.status(500).json({ message: 'Failed to fetch contribution data' });
  }
});

module.exports = router;
