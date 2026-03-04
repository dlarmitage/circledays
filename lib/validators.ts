/** Validates a US ZIP code (5 digits). */
export function isValidZip(zip: string): boolean {
  return /^\d{5}$/.test(zip.trim());
}

/** Validates that all required US address fields are non-empty with a valid ZIP. */
export function isValidUSAddress(fields: {
  name: string;
  street: string;
  city: string;
  state: string;
  zip: string;
}): boolean {
  return (
    fields.name.trim().length > 0 &&
    fields.street.trim().length > 0 &&
    fields.city.trim().length > 0 &&
    fields.state.trim().length > 0 &&
    isValidZip(fields.zip)
  );
}
