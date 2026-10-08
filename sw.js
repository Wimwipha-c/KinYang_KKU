/*
 * Service worker ของกินหยัง KKU: ทำให้ติดตั้งเป็นแอปได้ และเปิดหน้าเว็บได้แม้เน็ตหลุด
 * ใช้ network-first: ออนไลน์จะได้ไฟล์ล่าสุดเสมอ (ไม่ค้างเวอร์ชันเก่าหลัง deploy) ออฟไลน์ค่อยใช้ของที่เก็บไว้
 * ไม่ยุ่งกับคำขอไปโดเมนอื่น (Supabase, Google, ฟอนต์)
 * เปลี่ยน CACHE เมื่ออยากล้างแคชเก่าทั้งหมด
 */
const CACHE = "kinyang-v4";
const SHELL = [
  "./", "index.html", "manifest.webmanifest", "assets/favicon.svg", "assets/icons/icon-192.png",
  "css/tokens.css", "css/base.css", "css/layout.css", "css/components.css", "css/fortune.css",
  "js/config.js", "js/data.js", "js/utils.js", "js/ui.js", "js/theme.js", "js/sound.js", "js/db.js", "js/auth.js",
  "js/reviews-store.js", "js/review-list.js", "js/trending.js", "js/favorites.js", "js/report.js", "js/profile.js",
  "js/account.js", "js/streak.js", "js/duel.js", "js/pwa.js", "js/share-image.js", "js/fortune.js", "js/review-form.js", "js/main.js"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req)
      .then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match("index.html")))
  );
});
