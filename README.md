# Rent Report

Rental property reporting app. An **admin** manages properties, owners, and bookings
(manual entry or CSV import from Airbnb / Agoda). Each **owner** signs in and sees a
monthly report per property: days rented, occupancy, gross payout, commission, and
net payout.

Stack: Next.js (App Router) · Tailwind v4 + shadcn/ui · Drizzle ORM · SQLite locally,
[Turso](https://turso.tech) in production · deployable on the Vercel free tier.

## Local development

```bash
npm install
npm run db:push    # create tables in local.db
npm run db:seed    # create the admin user (admin / admin123 by default)
npm run dev
```

Sign in at http://localhost:3000 with the seeded admin, change nothing else.
Override the seeded credentials with `ADMIN_USERNAME` / `ADMIN_PASSWORD` env vars when running the seed.

```bash
npm test           # commission math + CSV parser tests
```

## How it works

- **Properties** have an owner and a commission % (e.g. 20). Owner net = payout - commission.
- **Bookings** belong to their check-in month. Amounts are whole IDR.
- **CSV import** auto-detects Airbnb payout CSVs and Agoda booking CSVs, lets you map
  listing names to your properties, and skips rows already imported (dedupe on
  source + confirmation code / booking ID), so re-uploading a file is always safe.
- **Owners** get read-only reports for their own properties only. Passwords are set by
  the admin (no self-service reset).

## Deploying to Vercel (free)

1. Create a free Turso database:
   ```bash
   turso db create rent-report
   turso db show rent-report --url        # -> TURSO_DATABASE_URL
   turso db tokens create rent-report     # -> TURSO_AUTH_TOKEN
   ```
2. Push the schema and seed the admin against Turso:
   ```bash
   TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... npm run db:push
   TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... npx tsx db/seed.ts
   ```
3. Import the repo in Vercel and set three environment variables:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `SESSION_SECRET` (any long random string, e.g. `openssl rand -hex 32`)
   - `CRON_SECRET` (any long random string; the daily sync/digest cron needs it)
4. Deploy.

## Telegram bot (admin alerts)

Sends a daily 09:00 WIB digest, new-booking and cancellation alerts, and answers `/today`, `/week`, `/cleaning`, `/balance`.

1. Create a bot with @BotFather (`/newbot`) and copy the token.
2. Message your bot once, then open `https://api.telegram.org/bot<token>/getUpdates` and copy `message.chat.id`.
3. Set in `.env.local` and on Vercel:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
   - `TELEGRAM_WEBHOOK_SECRET` (any long random string)
4. After deploying, register the webhook (needed for commands only):
   ```bash
   npx tsx --env-file=.env.local scripts/set-telegram-webhook.ts https://your-domain.com
   ```

Cancellations: on each sync, future Airbnb/Agoda bookings missing from a successfully fetched, non-empty feed are deleted and reported.
