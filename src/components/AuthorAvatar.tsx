import { Avatar, AvatarBadge, AvatarFallback } from "@/components/ui/avatar"

/**
 * The monogram + "still around" dot, as one React component.
 *
 * This exists because shadcn's Avatar is a Radix primitive and Radix passes
 * state from Root to Fallback through React context. Astro renders each child
 * of a React component as its *own* React root and splices the resulting HTML
 * into the parent's slot, so context never reaches across that boundary —
 * composing `<Avatar><AvatarFallback/></Avatar>` in a .astro file throws
 * "`AvatarFallback` must be used within `Avatar`" at build time.
 *
 * Keeping the whole subtree in one .tsx file keeps it in one React render,
 * where the context works normally. Any other context-based shadcn component
 * (Tabs, Accordion, Select, …) needs the same treatment to be used from Astro.
 *
 * No `client:` directive is used at the call sites, so this renders to static
 * HTML at build time and ships no JavaScript.
 */

/**
 * Sizes are expressed as `data-[size=lg]:` overrides rather than plain `size-*`
 * utilities on purpose. Avatar sets its own dimensions through that same
 * variant, and a variant-prefixed utility beats an unprefixed one no matter
 * what order tailwind-merge leaves them in — a plain `size-14` here would
 * silently lose to the library's `data-[size=lg]:size-10` and the avatar would
 * render at the wrong size with no warning anywhere.
 */
const SIZES = {
  md: {
    root: "data-[size=lg]:size-12",
    fallback: "text-lg",
    badge: "group-data-[size=lg]/avatar:size-3",
  },
  lg: {
    root: "data-[size=lg]:size-14",
    fallback: "text-xl",
    badge: "group-data-[size=lg]/avatar:size-3.5",
  },
} as const

export function AuthorAvatar({
  initial,
  size = "lg",
}: {
  initial: string
  size?: keyof typeof SIZES
}) {
  const s = SIZES[size]

  return (
    <Avatar size="lg" className={`after:border-transparent ${s.root}`}>
      <AvatarFallback
        className={`bg-linear-135 from-primary to-primary/55 font-mono font-semibold text-primary-foreground ${s.fallback}`}
      >
        {initial}
      </AvatarFallback>
      <AvatarBadge className={`bg-emerald-500 ring-background ${s.badge}`} />
    </Avatar>
  )
}
