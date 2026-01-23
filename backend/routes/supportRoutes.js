const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

/**
 * @route   POST /api/support
 * @desc    Receive support form submissions
 * @access  Public
 */
router.post('/', async (req, res) => {
    try {
        const { firstName, lastName, email, phone, message } = req.body;

        // Basic Validation
        if (!firstName || !email || !message) {
            return res.status(400).json({ message: 'Please provide full name, email, and a message.' });
        }

        // Nodemailer Transporter with OAuth2
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type: 'OAuth2',
                user: process.env.EMAIL_USER,
                clientId: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                refreshToken: process.env.GOOGLE_REFRESH_TOKEN
            }
        });

        // Email Options
        const mailOptions = {
            from: `"ZYNC Support" <${process.env.EMAIL_USER}>`,
            to: process.env.SUPPORT_RECIPIENTS ? process.env.SUPPORT_RECIPIENTS.split(',') : [],
            replyTo: email,
            subject: `New Support Message from ${firstName} ${lastName}`,
            html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${firstName} ${lastName}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
        <hr/>
        <h3>Message:</h3>
        <p>${message}</p>
      `
        };

        // Send Email
        await transporter.sendMail(mailOptions);

        console.log(`✅ Support email sent from ${email}`);
        res.status(200).json({ success: true, message: 'Message sent successfully!' });

    } catch (error) {
        console.error('Support Route Error:', error);
        res.status(500).json({
            message: `Failed to send message: ${error.message}`,
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
});

module.exports = router;
