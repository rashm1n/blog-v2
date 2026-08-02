// TODO: swap in the real domain once registered (also update astro.config.mjs `site`)
export const SITE_URL = 'https://example.com';

export const SITE_TITLE = 'rashmin';
export const SITE_DESCRIPTION =
  'Software engineer. Writing about distributed systems, infrastructure, and the occasional trip.';
export const AUTHOR_NAME = 'Rashmin';
export const AUTHOR_ROLE = 'Software engineer';
/** Homepage lead paragraph — SITE_DESCRIPTION minus the role, which the eyebrow states. */
export const SITE_LEAD =
  'I write about distributed systems, infrastructure, and whatever I happen to be debugging that week — plus the occasional trip.';

export const SOCIAL_LINKS = [
  { label: 'GitHub', url: 'https://github.com/rashm1n' },
  { label: 'RSS', url: '/rss.xml' },
] as const;

export const NAV_LINKS = [
  { label: 'Writing', href: '/blog' },
  { label: 'Travel', href: '/travel' },
  { label: 'About', href: '/about' },
] as const;

export const GITHUB_USERNAME = 'rashm1n';
