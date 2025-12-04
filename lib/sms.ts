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
  
  // Format that helps iOS/macOS data detectors create better calendar events
  // Structure: "Event Title on Date (context)"
  for (const event of events) {
    const ageText = event.age ? ` turning ${event.age}` : '';
    const daysText = event.daysUntil === 0 ? 'Today!' : event.daysUntil === 1 ? 'Tomorrow!' : `in ${event.daysUntil} days`;
    
    // Format: "Person's Birthday on December 10 (in 3 days)"
    // This helps data detectors use "Person's Birthday" as the calendar event title
    const eventTitle = `${event.profileName}'s ${event.eventType}${ageText}`;
    const message = `🎂 ${eventTitle} on ${event.eventDate} (${daysText})`;
    messages.push(message);
  }
  
  return messages;
}


