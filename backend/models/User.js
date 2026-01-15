const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true }, // Firebase UID
  email: { type: String, required: true },
  firstName: String,
  lastName: String,
  displayName: String,
  username: String,
  country: String,
  countryCode: String,
  phoneNumber: String,
  birthday: Date,
  isPhoneVerified: { type: Boolean, default: false },
  role: { type: String, enum: ['user', 'admin'], default: 'user' }, // Added Admin Role
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' }, // Reference to Team Model

  // Deletion Verification
  deleteConfirmationCode: String,
  deleteConfirmationExpires: Date,

  // Integration Fields
  integrations: {
    github: {
      connected: { type: Boolean, default: false },
      accessToken: { type: String }, // Will be stored Encrypted
      username: { type: String },
      id: { type: Number }, // GitHub User ID
      installationId: { type: String }, // GitHub App Installation ID
      connectedAt: { type: Date }
    },
    google: {
      connected: { type: Boolean, default: false },
      email: String
    }
  },

  photoURL: { type: String },
  status: { type: String, default: 'offline' },
  lastSeen: { type: Date, default: Date.now },
  preferences: {
    theme: { type: String, default: 'system' },
    notifications: {
      email: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true }
    },
    language: { type: String, default: 'en' }
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
