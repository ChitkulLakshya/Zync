const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const User = require('../models/User');

// POST /api/google/connect
// Saves the Google OAuth token (accessToken) to the user's profile
router.post('/connect', verifyToken, async (req, res) => {
    const { accessToken, email, refreshToken } = req.body;
    const uid = req.user.uid;

    if (!accessToken) {
        return res.status(400).json({ message: 'Access Token is required' });
    }

    try {
        const updateData = {
            'integrations.google.connected': true,
            'integrations.google.email': email,
            'integrations.google.accessToken': accessToken,
            'integrations.google.connectedAt': new Date()
        };

        // If we got a refresh token (unlikely via firebase client, but possible if flow changes)
        if (refreshToken) {
            updateData['integrations.google.refreshToken'] = refreshToken;
        }

        const user = await User.findOneAndUpdate(
            { uid },
            { $set: updateData },
            { new: true }
        );

        if (!user) return res.status(404).json({ message: 'User not found' });

        res.status(200).json({
            message: 'Google connected',
            email: user.integrations?.google?.email
        });

    } catch (error) {
        console.error('Google Connect Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// DELETE /api/google/disconnect
router.delete('/disconnect', verifyToken, async (req, res) => {
    const uid = req.user.uid;

    try {
        const user = await User.findOneAndUpdate(
            { uid },
            {
                $set: {
                    'integrations.google.connected': false,
                    'integrations.google.accessToken': null,
                    'integrations.google.refreshToken': null,
                    'integrations.google.email': null
                }
            },
            { new: true }
        );

        res.status(200).json({ message: 'Google disconnected' });

    } catch (error) {
        console.error('Google Disconnect Error:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router;
