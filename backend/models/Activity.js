/**
 * @fileoverview Activity.js
 * @module Activity
 *
 * ============================================================================
 * @author Chitkul Lakshya <consolemaster.app@gmail.com>
 * @copyright Copyright (c) 2026 Zync Meet. All rights reserved.
 * @license Proprietary and Confidential
 * ============================================================================
 */
const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    teamId: { type: String, required: true },
    actorId: { type: String, required: true },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  {
    timestamps: true,
    collection: 'activities',
  }
);

// Compound index for extremely fast querying of a team's activity timeline, sorted by newest first
activitySchema.index({ teamId: 1, createdAt: -1 });

// TTL Index to automatically delete logs older than 90 days (7,776,000 seconds)
activitySchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 });

module.exports = mongoose.model('Activity', activitySchema);
