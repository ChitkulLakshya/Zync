/**
 * Migration: Backfill ownerUid on existing Project documents.
 *
 * Every Project has ownerId (ObjectId ref to User) but lacks ownerUid (Firebase UID string).
 * This script looks up each project's owner and sets ownerUid = owner.uid.
 *
 * Usage: node scripts/backfill_ownerUid.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const Project = require('../models/Project');
const User = require('../models/User');

async function backfill() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not set in environment');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const projects = await Project.find({ ownerUid: { $exists: false } }).lean();
  console.log(`Found ${projects.length} projects without ownerUid`);

  if (projects.length === 0) {
    console.log('Nothing to migrate');
    await mongoose.disconnect();
    return;
  }

  // Build a map of ownerId -> uid
  const ownerIds = [...new Set(projects.map(p => p.ownerId.toString()))];
  const owners = await User.find({ _id: { $in: ownerIds } }).select('_id uid').lean();
  const ownerMap = new Map(owners.map(o => [o._id.toString(), o.uid]));

  let updated = 0;
  let skipped = 0;

  for (const project of projects) {
    const uid = ownerMap.get(project.ownerId.toString());
    if (!uid) {
      console.warn(`Skipping project ${project._id}: no User found for ownerId ${project.ownerId}`);
      skipped++;
      continue;
    }
    await Project.updateOne({ _id: project._id }, { $set: { ownerUid: uid } });
    updated++;
  }

  console.log(`Done: ${updated} updated, ${skipped} skipped`);
  await mongoose.disconnect();
}

backfill().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
