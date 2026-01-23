const { send_ZYNC_email } = require('./googleMeet');

const sendZyncEmail = async (to, subject, html, text) => {
    try {
        // Use the working implementation from googleMeet.js (which uses googleapis directly)
        // Note: googleMeet's version only takes (to, subject, htmlBody)
        const result = await send_ZYNC_email(to, subject, html, text);
        return result;
    } catch (error) {
        if (error.code === 'EAUTH' || (error.response && error.response.status === 401)) {
            console.error('Email Authentication Failed (Bad Credentials). Email was NOT sent.');
            return null; // Don't crash
        }
        console.error('Error sending email:', error);
        throw error;
    }
};

module.exports = { sendZyncEmail };
