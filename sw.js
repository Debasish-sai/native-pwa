const CACHE_NAME = "john-doe-portfolio-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "https://cdnjs.cloudflare.com/ajax/libs/tailwindcss/2.2.19/tailwind.min.css",
  "https://placehold.co/150x150/2563eb/ffffff?text=JD",
  "https://placehold.co/192x192/1e40af/ffffff?text=JD",
  "https://placehold.co/512x512/1e40af/ffffff?text=JD",
];

self.addEventListener("install", (event) => {
  // Perform installation steps
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Opened cache");
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Cache hit - return response
      if (response) {
        return response;
      }
      return fetch(event.request);
    })
  );
});
