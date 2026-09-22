# wave app help

wave app shows the open orders export as a report you can filter, check and copy
into an email. This is an early test version: if something is confusing, wrong
or missing, tell whoever sent you the link.

## Getting started

- Open the page in a web browser, like Chrome or Edge. The link is all you
  need; nothing to install, and it is always the newest version.
- Click **open csv** - or press **Ctrl+O** - and pick the open orders export
  (a `.csv` file) from the office system.
- A bar next to the button shows it loading; a big export takes a few
  seconds, most of it on "sorting orders".
- The file name then stays beside the button, with the date and time the
  export was made, so you can see how old the numbers are.
- The report appears. Narrow it down with the filters: see **Filtering**,
  next.
- To start over with a newer export, click **open csv** again.
- The five tabs across the top are the tools. Click one, or hold **Alt** and
  press its first letter: **Alt+S** search, **Alt+I** inspect, **Alt+B**
  build, **Alt+K** kpi, **Alt+H** help.

## The warning across the top

A line above the tabs, white on orange, when the numbers can't be trusted:

- **No export open** - nothing has been opened yet. Press **Ctrl+O** on the
  search tab.
- **This export is 3 hours old** - what you are looking at was made three
  hours ago, and some of those orders have probably shipped since. Open a
  newer one. It counts from the export's own date and time, the one beside
  **open csv**, not from when you opened it, so a page left running all day
  tells you when it has gone stale.

Nothing hides the report while it's up: the warning says the numbers are old,
you decide whether that matters.

Your export stays on your computer. Nothing is uploaded or saved anywhere:
close or reload the page and it's gone.

## Filtering

Type filters in the bar at the top and press Enter, or click the buttons under
it. Clicking a button again takes it back off. To start over, press **Esc**,
or click the word at the right of the bar that says the same.

**Esc does the nearer job first.** With rows picked (see **Building a list**,
below) it lets go of them and the word reads "clear picked (esc)"; with none
picked it empties the bar and it reads "clear filters (esc)". So Esc twice
always leaves you with nothing picked and no filters, wherever you started.
The word only shows when there's something to clear.

Filters of the same kind mean either one: `--today --tomorrow` is rows due
today or tomorrow, and `--lowes --menards` is either channel. Different kinds
must all match: `--today --lowes --short` is Lowes rows due today that are
short.

Ship date (as of when the export was run):
- `--due` - late, today or tomorrow
- `--late` - any days late; or just `--9plus`, `--4to8` or `--1to3` days late
- `--today`, `--tomorrow`
- `--future` - after tomorrow

Consumer:
- `--consumer` - only the consumer sales channels: Home Depot, homedepot.com,
  Lowes, Menards, Ace, Orgill, distributors and field sales, and ecommerce.
  With a sales channel below it narrows instead of adding:
  `--consumer --thd` is just Home Depot.

Sales channel:
- `--thd` - Home Depot stores and RDCs (not homedepot.com)
- `--.com` - homedepot.com
- `--lowes`, `--menards`, `--ace`, `--orgill`
- `--fsd` - distributors and field sales
- `--ecom` - ecommerce

