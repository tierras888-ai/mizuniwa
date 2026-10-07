"use strict";
(() => {
  const g = garden;
  g.food = [];
  g.consumed = 0;
  g.feedingSerial = 0;
  const nav = document.querySelector(".tools");
  const feed = document.createElement("button");
  feed.textContent = "◌";
  feed.id = "feed";
  feed.setAttribute("aria-label", "餌をあげる");
  feed.title = "餌をあげる";
  feed.setAttribute("aria-pressed", "false");
  nav.append(feed);
  feed.onclick = () => {
    const enabled = g.mode !== "feed";
    g.closePanel?.();
    g.mode = enabled ? "feed" : null;
    feed.setAttribute("aria-pressed", String(g.mode === "feed"));
    if (g.mode) g.notify("水面を触れると、餌が落ちます");
  };
  g.feed = (x, y) => {
    if (g.food.length > 30) {
      g.notify("餌は少しずつ、ゆっくりと");
      return;
    }
    for (let i = 0; i < 7; i++) {
      const px = clamp(x + rand(-15, 15) / g.w, 0.02, 0.98),
        py = clamp(y + rand(-15, 15) / g.h, 0.02, 0.98);
      g.food.push({ id: ++g.feedingSerial, x: px, y: py, age: 0 });
      g.ripple(px * g.w, py * g.h, 0.15);
    }
    for (const f of g.fish) {
      f.noticeIn = f.reaction + rand(0, 0.5);
      f.rest = 0;
    }
    g.save?.();
  };
  g.hooks.tap.push((e) => {
    if (g.viewing) return;
    if (g.mode === "feed") {
      g.feed(e.clientX / g.w, e.clientY / g.h);
      return;
    }
    if (g.mode) return;
    for (const f of g.fish) {
      const dx = f.x * g.w - e.clientX,
        dy = f.y * g.h - e.clientY;
      if (Math.hypot(dx, dy) < 110 * f.shy) {
        f.scared = rand(0.8, 2);
        f.aim = Math.atan2(dy, dx);
        f.angle = f.aim;
        f.rest = 0;
        f.target = null;
      }
    }
  });
  g.hooks.update.push((dt) => {
    for (const food of g.food) food.age += dt;
    g.food = g.food.filter((f) => f.age < 35);
    for (const f of g.fish) {
      if (f.noticeIn > 0) {
        f.noticeIn -= dt;
        continue;
      }
      if (f.scared) {
        f.target = null;
        continue;
      }
      const nearest = g.food
        .filter(
          (p) =>
            Math.hypot((p.x - f.x) * g.w, (p.y - f.y) * g.h) <
            260 * f.curiosity,
        )
        .sort(
          (a, b) =>
            Math.hypot((a.x - f.x) * g.w, (a.y - f.y) * g.h) -
            Math.hypot((b.x - f.x) * g.w, (b.y - f.y) * g.h),
        )[0];
      f.target = nearest || null;
      if (nearest) {
        f.rest = 0;
        if (Math.hypot((nearest.x - f.x) * g.w, (nearest.y - f.y) * g.h) < 12) {
          g.food = g.food.filter((p) => p !== nearest);
          g.consumed++;
          g.ripple(nearest.x * g.w, nearest.y * g.h, 0.12);
          f.target = null;
          f.rest = 0.35;
        }
      }
    }
  });
  g.hooks.over.unshift((c) => {
    for (const p of g.food) {
      c.fillStyle = "#d6b27c";
      c.globalAlpha = Math.min(1, 35 - p.age);
      c.beginPath();
      c.arc(p.x * g.w, p.y * g.h, 1.7, 0, TAU);
      c.fill();
      c.globalAlpha = 1;
    }
  });
})();
