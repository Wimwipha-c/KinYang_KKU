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
    const { el, returnTo } = stack.splice(i, 1)[0];
    el.classList.remove("is-open");
    if (!stack.length) document.documentElement.classList.remove("is-locked");
    if (returnTo && document.contains(returnTo)) returnTo.focus();
  }

  const topModal = () => (stack.length ? stack[stack.length - 1].el : null);

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

  KY.ui = { toast, openModal, closeModal };
})(window.KY = window.KY || {});
