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
ovh late                           one-page summary of late lines, by sales channel
ovh shortages --today --channel depot   only lines matching the filters (see below)
--file file.csv                    (any command) use a specific CSV instead
--csv out.csv                      (any command) also write the whole table there
```

Filters for `ovh orders` pick report rows; a row shows if it matches all of them.
Totals always cover the whole row.
- Ship date flags, from the export's Ship Date Category (as of when it was
  run). A row matches if any of its lines is in the flag's categories. They
  stack: `--today --tomorrow` is either day.
  - `--due`: late, today or tomorrow
  - `--late`: 9+, 4-8 or 1-3 days late; or one of them: `--9plus`, `--4to8`, `--1to3`
  - `--today`, `--tomorrow`
- Allocation flags, from the row's allocation (see Allocation below): `--alloc`,
  `--split` and `--short`. They stack like ship date flags:
  `--split --short` is any row with a short line.
- Names match any part of any line on the row, ignoring case: `--channel`,
  `--customer`, `--shipto`. Give more than one as a comma list or by
  repeating the option (`--channel "lowes,menards"`); a row matches any of
  them. Quote the list: the `ovh` command goes through a `.cmd` shim, where
  an unquoted comma becomes a space, and a name filter takes spaces as part of
  one name (`--customer "ace hdw"`). Repeating the option needs no quotes.
  `--channel` also takes short names (`CHANNELS`): `thd` is `HOME DEPOT-OK`
  and `fsd` is `DISTRIBUTORS&FIELD SALES-OK`. Since they expand to the whole
  name, `--channel thd` leaves out HOME DEPOT.COM-OK, which `--channel depot`
  still picks up.
- `--144` keeps only rows holding a 144" item (the ones the Items column tags).
- `--dollars` keeps the biggest rows that together make up 80% of the dollars
  (`topDollars`). It compares rows against each other, so it runs last, on
  whatever the other filters picked.
- `--status` matches the row's status exactly, ignoring case. It stacks too:
  `--status ready,picked`, spaces or commas, like `--mode`.
- `--mode` is `TL`, `LTL` or `Parcel` (ignoring case), from Shipping Category
  (TRUCK, LTL, PARCEL). A row matches if any of its lines has that mode.
  Stack it like the rest: `--mode tl,ltl`, quoted or not - modes are single
  words, so spaces separate them too. Lines with no category have no mode.

Different kinds of filters must all match: `--today --status holds` is rows
due today that are also Holds.

`ovh shortages` takes `--due`, `--late`, `--today`, `--tomorrow` and
`--channel`, meaning the same as above but picking lines: its item rows and
line counts cover only lines that match every filter. Its order and trip
counts are the rows `ovh orders` would show with the same filters.

Options are always named (`--name value`, handled by `util.parseArgs`), never
guessed from what a bare value looks like, so a second value needs its own
comma or option name (`--mode ltl,parcel`, not `--mode ltl parcel`); the one
bare value is the order number after `ovh order`. Unknown names are errors.
Each command lists its options in `COMMANDS`; add name filters to `FILTERS`,
ship date flags to `DATE_FILTERS`, allocation flags to `ALLOCATION_FILTERS`,
other filters to `rowMatches` (and the `USAGE` line).

**Data:** an "open orders" CSV export from the office system. With no path
given, the newest `openorders*.csv` in Downloads is used. It holds real customer
data, so never copy it into this folder or commit it. `.gitignore` ignores
every `*.csv` here, exports and `--csv` reports alike.

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
  One-line outputs fit in 200 characters, except the orders report, which
  fills Adam's 236. One-page reports fill the real
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
  - Warning: a split row's Alloc on the orders report, and the `144"` tag that
    starts the Items cell of a row holding a 144" item. The tag alone is
    colored, added after sizing like `highlightId`, not the whole cell.
  - Warning: the Holds order status, and Awaiting, Booked and Entered line statuses.
- Only 25 of the CSV's columns are kept (`COLUMNS`), as camelCase properties.
- **Status** of an order or trip row (`orderStatus`), from its lines, checked in
  this order: any line Released → Released; all lines Ready → Ready; only Picked
  and Ready lines → Picked; anything else (any Entered, Booked or Awaiting
  line) → Holds.
