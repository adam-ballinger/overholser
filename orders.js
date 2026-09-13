const fs = require('fs');
const os = require('os');
const path = require('path');
const { styleText } = require('util');

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

// Returns one object per order line with just the COLUMNS above, as camelCase properties.
function loadOrders(file) {
  const [header, ...rows] = parseCsv(fs.readFileSync(file, 'utf8'));
  const idx = COLUMNS.map(c => {
    if (!header.includes(c)) throw new Error(`CSV is missing column: ${c}`);
    return header.indexOf(c);
  });
  return rows.map(r => Object.fromEntries(COLUMNS.map((c, i) => [toKey(c), convert(c, r[idx[i]])])));
}

const WIDTH = 236; // terminal size at full screen, size 11 font
const HEIGHT = 65;
const STATUSES = ['Entered', 'Booked', 'Awaiting', 'Released', 'Picked', 'Ready'];
const money = n => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
const mdy = d => d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
// Primary ids show in yellow. Added after sizing, since color codes take up characters; skipped when output isn't a terminal.
const highlightId = (text, id) => text.replace(id, styleText('yellow', id));
const total = (lines, key) => lines.reduce((t, l) => t + l[key], 0);
const earliest = (lines, key) => new Date(Math.min(...lines.map(l => l[key])));

// The first non-blank value, with "+" added if the lines disagree.
function pick(values) {
  const distinct = [...new Set(values.filter(Boolean))];
  return (distinct[0] ?? '') + (distinct.length > 1 ? '+' : '');
}

// "Released 1, Picked 4, Ready 1", in STATUSES order.
function statusSummary(lines) {
  const counts = {};
  for (const l of lines) counts[l.lineStatus] = (counts[l.lineStatus] || 0) + 1;
  const rank = s => (STATUSES.indexOf(s) + 1) || 99;
  return Object.entries(counts).sort((a, b) => rank(a[0]) - rank(b[0]))
    .map(([s, n]) => `${s} ${n}`).join(', ');
}

// One order's lines -> a single line of text.
function summarizeOrder(lines) {
  return highlightId([
    lines[0].orderNumber,
    lines[0].shipTo.padEnd(40),
    pick(lines.map(l => l.shippingMethod)).padEnd(36),
    pick(lines.map(l => l.trip)).padEnd(8),
    mdy(earliest(lines, 'shipDate')),
    `${lines.length} ln`.padStart(6),
    `${total(lines, 'cases').toLocaleString()} cs`.padStart(8),
    money(total(lines, 'dollars')).padStart(11),
    statusSummary(lines),
  ].join('  ').slice(0, WIDTH), lines[0].orderNumber);
}

// The line table on an order page: [heading, width, value, right-aligned].
const LINE_COLUMNS = [
  ['Item', 13, l => l.itemNo],
  ['Description', 40, l => l.description],
  ['Status', 8, l => l.lineStatus],
  ['Trip', 7, l => l.trip],
  ['Delivery', 8, l => l.delivery],
  ['Make/Buy', 8, l => l.makeOrBuy],
  ['Pieces', 7, l => l.pieceQty.toLocaleString(), true],
  ['Cases', 6, l => l.cases.toLocaleString(), true],
  ['Dollars', 11, l => money(l.dollars), true],
  ['Dist Onhand', 11, l => l.distributionOnhand.toLocaleString(), true],
  ['Open Orders', 11, l => l.openOrders.toLocaleString(), true],
];

// One order's lines -> a page of text, at most WIDTH x HEIGHT. Lines that don't fit are counted, not shown.
function orderPage(lines) {
  const o = lines[0];
  const pickOf = key => pick(lines.map(l => l[key]));
  const cell = (label, value) => label.padEnd(17) + String(value).padEnd(61);
  const tableRow = cells => cells.map((v, i) => {
    const [, width, , right] = LINE_COLUMNS[i];
    return right ? v.padStart(width) : v.padEnd(width);
  }).join('  ').trimEnd();

  const page = [
    `Order ${o.orderNumber}    ${lines.length} lines    ${total(lines, 'cases').toLocaleString()} cases    ` +
      `${total(lines, 'pieceQty').toLocaleString()} pieces    ${money(total(lines, 'dollars'))}    ${statusSummary(lines)}`,
    '',
    ...[
      [['Customer', o.customer], ['Ship To', o.shipTo], ['Order Date', mdy(o.orderDate)]],
      [['Sales Channel', o.salesChannel], ['Ship Method', pickOf('shippingMethod')], ['Promise Date', mdy(earliest(lines, 'promiseDate'))]],
      [['Business', o.business], ['Ship Category', pickOf('shippingCategory')], ['Ship Date', `${mdy(earliest(lines, 'shipDate'))}  ${o.shipDateCategory}`]],
      [['PO Number', o.poNumber], ['Trip', pickOf('trip')], ['On Hold', o.onHold]],
      [['', ''], ['Delivery', pickOf('delivery')], ['Ship and Cancel', o.shipAndCancel]],
    ].map(row => row.map(([label, value]) => cell(label, value)).join('').trimEnd()),
    '',
    tableRow(LINE_COLUMNS.map(c => c[0])),
    tableRow(LINE_COLUMNS.map(c => '-'.repeat(c[1]))),
  ];
  const room = HEIGHT - page.length;
  const shown = lines.length > room ? lines.slice(0, room - 1) : lines;
  page.push(...shown.map(l => tableRow(LINE_COLUMNS.map(c => c[2](l)))));
  if (shown.length < lines.length) page.push(`... ${lines.length - shown.length} more lines not shown`);
  return highlightId(page.map(r => r.slice(0, WIDTH)).join('\n'), o.orderNumber);
}

// The most recently changed openorders*.csv in Downloads, e.g. "openordersextract (1).csv".
function newestExport() {
  const dir = path.join(os.homedir(), 'Downloads');
  const files = fs.readdirSync(dir).filter(f => /^openorders.*\.csv$/i.test(f)).map(f => path.join(dir, f));
  if (!files.length) throw new Error(`No openorders*.csv found in ${dir}`);
  return files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
}

module.exports = { loadOrders, summarizeOrder, orderPage };

// node orders.js [orderNumber] [file.csv]
if (require.main === module) {
  const args = process.argv.slice(2);
  const isOrderNo = a => /^\d+$/.test(a);
  const orderNo = args.find(isOrderNo);
  const file = args.find(a => !isOrderNo(a)) ?? newestExport();
  console.error(`Loading ${file}`);
  const byOrder = Map.groupBy(loadOrders(file), l => l.orderNumber);
  if (!orderNo) for (const lines of byOrder.values()) console.log(summarizeOrder(lines));
  else if (byOrder.has(orderNo)) console.log(orderPage(byOrder.get(orderNo)));
  else { console.error(`Order ${orderNo} not found`); process.exitCode = 1; }
}
