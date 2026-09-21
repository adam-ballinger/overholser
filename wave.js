// The rules behind wave.html: loading an open orders export, allocating stock, building the report rows and
// their columns, and the filters. wave.html loads this as a plain script and uses the names below directly.

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

// The value, or a count like "3 ship tos" when they differ. Blanks are ignored.
function variations(values, noun) {
  const distinct = [...new Set(values.filter(Boolean))];
  return distinct.length > 1 ? `${distinct.length} ${noun}` : distinct[0] ?? '';
}

// The row's ship methods, each without its last part, for wide tables and the wave sheet:
// "Fedex Express-Parcel-Ground" -> "Fedex Express-Parcel".
const shipMethods = lines => variations(lines.map(l => l.shippingMethod.replace(/-[^-]*$/, '')), 'ship methods');

// Home Depot ship tos are stores unless they say RDC: "HOME DEPOT USA INC 5023/TF - RDC DALLAS".
const isRdc = shipTo => shipTo.includes('RDC');
const count = (n, noun) => `${n.toLocaleString()} ${noun}${n === 1 ? '' : 's'}`;

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

// One status for a group of lines (a report row, or one of its orders), from the lines' statuses.
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

// TEMPORARY: Home Depot's Flooring items, from "2026-09-12 Home Depot Item Category Master Reference.xlsx"
// (Downloads). A HOME DEPOT-OK line with one of them makes its row "flr-mtl": tagged in Items, picked by --flr-mtl.
// To take the feature out, delete this, flrMtl below, its ITEM_TAGS entry, and flr-mtl in rowMatches/OTHER_FLAGS.
const FLR_MTL_ITEMS = new Set(`
  31351 31352 31354 31356 31373 31380 31382 31396 31397 31398 31399 31400 31970 31975 31978 31979 31981 31982
  31984 43311 43361 43364 43366 43373 43376 43378 43380 43381 43382 43383 43385 43872 43934 43975 43976 65110
  66120 66121 66123 66126 66127 66128 66132 66133 66136 66137 66139 66149 66150 66159 66188 66189 66191 66200
  66201 66202 66203 66210 66269 66270 66271 66273 66274 66275 66276 66277 66278 66279 66280 66281 66282 66283
  66284 66285 66286 66287 66288 66289 66290 66291 66292 66293 66294 73792 73826 78014 84202 85092 85357 85365
  85415 85423 85605 85613 85621 85639 95600 95601 95602 95603 95604 95605 95606 95607`.trim().split(/\s+/));
const isFlrMtl = l => l.salesChannel === 'HOME DEPOT-OK' && FLR_MTL_ITEMS.has(l.itemNo);

// What every group of lines (a report row, or one of its orders) gets computed.
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
  // Whether any line is a 144" item (the report tags those).
  has144: lines.some(l => l.description.includes('144"')),
  flrMtl: lines.some(isFlrMtl), // TEMPORARY, see FLR_MTL_ITEMS
  cases: total(lines, 'cases'),
  dollars: total(lines, 'dollars'),
});

// For sorting rows: soonest ship date first, then most dollars first.
const soonestFirst = (a, b) => a.shipDate - b.shipDate || b.dollars - a.dollars;

// A row's orders, each with just its lines on the row, soonest first: the inspect tab's Orders table.
const rowOrders = lines => [...Map.groupBy(lines, l => l.orderNumber).values()].map(ls => ({
  ...summarize(ls),
  orderNumber: ls[0].orderNumber,
  poNumber: ls[0].poNumber,
  customer: ls[0].customer,
  shipTo: ls[0].shipTo,
  deliveries: variations(ls.map(l => l.delivery), 'deliveries'),
  onHold: ls.some(l => l.onHold === 'OnHold'),
})).sort(soonestFirst);

// A row's items, biggest dollars first: the inspect tab's Items table. onhand is Distribution Onhand, the same on
// every line of an item.
const rowItems = lines => [...Map.groupBy(lines, l => l.itemNo).values()].map(ls => ({
  ...summarize(ls),
  itemNo: ls[0].itemNo,
  description: ls[0].description,
  orders: new Set(ls.map(l => l.orderNumber)).size,
  pieces: total(ls, 'pieceQty'),
  onhand: ls[0].distributionOnhand,
})).sort((a, b) => b.dollars - a.dollars);

// Takes the CSV text and returns the report rows, all grouping and computing done once, so the page only filters,
// sorts and formats. A row is the lines on one trip, or one order's lines not on a trip: an order split across two
// trips is on both, each with only its own lines. Each line is the COLUMNS above as camelCase properties, plus
// its allocation.
// A report row out of any run of lines: a whole trip at load, or the one order of it that was looked up or
// put on the build list. Everything the report, the inspect tab and waveLine read off a row.
const makeRow = ls => {
  const orders = rowOrders(ls), items = rowItems(ls);
  return {
    ...summarize(ls),
    trip: ls[0].trip,
    orders,
    orderNumbers: orders.map(o => o.orderNumber),
    items,
    itemNos: items.map(i => i.itemNo),
    shipTos: shipTos(ls),
    shippingMethods: shipMethods(ls),
  };
};

