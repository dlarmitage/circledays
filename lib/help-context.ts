/**
 * Page context mapping for the AI help assistant.
 * Maps routes to descriptions and contextual suggested questions
 * so the assistant knows what page the user is on.
 */

export interface PageContext {
  /** Human-readable page name */
  pageName: string;
  /** Brief description of what the user can do here */
  description: string;
  /** Suggested questions relevant to this page */
  suggestedQuestions: string[];
}

/** User stats used to determine journey stage */
export interface UserStats {
  connectionCount: number;
  eventCount: number;
  cardOrderCount: number;
}

export type JourneyStage = 'new' | 'getting-started' | 'active' | 'power-user';

export function getJourneyStage(stats: UserStats): JourneyStage {
  if (stats.connectionCount === 0) return 'new';
  if (stats.connectionCount <= 3 && stats.cardOrderCount === 0) return 'getting-started';
  if (stats.cardOrderCount > 0) return 'power-user';
  return 'active';
}

const journeyQuestions: Record<JourneyStage, string[]> = {
  'new': [
    'How do I get started with CircleDays?',
    'How do I add someone to my circle?',
    'What can CircleDays do for me?',
    'How do reminders work?',
  ],
  'getting-started': [
    'How do I expand my circle?',
    'How do I send a handwritten card?',
    "What's the difference between shared and private occasions?",
    'How do I invite someone to join CircleDays?',
  ],
  'active': [
    'How do I send a handwritten card?',
    'How do I suggest connections to a friend?',
    'How do I customize my reminder settings?',
    'How does Message Assist work?',
  ],
  'power-user': [
    'How do I track my card deliveries?',
    'How do I suggest connections to a friend?',
    'Can I set up different reminders for different people?',
    'How do I buy more card credits?',
  ],
};

const defaultContext: PageContext = {
  pageName: 'CircleDays',
  description: 'You are using the CircleDays app.',
  suggestedQuestions: [
    "How do I add someone's birthday?",
    "What's the difference between shared and private occasions?",
    "How do I suggest connections?",
    "How do handwritten cards work?",
  ],
};

/**
 * Route patterns mapped to page context.
 * Patterns are checked in order; first match wins.
 * Use `:param` for dynamic segments.
 */
