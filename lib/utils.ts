import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Sentinel year for "unknown birth year" - old enough to be obviously not real
export const UNKNOWN_YEAR = 1904;

/**
 * Check if a date has an unknown year (uses sentinel year 1904)
 */
export function hasUnknownYear(date: Date | string): boolean {
  const d = typeof date === 'string' ? parseLocalDate(date) : date;
  return d.getFullYear() === UNKNOWN_YEAR;
}

export function getInitials(name: string): string {
  const parts = name.split(' ').filter(part => part.length > 1); // Skip single-letter parts (middle initials)
  if (parts.length === 0) {
    // Fallback if name is just initials
    return name.slice(0, 2).toUpperCase();
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  // Use first and last name
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Capitalize the first letter of each word in a name
 * Handles names like "john smith" -> "John Smith"
 * Preserves existing capitalization for names like "McDonald" or "O'Brien"
 * but capitalizes the first letter of each word
 */
export function capitalizeName(name: string): string {
  if (!name || name.trim().length === 0) return name;
  
  return name
    .trim()
    .split(/\s+/) // Split on whitespace
    .map(word => {
      if (word.length === 0) return word;
      // Capitalize first letter, lowercase the rest
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Check if two names are likely the same person
 * Handles cases like:
 * - "Swartzendruber, Heidi" vs "hine, Heidi swartzendruber" (married name)
 * - "John Smith" vs "Smith, John" (different formats)
 * - "Mary Jane Watson" vs "Mary Watson" (middle name differences)
 */
export function areNamesSimilar(name1: string, name2: string): boolean {
  // Normalize: lowercase, remove extra spaces, handle commas
  const normalize = (name: string): string[] => {
    return name
      .toLowerCase()
      .replace(/,/g, ' ') // Replace commas with spaces
      .split(/\s+/) // Split on whitespace
      .filter(part => part.length > 0) // Remove empty parts
      .filter(part => part.length > 1 || part.match(/[a-z]/i)); // Keep single letters only if they're actual initials
  };

  const parts1 = normalize(name1);
  const parts2 = normalize(name2);

  // If exact match after normalization, definitely similar
  if (parts1.join(' ') === parts2.join(' ')) {
    return true;
  }

  // Extract key components
  const getKeyParts = (parts: string[]) => {
    if (parts.length === 0) return { first: '', last: '', all: [] };
    if (parts.length === 1) return { first: parts[0], last: parts[0], all: parts };
    // First name is typically the first part, last name is the last part
    // But handle "Last, First" format by checking if first part ends with comma-like pattern
    const first = parts[0];
    const last = parts[parts.length - 1];
    return { first, last, all: parts };
  };

  const key1 = getKeyParts(parts1);
  const key2 = getKeyParts(parts2);

  // Check if first names match (allowing for variations)
  const firstNameMatch = key1.first === key2.first || 
    (key1.first.length > 2 && key2.first.length > 2 && 
     (key1.first.startsWith(key2.first) || key2.first.startsWith(key1.first)));

  // Check if last names match (allowing for multiple last names like married names)
  const lastNameMatch = key1.last === key2.last ||
    key1.all.includes(key2.last) ||
    key2.all.includes(key1.last);

  // Check if they share at least 2 significant words (for cases like "Heidi Swartzendruber" vs "Heidi Hine Swartzendruber")
  const sharedWords = parts1.filter(p => p.length > 2 && parts2.includes(p));
  const hasMultipleSharedWords = sharedWords.length >= 2;

  // Similar if:
  // 1. First name matches AND last name matches, OR
  // 2. They share at least 2 significant words (handles married names)
  return (firstNameMatch && lastNameMatch) || hasMultipleSharedWords;
}

/**
 * Parse a date string (YYYY-MM-DD) as a local date, not UTC
 * This prevents timezone shifting issues
 */
export function parseLocalDate(dateStr: string): Date {
  // Handle ISO date strings like "2004-12-10" or "2004-12-10T00:00:00.000Z"
  const [datePart] = dateStr.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  return new Date(year, month - 1, day); // month is 0-indexed
}

export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? parseLocalDate(date) : date;
  
  // If year is unknown (1904), don't show the year
  const isUnknownYear = d.getFullYear() === UNKNOWN_YEAR;
  const defaultOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    ...options,
  };
  
  // Remove year from options if unknown
  if (isUnknownYear) {
    delete defaultOptions.year;
  }
  
  return d.toLocaleDateString('en-US', defaultOptions);
}

/**
 * Calculate age from birth date
 * Returns null if birth year is unknown (1904 sentinel)
 */
export function calculateAge(birthDate: Date | string): number | null {
  const birth = typeof birthDate === 'string' ? parseLocalDate(birthDate) : birthDate;
  
  // If year is unknown, we can't calculate age
  if (birth.getFullYear() === UNKNOWN_YEAR) {
    return null;
  }
  
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

/**
 * Calculate the age someone is turning on their next birthday
 * Returns null if birth year is unknown
 * 
 * This always returns the age they will turn on their next birthday:
 * - If birthday is today or has passed: they'll turn currentAge + 1 next year
 * - If birthday is upcoming: they'll turn currentAge + 1 this year
 */
export function turningAge(birthDate: Date | string): number | null {
  const currentAge = calculateAge(birthDate);
  if (currentAge === null) return null;
  
  // Always return the age they'll turn on their next birthday
  return currentAge + 1;
}

export function daysUntil(date: Date | string, recurring: boolean = true): number {
  const target = typeof date === 'string' ? parseLocalDate(date) : date;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (!recurring) {
    // One-time event: just calculate days until the exact date
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  
  // Recurring event: get this year's occurrence
  const thisYear = new Date(today.getFullYear(), target.getMonth(), target.getDate());
  
  // If it's already passed this year, get next year's occurrence
  if (thisYear < today) {
    thisYear.setFullYear(thisYear.getFullYear() + 1);
  }
  
  const diffTime = thisYear.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getDaysUntilText(days: number): string {
  if (days < 0) return 'Passed';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 7) return `In ${days} days`;
  if (days < 14) return 'Next week';
  if (days < 30) return `In ${Math.floor(days / 7)} weeks`;
  return `In ${Math.floor(days / 30)} months`;
}

export function getEventTypeLabel(type: string, customLabel?: string | null): string {
  if (type === 'custom' && customLabel) return customLabel;
  return type.charAt(0).toUpperCase() + type.slice(1);
}
