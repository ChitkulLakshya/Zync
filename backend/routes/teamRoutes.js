const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware'); // Assuming this exists
const Team = require('../models/Team');
const User = require('../models/User');

// Helper to generate unique 6-digit code
const generateInviteCode = async () => {
    let code;
    let isUnique = false;
    while (!isUnique) {
        code = Math.floor(100000 + Math.random() * 900000).toString();
        const existingTeam = await Team.findOne({ inviteCode: code });
        if (!existingTeam) isUnique = true;
    }
    return code;
};

// Get Teams Owned by User
router.get('/owned', verifyToken, async (req, res) => {
    const uid = req.user.uid;
    try {
        const teams = await Team.find({ ownerId: uid });
        res.json(teams);
    } catch (error) {
        console.error('Error fetching owned teams:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get All Teams User is Member Of
router.get('/mine', verifyToken, async (req, res) => {
    const uid = req.user.uid;
    try {
        const teams = await Team.find({ members: uid });
        res.json(teams);
    } catch (error) {
        console.error('Error fetching my teams:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create Team
router.post('/create', verifyToken, async (req, res) => {
    const { name, type, initialInvites } = req.body;
    const uid = req.user.uid;

    if (!name) return res.status(400).json({ message: 'Team name is required' });

    try {
        const user = await User.findOne({ uid });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const inviteCode = await generateInviteCode();

        const newTeam = new Team({
            name,
            type: type || 'Other',
            inviteCode,
            ownerId: uid,
            members: [uid] // Owner is also a member
        });

        const savedTeam = await newTeam.save();

        // Update user
        user.teamId = savedTeam._id;
        await user.save();

        // Send Initial Invites
        if (initialInvites && Array.isArray(initialInvites) && initialInvites.length > 0) {
            // We use a simple loop here. For production, a queue is better.
            const { sendZYNCEmail } = require('../services/mailer');
            initialInvites.forEach(async (email) => {
                if (!email) return;
                try {
                    await sendZYNCEmail(
                        email,
                        `Join ${name} on ZYNC!`,
                        `
                          <h2>You've been invited to join a team!</h2>
                          <p>${user.displayName || 'A colleague'} has invited you to join the <strong>${name}</strong> team on ZYNC.</p>
                          <p><strong>Invite Code: ${inviteCode}</strong></p>
                          <p>Login to ZYNC and enter this code to join.</p>
                        `,
                        `You've been invited to join ${name}. Invite Code: ${inviteCode}`
                    );
                } catch (err) {
                    console.error(`Failed to send invite to ${email}:`, err);
                }
            });
        }

        res.status(201).json(savedTeam);
    } catch (error) {
        console.error('Error creating team:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Join Team
router.post('/join', verifyToken, async (req, res) => {
    const { inviteCode } = req.body;
    const uid = req.user.uid;

    if (!inviteCode) return res.status(400).json({ message: 'Invite code is required' });

    try {
        const team = await Team.findOne({ inviteCode });
        if (!team) return res.status(404).json({ message: 'Team not found with this code' });

        // Check if already a member
        if (team.members.includes(uid)) {
            return res.status(400).json({ message: 'User already in this team' });
        }

        const user = await User.findOne({ uid });
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Add to team
        team.members.push(uid);
        await team.save();

        // Update user
        user.teamId = team._id;
        await user.save();

        res.status(200).json(team);

    } catch (error) {
        console.error('Error joining team:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete Team (Owner Only)
router.delete('/:teamId', verifyToken, async (req, res) => {
    const { teamId } = req.params;
    const uid = req.user.uid;

    try {
        const team = await Team.findById(teamId);
        if (!team) return res.status(404).json({ message: 'Team not found' });

        if (team.ownerId !== uid) {
            return res.status(403).json({ message: 'Only the team owner can delete the team' });
        }

        // Remove teamId from all members
        await User.updateMany(
            { teamId: team._id },
            { $unset: { teamId: "" } }
        );

        // Delete the team
        await Team.findByIdAndDelete(teamId);

        res.status(200).json({ message: 'Team deleted successfully' });
    } catch (error) {
        console.error('Error deleting team:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Remove Member (Owner Only)
router.delete('/:teamId/members/:memberUid', verifyToken, async (req, res) => {
    const { teamId, memberUid } = req.params;
    const uid = req.user.uid;

    try {
        const team = await Team.findById(teamId);
        if (!team) return res.status(404).json({ message: 'Team not found' });

        if (team.ownerId !== uid) {
            return res.status(403).json({ message: 'Only the team owner can remove members' });
        }

        if (memberUid === team.ownerId) {
            return res.status(400).json({ message: 'Cannot remove the owner. Delete the team instead.' });
        }

        // Remove from team members array
        team.members = team.members.filter(id => id !== memberUid);
        await team.save();

        // Update user to remove teamId
        await User.findOneAndUpdate(
            { uid: memberUid },
            { $unset: { teamId: "" } }
        );

        res.status(200).json({ message: 'Member removed successfully' });
    } catch (error) {
        console.error('Error removing member:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Invite Member
router.post('/invite', verifyToken, async (req, res) => {
    const { email } = req.body;
    const uid = req.user.uid;

    if (!email) return res.status(400).json({ message: 'Email is required' });

    try {
        const user = await User.findOne({ uid });
        if (!user || !user.teamId) return res.status(400).json({ message: 'You must be in a team to invite members' });

        const team = await Team.findById(user.teamId);
        if (!team) return res.status(404).json({ message: 'Team not found' });

        // Send Email
        const { sendZYNCEmail } = require('../services/mailer');
        await sendZYNCEmail(
            email,
            `You're invited to join ${team.name} on ZYNC!`,
            `
              <h2>Team Invitation</h2>
              <p>${user.displayName || 'A colleague'} has invited you to join the <strong>${team.name}</strong> team.</p>
              <p><strong>Invite Code: ${team.inviteCode}</strong></p>
              <p>Login to ZYNC and enter this code to join the team.</p>
            `,
            `You've been invited to join ${team.name}. Invite Code: ${team.inviteCode}`
        );

        res.status(200).json({ message: 'Invitation sent successfully' });
    } catch (error) {
        console.error('Error sending invite:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
