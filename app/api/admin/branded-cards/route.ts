import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { db, users } from '@/lib/db';
import { brandedCards } from '@/lib/db/schema';
import { getSession } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import {
  uploadCustomImage,
  checkUploadedImage,
  createCustomCard,
  listCards,
  listCategories,
  listCustomImages,
} from '@/lib/handwrytten';

async function requireAdmin() {
  const session = await getSession();
  const adminId = session.originalUserId || session.userId;
  if (!adminId) throw new Error('Unauthorized');

  const [admin] = await db
    .select()
    .from(users)
    .where(eq(users.id, adminId))
    .limit(1);

  if (!admin || !admin.isPlatformAdmin) {
    throw new Error('Admin access required');
  }
  return admin;
}

// GET /api/admin/branded-cards — list all branded card mappings + branding status
export const GET = withAuth(async (_req, _user) => {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const mappings = await db.select().from(brandedCards).orderBy(brandedCards.createdAt);
  const customImages = await listCustomImages('logo').catch(() => []);

  return NextResponse.json({
    mappings,
    uploadedLogos: customImages,
    totalBranded: mappings.length,
  });
}, 'list branded cards');

// POST /api/admin/branded-cards — create branded variants for cards
// Body: { action: "upload-logo" } — uploads the CircleDays QR/logo image
// Body: { action: "brand-card", originalCardId, dimensionId, cardName } — creates one branded variant
// Body: { action: "brand-category", categoryId } — brands all cards in a category
export const POST = withAuth(async (request, _user) => {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = await request.json();
  const { action } = body;

  if (action === 'upload-logo') {
    try {
      // Fetch the CircleDays QR image from our own public assets
      // (can't use readFileSync on Vercel — public/ is served via CDN, not on the serverless filesystem)
      const headersList = await headers();
      const host = headersList.get('host') || 'localhost:3000';
      const protocol = host.includes('localhost') ? 'http' : 'https';
      const imageUrl = `${protocol}://${host}/circledays-qr.jpg`;

      const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(10000) });
      if (!imgRes.ok) {
        return NextResponse.json(
          { error: `Failed to fetch CircleDays QR image from ${imageUrl} (${imgRes.status})` },
          { status: 404 }
        );
      }
      const imageBuffer = Buffer.from(await imgRes.arrayBuffer());

      const uploaded = await uploadCustomImage(imageBuffer, 'circledays-qr.jpg', 'logo');
      const quality = await checkUploadedImage(uploaded.id).catch(() => null);

      return NextResponse.json({
        success: true,
        imageId: uploaded.id,
        imageUrl: uploaded.image_url,
        quality,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: `Upload failed: ${message}` }, { status: 500 });
    }
  }

  if (action === 'brand-card') {
    const { originalCardId, dimensionId, cardName, backLogoImageId } = body;

    if (!originalCardId || !dimensionId || !cardName || !backLogoImageId) {
      return NextResponse.json(
        { error: 'Missing required fields: originalCardId, dimensionId, cardName, backLogoImageId' },
        { status: 400 }
      );
    }

    // Check if already branded
    const [existing] = await db
      .select()
      .from(brandedCards)
      .where(eq(brandedCards.originalCardId, String(originalCardId)))
      .limit(1);

    if (existing) {
      return NextResponse.json({
        success: true,
        alreadyBranded: true,
        brandedCardId: existing.brandedCardId,
      });
    }

    // Create the branded variant on Handwrytten
    const result = await createCustomCard({
      name: `CircleDays - ${cardName}`,
      presetCoverId: Number(originalCardId),
      backLogoId: Number(backLogoImageId),
      dimensionId: Number(dimensionId),
    });

    // Store the mapping
    await db.insert(brandedCards).values({
      originalCardId: String(originalCardId),
      brandedCardId: String(result.card_id),
      backLogoImageId: String(backLogoImageId),
      cardName,
    });

    return NextResponse.json({
      success: true,
      brandedCardId: result.card_id,
      categoryId: result.category_id,
    });
  }

  if (action === 'brand-category') {
    const { categoryId, backLogoImageId } = body;

    if (!categoryId || !backLogoImageId) {
      return NextResponse.json(
        { error: 'Missing required fields: categoryId, backLogoImageId' },
        { status: 400 }
      );
    }

    // Fetch all cards in the category
    const cards = await listCards(Number(categoryId));

    // Get existing mappings to skip already-branded cards
    const existingMappings = await db.select().from(brandedCards);
    const alreadyBranded = new Set(existingMappings.map(m => m.originalCardId));

    const results: { originalCardId: number; brandedCardId: number; name: string; skipped?: boolean }[] = [];

    for (const card of cards) {
      if (alreadyBranded.has(String(card.id))) {
        results.push({ originalCardId: card.id, brandedCardId: 0, name: card.name, skipped: true });
        continue;
      }

      try {
        const result = await createCustomCard({
          name: `CircleDays - ${card.name}`,
          presetCoverId: card.id,
          backLogoId: Number(backLogoImageId),
          dimensionId: card.dimension_id,
        });

        await db.insert(brandedCards).values({
          originalCardId: String(card.id),
          brandedCardId: String(result.card_id),
          backLogoImageId: String(backLogoImageId),
          cardName: card.name,
        });

        results.push({ originalCardId: card.id, brandedCardId: result.card_id, name: card.name });
      } catch (err) {
        console.error(`Failed to brand card ${card.id} (${card.name}):`, err);
        results.push({ originalCardId: card.id, brandedCardId: 0, name: card.name, skipped: true });
      }
    }

    return NextResponse.json({
      success: true,
      total: cards.length,
      branded: results.filter(r => !r.skipped).length,
      skipped: results.filter(r => r.skipped).length,
      results,
    });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}, 'manage branded cards');
