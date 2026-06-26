/**
 * EDUCATIONAL COMMENT: What and Why
 * What: Manages Google APIs integration to programmatically create Google Meet spaces and send emails via Gmail.
 * Why: By using an authenticated OAuth2 client to interface with Google Services, we can automate real-time communication features like instant meetings and notification emails seamlessly within our app's flows.
 */
// WHAT: Import Google API. WHY: Access Google services.
const { google } = require('googleapis');

// WHAT: Instantiate OAuth2 client. WHY: Authenticate requests.
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000"
);


// WHAT: Check refresh token. WHY: Needed for long-lived server auth.
if (process.env.GOOGLE_REFRESH_TOKEN) {
    oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN.trim() });
}

// WHAT: Create Meet space. WHY: Generates on-demand meeting links.
const create_meeting = async () => {
    try {
        console.log('Creating Google Meet space with Client ID:', process.env.GOOGLE_CLIENT_ID?.substring(0, 10) + '...');


        // WHAT: Verify refresh token. WHY: Will fail without it.
        if (!process.env.GOOGLE_REFRESH_TOKEN) {
            throw new Error('GOOGLE_REFRESH_TOKEN is missing');
        }

        // WHAT: Init Meet client. WHY: Prepare service requests.
        const meet = google.meet({ version: 'v2', auth: oauth2Client });


        // WHAT: Request space creation. WHY: Creates a meeting room.
        const response = await meet.spaces.create({
            requestBody: {
                config: {
                    accessType: 'OPEN',
                    entryPointAccess: 'ALL'
                }
            }
        });

        // WHAT: Extract space data. WHY: Contains meeting details.
        const space = response.data;
        if (space.meetingUri) {
            console.log('Generated Meet Space:', space.meetingUri);
            return space.meetingUri;
        } else {
            console.error('No meetingUri in response data:', space);
            throw new Error('Failed to generate Google Meet link.');
        }

    } catch (error) {

        console.error('Error in create_meeting:', error.message);
        if (error.response) {
            console.error('API Response:', error.response.data);
        }
        throw error;
    }
};

// WHAT: Send email via Gmail. WHY: Automates notifications.
const send_ZYNC_email = async (to, subject, bodyHtml, bodyText = null) => {
    try {
        console.log(`Sending email to ${to}...`);

        if (!process.env.GOOGLE_REFRESH_TOKEN) {
            throw new Error('GOOGLE_REFRESH_TOKEN is missing');
        }

        // WHAT: Init Gmail client. WHY: Interface to send messages.
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // WHAT: Encode subject. WHY: Ensures correct rendering in clients.
        const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
        const boundary = `boundary_${Date.now().toString(36)}`;

        // WHAT: Store message parts. WHY: Construct raw email array.
        let messageParts;

        // WHAT: Check if plain text provided. WHY: Needs multipart email if so.
        if (bodyText) {

            const boundary = `boundary_${Date.now().toString(36)}`;
            const textBase64 = Buffer.from(bodyText).toString('base64');
            const htmlBase64 = Buffer.from(bodyHtml).toString('base64');

            messageParts = [
                `To: ${to}`,
                `Subject: ${utf8Subject}`,
                'MIME-Version: 1.0',
                `Content-Type: multipart/alternative; boundary="${boundary}"`,
                '',
                `--${boundary}`,
                'Content-Type: text/plain; charset=utf-8',
                'Content-Transfer-Encoding: base64',
                '',
                textBase64,
                '',
                `--${boundary}`,
                'Content-Type: text/html; charset=utf-8',
                'Content-Transfer-Encoding: base64',
                '',
                htmlBase64,
                '',
                `--${boundary}--`
            ];
        } else {

            const htmlBase64 = Buffer.from(bodyHtml).toString('base64');
            messageParts = [
                `To: ${to}`,
                'Content-Type: text/html; charset=utf-8',
                'MIME-Version: 1.0',
                'Content-Transfer-Encoding: base64',
                `Subject: ${utf8Subject}`,
                '',
                htmlBase64
            ];
        }

        // WHAT: Join parts. WHY: Creates raw email string.
        const message = messageParts.join('\n');


        // WHAT: Base64 encode message. WHY: Gmail API expects base64url.
        const encodedMessage = Buffer.from(message)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        // WHAT: Send message via API. WHY: Dispatches email.
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

// WHAT: Export functions. WHY: Available to other parts of app.
module.exports = {
    create_meeting,
    send_ZYNC_email,
    createInstantMeet: create_meeting
};
