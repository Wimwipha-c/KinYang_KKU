/* ฟังก์ชันช่วยทั่วไป */
(function (KY) {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ESC[c]);

  // localStorage อาจใช้ไม่ได้ (private mode ฯลฯ) จึงห่อ try/catch ทุกครั้ง
  const storage = {
    get(key, fallback) {
      try {
        const v = localStorage.getItem(key);
        return v == null ? fallback : JSON.parse(v);
      } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
    }
  };

  const reducedMotion = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  const formatDate = ms => {
    try { return new Date(ms).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" }); }
    catch (e) { return ""; }
  };

  const thaiDigits = n => String(n).replace(/\d/g, d => "๐๑๒๓๔๕๖๗๘๙"[d]);

  const hasPrice = p => p !== "" && p != null && isFinite(Number(p));
  const priceSortValue = p => (hasPrice(p) ? Number(p) : Infinity);

  const icon = (name, cls = "") => `<svg class="icon ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;

  const stars = (n, cls = "") => {
    let out = "";
    for (let i = 1; i <= 5; i++) out += icon("star", i <= n ? "is-on" : "");
    return `<span class="stars ${cls}" role="img" aria-label="${n} จาก 5 ดาว">${out}</span>`;
  };

  // วันที่ตามเวลาไทย (UTC+7 ไม่มี daylight saving) ในรูป "YYYY-MM-DD" ใช้นับวันของดวล/สตรีคให้ตรงกันทุกเครื่อง
  const BKK_MS = 7 * 3600 * 1000, DAY_MS = 864e5;
  const bkkDay = (offset = 0) => new Date(Date.now() + BKK_MS + offset * DAY_MS).toISOString().slice(0, 10);
  const msToBkkMidnight = () => DAY_MS - ((Date.now() + BKK_MS) % DAY_MS);

  KY.utils = { $, $$, esc, storage, reducedMotion, sleep, pick, formatDate, thaiDigits, hasPrice, priceSortValue, icon, stars, bkkDay, msToBkkMidnight };
})(window.KY = window.KY || {});
