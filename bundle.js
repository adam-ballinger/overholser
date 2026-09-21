// Writes "index.html", the one file GitHub Pages serves: wave.html with wave.js, HELP.md and the
// package.json version inside it. Run it after changing any of them: node bundle.js
const fs = require('fs');
const path = require('path');
const read = file => fs.readFileSync(path.join(__dirname, file), 'utf8');

const SCRIPT = '<script src="wave.js"></script>';
const BUNDLE = 'const BUNDLE = null;';
const page = read('wave.html');
for (const marker of [SCRIPT, BUNDLE]) if (!page.includes(marker)) throw new Error(`wave.html has no ${marker}`);

const js = read('wave.js');
// What the page can't read from disk itself. "<" is escaped so nothing in the text can end the script tag early.
const { version } = JSON.parse(read('package.json'));
const bundle = JSON.stringify({ version, help: read('HELP.md') }).replaceAll('<', '\u003c');
// Functions as replacements, so a "$" in the code is never read as a replace pattern.
fs.writeFileSync(path.join(__dirname, 'index.html'), page
  .replace(SCRIPT, () => `<script>\n${js}</script>`)
  .replace(BUNDLE, () => `const BUNDLE = ${bundle};`));
console.log('Wrote index.html');
