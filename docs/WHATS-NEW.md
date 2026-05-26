# FileVault — New Features to Build (Not in Project Yet)

**Last updated:** May 2026  
**Purpose:** Only **new** functionality to implement. Items you already have are listed below so you do not rebuild them.

---

## Already in your project (skip these)

Do **not** plan these again—they exist today:

| Area | Already built |
|------|----------------|
| **Our Memories** | Events list (filters, month groups), create/edit event, manage event, guest gallery + upload, share modal, guest permissions (`allowImageUpload` / `allowViewEventImages`), photobook modal, shared-with-me page (`/memories/shared`), lightbox, event types, EN/HI |
| **Photo Studio** | Dashboard, clients, gallery, albums, barcodes + QR, checkout, public selection/checkout, labor sheets, client portal, shared albums/links |
| **Photo Themes (basic today)** | Hub (`/photo-themes`), category cover editor, multi-page album builder, fixed layout grid, jsPDF export, resume by step, templates from API — **not** AI layout, client proofing, print lab, or marketplace |
| **Phone Book (basic today)** | CRUD contacts, search, type filter, favorites (local), A–Z list, meta in notes (type, tags, WhatsApp, address) — **not** campaigns, RSVP, sync, timeline, or smart segments |
| **Other** | Family tree (D3), face filter, photo book editor (`/photo-book`), upload family images, theme light/dark/system, OpenClaw assistant + WhatsApp config page, admin panel, plans/billing, invitations, portal settings |

**Gap to close (partial, not “new product”):** likes/comments on memory photos are still **client-only** (`memoriesStore`)—backend persistence is an **upgrade**, not listed below as a new idea.

---

## How to read this doc

| Tag | Meaning |
|-----|---------|
| **★★★** | High impact, strong fit for weddings + studios |
| **★★** | Pro / revenue / retention |
| **★** | Nice differentiator, more effort |
| **BE** | Needs new backend |
| **FE** | Mostly frontend |

---

## 1. Our Memories — guest & host (new)

### 1.1 Guest photo contest & voting ★★★ `FE` + `BE`

**New:** Host starts a contest (“Best candid”, “Funniest moment”). Guests vote (1 vote per guest per photo). Host sees leaderboard; winner badge on photo.

**Why new:** Engagement during reception; keeps guests on your link, not Instagram polls.

**Not in project:** No voting/contest APIs or UI.

---

### 1.2 Sub-galleries by table / group ★★★ `FE` + `BE`

**New:** Wedding hosts create **Table 1, Table 2, Family, Friends**. Guest picks table on upload; gallery can filter by group.

**Why new:** Large weddings organize chaos; photographers sell “table galleries”.

**Not in project:** Single flat gallery per event today.

---

### 1.3 Video guestbook clips ★★ `FE` + `BE`

**New:** Guests record **15–30 sec** video wishes (mobile camera). Shown in a “Messages” tab next to photos.

**Why new:** Emotional upsell for weddings; competitors are photo-only.

**Not in project:** Upload flow is image-only on guest page.

---

### 1.4 Event co-hosts (delegates) ★★ `FE` + `BE`

**New:** Host invites **co-organizer** (sibling, planner) with rights: moderate only / share only / full manage—without sharing main account password.

**Why new:** Real weddings have 2–3 people running the gallery.

**Not in project:** Share is invitee **view/upload**, not role-based co-admin.

---

### 1.5 Auto SMS/WhatsApp reminders ★★★ `FE` + `BE`

**New:** Rules: “3 days after event if &lt; 20 photos → remind all invitees”, “1 day before gallery closes → final call”. Uses Phone Book + share list.

**Why new:** Upload rate is the #1 metric; reminders are manual today.

**Not in project:** `sessionReminders` in studio settings is for **studio sessions**, not memory events.

---

### 1.6 Gallery close date & countdown ★★ `FE` + `BE`

**New:** Host sets **upload deadline**; guest page shows countdown; uploads lock after date (view may stay open).

**Why new:** Photobook production needs a clear cutoff.

**Not in project:** `isEventDateExpired` exists for event date—not a dedicated “gallery closes” policy UI.

---

### 1.7 Guest consent & model release ★★ `BE` + `FE`

**New:** Optional checkbox on upload: “I agree photos may be used in album / social by host.” Stored per upload with timestamp + IP.

**Why new:** Pros and schools need legal cover; rarely in consumer apps.

**Not in project:** No consent capture on guest upload.

