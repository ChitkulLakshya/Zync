const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },

    startTime: { type: Date, default: Date.now },
    endTime: { type: Date, default: Date.now },
    duration: { type: Number, default: 0 },
    activeDuration: { type: Number, default: 0 },
    lastAction: { type: Date, default: Date.now },

    date: { type: String, required: true },
    deviceInfo: { type: String, default: null },


    eventType: { type: String, default: 'session' },
    title: { type: String, default: null },
    source: { type: String, default: null },
    actorName: { type: String, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: false },
    collection: 'sessions',
  }
);

sessionSchema.index({ userId: 1 });
sessionSchema.index({ userId: 1, date: 1 });

module.exports = mongoose.model('Session', sessionSchema);
