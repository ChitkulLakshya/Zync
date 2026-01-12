require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const adminEmail = 'chitkullakshya@gmail.com'; // Lowercase lookup usually safer

async function setAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const updateResult = await User.findOneAndUpdate(
            { email: { $regex: new RegExp(`^${adminEmail}$`, 'i') } }, // Case insensitive
            { $set: { role: 'admin' } },
            { new: true }
        );

        if (updateResult) {
            console.log(`✅ User ${updateResult.email} is now an ADMIN.`);
            console.log(updateResult);
        } else {
            console.log(`❌ User with email ${adminEmail} not found.`);
            // Check if user exists at all?
            const count = await User.countDocuments();
            console.log(`Total users in DB: ${count}`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
        process.exit();
    }
}

setAdmin();
