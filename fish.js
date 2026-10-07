"use strict";
(() => {
  const g = garden,
    names = [
      "こはく",
      "しずく",
      "あお",
      "ひかり",
      "こもれび",
      "すず",
      "なぎ",
      "つき",
    ];
  g.makeFish = () => {
    const random = seededRandom(88801);
    const vary = (min, max) => min + random() * (max - min);
    return names.map((name, i) => ({
      id: "fish-" + i,
      name,
      sex: i % 2 ? "雌" : "雄",
      age: 3 + i,
      color: ["琥珀", "銀白", "青銀", "白銀"][i % 4],
      tone: ["#d9aa67", "#bfcabd", "#8aabb5", "#e1dcc4"][i % 4],
      personality: ["好奇心旺盛", "おっとり", "臆病", "食いしん坊"][i % 4],
      x: 0.28 + random() * 0.44,
      y: 0.25 + random() * 0.5,
      angle: vary(0, TAU),
      speed: vary(14, 26),
      turn: vary(0.7, 1.4),
      curiosity: vary(0.4, 1),
      shy: vary(0.5, 1.3),
      reaction: vary(0.2, 1.8),
      rest: 0,
      decision: vary(1, 4),
      aim: vary(0, TAU),
      phase: vary(0, TAU),
      size: vary(24, 33),
      scared: 0,
    }));
  };
  g.fish = g.makeFish();
  g.fishWakeTimers = new Map();
  g.hooks.update.push((dt) => {
    for (const f of g.fish) {
      f.decision -= dt;
      f.scared = Math.max(0, f.scared - dt);
      f.rest = Math.max(0, f.rest - dt);
      if (f.decision <= 0) {
        f.aim = f.angle + rand(-1.3, 1.3) * f.turn;
        f.decision = rand(1.5, 5);
        if (Math.random() < 0.15) f.rest = rand(0.5, 2);
      }
      if (f.x < 0.09) f.aim = 0;
      if (f.x > 0.91) f.aim = Math.PI;
      if (f.y < 0.13) f.aim = Math.PI / 2;
      if (f.y > 0.9) f.aim = -Math.PI / 2;
      if (f.target && f.scared === 0)
        f.aim = Math.atan2((f.target.y - f.y) * g.h, (f.target.x - f.x) * g.w);
      const diff = Math.atan2(
        Math.sin(f.aim - f.angle),
        Math.cos(f.aim - f.angle),
      );
      f.angle += clamp(diff, -dt * 1.4 * f.turn, dt * 1.4 * f.turn);
      const speed = f.rest
        ? 1
        : f.speed *
          (f.scared ? 3 : f.target ? 1.65 : 1) *
          (g.reduced ? 0.45 : 1);
      f.x = clamp(f.x + (Math.cos(f.angle) * speed * dt) / g.w, 0.04, 0.96);
      f.y = clamp(f.y + (Math.sin(f.angle) * speed * dt) / g.h, 0.06, 0.94);
      f.phase += dt * (f.scared ? 17 : 8);
      if (!g.reduced) {
        const remaining = (g.fishWakeTimers.get(f.id) ?? rand(10, 18)) - dt;
        g.fishWakeTimers.set(f.id, remaining);
        if (remaining <= 0 && !f.rest && !f.scared) {
          g.ripple(f.x * g.w, f.y * g.h, 0.06);
          g.fishWakeTimers.set(f.id, rand(8, 16));
        }
      }
    }
  });
  g.hooks.under.push((c) => {
    for (const f of g.fish) {
      const under = g.plants?.some(
        (p) =>
          ["lily", "float"].includes(p.type) &&
          Math.hypot((p.x - f.x) * g.w, (p.y - f.y) * g.h) < p.size * 40,
      );
      c.save();
      c.translate(f.x * g.w, f.y * g.h);
      c.rotate(f.angle);
      const s = f.size / 30;
      c.scale(s, s);
      c.globalAlpha = under ? 0.55 : 0.94;
      c.fillStyle = "#133d3429";
      c.beginPath();
      c.ellipse(-1, 7, 17, 4, 0, 0, TAU);
      c.fill();
      const tail = Math.sin(f.phase) * 2.8;
      c.fillStyle = f.tone + "99";
      c.beginPath();
      c.moveTo(-9, 0);
      c.lineTo(-24, tail - 5);
      c.quadraticCurveTo(-21, tail, -24, tail + 5);
      c.closePath();
      c.fill();
      c.fillStyle = f.tone + "55";
      c.beginPath();
      c.ellipse(0, -4, 5, 2.3, -0.5, 0, TAU);
      c.ellipse(0, 4, 5, 2.3, 0.5, 0, TAU);
      c.fill();
      const body = c.createLinearGradient(0, -5, 0, 5);
      body.addColorStop(0, "#ffffffa0");
      body.addColorStop(0.3, f.tone);
      body.addColorStop(1, "#637b6690");
      c.fillStyle = body;
      c.beginPath();
      c.moveTo(14, 0);
      c.bezierCurveTo(13, -4, 1, -5, -13, 0);
      c.bezierCurveTo(1, 5, 13, 4, 14, 0);
      c.fill();
      c.strokeStyle = "#eef5d355";
      c.lineWidth = 0.65;
      c.beginPath();
      c.moveTo(11, 0);
      c.quadraticCurveTo(0, -1, -10, 0);
      c.stroke();
      c.fillStyle = "#263d34";
      for (const y of [-2.2, 2.2]) {
        c.beginPath();
        c.arc(9, y, 0.9, 0, TAU);
        c.fill();
      }
      c.restore();
    }
  });
  g.showFish = (f) => {
    const box = document.querySelector("#fish-info");
    box.replaceChildren();
    const input = document.createElement("input");
    input.value = f.name;
    input.maxLength = 20;
    input.setAttribute("aria-label", "メダカの名前");
    input.addEventListener("change", () => {
      f.name = input.value.trim() || f.name;
      g.save?.();
    });
    const detail = document.createElement("div");
    detail.textContent = `${f.sex} · ${f.age}か月 · ${f.color === "\u0023bdc8b9" ? "銀白" : f.color}\n${f.personality}`;
    box.append(input, detail);
    box.hidden = false;
    box.style.left = clamp(f.x * g.w + 20, 12, g.w - 210) + "px";
    box.style.top = clamp(f.y * g.h - 65, 12, g.h - 125) + "px";
    clearTimeout(g.infoTimer);
    g.infoTimer = setTimeout(() => {
      if (!box.contains(document.activeElement)) box.hidden = true;
    }, 5000);
    input.addEventListener("blur", () => {
      g.infoTimer = setTimeout(() => (box.hidden = true), 1500);
    });
  };
  g.hooks.tap.push((e) => {
    if (g.mode || g.viewing) return;
    const fish = g.fish
      .filter(
        (f) => Math.hypot(e.clientX - f.x * g.w, e.clientY - f.y * g.h) < 26,
      )
      .sort(
        (a, b) =>
          Math.hypot(e.clientX - a.x * g.w, e.clientY - a.y * g.h) -
          Math.hypot(e.clientX - b.x * g.w, e.clientY - b.y * g.h),
      )[0];
    if (fish) g.showFish(fish);
  });
})();
