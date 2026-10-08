/* ฟอร์มเขียนรีวิว */
(function (KY) {
  "use strict";
  const { $, $$, esc, icon, storage, reducedMotion } = KY.utils;
  const { AREAS, LOCATIONS, RATING_LABELS, findMenu } = KY.data;
  const { toast, openModal, closeModal } = KY.ui;

  const TEXT_MAX = 500;
  const rf = { loc: "in", rating: 0, busy: false, draft: {}, editId: null };

  function open(prefill = {}) {
    rf.busy = false;
    // แก้รีวิวเดิมของตัวเอง
    if (prefill.edit) {
      const r = prefill.edit;
      rf.editId = r.id; rf.rating = Number(r.rating) || 0; rf.loc = r.loc === "out" ? "out" : "in";
      rf.draft = { menu: r.menu || "", cat: r.cat || "", shop: r.shop || "", area: r.area || "", price: r.price === "" || r.price == null ? "" : String(r.price), text: r.text || "", name: "" };
      render();
      openModal("reviewModal", "#fMenu");
      return;
    }
    const savedArea = storage.get("kky_area", "");
    rf.editId = null; rf.rating = 0;
    rf.loc = prefill.loc || KY.fortune.areaLoc(savedArea);
    rf.draft = {
      menu: prefill.menu || "", cat: prefill.cat || "", shop: "",
      area: prefill.area || (KY.fortune.areaLoc(savedArea) === rf.loc ? KY.fortune.areaName(savedArea) : ""),
      price: "", text: "", name: storage.get("kky_name", "")
    };
    render();
    openModal("reviewModal", rf.draft.menu ? "#fShop" : "#fMenu");
  }
  const close = () => closeModal("reviewModal");

  function field(id, label, control, extra = "") {
    return `<div class="field" id="g-${id}">
      <label class="field__label" for="${id}">${label}</label>${control}${extra}
      <p class="field__error" aria-live="polite"></p>
    </div>`;
  }

  // ชื่อผู้รีวิว: ถ้าเข้าสู่ระบบแล้วใช้ชื่อจากโปรไฟล์ (แก้ได้ที่หน้าโปรไฟล์) ไม่เช่นนั้นให้พิมพ์เอง
  function nameField(d) {
    if (KY.auth && KY.auth.user) {
      const label = KY.profile.authorLabel({ faculty: KY.profile.faculty(), year: KY.profile.year() });
      return `<p class="byline-note">${icon("check")}<span>${rf.editId ? "รีวิวในชื่อ" : "โพสต์ในชื่อ"} <b>${esc(KY.profile.name())}</b>${label ? ` · ${esc(label)}` : ""}
        <button type="button" class="text-btn" data-act="profile">แก้ไขโปรไฟล์</button></span></p>`;
    }
    return field("fName", "ชื่อที่แสดง <span class=\"muted\">(ไม่บังคับ)</span>", `<input id="fName" class="input" value="${esc(d.name)}" maxlength="30" placeholder="เพื่อน มข." autocomplete="nickname">`);
  }

  function render() {
    const d = rf.draft;
    const areaOpts = AREAS[rf.loc].map(a => `<option value="${esc(a)}"${d.area === a ? " selected" : ""}>${esc(a)}</option>`).join("");
    const starBtns = [1, 2, 3, 4, 5].map(n =>
      `<button type="button" role="radio" class="star-btn${n <= rf.rating ? " is-on" : ""}" aria-checked="${rf.rating === n}" aria-label="${n} ดาว" data-act="star" data-v="${n}">${icon("star")}</button>`).join("");

    $("#reviewBody").innerHTML = `
      <div class="modal__head">
        <div><h2 class="modal__title" id="reviewTitle">${rf.editId ? "แก้ไขรีวิว" : "เขียนรีวิว"}</h2><p class="modal__sub">${rf.editId ? "แก้แล้วทุกคนจะเห็นรีวิวฉบับใหม่ทันที" : "แนะนำร้านโปรดให้เพื่อน มข. ได้ลองบ้าง"}</p></div>
        <button type="button" class="icon-btn" data-act="close-review" aria-label="ปิด">${icon("close")}</button>
      </div>
      <form class="modal__content form" id="reviewForm" novalidate>
        <div class="form-row">
          ${field("fMenu", "ชื่อเมนู", `<input id="fMenu" class="input" value="${esc(d.menu)}" maxlength="60" placeholder="เช่น ข้าวมันไก่" autocomplete="off">`)}
          ${field("fShop", "ชื่อร้าน", `<input id="fShop" class="input" value="${esc(d.shop)}" maxlength="60" placeholder="เช่น ร้านป้าแดง" autocomplete="off">`)}
        </div>
        <div class="field">
          <span class="field__label" id="locLabel">ที่ตั้ง</span>
          <div class="segmented segmented--full" role="group" aria-labelledby="locLabel">
            ${["in", "out"].map(k => `<button type="button" class="seg-btn" data-act="review-loc" data-v="${k}" aria-pressed="${rf.loc === k}">${LOCATIONS[k]}</button>`).join("")}
          </div>
        </div>
        <div class="form-row">
          ${field("fArea", rf.loc === "in" ? "คณะ / โรงอาหาร" : "โซน", `<select id="fArea" class="input"><option value="">เลือกพื้นที่</option>${areaOpts}</select>`)}
          ${field("fPrice", "ราคา <span class=\"muted\">(บาท)</span>", `<input id="fPrice" class="input" type="number" inputmode="numeric" min="0" max="9999" value="${esc(d.price)}" placeholder="ไม่ระบุก็ได้">`)}
        </div>
        <div class="field" id="g-rating">
          <span class="field__label" id="ratingLabel">คะแนน</span>
          <div class="rating-input">
            <div class="star-input" role="radiogroup" aria-labelledby="ratingLabel">${starBtns}</div>
            <span class="rating-input__hint" id="ratingHint">${RATING_LABELS[rf.rating] || "แตะเพื่อให้คะแนน"}</span>
          </div>
          <p class="field__error" aria-live="polite"></p>
        </div>
        ${field("fText", "รีวิว", `<textarea id="fText" class="input" maxlength="${TEXT_MAX}" rows="4" placeholder="รสชาติ ปริมาณ บรรยากาศ หรือเมนูที่อยากแนะนำ">${esc(d.text)}</textarea>`,
          `<p class="field__hint field__hint--end"><span id="textCount">${d.text.length}</span>/${TEXT_MAX}</p>`)}
        ${nameField(d)}
      </form>
      <div class="modal__foot">
        <button type="submit" form="reviewForm" class="btn btn-primary btn-lg btn-block" id="submitBtn">${rf.editId ? "บันทึกการแก้ไข" : "โพสต์รีวิว"}</button>
        <p class="field__error field__error--center" id="submitError" role="alert"></p>
      </div>`;

    $("#reviewForm").addEventListener("submit", e => { e.preventDefault(); submit(); });
    $("#fText").addEventListener("input", e => { $("#textCount").textContent = e.target.value.length; });
  }

  function keepDraft() {
    const v = id => { const el = document.getElementById(id); return el ? el.value : ""; };
    rf.draft = { ...rf.draft, menu: v("fMenu"), shop: v("fShop"), area: v("fArea"), price: v("fPrice"), text: v("fText"), name: v("fName") };
  }

  function setLocation(loc) {
    keepDraft();
    rf.loc = loc; rf.draft.area = "";
    render();
    const btn = $(`#reviewBody .seg-btn[data-v="${loc}"]`); if (btn) btn.focus();
  }

  function setRating(n) {
    rf.rating = rf.rating === n ? 0 : n;
    $$("#reviewBody .star-btn").forEach(b => {
      const v = +b.dataset.v;
      b.classList.toggle("is-on", v <= rf.rating);
      b.setAttribute("aria-checked", String(v === rf.rating));
      if (v === n && !reducedMotion) { b.classList.add("is-pop"); setTimeout(() => b.classList.remove("is-pop"), 180); }
    });
    $("#ratingHint").textContent = RATING_LABELS[rf.rating] || "แตะเพื่อให้คะแนน";
    setError("g-rating", "");
  }

  function setError(groupId, msg) {
    const g = document.getElementById(groupId); if (!g) return;
    g.classList.toggle("has-error", !!msg);
    g.querySelector(".field__error").textContent = msg || "";
  }

  async function submit() {
    if (rf.busy) return;
    keepDraft();
    const d = rf.draft;
    const checks = [
      ["g-fMenu", d.menu.trim().length > 0, "กรุณาใส่ชื่อเมนู"],
      ["g-fShop", d.shop.trim().length > 0, "กรุณาใส่ชื่อร้าน"],
      ["g-fArea", !!d.area, "กรุณาเลือกพื้นที่"],
      ["g-rating", rf.rating > 0, "กรุณาให้คะแนน"],
      ["g-fText", d.text.trim().length >= 5, "เขียนรีวิวอย่างน้อย 5 ตัวอักษร"]
    ];
    let valid = true;
    for (const [id, ok, msg] of checks) { setError(id, ok ? "" : msg); if (!ok) valid = false; }
    if (!valid) {
      const first = $("#reviewBody .has-error .input, #reviewBody .has-error .star-btn");
      if (first) first.focus();
      return;
    }

    const menuHit = findMenu(d.menu);
    const signedIn = !!(KY.auth && KY.auth.user);
    const review = {
      menu: d.menu.trim(), shop: d.shop.trim(), loc: rf.loc, area: d.area,
      price: d.price === "" ? "" : Number(d.price), rating: rf.rating, text: d.text.trim(),
      name: signedIn ? KY.profile.name() : (d.name.trim() || "เพื่อน มข."),
      faculty: signedIn ? KY.profile.faculty() : null, year: signedIn ? KY.profile.year() : null,
      cat: menuHit ? menuHit.cat : (d.cat || "other"),
      createdAt: Date.now()
    };
    if (!signedIn) storage.set("kky_name", d.name.trim());

    rf.busy = true;
    const btn = $("#submitBtn");
    btn.disabled = true; btn.textContent = rf.editId ? "กำลังบันทึก…" : "กำลังโพสต์…";
    $("#submitError").textContent = "";

    if (rf.editId) {
      try {
        await KY.reviews.update(rf.editId, {
          menu: review.menu, shop: review.shop, loc: review.loc, area: review.area,
          price: review.price === "" ? null : review.price, rating: review.rating, text: review.text, cat: review.cat
        });
        rf.busy = false;
        close();
        KY.profile.reviewChanged();
        toast("บันทึกการแก้ไขแล้ว");
      } catch (e) {
        console.error("edit review", e);
        rf.busy = false; btn.disabled = false; btn.textContent = "ลองบันทึกอีกครั้ง";
        $("#submitError").textContent = "บันทึกไม่สำเร็จ ข้อความที่แก้ยังอยู่ กรุณาลองใหม่";
      }
      return;
    }

    try {
      const shared = await KY.reviews.add(review);
      if (KY.streak) KY.streak.record("review");
      rf.busy = false;
      close();
      KY.list.render();
      toast(shared ? "โพสต์รีวิวเรียบร้อย ขอบคุณที่แบ่งปัน" : "บันทึกรีวิวในอุปกรณ์นี้แล้ว ขอบคุณที่แบ่งปัน");
      const target = document.getElementById("reviews");
      if (target) target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
    } catch (e) {
      console.error("submit review", e);
      rf.busy = false; btn.disabled = false; btn.textContent = "ลองโพสต์อีกครั้ง";
      $("#submitError").textContent = "โพสต์ไม่สำเร็จ ข้อความที่พิมพ์ยังอยู่ กรุณาลองใหม่";
    }
  }

  KY.reviewForm = { open, close, setLocation, setRating };
})(window.KY = window.KY || {});