- **Allocation** of each line (`allocate`) is `alloc` or `short` (short words,
  so the orders report column stays 5 wide). For each
  item, lines take pieces from Distribution Onhand (in pieces, the same on every
  line of an item) in order: Picked and Released lines first, then oldest Order
  Date, then by sales channel
  (`PRIORITY_CHANNELS`): Home Depot (including .COM), Lowes, Ace, Menards, then
  all others. A line whose Piece Qty fits in what's left is allocated and uses
  it up. Picked and Released lines are always allocated, even when onhand runs
  out: the warehouse already has their stock, which the export's onhand may no
  longer count (an item can show 0 onhand with a picked line). They still use
  up what's there. Any other line that doesn't fit is short and takes nothing,
  so a later, smaller line can still be allocated.
  An order or trip row is `alloc` if none of its lines are short, `short`
  if all of them are, and `split` if some are. A trip can be split even when
  each of its orders is all allocated or all short.
- Dates become `Date`s and quantities/dollars become numbers. Id-like columns
  (order, PO, item, trip, delivery) stay text: they have letters and leading zeros.
- When an order's lines disagree on an order-level field, show the first value
  with a `+` after it; for dates, show the earliest.
- **Orders report rows are built from lines, not orders.** Lines group by trip;
  lines without a trip group by order. So an order split across two trips is on
  both trip rows, each with only its own lines, and an order's lines not on a
  trip get their own row. Each row: trip, first 3 order numbers then "..." if
  there are more (the Orders column counts them all), order count, and totals
  over its lines. Rows sort by earliest ship
  date, then most dollars. Differing ship tos or ship methods show a count
  ("3 ship tos") instead of a `+`. A row whose lines are all Home Depot says
  which kind instead ("3 RDCs", "12 stores", "2 RDCs, 10 stores"): their ship
  tos are stores unless the name says RDC. Row status uses the order status rules over
  the row's lines; `--status` filters on it, but the report shows the line
  status counts instead, most lines first ("Picked 597, Ready 67, Released 24"),
  orange when the row status is Holds. An Alloc column (headed short so Items
  gets the character) comes before Line Statuses, and a last Items column
  (`itemsCell`) lists as many of the row's items as fit in its width, biggest
  dollars first, ending in "..." when some are left out. Filters pick rows. Column widths add up to 236 (Ship To is 40, the
  longest the export gives). It's a one-page report:
  the top line totals all the picked rows (rows, distinct orders, lines, cases,
  dollars), since rows that don't fit are counted, not shown.
- **`--csv out.csv`** prints the page as usual and also writes that report's
  table (the `order` page writes its lines): the headings, then every row the
  filters pick, in report order, values exactly as the report shows them but
  not cut to width. No counts line, no totals row, no colors. A
  "Wrote 11 rows to out.csv" line follows the page, and in a console the page
  is one row shorter to make room. The file holds real customer data, so keep
  it out of this folder.
- **One-page tables cut to fit** with `fit`: the last row that fits becomes
  "... 12 more lines not shown".
- **Shortages page:** counts first (items with short lines, short lines with
  their pieces and dollars, orders and trips by allocation), then one row per
  item with short lines, most short dollars first. With filters, see above. Onhand and Ordered cover the
  whole item; the Short columns, Ship Date (earliest, red when late) and
  Channels cover only its short lines. Items that don't fit are counted.
- **Late page:** one row per sales channel over its late lines (any Ship Date
  Category ending in "Late"), in Adam's channel order (`CHANNEL_ORDER`), then
  any other channel in the export, most dollars first. A listed channel with
  nothing late still gets a row, all zeros with a blank ship date. Columns:
  orders, lines, cases,
  dollars, a line count for each of 9+ / 4-8 / 1-3 days late (9+ is red when
  there are any), the oldest ship date and how many lines are short. The last
  row is all channels together, so it stays right even if a channel doesn't
  fit. It takes no filters, only `--file` and `--csv`.
- **Ship methods in wide tables drop their last part** for brevity:
  "Fedex Express-Parcel-Ground" shows as "Fedex Express-Parcel". Label/value
  fields (the order page) show the full name.

## Open questions

Not yet decided:

- Blank dates or numbers aren't handled; the current export has none.
- A trip on only some of an order's lines shows no `+`. Flag it?
- Allocation: should a short line use up what's left, so later lines can't
  jump ahead of it?
