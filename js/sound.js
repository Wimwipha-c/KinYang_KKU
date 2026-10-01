/*
 * เสียงเซียมซี — สังเคราะห์ด้วย Web Audio API (ไม่ใช้ไฟล์เสียง)
 * ต้องเรียกครั้งแรกจากการคลิกของผู้ใช้ เพราะเบราว์เซอร์มือถือบล็อกเสียงที่เล่นเอง
 */
(function (KY) {
  "use strict";
  const { storage } = KY.utils;

  let ctx = null, master = null, noise = null;
  let enabled = storage.get("kky_sound", true);

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.7;
      master.connect(ctx.destination);
      // white noise สั้นๆ ไว้ทำเสียงไม้กระทบกัน
      noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.08), ctx.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  const rand = (min, max) => min + Math.random() * (max - min);

  // เสียงไม้ไผ่กระทบกันหนึ่งครั้ง: noise ผ่าน bandpass + โทนต่ำสั้นๆ ให้มีเนื้อไม้
  function clack(t, freq, gain, dur) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass"; bp.frequency.value = freq; bp.Q.value = 5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(bp).connect(g).connect(master);
    src.start(t); src.stop(t + dur + 0.02);

    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq / 3, t);
    osc.frequency.exponentialRampToValueAtTime(freq / 5, t + dur);
    const og = ctx.createGain();
    og.gain.setValueAtTime(gain * 0.45, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(og).connect(master);
    osc.start(t); osc.stop(t + dur + 0.02);
  }

  // เสียงเขย่า: ไม้กระทบกันเป็นกลุ่มทุกครั้งที่กระบอกเหวี่ยงสุด (ตรงกับแอนิเมชัน 0.42s/รอบ)
  function rattle(duration) {
    if (!enabled || !ensure()) return;
    const start = ctx.currentTime + 0.02;
    for (let s = 0.1; s < duration; s += 0.21) {
      const hits = 3 + Math.floor(Math.random() * 4);
      for (let i = 0; i < hits; i++) {
        clack(start + s + rand(0, 0.07), rand(1800, 3400), rand(0.1, 0.28), rand(0.025, 0.055));
      }
    }
  }

  // ไม้เซียมซีหล่นออกมา: กระทบพื้นหนึ่งครั้งแล้วเด้งเบาๆ
  function drop() {
    if (!enabled || !ensure()) return;
    const t = ctx.currentTime + 0.02;
    clack(t, 1500, 0.5, 0.08);
    clack(t + 0.13, 1700, 0.22, 0.05);
    clack(t + 0.22, 1900, 0.09, 0.04);
  }

  // เสียงระฆังเบาๆ ตอนเปิดผล
  function chime() {
    if (!enabled || !ensure()) return;
    const t = ctx.currentTime + 0.02;
    [[880, 0], [1318.5, 0.09], [1760, 0.18]].forEach(([f, delay]) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t + delay);
      g.gain.exponentialRampToValueAtTime(0.16, t + delay + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + delay + 1.4);
      osc.connect(g).connect(master);
      osc.start(t + delay); osc.stop(t + delay + 1.5);
    });
  }

  function isEnabled() { return enabled; }
  function toggle() {
    enabled = !enabled;
    storage.set("kky_sound", enabled);
    if (enabled) ensure();
    return enabled;
  }

  KY.sound = { rattle, drop, chime, isEnabled, toggle };
})(window.KY = window.KY || {});
