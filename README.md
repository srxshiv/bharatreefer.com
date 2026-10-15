# Bharat Reefer

Customer-facing website and admin panel for a refrigerated transport business. Customers
request a quote for a frozen, chilled or ambient load on a single screen. The business gets
an email for each request, works through them in the admin panel at `/admin`, and edits
everything the public site says from the same panel.

## Stack

- **Next.js 16** (App Router, Cache Components, Server Actions) with React 19 and TypeScript
- **Tailwind CSS 4**
- **PostgreSQL** through **Prisma 7** and the `pg` driver adapter
- **Zod 4** for validation shared by the browser and the server
- **sharp** for resizing uploaded photos
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

Business details such as the phone number, the alert email address and the opening hours
are not environment variables: the business edits them in the admin panel.

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
| `pnpm db:seed` | Replace the sample data: 62 quote requests across every stage, 15 trucks with their details, loads on them (one truck out on a trip) and the delivery history of completed requests. Real requests and your own trucks are never touched. `pnpm db:seed --clear` removes the sample data only. |

## Project layout

```
prisma/schema.prisma          Database schema; migrations live beside it
prisma7.config.ts             Prisma CLI configuration
scripts/create-admin.ts       Creates admin accounts and resets passwords
prisma/seed.ts                Sample requests, trucks and truck loads (pnpm db:seed)
scripts/seed-dev.ts           Older local-only seed that also creates a test admin (pnpm exec tsx scripts/seed-dev.ts)
src/proxy.ts                  Sends signed-out visitors away from /admin
src/app/(site)/               The public site (one page)
src/app/admin/                Admin panel: sign-in, requests, fleet, website settings, account, CSV export
src/app/media/fleet/[id]/     Serves uploaded fleet photos
src/app/api/health/           Uptime probe that checks the database
src/components/console/       The public screen: quote form, live summary, information tabs
src/components/admin/         Admin forms and shared UI; fleet/ and requests/ hold the two boards
src/config/                   Default business details, fleet and temperature bands
src/data/india-locations.ts   States and city suggestions
src/features/content/         Editable site content: loader, admin actions, automatic copy
src/features/auth/            Sessions, sign-in, password change, login throttling
src/features/quotes/          Validation, public and admin data access, emails, WhatsApp text
src/features/fleet/           Trucks, loads and the placement rules (capacity.ts is pure and tested)
src/lib/                      Truck planner, hours, formatting, CSV, email, password hashing, Prisma client
```

## The public site

One page in two columns:

- **The brand column** carries the logo, the headline and introduction, three facts
  (fleet range, temperature bands, reply time), then the sections the business has switched
  on, in its chosen order: temperature bands, the fleet table and photos, popular routes
  (beta), how it works, contact details with live desk status, and the questions.
- **An announcement bar** can run across the top for holiday hours or news.
- **The quote card** sits beside it: a single form in one card, sized to fit a laptop
  screen whole (down to 1280×720) and pinned in place while the column scrolls. Nothing in
  it scrolls, and its height does not change: validation shows as red field borders plus
  a short summary in the fixed box under the weight, and notes open as one compact line on
  short screens. On phones it sits right under the introduction, and the header's "Get a
  quote" button jumps to it. Under the weight field a strip of the fleet lights up the
  truck the load is planned on.

The site has two themes, on the public pages and in the admin panel alike, with a sun/moon
switch in the header (and on the sign-in page):

- **Light (the default)** is white cards on a pale navy-tinted page, with the logo navy for
  text and buttons.
- **Dark** is built on the navy of "REEFER" in the logo (`#012754`, measured from the
  artwork): the page is that navy, cards and panels a step lighter, text light, and
  buttons and active items a brighter royal blue so they stand out. The logo gets a thin
  white outline so its navy lettering shows against the navy.

The choice is kept in the browser (`localStorage`, key `bharat-reefer-color-theme`). A small script in the
root layout applies it before the page paints, so there is no flash of the other theme.
Every colour token in `src/app/globals.css` has a dark value under `[data-theme="dark"]`,
so components use the same classes in both themes: `bg-surface` for cards and inputs (not
`bg-white`, which stays white, as on the number plates), `text-ink-*` for text (not
`text-navy-*`, which is a fill colour in dark). The `dark:` variant covers the few
exceptions. Temperature keeps its own colours (frozen blue, chilled cyan, ambient
saffron), slightly brightened in dark. Emails and the social preview image stay light.

The logo lives at `public/brand/logo.webp` (made from `assets/Bharat Reefer Tricolor Truck
Logo.png`); the favicons in `src/app/icon.png` and `apple-icon.png` are cut from it.

