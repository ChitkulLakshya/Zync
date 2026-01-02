const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
  },
  displayName: {
    type: String,
  },
  firstName: String,
  lastName: String,
  username: String,
  country: String,
  countryCode: String,
  birthday: Date,
  phoneNumber: String,
  preferences: {
    theme: { type: String, default: 'system' },
    notifications: {
      email: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true }
    },
    language: { type: String, default: 'en' }
  },
  integrations: {
    github: {
      connected: { type: Boolean, default: false },
      username: String,
      accessToken: String
    },
    google: {
      connected: { type: Boolean, default: false }
    }
  },
  photoURL: {
    type: String,
  },
  status: {
    type: String,
    default: 'offline', // online, offline, away
  },
  lastSeen: {
    type: Date,
    default: Date.now,
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
