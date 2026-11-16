# The Vantillu Co.

*Traditional roots, modern soul.*

Homemade chocolates, traditional podis, healthy sweets and healthy cookies. This is a Next.js storefront with cart, guest checkout, Razorpay payments, optional customer accounts, order tracking and a private admin dashboard.

For what the repository looked like before this work, see [`docs/IMPLEMENTATION_ASSESSMENT.md`](docs/IMPLEMENTATION_ASSESSMENT.md).

> **Status:** implemented and tested against a local Postgres, a mock Razorpay server and a fake gateway. It has **not** been run against a real Razorpay account, a real Supabase project or a real email provider. Work through the [production verification checklist](#production-verification-checklist) in Razorpay **test mode** before going live.

---

## Architecture

| Area | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript, hand-written CSS in `app/globals.css` |
| Hosting | Vercel (existing deployment preserved) |
| Database | PostgreSQL (Supabase recommended) through `pg`. No client-side DB SDK |
| Payments | Razorpay Orders API and Checkout, called over REST. No SDK |
| Auth | Passwordless email one-time code. Sessions are hashed tokens in an HttpOnly cookie |
| Email | Resend REST API via a `notification_outbox` table. WhatsApp is a stubbed channel for later |
| Images | Uploads are re-encoded to WebP with `sharp`, stored in `product_images`, served at `/api/images/:id` |
| Rate limiting | Postgres-backed (works across serverless instances) |

Key rules enforced in code:

- **The server prices everything.** Order amounts are computed from DB product prices and delivery settings. Frontend totals are ignored.
- **Money is stored as integer paise.**
- **Paid means verified.** An order becomes paid only after (a) a valid Razorpay signature checked on the backend and the payment re-read from the Razorpay API, or (b) a signature-verified webhook. The browser's success callback alone never marks an order paid.
- **Idempotent.** Webhook events are de-duplicated (`webhook_events`), payments are unique per gateway payment ID, and checkout uses an idempotency key, so retries and refreshes never create duplicate orders or payments.
- **Stock** is reserved when an order is created and released on cancel, expiry or refund. Unpaid orders are held for 30 minutes. Before expiring one, the server checks Razorpay in case the payment actually succeeded.
- **Late payments** on an already-cancelled order are re-accepted if stock allows. Otherwise they are automatically refunded.
- **Guest orders** are reachable only via an HMAC-signed link token or order number + mobile lookup. Order IDs are never enough on their own.
- **Admin** routes are authorised server-side (role in DB). Every admin order change is written to `audit_log` and `order_status_history`.
- **RLS** is enabled on every table with no policies, and `anon`/`authenticated` privileges are revoked. All access goes through the server with the `DATABASE_URL` role.
- **No free-delivery threshold** exists unless the owner sets one in Admin → Delivery. The default delivery fee is ₹0 until configured.

### Order statuses

Payment Pending → (Payment Received) → Confirmed → Preparing → Dispatched → Delivered, plus Payment Failed, Cancelled, Refund Initiated and Refunded. Courier and tracking details are shown to customers only after an admin enters them.

### Main routes

| Customer | Admin (role required) |
| --- | --- |
| `/shop`, `/product/[slug]`, `/cart`, `/checkout` | `/admin` overview |
| `/order/[orderNumber]` (payment result) | `/admin/orders`, `/admin/orders/[orderNumber]` |
| `/track` (guest lookup) | `/admin/products` |
| `/account`, `/account/login`, `/account/orders` | `/admin/delivery` |
| | `/admin/customers`, `/admin/customers/[id]` |

---

## Local setup

Requirements: Node.js 22+ and a PostgreSQL database.

```bash
npm install
cp .env.example .env.local   # fill in values; never commit .env.local
npm run db:migrate           # applies migrations/*.sql, safe to re-run
npm run dev                  # http://localhost:3000
```

Local Postgres must listen on `127.0.0.1`. Do not bind to `0.0.0.0`.

### Environment variables

All secrets live in environment variables. Nothing sensitive is committed. See [`.env.example`](.env.example).

| Variable | Required | Scope | Purpose |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | server | Postgres URI. For Supabase use the pooled URI (port 6543) |
| `DATABASE_CA_CERT` | no | server | PEM CA (`\n` for newlines) to fully verify DB TLS |
| `DATABASE_POOL_MAX` | no | server | Connections per serverless instance (default small) |
| `RAZORPAY_KEY_ID` | yes | server | `rzp_test_…` until go-live |
| `RAZORPAY_KEY_SECRET` | yes | server | Razorpay API secret. Never exposed to the browser |
| `RAZORPAY_WEBHOOK_SECRET` | yes | server | Secret you set on the webhook. Different from the key secret |
| `SESSION_SECRET` | yes | server | ≥ 32 random chars. Signs guest order links, hashes OTPs and sessions |
| `RESEND_API_KEY` | for email | server | Resend API key |
| `EMAIL_FROM` | for email | server | Sender on a Resend-verified domain |
| `ADMIN_NOTIFY_EMAIL` | no | server | Gets a message for each newly paid order |
| `ADMIN_BOOTSTRAP_EMAILS` | yes (first run) | server | Comma-separated emails that become owner admin on first OTP sign-in |
| `CRON_SECRET` | yes | server | Bearer secret for `/api/cron/maintenance` |
| `NEXT_PUBLIC_SITE_URL` | yes | public | Canonical URL, no trailing slash. Used in email links |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | no | public | Existing WhatsApp contact number |
| `NEXT_PUBLIC_GTM_ID` | no | public | Optional Google Tag Manager |

Generate secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

`RAZORPAY_API_BASE` exists only for local mock testing and is ignored when `NODE_ENV=production`.

---

## Database

- `migrations/001_init.sql`: schema, indexes, constraints, RLS, privilege revokes.
- `migrations/002_seed_catalogue.sql`: seeds the 14 existing products and 4 categories.

Tables: `users`, `customer_profiles`, `addresses`, `categories`, `products`, `product_images`, `orders`, `order_items` (price and description snapshots), `payments`, `refunds`, `order_status_history`, `delivery_settings`, `serviceable_postcodes`, `admin_roles`, `audit_log`, `auth_otps`, `sessions`, `notification_outbox`, `webhook_events`, `rate_limits`.

**Seed data does not invent prices.** All products are seeded with no price, unavailable and enquiry-only. The default serviceable PIN prefix is `500` and the delivery fee is ₹0 with no threshold. Set real values in the admin dashboard before launch.

Apply migrations with `npm run db:migrate` (needs `DATABASE_URL`). Applied migrations are tracked, so re-running is a no-op.

---

## Razorpay setup (test mode first)

1. Create or log into a Razorpay account and switch the dashboard to **Test Mode**.
2. Account & Settings → API Keys → generate keys. Put `rzp_test_…` in `RAZORPAY_KEY_ID` and the secret in `RAZORPAY_KEY_SECRET`.
3. Dashboard → Settings → Webhooks → Add new webhook:
   - **URL:** `https://<your-domain>/api/webhooks/razorpay`
   - **Secret:** choose a random value and put it in `RAZORPAY_WEBHOOK_SECRET`
   - **Events:** `payment.captured`, `payment.authorized`, `payment.failed`, `order.paid`, `refund.created`, `refund.processed`, `refund.failed`
4. For local webhook testing, expose your dev server with a tunnel. Razorpay cannot reach `localhost`.
5. Prefer **auto-capture** in Razorpay settings. If a payment arrives only as `authorized`, the server captures it through the Razorpay API and marks the order paid only after the gateway confirms the capture.
6. Test with Razorpay's test cards and UPI IDs (see Razorpay docs). Available methods depend on what is enabled on your merchant account.

**Going live:** only after Razorpay KYC and merchant activation are complete **and** the checklist below passes in test mode. Then replace the test keys with `rzp_live_…` keys, create a **separate live webhook** with its own secret, update the Vercel env vars and redeploy.

---

## Deployment (Vercel)

1. Create the database (Supabase: New project → copy the pooled connection string).
2. Run `DATABASE_URL=… npm run db:migrate` from a trusted machine.
3. In Vercel → Project → Settings → Environment Variables, add every variable from the table above. Use **Preview** with test keys and **Production** with test keys until go-live.
4. Deploy this branch as a **preview** first. Do not merge to `main` (production) until the checklist passes.
5. Create the Razorpay test webhook pointing at the preview URL (or a staging domain), then run the checklist.
6. `vercel.json` registers a daily cron for `/api/cron/maintenance` (expires unpaid orders, reconciles pending payments, sends queued emails). Vercel sends `Authorization: Bearer $CRON_SECRET` automatically when `CRON_SECRET` is set. Note that Vercel Hobby plans limit cron frequency to once per day.
7. Email: in Resend, add and verify your sending domain (SPF/DKIM DNS records), then set `EMAIL_FROM` on that domain.
8. Merge to `main` when satisfied. The existing Vercel production deployment continues unchanged in how it is built.

### Admin bootstrap

1. Set `ADMIN_BOOTSTRAP_EMAILS=owner@yourdomain.com`.
2. Visit `/account/login`, enter that email and the one-time code you receive. That account becomes the owner admin.
3. `/admin` is then visible to that account only. Everyone else gets a 404 and admin APIs return 401/403 regardless of what the UI shows.
4. Remove or keep the variable afterwards. The role is stored in `admin_roles`.

### First-launch configuration (in the admin dashboard)

- Products: set price, pack label, stock and availability. Upload images. Products without a price stay enquiry-only.
- Delivery: set the delivery fee, serviceable PIN prefixes or full PINs and enable delivery.
- Update the policy pages in `app/policies/[slug]/page.tsx` with the business's verified shipping, returns, privacy and terms text.

---

## Testing

```bash
npm run lint
npm run typecheck
npm test        # 80 tests: pricing, validation, payments, webhooks, access control
npm run build
```

### Results recorded during development

| Suite | Result |
| --- | --- |
| Vitest (PGlite Postgres + fake gateway) | 80 / 80 passed |
| Lint, `tsc --noEmit` | clean |
| Browser end-to-end (Playwright, local Postgres + mock Razorpay Checkout/API) | 59 / 59 passed |
| `npm audit` | 7 moderate findings in dev-only lint tooling (`minimatch` via `typescript-eslint`), which pre-date this work. Do not run `npm audit fix --force` |

Covered: cart add/remove/quantity/persistence/stock; checkout validation, PIN serviceability and server-calculated totals; successful, failed, dismissed and bad-signature payments; duplicate webhooks and delayed webhooks; refresh after payment; no duplicate orders; guest lookup; OTP login/logout; profile and addresses; reorder; access control (401/403/404); admin order flow, tracking and audit trail; product edits; delivery configuration; refunds; no horizontal overflow at 390 / 768 / 1024 / 1440 px.

### What was NOT tested

- Real Razorpay Checkout, real card/UPI/net-banking flows and real webhook delivery. Only a mock server that imitates the API was used.
- A real Supabase project, real RLS enforcement under Supabase roles, and real email delivery through Resend.
- Screenshots were captured at four widths but were not reviewed visually by a person. Only automated overflow checks ran.
- Load and penetration testing.

---

## Production verification checklist

Run on a preview or staging deployment with **test** keys:

- [ ] `npm run db:migrate` succeeded. Tables exist and RLS is on for all of them.
- [ ] Owner can sign in and reach `/admin`. A non-admin account gets 404 on `/admin` and 403 from `/api/admin/*`.
- [ ] Products have prices and stock. Delivery fee and serviceable PINs are set.
- [ ] Add to cart → refresh → cart persists. Out-of-stock and over-stock quantities are blocked.
- [ ] Non-serviceable PIN blocks payment. Serviceable PIN shows the configured delivery fee and the correct total.
- [ ] Test card/UPI success → order page shows **paid** only after verification. Order is **Confirmed/Payment Received** in admin.
- [ ] Test failure and closing the Razorpay window → order stays unpaid, stock is released after the hold time, no "paid" email.
- [ ] Webhook delivery appears as 200 in Razorpay → Webhooks → logs. Resend the same event: no duplicate payment or email.
- [ ] Refresh the order page after payment: still paid, no second order.
- [ ] Guest lookup at `/track` works with order number + mobile and fails with a wrong mobile.
- [ ] Admin status changes (Preparing → Dispatched with courier details → Delivered) appear on the customer timeline and in the audit log. Emails arrive.
- [ ] Admin refund → status shows Refund Initiated, then Refunded after the `refund.processed` webhook.
- [ ] `/api/cron/maintenance` returns 401 without the bearer secret and 200 with it.
- [ ] Responsive check at 390 / 768 / 1024 / 1440 px with real devices.
- [ ] No secrets in the repo: `git grep -nE "rzp_(test|live)_|ghp_|re_[A-Za-z0-9]{20,}"` returns nothing real.

### Go-live checklist

- [ ] Razorpay KYC and merchant activation complete.
- [ ] Entire checklist above passed in test mode.
- [ ] Live keys and a **new live webhook secret** set in Vercel Production. Redeploy.
- [ ] One small real payment made and refunded end to end.
- [ ] Policy pages replaced with the business's reviewed text.

---

## Manual configuration still required from the owner

1. Create the Supabase (or other Postgres) database and run `npm run db:migrate`.
2. Create the Razorpay account, generate test keys, create the webhook and later complete KYC for live mode.
3. Create a Resend account, verify the sending domain and set `EMAIL_FROM`.
4. Set all environment variables in Vercel (Preview and Production).
5. Set `ADMIN_BOOTSTRAP_EMAILS` and sign in once to become admin.
6. Enter real prices, pack sizes, stock, images, delivery fee and serviceable PINs in the admin dashboard. None were invented.
7. Review and replace the draft policy pages.
8. Revoke the GitHub token that was embedded in the local git remote URL (see below).

### Security note: exposed GitHub token

The local clone's `origin` remote URL contained a GitHub personal access token (`ghp_…`). It was not used or copied by this work. Revoke it at <https://github.com/settings/tokens> and reset the remote:

```bash
git remote set-url origin https://github.com/Sriya-Sahithi/The-Vantillu-Co.git
```

Authenticate with a credential helper or SSH instead of embedding tokens in URLs.

---

## Project layout

```
app/            Pages and API routes (app/api/*)
components/     UI components (cart provider, product cards, order detail, header/footer)
lib/            Shared code: money, validation, order status, catalogue types
lib/server/     Server-only: db, auth, pricing, delivery, razorpay, payments, webhook, admin, notifications
migrations/     SQL schema and seed
scripts/        migrate.mjs, dev/mock-razorpay.mjs (local test only)
tests/          Vitest suites
docs/           Implementation assessment
```