---

### 1.8 Embeddable event widget ★★ `FE` + `BE`

**New:** Host copies **iframe / script snippet** to embed latest 12 photos on their wedding website (read-only, token-scoped).

**Why new:** Marketing for you; host’s site stays fresh.

**Not in project:** No embed generator.

---

### 1.9 Multi-year “family reunion” series ★ `FE` + `BE`

**New:** Link events as **Series** (e.g. “Sharma Family Reunion”) — timeline across years, same guests invited again.

**Why new:** Retention; annual events without new product learning.

**Not in project:** Events are isolated.

---

### 1.10 Live guest counter on venue screen ★★ `FE` + `BE`

**New:** Full-screen URL for venue TV: photo count, last upload thumbnail, QR to join—**no login** (token in URL).

**Why new:** Different from slideshow; drives participation at sangeet/reception.

**Not in project:** No dedicated “venue display” mode (slideshow/TV mode not built).

---

## 2. Photo Studio — pro workflow (new)

### 2.1 AI cull assistant (blur / duplicate / eyes closed) ★★★ `BE` + `FE`

**New:** After studio upload, run **auto cull** scores; photographer reviews “reject stack” vs “keepers” before client proofing.

**Why new:** Saves hours per wedding; uses your image pipeline, not a separate app.

**Not in project:** Face sync exists; no quality/duplicate culling UI.

---

### 2.2 Client mood board before shoot ★★ `FE` + `BE`

**New:** Per client job: board for **reference images, colors, Pinterest links, notes**—visible to studio before shoot day.

**Why new:** Reduces “that’s not what we wanted” disputes.

**Not in project:** No pre-shoot inspiration space.

---

### 2.3 Contract + e-sign on client record ★★ `BE` + `FE`

**New:** Attach contract PDF; client signs in portal; status **Signed / Pending** on client card.

**Why new:** Studios use DocuSign separately today—keep them inside FileVault.

**Not in project:** No contract module.

---

### 2.4 Second shooter / editor assignment ★★ `FE` + `BE`

**New:** Job fields: **Lead / Second / Retoucher**; filter gallery and labor sheet by assignee; internal notes per role.

**Why new:** Multi-person studios need attribution, not one “owner”.

**Not in project:** Client list has no crew roles on jobs.

---

### 2.5 Delivery package builder ★★★ `FE` + `BE`

**New:** Define packages: **Web gallery + N prints + photobook + RAW optional**. Client sees checklist; studio marks each **delivered**.

**Why new:** Clear “done” state; upsell structure.

**Not in project:** Checkout exists for sales; not a **delivery checklist** per job.

---

### 2.6 Instagram / social export presets ★★ `FE`

**New:** One-click export sets: **1080×1080, 1080×1920 story**, watermark position, caption template with client name.

**Why new:** Studios post daily; they re-export manually now.

**Not in project:** Download exists; no social preset pack.

---

### 2.7 Before / after editing comparison ★★ `FE`

**New:** Pair **SOOC** vs **edited** for same image; client slider in portal (proofing wow-moment).

**Why new:** Justifies editing fee; educational for clients.

**Not in project:** Single version per image in UI.

---

### 2.8 Print lab order handoff ★★ `BE` + `FE`

**New:** Export **ICC profile + crop marks + order XML/CSV** for partner lab; track lab order id on job.

**Why new:** Barcodes help internal workflow; labs need structured orders.

**Not in project:** Barcode QR is for **client access**, not lab fulfillment file.

---

## 3. Connect what you have (new bridges)

These use existing modules in **new** ways—not duplicate features.

### 3.1 WhatsApp → gallery upload ★★★ `BE` + `FE`

**New:** Guest sends photo to **your WhatsApp bot (OM)** → image lands in correct event gallery (match phone to Phone Book / share list).

**Why new:** India-first; guests already live on WhatsApp.

**Build on:** `WhatsAppConfigPage`, OpenClaw, `POST /api/images/upload`, memories event link.

**Not in project:** WhatsApp is config + chat assistant, not inbound media → event.

---

### 3.2 Family tree ↔ tag people in photos ★★★ `FE` + `BE`

**New:** On memory or studio image: **tag person** → pick node from family tree; filter gallery “photos of Grandma”.

**Why new:** Only you have **tree + gallery** in one app.

**Not in project:** Tree and photos are separate.

---

### 3.3 Face Sync → “photos of me” for guests ★★★ `FE` + `BE`

