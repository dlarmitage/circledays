/** Normalize user input to E.164 (+14155551234) or null if invalid. */
export function normalizePhone(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(/\D/g, '');
    if (digits.length >= 8 && digits.length <= 15) {
      return `+${digits}`;
    }
    return null;
  }

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return null;
}

/** Mask for display, e.g. +1 •••-•••-1234 */
export function maskPhone(e164: string): string {
  const digits = e164.replace(/\D/g, '');
  if (digits.length < 4) return '••••';
  const last4 = digits.slice(-4);
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 •••-•••-${last4}`;
  }
  const countryLen = Math.max(digits.length - 10, 0);
  const country = e164.startsWith('+') && countryLen > 0 ? `+${digits.slice(0, countryLen)} ` : '';
  return `${country}•••-•••-${last4}`.trim();
}

/** Format E.164 for display in profile fields, e.g. +1 (415) 555-1234 */
export function formatPhoneDisplay(e164: string): string {
  const digits = e164.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return e164;
}
