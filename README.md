# wave

Minimal text-style tools for a distribution service office, in a browser page.
It will become a web app server later; for now it's one page, opened from a
file while working on it and served as a flat file from GitHub Pages, so design
changes are fast. Keep the rules reusable by a future server.

Plain JavaScript, no npm packages. Three files do the work:
- `wave.js`: the rules. Loading an export, allocating stock, building the
  report rows and columns (`makeRow` makes one out of any run of lines: a
  whole trip at load, one order of it when that order is looked up or put on
  the build list), and the filters.
- `wave.html`: the page on top of it. It loads `wave.js` as a plain script and
  uses its names directly, so it only has to stay next to it.
- `bundle.js` (Node.js v24): builds `index.html`, the one file the site serves.

## The page

Open `wave.html` in a browser; no server, no setup. It has tabs, one per tool;
more will come. Their names read as commands, like the filter bar: one word
each, with the longer wording in the tab's tooltip. **Alt and a tab's first
letter shows it** (`alt+s`, `alt+i`, `alt+b`, `alt+h`): the name is the key, so
there is nothing to remember, and the tooltip says it. It is read off the
buttons themselves, so a new tab gets its key by being named - two tabs
starting with the same letter is what would break it. Like Esc it works while
a bar has the typing, since leaving the filter bar for inspect is what it is
for, and `e.code` rather than `e.key`, since a Mac's Option turns the letter
into a symbol.
- **search** is the orders report. Pick an export with **open csv (ctrl+o)**;
  the key clicks the hidden file input behind the button, and ctrl+o being the
  browser's own key for opening a file is the reason to take it (a text bar
  beside the button shows the load: real progress while the file is read, then
  a step each for `loadOrders` and drawing, since those run in one go; the
  page waits a short timer, not a frame, before each so the bar shows and a
  background tab doesn't stall). Type flags in the bar, Enter to run them, or
  click the flag buttons under it (a flag that's already on the line comes off
  again). At the end of the line, plain text rather than another button, is
  what **Esc** will do (`showClear`): "clear picked (esc)" while rows are
  picked, "clear filters (esc)" otherwise, and nothing at all when there is
  neither. `escape` does
  the nearer job first - lets the picked rows go, and only once there are none
  empties the bar - so Esc twice always ends at nothing picked and no filters.
  It is one listener on the whole document, not on the bar: the bar had it
  first, and the key then did nothing once a click on a row had taken the
  typing out of it. It shows every row the flags pick, with a few
  numbers about them on top. A divider row starts each ship date group
  (`dateGroup`: late, today, tomorrow, future, by the Ship Date Category of the
  row's earliest ship date; the categories follow date order, so each group is
  one run of rows), with the group's row count and dollars.
  **Drawing happens in two goes** (`drawRows`): the first 150 rows now, the
  rest on a timer once those are up, since building a row's HTML costs far more
  than putting it on the page (1,500 rows: ~25ms for the first 150, a few
  hundred for the lot) and clearing the filters asks for every row at once.
  `tableRows` takes a run of rows and where it starts, so the second go opens a
  divider only when its group changes, and each divider still counts the whole
  group. A `drawing` count drops a late chunk whose filters the bar has already
  moved past.
  **bld all (ctrl+b)**, beside save table, puts every row the filters picked on
  the build list, so a filter line is a whole wave in one key. It takes `rows`,
  the rows the flags picked last, rather than the drawn `<tr>`s, since the
  second chunk of a long report may still be on its way; `addSpec` names what a
  row puts on, the one `tableRows` gives each row.
  A **+** ends each report row and puts that one row on, the way the list's x
  takes one off. `headingRow` and `tableRows` take a `plus`, so the column is
  the page's table only and the saved one never grows a column that does
  nothing in an email. The + carries its own `data-add` and the click listener
  takes it before the row's own click, so pressing it doesn't also pick the row
  it sits in.
  `addEntry` is one entry without drawing and `addToBuild` the one-off that
  draws, so a whole report going on redraws the list once rather than a
  thousand times.
