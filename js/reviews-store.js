/*
 * ชั้นข้อมูลรีวิว
 * - ถ้ารันใน Claude Artifact ที่มีฐานข้อมูลกลาง (window.claude.use("db")) จะอ่าน/เขียนรีวิวร่วมกันได้
 * - ถ้าไม่มี จะเก็บรีวิวไว้ใน localStorage ของเครื่องผู้ใช้
 */
(function (KY) {
  "use strict";
  const { storage } = KY.utils;
  const LOCAL_KEY = "kky_reviews_local";

  const store = {
    status: "ok",      // ok | loading | error
    shared: false,     // เชื่อมฐานข้อมูลกลางได้หรือไม่
    remote: [],
    local: storage.get(LOCAL_KEY, [])
  };

  let db = null, unsubscribe = null, onChange = () => {};

  function all() {
    const seen = new Set(), out = [];
    for (const r of [...store.remote, ...store.local]) {
      if (!seen.has(r.id)) { seen.add(r.id); out.push(r); }
    }
    return out;
  }

  function subscribe() {
    if (!db) return;
    if (unsubscribe) { try { unsubscribe(); } catch (e) { /* ignore */ } unsubscribe = null; }
    store.status = "loading"; onChange();
    try {
      unsubscribe = db.collection("reviews").orderBy("createdAt", "desc").limit(300).onSnapshot(
        snap => {
          store.remote = snap.docs.filter(d => d.exists).map(d => ({ ...d.data(), id: d.id }));
          store.status = "ok"; onChange();
        },
        err => { console.error("reviews snapshot", err); store.status = "error"; onChange(); }
      );
    } catch (e) {
      console.error("reviews subscribe", e);
      store.status = "error"; onChange();
    }
  }

  async function init(changeHandler) {
    onChange = changeHandler || onChange;
    try {
      if (!window.claude || !window.claude.use) return;
      const handle = await window.claude.use("db");
      if (!handle) return;
      db = handle; store.shared = true;
      subscribe();
    } catch (e) {
      console.error("db init", e);
    }
  }

  function retry() {
    if (db) subscribe();
    else { store.status = "ok"; onChange(); }
  }

  // คืนค่า true ถ้าบันทึกลงฐานข้อมูลกลางได้
  async function add(review) {
    if (db) {
      try { await db.collection("reviews").add(review); return true; }
      catch (e) { console.error("db add", e); }
    }
    const id = "local-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
    store.local = [{ ...review, id, _local: true }, ...store.local].slice(0, 100);
    storage.set(LOCAL_KEY, store.local);
    onChange();
    return false;
  }

  KY.reviews = { state: store, all, init, retry, add };
})(window.KY = window.KY || {});
