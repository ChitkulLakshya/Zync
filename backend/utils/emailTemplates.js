const { renderEmailTemplate, escapeHtml } = require('./emailTemplateLoader'); // WHAT: Import template rendering functions. WHY: To compile HTML emails with dynamic data.

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
  return renderEmailTemplate('meet-invitation.html', { // WHAT: Call the template renderer with the 'meet-invitation.html' file. WHY: To produce the final HTML for a meeting invite.
    inviterName: inviterName ?? '', // WHAT: Pass the inviter's name, defaulting to empty string. WHY: To safely inject the sender's name into the template without null errors.
    attendeeName: attendeeName ?? '', // WHAT: Pass the attendee's name, defaulting to empty string. WHY: To personalize the greeting in the email.
    date: date ?? '', // WHAT: Pass the meeting date. WHY: To inform the user when the meeting is scheduled.
    time: time ?? '', // WHAT: Pass the meeting time. WHY: To inform the user of the exact time.
    meetingLink: meetingLink ?? '', // WHAT: Pass the Google Meet URL. WHY: So the user can click the link to join the meeting.
    logoUrl, // WHAT: Pass the company logo URL. WHY: To brand the email appropriately.
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
  const formattedDate = meetingDate // WHAT: Check if a meeting date was provided. WHY: To conditionally format it or fall back to 'Today'.
    ? new Date(meetingDate).toLocaleDateString('en-US', { // WHAT: Format the provided date string into a human-readable string. WHY: To make it easier for the recipient to read.
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Today'; // WHAT: Use 'Today' if no date is provided. WHY: A sensible default for instant meetings.

  const formattedTime = meetingTime // WHAT: Check if a meeting time was provided. WHY: To conditionally format it or fall back to 'Now'.
    ? new Date(meetingTime).toLocaleTimeString('en-US', { // WHAT: Format the provided time into a human-readable 12-hour format string. WHY: Standard format for readability.
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    : 'Now'; // WHAT: Use 'Now' if no time is provided. WHY: A sensible default for instant meetings.

  const topicDisplay = projectName || 'Instant Meeting'; // WHAT: Define the meeting topic, falling back to 'Instant Meeting'. WHY: To give context to the user about why they are meeting.

  let text = `ZYNC Meeting Invitation\n`; // WHAT: Initialize the plain text email body. WHY: To start building the fallback email for clients that don't support HTML.
  text += `${'─'.repeat(44)}\n\n`; // WHAT: Add a text-based divider. WHY: To visually separate sections in the plain-text email.
  text += `Hey ${recipientName},\n\n`; // WHAT: Add a greeting. WHY: To start the email politely.
  text += `${senderName} wants to build software together with you.\n`; // WHAT: Add context about the sender's intent. WHY: To explain the purpose of the invite.
  text += `You've been invited to a video meeting on the Zync workspace.\n\n`; // WHAT: Add the platform context. WHY: To clarify where this meeting is taking place.

  text += `Meeting Details:\n`; // WHAT: Add a section header. WHY: To organize the meeting specifics.
  text += `  🎥 Platform: Google Meet\n`; // WHAT: Indicate the video platform. WHY: To manage user expectations.
  text += `  📋 Topic: ${topicDisplay}\n`; // WHAT: Include the topic we determined earlier. WHY: To provide context.
  text += `  📅 Date: ${formattedDate}\n`; // WHAT: Include the formatted date. WHY: So they know when to attend.
  text += `  🕐 Time: ${formattedTime}\n\n`; // WHAT: Include the formatted time. WHY: So they know exactly when to join.

  text += `Join the meeting:\n${meetingUrl}\n\n`; // WHAT: Provide the actual join link. WHY: This is the primary call to action for the email.
  text += `${'─'.repeat(44)}\n`; // WHAT: Add another text-based divider. WHY: To visually separate the main content from the footer.
  text += `Zync • AI-powered project setup & collaboration\n`; // WHAT: Add a brand sign-off. WHY: For marketing and branding purposes.
  text += `Sent from your focused workspace in Hyderabad, India`; // WHAT: Add a location sign-off. WHY: Gives a personal touch.

  return text; // WHAT: Return the fully constructed plain text string. WHY: To provide the caller with the plain-text fallback content.
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
  const formattedDate = new Date(timestamp).toLocaleString('en-US', { // WHAT: Format the timestamp into a readable date and time string. WHY: So support agents know exactly when the request was made.
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const messageBody = String(message ?? '') // WHAT: Convert the message to a string, defaulting to empty. WHY: To safely process user input.
    .split('\n') // WHAT: Split the message by newline characters. WHY: So we can process each line individually.
    .map((line) => escapeHtml(line)) // WHAT: Escape HTML in every individual line. WHY: To prevent XSS if a user submits malicious script tags in their support message.
    .join('<br/>'); // WHAT: Join the escaped lines back together with HTML break tags. WHY: To preserve the user's formatting (paragraphs/line breaks) in the HTML email.

  const phoneRow = phone // WHAT: Check if a phone number was provided. WHY: Because it's optional, we only want to render this HTML if data exists.
    ? `<p style="margin: 5px 0 0; font-size: 14px; color: #94a3b8;">${escapeHtml(phone)}</p>` // WHAT: Construct an HTML paragraph containing the escaped phone number. WHY: To conditionally display the phone number safely.
    : ''; // WHAT: Fallback to an empty string. WHY: So nothing is rendered if no phone number exists.

  return renderEmailTemplate( // WHAT: Call the template renderer with the support template. WHY: To produce the final notification HTML.
    'support-notification.html',
    {
      logoUrl, // WHAT: Pass the logo URL. WHY: For branding.
      firstName: firstName ?? '', // WHAT: Pass the user's first name. WHY: So support knows who is asking for help.
      lastName: lastName ?? '', // WHAT: Pass the user's last name. WHY: For full identification.
      userEmail: userEmail ?? '', // WHAT: Pass the user's email. WHY: So support knows how to reply.
      phoneRow, // WHAT: Pass the pre-constructed HTML string for the phone number. WHY: It will be inserted into the template as-is.
      messageBody, // WHAT: Pass the pre-constructed HTML string for the message body. WHY: It has already been escaped and formatted with <br/> tags.
      formattedDate, // WHAT: Pass the readable date string. WHY: To display the submission time.
    },
    { rawKeys: ['phoneRow', 'messageBody'] } // WHAT: Specify that phoneRow and messageBody are raw keys. WHY: To prevent the render function from double-escaping the HTML we intentionally built and sanitized.
  );
};

/** Phone verification — `email template/phone-verification-code.html` */
const getPhoneVerificationEmailHtml = ({ code }) =>
  renderEmailTemplate('phone-verification-code.html', { code: code ?? '' }); // WHAT: Render the phone verification template. WHY: To send OTPs for phone validation.

/** Incoming chat request — `email template/chat-request.html` */
const getChatRequestEmailHtml = ({ senderName, message }) =>
  renderEmailTemplate('chat-request.html', { // WHAT: Render the chat request template. WHY: To notify a user they have a pending chat.
    senderName: senderName ?? '', // WHAT: Pass sender name. WHY: To show who wants to chat.
    message: message ?? '', // WHAT: Pass the introductory message. WHY: To provide context on the chat request.
  });

/** Account deletion OTP — `email template/account-deletion-code.html` */
const getAccountDeletionCodeEmailHtml = ({ code }) =>
  renderEmailTemplate('account-deletion-code.html', { code: code ?? '' }); // WHAT: Render the account deletion template. WHY: To send a confirmation code for sensitive account operations.

/**
 * Task assignment — `email template/task-assignment.html`
 * @param {{ projectName: string, lines: { label: string, value: string }[] }} opts
 */
const getTaskAssignmentEmailHtml = ({ projectName, lines }) => {
  const taskDetails = (lines || []) // WHAT: Take the lines array, defaulting to empty if undefined. WHY: To safely iterate over task properties.
    .map( // WHAT: Map over each label/value pair. WHY: To transform raw data into HTML snippets.
      ({ label, value }) =>
        `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>` // WHAT: Construct an HTML paragraph with bold labels and safely escaped values. WHY: To present task details cleanly.
    )
    .join(''); // WHAT: Join the paragraphs into a single string. WHY: To create a single block of HTML to inject into the template.
  return renderEmailTemplate( // WHAT: Render the task assignment template. WHY: To notify a user they have been assigned work.
    'task-assignment.html',
    {
      projectName: projectName ?? '', // WHAT: Pass the project name. WHY: To give context to the task.
      taskDetails, // WHAT: Pass the pre-built HTML snippet. WHY: It contains the dynamically generated list of task properties.
    },
    { rawKeys: ['taskDetails'] } // WHAT: Mark taskDetails as a raw key. WHY: To instruct the renderer not to escape the <p> and <strong> tags we just generated safely.
  );
};

/** Admin notification when a new Zync Meet user registers — HTML from `email template/meet-new-user.html`. */
const getNewUserRegistrationTemplate = ({ name, email, uid }) => {
  return renderEmailTemplate('meet-new-user.html', { // WHAT: Render the new user notification template. WHY: To alert admins of new signups.
    name: name ?? '', // WHAT: Pass the new user's name. WHY: For admin context.
    email: email ?? '', // WHAT: Pass the new user's email. WHY: For admin context.
    uid: uid ?? '', // WHAT: Pass the unique identifier. WHY: For database referencing.
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
  const date = new Date().toLocaleDateString('en-US', { // WHAT: Generate today's date formatted nicely. WHY: To timestamp the report.
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return renderEmailTemplate('test-report.html', { // WHAT: Render the test report template. WHY: To send automated QA results to developers.
    date, // WHAT: Pass the formatted date. WHY: To show when the tests ran.
    passed: String(passed), // WHAT: Convert passed count to string. WHY: To ensure it renders properly in the template.
    failed: String(failed), // WHAT: Convert failed count to string. WHY: To ensure it renders properly in the template.
    duration: String(duration), // WHAT: Convert duration to string. WHY: To show how long the suite took.
    testOutput: escapeHtml(testOutput || 'No output available'), // WHAT: Escape the raw terminal output of the test runner. WHY: Crucial for preventing XSS if test output contains arbitrary user data or malicious strings, while providing debug info.
    repoUrl, // WHAT: Pass the repository URL. WHY: So developers can click through to the codebase or CI/CD pipeline.
    logoUrl, // WHAT: Pass the logo URL. WHY: For branding.
  });
};

module.exports = { // WHAT: Export all the builder functions. WHY: So controllers and background workers can generate specific emails as needed.
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
