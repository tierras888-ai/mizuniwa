"use strict";
(() => {
  const g = garden;
  g.unit = () => clamp(Math.min(g.w, g.h) / 700, 0.65, 1.15);
  g.makePlants = () => [
    {
      id: "p1",
      type: "lily",
      x: 0.18,
      y: 0.29,
      size: 1.25,
      angle: -0.3,
      flower: true,
    },
    {
      id: "p2",
      type: "lily",
      x: 0.265,
      y: 0.37,
      size: 1,
      angle: 0.6,
      flower: false,
    },
    {
      id: "p3",
      type: "lily",
      x: 0.12,
      y: 0.44,
      size: 0.8,
      angle: 1.1,
      flower: false,
    },
    {
      id: "p4",
      type: "lily",
      x: 0.82,
      y: 0.77,
      size: 1.15,
      angle: 2.4,
      flower: true,
    },
    {
      id: "p5",
      type: "lily",
      x: 0.9,
      y: 0.68,
      size: 0.85,
      angle: 1.5,
      flower: false,
    },
    { id: "p6", type: "hornwort", x: 0.06, y: 0.65, size: 1.4, angle: 0.5 },
    { id: "p7", type: "anacharis", x: 0.94, y: 0.32, size: 1.35, angle: -0.7 },
    { id: "p8", type: "hornwort", x: 0.78, y: 0.94, size: 1.5, angle: 2.8 },
    { id: "p9", type: "anacharis", x: 0.3, y: 0.13, size: 1.2, angle: 0.2 },
    { id: "p10", type: "float", x: 0.32, y: 0.29, size: 0.75, angle: 0.5 },
    { id: "p11", type: "float", x: 0.72, y: 0.8, size: 0.8, angle: 1 },
    { id: "p12", type: "float", x: 0.09, y: 0.2, size: 0.8, angle: 0.3 },
  ];
  g.plants = g.makePlants();
  g.drawPlant = (c, p) => {
    c.save();
    c.translate(p.x * g.w, p.y * g.h);
    c.rotate(p.angle + Math.sin(g.time * 0.25 + p.x * 9) * 0.012);
    c.scale(p.size * g.unit(), p.size * g.unit());
    const sway = Math.sin(g.time * 0.65 + p.y * 7) * 2;
    if (p.type === "lily") {
      c.save();
      c.translate(3, 6);
      c.fillStyle = "#052a2880";
      c.beginPath();
      c.ellipse(0, 0, 53, 47, 0, 0.2, TAU - 0.18);
      c.lineTo(0, 0);
      c.fill();
      c.restore();
      const gr = c.createRadialGradient(-18, -22, 3, 0, 0, 57);
      gr.addColorStop(0, "#7e9b64");
      gr.addColorStop(0.5, "#587e51");
      gr.addColorStop(1, "#2c5946");
      c.fillStyle = gr;
      c.beginPath();
      c.ellipse(0, 0, 51, 45, 0, 0.2, TAU - 0.17);
      c.lineTo(-6, 1);
      c.closePath();
      c.fill();
      c.strokeStyle = "#acb78038";
      c.lineWidth = 0.75;
      for (let j = 1; j < 16; j++) {
        const a = (j / 16) * TAU;
        c.beginPath();
        c.moveTo(-6, 1);
        c.quadraticCurveTo(
          Math.cos(a) * 20,
          Math.sin(a) * 17,
          Math.cos(a) * 47,
          Math.sin(a) * 42,
        );
        c.stroke();
      }
      c.strokeStyle = "#c5c99940";
      c.beginPath();
      c.ellipse(0, 0, 50, 44, 0, 0.23, TAU - 0.2);
      c.stroke();
      if (p.flower) {
        c.translate(-24, -26);
        c.fillStyle = "#183e3840";
        c.beginPath();
        c.ellipse(3, 7, 22, 15, 0, 0, TAU);
        c.fill();
        for (let ring = 0; ring < 3; ring++)
          for (let i = 0; i < 10; i++) {
            c.save();
            c.rotate((i / 10) * TAU + ring * 0.28);
            const len = 25 - ring * 5;
            const petal = c.createLinearGradient(0, 0, 0, -len);
            petal.addColorStop(0, "#dccf97");
            petal.addColorStop(0.3, "#e9ded1");
            petal.addColorStop(1, "#fbf4e8");
            c.fillStyle = petal;
            c.beginPath();
            c.moveTo(0, 2);
            c.bezierCurveTo(-9, -8, -7, -len + 4, 0, -len);
            c.bezierCurveTo(7, -len + 4, 9, -8, 0, 2);
            c.fill();
            c.restore();
          }
        c.fillStyle = "#d7b65c";
        c.beginPath();
        c.arc(0, 0, 5, 0, TAU);
        c.fill();
        for (let i = 0; i < 12; i++) {
          c.fillStyle = "#f2d784";
          c.beginPath();
          c.arc(Math.cos(i) * 6, Math.sin(i) * 6, 1, 0, TAU);
          c.fill();
        }
      }
    } else if (p.type === "float") {
      for (let i = 0; i < 14; i++) {
        const x = Math.sin(i * 2.39) * Math.sqrt(i) * 9,
          y = Math.cos(i * 2.39) * Math.sqrt(i) * 8;
        c.fillStyle = "#173f3b60";
        c.beginPath();
        c.ellipse(x + 2, y + 3, 6, 4, i, 0, TAU);
        c.fill();
        c.fillStyle = ["#91a777", "#728e65", "#b0b68b"][i % 3];
        c.beginPath();
        c.ellipse(x, y, 6, 4, i, 0, TAU);
        c.fill();
        c.strokeStyle = "#dae1b144";
        c.beginPath();
        c.moveTo(x - 2, y);
        c.lineTo(x + 3, y);
        c.stroke();
      }
    } else {
      for (let stem = 0; stem < 7; stem++) {
        c.save();
        c.rotate((stem - 3) * 0.27);
        c.translate((stem - 3) * 6, 12);
        c.strokeStyle = "#658966";
        c.lineWidth = 1.3;
        c.beginPath();
        c.moveTo(0, 25);
        c.bezierCurveTo(-7, 0, sway, -30, sway * 2, -85);
        c.stroke();
        for (let j = 0; j < 12; j++) {
          const y = 15 - j * 8,
            x = Math.sin(j * 0.25) * sway;
          c.fillStyle = p.type === "hornwort" ? "#5b87669c" : "#81a279b5";
          for (const sign of [-1, 1]) {
            c.save();
            c.translate(x, y);
            c.rotate(sign * 0.65);
            if (p.type === "hornwort") {
              c.strokeStyle = "#88a77788";
              c.lineWidth = 0.8;
              for (let k = 0; k < 3; k++) {
                c.beginPath();
                c.moveTo(0, 0);
                c.lineTo(sign * (13 + k * 3), -7 + k * 4);
                c.stroke();
              }
            } else {
              c.beginPath();
              c.ellipse(sign * 7, -3, 10, 3, -sign * 0.5, 0, TAU);
              c.fill();
            }
            c.restore();
          }
        }
        c.restore();
      }
    }
    c.restore();
  };
  g.hooks.under.unshift((c) =>
    g.plants
      .filter((p) => !["lily", "float"].includes(p.type))
      .forEach((p) => g.drawPlant(c, p)),
  );
  g.hooks.over.push((c) =>
    g.plants
      .filter((p) => ["lily", "float"].includes(p.type))
      .forEach((p) => g.drawPlant(c, p)),
  );
})();
