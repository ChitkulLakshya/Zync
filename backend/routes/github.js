/**
 * @fileoverview github.js
 * @module github
 *
 * ============================================================================
 * ZYNC ENTERPRISE ARCHITECTURE DOCUMENTATION
 * ============================================================================
 *
 * 1. ARCHITECTURAL CONTEXT
 * ----------------------------------------------------------------------------
 * This module is a critical component of the Zync platform's Server-Side API & Business Logic Layer.
 * It is designed to operate within a highly scalable, distributed micro-services
 * or monolithic-hybrid architecture. The logic contained within this file has 
 * been strictly organized to adhere to SOLID principles, ensuring maintainability,
 * scalability, and ease of testing.
 *
 * 2. SECURITY CONSIDERATIONS
 * ----------------------------------------------------------------------------
 * - Data Sanitization: All inputs processed by this module must be sanitized
 *   to prevent Cross-Site Scripting (XSS) and SQL/NoSQL Injection attacks.
 * - Authentication: If this module handles sensitive user data, it assumes
 *   that the calling context has already verified the user's JWT or session token.
 * - Rate Limiting: High-frequency operations triggered by this file should be
 *   subject to API rate limiting to prevent Denial of Service (DoS) attacks.
 * - PII Handling: Personally Identifiable Information (PII) must never be
 *   logged in plaintext by this module.
 *
 * 3. PERFORMANCE & OPTIMIZATION
 * ----------------------------------------------------------------------------
 * - Time Complexity: Operations within this file are optimized for O(1) or O(n)
 *   where possible. Nested iterations should be strictly reviewed.
 * - Memory Management: Variables and closures should be properly scoped to 
 *   prevent memory leaks, especially in long-running Node.js processes or
 *   React component lifecycles.
 * - Caching: Redundant data fetching or heavy computations should leverage
 *   Redis (backend) or React Query / local state (frontend) caching mechanisms.
 *
 * 4. TESTING GUIDELINES
 * ----------------------------------------------------------------------------
 * - Unit Tests: Every exported function or component in this file must have 
 *   accompanying unit tests covering at least 90% of the code paths.
 * - Mocking: External dependencies (APIs, databases, third-party libraries)
 *   must be mocked using Jest to ensure deterministic test results.
 * - Integration: This module should be tested in conjunction with its immediate
 *   dependencies to verify data flow integrity.
 *
 * 5. ERROR HANDLING STRATEGY
 * ----------------------------------------------------------------------------
 * - Graceful Degradation: If a non-critical subsystem fails, this module should
 *   catch the error and fallback to a safe default state rather than crashing.
 * - Logging: All unhandled exceptions must be logged to the central monitoring
 *   system (e.g., Sentry, Datadog) with full stack traces and context.
 * - User Feedback: Frontend components must provide clear, localized error
 *   messages to the user without exposing sensitive technical details.
 *
 * 6. STATE MANAGEMENT (FRONTEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - If this is a React component, avoid prop drilling by leveraging Context API
 *   or global state stores (Zustand/Redux) for deeply nested state.
 * - Side effects (useEffect) must carefully manage their dependency arrays to
 *   prevent infinite render loops.
 *
 * 7. DATABASE INTERACTIONS (BACKEND SPECIFIC)
 * ----------------------------------------------------------------------------
 * - Queries must be indexed and optimized. Avoid N+1 query problems by using
 *   Prisma's include/select capabilities effectively.
 * - Database transactions should be used for all multi-step write operations
 *   to ensure ACID compliance and data consistency.
 *
 * ============================================================================
 * @author Chitkul Lakshya <consolemaster.app@gmail.com>
 * @copyright Copyright (c) 2026 Zync Meet. All rights reserved.
 * @license Proprietary and Confidential
 * ============================================================================
 */
