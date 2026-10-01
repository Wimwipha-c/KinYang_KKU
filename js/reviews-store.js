/*
 * ชั้นข้อมูลรีวิว
 * - ถ้าตั้งค่า Supabase ไว้ใน js/config.js รีวิวจะเก็บในฐานข้อมูลกลาง ทุกคนเห็นร่วมกันแบบ real-time
 * - ถ้าเชื่อมไม่ได้ จะเก็บรีวิวไว้ใน localStorage ของเครื่องผู้ใช้แทน
 */
(function (KY) {
  "use strict";
  const { storage } = KY.utils;
  const LOCAL_KEY = "kky_reviews_local";
  const TABLE = "reviews";

  const store = {
    status: "ok",      // ok | loading | error
    shared: false,     // เชื่อมฐานข้อมูลกลางได้หรือไม่
    remote: [],
    local: storage.get(LOCAL_KEY, [])
  };

  let client = null, channel = null, onChange = () => {};

  // แปลงแถวจากฐานข้อมูลให้อยู่ในรูปแบบที่หน้าเว็บใช้
  const fromRow = row => ({
    ...row,
    price: row.price == null ? "" : row.price,
    createdAt: Date.parse(row.created_at)
  });

  function upsertRemote(row) {
    const review = fromRow(row);
    store.remote = [review, ...store.remote.filter(r => r.id !== review.id)];
    onChange();
  }

  function all() {
    const seen = new Set(), out = [];
    for (const r of [...store.remote, ...store.local]) {
      if (!seen.has(r.id)) { seen.add(r.id); out.push(r); }
    }
    return out;
  }

  async function load() {
    store.status = "loading"; onChange();
    const { data, error } = await client
      .from(TABLE)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) {
      console.error("load reviews", error);
      store.status = "error"; onChange();
      return;
    }
    store.remote = data.map(fromRow);
    store.status = "ok"; onChange();
  }

  function listen() {
    if (channel) client.removeChannel(channel);
    channel = client
      .channel("reviews-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: TABLE }, payload => upsertRemote(payload.new))
      .on("postgres_changes", { event: "DELETE", schema: "public", table: TABLE }, payload => {
        store.remote = store.remote.filter(r => r.id !== payload.old.id);
        onChange();
      })
      .subscribe();
  }

  async function init(changeHandler) {
    onChange = changeHandler || onChange;
    const cfg = window.KY_CONFIG || {};
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey || !window.supabase) {
      if (cfg.supabaseUrl) console.warn("Supabase library not loaded; using local storage");
      return;
    }
    try {
      client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
        auth: { persistSession: false }
      });
      store.shared = true;
      await load();
      listen();
    } catch (e) {
      console.error("supabase init", e);
      store.status = "error"; onChange();
    }
  }

  function retry() {
    if (client) load();
    else { store.status = "ok"; onChange(); }
  }

  // คืนค่า true ถ้าบันทึกลงฐานข้อมูลกลางได้ (ถ้าล้มเหลวจะ throw ให้ฟอร์มแสดงข้อความ)
  async function add(review) {
    if (client) {
      const row = {
        menu: review.menu, shop: review.shop, loc: review.loc, area: review.area,
        price: review.price === "" ? null : review.price,
        rating: review.rating, text: review.text, name: review.name, cat: review.cat
      };
      const { data, error } = await client.from(TABLE).insert(row).select().single();
      if (error) throw error;
      upsertRemote(data);
      return true;
    }
    const id = "local-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
    store.local = [{ ...review, id, _local: true }, ...store.local].slice(0, 100);
    storage.set(LOCAL_KEY, store.local);
    onChange();
    return false;
  }

  // ตัวเชื่อม Supabase สำหรับส่วนอื่นที่ใช้ฐานข้อมูลเดียวกัน (null ถ้าไม่ได้เชื่อม)
  const db = () => client;

  KY.reviews = { state: store, all, init, retry, add, db };
})(window.KY = window.KY || {});
