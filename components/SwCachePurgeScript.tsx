/**
 * Inline script that runs in <head> BEFORE React hydrates.
 * Detects old service worker v1 caches on Safari iOS and purges them,
 * then unregisters the old SW and reloads once so fresh code loads.
 * Uses sessionStorage to prevent reload loops (runs max once per tab session).
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
    '    if (!(\"caches\" in window) || !(\"serviceWorker\" in navigator)) return;',
    '    if (sessionStorage.getItem(\"_swp\")) return;',
    '    caches.keys().then(function(keys) {',
    '      var old = keys.filter(function(k) { return k.indexOf(\"-v1\") !== -1; });',
    '      if (old.length === 0) return;',
    '      sessionStorage.setItem(\"_swp\", \"1\");',
    '      Promise.all(old.map(function(k) { return caches.delete(k); })).then(function() {',
    '        navigator.serviceWorker.getRegistrations().then(function(regs) {',
    '          Promise.all(regs.map(function(r) { return r.unregister(); })).then(function() {',
    '            location.reload();',
    '          });',
    '        });',
    '      });',
    '    });',
    '  } catch(e) {}',
    '})();',
  ].join('\n')

  // eslint-disable-next-line react/no-danger -- static string, no XSS risk
  return <script dangerouslySetInnerHTML={{ __html: PURGE_SCRIPT }} />
}