- **inspect** shows one report row in full: type a trip or order number and
  Enter, or click one. Every trip and order number the page shows is a link
  here (a column's `find` names the numbers in its cell, `td` links each one,
  and one listener over the tabs catches the click), so the orders report and
  a trip's own orders both lead here. A trip number shows that trip; an order
  number shows the order itself, `makeRow` over just its lines, so the totals,
  orders and items are the order's and not its trip's. A split order shows one
  of these per trip it's on. Each gets a heading ("Trip 7953463",
  or "Order 54001840 on Trip 7989649" when an order was looked up, which is
  how you see what trip an order is on; that trip number links to the whole
  trip), what it adds up to (orders, deliveries,
  lines, pieces, cases, dollars), a few facts (ship method, date, ship to,
  status, allocation, short lines, orders on hold, channels).
  **bld (ctrl+b)** (at the right of each heading, and the key anywhere on the
  tab, since Enter in the bar has just looked the trip up and a bare b belongs
  to the selected row - it takes the first heading shown) adds what the heading
  names to the build list: the trip, or, when an order was looked up, that
  order. The button carries the number itself (`data-add`), so nothing has to
  remember which rows are on screen.
  Then two tables: its orders (`TRIP_ORDER_COLUMNS`, soonest first) and its items
  (`TRIP_ITEM_COLUMNS`, short then split first, then most dollars). A new
  export redraws it. Table titles sit above the tables, not in a row: a fixed
  layout table takes its column widths from its first row. Phones drop PO,
  Delivery, Customer, Hold, Pieces and Onhand.
