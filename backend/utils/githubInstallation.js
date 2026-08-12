/**
 * @fileoverview githubInstallation.js
 * @module githubInstallation
 *
 * ============================================================================
 * SELF-HEALING GITHUB APP INSTALLATION RESOLVER
 * ============================================================================
 *
 * PROBLEM THIS SOLVES
 * ----------------------------------------------------------------------------
 * Zync used to treat `user.githubIntegration.installationId` as the single
 * source of truth, and it would NULL that field whenever a GitHub API call
 * returned 401/404. That is unsafe, because GitHub returns 401/404 for many
 * *transient* reasons that have nothing to do with the app being uninstalled:
 *
 *   - Octokit caches installation access tokens for ~1 hour. Deleting a repo
 *     (or changing the installation's repository selection, which happens when
 *     a repo is created) invalidates those cached tokens => "401 Bad credentials".
 *   - Rate limiting / secondary rate limits.
 *   - Transient GitHub outages and 5xx responses surfaced as 401/404.
 *
 * Once the ID was nulled, every later request short-circuited to
 * `notInstalled: true` and the UI showed "Install Zync GitHub App" FOREVER,
 * even though the app was still installed. The only escape was reinstalling.
 *
 * THE FIX
 * ----------------------------------------------------------------------------
 * The stored installationId is now treated as a CACHE, never as the truth.
 * GitHub is the truth. This module:
 *
 *   1. VERIFIES the stored id against `GET /app/installations/{id}` (App JWT).
 *   2. REDISCOVERS the id via `GET /users/{login}/installation` and
 *      `GET /orgs/{login}/installation` when the stored one is missing/stale,
 *      then re-persists it. This means a wiped or drifted id heals itself.
 *   3. Reports `notInstalled` ONLY when GitHub authoritatively 404s the
 *      rediscovery — i.e. the user really did uninstall it or never installed.
 *   4. Treats every other failure as TRANSIENT and keeps the stored id intact.
 *
 * @author Chitkul Lakshya <consolemaster.app@gmail.com>
 * @copyright Copyright (c) 2026 Zync Meet. All rights reserved.
 * @license AGPL-3.0-only
 * ============================================================================
 */
const axios = require('axios');
const User = require('../models/User');
const cache = require('./cache');
const { getAppJwt } = require('./githubAppAuth');

const GITHUB_API = 'https://api.github.com';
const ACCEPT = 'application/vnd.github.v3+json';

// Short TTL: long enough to avoid hammering GitHub with App-JWT verification on
// every request, short enough that a real uninstall is noticed quickly.
const INSTALLATION_CACHE_TTL_SECONDS = 300;

const installationCacheKey = (uid) => `gh:installation:${uid}`;
const reposCacheKey = (uid) => `gh:user-repos:${uid}`;

/**
 * Reasons returned by resolveInstallation, so callers can react correctly
 * instead of collapsing everything into "not installed".
 */
const RESOLUTION = {
  OK: 'ok',
  NOT_INSTALLED: 'not_installed',
  NOT_CONNECTED: 'not_connected',
  SUSPENDED: 'suspended',
  UNKNOWN: 'unknown',
};

const statusOf = (error) =>
  error?.status || error?.response?.status || null;

/**
 * WHAT: Distinguishes an authoritative "this does not exist" from a transient
 * failure. WHY: Only an authoritative 404 may clear a stored installation id.
 */
const isAuthoritativeMissing = (error) => {
  const status = statusOf(error);
  return status === 404 || status === 410;
};

const appRequest = async (path) => {
  const jwtToken = getAppJwt();
  return axios.get(`${GITHUB_API}${path}`, {
    headers: {
      Authorization: `Bearer ${jwtToken}`,
      Accept: ACCEPT,
    },
    // Never let a hung GitHub connection wedge a request.
    timeout: 10000,
  });
};

/**
 * WHAT: Persists a freshly resolved installation id onto the user document.
 * WHY: Keeps the cached copy aligned with GitHub so subsequent calls are fast.
 */
