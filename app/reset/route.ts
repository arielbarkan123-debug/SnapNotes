/**
 * Service Worker Reset Route
 *
 * Returns raw HTML that bypasses Next.js layouts entirely.
 * This page unregisters all service workers, clears all caches,
 * and redirects to the dashboard.
 *
 * Since this URL was never visited before, the old SW won't have it
 * cached and will serve it fresh from the network.
 */
export async function GET() {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NoteSnap - Updating...</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      background: #f3f4f6;
      text-align: center;
      padding: 2rem;
    }
    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid #e5e7eb;
      border-top-color: #7c3aed;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1.5rem;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h1 { color: #7c3aed; font-size: 1.25rem; margin-bottom: 0.5rem; }
    #status { color: #6b7280; font-size: 0.875rem; }
    .done { color: #059669 !important; font-weight: 600; }
  </style>
</head>
<body>
  <div>
    <div class="spinner" id="spinner"></div>
    <h1>Updating NoteSnap...</h1>
    <p id="status">Clearing old data...</p>
  </div>
  <script>
    (async function() {
      var status = document.getElementById('status');
      var spinner = document.getElementById('spinner');
      try {
        var swCount = 0;
        var cacheCount = 0;

        if ('serviceWorker' in navigator) {
          var regs = await navigator.serviceWorker.getRegistrations();
          for (var i = 0; i < regs.length; i++) {
            await regs[i].unregister();
          }
          swCount = regs.length;
        }

        if ('caches' in window) {
          var keys = await caches.keys();
          for (var j = 0; j < keys.length; j++) {
            await caches.delete(keys[j]);
          }
          cacheCount = keys.length;
        }

        try { sessionStorage.clear(); } catch(e) {}
        try { localStorage.removeItem('pwa-install-dismissed'); } catch(e) {}

        spinner.style.display = 'none';
        status.className = 'done';
        status.textContent = 'Done! Redirecting...';

        setTimeout(function() {
          window.location.href = '/dashboard';
        }, 1500);
      } catch(e) {
        spinner.style.display = 'none';
        status.textContent = 'Error: ' + e.message;
        setTimeout(function() {
          window.location.href = '/dashboard';
        }, 2000);
      }
    })();
  </script>
</body>
</html>`

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}
