const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const User = require('../models/User');
const { Resend } = require('resend');
const { getFirestore } = require('firebase-admin/firestore');

const resend = new Resend(process.env.RESEND_API_KEY);
const db = getFirestore();

// Send Meeting Invites
router.post('/invite', verifyToken, async (req, res) => {
    const { senderId, receiverIds, meetingUrl } = req.body;

    if (req.user.uid !== senderId) {
        return res.status(403).json({ message: 'Unauthorized sender' });
    }

    if (!receiverIds || !Array.isArray(receiverIds) || receiverIds.length === 0) {
        return res.status(400).json({ message: 'No receivers specified' });
    }

    try {
        const sender = await User.findOne({ uid: senderId });
        if (!sender) return res.status(404).json({ message: 'Sender not found' });

        const receivers = await User.find({ uid: { $in: receiverIds } });

        const results = {
            emailsSent: 0,
            chatsSent: 0,
            errors: []
        };

        // Process each receiver
        for (const receiver of receivers) {
            // 1. Send Email
            if (receiver.email) {
                try {
                    await resend.emails.send({
                        from: 'Zync Meetings <meetings@resend.dev>',
                        to: receiver.email,
                        subject: `${sender.displayName || 'A colleague'} invited you to a meeting`,
                        html: `
              <h2>Video Meeting Invitation</h2>
              <p><b>${sender.displayName || 'User'}</b> has invited you to join a video meeting on Zync.</p>
              <p>
                <a href="${meetingUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Join Meeting</a>
              </p>
              <p>Or click: <a href="${meetingUrl}">${meetingUrl}</a></p>
            `
                    });
                    results.emailsSent++;
                } catch (emailErr) {
                    console.error(`Failed to email ${receiver.email}:`, emailErr);
                    results.errors.push(`Email failed for ${receiver.email}`);
                }
            }

            // 2. Send Chat Message (Directly to Firestore)
            try {
                const chatId = [senderId, receiver.uid].sort().join("_");
                await db.collection('messages').add({
                    chatId,
                    text: `🎥 I've started a meeting. Join me here: ${meetingUrl}`,
                    senderId: senderId,
                    senderName: sender.displayName || "Unknown User",
                    receiverId: receiver.uid,
                    timestamp: new Date(), // Firebase Admin uses native Date or Timestamp
                    seen: false,
                    delivered: false,
                    type: 'text',
                    isSystem: true // Optional flag for styling
                });
                results.chatsSent++;
            } catch (chatErr) {
                console.error(`Failed to chat ${receiver.uid}:`, chatErr);
                results.errors.push(`Chat failed for ${receiver.uid}`);
            }
        }

        res.status(200).json({ message: 'Invitations processed', results });

    } catch (error) {
        console.error('Error sending invitations:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
