import twilio from 'twilio';

const client = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

interface SendSmsOptions {
  to: string;
  body: string;
}

export async function sendSms({ to, body }: SendSmsOptions) {
  if (!client || !process.env.TWILIO_PHONE_NUMBER) {
    console.log('📱 SMS would be sent to:', to);
    console.log('Message:', body);
    console.log('---');
    return { success: true, mock: true };
  }

  try {
    const message = await client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    });

    return { success: true, sid: message.sid };
  } catch (error) {
    console.error('SMS error:', error);
    return { success: false, error };
  }
}

interface EventReminder {
  profileName: string;
  eventType: string;
  eventDate: string;
  daysUntil: number;
  age?: number;
}

function getCardNudgeSms(daysUntil: number): string | null {
  if (daysUntil >= 14) return 'Now is a perfect time to schedule a handwritten card, and we\'ll make sure it gets there on time.';
  if (daysUntil === 7) return 'Today is the last day to send a card and make sure that it will get there on time.';
  if (daysUntil <= 3) return 'A handwritten card might get there a little late, but it\'s sure to brighten up their day.';
  return null;
}

export function generateReminderSms(events: EventReminder[], appUrl?: string): string[] {
  const messages: string[] = [];
  const link = appUrl ? `\n\nSee what's coming up: ${appUrl}/dashboard` : '';

  for (const event of events) {
    const daysText = event.daysUntil === 0 ? 'today!' : event.daysUntil === 1 ? 'tomorrow!' : `in ${event.daysUntil} days`;
    const ageText = event.age ? ` (turning ${event.age})` : '';
    const emoji = event.eventType.toLowerCase() === 'birthday' ? '🎂' :
      event.eventType.toLowerCase() === 'anniversary' ? '❤️' : '🎉';

    const cardNudge = getCardNudgeSms(event.daysUntil);
    const cardLine = cardNudge ? `\n\n${cardNudge}` : '';

    const message = `${emoji} ${event.profileName}'s ${event.eventType}${ageText} is ${daysText} - ${event.eventDate}${cardLine}${link}`;
    messages.push(message);
  }

  return messages;
}

export function generateNudgeSms(settingsUrl: string, optOutUrl: string): string {
  return `CircleDays: Did you know you can get reminders by email too? Turn it on in settings: ${settingsUrl}\n\nNo thanks: ${optOutUrl}`;
}

export function generateInviteSms(inviterName: string, profileName: string, inviteUrl: string): string {
  return `${inviterName} invited you to CircleDays! Claim your profile as "${profileName}" and never miss special dates: ${inviteUrl}`;
}


