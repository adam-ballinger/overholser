# wave help

wave shows the open orders export as a report you can filter, check and copy
into an email. This is an early test version: if something is confusing, wrong
or missing, tell whoever sent you the link.

## Getting started

- Open the page in a web browser, like Chrome or Edge. The link is all you
  need; nothing to install, and it is always the newest version.
- Click **open csv** and pick the open orders export (a `.csv` file) from the
  office system.
- A bar next to the button shows it loading; a big export takes a few
  seconds, most of it on "sorting orders".
- The report appears. Narrow it down with the filters: see **Filtering**,
  next.
- To start over with a newer export, click **open csv** again.
- The four tabs across the top are the tools. Click one, or hold **Alt** and
  press its first letter: **Alt+S** search, **Alt+I** inspect, **Alt+B**
  build, **Alt+H** help.

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
picked row lets it go again. The **bld** button, above the table on the right,
counts them: it reads "bld 5 (b)" when five rows are picked. Click it, or just
press **b**, and all five go on the list at once. The rows let go of
themselves once they're on, so you can carry straight on picking the next few.

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
- **bld all (ctrl+b)** on the search tab puts on every row the filters picked -
  the whole report as you have narrowed it, not just the rows you clicked. So
  filter down to the wave you want, press **Ctrl+B**, and it is all on the list.
  It counts what actually went on, so pressing it twice adds nothing.
- Adding something already on the list does nothing, so nothing can be pasted
  into the sheet twice.

Across the top the list says what it comes to: how many rows, orders, lines
and cases. Under that are the six things the wave sheet wants - trip, order
numbers, customer, ship method, ship date and cases - numbered down the side.

**copy build (ctrl+c)** puts the whole list on the clipboard, one line per row, and
**Ctrl+V** pastes it into the sheet. Each value lands in its own cell, and the
order numbers stay as they are instead of turning into one long number. Two
blank cells go in between the order numbers and the customer, which is where
the sheet fills in its own - so what you paste lines up even though the table
doesn't show them. A trip going to more than one customer lists them all; more
than one ship method says how many ("2 ship methods").

To take rows off, pick them the same way and press **d**, or use the **drop**
button above the table, which counts them too. The small **x** at the end of a
row takes off that one row. **clear (ctrl+d)** empties the list - all of it at
once, with no way back, so mind that one.

Opening a newer export keeps your list and reads every row's numbers from the
new export, so the cases and dates are never stale. Anything that isn't in the
new export any more - a trip that has shipped - drops off the list. Closing or
reloading the page empties it, like everything else here.

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

## The keys

- **Alt+S**, **Alt+I**, **Alt+B**, **Alt+H** - show the search, inspect,
  build or help tab. The tab's first letter, and they work even while you
  are typing in a bar.
- **b** - put the picked rows on the build list.
- **d** - take the picked rows off the build list.
- **Esc** - let go of the picked rows; again, empty the filter bar.
- **Ctrl+B** - on search, put every row the filters picked on the list; on
  inspect, put what the heading names on.
- **Ctrl+C** - on build, copy the list. (With something selected on the page
  it copies that instead, the way it normally would.)
- **Ctrl+D** - on build, empty the list.
- **Ctrl+S** - on search, save the table.
