#!/usr/bin/env node
const fs = require('fs');
const os = require('os');
const path = require('path');
const { parseArgs, styleText } = require('util');

// Splits CSV text into rows of fields. Handles "quoted, fields" and "" escapes.
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// The only columns we keep from the extract, in this order.
const COLUMNS = [
  'Sales Channel', 'Customer', 'Business', 'Ship To', 'Order Date', 'Promise Date',
  'Ship Date', 'Ship Date Category', 'Shipping Method', 'Shipping Category',
  'Order Number', 'PO Number', 'On Hold', 'Line Status', 'Item No.', 'Description',
  'Trip', 'Delivery', 'Ship and Cancel', 'Piece Qty', 'Cases', 'Dollars',
  'Make or Buy', 'Distribution Onhand', 'Open Orders',
];

const DATES = new Set(['Order Date', 'Promise Date', 'Ship Date']);
const NUMBERS = new Set(['Piece Qty', 'Cases', 'Dollars', 'Distribution Onhand', 'Open Orders']);

// "07/13/2026" -> Date, "$74,908.80" -> 74908.8, everything else stays text.
function convert(col, v) {
  if (DATES.has(col)) { const [m, d, y] = v.split('/'); return new Date(y, m - 1, d); }
  if (NUMBERS.has(col)) return Number(v.replace(/[$,]/g, ''));
  return v;
}

// "Item No." -> "itemNo", "PO Number" -> "poNumber", "Ship and Cancel" -> "shipAndCancel"
const toKey = col => col.replace(/\./g, '').split(' ')
  .map((w, i) => i ? w[0].toUpperCase() + w.slice(1) : w.toLowerCase()).join('');

const late = l => l.shipDateCategory.endsWith('Late');
const total = (lines, key) => lines.reduce((t, l) => t + l[key], 0);
const earliest = (lines, key) => new Date(Math.min(...lines.map(l => l[key])));

// The first non-blank value, with "+" added if the lines disagree.
function pick(values) {
  const distinct = [...new Set(values.filter(Boolean))];
  return (distinct[0] ?? '') + (distinct.length > 1 ? '+' : '');
}

// The value, or a count like "3 ship tos" when they differ. Blanks are ignored.
function variations(values, noun) {
  const distinct = [...new Set(values.filter(Boolean))];
  return distinct.length > 1 ? `${distinct.length} ${noun}` : distinct[0] ?? '';
}

// Home Depot ship tos are stores unless they say RDC: "HOME DEPOT USA INC 5023/TF - RDC DALLAS".
const isRdc = shipTo => shipTo.includes('RDC');
const count = (n, noun) => `${n} ${noun}${n === 1 ? '' : 's'}`;

// The row's ship to, or a count when they differ: "3 ship tos". All-Home Depot rows say which kind
// they are instead: "3 RDCs", "12 stores", "2 RDCs, 10 stores".
function shipTos(lines) {
  const distinct = [...new Set(lines.map(l => l.shipTo).filter(Boolean))];
  if (distinct.length <= 1) return distinct[0] ?? '';
  if (!lines.every(l => l.salesChannel.startsWith('HOME DEPOT'))) return count(distinct.length, 'ship to');
  const rdcs = distinct.filter(isRdc).length;
  return [rdcs && count(rdcs, 'RDC'), distinct.length - rdcs && count(distinct.length - rdcs, 'store')]
    .filter(Boolean).join(', ');
}

// One status for a group of lines (an order or a trip row), from the lines' statuses.
function orderStatus(lines) {
  const statuses = new Set(lines.map(l => l.lineStatus));
  if (statuses.has('Released')) return 'Released';
  if ([...statuses].every(s => s === 'Picked' || s === 'Ready')) return statuses.has('Picked') ? 'Picked' : 'Ready';
  return 'Holds';
}

// Shipping Category -> mode (the same as the middle of the ship method, e.g. "SAIA-LTL-Standard").
const MODES = { TRUCK: 'TL', LTL: 'LTL', PARCEL: 'Parcel' };

// Sales channels that get inventory first when order dates tie, in this order ("HOME DEPOT" also takes
// "HOME DEPOT.COM-OK"). All other channels come after them.
const PRIORITY_CHANNELS = ['HOME DEPOT', 'LOWES', 'ACE', 'MENARDS'];
const channelRank = l => {
  const i = PRIORITY_CHANNELS.findIndex(c => l.salesChannel.startsWith(c));
  return i < 0 ? PRIORITY_CHANNELS.length : i;
};

