/*
 * ค่าการเชื่อมต่อ Supabase
 * anon key ออกแบบมาให้อยู่ในหน้าเว็บได้ สิทธิ์ถูกจำกัดด้วย Row Level Security (ดู supabase/schema.sql)
 * ห้ามนำ service_role key มาใส่ในไฟล์นี้เด็ดขาด
 */
window.KY_CONFIG = {
  siteHost: "kinyangkku.vercel.app",   // แสดงบนรูปที่แชร์ เมื่อเปิดเว็บจากเครื่องตัวเอง (localhost)
  supabaseUrl: "https://kbaizxmsmrppbqdvunle.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiYWl6eG1zbXJwcGJxZHZ1bmxlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NDcwMzgsImV4cCI6MjEwNjQyMzAzOH0.Ijffap6chYG8KkiE5iebjgK4Wu_dOGgU_bWBn00G5gA"
};
