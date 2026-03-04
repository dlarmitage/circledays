import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { z } from 'zod';

const generateMessageSchema = z.object({
  profileId: z.string().uuid(),
  profileName: z.string(),
  eventType: z.string(), // 'birthday', 'anniversary', or custom label
  daysUntil: z.number().optional(), // Days until the event (0 = today, 1 = tomorrow, etc.)
  notes: z.string().optional(), // User's private notes (passed from modal)
  additionalContext: z.string().optional(), // User-provided context for this message
  tone: z.enum(['warm', 'casual', 'formal', 'playful']).default('warm'),
  feedback: z.string().optional(), // Regeneration feedback
  previousMessage: z.string().optional(), // For regeneration
});

export const POST = withAuth(async (request, _user) => {
  const body = await request.json();
  const data = generateMessageSchema.parse(body);

  const apiKey = process.env.KIMI_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      message: generateFallbackMessage(data.profileName, data.eventType, data.tone),
    });
  }

  // Build the prompt
  const toneDescriptions = {
    warm: 'warm, heartfelt, and sincere',
    casual: 'casual, friendly, and relaxed',
    formal: 'polite, respectful, and professional',
    playful: 'fun, lighthearted, with a touch of humor',
  };

  // Determine timing context for the message
  const isTomorrow = data.daysUntil === 1;
  const isUpcoming = data.daysUntil !== undefined && data.daysUntil > 1;

  let timingContext = '';
  if (isUpcoming) {
    timingContext = `\n\nIMPORTANT: The ${data.eventType} is in ${data.daysUntil} days, NOT today. Write a message to send ahead of the occasion. For example, "Your birthday is coming up!" or "Just wanted to wish you an early happy birthday!" - NOT "Happy Birthday" as if it were today.`;
  } else if (isTomorrow) {
    timingContext = `\n\nNote: The ${data.eventType} is tomorrow. You can write an early message or a day-of message.`;
  }

  let prompt = `Generate a short, thoughtful ${data.eventType === 'birthday' ? 'birthday' : data.eventType} message for ${data.profileName}.

The tone should be ${toneDescriptions[data.tone]}.

Keep the message concise - suitable for a text message or short email (2-4 sentences max).

IMPORTANT STYLE RULES:
- Do NOT use em-dashes (—) - they sound robotic and AI-generated
- You may use 1-2 emojis if appropriate, but sparingly
- Write like a real human would text or email a friend${timingContext}`;

  if (data.notes) {
    prompt += `\n\nHere are some personal notes about ${data.profileName} that might help personalize the message:\n${data.notes}`;
  }

  if (data.additionalContext) {
    prompt += `\n\nAdditional context for this message:\n${data.additionalContext}`;
  }

  if (data.feedback && data.previousMessage) {
    prompt += `\n\nPrevious message generated:\n"${data.previousMessage}"\n\nUser feedback for improvement:\n${data.feedback}`;
  }

  prompt += `\n\nGenerate ONLY the message text, nothing else. No quotes, no explanation, just the message itself.`;

  let message: string;
  try {
    const response = await fetch('https://api.moonshot.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        model: 'moonshot-v1-auto',
        max_tokens: 256,
        messages: [
          {
            role: 'system',
            content: 'You are a personal message writer. You write short, authentic messages for special occasions. Always incorporate any personal details provided to make the message feel genuine and specific to the person. Match the requested tone precisely.',
          },
          { role: 'user', content: prompt },
        ],
      }),
    });

    const result = await response.json();

    if (result.choices?.[0]?.message?.content) {
      message = result.choices[0].message.content.trim();
    } else {
      console.error('Unexpected Kimi API response:', result);
      message = generateFallbackMessage(data.profileName, data.eventType, data.tone);
    }
  } catch (apiError) {
    console.error('Kimi API error, using fallback:', apiError);
    message = generateFallbackMessage(data.profileName, data.eventType, data.tone);
  }

  return NextResponse.json({ message });
}, 'generate message');

function generateFallbackMessage(name: string, eventType: string, tone: string): string {
  const firstName = name.split(' ')[0];

  if (eventType === 'birthday') {
    switch (tone) {
      case 'playful':
        return `Happy Birthday, ${firstName}! 🎂 Hope your day is as amazing as you are!`;
      case 'formal':
        return `Wishing you a wonderful birthday, ${firstName}. May this year bring you joy and success.`;
      case 'casual':
        return `Happy Birthday ${firstName}! Hope you have an awesome day! 🎉`;
      default:
        return `Happy Birthday, ${firstName}! Thinking of you today and wishing you all the best. 💛`;
    }
  }

  if (eventType === 'anniversary') {
    return `Happy Anniversary! Wishing you continued love and happiness. 💕`;
  }

  return `Hope you have a wonderful ${eventType}! Thinking of you today.`;
}
