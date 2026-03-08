# CircleDays Knowledge Base

> This document serves as the comprehensive knowledge source for the CircleDays AI assistant. It covers all features, concepts, and user flows in the application.

---

## What is CircleDays?

CircleDays is a **birthday and special occasion reminder app** built around a social graph model. Unlike traditional reminder apps where you manually track everyone yourself, CircleDays lets you **connect with others** and share the responsibility of keeping track of important dates.

**Core Philosophy**: "Never forget a birthday again" - but make it social and collaborative.

---

## Core Concepts

### Profiles
A **Profile** represents a person in the system. Every profile has:
- **Name** (required)
- **Profile Picture** (optional, can be cropped/centered)
- **Events** (birthdays, anniversaries, custom events)
- **Notes** (private annotations only you can see)

Profiles can be:
- **Linked** (claimed): Associated with a user account - the person has logged in and owns their profile
- **Unlinked** (unclaimed): Created by someone else, not yet associated with an account

### Users vs Profiles
- A **User** is someone with a login account (email-based, magic link authentication)
- A **Profile** is the data record representing a person
- When you create an account, a Profile is created for you automatically
- You can create Profiles for others (family, friends) who may or may not ever create accounts

### Connections
A **Connection** is a two-way relationship between profiles. If you're connected to someone:
- You can see their events and get reminders
- You can add events to their profile
- You can view their connections (2nd-order discovery)
- You can add private notes about them

Connections are **symmetric** - if you're connected to Kerry, Kerry is connected to you.

### Events
Events are special dates associated with a profile:

1. **Birthday**: The person's birthday (always recurring yearly)
2. **Anniversary**: A relationship anniversary (always recurring yearly)  
3. **Custom Event**: Any other special date
   - Can be **recurring** (every year) or **one-time** (like a graduation)
   - Has a custom label (e.g., "Work Anniversary", "First Date")

**Event Visibility**:
- **Shared**: All connections can see this event and get reminders
- **Private**: Only you (the creator) can see it and get reminders

**Unknown Birth Year**: If you don't know someone's birth year, you can check "I don't know the birth year" - they'll still get birthday reminders, but no age will be calculated or displayed.

### Notes
Notes are **private annotations** you can add to any profile you're connected to. Only you can see your notes - they're never shared with the profile owner or other connections.

---

## Features & How to Use Them

### Home / Dashboard
The dashboard shows your **upcoming events** for the next 30 or 90 days, grouped by:
- Today
- Tomorrow
- This Week
- Next Four Weeks (events 8-30 days away)
- Later

If someone has suggested connections for you, a **Suggested Connections card** appears at the top where you can accept or decline them.

**New Connections**: If someone connected with you, you'll see a notification showing who connected. You can:
- Keep the connection (green checkmark)
- Disconnect if you prefer not to be connected (red minus icon)

**Message Assist**: For events happening within the next week, you'll see a "Message Assist" button. This opens a modal where you can:
- View and edit your private notes about the person
- Generate an AI-powered message based on the event type, person's name, and your notes
- Refine the message tone (friendly, casual, formal, warm)
- Copy the message to your clipboard
Notes are automatically saved when you close the modal.

**Send Card**: For upcoming events, you'll see a "Send Card" button that opens the handwritten card ordering flow (see **Handwritten Cards** below). Once you've ordered a card for an event, the button changes to **"Card Ordered"** (green, with a checkmark) and links to the Cards dashboard instead.

### Connections (Network View)
The Connections page shows your social graph as a **hierarchical tree**:

**Your Connections View**:
- Lists all people you're directly connected to
- Sorted alphabetically by last name, then first name
- Shows their profile picture (or initials)
- Shows the count of their connections (tap to drill in)

**Drilling In**:
- Tap the number badge to see someone's connections
- Their connections appear in a list
- **Full color** = You're also connected to this person
- **Grayed out** = They're connected to your friend, but not to you
- Tap a grayed-out person to see a preview and connect

**Search**:
- The search bar searches **everyone** in the system, not just your connections
- Results show whether each person is connected to you or not

**Select Mode**:
- Tap "Select" to enter multi-select mode
- Check profiles you want to suggest to someone
- Tap "Suggest" to send them to a connection who has an account

### Adding a Person
Tap "+ Add" to create a new profile:
1. Enter their name (automatically capitalized - first letter of each word)
2. Enter their birthday (can check "I don't know the birth year")
3. Optionally add a photo:
   - Upload from file
   - **Paste from clipboard** (Ctrl/Cmd+V) - great for quick photo additions
   - Crop and center tool available
4. Save

