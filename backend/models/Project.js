const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true },
    description: { type: String, default: '' },

    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ownerUid: { type: String, required: true }, // Denormalized Firebase UID for auth checks

    team: { type: [String], default: [] }, // Firebase UIDs

    // GitHub link
    githubRepo:      { type: String, default: null },
    githubRepoName:  { type: String, default: null },
    githubRepoOwner: { type: String, default: null },
    githubRepoIds:   { type: [String], default: [] },

    // AI-generated architecture
    architecture: { type: mongoose.Schema.Types.Mixed, default: null },
    architectureCacheKey: { type: String, default: null },
    architectureAnalyzedAt: { type: Date, default: null },

    // Google Meet
    meetLink: { type: String, default: null },

    // Tracking
    isTrackingActive: { type: Boolean, default: false },

    // Webhook aggregation snapshot (used to reduce per-commit fanout/write load)
    lastWebhookEventAt: { type: Date, default: null },
    lastWebhookCommitCount: { type: Number, default: 0 },
    lastWebhookCommitShas: { type: [String], default: [] },
    lastWebhookChangedFiles: { type: [String], default: [] },
    lastWebhookPusher: { type: String, default: null },
    lastWebhookDeliveryId: { type: String, default: null },
    lastWebhookAiSummary: { type: String, default: null },
    lastWebhookAiTaskMentions: { type: Number, default: 0 },
    lastWebhookAiAnalyzedCommits: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    collection: 'projects',
  }
);

projectSchema.index({ ownerId: 1 });
projectSchema.index({ ownerUid: 1 });
projectSchema.index({ team: 1 });

module.exports = mongoose.model('Project', projectSchema);
