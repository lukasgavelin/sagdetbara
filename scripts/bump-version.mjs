import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const swPath = join(__dirname, '../sw.js');
const pkgPath = join(__dirname, '../package.json');

const swContent = readFileSync(swPath, 'utf-8');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

const currentMatch = swContent.match(/const CACHE_NAME = 'sag-det-bara-v(\d+)';/);
if (!currentMatch) {
  console.error('Kunde inte hitta CACHE_NAME i sw.js');
  process.exit(1);
}

const currentVersion = parseInt(currentMatch[1], 10);
const nextVersion = currentVersion + 1;
const updatedSw = swContent.replace(
  /const CACHE_NAME = 'sag-det-bara-v\d+';/,
  `const CACHE_NAME = 'sag-det-bara-v${nextVersion}';`
);

writeFileSync(swPath, updatedSw, 'utf-8');
console.log(`Bumpade Service Worker cache till sag-det-bara-v${nextVersion}!`);
