import { getCollection, render } from 'astro:content';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { sectionFor, type AnyEntry } from './posts';

export interface FeedItem {
  entry: AnyEntry;
  /** Site-relative path, with the trailing slash feed readers expect. */
  path: string;
  /** Fully-rendered post HTML with every URL absolute, or '' if rendering failed. */
  html: string;
}

/**
 * Rewrites root-relative URLs to absolute ones.
 *
 * Feed readers display an item outside the site's origin, so `/_astro/x.webp`
 * and `/blog/other-post` resolve against the reader's own base — usually to
 * nothing. The negative lookahead leaves protocol-relative `//host/path` alone.
 */
function absolutise(html: string, site: URL): string {
  return html.replace(/(\s(?:src|href)=")\/(?!\/)/g, `$1${site.origin}/`);
}

/**
 * Every published entry, newest first, with its full rendered HTML.
 *
 * The HTML comes from the same component pipeline the pages use, via the
 * container API, so callouts and syntax highlighting reach the feed exactly as
 * they appear on the site. Deliberately not re-sanitised: this is first-party
 * content that is already being served as HTML from this origin, so a sanitiser
 * here would add a dependency without removing a threat.
 */
export async function feedItems(site: URL): Promise<FeedItem[]> {
  const draftFilter = ({ data }: { data: { draft: boolean } }) =>
    import.meta.env.PROD ? data.draft !== true : true;

  const [posts, travel] = await Promise.all([
    getCollection('posts', draftFilter),
    getCollection('travel', draftFilter),
  ]);

  const entries = [...posts, ...travel].sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  );

  const container = await AstroContainer.create();

  return Promise.all(
    entries.map(async (entry) => {
      let html = '';
      try {
        const { Content } = await render(entry);
        html = absolutise(await container.renderToString(Content), site);
      } catch {
        // A feed that falls back to summaries beats a build that fails outright.
        html = '';
      }

      return {
        entry,
        path: `${sectionFor(entry.collection).path}/${entry.id}/`,
        html,
      };
    })
  );
}
