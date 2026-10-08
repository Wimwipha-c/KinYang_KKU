/*
 * ติดตั้งเป็นแอปบนหน้าจอหลัก (PWA)
 * - Android/Chrome: ใช้ปุ่มติดตั้งของเบราว์เซอร์ (beforeinstallprompt)
 * - iPhone/iPad: Safari ไม่มีปุ่มติดตั้งอัตโนมัติ จึงแสดงวิธีเพิ่มไปยังหน้าจอโฮมแทน
 * การ์ดชวนติดตั้งปิดได้ และจะไม่แสดงอีก 14 วัน
 */
(function (KY) {
  "use strict";
  const { $, storage } = KY.utils;
  const DISMISS_KEY = "kky_install_dismissed";
  const SNOOZE_MS = 14 * 864e5;

  let deferred = null;
  const standalone = () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(e => console.warn("sw", e)));
  }

  function show() {
    const card = $("#installCard");
    if (!card) return;
    const snoozed = Date.now() - storage.get(DISMISS_KEY, 0) < SNOOZE_MS;
    card.hidden = standalone() || snoozed || !(deferred || isIOS);
  }

  window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); deferred = e; show(); });
  window.addEventListener("appinstalled", () => { deferred = null; show(); KY.ui.toast("ติดตั้งกินหยังบนหน้าจอแล้ว"); });

  async function install() {
    if (deferred) {
      deferred.prompt();
      const { outcome } = await deferred.userChoice;
      deferred = null;
      if (outcome !== "accepted") storage.set(DISMISS_KEY, Date.now());
      show();
      return;
    }
    await KY.ui.confirm({
      title: "ติดตั้งบน iPhone / iPad",
      body: "1. เปิดเว็บนี้ใน <b>Safari</b><br>2. แตะปุ่ม <b>แชร์</b> (สี่เหลี่ยมมีลูกศรชี้ขึ้น)<br>3. เลือก <b>“เพิ่มไปยังหน้าจอโฮม”</b>",
      confirmText: "เข้าใจแล้ว", cancelText: null, iconName: "logo"
    });
  }

  function dismiss() { storage.set(DISMISS_KEY, Date.now()); show(); }

  show();
  KY.pwa = { install, dismiss };
})(window.KY = window.KY || {});
