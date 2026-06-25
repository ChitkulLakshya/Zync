const mongoose = require('mongoose');

const projectTaskSchema = new mongoose.Schema(
  {
    displayId: { type: String, default: null },
    title: { type: String, required: true },
    description: { type: String, default: null },
    status: { type: String, default: 'Backlog' },

    assignedTo: { type: String, default: null },
    assignedUserIds: { type: [String], default: [] },
    assignedToName: { type: String, default: null },
    createdBy: { type: String, default: null },
    assignedBy: { type: String, default: null },


    commitCode: { type: String, default: null },
    commitMessage: { type: String, default: null },
    commitUrl: { type: String, default: null },
    commitAuthor: { type: String, default: null },
    commitTimestamp: { type: Date, default: null },


    repoIds: { type: [String], default: [] },

    stepId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Step',
      required: true,
    },
  },
  {
    timestamps: true,
    collection: 'projecttasks',
  }
);

projectTaskSchema.index({ stepId: 1 });
projectTaskSchema.index({ title: 'text' });
projectTaskSchema.index({ assignedTo: 1 });
projectTaskSchema.index({ assignedUserIds: 1 });
projectTaskSchema.index({ status: 1 });
projectTaskSchema.index({ displayId: 1 }, { unique: true, sparse: true });
projectTaskSchema.index({ commitCode: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('ProjectTask', projectTaskSchema);
