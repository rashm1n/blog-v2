/**
 * Loads the Pagefind search index on first use.
 *
 * Lives in `public/` — copied verbatim, never seen by Vite — for two reasons
 * that happen to have the same fix:
 *
 *  1. Vite constant-folds a dynamic import's specifier even behind a variable
 *     or `@vite-ignore`, rewrites the call through its preload helper, and —
 *     because /pagefind/pagefind.js doesn't exist until the `pagefind`
 *     postbuild step has run — leaves an unresolved `__VITE_PRELOAD__`
 *     identifier that throws on the first search.
 *  2. As a real file it is covered by `script-src 'self'`, so it needs no CSP
 *     hash. An inline script here would need one, and would rot every time
 *     this file was edited.
 */
window.loadPagefind = () => {
  window.__pagefind ??= import('/pagefind/pagefind.js')
    .then(async (module) => {
      await module.init?.();
      return module;
    })
    .catch((error) => {
      // Drop the cached rejection so a transient failure can be retried.
      window.__pagefind = undefined;
      throw error;
    });
  return window.__pagefind;
};
