const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { sendZyncEmail } = require('../services/mailer');
const { getNewUserRegistrationTemplate } = require('../utils/emailTemplates');

const testEmail = async () => {
    console.log('Checking environment variables:');
    console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'Present' : 'MISSING');
    console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'Present' : 'MISSING');
    console.log('GOOGLE_REFRESH_TOKEN:', process.env.GOOGLE_REFRESH_TOKEN ? 'Present' : 'MISSING');

    const targetEmail = process.argv[2] || 'consolemaster.app@gmail.com';
    console.log(`Sending demo email to ${targetEmail}...`);

    try {
        const result = await sendZyncEmail(
            targetEmail,
            '🧪 Demo: New User Joined ZYNC! (Test)',
            getNewUserRegistrationTemplate({
                name: 'Demo User',
                email: 'demo@example.com',
                uid: 'demo-uid-123'
            }),
            `Demo User Alert! Name: Demo User, Email: demo@example.com`
        );
        console.log('Email sent successfully:', result);
    } catch (error) {
        console.error('Failed to send demo email:', error);
        if (error.response) console.error('API Response:', error.response.data);
    }
};

testEmail();