The system checks for **duplicates** using smart name matching:
- Detects similar names even with different formats (e.g., "John Smith" vs "Smith, John")
- Handles married names (e.g., "Heidi Swartzendruber" vs "Heidi Hine Swartzendruber")
- If a duplicate is found, you'll be asked if it's the same person

### Profile Page
When viewing a profile:

**Header**:
- Photo and name
- Birthday and age (if known)
- "Days until birthday" countdown

**If it's your own profile or an unlinked profile you created**:
- "Edit Profile" button to change name/photo

**For any connection**:
- "Add Event" button to add birthdays, anniversaries, or custom events
- "My Notes" section for your private notes
- "Invite" button (if unlinked) to invite them to create an account

**Events Section**:
- Shows all events on this profile
- Tap an event to edit it (change date, type, visibility, delete)
- Private events show a 🔒 lock icon

**Connections Section**:
- Shows who this person is connected to
- You can tap to view those profiles

### Inviting Someone
If you've created a profile for someone (like a family member), you can invite them to claim it:

1. Go to their profile
2. Tap "Invite"
3. Enter their email
4. Choose what connections to seed them with:
   - **Just me**: They'll only be connected to you
   - **All my connections**: They'll be connected to everyone you're connected to
   - **Custom selection**: Pick specific people

They'll receive an email with a link to create their account and claim the profile.

### Suggesting Connections
If someone already has an account, you can suggest people they might want to connect with:

1. Go to Connections page
2. Tap "Select"
3. Check the profiles you want to suggest
4. Tap "Suggest"
5. If all selected profiles are unclaimed (no account), you can toggle "Connect these people to each other" - this will automatically connect them when any one of them joins
6. Send

