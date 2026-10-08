/* ปุ่มบัญชีบน header และหน้าต่างบัญชี (ชื่อ อีเมล ลิสต์ของฉัน หน้าผู้ดูแล ออกจากระบบ) */
(function (KY) {
  "use strict";
  const { $, esc, icon } = KY.utils;
  const { openModal, closeModal } = KY.ui;
  const auth = KY.auth;

  function avatarHtml(cls = "") {
    const url = auth.avatarUrl();
    const initial = esc((KY.profile.name() || "?").trim().charAt(0).toUpperCase());
    return url
      ? `<img class="user-avatar ${cls}" src="${esc(url)}" alt="" referrerpolicy="no-referrer">`
      : `<span class="user-avatar ${cls}" aria-hidden="true">${initial}</span>`;
  }

  function renderHeader() {
    const slot = $("#accountSlot");
    if (!slot) return;
    slot.hidden = !KY.db.client;
    if (!auth.ready) { slot.innerHTML = ""; return; }   // รอเช็กการเข้าสู่ระบบก่อน ไม่ให้ปุ่มกะพริบ
    slot.innerHTML = auth.user
      ? `<button type="button" class="avatar-btn" data-act="account" aria-label="บัญชีของ ${esc(KY.profile.name())}">${avatarHtml()}</button>`
      : `<button type="button" class="btn btn-secondary btn-sm google-btn" data-act="sign-in" aria-label="เข้าสู่ระบบด้วย Google">${auth.googleIcon}<span class="hide-sm">เข้าสู่ระบบ</span></button>`;
  }

  function render() {
    const u = auth.user;
    if (!u) { close(); return; }
    $("#accountBody").innerHTML = `
      <div class="modal__head">
        <div class="account-head">
          ${avatarHtml("user-avatar--lg")}
          <div><h2 class="modal__title" id="accountTitle">${esc(KY.profile.name())}</h2><p class="modal__sub">${esc([KY.profile.authorLabel({ faculty: KY.profile.faculty(), year: KY.profile.year() }), u.email].filter(Boolean).join(" · "))}</p></div>
        </div>
        <button type="button" class="icon-btn" data-act="close-account" aria-label="ปิด">${icon("close")}</button>
      </div>
      <div class="modal__content">
        <ul class="menu-list">
          <li><button type="button" class="menu-item" data-act="profile">${icon("user")}<span>แก้ไขโปรไฟล์</span>${icon("arrow", "menu-item__end")}</button></li>
          <li><button type="button" class="menu-item" data-act="my-reviews">${icon("pen")}<span>รีวิวของฉัน</span>${icon("arrow", "menu-item__end")}</button></li>
          <li><button type="button" class="menu-item" data-act="streak">${icon("flame")}<span>สตรีคและป้ายสะสม</span>${icon("arrow", "menu-item__end")}</button></li>
          <li><button type="button" class="menu-item" data-act="favs">${icon("heart")}<span>ลิสต์ของฉัน</span>${icon("arrow", "menu-item__end")}</button></li>
          ${auth.isAdmin ? `<li><a class="menu-item" href="admin.html">${icon("shield")}<span>ตรวจรายงานรีวิว <span class="muted">(ผู้ดูแล)</span></span>${icon("arrow", "menu-item__end")}</a></li>` : ""}
        </ul>
      </div>
      <div class="modal__foot">
        <button type="button" class="btn btn-secondary btn-block" data-act="sign-out">${icon("logout")}ออกจากระบบ</button>
      </div>`;
  }

  function open() { render(); openModal("accountModal"); }
  const close = () => closeModal("accountModal");

  async function signOut() {
    close();
    await auth.signOut();
  }

  // รอโหลดโปรไฟล์ก่อนค่อยวาดปุ่ม จะได้ใช้ชื่อในโปรไฟล์ (profile.js แจ้งทุกครั้งที่สถานะเข้าสู่ระบบหรือโปรไฟล์เปลี่ยน)
  KY.profile.onChange(() => {
    renderHeader();
    if ($("#accountModal").classList.contains("is-open")) render();
  });
  renderHeader();

  KY.account = { open, close, signOut };
})(window.KY = window.KY || {});
