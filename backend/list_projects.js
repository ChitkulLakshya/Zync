
const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/zync-production";

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log("Connected to MongoDB");
        const Schema = mongoose.Schema;
        const ProjectSchema = new Schema({}, { strict: false });
        const Project = mongoose.model('Project', ProjectSchema);

        const projects = await Project.find({}, '_id name');
        console.log("Projects in DB:");
        projects.forEach(p => console.log(`${p._id}: ${p.name}`));

        // Check for the specific ID
        const specificId = "697088605273ff4a891c4870";
        try {
            const found = await Project.findById(specificId);
            console.log(`\ncheck for ${specificId}: ${found ? 'FOUND' : 'NOT FOUND'}`);
        } catch (e) {
            console.log(`\ncheck for ${specificId}: INVALID FORMAT or ERROR ${e.message}`);
        }

        mongoose.disconnect();
    })
    .catch(err => {
        console.error("Connection Error:", err);
    });
