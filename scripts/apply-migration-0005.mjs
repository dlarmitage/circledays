// Adds stripe_session_id column + unique index to card_credit_transactions for Stripe idempotency.
// Run with: node scripts/apply-migration-0005.mjs

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

const statements = [
  `ALTER TABLE "card_credit_transactions" ADD COLUMN IF NOT EXISTS "stripe_session_id" text`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "idx_cct_stripe_session_unique"
    ON "card_credit_transactions" ("stripe_session_id")
    WHERE "stripe_session_id" IS NOT NULL`,
];

async function run() {
  console.log('Applying migration 0005_add-stripe-session-id...\n');

  for (const statement of statements) {
    const preview = statement.trim().split('\n')[0].slice(0, 80);
    try {
      await sql.query(statement);
      console.log(`  ✓ ${preview}`);
    } catch (err) {
      const msg = err?.cause?.message || err?.message || String(err);
      if (msg.includes('already exists')) {
        console.log(`  ~ ${preview} (already exists, skipped)`);
      } else {
        console.error(`  ✗ ${preview}`);
        console.error(`    Error: ${msg}`);
        process.exit(1);
      }
    }
  }

  console.log('\nMigration 0005 applied successfully.');
}

run();
