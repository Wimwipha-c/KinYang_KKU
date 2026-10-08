/*
 * ดวลเมนูประจำวัน: ทุกวันมี 2 เมนูมาดวลกัน โหวตได้วันละครั้ง แล้วดูผลรวมของชาว มข.
 * คู่เมนูคำนวณจากวันที่ (เวลาไทย) ทุกเครื่องจึงเห็นคู่เดียวกันโดยไม่ต้องเก็บในฐานข้อมูล
 * ผลโหวตดึงจากฟังก์ชัน duel_results ใน Supabase และโหลดใหม่ทุก 30 วินาทีขณะเปิดหน้า
 */
(function (KY) {
  "use strict";
  const { $, esc, icon, storage, bkkDay, msToBkkMidnight } = KY.utils;
  const { MENUS, CATEGORIES } = KY.data;
  const { toast } = KY.ui;

  const VOTE_KEY = "kky_duel";       // { day, menu } โหวตของเครื่องนี้วันนี้
  const DEVICE_KEY = "kky_device";   // รหัสสุ่มของเครื่อง ใช้กันโหวตซ้ำของ guest
  const POLL_MS = 30 * 1000;

  const st = { day: null, pair: [], results: {}, vote: null, voted: false, busy: false };
  const db = () => KY.db.client;

  /* ---------- คู่ประจำวัน ---------- */
  // สุ่มแบบกำหนดผลได้จากวันที่ (mulberry32) ให้ทุกเครื่องได้คู่เดียวกัน
  function rng(seedText) {
    let h = 1779033703 ^ seedText.length;
    for (let i = 0; i < seedText.length; i++) { h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    let a = h >>> 0;
    return () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // สองเมนูต่างหมวดกัน จะได้ดวลกันสนุกขึ้น
  function pairFor(day) {
    const r = rng("kinyang-duel-" + day);
    const a = MENUS[Math.floor(r() * MENUS.length)];
    let b = a;
    for (let i = 0; i < 30 && (b === a || b.cat === a.cat); i++) b = MENUS[Math.floor(r() * MENUS.length)];
    return [a, b];
  }

  function deviceId() {
    let id = storage.get(DEVICE_KEY, "");
    if (!id) {
      id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
      storage.set(DEVICE_KEY, id);
    }
    return id;
  }
  const voter = () => (KY.auth && KY.auth.user ? "u:" + KY.auth.user.id : "d:" + deviceId());

  /* ---------- ข้อมูล ---------- */
  function syncDay() {
    const day = bkkDay();
    if (st.day === day) return false;
    st.day = day;
    st.pair = pairFor(day);
    st.results = {};
    const saved = storage.get(VOTE_KEY, null);
    st.vote = saved && saved.day === day ? saved.menu : null;
    st.voted = !!st.vote;
    return true;
  }

  async function loadResults() {
    if (!db()) return;
    try {
      const { data, error } = await db().rpc("duel_results", { d: st.day });
      if (error) throw error;
      st.results = Object.fromEntries(data.map(r => [r.menu, Number(r.votes)]));
    } catch (e) {
      console.warn("duel_results", e && e.message);
    }
    render();
  }

  async function vote(name) {
    if (st.voted || st.busy || !st.pair.some(m => m.name === name)) return;
    st.busy = true;
    st.vote = name; st.voted = true;
    st.results = { ...st.results, [name]: (st.results[name] || 0) + 1 };
    render();
    try {
      const { error } = await db().from("duel_votes").insert({ day: st.day, menu: name, voter: voter() });
      if (error && error.code !== "23505") throw error;
      storage.set(VOTE_KEY, { day: st.day, menu: name });
      if (error) { st.vote = null; toast("วันนี้คุณโหวตไปแล้ว พรุ่งนี้มาดวลกันใหม่"); }
      else toast(`โหวต ${name} แล้ว!`);
      if (KY.streak) KY.streak.record("duel");
    } catch (e) {
      console.error("duel vote", e);
      st.vote = null; st.voted = false;
      st.results = { ...st.results, [name]: Math.max(0, (st.results[name] || 1) - 1) };
      toast("โหวตไม่สำเร็จ กรุณาลองใหม่");
    }
    st.busy = false;
    loadResults();
  }

  /* ---------- แสดงผล ---------- */
  function countdown() {
    const m = Math.ceil(msToBkkMidnight() / 60000);
    const h = Math.floor(m / 60), mm = m % 60;
    return h ? `${h} ชม. ${mm} นาที` : `${mm} นาที`;
  }

  function optionHtml(m, total) {
    const cat = CATEGORIES[m.cat] || CATEGORIES.other;
    const n = st.results[m.name] || 0;
    const pct = total ? Math.round(n / total * 100) : 0;
    const mine = st.vote === m.name;
    const lead = st.voted && total && n === Math.max(...st.pair.map(x => st.results[x.name] || 0));
    return `<button type="button" class="duel__opt${mine ? " is-mine" : ""}${lead ? " is-lead" : ""}" data-act="duel-vote" data-v="${esc(m.name)}"
        ${st.voted ? `aria-disabled="true"` : ""} aria-label="${st.voted ? `${esc(m.name)} ${pct} เปอร์เซ็นต์` : `โหวต ${esc(m.name)}`}">
      <span class="cat-badge cat-badge--lg cat-${m.cat}">${icon(cat.icon)}</span>
      <span class="duel__name">${esc(m.name).replace(/([+/])/g, "$1<wbr>")}</span>
      <span class="duel__price">฿${esc(m.price)}</span>
      ${st.voted
        ? `<span class="duel__result"><span class="duel__pct">${pct}%</span><span class="duel__bar"><i style="width:${pct}%"></i></span><span class="duel__votes">${n.toLocaleString("th-TH")} โหวต${mine ? " · ฝั่งคุณ" : ""}</span></span>`
        : `<span class="duel__cta">แตะเพื่อโหวต</span>`}
    </button>`;
  }

  function render() {
    const section = $("#duel");
    if (!section) return;
    section.hidden = !db();
    if (!db()) return;
    const total = st.pair.reduce((sum, m) => sum + (st.results[m.name] || 0), 0);
    $("#duelBoard").innerHTML = `
      ${optionHtml(st.pair[0], total)}
      <span class="duel__vs" aria-hidden="true">VS</span>
      ${optionHtml(st.pair[1], total)}`;
    $("#duelMeta").textContent = st.voted
      ? `รวม ${total.toLocaleString("th-TH")} โหวต · คู่ใหม่ในอีก ${countdown()}`
      : total
        ? `ชาว มข. โหวตแล้ว ${total.toLocaleString("th-TH")} คน · แตะเลือกฝั่งที่อยากกินวันนี้`
        : "ยังไม่มีใครโหวต มาเป็นคนแรกของวันนี้ แตะเลือกฝั่งที่อยากกิน";
    if (KY.streak) KY.streak.refresh();   // วาดปุ่มสตรีคบนหัวส่วนดวล
  }

  function tick() {
    if (document.hidden) return;
    if (syncDay()) render();
    loadResults();
  }

  function init() {
    syncDay();
    render();
    loadResults();
    setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) tick(); });
  }

  KY.duel = { init, vote, pairFor };
})(window.KY = window.KY || {});
