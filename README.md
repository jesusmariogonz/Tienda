This is a [Next.js](https://nextjs.org) e-commerce project (streetwear/sportswear style store), scaffolded with `create-next-app`.

## Stack

- **Next.js (App Router, TypeScript)** — storefront, admin panel and mini-POS all live in one app.
- **PostgreSQL + Prisma** — single source of truth for products, variants, inventory and sales (online orders + in-store POS share the same inventory tables).
- **Stripe** and **Mercado Pago** — payment providers for online checkout.
- **NextAuth** — single-admin login for `/admin`.
- **Tailwind CSS** — mobile-first UI.

No domain is hardcoded anywhere in the code. The app reads its base URL from `NEXT_PUBLIC_APP_URL` (see `src/lib/config.ts`), so it can run under `tienda.844digital.com` today and move to a custom domain later by only changing environment variables.

## Data model

See `prisma/schema.prisma`. Key entities:

- `Product` / `ProductVariant` (size + color) / `ProductImage` / `Category`
- `Inventory` (one row per variant, with `lowStockThreshold`) and `InventoryMovement` (audit trail — restocks, online sales, POS sales, adjustments, returns)
- `Order` / `OrderItem` — online orders with `paymentProvider` (Stripe or Mercado Pago)
- `PosSale` / `PosSaleItem` — mostrador (counter) sales, record-only, deducting from the same `Inventory`
- `User` — single admin account (`UserRole.ADMIN`)

## Getting Started

1. Copy `.env.example` to `.env` and fill in `DATABASE_URL`, `ADMIN_EMAIL`/`ADMIN_PASSWORD`, and payment provider keys.
2. Install dependencies: `npm install`
3. Run migrations: `npm run db:migrate`
4. Seed placeholder data (admin user + 8 sample products with variants/inventory): `npm run db:seed`
5. Start the dev server: `npm run dev`, then open [http://localhost:3000](http://localhost:3000).

## Roadmap (built module by module)

- [x] Project scaffold + data model (products, variants, inventory, orders, POS)
- [x] Storefront: catalog listing
- [ ] Product detail page with size/color selector
- [ ] Cart + checkout (Stripe + Mercado Pago)
- [ ] Admin panel: auth, product CRUD, inventory & low-stock alerts, movement history
- [ ] Mini-POS (counter sales)
- [ ] Reports (combined sales, top products, revenue, channel comparison)