function loadOrders(text) {
  const [header, ...rows] = parseCsv(text);
  const idx = COLUMNS.map(c => {
    if (!header.includes(c)) throw new Error(`CSV is missing column: ${c}`);
    return header.indexOf(c);
  });
  const lines = rows.map(r => Object.fromEntries(COLUMNS.map((c, i) => [toKey(c), convert(c, r[idx[i]])])));
  allocate(lines);

  return [...Map.groupBy(lines, l => l.trip || `order ${l.orderNumber}`).values()].map(makeRow);
}

const money = n => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const mdy = d => d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
// Statuses that show in the warning color.
const WARNING_STATUSES = ['Holds', 'Awaiting', 'Booked', 'Entered'];
const warnStatus = status => WARNING_STATUSES.includes(status) && 'warning';

// The report's columns. width: in characters, the page's share for the column (see wave.html). color(row): the
// color class for the cell, if any: 'danger' (red), 'warning' (orange). Allocation is red when short, orange when
// split; Line Statuses is orange when the row's own status (what --holds and the other status flags filter on)
// is Holds. Items, last, is as many of the row's items as fit (see itemsCell), after its tags: 144" (orange)
// when any of the row's lines is a 144" item, flr-mtl (cyan, 'cyan') when the row is flrMtl.
const TAG144 = '144"';
const ITEMS_WIDTH = 34;
// The tags that can start an Items cell, in order: [text, the row property that turns it on, its color class].
const ITEM_TAGS = [[TAG144, 'has144', 'warning'], ['flr-mtl', 'flrMtl', 'cyan']];
// The tags a row (or one of its items) starts its cell with, each followed by a space. A column with tags: true
// puts them in front of its value and the page colors them (see td in wave.html).
const itemTags = row => ITEM_TAGS.filter(([, key]) => row[key]).map(([text]) => text + ' ').join('');

// As many of the row's items as fit, biggest dollars first, after its tags, ending in "..." if any are left out.
function itemsCell(row, width) {
  const tag = itemTags(row);
  let text = '';
  for (const [i, itemNo] of row.itemNos.entries()) {
    const more = text ? `${text} ${itemNo}` : itemNo;
    const last = i === row.itemNos.length - 1;
    if ((tag + more + (last ? '' : ' ...')).length > width) return (tag + text).trimEnd() + ' ...';
    text = more;
  }
  return tag + text;
}
// Columns the report and the inspect tab's tables share.
const ALLOC_COLUMN = { heading: 'Alloc', width: 5, value: r => r.allocation,
  color: r => ({ short: 'danger', split: 'warning' })[r.allocation] };
const TOTAL_COLUMNS = [
  { heading: 'Lines', width: 5, right: true, value: r => r.lines.length },
  { heading: 'Cases', width: 6, right: true, value: r => r.cases.toLocaleString() },
  { heading: 'Dollars', width: 11, right: true, value: r => money(r.dollars) },
];
const STATUSES_COLUMN = { heading: 'Line Statuses', width: 34, value: r => r.lineStatuses, color: r => warnStatus(r.status) };
const SHIP_DATE_COLUMN = { heading: 'Ship Date', width: 10, value: r => mdy(r.shipDate), color: r => r.late && 'danger' };

// id: shown in the order number color. find: the numbers in the cell the page links to the inspect tab, where
// they're looked up (see td in wave.html); every trip and order number the page shows is one.
const REPORT_COLUMNS = [
  { heading: 'Trip', width: 7, find: r => [r.trip], value: r => r.trip },
  // Three order numbers, then "..." if there are more; the Orders column counts them.
  { heading: 'Order Numbers', width: 30, id: true, find: r => r.orderNumbers, value: r =>
    r.orderNumbers.slice(0, 3).join(' ') + (r.orderNumbers.length > 3 ? ' ...' : '') },
  { heading: 'Ship To', width: 40, value: r => r.shipTos },
  { heading: 'Ship Method', width: 26, value: r => r.shippingMethods },
  SHIP_DATE_COLUMN,
  { heading: 'Orders', width: 6, right: true, value: r => r.orderNumbers.length },
  ...TOTAL_COLUMNS,
  ALLOC_COLUMN,
  STATUSES_COLUMN,
  { heading: 'Items', width: ITEMS_WIDTH, tags: true, value: r => itemsCell(r, ITEMS_WIDTH) },
];

