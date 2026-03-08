// Handwrytten API client
// Server-side only — never import this in client components or expose credentials to the browser.

const BASE_URL = 'https://api.handwrytten.com';

// --- Types ---

export interface HandwryttenCategory {
  id: number;
  name: string;
}

export interface HandwryttenCard {
  id: number;
  name: string;
  price: number;
  dimension_id: number;
  closed_height: number;
  closed_width: number;
  orientation: string; // "P" = portrait, "L" = landscape
  cover: string;       // cover image URL
  inside_image: string;
  details_size: string;
  font_size: number;
  characters: number;  // max message length for this card
}

export interface HandwryttenFont {
  id: string;
  label: string;
  image: string;      // preview image URL
  font_name: string;
  path: string;       // TTF path URL
  font_id: number;
  line_spacing: number;
}

export interface HandwryttenOrderResponse {
  httpCode: number;
  status: string;
  order_id: number;
  mail_sent: number;
}

export interface HandwryttenOrderStatus {
  id: number;
  status: string;
  date_send?: string;
  date_fulfilled?: string;
}

export interface PlaceOrderParams {
  card_id: number;
  font_label: string;
  message: string;
  sender_name: string;
  sender_address1: string;
  sender_city: string;
  sender_state: string;
  sender_zip: string;
  recipient_name: string;
  recipient_address1: string;
  recipient_city: string;
  recipient_state: string;
  recipient_zip: string;
  credit_card_id?: number;
  sender_country_id?: number;
  recipient_country_id?: number;
  date_send?: string;
  webhook_url?: string;
}

// --- Auth (platform-level API key) ---

function getApiKey(): string {
  const key = process.env.HANDWRYTTEN_API_KEY;
  if (!key) throw new Error('HANDWRYTTEN_API_KEY environment variable is not set');
  return key;
}

function authedHeaders(): Record<string, string> {
  return { uid: getApiKey() };
}

// --- API Functions ---

export async function listCategories(): Promise<HandwryttenCategory[]> {
  const headers = authedHeaders();
  const res = await fetch(`${BASE_URL}/v2/categories/list`, { headers, signal: AbortSignal.timeout(10000) });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Handwrytten categories list failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  // API returns { categories: [...] } or array directly — handle both
  return data.categories ?? data;
}

export async function listCards(categoryId: number): Promise<HandwryttenCard[]> {
  const headers = authedHeaders();
  const res = await fetch(
    `${BASE_URL}/v2/cards/list?category_id=${categoryId}`,
    { headers, signal: AbortSignal.timeout(10000) }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Handwrytten cards list failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.cards ?? data;
}

export async function listFonts(): Promise<HandwryttenFont[]> {
  const headers = authedHeaders();
  const res = await fetch(`${BASE_URL}/v2/fonts/list`, { headers, signal: AbortSignal.timeout(10000) });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Handwrytten fonts list failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.fonts ?? data;
}

/** Fetch the first credit card on the Handwrytten account (v1 endpoint — uid in body). */
export async function getDefaultCreditCardId(): Promise<number | null> {
  const body = new URLSearchParams();
  body.set('uid', getApiKey());

  const res = await fetch(`${BASE_URL}/v1/creditCards/list`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) return null;

  const data = await res.json();
  const cards = data.credit_cards ?? [];
  return cards.length > 0 ? cards[0].id : null;
}

export async function placeOrder(
  params: PlaceOrderParams
): Promise<HandwryttenOrderResponse> {
  // If no credit_card_id provided, fetch the default from the account
  if (!params.credit_card_id) {
    const defaultCardId = await getDefaultCreditCardId();
    if (defaultCardId) {
      params = { ...params, credit_card_id: defaultCardId };
    }
  }

  const body = new URLSearchParams();

  // v1 endpoints require uid in the form body (not as a header like v2)
  body.set('uid', getApiKey());

  // Required fields
  body.set('card_id', String(params.card_id));
  body.set('font_label', params.font_label);
  body.set('message', params.message);
  body.set('sender_name', params.sender_name);
  body.set('sender_address1', params.sender_address1);
  body.set('sender_city', params.sender_city);
  body.set('sender_state', params.sender_state);
  body.set('sender_zip', params.sender_zip);
  body.set('recipient_name', params.recipient_name);
  body.set('recipient_address1', params.recipient_address1);
  body.set('recipient_city', params.recipient_city);
  body.set('recipient_state', params.recipient_state);
  body.set('recipient_zip', params.recipient_zip);

  // Optional fields
  if (params.credit_card_id) body.set('credit_card_id', String(params.credit_card_id));
  if (params.sender_country_id) body.set('sender_country_id', String(params.sender_country_id));
  if (params.recipient_country_id) body.set('recipient_country_id', String(params.recipient_country_id));
  if (params.date_send) body.set('date_send', params.date_send);
  if (params.webhook_url) body.set('webhook_url', params.webhook_url);

  const res = await fetch(`${BASE_URL}/v1/orders/singleStepOrder`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Handwrytten order failed (${res.status}): ${text}`);
  }

  return res.json();
}

// --- Custom Card / Branding Functions ---

export interface HandwryttenCustomImage {
  id: number;
  image_url: string;
  thumbnail_url?: string;
  type: 'logo' | 'cover';
}

export interface HandwryttenCustomCardResponse {
  card_id: number;
  category_id: number; // Custom cards are category 27
}

/** Upload a custom image (logo for card back, or cover for card front). */
export async function uploadCustomImage(
  imageBuffer: Buffer,
  filename: string,
  type: 'logo' | 'cover'
): Promise<HandwryttenCustomImage> {
  const formData = new FormData();
  const mimeType = filename.endsWith('.png') ? 'image/png' : 'image/jpeg';
  formData.append('file', new Blob([new Uint8Array(imageBuffer)], { type: mimeType }), filename);
  formData.append('type', type);
  formData.append('uid', getApiKey());

  const res = await fetch(`${BASE_URL}/v1/cards/uploadCustomLogo`, {
    method: 'POST',
    body: formData,
    signal: AbortSignal.timeout(30000), // longer timeout for file upload
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Handwrytten image upload failed (${res.status}): ${text}`);
  }

  return res.json();
}

