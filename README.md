# Otis Hub — lighting & electrical shop

A shop website and admin dashboard built with React and Vite. Customers browse products and enquire on WhatsApp — there is no checkout.

**Live site:** https://otishub.online/

| Page | What it is |
|---|---|
| `index.html` | Public shop: interactive light-switch hero, categories, search, product gallery with multiple views, WhatsApp enquiry buttons |
| `admin.html` | Admin dashboard: live analytics, products, categories and sub-categories, bulk image import |

## Run it locally

Needs Node.js 20 or newer.

```bash
npm install
npm run dev        # http://localhost:5173 and http://localhost:5173/admin.html
npm run build      # production build into dist/
npm run preview    # serve the production build locally
```

## Deploying

Every push to `main` builds the site and publishes it to GitHub Pages (custom
domain `otishub.online`, set in the repo's Pages settings) through
`.github/workflows/deploy.yml`. There is nothing to do by hand.

The build uses relative paths, so `dist/` also works on any other static host
(Netlify, Firebase Hosting, Cloudflare Pages…).

## Project layout

```
index.html, admin.html     page entry points
public/data/catalog.json   static copy of the catalogue (used if the database can't be reached)
src/lib/                   config, Firebase, data layer, helpers
src/shop/                  the public shop (App, Hero, ProductDialog)
src/admin/                 the admin dashboard (login, products, editor, categories, import)
src/styles/                style.css (shop), admin.css (admin)
```

Shop settings such as the WhatsApp number, currency, image hosting and database
are in `src/lib/config.js`.

## Admin access

The admin page asks for a password. The code only stores a SHA-256 **hash** of
it, never the password itself. To change the password:

```bash
node -e "console.log(require('crypto').createHash('sha256').update('NEW-PASSWORD').digest('hex'))"
```

Paste the output into `ADMIN_PASS_SHA256` in `src/lib/config.js`, then commit and push.

> **Note:** the password screen only hides the dashboard. The database itself
> still accepts writes from anyone who has the public site config. For real
> protection, restrict writes in the database rules (for example with
> Firebase Authentication).

## Where data lives

- **Products and categories:** a Firebase Realtime Database, under its own
  `/otishub` node. Records are tagged `site: "otis-hub"`, so they stay separate
  from any other app that shares the database.
- **Images:** Cloudinary, in the `otis-hub/` folder, tagged `otis-hub`.
  Uploads go straight from the browser, with no server.

## Analytics

The shop counts visits, product views, WhatsApp enquiry taps, general chat taps,
category clicks, searches, traffic sources and mobile vs desktop. Only anonymous
counters are stored (under `/otishub/stats`), with no cookies or personal data.
The **Analytics** page in the admin shows them live for the last 7, 30 or 90 days,
with a table view of the daily numbers.

Signing in to the admin stops counting visits from that browser, so testing
doesn't inflate the numbers. You can switch this back on at the bottom of the
Analytics page.

## Admin cheatsheet

- **New product:** a main image (required) plus any number of extra views,
  each with a label ("Side view", "Lit up", "Box"). Price and description are
  optional. Without a price the shop shows "Ask for price".
- **Save & next →** saves the product and opens the next one in the list.
- ★ on an extra image makes it the main image. ← moves it earlier.
- **Categories:** "+ Add category", then "+ Add item" on a category card to add
  products straight into it. Empty categories stay hidden on the shop.
- **Bulk import:** paste image links (one per line) or pick many files.
  Cloudinary keeps its own copy, so the links never break. Imports are saved
  as hidden drafts unless "Publish straight away" is ticked.
- The Visible/Hidden pill in the product list shows or hides a product on the site.
