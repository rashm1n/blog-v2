/**
 * Inlines a standalone local `.svg` image into the page:
 *
 *   ![alt](../../assets/posts/x/diagram.svg "Optional caption")
 *
 * Becomes `<figure class="diagram"><svg role="img" aria-label="alt">…</svg></figure>`.
 * An <img> can't see the page's fonts or its `.dark` class and can't be
 * restyled; inlined, an SVG built from `dg-*` classes picks up the theme and
 * the animations in global.css (`.diagram`). No script and no <style> is
 * added, so the CSP needs nothing new.
 *
 * Only paragraphs holding just the image are touched; a remote or inline-text
 * SVG stays an ordinary image.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const escape = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function walk(node, visitor) {
  if (!Array.isArray(node.children)) return;
  node.children.forEach((child, i) => {
    visitor(child, i, node);
    walk(child, visitor);
  });
}

export default function remarkInlineSvg() {
  return (tree, file) => {
    if (!file.path) return;
    walk(tree, (node, i, parent) => {
      if (node.type !== 'paragraph' || node.children.length !== 1) return;
      const image = node.children[0];
      if (image.type !== 'image' || !/^\.{1,2}\/.*\.svg$/.test(image.url)) return;

      const svg = readFileSync(resolve(dirname(file.path), image.url), 'utf8')
        .replace(/<\?xml[^>]*>\s*/, '')
        .replace('<svg', `<svg role="img" aria-label="${escape(image.alt ?? '')}"`);
      const caption = image.title ? `<figcaption class="figure__caption">${escape(image.title)}</figcaption>` : '';
      parent.children[i] = { type: 'html', value: `<figure class="diagram">${svg.trim()}${caption}</figure>` };
    });
  };
}
