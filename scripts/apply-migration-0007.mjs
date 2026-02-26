// Adds nudge_opted_out and last_nudge_sent_at columns to users table
// for the notification channel nudge feature.
// Run with: node scripts/apply-migration-0007.mjs

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

const statements = [
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "nudge_opted_out" boolean NOT NULL DEFAULT false`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_nudge_sent_at" timestamp`,
];

async function run() {
  console.log('Applying migration 0007_add-nudge-columns...\n');

  for (const statement of statements) {
    const preview = statement.trim().split('\n')[0].slice(0, 80);
    try {
      await sql.query(statement);
      console.log(`  \u2713 ${preview}`);
    } catch (err) {
      const msg = err?.cause?.message || err?.message || String(err);
      if (msg.includes('already exists')) {
        console.log(`  ~ ${preview} (already exists, skipped)`);
      } else {
        console.error(`  \u2717 ${preview}`);
        console.error(`    Error: ${msg}`);
        process.exit(1);
      }
    }
  }

  console.log('\nMigration 0007 applied successfully.');
}

run();
