/* เซียมซีกินหยัง: สุ่มเมนูพร้อมคำทำนาย */
(function (KY) {
  "use strict";
  const { $, esc, icon, storage, sleep, pick, reducedMotion, thaiDigits } = KY.utils;
  const { AREAS, LOCATIONS, MENUS, CATEGORIES, LUCKY_COLORS, FORTUNE_FILTERS } = KY.data;
  const { toast, openModal, closeModal } = KY.ui;

  const fs = {
    step: "pick",                         // pick | shake | result
    area: storage.get("kky_area", ""),    // "in|คณะ..." หรือ ""
    filters: new Set(),
    current: null,
    dailyBadge: false
  };

  const areaName = v => (v ? v.split("|")[1] : "");
  const areaLoc = v => (v && v.startsWith("out|") ? "out" : "in");
  const isGenericArea = a => !a || a.startsWith("อื่นๆ");

  function areaSelect(id, value) {
    const group = loc => `<optgroup label="${LOCATIONS[loc]}">${AREAS[loc].map(a => {
      const v = `${loc}|${a}`;
      return `<option value="${esc(v)}"${value === v ? " selected" : ""}>${esc(a)}</option>`;
    }).join("")}</optgroup>`;
    return `<select id="${id}" class="input"><option value="">ไม่ระบุ</option>${group("in")}${group("out")}</select>`;
  }

  const header = (title, sub) => `<div class="modal__head">
      <div><h2 class="modal__title" id="fortuneTitle">${title}</h2>${sub ? `<p class="modal__sub">${sub}</p>` : ""}</div>
      <button type="button" class="icon-btn" data-act="close-fortune" aria-label="ปิด">${icon("close")}</button>
    </div>`;

  function slipHtml(c) {
    const m = c.menu, cat = CATEGORIES[m.cat];
    const spice = Array.from({ length: 5 }, (_, i) => `<i class="${i < m.spice ? "is-on" : ""}"></i>`).join("");
    return `<div class="slip">
      <div class="slip__inner">
        <div class="slip__head"><span>เซียมซีกินหยัง</span><span>ใบที่ ${thaiDigits(c.number)}</span></div>
        <div class="slip__body">
          ${fs.dailyBadge ? `<span class="slip__badge">ดวงกินประจำวัน</span>` : `<span class="slip__kicker">${esc(cat.label)}</span>`}
          <span class="cat-badge cat-badge--lg cat-${m.cat}">${icon(cat.icon)}</span>
          <p class="slip__menu">${esc(m.name)}</p>
          <p class="slip__verse">${esc(c.line)}</p>
        </div>
        <dl class="slip__facts">
          <div><dt>สีมงคล</dt><dd><i class="swatch" style="background:${c.color[1]}"></i>${c.color[0]}</dd></div>
          <div><dt>เลขนำโชค</dt><dd>${c.number}</dd></div>
          <div><dt>ความเผ็ด</dt><dd><span class="spice" role="img" aria-label="${m.spice} จาก 5">${spice}</span></dd></div>
        </dl>
      </div>
    </div>`;
  }

  function render() {
    const body = $("#fortuneBody");

    if (fs.step === "pick") {
      body.innerHTML = header("เสี่ยงเซียมซีกินหยัง", "เลือกพื้นที่และสไตล์ที่อยากกิน แล้วให้เซียมซีช่วยตัดสินใจ") + `
        <div class="modal__content">
          <div class="field">
            <label class="field__label" for="fortuneArea">คุณอยู่แถวไหน</label>
            ${areaSelect("fortuneArea", fs.area)}
            <p class="field__hint">ใช้สำหรับค้นหาร้านใกล้คุณใน Google Maps</p>
          </div>
          <div class="field">
            <span class="field__label">สไตล์ที่อยากกิน <span class="muted">(เลือกได้หลายข้อ)</span></span>
            <div class="toggle-group">${FORTUNE_FILTERS.map(([k, l]) =>
              `<button type="button" class="toggle" data-act="fortune-filter" data-v="${k}" aria-pressed="${fs.filters.has(k)}">${icon("check", "toggle__check")}${l}</button>`).join("")}
            </div>
          </div>
        </div>
        <div class="modal__foot">
          <button type="button" class="btn btn-primary btn-lg btn-block" data-act="shake">${icon("sticks")}เขย่าเซียมซี</button>
          <p class="fineprint">คำทำนายมีไว้เพื่อความบันเทิงเท่านั้น</p>
        </div>`;
      return;
    }

    if (fs.step === "shake") {
      body.innerHTML = `<div class="modal__content shake-stage">
          <h2 class="modal__title" id="fortuneTitle">กำลังเขย่าเซียมซี…</h2>
          <div class="shaker" aria-hidden="true">
            <div class="shaker__sticks"><i></i><i></i><i></i><i></i><i></i></div>
            <div class="shaker__tube is-shaking" id="tube"><span>กินหยัง</span></div>
            <div class="shaker__drop" id="drop"></div>
          </div>
          <p class="modal__sub">ตั้งจิตให้มั่น แล้วรอดูว่าวันนี้จะได้กินอะไร</p>
        </div>`;
      return;
    }

    const m = fs.current.menu;
    const a = areaName(fs.area);
    const near = isGenericArea(a) ? "มหาวิทยาลัยขอนแก่น" : `${a} มหาวิทยาลัยขอนแก่น`;
    const mapsUrl = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(`${m.name} ใกล้ ${near}`);
    body.innerHTML = header("ผลเสี่ยงเซียมซี", "") + `
      <div class="modal__content">
        ${slipHtml(fs.current)}
        <p class="callout">${icon("pin")}<span>${isGenericArea(a) ? "ลองหาร้านแถวมหาวิทยาลัย" : `ลองหาร้านใกล้ <b>${esc(a)}</b>`} แล้วกลับมาเขียนรีวิวให้เพื่อนๆ ด้วย</span></p>
      </div>
      <div class="modal__foot">
        <a class="btn btn-primary btn-lg btn-block" href="${mapsUrl}" target="_blank" rel="noopener noreferrer">${icon("map")}ค้นหาร้านใน Google Maps</a>
        <button type="button" class="btn btn-secondary btn-block" data-act="review-from-fortune">${icon("pen")}กินแล้ว เขียนรีวิวเลย</button>
        <div class="btn-row">
          <button type="button" class="btn btn-ghost" data-act="shake">${icon("refresh")}สุ่มใหม่</button>
          <button type="button" class="btn btn-ghost" data-act="fortune-change">${icon("sliders")}เปลี่ยนตัวเลือก</button>
          <button type="button" class="btn btn-ghost" data-act="fortune-share">${icon("share")}แชร์</button>
        </div>
      </div>`;
  }

  function open() {
    fs.step = fs.current ? "result" : "pick";
    render();
    openModal("fortuneModal", fs.step === "pick" ? "#fortuneArea" : ".modal__foot .btn");
  }
  const close = () => closeModal("fortuneModal");

  function toggleFilter(btn, key) {
    fs.filters.has(key) ? fs.filters.delete(key) : fs.filters.add(key);
    btn.setAttribute("aria-pressed", String(fs.filters.has(key)));
  }

  function change() { fs.step = "pick"; render(); const s = $("#fortuneArea"); if (s) s.focus(); }

  async function shake() {
    try {
      const sel = $("#fortuneArea");
      if (sel) { fs.area = sel.value; storage.set("kky_area", fs.area); }
      fs.step = "shake"; render();
      await sleep(reducedMotion ? 300 : 1600);
      const tube = $("#tube"), drop = $("#drop");
      if (tube) tube.classList.remove("is-shaking");
      if (drop && !reducedMotion) drop.classList.add("is-dropping");
      await sleep(reducedMotion ? 0 : 650);

      // หลีกเลี่ยงเมนูที่เพิ่งสุ่มได้ 3 ครั้งล่าสุด
      const history = storage.get("kky_hist", []);
      const pool = MENUS.filter(m => [...fs.filters].every(t => m.tags.includes(t)));
      let candidates = pool.filter(m => !history.includes(m.name));
      if (!candidates.length) candidates = pool.length ? pool : MENUS;
      const menu = pick(candidates);
      storage.set("kky_hist", [menu.name, ...history].slice(0, 3));

      const today = new Date().toDateString();
      fs.dailyBadge = storage.get("kky_day", "") !== today;
      if (fs.dailyBadge) storage.set("kky_day", today);

      fs.current = { menu, line: pick(menu.lines), color: pick(LUCKY_COLORS), number: 1 + Math.floor(Math.random() * 99) };
      fs.step = "result"; render();
      const body = $("#fortuneBody"); body.scrollTop = 0;
      const first = body.querySelector(".modal__foot .btn"); if (first) first.focus({ preventScroll: true });
    } catch (e) {
      console.error("fortune", e);
      fs.step = "pick"; render(); toast("สุ่มไม่สำเร็จ กรุณาลองใหม่");
    }
  }

  async function share() {
    const c = fs.current; if (!c) return;
    const text = `ดวงกินวันนี้ของฉัน: ${c.menu.name}\n“${c.line}”\nสีมงคล ${c.color[0]} · เลขนำโชค ${c.number}\n— กินหยัง KKU`;
    try {
      if (navigator.share) { await navigator.share({ text }); return; }
    } catch (e) { if (e && e.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(text); toast("คัดลอกคำทำนายแล้ว"); }
    catch (e) { toast("ไม่สามารถแชร์ได้ในขณะนี้"); }
  }

  // ข้อมูลสำหรับเปิดฟอร์มรีวิวต่อจากผลเซียมซี
  function reviewPrefill() {
    if (!fs.current) return {};
    return { menu: fs.current.menu.name, cat: fs.current.menu.cat, loc: areaLoc(fs.area), area: areaName(fs.area) };
  }

  KY.fortune = { open, close, shake, change, share, toggleFilter, reviewPrefill, areaName, areaLoc };
})(window.KY = window.KY || {});
