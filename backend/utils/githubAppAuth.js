const jwt = require('jsonwebtoken');
const axios = require('axios');

/**
 * Generate a JWT for the GitHub App
 */
const getAppJwt = () => {
    const appId = process.env.GITHUB_APP_ID;
    const privateKey = process.env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, '\n'); // Handle env var newlines

    const now = Math.floor(Date.now() / 1000);
    const payload = {
        iat: now - 60, // Issued at time (60s in the past)
        exp: now + (10 * 60), // Expires in 10 minutes
        iss: appId
    };

    return jwt.sign(payload, privateKey, { algorithm: 'RS256' });
};

/**
 * Get Installation Access Token
 * @param {string} installationId 
 */
const getInstallationAccessToken = async (installationId) => {
    const jwtToken = getAppJwt();

    try {
        const response = await axios.post(
            `https://api.github.com/app/installations/${installationId}/access_tokens`,
            {},
            {
                headers: {
                    'Authorization': `Bearer ${jwtToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );
        return response.data.token;
    } catch (error) {
        console.error('Error fetching installation token:', error.response?.data || error.message);
        throw error;
    }
};

module.exports = { getInstallationAccessToken };
