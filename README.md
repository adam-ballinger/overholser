# Overholser

Minimal text-based tools for a distribution service office. It will become a
web app server later; for now the logic, data and workflow are built as a CLI
so design changes are fast. Keep the logic reusable by a future server.

Node.js (v24), plain CommonJS, no npm packages. All the logic is in `ovh.js`;
`ovh.html` is the browser page on top of it and `bundle.js` builds the copy
of it to share (see The page, below).

**Setup, once:** run `npm link` in this folder. That adds the `ovh` command
(named in `package.json`). Undo with `npm unlink -g overholser`.

```
ovh orders                         one page, one row per trip, or per order's lines not on a trip (see below)
ovh orders --thd --due             only rows matching the filters (see below)
ovh order 54013306                 one-page view of that order
ovh shortages                      one-page summary of shortages
ovh late                           one-page summary of late lines, by sales channel
ovh shortages --today --thd        only lines matching the filters (see below)
--file file.csv                    (any command) use a specific CSV instead
--csv out.csv                      (any command) also write the whole table there
```

**The page:** `ovh.html` is the same tools in a browser: open the file (no
server, no setup). It has tabs, one per tool; more will come.
- **orders** is the orders report. Pick an export (a text bar beside the button
  shows the load: real progress while the file is read, then a step each for
  `loadOrders` and drawing, since those run in one go; the page waits a short
  timer, not a frame, before each so the bar shows and a background tab doesn't
  stall), and type the same flags in
  the bar, Enter to run them, or click the flag buttons under it (a flag that's
  already on the line comes off again). It shows every row the flags pick, not
  one page, with a few numbers about them on top. A divider row starts each
  ship date group (`dateGroup`: late, today, tomorrow, future, by the Ship Date
  Category of the row's earliest line; the categories follow date order, so
  each group is one run of rows), with its row count and dollars; the copy
  keeps them, the tab-separated text doesn't. **Copy table** puts the rows
  on the clipboard as a table to paste straight into an email, colors and all -
  every column, even the ones the window is too narrow to show - plus
  tab-separated text for plain email or a spreadsheet. The table is built apart
  from the page and handed to the clipboard as is, so only its inline styles
  go along (a copied selection would bring the page's window-wide columns).
  Cells stay on one line and Items keeps to the report's 34 characters.
  **Save table** downloads that same table as an HTML file
  (`2026-09-16 ovh --late --thd.html`: the date, then the filters behind the
  table shown), under the filters, the export's name and the
  counts line: for Outlook, where a pasted copy loses its text formatting.
- **help** is `HELP.md`: plain-language instructions for the people using the
  page, not this file. Keep it current when what the page does changes.

`ovh.html` only has to stay next to `ovh.js`, which it loads as a plain
script and calls for all the loading, allocating and filtering - the rules live
in one place. The export is read in the browser and goes nowhere else.

**To share it:** `node bundle.js` writes `sharable-ovh.html`, the same page
with `ovh.js`, `HELP.md` and the `version` from `package.json` inside it:
one file to send someone for testing, nothing to set up. The page header shows
that version, so raise it in `package.json` before building one to send, and
testers' feedback says which build they had. It is built, not edited, so run
`node bundle.js` again after changing `ovh.html`, `ovh.js` or `HELP.md`.
`.gitignore` keeps it out of the repo, since it only copies files that are in it.
The help and version are only in that built file, since `ovh.html` can't
read files from disk; it says "dev, not bundled" instead.

Filters for `ovh orders` pick report rows; a row shows if it matches all of them.
Totals always cover the whole row. Almost every filter is a tag: a flag with
no value. Tags come in groups (`TAGS`); tags in one group stack
(`--today --tomorrow` is either day, `--lowes --menards` either channel), and
every group given must match. A line group matches a row if any of its lines
matches; a row group tests the row itself.
- Ship date (line), from the export's Ship Date Category, as of when it was run:
  - `--due`: late, today or tomorrow
  - `--late`: 9+, 4-8 or 1-3 days late; or one of them: `--9plus`, `--4to8`, `--1to3`
  - `--today`, `--tomorrow`
- Consumer (line): `--consumer`, exactly the ten consumer channels in
  `CHANNEL_ORDER` (the late page's list). Its own group, so it narrows the
  channel flags rather than adding to them: `--consumer --thd` is Home Depot.
- Sales channel (line), by what the channel name starts with: `--thd`
  (HOME DEPOT-OK only), `--.com` (HOME DEPOT.COM-OK), `--lowes` (any
  LOWES-), `--menards`, `--ace` (ACE HDW-OK), `--orgill`, `--fsd`
  (DISTRIBUTORS&FIELD SALES-OK), `--ecom` (ECOMMERCE-OK). Rare channels
  (UNKNOWN-OK, CHEMICAL-OK, INTRACOMPANY-OK, METALSOURCE-OK) have no flag of
  their own, and `--consumer` leaves them out.
- Allocation (row, see Allocation below): `--alloc`, `--split`, `--short`.
  `--split --short` is any row with a short line.
- Status (row, see Status below): `--released`, `--ready`, `--picked`, `--holds`.
- Mode (line), from Shipping Category: `--tl` (TRUCK), `--ltl`, `--parcel`.
  Lines with no category have no mode.

The rest:
- `--144` keeps only rows holding a 144" item (the ones the Items column tags).
- `--flr-mtl` (**temporary**) keeps only rows with a HOME DEPOT-OK line for
  one of Home Depot's 104 Flooring items (`FLR_MTL_ITEMS`, copied from
  "2026-09-12 Home Depot Item Category Master Reference.xlsx"). Those rows'
  Items cell starts with a cyan `flr-mtl` tag, after any 144" tag
  (`ITEM_TAGS`). It goes by the row's own lines, like 144": an order split
  across trips is tagged only on the trip holding its flooring line. The
  comment on `FLR_MTL_ITEMS` lists what to delete to take it out.
- `--dollars` keeps the biggest rows that together make up 80% of the dollars
  (`topDollars`). It compares rows against each other, so it runs last, on
  whatever the other filters picked.
- Names, the only filters with a value: `--customer`, `--shipto` match any
  part of any line on the row, ignoring case. Give more than one as a comma
  list or by repeating the option (`--shipto "morrow,moxee"`); a row matches
  any of them. Quote the list: the `ovh` command goes through a `.cmd` shim,
  where an unquoted comma becomes a space, and a name filter takes spaces as
  part of one name (`--customer "ace hdw"`). Repeating the option needs no
  quotes.

Different kinds of filters must all match: `--today --holds` is rows due today
that are also Holds.

`ovh shortages` takes `--due`, `--late`, `--today`, `--tomorrow`, `--consumer` and the channel
flags, meaning the same as above but picking lines: its item rows and line
counts cover only lines that match every filter. Its order and trip counts are
the rows `ovh orders` would show with the same filters.

Options are always named (`--name value`, handled by `util.parseArgs`), never
guessed from what a bare value looks like; the one bare value is the order
number after `ovh order`. Unknown names are errors. Each command lists its
options in `COMMANDS`, built from `TAGS` and `FILTERS`: add a tag to its group
in `TAGS` (a new group needs a `line` or `row` test), a name filter to
`FILTERS`, anything else to `rowMatches`. The usage lines and the page's
buttons follow on their own.

**Data:** an "open orders" CSV export from the office system. With no path
given, the newest `openorders*.csv` in Downloads is used. It holds real customer
data, so never copy it into this folder or commit it. `.gitignore` ignores
every `*.csv` here, exports and `--csv` reports alike.

**All grouping and computing happens once, at load.** `loadOrders` takes the
CSV text (the CLI reads the file, the page reads what was picked) and returns
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
  the row's lines; the status flags (`--holds`...) filter on it, but the report shows the line
  status counts instead, most lines first ("Picked 597, Ready 67, Released 24"),
  orange when the row status is Holds. An Alloc column (headed short so Items
  gets the character) comes before Line Statuses, and a last Items column
  (`itemsCell`) lists as many of the row's items as fit in its width, biggest
  dollars first, ending in "..." when some are left out. Filters pick rows. Column widths add up to 236 (Ship To is 40, the
  longest the export gives). It's a one-page report:
  the top line totals all the picked rows (rows, distinct orders, lines, cases,
  dollars), since rows that don't fit are counted, not shown.
- **`ovh.html` reuses the report's columns**, so nothing about a column is
  written twice: their widths become the table's (dates, money and counts keep
  their exact width, the wide text columns share what the window has left and
  get cut with an ellipsis), and a column's `color` picks the CSS class. Unlike the console, the page colors
  just the text, not the whole cell. Narrow
  windows drop columns: under 900px Ship Method and Items, under 600px
  everything but one order number, the ship date, dollars and allocation.
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