// Picked and Released lines are already being handled in the warehouse, so they take their stock first.
const MOVING = new Set(['Picked', 'Released']);
const moving = l => MOVING.has(l.lineStatus) ? 0 : 1;

// Sets each line's allocation to 'alloc' or 'short'. Per item, lines take pieces from Distribution Onhand:
// picked and released lines first, then oldest order date, then channel priority. Those moving lines are
// always alloc, even past what's on hand - the warehouse has their stock, which the export's onhand may no
// longer count - but they still use it up. Any other line that doesn't fit in what's left is short and takes
// nothing, so a later, smaller line can still be alloc.
function allocate(lines) {
  for (const ls of Map.groupBy(lines, l => l.itemNo).values()) {
    let left = ls[0].distributionOnhand;
    for (const l of ls.toSorted((a, b) =>
      moving(a) - moving(b) || a.orderDate - b.orderDate || channelRank(a) - channelRank(b))) {
      l.allocation = moving(l) === 0 || l.pieceQty <= left ? 'alloc' : 'short';
      if (l.allocation === 'alloc') left -= l.pieceQty;
    }
  }
}

// What every group of lines (an order or a trip row) gets computed.
const summarize = lines => ({
  lines,
  status: orderStatus(lines),
  // 'alloc' if no line is short, 'short' if every line is, 'split' if some are.
  allocation: lines.every(l => l.allocation === 'alloc') ? 'alloc'
    : lines.every(l => l.allocation === 'short') ? 'short' : 'split',
  // Line status counts, most lines first: "Picked 597, Ready 67, Released 24".
  lineStatuses: [...Map.groupBy(lines, l => l.lineStatus)].sort((a, b) => b[1].length - a[1].length)
    .map(([status, ls]) => `${status} ${ls.length}`).join(', '),
  shipDate: earliest(lines, 'shipDate'),
  late: lines.some(late),
  shipDateCategories: new Set(lines.map(l => l.shipDateCategory)), // e.g. "Today", "1-3 Days Late"
  modes: new Set(lines.map(l => MODES[l.shippingCategory]).filter(Boolean)), // e.g. "TL", "Parcel"
  // The items, biggest dollars first, and whether any line is a 144" item (the orders report tags those).
  itemNos: [...Map.groupBy(lines, l => l.itemNo)].map(([itemNo, ls]) => [itemNo, total(ls, 'dollars')])
    .sort((a, b) => b[1] - a[1]).map(([itemNo]) => itemNo),
  has144: lines.some(l => l.description.includes('144"')),
  pieces: total(lines, 'pieceQty'),
  cases: total(lines, 'cases'),
  dollars: total(lines, 'dollars'),
});

// For sorting summaries: soonest ship date first, then most dollars first.
const soonestFirst = (a, b) => a.shipDate - b.shipDate || b.dollars - a.dollars;

// Reads the CSV and does all grouping and computing once, so reports only filter, sort and format.
// Returns { lines, orders, trips, items }:
//   lines  - one object per order line, with just the COLUMNS above as camelCase properties, plus allocation
//   orders - Map of order number -> the order's summary, plus its order-level fields
//   trips  - the trip rows: lines on one trip, or one order's lines not on a trip. An order split
//            across two trips is in both, each with only its own lines.
//   items  - Map of item number -> the item's summary, plus its item-level fields
function loadOrders(file) {
  const [header, ...rows] = parseCsv(fs.readFileSync(file, 'utf8'));
  const idx = COLUMNS.map(c => {
    if (!header.includes(c)) throw new Error(`CSV is missing column: ${c}`);
    return header.indexOf(c);
  });
  const lines = rows.map(r => Object.fromEntries(COLUMNS.map((c, i) => [toKey(c), convert(c, r[idx[i]])])));
  allocate(lines);

  const orders = new Map([...Map.groupBy(lines, l => l.orderNumber)].map(([orderNumber, ls]) => [orderNumber, {
    ...summarize(ls),
    orderNumber,
    promiseDate: earliest(ls, 'promiseDate'),
    shippingMethod: pick(ls.map(l => l.shippingMethod)),
    shippingCategory: pick(ls.map(l => l.shippingCategory)),
    trip: pick(ls.map(l => l.trip)),
    delivery: pick(ls.map(l => l.delivery)),
  }]));

  const trips = [...Map.groupBy(lines, l => l.trip || `order ${l.orderNumber}`).values()].map(ls => ({
    ...summarize(ls),
    trip: ls[0].trip,
    // Soonest first, by each order's lines on this row.
    orderNumbers: [...Map.groupBy(ls, l => l.orderNumber).values()].map(summarize).sort(soonestFirst)
      .map(o => o.lines[0].orderNumber),
    shipTos: shipTos(ls),
    // Without the last part, for wide tables: "Fedex Express-Parcel-Ground" -> "Fedex Express-Parcel".
    shippingMethods: variations(ls.map(l => l.shippingMethod.replace(/-[^-]*$/, '')), 'ship methods'),
  }));

  const items = new Map([...Map.groupBy(lines, l => l.itemNo)].map(([itemNo, ls]) => [itemNo, {
    ...summarize(ls),
    itemNo,
    description: ls[0].description,
    makeOrBuy: ls[0].makeOrBuy,
    onhand: ls[0].distributionOnhand,
  }]));

  return { lines, orders, trips, items };
}

