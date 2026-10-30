import test from 'node:test';
import assert from 'node:assert/strict';
import { replaceSection, catalogSection, storesSection, curatedSection, parseIssue, registration, instructions, MARKER, clean } from './lib.mjs';

test('replaceSection swaps only the marked block', () => {
  const r = replaceSection('a\n<!-- x:start -->\nold\n<!-- x:end -->\nb', 'x', 'new');
  assert.equal(r, 'a\n<!-- x:start -->\nnew\n<!-- x:end -->\nb');
  assert.throws(() => replaceSection('none', 'x', 'y'));
});

test('catalog lists verified games only, escapes text, adds Play for web builds', () => {
  const apps = [
    { name: 'Zed [x](evil)', description: 'A <b>bold</b>\nline game with enough characters', category: 'game', status: 'verified', url: 'https://appside.build/apps/zed-1/', webBuildUrl: 'https://zed.example/play/', siteUrl: 'https://zed.example/', platforms: ['web'] },
    { name: 'Todo', description: 'not a game', category: 'productivity', status: 'verified', url: 'https://appside.build/apps/todo/' },
    { name: 'Pending', description: 'x', category: 'game', status: 'pending', url: 'https://appside.build/apps/p/' },
  ];
  const md = catalogSection(apps);
  assert.equal(md.split('\n').length, 1);
  assert.match(md, /^- \[Zed x\(evil\)\]\(https:\/\/appside\.build\/apps\/zed-1\/\?utm_source=github/);
  assert.match(md, /Play in browser\]\(https:\/\/appside\.build\/apps\/zed-1\/\?utm_source=github&utm_medium=awesome-web-games&play=1\)/);
  assert.doesNotMatch(md, /<b>/);
  assert.match(catalogSection([]), /No verified games yet/);
});

test('stores lists only games with a sourced https store and a page', () => {
  const md = storesSection({ date: '2026-10-27', results: [
    { name: 'Clash Royale', publisher: 'Supercell', storeUrls: ['https://store.supercell.com/'], provider_claim: 'In-house', page: 'https://appside.build/index/clash-royale/', stores: [{ checkedAt: '2026-10-27T23:42:59Z' }] },
    { name: 'No Store', storeUrls: [], page: 'https://appside.build/index/no-store/' },
    { name: 'Bad', storeUrls: ['javascript:alert(1)'], page: 'https://appside.build/index/bad/' },
  ] });
  assert.match(md, /^1 games/);
  assert.match(md, /\*\*Clash Royale\*\* \(Supercell\): \[store\.supercell\.com\]\(https:\/\/store\.supercell\.com\/\)\. Provider claim: In-house\. \[Sources, checked 2026-10-27\]/);
  assert.doesNotMatch(md, /No Store|javascript/);
});

test('curated renders sorted lines', () => {
  assert.equal(curatedSection([{ name: 'B', play: 'https://b.example/', description: 'b', source: 'https://github.com/b/b', license: 'MIT' }, { name: 'A', play: 'https://a.example/', description: 'a', source: 'https://github.com/a/a' }]),
    '- [A](https://a.example/) - a [Source](https://github.com/a/a)\n- [B](https://b.example/) - b [Source](https://github.com/b/b) _MIT_');
});

const form = `### Game name\n\nStar Hop\n\n### Website\n\nhttps://starhop.example\n\n### Short description\n\nA tiny platformer about hopping between stars.\n\n### Platforms\n\n- [X] web\n- [ ] ios\n- [x] android\n\n### Playable web build URL\n\nhttps://starhop.example/play/\n\n### App Store URL\n\n_No response_\n\n### Google Play URL\n\nhttps://play.google.com/store/apps/details?id=example.starhop`;

test('parseIssue maps the issue form to a catalog registration', () => {
  assert.deepEqual(parseIssue(form), { category: 'game', name: 'Star Hop', url: 'https://starhop.example', description: 'A tiny platformer about hopping between stars.', webBuildUrl: 'https://starhop.example/play/', playStoreUrl: 'https://play.google.com/store/apps/details?id=example.starhop', platforms: ['web', 'android'] });
});

test('registration whitelists fields and rejects incomplete input', () => {
  assert.deepEqual(registration({ name: 'A', url: 'https://a.example', description: 'x'.repeat(30), platforms: ['WEB', 'web', 'tv'], contactEmail: 'leak@example.com', category: 'finance', extra: 1 }),
    { category: 'game', name: 'A', url: 'https://a.example', description: 'x'.repeat(30), platforms: ['web'] });
  assert.throws(() => registration({ name: 'A', url: 'https://a.example', description: 'short', platforms: ['web'] }), /25/);
  assert.throws(() => registration({ name: 'A', description: 'x'.repeat(30), platforms: ['web'] }), /website or store/);
  assert.throws(() => registration([]), /object/);
});

test('instructions carry the listing id marker and the token', () => {
  const body = instructions({ id: '12345678-1234-1234-1234-123456789abc', url: 'https://appside.build/apps/a-1/', expiresAt: '2026-11-13T00:00:00Z', verification: { token: 'appside-verify=abc', methods: [{ url: 'https://a.example/.well-known/appside-verify.txt', content: 'appside-verify=abc' }, { url: 'https://a.example/', meta: '<meta name="appside-verify" content="appside-verify=abc">' }] } });
  assert.equal(body.match(MARKER)[1], '12345678-1234-1234-1234-123456789abc');
  assert.match(body, /appside-verify=abc/);
  assert.match(body, /2026-11-13/);
});

test('clean strips markdown and html control characters', () => {
  assert.equal(clean('a | b `c` <d> [e]\n f'), 'a b c d e f');
});
