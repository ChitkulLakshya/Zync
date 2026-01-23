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
        console.log('Creating Google Meet space with Client ID:', process.env.GOOGLE_CLIENT_ID?.substring(0, 10) + '...');

        // Ensure credentials are set (googleapis handles refresh automatically)
        if (!process.env.GOOGLE_REFRESH_TOKEN) {
            throw new Error('GOOGLE_REFRESH_TOKEN is missing');
        }

        const meet = google.meet({ version: 'v2', auth: oauth2Client });

        // Use spaces.create with OPEN access config
        const response = await meet.spaces.create({
            requestBody: {
                config: {
                    accessType: 'OPEN',
                    entryPointAccess: 'ALL'
                }
            }
        });

        const space = response.data;
        if (space.meetingUri) {
            console.log('Generated Meet Space:', space.meetingUri);
            return space.meetingUri;
        } else {
            console.error('No meetingUri in response data:', space);
            throw new Error('Failed to generate Google Meet link.');
        }

    } catch (error) {
        // Fallback or detailed logging
        console.error('Error in create_meeting:', error.message);
        if (error.response) {
            console.error('API Response:', error.response.data);
        }
        throw error;
    }
};

const send_ZYNC_email = async (to, subject, bodyHtml, bodyText = null) => {
    try {
        console.log(`Sending email to ${to}...`);

        if (!process.env.GOOGLE_REFRESH_TOKEN) {
            throw new Error('GOOGLE_REFRESH_TOKEN is missing');
        }

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
        const boundary = `boundary_${Date.now().toString(36)}`;

        let messageParts;

        if (bodyText) {
            // Multipart email with both plain text and HTML
            messageParts = [
                `To: ${to}`,
                `Subject: ${utf8Subject}`,
                'MIME-Version: 1.0',
                `Content-Type: multipart/alternative; boundary="${boundary}"`,
                '',
                `--${boundary}`,
                'Content-Type: text/plain; charset=utf-8',
                'Content-Transfer-Encoding: quoted-printable',
                '',
                bodyText,
                '',
                `--${boundary}`,
                'Content-Type: text/html; charset=utf-8',
                'Content-Transfer-Encoding: quoted-printable',
                '',
                bodyHtml,
                '',
                `--${boundary}--`
            ];
        } else {
            // HTML only (legacy behavior)
            messageParts = [
                `To: ${to}`,
                'Content-Type: text/html; charset=utf-8',
                'MIME-Version: 1.0',
                `Subject: ${utf8Subject}`,
                '',
                bodyHtml
            ];
        }

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
    send_ZYNC_email,
    createInstantMeet: create_meeting // Alias for backward compatibility
};
