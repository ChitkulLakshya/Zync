const { App } = require('octokit');
const User = require('../models/User');
const { decrypt } = require('./encryption');


const getUserApp = async (userId) => {
  const user = await User.findOne({ uid: userId }).lean();
  const github = user?.githubIntegration;

  if (!user || !github?.encryptedAppId || !github?.encryptedPrivateKey) {
    throw new Error('User has not configured GitHub App settings.');
  }

  const appId = decrypt(github.encryptedAppId);
  const privateKey = decrypt(github.encryptedPrivateKey);

  if (!appId || !privateKey) {
    throw new Error('Failed to decrypt GitHub credentials.');
  }

  const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

  return new App({
    appId: appId,
    privateKey: formattedPrivateKey,
  });
};


const getUserInstallationId = async (userId) => {
  const user = await User.findOne({ uid: userId }).lean();
  const github = user?.githubIntegration;
  if (!github?.installationId) {
    return null;
  }
  return github.installationId;
};


const checkGithubConfig = async (userId) => {
  const user = await User.findOne({ uid: userId }).lean();
  const github = user?.githubIntegration;
  return !!(github?.encryptedAppId && github?.encryptedPrivateKey);
};


const getInstallationRepositories = async (userId, installationId) => {
  try {
    const app = await getUserApp(userId);
    const octokit = await app.getInstallationOctokit(installationId);

    const response = await octokit.request('GET /installation/repositories', {
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      },
      per_page: 100
    });

    return response.data.repositories.map(repo => ({
      id: repo.id.toString(),
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
