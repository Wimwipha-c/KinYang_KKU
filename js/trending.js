/*
 * เมนูยอดฮิตประจำสัปดาห์บนหน้าแรก
 * - ดึงอันดับจากฟังก์ชัน weekly_trending ใน Supabase (รีวิว + ผลเซียมซีใน 7 วันล่าสุด)
 * - ถ้ายังไม่ได้รัน SQL ส่วนนี้ จะนับจากรีวิวที่โหลดมาแล้วอย่างเดียวแทน
 * - ถ้าไม่ได้เชื่อมฐานข้อมูลกลาง จะซ่อนส่วนนี้ (ข้อมูลในเครื่องเดียวไม่ใช่ "ยอดฮิตของชาว มข.")
 */
(function (KY) {
  "use strict";
  const { $, esc, icon } = KY.utils;
  const { CATEGORIES } = KY.data;

  const LIMIT = 5;
  const REVIEW_WEIGHT = 3;   // ต้องตรงกับ weekly_trending ใน supabase/schema.sql
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

  let rows = [], timer = null, seq = 0;

  function fromReviews() {
    const since = Date.now() - WEEK_MS, counts = new Map();
    for (const r of KY.reviews.all()) {
      if (r._local || !(r.createdAt > since)) continue;
      const name = String(r.menu || "").trim();
      if (name) counts.set(name, (counts.get(name) || 0) + 1);
    }
    return [...counts]
      .map(([menu, n]) => ({ menu, reviews: n, draws: 0, score: n * REVIEW_WEIGHT }))
      .sort((a, b) => (b.score - a.score) || a.menu.localeCompare(b.menu, "th"))
      .slice(0, LIMIT);
  }

  async function refresh() {
    const db = KY.db.client;
    const mine = ++seq;   // ถ้ามีการโหลดใหม่ซ้อนเข้ามา ให้ใช้ผลของครั้งล่าสุดเท่านั้น
    let next = [];
    if (db) {
      try {
        const { data, error } = await db.rpc("weekly_trending", { max_rows: LIMIT });
        if (error) throw error;
        next = data.map(r => ({ menu: r.menu, reviews: Number(r.reviews), draws: Number(r.draws), score: Number(r.score) }));
      } catch (e) {
        console.warn("weekly_trending", e && e.message);
        next = fromReviews();
      }
    }
    if (mine !== seq) return;
    rows = next;
    render();
  }

  // รวมการโหลดที่เกิดถี่ๆ (เช่นรีวิวใหม่เข้ามาหลายอันติดกัน) ให้เหลือครั้งเดียว
  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(refresh, 600);
  }

  function itemHtml(r, i) {
    const cat = KY.list.categoryOf({ menu: r.menu });
    const meta = [
      r.reviews ? `${r.reviews} รีวิว` : "",
      r.draws ? `ออกเซียมซี ${r.draws} ครั้ง` : ""
    ].filter(Boolean).join(" · ");
    const inner = `<span class="trend__rank">${i + 1}</span>
      <span class="cat-badge cat-${cat}">${icon(CATEGORIES[cat].icon)}</span>
      <span class="trend__body"><span class="trend__name">${esc(r.menu).replace(/([+/])/g, "$1<wbr>")}</span><span class="trend__meta">${meta}</span></span>`;
    // กดได้เฉพาะเมนูที่มีรีวิว (กดแล้วค้นหารีวิวของเมนูนั้น)
    return r.reviews
      ? `<li><button type="button" class="trend" data-act="trend" data-v="${esc(r.menu)}" aria-label="อันดับ ${i + 1} ${esc(r.menu)}, ${meta} ดูรีวิว">${inner}</button></li>`
      : `<li><div class="trend">${inner}</div></li>`;
  }

  function render() {
    const section = $("#trending");
    if (!section) return;
    section.hidden = !rows.length;
    $("#trendList").innerHTML = rows.map(itemHtml).join("");
  }

  async function recordDraw(menu) {
    const db = KY.db.client;
    if (!db) return;
    try {
      const { error } = await db.from("fortune_draws").insert({ menu });
      if (error) throw error;
      schedule();
    } catch (e) {
      console.warn("record draw", e && e.message);
    }
  }

  KY.trending = { schedule, refresh, recordDraw };
})(window.KY = window.KY || {});
