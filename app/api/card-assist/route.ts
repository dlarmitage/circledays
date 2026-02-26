import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { CARD_CHAR_LIMIT } from '@/lib/constants';

const cardAssistSchema = z.object({
  profileName: z.string(),
  eventType: z.string(),
  daysUntil: z.number().optional(),
  notes: z.string().optional(),
  additionalContext: z.string().optional(),
  isLate: z.boolean().optional(), // user is sending after the occasion
});

export async function POST(request: NextRequest) {
  try {
    await requireAuth();
    const body = await request.json();
    const data = cardAssistSchema.parse(body);

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        message: generateFallbackCardMessage(data.profileName, data.eventType),
      });
    }

    const anthropic = new Anthropic({ apiKey });

    const isToday = data.daysUntil === 0;
    const isLate = data.isLate === true;

    let timingContext = '';
    if (isLate) {
      timingContext = `\n\nThe occasion has already passed. Write a warm, lighthearted message that acknowledges the card is arriving a little late. Something like "Better late than never!" Keep it warm, not apologetic.`;
    } else if (data.daysUntil !== undefined && data.daysUntil > 1) {
      timingContext = `\n\nThe ${data.eventType} is in ${data.daysUntil} days. Write a message that warmly anticipates the occasion ahead of time — NOT as if it's happening today.`;
    } else if (isToday) {
      timingContext = `\n\nThe ${data.eventType} is today.`;
    }

    let prompt = `Write a warm, personal message for a handwritten card for ${data.profileName}'s ${data.eventType}.

This is a PHYSICAL handwritten card, so the tone should feel personal and genuine, not like a text message.

CRITICAL CONSTRAINT: The message must be ${Math.floor(CARD_CHAR_LIMIT * 0.88)} characters or fewer (aim for 250-280). Count carefully. This is a hard limit — the physical card cannot fit more.

Style guidance:
- Write in first person, as if from the sender
- Warm and sincere
- Do NOT use em-dashes (—)
- No hashtags, no URLs
- A handwritten card is a keepsake — make it meaningful${timingContext}`;

    if (data.notes) {
      prompt += `\n\nPersonal notes about ${data.profileName} (use these to personalize the message):\n${data.notes}`;
    }

    if (data.additionalContext) {
      prompt += `\n\nAdditional context for this card:\n${data.additionalContext}`;
    }

    prompt += `\n\nGenerate ONLY the card message text. No quotes, no preamble, no explanation. Just the message itself. Stay under ${Math.floor(CARD_CHAR_LIMIT * 0.88)} characters — finish with a complete sentence.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });

    let message = response.content[0].type === 'text'
      ? response.content[0].text.trim()
      : generateFallbackCardMessage(data.profileName, data.eventType);

    // Safety net truncation — cut at the last sentence boundary within the limit
    if (message.length > CARD_CHAR_LIMIT) {
      const truncated = message.slice(0, CARD_CHAR_LIMIT);
      const lastSentenceEnd = Math.max(
        truncated.lastIndexOf('. '),
        truncated.lastIndexOf('! '),
        truncated.lastIndexOf('? '),
        truncated.lastIndexOf('.\n'),
      );
      message = lastSentenceEnd > 0
        ? message.slice(0, lastSentenceEnd + 1).trimEnd()
        : truncated.slice(0, truncated.lastIndexOf(' ')).trimEnd();
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Card assist error:', error);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid data', details: error.issues }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to generate card message' }, { status: 500 });
  }
}

function generateFallbackCardMessage(name: string, eventType: string): string {
  const firstName = name.split(' ')[0];
  if (eventType === 'birthday') {
    return `Wishing you a wonderful birthday, ${firstName}! Hope your day is filled with joy and all the things you love. Thinking of you and sending my warmest wishes.`;
  }
  if (eventType === 'anniversary') {
    return `Happy Anniversary! Wishing you both continued love, laughter, and happiness together. Here's to many more beautiful years ahead.`;
  }
  return `Thinking of you on this special occasion, ${firstName}. Hope it's everything you hoped for and more. Sending warmth and good wishes your way.`;
}
