# Deploying to tienda.844digital.com

This project deploys to Vercel, with a Neon (Vercel Postgres) database and DNS
managed in Cloudflare. No domain is hardcoded in the code — everything reads
from `NEXT_PUBLIC_APP_URL`, so this same setup works for any domain later.

## 1. Vercel project

1. **Add New → Project** in Vercel, import `jesusmariogonz/tienda` from GitHub.
2. Framework preset: Next.js (auto-detected). Leave build settings as-is.

## 2. Database

**Storage → Create Database → Postgres** (Neon, native integration).
- Custom prefix: leave it as `DATABASE` (not the default `STORAGE`) so the
  injected variable is named `DATABASE_URL`, matching `prisma/schema.prisma`.
- Environments: Production + Preview.

## 3. Environment variables

Set in Settings → Environment Variables (Production + Preview):

- `NEXT_PUBLIC_APP_URL` — `https://tienda.844digital.com`
- `APP_NAME` — `Tienda`
- `AUTH_SECRET` — random value (`openssl rand -base64 32`)
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — credentials for `/admin/login`
- `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET` — added after step 6
- `MERCADO_PAGO_ACCESS_TOKEN` / `MERCADO_PAGO_PUBLIC_KEY`

`DATABASE_URL` is injected automatically by the Postgres integration from step 2.

## 4. DNS (Cloudflare)

In the `844digital.com` zone, DNS → Add record:

- Type: `CNAME`
- Name: `tienda`
- Target: `cname.vercel-dns.com`
- Proxy status: **DNS only** (grey cloud) until Vercel validates the domain

Then in Vercel: Settings → Domains → add `tienda.844digital.com`.

## 5. Migrate + seed the production database

From a machine with the project's `DATABASE_URL` (copy it from Vercel's
Environment Variables):

```bash
DATABASE_URL="<value from Vercel>" npx prisma migrate deploy
DATABASE_URL="<value from Vercel>" ADMIN_EMAIL="<same as env var>" ADMIN_PASSWORD="<same as env var>" npx prisma db seed
```

## 6. Stripe webhook

Stripe Dashboard → Developers → Webhooks → Add endpoint:
- URL: `https://tienda.844digital.com/api/webhooks/stripe`
- Event: `checkout.session.completed`

Copy the signing secret into `STRIPE_WEBHOOK_SECRET` in Vercel and redeploy.

Mercado Pago needs no manual webhook registration — the `notification_url` is
sent per-preference using `NEXT_PUBLIC_APP_URL`.

## 7. Verify

- `https://tienda.844digital.com` — catalog with the 8 seeded products.
- `https://tienda.844digital.com/admin/login` — sign in with `ADMIN_EMAIL`/`ADMIN_PASSWORD`.
- Test checkout with a Stripe test card (`4242 4242 4242 4242`) and confirm
  the order flips to `PAID` and stock decrements.
