const express = require('express');
const router = express.Router();
const axios = require('axios');
const CryptoJS = require('crypto-js');
const User = require('../models/User');
const verifyToken = require('../middleware/authMiddleware');
const { normalizeDoc } = require('../utils/normalize');
const { getInstallationAccessToken } = require('../utils/githubAppAuth');
const cache = require('../utils/cache');
const {
  ARCHITECTURE_CACHE_MAX_ENTRIES,
  ARCHITECTURE_CACHE_TTL_MS,
} = require('../config/freeTierLimits');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  console.warn("WARNING: ENCRYPTION_KEY is not defined in environment variables.");
}

const encryptToken = (token) => {
  return CryptoJS.AES.encrypt(token, ENCRYPTION_KEY).toString();
};

const decryptToken = (ciphertext) => {
  const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

const GITHUB_CACHE_MAX_SIZE = ARCHITECTURE_CACHE_MAX_ENTRIES;
const GITHUB_CACHE_TTL_MS = ARCHITECTURE_CACHE_TTL_MS;
const githubCache = new Map();

const pruneGithubCache = () => {
  const now = Date.now();

  for (const [key, value] of githubCache.entries()) {
    if (!value || value.expiresAt <= now) {
      githubCache.delete(key);
    }
  }

  while (githubCache.size > GITHUB_CACHE_MAX_SIZE) {
    const oldestKey = githubCache.keys().next().value;
    if (!oldestKey) break;
    githubCache.delete(oldestKey);
  }
};

const githubCacheSet = (key, value) => {
  pruneGithubCache();
  githubCache.set(key, {
    ...value,
    expiresAt: Date.now() + GITHUB_CACHE_TTL_MS,
  });
  pruneGithubCache();
};

const fetchWithEtag = async (url, config, cacheKey) => {
  pruneGithubCache();
  const cached = githubCache.get(cacheKey);
  const headers = { ...config.headers };
  if (cached && cached.etag) {
    headers['If-None-Match'] = cached.etag;
  }
  
  try {
    const res = await axios.get(url, { ...config, headers });
    if (res.headers?.etag) {
      githubCacheSet(cacheKey, { etag: res.headers.etag, data: res.data });
    }
    return res;
  } catch (error) {
    if (error.response && error.response.status === 304 && cached) {
      return { ...error.response, status: 304, data: cached.data };
    }
    throw error;
  }
};

router.post('/connect', verifyToken, async (req, res) => {
  const { accessToken } = req.body;
  const uid = req.user.uid;

  if (!accessToken) {
    return res.status(400).json({ message: 'Access token is required' });
  }

  try {
    const githubResponse = await fetchWithEtag(
      'https://api.github.com/user',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json'
        }
      },
      `connect_user_${uid}`
    );

    const githubUsername = githubResponse.data.login;
    const encryptedToken = encryptToken(accessToken);

    const updatedUser = await User.findOneAndUpdate(
      { uid },
      {
        $set: {
          githubIntegration: {
            connected: true,
            accessToken: encryptedToken,
            username: githubUsername,
            connectedAt: new Date().toISOString()
          }
        }
      },
      { returnDocument: 'after', lean: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    await cache.delByPattern(`gh:*:${uid}*`).catch(() => {});

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


router.delete('/disconnect', verifyToken, async (req, res) => {
  const uid = req.user.uid;

  try {
    const updated = await User.findOneAndUpdate(
      { uid },
      {
        $set: {
          githubIntegration: {
            connected: false,
            accessToken: null,
            username: null,
            installationId: null
          }
        }
      },
      { returnDocument: 'after' }
    );

    if (!updated) {
      return res.status(404).json({ message: 'User not found' });
    }

    await cache.delByPattern(`gh:*:${uid}*`).catch(() => {});
    res.json({ message: 'GitHub disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting GitHub:', error.message);
    res.status(500).json({ message: 'Failed to disconnect GitHub' });
  }
});


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
    const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: clientId,
      client_secret: clientSecret,
      code: code
    }, {
      headers: { Accept: 'application/json' }
    });

    const { access_token, error, error_description } = tokenResponse.data;

    if (error || !access_token) {
      console.error('GitHub OAuth error:', error, error_description);
      return res.status(400).json({ message: error_description || 'Failed to exchange code for token' });
    }

    const userResponse = await fetchWithEtag(
      'https://api.github.com/user',
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          Accept: 'application/vnd.github.v3+json'
        }
      },
      `callback_user_${uid}`
    );

    const githubUser = userResponse.data;
    const encryptedToken = encryptToken(access_token);

    await User.findOneAndUpdate(
      { uid },
      {
        $set: {
          githubIntegration: {
            connected: true,
            accessToken: encryptedToken,
            username: githubUser.login,
            connectedAt: new Date().toISOString()
          }
        }
      }
    );

    await cache.delByPattern(`gh:*:${uid}*`).catch(() => {});

    res.json({
      message: 'GitHub connected successfully',
      username: githubUser.login
    });

  } catch (error) {
    console.error('Error in GitHub OAuth callback:', error.message);
    res.status(500).json({ message: 'Failed to complete GitHub authentication' });
  }
});


