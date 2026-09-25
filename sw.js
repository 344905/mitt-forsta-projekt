// Service worker: sparar alla spelets filer i telefonens cache första
// gången sidan öppnas, så att spelet fungerar även utan internet sen.
// CACHE_NAME höjs varje gång sparade filer ändras i grunden — det tvingar
// gamla telefoner att kasta sin gamla cache och hämta allt på nytt.
const CACHE_NAME = "luffarschack-v15";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./stars.js",
  "./sound.js",
  "./journey.js",
  "./hangman.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Nätverk-först: hämta alltid senaste versionen när telefonen har
// internet (och spara den nya kopian i cachen). Bara om nätverket
// misslyckas (t.ex. offline) används den sparade kopian som reserv.
// "cache: no-store" är viktigt här — annars kan även fetch() i sig
// få en gammal kopia från webbläsarens EGEN nätverkscache istället
// för att faktiskt fråga servern på nytt.
self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request, { cache: "no-store" })
      .then((response) => {
        const responseCopy = response.clone();
        // Att spara i cachen är en bonus, inte ett krav — misslyckas det
        // (t.ex. fullt lagringsutrymme) ska sidan ändå fungera.
        caches
          .open(CACHE_NAME)
          .then((cache) => cache.put(event.request, responseCopy))
          .catch(() => {});
        return response;
      })
      .catch(() =>
        // Offline: använd den sparade kopian. Finns ingen sådan måste vi
        // svara med ett riktigt fel — respondWith(undefined) kraschar.
        caches.match(event.request).then((cached) => cached || Response.error())
      )
  );
});
