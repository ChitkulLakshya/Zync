const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
const { google } = require('googleapis');
const readline = require('readline');

// Check for required env vars
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error("❌ Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in backend/.env");
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'https://zync-meet.vercel.app' 
);

const SCOPES = [
  'https://mail.google.com/', 
  'https://www.googleapis.com/auth/calendar' // Required for Zync's Google Meet integrations
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent', // Forces Google to issue a new refresh token
  scope: SCOPES,
});

console.log('================================================================');
console.log('🔐 Zync OAuth2 Token Generator');
console.log('================================================================\n');
console.log('1. Open this URL in your browser:');
console.log('\n', authUrl, '\n');
console.log('2. Log in with consolemaster.app@gmail.com and click "Allow".');
console.log('3. You will be redirected to the Zync production app (https://zync-meet.vercel.app/?code=...).');
console.log('4. Look at the URL bar in your browser. Copy the long code that appears after "code=".\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Paste the authorization code here: ', (code) => {
  rl.close();
  
  // Clean up the code if the user accidentally pasted the whole URL or extra characters
  let cleanCode = code.trim();
  if (cleanCode.includes('code=')) {
    cleanCode = new URL(cleanCode).searchParams.get('code') || cleanCode;
  }

  oauth2Client.getToken(cleanCode, (err, token) => {
    if (err) {
      console.error('❌ Error retrieving access token:', err.response?.data || err.message);
      return;
    }
    
    if (!token.refresh_token) {
      console.warn('⚠️ Google did not return a refresh token. This usually means you already granted access and did not see the Consent screen. Please revoke access in your Google Account security settings and run this script again.');
      return;
    }

    console.log('\n✅ Successfully fetched new tokens!\n');
    console.log('================================================================');
    console.log('YOUR NEW REFRESH TOKEN:');
    console.log(token.refresh_token);
    console.log('================================================================\n');
    console.log('Please copy this token and update the GOOGLE_REFRESH_TOKEN= value in your backend/.env file.');
  });
});