/** Check print quality of an uploaded custom image. */
export async function checkUploadedImage(
  imageId: number,
  cardId?: number
): Promise<{ warning?: string; error?: string }> {
  const body = new URLSearchParams();
  body.set('uid', getApiKey());
  body.set('image_id', String(imageId));
  if (cardId) body.set('card_id', String(cardId));

  const res = await fetch(`${BASE_URL}/v1/cards/checkUploadedCustomLogo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Handwrytten image check failed (${res.status}): ${text}`);
  }

  return res.json();
}

/** List all custom images uploaded to our Handwrytten account. */
export async function listCustomImages(
  type?: 'logo' | 'cover'
): Promise<HandwryttenCustomImage[]> {
  const headers = authedHeaders();
  const url = new URL(`${BASE_URL}/v2/cards/listCustomUserImages`);
  if (type) url.searchParams.set('type', type);

  const res = await fetch(url.toString(), { headers, signal: AbortSignal.timeout(10000) });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Handwrytten list custom images failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data.images ?? data;
}

/**
 * Create a branded variant of an existing Handwrytten card.
 * Uses preset_cover_id (the original card's cover) + back_logo_id (our branding).
 */
export async function createCustomCard(params: {
  name: string;
  presetCoverId: number;       // Original card ID to use as the cover
  backLogoId: number;          // Our uploaded logo image ID for the back
  dimensionId: number;         // Card dimensions (from the original card)
}): Promise<HandwryttenCustomCardResponse> {
  const body = new URLSearchParams();
  body.set('uid', getApiKey());
  body.set('name', params.name);
  body.set('preset_cover_id', String(params.presetCoverId));
  body.set('back_logo_id', String(params.backLogoId));
  body.set('dimension_id', String(params.dimensionId));
  body.set('back_type', 'logo');

  const res = await fetch(`${BASE_URL}/v1/cards/createCustomCard`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Handwrytten create custom card failed (${res.status}): ${text}`);
  }

  return res.json();
}

/** Delete a custom uploaded image. */
export async function deleteCustomImage(imageId: number): Promise<void> {
  const body = new URLSearchParams();
  body.set('uid', getApiKey());
  body.set('image_id', String(imageId));

  const res = await fetch(`${BASE_URL}/v1/cards/deleteCustomLogo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Handwrytten delete image failed (${res.status}): ${text}`);
  }
}

/** Fetch order history from Handwrytten to sync statuses. */
export async function listOrders(): Promise<HandwryttenOrderStatus[]> {
  const headers = authedHeaders();
  const res = await fetch(`${BASE_URL}/v2/orders/listGrouped`, { headers, signal: AbortSignal.timeout(10000) });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Handwrytten orders list failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  const orders = data.orders ?? data;
  if (!Array.isArray(orders)) return [];
  return orders.map((o: Record<string, unknown>) => ({
    id: o.id as number,
    status: (o.status as string) ?? 'unknown',
    date_send: o.date_send as string | undefined,
    date_fulfilled: o.date_fulfilled as string | undefined,
  }));
}
