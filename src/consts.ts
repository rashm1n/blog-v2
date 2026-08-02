// TODO: swap in the real domain once registered (also update astro.config.mjs `site`)
export const SITE_URL = 'https://example.com';

export const SITE_TITLE = 'rashmin';
export const SITE_DESCRIPTION =
  'Software engineer. Writing about distributed systems, infrastructure, and the occasional trip.';
export const AUTHOR_NAME = 'Rashmin';

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
