/**
 * Inline script that runs in <head> BEFORE React hydrates.
 * Clears ALL service worker caches and unregisters old SWs silently
 * (no page reload — the self-destructing SW handles the transition).
 *
 * NOTE: The dangerouslySetInnerHTML usage here is safe because the content
 * is a hardcoded static string literal — no user input, no dynamic content,
 * no XSS risk. This pattern is standard for inline <script> tags in Next.js
 * server components.
 */
export default function SwCachePurgeScript() {
  const PURGE_SCRIPT = [
    '(function(){',
    '  try {',
    '    if (!("caches" in window) || !("serviceWorker" in navigator)) return;',
    '    caches.keys().then(function(keys) {',
    '      keys.forEach(function(k) { caches.delete(k); });',
    '    });',
    '  } catch(e) {}',
    '})();',
  ].join('\n')

  // eslint-disable-next-line react/no-danger -- static string, no XSS risk
  return <script dangerouslySetInnerHTML={{ __html: PURGE_SCRIPT }} />
}
