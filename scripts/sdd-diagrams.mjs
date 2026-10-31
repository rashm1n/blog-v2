// Writes the diagrams in src/content/posts/spec-driven-development-1.md as SVG.
// remark-inline-svg inlines them into the page, so they use the page's fonts
// and theme: shapes carry `dg-*` classes that global.css (`.diagram`) maps to
// the theme tokens and animates. The hex attributes are only a fallback for
// readers that see the raw file, who get it static and light. No client JS.
// Run: node scripts/sdd-diagrams.mjs
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'src/assets/posts/sdd';

// Light fallbacks for the theme tokens.
const C = {
  ink: '#1d1d1d',
  sub: '#59606b',
  line: '#d9d9d3',
  panel: '#f7f7f4',
  blue: '#0071b8',
  blueSoft: '#e8f2fa',
  blueLine: '#b5d3ea',
};

const serif = `font-family="Newsreader, Georgia, serif" font-weight="500"`;
const mono = `font-family="JetBrains Mono, monospace" font-weight="500"`;

const write = (name, w, h, body) => {
  writeFileSync(join(OUT, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">\n${body.trim()}\n</svg>\n`);
  console.log(`${OUT}/${name}.svg`);
};

// Small line icons for the three constitution sections.
const ICON = {
  Mission: (x, y) => `<circle class="dg-icon" cx="${x}" cy="${y}" r="9" fill="none" stroke="${C.blue}" stroke-width="1.6"/><circle class="dg-icon" cx="${x}" cy="${y}" r="4.5" fill="none" stroke="${C.blue}" stroke-width="1.6"/><circle class="dg-dot" cx="${x}" cy="${y}" r="1.4" fill="${C.blue}"/>`,
  'Tech Stack': (x, y) => [-5, 0, 5].map((d) => `<path class="dg-icon dg-icon--solid" d="M${x - 9} ${y + d} L${x} ${y + d - 4.5} L${x + 9} ${y + d} L${x} ${y + d + 4.5} Z" fill="#fff" stroke="${C.blue}" stroke-width="1.5" stroke-linejoin="round"/>`).reverse().join(''),
  Roadmap: (x, y) => `<path class="dg-icon" d="M${x - 8} ${y + 9} V${y - 9} M${x - 8} ${y - 8} H${x + 8} L${x + 4} ${y - 4} L${x + 8} ${y} H${x - 8}" fill="none" stroke="${C.blue}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>`,
};

// The constitution: an accent panel holding its three sections.
const constitution = (x, y, w, rowH, gap, title) => {
  const top = title ? 52 : 22;
  const h = top + 3 * rowH + 2 * gap + 22;
  const rows = ['Mission', 'Tech Stack', 'Roadmap'].map((name, i) => {
    const ry = y + top + i * (rowH + gap);
    return `<rect class="dg-card dg-card--accent" x="${x + 22}" y="${ry}" width="${w - 44}" height="${rowH}" rx="10" fill="#fff" stroke="${C.blueLine}"/>
<rect class="dg-icon-box" x="${x + 38}" y="${ry + rowH / 2 - 18}" width="36" height="36" rx="8" fill="${C.blueSoft}"/>
${ICON[name](x + 56, ry + rowH / 2)}
<text class="dg-title" x="${x + 90}" y="${ry + rowH / 2 + 8}" ${serif} font-size="23" fill="${C.ink}">${name}</text>`;
  });
  return `<rect class="dg-accent-panel" x="${x}" y="${y}" width="${w}" height="${h}" rx="16" fill="${C.blueSoft}" stroke="${C.blueLine}"/>
${title ? `<text class="dg-label" x="${x + 24}" y="${y + 33}" ${mono} font-size="15" fill="${C.blue}">${title}</text>` : ''}
${rows.join('\n')}`;
};

// 1. Spec → agent → Implementation, validated back against the spec.
// Animated: a packet carries the spec out and validation brings it back.
const AGENT = 'M292 98 H526';
const VALIDATION = 'M650 206 C650 288 160 288 160 210';
const tag = (cx, cy, text, cls) => {
  const w = text.length * 7.8 + 24;
  return `<g class="${cls}"><rect x="${cx - w / 2}" y="${cy - 15}" width="${w}" height="30" rx="15" fill="${C.panel}" stroke="${C.line}"/>
<text x="${cx}" y="${cy + 5}" text-anchor="middle" ${mono} font-size="13" fill="${C.sub}">${text}</text></g>`;
};
write('sdd1', 800, 300, `
<rect class="dg-card" x="40" y="26" width="240" height="168" rx="14" fill="#fff" stroke="${C.line}"/>
<path class="dg-panel" d="M252 26 H266 Q280 26 280 40 V54 Z" fill="${C.panel}"/>
<path class="dg-line" d="M252 26 V46 Q252 54 260 54 H280" fill="none" stroke="${C.line}"/>
<text class="dg-title" x="64" y="74" ${serif} font-size="34" fill="${C.ink}">Spec</text>
${[150, 120, 136].map((w, i) => `<rect class="dg-rule" x="64" y="${90 + i * 12}" width="${w}" height="4" rx="2" fill="${C.line}"/>`).join('')}
${tag(113, 166, 'intentions', 'dg-tag')}
${tag(225, 166, 'contract', 'dg-tag dg-confirm')}
<rect class="dg-card dg-target" x="540" y="26" width="220" height="168" rx="14" fill="#fff" stroke="${C.line}"/>
<path class="dg-panel" d="M540 62 V40 Q540 26 554 26 H746 Q760 26 760 40 V62 Z" fill="${C.panel}"/>
<line class="dg-line" x1="540" y1="62" x2="760" y2="62" stroke="${C.line}"/>
${['#e8796f', '#e9b949', '#6cbf7a'].map((c, i) => `<circle cx="${560 + i * 16}" cy="44" r="5" fill="${c}"/>`).join('')}
<text class="dg-title" x="650" y="110" text-anchor="middle" ${serif} font-size="26" fill="${C.ink}">Implementation</text>
${[120, 96, 72].map((w, i) => `<rect class="dg-code${i ? '' : ' dg-code--accent'}" x="${564 + i * 16}" y="${134 + i * 14}" width="${w}" height="4" rx="2" fill="${i ? C.line : C.blueLine}" style="animation-delay: ${i * 0.15}s"/>`).join('')}
<path class="dg-arrow" d="${AGENT}" fill="none" stroke="${C.blue}" stroke-width="2"/>
<path class="dg-arrow" d="M519 91 L526 98 L519 105" fill="none" stroke="${C.blue}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
<circle class="dg-packet dg-packet--agent" r="5" fill="${C.blue}" style="offset-path: path('${AGENT}')"/>
<g class="dg-tag dg-tag--accent"><rect x="${410 - 32.5}" y="83" width="65" height="30" rx="15" fill="${C.blueSoft}" stroke="${C.blueLine}"/>
<text x="410" y="103" text-anchor="middle" ${mono} font-size="13" fill="${C.blue}">agent</text></g>
<path class="dg-flow" d="${VALIDATION}" fill="none" stroke="${C.sub}" stroke-width="1.6" stroke-dasharray="6 6"/>
<path class="dg-return" d="M153 214 L160 206 L167 214" fill="none" stroke="${C.sub}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
<circle class="dg-packet dg-packet--validation" r="5" fill="${C.sub}" style="offset-path: path('${VALIDATION}')"/>
${tag(405, 267, 'validation', 'dg-tag dg-tag--plain')}
`);

// 2. The constitution on its own, centred so it isn't blown up to full width.
write('sdd2', 800, 340, constitution(180, 8, 440, 82, 16));

// 3. The constitution and the feature-level specs that grow under it; the
// colour of each file says what kind of spec it is.
const children = ['feature1.md', 'feature2.md', 'improvement1.md', 'feature3.md', 'issue1.md', 'issue2.md'];
const chipY = (i) => 52 + i * 58;
write('sdd3', 800, 420, `
<rect class="dg-frame" x="16" y="16" width="768" height="388" rx="20" fill="none" stroke="${C.line}" stroke-dasharray="5 5"/>
${constitution(40, 69, 330, 70, 12, 'constitution.md')}
<path class="dg-connector" d="M370 223 H420 M420 ${chipY(0) + 22} V${chipY(5) + 22}" fill="none" stroke="${C.blueLine}" stroke-width="1.6"/>
<circle class="dg-dot" cx="370" cy="223" r="4" fill="${C.blue}"/>
${children
  .map((name, i) => {
    const y = chipY(i);
    return `<path class="dg-connector" d="M420 ${y + 22} H450" stroke="${C.blueLine}" stroke-width="1.6"/>
<g class="dg-chip dg-chip--${name.replace(/\d.*$/, '')}">
<rect class="dg-card" x="450" y="${y}" width="290" height="44" rx="10" fill="#fff" stroke="${C.line}"/>
<rect class="dg-chip-bar" x="450" y="${y}" width="6" height="44" rx="3" fill="${C.blue}"/>
<path class="dg-chip-icon" d="M474 ${y + 12} H484 L490 ${y + 18} V${y + 32} H474 Z M484 ${y + 12} V${y + 18} H490" fill="${C.blueSoft}" stroke="${C.blue}" stroke-width="1.4" stroke-linejoin="round"/>
<text class="dg-mono" x="504" y="${y + 28}" ${mono} font-size="16" fill="${C.ink}">${name}</text>
</g>`;
  })
  .join('\n')}
`);