## Editable content

`/admin/site` lets the business change what the public site shows. Changes go live the
moment they are saved; no deploy is needed.

| Page | What it controls |
| --- | --- |
| Business details | Name, tagline, phone, WhatsApp number, public email, where alerts go, address, desk days and hours, promised reply time. |
| Sections | The announcement bar (message, optional link, colour, with a live preview), the key facts under the headline, and each section below it: on or off, its order, and its label, heading and introduction. |
| Page text | Headline, introduction, "How it works" steps, questions and answers. |
| Temperature bands | Name, temperature shown, description and example cargo for each of the three bands. |
| Fleet and photos | Truck sizes with optional model names, weight limits, the part-load threshold, and photos. |
| Routes (beta) | The lanes the business runs often, with transit time and frequency. Each becomes a card on the site that fills the route into the quote form. The section starts switched off. |

The headline, the steps and the answers have an **automatic** mode that generates the text
from the other settings, so their numbers stay correct when the fleet or the hours change.
Turn it off to write your own text.

Photos are resized to at most 1600px, stored as WebP in the database and served from
`/media/fleet/<id>` with long caching. The limit is 12 photos of up to 6 MB each.

How it works underneath:

- `getSiteContent()` in `src/features/content/data.ts` is a `use cache` function tagged
  `site-content`. The public page prerenders with it. Every admin save calls `updateTag`,
  which rebuilds the page with the new content.
- If the database cannot be reached, the public site falls back to the defaults in
  `src/config/` and logs the error, rather than showing an error page.
- The truck planner and the quote form's validation take the fleet settings as an argument,
  so a change to the sizes or limits applies to the next request.

## How a quote request is handled

1. The form validates in the browser with the same Zod schema the server uses.
2. The `submitQuoteRequest` server action validates again, recomputes the truck plan, and
   applies a limit of 5 requests per hour per IP address.
3. The request is stored in `quote_requests` with a short reference such as `BR-7K3Q9F`,
   which the customer sees on the confirmation screen.
4. After the customer has their confirmation, dispatch is emailed the request with a link
   to it in the admin panel, and the customer is emailed a confirmation if they left an
   address.

A hidden honeypot field catches basic bots: they see a normal confirmation and nothing is
stored. Raw IP addresses are never stored, only a keyed hash.

## Admin panel

`/admin` is for the business only. It is not linked from the public site and is excluded
from search engines.

- **Requests**: one slim strip shows how many requests sit at each stage, what the quoted
  ones are worth, and the win rate; below it, search, a temperature dropdown and a
  **Filters** button whose panel holds the rest (received and pickup dates, from and to
  state, load type, price, sorting) and applies them together. Two views:
  - **List**: compact rows with page numbers and 25, 50 or 100 rows per page. Each row has a
    menu to call the customer or move the request to any stage, and tick boxes select rows
    to move several at once or export just those to CSV.
  - **Board**: a column per open stage. Each card moves on with one button (Mark
    contacted, Send quote, Confirmed, Delivered) or to any stage from its menu, and can be
    dragged between columns on a computer. Moving to Quoted asks for the price in the card.
    Confirmed cards show whether the load is on a truck yet.
- **Request panel**: clicking a request anywhere in the panel (a row, a board card, the
  fleet queue, a load on a truck) opens it in a side panel over the page instead of
  leaving it. The address changes, so Back or Escape closes it and a reload or shared link
  shows the full page. Built with an intercepting route (`@modal/(.)quotes/[id]`).
- **Request detail** (the panel, or the full page): the load and the customer, one-tap call, WhatsApp and email, the
  status and quoted amount, the trucks a confirmed load is on, internal notes, and a
  timeline of every change, email and truck placement.
- **Fleet**: every truck by number plate, grouped by payload, with its temperature, body
  length, tyres, driver and status (available, loading, on a trip, in maintenance). Each
  truck is drawn with its loads filling the box in their band's colour; past the payload
  the box keeps going and the excess is marked red, with "2,000 kg over" beside it. Each
  truck lists the loads on board with **Move** (to another truck) and **Remove** (back to
  the queue, still Confirmed).
  - Confirmed requests waiting for a truck are listed beside the trucks. **Choose truck**
    opens a searchable list of every truck, grouped by payload: type a plate, driver, model
    or size. Set how much of the load goes (all of it by default, or part, to split it), and
    each truck shows what it carries, what it would carry with this load, whether it fits or
    by how much it goes over, and anything to know (set up for another temperature,
    carrying another band). The best fit is pinned at the top as a suggestion. On a
    computer, a request can also be dragged onto a truck.
  - **Start trip** when a loaded truck leaves. **End trip** asks first, then delivers
    everything on board and empties the truck; a request whose whole weight has been
    delivered is marked Completed.
