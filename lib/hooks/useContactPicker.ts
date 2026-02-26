'use client';

// Contact Picker API hook
// Supported on: iOS Safari 14+, Android Chrome
// NOT supported on: desktop browsers (Chrome, Firefox, Edge, Safari on macOS)
// When unsupported, isSupported will be false — fall back to manual address entry.

export interface ContactAddress {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export function isContactPickerSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'contacts' in navigator && 'ContactsManager' in window;
}

export async function pickContact(): Promise<ContactAddress | null> {
  if (!isContactPickerSupported()) {
    return null;
  }

  try {
    // Request name and address from the device's contact store
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contacts = await (navigator as any).contacts.select(['name', 'address'], {
      multiple: false,
    });

    if (!contacts || contacts.length === 0) return null;

    const contact = contacts[0];
    const name = Array.isArray(contact.name) ? contact.name[0] : contact.name;
    const addresses = contact.address;

    if (!addresses || addresses.length === 0) return null;

    const addr = addresses[0];

    // The Contact Picker API returns address as an object with:
    // addressLine (array), city, country, dependentLocality, organization,
    // phone, postalCode, recipient, region, sortingCode
    const streetParts: string[] = [];
    if (Array.isArray(addr.addressLine)) {
      streetParts.push(...addr.addressLine.filter(Boolean));
    } else if (addr.addressLine) {
      streetParts.push(addr.addressLine);
    }

    const street = streetParts.join(', ');
    const city = addr.city || addr.dependentLocality || '';
    const state = addr.region || '';
    const zip = addr.postalCode || '';
    const country = addr.country || 'US';

    if (!street && !city) return null;

    return {
      name: name || '',
      street,
      city,
      state,
      zip,
      country,
    };
  } catch (err) {
    // User cancelled or permission denied — treat as no result
    console.warn('Contact picker dismissed or failed:', err);
    return null;
  }
}