Allocation (whether there's stock, see **Allocation** below):
- `--alloc`, `--split`, `--short`

Status:
- `--released`, `--ready`, `--picked`, `--holds`

How it ships:
- `--tl` (truckload), `--ltl`, `--parcel`

Other:
- `--144` - only rows holding a 144" item.
- `--no-144` - only rows holding none.
- `--flr-mtl` - only rows with a Home Depot (not homedepot.com) line for one of
  Home Depot's Flooring items. For now only: it may go away.
- `--dollars` - only the biggest rows that together make up 80% of the dollars
  of whatever else you filtered.

By name or number - type it after the filter:
- `--customer "ace hdw"` - customer. Any part of the name works and capitals
  don't matter. Put quotes around a name with spaces.
- `--shipto morrow` - ship to, the same way.
- `--order 1234` - an order number. Type the whole number. Shows the order's
  whole trip, with the other orders on it.
- `--trip 5678`, `--delivery 0099` - a trip or delivery number. Type the whole
  number, including any zeros at the start.
- `--item 66127` - an item number, the same way. Shows every row with a line
  for that item.
- For more than one name, separate them with commas: `--shipto "morrow,moxee"`,
  `--order 1234,5678`.

## Reading the report

Each row is one truck trip. Orders that aren't on a trip yet get a row of their
own. An order split across trips shows up on each trip, with just its lines for
that trip.

Rows are listed by ship date, soonest first, then biggest dollars first. A
divider splits them into **LATE** (in red), **TODAY**, **TOMORROW** and
**FUTURE** (as of when the export was run), each with its row count and
dollars. A row goes by its earliest ship date.

- **Trip** - the trip number, blank if the order isn't on a trip yet.
- **Order Numbers** - the first three orders on the row, then `…` if there
  are more. **Orders** counts them all.
- **Ship To** - where it's going. When the orders go to different places it
  says how many ("3 ship tos"). Home Depot rows say "3 RDCs" or "12 stores".
- **Ship Method** - the carrier, or how many when they differ.
- **Ship Date** - the earliest ship date on the row.
- **Lines**, **Cases**, **Dollars** - totals for the row.
- **Alloc** - whether there's stock for the row (see below).
- **Line Statuses** - how many lines are at each status, most first.
- **Items** - the row's item numbers, biggest dollars first.

A cell that's too narrow to show everything ends in `…`. Hover over it to see
all of it. On a small screen some columns are hidden; they're still in the
table when you copy it.

## Looking at one trip or one order

The **inspect** tab shows everything about one trip, or about one order.
Click any trip or order number on the page - in the report, or in a trip's own
list of orders - or type a number in the inspect tab's bar and press Enter.

A **trip** number shows the whole trip. An **order** number shows that order
on its own, headed "Order 54001840 on Trip 7989649": the totals, the items and
the lines are the order's, not its trip's. Click that trip number in the
heading to see the whole trip it's part of. An order split across trips shows
each part, one under the other, so you can see what's on each trip.

On top: what it adds up to, then the ship method, ship date, ship to,
status, allocation, short lines, orders on hold and sales channels. Under that
are two tables:
- **Orders** - each order with its PO, delivery, customer, ship
  to, ship date, whether it's on hold, allocation and totals. Looking up one
  order, that's the one row.
- **Items** - each item with its description, how many orders and
  pieces want it, the warehouse's onhand, allocation and totals. Short and
  split items come first, so what's missing is at the top. A cyan `flr-mtl` or
  orange `144"` tag starts the description of an item that is one (see
  **Colors**).

On a phone some columns are hidden.

**copy table (ctrl+c)** and **save table (ctrl+s)**, above the lot, send what
you are looking at on - as plain text for an email, or as a file (see
**Sending the report on**).

**bld (ctrl+b)**, at the right of the heading, puts what the heading names on
the build list (see **Building a list for the wave sheet**, next) - the trip,
or the order when you looked an order up. **Ctrl+B** does the same without
reaching for the mouse, so you can type a number, press Enter to see it, then
Ctrl+B to add it.

## Building a list for the wave sheet

The **build** tab is a list you put together yourself, a trip or an order at a
time, and then paste into the wave sheet in one go.

**Click a row** to pick it. It goes a shade darker with a mark down its left
edge. Click as many rows as you want - each click picks a row, and clicking a
picked row lets it go again. The **bld selection** button, above the table on
the right, counts them: it reads "bld 5 (b)" when five rows are picked. Click
it, or just press **b**, and all five go on the list at once. The rows let go
of themselves once they're on, so you can carry straight on picking the next
few.

For a single row there is no need to pick it at all: the small **+** at the
end of the row on the search tab puts that one row on, and leaves your picked
rows alone.

Press **Esc** to let go of all of them; press it again and it empties the
filter bar. Changing tabs lets go of them too, so what the button says is
always what you can see.

The truck up in the corner gives a little roll every time rows go on, and the
count floats up over the tab in whatever color it feels like. Every so often
it comes up bigger than usual - there's nothing behind that, it's just there.
Copying the list gets a longer run of its own, since that's the bit the picking
was for, and now and then it comes up as a proper jackpot.

Click a row anywhere but on a number: clicking a trip or order number still
takes you to the inspect tab, the way it always has.

- A row on the **search** tab is a trip, so it puts the whole trip on.
- A row in a trip's **Orders** table, on the inspect tab, is one order, so it
  puts just that order on, with only its own cases and its own ship date. The
  trip it's on still shows in the Trip column.
- Each row puts **itself** on and nothing else. An order split across two
  trips is two rows, so picking one puts that trip's part on; pick both rows
  if you want both parts.
- **bld (ctrl+b)** at the right of a heading on the inspect tab puts what that
  heading names on, without picking any row first.
- The **+** at the end of a row on the search tab puts that one row on.
- **bld all (ctrl+b)** on the search tab puts on every row the filters picked -
  the whole report as you have narrowed it, not just the rows you clicked. So
  filter down to the wave you want, press **Ctrl+B**, and it is all on the list.
  It counts what actually went on, so pressing it twice adds nothing.
- Adding something already on the list does nothing, so nothing can be pasted
  into the sheet twice.

Across the top the list says what it comes to: total dollars first, then how
many rows, orders, lines and cases. Under that are the six things the wave
sheet wants - trip, order numbers, customer, ship method, ship date and cases
- numbered down the side.

**copy build (ctrl+c)** puts the whole list on the clipboard, one line per row, and
**Ctrl+V** pastes it into the sheet. Each value lands in its own cell, and the
order numbers stay as they are instead of turning into one long number. Two
blank cells go in between the order numbers and the customer, which is where
the sheet fills in its own - so what you paste lines up even though the table
doesn't show them. A trip going to more than one customer lists them all; more
than one ship method says how many ("2 ship methods").

To take rows off, pick them the same way and press **d**, or use the **drop
selection** button above the table, which counts them too. The small **x** at
the end of a row takes off that one row, the way the **+** on search puts one
on. **drop all (ctrl+d)** empties the list - all of it at once, with no way
back, so mind that one.

Opening a newer export keeps your list and reads every row's numbers from the
new export, so the cases and dates are never stale. Anything that isn't in the
new export any more - a trip that has shipped - drops off the list. Closing or
reloading the page empties it, like everything else here.

## The kpi tab

A small table of what is **late**: who owns it across the top, who works it
down the side. Nothing due today or later is in it - the tab is what is already
behind.

The heading says what the numbers are: **Delivery: Cases Late**. Press **t** to
step to dollars, again for orders, again back to cases - the heading changes
with them, since 1,240 cases and 1,240 orders look exactly the same. (Ctrl+T
is meant to do it too, but Chrome keeps that key for its own new tab and the
page never sees it. Use **t**.)

- **Late** is the report's own late, the same as the `--late` filter: 1-3, 4-8
  or 9+ days late. It goes line by line, so a trip with one late line puts
  that line in the table and leaves the rest of the trip out.
- **1st shift** is Home Depot, Lowes, Ace, Orgill and Distributors & Field
  Sales. **2nd shift** is Menards. Under the table each shift is written out
  in full - whose it is, and the sales channels it owns - so you never have to
  remember them.
- The rows are where the line has got to. **holds (Nicole)** is still
  Entered, Booked or Awaiting. **covered/ready (Nicole)** and **short/ready
  (Nicole)** are both Ready, split by whether the stock is there for them -
  covered has it, short doesn't (see **Allocation**). **picked/released
  (Brad, Nikki)** is in the warehouse's hands.
- Each cell is the late lines in it, counted line by line, not order by
  order. On cases and dollars the totals add up both ways. On **orders** they
  don't: an order with a ready line and a picked line is in two rows and is
  still one order, so a total is smaller than its cells added up. The line
  under the heading says so while orders is showing.
- **Click any number to copy it.** It goes on the clipboard as plain text,
  ready to paste into a message or a spreadsheet with Ctrl+V, and the line
  under the table says what went.
- It covers the whole export - every late line in it, not the rows your
  filters picked - and it redraws when you open a newer one.
- Sales channels that are neither shift's - Home Depot.com, the other Lowes,
  Ecommerce and the rare ones - are left out entirely.

## Colors

- **Red date** - the row is late.
- **Red Alloc** - `short`: none of the row's lines have stock.
- **Orange Alloc** - `split`: some lines have stock and some don't.
- **Orange Line Statuses** - the row is on hold: none of its lines are
  Released, and at least one is still Entered, Booked or Awaiting.
- **Orange 144"** at the start of Items - the row holds a 144" item.
- **Cyan flr-mtl** at the start of Items - the row has a Home Depot line for a
  Flooring item (see `--flr-mtl`). In the inspect tab both tags start the item's
  Description instead, so they mark the one item they belong to.

## Allocation

The report works out which lines the stock on hand can cover, item by item.
Stock goes first to lines already Picked or Released, then to the oldest
orders, then by customer: Home Depot, Lowes, Ace, Menards, then everyone else.
A line is `alloc` if its whole quantity is covered and `short` if it isn't.
Picked and Released lines always count as `alloc`, since the warehouse already
has their stock. A row is `alloc`, `short` or `split` depending on its lines.

## The numbers on top

They cover just the rows your filters picked.

- The first line counts the rows, orders, lines, cases and dollars.
- **Late** - rows with a late ship date.
- **lines short** and **lines alloc** - lines without and with stock. Together
  they add up to all the lines.
- **Holds** - rows on hold.
- **144"** - rows holding a 144" item.
- **Ship dates** - the earliest and latest ship date.
- **Biggest channel** - the sales channel with the most dollars.

## Sending the report on

**save table (ctrl+s)**, just above the table, saves the report as a file in
your Downloads, named with the date and your filters, like
`2026-09-16 wave --late --thd.html`, and headed with the filters, the export's
name and the counts. Open it in your browser, or attach it to an email.

The file has the whole table in it, colors included - every row your filters
picked and every column, even ones hidden on a small screen. Each cell stays
on one line, and Items shows the row's biggest few items, then `…` if there
are more.

**copy order numbers (c)** puts just the order numbers on the clipboard, as
one line separated by commas, biggest order first by cases: click the rows you
want - as many as you like - and press **c**, or use the button above the
table, which counts them ("copy 12 order numbers (c)"). A trip row gives you
every order on that trip; a row in a trip's **Orders** table on the inspect tab
gives you that one order. An order on two trips is listed once. Paste it
wherever you need the numbers - a lookup box, a spreadsheet cell, an email. To
copy one number by itself, select it in the cell and use the browser's own
**Ctrl+C**.

**The inspect tab saves the same way.** Look a trip or an order up, then
**save table (ctrl+s)** above it, and you get one file with everything the tab
shows - the heading, the facts, the orders and the items, colors and all,
named for what you looked up (`2026-09-21 wave trip 7953463.html`). That's the
one to send when someone asks about a single trip or order. An order on more
than one trip saves every part of it, the way the tab shows them.

**copy table (ctrl+c)**, beside it, puts the same trip or order on the
clipboard as plain text, for typing an email around rather than attaching a
file to. It's shorter than the tab: the heading and the facts as they read on
screen, then the orders with just their ship to, ship date, allocation, cases
and dollars, and the items with just their description, pieces, allocation,
cases and dollars. Paste it into the message with **Ctrl+V** - there is no
formatting on it, so it arrives in whatever you are already writing in. The
columns are lined up with spaces, so they sit straight in a fixed-width font
like Consolas or Courier. Attach the saved file instead when the colors or the
columns it leaves out matter.

## The keys

- **Alt+S**, **Alt+I**, **Alt+B**, **Alt+K**, **Alt+H** - show the search,
  inspect, build, kpi or help tab.
- **t** - on kpi, step the numbers between cases, dollars and orders. The tab's first letter, and they work even while you
  are typing in a bar.
- **b** - put the picked rows on the build list.
- **c** - copy the picked rows' order numbers, comma separated, biggest first.
- **d** - take the picked rows off the build list.
- **Esc** - let go of the picked rows; again, empty the filter bar.
- **Ctrl+B** - on search, put every row the filters picked on the list; on
  inspect, put what the heading names on.
- **Ctrl+C** - on build, copy the list; on inspect, copy the trip or order as
  plain text. (With something selected on the page it copies that instead, the
  way it normally would.)
- **Ctrl+D** - on build, empty the list.
- **Ctrl+O** - on search, open an export.
- **Ctrl+S** - save the table: the report on search, the trip or order on
  inspect.
