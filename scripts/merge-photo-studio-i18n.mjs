import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

const enPath = path.join(root, 'src/locales/en.json');
const hiPath = path.join(root, 'src/locales/hi.json');

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const hi = JSON.parse(fs.readFileSync(hiPath, 'utf8'));

for (const name of ['photo-studio-ns1.json', 'photo-studio-ns2.json', 'photo-studio-ns3.json']) {
  const p = path.join(__dirname, name);
  if (!fs.existsSync(p)) continue;
  const chunk = JSON.parse(fs.readFileSync(p, 'utf8'));
  Object.assign(en, chunk.en);
  Object.assign(hi, chunk.hi);
}

fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n');
fs.writeFileSync(hiPath, JSON.stringify(hi, null, 2) + '\n');
console.log('Merged photo studio i18n chunks');
