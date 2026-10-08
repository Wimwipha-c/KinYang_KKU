/*
 * สตรีค (เข้ามาใช้งานติดกันกี่วัน) และป้ายสะสม
 * นับเป็น 1 วันเมื่อทำอย่างใดอย่างหนึ่ง: เสี่ยงเซียมซี โหวตดวลเมนู หรือเขียนรีวิว (นับวันตามเวลาไทย)
 * - guest: เก็บใน localStorage
 * - เข้าสู่ระบบแล้ว: เก็บในตาราง activity_days และย้ายวันที่เคยเก็บตอนเป็น guest เข้าบัญชีให้
 */
(function (KY) {
  "use strict";
  const { $, esc, icon, storage, bkkDay } = KY.utils;
  const { toast, openModal, closeModal } = KY.ui;

  const LOCAL_KEY = "kky_days";          // { "2026-10-08": ["fortune", "duel"] }
  const TABLE = "activity_days";
  const KEEP_DAYS = 400;
  const KIND_LABEL = { fortune: "เสี่ยงเซียมซี", duel: "โหวตดวล", review: "เขียนรีวิว" };
  const WEEKDAY = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

  const BADGES = [
    { id: "streak3",   emoji: "🔥", name: "เริ่มติดไฟ",     desc: "เข้ามาติดกัน 3 วัน",       goal: 3,  value: s => s.best },
    { id: "streak7",   emoji: "⚡", name: "สายประจำ",      desc: "เข้ามาติดกัน 7 วัน",       goal: 7,  value: s => s.best },
    { id: "streak30",  emoji: "👑", name: "ตำนานกินหยัง",   desc: "เข้ามาติดกัน 30 วัน",      goal: 30, value: s => s.best },
    { id: "fortune10", emoji: "🎋", name: "มือเขย่าเซียมซี", desc: "เสี่ยงเซียมซีครบ 10 วัน",  goal: 10, value: s => s.count.fortune },
    { id: "duel7",     emoji: "⚔️", name: "นักดวล",        desc: "โหวตดวลเมนูครบ 7 วัน",    goal: 7,  value: s => s.count.duel },
    { id: "review5",   emoji: "✍️", name: "นักรีวิว",       desc: "เขียนรีวิวครบ 5 วัน",      goal: 5,  value: s => s.count.review }
  ];

  const st = { days: storage.get(LOCAL_KEY, {}), remote: false };
  const listeners = [];
  let seq = 0;
  const db = () => KY.db.client;

  /* ---------- คำนวณ ---------- */
  const active = (days, d) => !!(days[d] && days[d].length);
  const dayDiff = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);

  function stats(days = st.days) {
    const keys = Object.keys(days).filter(d => active(days, d)).sort();
    // สตรีคปัจจุบัน: นับย้อนจากวันนี้ (ถ้าวันนี้ยังไม่ได้ทำ เริ่มนับจากเมื่อวาน สตรีคยังไม่ขาด)
    let current = 0;
    for (let off = active(days, bkkDay()) ? 0 : -1; active(days, bkkDay(off)); off--) current++;
    let best = 0, run = 0, prev = null;
    for (const k of keys) { run = prev && dayDiff(prev, k) === 1 ? run + 1 : 1; best = Math.max(best, run); prev = k; }
    const count = { fortune: 0, duel: 0, review: 0 };
    keys.forEach(k => days[k].forEach(kind => { if (kind in count) count[kind]++; }));
    return { current, best, today: active(days, bkkDay()), count, total: keys.length };
  }

  const unlocked = s => BADGES.filter(b => b.value(s) >= b.goal).map(b => b.id);

  /* ---------- บันทึก ---------- */
  function saveLocal() {
    if (st.remote) return;
    const keys = Object.keys(st.days).sort().slice(-KEEP_DAYS);
    st.days = Object.fromEntries(keys.map(k => [k, st.days[k]]));
    storage.set(LOCAL_KEY, st.days);
  }

  async function record(kind) {
    const day = bkkDay();
    const kinds = st.days[day] || [];
    if (kinds.includes(kind)) return;
    const before = stats();
    st.days = { ...st.days, [day]: [...kinds, kind] };
    saveLocal();
    const after = stats();
    changed();
    announce(before, after);
    if (st.remote) {
      try {
        const { error } = await db().from(TABLE).upsert({ day, kinds: st.days[day] }, { onConflict: "user_id,day" });
        if (error) throw error;
      } catch (e) { console.warn("record activity", e && e.message); }
    }
  }

  // ฉลองเมื่อปลดล็อกป้ายใหม่ หรือต่อสตรีคได้ (หน่วงไว้ไม่ให้ทับข้อความอื่นที่เพิ่งขึ้น)
  function announce(before, after) {
    const fresh = unlocked(after).filter(id => !unlocked(before).includes(id));
    let msg = "";
    if (fresh.length) {
      const b = BADGES.find(x => x.id === fresh[0]);
      msg = `ปลดล็อกป้าย ${b.emoji} ${b.name}!`;
    } else if (!before.today && after.current > 1) {
      msg = `🔥 สตรีค ${after.current} วันติดแล้ว!`;
    }
    if (msg) setTimeout(() => toast(msg), 1600);
  }

  async function onAuth(auth) {
    const mine = ++seq;
    const local = storage.get(LOCAL_KEY, {});
    if (!auth.user || !db()) {
      st.remote = false; st.days = local; changed();
      return;
    }
    try {
      const { data, error } = await db().from(TABLE).select("day, kinds");
      if (error) throw error;
      if (mine !== seq) return;
      const days = Object.fromEntries(data.map(r => [r.day, r.kinds || []]));
      const changedRows = [];
      for (const [d, kinds] of Object.entries(local)) {
        const merged = [...new Set([...(days[d] || []), ...kinds])];
        if (merged.length !== (days[d] || []).length) { days[d] = merged; changedRows.push({ day: d, kinds: merged }); }
      }
      if (changedRows.length) {
        const { error: upErr } = await db().from(TABLE).upsert(changedRows, { onConflict: "user_id,day" });
        if (upErr) throw upErr;
      }
      storage.set(LOCAL_KEY, {});
      if (mine !== seq) return;
      st.remote = true; st.days = days;
    } catch (e) {
      console.warn("load activity", e && e.message);
      if (mine !== seq) return;
      st.remote = false; st.days = local;
    }
    changed();
  }

  /* ---------- แสดงผล ---------- */
  function chipHtml() {
    const s = stats();
    return s.current
      ? `<button type="button" class="streak-chip${s.today ? " is-lit" : ""}" data-act="streak" aria-label="สตรีค ${s.current} วัน ดูป้ายสะสม">🔥 <b>${s.current}</b> วัน</button>`
      : `<button type="button" class="streak-chip" data-act="streak" aria-label="เริ่มสตรีค ดูป้ายสะสม">🔥 เริ่มสตรีค</button>`;
  }

  function weekHtml() {
    let out = "";
    for (let off = -6; off <= 0; off++) {
      const d = bkkDay(off);
      const on = active(st.days, d);
      const wd = WEEKDAY[new Date(d + "T00:00:00Z").getUTCDay()];
      out += `<li class="week__day${on ? " is-on" : ""}${off === 0 ? " is-today" : ""}">
        <span class="week__dot" aria-hidden="true">${on ? "🔥" : ""}</span>
        <span class="week__label">${off === 0 ? "วันนี้" : wd}</span>
        <span class="sr-only">${on ? "ใช้งานแล้ว" : "ยังไม่ได้ใช้งาน"}</span>
      </li>`;
    }
    return `<ol class="week" aria-label="7 วันล่าสุด">${out}</ol>`;
  }

  function render() {
    const s = stats();
    const user = KY.auth && KY.auth.user;
    const todayKinds = (st.days[bkkDay()] || []).map(k => KIND_LABEL[k]).filter(Boolean);
    $("#streakBody").innerHTML = `
      <div class="modal__head">
        <div><h2 class="modal__title" id="streakTitle">สตรีคและป้ายสะสม</h2><p class="modal__sub">เข้ามาทุกวันเพื่อต่อสตรีค</p></div>
        <button type="button" class="icon-btn" data-act="close-streak" aria-label="ปิด">${icon("close")}</button>
      </div>
      <div class="modal__content">
        <div class="streak-hero${s.today ? " is-lit" : ""}">
          <span class="streak-hero__flame" aria-hidden="true">🔥</span>
          <span class="streak-hero__num">${s.current}</span>
          <span class="streak-hero__unit">วันติด</span>
          <p class="streak-hero__note">${s.today
            ? `วันนี้${esc(todayKinds.join(" · "))}แล้ว ✓ พรุ่งนี้มาต่อนะ`
            : "วันนี้ยังไม่ได้ต่อสตรีค เสี่ยงเซียมซี โหวตดวลเมนู หรือเขียนรีวิวก็ได้"}</p>
        </div>
        ${weekHtml()}
        <dl class="streak-stats">
          <div><dt>สตรีคสูงสุด</dt><dd>${s.best} วัน</dd></div>
          <div><dt>ใช้งานทั้งหมด</dt><dd>${s.total} วัน</dd></div>
        </dl>
        <h3 class="fav-group">ป้ายสะสม <span class="muted">${unlocked(s).length}/${BADGES.length}</span></h3>
        <ul class="badges">${BADGES.map(b => {
          const v = Math.min(b.value(s), b.goal), done = v >= b.goal;
          return `<li class="badge${done ? " is-done" : ""}">
            <span class="badge__emoji" aria-hidden="true">${b.emoji}</span>
            <span class="badge__name">${b.name}</span>
            <span class="badge__desc">${b.desc}</span>
            <span class="badge__bar" aria-hidden="true"><i style="width:${Math.round(v / b.goal * 100)}%"></i></span>
            <span class="badge__prog">${done ? "ได้แล้ว" : `${v}/${b.goal}`}</span>
          </li>`;
        }).join("")}</ul>
        ${user ? "" : `<p class="notice">${icon("info")}<span>สตรีคเก็บไว้ในเครื่องนี้เท่านั้น
          ${KY.db.client ? `<button type="button" class="text-btn" data-act="sign-in">เข้าสู่ระบบด้วย Google</button> เพื่อเก็บไว้ในบัญชี ไม่หายเวลาเปลี่ยนเครื่อง` : ""}</span></p>`}
      </div>`;
  }

  function changed() {
    const chip = $("#streakChip");
    if (chip) chip.innerHTML = chipHtml();
    if ($("#streakModal") && $("#streakModal").classList.contains("is-open")) render();
    listeners.forEach(fn => fn());
  }

  function open() { render(); openModal("streakModal"); }
  const close = () => closeModal("streakModal");
  const onChange = fn => listeners.push(fn);

  if (KY.auth) KY.auth.onChange(onAuth);
  // ข้ามเที่ยงคืนขณะเปิดเว็บค้างไว้ ให้ปุ่มสตรีคอัปเดต
  setInterval(changed, 60 * 1000);

  KY.streak = { record, open, close, stats, onChange, refresh: changed, BADGES };
})(window.KY = window.KY || {});
