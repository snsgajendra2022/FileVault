# Public Share Sent – Record Creation & Share ID

This document describes how **share-sent records** are created, stored, and how the **Share ID** is included in emails and SMS when sending a public share link.

---

## 1. Overview

When a photographer sends a share (public URL + message) to contacts via **POST /api/public-share/send**, the backend:

1. **Creates a new row** in the `public_share_sent` table **for each recipient** (one per email, one per mobile).
2. **Uses the new record’s ID** (auto-generated) before sending.
3. **Includes that ID in the outgoing email or SMS** as **Share ID: &lt;id&gt;** so the recipient (and support) can refer to the specific share event.

The record is always saved in the database; the Share ID is also sent in the message body.

---

## 2. When Records Are Created

| Action | Creates record? | Share ID in message? |
|--------|------------------|------------------------|
| **POST /api/public-share/send** (email) | Yes, one per email recipient | Yes, in email body |
| **POST /api/public-share/send** (SMS)   | Yes, one per mobile recipient | Yes, in SMS body |
| **POST /api/public-verify/notify-existing-user** | No | No (no `public_share_sent` row) |

Records are created **only** when using the **Send Share** API. The “notify existing user” email does not create a `public_share_sent` row and does not include a Share ID.

---

## 3. Order of Operations (Send Share)

For each recipient (email or mobile), the backend:

1. **Insert** a new row into `public_share_sent` with:
   - `user_id` (photographer)
   - `recipient_email` or `recipient_mobile`
   - `public_url`, `message`, `created_at`
2. **Read** the generated `id` of that row.
3. **Send** the email (or SMS) with the body including **Share ID: &lt;id&gt;**.
4. If sending **fails**, the row is still kept in the DB (audit); the send is reported in the API response as failed.

So: **record is created first, then the email/SMS is sent with that record’s id.**

---

## 4. Table: `public_share_sent`

**Migration file:** `database_public_share_sent_migration.sql`

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGINT (PK, auto-increment) | Unique Share ID; included in the email/SMS body. |
| `user_id` | BIGINT NOT NULL | Photographer who sent the share. |
| `recipient_email` | VARCHAR(255) | Recipient email (null for SMS-only). |
| `recipient_mobile` | VARCHAR(20) | Recipient mobile E.164 (null for email-only). |
| `public_url` | VARCHAR(1024) | Shared public URL. |
| `message` | TEXT | Optional message from the photographer. |
| `created_at` | TIMESTAMP NOT NULL | When the record was created. |

**Indexes:**

- `idx_share_sent_user` on `user_id`
- `idx_share_sent_email` on `(user_id, recipient_email)`
- `idx_share_sent_mobile` on `(user_id, recipient_mobile)`

---

## 5. Share ID in Email and SMS

### Email

- **Subject:** “Photo Studio - Shared link with you”
- **Body** includes (in order):
  - Custom message (if any)
  - **Link:** &lt;publicUrl&gt;
  - **Share ID:** &lt;id&gt;  ← id of the new `public_share_sent` row

Example:

```
Here are your photos.

Link: https://example.com/public/checkout?q=Ab3x...

Share ID: 42
```

### SMS (stub)

- Body includes the same link and **Share ID: &lt;id&gt;** when a record is created for that mobile.

---

## 6. How These Records Are Used

| Use | Description |
|-----|-------------|
| **Check recipient** | GET /api/public-share/check-recipient checks if a given email/mobile (and optionally publicUrl) already has a row → “Already sent to this email”. |
| **Check-user / sendNotification** | POST /api/public-verify/check-user returns `sendNotification: true` only if the request email/mobile has at least one row in `public_share_sent`. |
| **Notify-existing-user** | POST /api/public-verify/notify-existing-user sends the “you opened a link” email/SMS only if the given email/mobile exists in `public_share_sent`. |
| **Audit / support** | Recipients and support can use the **Share ID** from the email/SMS to refer to the exact share event (e.g. when contacting support). |

---

## 7. API Summary

| API | Creates `public_share_sent`? | Includes Share ID in message? |
|-----|------------------------------|-------------------------------|
| POST /api/public-share/send (email) | Yes, one per email | Yes |
| POST /api/public-share/send (SMS)   | Yes, one per mobile | Yes |
| GET /api/public-share/check-recipient | No (read-only) | — |
| POST /api/public-verify/check-user    | No (read-only) | — |
| POST /api/public-verify/notify-existing-user | No | No |

---

## 8. Related Docs

- **BACKEND_API_PUBLIC_SHARE_VERIFICATION.md** – Full API for public share and verify (endpoints, request/response, errors).
- **FRONTEND_API_REFERENCE.md** – Frontend-oriented API list and examples.
- **database_public_share_sent_migration.sql** – SQL to create the `public_share_sent` table.
