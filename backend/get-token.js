const { google } = require('googleapis');
require('dotenv').config();

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "http://localhost:5000" // Using your local redirect URI
);

const scopes = ['https://www.googleapis.com/auth/calendar.events'];

const url = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Essential for Refresh Token
    scope: scopes,
    prompt: 'consent' // Forces a new refresh token every time
});

console.log('\n================================================================');
console.log('1. CLICK THIS URL TO AUTHORIZE:');
console.log(url);
console.log('\n2. AFTER AUTHORIZING, YOU WILL BE REDIRECTED TO LOCALHOST (WHICH MAY FAILURE).');
console.log('3. COPY THE "code=" VALUE FROM THE URL BAR.');
console.log('4. PASTE THE CODE BELOW:');
console.log('================================================================\n');

const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

readline.question('Enter the code from the URL: ', async (code) => {
    try {
        const { tokens } = await oauth2Client.getToken(code);
        console.log('\nSUCCESS! HERE IS YOUR NEW REFRESH TOKEN:\n');
        console.log(tokens.refresh_token);
        console.log('\n(Copy this token into your .env file as GOOGLE_REFRESH_TOKEN)');
    } catch (error) {
        console.error('\nError exchanging code for token:', error.response ? error.response.data : error.message);
    }
    readline.close();
});
