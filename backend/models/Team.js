const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema(
  {
    name:       { type: String, required: true },
    inviteCode: { type: String, required: true, unique: true },
    ownerId:    { type: String, required: true },
    members:    { type: [String], default: [] },
    type:       { type: String, default: 'Other' },
  },
  {
    timestamps: true,
    collection: 'teams',
  }
);

teamSchema.index({ inviteCode: 1 }, { unique: true });
teamSchema.index({ members: 1 });
teamSchema.index({ ownerId: 1 });

module.exports = mongoose.model('Team', teamSchema);
