/**
 * GitHub-style callouts, without the `remark-directive` + `unist-util-visit`
 * dependency pair those normally arrive with.
 *
 *   > [!NOTE]
 *   > Body text.
 *
 *   > [!WARNING] Custom title
 *   > Body text.
 *
 * Becomes `<aside class="callout" data-callout="note">` with a title row. The
 * icon is drawn by CSS (a masked SVG per type) rather than injected here, so
 * this plugin only ever produces structure — see `.callout` in global.css.
 *
 * Written against the same syntax GitHub renders so a post stays readable as
 * plain Markdown on GitHub and in the `/blog/<slug>.md` twins.
 */

const TYPES = new Set(['note', 'tip', 'important', 'warning', 'caution']);

const MARKER = /^\[!(\w+)\][ \t]*(.*)$/;

/** Depth-first walk over mdast; no dependency needed for a tree this small. */
function walk(node, visitor) {
  visitor(node);
  if (Array.isArray(node.children)) {
    for (const child of node.children) walk(child, visitor);
  }
}

export default function remarkCallouts() {
  return (tree) => {
    walk(tree, (node) => {
      if (node.type !== 'blockquote') return;

      const paragraph = node.children?.[0];
      if (paragraph?.type !== 'paragraph') return;

      const first = paragraph.children?.[0];
      if (first?.type !== 'text') return;

      // The marker occupies the first line; the body follows a soft break that
      // remark leaves inside the same text node.
      const newline = first.value.indexOf('\n');
      const head = newline === -1 ? first.value : first.value.slice(0, newline);

      const match = MARKER.exec(head);
      if (!match) return;

      const type = match[1].toLowerCase();
      if (!TYPES.has(type)) return;

      // Everything after `[!NOTE]` on the marker line is an optional custom title.
      const title = match[2].trim() || type.toUpperCase();

      // Drop the marker line, keeping whatever followed it as the first body line.
      first.value = newline === -1 ? '' : first.value.slice(newline + 1);
      if (first.value === '' && paragraph.children.length > 1) {
        paragraph.children.shift();
        // A hard break immediately after the marker would render as a blank line.
        if (paragraph.children[0]?.type === 'break') paragraph.children.shift();
      }

      // An empty leading paragraph means the callout had a title and nothing else.
      if (paragraph.children.length === 0) node.children.shift();

      node.data = {
        ...node.data,
        hName: 'aside',
        hProperties: { className: 'callout', 'data-callout': type },
      };

      node.children.unshift({
        type: 'paragraph',
        data: { hName: 'p', hProperties: { className: 'callout__title' } },
        children: [{ type: 'text', value: title }],
      });
    });
  };
}
