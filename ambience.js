"use strict";
(() => {
  const g = garden;
  const palettes = {
    morning: {
      light: "#f0dcc0",
      reflection: "#d3b89b",
      reflectionAlpha: 0.14,
      ambient: 0.96,
    },
    day: {
      light: "#d7e7d4",
      reflection: "#a0bdb3",
      reflectionAlpha: 0.08,
      ambient: 1,
    },
    evening: {
      light: "#edbb98",
      reflection: "#c99271",
      reflectionAlpha: 0.26,
      ambient: 0.98,
    },
    night: {
      light: "#c5d9df",
      reflection: "#a0bbc5",
      reflectionAlpha: 0.22,
      ambient: 0.74,
    },
  };
  g.seasonLayers = { under: [], over: [] }; // Future seasonal decorations plug into these layers; V1 has none.
  g.hooks.under.push((c) => g.seasonLayers.under.forEach((f) => f(c, g)));
  g.hooks.over.push((c) => g.seasonLayers.over.forEach((f) => f(c, g)));
  g.applyTime = (value) => {
    const hour = new Date().getHours();
    g.timeOfDay =
      value === "auto"
        ? hour >= 5 && hour < 10
          ? "morning"
          : hour < 16 && hour >= 10
            ? "day"
            : hour >= 16 && hour < 19
              ? "evening"
              : "night"
        : value;
    g.palette = palettes[g.timeOfDay] || palettes.day;
  };
  const requested = new URLSearchParams(location.search).get("time");
  g.debugTime = Object.hasOwn(palettes, requested) ? requested : null;
  g.applyTime(g.debugTime || g.settings.time);
  g.setTime = (value) => {
    g.settings.time = value;
    g.debugTime = null;
    g.applyTime(value);
    g.save();
  };
  setInterval(() => {
    if (!g.debugTime && g.settings.time === "auto") g.applyTime("auto");
  }, 60000);
  g.addTimeSettings = (container) => {
    const label = document.createElement("label");
    label.textContent = "光の時間帯";
    const select = document.createElement("select");
    select.setAttribute("aria-label", "光の時間帯");
    for (const [value, text] of Object.entries({
      auto: "現在の時刻",
      morning: "朝の光",
      day: "昼の光",
      evening: "夕暮れ",
      night: "月明かり",
    })) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = text;
      select.append(option);
    }
    select.value = g.settings.time;
    select.onchange = () => g.setTime(select.value);
    label.append(select);
    container.append(label);
  };
  const original = g.drawLight.bind(g);
  g.drawLight = () => {
    original();
    const c = g.ctx;
    c.save();
    c.globalCompositeOperation = "screen";
    // Soft, localized sky reflections skim the surface; the underwater scene is not tinted.
    for (const [x, y, radius, flatten, alpha] of [
      [0.72, 0.18, 0.43, 0.16, 1],
      [0.35, 0.81, 0.32, 0.11, 0.45],
    ]) {
      c.save();
      c.translate(g.w * x, g.h * y);
      c.rotate(-0.28);
      c.scale(1, flatten);
      const reach = Math.max(g.w, g.h) * radius;
      const glow = c.createRadialGradient(0, 0, 0, 0, 0, reach);
      glow.addColorStop(0, g.palette.reflection);
      glow.addColorStop(1, g.palette.reflection + "00");
      c.globalAlpha = g.palette.reflectionAlpha * alpha;
      c.fillStyle = glow;
      c.fillRect(-reach, -reach, reach * 2, reach * 2);
      c.restore();
    }
    c.strokeStyle = g.palette.light;
    c.lineWidth = 1.2;
    for (let i = 0; i < 24; i++) {
      const x = g.w * (0.55 + Math.sin(i * 3.23) * 0.2),
        y = g.h * (0.13 + i * 0.022) + Math.sin(g.time * 0.3 + i) * 5;
      c.globalAlpha = (Math.sin(g.time * 0.5 + i) + 1) * 0.035;
      c.beginPath();
      c.moveTo(x, y);
      c.bezierCurveTo(x + 8, y - 3, x + 20, y + 3, x + 32 + (i % 4) * 8, y);
      c.stroke();
    }
    c.restore();
  };
  const view = document.createElement("button");
  view.id = "view";
  view.textContent = "◇";
  view.setAttribute("aria-label", "鑑賞モード");
  view.title = "鑑賞モード";
  document.querySelector(".tools").append(view);
  g.setViewing = (value) => {
    g.viewing = value;
    document.body.classList.toggle("viewing", value);
    g.closePanel();
    document.querySelector("#fish-info").hidden = true;
    document.querySelector("#notice").hidden = true;
    if (value) {
      document.activeElement?.blur();
      g.canvas.focus({ preventScroll: true });
    } else view.focus({ preventScroll: true });
  };
  view.onclick = () => g.setViewing(true);
  g.canvas.tabIndex = 0;
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (g.viewing) g.setViewing(false);
      else {
        g.closePanel();
        document.querySelector("#fish-info").hidden = true;
      }
    }
  });
})();
