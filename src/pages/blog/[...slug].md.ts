import type { APIRoute } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import { MARKDOWN_CONTENT_TYPE, renderMarkdown } from '../../utils/markdown';
import { SITE_URL } from '../../consts';

// `/blog/some-post.md` — the raw-Markdown twin of `/blog/some-post/`. The literal
// `.md` suffix makes this route strictly more specific than [...slug].astro, so
// the two never collide.
export async function getStaticPaths() {
  const posts = await getCollection('posts', ({ data }: { data: { draft: boolean } }) =>
    import.meta.env.PROD ? data.draft !== true : true
  );

  return posts.map((entry) => ({ params: { slug: entry.id }, props: { entry } }));
}

export const GET: APIRoute = ({ props, site }) => {
  const { entry } = props as { entry: CollectionEntry<'posts'> };

  return new Response(renderMarkdown(entry, site ?? new URL(SITE_URL)), {
    headers: { 'Content-Type': MARKDOWN_CONTENT_TYPE },
  });
};