**New:** Guest selfie on event page → show only images where they appear (face index per event).

**Why new:** Killer feature; Face Sync exists but not wired to **guest memories URL**.

**Not in project:** Face filter is standalone route, not guest event flow.

---

### 3.4 Phone Book → RSVP & guest lists ★★ `FE` + `BE`

**New:** See **§11 Phone Book** (RSVP hub, smart segments, bulk invite)—bridge from event manage → filtered contact list.

**Not in project:** `inviteStatus` in meta exists but no full RSVP workflow UI.

---

### 3.5 Labor sheet ↔ album delivery status ★★ `FE` + `BE`

**New:** Labor sheet row links to **album id**; changing sheet status updates client portal “Processing / Ready”.

**Why new:** Today labor sheet and albums are parallel, not synced.

---

### 3.6 Photo Themes → Memories / Studio albums ★★★ `FE` + `BE`

**New:** See **§10 Photo Themes** (one-click album from event, brand kit, print lab)—pull `imageIds` from Memories event or studio album into builder.

**Not in project:** Manual photo pick only; no “build book from this event” wizard.

---

## 4. Platform, growth & trust (new)

### 4.1 Webhooks for integrators ★★ `BE`

**New:** `event.created`, `photo.uploaded`, `album.delivered` → HTTPS webhook URLs in portal settings.

**Why new:** Studios want Zapier, their CRM, accounting—not locked in.

---

### 4.2 Referral credits ★★ `BE` + `FE`

**New:** Host shares referral link; new signup gives both **storage bonus** or month discount.

**Why new:** Low-cost growth for memories hosts.

---

### 4.3 White-label subdomain per studio ★★ `BE` + `FE`

**New:** `studio-name.yourdomain.com` + logo only on guest pages (beyond portal colors).

**Why new:** Agencies resell; pros want their domain.

**Not in project:** Portal branding is settings-level, not per-tenant subdomain.

---

### 4.4 Audit trail export ★★ `BE` + `FE`

**New:** CSV: who downloaded, shared, approved, deleted—which image, when, IP.

**Why new:** Schools, corporates, legal events.

**Not in project:** Admin stats exist; no per-action audit export.

---

### 4.5 Backup mirror to customer S3 ★ `BE`

**New:** Optional: nightly copy of tenant images to **their** bucket (credentials in Services page).

**Why new:** Enterprise trust; you already have S3/B2 service config.

---

### 4.6 Google Calendar sync for shoots ★★ `FE` + `BE`

**New:** Studio jobs sync to Google Calendar; reminders on phone.

**Why new:** Session reminders in settings are in-app only—not calendar sync.

---

## 5. AI & OM (new capabilities)

### 5.1 Auto event recap story ★★ `FE` + `BE`

**New:** OM generates **short narrative + 8 hero picks** from event metadata and upload dates (“Your wedding day in photos”).

**Why new:** Shareable story card for hosts; uses OM + gallery, new output format.

---

### 5.2 Smart caption suggestions ★★ `FE` + `BE`

**New:** Per photo or batch: suggested captions in EN/HI for social or photobook.

**Why new:** Hosts stall on captions; OM already has page context.

---

### 5.3 Voice notes on photos ★ `FE` + `BE`

**New:** Host or guest attaches **10 sec voice** to a photo; plays in lightbox.

**Why new:** Context for future generations; not video guestbook scale.

---

## 10. Photo Themes — big ideas (beyond basic templates)

**Today:** Pick category → design cover → fill pages with layouts → save → PDF. Good start, but feels like a **generic editor**. Below turns it into a **pro photobook product** studios can sell.

### What you have now (baseline)

| Step | Route | Limitation |
|------|--------|------------|
| Hub | `/photo-themes` | Static/fallback cards; no pricing, no marketplace |
| Cover | `/photo-themes/:slug` | Front/back only; no brand kit enforcement |
| Builder | `.../album` | Manual drag layouts; no AI story, no client proofing |
| Export | jsPDF in browser | No bleed marks, no lab ICC, no order tracking |

---

### 10.1 AI Story Album — “200 photos → finished book in 10 minutes” ★★★ `BE` + `FE`

**New:** Wizard: user selects **Memories event** or **studio album** → AI clusters by time/face/scene → picks hero shots → assigns layouts across spreads → generates draft all pages. User tweaks, not builds from zero.

**User value:** Wedding photographers deliver albums faster; hosts get a book without layout skills.

