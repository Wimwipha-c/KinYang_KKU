/*
 * การเข้าสู่ระบบด้วย Google (ผ่าน Supabase Auth)
 * ไม่บังคับ: ถ้าไม่เข้าสู่ระบบก็ใช้เว็บได้ตามปกติในฐานะ guest
 */
(function (KY) {
  "use strict";
  const { toast } = KY.ui;
  const client = KY.db.client;

  const auth = { user: null, isAdmin: false, ready: false };
  const listeners = [];
  let lastId = null;

  const notify = () => listeners.forEach(fn => { try { fn(auth); } catch (e) { console.error(e); } });

  function onChange(fn) { listeners.push(fn); }

  async function apply(session) {
    const user = session ? session.user : null;
    const id = user ? user.id : null;
    auth.user = user;
    if (id !== lastId || !auth.ready) {
      lastId = id;
      auth.isAdmin = false;
      if (id) {
        try {
          const { data, error } = await client.rpc("is_admin");
          if (error) throw error;
          auth.isAdmin = data === true;
        } catch (e) {
          console.warn("is_admin", e && e.message);
        }
        if (lastId !== id) return;   // ระหว่างรอ ผู้ใช้เปลี่ยนบัญชีไปแล้ว
      }
      auth.ready = true;
      notify();
    }
  }

  function displayName(user = auth.user) {
    if (!user) return "";
    const m = user.user_metadata || {};
    return m.full_name || m.name || (user.email || "").split("@")[0];
  }

  function avatarUrl(user = auth.user) {
    const m = (user && user.user_metadata) || {};
    return m.avatar_url || m.picture || "";
  }

  async function signIn() {
    if (!client) { toast("ยังเชื่อมต่อระบบสมาชิกไม่ได้ในขณะนี้"); return; }
    if (location.protocol === "file:") { toast("เปิดเว็บผ่านเซิร์ฟเวอร์ก่อน จึงจะเข้าสู่ระบบได้"); return; }
    const { error } = await client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: location.origin + location.pathname }
    });
    if (error) { console.error("sign in", error); toast("เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่"); }
  }

  async function signOut() {
    if (!client) return;
    const { error } = await client.auth.signOut();
    if (error) { console.error("sign out", error); toast("ออกจากระบบไม่สำเร็จ กรุณาลองใหม่"); return; }
    toast("ออกจากระบบแล้ว");
  }

  if (client && client.auth) {
    // ห้ามเรียก Supabase ภายใน callback นี้โดยตรง (จะค้าง) จึงเลื่อนไปทำหลัง callback จบ
    client.auth.onAuthStateChange((event, session) => { setTimeout(() => apply(session), 0); });
  } else {
    auth.ready = true;
  }

  // โลโก้ Google สำหรับปุ่มเข้าสู่ระบบ (ใช้สีตามแบรนด์ จึงไม่ได้อยู่ในชุดไอคอนเส้น)
  const googleIcon = `<svg class="g-logo" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81z"/>
    <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3.01c-1.07.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.27v3.11A12 12 0 0 0 12 24z"/>
    <path fill="#FBBC05" d="M5.28 14.28A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.38-2.28V6.61H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39l4.01-3.11z"/>
    <path fill="#EA4335" d="M12 4.77c1.76 0 3.34.61 4.59 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.61l4.01 3.11C6.22 6.88 8.87 4.77 12 4.77z"/>
  </svg>`;

  Object.assign(auth, { onChange, signIn, signOut, displayName, avatarUrl, googleIcon });
  KY.auth = auth;
})(window.KY = window.KY || {});
