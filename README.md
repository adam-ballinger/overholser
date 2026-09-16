# Overholser

Minimal text-based tools for a distribution service office. It will become a
web app server later; for now the logic, data and workflow are built as a CLI
so design changes are fast. Keep the logic reusable by a future server.

Node.js (v24), plain CommonJS, no npm packages. Everything is in `orders.js`.

**Setup, once:** run `npm link` in this folder. That adds the `ovh` command
(named in `package.json`). Undo with `npm unlink -g overholser`.

```
ovh orders                         one page, one row per trip, or per order's lines not on a trip (see below)
ovh orders --channel depot --due   only rows matching the filters (see below)
ovh order 54013306                 one-page view of that order
ovh shortages                      one-page summary of shortages
ovh shortages --today --channel depot   only lines matching the filters (see below)
--file file.csv                    (any command) use a specific CSV instead
```

Filters for `ovh orders` pick report rows; a row shows if it matches all of them.
Totals always cover the whole row.
- Ship date flags, from the export's Ship Date Category (as of when it was
  run). A row matches if any of its lines is in the flag's categories. They
  stack: `--today --tomorrow` is either day.
  - `--due`: late, today or tomorrow
  - `--late`: 9+, 4-8 or 1-3 days late; or one of them: `--9plus`, `--4to8`, `--1to3`
  - `--today`, `--tomorrow`
- Allocation flags, from the row's allocation (see Allocation below): `--alloc`
  (allocated), `--split` and `--short`. They stack like ship date flags:
  `--split --short` is any row with a short line.
- Names match any part of any line on the row, ignoring case: `--channel`,
  `--customer`, `--shipto`.
- `--status` matches the row's status exactly, ignoring case.
- `--mode` is `TL`, `LTL` or `Parcel` (ignoring case), from Shipping Category
  (TRUCK, LTL, PARCEL). A row matches if any of its lines has that mode.
  Repeat it to stack: `--mode tl --mode ltl`. Lines with no category have no mode.

Different kinds of filters must all match: `--today --status holds` is rows
due today that are also Holds.

`ovh shortages` takes `--due`, `--late`, `--today`, `--tomorrow` and
`--channel`, meaning the same as above but picking lines: its item rows and
line counts cover only lines that match every filter. Its order and trip
counts are the rows `ovh orders` would show with the same filters.

Options are always named (`--name value`, handled by `util.parseArgs`), never
guessed from what a bare value looks like; the one bare value is the order
number after `ovh order`. Unknown names are errors. Each command lists its
options in `COMMANDS`; add name filters to `FILTERS`, ship date flags to
`DATE_FILTERS`, allocation flags to `ALLOCATION_FILTERS`, other filters to `rowMatches` (and the `USAGE` line).

**Data:** an "open orders" CSV export from the office system. With no path
given, the newest `openorders*.csv` in Downloads is used. It holds real customer
data, so never copy it into this folder or commit it.

**All grouping and computing happens once, at load.** `loadOrders` returns
`{ lines, orders, trips, items }`: the lines, each with its allocation; each
order (by order number) with its status, allocation, line status counts, dates,
totals and `+` fields; each trip row with its order numbers, ship to / ship
method counts, line status counts, dates, totals, status and allocation; and
each item (by item number) with its onhand and totals. The shortages page is
the one exception: its filters pick lines, so it groups the matching short
lines by item itself. Reports only filter,
sort and format what's already in memory, so many reports can share one load.

## Conventions

- **Screen size is 200 x 50** (the console size Adam plans around).
  One-line outputs fit in 200 characters, except the orders report (213; Adam
  is fine with up to 236 there). One-page reports fill the real
  console: its rows less the "Loading" line and the prompt, padded with blank
  rows. When output isn't a console, they stop at 50 rows with no padding.
- **Primary ids are yellow** (order numbers so far). Use `highlightId`; it adds
  color after sizing and skips color when output is piped to a file.
- **Danger data is white on red; warning data is white on orange.** Use
  `danger` / `warning`, also after sizing. In a data table, color the whole cell
  width (a column's `color`); in label/value fields, just the value text. Orange
  is a 256-color code, since it isn't one of the 16 basic terminal colors.
  - Danger: a late ship date (and its category on the order page), and a short
    Allocation (a line on the order page, a row on the orders report).
  - Warning: a split row's Allocation on the orders report.
  - Warning: the Holds order status, and Awaiting, Booked and Entered line statuses.
- Only 25 of the CSV's columns are kept (`COLUMNS`), as camelCase properties.
- **Status** of an order or trip row (`orderStatus`), from its lines, checked in
  this order: any line Released → Released; all lines Ready → Ready; only Picked
  and Ready lines → Picked; anything else (any Entered, Booked or Awaiting
  line) → Holds.
- **Allocation** of each line (`allocate`) is `allocated` or `short`. For each
  item, lines take pieces from Distribution Onhand (in pieces, the same on every
  line of an item) in order: oldest Order Date first, then by sales channel
  (`PRIORITY_CHANNELS`): Home Depot (including .COM), Lowes, Ace, Menards, then
  all others. A line whose Piece Qty fits in what's left is allocated and uses
  it up. A line that doesn't fit is short and takes nothing, so a later,
  smaller line can still be allocated. Every line counts, whatever its status.
  An order or trip row is `allocated` if none of its lines are short, `short`
  if all of them are, and `split` if some are. A trip can be split even when
  each of its orders is all allocated or all short.
- Dates become `Date`s and quantities/dollars become numbers. Id-like columns
  (order, PO, item, trip, delivery) stay text: they have letters and leading zeros.
- When an order's lines disagree on an order-level field, show the first value
  with a `+` after it; for dates, show the earliest.
- **Orders report rows are built from lines, not orders.** Lines group by trip;
  lines without a trip group by order. So an order split across two trips is on
  both trip rows, each with only its own lines, and an order's lines not on a
  trip get their own row. Each row: trip, first 3 order numbers ("N more..."
  after), order count, and totals over its lines. Rows sort by earliest ship
  date, then most dollars. Differing ship tos or ship methods show a count
  ("3 ship tos") instead of a `+`. Row status uses the order status rules over
  the row's lines; `--status` filters on it, but the report shows the line
  status counts instead, most lines first ("Picked 597, Ready 67, Released 24"),
  orange when the row status is Holds. An Allocation column comes before Line
  Statuses. Filters pick rows. Column widths add up to 213 (Ship To is 40, the
  longest the export gives). It's a one-page report:
  the top line totals all the picked rows (rows, distinct orders, lines, cases,
  dollars), since rows that don't fit are counted, not shown.
- **One-page tables cut to fit** with `fit`: the last row that fits becomes
  "... 12 more lines not shown".
- **Shortages page:** counts first (items with short lines, short lines with
  their pieces and dollars, orders and trips by allocation), then one row per
  item with short lines, most short dollars first. With filters, see above. Onhand and Ordered cover the
  whole item; the Short columns, Ship Date (earliest, red when late) and
  Channels cover only its short lines. Items that don't fit are counted.
- **Ship methods in wide tables drop their last part** for brevity:
  "Fedex Express-Parcel-Ground" shows as "Fedex Express-Parcel". Label/value
  fields (the order page) show the full name.

## Open questions

Not yet decided:

- Blank dates or numbers aren't handled; the current export has none.
- A trip on only some of an order's lines shows no `+`. Flag it?
- Allocation: should a short line use up what's left, so later lines can't
  jump ahead of it? Should Released or Picked lines count first, since they're
  already moving? The orders report filters on it but doesn't show it yet.
