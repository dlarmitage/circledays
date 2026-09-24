import { randomBytes, randomInt } from 'crypto';
import { neon } from '@neondatabase/serverless';
import { db, magicLinks } from '@/lib/db';
import { eq, and, gt, count } from 'drizzle-orm';

/** Wrong guesses allowed per issued OTP before the token is locked. */
export const MAX_OTP_ATTEMPTS = 5;

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes

function getSql() {
  return neon(process.env.DATABASE_URL!);
}

export type CreateMagicLinkResult =
  | { token: string; code: string }
  | { error: string; status: 429 };

/**
 * Rate-limit, invalidate prior unused tokens, and create a fresh magic link + OTP.
 * Never gate on whether the email already has a user account.
 */
export async function invalidateAndCreateMagicLink(
  email: string
): Promise<CreateMagicLinkResult> {
  const normalized = email.toLowerCase().trim();
  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);

  const [result] = await db
    .select({ total: count() })
    .from(magicLinks)
    .where(
      and(
        eq(magicLinks.email, normalized),
        gt(magicLinks.createdAt, windowStart)
      )
    );

  if ((result?.total ?? 0) >= RATE_LIMIT_MAX) {
    return { error: 'Too many requests. Please try again later.', status: 429 };
  }

  await db
    .update(magicLinks)
    .set({ used: true })
    .where(
      and(
        eq(magicLinks.email, normalized),
        eq(magicLinks.used, false)
      )
    );

  const token = randomBytes(32).toString('hex');
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await db.insert(magicLinks).values({
    email: normalized,
    token,
    code,
    expiresAt,
    attempts: 0,
    used: false,
  });

  return { token, code };
}

export type VerifiedOtp = { id: string; email: string };

/**
 * Atomically count a verification attempt against the latest live OTP for this email.
 * Returns the token only when the code matches and attempts < MAX.
 * Missing / expired / locked / wrong all return null (generic error to caller).
 */
export async function verifyOtpAttempt(
  email: string,
  code: string
): Promise<VerifiedOtp | null> {
  const normalized = email.toLowerCase().trim();
  const sql = getSql();

  const rows = await sql`
    UPDATE magic_links
    SET attempts = attempts + 1
    WHERE id = (
      SELECT id FROM magic_links
      WHERE email = ${normalized}
        AND used = false
        AND expires_at > NOW()
        AND attempts < ${MAX_OTP_ATTEMPTS}
      ORDER BY created_at DESC
      LIMIT 1
      FOR UPDATE
    )
    RETURNING id, email, code
  `;

  const row = rows[0] as { id: string; email: string; code: string } | undefined;
  if (!row || row.code !== code) return null;
  return { id: row.id, email: row.email };
}

/** Mark a successfully verified OTP as used. Idempotent if already used. */
export async function markMagicLinkUsed(id: string): Promise<boolean> {
  const sql = getSql();
  const rows = await sql`
    UPDATE magic_links
    SET used = true
    WHERE id = ${id} AND used = false
    RETURNING id
  `;
  return Boolean(rows[0]);
}

/**
 * Atomically redeem a magic-link token (high-entropy link). Prefer this over
 * select-then-update to avoid double-consume races (email scanners, double-click).
 */
export async function consumeMagicLinkToken(
  token: string
): Promise<{ id: string; email: string } | null> {
  const sql = getSql();
  const rows = await sql`
    UPDATE magic_links
    SET used = true
    WHERE token = ${token}
      AND used = false
      AND expires_at > NOW()
    RETURNING id, email
  `;
  const row = rows[0] as { id: string; email: string } | undefined;
  if (!row?.email) return null;
  return { id: row.id, email: row.email };
}

/** Generic message for all verify failures — never distinguish wrong/expired/locked. */
export const GENERIC_OTP_ERROR = 'Invalid or expired code. Please request a new one.';