**How it works**:
- For profiles with accounts: Creates a suggestion notification they'll see on their dashboard
- For unclaimed profiles: Automatically creates a connection (they'll be connected when they join)
- If you enable "Connect together", unclaimed profiles will also be connected to each other

Recipients with accounts will see the suggestions on their dashboard and can Accept All or accept/decline individually.

**Note**: If you've suggested connections and then send an invite, the suggestions are preserved - they won't be overwritten.

### Calendar
The Calendar page shows events in two views:

**Calendar View** (default):
- Monthly calendar with navigation arrows
- Days with events show mini avatars with emoji badges:
  - 🎂 Birthday
  - ❤️ Anniversary
  - 🎆 Custom event
- Tap a day to see event details below

**List View**:
- Shows all events for the next 12 months
- Grouped by timeframe (This Week, Next Four Weeks, Next 3 Months, Later This Year)
- Quick way to see everything coming up

### Settings
The Settings page lets you manage:

**Profile**:
- Your photo (with crop tool)
- Your name
- Your timezone

**Notifications**:
- **Remind me**: Choose when to get reminders (day of, 1 day, 3 days, 1 week, 2 weeks before)
- **Notification method**: Email, SMS, or both
- **Mobile number**: Required if using SMS
- Default settings for new users: Mountain Time timezone, 'both' notification channel (when phone provided), lead days of 0, 1, 3, 7, and 14 days

**My Events**:
- See and edit events on your own profile
- Add your birthday if it's missing
- Fix birth year if someone created your profile without it
- Add new events (birthdays, anniversaries, custom events)
- Control privacy settings for your events

**Card Preferences**:
- **Card Credits**: View your current credit balance
- **Card Sign-off**: Set a default sign-off for your handwritten cards
- **Sender Address**: Set and edit your default return address for cards
- **Order History**: View recent card orders with status

**Email Settings**:
- Update your email address
- When you change your email, you'll receive a confirmation email to the new address
- Your email won't change until you confirm it

**Sign Out**: Log out of your account

### Handwritten Cards
CircleDays lets you send **real handwritten cards** through a partnership with Handwrytten. Cards are written with pen and ink by robotic hands and mailed with a real stamp.

**Card Ordering Flow** (6 steps):

1. **Pick a Card**: Browse 100+ card designs organized by category (birthday, thank you, thinking of you, etc.). Tap a card to see the inside design.

2. **Compose Your Message**: Write your card message with a character limit based on the card. An **AI Message Assist** feature can generate a message for you — choose a tone (warm, funny, heartfelt, casual, formal) and the AI drafts a message based on the person's name, event type, and your notes. You can edit the AI-generated message before continuing.

3. **Preview**: See how your message looks on the card with the selected handwriting font. Use the arrow buttons to cycle through available fonts. Your font preference is automatically saved for next time.

4. **Recipient Address**: Enter the recipient's mailing address (name, street, city, state, ZIP). If the profile has a saved address, it auto-fills.

5. **Confirm & Send**: Review all details and choose delivery timing:
   - **Send now**: Handwrytten writes and mails the card immediately (arrives in 3–5 business days)
   - **Timed delivery**: Available when linked to an event more than 7 days away — the card is mailed 7 days before the event date so it arrives on time
   - **Pick a send date**: Choose any future date for Handwrytten to mail the card — great for batch card writing sessions or occasions not tracked in CircleDays

   You can also review and edit your return address.

6. **Success**: Confirmation with a link to the Cards dashboard.

**Card Credits**:
- Each card costs **1 credit**
- New users receive a **free credit** when they first set up their card preferences
- Additional credits can be purchased in bundles: 1 card ($5), 5 cards ($25), or 10 cards ($50)
- Payments are processed securely through **Stripe**
- If a card send fails, your credit is automatically refunded

**Card Onboarding** (first-time setup):
The first time you send a card, you'll be guided through a quick setup:
1. Set your **card sign-off** (e.g., "Love, Sarah" or "Best, John")
2. Enter your **return address** (used on the back of every card)
3. Choose your preferred **handwriting font**
This information is saved and pre-filled for all future cards.

**Cards Dashboard** (`/cards`):
- View all your card orders with status tracking:
  - **Queued**: Order received, waiting to be processed
  - **Printing**: Card is being written by Handwrytten
  - **Written**: Card has been written, ready for mailing
  - **Delivered**: Card has been mailed and delivered
  - **Problem**: An issue occurred with the order
  - **Cancelled**: Order was cancelled
- Filter orders by status (All, Scheduled, In Progress, Delivered, Cancelled)
- Shows recipient name, city/state, message preview, and relative date
- Credit balance displayed in the header

**Card Nudge in Reminders**:
When you receive event reminders via email or SMS, you'll see a contextual card nudge:
- **14+ days out**: "There's still time to send a handwritten card"
- **7 days out**: "Just enough time to send a handwritten card"
- **3 days or less**: "It may be too late for a card, but you can still send one"
The nudge links directly to the person's profile page where you can start the card flow.

---

## Notifications & Reminders

### How Reminders Work
- Reminders are sent at your preferred notification hour in your local timezone (default: 8 AM)
- You receive reminders based on your **Remind me** settings (e.g., 7 days before, 1 day before, day of)
- Only events for people you're connected to trigger reminders
- Private events only send reminders to the person who created them
- Unlinked profiles (no account) don't receive reminders - only users with accounts do
- Email reminders include a **card nudge** with a link to send a handwritten card (see Handwritten Cards above)

### Notification Channels
- **Email**: HTML email with event details and links
- **SMS**: Text message with event summary
- **Both**: Receive both email and SMS

---

## Privacy & Visibility

### What Others Can See
- Your name and profile picture
- Events marked as "Shared" on your profile
- Your connections (when they drill into your profile)

### What's Private
- Your email address (only you can see it)
- Your mobile number (only you can see it)
- Events marked as "Private"
- Your notes on other profiles
- Other people's notes about you (you can't see them)

### Profile Ownership
- Only you can edit your own profile (name, photo) once you've claimed it
- If someone created your profile before you had an account, they can edit it until you claim it
- Once claimed, only the profile owner can make changes
- **Platform admins** can edit any profile (for maintenance and corrections)

---

## Common Questions

### "Why can't I see someone's birthday?"
- They might not have a birthday event added yet
- The event might be marked as Private by whoever created it
- You might not be connected to them

### "Why is someone grayed out in my connections?"
They're connected to the person you're viewing, but not to you. Tap them to see their profile preview and connect.

### "How do I fix an incorrect birthday?"
If it's your own profile: Settings → My Events → tap the event → edit
If it's someone else's profile: Go to their profile → tap the event → edit (if you created it)

### "What happens when I delete a profile?"
All their events, notes, and connections are deleted. If they had an account, they'll need to create a new profile.

### "Can someone see that I added an event to their profile?"
Shared events are visible to all their connections. The event doesn't show who created it, but it's visible.

### "How do I know if someone has an account?"
In the Suggest modal, only people with accounts appear as possible recipients. When viewing connections, there's no explicit indicator, but you can try inviting them - if they already have an account, they don't need an invite.

### "Why didn't my friend get my suggestion?"
Make sure they have an account (have logged in at least once). Suggestions only work for users with accounts.

### "How do I add my own birthday?"
Settings → My Events → "+ Add" or "Add Your Birthday"

### "What's the lock icon on an event?"
It means the event is Private - only you can see it and get reminders for it.

