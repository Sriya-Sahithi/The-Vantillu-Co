# The Vantillu Co.

A mobile-first storefront for The Vantillu Co., with an editable product catalogue, searchable shop, product detail pages, a browser-persisted enquiry basket, and an optional WhatsApp enquiry flow. The site does not process payments or accept orders.

## Local setup

Requirements: Node.js 20.9+ and npm.

```sh
npm install
Copy-Item .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use `npm run typecheck`, `npm run lint`, and `npm run build` to validate changes.

## Configuration

Copy `.env.example` to `.env.local` and configure:

- `NEXT_PUBLIC_WHATSAPP_NUMBER`: optional WhatsApp Business number in international format, digits only (8–15 digits; omit `+`). Leave blank to hide WhatsApp actions. The link opens a pre-filled enquiry; it does not accept an order or payment.
- `NEXT_PUBLIC_SITE_URL`: canonical production URL, without a trailing slash. Replace the example before publishing.

Edit `lib/site-config.ts` to add the verified contact email, phone, Instagram URL, announcement, business details, and (if confirmed) the shipping fee. The contact form opens the visitor's email application when an email address is configured; it does not submit or store the form on a server.

## Catalogue and content

Edit `lib/products.ts` to maintain product names, category, slugs, descriptions, pack sizes, prices, availability, and optional product facts. All current pack sizes and prices are illustrative samples and must be replaced with verified business information. Availability starts as unconfirmed; mark a product unavailable to prevent adding it to an enquiry basket. Ingredient, allergen, quantity, shelf-life, storage, and labelling details are intentionally omitted until confirmed.

The seven starter entries are Karapodi, Kandipodi, Kura Karam, Vepudu Karam, Pulihora Mix, Homemade Chocolates, and Cookies. Replace the reference photographs in `lib/products.ts` and the page components with actual product and kitchen photography before launch. Reference imagery is labelled as such and must not be presented as product photography.

Draft brand-story text and policy pages require owner review. The testimonials component remains hidden until genuine reviews are supplied. The registration number shown in the footer was supplied for this project, but the owner must verify business activity, product-category eligibility, product labels, and whether the registration details should be published before accepting commercial orders. Do not publish the certificate, QR code, or residential address.

## Architecture

- Next.js App Router with TypeScript and Tailwind CSS.
- Static, centrally configured product data; shareable `/product/[slug]` routes.
- Search, category filters, and name/price sorting on `/shop`.
- Cart data persists in local storage and is used only to prepare an enquiry summary.
- SEO metadata, Open Graph metadata, organization/website JSON-LD, `sitemap.xml`, and `robots.txt`.
- No backend, payment gateway, customer database, or order management is included.

## Deployment

Deploy as a Node.js Next.js application on a platform that supports the Next.js App Router. Set `NEXT_PUBLIC_SITE_URL` and, if desired, `NEXT_PUBLIC_WHATSAPP_NUMBER` in the deployment environment. Review all placeholder product, contact, policy, registration, and compliance information before launch. Run `npm run build` before deployment.
