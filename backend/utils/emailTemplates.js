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
                                        <a href="https://zync-pd9r.onrender.com/dashboard" style="color: #00a3ff; text-decoration: none; font-weight: 600; font-size: 14px;">Go to Dashboard</a>
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

/**
 * ZYNC Google Meet Invitation Email Template
 * Dark-themed, premium SaaS design matching ZYNC website
 * Features: charcoal background, blue-purple gradients, soft glows
 * Gmail-compatible, responsive layout
 */
const getGoogleMeetInviteTemplate = ({
    recipientName = 'there',
    hostName = 'Someone',
    meetUrl,
    meetingDate = null,
    meetingTime = null,
    logoUrl = 'https://zync-pd9r.onrender.com/zync-white.webp', // White logo for dark bg
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

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Google Meet Invitation from ${hostName}</title>
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
<body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0a0c10; margin: 0; padding: 0; color: #e5e7eb; -webkit-font-smoothing: antialiased;">
    
    <!-- Outer Wrapper with subtle gradient effect -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(180deg, #0a0c10 0%, #0f1318 50%, #0a0c10 100%); background-color: #0a0c10;">
        <tr>
            <td align="center" style="padding: 48px 16px 64px;">
                
                <!-- Main Container Card -->
                <table role="presentation" width="540" cellpadding="0" cellspacing="0" style="max-width: 540px; width: 100%; background: linear-gradient(145deg, #14171f 0%, #111318 100%); border: 1px solid rgba(99, 102, 241, 0.15); border-radius: 20px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 60px rgba(99, 102, 241, 0.08);">
                    
                    <!-- Glow accent bar at top -->
                    <tr>
                        <td style="height: 3px; background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%);"></td>
                    </tr>

                    <!-- Header with Logo -->
                    <tr>
                        <td align="center" style="padding: 36px 40px 20px;">
                            <img src="${logoUrl}" alt="ZYNC" width="85" height="auto" style="display: block; width: 85px; height: auto;" />
                        </td>
                    </tr>

                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 0 40px 44px;">
                            
                            <!-- Greeting -->
                            <h1 style="font-size: 26px; font-weight: 700; margin: 0 0 14px; color: #ffffff; text-align: center; letter-spacing: -0.02em;">Hey ${recipientName},</h1>
                            
                            <!-- Main Message -->
                            <p style="color: #9ca3af; line-height: 1.75; font-size: 15px; margin: 0 0 36px; text-align: center;">
                                <strong style="color: #ffffff; font-weight: 600;">${hostName}</strong> wants to build software together with you. <br /> you've been invited to a video meeting on the Zync workspace. <br /> 
                            </p>

                            <!-- Meeting Details Card with glow -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: rgba(30, 33, 44, 0.6); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 14px; margin-bottom: 32px; box-shadow: 0 0 20px rgba(99, 102, 241, 0.06);">
                                <tr>
                                    <td style="padding: 24px 28px;">
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                            <!-- Platform Row -->
                                            <tr>
                                                <td style="padding-bottom: 18px;">
                                                    <table role="presentation" cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td valign="middle" style="padding-right: 12px;">
                                                                <div style="width: 28px; height: 28px; background: linear-gradient(135deg, #00897b 0%, #1de9b6 100%); border-radius: 6px; display: inline-block; text-align: center; line-height: 28px; font-size: 14px;">🎥</div>
                                                            </td>
                                                            <td valign="middle" style="color: #d1d5db; font-size: 14px; font-weight: 600;">Google Meet</td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                            <!-- Divider -->
                                            <tr>
                                                <td style="padding-bottom: 16px;">
                                                    <div style="height: 1px; background: linear-gradient(90deg, transparent, rgba(99, 102, 241, 0.3), transparent);"></div>
                                                </td>
                                            </tr>
                                            <!-- Date Row -->
                                            <tr>
                                                <td style="padding-bottom: 14px;">
                                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td style="color: #6b7280; font-size: 13px; font-weight: 500;">📅 Date</td>
                                                            <td align="right" style="color: #f3f4f6; font-weight: 600; font-size: 14px;">${formattedDate}</td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                            <!-- Time Row -->
                                            <tr>
                                                <td>
                                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td style="color: #6b7280; font-size: 13px; font-weight: 500;">🕐 Time</td>
                                                            <td align="right" style="color: #f3f4f6; font-weight: 600; font-size: 14px;">${formattedTime}</td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>

                            <!-- CTA Button with gradient -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td align="center">
                                        <!--[if mso]>
                                        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${meetUrl}" style="height:50px;v-text-anchor:middle;width:220px;" arcsize="50%" fillcolor="#6366f1">
                                            <w:anchorlock/>
                                            <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold;">Join Google Meet</center>
                                        </v:roundrect>
                                        <![endif]-->
                                        <!--[if !mso]><!-->
                                        <a href="${meetUrl}" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%); color: #ffffff; padding: 15px 44px; text-decoration: none; border-radius: 25px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4), 0 0 24px rgba(139, 92, 246, 0.2); letter-spacing: 0.01em;">Join Google Meet</a>
                                        <!--<![endif]-->
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding-top: 24px;">
                                        <p style="font-size: 12px; color: #6b7280; margin: 0;">
                                            Or copy: <a href="${meetUrl}" style="color: #8b5cf6; text-decoration: none; word-break: break-all;">${meetUrl}</a>
                                        </p>
                                    </td>
                                </tr>
                            </table>

                        </td>
                    </tr>

                </table>
                <!-- End Main Container -->

                <!-- Footer -->
                <table role="presentation" width="540" cellpadding="0" cellspacing="0" style="max-width: 540px; width: 100%;">
                    <tr>
                        <td align="center" style="padding: 36px 40px;">
                            <p style="font-size: 12px; color: #4b5563; margin: 0 0 10px;">
                                Sent via <strong style="color: #6366f1;">Zync</strong> • AI-powered project collaboration
                            </p>
                            <p style="font-size: 11px; color: #374151; margin: 0;">
                                <a href="https://zync-pd9r.onrender.com/dashboard" style="color: #6b7280; text-decoration: none;">Dashboard</a> &nbsp;•&nbsp; 
                                <a href="https://zync-pd9r.onrender.com/privacy" style="color: #6b7280; text-decoration: none;">Privacy</a>
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
 * Plain text version of Google Meet invite
 */
const getGoogleMeetInviteTextVersion = ({
    recipientName = 'there',
    hostName = 'Someone',
    meetUrl,
    meetingDate = null,
    meetingTime = null,
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

    let text = `ZYNC - Google Meet Invitation\n`;
    text += `${'─'.repeat(40)}\n\n`;
    text += `Hey ${recipientName},\n\n`;
    text += `${hostName} wants to build software together with you.\n\n`;
    text += `Meeting Details:\n`;
    text += `  🎥 Platform: Google Meet\n`;
    text += `  📅 Date: ${formattedDate}\n`;
    text += `  🕐 Time: ${formattedTime}\n\n`;
    text += `Join the meeting:\n${meetUrl}\n\n`;
    text += `${'─'.repeat(40)}\n`;
    text += `Sent via Zync • AI-powered project collaboration`;

    return text;
};

module.exports = {
    getMeetingInviteTemplate,
    getMeetingInviteTextVersion,
    getGoogleMeetInviteTemplate,
    getGoogleMeetInviteTextVersion,
};