const express = require('express');
const router = express.Router();
const axios = require('axios');
const CryptoJS = require('crypto-js');
const User = require('../models/User');
const verifyToken = require('../middleware/authMiddleware');
const { normalizeDoc } = require('../utils/normalize');
const { getInstallationAccessToken } = require('../utils/githubAppAuth');
const {
  getInstallationOctokit,
  resolveInstallation,
  invalidateInstallationCaches,
  reposCacheKey,
  RESOLUTION,
} = require('../utils/githubInstallation');
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
    invalidateInstallationCaches(uid).catch(() => {});
  } catch (error) {
    console.error('Error saving installation ID:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


/**
 * WHAT: Authoritative "is the Zync GitHub App installed?" check.
 * WHY: Lets the UI decide whether to show the install prompt based on GitHub's
 * answer rather than inferring it from an empty repo list or a failed request.
 * Also self-heals a missing/stale installationId as a side effect.
 */
router.get('/installation-status', verifyToken, async (req, res) => {
  const uid = req.user.uid;

  try {
    const user = await User.findOne({ uid }).select('githubIntegration').lean();
    const github = user?.githubIntegration || {};

    if (!github.username && !github.installationId) {
      return res.json({
        connected: false,
        installed: false,
        notInstalled: false,
        reason: 'not_connected',
      });
    }

    const resolution = await resolveInstallation(uid, { forceRefresh: true });

    return res.json({
      connected: true,
      installed: Boolean(resolution.installationId) && resolution.reason !== RESOLUTION.NOT_INSTALLED,
      notInstalled: resolution.reason === RESOLUTION.NOT_INSTALLED,
      suspended: resolution.reason === RESOLUTION.SUSPENDED,
      // `unknown` means GitHub was unreachable; the UI must not show the
      // install prompt in that case.
      indeterminate: resolution.reason === RESOLUTION.UNKNOWN,
      login: resolution.login,
    });
  } catch (error) {
    console.error('Error checking installation status:', error);
    return res.status(503).json({
      connected: true,
      installed: false,
      notInstalled: false,
      indeterminate: true,
      message: 'Could not verify GitHub installation right now.',
    });
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


// WHAT: Pulls every repository the GitHub App installation can see.
// WHY: Extracted so it can be retried with a freshly resolved installation.
const listInstallationRepos = async (octokit) => {
  let allRepos = [];
  let currentPage = 1;
  let hasNextPage = true;
  const per_page = 100;

  while (hasNextPage && currentPage <= 5) {
    const response = await octokit.request('GET /installation/repositories', {
      per_page,
      page: currentPage,
    });
    allRepos = allRepos.concat(response.data.repositories || []);

    const linkHeader = response.headers?.link;
    hasNextPage = !!(linkHeader && linkHeader.includes('rel="next"'));
    currentPage++;
  }

  return allRepos.map((repo) => ({
    id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    private: repo.private,
    owner: repo.owner.login,
    html_url: repo.html_url,
  }));
};

/**
 * WHAT: Returns the repositories available to the user's GitHub App installation.
 * WHY: Powers the "Add Project" modal.
 *
 * IMPORTANT: This route must NEVER report `notInstalled` unless GitHub itself
 * confirms the installation is gone. Previously a transient 401/404 (very common
 * right after a repo is created or deleted, because Octokit's cached installation
 * token becomes stale) permanently nulled the stored installationId, which made
 * the UI show "Install Zync GitHub App" forever. Resolution now goes through the
 * self-healing resolver, which verifies against GitHub and rediscovers the id.
 */
router.get('/user-repos', verifyToken, async (req, res) => {
  const uid = req.user.uid;
  const forceRefresh = req.query.refresh === '1' || req.query.refresh === 'true';

  try {
    if (!forceRefresh) {
      const cached = await cache.getJson(reposCacheKey(uid));
      if (cached) return res.json(cached);
    }

    const user = await User.findOne({ uid }).select('githubIntegration').lean();
    const github = user?.githubIntegration;

    // No GitHub account linked at all - a genuinely different problem.
    if (!user || (!github?.username && !github?.installationId)) {
      return res.status(400).json({
        message: 'GitHub account is not connected.',
        notConnected: true,
        notInstalled: false,
        repos: [],
      });
    }

    let octokit;
    try {
      octokit = await getInstallationOctokit(uid, { forceRefresh });
    } catch (err) {
      if (err.code === 'GITHUB_APP_MISCONFIGURED') {
        console.error('GitHub App credentials missing/invalid on server.');
        return res.status(500).json({
          message: 'Server configuration error: Missing GitHub App credentials',
          repos: [],
        });
      }

      if (err.code === 'GITHUB_APP_NOT_INSTALLED') {
        // Authoritative: GitHub says there is no installation for this account.
        await disconnectGithub(uid, { installationId: null });
        return res.status(400).json({
          message: 'GitHub App is not installed on your account.',
          notInstalled: true,
          repos: [],
        });
      }

      if (err.code === 'GITHUB_APP_SUSPENDED') {
        return res.status(400).json({
          message: 'The Zync GitHub App installation is suspended. Re-enable it on GitHub.',
          suspended: true,
          notInstalled: false,
          repos: [],
        });
      }

      // Unresolved for transient reasons: do NOT claim "not installed" and do
      // NOT touch the stored installation id.
      console.error('Could not resolve GitHub installation for user:', err.message);
      return res.status(503).json({
        message: 'Could not reach GitHub right now. Please try again.',
        transient: true,
        notInstalled: false,
        repos: [],
      });
    }

    let repos;
    try {
      repos = await listInstallationRepos(octokit);
    } catch (requestErr) {
      const status = requestErr.status || requestErr.response?.status;
      console.warn(
        `[GitHub] installation/repositories failed (status ${status}); retrying with a refreshed installation token.`
      );

      // A stale installation token is the single most common cause here, and it
      // happens precisely when a repo was just created or deleted. Re-resolve
      // and retry once before concluding anything.
      try {
        const retryOctokit = await getInstallationOctokit(uid, { forceRefresh: true });
        repos = await listInstallationRepos(retryOctokit);
      } catch (retryErr) {
        if (retryErr.code === 'GITHUB_APP_NOT_INSTALLED') {
          await disconnectGithub(uid, { installationId: null });
          return res.status(400).json({
            message: 'GitHub App is not installed on your account.',
            notInstalled: true,
            repos: [],
          });
        }

        console.error('Error fetching repositories from GitHub after retry:', retryErr.message);
        return res.status(503).json({
          message: 'Failed to fetch repositories from GitHub. Please try again.',
          transient: true,
          notInstalled: false,
          repos: [],
        });
      }
    }

    // An installed app with zero accessible repos is NOT "not installed" - the
    // user just needs to grant repository access. Surfacing this separately is
    // what stops the misleading install prompt.
    const userReposResult = {
      repos,
      hasNextPage: false,
      page: 1,
      notInstalled: false,
      noRepoAccess: repos.length === 0,
    };

    cache.setJson(reposCacheKey(uid), userReposResult, 300);
    res.json(userReposResult);
  } catch (error) {
    console.error('Error fetching installation repos:', error);
    res.status(500).json({
      message: 'Failed to fetch repositories due to an internal error.',
      error: error.message,
      notInstalled: false,
      repos: [],
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

router.patch('/repos/:owner/:repo/settings', verifyToken, async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { description, homepage, topics } = req.body;
    const uid = req.user.uid;

    const user = await User.findOne({ uid }).lean();
    const github = user?.githubIntegration;

    if (!user || !github?.connected || !github?.accessToken) {
      return res.status(400).json({ message: 'GitHub account not connected' });
    }

    if (github.username !== owner) {
      return res.status(403).json({ message: 'Unauthorized: You can only edit repositories you own.' });
    }

    // Validation
    if (description && description.length > 350) {
      return res.status(400).json({ message: 'Description must be 350 characters or less' });
    }
    if (topics && Array.isArray(topics)) {
      if (topics.length > 20) {
        return res.status(400).json({ message: 'A repository can have a maximum of 20 topics' });
      }
      for (const topic of topics) {
        if (topic.length > 50 || !/^[a-z0-9-]+$/.test(topic)) {
          return res.status(400).json({ message: 'Topics must be lowercase, alphanumeric, hyphens only, and max 50 chars' });
        }
      }
    }

    const accessToken = decryptToken(github.accessToken);
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github.v3+json'
    };

    if (description !== undefined || homepage !== undefined) {
      await axios.patch(`https://api.github.com/repos/${owner}/${repo}`, {
        description,
        homepage
      }, { headers });
    }

    if (topics !== undefined && Array.isArray(topics)) {
      await axios.put(`https://api.github.com/repos/${owner}/${repo}/topics`, {
        names: topics
      }, { headers });
    }

    // If it's a linked Zync Project, update it as well
    const Project = require('../models/Project');
    const linkedProject = await Project.findOne({ githubRepoOwner: owner, githubRepoName: repo });
    if (linkedProject) {
      const updateData = {};
      if (description !== undefined) updateData.description = description;
      if (homepage !== undefined) updateData.homepage = homepage;
      if (topics !== undefined) updateData.tags = topics;
      
      if (Object.keys(updateData).length > 0) {
        await Project.updateOne({ _id: linkedProject._id }, { $set: updateData });
        const { invalidateProjectCache } = require('../controllers/projectController');
        if (typeof invalidateProjectCache === 'function') {
          await invalidateProjectCache(linkedProject).catch(() => {});
        }
      }
    }

    res.status(200).json({ message: 'Repository settings updated successfully' });
  } catch (error) {
    console.error('Error updating repository settings:', error);
    res.status(500).json({ message: 'Failed to update repository settings', error: error.message });
  }
});

module.exports = router;
