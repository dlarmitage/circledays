import { Resend } from 'resend';

// Lazy-initialize Resend client to avoid build-time errors
let resend: Resend | null = null;

function getResendClient() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  const client = getResendClient();
  
  if (!client) {
    console.log('📧 Email would be sent to:', to);
    console.log('Subject:', subject);
    console.log('---');
    return { success: true, mock: true };
  }

  try {
    const { data, error } = await client.emails.send({
      from: process.env.EMAIL_FROM || 'CircleDays <noreply@circledays.app>',
      to,
      subject,
      html,
      text,
    });

    if (error) {
      console.error('Failed to send email:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Email error:', error);
    return { success: false, error };
  }
}

export function generateMagicLinkEmail(name: string, magicLink: string) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #faf9f7; padding: 40px 20px; margin: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" border="0" style="max-width: 480px; background: #ffffff; border-radius: 16px;">
          <tr>
            <td style="padding: 40px;">
              <!-- Logo -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <h1 style="color: #0d9488; font-size: 28px; margin: 0; font-weight: 700;">CircleDays</h1>
                  </td>
                </tr>
              </table>
              
              <!-- Greeting -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="color: #333333; font-size: 16px; line-height: 1.6; padding-bottom: 24px;">
                    Hi${name ? ` ${name}` : ''},
                  </td>
                </tr>
              </table>
              
              <!-- Message -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="color: #333333; font-size: 16px; line-height: 1.6; padding-bottom: 32px;">
                    Click the button below to sign in to CircleDays. This link will expire in 15 minutes.
                  </td>
                </tr>
              </table>
              
              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" bgcolor="#0d9488" style="background-color: #0d9488; border-radius: 8px;">
                          <a href="${magicLink}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">Sign In to CircleDays</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Alt link text -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="color: #666666; font-size: 14px; line-height: 1.6; padding-bottom: 16px;">
                    Or copy and paste this link into your browser:
                  </td>
                </tr>
              </table>
              
              <!-- Link -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-bottom: 32px;">
                    <a href="${magicLink}" style="color: #0d9488; font-size: 14px; word-break: break-all; text-decoration: none;">${magicLink}</a>
                  </td>
                </tr>
              </table>
              
              <!-- Footer -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="color: #999999; font-size: 12px;">
                    If you didn't request this email, you can safely ignore it.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
Hi${name ? ` ${name}` : ''},

Click the link below to sign in to CircleDays. This link will expire in 15 minutes.

${magicLink}

