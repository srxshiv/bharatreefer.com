# Bharat Reefer

Customer-facing website and admin panel for a refrigerated transport business. Customers
request a quote for a frozen, chilled or ambient load. The business gets an email for each
request and works through them in the admin panel at `/admin`.

## Stack

- **Next.js 16** (App Router, Cache Components, Server Actions) with React 19 and TypeScript
- **Tailwind CSS 4**
- **PostgreSQL** through **Prisma 7** and the `pg` driver adapter
- **Zod 4** for validation shared by the browser and the server
- **Vitest** for unit tests

## Getting started

Requires Node 20.9 or newer, pnpm, and a PostgreSQL database.

```bash
pnpm install                 # also generates the Prisma client
cp .env.example .env         # then fill in the values
createdb bharatreefer_dev    # if you are using a local Postgres
pnpm db:migrate              # create the tables
pnpm admin:create --email you@example.com --name "Your Name"   # asks for a password
pnpm dev                     # http://localhost:3000, admin panel at /admin
```

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection the app uses at runtime. |
| `DIRECT_URL` | no | Postgres connection the Prisma CLI uses for migrations. Falls back to `DATABASE_URL`. |
| `IP_HASH_SALT` | yes | Secret for hashing visitor IPs (rate limiting). Generate with `openssl rand -hex 32`. |
| `NEXT_PUBLIC_SITE_URL` | in production | Public origin, e.g. `https://bharatreefer.com`. Drives canonical URLs, the sitemap, social previews and the admin links in emails. |
| `RESEND_API_KEY` | no | Turns on email notifications through [Resend](https://resend.com). Without it emails are logged, not sent. |
| `EMAIL_FROM` | with the key | Sender, e.g. `Bharat Reefer <quotes@bharatreefer.com>`. The domain must be verified in Resend. |
| `DISPATCH_EMAIL` | no | Where new-request alerts go. Defaults to the email in `src/config/site.ts`. |

### Switching to Neon

Nothing in the code changes. In the Neon dashboard copy both connection strings, then:

1. Set `DATABASE_URL` to the **pooled** string (the host contains `-pooler`).
2. Set `DIRECT_URL` to the **direct** string (same host without `-pooler`).
3. Run `pnpm db:deploy` to apply the migrations.
4. Run `pnpm admin:create --email ... --name "..."` to create the first admin account there.
5. Open `/api/health`. It returns `{"status":"ok"}` once the app can reach the database.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Development server. |
| `pnpm build` / `pnpm start` | Production build and server. |
| `pnpm lint` | ESLint. |
| `pnpm typecheck` | Generate route types, then `tsc --noEmit`. |
| `pnpm test` | Unit tests. |
| `pnpm admin:create` | Create an admin account, or reset the password of an existing one. |
| `pnpm db:migrate` | Create and apply a migration in development. |
| `pnpm db:deploy` | Apply pending migrations in production. |
| `pnpm db:studio` | Browse the database in Prisma Studio. |

## Project layout

```
prisma/schema.prisma          Database schema; migrations live beside it
prisma7.config.ts             Prisma CLI configuration
scripts/create-admin.ts       Creates admin accounts and resets passwords
src/proxy.ts                  Sends signed-out visitors away from /admin
src/app/(site)/               Public pages (header and footer layout)
src/app/admin/                Admin panel: sign-in, requests, request detail, account, CSV export
src/app/api/health/           Uptime probe that checks the database
src/components/quote/         Quote form, live truck plan, confirmation
src/components/site/          Header, footer and page sections
src/components/admin/         Admin forms and shared UI
src/config/site.ts            Business name, phone, WhatsApp, email, address, hours
src/config/fleet.ts           Truck sizes and weight limits
src/config/materials.ts       Temperature bands and their copy
src/data/india-locations.ts   States and city suggestions
src/features/auth/            Sessions, sign-in, password change, login throttling
src/features/quotes/          Validation, public and admin data access, emails, WhatsApp text
src/lib/                      Truck planner, formatting, CSV, email, password hashing, Prisma client
```

Business details are not scattered through the pages. To change the phone number, a truck size
or a temperature range, edit the matching file in `src/config/` and the form, the validation
and the copy all follow.

## How a quote request is handled

1. The form validates in the browser with the same Zod schema the server uses.
2. The `submitQuoteRequest` server action validates again, recomputes the truck plan, and applies
   a limit of 5 requests per hour per IP address.
3. The request is stored in `quote_requests` with a short reference such as `BR-7K3Q9F`, which
   the customer sees on the confirmation screen.

4. After the customer has their confirmation, dispatch is emailed the request with a link to
   it in the admin panel, and the customer is emailed a confirmation if they left an address.

A hidden honeypot field catches basic bots: they see a normal confirmation and nothing is stored.
Raw IP addresses are never stored, only a keyed hash.

## Admin panel

`/admin` is for the business only. It is not linked from the public site and is excluded from
search engines.

- **Requests**: every quote request, newest first, with tabs per status, search by reference,
  name, phone or city, a temperature filter, and CSV export of the current view.
- **Request detail**: the load and the customer, one-tap call, WhatsApp and email, the status
  and quoted amount, internal notes, and a timeline of every change and email.
- **Account**: change your password. Doing so signs out your other devices.

Accounts are created from the command line, not from the browser:

```bash
pnpm admin:create --email owner@example.com --name "Owner Name"
```

Run the same command with an existing email to reset that password. To create an account on
the production database, run it with `DATABASE_URL` pointing there.

How sign-in is secured:

- Passwords are hashed with scrypt. Sessions are random tokens stored hashed in the database,
  held in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie, and last 14 days.
- Five wrong passwords from the same IP address lock that address out of the account for
  15 minutes. Wider limits per account and per address slow down distributed guessing.
- Every admin page, action and export checks the session against the database itself.
  `src/proxy.ts` only gives signed-out visitors a fast redirect; it is not the security boundary.

## Notifications

Email goes through [Resend](https://resend.com). To turn it on:

1. Create a Resend account and verify the sending domain.
2. Set `RESEND_API_KEY` and `EMAIL_FROM`, and optionally `DISPATCH_EMAIL`.

Until the key is set nothing is sent; each email is written to the server log instead. A failed
send never affects the customer's request, and shows up in that request's timeline.

WhatsApp links use the number in `src/config/site.ts` (`whatsapp`). Set it to `null` to hide
them on the public site. In the admin panel, the WhatsApp button on a request opens a chat with
that customer with a message already written, including the quote once one is entered.

## Deployment

The app runs on any Node host; Vercel with a Neon database is the intended setup.

- Set the environment variables above in the hosting dashboard.
- Run `pnpm db:deploy` against the production database before the first release and after any
  schema change.
- Create the first admin account with `pnpm admin:create` (see Admin panel).
- Serve the site over HTTPS. The admin session cookie is `Secure` in production and browsers
  will not send it over plain HTTP.
- Rate limiting and login throttling read the client IP from `x-forwarded-for`. Vercel sets it.
  Behind your own proxy, make sure the proxy sets that header and strips any value sent by the
  client.

## Notes for contributors

- This is Next.js 16 with Cache Components. Read the guides bundled in
  `node_modules/next/dist/docs/` before changing rendering or caching behaviour. Pages are
  prerendered, so a Server Component may not read the current time or request data unless it
  sits behind `<Suspense>`.
- Error boundaries receive `retry`, not `reset`.
- Prisma is pinned to 7.x because the `latest` tag on npm currently points at an 8.0 release
  candidate. In 7.10 the CLI reads `prisma7.config.ts`, not `prisma.config.ts`.
- The generated Prisma client (`src/generated/prisma`) is not committed. `pnpm install`
  regenerates it.
- Prisma's Postgres adapter reads and writes timestamps as UTC and is only correct when the
  database session time zone is UTC. A migration pins the database to UTC and `/api/health`
  fails if it is anything else. If you write raw SQL, do not `SET TIME ZONE`.
- Next.js keeps up to three recently visited pages mounted but hidden. Do not give elements
  fixed `id`s in components that can appear on more than one page (use `useId`).
- React resets a `<form>` after its `action` runs. Forms that must keep what was typed, or
  that mirror server data, submit from `onSubmit` instead (see the quote and admin forms).

## Roadmap

- **Phase 1 (done): foundation and public quote flow.** Project setup, database schema, the
  public page, the quote form with a live truck plan, validation, rate limiting, SEO basics,
  security headers.
- **Phase 2 (done): admin panel.** Secure sign-in, the requests inbox with search, filters and
  CSV export, the status pipeline, quoted amounts, internal notes and a timeline per request.
- **Phase 3 (done): notifications.** Email to dispatch on every new request, a confirmation to
  the customer, and click-to-WhatsApp in both directions.
- **Phase 4: content the client can edit.** Business details, truck sizes and page copy managed
  from the admin panel instead of the config files, plus fleet photos.
- **Phase 5: launch.** Neon and Vercel production setup, the domain, error monitoring,
  analytics, CAPTCHA if spam appears, backups, and a pre-launch checklist.
