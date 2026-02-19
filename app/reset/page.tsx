/**
 * Service Worker Reset Page
 *
 * This page exists to break through the old service worker's cache on Safari iOS.
 * Since this URL was never visited before, the old SW won't have it cached
 * and will fetch it from the network (network-first for navigation requests).
 *
 * The inline script unregisters all service workers, clears all caches,
 * and redirects to the dashboard.
 *
 * NOTE: dangerouslySetInnerHTML is safe here — all content is hardcoded
 * static strings with no user input, no dynamic content, no XSS risk.
 */
export default function ResetPage() {
  // Static hardcoded script — no user input, no XSS risk
  const RESET_SCRIPT = `
    (async function() {
      var status = document.getElementById('status');
      try {
        if ('serviceWorker' in navigator) {
          var regs = await navigator.serviceWorker.getRegistrations();
          for (var i = 0; i < regs.length; i++) {
            await regs[i].unregister();
          }
          status.textContent = 'Cleared ' + regs.length + ' service worker(s)...';
        }
        if ('caches' in window) {
          var keys = await caches.keys();
          for (var j = 0; j < keys.length; j++) {
            await caches.delete(keys[j]);
          }
          status.textContent = 'Cleared ' + keys.length + ' cache(s)...';
        }
        try { sessionStorage.clear(); } catch(e) {}
        status.textContent = 'Done! Redirecting...';
        setTimeout(function() {
          window.location.href = '/dashboard';
        }, 1000);
      } catch(e) {
        status.textContent = 'Error: ' + e.message + '. Redirecting anyway...';
        setTimeout(function() {
          window.location.href = '/dashboard';
        }, 2000);
      }
    })();
  `

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>NoteSnap - Updating...</title>
      </head>
      <body style={{
        fontFamily: 'system-ui, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        margin: 0,
        background: '#f3f4f6',
        textAlign: 'center',
        padding: '2rem',
      }}>
        <div>
          <div style={{
            width: 48,
            height: 48,
            border: '4px solid #e5e7eb',
            borderTopColor: '#7c3aed',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1.5rem',
          }} />
          <h1 style={{ color: '#7c3aed', fontSize: '1.25rem', marginBottom: '0.5rem' }}>
            Updating NoteSnap...
          </h1>
          <p id="status" style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            Clearing old data...
          </p>
          {/* eslint-disable-next-line react/no-danger -- static CSS keyframes, no XSS risk */}
          <style dangerouslySetInnerHTML={{ __html: '@keyframes spin { to { transform: rotate(360deg); } }' }} />
          {/* eslint-disable-next-line react/no-danger -- hardcoded static script, no user input, no XSS risk */}
          <script dangerouslySetInnerHTML={{ __html: RESET_SCRIPT }} />
        </div>
      </body>
    </html>
  )
}
