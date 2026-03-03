# Handwrytten API Migration Plan

## Overview

Replace the current Handwrite.io card ordering integration with the Handwrytten API. This brings a richer card browsing experience (categories, card images, per-card character limits) and better font selection with visual previews.

## API Endpoints (Confirmed Working)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v2/categories/list` | GET | 19 card categories (Birthday, Anniversary, Thank You, etc.) |
| `/v2/cards/list?category_id=X` | GET | Cards per category with cover/inside images, prices, dimensions, char limits |
| `/v2/cards/view?card_id=X` | GET | Detailed card info (images, margins, font sizing) |
| `/v2/fonts/list` | GET | 40 handwriting fonts with preview images and TTF paths |
| `/v1/orders/singleStepOrder` | POST | Place a card order (form-urlencoded, NOT JSON) |
| `/v1/auth/authorization` | POST | Login with email/password, returns `uid` token |
| `/v1/auth/setTestMode` | POST | Toggle test mode (cards not sent, money refunded) |

### Authentication

Handwrytten uses a `uid` token obtained via `POST /auth/authorization` with `login` (email) and `password`. The `uid` is then passed as a header on subsequent requests. This replaces the current `HANDWRITE_API_KEY` env var.

**TODO:** Get Handwrytten account credentials (email + password) and set up env vars:
- `HANDWRYTTEN_LOGIN` — account email
- `HANDWRYTTEN_PASSWORD` — account password
- Optionally cache the `uid` token with TTL

### singleStepOrder Parameters

**Required (form-urlencoded):**
- `card_id` (integer) — from cards/list
- `font_label` (string) — e.g. "Ambitious Anita"
- `message` (string) — use `\n` for line breaks
- `sender_name`, `sender_address1`, `sender_city`, `sender_zip`
- `recipient_name`, `recipient_address1`, `recipient_city`, `recipient_zip`

**Optional:**
- `credit_card_id` (integer)
- `denomination_id` (integer) — for gift card inserts
- `insert_id` (integer)
- `couponCode` (string)
- `date_send` (string) — schedule future send
- `validate_address` (boolean)
- `webhook_url` (string) — for order status callbacks
- `sender_state`, `recipient_state`
- `sender_country_id`, `recipient_country_id` (default: 1 = USA)

**Response:**
```json
{
  "httpCode": 200,
  "status": "ok",
  "order_id": 196936,
  "mail_sent": 0
}
```

### Card Data Shape (from /v2/cards/list)

```json
{
  "id": 227204,
  "name": "Happy Birthday Tiered Cake",
  "price": 3.75,
  "dimension_id": 4,
  "closed_height": 5.5,
  "closed_width": 4.25,
  "orientation": "P",
  "cover": "https://d3e924qpzqov0g.cloudfront.net/...",
  "inside_image": "https://d3e924qpzqov0g.cloudfront.net/...",
  "details_size": "4.25 x 5.5",
  "font_size": 32,
  "characters": 500
}
```

### Font Data Shape (from /v2/fonts/list)

```json
{
  "id": "hwAnita",
  "label": "Ambitious Anita",
  "image": "https://d3e924qpzqov0g.cloudfront.net/fontsImages/...",
  "font_name": "hwAnita",
  "path": "https://d3e924qpzqov0g.cloudfront.net/fonts/...",
  "font_id": 202,
  "line_spacing": 0.7
}
```

## Key Differences from Current System

| Aspect | Current (Handwrite.io) | New (Handwrytten) |
|--------|----------------------|-------------------|
| Card selection | Flat "stationery" list, no images | Category → card grid with cover/inside images |
| Fonts | Generic "handwriting styles" | 40 named fonts with preview images & TTFs |
| Character limit | Global 320 chars | Per-card (varies, e.g. 500 for birthday) |
| Auth | API key in `Authorization` header | `uid` token from login endpoint |
| Order format | JSON POST to `/send` | Form-urlencoded POST to `/orders/singleStepOrder` |
| Order params | `card`, `handwriting`, `recipients[]` | `card_id`, `font_label`, sender/recipient address fields |
| Webhooks | None | `webhook_url` param on orders |
| Test mode | Test key prefix (`test_hw_*`) | Account-level toggle via `/auth/setTestMode` |
| Card price | Bundled in our credits | $3.75/card from API (we still use our credit system on top) |

## Files to Modify

### Core API Client
- **`lib/handwrite.ts`** — Complete rewrite: new base URL (`https://api.handwrytten.com`), auth via uid token, new endpoint functions (listCategories, listCards, listFonts, placeOrder), new response types

### API Routes
- **`app/api/handwritten-cards/route.ts`** — Call `singleStepOrder` with form-urlencoded body; update order ID field name
- **`app/api/card-preferences/route.ts`** — Replace `listHandwritingStyles()`/`listStationery()` with Handwrytten fonts/cards endpoints; return categories too
- **`app/api/card-assist/route.ts`** — **Still uses Anthropic SDK!** Needs Kimi/Moonshot migration (same as message-assist). Accept dynamic character limit instead of hardcoded 320

### Database
- **`lib/db/schema.ts`** — `cardPreferences`: rename `handwritingId` → `fontId`, `stationeryId` → `cardId` (or keep both for migration). `cardOrders`: `stationeryId` → `cardId`, keep `handwriteOrderId` (reuse for Handwrytten order_id)
- **New migration** — ALTER columns or add new ones

### UI Components
- **`components/SendCardModal.tsx`** — Major overhaul for card browsing:
  - New step: **Pick a Card** (category filter tabs → scrollable card grid with cover images)
  - Font picker: show preview images instead of text names
  - Character counter: use per-card `characters` field instead of global `CARD_CHAR_LIMIT`
  - Confirm step: show selected card cover image

### Constants
- **`lib/constants.ts`** — `CARD_CHAR_LIMIT` becomes a fallback default; actual limit comes from card data

## Proposed New Modal Flow

1. **Address** — same as current (recipient address entry with autocomplete, contact picker, saved addresses)
2. **Pick a Card** *(NEW)* — category pills/tabs at top → scrollable grid of card covers → tap to select → show inside image preview
3. **Compose** — font picker with image previews, AI draft button, textarea with per-card character counter
4. **Confirm & Send** — show selected card image, address summary, message preview, credit cost
5. **Success** — same as current

## Webhook Integration (Future)

The `webhook_url` parameter on `singleStepOrder` enables real-time order status tracking. When ready:
- Create a `POST /api/webhooks/handwrytten` endpoint
- Update `cardOrders.status` when events fire (order.created, order.processing, order.shipped)
- Update `cardOrderStatusEnum` if Handwrytten uses different status values

## Prerequisites Before Starting

- [ ] Handwrytten account credentials (email + password for API auth)
- [ ] Confirm test mode is enabled on the account
- [ ] Decide on credit pricing: cards are $3.75 from Handwrytten — do our credit bundles need repricing?
- [ ] Decide whether to keep backward compatibility with existing Handwrite.io orders in the DB

## API Documentation References

- SwaggerHub spec: `https://api.swaggerhub.com/apis/Handwrytten/handwrytten/3.12.5-pub`
- Postman collection: `https://www.postman.com/api-evangelist/handwrytten/documentation/dudok1z/handwrytten-api`
- Official integrations page: `https://www.handwrytten.com/integrations/integrate-automate/`