router.get('/repos', verifyToken, async (req, res) => {
  const uid = req.user.uid;

  try {
    const cached = await cache.getJson(`gh:repos:${uid}`);
    if (cached) return res.json(cached);

    const user = await User.findOne({ uid }).lean();
    const github = user?.githubIntegration;

    if (!user || !github?.connected || !github?.accessToken) {
      return res.status(400).json({ message: 'GitHub account not connected' });
    }

    let accessToken;
    try {
      accessToken = decryptToken(github.accessToken);
    } catch (err) {
      console.error("Decryption failed:", err);
      return res.status(500).json({ message: 'Failed to decrypt access token' });
    }

    if (!accessToken) {
      return res.status(500).json({ message: 'Invalid stored token' });
    }

    const page = parseInt(req.query.page) || 1;
    const per_page = parseInt(req.query.per_page) || 30;

    const cacheKey = `repos_${uid}_${page}_${per_page}`;
    const githubResponse = await fetchWithEtag('https://api.github.com/user/repos', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json'
      },
      params: {
        sort: 'updated',
        visibility: 'all',
        per_page,
        page
      }
    }, cacheKey);

    const linkHeader = githubResponse.headers.link;
    const hasNextPage = !!(linkHeader && linkHeader.includes('rel="next"'));
    const result = { repos: githubResponse.data, hasNextPage, page };

    cache.setJson(`gh:repos:${uid}:${page}`, result, 300);
    res.json(result);

  } catch (error) {
    console.error('Error fetching GitHub repos:', error.message);

    if (error.response && error.response.status === 401) {
      const user = await User.findOne({ uid }).lean();
      await User.updateOne(
        { uid },
        {
          $set: {
            githubIntegration: { ...user?.githubIntegration, connected: false }
          }
        }
      );
      return res.status(401).json({ message: 'GitHub token expired. Please reconnect.' });
    }

    res.status(500).json({ message: 'Failed to fetch repositories' });
  }
});