- **Website**: the editable content described above.

How the fleet rules work:

- The owner decides what goes where. A truck can be loaded past its payload (the board
  shows by how much) and with a different temperature band (the board warns). Only a truck
  on a trip or in maintenance takes no new loads. A request never has more weight placed
  than it weighs.
- A load is on board until its trip ends. Marking a request Completed by hand delivers its
  loads too; moving it back to an earlier stage, or to Lost, takes them off their trucks.
- One truck can carry parts of the same request on different trips.
- Placing or moving a load locks the request and the truck in the database, so two people
  working at once cannot place more than a request weighs.
- Plates are stored without spaces (`DL01LA4521`) and shown as printed (`DL 01 LA 4521`).
  Bharat-series plates (`22 BH 1234 AA`) are accepted too.
- **Account**: change your password. Doing so signs out your other devices.

Accounts are created from the command line, not from the browser:

```bash
pnpm admin:create --email owner@example.com --name "Owner Name"
```

Run the same command with an existing email to reset that password. To create an account
on the production database, run it with `DATABASE_URL` pointing there.

How sign-in is secured:

- Passwords are hashed with scrypt. Sessions are random tokens stored hashed in the
  database, held in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie, and last 14 days.
- Five wrong passwords from the same IP address lock that address out of the account for
  15 minutes. Wider limits per account and per address slow down distributed guessing.
- Every admin page, action and export checks the session against the database itself.
  `src/proxy.ts` only gives signed-out visitors a fast redirect; it is not the security
  boundary.

## Notifications

