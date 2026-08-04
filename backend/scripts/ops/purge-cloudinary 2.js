require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const User = require('../../models/User');
const Team = require('../../models/Team');
const { getApps, initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

// Ensure firebase admin is initialized for fetching user profiles if needed
if (!getApps().length) {
  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    initializeApp({
      credential: cert(serviceAccount)
    });
  } catch (err) {
    console.error('Failed to initialize firebase admin:', err);
  }
}

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    // 1. Purge Cloudinary from Users
    const users = await User.find({ photoURL: { $regex: 'cloudinary' } });
    console.log(`Found ${users.length} users with Cloudinary photos.`);
    
    for (const user of users) {
      let providerPhoto = null;
      
      // Try to fetch from Firebase
      if (getApps().length) {
        try {
          const fbUser = await getAuth().getUser(user.uid);
          providerPhoto = fbUser.photoURL;
        } catch (e) {
          console.error(`Failed to fetch fb user ${user.uid}:`, e.message);
        }
      }

      await User.updateOne(
        { _id: user._id },
        { $set: { photoURL: providerPhoto || null } }
      );
      console.log(`Updated user ${user.uid}, photoURL reset to: ${providerPhoto}`);
    }

    // 2. Purge Cloudinary from Teams (if they have team logos)
    // Team logo might be stored as logoId or photoURL. Let's check Team model.
    // If it exists, it's usually `logoId` or something similar, but let's check `photoURL` just in case.
    const teams = await Team.find({ logoId: { $regex: 'cloudinary' } });
    console.log(`Found ${teams.length} teams with Cloudinary logos.`);
    for (const team of teams) {
      await Team.updateOne({ _id: team._id }, { $set: { logoId: null } });
    }

    console.log('Purge complete.');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

run();
