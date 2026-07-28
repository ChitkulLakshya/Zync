# Feature Architecture: Backend FCM Token Management & Push Notification Service

## Overview
This document details the backend implementation of Firebase Cloud Messaging (FCM) for Zync, including the User model schema changes, API routes for FCM token registration/removal, the push notification service, and integration into task and meeting event flows.

## 1. User Model Schema Update

**File**: `backend/models/User.js`

### New Field: `fcmTokens`
```javascript
fcmTokens: [
  {
    token: { type: String, required: true },
    platform: { type: String, default: 'web' },
    updatedAt: { type: Date, default: Date.now },
  },
],
```

### Design Decisions
- **Array of tokens**: A user can have multiple devices (phone, tablet, desktop). Each device registers its own FCM token.
- **Platform field**: Stores the user agent string to identify the device/browser type for debugging and analytics.
- **UpdatedAt field**: Tracks when the token was last refreshed, allowing stale token cleanup.
- **No unique constraint on token**: The backend deduplicates tokens in the registration route to prevent duplicates.

## 2. FCM Token API Routes

**File**: `backend/routes/userRoutes.js`

### POST `/fcm-token` — Register Token
```javascript
router.post('/fcm-token', verifyToken, async (req, res) => {
  const { token, platform } = req.body;
  const user = await User.findById(req.user.uid);
  
  // Deduplicate: only add if token doesn't already exist
  const existing = user.fcmTokens.find(t => t.token === token);
  if (!existing) {
    user.fcmTokens.push({ token, platform: platform || 'web' });
  } else {
    existing.updatedAt = new Date();  // Refresh timestamp
  }
  
  await user.save();
  res.json({ success: true });
});
```

### DELETE `/fcm-token` — Remove Token
```javascript
router.delete('/fcm-token', verifyToken, async (req, res) => {
  const { token } = req.body;
  await User.updateOne(
    { _id: req.user.uid },
    { $pull: { fcmTokens: { token } } }
  );
  res.json({ success: true });
});
```

### Security
- Both routes require JWT authentication via the `verifyToken` middleware.
- Tokens are scoped to the authenticated user — no cross-user token access.
- The `$pull` MongoDB operator safely removes the token without race conditions.

## 3. Push Notification Service

**File**: `backend/services/pushNotificationService.js`

### Purpose
Sends multicast push notifications to a user's registered FCM tokens and automatically cleans up invalid tokens.

### `sendPushNotification(userId, notification, data)` Function
```javascript
async function sendPushNotification(userId, notification, data = {}) {
  const user = await User.findById(userId);
  if (!user || !user.fcmTokens || user.fcmTokens.length === 0) return;

  const tokens = user.fcmTokens.map(t => t.token);
  const message = {
    notification: { title: notification.title, body: notification.body },
    data: data,
    tokens: tokens,
  };

  const response = await admin.messaging().sendEachForMulticast(message);

  // Clean up invalid tokens
  const invalidTokens = [];
  response.responses.forEach((resp, idx) => {
    if (!resp.success) {
      const error = resp.error;
      if (error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered') {
        invalidTokens.push(tokens[idx]);
      }
    }
  });

  if (invalidTokens.length > 0) {
    await User.updateOne(
      { _id: userId },
      { $pull: { fcmTokens: { token: { $in: invalidTokens } } } }
    );
  }
}
```

### Invalid Token Cleanup
After each multicast send, the service checks which tokens failed and removes them from the user's `fcmTokens` array. This prevents:
- Wasted bandwidth sending to dead tokens.
- FCM quota consumption on invalid tokens.
- Unbounded growth of the tokens array.

### Error Codes Handled
| Error Code | Action |
|------------|--------|
| `messaging/invalid-registration-token` | Remove token |
| `messaging/registration-token-not-registered` | Remove token |
| Other errors | Log and continue (token kept) |

## 4. Task Assignment Integration

**File**: `backend/routes/taskRoutes.js`

### Trigger: Task Creation
When a task is created and assigned to users, push notifications are sent to each assignee.

```javascript
// After task creation and email notification
for (const assigneeUid of task.assignees) {
  pushNotificationService.sendPushNotification(assigneeUid, {
    title: 'New Task Assigned',
    body: `You have been assigned: ${task.title}`,
  }, {
    type: 'task',
    taskId: task._id.toString(),
    projectId: task.projectId.toString(),
    url: `/dashboard/tasks`,
  });
}
```

### Notification Payload
- **Title**: "New Task Assigned"
- **Body**: Task title
- **Data**: Includes `type`, `taskId`, `projectId`, and `url` for deep linking on click.

## 5. Meeting Invitation Integration

**File**: `backend/routes/meetRoutes.js`

### Trigger: Meeting Scheduled
When a meeting is created with participants, push notifications are sent to each participant.

```javascript
// After meeting creation and email notification
for (const participantUid of meeting.participants) {
  pushNotificationService.sendPushNotification(participantUid, {
    title: 'New Meeting Invitation',
    body: `You're invited: ${meeting.title} on ${meeting.date} at ${meeting.time}`,
  }, {
    type: 'meeting',
    meetingId: meeting._id.toString(),
    url: `/dashboard/meets`,
  });
}
```

### Notification Payload
- **Title**: "New Meeting Invitation"
- **Body**: Meeting title, date, and time
- **Data**: Includes `type`, `meetingId`, and `url` for deep linking on click.

## 6. Firebase Admin SDK Initialization

The backend uses the Firebase Admin SDK, which must be initialized with service account credentials. This is separate from the frontend Firebase config.

```javascript
const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
```

The service account key should be stored securely (environment variable or secret manager) and never exposed to the frontend.

## Conclusion
The backend FCM implementation provides a robust push notification pipeline with automatic token lifecycle management. The service is integrated into existing task and meeting workflows without disrupting the current email and socket-based notification systems, adding push as a complementary channel.
