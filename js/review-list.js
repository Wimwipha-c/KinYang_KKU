/* ส่วนแสดงรายการรีวิว ตัวกรอง และสถิติบนหน้าแรก */
(function (KY) {
  "use strict";
  const { $, esc, icon, stars, formatDate, hasPrice, priceSortValue } = KY.utils;
  const { AREAS, LOCATIONS, CATEGORIES, MENUS, findMenu } = KY.data;

  const view = { loc: "all", area: "", q: "", sort: "new" };

  function categoryOf(review) {
    if (review.cat && CATEGORIES[review.cat]) return review.cat;
    const m = findMenu(review.menu);
    return m ? m.cat : "other";
  }

  function matches(r) {
    if (view.loc !== "all" && r.loc !== view.loc) return false;
    if (view.area && r.area !== view.area) return false;
    const q = view.q.trim().toLowerCase();
    if (q && !`${r.menu} ${r.shop} ${r.text} ${r.area}`.toLowerCase().includes(q)) return false;
    return true;
  }

  function sortRows(rows) {
    const byNew = (a, b) => b.createdAt - a.createdAt;
    const cmp = {
      top: (a, b) => (b.rating - a.rating) || byNew(a, b),
      cheap: (a, b) => (priceSortValue(a.price) - priceSortValue(b.price)) || byNew(a, b),
      new: byNew
    }[view.sort] || byNew;
    return rows.sort(cmp);
  }

  /* ---------- ตัวกรอง ---------- */
  function renderFilters(all) {
    const count = loc => all.filter(r => loc === "all" || r.loc === loc).length;
    $("#locSeg").innerHTML = [["all", "ทั้งหมด"], ["in", LOCATIONS.in], ["out", LOCATIONS.out]]
      .map(([k, label]) => `<button type="button" class="seg-btn" data-act="loc" data-v="${k}" aria-pressed="${view.loc === k}">${label}<span class="seg-count">${count(k)}</span></button>`)
      .join("");

    const groups = view.loc === "all" ? ["in", "out"] : [view.loc];
    const option = (loc, a) => {
      const n = all.filter(r => r.loc === loc && r.area === a).length;
      const v = `${loc}|${a}`;
      return `<option value="${esc(v)}"${view.area === a ? " selected" : ""}>${esc(a)}${n ? ` (${n})` : ""}</option>`;
    };
    $("#areaSel").innerHTML = `<option value="">ทุกคณะและโซน</option>` +
      groups.map(loc => `<optgroup label="${LOCATIONS[loc]}">${AREAS[loc].map(a => option(loc, a)).join("")}</optgroup>`).join("");

    const active = view.loc !== "all" || view.area || view.q.trim();
    $("#clearBtn").hidden = !active;
  }

  /* ---------- การ์ดรีวิว ---------- */
  function cardHtml(r) {
    const cat = categoryOf(r);
    const rating = Number(r.rating) || 0;
    const long = (r.text || "").length > 120;
    return `<article class="review-card">
      <div class="review-card__top">
        <span class="cat-badge cat-${cat}" title="${esc(CATEGORIES[cat].label)}">${icon(CATEGORIES[cat].icon)}</span>
        <div class="review-card__place">
          <span class="review-card__area">${esc(r.area || "")}</span>
          <span class="review-card__loc">${r.loc === "out" ? LOCATIONS.out : LOCATIONS.in}</span>
        </div>
        <div class="review-card__rating">${stars(rating)}<span class="review-card__score">${rating.toFixed(1)}</span></div>
      </div>
      <h3 class="review-card__title">${esc(r.menu)}</h3>
      <p class="review-card__shop">${esc(r.shop || "")}</p>
      <p class="review-card__text">${esc(r.text || "")}</p>
      ${long ? `<button type="button" class="text-btn" data-act="more" aria-expanded="false">อ่านต่อ</button>` : ""}
      <div class="review-card__foot">
        <span class="review-card__by"><span class="avatar" aria-hidden="true">${esc((r.name || "ม").trim().charAt(0))}</span>${esc(r.name || "เพื่อน มข.")} · ${formatDate(r.createdAt)}${r._local ? ` · <span class="muted">ในเครื่องนี้</span>` : ""}</span>
        ${hasPrice(r.price) ? `<span class="price">฿${esc(r.price)}</span>` : ""}
      </div>
    </article>`;
  }

  function emptyState({ iconName, title, body, actions }) {
    return `<div class="empty-state">
      <span class="empty-state__icon">${icon(iconName)}</span>
      <h3>${title}</h3><p>${body}</p>
      <div class="empty-state__actions">${actions}</div>
    </div>`;
  }

  function renderList(all) {
    const list = $("#list"), count = $("#count"), note = $("#note");
    const st = KY.reviews.state;
    note.hidden = true;

    if (st.status === "loading") {
      count.textContent = "กำลังโหลดรีวิว…";
      list.innerHTML = `<div class="review-grid">${'<div class="skeleton"></div>'.repeat(6)}</div>`;
      return;
    }
    if (st.status === "error") {
      count.textContent = "";
      list.innerHTML = emptyState({
        iconName: "alert", title: "โหลดรีวิวไม่สำเร็จ", body: "เชื่อมต่อข้อมูลไม่ได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง",
        actions: `<button class="btn btn-primary" data-act="retry">${icon("refresh")}ลองใหม่</button>
                  <button class="btn btn-secondary" data-act="fortune">เสี่ยงเซียมซีไปก่อน</button>`
      });
      return;
    }

    if (!st.shared && all.length) {
      note.hidden = false;
      note.innerHTML = `${icon("info")}<span>รีวิวของคุณบันทึกไว้ในอุปกรณ์นี้เท่านั้น ผู้ใช้คนอื่นจะยังมองไม่เห็น</span>`;
    }

    if (!all.length) {
      count.textContent = "ยังไม่มีรีวิว";
      list.innerHTML = emptyState({
        iconName: "noodle", title: "ยังไม่มีรีวิวในตอนนี้", body: "มาเป็นคนแรกที่แนะนำร้านโปรดให้เพื่อน มข. หรือให้เซียมซีช่วยเลือกเมนูก่อนก็ได้",
        actions: `<button class="btn btn-primary" data-act="review">${icon("pen")}เขียนรีวิวแรก</button>
                  <button class="btn btn-secondary" data-act="fortune">${icon("sticks")}เสี่ยงเซียมซี</button>`
      });
      return;
    }

    const rows = sortRows(all.filter(matches));
    count.textContent = rows.length === all.length ? `${all.length} รีวิว` : `แสดง ${rows.length} จาก ${all.length} รีวิว`;
    if (!rows.length) {
      list.innerHTML = emptyState({
        iconName: "search", title: "ไม่พบรีวิวที่ตรงกับเงื่อนไข", body: "ลองเปลี่ยนคำค้นหา หรือล้างตัวกรองเพื่อดูรีวิวทั้งหมด",
        actions: `<button class="btn btn-secondary" data-act="clear">ล้างตัวกรอง</button>`
      });
      return;
    }
    list.innerHTML = `<div class="review-grid">${rows.map(cardHtml).join("")}</div>`;
  }

  function renderStats(all) {
    $("#statReviews").textContent = all.length.toLocaleString("th-TH");
    $("#statMenus").textContent = MENUS.length;
    $("#statAreas").textContent = AREAS.in.length + AREAS.out.length - 2; // ไม่นับ "อื่นๆ"
  }

  function render() {
    const all = KY.reviews.all();
    renderFilters(all);
    renderList(all);
    renderStats(all);
  }

  function setLocation(loc) { view.loc = loc; view.area = ""; render(); }
  function setArea(value) {
    if (!value) { view.area = ""; }
    else { const [loc, area] = value.split("|"); view.loc = loc; view.area = area; }
    render();
  }
  function setQuery(q) { view.q = q; render(); }
  // ค้นหาจากภายนอก (เช่นกดเมนูยอดฮิต): ล้างตัวกรองอื่นแล้วใส่คำค้นในช่องค้นหา
  function search(q) {
    Object.assign(view, { loc: "all", area: "", q });
    $("#q").value = q;
    render();
  }
  function setSort(s) { view.sort = s; render(); }
  function clear() {
    Object.assign(view, { loc: "all", area: "", q: "" });
    $("#q").value = "";
    render();
  }

  KY.list = { render, setLocation, setArea, setQuery, search, setSort, clear, categoryOf };
})(window.KY = window.KY || {});
