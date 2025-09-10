// Service Worker for John Doe Portfolio PWA
const CACHE_NAME = "portfolio-v1.0.1";
const STATIC_CACHE = "static-v1.0.1";
const DYNAMIC_CACHE = "dynamic-v1.0.1";

// Files to cache immediately
const STATIC_FILES = [
  "/",
  "/index.html",
  "/manifest.json",
  "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap",
];

// Files to cache on demand
const DYNAMIC_FILES = [
  "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2",
];

// Install event - cache static resources
self.addEventListener("install", (event) => {
  console.log("Service Worker installing...");

  event.waitUntil(
    Promise.all([
      // Cache static files
      caches.open(STATIC_CACHE).then((cache) => {
        console.log("Caching static files...");
        return Promise.allSettled(
          STATIC_FILES.map((url) =>
            cache.add(url).catch((err) => {
              console.warn(`Failed to cache ${url}:`, err);
              return Promise.resolve(); // Don't fail the whole operation
            })
          )
        );
      }),

      // Prepare dynamic cache
      caches.open(DYNAMIC_CACHE).then((cache) => {
        console.log("Dynamic cache ready");
        return cache;
      }),
    ]).then(() => {
      console.log("Service Worker installation complete");
      // Force the waiting service worker to become the active service worker
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches and take control
self.addEventListener("activate", (event) => {
  console.log("Service Worker activating...");

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
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
      }),

      // Take control of all clients immediately
      self.clients.claim(),
    ]).then(() => {
      console.log("Service Worker activation complete");
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

  // Skip Chrome extension requests
  if (url.protocol === "chrome-extension:") {
    return;
  }

  // Different strategies for different types of requests
  if (isStaticAsset(request)) {
    // Cache first for static assets
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
  } else if (isFont(request)) {
    // Cache first for fonts
    event.respondWith(cacheFirstStrategy(request, DYNAMIC_CACHE));
  } else if (isAPIRequest(request)) {
    // Network first for API requests
    event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE));
  } else {
    // Stale while revalidate for other requests
    event.respondWith(staleWhileRevalidateStrategy(request, DYNAMIC_CACHE));
  }
});

// Cache-first strategy (good for static assets)
async function cacheFirstStrategy(request, cacheName) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log("Serving from cache:", request.url);
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error("Cache-first strategy failed:", error);

    // Return offline page for navigation requests
    if (request.destination === "document") {
      return createOfflinePage();
    }

    // Return a basic response for other requests
    return new Response("Offline", {
      status: 503,
      statusText: "Service Unavailable",
    });
  }
}

// Network-first strategy (good for API requests)
async function networkFirstStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log("Network failed, trying cache:", request.url);

    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    throw error;
  }
}

// Stale-while-revalidate strategy (good for frequently updated content)
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cachedResponse = await caches.match(request);

  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.status === 200) {
        const cache = caches.open(cacheName);
        cache.then((c) => c.put(request, networkResponse.clone()));
      }
      return networkResponse;
    })
    .catch((error) => {
      console.warn("Network request failed:", error);
      return cachedResponse || createOfflinePage();
    });

  // Return cached version immediately if available, otherwise wait for network
  return cachedResponse || fetchPromise;
}

// Helper functions to determine request types
function isStaticAsset(request) {
  const url = new URL(request.url);
  return (
    url.pathname === "/" ||
    url.pathname === "/index.html" ||
    url.pathname === "/manifest.json" ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico")
  );
}

function isFont(request) {
  const url = new URL(request.url);
  return (
    url.hostname === "fonts.googleapis.com" ||
    url.hostname === "fonts.gstatic.com" ||
    url.pathname.endsWith(".woff") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".ttf") ||
    url.pathname.endsWith(".otf")
  );
}

function isAPIRequest(request) {
  const url = new URL(request.url);
  return (
    url.pathname.startsWith("/api/") || url.hostname !== self.location.hostname
  );
}

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

// Background sync for form submissions
self.addEventListener("sync", (event) => {
  console.log("Background sync triggered:", event.tag);

  if (event.tag === "contact-form-sync") {
    event.waitUntil(syncContactForm());
  }
});

// Sync contact form data when back online
async function syncContactForm() {
  try {
    // Get pending form data from IndexedDB or cache
    // This would be implemented based on your form handling needs
    console.log("Syncing contact form data...");

    // Example: Send cached form data to server
    // const formData = await getPendingFormData();
    // await fetch('/api/contact', { method: 'POST', body: formData });

    console.log("Contact form sync completed");
  } catch (error) {
    console.error("Contact form sync failed:", error);
    throw error; // This will cause the sync to retry
  }
}

// Push notifications
self.addEventListener("push", (event) => {
  console.log("Push notification received:", event);

  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || "New update available!",
      icon: "/manifest-icon-192.png",
      badge: "/manifest-icon-96.png",
      image: data.image,
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey || 1,
        url: data.url || "/",
      },
      actions: [
        {
          action: "explore",
          title: "View",
          icon: "/manifest-icon-96.png",
        },
        {
          action: "close",
          title: "Close",
          icon: "/manifest-icon-96.png",
        },
      ],
      requireInteraction: true,
      silent: false,
    };

    event.waitUntil(
      self.registration.showNotification(
        data.title || "Portfolio Update",
        options
      )
    );
  }
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event);

  event.notification.close();

  if (event.action === "explore") {
    const urlToOpen = event.notification.data?.url || "/";

    event.waitUntil(
      clients.matchAll({ type: "window" }).then((clientList) => {
        // Check if there's already a window/tab open with the target URL
        for (const client of clientList) {
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }

        // If not, open a new window/tab
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  }
});

// Handle messages from the main thread
self.addEventListener("message", (event) => {
  console.log("Service Worker received message:", event.data);

  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  if (event.data && event.data.type === "GET_VERSION") {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Periodic background sync (for supporting browsers)
self.addEventListener("periodicsync", (event) => {
  console.log("Periodic sync triggered:", event.tag);

  if (event.tag === "portfolio-sync") {
    event.waitUntil(performPeriodicSync());
  }
});

// Perform periodic sync tasks
async function performPeriodicSync() {
  try {
    // Update cache with fresh content
    console.log("Performing periodic sync...");

    // You could fetch updated portfolio data, check for new projects, etc.
    // await fetch('/api/portfolio-updates');

    console.log("Periodic sync completed");
  } catch (error) {
    console.error("Periodic sync failed:", error);
  }
}

// Share target handling (if you add share functionality)
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Handle share target
  if (url.pathname === "/share-target" && event.request.method === "POST") {
    event.respondWith(handleShareTarget(event.request));
  }
});

// Handle shared content
async function handleShareTarget(request) {
  try {
    const formData = await request.formData();
    const title = formData.get("title");
    const text = formData.get("text");
    const url = formData.get("url");

    console.log("Shared content:", { title, text, url });

    // Store shared content or redirect to appropriate page
    return Response.redirect("/?shared=true", 303);
  } catch (error) {
    console.error("Share target handling failed:", error);
    return Response.redirect("/", 303);
  }
}

// Clean up resources and logs
console.log("Service Worker script loaded successfully");
console.log("Cache version:", CACHE_NAME);
console.log("Static files to cache:", STATIC_FILES.length);
