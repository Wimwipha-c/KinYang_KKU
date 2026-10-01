/*
 * รายงานรีวิว: ต้องเข้าสู่ระบบก่อน รายงานรีวิวเดียวกันได้คนละครั้ง
 * รายงานจะไปรอผู้ดูแลตรวจที่หน้า admin.html (ไม่ซ่อนรีวิวอัตโนมัติ)
 */
(function (KY) {
  "use strict";
  const { $, $$, esc, icon } = KY.utils;
  const { toast, openModal, closeModal } = KY.ui;

  const DETAIL_MAX = 300;
  const st = { reviewId: null, reason: "", busy: false };

  const head = sub => `<div class="modal__head">
      <div><h2 class="modal__title" id="reportTitle">รายงานรีวิว</h2>${sub ? `<p class="modal__sub">${sub}</p>` : ""}</div>
      <button type="button" class="icon-btn" data-act="close-report" aria-label="ปิด">${icon("close")}</button>
    </div>`;

  function render() {
    const body = $("#reportBody");
    const r = KY.reviews.all().find(x => String(x.id) === st.reviewId);
    const what = r ? `${esc(r.menu)} · ${esc(r.shop)}` : "";

    if (!KY.auth.user) {
      body.innerHTML = head(what) + `
        <div class="modal__content">
          <p class="callout">${icon("info")}<span>เพื่อกันการรายงานมั่ว ต้องเข้าสู่ระบบด้วย Google ก่อนรายงาน ผู้ใช้คนอื่นจะไม่เห็นว่าใครเป็นคนรายงาน</span></p>
        </div>
        <div class="modal__foot">
          <button type="button" class="btn btn-secondary btn-lg btn-block google-btn" data-act="sign-in">${KY.auth.googleIcon}เข้าสู่ระบบด้วย Google</button>
        </div>`;
      return;
    }

    body.innerHTML = head(what) + `
      <form class="modal__content" id="reportForm" novalidate>
        <div class="field" id="g-reason">
          <span class="field__label" id="reasonLabel">เกิดอะไรขึ้นกับรีวิวนี้</span>
          <div class="toggle-group" role="radiogroup" aria-labelledby="reasonLabel">
            ${KY.data.REPORT_REASONS.map(([k, label]) =>
              `<button type="button" class="toggle" role="radio" data-act="report-reason" data-v="${k}" aria-checked="${st.reason === k}">${icon("check", "toggle__check")}${label}</button>`).join("")}
          </div>
          <p class="field__error" aria-live="polite"></p>
        </div>
        <div class="field" id="g-detail">
          <label class="field__label" for="rDetail">รายละเอียด <span class="muted" id="detailHint">(ไม่บังคับ)</span></label>
          <textarea id="rDetail" class="input" maxlength="${DETAIL_MAX}" rows="3" placeholder="เช่น ร้านย้ายไปอยู่หลังมอแล้ว หรือข้อความไหนไม่เหมาะสม"></textarea>
          <p class="field__error" aria-live="polite"></p>
        </div>
        <p class="fineprint fineprint--start">ผู้ดูแลจะตรวจสอบและตัดสินใจเองว่าจะลบรีวิวหรือไม่ เจ้าของรีวิวและผู้ใช้คนอื่นจะไม่เห็นชื่อคุณ</p>
      </form>
      <div class="modal__foot">
        <button type="submit" form="reportForm" class="btn btn-primary btn-lg btn-block" id="reportSubmit">ส่งรายงาน</button>
        <p class="field__error field__error--center" id="reportError" role="alert"></p>
      </div>`;
    $("#reportForm").addEventListener("submit", e => { e.preventDefault(); submit(); });
    $("#rDetail").addEventListener("input", () => setError("g-detail", ""));
  }

  function setError(id, msg) {
    const g = document.getElementById(id); if (!g) return;
    g.classList.toggle("has-error", !!msg);
    g.querySelector(".field__error").textContent = msg || "";
  }

  function setReason(v) {
    st.reason = v;
    $$('#reportBody [data-act="report-reason"]').forEach(b => {
      b.setAttribute("aria-checked", String(b.dataset.v === v));
    });
    $("#detailHint").textContent = v === "other" ? "(บอกเหตุผลสั้นๆ)" : "(ไม่บังคับ)";
    setError("g-reason", "");
  }

  async function submit() {
    if (st.busy) return;
    const detail = $("#rDetail").value.trim();
    setError("g-reason", st.reason ? "" : "กรุณาเลือกเหตุผล");
    setError("g-detail", st.reason === "other" && !detail ? "กรุณาบอกเหตุผลสั้นๆ" : "");
    if (!st.reason || (st.reason === "other" && !detail)) return;

    st.busy = true;
    const btn = $("#reportSubmit");
    btn.disabled = true; btn.textContent = "กำลังส่ง…";
    $("#reportError").textContent = "";
    try {
      const { error } = await KY.db.client.from("review_reports").insert({ review_id: st.reviewId, reason: st.reason, detail });
      if (error && error.code !== "23505") throw error;
      st.busy = false;
      close();
      toast(error ? "คุณรายงานรีวิวนี้ไปแล้ว ผู้ดูแลกำลังตรวจสอบ" : "ส่งรายงานแล้ว ขอบคุณที่ช่วยดูแลข้อมูล");
    } catch (e) {
      console.error("report", e);
      st.busy = false; btn.disabled = false; btn.textContent = "ลองส่งอีกครั้ง";
      $("#reportError").textContent = "ส่งรายงานไม่สำเร็จ กรุณาลองใหม่";
    }
  }

  function open(reviewId) {
    if (!KY.db.client) { toast("ยังเชื่อมต่อระบบไม่ได้ในขณะนี้"); return; }
    Object.assign(st, { reviewId: String(reviewId), reason: "", busy: false });
    render();
    openModal("reportModal", KY.auth.user ? ".toggle" : ".google-btn");
  }
  const close = () => closeModal("reportModal");

  KY.report = { open, close, setReason };
})(window.KY = window.KY || {});
