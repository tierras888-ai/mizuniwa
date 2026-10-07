"use strict";
const TAU = Math.PI * 2,
  clamp = (v, a, b) => Math.max(a, Math.min(b, v)),
  rand = (a, b) => a + Math.random() * (b - a);
const seededRandom = (initialSeed) => {
  let seed = initialSeed >>> 0;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
};
const BOTTOMS = Object.freeze({
  natural: {
    label: "砂と小石",
    colors: ["#405747", "#8c997c", "#5b7963"],
    seed: 888,
    grains: 6500,
    radius: 2.4,
  },
  gravel: {
    label: "玉砂利",
    colors: ["#405651", "#7d8b80", "#4d695b"],
    seed: 1248,
    grains: 4800,
    radius: 4.5,
  },
  sand: {
    label: "砂地",
    colors: ["#5b6b50", "#a5a587", "#738765"],
    seed: 2048,
    grains: 8500,
    radius: 1.1,
  },
});
class WaterGarden {
  constructor() {
    this.canvas = document.querySelector("#garden");
    this.ctx = this.canvas.getContext("2d", {
      alpha: false,
      willReadFrequently: true,
    });
    this.scene = document.createElement("canvas");
    this.sc = this.scene.getContext("2d", {
      alpha: false,
      willReadFrequently: true,
    });
    this.bottom = document.createElement("canvas");
    this.hooks = { under: [], over: [], update: [], tap: [], move: [] };
    this.time = 0;
    this.ripples = [];
    this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.quality = 1;
    this.waveW = 80;
    this.waveH = 56;
    this.a = new Float32Array(4480);
    this.b = new Float32Array(4480);
    this.c = new Float32Array(4480);
    this.stats = { frames: 0, frameTimes: [], touches: 0, moves: 0 };
    this.palette = { light: "#d4e4cd" };
    this.resize();
    window.addEventListener("resize", () => this.resize());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        cancelAnimationFrame(this.raf);
        this.raf = 0;
      } else {
        this.last = performance.now();
        this.raf = requestAnimationFrame((t) => this.frame(t));
      }
    });
    this.bindInput();
  }
  resize() {
    this.w = innerWidth;
    this.h = innerHeight;
    this.dpr = Math.min(devicePixelRatio || 1, 2);
    this.scale = Math.min(this.dpr, 960 / this.w, 820 / this.h);
    this.canvas.width = Math.round(this.w * this.scale);
    this.canvas.height = Math.round(this.h * this.scale);
    this.scene.width = this.canvas.width;
    this.scene.height = this.canvas.height;
    this.bottom.width = this.canvas.width;
    this.bottom.height = this.canvas.height;
    this.ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    this.sc.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    this.makeBottom();
  }
  makeBottom() {
    const c = this.bottom.getContext("2d");
    // Clear physical pixels too: fractional DPR edges must not retain the previous floor.
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.bottom.width, this.bottom.height);
    c.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    const g = c.createLinearGradient(0, 0, this.w, this.h);
    const preset = BOTTOMS[this.settings?.bottom] || BOTTOMS.natural;
    g.addColorStop(0, preset.colors[0]);
    g.addColorStop(0.45, preset.colors[1]);
    g.addColorStop(1, preset.colors[2]);
    c.fillStyle = g;
    c.fillRect(0, 0, this.w, this.h);
    const rnd = seededRandom(preset.seed);
    for (let i = 0; i < preset.grains; i++) {
      const x = rnd() * this.w,
        y = rnd() * this.h,
        r = 0.45 + rnd() * preset.radius;
      c.fillStyle = ["#aeb49c70", "#cfbea955", "#1e393856", "#e4d7b943"][i % 4];
      c.beginPath();
      c.ellipse(x, y, r, r * 0.6, rnd() * TAU, 0, TAU);
      c.fill();
    }
    const glow = c.createRadialGradient(
      this.w * 0.53,
      this.h * 0.4,
      10,
      this.w * 0.5,
      this.h * 0.45,
      Math.max(this.w, this.h) * 0.7,
    );
    glow.addColorStop(0, "#122e2600");
    glow.addColorStop(1, "#142f383b");
    c.fillStyle = glow;
    c.fillRect(0, 0, this.w, this.h);
  }
  disturb(x, y, strength = 1, radius = 2) {
    const gx = Math.round((x / this.w) * (this.waveW - 1)),
      gy = Math.round((y / this.h) * (this.waveH - 1));
    for (let j = -radius; j <= radius; j++)
      for (let i = -radius; i <= radius; i++) {
        const xx = gx + i,
          yy = gy + j;
        if (xx > 0 && xx < this.waveW - 1 && yy > 0 && yy < this.waveH - 1)
          this.a[yy * this.waveW + xx] +=
            strength *
            Math.exp(-(i * i + j * j) / Math.max(1, radius * radius));
      }
  }
  ripple(x, y, power = 1) {
    this.disturb(x, y, power * 2.4, 2);
    this.ripples.push({ x: x / this.w, y: y / this.h, age: 0, power });
    this.stats.touches++;
    if (this.ripples.length > 20) this.ripples.shift();
  }
  rippleBands(r) {
    const strong = r.power >= 0.6;
    const life = strong ? 2.5 : 1.45;
    const bands = [];
    for (let ring = 0; ring < (strong ? 3 : 2); ring++) {
      const age = r.age - ring * 0.13;
      if (age < 0 || age >= life) continue;
      const radius = 2 + age * (strong ? 76 : 30);
      bands.push({
        radius,
        width: 4 + radius * 0.025,
        fade: Math.pow(1 - age / life, 1.5) * (1 - ring * 0.18),
      });
    }
    return bands;
  }
  surfaceOffset(x, y) {
    const gx = clamp(
      Math.round((x / this.w) * (this.waveW - 1)),
      1,
      this.waveW - 2,
    );
    const gy = clamp(
      Math.round((y / this.h) * (this.waveH - 1)),
      1,
      this.waveH - 2,
    );
    const i = gy * this.waveW + gx;
    return [
      (this.a[i + 1] - this.a[i - 1]) * 1.9 +
        Math.sin(y * 0.009 + this.time * 0.6) * 0.4,
      (this.a[i + this.waveW] - this.a[i - this.waveW]) * 1.9 +
        Math.cos(x * 0.007 + this.time * 0.45) * 0.35,
    ];
  }
  refractPatch(x, y, width, height, dx, dy) {
    const sx = clamp(x + dx, 0, this.w - width);
    const sy = clamp(y + dy, 0, this.h - height);
    this.ctx.drawImage(
      this.scene,
      sx * this.scale,
      sy * this.scale,
      width * this.scale,
      height * this.scale,
      x,
      y,
      width + 0.25,
      height + 0.25,
    );
  }
  drawRippleRefraction() {
    // Re-sample only the narrow wave fronts, rather than blurring/tinting the pond.
    const cell = this.quality ? 10 : 16;
    for (const r of this.ripples) {
      const bands = this.rippleBands(r);
      if (!bands.length) continue;
      const reach = bands[0].radius + bands[0].width * 3;
      const cx = r.x * this.w,
        cy = r.y * this.h;
      const x0 = Math.max(0, Math.floor((cx - reach) / cell) * cell);
      const y0 = Math.max(0, Math.floor((cy - reach) / cell) * cell);
      for (let y = y0; y < Math.min(this.h, cy + reach); y += cell) {
        for (let x = x0; x < Math.min(this.w, cx + reach); x += cell) {
          const width = Math.min(cell, this.w - x),
            height = Math.min(cell, this.h - y);
          const vx = x + width / 2 - cx,
            vy = y + height / 2 - cy;
          const distance = Math.hypot(vx, vy);
          let displacement = 0;
          for (const band of bands) {
            const slope = (distance - band.radius) / band.width;
            if (Math.abs(slope) < 2.8)
              displacement +=
                slope *
                Math.exp((-slope * slope) / 2) *
                band.fade *
                r.power *
                6;
          }
          if (Math.abs(displacement) < 0.06 || distance < 1) continue;
          const [dx, dy] = this.surfaceOffset(x + width / 2, y + height / 2);
          this.refractPatch(
            x,
            y,
            width,
            height,
            dx + (vx / distance) * displacement,
            dy + (vy / distance) * displacement,
          );
        }
      }
    }
  }
  stepWaves() {
    const W = this.waveW,
      H = this.waveH;
    for (let y = 1; y < H - 1; y++)
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        this.c[i] =
          ((this.a[i - 1] + this.a[i + 1] + this.a[i - W] + this.a[i + W]) *
            0.5 -
            this.b[i]) *
          0.975;
      }
    const old = this.b;
    this.b = this.a;
    this.a = this.c;
    this.c = old;
  }
  bindInput() {
    let down = null,
      lastMove = 0;
    this.canvas.addEventListener("pointerdown", (e) => {
      this.canvas.setPointerCapture(e.pointerId);
      down = { x: e.clientX, y: e.clientY, t: performance.now(), moved: false };
      this.pointerDown?.(e);
    });
    this.canvas.addEventListener("pointermove", (e) => {
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 7)
        down.moved = true;
      if (this.pointerMove?.(e)) return;
      if (performance.now() - lastMove > 32) {
        this.disturb(e.clientX, e.clientY, 0.28, 1);
        this.stats.moves++;
        lastMove = performance.now();
      }
      this.hooks.move.forEach((f) => f(e));
    });
    this.canvas.addEventListener("pointerup", (e) => {
      const consumed = this.pointerUp?.(e);
      if (down && !down.moved && !consumed) {
        if (
          this.viewing &&
          e.clientX > this.w - 65 &&
          e.clientY > this.h - 65
        ) {
          this.setViewing(false);
        } else {
          if (this.mode !== "feed")
            this.ripple(e.clientX, e.clientY, this.mode === "edit" ? 0.35 : 1);
          this.hooks.tap.forEach((f) => f(e));
        }
      }
      down = null;
    });
    this.canvas.addEventListener("pointercancel", () => {
      down = null;
      this.cancelDrag?.();
    });
  }
  drawWater() {
    const cols = this.quality > 0 ? 18 : 12,
      rows = this.quality > 0 ? 14 : 10,
      bw = this.w / cols,
      bh = this.h / rows;
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < cols; x++) {
        const [dx, dy] = this.surfaceOffset((x + 0.5) * bw, (y + 0.5) * bh);
        this.refractPatch(x * bw, y * bh, bw, bh, dx, dy);
      }
    this.drawRippleRefraction();
  }
  drawLight() {
    const c = this.ctx;
    c.save();
    c.globalCompositeOperation = "screen";
    c.strokeStyle = this.palette.light;
    c.lineWidth = 0.7;
    c.globalAlpha = 0.032;
    for (let i = 0; i < 16; i++) {
      c.beginPath();
      for (let x = 0; x <= this.w; x += 28) {
        const y =
          (i / 16) * this.h +
          Math.sin(x * 0.012 + this.time * 0.24 + i) * 17 +
          Math.cos(x * 0.02 - i) * 10;
        x ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.stroke();
    }
    for (const r of this.ripples) {
      for (const band of this.rippleBands(r)) {
        c.globalCompositeOperation = "source-over";
        c.strokeStyle = "#25493e";
        c.globalAlpha = band.fade * r.power * 0.19;
        c.lineWidth = 1.4;
        c.beginPath();
        c.arc(r.x * this.w, r.y * this.h, band.radius + 1.3, 0, TAU);
        c.stroke();
        c.globalCompositeOperation = "screen";
        c.strokeStyle = this.palette.light;
        c.globalAlpha = band.fade * r.power * 0.35;
        c.lineWidth = 0.85;
        c.beginPath();
        c.arc(r.x * this.w, r.y * this.h, band.radius, 0.2, 2.4);
        c.arc(r.x * this.w, r.y * this.h, band.radius, 3.4, 5.5);
        c.stroke();
      }
    }
    c.restore();
    const vignette = c.createRadialGradient(
      this.w * 0.5,
      this.h * 0.48,
      Math.min(this.w, this.h) * 0.15,
      this.w * 0.5,
      this.h * 0.5,
      Math.max(this.w, this.h) * 0.7,
    );
    vignette.addColorStop(0, "#06292e00");
    vignette.addColorStop(1, "#123c3324");
    c.fillStyle = vignette;
    c.fillRect(0, 0, this.w, this.h);
  }
  drawAmbientLight() {
    const level = this.palette.ambient ?? 1;
    if (level === 1) return;
    // Change illumination equally in RGB: no colored pigment over the water.
    this.ctx.save();
    this.ctx.globalCompositeOperation = "multiply";
    const grey = Math.round(level * 255);
    this.ctx.fillStyle = `rgb(${grey},${grey},${grey})`;
    this.ctx.fillRect(0, 0, this.w, this.h);
    this.ctx.restore();
  }
  frame(now) {
    const elapsed = (now - (this.last || now)) / 1000;
    const dt = Math.min(elapsed, 0.05);
    this.last = now;
    this.time += dt * (this.reduced ? 0.22 : 1);
    this.stats.frames++;
    if (dt > 0) {
      this.stats.frameTimes.push(elapsed * 1000);
      if (this.stats.frameTimes.length > 180) this.stats.frameTimes.shift();
    }
    this.hooks.update.forEach((f) => f(dt));
    this.stepWaves();
    this.ripples.forEach((r) => (r.age += dt));
    this.ripples = this.ripples.filter((r) => r.age < 2.5);
    this.sc.drawImage(this.bottom, 0, 0, this.w, this.h);
    this.hooks.under.forEach((f) => f(this.sc));
    this.drawWater();
    this.drawLight();
    this.hooks.over.forEach((f) => f(this.ctx));
    this.drawAmbientLight();
    if (this.stats.frames % 180 === 0) {
      const avg =
        this.stats.frameTimes.reduce((a, b) => a + b, 0) /
        this.stats.frameTimes.length;
      if (avg > 24) this.quality = 0;
    }
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }
  start() {
    this.last = performance.now();
    this.raf = requestAnimationFrame((t) => this.frame(t));
  }
  notify(text) {
    const n = document.querySelector("#notice");
    n.textContent = text;
    n.hidden = false;
    clearTimeout(this.noticeTimer);
    this.noticeTimer = setTimeout(() => (n.hidden = true), 2800);
  }
}
const garden = new WaterGarden();
window.mizuniwa = garden;
