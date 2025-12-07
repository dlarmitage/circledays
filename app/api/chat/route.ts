import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load knowledge base at module level (cached)
let knowledgeBase: string | null = null;

function getKnowledgeBase(): string {
  if (knowledgeBase) return knowledgeBase;
  
  // Load from the full knowledge base file
  try {
    const filePath = join(process.cwd(), 'KNOWLEDGE_BASE.md');
    knowledgeBase = readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error('Failed to load KNOWLEDGE_BASE.md, using fallback');
    // Fallback condensed version if file not found
    knowledgeBase = `
# CircleDays Help Assistant Knowledge Base

## What is CircleDays?
CircleDays is a birthday and special occasion reminder app built around a social graph model. You connect with others and share the responsibility of tracking important dates.

## Core Concepts

### Profiles
A Profile represents a person. Profiles can be:
- **Linked (claimed)**: The person has an account and owns their profile
- **Unlinked (unclaimed)**: Created by someone else, not yet claimed

### Connections
Two-way relationships between profiles. If connected:
- You see their events and get reminders
- You can add events to their profile
- You can view their connections (2nd-order discovery)
- You can add private notes about them

### Events
1. **Birthday**: Always recurring yearly
2. **Anniversary**: Always recurring yearly
3. **Custom Event**: Can be recurring (yearly) or one-time

**Visibility**: Shared (all connections see it) or Private (only you see it)

**Unknown Birth Year**: Check "I don't know the birth year" - no age calculated but reminders still work.

### Notes
Private annotations only you can see - never shared with others. Notes auto-save as you type.

## Features

### Dashboard
Shows upcoming events for next 30/90 days, grouped by:
- Today
- Tomorrow
- This Week
- Next Four Weeks (8-30 days away)
- Later

**Message Assist**: For events today/tomorrow, generate AI-powered messages with your notes.

### Connections Page
- Lists all your connections sorted by last name, then first name
- Drill into someone's connections by tapping their count
- **Full color** = Your connection too
- **Grayed out** = Their connection, not yours (tap to connect)
- **Select mode**: Check profiles → Suggest to someone with an account

### Adding a Person
1. Enter name (automatically capitalized)
2. Enter birthday (can skip year)
3. Add photo (upload or paste from clipboard)
4. System checks for duplicates using smart name matching

### Profile Page
- View/edit events
- Add private notes (auto-saves)
- Invite them to create account (if unlinked)
- See their connections

### Inviting Someone
For unlinked profiles you created:
1. Tap "Invite"
2. Enter email
3. Choose seed connections (just you, all, or custom)
4. They receive email to claim profile
5. Suggestions you made are preserved and not overwritten

### Suggesting Connections
1. Select mode on Connections
2. Check profiles to suggest
3. Tap "Suggest"
4. For unclaimed profiles: Auto-connects when they join
5. For accounts: Creates suggestion notification
6. Option to "Connect together" for unclaimed profiles

### Calendar
- **Calendar view**: Monthly with avatar badges (🎂 birthday, ❤️ anniversary, 🎆 custom)
- **List view**: All events for next 12 months, grouped by timeframe

### Settings
- Profile photo/name/timezone
- Reminder timing (day of, 1/3/7/14 days before)
- Notification method (email, SMS, both)
- My Events: See/edit/add events on your own profile
- Update email (requires confirmation)
- Sign out

## Privacy
- Email/mobile: Only you can see
- Private events: Only creator sees/gets reminders
- Notes: Completely private
- Once you claim a profile, only you can edit it (except platform admins)

## Common Questions

**Why is someone grayed out?** They're your friend's connection but not yours. Tap to connect.

**How do I fix my birthday?** Settings → My Events → Edit

**What's the lock icon?** Private event - only you see it.

**Why no reminders?** Only users with accounts get reminders. Make sure notification settings are configured.

**How do I add my birthday?** Settings → My Events → Add

**Can others see my notes?** No, notes are completely private.

**How do I paste a photo?** When adding/editing a profile photo, just press Ctrl/Cmd+V to paste from clipboard.

## Tips
- Add family first, then suggest them to each other
- Set multiple reminder times (1 week + day of)
- Use private events for personal milestones
- Install as PWA for phone access
- Use Message Assist for events today/tomorrow
- Paste photos directly from clipboard for quick additions
`;
  }
  
  return knowledgeBase;
}

const SYSTEM_PROMPT = `You are the CircleDays Help Assistant - a friendly, knowledgeable guide for users of the CircleDays app.

Your personality:
- Warm and helpful
- Concise but thorough
- Use emojis sparingly but appropriately 🎂
- If you don't know something, say so honestly

Your knowledge comes from the following documentation:

${getKnowledgeBase()}

Guidelines:
- Answer questions about how to use CircleDays
- Explain features and concepts clearly
- Provide step-by-step instructions when helpful
- If asked about something not in your knowledge, say "I'm not sure about that specific feature. You might want to check with the CircleDays team."
- Don't make up features that don't exist
- Keep responses focused and actionable
- IMPORTANT: You will be told if the user is an admin. Only discuss admin features if they are an admin. If a non-admin asks about admin features, politely decline and explain those features are only available to platform administrators.`;

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const isAdmin = user.isPlatformAdmin || false;
    
    const { message, history = [] } = await request.json();
    
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }
    
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      // Fallback response when API key not configured
      return NextResponse.json({
        response: "I'm the CircleDays Help Assistant, but I'm not fully configured yet. The team needs to add the ANTHROPIC_API_KEY to enable AI responses. In the meantime, you can check the Settings page or explore the app!",
      });
    }
    
    const anthropic = new Anthropic({ apiKey });
    
    // Build system prompt with admin context
    const systemPrompt = isAdmin 
      ? SYSTEM_PROMPT + '\n\nIMPORTANT: The user is a platform admin. You can discuss admin features with them.'
      : SYSTEM_PROMPT + '\n\nIMPORTANT: The user is NOT an admin. Do NOT mention or discuss any admin-only features. If asked about admin features, politely decline and say those features are only available to platform administrators.';
    
    // Build messages array with history
    const messages: Anthropic.MessageParam[] = [
      ...history.map((h: { role: string; content: string }) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user', content: message },
    ];
    
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307', // Fast and cheap for support
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });
    
    const assistantMessage = response.content[0].type === 'text' 
      ? response.content[0].text 
      : 'I had trouble generating a response. Please try again.';
    
    return NextResponse.json({ response: assistantMessage });
  } catch (error) {
    console.error('Chat API error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    );
  }
}

