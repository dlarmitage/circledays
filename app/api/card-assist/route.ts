import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { z } from 'zod';
import { CARD_CHAR_LIMIT } from '@/lib/constants';

const cardAssistSchema = z.object({
  profileName: z.string(),
  eventType: z.string(),
  daysUntil: z.number().optional(),
  notes: z.string().optional(),
  additionalContext: z.string().optional(),
  isLate: z.boolean().optional(),
  charLimit: z.number().optional(), // per-card character limit from Handwrytten
  senderName: z.string().optional(), // sender's name for signing the card
  signOff: z.string().optional(), // preferred sign-off (e.g. "Warmly, David")
  tone: z.string().optional(), // desired tone (e.g. "warm", "funny", "heartfelt")
});

export const POST = withAuth(async (request, user) => {
  const body = await request.json();
  const data = cardAssistSchema.parse(body);

  const limit = data.charLimit ?? CARD_CHAR_LIMIT;

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      message: generateFallbackCardMessage(data.profileName, data.eventType),
    });
  }

  const isToday = data.daysUntil === 0;
  const isLate = data.isLate === true;

  // Sign-off preference (e.g. "Warmly, David") or fall back to first name
  const signOff = data.signOff || null;
  const senderFirst = signOff
    ? (signOff.includes(',') ? signOff.split(',').pop()!.trim() : signOff)
    : (data.senderName || user.name || '').split(' ')[0];

  // Reserve space for the sign-off so the AI writes a shorter body
  const expectedSignOff = signOff || senderFirst || null;
  const signOffReserve = expectedSignOff ? expectedSignOff.length + 2 : 0; // +2 for \n\n
  const bodyLimit = limit - signOffReserve;
  const targetLength = Math.floor(bodyLimit * 0.88);
  const recipientFirst = data.profileName.split(' ')[0];

  // Build timing context
  let timingContext = '';
  if (isLate) {
    timingContext = `The card is arriving after the occasion. Weave in a brief, charming acknowledgment that it's late — don't belabor it or over-apologize, just a quick wink at the timing before moving on to the real sentiment.`;
  } else if (data.daysUntil !== undefined && data.daysUntil > 1) {
    timingContext = `The ${data.eventType} is in ${data.daysUntil} days. Write as if the card will arrive around that time — anticipate it, don't write as if it's today.`;
  } else if (isToday) {
    timingContext = `The ${data.eventType} is today.`;
  }

  // Build tone guidance — each tone gets specific creative direction
  const toneGuides: Record<string, string> = {
    'warm and sincere': `Write with genuine warmth. Be specific about what this person means to you. Avoid generic sentiments — instead of "you're amazing," recall a quality or moment that shows it. Think of how you'd talk to this person over coffee.`,
    'funny and lighthearted': `Lead with humor — an inside joke, a playful observation, or a witty line. The humor should feel natural, not forced. It's okay to be a little irreverent. Still end with a genuine sentiment underneath the laughs. Think of the funniest person at the party writing a card.`,
    'heartfelt and emotional': `Go deep. Be vulnerable. Say the thing that's hard to say out loud but easy to write in a card. Reference specific moments, qualities, or feelings. This card should make the reader pause and maybe get a little misty-eyed.`,
    'casual and friendly': `Write like you're texting a good friend — but with more care. Keep it breezy and natural. Short sentences are fine. Don't try too hard. The charm is in the effortlessness. Think of a note you'd tuck into a gift bag.`,
    'grateful and appreciative': `Focus on what this person has done, who they are, and how they've impacted your life. Be specific — name the thing you're grateful for. Gratitude lands hardest when it's detailed, not abstract.`,
  };
  const toneGuide = toneGuides[data.tone || 'warm and sincere'] || toneGuides['warm and sincere'];

  let prompt = `Write a message for a handwritten card for ${recipientFirst}'s ${data.eventType}.

WHO IS WRITING: ${senderFirst || 'The sender'}, writing to ${recipientFirst}.

TONE & VOICE:
${toneGuide}

WHAT MAKES A GREAT CARD MESSAGE:
- Open with something specific and personal — not "Dear ${recipientFirst}," followed by a generic wish
- Weave in personal details naturally, as if you actually know this person (because you do)
- Vary your sentence structure — mix short punchy lines with longer flowing ones
- End with something forward-looking or a specific wish — do NOT add a sign-off (we append "${expectedSignOff}" automatically)
- The best cards feel like a conversation, not a Hallmark template

AVOID THESE CLICHÉS:
- "Wishing you a wonderful/amazing/fantastic [occasion]"
- "May this year bring you..."
- "Hope your day is filled with..."
- "Here's to many more..."
- "Sending you love/warmth/wishes"
- Starting every sentence with "I"
- Listing generic virtues ("your kindness, your generosity, your strength")

HARD RULES:
- Max ${targetLength} characters (aim for ${Math.floor(targetLength * 0.85)}-${targetLength})
- No em-dashes (—), no hashtags, no URLs, no brackets, no placeholder text
- Do NOT include a sign-off or sender name at the end — we will add "${expectedSignOff}" automatically after your message
- End the message with your final sentiment, not a signature`;

  if (timingContext) {
    prompt += `\n\nTIMING: ${timingContext}`;
  }

  if (data.notes) {
    prompt += `\n\nWHAT YOU KNOW ABOUT ${recipientFirst.toUpperCase()} (use these to make it personal):\n${data.notes}`;
  }

  if (data.additionalContext) {
    prompt += `\n\nSPECIFIC THINGS TO MENTION:\n${data.additionalContext}`;
  }

  prompt += `\n\nNow write the card message. Output ONLY the message text — no quotes, no preamble, no explanation.`;

  let message: string;
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        temperature: 0.9,
        system: `You ghost-write handwritten card messages. Your writing sounds like a real person — not a greeting card company. You have range: you can be funny, tender, irreverent, or deeply sincere depending on what's asked. You never sound generic. Every message you write could only be for this specific person. You never use em-dashes. You keep it under the character limit.`,
        messages: [
          { role: 'user', content: prompt },
        ],
      }),
    });

    const result = await response.json();

    if (result.content?.[0]?.text) {
      message = result.content[0].text.trim();
    } else {
      console.error('Unexpected Anthropic API response:', result);
      message = generateFallbackCardMessage(data.profileName, data.eventType);
    }
  } catch (apiError) {
    console.error('Anthropic API error, using fallback:', apiError);
    message = generateFallbackCardMessage(data.profileName, data.eventType);
  }

  // Strip preamble — only match obvious meta-lines at the very start
  message = message.replace(/^(?:(?:here(?:'s| is)|sure|absolutely)[^\n]*(?:message|card)[^\n]*\n+)/i, '');
  message = message.replace(/^---+\n*/gm, '').replace(/\n*---+$/g, '').trim();

  // Safety net — replace any leftover placeholder text
  if (data.senderName) {
    const firstName = data.senderName.split(' ')[0];
    message = message.replace(/\[Your Name\]/gi, firstName);
    message = message.replace(/\[Name\]/gi, firstName);
    message = message.replace(/\[Sender\]/gi, firstName);
    message = message.replace(/\[Sender's Name\]/gi, firstName);
  }
  // Remove literal "A warm closing" that the model sometimes outputs
  message = message.replace(/\n*A warm closing[.,]?\s*$/i, '');
  // Strip em-dashes (often used in sign-offs like "— Dave") and emojis
  message = message.replace(/—\s*/g, '');
  message = message.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();

  // Strip any sign-off the model added despite instructions not to
  if (expectedSignOff) {
    const nameToCheck = signOff
      ? (signOff.includes(',') ? signOff.split(',').pop()!.trim() : signOff)
      : senderFirst;
    const lines = message.split('\n');
    // Remove trailing lines that look like a sign-off (contain the sender's name)
    while (lines.length > 1) {
      const last = lines[lines.length - 1].trim();
      if (last && last.toLowerCase().includes(nameToCheck.toLowerCase())) {
        lines.pop();
      } else break;
    }
    message = lines.join('\n').trimEnd();
  }

  // Truncate body to leave room for sign-off
  if (message.length > bodyLimit) {
    const truncated = message.slice(0, bodyLimit);
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

  // Always append the sign-off
  if (expectedSignOff) {
    message = message.trimEnd() + '\n\n' + expectedSignOff;
  }

  return NextResponse.json({ message });
}, 'generate card message');

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
