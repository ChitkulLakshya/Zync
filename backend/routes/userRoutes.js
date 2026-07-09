const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/authMiddleware');
const User = require('../models/User');
const Team = require('../models/Team');
const { encrypt } = require('../utils/encryption');
const { sendZyncEmail } = require('../services/mailer');
const { appendRow } = require('../services/sheetLogger');
const { normalizeDoc, normalizeDocs } = require('../utils/normalize');
const { paginateArray, setPaginationHeaders } = require('../utils/pagination');
const {
  getNewUserRegistrationTemplate,
  getPhoneVerificationEmailHtml,
  getChatRequestEmailHtml,
  getAccountDeletionCodeEmailHtml,
} = require('../utils/emailTemplates');
const { deleteCloudinaryAsset } = require('../services/cloudinaryService');
const { checkPassword } = require('../services/haveIBeenPwnedService');
const { resolveIp } = require('../services/geoService');
const cache = require('../utils/cache');

const getNewUserAlertRecipients = () => {
  const recipients = process.env.NEW_USER_ALERT_RECIPIENTS || process.env.SUPPORT_RECIPIENTS || '';
  return recipients
    .split(',')
    .map(r => r.trim())
    .filter(Boolean);
};

const wasUserInsertedFromUpsertResult = (result) => {
  const lastErrorObject = result?.lastErrorObject;
  if (!lastErrorObject) return false;

  if (Object.prototype.hasOwnProperty.call(lastErrorObject, 'upserted')) {
    return Boolean(lastErrorObject.upserted);
  }

  if (Object.prototype.hasOwnProperty.call(lastErrorObject, 'updatedExisting')) {
    return lastErrorObject.updatedExisting === false;
  }

  return false;
};

const dispatchNewUserNotifications = ({ displayName, email, uid }) => {
  const recipients = getNewUserAlertRecipients();

  if (recipients.length === 0) {
    console.warn('[SYNC] NEW_USER_ALERT_RECIPIENTS/SUPPORT_RECIPIENTS not configured; skipping admin email notification');
  } else {
    sendZyncEmail(
      recipients.join(','),
      '🚀 New User Joined ZYNC!',
      getNewUserRegistrationTemplate({
        name: displayName || 'N/A',
        email,
        uid
      }),
      `New User Alert! Name: ${displayName || 'N/A'}, Email: ${email}`
    ).catch(err => console.error('Failed to send admin notification:', err));
  }

  appendRow(
    displayName || 'N/A',
    email,
    new Date().toISOString()
  ).catch(err => console.error('Failed to log user to Google Sheets:', err));
};


const sendVerificationEmail = async (email, code) => {
  return sendZyncEmail(
    email,
    'Phone Verification Code',
    getPhoneVerificationEmailHtml({ code }),
    `Your verification code is: ${code}`
  );
};


router.post('/check-breached-password', async (req, res) => {
  const { password } = req.body;
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ message: 'Password is required' });
  }

  try {
    const result = await checkPassword(password);
    res.json(result);
  } catch (error) {
    console.error('Breached password check error:', error.message);
    res.status(429).json({ message: error.message });
  }
});


