# CircleDays - Design Decisions & Assumptions

This document captures technical decisions and assumptions made during development. These can be revisited as requirements evolve.

## 1. Image Storage
**Decision:** Use Vercel Blob for profile photo storage
**Rationale:** Native Vercel integration, generous free tier, simple API, automatic CDN

## 2. Birthday Year Handling
**Decision:** Year is required for all events (as per spec)
**Rationale:** Enables age calculation in reminders. Users can enter a placeholder year (e.g., 1900) if they don't know the real year, and we can add a "year_unknown" boolean flag later if needed.

## 3. CSV Date Format
**Decision:** Support multiple formats with smart parsing
**Formats supported:**
- ISO: `YYYY-MM-DD`
- US: `MM/DD/YYYY`, `M/D/YYYY`
- EU: `DD/MM/YYYY`, `D/M/YYYY`
- Written: `Jan 15, 1990`, `January 15 1990`

**Parsing strategy:** Use date-fns `parse` with multiple format attempts. Show preview with detected dates for user confirmation.

## 4. Session Management
**Decision:** Use `iron-session` with encrypted cookies
**Rationale:** No external session store needed, works well with serverless, secure by default. Session contains user ID only; user data fetched fresh.
**Session duration:** 30 days with rolling refresh

## 5. Expected Scale & Performance
**Decision:** Optimize for users with up to ~500 direct connections
**Hop distance calculation:** Use PostgreSQL recursive CTEs for BFS traversal, cached for 5 minutes per user. For MVP, real-time queries are acceptable.

## 6. UI Component Library
**Decision:** Custom components using Tailwind CSS, Radix primitives, and Lucide icons
**Rationale:** Full control over design, smaller bundle, matches "distinctive not generic" aesthetic goal

## 7. Design System
**Decision:** Custom distinctive design (not generic AI aesthetic)
**Color palette:** Deep teals and warm corals with cream/off-white backgrounds
**Typography:** "Outfit" for headings (geometric, modern), "DM Sans" for body (clean, readable)
**Theme:** Light mode primary, dark mode as enhancement

## 8. Email Design
**Decision:** HTML emails using React Email patterns (inline styles)
**Style:** Clean, minimal design matching app aesthetic. No heavy images/graphics.

## 9. SMS Consolidation
**Decision:** Batch multiple events into single SMS when possible
**Format:** "Reminders: [Name1]'s birthday (today), [Name2]'s birthday (in 3 days)..."
**Limit:** Max 3 events per SMS, additional events in follow-up messages

## 10. PWA Offline Behavior
**Decision:** Offline viewing of cached data only (read-only)
**Rationale:** Simplifies sync logic for MVP. No offline writes/queued actions.

## 11. Internationalization
**Decision:** English only for MVP
**Preparation:** Use a constants file for user-facing strings to ease future i18n

## 12. Accessibility
**Decision:** Target WCAG 2.1 AA compliance
**Implementation:** Semantic HTML, keyboard navigation, sufficient color contrast, ARIA labels where needed

## 13. Graph Layout
**Decision:** Concentric layout with user at center using Cytoscape.js
**Performance:** Limit rendered nodes to 150 (1-hop + sampled 2-hop). Full network searchable but not all rendered.

## 14. Phone Number Validation
**Decision:** Use permissive validation, store as E.164 format
**Rationale:** Support international numbers, normalize on storage

## 15. Profile Photo Requirements
**Decision:** Accept JPEG, PNG, WebP. Max 5MB. Auto-resize to 400x400.
**Storage path:** `/profiles/{profile_id}/avatar.{ext}`

---

## Revisit Later
- [ ] Year-optional birthdates with "year_unknown" flag
- [ ] Offline write queue for better PWA experience
- [ ] Graph database consideration if hop queries become bottleneck
- [ ] i18n support
- [ ] Dark mode toggle


