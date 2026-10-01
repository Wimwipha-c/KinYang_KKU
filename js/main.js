/* จุดเริ่มต้นของแอป: ผูก event ทั้งหมด */
(function (KY) {
  "use strict";
  const { $ } = KY.utils;
  const { list, fortune, reviewForm, reviews, trending } = KY;

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
    "trend": (el, v) => { list.search(v); $("#reviews").scrollIntoView(); },
    "sign-in":             () => KY.auth.signIn(),
    "sign-out":            () => KY.account.signOut(),
    "account":             () => KY.account.open(),
    "close-account":       () => KY.account.close(),
    "favs":                () => { KY.account.close(); KY.favs.open(); },
    "close-favs":          () => KY.favs.close(),
    "fav":                 el => KY.favs.toggle(el.dataset.favKind, el.dataset.favRef),
    "fav-pick":            () => KY.favs.pickOne(),
    "fav-show":            (el, v) => KY.favs.show(v),
    "report":              (el, v) => KY.report.open(v),
    "close-report":        () => KY.report.close(),
    "report-reason":       (el, v) => KY.report.setReason(v),
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
      KY.ui.closeModal(e.target.id);
      return;
    }
    const el = e.target.closest("[data-act]");
    if (!el) return;
    const fn = actions[el.dataset.act];
    if (fn) fn(el, el.dataset.v);
  });

  // องค์ประกอบที่ทำตัวเป็นปุ่ม (role="button") ต้องกดด้วย Enter/Space ได้
  document.addEventListener("keydown", e => {
    if ((e.key === "Enter" || e.key === " ") && e.target.matches('[role="button"][data-act]')) {
      e.preventDefault();
      e.target.click();
    }
  });

  $("#q").addEventListener("input", e => list.setQuery(e.target.value));
  $("#areaSel").addEventListener("change", e => list.setArea(e.target.value));
  $("#sortSel").addEventListener("change", e => list.setSort(e.target.value));

  // ปุ่มเซียมซีลอย: แสดงเมื่อเลื่อนผ่าน hero และซ่อนเมื่อถึง footer (ไม่ให้บังข้อความด้านล่าง)
  if ("IntersectionObserver" in window) {
    let pastHero = false, atFooter = false;
    const update = () => $("#fab").classList.toggle("is-visible", pastHero && !atFooter);
    new IntersectionObserver(([entry]) => { pastHero = !entry.isIntersecting; update(); },
      { rootMargin: "-64px 0px 0px 0px" }).observe($("#heroActions"));
    new IntersectionObserver(([entry]) => { atFooter = entry.isIntersecting; update(); })
      .observe($(".site-footer"));
  }

  $("#year").textContent = new Date().getFullYear() + 543;

  list.render();
  reviews.init(() => { list.render(); trending.schedule(); });
})(window.KY = window.KY || {});