const persistInstallationId = async (uid, installationId) => {
  const user = await User.findOne({ uid }).select('githubIntegration').lean();
  const existing = user?.githubIntegration || {};

  const normalized = installationId ? String(installationId) : null;
  if (String(existing.installationId || '') === String(normalized || '')) {
    return;
  }

  await User.updateOne(
    { uid },
    {
      $set: {
        githubIntegration: {
          ...existing,
          installationId: normalized,
          // An installation that resolves is by definition connected.
          connected: normalized ? true : Boolean(existing.accessToken),
          ...(normalized ? { installationVerifiedAt: new Date().toISOString() } : {}),
        },
      },
    }
  );

  // The accessible repository set changes with the installation.
  await cache.invalidate(reposCacheKey(uid), installationCacheKey(uid)).catch(() => {});
};

/**
 * WHAT: Confirms a stored installation id still exists on GitHub.
 * WHY: Cheap authoritative check before we trust or discard the cached id.
 *
 * @returns {'valid'|'suspended'|'missing'|'unknown'}
 */
const verifyInstallationId = async (installationId) => {
  const numeric = Number.parseInt(installationId, 10);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 'missing';
  }

  try {
    const { data } = await appRequest(`/app/installations/${numeric}`);
    if (data?.suspended_at) {
      return 'suspended';
    }
    return 'valid';
  } catch (error) {
    if (isAuthoritativeMissing(error)) {
      return 'missing';
    }
    // 401 here means OUR App JWT/private key is wrong - a server misconfiguration,
    // not a user problem. Never punish the user's stored id for it.
    console.warn(
      `[GitHubInstallation] Could not verify installation ${installationId} (status ${statusOf(error)}): ${error.message}`
    );
    return 'unknown';
  }
};

/**
 * WHAT: Finds the installation id for a GitHub account by login.
 * WHY: Lets Zync recover an id that was never stored, or was wrongly wiped.
 *
 * @returns {{ id: number|null, authoritativeMissing: boolean }}
 */
const discoverInstallationId = async (login) => {
  if (!login) {
    return { id: null, authoritativeMissing: false };
  }

  const encoded = encodeURIComponent(login);
  let sawAuthoritativeMissing = false;

  // A GitHub account is either a user or an organization; try both.
  for (const path of [`/users/${encoded}/installation`, `/orgs/${encoded}/installation`]) {
    try {
      const { data } = await appRequest(path);
      if (data?.id) {
        return { id: data.id, authoritativeMissing: false };
      }
    } catch (error) {
      if (isAuthoritativeMissing(error)) {
        sawAuthoritativeMissing = true;
        continue;
      }
      console.warn(
        `[GitHubInstallation] Discovery via ${path} failed (status ${statusOf(error)}): ${error.message}`
      );
      // Transient failure - we cannot conclude anything.
      return { id: null, authoritativeMissing: false };
    }
  }

  return { id: null, authoritativeMissing: sawAuthoritativeMissing };
};

/**
 * WHAT: Resolves the effective GitHub App installation id for a Zync user,
 * healing the stored value when it has drifted from GitHub.
 * WHY: Single, trustworthy entry point so no caller ever has to guess whether
 * a failure means "uninstalled" or "GitHub hiccuped".
 *
 * @param {string} uid Zync user id
 * @param {{ forceRefresh?: boolean }} [options]
 * @returns {Promise<{installationId: string|null, reason: string, login: string|null}>}
 */
