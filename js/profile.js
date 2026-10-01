/*
 * โปรไฟล์ (ชื่อที่แสดง คณะ ชั้นปี) และรีวิวของฉัน (แก้/ลบ)
 * โปรไฟล์เห็นได้เฉพาะเจ้าของ ชื่อและคณะบนรีวิวเป็นสำเนาที่บันทึกตอนโพสต์
 * เมื่อแก้โปรไฟล์ จะอัปเดตสำเนาบนรีวิวเก่าของตัวเองให้ด้วย
 */
(function (KY) {
  "use strict";
  const { $, esc, icon, stars, formatDate } = KY.utils;
  const { PROFILE_FACULTIES, YEARS } = KY.data;
  const { toast, openModal, closeModal } = KY.ui;
  const auth = KY.auth;

  const NAME_MAX = 30;
  const YEAR_LABEL = Object.fromEntries(YEARS);
  const pf = { data: null, busy: false, mine: null };
  const listeners = [];
  let seq = 0;

  const db = () => KY.db.client;

  /* ---------- ข้อมูลโปรไฟล์ ---------- */
  async function onAuth() {
    const mine = ++seq;
    pf.data = null; pf.mine = null;
    if (auth.user && db()) {
      try {
        const { data, error } = await db().from("profiles").select("*").eq("id", auth.user.id).maybeSingle();
        if (error) throw error;
        if (mine !== seq) return;
        pf.data = data;
      } catch (e) {
        console.warn("load profile", e && e.message);
      }
    }
    if (mine === seq) listeners.forEach(fn => fn());
  }

  const onChange = fn => listeners.push(fn);
  // ชื่อที่ใช้บนเว็บ: ชื่อในโปรไฟล์ ถ้ายังไม่ตั้งใช้ชื่อจาก Google
  const name = () => (pf.data && pf.data.display_name) || auth.displayName().slice(0, NAME_MAX);
  const faculty = () => (pf.data && pf.data.faculty) || null;
  const year = () => (pf.data && pf.data.year) || null;

  // ข้อความคณะ/ชั้นปีสั้นๆ ใต้รีวิว เช่น "วิศวกรรมศาสตร์ ปี 2"
  function authorLabel(r) {
    const f = r.faculty ? r.faculty.replace(/^คณะ/, "") : "";
    return [f, YEAR_LABEL[r.year] || ""].filter(Boolean).join(" ");
  }

  /* ---------- หน้าต่างแก้ไขโปรไฟล์ ---------- */
  const head = (title, sub) => `<div class="modal__head">
      <div><h2 class="modal__title" id="profileTitle">${title}</h2>${sub ? `<p class="modal__sub">${sub}</p>` : ""}</div>
      <button type="button" class="icon-btn" data-act="close-profile" aria-label="ปิด">${icon("close")}</button>
    </div>`;

  function renderForm() {
    const f = faculty(), y = year();
    $("#profileBody").innerHTML = head("แก้ไขโปรไฟล์", esc(auth.user.email || "")) + `
      <form class="modal__content" id="profileForm" novalidate>
        <div class="field" id="g-pName">
          <label class="field__label" for="pName">ชื่อที่แสดง</label>
          <input id="pName" class="input" value="${esc(name())}" maxlength="${NAME_MAX}" autocomplete="nickname" placeholder="เช่น มายด์">
          <p class="field__hint">แสดงบนรีวิวของคุณ ผู้ใช้คนอื่นจะไม่เห็นอีเมล</p>
          <p class="field__error" aria-live="polite"></p>
        </div>
        <div class="form-row">
          <div class="field">
            <label class="field__label" for="pFaculty">คณะ <span class="muted">(ไม่บังคับ)</span></label>
            <select id="pFaculty" class="input"><option value="">ไม่ระบุ</option>${PROFILE_FACULTIES.map(x =>
              `<option value="${esc(x)}"${f === x ? " selected" : ""}>${esc(x)}</option>`).join("")}</select>
          </div>
          <div class="field">
            <label class="field__label" for="pYear">ชั้นปี <span class="muted">(ไม่บังคับ)</span></label>
            <select id="pYear" class="input"><option value="">ไม่ระบุ</option>${YEARS.map(([k, l]) =>
              `<option value="${k}"${y === k ? " selected" : ""}>${l}</option>`).join("")}</select>
          </div>
        </div>
        <p class="callout callout--flush">${icon("info")}<span>เมื่อบันทึก ชื่อและคณะบนรีวิวเก่าที่คุณเขียนตอนเข้าสู่ระบบจะเปลี่ยนตามด้วย</span></p>
      </form>
      <div class="modal__foot">
        <button type="submit" form="profileForm" class="btn btn-primary btn-lg btn-block" id="profileSubmit">บันทึกโปรไฟล์</button>
        <p class="field__error field__error--center" id="profileError" role="alert"></p>
      </div>`;
    $("#profileForm").addEventListener("submit", e => { e.preventDefault(); save(); });
    $("#pName").addEventListener("input", () => {
      const g = $("#g-pName"); g.classList.remove("has-error"); g.querySelector(".field__error").textContent = "";
    });
  }

  function open() {
    if (!auth.user) return;
    pf.busy = false;
    renderForm();
    openModal("profileModal", "#pName");
  }
  const close = () => closeModal("profileModal");

  async function save() {
    if (pf.busy) return;
    const displayName = $("#pName").value.trim();
    const g = $("#g-pName");
    g.classList.toggle("has-error", !displayName);
    g.querySelector(".field__error").textContent = displayName ? "" : "กรุณาใส่ชื่อที่แสดง";
    if (!displayName) { $("#pName").focus(); return; }

    const row = { id: auth.user.id, display_name: displayName, faculty: $("#pFaculty").value || null, year: $("#pYear").value || null, updated_at: new Date().toISOString() };
    pf.busy = true;
    const btn = $("#profileSubmit");
    btn.disabled = true; btn.textContent = "กำลังบันทึก…";
    $("#profileError").textContent = "";
    try {
      const { data, error } = await db().from("profiles").upsert(row).select().single();
      if (error) throw error;
      pf.data = data;
      await KY.reviews.updateAuthor(auth.user.id, { name: data.display_name, faculty: data.faculty, year: data.year });
      pf.busy = false;
      listeners.forEach(fn => fn());
      close();
      toast("บันทึกโปรไฟล์แล้ว");
    } catch (e) {
      console.error("save profile", e);
      pf.busy = false; btn.disabled = false; btn.textContent = "ลองบันทึกอีกครั้ง";
      $("#profileError").textContent = "บันทึกไม่สำเร็จ กรุณาลองใหม่";
    }
  }

  /* ---------- รีวิวของฉัน ---------- */
  function renderMine() {
    const list = pf.mine;
    let body;
    if (list === null) body = `<div class="skeleton skeleton--sm"></div>`;
    else if (list === "error") body = `<p class="notice">${icon("alert")}<span>โหลดรีวิวไม่สำเร็จ <button type="button" class="text-btn" data-act="my-reviews">ลองใหม่</button></span></p>`;
    else if (!list.length) {
      body = `<div class="empty-state empty-state--sm">
        <span class="empty-state__icon">${icon("pen")}</span>
        <h3>ยังไม่มีรีวิว</h3><p>รีวิวที่คุณเขียนตอนเข้าสู่ระบบจะมาอยู่ที่นี่ แก้ไขหรือลบได้ตลอด</p>
      </div>`;
    } else {
      body = `<ul class="fav-list">${list.map(r => `<li class="fav-row">
          <span class="fav-row__body">
            <span class="fav-row__title">${esc(r.menu)}</span>
            <span class="fav-row__meta">${esc(r.shop)} · ${stars(Number(r.rating) || 0, "stars--sm")} · ${formatDate(r.createdAt)}${r.updated_at ? " · แก้ไขแล้ว" : ""}</span>
          </span>
          <span class="fav-row__actions">
            <button type="button" class="icon-btn icon-btn--sm" data-act="review-edit" data-v="${esc(r.id)}" aria-label="แก้ไขรีวิว ${esc(r.menu)}">${icon("pen")}</button>
            <button type="button" class="icon-btn icon-btn--sm" data-act="review-delete" data-v="${esc(r.id)}" aria-label="ลบรีวิว ${esc(r.menu)}">${icon("trash")}</button>
          </span>
        </li>`).join("")}</ul>`;
    }
    $("#profileBody").innerHTML = head("รีวิวของฉัน", Array.isArray(list) && list.length ? `${list.length} รีวิว` : "") +
      `<div class="modal__content">${body}</div>
       <div class="modal__foot"><button type="button" class="btn btn-secondary btn-block" data-act="review">${icon("pen")}เขียนรีวิวใหม่</button></div>`;
  }

  async function loadMine() {
    pf.mine = null; renderMine();
    try { pf.mine = await KY.reviews.byUser(auth.user.id); }
    catch (e) { console.error("my reviews", e); pf.mine = "error"; }
    if ($("#profileModal").classList.contains("is-open")) renderMine();
  }

  function openMine() {
    if (!auth.user) return;
    pf.mine = null;
    renderMine();
    openModal("profileModal");
    loadMine();
  }

  // รีวิวของฉัน = โพสต์ตอนเข้าสู่ระบบด้วยบัญชีนี้ หรือรีวิวที่เก็บไว้ในเครื่องนี้ (ลบได้ แต่แก้ไม่ได้)
  const isMine = r => !!(r && (r._local || (auth.user && r.user_id === auth.user.id)));
  const findReview = id => KY.reviews.all().find(r => String(r.id) === id) ||
    (Array.isArray(pf.mine) ? pf.mine.find(r => String(r.id) === id) : null);

  function edit(id) {
    const r = findReview(id);
    if (!isMine(r) || r._local) return;
    close();
    KY.reviewForm.open({ edit: r });
  }

  async function remove(id) {
    const r = findReview(id);
    if (!isMine(r)) return;
    const ok = await KY.ui.confirm({
      title: "ลบรีวิวนี้?",
      body: `<b>${esc(r.menu)}</b> · ${esc(r.shop)}<br>${r._local ? "รีวิวนี้เก็บไว้ในเครื่องนี้เท่านั้น ลบแล้วกู้คืนไม่ได้" : "รีวิวจะหายจากเว็บของทุกคน และกู้คืนไม่ได้"}`,
      confirmText: "ลบรีวิว", danger: true
    });
    if (!ok) return;
    try {
      await KY.reviews.remove(r.id);
      if (Array.isArray(pf.mine)) { pf.mine = pf.mine.filter(x => x.id !== r.id); if ($("#profileModal").classList.contains("is-open")) renderMine(); }
      toast("ลบรีวิวแล้ว");
    } catch (e) {
      console.error("delete review", e);
      toast("ลบไม่สำเร็จ กรุณาลองใหม่");
    }
  }

  // หลังแก้รีวิวเสร็จ ถ้าเปิดรายการรีวิวของฉันค้างไว้ ให้โหลดใหม่
  function reviewChanged() { if (Array.isArray(pf.mine)) pf.mine = null; }

  auth.onChange(onAuth);

  KY.profile = { onChange, name, faculty, year, authorLabel, open, close, openMine, loadMine, edit, remove, isMine, reviewChanged };
})(window.KY = window.KY || {});
