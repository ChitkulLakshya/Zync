/**
 * ZYNC Meeting Invitation Email Template
 * Dark-themed, modern design matching the dashboard aesthetic
 * Gmail-compatible, responsive layout
 */

const getMeetingInviteTemplate = ({
    recipientName = 'there',
    senderName = 'A colleague',
    meetingUrl,
    meetingDate = null,
    meetingTime = null,
    projectName = null,
    logoUrl = 'https://zync-pd9r.onrender.com/zync-white.webp',
}) => {
    // Format date if provided
    const formattedDate = meetingDate
        ? new Date(meetingDate).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
        })
        : 'Today';

    // Format time if provided
    const formattedTime = meetingTime
        ? new Date(meetingTime).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
        })
        : 'Now';

    const topicDisplay = projectName || 'Instant Meeting';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>ZYNC Meeting Invitation</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
</head>
<body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0e14; margin: 0; padding: 0; color: #ffffff; -webkit-font-smoothing: antialiased;">
    
    <!-- Wrapper -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #0b0e14;">
        <tr>
            <td align="center" style="padding: 40px 16px 60px;">
                
                <!-- Main Container -->
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #11141b; border: 1px solid #1f2937; border-radius: 16px; overflow: hidden;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 20px;">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="left" valign="middle">
                                        <img src="${logoUrl}" alt="ZYNC" width="100" height="32" style="display: block; width: 100px; height: auto;" />
                                    </td>
                                    <td align="right" valign="middle">
                                        <span style="background: linear-gradient(90deg, #1e3a8a, #3b82f6); color: #ffffff; font-size: 11px; font-weight: 600; padding: 4px 12px; border-radius: 99px; display: inline-block;">PUBLIC BETA 1.0</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 0 40px 40px;">
                            
                            <!-- Heading -->
                            <h1 style="font-size: 28px; font-weight: 700; margin: 0 0 16px; color: #ffffff;">Hey ${recipientName},</h1>
                            
                            <p style="color: #9ca3af; line-height: 1.6; font-size: 16px; margin: 0 0 32px;">
                                <strong style="color: #ffffff;">${senderName}</strong> wants to build software together with you. You've been invited to a video meeting on the Zync workspace.
                            </p>

                            <!-- Meeting Card -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: rgba(31, 41, 55, 0.8); border: 1px solid #374151; border-radius: 12px; border-left: 4px solid #00a3ff;">
                                <tr>
                                    <td style="padding: 24px;">
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                            <!-- Topic Row -->
                                            <tr>
                                                <td style="color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; padding-bottom: 15px;">Topic</td>
                                                <td align="right" style="color: #00a3ff; font-weight: 600; font-size: 18px; padding-bottom: 15px;">${topicDisplay}</td>
                                            </tr>
                                            <!-- Date Row -->
                                            <tr>
                                                <td style="color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; padding-bottom: 10px;">Date</td>
                                                <td align="right" style="color: #f3f4f6; font-weight: 500; padding-bottom: 10px;">${formattedDate}</td>
                                            </tr>
                                            <!-- Time Row -->
                                            <tr>
                                                <td style="color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Time</td>
                                                <td align="right" style="color: #f3f4f6; font-weight: 500;">${formattedTime}</td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA Button -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center" style="padding-top: 32px;">
                                        <a href="${meetingUrl}" style="background-color: #00a3ff; color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">Join Instant Meeting</a>
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding-top: 20px;">
                                        <p style="font-size: 12px; color: #6b7280; margin: 0;">
                                            Trouble with the button? <a href="${meetingUrl}" style="color: #00a3ff; text-decoration: none;">Click here to join</a>
                                        </p>
                                    </td>
                                </tr>
                            </table>

                        </td>
                    </tr>

                </table>
                <!-- End Main Container -->

                <!-- Footer -->
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%;">
                    <tr>
                        <td align="center" style="padding: 30px 40px;">
                            <p style="font-size: 13px; color: #4b5563; margin: 0 0 8px;">
                                <strong style="color: #6b7280;">Zync</strong> • AI-powered project setup & collaboration
                            </p>
                            <p style="font-size: 12px; color: #4b5563; margin: 0 0 15px;">
                                Sent from your focused workspace in Hyderabad, India
                            </p>
                            <p style="font-size: 12px; margin: 0;">
                                <a href="https://zync-pd9r.onrender.com/dashboard" style="color: #00a3ff; text-decoration: none; margin: 0 10px;">Dashboard</a> • 
                                <a href="https://zync-pd9r.onrender.com/privacy" style="color: #00a3ff; text-decoration: none; margin: 0 10px;">Privacy</a> • 
                                <a href="https://zync-pd9r.onrender.com/unsubscribe" style="color: #00a3ff; text-decoration: none; margin: 0 10px;">Unsubscribe</a>
                            </p>
                        </td>
                    </tr>
                </table>

            </td>
        </tr>
    </table>

</body>
</html>
    `.trim();
};

/**
 * Get plain text version of the email for clients that don't support HTML
 */
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
    text += `  📋 Topic: ${topicDisplay}\n`;
    text += `  📅 Date: ${formattedDate}\n`;
    text += `  🕐 Time: ${formattedTime}\n\n`;

    text += `Join the meeting:\n${meetingUrl}\n\n`;
    text += `${'─'.repeat(44)}\n`;
    text += `Zync • AI-powered project setup & collaboration\n`;
    text += `Sent from your focused workspace in Hyderabad, India`;

    return text;
};

module.exports = {
    getMeetingInviteTemplate,
    getMeetingInviteTextVersion,
};
