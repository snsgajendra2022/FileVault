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
| **Other** | Phone book, family tree (D3), face filter, photo themes + album builder, photo book editor, upload family images, theme light/dark/system, OpenClaw assistant + WhatsApp config page, admin panel, plans/billing, invitations, portal settings |

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

### 3.4 Phone Book → RSVP list for event ★★ `FE` + `BE`

**New:** Import contacts as **invited / attending / declined**; share link only to “attending”; stats on manage page.

**Why new:** Phone Book is contacts only—no RSVP state tied to event.

**Not in project:** No RSVP entity.

---

### 3.5 Labor sheet ↔ album delivery status ★★ `FE` + `BE`

**New:** Labor sheet row links to **album id**; changing sheet status updates client portal “Processing / Ready”.

**Why new:** Today labor sheet and albums are parallel, not synced.

---

### 3.6 Photo Themes → one-click “print this layout” ★★ `FE` + `BE`

**New:** From album builder: **Export print-ready PDF** with bleed, not just JSON preview.

**Why new:** Builder is design-focused; print shops need PDF/X.

**Not in project:** Preview/download JSON exists on PhotoBook preview—not full print pipeline.

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

---

## 9. File map (where new code likely goes)

| New feature area | Start here |
|------------------|------------|
| Guest event UX | `src/pages/memories/MemoriesPublicGalleryPage.tsx`, `GuestMemoriesIntro.tsx` |
| Host manage | `MemoriesEventManagePage.tsx` |
| Studio jobs | `ClientManagement.tsx`, `PhotoStudioAlbum.tsx`, `labor-sheet/` |
| WhatsApp / OM | `WhatsAppConfigPage.tsx`, OpenClaw tools, `backend.md` |
| Face + tree | `FilterImagesPage.tsx`, `FamilyTreePage.tsx`, new `services/` |
| Integrations | `PortalSettingsPage.tsx`, new `api/webhooks` |

---

*When a feature ships, move it to “Already in project” at the top and remove it from the sections below.*
