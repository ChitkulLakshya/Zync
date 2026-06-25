const prisma = require('../lib/prisma');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const fixSteps = async () => {
    try {

        const project = await prisma.project.findFirst({
            where: {
                name: { equals: 'ToolDeck', mode: 'insensitive' }
            },
            include: { steps: true }
        });

        if (!project) {
            console.log('Project "ToolDeck" not found. Listing all projects:');
            const all = await prisma.project.findMany({ select: { name: true } });
            all.forEach(p => console.log(`- ${p.name}`));
            return;
        }

        console.log(`Found Project: ${project.name} (${project.id})`);
        console.log(`Current Steps: ${project.steps.length}`);

        const newSteps = [
            { title: 'Frontend', type: 'Frontend', description: 'Frontend tasks' },
            { title: 'Backend', type: 'Backend', description: 'Backend tasks' },
            { title: 'Console', type: 'Other', description: 'Console/CLI tasks' },
            { title: 'Server', type: 'Backend', description: 'Server configuration' }
        ];

        let addedCount = 0;
        for (const s of newSteps) {

            const exists = project.steps.some(existing => existing.title.toLowerCase() === s.title.toLowerCase());
            if (!exists) {
                await prisma.step.create({
                    data: {
                        title: s.title,
                        description: s.description,
                        type: s.type,
                        status: 'Pending',
                        projectId: project.id
                    }
                });
                addedCount++;
                console.log(`Added step: ${s.title}`);
            } else {
                console.log(`Step already exists: ${s.title}`);
            }
        }

        if (addedCount > 0) {
            console.log(`Project updated with ${addedCount} new steps.`);
        } else {
            console.log('No new steps needing addition.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
};

fixSteps();