const HEIGHT = 50; // plan around a 200 x 50 console; one-page reports use the real console's rows when there is one
const WARNING_STATUSES = ['Holds', 'Awaiting', 'Booked', 'Entered']; // shown in warning colors
const money = n => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const mdy = d => d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
// Primary ids show in yellow; danger data white on red; warning data white on orange. Color is added after sizing,
// since color codes take up characters, and is skipped when output isn't a terminal.
const highlightId = (text, id) => text.replace(id, styleText('yellow', id));
const danger = text => styleText(['bgRed', 'white'], text);
// Orange isn't one of styleText's 16 basic colors, so this writes the 256-color code itself,
// but only when styleText would add color (so both schemes turn on and off together).
const warning = text => styleText('white', text) === text ? text : `\x1b[48;5;208m\x1b[37m${text}\x1b[39m\x1b[49m`;
const warnStatus = status => WARNING_STATUSES.includes(status) && warning;

// One table row: each column's text cut to its width and padded, 2 spaces apart.
// A column's color(item) returns danger, warning or nothing; a color covers the whole cell width.
const tableRow = (columns, textOf, item) => columns.map(c => {
  const text = String(textOf(c)).slice(0, c.width);
  const padded = c.right ? text.padStart(c.width) : text.padEnd(c.width);
  const color = item && c.color?.(item);
  return color ? color(padded) : padded;
}).join('  ').trimEnd();

// A table's headings row and dashes row.
const tableHeader = columns => [tableRow(columns, c => c.heading), tableRow(columns, c => '-'.repeat(c.width))];

// A table -> CSV text: the headings, then every row's values as the report shows them, but not cut to width.
const csvField = text => /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
const toCsv = (columns, rows) => [columns.map(c => c.heading), ...rows.map(r => columns.map(c => String(c.value(r))))]
  .map(fields => fields.map(csvField).join(',')).join('\n');

// Table rows cut to fit `room` page rows. If some don't fit, the last row counts them: "... 12 more lines not shown".
const fit = (rows, room, noun) => rows.length > room
  ? [...rows.slice(0, room - 1), `... ${rows.length - room + 1} more ${noun} not shown`] : rows;

// The orders report: one row per trip row (see loadOrders). Widths add up to 236, past the usual 200.
// Items, last, is as many of the row's items as fit (see itemsCell), tagged 144" (orange, added after sizing)
// when any of the row's lines is a 144" item. Allocation is red when short, orange when split.
// Line Statuses is orange when the row's own status (what --status filters on) is Holds.
const TAG144 = '144"';
const ITEMS_WIDTH = 34;

