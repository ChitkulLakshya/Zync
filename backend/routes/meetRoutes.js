const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const User = require('../models/User');
const Project = require('../models/Project');
const { getFirestore } = require('firebase-admin/firestore');
const { createInstantMeet, send_zync_email } = require('../services/googleMeet');

// const db = getFirestore(); // Moved inside handler to prevent startup crash if init fails

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

        // Return the generated URL so frontend can open it IMMEDIATELY
        res.status(200).json({ message: 'Meeting created', meetingUrl });

        // PROCESS NOTIFICATIONS IN BACKGROUND (Fire-and-forget)
        (async () => {
            try {
                // Process each receiver
                for (const receiver of receivers) {
                    // 1. Send Email (Using Nodemailer / Gmail)
                    if (receiver.email) {
                        try {
                            const senderName = sender.displayName || 'A colleague';
                            const emailSubject = `Zync Meeting Invitation: ${senderName} invited you`;

                            // Plain Text Version
                            const textContent = `You have been invited to a video meeting on Zync.\n\n` +
                                `Host: ${senderName}\n` +
                                `Join URL: ${meetingUrl}\n\n` +
                                `See you there!\n\n` +
                                `--\nZync HQ, Hyderabad, India`;

                            await send_zync_email(
                                receiver.email,
                                emailSubject,
                                `
                      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
                        <div style="background-color: #007bff; padding: 20px; text-align: center;">
                          <h2 style="color: white; margin: 0;">Zync Meeting Invitation</h2>
                        </div>
                        <div style="padding: 20px;">
                          <p style="font-size: 16px;">Hello,</p>
                          <p style="font-size: 16px;"><b>${senderName}</b> has invited you to join a Google Meet video call.</p>
                          <div style="text-align: center; margin: 30px 0;">
                            <a href="${meetingUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">Join Meeting</a>
                          </div>
                          <p style="font-size: 14px; color: #666;">Or copy this link: <a href="${meetingUrl}" style="color: #007bff;">${meetingUrl}</a></p>
                        </div>
                        <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #888;">
                          <p>Zync HQ, Hyderabad, India</p>
                          <p>You received this email because you are a workspace member of Zync.</p>
                        </div>
                      </div>
                    `
                            );
                        } catch (emailErr) {
                            console.error(`Failed to email ${receiver.email}:`, emailErr);
                        }
                    }

                    // 2. Send Chat Message (Directly to Firestore)
                    try {
                        const db = getFirestore(); // Lazy load instance
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
                    } catch (chatErr) {
                        console.error(`Failed to chat ${receiver.uid}:`, chatErr);
                    }
                }
            } catch (bgError) {
                console.error("Background notification error:", bgError);
            }
        })();

    } catch (error) {
        console.error('Error creating meeting/invites:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
