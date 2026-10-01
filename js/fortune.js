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
      <div class="modal__actions">${soundButton()}
        <button type="button" class="icon-btn" data-act="close-fortune" aria-label="ปิด">${icon("close")}</button>
      </div>
    </div>`;

  const soundButton = () => {
    const on = KY.sound.isEnabled();
    return `<button type="button" class="icon-btn" id="soundBtn" data-act="sound" aria-pressed="${on}" aria-label="เสียงเซียมซี">${icon(on ? "volume" : "volume-off")}</button>`;
  };

  function toggleSound() {
    KY.sound.toggle();
    const btn = $("#soundBtn");
    if (btn) btn.outerHTML = soundButton();
    const fresh = $("#soundBtn"); if (fresh) fresh.focus();
  }

  // badge: ข้อความป้ายด้านบน (ถ้าไม่ใส่จะแสดงชื่อหมวดอาหาร), cls: class เพิ่มของใบ
  function slipHtml(c, { badge = "", cls = "" } = {}) {
    const m = c.menu, cat = CATEGORIES[m.cat];
    const spice = Array.from({ length: 5 }, (_, i) => `<i class="${i < m.spice ? "is-on" : ""}"></i>`).join("");
    return `<div class="slip ${cls}">
      <div class="slip__inner">
        <div class="slip__head"><span>เซียมซีกินหยัง</span><span>ใบที่ ${thaiDigits(c.number)}</span></div>
        <div class="slip__body">
          ${badge ? `<span class="slip__badge">${badge}</span>` : `<span class="slip__kicker">${esc(cat.label)}</span>`}
          <span class="cat-badge cat-badge--lg cat-${m.cat}">${icon(cat.icon)}</span>
          <p class="slip__menu">${esc(m.name).replace(/([+/])/g, "$1<wbr>")}</p>
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
        ${slipHtml(fs.current, { badge: fs.dailyBadge ? "ดวงกินประจำวัน" : "" })}
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
    if (fs.step === "result") prepareImage();
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
      const shakeMs = reducedMotion ? 300 : 1600;
      KY.sound.rattle(shakeMs / 1000);   // ต้องเรียกก่อน await แรก เพื่อให้นับเป็นการกดของผู้ใช้
      await sleep(shakeMs);
      const tube = $("#tube"), drop = $("#drop");
      if (tube) tube.classList.remove("is-shaking");
      if (drop && !reducedMotion) drop.classList.add("is-dropping");
      KY.sound.drop();
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

      fs.current = randomFortune(menu);
      if (fs.dailyBadge && KY.trending) KY.trending.recordDraw(menu.name);   // นับเข้ายอดฮิตแค่ครั้งแรกของวัน
      saveToday();
      renderHero();
      fs.step = "result"; render();
      KY.sound.chime();
      prepareImage();
      const body = $("#fortuneBody"); body.scrollTop = 0;
      const first = body.querySelector(".modal__foot .btn"); if (first) first.focus({ preventScroll: true });
    } catch (e) {
      console.error("fortune", e);
      fs.step = "pick"; render(); toast("สุ่มไม่สำเร็จ กรุณาลองใหม่");
    }
  }

  /* ---------- ดวงของวันนี้ และใบเซียมซีหน้าแรก ---------- */
  const TODAY_KEY = "kky_today";
  const todayStr = () => new Date().toDateString();
  let heroSample = null;

  function randomFortune(menu = pick(MENUS)) {
    return { menu, line: pick(menu.lines), color: pick(LUCKY_COLORS), number: 1 + Math.floor(Math.random() * 99) };
  }

  function saveToday() {
    const c = fs.current;
    storage.set(TODAY_KEY, { date: todayStr(), name: c.menu.name, line: c.line, color: c.color, number: c.number, daily: fs.dailyBadge });
  }

  // ถ้าวันนี้เคยเสี่ยงแล้ว ให้คืนผลล่าสุดของวันนี้กลับมา (ข้ามวันแล้วจะเริ่มใหม่)
  function restoreToday() {
    const t = storage.get(TODAY_KEY, null);
    if (!t || t.date !== todayStr()) return;
    const menu = MENUS.find(m => m.name === t.name);
    if (!menu) return;
    fs.current = { menu, line: t.line, color: t.color, number: t.number };
    fs.dailyBadge = !!t.daily;
  }

  // หน้าแรก: แสดงดวงของผู้ใช้ถ้าวันนี้เสี่ยงแล้ว ไม่เช่นนั้นสุ่มตัวอย่างใหม่ทุกครั้งที่เปิดเว็บ
  function renderHero() {
    const box = $("#heroSlip");
    if (!box) return;
    const mine = !!fs.current;
    const c = fs.current || heroSample || (heroSample = randomFortune());
    box.innerHTML = slipHtml(c, { badge: mine ? "ดวงกินวันนี้ของคุณ" : "", cls: "slip--hero" });
    box.setAttribute("aria-label", mine
      ? `ดวงกินวันนี้ของคุณ: ${c.menu.name} แตะเพื่อดูคำทำนาย`
      : "ตัวอย่างใบเซียมซี แตะเพื่อเสี่ยงเซียมซีของคุณ");
    $("#heroHint").textContent = mine ? "แตะเพื่อดูคำทำนายของคุณอีกครั้ง" : "แตะใบเซียมซีเพื่อเสี่ยงดวงกินของคุณ";
  }

  restoreToday();
  renderHero();

  /* ---------- แชร์เป็นรูป ---------- */
  // สร้างรูปไว้ล่วงหน้าตั้งแต่ผลออก เพราะ iOS ต้องเปิดเมนูแชร์ทันทีที่ผู้ใช้กด ถ้ารอสร้างรูปตอนกดจะถูกบล็อก
  let image = { for: null, file: null, promise: null };

  function prepareImage() {
    const c = fs.current;
    if (!c || !KY.shareImage || image.for === c) return image.promise;
    const target = { for: c, file: null, promise: null };
    target.promise = KY.shareImage.render(c, { daily: fs.dailyBadge })
      .then(blob => (target.file = new File([blob], `kinyang-fortune-${c.number}.png`, { type: "image/png" })))
      .catch(e => { console.error("share image", e); return null; });
    image = target;
    return target.promise;
  }

  function download(file) {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url; a.download = file.name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  async function share() {
    const c = fs.current; if (!c) return;
    const host = location.host && !/^(localhost|127\.)/.test(location.host) ? location.host : (window.KY_CONFIG || {}).siteHost;
    const text = `ดวงกินวันนี้ของฉัน: ${c.menu.name}\n“${c.line}”\n— กินหยัง KKU${host ? " " + host : ""}`;

    let file = image.for === c ? image.file : null;
    if (!file) {
      const btn = $('[data-act="fortune-share"]');
      if (btn) btn.disabled = true;
      file = await prepareImage();
      if (btn) btn.disabled = false;
    }

    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], text }); return; }
      catch (e) { if (e && e.name === "AbortError") return; /* แชร์ไม่ได้ ให้บันทึกรูปแทน */ }
    }
    if (file) { download(file); toast("บันทึกรูปดวงกินแล้ว"); return; }

    try { await navigator.clipboard.writeText(text); toast("คัดลอกคำทำนายแล้ว"); }
    catch (e) { toast("ไม่สามารถแชร์ได้ในขณะนี้"); }
  }

  // ข้อมูลสำหรับเปิดฟอร์มรีวิวต่อจากผลเซียมซี
  function reviewPrefill() {
    if (!fs.current) return {};
    return { menu: fs.current.menu.name, cat: fs.current.menu.cat, loc: areaLoc(fs.area), area: areaName(fs.area) };
  }

  KY.fortune = { open, close, shake, change, share, toggleFilter, toggleSound, reviewPrefill, areaName, areaLoc };
})(window.KY = window.KY || {});
