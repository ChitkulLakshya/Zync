const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const User = require('../models/User');
const Team = require('../models/Team');
const { encrypt } = require('../utils/encryption');
// const { sendEmail } = require('../utils/emailService'); // Replaced by mailer
const { sendZyncEmail } = require('../services/mailer');
// const { Resend } = require('resend'); // Removed
// const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Helper to send email
const sendVerificationEmail = async (email, code) => {
  return sendZyncEmail(
    email,
    'Phone Verification Code',
    `<b>Your verification code is: ${code}</b>`,
    `Your verification code is: ${code}`
  );
};

/* GET Current User Profile */
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid }).populate('teamId');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Sync user (create or update)
router.post('/sync', async (req, res) => {
  const { uid, email, displayName, photoURL, phoneNumber, firstName, lastName } = req.body;

  try {
    let user = await User.findOne({ uid });

    let finalDisplayName = displayName;
    if (!finalDisplayName && email) {
      finalDisplayName = email.split('@')[0];
    }

    if (user) {
      // Update existing user
      user.email = email;
      if (finalDisplayName) user.displayName = finalDisplayName;
      if (photoURL) user.photoURL = photoURL;
      if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;

      // Update names only if they are not already set (preserve manual edits)
      if (!user.firstName && firstName) user.firstName = firstName;
      if (!user.lastName && lastName) user.lastName = lastName;

      user.status = 'online';
      user.lastSeen = Date.now();
      await user.save();
    } else {
      // Create new user
      user = new User({
        uid,
        email,
        displayName: finalDisplayName,
        firstName,
        lastName,
        photoURL,
        phoneNumber,
        status: 'online',
        lastSeen: Date.now(),
      });
      await user.save();

      // Send Notification Email to Admin
      // Always attempt to send if GMAIL_USER is configured (implied by sendZYNCEmail existence)
      try {
        await sendZyncEmail(
          'ChitkulLakshya@gmail.com',
          '🚀 New User Joined ZYNC!',
          `
            <h1>New User Alert!</h1>
            <p><strong>Name:</strong> ${displayName || 'N/A'}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>UID:</strong> ${uid}</p>
          `,
          `New User Alert! Name: ${displayName || 'N/A'}, Email: ${email}`
        );
        console.log(`Notification email sent for new user: ${email}`);
      } catch (emailError) {
        console.error("Failed to send admin notification:", emailError);
      }
    }

    // Populate before returning
    await user.populate('teamId');
    res.status(200).json(user);
  } catch (error) {
    console.error('Error syncing user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Link GitHub Account
router.post('/sync-github', verifyToken, async (req, res) => {
  const { accessToken, username, firebaseUid } = req.body;
  // Use uid from token if available, else from body (for your bypassed auth setup)
  const uid = req.user?.uid || firebaseUid;

  if (!accessToken) {
    return res.status(400).json({ message: 'GitHub Access Token is required' });
  }

  try {
    const encryptedToken = encrypt(accessToken);

    // Update user with encrypted token and mark GitHub as connected
    const user = await User.findOneAndUpdate(
      { uid },
      {
        $set: {
          'integrations.github.connected': true,
          'integrations.github.accessToken': encryptedToken,
          'integrations.github.username': username
        }
      },
      { new: true }
    );

    if (!user) {
      // Fallback if findOneAndUpdate fails to find user (shouldn't happen if synced)
      return res.status(404).json({ message: 'User not found in database. Please refresh.' });
    }

    res.json({ message: 'GitHub account linked successfully', user });
  } catch (error) {
    console.error('Error syncing GitHub data:', error);
    res.status(500).json({ message: 'Server error updating GitHub integration' });
  }
});

// Search Users (Global) - Exclude current user
router.get('/search', verifyToken, async (req, res) => {
  const { query, excludeTeam } = req.query; // query = name or email
  if (!query) return res.json([]);

  try {
    const searchRegex = new RegExp(query, 'i'); // Case-insensitive
    const currentUserUid = req.user.uid;

    // Find users matching query, excluding current user
    // Optionally exclude own team members if excludeTeam=true (though UI might separate them)
    const users = await User.find({
      $and: [
        { uid: { $ne: currentUserUid } },
        {
          $or: [
            { displayName: searchRegex },
            { email: searchRegex },
            { firstName: searchRegex },
            { lastName: searchRegex }
          ]
        }
      ]
    })
      .select('uid displayName email photoURL status lastSeen teamId') // Return only public info
      .populate('teamId') // If you need team details
      .limit(20);

    res.json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ message: 'Server error during search' });
  }
});

// Send Chat Request (Email Notification)
router.post('/chat-request', verifyToken, async (req, res) => {
  const { recipientId, message } = req.body;
  const senderUid = req.user.uid;

  try {
    const sender = await User.findOne({ uid: senderUid });
    const recipient = await User.findOne({ uid: recipientId });

    if (!recipient) return res.status(404).json({ message: 'Recipient not found' });

    // Check if in same team (Validation)
    /*
    if (sender.teamId && recipient.teamId && sender.teamId.toString() === recipient.teamId.toString()) {
       return res.status(400).json({ message: 'Users are in the same team, no request needed.' });
    }
    */

    // Check if request already exists
    const existingRequest = recipient.chatRequests.find(req => req.senderId === senderUid && req.status === 'pending');
    if (existingRequest) {
      return res.status(400).json({ message: 'Request already sent' });
    }

    // Add to specific requests list
    recipient.chatRequests.push({
      senderId: senderUid,
      senderName: sender.displayName,
      senderEmail: sender.email,
      senderPhoto: sender.photoURL,
      message: message,
      status: 'pending'
    });
    await recipient.save();

    // Send Email
    await sendZyncEmail(
      recipient.email,
      `New Chat Request from ${sender.displayName || 'a Zync User'}`,
      `
        <h2>Chat Request</h2>
        <p><b>${sender.displayName}</b> wants to chat with you on ZYNC.</p>
        <p><i>"${message}"</i></p>
        <br/>
        <p>Log in to ZYNC to view and reply.</p>
      `,
      `New Chat Request from ${sender.displayName}: "${message}"`
    );

    res.json({ message: 'Chat request sent successfully' });
  } catch (error) {
    console.error('Chat request error:', error);
    res.status(500).json({ message: 'Failed to send chat request' });
  }
});

// Respond to Chat Request
router.post('/chat-request/respond', verifyToken, async (req, res) => {
  const { senderId, status } = req.body; // status: 'accepted' | 'rejected'
  const recipientUid = req.user.uid;

  if (!['accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  try {
    const recipient = await User.findOne({ uid: recipientUid });
    const sender = await User.findOne({ uid: senderId });

    if (!recipient || !sender) return res.status(404).json({ message: 'User not found' });

    // Find the request
    const request = recipient.chatRequests.find(r => r.senderId === senderId && r.status === 'pending');
    if (!request) {
      return res.status(404).json({ message: 'Pending request not found' });
    }

    // Update Request Status
    request.status = status;

    if (status === 'accepted') {
      // Add to connections for BOTH users
      if (!recipient.connections.includes(senderId)) recipient.connections.push(senderId);
      if (!sender.connections.includes(recipientUid)) sender.connections.push(recipientUid);

      await sender.save();
    }

    await recipient.save();

    res.json({ message: `Request ${status}` });
  } catch (error) {
    console.error('Error responding to request:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Toggle Close Friend
router.post('/close-friends/toggle', verifyToken, async (req, res) => {
  const { friendId } = req.body;
  const uid = req.user.uid;

  try {
    const user = await User.findOne({ uid });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Ensure closeFriends array exists
    if (!user.closeFriends) user.closeFriends = [];

    const index = user.closeFriends.indexOf(friendId);
    if (index > -1) {
      // Remove
      user.closeFriends.splice(index, 1);
      await user.save();
      return res.json({ message: 'Removed from Close Friends', isCloseFriend: false });
    } else {
      // Add
      user.closeFriends.push(friendId);
      await user.save();
      return res.json({ message: 'Added to Close Friends', isCloseFriend: true });
    }
  } catch (error) {
    console.error('Error toggling close friend:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users (filtered by Team)
// Get all users (filtered by Team OR Aggregated)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { teamId } = req.query;
    const currentUser = await User.findOne({ uid: req.user.uid });

    if (!currentUser) return res.status(404).json({ message: 'User not found' });

    // 1. Specific Team Requested (Backwards Compatibility / Strict Filter)
    if (teamId) {
      const team = await Team.findById(teamId);
      if (!team) return res.status(404).json({ message: 'Team not found' });
      const users = await User.find({ uid: { $in: team.members } }).sort({ lastSeen: -1 });
      return res.status(200).json(users);
    }

    // 2. Unified List (Chat / Dashboard view)
    // Aggregate: All Teams user is a member of (including owned) + Connections
    const relatedUids = new Set(currentUser.connections || []);

    // Find ALL teams where the user is a member
    // This handles: Active Team, Other Joined Teams, Owned Teams (if owner is in members)
    const allMyTeams = await Team.find({ members: req.user.uid });

    // Also fetch owned teams just in case owner isn't in members array for some reason
    const ownedTeams = await Team.find({ ownerId: req.user.uid });

    // Combine teams
    const uniqueTeams = [...allMyTeams, ...ownedTeams];

    uniqueTeams.forEach(t => {
      if (t.members) t.members.forEach(m => relatedUids.add(m));
    });

    // Explicitly add self (optional, but harmless)
    if (req.user.uid) relatedUids.add(req.user.uid);

    const users = await User.find({ uid: { $in: Array.from(relatedUids) } }).sort({ lastSeen: -1 });
    res.status(200).json(users);

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single user
router.get('/:uid', async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.params.uid });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const updates = req.body;

    // Check if phone number is being updated
    if (updates.phoneNumber) {
      const user = await User.findOne({ uid });
      if (user && user.phoneNumber !== updates.phoneNumber) {
        updates.isPhoneVerified = false; // Reset verification status
        updates.phoneVerificationCode = undefined;
        updates.phoneVerificationCodeExpires = undefined;
      }
    }

    const user = await User.findOneAndUpdate(
      { uid },
      { $set: updates },
      { new: true }
    );
    res.status(200).json(user);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Request Account Deletion (Send Code)
router.post('/delete/request', verifyToken, async (req, res) => {
  const { uid } = req.body;

  // Security check: Ensure the requester is the user they claim to be
  if (req.user.uid !== uid) {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  try {
    const user = await User.findOne({ uid });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Save code
    user.deleteConfirmationCode = code;
    user.deleteConfirmationExpires = Date.now() + 10 * 60 * 1000; // 10 mins
    await user.save();

    // Send email
    await sendZyncEmail(
      user.email,
      'Account Deletion Verification Code',
      `
        <h2>Confirm Account Deletion</h2>
        <p>You have requested to delete your ZYNC account. This action is irreversible.</p>
        <p><b>Verification Code: ${code}</b></p>
        <p>If you did not request this, please ignore this email and secure your account.</p>
      `,
      `Verification Code: ${code}`
    );

    res.status(200).json({ message: 'Verification code sent to email' });
  } catch (error) {
    console.error('Error requesting deletion:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Confirm Account Deletion
router.post('/delete/confirm', verifyToken, async (req, res) => {
  const { uid, code } = req.body;

  // Security check
  if (req.user.uid !== uid) {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  try {
    const user = await User.findOne({ uid });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.deleteConfirmationCode !== code) {
      return res.status(400).json({ message: 'Invalid code' });
    }

    if (user.deleteConfirmationExpires < Date.now()) {
      return res.status(400).json({ message: 'Code expired' });
    }

    // Remove user from any teams
    await Team.updateMany(
      { members: uid },
      { $pull: { members: uid } }
    );

    await User.findOneAndDelete({ uid });
    // TODO: also trigger Firebase Authentication deletion via Admin SDK if possible, 
    // but the frontend handles the client-side firebase auth deletion.

    res.status(200).json({ message: 'User deleted' });
  } catch (error) {
    console.error('Error confirming deletion:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE route (Legacy removed or kept for admin usage?)
// For now, removing the direct public delete endpoint or restricting it to admin only would be wise,
// but to avoid breaking other flows completely, I'll comment it out or leave it for admins if needed.
// For this task, we replace the user-initiated delete flow.
/*
router.delete('/:uid', async (req, res) => {
  // ...
});
*/

// Request Phone Verification
router.post('/verify-phone/request', async (req, res) => {
  const { uid, phoneNumber } = req.body;
  try {
    const user = await User.findOne({ uid });
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Save code and temp phone number to user
    user.phoneVerificationCode = code;
    user.phoneVerificationCodeExpires = Date.now() + 10 * 60 * 1000; // 10 mins
    user.phoneNumber = phoneNumber; // Update phone number, but not verified yet
    user.isPhoneVerified = false;
    await user.save();

    // Send email
    await sendVerificationEmail(user.email, code);

    res.status(200).json({ message: 'Verification code sent to email' });
  } catch (error) {
    console.error('Error requesting verification:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Confirm Phone Verification
router.post('/verify-phone/confirm', async (req, res) => {
  const { uid, code } = req.body;
  try {
    const user = await User.findOne({ uid });
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.phoneVerificationCode !== code) {
      return res.status(400).json({ message: 'Invalid code' });
    }

    if (user.phoneVerificationCodeExpires < Date.now()) {
      return res.status(400).json({ message: 'Code expired' });
    }

    // Mark as verified
    user.isPhoneVerified = true;
    user.phoneVerificationCode = undefined;
    user.phoneVerificationCodeExpires = undefined;
    await user.save();

    res.status(200).json({ message: 'Phone number verified successfully' });
  } catch (error) {
    console.error('Error verifying phone:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
