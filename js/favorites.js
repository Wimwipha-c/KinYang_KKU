/*
 * ลิสต์ของฉัน (เมนูโปรด): บันทึกเมนูจากเซียมซี หรือรีวิวที่ชอบ
 * - guest: เก็บใน localStorage ของเครื่องนี้
 * - เข้าสู่ระบบแล้ว: เก็บในตาราง favorites ของบัญชี (เห็นได้คนเดียว)
 *   และย้ายรายการที่เคยบันทึกตอนเป็น guest เข้าบัญชีให้อัตโนมัติ
 */
(function (KY) {
  "use strict";
  const { $, $$, esc, icon, storage, pick, stars } = KY.utils;
  const { CATEGORIES, MENUS } = KY.data;
  const { toast, openModal, closeModal } = KY.ui;

  const LOCAL_KEY = "kky_favs";
  const TABLE = "favorites";

  const fav = { items: storage.get(LOCAL_KEY, []), remote: false, picked: null };
  let seq = 0;

  const db = () => KY.db.client;
  const same = (kind, ref) => i => i.kind === kind && i.ref === ref;
  const has = (kind, ref) => fav.items.some(same(kind, String(ref)));
  const fromRow = r => ({ kind: r.kind, ref: r.ref, data: r.data || {}, at: Date.parse(r.created_at) || Date.now() });

  // ข้อมูลที่เก็บไว้แสดงในลิสต์ (รีวิวอาจถูกลบหรือเก่าเกินกว่าที่โหลดมา จึงเก็บสำเนาสั้นๆ ไว้)
  function snapshot(kind, ref) {
    if (kind === "menu") {
      const m = MENUS.find(x => x.name === ref);
      return { cat: m ? m.cat : "other" };
    }
    const r = KY.reviews.all().find(x => String(x.id) === ref);
    if (!r) return {};
    return { menu: r.menu, shop: r.shop, area: r.area, loc: r.loc, rating: r.rating, cat: KY.list.categoryOf(r) };
  }

  function button(kind, ref, cls = "") {
    const on = has(kind, ref);
    return `<button type="button" class="icon-btn fav-btn ${cls}" data-act="fav" data-fav-kind="${kind}" data-fav-ref="${esc(ref)}" aria-pressed="${on}" aria-label="บันทึกลงลิสต์ของฉัน">${icon("heart")}</button>`;
  }

  async function toggle(kind, ref) {
    ref = String(ref);
    const was = has(kind, ref);
    const before = fav.items;
    const item = { kind, ref, data: snapshot(kind, ref), at: Date.now() };
    fav.items = was ? fav.items.filter(i => !same(kind, ref)(i)) : [item, ...fav.items];
    if (fav.picked && was && same(kind, ref)(fav.picked)) fav.picked = null;
    if (!fav.remote) storage.set(LOCAL_KEY, fav.items);
    changed();
    toast(was ? "นำออกจากลิสต์ของฉันแล้ว" : "บันทึกลงลิสต์ของฉันแล้ว");
    if (!fav.remote) return;
    try {
      const { error } = was
        ? await db().from(TABLE).delete().match({ kind, ref })
        : await db().from(TABLE).upsert({ kind, ref, data: item.data }, { onConflict: "user_id,kind,ref" });
      if (error) throw error;
    } catch (e) {
      console.error("favorite", e);
      fav.items = before; changed();
      toast("บันทึกไม่สำเร็จ กรุณาลองใหม่");
    }
  }

  async function onAuth(auth) {
    const mine = ++seq;
    const local = storage.get(LOCAL_KEY, []);
    if (!auth.user || !db()) {
      fav.remote = false; fav.items = local; fav.picked = null; changed();
      return;
    }
    try {
      const { data, error } = await db().from(TABLE).select("kind, ref, data, created_at").order("created_at", { ascending: false });
      if (error) throw error;
      if (mine !== seq) return;
      const remote = data.map(fromRow);
      const missing = local.filter(l => !remote.some(same(l.kind, l.ref)));
      if (missing.length) {
        const { error: upErr } = await db().from(TABLE)
          .upsert(missing.map(i => ({ kind: i.kind, ref: i.ref, data: i.data || {} })), { onConflict: "user_id,kind,ref" });
        if (upErr) throw upErr;
        toast(`ย้ายเมนูโปรด ${missing.length} รายการเข้าบัญชีแล้ว`);
      }
      storage.set(LOCAL_KEY, []);
      if (mine !== seq) return;
      fav.remote = true; fav.items = [...missing, ...remote]; fav.picked = null;
    } catch (e) {
      console.error("load favorites", e);
      if (mine !== seq) return;
      fav.remote = false; fav.items = local;
      toast("โหลดลิสต์ของฉันจากบัญชีไม่สำเร็จ");
    }
    changed();
  }

  /* ---------- แสดงผล ---------- */
  function changed() {
    $$("[data-fav-kind]").forEach(b => b.setAttribute("aria-pressed", String(has(b.dataset.favKind, b.dataset.favRef))));
    const badge = $("#favCount");
    if (badge) { badge.textContent = fav.items.length; badge.hidden = !fav.items.length; }
    if ($("#favModal").classList.contains("is-open")) render();
  }

  const mapsUrl = q => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);

  function itemParts(i) {
    const d = i.data || {};
    const cat = CATEGORIES[d.cat] ? d.cat : "other";
    if (i.kind === "menu") {
      return {
        cat, title: i.ref, meta: CATEGORIES[cat].label,
        action: `<a class="btn btn-ghost btn-sm" href="${mapsUrl(`${i.ref} ใกล้ มหาวิทยาลัยขอนแก่น`)}" target="_blank" rel="noopener noreferrer">${icon("map")}หาร้าน</a>`
      };
    }
    const where = [d.shop, d.area].filter(Boolean).map(esc).join(" · ");
    return {
      cat, title: d.menu || "รีวิว",
      meta: `${where}${d.rating ? ` ${stars(Number(d.rating), "stars--sm")}` : ""}`,
      metaHtml: true,
      action: d.shop ? `<button type="button" class="btn btn-ghost btn-sm" data-act="fav-show" data-v="${esc(d.shop)}">${icon("search")}ดูรีวิว</button>` : ""
    };
  }

  function rowHtml(i) {
    const p = itemParts(i);
    return `<li class="fav-row">
      <span class="cat-badge cat-${p.cat}">${icon(CATEGORIES[p.cat].icon)}</span>
      <span class="fav-row__body"><span class="fav-row__title">${esc(p.title)}</span><span class="fav-row__meta">${p.metaHtml ? p.meta : esc(p.meta)}</span></span>
      <span class="fav-row__actions">${p.action}${button(i.kind, i.ref)}</span>
    </li>`;
  }

  function render() {
    const user = KY.auth && KY.auth.user;
    const menus = fav.items.filter(i => i.kind === "menu");
    const reviews = fav.items.filter(i => i.kind === "review");
    const group = (title, rows) => rows.length ? `<h3 class="fav-group">${title} <span class="muted">${rows.length}</span></h3><ul class="fav-list">${rows.map(rowHtml).join("")}</ul>` : "";

    const where = user
      ? `<p class="callout">${icon("check")}<span>เก็บไว้ในบัญชี <b>${esc(user.email || KY.auth.displayName())}</b> เห็นได้เฉพาะคุณ เปิดจากเครื่องไหนก็เจอ</span></p>`
      : `<p class="notice">${icon("info")}<span>บันทึกไว้ในเครื่องนี้เท่านั้น ถ้าล้างข้อมูลเบราว์เซอร์จะหายไป
          ${KY.db.client ? `<button type="button" class="text-btn" data-act="sign-in">เข้าสู่ระบบด้วย Google</button> เพื่อเก็บไว้ในบัญชี` : ""}</span></p>`;

    let picked = "";
    if (fav.picked) {
      const p = itemParts(fav.picked);
      picked = `<div class="fav-pick" role="status">
        <span class="fav-pick__label">วันนี้กินอันนี้เลย</span>
        <div class="fav-pick__main">
          <span class="cat-badge cat-badge--lg cat-${p.cat}">${icon(CATEGORIES[p.cat].icon)}</span>
          <span class="fav-row__body"><span class="fav-pick__title">${esc(p.title)}</span><span class="fav-row__meta">${p.metaHtml ? p.meta : esc(p.meta)}</span></span>
        </div>
        ${p.action ? `<div class="fav-pick__action">${p.action}</div>` : ""}
      </div>`;
    }

    const body = fav.items.length
      ? picked + group("เมนู", menus) + group("รีวิวที่บันทึกไว้", reviews)
      : `<div class="empty-state empty-state--sm">
          <span class="empty-state__icon">${icon("heart")}</span>
          <h3>ยังไม่มีอะไรในลิสต์</h3>
          <p>กดรูปหัวใจบนรีวิว หรือบนผลเซียมซี เพื่อเก็บเมนูโดนใจไว้ดูตอนคิดไม่ออก</p>
        </div>`;

    $("#favBody").innerHTML = `
      <div class="modal__head">
        <div><h2 class="modal__title" id="favTitle">ลิสต์ของฉัน</h2><p class="modal__sub">${fav.items.length ? `${fav.items.length} รายการ` : "เมนูโดนใจที่คุณบันทึกไว้"}</p></div>
        <button type="button" class="icon-btn" data-act="close-favs" aria-label="ปิด">${icon("close")}</button>
      </div>
      <div class="modal__content">${where}${body}</div>
      ${fav.items.length ? `<div class="modal__foot">
        <button type="button" class="btn btn-primary btn-lg btn-block" data-act="fav-pick">${icon("shuffle")}${fav.picked ? "สุ่มใหม่จากลิสต์" : "สุ่มจากลิสต์ของฉัน"}</button>
      </div>` : ""}`;
  }

  function open() { fav.picked = null; render(); openModal("favModal"); }
  const close = () => closeModal("favModal");

  function pickOne() {
    if (!fav.items.length) return;
    const pool = fav.items.length > 1 && fav.picked ? fav.items.filter(i => !same(fav.picked.kind, fav.picked.ref)(i)) : fav.items;
    fav.picked = pick(pool);
    render();
    $("#favBody").scrollTop = 0;
  }

  // ปิดลิสต์แล้วค้นหารีวิวของร้านนั้น
  function show(q) {
    close();
    KY.list.search(q);
    $("#reviews").scrollIntoView();
  }

  if (KY.auth) KY.auth.onChange(onAuth);

  KY.favs = { has, button, toggle, open, close, pickOne, show, refresh: changed };
})(window.KY = window.KY || {});
