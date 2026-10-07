"use strict";
(() => {
  const g = garden;
  // Cache procedural geometry, while placement and gentle swaying stay live.
  function cacheRenderer(name, key) {
    const original = g[name];
    const sprites = new Map();
    g[name] = (c, item) => {
      const id = key(item);
      let sprite = sprites.get(id);
      if (!sprite) {
        sprite = document.createElement("canvas");
        sprite.width = sprite.height = 384;
        const sc = sprite.getContext("2d");
        sc.scale(1.5, 1.5);
        original(sc, {
          ...item,
          x: 128 / g.w,
          y: 128 / g.h,
          size: 1 / g.unit(),
          angle: 0,
        });
        sprites.set(id, sprite);
      }
      c.save();
      c.translate(item.x * g.w, item.y * g.h);
      const submerged = ["hornwort", "anacharis"].includes(item.type);
      c.rotate(
        item.angle +
          (name === "drawPlant"
            ? Math.sin(g.time * 0.45 + item.y * 8) * (submerged ? 0.035 : 0.012)
            : 0),
      );
      c.scale(item.size * g.unit(), item.size * g.unit());
      c.drawImage(sprite, -128, -128, 256, 256);
      c.restore();
    };
  }
  cacheRenderer("drawPlant", (p) => p.type + Boolean(p.flower));
  cacheRenderer("drawObject", (o) => o.type);
})();