const routeContextMap: { pattern: RegExp; context: PageContext }[] = [
  {
    pattern: /^\/dashboard$/,
    context: {
      pageName: 'Dashboard',
      description:
        'The dashboard shows upcoming occasions (birthdays, anniversaries, custom occasions) grouped by timeframe. Users can use Message Assist for occasions this week, and send handwritten cards.',
      suggestedQuestions: [
        'What do the different timeframes mean?',
        'How does Message Assist work?',
        'How do I send a handwritten card from here?',
        'What does "Card Ordered" mean?',
      ],
    },
  },
  {
    pattern: /^\/mycircle$/,
    context: {
      pageName: 'My Circle',
      description:
        'My Circle shows the user\'s social graph. They can view connections, drill into a connection\'s connections, search for people, use select mode to suggest connections, and add new people.',
      suggestedQuestions: [
        'Why is someone grayed out?',
        'How do I suggest connections to a friend?',
        'How does the search work?',
        'How do I disconnect from someone?',
      ],
    },
  },
  {
    pattern: /^\/profile\/[^/]+\/edit$/,
    context: {
      pageName: 'Edit Profile',
      description:
        'The user is editing a profile — changing name or photo. Only the profile owner (or an admin) can edit a claimed profile.',
      suggestedQuestions: [
        'Who can edit a profile?',
        'How do I change a profile photo?',
        'Can I paste a photo from my clipboard?',
        'What happens when someone claims their profile?',
      ],
    },
  },
  {
    pattern: /^\/profile\/[^/]+$/,
    context: {
      pageName: 'Profile',
      description:
        'A profile page showing a person\'s occasions, connections, and notes. The user can add occasions, write private notes, invite the person to join, or send them a handwritten card.',
      suggestedQuestions: [
        'How do I add an occasion to this profile?',
        'Can others see my notes?',
        'How do I invite this person to CircleDays?',
        'How do I send them a card?',
      ],
    },
  },
  {
    pattern: /^\/add-person$/,
    context: {
      pageName: 'Add a Person',
      description:
        'The user is adding a new person to CircleDays. They enter a name, birthday, and optional photo. The system checks for duplicates.',
      suggestedQuestions: [
        'What happens if this person already exists?',
        "Can I skip the birth year if I don't know it?",
        'How do I paste a photo from my clipboard?',
        'Will this person be notified?',
      ],
    },
  },
  {
    pattern: /^\/calendar$/,
    context: {
      pageName: 'Calendar',
      description:
        'The calendar shows occasions in a monthly calendar view or a list view. Calendar view shows avatar badges; list view shows occasions grouped by timeframe for the next 12 months.',
      suggestedQuestions: [
        'How do I switch between calendar and list view?',
        'What do the emoji badges mean?',
        'Why are some occasions missing from my calendar?',
        'How far ahead does the list view show?',
      ],
    },
  },
  {
    pattern: /^\/cards$/,
    context: {
      pageName: 'Cards Dashboard',
      description:
        'The cards dashboard shows all handwritten card orders with status tracking (queued, printing, written, delivered, cancelled). Users can also see their credit balance.',
      suggestedQuestions: [
        'What do the card statuses mean?',
        'How do I buy more card credits?',
        'Can I cancel a card after ordering?',
        'How long does delivery take?',
      ],
    },
  },
  {
    pattern: /^\/settings$/,
    context: {
      pageName: 'Settings',
      description:
        'Settings page where the user manages their profile, notification preferences (timing, channel, timezone), card preferences (sign-off, return address), email, and My Occasions.',
      suggestedQuestions: [
        'How do I change my reminder settings?',
        'How do I add my own birthday?',
        'How do I update my email address?',
        'How do I set up my card preferences?',
      ],
    },
  },
  {
    pattern: /^\/search$/,
    context: {
      pageName: 'Search',
      description:
        'The search page lets users search for anyone in the CircleDays system, not just their connections.',
      suggestedQuestions: [
        'Does search only show my connections?',
        'How do I connect with someone I find?',
        'What if I find a duplicate profile?',
        "Why can't I find someone?",
      ],
    },
  },
  {
    pattern: /^\/admin$/,
    context: {
      pageName: 'Admin',
      description:
        'Admin dashboard for platform administrators. Includes profile management, merging duplicates, and system maintenance.',
      suggestedQuestions: [
        'How do I merge duplicate profiles?',
        'How do I disconnect two profiles?',
        'How do I edit someone else\'s profile?',
        'How does the merge process work?',
      ],
    },
  },
];

/**
 * Get the page context for a given pathname.
 */
export function getPageContext(pathname: string): PageContext {
  for (const { pattern, context } of routeContextMap) {
    if (pattern.test(pathname)) {
      return context;
    }
  }
  return defaultContext;
}

/**
 * Get suggested questions based on journey stage.
 * For new/getting-started users, journey questions take priority.
 * For active/power users, page-specific questions are used if available,
 * otherwise journey-level questions.
 */
export function getSuggestedQuestions(
  pathname: string,
  stage?: JourneyStage
): string[] {
  const pageCtx = getPageContext(pathname);

  if (!stage || stage === 'active') {
    return pageCtx.suggestedQuestions;
  }

  // For new and getting-started users, always show journey questions
  // regardless of which page they're on
  if (stage === 'new' || stage === 'getting-started') {
    return journeyQuestions[stage];
  }

  // For power users, use page-specific if on a specific page,
  // otherwise use power-user journey questions
  if (pageCtx.pageName === 'CircleDays') {
    return journeyQuestions[stage];
  }
  return pageCtx.suggestedQuestions;
}
