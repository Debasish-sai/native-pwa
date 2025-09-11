// Service Worker for John Doe Portfolio PWA
const CACHE_NAME = "portfolio-v1.0.2";
const STATIC_CACHE = "static-v1.0.2";
const DYNAMIC_CACHE = "dynamic-v1.0.2";

// Base URL for GitHub Pages
const BASE_URL = "/native-pwa/";

// Files to cache immediately
const STATIC_FILES = [
  BASE_URL,
  BASE_URL + "index.html",
  BASE_URL + "manifest.json",
  "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
];

// Install event - cache static resources
self.addEventListener("install", (event) => {
  console.log("Service Worker installing...");

  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log("Caching static files...");
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log("Service Worker installation complete");
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("Service Worker activating...");

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName !== STATIC_CACHE &&
              cacheName !== DYNAMIC_CACHE &&
              cacheName !== CACHE_NAME
            ) {
              console.log("Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log("Service Worker activation complete");
        return self.clients.claim();
      })
  );
});

// Fetch event - handle network requests with cache strategies
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip non-http requests
  if (!request.url.startsWith("http")) {
    return;
  }

  // For GitHub Pages, handle the base URL correctly
  if (url.pathname.startsWith(BASE_URL) || url.origin === location.origin) {
    // Cache first for our own resources
    event.respondWith(
      caches
        .match(request)
        .then((response) => {
          return (
            response ||
            fetch(request).then((fetchResponse) => {
              return caches.open(DYNAMIC_CACHE).then((cache) => {
                cache.put(request, fetchResponse.clone());
                return fetchResponse;
              });
            })
          );
        })
        .catch(() => {
          // If both fail, show offline page
          if (request.headers.get("accept").includes("text/html")) {
            return caches.match(BASE_URL + "index.html");
          }
        })
    );
  }
});

// Create offline page
function createOfflinePage() {
  return new Response(
    `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Offline - John Doe Portfolio</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    height: 100vh;
                    margin: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                }
                .offline-content {
                    max-width: 400px;
                    padding: 2rem;
                }
                .offline-icon {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                }
                h1 {
                    margin-bottom: 1rem;
                    font-size: 2rem;
                }
                p {
                    margin-bottom: 2rem;
                    opacity: 0.9;
                }
                .retry-button {
                    background: rgba(255, 255, 255, 0.2);
                    border: 2px solid white;
                    color: white;
                    padding: 0.8rem 2rem;
                    border-radius: 50px;
                    cursor: pointer;
                    font-size: 1rem;
                    font-weight: 600;
                    transition: all 0.3s ease;
                }
                .retry-button:hover {
                    background: white;
                    color: #667eea;
                }
            </style>
        </head>
        <body>
            <div class="offline-content">
                <div class="offline-icon">🔌</div>
                <h1>You're Offline</h1>
                <p>This page isn't available offline. Please check your internet connection and try again.</p>
                <button class="retry-button" onclick="window.location.reload()">
                    Try Again
                </button>
            </div>
        </body>
        </html>
    `,
    {
      headers: {
        "Content-Type": "text/html",
        "Cache-Control": "no-cache",
      },
    }
  );
}
