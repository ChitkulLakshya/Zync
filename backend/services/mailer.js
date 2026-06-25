const { send_ZYNC_email } = require('./googleMeet');

const sendZyncEmail = async (to, subject, html, text) => {
    try {


        const result = await send_ZYNC_email(to, subject, html, text);
        return result;
    } catch (error) {
        if (error.code === 'EAUTH' || (error.response && error.response.status === 401)) {
            console.error('Email Authentication Failed (Bad Credentials). Email was NOT sent.');
            return null;
        }
        console.error('Error sending email:', error);
        throw error;
    }
};

module.exports = { sendZyncEmail };
