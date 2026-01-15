const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        type: 'OAuth2',
        user: process.env.GMAIL_USER,
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN
    },
    // CRITICAL: Force IPv4 to prevent connection timeouts on Render/Docker environments
    family: 4,
    // Add timeouts to fail faster causing less hangs
    connectionTimeout: 10000,
    socketTimeout: 10000
});

const sendZyncEmail = async (to, subject, html, text) => {
    try {
        const info = await transporter.sendMail({
            from: `"Zync Platform" <${process.env.GMAIL_USER}>`,
            to: to,
            subject: subject,
            html: html,
            text: text, // Plain text fallback
            headers: {
                'List-Unsubscribe': `<mailto:${process.env.GMAIL_USER}>`
            }
        });
        console.log('Email sent successfully to:', to);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

module.exports = { sendZyncEmail };
