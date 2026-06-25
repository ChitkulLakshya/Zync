const mongoose = require('mongoose');

const stepSchema = new mongoose.Schema(
  {
    title:       { type: String, required: true },
    description: { type: String, default: null },
    order:       { type: Number, default: 0 },
    status:      { type: String, default: 'Pending' },
    assignedTo:  { type: String, default: null },
    type:        { type: String, default: 'Other' },
    page:        { type: String, default: 'General' },

    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  },
  {
    timestamps: true,
    collection: 'steps',
  }
);

stepSchema.index({ projectId: 1, order: 1 });

module.exports = mongoose.model('Step', stepSchema);
