const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
    name: { type: String, required: true },
    inviteCode: { type: String, required: true, unique: true },
    ownerId: { type: String, required: true }, // User UID
    members: [{ type: String }], // Array of User UIDs
    type: {
        type: String,
        enum: ['Product', 'Engineering', 'Management', 'Marketing', 'Sales', 'Design', 'Other'],
        default: 'Other'
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Team', teamSchema);
