const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const User = require('../models/User');
const { encrypt } = require('../utils/encryption');
const { sendEmail } = require('../utils/emailService');
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

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

    if (user) {
      // Update existing user
      user.email = email;
      user.displayName = displayName;
      user.photoURL = photoURL;
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
        displayName,
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

// Delete user
router.delete('/:uid', async (req, res) => {
  try {
    await User.findOneAndDelete({ uid: req.params.uid });
    // Here you would also delete related data (tasks, projects, etc.)
    res.status(200).json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

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
