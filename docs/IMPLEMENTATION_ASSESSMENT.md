# Implementation assessment (pre-change)

Date of inspection: repository `main` @ `d2c8482`.

## What exists today

| Area | Finding |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4 (used via `@import "tailwindcss"` + hand-written CSS in `app/globals.css`). |
| Hosting | Vercel (`vercel.json` only sets `framework: nextjs`). No crons, rewrites or env config in the repo. |
| Backend / DB / APIs | **None.** No `app/api` routes, no database, no ORM. |
| Authentication | **None.** |
| Catalogue | 14 products in 4 categories hard-coded in `lib/products.ts`. **No prices, no stock**: every product has a single `"Pack size on enquiry"` pack and `availability: "unconfirmed"`. |
| Cart | Exists (`components/cart-provider.tsx`, `app/cart/page.tsx`): a browser-only *enquiry basket* in `localStorage` (`vantillu-cart`, items `{slug, packId, quantity}`) that ends in a WhatsApp message. No payment or order capture. |
| Env vars | `NEXT_PUBLIC_WHATSAPP_NUMBER`, `NEXT_PUBLIC_SITE_URL`, optional `NEXT_PUBLIC_GTM_ID`. No secrets. |
| Integrations | WhatsApp deep links, Google Tag Manager (optional). |
| Design system | Ivory/paper backgrounds, olive/forest green, terracotta, brass, Cormorant Garamond + Outfit; CSS custom properties in `app/globals.css`. |

## Decisions

1. **Keep the stack.** No framework change, no rewrite. New features are added as new routes/components; existing pages keep working.
2. **Database: PostgreSQL via `pg`** (the only new runtime dependency). Works with Supabase Postgres (recommended, free tier, pooler URL) or any Postgres via `DATABASE_URL`.
   * Supabase JS SDK / Supabase Auth are *not* used: all data access happens server-side in Next.js route handlers, so a single connection string is enough and no browser-reachable database credentials exist.
   * Row Level Security is still **enabled on every table with no policies** and `anon`/`authenticated` privileges are revoked, so Supabase's auto-generated REST API cannot read or write any data even if its keys leak. Customer-level isolation is enforced in server code (every query is scoped by `user_id` or a hashed guest token).
3. **Authentication: email one-time-code (OTP) login**, no passwords (so no forgot-password flow is needed). Mobile OTP needs an SMS/DLT provider the project does not have. Sessions are random tokens stored hashed in the DB, sent in an `HttpOnly`, `SameSite=Lax`, `Secure` cookie. Admin = a user with a row in `admin_roles`; every admin API re-checks this on the server.
4. **Payments: Razorpay via its REST API (`fetch`)**, no SDK dependency. Amounts are computed on the server from DB prices; signatures and webhooks are verified with HMAC-SHA256; an order is only marked paid by verified backend data.
5. **Money** is stored as integer paise.
6. **Images**: Vercel's filesystem is read-only, so admin uploads are validated, re-encoded with the already-installed `sharp`, and stored in Postgres (`product_images`) and served from `/api/images/:id`.
7. **Rate limiting** is Postgres-backed (serverless instances do not share memory).
8. **Email**: Resend REST API (`RESEND_API_KEY`) behind a small channel interface so WhatsApp can be added later.
9. **No invented business data.** The catalogue has no prices today, so seeded products stay *enquiry-only* until the owner sets prices and stock in the admin dashboard. Delivery fee defaults to ₹0 with *no* free-delivery threshold, and serviceability is restricted to an (initially empty) PIN list that the owner configures.

## Deliberate deviations / additions

* An extra internal status **`paid`** ("Payment received") sits between *Payment Pending* and *Confirmed* so the admin "Confirm order" action and the separate "payment successful" / "order confirmed" emails are meaningful.
* Stock is **reserved when the order is created** and released if the order is cancelled, expires unpaid, or is refunded before dispatch.
* Refunds are full-order refunds.

## Security note found during inspection

The local clone's `git remote` URL embeds a GitHub personal access token. It was not used or copied anywhere. It should be revoked at https://github.com/settings/tokens and the remote reset to the plain HTTPS URL.