// As many of the row's items as fit, biggest dollars first, after the 144" tag, ending in "..." if any are left out.
function itemsCell(row, width) {
  const tag = row.has144 ? TAG144 + ' ' : '';
  let text = '';
  for (const [i, itemNo] of row.itemNos.entries()) {
    const more = text ? `${text} ${itemNo}` : itemNo;
    const last = i === row.itemNos.length - 1;
    if ((tag + more + (last ? '' : ' ...')).length > width) return (tag + text).trimEnd() + ' ...';
    text = more;
  }
  return tag + text;
}
const REPORT_COLUMNS = [
  { heading: 'Trip', width: 7, value: r => r.trip },
  // Three order numbers, then "..." if there are more; the Orders column counts them.
  { heading: 'Order Numbers', width: 30, value: r =>
    r.orderNumbers.slice(0, 3).join(' ') + (r.orderNumbers.length > 3 ? ' ...' : '') },
  { heading: 'Ship To', width: 40, value: r => r.shipTos },
  { heading: 'Ship Method', width: 26, value: r => r.shippingMethods },
  { heading: 'Ship Date', width: 10, value: r => mdy(r.shipDate), color: r => r.late && danger },
  { heading: 'Orders', width: 6, right: true, value: r => r.orderNumbers.length },
  { heading: 'Lines', width: 5, right: true, value: r => r.lines.length },
  { heading: 'Cases', width: 6, right: true, value: r => r.cases.toLocaleString() },
  { heading: 'Dollars', width: 11, right: true, value: r => money(r.dollars) },
  { heading: 'Alloc', width: 5, value: r => r.allocation,
    color: r => ({ short: danger, split: warning })[r.allocation] },
  { heading: 'Line Statuses', width: 34, value: r => r.lineStatuses, color: r => warnStatus(r.status) },
  { heading: 'Items', width: ITEMS_WIDTH, value: r => itemsCell(r, ITEMS_WIDTH) },
];

// The biggest rows by dollars that together make up `share` of their total: --dollars keeps the top 80%.
// Unlike the other filters this one compares rows against each other, so it runs after they pick the rows.
function topDollars(rows, share = 0.8) {
  const goal = total(rows, 'dollars') * share;
  const sorted = rows.toSorted((a, b) => b.dollars - a.dollars);
  let sum = 0, n = 0;
  while (n < sorted.length && sum < goal) sum += sorted[n++].dollars;
  return sorted.slice(0, n);
}

// Trip rows -> the orders page, at most `height` rows: totals over all the rows, then the rows, soonest ship date
// first, then most dollars. Rows that don't fit are counted, not shown, but still included in the totals.
function ordersPage(trips, height = HEIGHT) {
  const page = [
    `Orders  ${trips.length.toLocaleString()} rows: ${new Set(trips.flatMap(r => r.orderNumbers)).size.toLocaleString()} orders, ` +
      `${trips.reduce((t, r) => t + r.lines.length, 0).toLocaleString()} lines, ${total(trips, 'cases').toLocaleString()} cases, ${money(total(trips, 'dollars'))}`,
    '',
    ...tableHeader(REPORT_COLUMNS),
  ];
  const rows = trips.toSorted(soonestFirst).map(r => {
    const row = r.orderNumbers.slice(0, 3).reduce(highlightId, tableRow(REPORT_COLUMNS, c => c.value(r), r));
    return r.has144 ? row.replace(TAG144, warning(TAG144)) : row;
  });
  page.push(...fit(rows, Math.max(height - page.length, 1), 'rows'));
  return page.join('\n');
}

// The line table on an order page. total(order): its value in the totals row. color: see tableRow.
const LINE_COLUMNS = [
  { heading: 'Item', width: 13, value: l => l.itemNo, total: o => `${o.lines.length} lines` },
  { heading: 'Description', width: 40, value: l => l.description },
  { heading: 'Status', width: 8, value: l => l.lineStatus, color: l => warnStatus(l.lineStatus) },
  { heading: 'Trip', width: 7, value: l => l.trip },
  { heading: 'Delivery', width: 8, value: l => l.delivery },
  { heading: 'Make/Buy', width: 8, value: l => l.makeOrBuy },
  { heading: 'Cases', width: 6, right: true, value: l => l.cases.toLocaleString(), total: o => o.cases.toLocaleString() },
  { heading: 'Dollars', width: 11, right: true, value: l => money(l.dollars), total: o => money(o.dollars) },
  { heading: 'Pieces', width: 8, right: true, value: l => l.pieceQty.toLocaleString(), total: o => o.pieces.toLocaleString() },
  { heading: 'Allocation', width: 10, value: l => l.allocation, total: o => o.allocation, color: l => l.allocation === 'short' && danger },
];

