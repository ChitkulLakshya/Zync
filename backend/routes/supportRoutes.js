const express = require('express');
const router = express.Router();
const { send_ZYNC_email } = require('../services/googleMeet');
const { getSupportNotificationTemplate } = require('../utils/emailTemplates');

/**
 * @route   POST /api/support
 * @desc    Receive support form submissions and notify developers
 * @access  Public
 */
router.post('/', async (req, res) => {
    try {
        const { firstName, lastName, email, phone, message } = req.body;

        // Basic Validation
        if (!firstName || !email || !message) {
            return res.status(400).json({ message: 'Please provide at least first name, email, and a message.' });
        }

        // Get recipients from ENV
        const recipientsString = process.env.SUPPORT_RECIPIENTS || 'chitukullakshya@gmail.com';
        const recipients = recipientsString.split(',').map(email => email.trim()).filter(Boolean);

        if (recipients.length === 0) {
            console.error('No support recipients configured in environment variables');
            return res.status(500).json({ message: 'Server configuration error' });
        }

        // Generate the professional HTML content
        const htmlContent = getSupportNotificationTemplate({
            firstName,
            lastName,
            userEmail: email,
            phone,
            message
        });

        // Subject for the email
        const subject = `[SUPPORT] New Message from ${firstName} ${lastName}`;

        // Send emails to all developers in background
        // Using Promise.allSettled to ensure we try to send to everyone even if one fails
        const emailPromises = recipients.map(recipientEmail =>
            send_ZYNC_email(recipientEmail, subject, htmlContent)
        );

        // We don't want to block the response on sending ALL emails, 
        // but it's good to ensure at least one attempt is made or handle it gracefully
        Promise.allSettled(emailPromises).then(results => {
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;
            console.log(`Support notification status: ${successful} sent, ${failed} failed`);
        });

        res.status(200).json({
            success: true,
            message: 'Your message has been sent to our developers. We will get back to you soon!'
        });

    } catch (error) {
        console.error('Support Route Error:', error);
        res.status(500).json({
            message: `Failed to process support request: ${error.message}`,
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
});

module.exports = router;
