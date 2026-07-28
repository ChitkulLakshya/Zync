const User = require('../models/User');

let messagingInstance = null;

const getMessagingInstance = () => {
  if (messagingInstance) return messagingInstance;
  try {
    const { getApps } = require('firebase-admin/app');
    const { getMessaging } = require('firebase-admin/messaging');
    if (getApps().length === 0) {
      return null;
    }
    messagingInstance = getMessaging();
    return messagingInstance;
  } catch (error) {
    console.error('[PushNotifications] Failed to initialize Firebase Admin Messaging:', error.message);
    return null;
  }
};

const sendPushNotification = async (uid, payload) => {
  const messaging = getMessagingInstance();
  if (!messaging) {
    return;
  }

  try {
    const user = await User.findOne({ uid }).select('fcmTokens').lean();
    if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
      return;
    }

    const tokens = user.fcmTokens.map((t) => t.token).filter(Boolean);
    if (tokens.length === 0) {
      return;
    }

    const message = {
      notification: {
        title: payload.title || 'Zync Notification',
        body: payload.body || '',
      },
      data: Object.fromEntries(
        Object.entries(payload.data || {}).map(([k, v]) => [k, String(v)])
      ),
      tokens,
    };

    const response = await messaging.sendEachForMulticast(message);
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error) {
          const errorCode = resp.error.code;
          if (
            errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/registration-token-not-registered'
          ) {
            failedTokens.push(tokens[idx]);
          }
        }
      });

      if (failedTokens.length > 0) {
        await User.updateOne(
          { uid },
          { $pull: { fcmTokens: { token: { $in: failedTokens } } } }
        );
      }
    }
  } catch (error) {
    console.error('[PushNotifications] Error sending push notification:', error.message);
  }
};

module.exports = { sendPushNotification };
