require('dotenv').config();
const { google } = require('googleapis');

// Configuration
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

// The space created in the previous step (or replace with any valid space name)
// Format: spaces/SPACE_ID
const SPACE_NAME = 'spaces/TwFr2qongmUB';

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    console.error('Error: Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REFRESH_TOKEN in .env');
    process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET);
oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

const meet = google.meet({ version: 'v2', auth: oauth2Client });

async function checkMeetingStatus() {
    try {
        console.log(`Checking conference records for space: ${SPACE_NAME}...`);

        // List conference records filtered by the space
        const response = await meet.conferenceRecords.list({
            filter: `space.name="${SPACE_NAME}"`
        });

        const conferences = response.data.conferenceRecords;

        if (!conferences || conferences.length === 0) {
            console.log('No conference records found for this space yet (meeting might not have started or finished).');
            return;
        }

        console.log(`Found ${conferences.length} conference records.`);

        conferences.forEach((conf, index) => {
            console.log(`\n--- Conference ${index + 1} ---`);
            console.log(`ID: ${conf.name}`);
            console.log(`Start Time: ${conf.startTime}`);
            console.log(`End Time: ${conf.endTime || 'Still Active'}`);

            if (conf.endTime) {
                console.log('Status: ENDED');
            } else {
                console.log('Status: ACTIVE');
            }
        });

    } catch (error) {
        console.error('Error checking meeting status:', error.message);
        if (error.response) {
            console.error('API Response:', error.response.data);
        }
    }
}

checkMeetingStatus();
