// Handwrite.io API client
// Server-side only — never import this in client components or expose the API key to the browser.

import { CARD_CHAR_LIMIT } from './constants';
export { CARD_CHAR_LIMIT };

const BASE_URL = 'https://api.handwrite.io/v1';

function getApiKey(): string {
  const key = process.env.HANDWRITE_API_KEY;
  if (!key) throw new Error('HANDWRITE_API_KEY environment variable is not set');
  return key;
}

function headers() {
  return {
    Authorization: getApiKey(),
    'Content-Type': 'application/json',
  };
}

export interface HandwriteRecipient {
  firstName?: string;
  lastName?: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
}

export interface HandwriteSendPayload {
  message: string;       // max 320 characters
  card: string;          // stationery ID
  handwriting: string;   // handwriting style ID
  recipients: HandwriteRecipient[];
  from?: HandwriteRecipient & { firstName?: string; lastName?: string };
}

export interface HandwriteOrder {
  _id: string; // Handwrite.io uses _id (MongoDB-style)
  message: string;
  handwriting: string;
  card: string;
  status: 'processing' | 'written' | 'complete' | 'problem' | 'cancelled';
  to: HandwriteRecipient;
  createdAt: string;
}

export interface HandwritingStyle {
  id: string;
  name: string;
  preview?: string;
}

export interface StationeryOption {
  id: string;
  name: string;
  preview?: string;
}

export async function sendCard(payload: HandwriteSendPayload): Promise<HandwriteOrder[]> {
  const res = await fetch(`${BASE_URL}/send`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Handwrite.io send failed (${res.status}): ${text}`);
  }

  return res.json();
}

export async function getOrderStatus(orderId: string): Promise<HandwriteOrder> {
  const res = await fetch(`${BASE_URL}/order/${orderId}`, {
    headers: headers(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Handwrite.io order fetch failed (${res.status}): ${text}`);
  }

  return res.json();
}

export async function listHandwritingStyles(): Promise<HandwritingStyle[]> {
  const res = await fetch(`${BASE_URL}/handwriting`, {
    headers: headers(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Handwrite.io handwriting list failed (${res.status}): ${text}`);
  }

  // API returns _id — normalize to id for consistent use throughout the app
  const raw: Array<{ _id: string; name: string; preview_url?: string }> = await res.json();
  return raw.map(item => ({ id: item._id, name: item.name, preview: item.preview_url }));
}

export async function listStationery(): Promise<StationeryOption[]> {
  const res = await fetch(`${BASE_URL}/stationery`, {
    headers: headers(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Handwrite.io stationery list failed (${res.status}): ${text}`);
  }

  // API returns _id — normalize to id for consistent use throughout the app
  const raw: Array<{ _id: string; name: string; preview_url?: string }> = await res.json();
  return raw.map(item => ({ id: item._id, name: item.name, preview: item.preview_url }));
}