const resolveInstallation = async (uid, options = {}) => {
  const { forceRefresh = false } = options;

  if (!uid) {
    return { installationId: null, reason: RESOLUTION.NOT_CONNECTED, login: null };
  }

  if (!forceRefresh) {
    const cached = await cache.getJson(installationCacheKey(uid)).catch(() => null);
    if (cached && cached.installationId) {
      return cached;
    }
  }

  const user = await User.findOne({ uid }).select('githubIntegration').lean();
  const github = user?.githubIntegration || {};
  const login = github.username || null;
  const storedId = github.installationId || null;

  // 1. Trust-but-verify the stored id.
  if (storedId) {
    const state = await verifyInstallationId(storedId);

    if (state === 'valid') {
      const result = { installationId: String(storedId), reason: RESOLUTION.OK, login };
      await cache
        .setJson(installationCacheKey(uid), result, INSTALLATION_CACHE_TTL_SECONDS)
        .catch(() => {});
      return result;
    }

    if (state === 'suspended') {
      return { installationId: String(storedId), reason: RESOLUTION.SUSPENDED, login };
    }

    if (state === 'unknown') {
      // Transient. Keep using what we have rather than degrading the user.
      return { installationId: String(storedId), reason: RESOLUTION.OK, login };
    }
    // state === 'missing' -> fall through to rediscovery.
  }

  // 2. Rediscover from GitHub. This is what heals a wiped/stale id.
  const { id: discoveredId, authoritativeMissing } = await discoverInstallationId(login);

  if (discoveredId) {
    await persistInstallationId(uid, discoveredId);
    const result = { installationId: String(discoveredId), reason: RESOLUTION.OK, login };
    await cache
      .setJson(installationCacheKey(uid), result, INSTALLATION_CACHE_TTL_SECONDS)
      .catch(() => {});
    return result;
  }

  // 3. Only now, with GitHub explicitly saying "no installation", do we clear.
  if (authoritativeMissing) {
    if (storedId) {
      await persistInstallationId(uid, null);
    }
    return { installationId: null, reason: RESOLUTION.NOT_INSTALLED, login };
  }

  if (!login) {
    // Never connected a GitHub account at all.
    return {
      installationId: storedId ? String(storedId) : null,
      reason: storedId ? RESOLUTION.OK : RESOLUTION.NOT_CONNECTED,
      login: null,
    };
  }

  // Could not reach GitHub. Preserve whatever we had; do NOT claim uninstalled.
  return {
    installationId: storedId ? String(storedId) : null,
    reason: storedId ? RESOLUTION.OK : RESOLUTION.UNKNOWN,
    login,
  };
};

/**
 * WHAT: Builds an Octokit client scoped to the user's installation, retrying
 * once with a forced re-resolution if the first attempt is rejected.
 * WHY: Absorbs the stale-cached-token 401s that used to nuke the installation id.
 */
const getInstallationOctokit = async (uid, options = {}) => {
  const appId = process.env.GITHUB_APP_ID;
  let privateKey = process.env.GITHUB_PRIVATE_KEY || process.env.GITHUB_APP_PRIVATE_KEY;

  if (!appId || !privateKey) {
    const err = new Error('Server configuration error: missing GitHub App credentials');
    err.code = 'GITHUB_APP_MISCONFIGURED';
    throw err;
  }
  privateKey = privateKey.replace(/\\n/g, '\n');

  const { App } = await import('octokit');

  const attempt = async (forceRefresh) => {
    const resolution = await resolveInstallation(uid, { forceRefresh });

    if (!resolution.installationId) {
      const err = new Error('GitHub App installation not found for user');
      err.code =
        resolution.reason === RESOLUTION.NOT_INSTALLED
          ? 'GITHUB_APP_NOT_INSTALLED'
          : 'GITHUB_INSTALLATION_UNRESOLVED';
      err.resolution = resolution;
      throw err;
    }

    if (resolution.reason === RESOLUTION.SUSPENDED) {
      const err = new Error('GitHub App installation is suspended');
      err.code = 'GITHUB_APP_SUSPENDED';
      err.resolution = resolution;
      throw err;
    }

    // A fresh App instance avoids reusing Octokit's cached installation token,
    // which is exactly what goes stale after a repo is created or deleted.
    const app = new App({ appId, privateKey });
    return app.getInstallationOctokit(Number.parseInt(resolution.installationId, 10));
  };

  try {
    return await attempt(Boolean(options.forceRefresh));
  } catch (error) {
    if (error.code && error.code.startsWith('GITHUB_APP')) {
      throw error;
    }
    // Stale token or drifted id: re-resolve against GitHub and try once more.
    return attempt(true);
  }
};

/**
 * WHAT: Clears every cached artifact derived from the installation.
 * WHY: Called after repo create/delete and installation webhooks so the next
 * read reflects reality instead of a 5-minute-old snapshot.
 */
const invalidateInstallationCaches = async (uid) => {
  if (!uid) {
    return;
  }
  await cache.invalidate(installationCacheKey(uid), reposCacheKey(uid)).catch(() => {});
};

module.exports = {
  RESOLUTION,
  resolveInstallation,
  getInstallationOctokit,
  discoverInstallationId,
  verifyInstallationId,
  persistInstallationId,
  invalidateInstallationCaches,
  installationCacheKey,
  reposCacheKey,
};
