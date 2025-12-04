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

export function generateReminderSms(events: EventReminder[]): string[] {
  const messages: string[] = [];
  
  for (const event of events) {
    const daysText = event.daysUntil === 0 ? 'today!' : event.daysUntil === 1 ? 'tomorrow!' : `in ${event.daysUntil} days`;
    const ageText = event.age ? ` (turning ${event.age})` : '';
    const emoji = event.eventType.toLowerCase() === 'birthday' ? '🎂' : 
                  event.eventType.toLowerCase() === 'anniversary' ? '❤️' : '🎉';
    
    // Clean, readable format
    const message = `${emoji} ${event.profileName}'s ${event.eventType}${ageText} is ${daysText} - ${event.eventDate}`;
    messages.push(message);
  }
  
  return messages;
}


