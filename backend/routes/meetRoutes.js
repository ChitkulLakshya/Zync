const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const User = require('../models/User');
const Project = require('../models/Project');
const { Resend } = require('resend');
const { getFirestore } = require('firebase-admin/firestore');
const { createInstantMeet } = require('../services/googleMeet');

const resend = new Resend(process.env.RESEND_API_KEY);
const db = getFirestore();

// Send Meeting Invites
router.post('/invite', verifyToken, async (req, res) => {
    const { senderId, receiverIds, projectId } = req.body;

    if (req.user.uid !== senderId) {
        return res.status(403).json({ message: 'Unauthorized sender' });
    }

    if (!receiverIds || !Array.isArray(receiverIds) || receiverIds.length === 0) {
        return res.status(400).json({ message: 'No receivers specified' });
    }

    try {
        // 1. Generate Google Meet Link
        const meetingUrl = await createInstantMeet();

        // 2. Save Link to Project (Best Effort)
        if (projectId) {
            await Project.findOneAndUpdate({ _id: projectId }, { meetLink: meetingUrl });
        } else {
            // Try to save to a recent project by this user if none specified
            await Project.findOneAndUpdate(
                { ownerId: senderId },
                { meetLink: meetingUrl },
                { sort: { updatedAt: -1 } }
            );
        }

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
              <p><b>${sender.displayName || 'User'}</b> has invited you to join a Google Meet on Zync.</p>
              <p>
                <a href="${meetingUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Join Google Meet</a>
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
                    text: `🎥 I've started a Google Meet. Join me here: ${meetingUrl}`,
                    senderId: senderId,
                    senderName: sender.displayName || "Unknown User",
                    receiverId: receiver.uid,
                    timestamp: new Date(),
                    seen: false,
                    delivered: false,
                    type: 'text',
                    isSystem: true
                });
                results.chatsSent++;
            } catch (chatErr) {
                console.error(`Failed to chat ${receiver.uid}:`, chatErr);
                results.errors.push(`Chat failed for ${receiver.uid}`);
            }
        }

        // Return the generated URL so frontend can open it
        res.status(200).json({ message: 'Invitations processed', meetingUrl, results });

    } catch (error) {
        console.error('Error creating meeting/invites:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
