/* ส่วนประกอบ UI ที่ใช้ร่วมกัน: toast และ modal */
(function (KY) {
  "use strict";
  const { $ } = KY.utils;

  let toastTimer;
  function toast(message) {
    const el = $("#toast");
    el.textContent = message;
    el.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-visible"), 2800);
  }

  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  const stack = [];

  function openModal(id, focusSelector) {
    const el = document.getElementById(id);
    if (!el || stack.some(s => s.el === el)) return;
    stack.push({ el, returnTo: document.activeElement });
    el.classList.add("is-open");
    const panel = el.querySelector(".modal__panel"); if (panel) panel.scrollTop = 0;
    document.documentElement.classList.add("is-locked");
    setTimeout(() => {
      const target = (focusSelector && el.querySelector(focusSelector)) || el.querySelector(FOCUSABLE);
      if (target) target.focus({ preventScroll: true });
    }, 40);
  }

  function closeModal(id) {
    const i = stack.findIndex(s => s.el.id === id);
    if (i < 0) return;
    if (id === CONFIRM_ID && pendingConfirm) { const done = pendingConfirm; pendingConfirm = null; done(false); }
    const { el, returnTo } = stack.splice(i, 1)[0];
    el.classList.remove("is-open");
    if (!stack.length) document.documentElement.classList.remove("is-locked");
    if (returnTo && document.contains(returnTo)) returnTo.focus();
  }

  const topModal = () => (stack.length ? stack[stack.length - 1].el : null);

  /* ---------- กล่องยืนยัน (แทน confirm() ของเบราว์เซอร์) ---------- */
  // ใช้: if (await KY.ui.confirm({ title, body, confirmText, danger: true })) { ... }
  // กดยกเลิก ปุ่ม Esc หรือคลิกพื้นหลัง = false
  const CONFIRM_ID = "confirmModal";
  let pendingConfirm = null;

  function confirmBox({ title, body = "", confirmText = "ตกลง", cancelText = "ยกเลิก", danger = false, iconName = danger ? "trash" : "info" }) {
    let el = document.getElementById(CONFIRM_ID);
    if (!el) {
      el = document.createElement("div");
      el.className = "modal modal--confirm";
      el.id = CONFIRM_ID;
      el.setAttribute("role", "alertdialog");
      el.setAttribute("aria-modal", "true");
      el.setAttribute("aria-labelledby", "confirmTitle");
      el.setAttribute("aria-describedby", "confirmBody");
      el.innerHTML = `<div class="modal__panel confirm"></div>`;
      el.addEventListener("click", e => {
        if (e.target === el) closeModal(CONFIRM_ID);
        const btn = e.target.closest("[data-confirm]");
        if (!btn) return;
        e.stopPropagation();
        const ok = btn.dataset.confirm === "yes";
        const done = pendingConfirm; pendingConfirm = null;
        closeModal(CONFIRM_ID);
        if (done) done(ok);
      });
      document.body.appendChild(el);
    }
    if (pendingConfirm) { pendingConfirm(false); pendingConfirm = null; }
    el.querySelector(".confirm").innerHTML = `
      <span class="confirm__icon${danger ? " confirm__icon--danger" : ""}">${KY.utils.icon(iconName)}</span>
      <h2 class="confirm__title" id="confirmTitle">${title}</h2>
      ${body ? `<p class="confirm__body" id="confirmBody">${body}</p>` : ""}
      <div class="confirm__actions">
        <button type="button" class="btn btn-secondary btn-lg" data-confirm="no">${cancelText}</button>
        <button type="button" class="btn ${danger ? "btn-danger" : "btn-primary"} btn-lg" data-confirm="yes">${confirmText}</button>
      </div>`;
    return new Promise(resolve => {
      pendingConfirm = resolve;
      openModal(CONFIRM_ID, '[data-confirm="no"]');   // โฟกัสที่ยกเลิกก่อน กันกดลบพลาด
    });
  }

  // วนโฟกัสให้อยู่ใน modal ที่เปิดอยู่
  document.addEventListener("keydown", e => {
    const el = topModal();
    if (!el) return;
    if (e.key === "Escape") { closeModal(el.id); return; }
    if (e.key !== "Tab") return;
    const items = Array.from(el.querySelectorAll(FOCUSABLE)).filter(n => n.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
  });

  KY.ui = { toast, openModal, closeModal, confirm: confirmBox };
})(window.KY = window.KY || {});
