const nodemailer = require('nodemailer');

// Configure Nodemailer
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
  port: process.env.EMAIL_PORT || 587,
  auth: {
    user: process.env.EMAIL_USER || 'ethereal.user@ethereal.email',
    pass: process.env.EMAIL_PASS || 'ethereal.pass'
  }
});

const sendEmail = async ({ to, subject, text, html }) => {
  console.log(`[MOCK EMAIL] Sending email to ${to}: ${subject}`);

  // Only attempt real send if HOST is configured, otherwise just log (dev mode)
  if (process.env.EMAIL_HOST) {
    try {
      await transporter.sendMail({
        from: '"ZYNC Support" <support@ZYNC.com>',
        to,
        subject,
        text,
        html: html || text // Use text as fallback html if not provided
      });
      console.log(`[EMAIL SENT] Email sent to ${to}`);
      return true;
    } catch (error) {
      console.error('[EMAIL ERROR] Failed to send email:', error);
      return false;
    }
  }
  return true; // Return true as "simulated success" in dev
};

module.exports = { sendEmail };
