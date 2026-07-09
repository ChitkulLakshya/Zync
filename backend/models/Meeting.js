const mongoose = require('mongoose');

const meetingSchema = new mongoose.Schema(
  {
    title:       { type: String, default: 'Untitled Meeting' },
    description: { type: String, default: null },

    organizerId:   { type: String, required: true },
    organizerName: { type: String, default: null },

    meetLink:  { type: String, required: true },
    projectId: { type: String, default: null },

    status: { type: String, default: 'scheduled' },

    startTime: { type: Date, default: Date.now },
    endTime:   { type: Date, default: null },

    // Participants JSON array
    participants: { type: mongoose.Schema.Types.Mixed, default: [] },
  },
  {
    timestamps: true,
    collection: 'meetings',
  }
);

module.exports = mongoose.model('Meeting', meetingSchema);
