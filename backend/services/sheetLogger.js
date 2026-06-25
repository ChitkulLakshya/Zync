require('dotenv').config();
const { google } = require('googleapis');


const SPREADSHEET_ID = '1dSLg9N40XzLgPxogA-sHyFXhN3GL5MVWcoxxnvVug7E';


const getAuth = () => {
    const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY;

    if (!clientEmail || !privateKey) {
        throw new Error(
            'Missing GOOGLE_SHEETS_CLIENT_EMAIL or GOOGLE_SHEETS_PRIVATE_KEY in .env'
        );
    }

    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: clientEmail,
            private_key: privateKey.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    return auth;
};


const appendRow = async (name, email, date = new Date().toISOString()) => {
    try {
        const auth = getAuth();
        const sheets = google.sheets({ version: 'v4', auth });

        const request = {
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A:C',
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            resource: {
                values: [[name, email, date]],
            },
        };

        const response = await sheets.spreadsheets.values.append(request);
        console.log('Row appended successfully:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error appending row to Google Sheet:', error);
        throw error;
    }
};


if (require.main === module) {
    const args = process.argv.slice(2);
    const name = args[0] || 'Test User';
    const email = args[1] || 'test@example.com';

    appendRow(name, email)
        .then(() => console.log('Done.'))
        .catch(err => console.error('Failed:', err));
}

module.exports = { appendRow };