// An order (from loadOrders) -> a page of text, at most 200 wide and `height` rows. Lines that don't fit are
// counted, not shown, but still included in the totals.
function orderPage(order, height = HEIGHT) {
  const { lines } = order;
  const first = lines[0]; // for fields that are the same on every line of an order
  // A label and value, 3 across = 198. A color (danger or warning) covers just the value text, not its padding.
  const cell = (label, value, color) => {
    const text = String(value).slice(0, 50);
    return label.padEnd(16) + (color ? color(text) : text) + ' '.repeat(50 - text.length);
  };
  const [headings, dashes] = tableHeader(LINE_COLUMNS);

  const page = [
    `Order ${order.orderNumber}`,
    '',
    ...[
      [['Customer', first.customer], ['Ship To', first.shipTo], ['Order Date', mdy(first.orderDate)]],
      [['Sales Channel', first.salesChannel], ['Ship Method', order.shippingMethod], ['Promise Date', mdy(order.promiseDate)]],
      [['Business', first.business], ['Ship Category', order.shippingCategory], ['Ship Date', `${mdy(order.shipDate)}  ${first.shipDateCategory}`, order.late && danger]],
      [['PO Number', first.poNumber], ['Trip', order.trip], ['On Hold', first.onHold]],
      [['Order Status', order.status, warnStatus(order.status)], ['Delivery', order.delivery], ['Ship and Cancel', first.shipAndCancel]],
    ].map(row => row.map(([label, value, color]) => cell(label, value, color)).join('').trimEnd()),
    '',
    headings,
    dashes,
  ];
  const room = Math.max(height - page.length - 2, 1); // 2 rows kept for the totals
  page.push(...fit(lines.map(l => tableRow(LINE_COLUMNS, c => c.value(l), l)), room, 'lines'));
  page.push(dashes, tableRow(LINE_COLUMNS, c => c.total?.(order) ?? ''));
  return highlightId(page.join('\n'), order.orderNumber);
}

// The item table on the shortages page: one row per item's short lines (a summary). Onhand and Ordered
// (all pieces) cover the whole item; the rest, including Ship Date (earliest), cover only the short lines.
const SHORTAGE_COLUMNS = [
  { heading: 'Item', width: 13, value: s => s.item.itemNo },
  { heading: 'Description', width: 40, value: s => s.item.description },
  { heading: 'Make/Buy', width: 8, value: s => s.item.makeOrBuy },
  { heading: 'Onhand', width: 8, right: true, value: s => s.item.onhand.toLocaleString() },
  { heading: 'Ordered', width: 8, right: true, value: s => s.item.pieces.toLocaleString() },
  { heading: 'Short Pcs', width: 9, right: true, value: s => s.pieces.toLocaleString() },
  { heading: 'Short Lines', width: 11, right: true, value: s => s.lines.length.toLocaleString() },
  { heading: 'Short Orders', width: 12, right: true, value: s => s.orders.toLocaleString() },
  { heading: 'Short Dollars', width: 13, right: true, value: s => money(s.dollars) },
  { heading: 'Ship Date', width: 10, value: s => mdy(s.shipDate), color: s => s.late && danger },
  { heading: 'Channels', width: 30, value: s => s.channels },
];

// The shortages page's rows: the matching short lines grouped by item (a summary each), most short dollars first.
const shortageItems = ({ lines, items }, filters = {}) =>
  [...Map.groupBy(lines.filter(l => l.allocation === 'short' && lineMatches(l, filters)), l => l.itemNo)]
    .map(([itemNo, ls]) => ({
      ...summarize(ls),
      item: items.get(itemNo),
      orders: new Set(ls.map(l => l.orderNumber)).size,
      channels: variations(ls.map(l => l.salesChannel), 'channels'),
    })).sort((a, b) => b.dollars - a.dollars);

