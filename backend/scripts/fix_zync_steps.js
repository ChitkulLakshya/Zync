const mongoose = require('mongoose');
const Project = require('../models/Project');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const fixSteps = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, { dbName: 'zync-production' });
        console.log('Connected to MongoDB');

        // Find Project ToolDeck (case insensitive)
        const project = await Project.findOne({ name: { $regex: new RegExp('^ToolDeck$', 'i') } });

        if (!project) {
            console.log('Project "ToolDeck" not found. Listing all projects:');
            const all = await Project.find({}, 'name');
            all.forEach(p => console.log(`- ${p.name}`));
            process.exit(1);
        }

        console.log(`Found Project: ${project.name} (${project._id})`);
        console.log(`Current Steps: ${project.steps.length}`);

        const newSteps = [
            { title: 'Frontend', type: 'Frontend', description: 'Frontend tasks' },
            { title: 'Backend', type: 'Backend', description: 'Backend tasks' },
            { title: 'Console', type: 'Other', description: 'Console/CLI tasks' },
            { title: 'Server', type: 'Backend', description: 'Server configuration' }
        ];

        let addedCount = 0;
        for (const s of newSteps) {
            // Check if exists
            const exists = project.steps.some(existing => existing.title.toLowerCase() === s.title.toLowerCase());
            if (!exists) {
                project.steps.push({
                    id: new mongoose.Types.ObjectId().toString(),
                    title: s.title,
                    description: s.description,
                    type: s.type,
                    status: 'Pending',
                    tasks: []
                });
                addedCount++;
                console.log(`Added step: ${s.title}`);
            } else {
                console.log(`Step already exists: ${s.title}`);
            }
        }

        if (addedCount > 0) {
            await project.save();
            console.log('Project saved with new steps.');
        } else {
            console.log('No new steps needing addition.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
};

fixSteps();
