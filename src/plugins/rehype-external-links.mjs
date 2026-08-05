/**
 * Marks outbound links in post content as external and pins their `rel`.
 *
 * `noopener` is the load-bearing one: without it a `target="_blank"` link hands
 * the destination a live `window.opener` handle back to this page. Modern
 * browsers imply it, but the attribute costs nothing and older ones don't.
 * `noreferrer` keeps the referrer off third-party servers, matching the
 * `strict-origin-when-cross-origin` policy the edge already sets.
 *
 * `data-external` is what CSS keys the outbound arrow off — see `.prose a` in
 * global.css. Anchors, relative paths and `mailto:` are left alone.
 */

function walk(node, visitor) {
  visitor(node);
  if (Array.isArray(node.children)) {
    for (const child of node.children) walk(child, visitor);
  }
}

export default function rehypeExternalLinks({ site } = {}) {
  const host = site ? new URL(site).host : undefined;

  return (tree) => {
    walk(tree, (node) => {
      if (node.type !== 'element' || node.tagName !== 'a') return;

      const href = node.properties?.href;
      if (typeof href !== 'string' || !/^https?:\/\//i.test(href)) return;

      let url;
      try {
        url = new URL(href);
      } catch {
        return;
      }
      if (host && url.host === host) return;

      node.properties.rel = ['noopener', 'noreferrer'];
      node.properties.target = '_blank';
      node.properties['data-external'] = '';
    });
  };
}
