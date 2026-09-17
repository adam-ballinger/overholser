// Writes sharable-ovh.html: ovh.html with ovh.js, HELP.md and the package.json version inside it, one
// file to send someone. Run it after changing any of them: node bundle.js
const fs = require('fs');
const path = require('path');
const read = file => fs.readFileSync(path.join(__dirname, file), 'utf8');

const SCRIPT = '<script src="ovh.js"></script>';
const BUNDLE = 'const BUNDLE = null;';
const page = read('ovh.html');
for (const marker of [SCRIPT, BUNDLE]) if (!page.includes(marker)) throw new Error(`ovh.html has no ${marker}`);

const js = read('ovh.js');
// What the page can't read from disk itself. "<" is escaped so nothing in the text can end the script tag early.
const bundle = JSON.stringify({ version: JSON.parse(read('package.json')).version, help: read('HELP.md') })
  .replaceAll('<', '\\u003c');
// Functions as replacements, so a "$" in the code is never read as a replace pattern.
fs.writeFileSync(path.join(__dirname, 'sharable-ovh.html'), page
  .replace(SCRIPT, () => `<script>\n${js}</script>`)
  .replace(BUNDLE, () => `const BUNDLE = ${bundle};`));
console.log('Wrote sharable-ovh.html');
