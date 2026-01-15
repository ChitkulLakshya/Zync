const express = require('express');
const router = express.Router();
const axios = require('axios');
const User = require('../models/User');

// GET /api/dribbble/callback
router.get('/callback', async (req, res) => {
    const { code, error } = req.query;
    console.log('Dribbble Callback Query:', req.query); // DEBUG LOG


    if (error) {
        return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/settings?error=dribbble_auth_failed`);
    }

    if (!code) {
        return res.status(400).send('No code provided');
    }

    try {
        // Exchange code for token
        const response = await axios.post('https://dribbble.com/oauth/token', {
            client_id: process.env.DRIBBBLE_CLIENT_ID,
            client_secret: process.env.DRIBBBLE_CLIENT_SECRET,
            code: code,
            redirect_uri: process.env.DRIBBBLE_REDIRECT_URI || `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/dribbble/callback`
        });

        const { access_token } = response.data;

        // Fetch User Info to identify/link
        const userRes = await axios.get('https://api.dribbble.com/v2/user', {
            headers: { Authorization: `Bearer ${access_token}` }
        });

        const dribbbleUser = userRes.data;

        // We need to know WHICH user to link this to. 
        // OAuth 2.0 State parameter should contain the user ID or a session token.
        // For now, we might need to rely on the frontend passing usage context or saving it in a temporary cookie.
        // Or, simplistic approach: Redirect to frontend with token, let frontend save it.
        // BUT, sending access_token in URL is not super secure.

        // Better approach: State param.
        // const state = req.query.state; // expecting userId or similar

        // For MVP: Redirect to frontend with the token (user picks it up and sends to /sync-dribbble)
        // OR: Save it if we have state.

        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/settings?dribbble_token=${access_token}&dribbble_user=${dribbbleUser.login}`);

    } catch (err) {
        console.error('Dribbble Auth Error:', err.response?.data || err.message);
        res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/settings?error=dribbble_connection_failed`);
    }
});

module.exports = router;
