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


    connections: { type: [String], default: [] },
    closeFriends: { type: [String], default: [] },


    chatRequests: { type: mongoose.Schema.Types.Mixed, default: [] },


    githubIntegration: { type: mongoose.Schema.Types.Mixed, default: null },
    googleIntegration: { type: mongoose.Schema.Types.Mixed, default: null },


    isPhoneVerified: { type: Boolean, default: false },
    phoneVerificationCode: { type: String, default: null },
    phoneVerificationCodeExpires: { type: Date, default: null },


    deleteConfirmationCode: { type: String, default: null },
    deleteConfirmationExpires: { type: Date, default: null },


    status: { type: String, default: 'offline' },
    lastSeen: { type: Date, default: Date.now },


    timezone: { type: String, default: null },
    country: { type: String, default: null },
    countryCode: { type: String, default: null },
    city: { type: String, default: null },


    role: { type: String, default: 'user' },


    teamMemberships: { type: [String], default: [] },


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