Email goes through [Resend](https://resend.com). To turn it on:

1. Create a Resend account and verify the sending domain.
2. Set `RESEND_API_KEY` and `EMAIL_FROM`.
3. In the admin panel, under Business details, set "Alerts go to" if alerts should go
   somewhere other than the public email.

Until the key is set nothing is sent; each email is written to the server log instead. A
failed send never affects the customer's request, and shows up in that request's timeline.

WhatsApp links use the WhatsApp number from Business details. Leave it empty to hide them.
In the admin panel, the WhatsApp button on a request opens a chat with that customer with
a message already written, including the quote once one is entered.

## Deployment

The app runs on any Node host; Vercel with a Neon database is the intended setup.

- Set the environment variables above in the hosting dashboard.
- Run `pnpm db:deploy` against the production database before the first release and after
  any schema change.
- The live site and `.env` share one Neon database, so a schema change reaches the live
  site the moment it is applied, before its code is deployed. Keep the two in step: apply a
  migration, then push the code that uses it straight away, and don't run `pnpm db:seed`
  (or otherwise write new values, such as a new truck status) until that code is live.
  Older code fails on values it does not know: on 15 October the Fleet page broke on the
  live site because a seeded truck was "on trip" before the code that knows trips was
  deployed. Changes that remove things (a column, an index) go in a later migration, after
  the code that stops using them is live.
- Create the first admin account with `pnpm admin:create` (see Admin panel).
- The database must be reachable during `next build`, because the public page prerenders
  with the content from it.
- Serve the site over HTTPS. The admin session cookie is `Secure` in production and
  browsers will not send it over plain HTTP.
- Rate limiting and login throttling read the client IP from `x-forwarded-for`. Vercel sets
  it. Behind your own proxy, make sure the proxy sets that header and strips any value sent
  by the client.
- `vercel.json` runs the server code in Singapore (`sin1`), next to the Neon database in
  `ap-southeast-1`. Every admin page makes several database round trips, so functions in
  another region (Vercel's default is Washington, D.C.) make every page about a second
  slower. If the database moves, move this with it.

## Notes for contributors

- This is Next.js 16 with Cache Components. Read the guides bundled in
  `node_modules/next/dist/docs/` before changing rendering or caching behaviour. Pages are
  prerendered, so a Server Component may not read the current time or request data unless
  it sits behind `<Suspense>`.
- Error boundaries receive `retry`, not `reset`.
- Prisma is pinned to 7.x because the `latest` tag on npm currently points at an 8.0
  release candidate. In 7.10 the CLI reads `prisma7.config.ts`, not `prisma.config.ts`.
- The generated Prisma client (`src/generated/prisma`) is not committed. `pnpm install`
  regenerates it.
- The database connection follows `DATABASE_URL`: when `next dev` reloads `.env` (for
  example after switching from a local database to Neon) the next request uses the new
  database, no restart needed. In development, a failed sign-in logs to the terminal
  whether the account was missing or the password wrong, and which database was checked;
  `pnpm admin:create` prints which database it wrote to.
- Prisma's Postgres adapter reads and writes timestamps as UTC and is only correct when the
  database session time zone is UTC. A migration pins the database to UTC and
  `/api/health` fails if it is anything else. If you write raw SQL, do not `SET TIME ZONE`.
- Next.js keeps up to three recently visited pages mounted but hidden. Do not give elements
  fixed `id`s in components that can appear on more than one page (use `useId`).
- React resets a `<form>` after its `action` runs. Forms that must keep what was typed, or
  that mirror server data, submit from `onSubmit` instead (see `ActionForm` and the quote
  form).
- Design tokens live in `src/app/globals.css`. The `short` variant applies on wide screens
  under 800px tall, where the quote card tightens its spacing. If you add a field to the
  card, re-check that it still fits at 1280×720 (the browser checks in the scratch scripts
  measured the card at four sizes).
- Date filters in the admin panel are calendar days in India time; `startOfDayInIndia` in
  `src/lib/dates.ts` turns them into the UTC instants the database compares against.
- **Why switching admin pages is instant.** The admin data functions and the session check
  use `"use cache: private"`: nothing is stored on the server, but the browser keeps each
  rendered page for 30 seconds (`ADMIN_PAGE_CACHE`). The main menu and the list/board
  switch use `<Link prefetch>`, so those pages are fetched whole, data included, as soon
  as the panel loads; rows, cards and filter links do the same on hover or touch
  (`IntentLink`). Measured in a production build: 10 to 65 ms per switch, against 200 to
  330 ms before.
- Every admin save calls `refreshAdminData()`, which expires the `admin-data` cache tag and
  refreshes the page. Without the tag, the refreshed page would show the data from before
  the save. Pages also refetch when you come back to the tab after 30 seconds away
  (`RefreshWhenVisible`), so new requests show up.
- Admin pages set `export const instant = false`: they render complete, with no skeletons.
  A thin bar at the top and a line under the clicked link show progress on the rare
  switch that is not prefetched.
- The filters apply as you change them (dates shortly after typing stops); the results
  stay on screen, dimmed, while the next ones load. Filter fields are wrapped in their
  labels rather than tied by `id`, because Next.js keeps recent pages mounted and the list
  and board views would otherwise share ids.
- The database pool keeps connections for 5 minutes and opens six when the app starts: a
  new connection to Neon costs about 650 ms, a query about 95 ms. Idle connections are
  probed every 10 seconds and replaced after 5 minutes, and a query gives up after 20
  seconds; without this, a connection dropped by the network (a router, a hotspot, a
  change of network) made the next page hang for 30 seconds or more.
- `sslmode=require` in a connection string is rewritten to `verify-full`, which is what the
  pg driver already does, to stop its warning on every connection.
- `next dev` keeps `use cache` results in memory across code changes. If you change the
  shape of `SiteContent`, restart the dev server. A new build always starts fresh.

## Roadmap

- **Phase 1 (done): foundation and public quote flow.**
- **Phase 2 (done): admin panel.** Sign-in, the requests inbox with search, filters and CSV
  export, the status pipeline, quoted amounts, internal notes and a timeline per request.
- **Phase 3 (done): notifications.** Email to dispatch on every new request, a confirmation
  to the customer, and click-to-WhatsApp in both directions.
- **Phase 4 (done): content the business can edit.** Business details, page text,
  temperature bands, fleet and photos managed from the admin panel; the public site
  redesigned as a brand column beside a single quote card, in the logo's colours; date,
  route, load and price filters in the admin inbox.
- **Operations update (done).** The fleet panel with trucks by number plate and load
  placement, the pipeline strip and board for requests, section switches, ordering and
  headings, the announcement bar, routes (beta), sample data (`pnpm db:seed`), and faster
  page switches in the admin panel.
- **Fleet and speed update (done).** Trucks with temperature, length and tyres; choosing
  trucks from a searchable list, splitting and moving loads, overweight shown in red;
  trips that deliver loads and complete requests; prefetched admin pages; filters that
  apply as you change them; a hardened database pool; functions next to the database.
- **Phase 5: launch.** Neon and Vercel production setup, the domain, error monitoring,
  analytics, CAPTCHA if spam appears, backups, and a pre-launch checklist.
