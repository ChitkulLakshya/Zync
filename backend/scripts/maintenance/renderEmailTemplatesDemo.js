const fs = require('fs');
const path = require('path');

const {
  getMeetingEmailHtml,
  getNewUserRegistrationTemplate,
  getSupportNotificationTemplate,
  getPhoneVerificationEmailHtml,
  getChatRequestEmailHtml,
  getAccountDeletionCodeEmailHtml,
  getTaskAssignmentEmailHtml,
} = require('../utils/emailTemplates');

const TEMPLATE_DIR = path.join(__dirname, '..', 'templates', 'email');
const OUT_DIR = path.join(TEMPLATE_DIR, 'demo');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readTemplateRaw(filename) {
  const fullPath = path.join(TEMPLATE_DIR, filename);
  return fs.readFileSync(fullPath, 'utf8');
}

function replaceBracketFirstName(html, firstName) {
  // Some templates use `[First Name]` style placeholders (not `{{firstName}}`).
  return html.replaceAll('[First Name]', firstName);
}

function writeDemo(filename, html) {
  ensureDir(OUT_DIR);
  const outPath = path.join(OUT_DIR, filename);
  fs.writeFileSync(outPath, html, 'utf8');
}

function renderDemoByFilename(filename) {
  switch (filename) {
    case 'meet-invitation.html':
      return getMeetingEmailHtml({
        inviterName: 'Alice',
        attendeeName: 'Bob',
        meetingTopic: 'Demo Topic',
        date: 'October 24, 2023',
        time: '10:00 AM',
        meetingLink: 'https://meet.google.com/demo-demo-demo',
      });

    case 'meet-new-user.html':
      return getNewUserRegistrationTemplate({
        name: 'Eesha',
        email: 'eesha@example.com',
        uid: 'demo_uid_123',
      });

    case 'support-notification.html':
      return getSupportNotificationTemplate({
        firstName: 'Eesha',
        lastName: 'K',
        userEmail: 'eesha@example.com',
        phone: '+1 (555) 010-1234',
        message: 'Hello Support,\nI need help with something.',
        timestamp: new Date('2023-10-24T12:00:00Z'),
      });

    case 'phone-verification-code.html':
      return getPhoneVerificationEmailHtml({ code: '123456' });

    case 'chat-request.html':
      return getChatRequestEmailHtml({
        senderName: 'Alice',
        message: 'Hey! Want to collaborate?',
      });

    case 'account-deletion-code.html':
      return getAccountDeletionCodeEmailHtml({ code: '654321' });

    case 'task-assignment.html':
      return getTaskAssignmentEmailHtml({
        projectName: 'Zync Demo Project',
        lines: [
          { label: 'Step', value: 'Backlog' },
          { label: 'Task', value: 'Implement login screen' },
          { label: 'Description', value: 'Add UI + validation' },
          { label: 'Assigned By', value: 'Admin' },
        ],
      });

    case 'welcome.html': {
      const raw = readTemplateRaw(filename);
      return replaceBracketFirstName(raw, 'Eesha');
    }

    case 'password-reset.html': {
      const raw = readTemplateRaw(filename);
      return replaceBracketFirstName(raw, 'Eesha');
    }

    default:
      // Fallback: return as-is (still writes a demo file).
      return readTemplateRaw(filename);
  }
}

function main() {
  if (!fs.existsSync(TEMPLATE_DIR)) {
    throw new Error(`Template directory not found: ${TEMPLATE_DIR}`);
  }

  const files = fs
    .readdirSync(TEMPLATE_DIR)
    .filter((f) => f.endsWith('.html'))
    .sort();

  const written = [];
  for (const file of files) {
    const html = renderDemoByFilename(file);
    writeDemo(file, html);
    written.push(file);
  }

  // eslint-disable-next-line no-console
  console.log(
    `[Email template demos] Wrote ${written.length} file(s) to: ${OUT_DIR}`
  );
  console.log(written.map((f) => `- ${f}`).join('\n'));
}

main();
