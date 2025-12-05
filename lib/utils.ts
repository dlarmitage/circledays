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
