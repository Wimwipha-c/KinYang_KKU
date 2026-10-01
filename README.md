# กินหยัง KKU

เว็บรีวิวร้านอาหารในและรอบมหาวิทยาลัยขอนแก่น พร้อม "เซียมซีกินหยัง" สำหรับสุ่มเลือกเมนู

## เปิดใช้งาน

เป็นเว็บ static ล้วน ไม่ต้อง build ไม่มี dependency

- **ดูในเครื่อง**: ดับเบิลคลิก `index.html` ได้เลย หรือรันเซิร์ฟเวอร์ง่ายๆ
  ```bash
  python -m http.server 5173
  ```
  แล้วเปิด http://localhost:5173
- **ขึ้นออนไลน์**: อัปโหลดทั้งโฟลเดอร์ขึ้น Netlify, Vercel, GitHub Pages หรือโฮสต์ static ใดก็ได้

## โครงสร้างไฟล์

```
index.html            โครงหน้า + ชุดไอคอน SVG
assets/favicon.svg    ไอคอนเว็บ
css/
  tokens.css          สี ฟอนต์ ขนาด (ธีมสว่าง/มืด) — แก้แบรนด์ที่นี่ที่เดียว
  base.css            reset และสไตล์พื้นฐาน
  layout.css          header, hero, ส่วนรีวิว, footer
  components.css      ปุ่ม ฟอร์ม การ์ด modal toast
  fortune.css         ใบเซียมซีและแอนิเมชันกระบอก
supabase/schema.sql   สร้างตารางรีวิวและสิทธิ์ในฐานข้อมูล
js/
  config.js           ค่าเชื่อมต่อ Supabase
  data.js             เมนูในเซียมซี คณะ/โซน หมวดอาหาร
  utils.js            ฟังก์ชันช่วยทั่วไป
  ui.js               toast และ modal (จัดการโฟกัส/ปุ่ม Esc)
  theme.js            ปุ่มสลับธีมสว่าง/มืด (จำค่าที่ผู้ใช้เลือก)
  sound.js            เสียงเขย่าเซียมซี สังเคราะห์ด้วย Web Audio API ไม่ใช้ไฟล์เสียง
  reviews-store.js    การอ่าน/บันทึกรีวิว
  review-list.js      แสดงรายการรีวิวและตัวกรอง
  fortune.js          เซียมซี
  review-form.js      ฟอร์มเขียนรีวิว
  main.js             ผูก event และเริ่มแอป
```

สคริปต์ใช้รูปแบบ namespace (`window.KY`) แทน ES modules เพื่อให้เปิดไฟล์ตรงๆ ได้โดยไม่ต้องมีเซิร์ฟเวอร์
ลำดับ `<script>` ใน `index.html` จึงมีความสำคัญ

## การเก็บข้อมูลรีวิว (Supabase)

รีวิวเก็บในฐานข้อมูล Supabase ทุกคนเห็นรีวิวเดียวกัน และรีวิวใหม่ขึ้นในเครื่องคนอื่นทันที (real-time)

- ค่าการเชื่อมต่ออยู่ที่ `js/config.js` (ใช้ **anon key** เท่านั้น ห้ามใส่ service_role key)
- โครงสร้างตารางและสิทธิ์อยู่ที่ `supabase/schema.sql` — รันใน SQL Editor ของ Supabase ครั้งเดียวตอนตั้งโปรเจกต์
- สิทธิ์: ทุกคนอ่านและโพสต์ได้ แต่แก้ไขหรือลบไม่ได้
- **ลบรีวิวที่ไม่เหมาะสม:** Supabase Dashboard → Table Editor → `reviews` → เลือกแถว → Delete (รีวิวจะหายจากเว็บทุกเครื่องทันที)
- ถ้าเชื่อมฐานข้อมูลไม่ได้ (เช่น ลบค่าใน `config.js`) เว็บจะกลับไปเก็บรีวิวใน `localStorage` ของแต่ละเครื่อง