- **build** is a list of trips and orders to paste into the wave sheet in one
  go. **Clicking a row** picks it (`tr.on`, a shade darker with a mark down its
  left edge) and clicking it again lets it go: a toggle, so no modifier to hold
  and as many rows as you like. **bld selection** or **b** adds every picked
  row; the button counts them ("bld 5 (b)"), since the rows may be scrolled
  away from it, and `addPicked` lets them go once they're on the list, so the
  marks left behind aren't in the way of the next few. Esc lets them go too,
  and so does leaving the tab (`showTab` calls `unpick`), so what a button says
  is always what you can see.
  A row carries what it adds in `data-add`, as `"trip|order"` with one side
  empty: the report's rows a trip (or an order, when the row isn't on a trip),
  a trip's Orders rows that trip's own order. So a row adds itself and nothing
  else - an order split over two trips is two rows, and picking one puts that
  part on. Clicking a trip or order number still looks it up on inspect - the
  same listener does both, the number first. The tab counts what's on the list
  ("build 3"), which is the only sign a click landed from another tab.
  A floating button beside the hovered number came first and was worse: the
  gap between number and button counted as leaving it, so it vanished as you
  reached for it.
  The list holds **entries, not rows** (`{ trip, order }`, order empty for a
  whole trip): a new export makes new row objects, so `buildRow` looks each
  entry up again every time the list is drawn (`drawBuild`). That is what makes
  a new export refresh the numbers and drop whatever is no longer in it. A trip
  number adds the trip; an order number adds just that order, on each row
  holding it, since a split order is on more than one trip. An entry already on
  the list is ignored, so nothing is pasted twice.
  `BUILD_COLUMNS` is the wave sheet's eight cells less the two blanks it fills
  in itself, in its order. The list's own number starts each row and an x ends
  it - neither a column, since they count and act on the list rather than
  saying anything the sheet takes. **drop selection** or **d** takes every
  picked row off, highest place first since dropping one moves the rows under
  it up; the x takes off the row it sits in; **drop all** empties the list.
  `#buildTotals` says what the list comes to (dollars first, then rows,
  orders, lines, cases), orders named once the way the report's counts line
  does them.
  `#build-tab th, td` overrides the narrow-window rules, since all six columns
  are in the paste. **copy build** is one `waveLine` per row, newline
  separated, text only, no HTML: it's for pasting into the sheet,
  not an email. `waveLine` lists customers like the order numbers, each named
  once; ship method says how many when a trip has more than one ("2 ship
  methods"), like the report; the ship date is the earliest. The lists have a
  space after the comma, since Excel reads a pasted cell as if it were typed
  and makes "54055633,54055634" one huge number (the comma is its thousands
  separator) - the space keeps the cell text.
- **help** is `HELP.md`: plain-language instructions for the people using the
  page, not this file. Keep it current when what the page does changes.

**save table (ctrl+s)** sits at the right just above the table it acts on, away
from open csv and the typing line. It downloads the report as an HTML file
(`2026-09-16 wave --late --thd.html`: the date, then the filters behind the
table shown), headed by the filters, the export's name and the counts line:
for Outlook, where a pasted copy loses its text formatting. `emailTable`
builds it apart from the page, so only its inline styles go along (a copied
selection would bring the page's window-wide columns); every column goes, even
the ones the window is too narrow to show, with the group dividers, cells on
one line and Items kept to 34 characters.

A **copy table** button put the same table on the clipboard, as HTML and as
tab-separated text. Adam asked for it out for now; it is in the history, and
`toClipboard` lost the HTML half of its job with it.

**The keys:** the ctrl ones belong to the tab showing, and each is the
browser's own otherwise, so each says no to it - `ctrl+o` opens an export and
`ctrl+s` saves the table on search, `ctrl+c` copies the list and `ctrl+d`
empties it on build. `ctrl+b` is
whatever building means on the tab showing: every row the filters picked on
search, what the heading names on inspect. Ctrl+C steps aside when something
is selected, since copying a name out of a cell is what the browser's key is
for. The alt ones are the tabs, above, and the only keys that work from any
tab.

**What building feels like:** adding rows is what a worker does over and over,
so it gives a little back. `celebrate` rolls the truck in the header (the
`.speed` lines it already had, one after another so it reads as moving, and the
`.lamp` blinking) and floats the count over the build tab. The color comes from
`POP_COLORS` fresh each time. `CRIT_CHANCE` is 15%: over a session of thirty
adds that's four or five bigger runs - often enough to be worth hoping for,
rare enough that it stays a surprise rather than the thing that always happens.
The copy gets a longer run of its own (`big`), since it's what the picking was
for, and a jackpot at `JACKPOT_CHANCE`, a quarter: a worker copies a handful of
times where they add thirty, so 15% there would be a jackpot seen once a
fortnight. Its rules come after `big` and `crit` so they beat both - the truck
sweeps long and fast at once, the four totals go through three colours a beat
apart, and "wave away!" floats up where an add floats its count.
It counts what went on the list and not what was asked for, so picking rows
that are already there celebrates nothing. `prefers-reduced-motion` turns the
lot off; none of it says anything the page doesn't also say in words. The
floating count is `position: fixed` and starts no higher than 44px, since the
header scrolls away in a long report and the count rises 28px from where it
starts.

The export is read in the browser and goes nowhere else.

**To share it:** send the address. `node bundle.js` writes `index.html`, the
page with `wave.js`, `HELP.md` and the `version` from `package.json` inside it,
and GitHub Pages serves that one file at
<https://adam-ballinger.github.io/overholser/> - nothing to set up, nothing to
download. It is the only built file in the repo, since Pages serves what is
committed and this project has no build step of its own to run there. So a
change is live once the rebuilt `index.html` is pushed, and everyone is always
on the newest one. The page header shows the version, so a tester's feedback
still says which build they had. The repo is still named `overholser`, which
is the only reason the address says so; the app is `wave` everywhere else.
Renaming the repo would change the address.

The page is all there is to deploy: no server, no packages, and the export is
read in the browser, so Pages never sees it. Pages needs the repo public,
which puts `wave.js` (including `FLR_MTL_ITEMS` and the channel names) on the
open internet - no customer data, but check before adding anything internal.

**Versions:** every push to the repo raises the patch number in `package.json`
(0.1.0 → 0.1.1), committed with that push. The minor number (0.1 → 0.2) goes
up when the work since the last one is a new tool, or something testers would
notice. Claude judges which, raises it with the push and says so afterwards.
`index.html` is built, not edited, so run `node bundle.js` again after
changing `wave.html`, `wave.js`, `HELP.md` or the version - and push the new
`index.html`, or the site still shows the old one. The help and version are
only in `index.html`, since `wave.html` can't read files from disk; it says
"dev, not bundled" instead.

## Filters

Filters pick report rows; a row shows if it matches all of them. Totals always
cover the whole row. Almost every filter is a tag: a flag with no value. Tags
come in groups (`TAGS`); tags in one group stack (`--today --tomorrow` is
either day, `--lowes --menards` either channel), and every group given must
match (`--today --holds` is rows due today that are also Holds). A line group
matches a row if any of its lines matches; a row group tests the row itself.
- Ship date (line), from the export's Ship Date Category, as of when it was run:
  - `--due`: late, today or tomorrow
  - `--late`: 9+, 4-8 or 1-3 days late; or one of them: `--9plus`, `--4to8`, `--1to3`
  - `--today`, `--tomorrow`
  - `--future`: the export's one category past tomorrow, Future
- Consumer (line): `--consumer`, exactly the ten consumer channels in
  `CONSUMER_CHANNELS` (Adam's list). Its own group, so it narrows the channel
  flags rather than adding to them: `--consumer --thd` is Home Depot.
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

The other plain flags (`OTHER_FLAGS`):
- `--144` keeps only rows holding a 144" item (the ones the Items column tags),
  `--no-144` only rows holding none.
- `--flr-mtl` (**temporary**) keeps only rows with a HOME DEPOT-OK line for
  one of Home Depot's 104 Flooring items (`FLR_MTL_ITEMS`, copied from
  "2026-09-12 Home Depot Item Category Master Reference.xlsx"). Those rows'
  Items cell starts with a cyan `flr-mtl` tag, after any 144" tag
  (`ITEM_TAGS`, `itemTags`; the inspect tab starts an item's Description with the
  same tags). It goes by the row's own lines, like 144": an order split
  across trips is tagged only on the trip holding its flooring line. The
  comment on `FLR_MTL_ITEMS` lists what to delete to take it out.
- `--dollars` keeps the biggest rows that together make up 80% of the dollars
  (`topDollars`). It compares rows against each other, so the page runs it
  last, on whatever the other filters picked.

Names, the only filters with a value (`FILTERS`): `--customer`, `--shipto`
match any part of any line on the row, ignoring case. Put quotes around a name
with spaces (`--customer "ace hdw"`). `--order`, `--trip`, `--delivery` and
`--item` match the number exactly, leading zeros too, so `--order 1234`
doesn't pick 51234; they show each whole row holding a matching line (an
order's whole trip, or, for `--item`, every trip or order with a line for that
item). Give more than one as a comma list or by
repeating the flag (`--shipto "morrow,moxee"`, `--order 1234,5678`); a row
matches any of them.

The page's `parseFlags` turns the bar into what `rowMatches` takes: a plain flag
is `true`, a name filter a list of values, anything else is "Unknown option".
To add a flag: a tag goes in its group in `TAGS` (a new group needs a `line` or
`row` test), a plain flag in `OTHER_FLAGS` and `rowMatches`, a name filter in
`FILTERS`. The page's buttons follow on their own.

## Data

An "open orders" CSV export from the office system, picked in the page. It
holds real customer data, so never copy it into this folder or commit it.
`.gitignore` ignores every `*.csv` here.

**All grouping and computing happens once, at load.** `loadOrders` takes the
CSV text and returns the report rows, each with its lines (and their
allocation), orders and items (`rowOrders`, `rowItems`: each a summary of just
its lines on the row, for the inspect tab), order and item numbers, ship to /
ship method, line status counts, dates, totals, status, allocation and tags.
The page only filters, sorts and formats what's already in memory.

An example export, `openordersextract example.csv`, sits in this folder to
try things on (ignored like every CSV). It has one category past tomorrow,
Future.

## Conventions

- **Buttons are lowercase**, like the tabs and the flags, and each says its
  key in brackets ("save table (ctrl+s)"). The page reads as typed commands,
  and a capital in the middle of that reads as a different kind of thing.
- **A button says what it acts on** when more than one button does the same
  job to a different set: "bld selection", "bld all", "drop selection", "drop
  all". The one-row versions are marks in the row itself rather than buttons
  up top - **+** on search puts that row on, **x** on build takes it off.
- **Colors:** danger is white on red, warning white on orange, both on the text
  only, not the whole cell. A column's `color(row)` in `REPORT_COLUMNS` names
  the CSS class (`'danger'`, `'warning'`); `ITEM_TAGS` names each tag's class,
  and a column with `tags: true` puts the row's tags in front of its value
  (the report's Items, the inspect tab's Description).
  - Danger: a late ship date, and a short Alloc.
  - Warning: a split Alloc, Line Statuses when the row's status is Holds, and
    the `144"` tag that starts the Items cell of a row holding a 144" item.
  - Cyan: the temporary `flr-mtl` tag.
  - Order numbers are amber.
- Only 25 of the CSV's columns are kept (`COLUMNS`), as camelCase properties.
  Dates become `Date`s and quantities/dollars become numbers. Id-like columns
  (order, PO, item, trip, delivery) stay text: they have letters and leading
  zeros.
- **Status** of a row or order (`orderStatus`), from its lines, checked in
  this order: any line Released → Released; all lines Ready → Ready; only Picked
  and Ready lines → Picked; anything else (any Entered, Booked or Awaiting
  line) → Holds.
- **Allocation** of each line (`allocate`) is `alloc` or `short`. For each
  item, lines take pieces from Distribution Onhand (in pieces, the same on every
  line of an item) in order: Picked and Released lines first, then oldest Order
  Date, then by sales channel (`PRIORITY_CHANNELS`): Home Depot (including
  .COM), Lowes, Ace, Menards, then all others. A line whose Piece Qty fits in
  what's left is allocated and uses it up. Picked and Released lines are always
  allocated, even when onhand runs out: the warehouse already has their stock,
  which the export's onhand may no longer count (an item can show 0 onhand with
  a picked line). They still use up what's there. Any other line that doesn't
  fit is short and takes nothing, so a later, smaller line can still be
  allocated. A row is `alloc` if none of its lines are short, `short` if all of
  them are, and `split` if some are. A trip can be split even when each of its
  orders is all allocated or all short.
