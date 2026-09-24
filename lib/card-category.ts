/**
 * Pick the best Handwrytten card category for an occasion.
 *
 * Handwrytten names categories like "Birthday (Personal)" / "Birthday (Business)",
 * so a naive exact match on "birthday" falls through to Everyday.
 */

export type CardCategoryRef = {
  id: number;
  name: string;
};

/** Preference lists: first match wins. Names compared case-insensitively / as substrings. */
const BIRTHDAY_PREFS = ['birthday (personal)', 'birthday'];
const ANNIVERSARY_PREFS = ['anniversary', 'love / romance', 'wedding'];
const EVERYDAY_PREFS = ['everyday', 'just for fun'];

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, ' ');
}

/** True if category name matches a preference (exact, starts-with, or contains). */
function categoryMatchesPref(categoryName: string, pref: string): boolean {
  const name = normalize(categoryName);
  const p = normalize(pref);
  if (name === p) return true;
  if (name.startsWith(p)) return true;
  // "birthday (personal)" should match pref "birthday"
  if (name.includes(p)) return true;
  // pref "love / romance" vs name "Love / Romance"
  const nameKey = name.replace(/[()/]/g, ' ').replace(/\s+/g, ' ').trim();
  const prefKey = p.replace(/[()/]/g, ' ').replace(/\s+/g, ' ').trim();
  return nameKey === prefKey || nameKey.includes(prefKey) || prefKey.includes(nameKey);
}

function findByPrefs(
  categories: CardCategoryRef[],
  prefs: string[],
): CardCategoryRef | undefined {
  const usable = categories.filter(c => c.id !== -1 && normalize(c.name) !== 'all categories');
  for (const pref of prefs) {
    // Prefer exact / personal-style matches before loose contains
    const exact = usable.find(c => normalize(c.name) === normalize(pref));
    if (exact) return exact;
    const starts = usable.find(c => normalize(c.name).startsWith(normalize(pref)));
    if (starts) return starts;
    const loose = usable.find(c => categoryMatchesPref(c.name, pref));
    if (loose) return loose;
  }
  return undefined;
}

/**
 * Build an ordered preference list from the occasion label / event type.
 * `eventType` may be "birthday", "anniversary", a custom label, or "thinking of you".
 */
export function categoryPrefsForOccasion(eventType: string): string[] {
  const raw = normalize(eventType || '');

  // Canonical event types from the app
  if (raw === 'birthday' || raw === 'bday') return [...BIRTHDAY_PREFS, ...EVERYDAY_PREFS];
  if (raw === 'anniversary') return [...ANNIVERSARY_PREFS, ...EVERYDAY_PREFS];

  // Custom labels / freeform copy — keyword inference
  if (/\b(birth\s*days?|bday|b-day)\b/.test(raw)) return [...BIRTHDAY_PREFS, ...EVERYDAY_PREFS];
  if (/\banniversar/.test(raw)) return [...ANNIVERSARY_PREFS, ...EVERYDAY_PREFS];
  if (/\b(thank|thanks|appreciation|grateful)\b/.test(raw)) {
    return ['thank you', 'customer appreciation', 'donor thank you', 'employee appreciation', ...EVERYDAY_PREFS];
  }
  if (/\b(congrats|congratul|graduation|promo(tion)?|new job|retirement)\b/.test(raw)) {
    return ['congratulations', ...EVERYDAY_PREFS];
  }
  if (/\b(sympath|condolen|memorial|funeral|loss|passed)\w*/.test(raw)) {
    return ['condolences', ...EVERYDAY_PREFS];
  }
  if (/\b(get well|feel better|surgery|hospital|sick|recover)/.test(raw)) {
    return ['get well', ...EVERYDAY_PREFS];
  }
  if (/\b(baby|born|newborn|shower)\b/.test(raw)) {
    return ['new baby', 'congratulations', ...EVERYDAY_PREFS];
  }
  if (/\b(wedding|engaged|engagement|bride|groom)\b/.test(raw)) {
    return ['wedding', 'love / romance', 'congratulations', ...EVERYDAY_PREFS];
  }
  if (/\b(valentine|romance|love)\b/.test(raw)) {
    return ['love / romance', ...EVERYDAY_PREFS];
  }
  if (/\b(pet|dog|cat|puppy|kitten)\b/.test(raw)) {
    return ['pet', ...EVERYDAY_PREFS];
  }
  if (/\bhalloween\b/.test(raw)) return ['halloween', ...EVERYDAY_PREFS];
  if (/\bthanksgiving\b/.test(raw)) return ['thanksgiving', ...EVERYDAY_PREFS];

  // Generic / thinking-of-you / just-because
  return [...EVERYDAY_PREFS, 'just for fun'];
}

/** Optional seasonal boost for non-occasion sends (thinking of you, etc.). */
function seasonalPrefs(now: Date): string[] {
  const month = now.getMonth(); // 0-indexed
  const day = now.getDate();

  // Late Sep – Oct 31: Halloween
  if ((month === 8 && day >= 20) || month === 9) {
    return ['halloween', 'fall'];
  }
  // November before Thanksgiving week-ish: Fall / Thanksgiving
  if (month === 10 && day < 28) {
    return ['thanksgiving', 'fall'];
  }
  // Early November / late Oct spillover already covered
  if (month === 8 || month === 9 || month === 10) {
    return ['fall'];
  }
  return [];
}

/**
 * Pick the best category id for the given occasion.
 * Falls back to Everyday, then the first real category.
 */
export function pickDefaultCardCategory(
  categories: CardCategoryRef[],
  eventType: string,
  options?: { now?: Date },
): number | null {
  if (!categories.length) return null;

  const usable = categories.filter(c => c.id !== -1 && normalize(c.name) !== 'all categories');
  if (!usable.length) return categories[0]?.id ?? null;

  const prefs = categoryPrefsForOccasion(eventType);
  const isGeneric =
    prefs[0] === 'everyday' ||
    normalize(eventType) === 'thinking of you' ||
    normalize(eventType) === 'just because' ||
    !eventType;

  // For generic sends, prefer a seasonal category when one exists
  if (isGeneric) {
    const seasonal = findByPrefs(usable, seasonalPrefs(options?.now ?? new Date()));
    if (seasonal) return seasonal.id;
  }

  const matched = findByPrefs(usable, prefs);
  if (matched) return matched.id;

  const everyday = findByPrefs(usable, EVERYDAY_PREFS);
  return everyday?.id ?? usable[0].id;
}