If you didn't request this email, you can safely ignore it.
  `.trim();

  return { html, text };
}

interface EventReminder {
  profileName: string;
  profilePhoto?: string | null;
  eventType: string;
  eventDate: string;
  age?: number;
  daysUntil: number;
}

export function generateReminderEmail(userName: string, events: EventReminder[], appUrl: string) {
  const eventItems = events.map(event => {
    const daysText = event.daysUntil === 0 ? 'Today' : event.daysUntil === 1 ? 'Tomorrow' : `In ${event.daysUntil} days`;
    const ageText = event.age ? ` - turning ${event.age}` : '';
    const initial = event.profileName.charAt(0).toUpperCase();
    
    return `
      <tr>
        <td style="padding: 12px 0;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f9fafb; border-radius: 12px;">
            <tr>
              <td style="padding: 16px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td width="48" valign="top">
                      ${event.profilePhoto 
                        ? `<img src="${event.profilePhoto}" width="48" height="48" style="width: 48px; height: 48px; border-radius: 50%; display: block;" alt="${event.profileName}">`
                        : `<table width="48" height="48" cellpadding="0" cellspacing="0" border="0" style="border-radius: 50%; background-color: #0d9488;"><tr><td align="center" valign="middle" style="color: #ffffff; font-weight: 600; font-size: 18px;">${initial}</td></tr></table>`
                      }
                    </td>
                    <td style="padding-left: 16px;" valign="middle">
                      <p style="margin: 0; font-weight: 600; color: #333333; font-size: 16px;">${event.profileName}</p>
                      <p style="margin: 4px 0 0; color: #666666; font-size: 14px;">${event.eventType} - ${event.eventDate}${ageText}</p>
                    </td>
                    <td width="100" align="right" valign="middle">
                      <span style="background-color: #e8f5f5; color: #0d9488; padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: 500; display: inline-block;">${daysText}</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
  }).join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #faf9f7; padding: 40px 20px; margin: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" border="0" style="max-width: 520px; background: #ffffff; border-radius: 16px;">
          <tr>
            <td style="padding: 40px;">
              <!-- Header -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <h1 style="color: #0d9488; font-size: 24px; margin: 0;">🎂 Upcoming Celebrations</h1>
                  </td>
                </tr>
              </table>
              
              <!-- Greeting -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="color: #333333; font-size: 16px; line-height: 1.6; padding-bottom: 24px;">
                    Hi ${userName}, here are your upcoming celebrations:
                  </td>
                </tr>
              </table>
              
              <!-- Events -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 32px;">
                ${eventItems}
              </table>
              
              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" bgcolor="#0d9488" style="background-color: #0d9488; border-radius: 8px;">
                          <a href="${appUrl}/dashboard" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">View in CircleDays</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Footer -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="color: #999999; font-size: 12px;">
                    <a href="${appUrl}/settings" style="color: #999999; text-decoration: none;">Manage notification preferences</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = events.map(event => {
    const daysText = event.daysUntil === 0 ? 'Today' : event.daysUntil === 1 ? 'Tomorrow' : `In ${event.daysUntil} days`;
    const ageText = event.age ? ` (turning ${event.age})` : '';
    return `${event.profileName}'s ${event.eventType} - ${event.eventDate}${ageText} - ${daysText}`;
  }).join('\n');

  return { html, text: `Hi ${userName},\n\nUpcoming celebrations:\n\n${text}\n\nView more at ${appUrl}/dashboard` };
}

export async function sendSuggestionEmail(
  to: string,
  recipientName: string,
  senderName: string,
  profileNames: string[],
  appUrl: string
) {
  const count = profileNames.length;
  const profileList = profileNames.slice(0, 5).join(', ') + (count > 5 ? ` and ${count - 5} more` : '');
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #faf9f7; padding: 40px 20px; margin: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" border="0" style="max-width: 480px; background: #ffffff; border-radius: 16px;">
          <tr>
            <td style="padding: 40px;">
              <!-- Logo -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <h1 style="color: #0d9488; font-size: 28px; margin: 0; font-weight: 700;">CircleDays</h1>
                  </td>
                </tr>
              </table>
              
              <!-- Greeting -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="color: #333333; font-size: 16px; line-height: 1.6; padding-bottom: 24px;">
                    Hi ${recipientName},
                  </td>
                </tr>
              </table>
              
              <!-- Message -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="color: #333333; font-size: 16px; line-height: 1.6; padding-bottom: 16px;">
                    <strong>${senderName}</strong> suggested ${count} ${count === 1 ? 'person' : 'people'} you might want to add to your connections:
                  </td>
                </tr>
              </table>
              
              <!-- Profile list -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background-color: #f5f5f4; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
                    <p style="color: #0d9488; font-size: 16px; font-weight: 600; margin: 0;">
                      ${profileList}
                    </p>
                  </td>
                </tr>
              </table>
              
              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding: 24px 0;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" bgcolor="#0d9488" style="background-color: #0d9488; border-radius: 8px;">
                          <a href="${appUrl}/dashboard" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">Review Suggestions</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Footer -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="color: #888888; font-size: 14px; padding-top: 16px; border-top: 1px solid #eeeeee;">
                    You can accept all at once or review each one individually.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `Hi ${recipientName},\n\n${senderName} suggested ${count} ${count === 1 ? 'person' : 'people'} you might want to add to your connections:\n\n${profileList}\n\nReview at ${appUrl}/dashboard`;

  return sendEmail({
    to,
    subject: `${senderName} suggested ${count} connection${count === 1 ? '' : 's'} for you`,
    html,
    text,
  });
}
