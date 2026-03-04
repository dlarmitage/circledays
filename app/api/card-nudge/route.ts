import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { z } from 'zod';

const cardNudgeSchema = z.object({
  firstName: z.string().min(1),
  eventContext: z.string().optional(),
});

function generateFallbackNudge(firstName: string): string {
  const nudges = [
    `Surprise ${firstName} with a handwritten card`,
    `Brighten ${firstName}'s day with a card`,
    `Send ${firstName} a card, just because`,
    `Make ${firstName}'s day — send a card`,
    `A handwritten card for ${firstName}? Great idea`,
  ];
  return nudges[Math.floor(Math.random() * nudges.length)];
}

export const POST = withAuth(async (request, _user) => {
  const body = await request.json();
  const data = cardNudgeSchema.parse(body);

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ nudge: generateFallbackNudge(data.firstName) });
  }

  const eventHint = data.eventContext ? ` Context: ${data.eventContext}.` : '';

  let nudge: string;
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 80,
        temperature: 1.0,
        system: `You write brief, playful, warm one-liner prompts that nudge someone to send a handwritten card to a friend. You never sound salesy or pushy. You sound like a thoughtful friend whispering a suggestion. Keep it to one sentence, under 60 characters if possible. Never use quotes around the output. Always include the person's first name naturally. Never use em-dashes or emojis.`,
        messages: [
          {
            role: 'user',
            content: `Write a single nudge sentence encouraging someone to send a handwritten card to ${data.firstName}.${eventHint} Just output the sentence, nothing else.`,
          },
        ],
      }),
    });

    const result = await response.json();

    if (result.content?.[0]?.text) {
      nudge = result.content[0].text.trim();
      // Strip quotes, em-dashes, emojis
      nudge = nudge.replace(/^["']|["']$/g, '');
      nudge = nudge.replace(/—/g, '—').replace(/—\s*/g, '');
      nudge = nudge.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
    } else {
      nudge = generateFallbackNudge(data.firstName);
    }
  } catch (apiError) {
    console.error('Card nudge API error, using fallback:', apiError);
    nudge = generateFallbackNudge(data.firstName);
  }

  return NextResponse.json({ nudge });
}, 'generate card nudge');
