const express = require('express');
const router = express.Router();
const { sendZyncEmail } = require('../services/mailer');
const { getSupportNotificationTemplate } = require('../utils/emailTemplates');

router.post('/', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, message } = req.body;

    if (!firstName || !email || !message) {
      return res
        .status(400)
        .json({
          message: 'Please provide at least first name, email, and a message.',
        });
    }

    const recipientsString =
      process.env.SUPPORT_RECIPIENTS || 'consolemaster@gmail.com';
    const recipients = recipientsString
      .split(',')
      .map((email) => email.trim())
      .filter(Boolean);

    if (recipients.length === 0) {
      console.error(
        'No support recipients configured in environment variables'
      );
      return res.status(500).json({ message: 'Server configuration error' });
    }

    const htmlContent = getSupportNotificationTemplate({
      firstName,
      lastName,
      userEmail: email,
      phone,
      message,
    });

    const subject = `[SUPPORT] New Message from ${firstName} ${lastName}`;

    const emailPromises = recipients.map((recipientEmail) =>
      sendZyncEmail(recipientEmail, subject, htmlContent)
    );

    Promise.allSettled(emailPromises).then((results) => {
      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;
      console.log(
        `Support notification status: ${successful} sent, ${failed} failed`
      );
    });

    res.status(200).json({
      success: true,
      message:
        'Your message has been sent to our developers. We will get back to you soon!',
    });
  } catch (error) {
    console.error('Support Route Error:', error);
    res.status(500).json({
      message: `Failed to process support request: ${error.message}`,
      error: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  }
});

module.exports = router;
