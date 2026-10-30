/**
 * Each post's mark, drawn as a consistent-hashing ring. Every tag hashes to
 * three virtual nodes on the circle, the post hashes to its own point, and the
 * arc runs clockwise from the post to the node that "owns" it. Chords join the
 * post to the nearest node of each of its tags. Posts that share tags share
 * nodes, so related posts look related.
 *
 * Geometry lives in a 100×100 box; ringMarkup is used by both PostRing.astro
 * and the OG card (utils/og.ts), so the two can't drift apart.
 */

const C = 50;
const R = 40;
const VNODES = 3;

/** FNV-1a: tiny, stable across builds, and spreads short strings well. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Degrees clockwise from 12 o'clock, like a clock face. */
function point(angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { angle, x: round(C + R * Math.cos(rad)), y: round(C + R * Math.sin(rad)) };
}

const at = (key: string) => point((hash(key) % 3600) / 10);

export function ringGeometry(id: string, tags: string[]) {
  const post = at(id);
  const clockwiseFromPost = (a: number) => (a - post.angle + 360) % 360;
  const nearest = <T extends { angle: number }>(list: T[]) =>
    list.reduce((a, b) => (clockwiseFromPost(b.angle) < clockwiseFromPost(a.angle) ? b : a));

  const perTag = tags.map((tag) => Array.from({ length: VNODES }, (_, i) => at(`${tag}#${i}`)));
  const nodes = perTag.flat();
  const chords = perTag.map(nearest);
  const owner = nodes.length > 0 ? nearest(nodes) : undefined;
  return { post, nodes, chords, owner };
}

export interface RingColors {
  ring: string;
  chord: string;
  node: string;
  post: string;
}

/**
 * The ring's inner SVG elements. Colours go in `style` so CSS variables work in
 * the browser. `scale` divides stroke widths (px per unit, for renderers without
 * non-scaling-stroke); `dotScale` shrinks the dots on large renders.
 */
export function ringMarkup(id: string, tags: string[], color: RingColors, scale = 1, dotScale = 1): string {
  const { post, nodes, chords, owner } = ringGeometry(id, tags);
  const w = round(1 / scale);
  const line = (stroke: string, width: number) => `style="fill:none;stroke:${stroke};stroke-width:${width}"`;
  const dot = (p: { x: number; y: number }, r: number, fill: string) =>
    `<circle cx="${p.x}" cy="${p.y}" r="${r}" style="fill:${fill}"/>`;

  let arc = '';
  if (owner) {
    const sweep = (owner.angle - post.angle + 360) % 360;
    arc = `<path d="M${post.x} ${post.y}A${R} ${R} 0 ${sweep > 180 ? 1 : 0} 1 ${owner.x} ${owner.y}" ${line(color.post, round(w * 2.5))}/>`;
  }

  return [
    `<circle cx="${C}" cy="${C}" r="${R}" ${line(color.ring, w)}/>`,
    ...chords.map((n) => `<line x1="${post.x}" y1="${post.y}" x2="${n.x}" y2="${n.y}" ${line(color.chord, w)}/>`),
    arc,
    ...nodes.map((n) => dot(n, 3.5 * dotScale, color.node)),
    dot(post, 6 * dotScale, color.post),
  ].join('');
}
