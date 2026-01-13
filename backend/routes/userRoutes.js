const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const User = require('../models/User');
const { encrypt } = require('../utils/encryption');
const { sendEmail } = require('../utils/emailService');
const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Helper to send email
const sendVerificationEmail = async (email, code) => {
  return sendEmail({
    to: email,
    subject: 'Phone Verification Code',
    text: `Your verification code is: ${code}`,
    html: `<b>Your verification code is: ${code}</b>`
  });
};

/* GET Current User Profile */
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid });
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
      if (process.env.RESEND_API_KEY) {
        try {
          await resend.emails.send({
            from: 'Zync <onboarding@resend.dev>', // or your custom domain
            to: 'ChitkulLakshya@gmail.com',
            subject: '🚀 New User Joined Zync!',
            html: `
              <h1>New User Alert!</h1>
              <p><strong>Name:</strong> ${displayName || 'N/A'}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>UID:</strong> ${uid}</p>
            `
          });
          console.log(`Notification email sent for new user: ${email}`);
        } catch (emailError) {
          console.error("Failed to send admin notification:", emailError);
        }
      }
    }

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

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find().sort({ lastSeen: -1 });
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
    await resend.emails.send({
      from: 'Zync Security <security@resend.dev>',
      to: user.email,
      subject: 'Account Deletion Verification Code',
      html: `
        <h2>Confirm Account Deletion</h2>
        <p>You have requested to delete your Zync account. This action is irreversible.</p>
        <p><b>Verification Code: ${code}</b></p>
        <p>If you did not request this, please ignore this email and secure your account.</p>
      `
    });

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
