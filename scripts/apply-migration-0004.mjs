// One-time script to apply migration 0004 directly to the Neon database.
// Bypasses drizzle-kit migrate to avoid issues with the pre-existing migration history.
// Run with: node scripts/apply-migration-0004.mjs

import { neon } from '@neondatabase/serverless';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = neon(DATABASE_URL);

const statements = [
  `CREATE TYPE "public"."card_order_status" AS ENUM('pending', 'processing', 'written', 'complete', 'problem', 'cancelled')`,
  `CREATE TYPE "public"."card_credit_transaction_type" AS ENUM('purchase', 'use', 'refund')`,
  `CREATE TABLE IF NOT EXISTS "profile_addresses" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "profile_id" uuid NOT NULL,
    "user_id" uuid NOT NULL,
    "street" text NOT NULL,
    "city" text NOT NULL,
    "state" text NOT NULL,
    "zip" text NOT NULL,
    "country" text DEFAULT 'US' NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "unique_profile_user_address" UNIQUE("profile_id","user_id")
  )`,
  `CREATE TABLE IF NOT EXISTS "card_preferences" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL,
    "handwriting_id" text DEFAULT '' NOT NULL,
    "stationery_id" text DEFAULT '' NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "card_preferences_user_id_unique" UNIQUE("user_id")
  )`,
  `CREATE TABLE IF NOT EXISTS "card_credits" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL,
    "balance" integer DEFAULT 0 NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    CONSTRAINT "card_credits_user_id_unique" UNIQUE("user_id")
  )`,
  `CREATE TABLE IF NOT EXISTS "card_credit_transactions" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL,
    "amount" integer NOT NULL,
    "type" "card_credit_transaction_type" NOT NULL,
    "description" text NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "card_orders" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL,
    "profile_id" uuid,
    "event_id" uuid,
    "recipient_name" text NOT NULL,
    "recipient_street" text NOT NULL,
    "recipient_city" text NOT NULL,
    "recipient_state" text NOT NULL,
    "recipient_zip" text NOT NULL,
    "message" text NOT NULL,
    "handwriting_id" text NOT NULL,
    "stationery_id" text NOT NULL,
    "handwrite_order_id" text,
    "status" "card_order_status" DEFAULT 'pending' NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
  )`,
  `ALTER TABLE "profile_addresses" ADD CONSTRAINT "profile_addresses_profile_id_profiles_id_fk"
    FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action`,
  `ALTER TABLE "profile_addresses" ADD CONSTRAINT "profile_addresses_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action`,
  `ALTER TABLE "card_preferences" ADD CONSTRAINT "card_preferences_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action`,
  `ALTER TABLE "card_credits" ADD CONSTRAINT "card_credits_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action`,
  `ALTER TABLE "card_credit_transactions" ADD CONSTRAINT "card_credit_transactions_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action`,
  `ALTER TABLE "card_orders" ADD CONSTRAINT "card_orders_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action`,
  `ALTER TABLE "card_orders" ADD CONSTRAINT "card_orders_profile_id_profiles_id_fk"
    FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action`,
  `ALTER TABLE "card_orders" ADD CONSTRAINT "card_orders_event_id_events_id_fk"
    FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action`,
];

async function run() {
  console.log('Applying migration 0004_add-handwritten-cards...\n');

  for (const statement of statements) {
    const preview = statement.trim().split('\n')[0].slice(0, 80);
    try {
      await sql.query(statement);
      console.log(`  ✓ ${preview}`);
    } catch (err) {
      const msg = err?.cause?.message || err?.message || String(err);
      // Idempotent: skip "already exists" errors
      if (msg.includes('already exists')) {
        console.log(`  ~ ${preview} (already exists, skipped)`);
      } else {
        console.error(`  ✗ ${preview}`);
        console.error(`    Error: ${msg}`);
        process.exit(1);
      }
    }
  }

  console.log('\nMigration 0004 applied successfully.');
}

run();
