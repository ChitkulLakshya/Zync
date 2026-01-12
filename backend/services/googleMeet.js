const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000" // Fallback or env var
);

const createInstantMeet = async () => {
    try {
        console.log('Using Client ID:', process.env.GOOGLE_CLIENT_ID);
        console.log('Using Redirect URI:', process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000");
        console.log('Using Refresh Token:', process.env.GOOGLE_REFRESH_TOKEN ? "Present" : "Missing");

        // Set credentials using the stored Refresh Token
        oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        console.log('Requesting new Google Calendar event...');

        const event = {
            summary: 'Zync Instant Meeting', // Creating a generic event
            description: 'Instant meeting created from Zync workspace.',
            start: {
                dateTime: new Date().toISOString(),
                timeZone: 'UTC',
            },
            end: {
                dateTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour later
                timeZone: 'UTC',
            },
            conferenceData: {
                createRequest: {
                    requestId: Math.random().toString(36).substring(7),
                    conferenceSolutionKey: {
                        type: 'hangoutsMeet',
                    },
                },
            },
        };

        const response = await calendar.events.insert({
            calendarId: 'primary',
            resource: event,
            conferenceDataVersion: 1,
        });

        console.log('Google API Response Status:', response.status);

        if (response.data.hangoutLink) {
            console.log('Generated Hangout Link:', response.data.hangoutLink);
            return response.data.hangoutLink;
        } else {
            console.error('No hangoutLink in response data:', response.data);
            throw new Error('Failed to generate Google Meet link.');
        }
    } catch (error) {
        console.error('Error in createInstantMeet:', error);
        if (error.response) {
            console.error('Google API Error Details:', JSON.stringify(error.response.data, null, 2));
        }
        throw error;
    }
};

module.exports = { createInstantMeet };
