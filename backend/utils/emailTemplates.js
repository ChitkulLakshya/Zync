/**
 * ZYNC Email Templates
 * Standardized templates for Zync transactional emails
 */

/**
 * ZYNC Meeting Invitation Email Template (HTML)
 * "Glow Card" Design - Dark Mode with Neon Blue/Cyan Accents
 */
const getMeetingEmailHtml = ({
    inviterName,
    attendeeName,
    meetingTopic, // Kept for interface consistency
    date,
    time,
    meetingLink
}) => {
    // Zync Brand Colors & Assets
    const logoUrl = 'https://zync-meet.vercel.app/zync-white.webp';
    const accentGradient = 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)';
    const topBarGradient = 'linear-gradient(90deg, #0ea5e9 0%, #38bdf8 50%, #0ea5e9 100%)';

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Zync Meeting Invitation</title>
</head>
<body style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #000000; margin: 0; padding: 0; color: #e5e7eb; -webkit-font-smoothing: antialiased;">
    
    <!-- Outer Wrapper with subtle gradient effect -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(180deg, #000000 0%, #050505 50%, #000000 100%); background-color: #000000;">
        <tr>
            <td align="center" style="padding: 48px 16px 64px;">
                
                <!-- Main Container Card -->
                <table role="presentation" width="540" cellpadding="0" cellspacing="0" style="max-width: 540px; width: 100%; background: linear-gradient(145deg, #0b0f19 0%, #05070a 100%); border: 1px solid rgba(14, 165, 233, 0.15); border-radius: 20px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 60px rgba(14, 165, 233, 0.08);">
                    
                    <!-- Glow accent bar at top -->
                    <tr>
                        <td style="height: 3px; background: ${topBarGradient};"></td>
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
                            <h1 style="font-size: 26px; font-weight: 700; margin: 0 0 14px; color: #ffffff; text-align: center; letter-spacing: -0.02em;">Hey ${attendeeName},</h1>
                            
                            <!-- Main Message -->
                            <p style="color: #94a3b8; line-height: 1.75; font-size: 15px; margin: 0 0 36px; text-align: center;">
                                <strong style="color: #ffffff; font-weight: 600;">${inviterName}</strong> wants to build software together with you. <br> You've been invited to join the workspace.
                            </p>

                            <!-- Meeting Details Card with glow -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(14, 165, 233, 0.2); border-radius: 14px; margin-bottom: 32px; box-shadow: 0 0 20px rgba(14, 165, 233, 0.06);">
                                <tr>
                                    <td style="padding: 24px 28px;">
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                            <!-- Platform Row -->
                                            <tr>
                                                <td style="padding-bottom: 18px;">
                                                    <table role="presentation" cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td valign="middle" style="padding-right: 12px;">
                                                                <img src="https://fonts.gstatic.com/s/i/productlogos/meet_2020q4/v6/web-96dp/logo_meet_2020q4_color_2x_web_96dp.png" alt="Google Meet" width="28" height="28" style="display: block; width: 28px; height: 28px;" />
                                                            </td>
                                                            <td valign="middle" style="color: #e2e8f0; font-size: 14px; font-weight: 600;">Google Meet</td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                            <!-- Divider -->
                                            <tr>
                                                <td style="padding-bottom: 16px;">
                                                    <div style="height: 1px; background: linear-gradient(90deg, transparent, rgba(14, 165, 233, 0.3), transparent);"></div>
                                                </td>
                                            </tr>
                                            <!-- Date Row -->
                                            <tr>
                                                <td style="padding-bottom: 14px;">
                                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td style="color: #64748b; font-size: 13px; font-weight: 500;">📅 Date</td>
                                                            <td align="right" style="color: #f1f5f9; font-weight: 600; font-size: 14px;">${date}</td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
                                            <!-- Time Row -->
                                            <tr>
                                                <td>
                                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                                        <tr>
                                                            <td style="color: #64748b; font-size: 13px; font-weight: 500;">🕐 Time</td>
                                                            <td align="right" style="color: #f1f5f9; font-weight: 600; font-size: 14px;">${time}</td>
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
                                        <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${meetingLink}" style="height:50px;v-text-anchor:middle;width:220px;" arcsize="50%" fillcolor="#0ea5e9">
                                            <w:anchorlock/>
                                            <center style="color:#ffffff;font-family:sans-serif;font-size:15px;font-weight:bold;">Join Google Meet</center>
                                        </v:roundrect>
                                        <![endif]-->
                                        <!--[if !mso]><!-->
                                        <a href="${meetingLink}" style="background: ${accentGradient}; color: #ffffff; padding: 15px 44px; text-decoration: none; border-radius: 25px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 16px rgba(14, 165, 233, 0.4), 0 0 24px rgba(14, 165, 233, 0.2); letter-spacing: 0.01em;">Join Google Meet</a>
                                        <!--<![endif]-->
                                    </td>
                                </tr>
                                <tr>
                                    <td align="center" style="padding-top: 24px;">
                                        <p style="font-size: 12px; color: #64748b; margin: 0;">
                                            Or copy: <a href="${meetingLink}" style="color: #38bdf8; text-decoration: none; word-break: break-all;">${meetingLink}</a>
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
                            <p style="font-size: 12px; color: #475569; margin: 0 0 10px;">
                                Sent via <strong style="color: #0ea5e9;">Zync</strong> • AI-powered project collaboration
                            </p>
                            <p style="font-size: 11px; color: #334155; margin: 0;">
                                <a href="https://zync-meet.vercel.app/dashboard" style="color: #64748b; text-decoration: none;">Dashboard</a> &nbsp;•&nbsp; 
                                <a href="https://zync-meet.vercel.app/privacy" style="color: #64748b; text-decoration: none;">Privacy</a>
                            </p>
                        </td>
                    </tr>
                </table>

            </td>
        </tr>
    </table>

</body>
</html>`;
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


/**
 * ZYNC Support Notification Template (For Developers)
 * Inform developers of a new support request
 */
const getSupportNotificationTemplate = ({
    firstName,
    lastName,
    userEmail,
    phone,
    message,
    timestamp = new Date(),
    logoUrl = 'https://zync-pd9r.onrender.com/zync-white.webp',
}) => {
    const formattedDate = new Date(timestamp).toLocaleString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Support Request</title>
</head>
<body style="font-family: 'Inter', sans-serif; background-color: #0a0c10; color: #e5e7eb; margin: 0; padding: 40px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #111318; border: 1px solid rgba(99, 102, 241, 0.2); border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        <tr>
            <td style="background: linear-gradient(90deg, #6366f1 0%, #a855f7 100%); height: 4px;"></td>
        </tr>
        <tr>
            <td style="padding: 40px;">
                <img src="${logoUrl}" alt="ZYNC" width="100" style="margin-bottom: 30px;" />
                <h1 style="font-size: 24px; font-weight: 700; color: #ffffff; margin: 0 0 20px;">New Support Message</h1>
                
                <table role="presentation" width="100%" style="margin-bottom: 30px; background-color: rgba(30, 41, 59, 0.5); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);">
                    <tr>
                        <td style="padding: 20px;">
                            <p style="margin: 0 0 10px; font-size: 14px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">From User</p>
                            <p style="margin: 0; font-size: 18px; font-weight: 600; color: #ffffff;">${firstName} ${lastName}</p>
                            <p style="margin: 5px 0 0; font-size: 16px; color: #6366f1;">${userEmail}</p>
                            ${phone ? `<p style="margin: 5px 0 0; font-size: 14px; color: #94a3b8;">${phone}</p>` : ''}
                        </td>
                    </tr>
                </table>

                <div style="margin-bottom: 30px;">
                    <p style="font-size: 14px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px;">Message Content</p>
                    <div style="padding: 20px; background-color: #1e293b; border-radius: 12px; border-left: 4px solid #6366f1; color: #f1f5f9; line-height: 1.6; font-size: 15px;">
                        ${message.replace(/\n/g, '<br/>')}
                    </div>
                </div>

                <p style="font-size: 13px; color: #64748b; margin-top: 40px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 20px;">
                    Received on ${formattedDate}<br/>
                    ZYNC Internal Support System
                </p>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
};

module.exports = {
    getMeetingEmailHtml,
    getMeetingInviteTextVersion,
    getSupportNotificationTemplate
};
