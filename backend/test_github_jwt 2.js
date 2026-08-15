require('dotenv').config();
const jwt = require('jsonwebtoken');
const axios = require('axios');
const now = Math.floor(Date.now() / 1000);
const payload = { iat: now - 60, exp: now + 5 * 60, iss: process.env.GITHUB_APP_ID };
const privateKey = process.env.GITHUB_PRIVATE_KEY;
const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });

axios.get('https://api.github.com/app', { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' } })
  .then(res => console.log('SUCCESS:', res.data.name))
  .catch(err => {
    console.error('FAILED:', err.response ? err.response.status + ' ' + err.response.data.message : err.message);
  });