router.post('/install', verifyToken, async (req, res) => {
  const { installationId } = req.body;
  const uid = req.user.uid;

  if (!installationId) {
    return res.status(400).json({ message: 'Installation ID required' });
  }

  try {
    const user = await User.findOne({ uid }).lean();
    const existingGithub = user?.githubIntegration || {};

    const updatedUser = await User.findOneAndUpdate(
      { uid },
      {
        $set: {
          githubIntegration: {
            ...existingGithub,
            installationId: installationId.toString(),
            connected: true,
            connectedAt: new Date().toISOString()
          }
        }
      },
      { returnDocument: 'after', lean: true }
    );

    res.json({ message: 'GitHub App Installation Connected', user: normalizeDoc(updatedUser) });
    cache.delByPattern(`gh:*:${uid}*`).catch(() => {});
  } catch (error) {
    console.error('Error saving installation ID:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


const disconnectGithub = async (uid, extra = {}) => {
  try {
    const user = await User.findOne({ uid }).lean();
    const existing = user?.githubIntegration || {};
    await User.updateOne(
      { uid },
      {
        $set: {
          githubIntegration: {
            ...existing,
            connected: false,
            ...extra
          }
        }
      }
    );
  } catch (e) {
    console.error('Failed to disconnect github:', e);
  }
};


router.get('/user-repos', verifyToken, async (req, res) => {
  const uid = req.user.uid;

  try {
    const cached = await cache.getJson(`gh:user-repos:${uid}`);
    if (cached) return res.json(cached);

    const user = await User.findOne({ uid }).lean();
    const github = user?.githubIntegration;

    if (!user || !github?.installationId) {
      return res.status(400).json({
        message: 'GitHub App not installed',
        notInstalled: true
      });
    }

    const installationId = github.installationId;
    const appId = process.env.GITHUB_APP_ID;
    let privateKey = process.env.GITHUB_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!appId || !privateKey) {
      console.error('Missing GITHUB_APP_ID or GITHUB_PRIVATE_KEY');
      return res.status(500).json({ message: 'Server configuration error: Missing GitHub credentials' });
    }

    privateKey = privateKey.replace(/\\n/g, '\n');

    if (!privateKey.includes('BEGIN RSA PRIVATE KEY') || privateKey.length < 50) {
      console.error('Invalid GITHUB_PRIVATE_KEY format.');
      return res.status(500).json({ message: 'Server configuration error: Invalid GitHub Private Key format' });
    }

    const { App } = await import('octokit');
    let app;
    try {
      app = new App({ appId, privateKey });
    } catch (err) {
      console.error("Failed to initialize Octokit App:", err.message);
      return res.status(500).json({ message: 'Internal Server Error: Failed to initialize GitHub App' });
    }

    let octokit;
    const numericInstallationId = parseInt(installationId, 10);
    if (isNaN(numericInstallationId)) {
      console.error(`Invalid installationId format: ${installationId}`);
      await disconnectGithub(uid);
      return res.status(400).json({ message: 'Invalid GitHub installation ID. Please reinstall the app.', notInstalled: true });
    }

    try {
      octokit = await app.getInstallationOctokit(numericInstallationId);
    } catch (err) {
      console.error(`Failed to get installation octokit for ID ${installationId}:`, err.message);
      if (err.status === 404 || err.status === 401) {
        await disconnectGithub(uid);
        return res.status(404).json({ message: 'GitHub App installation not found. Please reinstall.', notInstalled: true });
      }
      throw err;
    }

    try {
      const page = parseInt(req.query.page) || 1;
      const per_page = parseInt(req.query.per_page) || 30;
      
      const cacheKey = `user_repos_${uid}_${page}_${per_page}`;
      const cached = githubCache.get(cacheKey);
      const headers = cached && cached.etag ? { 'If-None-Match': cached.etag } : {};

      let response;
      try {
        response = await octokit.request('GET /installation/repositories', { per_page, page, headers });
        if (response.headers?.etag) {
          githubCacheSet(cacheKey, { etag: response.headers.etag, data: response.data });
        }
      } catch (err) {
        if (err.status === 304 && cached) {
          response = { headers: err.response?.headers || {}, data: cached.data };
        } else {
          throw err;
        }
      }

      const linkHeader = response.headers?.link;
      const hasNextPage = !!(linkHeader && linkHeader.includes('rel="next"'));

      const repos = response.data.repositories.map(repo => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        private: repo.private,
        owner: repo.owner.login,
        html_url: repo.html_url
      }));

      const userReposResult = { repos, hasNextPage, page };
      cache.setJson(`gh:user-repos:${uid}:${page}`, userReposResult, 300);
      res.json(userReposResult);
    } catch (requestErr) {
      console.error("Error fetching repositories from GitHub:", requestErr.message);
      await disconnectGithub(uid, { installationId: null });
      const status = requestErr.status || requestErr.response?.status;
      if (status === 404) {
        return res.status(400).json({ message: 'GitHub App installation not found. Please reinstall.', notInstalled: true });
      }
      if (status === 401 || status === 403) {
        return res.status(401).json({ message: 'GitHub App authentication failed.', notInstalled: true });
      }
      return res.status(500).json({ message: 'Failed to fetch repositories. Please reinstall.', notInstalled: true });
    }

  } catch (error) {
    console.error('Error fetching installation repos:', error);
    if (req.user?.uid) {
      await disconnectGithub(req.user.uid, { installationId: null });
    }
    res.status(500).json({
      message: 'Failed to fetch repositories. Please reinstall.',
      notInstalled: true,
      error: error.message
    });
  }
});


router.get('/stats', verifyToken, async (req, res) => {
  const uid = req.user.uid;

  try {
    const cached = await cache.getJson(`gh:stats:${uid}`);
    if (cached) return res.json(cached);

    const user = await User.findOne({ uid }).lean();
    const github = user?.githubIntegration;

    if (!user || !github?.connected || !github?.accessToken) {
      return res.json({ connected: false, message: 'GitHub account not connected' });
    }

    const accessToken = decryptToken(github.accessToken);
    const username = github.username;

    const cacheKey = `stats_${username}`;
    const userResponse = await fetchWithEtag(`https://api.github.com/users/${username}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json'
      }
    }, cacheKey);

    const stats = {
      login: userResponse.data.login,
      name: userResponse.data.name,
      avatar_url: userResponse.data.avatar_url,
      bio: userResponse.data.bio,
      public_repos: userResponse.data.public_repos,
      followers: userResponse.data.followers,
      following: userResponse.data.following,
      created_at: userResponse.data.created_at,
      html_url: userResponse.data.html_url
    };

    cache.setJson(`gh:stats:${uid}`, stats, 600);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching GitHub stats:', error.message);
    res.status(500).json({ message: 'Failed to fetch GitHub stats' });
  }
});


router.get('/events', verifyToken, async (req, res) => {
  const uid = req.user.uid;

  try {
    const cached = await cache.getJson(`gh:events:${uid}`);
    if (cached) return res.json(cached);

    const user = await User.findOne({ uid }).lean();
    const github = user?.githubIntegration;

    if (!user || !github?.connected || !github?.accessToken) {
      return res.json({ connected: false, message: 'GitHub account not connected' });
    }

    const accessToken = decryptToken(github.accessToken);
    const username = github.username;

    const cacheKey = `events_${username}`;
    const eventsResponse = await fetchWithEtag(`https://api.github.com/users/${username}/events?per_page=30`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json'
      }
    }, cacheKey);

    const events = eventsResponse.data.map(event => ({
      id: event.id,
      type: event.type,
      repo: event.repo.name,
      created_at: event.created_at,
      actor: event.actor ? {
        login: event.actor.login,
        avatar_url: event.actor.avatar_url,
        html_url: event.actor.html_url,
      } : null,
      payload: {
        action: event.payload?.action,
        ref: event.payload?.ref,
        commits: event.payload?.commits?.slice(0, 3)?.map(c => ({
          sha: c.sha?.substring(0, 7),
          message: c.message?.substring(0, 80)
        }))
      }
    }));

    cache.setJson(`gh:events:${uid}`, events, 60);
    res.json(events);
  } catch (error) {
    console.error('Error fetching GitHub events:', error.message);
    res.status(500).json({ message: 'Failed to fetch GitHub events' });
  }
});


