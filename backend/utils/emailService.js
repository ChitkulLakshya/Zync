const nodemailer = require('nodemailer');

const createTransporter = () => {
  if (process.env.GOOGLE_REFRESH_TOKEN) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.GMAIL_USER || 'zync.meet@gmail.com',
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
      },
    });
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
    port: process.env.EMAIL_PORT || 587,
    auth: {
      user: process.env.EMAIL_USER || 'ethereal.user@ethereal.email',
      pass: process.env.EMAIL_PASS || 'ethereal.pass',
    },
  });
};

const transporter = createTransporter();

const sendEmail = async ({ to, subject, text, html }) => {
  console.log(`[PREPARING EMAIL] Sending email to ${to}: ${subject}`);

  if (process.env.EMAIL_HOST || process.env.GOOGLE_REFRESH_TOKEN) {
    try {
      await transporter.sendMail({
        from: '"ZYNC Support" <support@ZYNC.com>',
        to,
        subject,
        text,
        html: html || text,
      });
      console.log(`[EMAIL SENT] Email sent successfully to ${to}`);
      return true;
    } catch (error) {
      console.error('[EMAIL ERROR] Failed to send email:', error);
      return false;
    }
  }
  
  console.log(`[MOCK EMAIL] Did not send, missing credentials.`);
  return true;
};

module.exports = { sendEmail };
