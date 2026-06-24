const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
  port: process.env.EMAIL_PORT || 587,
  auth: {
    user: process.env.EMAIL_USER || 'ethereal.user@ethereal.email',
    pass: process.env.EMAIL_PASS || 'ethereal.pass',
  },
});

const sendEmail = async ({ to, subject, text, html }) => {
  console.log(`[MOCK EMAIL] Sending email to ${to}: ${subject}`);

  if (process.env.EMAIL_HOST) {
    try {
      await transporter.sendMail({
        from: '"ZYNC Support" <support@ZYNC.com>',
        to,
        subject,
        text,
        html: html || text,
      });
      console.log(`[EMAIL SENT] Email sent to ${to}`);
      return true;
    } catch (error) {
      console.error('[EMAIL ERROR] Failed to send email:', error);
      return false;
    }
  }
  return true;
};

module.exports = { sendEmail };
