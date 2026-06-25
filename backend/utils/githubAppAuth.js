const jwt = require('jsonwebtoken');
const axios = require('axios');


const getAppJwt = () => {
    const appId = process.env.GITHUB_APP_ID;
    const rawKey = process.env.GITHUB_PRIVATE_KEY || process.env.GITHUB_APP_PRIVATE_KEY || '';
    const privateKey = rawKey.replace(/\\n/g, '\n');

    const now = Math.floor(Date.now() / 1000);
    const payload = {
        iat: now - 60,
        exp: now + (10 * 60),
        iss: appId
    };

    return jwt.sign(payload, privateKey, { algorithm: 'RS256' });
};


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