**Build on:** `PhotoThemeAlbumBuilderPage`, Face Sync, event `imageIds`, OM for caption pass.

**Routes:** `/photo-themes/auto-build` or modal from hub.

---

### 10.2 Studio Brand Kit (locked design system) ★★★ `FE` + `BE`

**New:** Portal settings: **logo, primary/secondary colors, 2 fonts, watermark style**. Every theme inherits kit—covers, spines, page backgrounds cannot break brand.

**User value:** Albums look like *your studio*, not a template farm.

**Build on:** `portalSettings.ts`, `PhotoThemeCategoryPage` cover editor.

---

### 10.3 Client proofing & spread comments ★★★ `FE` + `BE`

**New:** Share **read-only flipbook link** to bride/client. They **approve / request changes** per spread; pin comments on regions. Studio sees queue: “3 spreads need revision”.

**User value:** Professional workflow; fewer WhatsApp screenshot loops.

**Not in project:** No client-facing proofing for photobooks (studio checkout is different).

---

### 10.4 Print Lab Pro — bleed, ICC, order ID ★★★ `BE` + `FE`

**New:** Export profiles: **8×8, 10×10, 12×12, A4** with 3mm bleed, crop marks, 300 DPI, optional ICC (sRGB/Adobe RGB). Submit **order package** (PDF + manifest JSON) to lab API or download ZIP for lab portal.

**User value:** Real money feature—studios pay for “print-ready”, not just PDF.

**Build on:** Existing jsPDF path in `PhotoThemeAlbumBuilderPage.tsx` — replace/extend with server-side render option.

---

### 10.5 Theme Marketplace & designer templates ★★ `BE` + `FE`

**New:** **Marketplace** tab on hub: premium layouts by category (Wedding cinematic, Minimal Indian, Kids playful). Studio purchases or subscribes; revenue share for template authors.

**User value:** Always fresh designs; you become platform, not 4 static categories.

**Admin:** Upload template ZIP + metadata; preview in sandbox.

---

### 10.6 Variable-data guest books (personalized copies) ★★ `BE` + `FE`

**New:** One master design → **50 covers** each with guest name from Phone Book / CSV. Batch render PDFs for favor books or thank-you gifts.

**User value:** High-margin add-on at weddings (“personal album for each family table”).

---

### 10.7 Pricing & package calculator on hub ★★ `FE` + `BE`

**New:** On hub: pick size + page count + cover type → **instant quote** (studio-configured rates). “Send quote to client” → link with approve + pay (tie to checkout).

**User value:** Sales tool, not just design tool.

---

### 10.8 Version history & design branches ★★ `BE` + `FE`

**New:** Photobook snapshots every save; **compare v3 vs v5**; restore spread. Branch: “Client requested changes” fork without losing original.

**User value:** Safety on 40-page books; pros expect this.

---

### 10.9 Video & motion spreads ★★ `BE` + `FE`

**New:** Embed **short video loop** or QR on printed page that opens highlight reel (from Memories or studio reel).

**User value:** Premium wedding albums; differentiation vs Canva static books.

---

### 10.10 Collaborative editing (studio + client) ★★ `FE` + `BE`

**New:** Real-time or async **co-edit**: client moves photos only in allowed zones; studio locks master template. Presence: “Priya is viewing page 12”.

**User value:** Engagement without giving full account access.

---

### 10.11 OM Photobook Copilot ★★★ `FE` + `BE`

**New:** In builder panel: “Write captions for all pages”, “Suggest title for cover”, “Shorten text to fit box”, EN/HI. Uses page context + event type.

**User value:** Removes blank-page paralysis; uses your OM investment.

---

### 10.12 Multi-output from one design ★★ `FE`

**New:** One project → export **print PDF + social carousel ZIP + animated flip MP4** for Instagram.

**User value:** One job, many deliverables.

---

### Photo Themes — suggested build order

```
Phase PT-1 (revenue)
  10.4 Print Lab Pro
  10.7 Pricing calculator
  10.3 Client proofing

Phase PT-2 (speed)
  10.1 AI Story Album
  3.6 Memories → builder import
  10.2 Brand Kit

Phase PT-3 (platform)
  10.5 Marketplace
  10.6 Variable-data books
  10.11 OM Copilot
```

**Files:** `src/pages/photo-themes/*`, `src/templates/photobookTemplates.ts`, `docs/PHOTO-THEMES.md`

---

