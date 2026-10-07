"use strict";
(() => {
  const g = garden;
  g.makeObjects = () => [
    { id: "o1", type: "moss", x: 0.075, y: 0.34, size: 1.2, angle: 0.6 },
    { id: "o2", type: "stone", x: 0.055, y: 0.43, size: 0.7, angle: 0.2 },
    { id: "o3", type: "wood", x: 0.9, y: 0.87, size: 1.1, angle: -0.5 },
    { id: "o4", type: "stone", x: 0.85, y: 0.93, size: 0.8, angle: 1 },
  ];
  g.objects = g.makeObjects();
  const labels = {
    lily: "睡蓮",
    hornwort: "マツモ",
    anacharis: "アナカリス",
    float: "浮草",
    stone: "丸石",
    moss: "苔石",
    wood: "流木",
    pot: "陶器の壺",
    lantern: "石灯籠",
    bridge: "小さな橋",
    bamboo: "竹",
    torii: "小さな鳥居",
  };
  g.itemLabels = labels;
  g.drawObject = (c, o) => {
    c.save();
    c.translate(o.x * g.w, o.y * g.h);
    c.rotate(o.angle);
    c.scale(o.size * g.unit(), o.size * g.unit());
    c.fillStyle = "#082f324d";
    c.beginPath();
    c.ellipse(4, 12, 43, 25, 0, 0, TAU);
    c.fill();
    const stone = () => {
      c.beginPath();
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * TAU,
          r = 1 + Math.sin(i * 6.4 + o.x * 90) * 0.08;
        const x = Math.cos(a) * 40 * r,
          y = Math.sin(a) * 28 * r;
        i ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.closePath();
    };
    if (["stone", "moss"].includes(o.type)) {
      const gr = c.createLinearGradient(-20, -24, 22, 28);
      gr.addColorStop(0, "#a7ada0");
      gr.addColorStop(0.5, "#6a7f76");
      gr.addColorStop(1, "#3b554e");
      c.fillStyle = gr;
      stone();
      c.fill();
      c.save();
      stone();
      c.clip();
      for (let i = 0; i < 130; i++) {
        const x = Math.sin(i * 12.3) * 41,
          y = Math.cos(i * 7.1) * 28;
        c.fillStyle = i % 2 ? "#ced0b71d" : "#1e393b27";
        c.beginPath();
        c.arc(x, y, 0.5 + (i % 3), 0, TAU);
        c.fill();
      }
      if (o.type === "moss") {
        const gr = c.createRadialGradient(-15, -12, 2, -7, -6, 36);
        gr.addColorStop(0, "#759058");
        gr.addColorStop(1, "#47695200");
        c.fillStyle = gr;
        c.fillRect(-42, -30, 84, 60);
        for (let i = 0; i < 60; i++) {
          c.fillStyle = "#9aab6344";
          c.fillRect(
            Math.sin(i * 2.4) * 27 - 8,
            Math.cos(i * 4.5) * 16 - 8,
            2,
            2,
          );
        }
      }
      c.restore();
    }
    if (o.type === "wood") {
      c.lineCap = "round";
      for (let j = 0; j < 3; j++) {
        c.strokeStyle = j === 0 ? "#3c4732" : j === 1 ? "#736b4d" : "#a59b703d";
        c.lineWidth = 18 - j * 6;
        c.beginPath();
        c.moveTo(-48, 14);
        c.bezierCurveTo(-23, -10, 23, 12, 48, -12);
        c.stroke();
      }
      c.strokeStyle = "#686647";
      c.lineWidth = 8;
      c.beginPath();
      c.moveTo(4, 0);
      c.lineTo(16, -29);
      c.stroke();
      c.strokeStyle = "#b6ac783b";
      c.lineWidth = 1;
      for (let j = 0; j < 6; j++) {
        c.beginPath();
        c.moveTo(-43, 8 + j);
        c.bezierCurveTo(-10, -10 + j, 22, 12 + j, 43, -10 + j);
        c.stroke();
      }
    }
    if (o.type === "pot") {
      const gr = c.createRadialGradient(-12, -12, 1, 0, 0, 38);
      gr.addColorStop(0, "#b29872");
      gr.addColorStop(1, "#5f624d");
      c.fillStyle = gr;
      c.beginPath();
      c.ellipse(0, 0, 31, 34, 0, 0, TAU);
      c.fill();
      c.strokeStyle = "#b8a385";
      c.lineWidth = 6;
      c.fillStyle = "#1e3d36";
      c.beginPath();
      c.ellipse(0, -3, 18, 20, 0, 0, TAU);
      c.fill();
      c.stroke();
      c.strokeStyle = "#ded0a626";
      c.lineWidth = 1;
      c.beginPath();
      c.arc(0, 0, 27, 0.4, 2.7);
      c.stroke();
    }
    if (o.type === "lantern") {
      c.fillStyle = "#7d8c7b";
      c.fillRect(-15, -24, 30, 50);
      c.fillStyle = "#a4af9c";
      c.fillRect(-23, -30, 46, 12);
      c.fillRect(-23, 21, 46, 12);
      c.fillStyle = "#52695c";
      c.fillRect(-8, -10, 16, 19);
      c.fillStyle = "#bfc5a9";
      c.beginPath();
      c.moveTo(-34, -22);
      c.lineTo(0, -45);
      c.lineTo(34, -22);
      c.closePath();
      c.fill();
      c.fillStyle = "#879b7f";
      c.beginPath();
      c.arc(0, -44, 5, 0, TAU);
      c.fill();
    }
    if (o.type === "bridge") {
      c.fillStyle = "#81785a";
      c.fillRect(-46, -23, 92, 46);
      for (let i = 0; i < 12; i++) {
        c.fillStyle = i % 2 ? "#aea181" : "#92876a";
        c.fillRect(-45 + i * 7.5, -21, 6.5, 42);
      }
      c.strokeStyle = "#685f48";
      c.lineWidth = 5;
      for (const y of [-25, 25]) {
        c.beginPath();
        c.moveTo(-50, y);
        c.quadraticCurveTo(0, y * 1.5, 50, y);
        c.stroke();
      }
      c.fillStyle = "#9d9270";
      for (const x of [-45, 0, 45])
        for (const y of [-26, 26]) c.fillRect(x - 3, y - 3, 6, 6);
    }
    if (o.type === "bamboo") {
      for (let j = 0; j < 3; j++) {
        const gr = c.createLinearGradient(j * 12 - 17, 0, j * 12 - 8, 0);
        gr.addColorStop(0, "#596e48");
        gr.addColorStop(0.5, "#b1ae75");
        gr.addColorStop(1, "#6a8056");
        c.fillStyle = gr;
        c.fillRect(j * 12 - 18, -42 + j * 9, 9, 76 - j * 5);
        c.strokeStyle = "#d6c996";
        c.lineWidth = 2;
        for (let k = 0; k < 3; k++) {
          c.beginPath();
          c.moveTo(j * 12 - 18, -30 + k * 25 + j * 4);
          c.lineTo(j * 12 - 9, -30 + k * 25 + j * 4);
          c.stroke();
        }
      }
    }
    if (o.type === "torii") {
      c.fillStyle = "#8e5945";
      c.fillRect(-28, -23, 7, 63);
      c.fillRect(21, -23, 7, 63);
      c.fillRect(-38, -29, 76, 8);
      c.fillRect(-32, -9, 64, 5);
      c.fillStyle = "#524d3b";
      c.beginPath();
      c.moveTo(-44, -38);
      c.quadraticCurveTo(0, -27, 44, -38);
      c.lineTo(43, -29);
      c.quadraticCurveTo(0, -20, -43, -29);
      c.closePath();
      c.fill();
    }
    c.restore();
  };
  g.hooks.under.unshift((c) => g.objects.forEach((o) => g.drawObject(c, o)));
  const nav = document.querySelector(".tools");
  const edit = document.createElement("button");
  edit.id = "edit";
  edit.textContent = "✧";
  edit.setAttribute("aria-label", "水草とオブジェクトを配置");
  edit.title = "水草とオブジェクトを配置";
  nav.append(edit);
  const panel = document.querySelector("#panel");
  g.closePanel = () => {
    document.querySelector("#fish-info").hidden = true;
    panel.hidden = true;
    g.pending = null;
    g.selected = null;
    g.mode = null;
    document.querySelector("#feed").setAttribute("aria-pressed", "false");
  };
  g.findItem = (x, y) =>
    [...g.objects, ...g.plants]
      .reverse()
      .find(
        (o) =>
          Math.hypot((o.x - x) * g.w, (o.y - y) * g.h) <
          Math.max(20, 48 * o.size * g.unit()),
      );
  g.place = (type, x, y) => {
    if (g.plants.length + g.objects.length >= 100) {
      g.notify("水庭には100個まで配置できます");
      return;
    }
    const item = {
      id: "item-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
      type,
      x: clamp(x, 0.03, 0.97),
      y: clamp(y, 0.03, 0.97),
      size: 1,
      angle: 0,
    };
    if (type === "lily") item.flower = true;
    (Object.keys(labels).indexOf(type) < 4 ? g.plants : g.objects).push(item);
    g.pending = null;
    g.selected = item;
    g.mode = "edit";
    g.save?.();
    g.openEditor();
    return item;
  };
  g.openEditor = () => {
    document.querySelector("#fish-info").hidden = true;
    g.mode = "edit";
    document.querySelector("#feed").setAttribute("aria-pressed", "false");
    panel.hidden = false;
    panel.innerHTML =
      '<button class="close" aria-label="メニューを閉じる">×</button><h2>水庭をしつらえる</h2><p>選んで水面に触れる、または水面へドラッグ。配置したものはドラッグで移動できます。</p><div class="grid" id="catalog"></div><div id="selection"></div>';
    panel.querySelector(".close").onclick = g.closePanel;
    const catalog = panel.querySelector("#catalog");
    for (const [type, label] of Object.entries(labels)) {
      const b = document.createElement("button");
      b.textContent = label;
      b.dataset.type = type;
      let dragged = false;
      b.onclick = () => {
        if (dragged) {
          dragged = false;
          return;
        }
        g.pending = type;
        g.selected = null;
        panel.hidden = true;
        g.notify(`${label}を置く場所に触れてください`);
      };
      let origin = null;
      b.addEventListener("pointerdown", (e) => {
        origin = { x: e.clientX, y: e.clientY };
        b.setPointerCapture(e.pointerId);
      });
      b.addEventListener("pointerup", (e) => {
        if (
          origin &&
          Math.hypot(e.clientX - origin.x, e.clientY - origin.y) > 12 &&
          document.elementFromPoint(e.clientX, e.clientY) === g.canvas
        ) {
          dragged = true;
          g.place(type, e.clientX / g.w, e.clientY / g.h);
          e.preventDefault();
        }
        origin = null;
      });
      catalog.append(b);
    }
    if (g.selected) {
      if (g.w < 600 || g.h < 500) {
        catalog.hidden = true;
        panel.querySelector("p").textContent =
          "ドラッグで移動。回転と大きさを調整できます。";
        const add = document.createElement("button");
        add.textContent = "水草・オブジェクトを追加";
        add.onclick = () => {
          g.selected = null;
          g.openEditor();
        };
        panel.querySelector("p").after(add);
      }
      const s = panel.querySelector("#selection");
      const title = document.createElement("p");
      title.textContent = `選択中：${labels[g.selected.type]}`;
      s.append(title);
      for (const [key, label, min, max, step] of [
        ["angle", "回転", -180, 180, 1],
        ["size", "大きさ", 0.4, 2.2, 0.05],
      ]) {
        const row = document.createElement("label");
        row.className = "row";
        row.textContent = label;
        const input = document.createElement("input");
        input.type = "range";
        input.min = min;
        input.max = max;
        input.step = step;
        input.value =
          key === "angle"
            ? (g.selected.angle * 180) / Math.PI
            : g.selected.size;
        input.setAttribute("aria-label", label);
        input.oninput = () => {
          g.selected[key] =
            key === "angle"
              ? (Number(input.value) * Math.PI) / 180
              : Number(input.value);
          g.save?.();
        };
        row.append(input);
        s.append(row);
      }
      const del = document.createElement("button");
      del.textContent = "削除";
      del.onclick = () => {
        g.objects = g.objects.filter((o) => o !== g.selected);
        g.plants = g.plants.filter((o) => o !== g.selected);
        g.selected = null;
        g.save?.();
        g.openEditor();
      };
      const move = document.createElement("button");
      move.textContent = "移動する";
      move.onclick = () => {
        panel.hidden = true;
        g.notify("選択したものをドラッグして移動できます");
      };
      const actions = document.createElement("div");
      actions.className = "row";
      actions.append(move, del);
      s.append(actions);
    }
  };
  edit.onclick = () => {
    if (!panel.hidden && g.mode === "edit") {
      g.closePanel();
    } else {
      g.selected = null;
      g.pending = null;
      g.openEditor();
    }
  };
  g.pointerDown = (e) => {
    if (g.mode === "edit" && !g.pending) {
      const item = g.findItem(e.clientX / g.w, e.clientY / g.h);
      if (item)
        g.drag = {
          item,
          dx: e.clientX / g.w - item.x,
          dy: e.clientY / g.h - item.y,
          startX: e.clientX,
          startY: e.clientY,
          moved: false,
        };
    }
  };
  g.pointerMove = (e) => {
    if (g.drag) {
      const d = g.drag;
      d.moved ||= Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 6;
      d.item.x = clamp(e.clientX / g.w - d.dx, 0.02, 0.98);
      d.item.y = clamp(e.clientY / g.h - d.dy, 0.02, 0.98);
      return true;
    }
    return false;
  };
  g.pointerUp = () => {
    if (g.drag) {
      g.selected = g.drag.item;
      g.drag = null;
      g.save?.();
      g.openEditor();
      return true;
    }
    return false;
  };
  g.cancelDrag = () => (g.drag = null);
  g.hooks.tap.push((e) => {
    if (g.mode === "edit") {
      if (g.pending) g.place(g.pending, e.clientX / g.w, e.clientY / g.h);
      else {
        g.selected = g.findItem(e.clientX / g.w, e.clientY / g.h);
        g.openEditor();
      }
    }
  });
  g.hooks.over.push((c) => {
    if (g.selected && !g.viewing) {
      const o = g.selected;
      c.save();
      c.strokeStyle = "#e0d9a699";
      c.setLineDash([3, 6]);
      c.lineWidth = 1;
      c.beginPath();
      c.arc(o.x * g.w, o.y * g.h, Math.max(22, 55 * o.size * g.unit()), 0, TAU);
      c.stroke();
      c.restore();
    }
  });
})();
