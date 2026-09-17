# ovh help

ovh shows the open orders export as a report you can filter, check and copy
into an email. This is an early test version: if something is confusing, wrong
or missing, tell whoever sent you this file.

## Getting started

- Open this file in a web browser, like Chrome or Edge. Nothing to install.
- Click **Open CSV** and pick the open orders export (a `.csv` file) from the
  office system.
- A bar next to the button shows it loading; a big export takes a few
  seconds, most of it on "sorting orders".
- The report appears. Narrow it down with the filters: see **Filtering**,
  next.
- To start over with a newer export, click **Open CSV** again.

Your export stays on your computer. Nothing is uploaded or saved anywhere:
close or reload the page and it's gone.

## Filtering

Type filters in the bar at the top and press Enter, or click the buttons under
it. Clicking a button again takes it back off. To start over, click
**clear (esc)** at the right of the bar, or press **Esc** while you're typing
in it: the bar empties and everything shows again. It only appears when
there's something to clear.

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

## Looking at one trip

The **trip** tab shows everything about one trip. Click any trip or order
number on the page - in the report, or in a trip's own list of orders - or
type a trip or order number in the trip tab's bar and press Enter.

Looking up an order shows the trip it's on, headed "Order 54001840 on Trip
7989649"; click that trip number to see the whole trip. An order split across
trips shows each of its trips, one under the other, so you can see both.

On top: what the trip adds up to, then its ship method, ship date, ship to,
status, allocation, short lines, orders on hold and sales channels. Under that
are two tables:
- **Orders** - each order on the trip with its PO, delivery, customer, ship
  to, ship date, whether it's on hold, allocation and totals.
- **Items** - each item on the trip with its description, how many orders and
  pieces want it, the warehouse's onhand, allocation and totals. Short and
  split items come first, so what's missing is at the top. A cyan `flr-mtl` or
  orange `144"` tag starts the description of an item that is one (see
  **Colors**).

On a phone some columns are hidden.

**Copy for wave**, at the right of the trip's heading, copies that trip as one
row for the wave sheet. **Ctrl+Enter** does the same without reaching for the
mouse, so you can type a trip number, press Enter to see it, then Ctrl+Enter to
copy it. The row is: trip, its order numbers separated by commas, two blank
cells, customer, ship method, ship date and cases. Paste it in with
**Ctrl+V**; each value lands in its own cell, and the order numbers stay as
they are instead of turning into one long number. A trip going to more than one
customer lists them all; more than one ship method says how many ("2 ship
methods"). Looking up an order that's on two trips gives you a button for
each; Ctrl+Enter takes the first, so click the other one's button.

## Colors

- **Red date** - the row is late.
- **Red Alloc** - `short`: none of the row's lines have stock.
- **Orange Alloc** - `split`: some lines have stock and some don't.
- **Orange Line Statuses** - the row is on hold: none of its lines are
  Released, and at least one is still Entered, Booked or Awaiting.
- **Orange 144"** at the start of Items - the row holds a 144" item.
- **Cyan flr-mtl** at the start of Items - the row has a Home Depot line for a
  Flooring item (see `--flr-mtl`). In the trip tab both tags start the item's
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

## Copying into an email

Click **Copy table**, just above the table, then paste into your email with
**Ctrl+V**. The whole table comes along,
colors included - every row your filters picked and every column, even ones
hidden on a small screen. Each cell stays on one line, and Items shows the
row's biggest few items, then `…` if there are more.

If the colors and font don't come along:
- Use **Ctrl+V**, not Ctrl+Shift+V: that one pastes plain text. Outlook in a
  browser says it "can't access the clipboard" if you use its Paste button or
  right-click Paste, and points you to both keys; Ctrl+V is the one you want.
- Check the email isn't set to plain text. In Outlook on the web: **Options**,
  then **Switch to HTML** if you see it.

Pasting into a spreadsheet works too: each value lands in its own cell.

**Save table** saves the same table as a file in your Downloads, named with
the date and your filters, like `2026-09-16 ovh --late --thd.html`, and headed
with the filters, the export's name and the counts. Open it in your browser,
or attach it to an email.
