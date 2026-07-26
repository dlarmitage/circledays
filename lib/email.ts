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
      from: process.env.EMAIL_FROM || 'CircleDays <admin@ambient.technology>',
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

export function generateMagicLinkEmail(name: string, magicLink: string, code: string) {
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
              
              <!-- Verification Code Section -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding: 24px; background-color: #f5f5f4; border-radius: 12px; margin-bottom: 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="color: #666666; font-size: 14px; padding-bottom: 12px;">
                          Using the app on your phone? Enter this code:
                        </td>
                      </tr>
                      <tr>
                        <td align="center">
                          <table cellpadding="0" cellspacing="0" border="0" style="border: 2px solid #0d9488; border-radius: 8px; background-color: #ffffff;">
                            <tr>
                              <td style="padding: 12px 24px;">
                                <span style="font-family: 'SF Mono', Monaco, 'Courier New', monospace; font-size: 28px; font-weight: 700; color: #0d9488; letter-spacing: 6px;">${code}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <!-- Alt link text -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="color: #666666; font-size: 14px; line-height: 1.6; padding-top: 24px; padding-bottom: 16px;">
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

Or enter this verification code in the app: ${code}

If you didn't request this email, you can safely ignore it.
  `.trim();

  return { html, text };
}

export function generateEmailConfirmationEmail(name: string, confirmationLink: string, newEmail: string) {
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
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 32px; text-align: center;">
              <h1 style="margin: 0 0 24px; font-size: 28px; font-weight: 700; color: #0d9488;">Confirm Your New Email</h1>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #333333;">
                Hi ${name},
              </p>
              <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.6; color: #333333;">
                You requested to change your email address to <strong>${newEmail}</strong>. Click the button below to confirm this change.
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 32px 0;">
                <tr>
                  <td align="center">
                    <a href="${confirmationLink}" style="display: inline-block; padding: 14px 32px; background-color: #0d9488; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Confirm Email Change</a>
                  </td>
                </tr>
              </table>
              <p style="margin: 24px 0 0; font-size: 14px; line-height: 1.6; color: #666666;">
                If you didn't request this change, you can safely ignore this email. Your current email will remain unchanged.
              </p>
              <p style="margin: 16px 0 0; font-size: 12px; line-height: 1.6; color: #999999;">
                This link will expire in 24 hours.
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

  const text = `
Confirm Your New Email

Hi ${name},

You requested to change your email address to ${newEmail}. Click the link below to confirm this change:

${confirmationLink}

If you didn't request this change, you can safely ignore this email. Your current email will remain unchanged.

This link will expire in 24 hours.
  `.trim();

  return { html, text };
}

interface EventReminder {
  profileId?: string;
  profileName: string;
  profilePhoto?: string | null;
  eventType: string;
  eventDate: string;
  age?: number;
  daysUntil: number;
  cardOrdered?: boolean;
}

function getCardNudgeMessage(daysUntil: number): string | null {
  if (daysUntil >= 14) return 'Now is a perfect time to schedule a handwritten card, and we\'ll make sure it gets there on time.';
  if (daysUntil === 7) return 'Today is the last day to send a card and make sure that it will get there on time.';
  if (daysUntil <= 3) return 'A handwritten card might get there a little late, but it\'s sure to brighten up their day.';
  return null;
}

export function generateReminderEmail(userName: string, events: EventReminder[], appUrl: string) {
  const eventItems = events.map(event => {
    const daysText = event.daysUntil === 0 ? 'Today' : event.daysUntil === 1 ? 'Tomorrow' : `In ${event.daysUntil} days`;
    const ageText = event.age ? ` - turning ${event.age}` : '';
    const initial = event.profileName.charAt(0).toUpperCase();
    const cardNudge = event.cardOrdered ? null : getCardNudgeMessage(event.daysUntil);

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
                ${cardNudge ? `
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 12px;">
                  <tr>
                    <td style="padding: 10px 12px; background-color: #fef3c7; border-radius: 8px;">
                      <p style="margin: 0; color: #92400e; font-size: 13px; line-height: 1.5;">&#9993; ${cardNudge} <a href="${appUrl}/profile/${event.profileId || ''}" style="color: #0d9488; font-weight: 600; text-decoration: none;">Send a card</a></p>
                    </td>
                  </tr>
                </table>
                ` : ''}
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
              
              <!-- CTA prompt -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="color: #666666; font-size: 14px; line-height: 1.6; padding-bottom: 16px;">
                    See what other birthdays and special events are coming up in the weeks ahead.
                  </td>
                </tr>
              </table>

              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" bgcolor="#0d9488" style="background-color: #0d9488; border-radius: 8px;">
                          <a href="${appUrl}/dashboard" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">Open CircleDays</a>
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
    const cardNudge = event.cardOrdered ? null : getCardNudgeMessage(event.daysUntil);
    const cardLine = cardNudge ? `\n  ${cardNudge} Send a card: ${appUrl}/profile/${event.profileId || ''}` : '';
    return `${event.profileName}'s ${event.eventType} - ${event.eventDate}${ageText} - ${daysText}${cardLine}`;
  }).join('\n\n');

  return { html, text: `Hi ${userName},\n\nUpcoming celebrations:\n\n${text}\n\nSee what other birthdays and special events are coming up in the weeks ahead:\n${appUrl}/dashboard` };
}