// Everything from loadOrders -> a page of text summarizing shortages, at most `height` rows: counts, then items
// with short lines, most short dollars first. Items that don't fit are counted, not shown.
// filters: ship date flags and channel. Items and lines count only matching lines; orders and trips are the rows
// that match (see rowMatches), counted by their whole allocation, just as `ovh orders` would pick them.
function shortagesPage(data, filters = {}, height = HEIGHT) {
  const { lines, orders, trips } = data;
  const picked = lines.filter(l => lineMatches(l, filters));
  const shortLines = picked.filter(l => l.allocation === 'short');
  const shortItems = shortageItems(data, filters);
  const counts = groups => ['short', 'split', 'alloc']
    .map(a => `${groups.filter(g => g.allocation === a && rowMatches(g, filters)).length.toLocaleString()} ${a}`).join(', ');
  const page = [
    'Shortages',
    '',
    `Items   ${shortItems.length.toLocaleString()} of ${new Set(picked.map(l => l.itemNo)).size.toLocaleString()} have short lines`,
    `Lines   ${shortLines.length.toLocaleString()} short of ${picked.length.toLocaleString()}: ` +
      `${total(shortLines, 'pieceQty').toLocaleString()} pieces, ${money(total(shortLines, 'dollars'))}`,
    `Orders  ${counts([...orders.values()])}`,
    `Trips   ${counts(trips)}`,
    '',
    ...tableHeader(SHORTAGE_COLUMNS),
  ];
  page.push(...fit(shortItems.map(s => tableRow(SHORTAGE_COLUMNS, c => c.value(s), s)), Math.max(height - page.length, 1), 'items'));
  return page.join('\n');
}

// One row of the late report: a summary of the late lines of one sales channel (or of all of them).
const lateRow = (channel, ls) => ({
  ...summarize(ls),
  channel,
  orders: new Set(ls.map(l => l.orderNumber)).size,
  short: ls.filter(l => l.allocation === 'short').length,
  // How many lines are in each late category: { '9+ Days Late': 12, ... }.
  days: Object.fromEntries(LATE.map(c => [c, ls.filter(l => l.shipDateCategory === c).length])),
});

// The order sales channels are listed in (Adam's). Every one gets a row, even with nothing late.
const CHANNEL_ORDER = ['HOME DEPOT-OK', 'HOME DEPOT.COM-OK', 'LOWES-BR', 'LOWES-NO', 'LOWES-OK', 'MENARDS-OK',
  'ACE HDW-OK', 'ORGILL-OK', 'DISTRIBUTORS&FIELD SALES-OK', 'ECOMMERCE-OK'];

// The late report's rows: the channels above in that order, then any others in the export, most dollars first.
const lateChannels = ({ lines }) => {
  const byChannel = Map.groupBy(lines.filter(late), l => l.salesChannel);
  const others = [...byChannel].filter(([channel]) => !CHANNEL_ORDER.includes(channel))
    .map(([channel, ls]) => lateRow(channel, ls)).sort((a, b) => b.dollars - a.dollars);
  return [...CHANNEL_ORDER.map(channel => lateRow(channel, byChannel.get(channel) ?? [])), ...others];
};

// The late report's table. The day columns count lines; 9+ Days is red when there are any.
const LATE_COLUMNS = [
  { heading: 'Sales Channel', width: 28, value: r => r.channel },
  { heading: 'Orders', width: 7, right: true, value: r => r.orders.toLocaleString() },
  { heading: 'Lines', width: 7, right: true, value: r => r.lines.length.toLocaleString() },
  { heading: 'Cases', width: 8, right: true, value: r => r.cases.toLocaleString() },
  { heading: 'Dollars', width: 14, right: true, value: r => money(r.dollars) },
  { heading: '9+ Days', width: 8, right: true, value: r => r.days['9+ Days Late'].toLocaleString(),
    color: r => r.days['9+ Days Late'] > 0 && danger },
  { heading: '4-8 Days', width: 8, right: true, value: r => r.days['4-8 Days Late'].toLocaleString() },
  { heading: '1-3 Days', width: 8, right: true, value: r => r.days['1-3 Days Late'].toLocaleString() },
  { heading: 'Oldest Ship', width: 11, value: r => r.lines.length ? mdy(r.shipDate) : '' }, // blank when nothing is late
  { heading: 'Short Lines', width: 11, right: true, value: r => r.short.toLocaleString() },
];

// Everything from loadOrders -> a page of text: late lines by sales channel, most dollars first, then a row
// for all channels. Channels that don't fit are counted, not shown, but still in that row.
function latePage(data, height = HEIGHT) {
  const [headings, dashes] = tableHeader(LATE_COLUMNS);
  const page = ['Late orders by sales channel', '', headings, dashes];
  const rows = lateChannels(data);
  page.push(...fit(rows.map(r => tableRow(LATE_COLUMNS, c => c.value(r), r)), Math.max(height - page.length - 2, 1), 'channels'));
  const all = lateRow('All channels', data.lines.filter(late));
  page.push(dashes, tableRow(LATE_COLUMNS, c => c.value(all)));
  return page.join('\n');
}

