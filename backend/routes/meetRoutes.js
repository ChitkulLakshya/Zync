const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const User = require('../models/User');
const Meeting = require('../models/Meeting');
const Project = require('../models/Project');
const { createInstantMeet } = require('../services/googleMeet');
const { sendZyncEmail } = require('../services/mailer');
const { getMeetingInviteTextVersion, getMeetingEmailHtml } = require('../utils/emailTemplates');
const { normalizeDoc, normalizeDocs } = require('../utils/normalize');
const { paginateArray, setPaginationHeaders } = require('../utils/pagination');


router.get('/user/:uid', verifyToken, async (req, res) => {
    const { uid } = req.params;
    if (req.user.uid !== uid) {
        return res.status(403).json({ message: 'Unauthorized access to meeting history' });
    }

    try {
        const meetings = await Meeting.find({
            $or: [
                { organizerId: uid },
            ]
        })
            .sort({ startTime: -1 })
            .limit(20)
            .lean();

        const filteredMeetings = meetings.filter(m => {
            if (m.organizerId === uid) return true;
            const participants = Array.isArray(m.participants) ? m.participants : [];
            return participants.some(p => p.uid === uid);
        });

        const now = new Date();
        const updatedMeetings = filteredMeetings.map(m => {
            const startTime = new Date(m.startTime);
            const meetingEnd = m.endTime ? new Date(m.endTime) : new Date(startTime.getTime() + 60 * 60 * 1000);

            let status = m.status;
            if (status === 'cancelled') return { ...normalizeDoc(m), status };

            if (now.getTime() > meetingEnd.getTime()) {
                status = 'ended';
            } else if (now.getTime() >= startTime.getTime() && now.getTime() <= meetingEnd.getTime()) {
                status = 'live';
            } else if (now.getTime() < startTime.getTime()) {
                status = 'scheduled';
            }

            return { ...normalizeDoc(m), status };
        });

        const { items, pagination } = paginateArray(updatedMeetings, req.query, { defaultLimit: 20, maxLimit: 100 });
        setPaginationHeaders(res, pagination);

        res.json(items);
    } catch (error) {
        console.error('Error fetching meetings:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


router.delete('/:meetingId', verifyToken, async (req, res) => {
    const { meetingId } = req.params;
    const uid = req.user.uid;

    try {
        const meeting = await Meeting.findById(meetingId).lean();

        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

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


router.post('/schedule', verifyToken, async (req, res) => {
    const { title, description, startTime, endTime, organizerId, participantIds } = req.body;

    if (req.user.uid !== organizerId) {
        return res.status(403).json({ message: 'Unauthorized organizer' });
    }

    try {
        const meetingUrl = await createInstantMeet();

        const organizer = await User.findOne({ uid: organizerId }).lean();
        const participants = participantIds && participantIds.length > 0
            ? await User.find({ uid: { $in: participantIds } }).lean()
            : [];

        const participantData = participants.map(u => ({
            uid: u.uid,
            email: u.email,
            name: u.displayName,
            status: 'invited'
        }));

        const newMeeting = await Meeting.create({
            title: title || 'Scheduled Meeting',
            description,
            startTime: new Date(startTime),
            endTime: endTime ? new Date(endTime) : new Date(new Date(startTime).getTime() + 60 * 60 * 1000),
            organizerId,
            organizerName: organizer?.displayName || 'Unknown',
            meetLink: meetingUrl,
            status: 'scheduled',
            participants: participantData
        });

        const meetingObj = normalizeDoc(newMeeting.toObject());

        (async () => {
            await Promise.all(participants.map(async (receiver) => {
                if (receiver.email) {
                    try {
                        const senderName = organizer.displayName || 'A colleague';
                        const recipientName = receiver.displayName || 'there';
                        const emailSubject = `Invitation: ${meetingObj.title} @ ${new Date(startTime).toLocaleString()}`;

                        const htmlContent = getMeetingEmailHtml({
                            inviterName: senderName,
                            meetingTopic: title,
                            date: new Date(startTime).toLocaleDateString(),
                            time: new Date(startTime).toLocaleTimeString(),
                            meetingLink: meetingUrl,
                            attendeeName: recipientName
                        });

                        const textContent = getMeetingInviteTextVersion({
                            recipientName,
                            senderName,
                            meetingUrl,
                            meetingDate: new Date(startTime),
                            meetingTime: new Date(startTime),
                            projectName: title,
                        });

                        await sendZyncEmail(receiver.email, emailSubject, htmlContent, textContent);
                    } catch (err) {
                        console.error("Invite email failed for", receiver.email, err);
                    }
                }
            }));
        })();

        res.status(201).json(meetingObj);

    } catch (error) {
        console.error('Error scheduling meeting:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});


router.post('/invite', verifyToken, async (req, res) => {
    const { senderId, receiverIds, projectId } = req.body;

    if (req.user.uid !== senderId) {
        return res.status(403).json({ message: 'Unauthorized sender' });
    }

    try {
        const meetingUrl = await createInstantMeet();

        let projectName = null;
        if (projectId) {
            const project = await Project.findByIdAndUpdate(
                projectId,
                { $set: { meetLink: meetingUrl } },
                { returnDocument: 'after', lean: true }
            );
            projectName = project?.name || null;
        }

        const sender = await User.findOne({ uid: senderId }).lean();
        if (!sender) return res.status(404).json({ message: 'Sender not found' });

        const receivers = Array.isArray(receiverIds) && receiverIds.length > 0
            ? await User.find({ uid: { $in: receiverIds } }).lean()
            : [];

        const participantData = receivers.map(u => ({
            uid: u.uid,
            email: u.email,
            name: u.displayName,
            status: 'invited'
        }));

        const newMeeting = await Meeting.create({
            title: projectName ? `Sync: ${projectName}` : 'Instant Meeting',
            description: 'Instant meeting started from dashboard',
            startTime: new Date(),
            organizerId: senderId,
            organizerName: sender.displayName,
            meetLink: meetingUrl,
            status: 'live',
            projectId: projectId || null,
            participants: participantData
        });

        const meetingObj = normalizeDoc(newMeeting.toObject());

        res.status(200).json({ message: 'Meeting created', meetingUrl, meetingId: meetingObj.id });

        (async () => {
            try {
                await Promise.all(receivers.map(async (receiver) => {
                    if (receiver.email) {
                        try {
                            const senderName = sender.displayName || 'A colleague';
                            const recipientName = receiver.displayName || receiver.firstName || 'there';
                            const emailSubject = `ZYNC Meeting Invitation from ${senderName}`;

                            const htmlContent = getMeetingEmailHtml({
                                inviterName: senderName,
                                meetingTopic: meetingObj.title,
                                date: new Date().toLocaleDateString(),
                                time: new Date().toLocaleTimeString(),
                                meetingLink: meetingUrl,
                                attendeeName: recipientName
                            });

                            const textContent = getMeetingInviteTextVersion({
                                recipientName,
                                senderName,
                                meetingUrl,
                                meetingDate: new Date(),
                                meetingTime: new Date(),
                                projectName,
                            });

                            await sendZyncEmail(receiver.email, emailSubject, htmlContent, textContent);
                        } catch (emailErr) {
                            console.error(`Failed to email ${receiver.email}:`, emailErr);
                        }
                    }
                }));
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
