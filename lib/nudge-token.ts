import { createHmac } from 'crypto';

// Stateless opt-out token: HMAC(userId, secret) — no DB storage needed
const SECRET = process.env.CRON_SECRET || 'dev-nudge-secret';

export function generateOptOutToken(userId: string): string {
  const hmac = createHmac('sha256', SECRET).update(userId).digest('hex');
  // Encode as userId.hmac (URL-safe)
  return `${userId}.${hmac}`;
}

export function verifyOptOutToken(token: string): string | null {
  const dotIndex = token.indexOf('.');
  if (dotIndex === -1) return null;

  const userId = token.slice(0, dotIndex);
  const hmac = token.slice(dotIndex + 1);

  const expected = createHmac('sha256', SECRET).update(userId).digest('hex');
  if (hmac !== expected) return null;

  return userId;
}