// The most recently changed openorders*.csv in Downloads, e.g. "openordersextract (1).csv".
function newestExport() {
  const dir = path.join(os.homedir(), 'Downloads');
  const files = fs.readdirSync(dir).filter(f => /^openorders.*\.csv$/i.test(f)).map(f => path.join(dir, f));
  if (!files.length) throw new Error(`No openorders*.csv found in ${dir}`);
  return files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
}

// Name filters: [option name, line property]. Match any part of any line on the row, ignoring case
// ("depot" matches "HOME DEPOT.COM-OK").
const FILTERS = [
  ['channel', 'salesChannel'],
  ['customer', 'customer'],
  ['shipto', 'shipTo'],
];

// Short names for --channel: "thd" is the same as typing "HOME DEPOT-OK", so it skips HOME DEPOT.COM-OK.
const CHANNELS = { thd: 'HOME DEPOT-OK', fsd: 'DISTRIBUTORS&FIELD SALES-OK' };

// Ship date filters: flag -> the export's Ship Date Categories it takes, as of when the export was run.
const LATE = ['9+ Days Late', '4-8 Days Late', '1-3 Days Late'];
const DATE_FILTERS = {
  due: [...LATE, 'Today', 'Tomorrow'],
  late: LATE,
  '9plus': ['9+ Days Late'],
  '4to8': ['4-8 Days Late'],
  '1to3': ['1-3 Days Late'],
  today: ['Today'],
  tomorrow: ['Tomorrow'],
};

// Allocation filters: flag -> the row's allocation it takes.
const ALLOCATION_FILTERS = { alloc: 'alloc', split: 'split', short: 'short' };

// The Ship Date Categories the date flags given take, e.g. { today: true, tomorrow: true } -> ['Today', 'Tomorrow'].
const dateCategories = filters => Object.keys(DATE_FILTERS).filter(flag => filters[flag]).flatMap(flag => DATE_FILTERS[flag]);
// True if text contains part, ignoring case.
const contains = (text, part) => text.toUpperCase().includes(part.toUpperCase());
// What a name filter looks for, with --channel short names expanded: 'thd' -> 'HOME DEPOT-OK'.
const filterText = (name, filters) =>
  name === 'channel' && filters.channel ? CHANNELS[filters.channel.toLowerCase()] ?? filters.channel : filters[name];

// True if one line matches the name filters and ship date flags given, e.g. { channel: 'depot', today: true }.
function lineMatches(line, filters) {
  const categories = dateCategories(filters);
  return FILTERS.every(([name, key]) => {
    const want = filterText(name, filters);
    return !want || contains(line[key], want);
  }) && (!categories.length || categories.includes(line.shipDateCategory));
}

// True if a trip row matches every filter given, e.g. { channel: 'lowes', status: 'holds', today: true }.
// status: the row's status, exactly (ignoring case). Date flags stack: --today --tomorrow is either day;
// a row matches if any of its lines is in one of the flags' categories. Allocation flags stack the same way,
// on the row's allocation. 144: only rows with a 144" item. mode: a list, e.g. ['tl', 'ltl']; a row matches if
// any of its lines has one of them.
function rowMatches(row, filters) {
  const categories = dateCategories(filters);
  const allocations = Object.keys(ALLOCATION_FILTERS).filter(flag => filters[flag]).map(flag => ALLOCATION_FILTERS[flag]);
  return FILTERS.every(([name, key]) => {
    const want = filterText(name, filters);
    return !want || row.lines.some(l => contains(l[key], want));
  })
    && (!filters.status || row.status.toUpperCase() === filters.status.toUpperCase())
    && (!categories.length || categories.some(c => row.shipDateCategories.has(c)))
    && (!allocations.length || allocations.includes(row.allocation))
    && (!filters['144'] || row.has144)
    && (!filters.mode?.length || [...row.modes].some(m => filters.mode.some(want => want.toUpperCase() === m.toUpperCase())));
}

module.exports = { loadOrders, rowMatches, topDollars, ordersPage, orderPage, shortagesPage, shortageItems, latePage, lateChannels, toCsv };

