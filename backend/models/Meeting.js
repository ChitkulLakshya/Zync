const mongoose = require('mongoose');

const MeetingSchema = new mongoose.Schema({
    title: { type: String, required: true, default: 'Untitled Meeting' },
    description: { type: String },
    startTime: { type: Date, required: true, default: Date.now },
    endTime: { type: Date }, // Optional: inferred or manual
    organizerId: { type: String, required: true }, // Firebase UID
    organizerName: { type: String }, // Store for quick access
    participants: [{
        uid: String,
        email: String,
        name: String,
        status: { type: String, enum: ['invited', 'accepted', 'declined', 'attended'], default: 'invited' }
    }],
    meetLink: { type: String, required: true },
    projectId: { type: String }, // Optional link to a project
    status: {
        type: String,
        enum: ['scheduled', 'live', 'ended', 'cancelled'],
        default: 'scheduled'
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Meeting', MeetingSchema);
