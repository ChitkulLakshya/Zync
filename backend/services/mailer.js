const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
    }
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
