// Adds share_new_connections boolean column to users table.
// Run with: node scripts/apply-migration-0006.mjs

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

const statements = [
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "share_new_connections" boolean NOT NULL DEFAULT true`,
];

async function run() {
  console.log('Applying migration 0006_add-share-new-connections...\n');

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

  console.log('\nMigration 0006 applied successfully.');
}

run();
