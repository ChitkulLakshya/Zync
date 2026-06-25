const express = require('express');
const router = express.Router();
const axios = require('axios');
const admin = require('firebase-admin');


if (!admin.apps.length) {
  admin.initializeApp();
}

const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET;

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

router.get('/auth', (req, res) => {
  const redirectUri = `${req.protocol}://${req.get('host')}/api/linkedin/callback`;
  const scope = 'openid profile email';
  const state = Math.random().toString(36).substring(7);

  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${encodeURIComponent(scope)}`;

  res.redirect(authUrl);
});

router.get('/callback', async (req, res) => {
  const { code, error, error_description } = req.query;

  if (error) {
    return res.redirect(
      `${FRONTEND_URL}/login?error=${encodeURIComponent(error_description || error)}`
    );
  }

  if (!code) {
    return res.redirect(`${FRONTEND_URL}/login?error=NoCodeProvided`);
  }

  const redirectUri = `${req.protocol}://${req.get('host')}/api/linkedin/callback`;

  try {

    const tokenResponse = await axios.post(
      'https://www.linkedin.com/oauth/v2/accessToken',
      null,
      {
        params: {
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: LINKEDIN_CLIENT_ID,
          client_secret: LINKEDIN_CLIENT_SECRET,
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const accessToken = tokenResponse.data.access_token;


    const userinfoResponse = await axios.get(
      'https://api.linkedin.com/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const profile = userinfoResponse.data;
    const email = profile.email;
    const uid = `linkedin:${profile.sub}`;
    const displayName =
      profile.name || `${profile.given_name} ${profile.family_name}`;
    const photoURL = profile.picture;


    let userRecord;
    try {

      userRecord = await admin.auth().getUserByEmail(email);
    } catch (authErr) {
      if (authErr.code === 'auth/user-not-found') {
        userRecord = await admin.auth().createUser({
          uid: uid,
          email: email,
          emailVerified: true,
          displayName: displayName,
          photoURL: photoURL,
        });
      } else {
        throw authErr;
      }
    }


    const customToken = await admin.auth().createCustomToken(userRecord.uid);


    res.redirect(`${FRONTEND_URL}/login?customToken=${customToken}`);
  } catch (err) {
    console.error('LinkedIn OAuth Error:', err?.response?.data || err.message);
    res.redirect(
      `${FRONTEND_URL}/login?error=${encodeURIComponent('LinkedIn Login Failed')}`
    );
  }
});

module.exports = router;