router.get('/contributions', verifyToken, async (req, res) => {
  const uid = req.user.uid;

  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();
    const cacheKey = `gh:contribs:${uid}:${year}`;

    const cached = await cache.getJson(cacheKey);
    if (cached) return res.json(cached);

    const user = await User.findOne({ uid }).lean();
    const github = user?.githubIntegration;

    if (!user || !github?.connected || !github?.accessToken) {
      return res.json({ connected: false, message: 'GitHub account not connected' });
    }

    const accessToken = decryptToken(github.accessToken);
    const username = github.username;

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

    const from = new Date(`${year}-01-01T00:00:00Z`).toISOString();
    const to = new Date(`${year}-12-31T23:59:59Z`).toISOString();

    const graphqlResponse = await axios.post(
      'https://api.github.com/graphql',
      { query, variables: { username, from, to } },
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

    const contributions = [];
    calendar.weeks.forEach(week => {
      week.contributionDays.forEach(day => {
        contributions.push({
          date: day.date,
          count: day.contributionCount,
          level: 0
        });
      });
    });

    cache.setJson(cacheKey, contributions, 1800);
    res.json(contributions);
  } catch (error) {
    console.error('Error fetching contributions:', error.message);
    res.status(500).json({ message: 'Failed to fetch contribution data' });
  }
});


router.get('/readme', verifyToken, async (req, res) => {
  const { owner, repo } = req.query;
  const uid = req.user.uid;

  if (!owner || !repo) {
    return res.status(400).json({ message: 'Owner and repo are required' });
  }

  try {
    const cacheKey = `gh:readme:${owner}:${repo}`;
    const cached = await cache.getJson(cacheKey);
    if (cached !== null) return res.send(cached);

    const user = await User.findOne({ uid }).lean();
    const github = user?.githubIntegration;

    if (!user || !github?.connected || !github?.installationId) {
      return res.status(400).json({ message: 'GitHub App not installed' });
    }

    const installationId = github.installationId;
    const accessToken = await getInstallationAccessToken(installationId);
    const readmeCacheKey = `readme_${uid}_${owner}_${repo}_${installationId}`;

    try {
      const response = await fetchWithEtag(
        `https://api.github.com/repos/${owner}/${repo}/readme`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.raw+json'
          }
        },
        readmeCacheKey
      );
      cache.setJson(cacheKey, response.data, 1800);
      res.send(response.data);
    } catch (err) {
      if (err.response && err.response.status === 404) {
        cache.setJson(cacheKey, '# No README found', 1800);
        return res.send("# No README found");
      }
      throw err;
    }

  } catch (error) {
    console.error('Error fetching README:', error);
    res.status(500).json({ message: 'Failed to fetch README' });
  }
});

module.exports = router;
