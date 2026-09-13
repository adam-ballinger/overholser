# CLAUDE.md

## Asking questions and explaining things to Adam

I'm a beginner. Use plain language, kept short. 

## Keeping the code small

Leanness is a core principle here, keep code conventional but as tiny as possible

- **Build the smallest thing that works.** No abstraction until a second
  caller exists; no file or folder created ahead of need. An empty seam is a
  cost, not a head start.
- **Ask before adding a dependency**, a dev tool, or a config file.
- **Prefer deleting.** A change that removes code is worth proposing.

## Git

Commit straight to `main`. No feature branches, no pull requests - this
history is one straight line on purpose. Branch only when I ask by name.

**Never commit unprompted.** Finish the work, say which files changed, stop.
A dirty working tree is the normal resting state, not something to tidy up.

## The project

Minimal text-based tools for a distribution service office. It will become a
web app server later; for now the logic, data and workflow are built as a CLI
so design changes are fast. Keep the logic reusable by a future server.

Node.js (v24), plain CommonJS, no npm packages. Everything is in `orders.js`.

```
node orders.js                     one-line summary of every open order
node orders.js 54013306            one-page view of that order
node orders.js 54013306 file.csv   use a specific CSV instead
```

**Data:** an "open orders" CSV export from the office system. With no path
given, the newest `openorders*.csv` in Downloads is used. It holds real customer
data, so never copy it into this folder or commit it.

## Conventions

- **Screen size is 236 x 65** (Adam's terminal, full screen, size 11 font).
  One-line outputs fit in 236 characters; one-page reports fit in 236 x 65.
- **Primary ids are yellow** (order numbers so far). Use `highlightId`; it adds
  color after sizing and skips color when output is piped to a file.
- Only 25 of the CSV's columns are kept (`COLUMNS`), as camelCase properties.
- Dates become `Date`s and quantities/dollars become numbers. Id-like columns
  (order, PO, item, trip, delivery) stay text: they have letters and leading zeros.
- When an order's lines disagree on an order-level field, show the first value
  with a `+` after it; for dates, show the earliest.

## Open questions

- Line status order (Entered, Booked, Awaiting, Released, Picked, Ready) is a
  guess, not confirmed by Adam.
- Blank dates or numbers aren't handled; the current export has none.
- A trip on only some of an order's lines shows no `+`. Flag it?
- A full 65-row order page pushes its top row off screen once the "Loading"
  line and prompt are counted. Offered to shrink to 62 rows; not decided.
