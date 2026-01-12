const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // use SSL
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
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
            from: '"Lakshya from Zync" <lakshya2543@gmail.com>',
            to: to,
            subject: subject,
            html: html,
            text: text, // Plain text fallback
            headers: {
                'List-Unsubscribe': '<mailto:lakshya2543@gmail.com>'
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