// The inspect tab's tables: one row per order on the trip, and one per item. Hold is the order's On Hold flag.
const TRIP_ORDER_COLUMNS = [
  { heading: 'Order', width: 9, id: true, find: o => [o.orderNumber], value: o => o.orderNumber },
  { heading: 'PO', width: 11, value: o => o.poNumber },
  { heading: 'Delivery', width: 11, value: o => o.deliveries },
  { heading: 'Customer', width: 24, value: o => o.customer },
  { heading: 'Ship To', width: 40, value: o => o.shipTo },
  SHIP_DATE_COLUMN,
  { heading: 'Hold', width: 4, value: o => o.onHold ? 'yes' : '', color: o => o.onHold && 'warning' },
  ALLOC_COLUMN,
  ...TOTAL_COLUMNS,
  STATUSES_COLUMN,
];
const TRIP_ITEM_COLUMNS = [
  { heading: 'Item', width: 13, value: i => i.itemNo },
  // The item's own tags start the cell, the way they start the report's Items: flr-mtl if it's one of Home
  // Depot's Flooring items on a HOME DEPOT-OK line, 144" if it is a 144" item.
  { heading: 'Description', width: 40, tags: true, value: i => itemTags(i) + i.description },
  { heading: 'Orders', width: 6, right: true, value: i => i.orders },
  { heading: 'Pieces', width: 7, right: true, value: i => i.pieces.toLocaleString() },
  { heading: 'Onhand', width: 8, right: true, value: i => i.onhand.toLocaleString() },
  ALLOC_COLUMN,
  ...TOTAL_COLUMNS,
  STATUSES_COLUMN,
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

// The report's counts line, over every row it covers.
const ordersTotals = rows =>
  `${rows.length.toLocaleString()} rows: ${new Set(rows.flatMap(r => r.orderNumbers)).size.toLocaleString()} orders, ` +
  `${rows.reduce((t, r) => t + r.lines.length, 0).toLocaleString()} lines, ${total(rows, 'cases').toLocaleString()} cases, ${money(total(rows, 'dollars'))}`;

// A row's customers, each named once, the way its order numbers are: a count would lose them.
const customers = r => [...new Set(r.lines.map(l => l.customer).filter(Boolean))].join(', ');

// One row of a report row for the wave sheet, tab separated, eight cells: trip, its order numbers, two the
// sheet fills in itself, customer, ship method, ship date, cases. Customers are listed like the order numbers,
// so none are lost; ship method says how many when the trip has more than one, the way the report does; the
// ship date is the trip's earliest, as in the report.
// The lists have a space after the comma because Excel reads a pasted cell as if it were typed: "54055633,54055634"
// is one huge number to it (the comma is its thousands separator), while the space makes the cell plain text.
const waveLine = r => [
  r.trip,
  r.orderNumbers.join(', '),
  '',
  '',
  customers(r),
  r.shippingMethods,
  mdy(r.shipDate),
  r.cases,
].join('\t');

// The build list holds what was added rather than the rows themselves: a new export makes new rows, so every
// entry is looked up again each time the list is drawn. An entry is { trip, order }, order being '' for a whole
// trip or the one order of it that was added. Gone from this export: undefined, and the list drops it.
function buildRow(entry, data) {
  const row = data.find(r => r.trip === entry.trip && (entry.trip || r.orderNumbers.includes(entry.order)));
  if (!row) return;
  if (!entry.order) return row;
  const order = row.orders.find(o => o.orderNumber === entry.order);
  return order && makeRow(order.lines);
}

// The build table's columns: the wave sheet's eight cells less the two blanks it fills in itself, in its order,
// so the table reads the way what you paste will. These and waveLine have to stay in step.
const BUILD_COLUMNS = [
  { heading: 'Trip', width: 7, find: r => [r.trip], value: r => r.trip },
  { heading: 'Order Numbers', width: 30, id: true, find: r => r.orderNumbers, value: r => r.orderNumbers.join(' ') },
  { heading: 'Customer', width: 24, value: customers },
  { heading: 'Ship Method', width: 26, value: r => r.shippingMethods },
  SHIP_DATE_COLUMN,
  { heading: 'Cases', width: 6, right: true, value: r => r.cases.toLocaleString() },
];

// Name filters: [flag, line property, match]. The only filters that take a value: a row matches if any of its
// lines does. Names match any part, ignoring case ("ace hdw" matches "ACE HDW-OK #1234"); order, trip and
// delivery numbers match exactly, so 1234 doesn't pick 51234.
const same = (number, want) => number === want;
const FILTERS = [
  ['customer', 'customer'],
  ['shipto', 'shipTo'],
  ['order', 'orderNumber', same],
  ['trip', 'trip', same],
  ['delivery', 'delivery', same],
  ['item', 'itemNo', same],
];

// The plain flags that aren't tags (see rowMatches and, for dollars, topDollars).
const OTHER_FLAGS = ['144', 'flr-mtl', 'dollars'];

const LATE = ['9+ Days Late', '4-8 Days Late', '1-3 Days Late'];

// The consumer sales channels (Adam's list, in his order): what --consumer picks.
const CONSUMER_CHANNELS = ['HOME DEPOT-OK', 'HOME DEPOT.COM-OK', 'LOWES-BR', 'LOWES-NO', 'LOWES-OK', 'MENARDS-OK',
  'ACE HDW-OK', 'ORGILL-OK', 'DISTRIBUTORS&FIELD SALES-OK', 'ECOMMERCE-OK'];

// Tag filters: flags that take no value, in groups. flags: flag -> what it picks. Flags in a group stack
// (--today --tomorrow is either day); different groups must all match. A group tests either lines (line: a row
// matches if any of its lines does) or whole rows (row).
const TAGS = {
  // The export's Ship Date Category, as of when it was run.
  date: {
    flags: {
      due: [...LATE, 'Today', 'Tomorrow'],
      late: LATE,
      '9plus': ['9+ Days Late'],
      '4to8': ['4-8 Days Late'],
      '1to3': ['1-3 Days Late'],
      today: ['Today'],
      tomorrow: ['Tomorrow'],
      future: ['Future'],
    },
    line: (l, categories) => categories.includes(l.shipDateCategory),
  },
  // Only the ten consumer sales channels, exactly. A group of its own, so it narrows the channel flags instead of
  // adding to them: --consumer --thd is just Home Depot.
  consumer: {
    flags: { consumer: CONSUMER_CHANNELS },
    line: (l, channels) => channels.includes(l.salesChannel),
  },
  // What the Sales Channel starts with: --thd is HOME DEPOT-OK only, --lowes is any LOWES-. Other channels
  // (UNKNOWN-OK, CHEMICAL-OK and the like) have no flag of their own.
  channel: {
    flags: {
      thd: 'HOME DEPOT-OK',
      '.com': 'HOME DEPOT.COM-OK',
      lowes: 'LOWES',
      menards: 'MENARDS-OK',
      ace: 'ACE HDW-OK',
      orgill: 'ORGILL-OK',
      fsd: 'DISTRIBUTORS&FIELD SALES-OK',
      ecom: 'ECOMMERCE-OK',
    },
    line: (l, channel) => l.salesChannel.startsWith(channel),
  },
  allocation: {
    flags: { alloc: 'alloc', split: 'split', short: 'short' },
    row: (r, allocation) => r.allocation === allocation,
  },
  // The row's status (see orderStatus).
  status: {
    flags: { released: 'Released', ready: 'Ready', picked: 'Picked', holds: 'Holds' },
    row: (r, status) => r.status === status,
  },
  // From Shipping Category; a line with none has no mode.
  mode: {
    flags: Object.fromEntries(Object.values(MODES).map(mode => [mode.toLowerCase(), mode])), // tl: 'TL', ...
    line: (l, mode) => MODES[l.shippingCategory] === mode,
  },
};

// A name filter's values. Giving the flag twice and a comma list both stack: --shipto a --shipto b is --shipto a,b.
const list = v => (v ?? []).flatMap(one => one.split(',')).map(one => one.trim()).filter(Boolean);
// True if text contains part, ignoring case.
const contains = (text, part) => text.toUpperCase().includes(part.toUpperCase());
// The tag groups given, each with what its flags picked: { today: true, lowes: true } -> [[date, [['Today']]], [channel, ['LOWES']]].
const tagsGiven = filters => Object.values(TAGS)
  .map(group => [group, Object.keys(group.flags).filter(flag => filters[flag]).map(flag => group.flags[flag])])
  .filter(([, picked]) => picked.length);

// True if the lines match every name filter and line tag group given, each by at least one line (not always the
// same one), e.g. { customer: ['ace'], today: true }.
const linesMatch = (lines, filters) =>
  FILTERS.every(([name, key, match = contains]) => {
    const wants = list(filters[name]);
    return !wants.length || lines.some(l => wants.some(want => match(l[key], want)));
  })
  && tagsGiven(filters).every(([group, picked]) => !group.line || lines.some(l => picked.some(p => group.line(l, p))));

// True if a report row matches every filter given, e.g. { lowes: true, holds: true, today: true }: the name and
// line filters by any of its lines, the row tags by the row itself. 144: only rows with a 144" item.
// flr-mtl (TEMPORARY): only flrMtl rows.
const rowMatches = (row, filters) => linesMatch(row.lines, filters)
  && tagsGiven(filters).every(([group, picked]) => !group.row || picked.some(p => group.row(row, p)))
  && (!filters['144'] || row.has144)
  && (!filters['flr-mtl'] || row.flrMtl);
