require('dotenv').config();
const prisma = require('../lib/prisma');
const { appendRow } = require('../services/sheetLogger');

const run = async () => {
    try {
        console.log('Connecting to Database...');


        const users = await prisma.user.findMany({
            select: { displayName: true, firstName: true, lastName: true, email: true, createdAt: true }
        });
        console.log(`Found ${users.length} users`);

        if (users.length === 0) {
            console.log('No users found. Exiting.');
            return;
        }


        for (const user of users) {
            const name = user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'N/A';
            const email = user.email || 'N/A';
            const registrationDate = user.createdAt
                ? new Date(user.createdAt).toLocaleDateString('en-IN', {
                    year: 'numeric', month: 'short', day: 'numeric'
                })
                : 'N/A';

            console.log(`  Adding: ${name} | ${email} | ${registrationDate}`);
            await appendRow(name, email, registrationDate);
        }

        console.log(`\nDone! ${users.length} users exported to Google Sheets.`);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await prisma.$disconnect();
    }
};

run();
