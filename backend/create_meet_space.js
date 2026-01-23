require('dotenv').config();
const { google } = require('googleapis');

// Configuration
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const TARGET_EMAIL = process.env.TARGET_EMAIL || 'your-email@example.com'; // Replace or set in .env

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    console.error('Error: Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REFRESH_TOKEN in .env');
    process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    'https://developers.google.com/oauthplayground' // Redirect URI
);

oauth2Client.setCredentials({
    refresh_token: REFRESH_TOKEN
});

// Initialize APIs
const meet = google.meet({ version: 'v2', auth: oauth2Client });
const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

async function createMeetingSpace() {
    try {
        console.log('Creating Google Meet space...');

        // CRITICAL: process.env.accessType to 'OPEN' and config.entryPointAccess to 'ALL'
        const response = await meet.spaces.create({
            requestBody: {
                config: {
                    accessType: 'OPEN',
                    entryPointAccess: 'ALL'
                }
            }
        });

        const space = response.data;
        console.log('Meeting Space Created Successfully!');
        console.log(`Space Name: ${space.name}`);
        console.log(`Meeting URI: ${space.meetingUri}`);

        return space.meetingUri;

    } catch (error) {
        console.error('Error creating meeting space:', error.message);
        if (error.response) {
            console.error('API Response:', error.response.data);
        }
        throw error;
    }
}

async function sendEmail(meetingLink) {
    try {
        console.log(`Sending meeting invite to ${TARGET_EMAIL}...`);

        const subject = 'Your Google Meet Invitation (Open Access)';
        const body = `Here is your meeting link: ${meetingLink}\n\nThis meeting is set to OPEN access, so you shouldn't need to ask to join.`;

        const messageParts = [
            `To: ${TARGET_EMAIL}`,
            'Content-Type: text/plain; charset=utf-8',
            'MIME-Version: 1.0',
            `Subject: ${subject}`,
            '',
            body
        ];

        const message = messageParts.join('\n');

        // Encode the message in base64url format
        const encodedMessage = Buffer.from(message)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        const res = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedMessage
            }
        });

        console.log(`Email sent! Message ID: ${res.data.id}`);

    } catch (error) {
        console.error('Error sending email:', error.message);
        throw error;
    }
}

async function main() {
    try {
        const meetingLink = await createMeetingSpace();
        if (meetingLink) {
            await sendEmail(meetingLink);
        }
    } catch (error) {
        console.error('Script failed.');
    }
}

main();