router.get('/me', verifyToken, async (req, res) => {
  try {
    const cacheKey = `user:me:${req.user.uid}`;

    const cached = await cache.getJson(cacheKey);
    if (cached) return res.json(cached);

    const user = await User.findOne({ uid: req.user.uid })
      .select('-githubIntegration.accessToken -deleteConfirmationCode -deleteConfirmationExpires -phoneVerificationCode -phoneVerificationCodeExpires')
      .lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    const teams = await Team.find({ members: user.uid }).lean();
    const teamInfo = teams.length > 0 ? normalizeDoc(teams[0]) : null;

    const result = { ...normalizeDoc(user), teamId: teamInfo };
    cache.setJson(cacheKey, result, 300);

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});


router.post('/sync', verifyToken, async (req, res) => {
  const { uid: bodyUid, email, displayName, photoURL, phoneNumber, firstName, lastName, timezone } = req.body;
  const uid = req.user.uid;

  if (bodyUid && bodyUid !== uid) {
    return res.status(403).json({ message: 'Unauthorized: UID mismatch' });
  }

  try {
    const existingUser = await User.findOne({ uid }).lean();
    const safeEmail = email || existingUser?.email;
    if (!safeEmail) {
      return res.status(400).json({ message: 'Email is required to sync user profile' });
    }

    let finalDisplayName = displayName;
    if (!finalDisplayName && safeEmail) {
      finalDisplayName = safeEmail.split('@')[0];
    }

    const updateData = {
      email: safeEmail,
      status: 'online',
      lastSeen: new Date()
    };
    if (finalDisplayName) updateData.displayName = finalDisplayName;
    if (photoURL) updateData.photoURL = photoURL;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (timezone) updateData.timezone = timezone;

    const user = await User.findOneAndUpdate(
      { uid },
      {
        $set: updateData,
        $setOnInsert: {
          uid,
          displayName: finalDisplayName || 'User',
          firstName: firstName || null,
          lastName: lastName || null,
          photoURL: photoURL || null,
          phoneNumber: phoneNumber || null,
          status: 'online',
          lastSeen: new Date(),
          createdAt: new Date(),
          welcomeNotificationSent: true
        }
      },
      {
        upsert: true,
        new: true,
        lean: true,
        setDefaultsOnInsert: true
      }
    );

    const isNewUserInsert = !existingUser;

    if (isNewUserInsert) {
      console.log(`[SYNC] Sending welcome notifications for newly inserted user: ${uid} (${email})`);
      // Fire-and-forget: don't block response on external notifications
      dispatchNewUserNotifications({
        displayName: finalDisplayName,
        email: safeEmail,
        uid
      });
    }

    // Fire-and-forget: enrich location from IP if country is missing
    if (!user.country) {
      const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
      resolveIp(clientIp).then((geo) => {
        if (geo) {
          User.updateOne(
            { uid },
            { $set: { country: geo.country, countryCode: geo.countryCode, city: geo.city } }
          ).catch(() => {});
        }
      }).catch(() => {});
    }

    const teams = await Team.find({ members: user.uid }).lean();
    const teamInfo = teams.length > 0 ? normalizeDoc(teams[0]) : null;

    cache.invalidate(`user:me:${uid}`);
    res.status(200).json({ ...normalizeDoc(user), teamId: teamInfo });
  } catch (error) {
    console.error('Error syncing user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


router.post('/sync-github', verifyToken, async (req, res) => {
  const { accessToken, username, firebaseUid } = req.body;
  const uid = req.user?.uid || firebaseUid;

  if (!accessToken) {
    return res.status(400).json({ message: 'GitHub Access Token is required' });
  }

  try {
    const encryptedToken = encrypt(accessToken);

    const user = await User.findOneAndUpdate(
      { uid },
      {
        $set: {
          githubIntegration: {
            connected: true,
            accessToken: encryptedToken,
            username: username,
            connectedAt: new Date().toISOString()
          }
        }
      },
      { returnDocument: 'after', lean: true, select: '-githubIntegration.accessToken -deleteConfirmationCode -deleteConfirmationExpires -phoneVerificationCode -phoneVerificationCodeExpires' }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found in database. Please refresh.' });
    }

    cache.invalidate(`user:me:${uid}`);
    res.json({ message: 'GitHub account linked successfully', user: normalizeDoc(user) });
  } catch (error) {
    console.error('Error syncing GitHub data:', error);
    res.status(500).json({ message: 'Server error updating GitHub integration' });
  }
});


// Detect location from client IP via GeoJS
router.get('/detect-location', verifyToken, async (req, res) => {
  try {
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
    const geo = await resolveIp(clientIp);

    if (!geo) {
      return res.json({ timezone: null, country: null, countryCode: null, city: null });
    }

    // Persist to user profile
    const uid = req.user.uid;
    await User.updateOne(
      { uid },
      { $set: { country: geo.country, countryCode: geo.countryCode, city: geo.city } }
    );
    cache.invalidate(`user:me:${uid}`);

    res.json(geo);
  } catch (error) {
    console.error('Error detecting location:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


router.get('/search', verifyToken, async (req, res) => {
  const { query } = req.query;
  if (!query) return res.json([]);

  try {
    const currentUserUid = req.user.uid;
    const searchLower = query.toLowerCase();

    const users = await User.find({
      uid: { $ne: currentUserUid },
      $or: [
        { displayName: { $regex: searchLower, $options: 'i' } },
        { email: { $regex: searchLower, $options: 'i' } },
        { firstName: { $regex: searchLower, $options: 'i' } },
        { lastName: { $regex: searchLower, $options: 'i' } }
      ]
    })
      .select('uid displayName email photoURL status lastSeen teamMemberships')
      .lean();

    const { items, pagination } = paginateArray(normalizeDocs(users), req.query, { defaultLimit: 20, maxLimit: 100 });
    setPaginationHeaders(res, pagination);

    res.json(items);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ message: 'Server error during search' });
  }
});


router.post('/chat-request', verifyToken, async (req, res) => {
  const { recipientId, message } = req.body;
  const senderUid = req.user.uid;

  try {
    const sender = await User.findOne({ uid: senderUid }).lean();
    const recipient = await User.findOne({ uid: recipientId }).lean();

    if (!recipient) return res.status(404).json({ message: 'Recipient not found' });

    const existingRequests = Array.isArray(recipient.chatRequests) ? recipient.chatRequests : [];
    const existingRequest = existingRequests.find(r => r.senderId === senderUid && r.status === 'pending');
    if (existingRequest) {
      return res.status(400).json({ message: 'Request already sent' });
    }

    const newRequest = {
      senderId: senderUid,
      senderName: sender.displayName,
      senderEmail: sender.email,
      senderPhoto: sender.photoURL,
      message: message,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    await User.updateOne(
      { uid: recipientId },
      { $set: { chatRequests: [...existingRequests, newRequest] } }
    );

    await sendZyncEmail(
      recipient.email,
      `New Chat Request from ${sender.displayName || 'a Zync User'}`,
      getChatRequestEmailHtml({
        senderName: sender.displayName || 'A Zync user',
        message: message || '',
      }),
      `New Chat Request from ${sender.displayName}: "${message}"`
    );

    cache.invalidate(`user:me:${recipientId}`);
    res.json({ message: 'Chat request sent successfully' });
  } catch (error) {
    console.error('Chat request error:', error);
    res.status(500).json({ message: 'Failed to send chat request' });
  }
});


router.post('/chat-request/respond', verifyToken, async (req, res) => {
  const { senderId, status } = req.body;
  const recipientUid = req.user.uid;

  if (!['accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  try {
    const [recipient, sender] = await Promise.all([
      User.findOne({ uid: recipientUid }).lean(),
      User.findOne({ uid: senderId }).lean()
    ]);

    if (!recipient || !sender) return res.status(404).json({ message: 'User not found' });

    const chatRequests = Array.isArray(recipient.chatRequests) ? [...recipient.chatRequests] : [];
    const requestIndex = chatRequests.findIndex(r => r.senderId === senderId && r.status === 'pending');
    if (requestIndex === -1) {
      return res.status(404).json({ message: 'Pending request not found' });
    }

    chatRequests[requestIndex] = { ...chatRequests[requestIndex], status };

    if (status === 'accepted') {
      const recipientConnections = [...(recipient.connections || [])];
      const senderConnections = [...(sender.connections || [])];

      if (!recipientConnections.includes(senderId)) recipientConnections.push(senderId);
      if (!senderConnections.includes(recipientUid)) senderConnections.push(recipientUid);

      await Promise.all([
        User.updateOne(
          { uid: senderId },
          { $set: { connections: senderConnections } }
        ),
        User.updateOne(
          { uid: recipientUid },
          { $set: { chatRequests, connections: recipientConnections } }
        )
      ]);
    } else {
      await User.updateOne(
        { uid: recipientUid },
        { $set: { chatRequests } }
      );
    }

    res.json({ message: `Request ${status}` });
    cache.invalidate(`user:me:${recipientUid}`, `user:me:${senderId}`);
  } catch (error) {
    console.error('Error responding to request:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


router.post('/close-friends/toggle', verifyToken, async (req, res) => {
  const { friendId } = req.body;
  const uid = req.user.uid;

  try {
    const user = await User.findOne({ uid }).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    const closeFriends = [...(user.closeFriends || [])];
    const index = closeFriends.indexOf(friendId);

    if (index > -1) {
      closeFriends.splice(index, 1);
      await User.updateOne({ uid }, { $set: { closeFriends } });
      cache.invalidate(`user:me:${uid}`);
      return res.json({ message: 'Removed from Close Friends', isCloseFriend: false });
    } else {
      closeFriends.push(friendId);
      await User.updateOne({ uid }, { $set: { closeFriends } });
      cache.invalidate(`user:me:${uid}`);
      return res.json({ message: 'Added to Close Friends', isCloseFriend: true });
    }
  } catch (error) {
    console.error('Error toggling close friend:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


router.get('/', verifyToken, async (req, res) => {
  try {
    const { teamId } = req.query;
    const currentUser = await User.findOne({ uid: req.user.uid }).lean();
    if (!currentUser) return res.status(404).json({ message: 'User not found' });

    if (teamId) {
      const team = await Team.findById(teamId).lean();
      if (!team) return res.status(404).json({ message: 'Team not found' });
      const users = await User.find({ uid: { $in: team.members } })
        .sort({ lastSeen: -1 })
        .select('-githubIntegration.accessToken -deleteConfirmationCode -deleteConfirmationExpires -phoneVerificationCode -phoneVerificationCodeExpires')
        .lean();
      const { items, pagination } = paginateArray(normalizeDocs(users), req.query);
      setPaginationHeaders(res, pagination);
      return res.status(200).json(items);
    }

    const relatedUids = new Set(currentUser.connections || []);

    const [allMyTeams, ownedTeams] = await Promise.all([
      Team.find({ members: req.user.uid }).lean(),
      Team.find({ ownerId: req.user.uid }).lean()
    ]);

    const uniqueTeams = [...allMyTeams, ...ownedTeams];
    uniqueTeams.forEach(t => {
      if (t.members) t.members.forEach(m => relatedUids.add(m));
    });

    relatedUids.add(req.user.uid);

    const users = await User.find({ uid: { $in: Array.from(relatedUids) } })
      .select('-githubIntegration.accessToken -deleteConfirmationCode -deleteConfirmationExpires -phoneVerificationCode -phoneVerificationCodeExpires')
      .sort({ lastSeen: -1 })
      .lean();
    const { items, pagination } = paginateArray(normalizeDocs(users), req.query);
    setPaginationHeaders(res, pagination);
    res.status(200).json(items);

  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


router.get('/:uid', async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.params.uid })
      .select('-githubIntegration.accessToken -deleteConfirmationCode -deleteConfirmationExpires -phoneVerificationCode -phoneVerificationCodeExpires')
      .lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json(normalizeDoc(user));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});


router.put('/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const updates = req.body;

    if (updates.phoneNumber) {
      const user = await User.findOne({ uid }).lean();
      if (user && user.phoneNumber !== updates.phoneNumber) {
        updates.isPhoneVerified = false;
        updates.phoneVerificationCode = null;
        updates.phoneVerificationCodeExpires = null;
      }
    }

    const { id, uid: _uid, createdAt, updatedAt, ...safeUpdates } = updates;

    const user = await User.findOneAndUpdate(
      { uid },
      { $set: safeUpdates },
      { returnDocument: 'after', lean: true }
    );
    if (!user) return res.status(404).json({ message: 'User not found' });
    cache.invalidate(`user:me:${uid}`);
    res.status(200).json(normalizeDoc(user));
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


router.post('/delete/request', verifyToken, async (req, res) => {
  const { uid } = req.body;

  if (req.user.uid !== uid) {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  try {
    const user = await User.findOne({ uid }).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await User.updateOne(
      { uid },
      {
        $set: {
          deleteConfirmationCode: code,
          deleteConfirmationExpires: new Date(Date.now() + 10 * 60 * 1000)
        }
      }
    );

    await sendZyncEmail(
      user.email,
      'Account Deletion Verification Code',
      getAccountDeletionCodeEmailHtml({ code }),
      `Verification Code: ${code}`
    );

    res.status(200).json({ message: 'Verification code sent to email' });
  } catch (error) {
    console.error('Error requesting deletion:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


router.post('/delete/confirm', verifyToken, async (req, res) => {
  const { uid, code } = req.body;
  console.log(`[DELETE] Request to delete user: ${uid} with code: ${code}`);

  if (req.user.uid !== uid) {
    console.warn(`[DELETE] Unauthorized attempt by ${req.user.uid} to delete ${uid}`);
    return res.status(403).json({ message: 'Unauthorized' });
  }

  try {
    const user = await User.findOne({ uid }).lean();
    if (!user) {
      console.warn(`[DELETE] User not found: ${uid}`);
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.deleteConfirmationCode !== code) {
      console.warn(`[DELETE] Invalid code for user ${uid}`);
      return res.status(400).json({ message: 'Invalid code' });
    }

    if (user.deleteConfirmationExpires < new Date()) {
      console.warn(`[DELETE] Code expired for user ${uid}`);
      return res.status(400).json({ message: 'Code expired' });
    }

    const teamsWithUser = await Team.find({ members: uid }).lean();
    for (const team of teamsWithUser) {
      await Team.updateOne(
        { _id: team._id },
        { $set: { members: team.members.filter(m => m !== uid) } }
      );
    }
    console.log(`[DELETE] Removed user ${uid} from teams`);

    // Delete profile photo from Cloudinary if it exists
    if (user.photoURL) {
      try {
        await deleteCloudinaryAsset(user.photoURL);
        console.log(`[DELETE] Deleted profile photo for user: ${uid}`);
      } catch (deleteError) {
        console.warn(`[DELETE] Failed to delete profile photo for user ${uid}:`, deleteError.message);
      }
    }

    await User.deleteOne({ uid });
    cache.invalidate(`user:me:${uid}`);
    console.log(`[DELETE] User ${uid} deleted from database`);

    try {
      const admin = require('firebase-admin');
      await admin.auth().deleteUser(uid);
      console.log(`[DELETE] User ${uid} deleted from Firebase Auth (server-side)`);
    } catch (fbError) {
      console.error(`[DELETE] Failed to delete user from Firebase Auth:`, fbError.message);
    }

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error confirming deletion:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


router.post('/verify-phone/request', async (req, res) => {
  const { uid, phoneNumber } = req.body;
  try {
    const user = await User.findOne({ uid }).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await User.updateOne(
      { uid },
      {
        $set: {
          phoneVerificationCode: code,
          phoneVerificationCodeExpires: new Date(Date.now() + 10 * 60 * 1000),
          phoneNumber: phoneNumber,
          isPhoneVerified: false
        }
      }
    );

    cache.invalidate(`user:me:${uid}`);
    await sendVerificationEmail(user.email, code);

    res.status(200).json({ message: 'Verification code sent to email' });
  } catch (error) {
    console.error('Error requesting verification:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


router.post('/verify-phone/confirm', async (req, res) => {
  const { uid, code } = req.body;
  try {
    const user = await User.findOne({ uid }).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.phoneVerificationCode !== code) {
      return res.status(400).json({ message: 'Invalid code' });
    }

    if (user.phoneVerificationCodeExpires < new Date()) {
      return res.status(400).json({ message: 'Code expired' });
    }

    await User.updateOne(
      { uid },
      {
        $set: {
          isPhoneVerified: true,
          phoneVerificationCode: null,
          phoneVerificationCodeExpires: null
        }
      }
    );

    cache.invalidate(`user:me:${uid}`);
    res.status(200).json({ message: 'Phone number verified successfully' });
  } catch (error) {
    console.error('Error verifying phone:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
