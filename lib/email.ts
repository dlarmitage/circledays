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
<body style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #faf9f7; padding: 40px 20px; margin: 0;">
  <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #0d5c5c; font-size: 28px; margin: 0;">CircleDays</h1>
    </div>
    
    <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
      Hi${name ? ` ${name}` : ''},
    </p>
    
    <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 32px;">
      Click the button below to sign in to CircleDays. This link will expire in 15 minutes.
    </p>
    
    <div style="text-align: center; margin-bottom: 32px;">
      <a href="${magicLink}" style="display: inline-block; background: linear-gradient(135deg, #0d5c5c 0%, #0a4a4a 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Sign In to CircleDays
      </a>
    </div>
    
    <p style="color: #666; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
      Or copy and paste this link into your browser:
    </p>
    
    <p style="color: #0d5c5c; font-size: 14px; word-break: break-all; background: #f5f5f5; padding: 12px; border-radius: 8px; margin-bottom: 32px;">
      ${magicLink}
    </p>
    
    <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
      If you didn't request this email, you can safely ignore it.
    </p>
  </div>
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
    
    return `
      <div style="display: flex; align-items: center; padding: 16px; background: #f9fafb; border-radius: 12px; margin-bottom: 12px;">
        <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #0d5c5c 0%, #0a4a4a 100%); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; margin-right: 16px; flex-shrink: 0;">
          ${event.profilePhoto ? `<img src="${event.profilePhoto}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` : event.profileName.charAt(0).toUpperCase()}
        </div>
        <div style="flex: 1;">
          <p style="margin: 0; font-weight: 600; color: #333;">${event.profileName}</p>
          <p style="margin: 4px 0 0; color: #666; font-size: 14px;">${event.eventType} - ${event.eventDate}${ageText}</p>
        </div>
        <div style="background: #e8f5f5; color: #0d5c5c; padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: 500;">
          ${daysText}
        </div>
      </div>
    `;
  }).join('');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #faf9f7; padding: 40px 20px; margin: 0;">
  <div style="max-width: 520px; margin: 0 auto; background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #0d5c5c; font-size: 24px; margin: 0;">🎂 Upcoming Celebrations</h1>
    </div>
    
    <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
      Hi ${userName}, here are your upcoming celebrations:
    </p>
    
    <div style="margin-bottom: 32px;">
      ${eventItems}
    </div>
    
    <div style="text-align: center; margin-bottom: 24px;">
      <a href="${appUrl}/dashboard" style="display: inline-block; background: linear-gradient(135deg, #0d5c5c 0%, #0a4a4a 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        View in CircleDays
      </a>
    </div>
    
    <p style="color: #999; font-size: 12px; text-align: center; margin: 0;">
      <a href="${appUrl}/settings" style="color: #999;">Manage notification preferences</a>
    </p>
  </div>
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