## 11. Phone Book — big ideas (beyond contact list)

**Today:** A nice **Guest Contacts** list with types and favorites. Useful, but still a **digital address book**. Below makes it the **CRM + outreach hub** for weddings and studios.

### What you have now (baseline)

| Feature | Status |
|---------|--------|
| List / search / filter by type | ✅ |
| Favorites (device local store) | ✅ |
| Contact detail CRUD | ✅ |
| Meta: WhatsApp, address, tags, `linkedEventIds`, `inviteStatus` | ✅ in `phoneBookService` meta |
| Bulk SMS campaigns | ❌ |
| Google contact sync | ❌ |
| Per-contact activity timeline | ❌ |
| RSVP dashboard | ❌ |
| Smart segments | ❌ |

---

### 11.1 Contact Timeline (360° view) ★★★ `FE` + `BE`

**New:** On contact detail: chronological **timeline** — invited to event X, opened gallery, uploaded 3 photos, shared album Y, paid invoice Z, photobook ordered.

**User value:** One screen before calling a client; no digging in three modules.

**Build on:** `PhoneBookDetailPage.tsx`, memories share logs, studio checkout, invitations APIs.

---

### 11.2 Smart Segments & dynamic lists ★★★ `FE` + `BE`

**New:** Saved segments: “All Wedding 2026”, “VIP no upload yet”, “Delhi clients”, “Bride side family”. Filters: type, tags, city, last activity, event linked. Segments **auto-update**.

**User value:** Targeted outreach in one click; real CRM behavior.

---

### 11.3 Bulk campaigns (WhatsApp / SMS / email) ★★★ `BE` + `FE`

**New:** Pick segment → template (“Upload your photos”, “Album ready”) → schedule send → delivery stats (sent, failed, opened if trackable).

**User value:** Replaces manual WhatsApp broadcast lists; ties to §1.5 event reminders.

**Build on:** `InviteContactsModal.tsx`, `public-share/send`, WhatsApp config.

---

### 11.4 RSVP & guest list command center ★★★ `FE` + `BE`

**New:** Per event: import segment → **Invited / Attending / Declined / No response**. Send invite link; scan QR check-in at venue. Manage page shows RSVP funnel chart.

**User value:** Wedding planners live in RSVP; you own the guest list + gallery in one place.

**Build on:** `meta.inviteStatus`, memories event manage share.

---

### 11.5 Google / iCloud contact sync ★★ `BE` + `FE`

**New:** OAuth sync; choose folders; **two-way or import-only**; duplicate detection on merge.

**User value:** No re-typing hundreds of wedding guests.

---

### 11.6 Business card scan (OCR add) ★★ `FE` + `BE`

**New:** Mobile camera scan at meet → parse name, phone, email → create contact + suggest type (Client / Organizer).

**User value:** Studios network at expos; instant capture.

---

### 11.7 Auto-create contact from guest upload ★★★ `FE` + `BE`

**New:** Guest upload form: optional name + phone → **create or match** Phone Book contact → link to event → set `linkedEventIds`.

**User value:** Book grows automatically; better reminders next event.

---

### 11.8 Duplicate merge & data quality ★★ `FE` + `BE`

**New:** “12 possible duplicates” → merge wizard (keep best email/phone, combine tags/events).

**User value:** Clean data before bulk campaigns.

---

### 11.9 Team phone book & permissions ★★ `BE` + `FE`

**New:** Studio staff roles: **view only / edit / campaign send / admin**. Audit who exported or messaged a segment.

**User value:** Multi-photographer studios; enterprise sales.

---

### 11.10 Map & territory view ★★ `FE` + `BE`

**New:** Map pins by city/state from contact address; filter shoots “near Jaipur this month”.

**User value:** Travel wedding planners; regional marketing.

---

### 11.11 Follow-up tasks & pipeline ★★ `FE` + `BE`

**New:** Per contact: tasks (“Call after delivery”, “Send album link”). Pipeline stages: **Lead → Booked → Shot → Delivered → Advocate**.

**User value:** Sales follow-up without separate CRM.

---

### 11.12 Consent & DND compliance ★★ `BE` + `FE`

**New:** Flags: **marketing OK**, **WhatsApp OK**, consent timestamp. Block campaign if DND; export consent log for legal.

**User value:** Required for bulk SMS in India; trust for corporates.

---

### 11.13 Referral tracking per contact ★★ `FE` + `BE`

