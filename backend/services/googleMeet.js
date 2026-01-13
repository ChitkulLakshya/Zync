const { google } = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000"
);

// Set credentials globally for the client
if (process.env.GOOGLE_REFRESH_TOKEN) {
    oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
}

const create_meeting = async () => {
    try {
        console.log('Creating meeting with Client ID:', process.env.GOOGLE_CLIENT_ID?.substring(0, 10) + '...');

        // Ensure credentials are set (googleapis handles refresh automatically)
        if (!process.env.GOOGLE_REFRESH_TOKEN) {
            throw new Error('GOOGLE_REFRESH_TOKEN is missing');
        }

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

        const event = {
            summary: 'Zync Instant Meeting',
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

        if (response.data.hangoutLink) {
            console.log('Generated Hangout Link:', response.data.hangoutLink);
            return response.data.hangoutLink;
        } else {
            console.error('No hangoutLink in response data:', response.data);
            throw new Error('Failed to generate Google Meet link.');
        }
    } catch (error) {
        console.error('Error in create_meeting:', error);
        throw error;
    }
};

const send_zync_email = async (to, subject, bodyHtml) => {
    try {
        console.log(`Sending email to ${to}...`);

        if (!process.env.GOOGLE_REFRESH_TOKEN) {
            throw new Error('GOOGLE_REFRESH_TOKEN is missing');
        }

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
        const messageParts = [
            `To: ${to}`,
            'Content-Type: text/html; charset=utf-8',
            'MIME-Version: 1.0',
            `Subject: ${utf8Subject}`,
            '',
            bodyHtml
        ];
        const message = messageParts.join('\n');

        // Base64url encoding
        const encodedMessage = Buffer.from(message)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        const res = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedMessage,
            },
        });

        console.log('Email sent successfully:', res.data.id);
        return res.data;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

module.exports = {
    create_meeting,
    send_zync_email,
    createInstantMeet: create_meeting // Alias for backward compatibility
};
