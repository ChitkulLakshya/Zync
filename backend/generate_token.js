require('dotenv').config();
const { google } = require('googleapis');
const readline = require('readline');

// Configuration
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'https://developers.google.com/oauthplayground';

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('Error: Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env');
    process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const SCOPES = [
    'https://www.googleapis.com/auth/meetings.space.created',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.compose'
];

const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Critical for refresh token
    scope: SCOPES,
    prompt: 'consent' // Force new refresh token
});

console.log('\nPlease authorize this app by visiting this url in your browser:\n');
console.log(authUrl);
console.log('\nAfter authorizing, you will be redirected to a page.');
console.log('Copy the "Authorization code" from that page or the URL and paste it below.\n');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

rl.question('Enter the code here: ', async (code) => {
    try {
        const { tokens } = await oauth2Client.getToken(code.trim());
        console.log('\n✅ Successfully retrieved tokens!');
        console.log('\nAdd this REFRESH_TOKEN to your .env file:\n');
        console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
        console.log('\n(Access Token is valid for 1 hour, Refresh Token lasts indefinitely)');
    } catch (error) {
        console.error('\n❌ Error retrieving access token:', error.message);
    }
    rl.close();
});
