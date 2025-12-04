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
  daysUntil: number;
  age?: number;
}

export function generateReminderSms(events: EventReminder[]): string[] {
  const messages: string[] = [];
  
  // Batch up to 3 events per message
  for (let i = 0; i < events.length; i += 3) {
    const batch = events.slice(i, i + 3);
    
    const items = batch.map(event => {
      const daysText = event.daysUntil === 0 ? 'today' : event.daysUntil === 1 ? 'tomorrow' : `in ${event.daysUntil} days`;
      const ageText = event.age ? ` (turning ${event.age})` : '';
      return `${event.profileName}'s ${event.eventType.toLowerCase()} ${daysText}${ageText}`;
    });
    
    const message = `🎂 CircleDays: ${items.join(', ')}`;
    messages.push(message);
  }
  
  return messages;
}