### "How do handwritten cards work?"
You can send a real handwritten card to anyone from their profile page or the dashboard. Pick a card design, write your message (or let AI help), choose a handwriting font, enter their address, and choose when to send it. Each card costs 1 credit ($5 each, or save with bundles). The card is written with real pen and ink by Handwrytten and mailed with a stamp — it arrives in 3–5 business days.

### "Can I schedule a card for later?"
Yes! When confirming your card order, choose "Pick a send date" to select any future mailing date. If the card is linked to an event more than 7 days away, you'll also see a "Timed delivery" option that automatically mails the card 7 days before the event. This is great for batch card writing sessions.

### "What happens if my card fails to send?"
Your credit is automatically refunded if there's a problem placing the order with Handwrytten.

### "Can I cancel a card after ordering?"
Once a card enters Handwrytten's production system, it cannot be cancelled. Cards are processed quickly, so there is no cancellation option.

### "Can I connect to someone without them knowing?"
Connections are always instant - there's no approval process. When someone logs in, they'll see a "New Connections" notification on their dashboard showing who connected with them. They can:
- Keep the connection (dismiss the notification)
- Disconnect if they prefer not to be connected

Since email and phone numbers are completely hidden, there's no privacy risk in being connected to someone.

---

## Tips & Best Practices

1. **Start with family**: Add your immediate family members first, then branch out
2. **Use the Suggest feature**: When a family member joins, suggest your other family members to them
3. **Set multiple reminder times**: "1 week before" gives you time to buy a gift, "day of" ensures you don't forget to call
4. **Use private events for personal milestones**: First date, day you met someone, etc.
5. **Check "unknown year" if unsure**: Better to track the date without age than not track at all
6. **Add photos**: They help you quickly identify people in lists and the calendar
   - You can paste photos directly from your clipboard (Ctrl/Cmd+V)
7. **Use the calendar List view**: Great for planning ahead for the whole year
8. **Use Message Assist**: For events in the next week, let AI help you craft a thoughtful message
9. **Auto-save notes**: Your notes are automatically saved as you type (no need to click save)
10. **Batch card writing**: Use the "Pick a send date" option to write cards for weeks or months ahead in one sitting — Handwrytten will hold and mail them on the dates you choose
11. **Send cards for any occasion**: You can send a card to anyone with an address, even for occasions not tracked in CircleDays — just use the custom send date
12. **Card nudge links**: Click the card nudge in your reminder emails to go directly to the person's profile and start a card

---

## Technical Notes

- CircleDays is a Progressive Web App (PWA) - you can install it on your phone's home screen
- Authentication uses magic links - no passwords to remember
- Data is stored securely in the cloud (Neon PostgreSQL)
- Photos are stored in Vercel Blob storage
- The app works on desktop and mobile
- Handwritten cards are fulfilled by **Handwrytten** — a service that uses robotic pens to write real ink-on-paper cards
- Card payments are processed through **Stripe** (secure checkout)
- AI features (Message Assist, Card Message Assist, CircleDays Help) are powered by **Anthropic Claude**
- Address autocomplete uses **Google Maps Places API**

---

---

## Admin Features (Platform Administrators Only)

**IMPORTANT**: These features are only available to platform administrators. Regular users cannot access or use these features.

### Admin Profile Management
- **Edit Any Profile**: Admins can edit any profile's name and photo, not just their own
- **Disconnect Any Connection**: Admins can disconnect any two profiles from each other (useful for fixing incorrect connections)
- **Show All Profiles**: On the Connections page, admins see a "Show All" button that displays all profiles in the system, not just their connections
- **Merge Duplicate Profiles**: Admins can merge duplicate profiles, consolidating:
  - Events (with smart duplicate detection for birthdays - matches by month/day, prefers known years)
  - Connections
  - Notes
  - Profile data (name, photo)
- **Cleanup Duplicate Birthdays**: Admins can use the cleanup endpoint to remove duplicate birthday events from a profile

### Admin Merge Process
1. Search for profiles on Connections or Search page
2. If duplicates are detected (similar names), a "Merge" button appears
3. Click Merge to open the merge modal
4. Choose which profile to keep
5. Select what to merge: name, photo, events, connections, notes
6. The merge consolidates all data and deletes the duplicate profile

### Admin Disconnect
- On any profile's connections list, admins see a disconnect button (red minus icon) on hover
- Clicking it allows disconnecting that profile from the person being viewed
- Useful for fixing incorrect connections made during invites

---

*This knowledge base is maintained by the CircleDays team and reflects the current state of the application.*

