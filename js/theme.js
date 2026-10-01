/* สลับธีมสว่าง/มืด — ครั้งแรกตามการตั้งค่าของอุปกรณ์ เมื่อผู้ใช้กดเลือกจะจำค่าไว้ */
(function (KY) {
  "use strict";
  const { $, $$, storage } = KY.utils;
  const root = document.documentElement;
  const BAR_COLORS = { light: "#F6F1E9", dark: "#15110E" };
  const systemDark = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null;

  const current = () => root.getAttribute("data-theme") || (systemDark && systemDark.matches ? "dark" : "light");

  function sync() {
    const theme = current();
    const btn = $("#themeBtn");
    if (btn) btn.setAttribute("aria-label", theme === "dark" ? "เปลี่ยนเป็นธีมสว่าง" : "เปลี่ยนเป็นธีมมืด");
    // สีแถบเบราว์เซอร์บนมือถือ: ถ้าผู้ใช้เลือกเอง ให้ทับค่าตามระบบ
    if (root.hasAttribute("data-theme")) {
      $$('meta[name="theme-color"]').forEach(m => m.setAttribute("content", BAR_COLORS[theme]));
    }
  }

  function toggle() {
    const next = current() === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    storage.set("kky_theme", next);
    sync();
  }

  if (systemDark && systemDark.addEventListener) systemDark.addEventListener("change", sync);
  sync();

  KY.theme = { toggle };
})(window.KY = window.KY || {});