const USAGE = `Usage: ovh orders [--due] [--late] [--9plus] [--4to8] [--1to3] [--today] [--tomorrow] [--alloc] [--split] [--short] [--144] [--dollars] [--status holds] [--mode tl] [--channel depot] [--customer "ace hdw"] [--shipto morrow] [--file file.csv] [--csv out.csv]
       ovh order 54013306 [--file file.csv] [--csv out.csv]
       ovh shortages [--due] [--late] [--today] [--tomorrow] [--channel depot] [--file file.csv] [--csv out.csv]
       ovh late [--file file.csv] [--csv out.csv]`;

// Every command takes these: the export to read, and where to write the report's whole table as CSV.
const FILES = { file: { type: 'string' }, csv: { type: 'string' } };

// The options each command accepts. Anything else is an error.
const COMMANDS = {
  orders: {
    ...Object.fromEntries(FILTERS.map(([name]) => [name, { type: 'string' }])),
    status: { type: 'string' },
    mode: { type: 'string', multiple: true },
    144: { type: 'boolean' }, // rows with a 144" item, the ones the report tags
    dollars: { type: 'boolean' }, // just the rows making up the top 80% of dollars
    ...Object.fromEntries([...Object.keys(DATE_FILTERS), ...Object.keys(ALLOCATION_FILTERS)].map(flag => [flag, { type: 'boolean' }])),
    ...FILES,
  },
  order: { ...FILES },
  shortages: {
    ...Object.fromEntries(['due', 'late', 'today', 'tomorrow'].map(flag => [flag, { type: 'boolean' }])),
    channel: { type: 'string' },
    ...FILES,
  },
  late: { ...FILES },
};

// ovh <command> [options]   ("ovh" is set up by package.json + npm link)
if (require.main === module) {
  const [command, ...args] = process.argv.slice(2);
  let opts, positionals;
  try {
    if (!Object.hasOwn(COMMANDS, command)) throw new Error(command ? `Unknown command '${command}'` : 'Missing command');
    // Only "order" takes a bare value: the order number.
    ({ values: opts, positionals } = parseArgs({ args, options: COMMANDS[command], allowPositionals: command === 'order' }));
    if (command === 'order' && positionals.length !== 1) throw new Error('Give exactly one order number');
    for (const mode of opts.mode ?? []) {
      if (!Object.values(MODES).some(m => m.toUpperCase() === mode.toUpperCase())) throw new Error(`Unknown mode '${mode}': use TL, LTL or Parcel`);
    }
  } catch (e) {
    console.error(`${e.message}\n${USAGE}`);
    process.exit(1);
  }
  const file = opts.file ?? newestExport();
  console.error(`Loading ${file}`);
  const data = loadOrders(file);
  // One-page reports. In a console, fill the screen: its rows less the "Loading" line above and the prompt below,
  // with blank rows after the page. Saved to a file: HEIGHT rows at most, no blank rows.
  const tty = process.stdout.isTTY;
  const height = tty ? process.stdout.rows - 2 - (opts.csv ? 1 : 0) : HEIGHT; // one row less for the "Wrote" line
  const printPage = page => console.log(tty ? page + '\n'.repeat(Math.max(height - page.split('\n').length, 0)) : page);
  // Print the page; --csv also writes the report's whole table to that file, and says so under the page.
  const output = (columns, rows, page) => {
    printPage(page());
    if (opts.csv) {
      fs.writeFileSync(opts.csv, toCsv(columns, rows));
      console.error(`Wrote ${rows.length} rows to ${opts.csv}`);
    }
  };
  if (command === 'order') {
    const order = data.orders.get(positionals[0]);
    if (order) output(LINE_COLUMNS, order.lines, () => orderPage(order, height));
    else { console.error(`Order ${positionals[0]} not found`); process.exitCode = 1; }
  } else if (command === 'shortages') output(SHORTAGE_COLUMNS, shortageItems(data, opts), () => shortagesPage(data, opts, height));
  else if (command === 'late') output(LATE_COLUMNS, lateChannels(data), () => latePage(data, height));
  else {
    let rows = data.trips.filter(r => rowMatches(r, opts));
    if (opts.dollars) rows = topDollars(rows);
    if (!rows.length) { console.error('No matching rows'); process.exitCode = 1; }
    else output(REPORT_COLUMNS, rows.toSorted(soonestFirst), () => ordersPage(rows, height));
  }
}
