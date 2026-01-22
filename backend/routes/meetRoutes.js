const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const User = require('../models/User');
const Project = require('../models/Project');
const Meeting = require('../models/Meeting');
const { getFirestore } = require('firebase-admin/firestore');
const { createInstantMeet, send_ZYNC_email } = require('../services/googleMeet');
const { getMeetingInviteTemplate, getMeetingInviteTextVersion } = require('../utils/emailTemplates');

// const db = getFirestore(); // Moved inside handler to prevent startup crash if init fails

// Get Recent Meetings for User
router.get('/user/:uid', verifyToken, async (req, res) => {
    const { uid } = req.params;
    if (req.user.uid !== uid) {
        return res.status(403).json({ message: 'Unauthorized access to meeting history' });
    }

    try {
        const meetings = await Meeting.find({
            $or: [
                { organizerId: uid },
                { 'participants.uid': uid }
            ]
        }).sort({ startTime: -1 }).limit(20);

        // Update status logic
        const now = new Date();
        const updatedMeetings = meetings.map(m => {
            const meetingObj = m.toObject();
            const startTime = new Date(m.startTime);
            // Default meeting duration: 1 hour if no end time specified
            const meetingEnd = m.endTime ? new Date(m.endTime) : new Date(startTime.getTime() + 60 * 60 * 1000);

            let status = m.status;

            // Don't change cancelled meetings
            if (status === 'cancelled') {
                return { ...meetingObj, status };
            }

            // Check time-based status
            if (now.getTime() > meetingEnd.getTime()) {
                status = 'ended';
            } else if (now.getTime() >= startTime.getTime() && now.getTime() <= meetingEnd.getTime()) {
                status = 'live';
            } else if (now.getTime() < startTime.getTime()) {
                status = 'scheduled';
            }

            return { ...meetingObj, status };
        });

        res.json(updatedMeetings);
    } catch (error) {
        console.error('Error fetching meetings:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete a Meeting
router.delete('/:meetingId', verifyToken, async (req, res) => {
    const { meetingId } = req.params;
    const uid = req.user.uid;

    try {
        const meeting = await Meeting.findById(meetingId);
        
        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        // Only organizer can delete the meeting
        if (meeting.organizerId !== uid) {
            return res.status(403).json({ message: 'Only the organizer can delete this meeting' });
        }

        await Meeting.findByIdAndDelete(meetingId);
        
        res.json({ message: 'Meeting deleted successfully' });
    } catch (error) {
        console.error('Error deleting meeting:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Schedule a Meeting
router.post('/schedule', verifyToken, async (req, res) => {
    const { title, description, startTime, endTime, organizerId, participantIds } = req.body;

    if (req.user.uid !== organizerId) {
        return res.status(403).json({ message: 'Unauthorized organizer' });
    }

    try {
        const meetingUrl = await createInstantMeet(); // Generate link now (or could be later)

        const organizer = await User.findOne({ uid: organizerId });
        const participants = await User.find({ uid: { $in: participantIds || [] } });

        const newMeeting = new Meeting({
            title: title || 'Scheduled Meeting',
            description,
            startTime,
            endTime: endTime || new Date(new Date(startTime).getTime() + 60 * 60 * 1000), // Default 1 hr
            organizerId,
            organizerName: organizer?.displayName || 'Unknown',
            meetLink: meetingUrl,
            status: 'scheduled',
            participants: participants.map(u => ({
                uid: u.uid,
                email: u.email,
                name: u.displayName,
                status: 'invited'
            }))
        });

        await newMeeting.save();

        // Send Invites (Async)
        (async () => {
            for (const receiver of participants) {
                if (receiver.email) {
                    try {
                        const senderName = organizer.displayName || 'A colleague';
                        const recipientName = receiver.displayName || 'there';
                        const emailSubject = `Invitation: ${newMeeting.title} @ ${new Date(startTime).toLocaleString()}`;

                        const htmlContent = getMeetingInviteTemplate({
                            recipientName,
                            senderName,
                            meetingUrl,
                            meetingDate: new Date(startTime),
                            meetingTime: new Date(startTime),
                            projectName: title,
                        });

                        const textContent = getMeetingInviteTextVersion({
                            recipientName,
                            senderName,
                            meetingUrl,
                            meetingDate: new Date(startTime),
                            meetingTime: new Date(startTime),
                            projectName: title,
                        });

                        await send_ZYNC_email(receiver.email, emailSubject, htmlContent, textContent);
                    } catch (err) {
                        console.error("Invite email failed for", receiver.email, err);
                    }
                }
            }
        })();

        res.status(201).json(newMeeting);

    } catch (error) {
        console.error('Error scheduling meeting:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Create Instant Meeting (Updated)
router.post('/invite', verifyToken, async (req, res) => {
    const { senderId, receiverIds, projectId } = req.body;

    if (req.user.uid !== senderId) {
        return res.status(403).json({ message: 'Unauthorized sender' });
    }

    // Allow creating meeting alone (receiverIds empty)
    // if (!receiverIds || !Array.isArray(receiverIds) || receiverIds.length === 0) {
    //     return res.status(400).json({ message: 'No receivers specified' });
    // }

    try {
        // 1. Generate Google Meet Link
        const meetingUrl = await createInstantMeet();

        // 2. Get project details if available
        let projectName = null; /* ... existing project logic ... */
        if (projectId) {
            const project = await Project.findOneAndUpdate(
                { _id: projectId },
                { meetLink: meetingUrl },
                { new: true }
            );
            projectName = project?.name || null;
        } else {
            await Project.findOneAndUpdate(
                { ownerId: senderId },
                { meetLink: meetingUrl },
                { sort: { updatedAt: -1 } }
            );
        }

        const sender = await User.findOne({ uid: senderId });
        if (!sender) return res.status(404).json({ message: 'Sender not found' });

        const receivers = Array.isArray(receiverIds) && receiverIds.length > 0
            ? await User.find({ uid: { $in: receiverIds } })
            : [];

        // 3. Create Meeting Record
        const newMeeting = new Meeting({
            title: projectName ? `Sync: ${projectName}` : 'Instant Meeting',
            description: 'Instant meeting started from dashboard',
            startTime: new Date(),
            organizerId: senderId,
            organizerName: sender.displayName,
            meetLink: meetingUrl,
            status: 'live',
            projectId: projectId || null,
            participants: receivers.map(u => ({
                uid: u.uid,
                email: u.email,
                name: u.displayName,
                status: 'invited'
            }))
        });
        await newMeeting.save();

        // Return the generated URL so frontend can open it IMMEDIATELY
        res.status(200).json({ message: 'Meeting created', meetingUrl, meetingId: newMeeting._id });

        // PROCESS NOTIFICATIONS IN BACKGROUND (Fire-and-forget)
        (async () => {
            try {
                // Process each receiver
                for (const receiver of receivers) {
                    // 1. Send Email (Using Nodemailer / Gmail)
                    if (receiver.email) {
                        try {
                            const senderName = sender.displayName || 'A colleague';
                            const recipientName = receiver.displayName || receiver.firstName || 'there';
                            const emailSubject = `ZYNC Meeting Invitation from ${senderName}`;

                            // Generate professional HTML email
                            const htmlContent = getMeetingInviteTemplate({
                                recipientName,
                                senderName,
                                meetingUrl,
                                meetingDate: new Date(),
                                meetingTime: new Date(),
                                projectName,
                            });

                            // Generate plain text fallback
                            const textContent = getMeetingInviteTextVersion({
                                recipientName,
                                senderName,
                                meetingUrl,
                                meetingDate: new Date(),
                                meetingTime: new Date(),
                                projectName,
                            });

                            await send_ZYNC_email(
                                receiver.email,
                                emailSubject,
                                htmlContent,
                                textContent
                            );
                        } catch (emailErr) {
                            console.error(`Failed to email ${receiver.email}:`, emailErr);
                        }
                    }

                    // 2. Send Chat Message (Directly to Firestore) - REMOVED as per request
                    // The user requested to stop sending chat messages during meething creation.
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
