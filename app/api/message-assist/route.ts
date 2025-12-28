import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';
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

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const data = generateMessageSchema.parse(body);

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        message: generateFallbackMessage(data.profileName, data.eventType, data.tone),
      });
    }

    const anthropic = new Anthropic({ apiKey });

    // Build the prompt
    const toneDescriptions = {
      warm: 'warm, heartfelt, and sincere',
      casual: 'casual, friendly, and relaxed',
      formal: 'polite, respectful, and professional',
      playful: 'fun, lighthearted, with a touch of humor',
    };

    // Determine timing context for the message
    const isToday = data.daysUntil === 0;
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

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    });

    const message = response.content[0].type === 'text'
      ? response.content[0].text.trim()
      : generateFallbackMessage(data.profileName, data.eventType, data.tone);

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Message assist error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate message' },
      { status: 500 }
    );
  }
}

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

