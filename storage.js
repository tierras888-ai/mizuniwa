"use strict";
(() => {
  const g = garden;
  g.storageKey = "mizuniwa.garden.v1";
  g.makeDefaultState = () => ({
    version: 1,
    fish: g.makeFish(),
    plants: g.makePlants(),
    objects: g.makeObjects(),
    state: { time: "auto", bottom: "natural" },
  });
  g.settings = g.makeDefaultState().state;
  g.storageOK = true;
  const finite = (v, min, max) =>
    typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
  const str = (v, max = 100) => typeof v === "string" && v.length <= max;
  const located = (o) =>
    o &&
    str(o.id) &&
    finite(o.x, 0, 1) &&
    finite(o.y, 0, 1) &&
    finite(o.angle, -100, 100) &&
    finite(o.size, 0.4, 2.2);
  const validFish = (f) =>
    f &&
    str(f.id) &&
    str(f.name, 20) &&
    ["雄", "雌"].includes(f.sex) &&
    finite(f.age, 0, 1000) &&
    str(f.color, 20) &&
    /^#[a-fA-F0-9]{6}$/.test(f.tone) &&
    str(f.personality, 30) &&
    finite(f.x, 0, 1) &&
    finite(f.y, 0, 1) &&
    [
      "angle",
      "speed",
      "turn",
      "curiosity",
      "shy",
      "reaction",
      "rest",
      "decision",
      "aim",
      "phase",
      "size",
      "scared",
    ].every((k) => finite(f[k], -100000, 100000)) &&
    finite(f.size, 10, 60) &&
    finite(f.speed, 1, 100);
  g.snapshot = () => ({
    version: 1,
    fish: g.fish.map(({ target, noticeIn, ...f }) => ({ ...f })),
    plants: g.plants.map((p) => ({ ...p })),
    objects: g.objects.map((o) => ({ ...o })),
    state: { ...g.settings },
  });
  g.save = () => {
    try {
      localStorage.setItem(g.storageKey, JSON.stringify(g.snapshot()));
      g.storageOK = true;
      return true;
    } catch {
      if (g.storageOK)
        g.notify("保存できません。この水庭は現在の画面で楽しめます。");
      g.storageOK = false;
      return false;
    }
  };
  try {
    const raw = localStorage.getItem(g.storageKey);
    if (raw) {
      const d = JSON.parse(raw);
      if (
        d.version !== 1 ||
        !Array.isArray(d.fish) ||
        d.fish.length < 1 ||
        d.fish.length > 50 ||
        !d.fish.every(validFish) ||
        !Array.isArray(d.plants) ||
        !Array.isArray(d.objects) ||
        d.plants.length + d.objects.length > 100 ||
        !d.plants.every(
          (p) =>
            located(p) &&
            ["lily", "hornwort", "anacharis", "float"].includes(p.type) &&
            (!("flower" in p) || typeof p.flower === "boolean"),
        ) ||
        !d.objects.every(
          (o) =>
            located(o) &&
            [
              "stone",
              "moss",
              "wood",
              "pot",
              "lantern",
              "bridge",
              "bamboo",
              "torii",
            ].includes(o.type),
        ) ||
        !d.state ||
        !["auto", "morning", "day", "evening", "night"].includes(
          d.state.time,
        ) ||
        (d.state.bottom !== undefined &&
          !Object.hasOwn(BOTTOMS, d.state.bottom))
      )
        throw Error("Invalid garden");
      g.fish = d.fish;
      g.plants = d.plants;
      g.objects = d.objects;
      // V1 saves made before bottom editing keep their fish and placement.
      g.settings = { time: d.state.time, bottom: d.state.bottom ?? "natural" };
    }
  } catch {
    g.notify("保存データを読み込めないため、初期の水庭で始めます。");
  }
  g.makeBottom();
  g.setBottom = (value) => {
    if (!Object.hasOwn(BOTTOMS, value)) return;
    g.settings.bottom = value;
    g.makeBottom();
    g.save();
  };
  g.reset = () => {
    if (
      !confirm(
        "水庭を初期状態に戻しますか？ 配置とメダカの名前もリセットされます。",
      )
    )
      return false;
    const defaults = g.makeDefaultState();
    g.fish = defaults.fish;
    g.plants = defaults.plants;
    g.objects = defaults.objects;
    g.settings = defaults.state;
    g.food = [];
    g.ripples = [];
    g.a.fill(0);
    g.b.fill(0);
    g.c.fill(0);
    g.time = 0;
    g.consumed = 0;
    g.feedingSerial = 0;
    g.fishWakeTimers.clear();
    g.cancelDrag();
    clearTimeout(g.infoTimer);
    g.debugTime = null;
    g.selected = null;
    g.viewing = false;
    document.body.classList.remove("viewing");
    g.makeBottom();
    g.applyTime?.("auto");
    const url = new URL(location.href);
    if (url.searchParams.has("time")) {
      url.searchParams.delete("time");
      history.replaceState(null, "", url);
    }
    const saved = g.save();
    g.closePanel();
    g.notify(
      saved
        ? "水庭を初期状態に戻しました"
        : "水庭を戻しましたが、ブラウザに保存できませんでした",
    );
    return true;
  };
  const settings = document.createElement("button");
  settings.id = "settings";
  settings.textContent = "⋯";
  settings.setAttribute("aria-label", "設定");
  settings.title = "設定";
  document.querySelector(".tools").append(settings);
  g.openSettings = () => {
    g.closePanel();
    g.mode = "settings";
    const p = document.querySelector("#panel");
    p.hidden = false;
    p.innerHTML =
      '<button class="close" aria-label="メニューを閉じる">×</button><h2>水庭の設定</h2><div id="time-setting"></div><label>水底<select aria-label="水底"></select></label><p>水庭はこのブラウザに自動保存されます。メダカに触れると、名前を変えられます。</p><button id="reset">水庭をリセット</button><p>鑑賞から戻る：右下の隅に触れる。<br>キーボード：Escでメニューを閉じる。</p>';
    p.querySelector(".close").onclick = g.closePanel;
    p.querySelector("#reset").onclick = g.reset;
    g.addTimeSettings?.(p.querySelector("#time-setting"));
    const bottom = p.querySelector('select[aria-label="水底"]');
    for (const [value, preset] of Object.entries(BOTTOMS)) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = preset.label;
      bottom.append(option);
    }
    bottom.value = g.settings.bottom;
    bottom.onchange = () => g.setBottom(bottom.value);
  };
  settings.onclick = () => {
    if (g.mode === "settings") g.closePanel();
    else g.openSettings();
  };
  setInterval(() => g.save(), 5000);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) g.save();
  });
  window.addEventListener("pagehide", () => g.save());
})();
