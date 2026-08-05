/**
 * Fails the build if any inline <script> in the output isn't covered by that
 * page's Content-Security-Policy.
 *
 * Astro hashes the scripts it bundles, but `is:inline` ones are passed through
 * untouched and have to be pinned by hand in `security.csp.scriptDirective.hashes`.
 * Nothing about that is self-checking: editing an inline script by one character
 * silently invalidates its hash, and the only symptom is a feature quietly not
 * running in browsers that enforce the policy — which, on a static site with no
 * report-uri, nobody would notice. This turns that into a build failure.
 */

import { readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';

const DIST = 'dist';

/** Types the browser executes; anything else (ld+json, importmap) CSP ignores. */
const EXECUTABLE = /^(|module|text\/javascript|application\/javascript)$/i;

async function htmlFiles(dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await htmlFiles(path)));
    else if (entry.name.endsWith('.html')) found.push(path);
  }
  return found;
}

const sha256 = (value) => `sha256-${createHash('sha256').update(value, 'utf8').digest('base64')}`;

const failures = [];
let checked = 0;

for (const file of await htmlFiles(DIST)) {
  const html = readFileSync(file, 'utf8');

  const policy = html.match(
    /<meta http-equiv="content-security-policy" content="([^"]*)"/i
  )?.[1];
  if (!policy) continue;

  const listed = new Set(policy.match(/'sha256-[^']+'/g)?.map((h) => h.slice(1, -1)) ?? []);

  for (const [, attrs, body] of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (!body.trim()) continue; // external src — covered by script-src 'self'
    const type = attrs.match(/\btype\s*=\s*"([^"]*)"/i)?.[1] ?? '';
    if (!EXECUTABLE.test(type.trim())) continue;

    checked += 1;
    const hash = sha256(body);
    if (!listed.has(hash)) {
      failures.push({ file: relative(DIST, file), hash, snippet: body.trim().slice(0, 70) });
    }
  }
}

if (failures.length > 0) {
  console.error(`\n✗ CSP: ${failures.length} inline script(s) missing a hash\n`);

  // The same inline script appears on every page; report each distinct hash once.
  const seen = new Set();
  for (const { file, hash, snippet } of failures) {
    if (seen.has(hash)) continue;
    seen.add(hash);
    console.error(`  ${hash}`);
    console.error(`    first seen in: ${file}`);
    console.error(`    starts with:   ${snippet.replace(/\s+/g, ' ')}…\n`);
  }
  console.error(
    'Add the hash above to security.csp.scriptDirective.hashes in astro.config.mjs\n' +
      '(or replace the stale one it supersedes), then rebuild.\n'
  );
  process.exit(1);
}

console.log(`✓ CSP: ${checked} inline script(s) hashed`);
