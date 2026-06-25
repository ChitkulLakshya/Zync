const { renderEmailTemplate, escapeHtml } = require('./emailTemplateLoader');

/** Google Meet invite HTML — `email template/meet-invitation.html` */
const getMeetingEmailHtml = ({
  inviterName,
  attendeeName,
  meetingTopic: _meetingTopic,
  date,
  time,
  meetingLink,
  logoUrl = 'https://zync-meet.vercel.app/zync-dark.webp',
}) => {
  return renderEmailTemplate('meet-invitation.html', {
    inviterName: inviterName ?? '',
    attendeeName: attendeeName ?? '',
    date: date ?? '',
    time: time ?? '',
    meetingLink: meetingLink ?? '',
    logoUrl,
  });
};

const getMeetingInviteTextVersion = ({
  recipientName = 'there',
  senderName = 'A colleague',
  meetingUrl,
  meetingDate = null,
  meetingTime = null,
  projectName = null,
}) => {
  const formattedDate = meetingDate
    ? new Date(meetingDate).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Today';

  const formattedTime = meetingTime
    ? new Date(meetingTime).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : 'Now';

  const topicDisplay = projectName || 'Instant Meeting';

  let text = `ZYNC Meeting Invitation\n`;
  text += `${'─'.repeat(44)}\n\n`;
  text += `Hey ${recipientName},\n\n`;
  text += `${senderName} wants to build software together with you.\n`;
  text += `You've been invited to a video meeting on the Zync workspace.\n\n`;

  text += `Meeting Details:\n`;
  text += `  🎥 Platform: Google Meet\n`;
  text += `  📋 Topic: ${topicDisplay}\n`;
  text += `  📅 Date: ${formattedDate}\n`;
  text += `  🕐 Time: ${formattedTime}\n\n`;

  text += `Join the meeting:\n${meetingUrl}\n\n`;
  text += `${'─'.repeat(44)}\n`;
  text += `Zync • AI-powered project setup & collaboration\n`;
  text += `Sent from your focused workspace in Hyderabad, India`;

  return text;
};

/** Support form notification to team — `email template/support-notification.html` */
const getSupportNotificationTemplate = ({
  firstName,
  lastName,
  userEmail,
  phone,
  message,
  timestamp = new Date(),
  logoUrl = 'https://zync-pd9r.onrender.com/zync-dark.webp',
}) => {
  const formattedDate = new Date(timestamp).toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const messageBody = String(message ?? '')
    .split('\n')
    .map((line) => escapeHtml(line))
    .join('<br/>');

  const phoneRow = phone
    ? `<p style="margin: 5px 0 0; font-size: 14px; color: #94a3b8;">${escapeHtml(phone)}</p>`
    : '';

  return renderEmailTemplate(
    'support-notification.html',
    {
      logoUrl,
      firstName: firstName ?? '',
      lastName: lastName ?? '',
      userEmail: userEmail ?? '',
      phoneRow,
      messageBody,
      formattedDate,
    },
    { rawKeys: ['phoneRow', 'messageBody'] }
  );
};

/** Phone verification — `email template/phone-verification-code.html` */
const getPhoneVerificationEmailHtml = ({ code }) =>
  renderEmailTemplate('phone-verification-code.html', { code: code ?? '' });

/** Incoming chat request — `email template/chat-request.html` */
const getChatRequestEmailHtml = ({ senderName, message }) =>
  renderEmailTemplate('chat-request.html', {
    senderName: senderName ?? '',
    message: message ?? '',
  });

/** Account deletion OTP — `email template/account-deletion-code.html` */
const getAccountDeletionCodeEmailHtml = ({ code }) =>
  renderEmailTemplate('account-deletion-code.html', { code: code ?? '' });

/**
 * Task assignment — `email template/task-assignment.html`
 * @param {{ projectName: string, lines: { label: string, value: string }[] }} opts
 */
const getTaskAssignmentEmailHtml = ({ projectName, lines }) => {
  const taskDetails = (lines || [])
    .map(
      ({ label, value }) =>
        `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`
    )
    .join('');
  return renderEmailTemplate(
    'task-assignment.html',
    {
      projectName: projectName ?? '',
      taskDetails,
    },
    { rawKeys: ['taskDetails'] }
  );
};

/** Admin notification when a new Zync Meet user registers — HTML from `email template/meet-new-user.html`. */
const getNewUserRegistrationTemplate = ({ name, email, uid }) => {
  return renderEmailTemplate('meet-new-user.html', {
    name: name ?? '',
    email: email ?? '',
    uid: uid ?? '',
  });
};

/** Test Execution Report — `email template/test-report.html` */
const getTestReportEmailHtml = ({
  passed,
  failed,
  duration,
  testOutput,
  repoUrl = 'https://github.com/zync-meet/Zync/actions',
  logoUrl = 'https://zync-meet.vercel.app/zync-dark.webp',
}) => {
  const date = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return renderEmailTemplate('test-report.html', {
    date,
    passed: String(passed),
    failed: String(failed),
    duration: String(duration),
    testOutput: escapeHtml(testOutput || 'No output available'),
    repoUrl,
    logoUrl,
  });
};

module.exports = {
  getMeetingEmailHtml,
  getMeetingInviteTextVersion,
  getSupportNotificationTemplate,
  getNewUserRegistrationTemplate,
  getPhoneVerificationEmailHtml,
  getChatRequestEmailHtml,
  getAccountDeletionCodeEmailHtml,
  getTaskAssignmentEmailHtml,
  getTestReportEmailHtml,
};
