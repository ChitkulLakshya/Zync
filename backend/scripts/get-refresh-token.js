const { google } = require('googleapis');
const readline = require('readline');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SCOPES = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/gmail.send'
];

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000"
);

function getAccessToken(oAuth2Client) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent' // Forces consent prompt to ensure refresh_token is returned
    });

    console.log('\nAuthorize this app by visiting this url:\n');
    console.log(authUrl);
    console.log('\n');

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    rl.question('Enter the code from that page here: ', (code) => {
        rl.close();
        oAuth2Client.getToken(code, (err, token) => {
            if (err) return console.error('Error retrieving access token', err);

            console.log('\nSuccessfully verified! Here is your new Refresh Token:\n');
            console.log('GOOGLE_REFRESH_TOKEN=' + token.refresh_token);
            console.log('\nCopy this value and update your local .env file and Render/Vercel variables.');
        });
    });
}

// Check for missing env vars
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error('Error: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing in backend/.env');
    process.exit(1);
}

getAccessToken(oauth2Client);