export function generateNudgeEmail(
  userName: string,
  currentChannel: 'email' | 'sms' | 'both',
  hasMobile: boolean,
  settingsUrl: string,
  optOutUrl: string,
) {
  // Determine what the user is missing
  const missingSms = currentChannel === 'email';
  const missingEmail = currentChannel === 'sms';
  const needsMobile = missingSms && !hasMobile;

  let nudgeMessage: string;
  let nudgeDetail: string;

  if (missingSms) {
    nudgeMessage = 'Get reminders by text too';
    nudgeDetail = needsMobile
      ? 'Add your mobile number and turn on SMS reminders so you never miss a special day — even when you\'re away from email.'
      : 'Turn on SMS reminders so you never miss a special day — even when you\'re away from email.';
  } else if (missingEmail) {
    nudgeMessage = 'Get reminders by email too';
    nudgeDetail = 'Turn on email reminders so you get a detailed summary of upcoming celebrations right in your inbox.';
  } else {
    // Shouldn't happen (both enabled) but handle gracefully
    nudgeMessage = 'Stay up to date';
    nudgeDetail = 'Make sure your notification preferences are just the way you like them.';
  }

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
                    Hi ${userName},
                  </td>
                </tr>
              </table>

              <!-- Nudge header -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-bottom: 16px;">
                    <h2 style="color: #333333; font-size: 20px; margin: 0; font-weight: 600;">${nudgeMessage}</h2>
                  </td>
                </tr>
              </table>

              <!-- Nudge detail -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="color: #555555; font-size: 16px; line-height: 1.6; padding-bottom: 32px;">
                    ${nudgeDetail}
                  </td>
                </tr>
              </table>

              <!-- Update Settings Button -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 16px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" bgcolor="#0d9488" style="background-color: #0d9488; border-radius: 8px;">
                          <a href="${settingsUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none;">Update My Settings</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Opt-out link -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 32px;">
                    <a href="${optOutUrl}" style="color: #999999; font-size: 14px; text-decoration: none;">No thanks, I'm all set</a>
                  </td>
                </tr>
              </table>

              <!-- Footer -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="color: #999999; font-size: 12px; border-top: 1px solid #eeeeee; padding-top: 24px;">
                    This is a one-time reminder from CircleDays. You can stop these by clicking "No thanks" above.
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
Hi ${userName},

${nudgeMessage}

${nudgeDetail}

Update your settings: ${settingsUrl}

Don't want these reminders? Click here to opt out: ${optOutUrl}
  `.trim();

  return { html, text };
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
