// Rebuilds the generated README sections from public sources. A section whose source fails keeps its last content.
import { readFile, writeFile } from 'node:fs/promises';
import { API, INDEX, replaceSection, catalogSection, storesSection, curatedSection } from './lib.mjs';

const root = new URL('../', import.meta.url);
const getJSON = async url => { const r = await fetch(url, { headers: { 'user-agent': 'awesome-web-games-sync' }, signal: AbortSignal.timeout(20000) }); if (!r.ok) throw Error(`${url} ${r.status}`); return r.json(); };

async function catalogApps() {
  const apps = [];
  for (let offset = 0; offset < 5000; offset += 100) {
    const page = await getJSON(`${API}?category=game&limit=100&offset=${offset}`);
    apps.push(...page.apps); if (apps.length >= page.total || !page.apps.length) break;
  }
  return apps;
}

let readme = await readFile(new URL('README.md', root), 'utf8');
const sections = [
  ['catalog', async () => catalogSection(await catalogApps())],
  ['stores', async () => storesSection(await getJSON(INDEX))],
  ['curated', async () => curatedSection(JSON.parse(await readFile(new URL('curated.json', root), 'utf8')))],
];
for (const [name, build] of sections) {
  try { readme = replaceSection(readme, name, await build()); console.log(`${name}: updated`); }
  catch (e) { console.warn(`${name}: kept previous content (${e.message})`); }
}
await writeFile(new URL('README.md', root), readme);
