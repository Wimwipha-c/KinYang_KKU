/*
 * หน้าผู้ดูแล (admin.html): ตรวจรายงานรีวิว
 * เปิดได้เฉพาะบัญชีที่อยู่ในตาราง admins (เพิ่มผู้ดูแลได้ทาง SQL Editor ดู README)
 * สิทธิ์จริงถูกบังคับในฐานข้อมูลด้วย RLS หน้านี้แค่ซ่อนปุ่มให้คนที่ไม่ใช่ผู้ดูแล
 */
(function (KY) {
  "use strict";
  const { $, $$, esc, icon, stars, formatDate } = KY.utils;
  const { REPORT_REASONS, LOCATIONS } = KY.data;
  const { toast } = KY.ui;
  const auth = KY.auth;
  const db = KY.db.client;

  const REASON_LABEL = Object.fromEntries(REPORT_REASONS);
  const st = { tab: "pending", reports: [], status: "idle", busy: new Set() };

  /* ---------- สถานะก่อนเข้าถึงข้อมูล ---------- */
  function gate(iconName, title, body, actions = "") {
    $("#adminTabs").hidden = true;
    $("#adminRefresh").hidden = true;
    $("#adminMeta").textContent = "";
    $("#adminBody").innerHTML = `<div class="empty-state">
      <span class="empty-state__icon">${icon(iconName)}</span>
      <h3>${title}</h3><p>${body}</p>
      <div class="empty-state__actions">${actions}</div>
    </div>`;
  }

  function onAuth() {
    if (!db) return gate("alert", "เชื่อมต่อฐานข้อมูลไม่ได้", "ตรวจสอบค่าใน js/config.js");
    if (!auth.ready) return gate("shield", "กำลังตรวจสอบสิทธิ์…", "");
    if (!auth.user) {
      return gate("shield", "สำหรับผู้ดูแลเท่านั้น", "เข้าสู่ระบบด้วยบัญชี Google ที่ได้รับสิทธิ์ผู้ดูแล",
        `<button type="button" class="btn btn-secondary btn-lg google-btn" data-act="sign-in">${auth.googleIcon}เข้าสู่ระบบด้วย Google</button>`);
    }
    if (!auth.isAdmin) {
      return gate("alert", "บัญชีนี้ไม่ใช่ผู้ดูแล",
        `<b>${esc(auth.user.email || "")}</b> ยังไม่ได้รับสิทธิ์ ให้ผู้ดูแลระบบเพิ่มอีเมลนี้ในตาราง admins (ดูวิธีใน README) แล้วโหลดหน้านี้ใหม่`,
        `<button type="button" class="btn btn-secondary" data-act="sign-out">${icon("logout")}ออกจากระบบ</button>`);
    }
    load();
  }

  /* ---------- โหลดและจัดกลุ่ม ---------- */
  async function load() {
    st.status = "loading"; render();
    const { data, error } = await db
      .from("review_reports")
      .select("id, review_id, reason, detail, status, created_at, resolved_at, review:reviews(id, menu, shop, area, loc, rating, text, name, created_at)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) { console.error("load reports", error); st.status = "error"; render(); return; }
    st.reports = data;
    st.status = "ok"; render();
  }

  // รวมรายงานของรีวิวเดียวกันเป็นการ์ดเดียว เรียงตามรายงานล่าสุด
  function groups(status) {
    const map = new Map();
    for (const r of st.reports) {
      if (r.status !== status || !r.review) continue;
      if (!map.has(r.review_id)) map.set(r.review_id, { review: r.review, reports: [] });
      map.get(r.review_id).reports.push(r);
    }
    return [...map.values()];
  }

  /* ---------- แสดงผล ---------- */
  function reportHtml(r) {
    return `<li class="report">
      <span class="report__reason reason-${r.reason}">${icon("flag")}${esc(REASON_LABEL[r.reason] || r.reason)}</span>
      ${r.detail ? `<span class="report__detail">“${esc(r.detail)}”</span>` : ""}
      <span class="report__date">${formatDate(Date.parse(r.created_at))}</span>
    </li>`;
  }

  function cardHtml(g) {
    const v = g.review, n = g.reports.length;
    const busy = st.busy.has(v.id) ? " disabled" : "";
    const resolved = st.tab === "resolved" && g.reports[0].resolved_at;
    return `<article class="admin-card">
      <div class="admin-card__review">
        <div class="admin-card__top">
          <h2 class="admin-card__title">${esc(v.menu)}</h2>
          ${stars(Number(v.rating) || 0)}
        </div>
        <p class="admin-card__shop">${esc(v.shop)} · ${esc(v.area)} <span class="muted">(${v.loc === "out" ? LOCATIONS.out : LOCATIONS.in})</span></p>
        <p class="admin-card__text">${esc(v.text)}</p>
        <p class="admin-card__by">โดย ${esc(v.name)} · ${formatDate(Date.parse(v.created_at))}</p>
      </div>
      <div class="admin-card__reports">
        <p class="admin-card__count">${st.tab === "pending" ? `ถูกรายงาน <b>${n}</b> ครั้ง` : `ตรวจแล้ว ${resolved ? formatDate(Date.parse(resolved)) : ""} · ${n} รายงาน`}</p>
        <ul class="report-list">${g.reports.map(reportHtml).join("")}</ul>
      </div>
      ${st.tab === "pending" ? `<div class="admin-card__actions">
        <button type="button" class="btn btn-secondary" data-act="admin-keep" data-v="${esc(v.id)}"${busy}>${icon("check")}เก็บรีวิวไว้</button>
        <button type="button" class="btn btn-danger" data-act="admin-delete" data-v="${esc(v.id)}"${busy}>${icon("trash")}ลบรีวิว</button>
      </div>` : ""}
    </article>`;
  }

  function render() {
    const body = $("#adminBody");
    $("#adminRefresh").hidden = false;
    if (st.status === "loading" && !st.reports.length) {
      $("#adminTabs").hidden = true;
      $("#adminMeta").textContent = "กำลังโหลดรายงาน…";
      body.innerHTML = `<div class="admin-list">${'<div class="skeleton"></div>'.repeat(2)}</div>`;
      return;
    }
    if (st.status === "error") {
      $("#adminTabs").hidden = true;
      $("#adminMeta").textContent = "";
      body.innerHTML = `<div class="empty-state">
        <span class="empty-state__icon">${icon("alert")}</span>
        <h3>โหลดรายงานไม่สำเร็จ</h3><p>ถ้ายังไม่ได้รัน SQL ส่วน "ระบบสมาชิก" ใน supabase/schema.sql ให้รันก่อน</p>
        <div class="empty-state__actions"><button type="button" class="btn btn-primary" data-act="admin-refresh">${icon("refresh")}ลองใหม่</button></div>
      </div>`;
      return;
    }

    const pending = groups("pending"), resolved = groups("resolved");
    const tabs = [["pending", "รอตรวจ", pending.length], ["resolved", "ตรวจแล้ว", resolved.length]];
    const tabsEl = $("#adminTabs");
    tabsEl.hidden = false;
    tabsEl.innerHTML = tabs.map(([k, label, n]) =>
      `<button type="button" class="seg-btn" data-act="admin-tab" data-v="${k}" aria-pressed="${st.tab === k}">${label}<span class="seg-count">${n}</span></button>`).join("");
    $("#adminMeta").textContent = pending.length ? `มี ${pending.length} รีวิวรอตรวจ` : "ไม่มีรีวิวรอตรวจ";

    const list = st.tab === "pending" ? pending : resolved;
    body.innerHTML = list.length
      ? `<div class="admin-list">${list.map(cardHtml).join("")}</div>`
      : `<div class="empty-state">
          <span class="empty-state__icon">${icon("check")}</span>
          <h3>${st.tab === "pending" ? "เคลียร์หมดแล้ว" : "ยังไม่มีรายงานที่ตรวจแล้ว"}</h3>
          <p>${st.tab === "pending" ? "ตอนนี้ไม่มีรีวิวที่ถูกรายงานรอตรวจ" : "รายงานที่กด “เก็บรีวิวไว้” จะมาอยู่ที่นี่"}</p>
        </div>`;
  }

  /* ---------- การกระทำของผู้ดูแล ---------- */
  async function act(reviewId, fn) {
    if (st.busy.has(reviewId)) return;
    st.busy.add(reviewId); render();
    try { await fn(); }
    catch (e) { console.error("admin", e); toast("ทำรายการไม่สำเร็จ กรุณาลองใหม่"); }
    st.busy.delete(reviewId); render();
  }

  function remove(reviewId) {
    const g = groups("pending").find(x => x.review.id === reviewId);
    const name = g ? `${g.review.menu} (${g.review.shop})` : "รีวิวนี้";
    if (!confirm(`ลบ ${name} ถาวร?\nรีวิวจะหายจากเว็บของทุกคนทันที และกู้คืนไม่ได้`)) return;
    act(reviewId, async () => {
      const { data, error } = await db.from("reviews").delete().eq("id", reviewId).select("id");
      if (error) throw error;
      if (!data.length) { toast("ลบไม่สำเร็จ บัญชีนี้อาจไม่มีสิทธิ์ลบ"); return; }
      st.reports = st.reports.filter(r => r.review_id !== reviewId);   // รายงานถูกลบตามรีวิวในฐานข้อมูลด้วย
      toast("ลบรีวิวแล้ว");
    });
  }

  function keep(reviewId) {
    act(reviewId, async () => {
      const now = new Date().toISOString();
      const { data, error } = await db.from("review_reports")
        .update({ status: "resolved", resolved_at: now })
        .eq("review_id", reviewId).eq("status", "pending")
        .select("id");
      if (error) throw error;
      const ids = new Set(data.map(r => r.id));
      st.reports = st.reports.map(r => (ids.has(r.id) ? { ...r, status: "resolved", resolved_at: now } : r));
      toast("เก็บรีวิวไว้ และย้ายรายงานไปที่ตรวจแล้ว");
    });
  }

  const actions = {
    "theme": () => KY.theme.toggle(),
    "sign-in": () => auth.signIn(),
    "sign-out": () => auth.signOut(),
    "admin-refresh": () => load(),
    "admin-tab": (el, v) => { st.tab = v; render(); },
    "admin-delete": (el, v) => remove(v),
    "admin-keep": (el, v) => keep(v)
  };
  document.addEventListener("click", e => {
    const el = e.target.closest("[data-act]");
    if (!el) return;
    const fn = actions[el.dataset.act];
    if (fn) fn(el, el.dataset.v);
  });

  auth.onChange(onAuth);
  onAuth();
})(window.KY = window.KY || {});