**New:** “Referred by” link between contacts; report: top referrers, bonus credits.

**User value:** Growth loop for hosts and studios.

---

### 11.14 Favorites & tags cloud-synced ★★ `BE` + `FE`

**New:** Move favorites from `phoneBookPrefsStore` (local only) to **server**; shared tags across devices/staff.

**User value:** Team sees same VIP list; fixes today’s local-only fav limitation.

---

### 11.15 Integration shortcuts on contact card ★★ `FE`

**New:** One-tap: **Create event**, **Start photobook**, **Share album**, **Open in WhatsApp** (deep link), **Add to family tree**.

**User value:** Phone Book becomes **action center**, not static record.

---

### Phone Book — suggested build order

```
Phase PB-1 (CRM core)
  11.1 Contact Timeline
  11.15 Integration shortcuts
  11.14 Cloud favorites/tags

Phase PB-2 (wedding season)
  11.4 RSVP command center
  11.3 Bulk campaigns
  11.2 Smart Segments

Phase PB-3 (growth & scale)
  11.5 Contact sync
  11.7 Auto-create from guest upload
  11.6 Business card OCR
```

**Files:** `src/pages/PhoneBook/*`, `src/api/services/phoneBookService.ts`, `phoneBookPrefsStore.ts`

---

## 6. Recommended build order (all new)

```
Phase A — Wedding season impact
  1.5 Auto reminders (SMS/WhatsApp)
  1.6 Gallery close date + countdown
  3.1 WhatsApp → gallery upload
  1.2 Sub-galleries by table

Phase B — Pro studio money
  2.5 Delivery package builder
  2.1 AI cull assistant
  2.8 Print lab handoff
  3.3 Face Sync → guest “photos of me”

Phase C — Moat & growth
  1.1 Photo contest
  3.2 Family tree tags on photos
  4.1 Webhooks
  1.8 Embeddable widget

Phase PT — Photo Themes (pro product)
  10.4 Print Lab Pro
  10.1 AI Story Album
  10.3 Client proofing
  10.2 Brand Kit

Phase PB — Phone Book (CRM hub)
  11.1 Contact Timeline
  11.4 RSVP center
  11.3 Bulk campaigns
  11.2 Smart Segments
```

---

## 7. Do not build (low fit for FileVault)

- Generic social network (feed, follow, DMs)
- Crypto / NFT galleries
- Full video editing suite
- Replacement for QuickBooks (light invoicing OK; full accounting no)
- Another generic cloud drive without photos/events angle

---

## 8. Success metrics (for new features only)

| Feature | Metric |
|---------|--------|
| Reminders + WhatsApp upload | ↑ guest uploads per event |
| Gallery close date | ↑ photobook orders before deadline |
| Table sub-galleries | ↑ uploads per table (even distribution) |
| AI cull | ↓ hours from upload to client proof |
| Delivery packages | ↑ jobs marked fully delivered |
| Face “photos of me” | ↑ guest return visits to link |
| AI Story Album (§10.1) | ↓ hours per delivered photobook |
| Print Lab export (§10.4) | ↑ paid print orders |
| RSVP + campaigns (§11) | ↑ guest upload rate per event |
| Contact timeline (§11.1) | ↓ support “what did we send them?” |

---

## 9. File map (where new code likely goes)

| New feature area | Start here |
|------------------|------------|
| Guest event UX | `src/pages/memories/MemoriesPublicGalleryPage.tsx`, `GuestMemoriesIntro.tsx` |
| Host manage | `MemoriesEventManagePage.tsx` |
| Studio jobs | `ClientManagement.tsx`, `PhotoStudioAlbum.tsx`, `labor-sheet/` |
| **Photo Themes** | `src/pages/photo-themes/PhotoThemesPage.tsx`, `PhotoThemeAlbumBuilderPage.tsx`, `PhotoThemeCategoryPage.tsx`, `docs/PHOTO-THEMES.md` |
| **Phone Book** | `src/pages/PhoneBook/*`, `phoneBookService.ts`, `InviteContactsModal.tsx` |
| WhatsApp / OM | `WhatsAppConfigPage.tsx`, OpenClaw tools, `backend.md` |
| Face + tree | `FilterImagesPage.tsx`, `FamilyTreePage.tsx`, new `services/` |
| Integrations | `PortalSettingsPage.tsx`, new `api/webhooks` |

---

*When a feature ships, move it to “Already in project” at the top and remove it from the sections below.*
