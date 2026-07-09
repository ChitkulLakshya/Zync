const prisma = require('../lib/prisma');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const adminEmail = 'chitkullakshya@gmail.com';

async function setAdmin() {
    try {
        console.log('Connecting to DB...');


        const user = await prisma.user.findFirst({
            where: {
                email: { equals: adminEmail, mode: 'insensitive' }
            }
        });

        if (user) {
            const updatedUser = await prisma.user.update({
                where: { id: user.id },
                data: { role: 'admin' }
            });
            console.log(`✅ User ${updatedUser.email} is now an ADMIN.`);
            console.log(updatedUser);
        } else {
            console.log(`❌ User with email ${adminEmail} not found.`);
            const count = await prisma.user.count();
            console.log(`Total users in DB: ${count}`);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

setAdmin();
