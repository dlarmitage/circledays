import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { brandedCards } from '@/lib/db/schema';
import {
  listCategories,
  listCards,
  listCustomImages,
  createCustomCard,
} from '@/lib/handwrytten';

// Called weekly by Vercel Cron to ensure all Handwrytten cards have CircleDays-branded variants.
// Skips cards that already have a branded mapping in the database.
export async function GET(request: NextRequest) {
  // Verify cron secret (same pattern as reminders cron)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Find our uploaded logo — use the most recent one
  const logos = await listCustomImages('logo');
  if (logos.length === 0) {
    return NextResponse.json({
      error: 'No logo uploaded to Handwrytten yet. Run upload-logo via admin endpoint first.',
    }, { status: 400 });
  }
  const backLogoId = logos[logos.length - 1].id;

  // Get all existing branded mappings
  const existingMappings = await db.select().from(brandedCards);
  const alreadyBranded = new Set(existingMappings.map(m => m.originalCardId));

  // Fetch all categories
  const categories = await listCategories();

  let totalNew = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const category of categories) {
    // Skip "All Categories" meta-category
    if (category.name.toLowerCase() === 'all categories') continue;

    let cards;
    try {
      cards = await listCards(category.id);
    } catch (err) {
      console.error(`Failed to list cards for category ${category.id} (${category.name}):`, err);
      continue;
    }

    for (const card of cards) {
      if (alreadyBranded.has(String(card.id))) {
        totalSkipped++;
        continue;
      }

      try {
        const result = await createCustomCard({
          name: `CircleDays - ${card.name}`,
          presetCoverId: card.id,
          backLogoId: backLogoId,
          dimensionId: card.dimension_id,
        });

        await db.insert(brandedCards).values({
          originalCardId: String(card.id),
          brandedCardId: String(result.card_id),
          backLogoImageId: String(backLogoId),
          cardName: card.name,
        });

        alreadyBranded.add(String(card.id)); // prevent duplicates across categories
        totalNew++;
      } catch (err) {
        console.error(`Failed to brand card ${card.id} (${card.name}):`, err);
        totalFailed++;
      }
    }
  }

  console.log(`Brand cards cron: ${totalNew} new, ${totalSkipped} skipped, ${totalFailed} failed`);

  return NextResponse.json({
    success: true,
    newlyBranded: totalNew,
    skipped: totalSkipped,
    failed: totalFailed,
  });
}
