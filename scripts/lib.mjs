// Pure helpers shared by the README builder and the GitHub bots. No dependencies.
export const API = process.env.APPSIDE_API || 'https://app.appside.build/api/catalog/apps';
export const INDEX = process.env.APPSIDE_INDEX || 'https://appside.build/index/index.json';
export const UTM = 'utm_source=github&utm_medium=awesome-web-games';
export const PLATFORMS = ['web', 'ios', 'android', 'windows', 'macos', 'linux'];

// Markdown-safe single line: no brackets, pipes, backticks, HTML or line breaks.
export const clean = (v, max = 300) => String(v ?? '').replace(/[\r\n\t]+/g, ' ').replace(/[\[\]`|<>*_\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
export const safeUrl = v => { try { const u = new URL(String(v)); return u.protocol === 'https:' && !u.username && !u.password ? u.href.replace(/[()\s]/g, encodeURIComponent) : null; } catch { return null; } };
const host = u => new URL(u).hostname.replace(/^www\./, '');
const withUtm = u => u + (u.includes('?') ? '&' : '?') + UTM;

export function replaceSection(readme, name, body) {
  const start = `<!-- ${name}:start -->`, end = `<!-- ${name}:end -->`;
  const i = readme.indexOf(start), j = readme.indexOf(end);
  if (i < 0 || j < i) throw Error(`Missing ${name} markers`);
  return readme.slice(0, i + start.length) + '\n' + body.trim() + '\n' + readme.slice(j);
}

export function catalogSection(apps) {
  const games = apps.filter(a => a.category === 'game' && a.status === 'verified' && safeUrl(a.url)).sort((a, b) => a.name.localeCompare(b.name));
  if (!games.length) return '_No verified games yet. [Add yours](#add-your-game): it takes one tool call for a coding agent._';
  return games.map(a => {
    const page = safeUrl(a.url), links = [];
    if (a.webBuildUrl && safeUrl(a.webBuildUrl)) links.push(`[Play in browser](${withUtm(page)}&play=1)`);
    if (safeUrl(a.siteUrl)) links.push(`[Website](${safeUrl(a.siteUrl)})`);
    if (safeUrl(a.appStoreUrl)) links.push(`[App Store](${safeUrl(a.appStoreUrl)})`);
    if (safeUrl(a.playStoreUrl)) links.push(`[Google Play](${safeUrl(a.playStoreUrl)})`);
    const platforms = (a.platforms || []).filter(p => PLATFORMS.includes(p)).join(', ');
    return `- [${clean(a.name, 60)}](${withUtm(page)}) - ${clean(a.description)}${platforms ? ` _${platforms}_` : ''}${links.length ? ' · ' + links.join(' · ') : ''}`;
  }).join('\n');
}

export function storesSection(index) {
  const rows = (index.results || []).filter(g => (g.storeUrls || []).some(safeUrl) && safeUrl(g.page));
  rows.sort((a, b) => a.name.localeCompare(b.name));
  const lines = rows.map(g => {
    const urls = g.storeUrls.map(safeUrl).filter(Boolean);
    const checked = (g.stores || []).map(s => s.checkedAt).filter(Boolean).sort().at(-1)?.slice(0, 10) || index.date;
    const provider = g.provider_claim ? ` Provider claim: ${clean(g.provider_claim, 80)}.` : '';
    return `- **${clean(g.name, 60)}**${g.publisher ? ` (${clean(g.publisher, 60)})` : ''}: ${urls.map(u => `[${host(u)}](${u})`).join(', ')}.${provider} [Sources, checked ${checked}](${withUtm(safeUrl(g.page))})`;
  });
  return `${rows.length} games with a sourced official web store, from the [Mobile Game Web Store Index](${withUtm('https://appside.build/index/')}) (snapshot ${clean(index.date, 10)}). Buy from the official URL only: fake stores copy game names.\n\n${lines.join('\n')}`;
}

export function curatedSection(list) {
  return list.slice().sort((a, b) => a.name.localeCompare(b.name)).map(g => `- [${clean(g.name, 60)}](${safeUrl(g.play)}) - ${clean(g.description, 200)} [Source](${safeUrl(g.source)})${g.license ? ` _${clean(g.license, 20)}_` : ''}`).join('\n');
}

// GitHub issue forms render as "### Label\n\nvalue". Map labels to catalog fields.
const LABELS = { 'Game name': 'name', 'Website': 'url', 'Short description': 'description', 'Platforms': 'platforms', 'Playable web build URL': 'webBuildUrl', 'App Store URL': 'appStoreUrl', 'Google Play URL': 'playStoreUrl' };
export function parseIssue(body) {
  const out = {};
  for (const part of String(body || '').split(/^### /m).slice(1)) {
    const nl = part.indexOf('\n'), label = part.slice(0, nl).trim(), value = part.slice(nl + 1).trim();
    const key = LABELS[label]; if (!key || !value || value === '_No response_') continue;
    if (key === 'platforms') out.platforms = [...value.matchAll(/^- \[[xX]\] (\w+)/gm)].map(m => m[1].toLowerCase()).filter(p => PLATFORMS.includes(p));
    else out[key] = value.replace(/\s+/g, ' ').trim();
  }
  return registration(out);
}

// Whitelist exactly what the catalog accepts; category is always game in this list.
export function registration(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('Submission must be a JSON object');
  const r = { category: 'game' };
  for (const k of ['name', 'url', 'description', 'webBuildUrl', 'appStoreUrl', 'playStoreUrl']) if (typeof input[k] === 'string' && input[k].trim()) r[k] = input[k].trim();
  r.platforms = Array.isArray(input.platforms) ? [...new Set(input.platforms.map(String).map(s => s.toLowerCase()))].filter(p => PLATFORMS.includes(p)) : [];
  if (!r.name) throw Error('Game name is required');
  if (!r.description || r.description.length < 25) throw Error('Description must be at least 25 characters');
  if (!r.platforms.length) throw Error('Choose at least one platform');
  if (!r.url && !r.appStoreUrl && !r.playStoreUrl) throw Error('A website or store listing is required');
  return r;
}

export const MARKER = /<!-- appside-listing-id: ([0-9a-f-]{36}) -->/;
export function instructions(res) {
  const methods = (res.verification?.methods || []).map(m => m.content ? `- Create \`${m.url}\` containing only:\n  \`\`\`\n  ${m.content}\n  \`\`\`` : m.meta ? `- Or add this tag to \`${m.url}\`:\n  \`\`\`html\n  ${m.meta}\n  \`\`\`` : `- Put the token in the public description of: ${(m.urls || []).join(', ')}\n  \`\`\`\n  ${res.verification.token}\n  \`\`\``).join('\n');
  return `Registered as pending. Nothing is public until you prove you control the game's site or store listing.\n\n${methods}\n\nThen comment \`/verify\` on this thread. The listing expires on ${String(res.expiresAt).slice(0, 10)} if it is not verified.\n\nAfter verification: ${res.url}\n\n<!-- appside-listing-id: ${res.id} -->`;
}
