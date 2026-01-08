const { App } = require('octokit');
const User = require('../models/User');
const { decrypt } = require('./encryption');

/**
 * Initializes an authenticated Octokit App instance for a specific user.
 * @param {string} userId - Firebase UID
 * @returns {Promise<App>}
 */
const getUserApp = async (userId) => {
  const user = await User.findOne({ uid: userId });
  if (!user || !user.integrations?.github?.encryptedAppId || !user.integrations?.github?.encryptedPrivateKey) {
    throw new Error('User has not configured GitHub App settings.');
  }

  const appId = decrypt(user.integrations.github.encryptedAppId);
  const privateKey = decrypt(user.integrations.github.encryptedPrivateKey);

  if (!appId || !privateKey) {
      throw new Error('Failed to decrypt GitHub credentials.');
  }

  // Handle potential newline issues in private key if stored as one string
  const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

  return new App({
    appId: appId,
    privateKey: formattedPrivateKey,
  });
};

/**
 * Validates if the user has a connected GitHub App installation.
 * @param {string} userId - Firebase UID
 * @returns {Promise<string|null>} - Installation ID or null
 */
const getUserInstallationId = async (userId) => {
  const user = await User.findOne({ uid: userId });
  if (!user || !user.integrations?.github?.installationId) {
    return null;
  }
  return user.integrations.github.installationId;
};

/**
 * Checks if user has keys configured.
 */
const checkGithubConfig = async (userId) => {
    const user = await User.findOne({ uid: userId });
    return !!(user?.integrations?.github?.encryptedAppId && user?.integrations?.github?.encryptedPrivateKey);
};

/**
 * Fetches repositories accessible to the user's installation using THEIR credentials.
 * @param {string} userId 
 * @param {string} installationId 
 * @returns {Promise<Array>} Array of repositories
 */
const getInstallationRepositories = async (userId, installationId) => {
  try {
    const app = await getUserApp(userId);
    const octokit = await app.getInstallationOctokit(installationId);
    
    // List repositories accessible to the app installation
    const response = await octokit.request('GET /installation/repositories', {
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      },
      per_page: 100
    });

    return response.data.repositories.map(repo => ({
      id: repo.id.toString(), // Ensure string ID
      name: repo.name,
      full_name: repo.full_name,
      private: repo.private,
      html_url: repo.html_url
    }));

  } catch (error) {
    console.error(`Error fetching repos for installation ${installationId}:`, error.message);
    throw new Error('Failed to fetch repositories from GitHub');
  }
};

module.exports = {
  getUserApp,
  getUserInstallationId,
  getInstallationRepositories,
  checkGithubConfig
};

