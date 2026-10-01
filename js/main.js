/* จุดเริ่มต้นของแอป: ผูก event ทั้งหมด */
(function (KY) {
  "use strict";
  const { $ } = KY.utils;
  const { list, fortune, reviewForm, reviews } = KY;

  const actions = {
    "fortune":             () => fortune.open(),
    "close-fortune":       () => fortune.close(),
    "shake":               () => fortune.shake(),
    "fortune-change":      () => fortune.change(),
    "fortune-share":       () => fortune.share(),
    "fortune-filter":      (el, v) => fortune.toggleFilter(el, v),
    "sound":               () => fortune.toggleSound(),
    "theme":               () => KY.theme.toggle(),
    "review":              () => reviewForm.open(),
    "close-review":        () => reviewForm.close(),
    "review-from-fortune": () => { const pre = fortune.reviewPrefill(); fortune.close(); reviewForm.open(pre); },
    "review-loc":          (el, v) => reviewForm.setLocation(v),
    "star":                (el, v) => reviewForm.setRating(+v),
    "loc":                 (el, v) => list.setLocation(v),
    "clear":               () => list.clear(),
    "retry":               () => reviews.retry(),
    "more": el => {
      const text = el.previousElementSibling;
      const open = text.classList.toggle("is-open");
      el.textContent = open ? "ย่อ" : "อ่านต่อ";
      el.setAttribute("aria-expanded", String(open));
    }
  };

  document.addEventListener("click", e => {
    // คลิกพื้นหลังเพื่อปิด modal
    if (e.target.classList && e.target.classList.contains("modal")) {
      e.target.id === "fortuneModal" ? fortune.close() : reviewForm.close();
      return;
    }
    const el = e.target.closest("[data-act]");
    if (!el) return;
    const fn = actions[el.dataset.act];
    if (fn) fn(el, el.dataset.v);
  });

  $("#q").addEventListener("input", e => list.setQuery(e.target.value));
  $("#areaSel").addEventListener("change", e => list.setArea(e.target.value));
  $("#sortSel").addEventListener("change", e => list.setSort(e.target.value));

  // ปุ่มเซียมซีลอย แสดงเมื่อเลื่อนผ่าน hero
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => {
      $("#fab").classList.toggle("is-visible", !entry.isIntersecting);
    }, { rootMargin: "-64px 0px 0px 0px" }).observe($("#heroActions"));
  }

  $("#year").textContent = new Date().getFullYear() + 543;

  list.render();
  reviews.init(list.render);
})(window.KY = window.KY || {});
