/*
 * ตัวเชื่อม Supabase ที่ทุกส่วนใช้ร่วมกัน (รีวิว ยอดฮิต สมาชิก เมนูโปรด รายงาน)
 * KY.db.client เป็น null ถ้าไม่ได้ตั้งค่าใน js/config.js หรือโหลดไลบรารีไม่ได้
 */
(function (KY) {
  "use strict";
  const cfg = window.KY_CONFIG || {};
  let client = null;

  if (cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase) {
    try {
      client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
        // จำการเข้าสู่ระบบไว้ในเครื่อง และรับผลกลับจากหน้า Google อัตโนมัติ
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" }
      });
    } catch (e) {
      console.error("supabase init", e);
    }
  } else if (cfg.supabaseUrl) {
    console.warn("Supabase library not loaded; using local storage");
  }

  KY.db = { client };
})(window.KY = window.KY || {});
