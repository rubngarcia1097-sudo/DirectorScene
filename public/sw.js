/**
 * Service worker de DirectorScene: dos estrategias, no una para toda la app.
 *
 * - Binarios de MediaPipe (WASM propio en /mediapipe/** y modelos .task del
 *   bucket público de Google): pesan varios MB, no cambian salvo que se
 *   actualice el paquete o el modelo, y son justo lo que hace lenta (o
 *   inviable sin cobertura) la primera carga al grabar fuera de casa. Se
 *   sirven "cache-first": una vez descargados una vez, nunca se vuelven a
 *   pedir hasta que cambie el nombre de esta caché.
 * - Todo lo demás del propio origen (HTML, JS/CSS de Next.js): "network-first"
 *   para que nadie quede atrapado en una versión vieja de la app; la caché
 *   solo actúa de respaldo cuando no hay red.
 *
 * Nunca intercepta peticiones a Supabase (otro origen, no es un asset de
 * MediaPipe): la auth y los presets siempre van directos a la red.
 */
const MODELS_CACHE = "directorscene-models-v1";
const SHELL_CACHE = "directorscene-shell-v1";
const CURRENT_CACHES = [MODELS_CACHE, SHELL_CACHE];

const MODEL_HOSTS = new Set(["storage.googleapis.com"]);

// `/director` es la propia app, no un enlace que alguien siga necesariamente
// antes de perder la cobertura: si no se precachea aquí, la primera vez que
// alguien vuelve sin red se encuentra la navegación fallando (net::ERR_FAILED)
// antes incluso de llegar al código de la cámara, porque la página en sí
// nunca llegó a pasar por el "network-first" de abajo. Se piden a mano en vez
// de con `cache.addAll` para que un solo fallo no tumbe el resto.
const PRECACHE_URLS = ["/", "/director", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all(
      PRECACHE_URLS.map((url) =>
        fetch(url)
          .then((response) => {
            if (!response.ok) return;
            return caches.open(SHELL_CACHE).then((cache) => cache.put(url, response));
          })
          .catch(() => {}),
      ),
    ),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => !CURRENT_CACHES.includes(key)).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isModelAsset(url) {
  return url.pathname.startsWith("/mediapipe/") || MODEL_HOSTS.has(url.hostname);
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (isModelAsset(url)) {
    event.respondWith(cacheFirst(request, MODELS_CACHE));
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(request, SHELL_CACHE));
  }
});
