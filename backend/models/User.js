const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    uid: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    displayName: { type: String, default: 'User' },
    firstName: { type: String, default: null },
    lastName: { type: String, default: null },
    photoURL: { type: String, default: null },
    phoneNumber: { type: String, default: null },

    // Social graph (Firebase UIDs)
    connections: { type: [String], default: [] },
    closeFriends: { type: [String], default: [] },

    // Chat requests (JSON array of objects)
    chatRequests: { type: mongoose.Schema.Types.Mixed, default: [] },

    // Integrations
    githubIntegration: { type: mongoose.Schema.Types.Mixed, default: null },
    googleIntegration: { type: mongoose.Schema.Types.Mixed, default: null },

    // Phone verification
    isPhoneVerified: { type: Boolean, default: false },
    phoneVerificationCode: { type: String, default: null },
    phoneVerificationCodeExpires: { type: Date, default: null },

    // Account deletion
    deleteConfirmationCode: { type: String, default: null },
    deleteConfirmationExpires: { type: Date, default: null },

    // Presence
    status: { type: String, default: 'offline' },
    lastSeen: { type: Date, default: Date.now },

    // Location (resolved via GeoJS / browser timezone)
    timezone: { type: String, default: null },
    country: { type: String, default: null },
    countryCode: { type: String, default: null },
    city: { type: String, default: null },

    // Role
    role: { type: String, default: 'user' },

    // Team memberships (Team ObjectId strings)
    teamMemberships: { type: [String], default: [] },

    // Tracking for idempotent notifications
    welcomeNotificationSent: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

userSchema.index({ uid: 1 }, { unique: true });
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ displayName: 'text', firstName: 'text', lastName: 'text' });

module.exports = mongoose.model('User', userSchema);
