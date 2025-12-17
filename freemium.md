# Implementation Plan: Family Dynamics Monetization Strategy (v2)

## 1. Executive Summary
**Goal:** Transition "Family Dynamics" (Genogram Builder) to a sustainable Freemium model.
**Core Value Proposition:** Immediate, frictionless access for anonymous users (ad-supported), with a clear upgrade path to a secure, cloud-saved, ad-free experience.
**Revenue Model:** Hybrid (Display Ads + Recurring Subscription).

---

## 2. Business Logic & Tier Definitions

### Tier A: Anonymous / Free User
* **Authentication:** **None required.** Users land on the page and immediately start building.
* **Data Persistence:** **Browser Local Storage only.**
    * *Risk:* If the user clears cache or changes devices, data is lost.
* **Limitations:**
    * **UI:** Save, Share, and Export buttons are visible but "Locked" (Greyed out/Icon overlay).
    * **Ads:** Sticky footer ad visible at all times.

### Tier B: Subscriber (Premium)
* **Price:** ~$8.00/Month or ~$60.00/Year.
* **Authentication:** Account required (created during signin).
* **Features:**
    * **Cloud Save:** Data persists in Neon DB (accessible across devices).
    * **Sharing:** Generate secure read-only links for family members/therapists.
    * **Export:** High-res PDF/Image download for printing.
    * **Ad-Free:** Interface is cleaner with more vertical screen real estate.

---

## 3. User Experience & Conversion Triggers

### The "Hook" (Locked Features)
Instead of hiding premium features, display them prominently but visually indicate they are locked (e.g., a padlock icon).

**Interaction Flow:**
1.  Anonymous user builds a Genogram.
2.  User clicks the locked **"Save"**, **"Share"**, or **"Export"** button.
3.  **Trigger:** An "Upgrade Modal" appears immediately.
    * **Headline:** "Protect your Family History"
    * **Copy:** "You are currently in Guest Mode. Subscribe to save your work to the cloud, remove ads, and share with your family or therapist."
    * **Call to Action:** "Unlock Everything - $8/mo" (with a "Have a Coupon?" link).

### Data Migration (Critical)
* When an anonymous user converts to a subscriber, the app must take the **current state** of the genogram (from Local Storage) and automatically **POST** it to the new user's record in Neon DB immediately after successful checkout.
* *User Benefit:* They don't lose the work they just did during the "Free" session.

---

## 4. Advertising Implementation (Google AdSense)

### Format & Placement
* **Unit:** "Anchor/Sticky Ads" (Mobile-friendly, dismissible).
* **Location:** Fixed to the bottom viewport (`z-index` lower than modals, higher than canvas).

### Targeting Strategy
* **Context:** Ensure HTML meta tags emphasize `Mental Health`, `Family Systems`, `Therapy Tools`, `Genealogy`.
* **Filters:** In AdSense Dashboard → Blocking Controls:
    * **Block:** Sensitive categories (Gambling, Alcohol, Politics).
    * **Allow:** Health, Hobbies, Home & Garden.

---

## 5. Subscription Implementation (Stripe)

### Stripe Link & Checkout
* **Configuration:** Use **Stripe Checkout** with **Link** enabled for 1-click payments.
* **Coupons:** Enable "Customer-facing coupons" in Stripe Dashboard.

### The Checkout Flow
1.  User clicks "Unlock" on the modal.
2.  App captures the current Genogram JSON state in memory.
3.  User is redirected to Stripe Checkout.
4.  **Success:** User is returned to the app (`/payment-success`).
5.  **Account Creation:**
    * If using Stripe Customer Portal, the email used in Stripe becomes their login identity.
    * App initializes the new user in Neon DB.
    * App saves the "in-memory" Genogram to the new Cloud Database.

---

## 6. Technical Stack Updates

### Database (Neon / PostgreSQL)
You need a `users` table, but it will only be populated for **Paid** users.

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    stripe_customer_id VARCHAR(255),
    is_premium BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE genograms (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    data JSONB NOT NULL, -- The graph structure
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);