- **Report rows are built from lines, not orders.** Lines group by trip; lines
  without a trip group by order. So an order split across two trips is on both
  trip rows, each with only its own lines, and an order's lines not on a trip
  get their own row. Each row: trip, first 3 order numbers then "…" if there
  are more (the Orders column counts them all), order count, and totals over
  its lines. Rows sort by earliest ship date, then most dollars. Differing ship
  tos or ship methods show a count ("3 ship tos"). A row whose lines are all
  Home Depot says which kind instead ("3 RDCs", "12 stores", "2 RDCs, 10
  stores"): their ship tos are stores unless the name says RDC. Line Statuses
  counts the lines at each status, most first ("Picked 597, Ready 67, Released
  24"). Items (`itemsCell`) lists the row's items, biggest dollars first, after
  its tags. Ship methods drop their last part: "Fedex Express-Parcel-Ground"
  shows as "Fedex Express-Parcel".
- **Columns keep their `width`s as proportions:** columns of 13 characters or
  less (dates, money, counts, numbers) keep their exact width, the wide text
  columns share what the window has left and get cut with an ellipsis (on the page Items lists every item; the copy keeps
  to 34 characters). The report's own " ..." for "more than shown" becomes the
  browser's "…". Narrow windows drop columns: under 900px Ship Method and
  Items, under 600px everything but one order number, the ship date, dollars
  and allocation.

## Open questions

Not yet decided:

- Blank dates or numbers aren't handled; the current export has none.
- Allocation: should a short line use up what's left, so later lines can't
  jump ahead of it?
