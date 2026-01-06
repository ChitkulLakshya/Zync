const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  startTime: {
    type: Date,
    default: Date.now,
    required: true
  },
  endTime: {
    type: Date,
    default: Date.now
  },
  duration: {
    type: Number, // in seconds
    default: 0
  },
  activeDuration: {
    type: Number, // in seconds (active time)
    default: 0
  },
  lastAction: {
    type: Date,
    default: Date.now
  },
  date: {
    type: String, // YYYY-MM-DD for easy grouping
    required: true
  },
  deviceInfo: {
      type: String
  }
});

// Calculate duration before saving
sessionSchema.pre('save', async function() {
  if (this.endTime && this.startTime) {
    this.duration = Math.round((this.endTime - this.startTime) / 1000);
  }
});

module.exports = mongoose.model('Session', sessionSchema);
