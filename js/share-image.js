/*
 * สร้างรูปใบเซียมซีสำหรับแชร์ (PNG 1080×1350, สัดส่วน 4:5 เหมาะกับ IG/LINE)
 * วาดด้วย Canvas เสมอในธีมสว่างตามสีแบรนด์ ไม่ขึ้นกับธีมที่ผู้ใช้เปิดอยู่
 */
(function (KY) {
  "use strict";
  const { thaiDigits } = KY.utils;
  const { CATEGORIES } = KY.data;

  const W = 1080, H = 1350;
  const C = {
    paper: "#F6F1E9", surface: "#FFFFFF", ink: "#1E1915", ink2: "#5C534B", ink3: "#8A8076",
    line: "#E4DBCD", lineStrong: "#CDBFAA", brand: "#B4361C", brandTint: "#F7E3DA",
    gold: "#C28A22", goldTint: "#F6EBD3"
  };
  const CAT_COLORS = {
    noodle: ["#A8620E", "#F7EAD5"], rice: ["#5E6B2B", "#ECEED8"], isan: ["#B4361C", "#F7E1D8"],
    grill: ["#8A4A28", "#F1E3D7"], sweet: ["#A63F69", "#F7E1EA"], fusion: ["#2C6763", "#DCECE9"],
    other: ["#5C534B", "#EEE6D8"]
  };
  const SERIF = '"Noto Serif Thai", Georgia, serif';
  const SANS = '"IBM Plex Sans Thai", "Noto Sans Thai", system-ui, sans-serif';

  /* ---------- helpers ---------- */
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ภาษาไทยไม่มีช่องว่างระหว่างคำ จึงตัดคำด้วย Intl.Segmenter ถ้าเบราว์เซอร์รองรับ
  function segments(text) {
    if (window.Intl && Intl.Segmenter) {
      return Array.from(new Intl.Segmenter("th", { granularity: "word" }).segment(text), s => s.segment);
    }
    return text.split(/(\s+)/);
  }

  function wrap(ctx, text, maxWidth) {
    const lines = [];
    let line = "";
    for (const seg of segments(text)) {
      const test = line + seg;
      if (!line || ctx.measureText(test).width <= maxWidth) line = test;
      else { lines.push(line.trim()); line = seg.trimStart(); }
    }
    if (line.trim()) lines.push(line.trim());
    return lines;
  }

  function fitFont(ctx, text, weight, family, start, min, maxWidth) {
    let size = start;
    do { ctx.font = `${weight} ${size}px ${family}`; size -= 4; }
    while (ctx.measureText(text).width > maxWidth && size >= min);
    return size + 4;
  }

  // แปลงไอคอนจาก SVG sprite ในหน้าเว็บเป็นรูปเพื่อวาดลง canvas
  function iconImage(name, color, size, strokeWidth) {
    return new Promise(resolve => {
      const symbol = document.getElementById("i-" + name);
      if (!symbol) return resolve(null);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${symbol.getAttribute("viewBox")}" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${symbol.innerHTML}</svg>`;
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    });
  }

  // รอฟอนต์เว็บโหลดก่อนวาด (ไม่เกิน 2.5 วินาที แล้วใช้ฟอนต์สำรอง)
  function fontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    const loads = [
      `700 100px ${SERIF}`, `600 52px ${SERIF}`, `500 40px ${SERIF}`, `600 32px ${SANS}`, `400 28px ${SANS}`
    ].map(f => document.fonts.load(f, "กินหยัง"));
    return Promise.race([Promise.all(loads), new Promise(r => setTimeout(r, 2500))]).catch(() => {});
  }

  const siteHost = () => {
    const cfg = window.KY_CONFIG || {};
    const h = location.host;
    return (!h || /^(localhost|127\.|\[::1\])/.test(h)) ? (cfg.siteHost || "") : h;
  };

  /* ---------- วาดรูป ---------- */
  async function render(fortune, { daily } = {}) {
    await fontsReady();
    const m = fortune.menu;
    const [catColor, catBg] = CAT_COLORS[m.cat] || CAT_COLORS.other;
    const [catIcon, logoIcon] = await Promise.all([
      iconImage(CATEGORIES[m.cat] ? CATEGORIES[m.cat].icon : "plate", catColor, 88, 1.6),
      iconImage("logo", "#FFFFFF", 44, 2)
    ]);

    const canvas = document.createElement("canvas");
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");
    ctx.textBaseline = "alphabetic";

    // พื้นหลัง
    ctx.fillStyle = C.paper;
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W * 0.88, -60, 40, W * 0.88, -60, 820);
    glow.addColorStop(0, "rgba(180,54,28,.16)");
    glow.addColorStop(1, "rgba(180,54,28,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // หัวข้อด้านบน
    ctx.textAlign = "center";
    ctx.fillStyle = C.ink;
    ctx.font = `600 52px ${SERIF}`;
    ctx.fillText("ดวงกินวันนี้ของฉัน", W / 2, 128);
    ctx.fillStyle = C.ink3;
    ctx.font = `400 28px ${SANS}`;
    ctx.fillText(new Date().toLocaleDateString("th-TH", { weekday: "long", day: "numeric", month: "long", year: "numeric" }), W / 2, 178);

    // ใบเซียมซี
    const sx = 90, sy = 232, sw = 900, sh = 880;
    ctx.save();
    ctx.shadowColor = "rgba(30,25,21,.18)";
    ctx.shadowBlur = 48;
    ctx.shadowOffsetY = 18;
    roundRect(ctx, sx, sy, sw, sh, 10);
    ctx.fillStyle = C.surface;
    ctx.fill();
    ctx.restore();
    roundRect(ctx, sx, sy, sw, sh, 10);
    ctx.strokeStyle = C.lineStrong; ctx.lineWidth = 2; ctx.stroke();

    const ix = sx + 20, iy = sy + 20, iw = sw - 40, ih = sh - 40;
    const headH = 84, factsH = 156;

    // ลายจุดในพื้นที่เนื้อหา
    ctx.save();
    ctx.beginPath(); ctx.rect(ix, iy + headH, iw, ih - headH - factsH); ctx.clip();
    ctx.fillStyle = C.line;
    for (let y = iy + headH + 18; y < iy + ih - factsH; y += 32) {
      for (let x = ix + 18; x < ix + iw; x += 32) { ctx.beginPath(); ctx.arc(x, y, 2, 0, Math.PI * 2); ctx.fill(); }
    }
    ctx.restore();

    // แถบหัวสีแดง
    ctx.fillStyle = C.brand;
    ctx.fillRect(ix, iy, iw, headH);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `600 32px ${SANS}`;
    ctx.textAlign = "left";
    ctx.fillText("เซียมซีกินหยัง", ix + 32, iy + 54);
    ctx.textAlign = "right";
    ctx.fillText("ใบที่ " + thaiDigits(fortune.number), ix + iw - 32, iy + 54);

    // กรอบใน
    ctx.strokeStyle = C.brand; ctx.lineWidth = 3;
    ctx.strokeRect(ix, iy, iw, ih);

    // เนื้อหากลางใบ: จัดให้อยู่กึ่งกลางแนวตั้ง
    const bodyTop = iy + headH, bodyBottom = iy + ih - factsH;
    const maxText = iw - 140;

    const menuSize = fitFont(ctx, m.name, 700, SERIF, 104, 56, maxText);
    ctx.font = `500 40px ${SERIF}`;
    const verse = wrap(ctx, `“${fortune.line}”`, maxText).slice(0, 3);
    const kickerH = 48, iconH = 140, menuH = menuSize * 1.35, verseLH = 64;
    const gap = 30;
    const total = kickerH + gap + iconH + gap + menuH + 12 + verse.length * verseLH;
    let y = bodyTop + (bodyBottom - bodyTop - total) / 2;
    ctx.textAlign = "center";

    // ป้ายด้านบน (หมวดอาหาร หรือ "ดวงกินประจำวัน")
    if (daily) {
      ctx.font = `600 26px ${SANS}`;
      const label = "ดวงกินประจำวัน";
      const pw = ctx.measureText(label).width + 48;
      roundRect(ctx, W / 2 - pw / 2, y, pw, kickerH, kickerH / 2);
      ctx.fillStyle = C.goldTint; ctx.fill();
      ctx.strokeStyle = "rgba(194,138,34,.45)"; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = C.ink;
      ctx.fillText(label, W / 2, y + 33);
    } else {
      ctx.font = `600 28px ${SANS}`;
      ctx.fillStyle = C.ink3;
      ctx.fillText((CATEGORIES[m.cat] || CATEGORIES.other).label, W / 2, y + 34);
    }
    y += kickerH + gap;

    // ไอคอนหมวด
    roundRect(ctx, W / 2 - iconH / 2, y, iconH, iconH, 30);
    ctx.fillStyle = catBg; ctx.fill();
    if (catIcon) ctx.drawImage(catIcon, W / 2 - 44, y + iconH / 2 - 44, 88, 88);
    y += iconH + gap;

    // ชื่อเมนู
    ctx.fillStyle = C.ink;
    ctx.font = `700 ${menuSize}px ${SERIF}`;
    ctx.fillText(m.name, W / 2, y + menuSize * 1.05);
    y += menuH + 12;

    // คำทำนาย
    ctx.fillStyle = C.ink2;
    ctx.font = `500 40px ${SERIF}`;
    verse.forEach((line, i) => ctx.fillText(line, W / 2, y + 46 + i * verseLH));

    // แถวข้อมูลด้านล่างของใบ
    const fy = bodyBottom, colW = iw / 3;
    ctx.fillStyle = C.surface;
    ctx.fillRect(ix + 1.5, fy, iw - 3, factsH - 1.5);
    ctx.strokeStyle = C.lineStrong; ctx.lineWidth = 2; ctx.setLineDash([10, 8]);
    ctx.beginPath(); ctx.moveTo(ix, fy); ctx.lineTo(ix + iw, fy); ctx.stroke();
    for (let i = 1; i < 3; i++) { ctx.beginPath(); ctx.moveTo(ix + colW * i, fy + 24); ctx.lineTo(ix + colW * i, fy + factsH - 24); ctx.stroke(); }
    ctx.setLineDash([]);

    const labelY = fy + 60, valueY = fy + 112;
    const cx = i => ix + colW * i + colW / 2;
    ctx.fillStyle = C.ink3; ctx.font = `400 26px ${SANS}`;
    ["สีมงคล", "เลขนำโชค", "ความเผ็ด"].forEach((t, i) => ctx.fillText(t, cx(i), labelY));

    // สีมงคล
    ctx.font = `600 32px ${SANS}`;
    const colorName = fortune.color[0];
    const cw = ctx.measureText(colorName).width;
    const startX = cx(0) - (cw + 40) / 2;
    ctx.beginPath(); ctx.arc(startX + 14, valueY - 11, 14, 0, Math.PI * 2);
    ctx.fillStyle = fortune.color[1]; ctx.fill();
    ctx.textAlign = "left"; ctx.fillStyle = C.ink;
    ctx.fillText(colorName, startX + 40, valueY);
    ctx.textAlign = "center";

    // เลขนำโชค
    ctx.font = `600 40px ${SANS}`;
    ctx.fillText(String(fortune.number), cx(1), valueY + 2);

    // ความเผ็ด
    for (let i = 0; i < 5; i++) {
      ctx.beginPath(); ctx.arc(cx(2) - 64 + i * 32, valueY - 11, 10, 0, Math.PI * 2);
      ctx.fillStyle = i < m.spice ? C.brand : C.lineStrong; ctx.fill();
    }

    // แบรนด์ด้านล่าง
    const host = siteHost();
    ctx.font = `700 44px ${SERIF}`;
    const nameW = ctx.measureText("กินหยัง").width;
    ctx.font = `600 22px ${SANS}`;
    const tagW = ctx.measureText("KKU").width;
    const groupW = 64 + 18 + nameW + 10 + tagW;
    const gx = W / 2 - groupW / 2, gy = host ? 1170 : 1196;
    roundRect(ctx, gx, gy, 64, 64, 16);
    ctx.fillStyle = C.brand; ctx.fill();
    if (logoIcon) ctx.drawImage(logoIcon, gx + 10, gy + 10, 44, 44);
    ctx.textAlign = "left";
    ctx.fillStyle = C.ink; ctx.font = `700 44px ${SERIF}`;
    ctx.fillText("กินหยัง", gx + 82, gy + 48);
    ctx.fillStyle = C.brand; ctx.font = `600 22px ${SANS}`;
    ctx.fillText("KKU", gx + 82 + nameW + 10, gy + 46);
    if (host) {
      ctx.textAlign = "center";
      ctx.fillStyle = C.ink3; ctx.font = `400 28px ${SANS}`;
      ctx.fillText(host, W / 2, gy + 118);
    }

    return new Promise((resolve, reject) => {
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
    });
  }

  KY.shareImage = { render };
})(window.KY = window.KY || {});
