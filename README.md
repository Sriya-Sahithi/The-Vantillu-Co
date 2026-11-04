# The Vantillu Co.

A mobile-first storefront for The Vantillu Co. — The Modern Millennial Kitchen. The site presents the established homemade catalogue, a searchable shop, product pages, a browser-persisted enquiry basket, and a WhatsApp enquiry flow. It does not process payments or accept orders.

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

- `NEXT_PUBLIC_WHATSAPP_NUMBER`: WhatsApp Business number in international format, digits only. Defaults to `919441343257` (+91 9441343257) in site config if unset.
- `NEXT_PUBLIC_SITE_URL`: canonical production URL, without a trailing slash. Replace the example before publishing.

Edit `lib/site-config.ts` for Instagram, announcement, location, and (if confirmed) email or shipping fee. Do not invent an email address. The contact form opens WhatsApp; it does not submit or store the form on a server.

## Catalogue and content

Edit `lib/products.ts` to maintain the established catalogue:

- Homemade Chocolates: Dark Chocolate, Milk Chocolate, White Chocolate
- Homemade Podis: Kandi Podi, Karivepaku Podi, Kura Karam, Nuvvula Podi, Palli Podi
- Healthy Sweets: Mixed Dry Fruit Laddu, Peanut Laddu, Cashew Laddu
- Healthy Cookies: Oats Chocolate Chip Cookies, Date & Walnut Cookies, Almond Cookies

Do not invent products, prices, sizes, ingredients, nutritional values or health claims. Pack sizes and prices stay on enquiry until the owner confirms them. Replace reference photographs in `lib/products.ts` with actual product photography before launch.

The testimonials component remains hidden until genuine reviews are supplied. The registration number shown in the footer was supplied for this project; verify before launch. Do not publish the certificate, QR code, or residential address.

## Architecture

- Next.js App Router with TypeScript and Tailwind CSS.
- Static, centrally configured product data; shareable `/product/[slug]` routes.
- Search, category filters, and name sorting on `/shop`.
- Cart data persists in local storage and is used only to prepare an enquiry summary.
- SEO metadata, Open Graph metadata, organization/website JSON-LD, `sitemap.xml`, and `robots.txt`.
- No backend, payment gateway, customer database, or order management is included.

## Deployment

Deploy as a Node.js Next.js application on a platform that supports the Next.js App Router. Set `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_WHATSAPP_NUMBER` in the deployment environment. Review all placeholder photography, policy, registration, and compliance information before launch. Run `npm run build` before deployment.
