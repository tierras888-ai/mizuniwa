const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const hash = (s) => createHash("sha256").update(s).digest("hex");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = path.resolve(__dirname, "..");
const out = path.join(root, "artifacts");
fs.mkdirSync(out, { recursive: true });
const base = "http://127.0.0.1:8184";
const server = spawn(
  "python3",
  ["-m", "http.server", "8184", "--bind", "127.0.0.1"],
  { cwd: root, stdio: "ignore" },
);
let browser;
const report = {
  checks: [],
  console: [],
  screenshots: [],
  performance: [],
  timestamp: new Date().toISOString(),
};
const pass = (name, detail) => {
  report.checks.push({ name, status: "passed", detail });
  console.log("PASS " + name);
};
function records(fish) {
  return fish.map(
    ({ x, y, angle, aim, rest, decision, phase, scared, ...f }) => f,
  );
}
async function shot(page, name) {
  await page.screenshot({ path: path.join(out, name + ".png") });
  report.screenshots.push(name + ".png");
}
async function frozenState(page) {
  return page.evaluate(() => {
    cancelAnimationFrame(mizuniwa.raf);
    return { state: mizuniwa.snapshot(), bottom: mizuniwa.bottom.toDataURL() };
  });
}
(async () => {
  for (let i = 0; i < 40; i++) {
    try {
      if ((await fetch(base)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({
    executablePath: process.env.BROWSER_EXECUTABLE || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  for (const [device, options] of Object.entries({
    desktop: { viewport: { width: 1280, height: 800 } },
    mobile: {
      viewport: { width: 375, height: 812 },
      hasTouch: true,
      isMobile: true,
      deviceScaleFactor: 3,
    },
  })) {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    page.on("pageerror", (e) => report.console.push(e.message));
    page.on("console", (m) => {
      if (["warning", "error"].includes(m.type()))
        report.console.push(m.text());
    });
    await page.goto(base);
    const initial = await frozenState(page);
    assert.equal(initial.state.state.bottom, "natural");
    assert.equal(initial.state.state.time, "auto");
    for (const variant of ["gravel", "sand"]) {
      // ① Edit the garden: remove an original plant, add a new one, and rename a medaka.
      await page.click("#edit");
      await page.locator('[data-type="lily"]').click();
      await page.mouse.click(
        options.viewport.width * 0.45,
        options.viewport.height * 0.25,
      );
      await page.getByRole("button", { name: "削除", exact: true }).click();
      await page.mouse.click(
        options.viewport.width * 0.18,
        options.viewport.height * 0.29,
      );
      await page.getByRole("button", { name: "削除", exact: true }).click();
      if (device === "mobile")
        await page
          .getByRole("button", {
            name: "水草・オブジェクトを追加",
            exact: true,
          })
          .count()
          .then(async (n) => {
            if (n)
              await page
                .getByRole("button", {
                  name: "水草・オブジェクトを追加",
                  exact: true,
                })
                .click();
          });
      await page.locator('[data-type="anacharis"]').click();
      await page.mouse.click(
        options.viewport.width * 0.48,
        options.viewport.height * 0.22,
      );
      await page.keyboard.press("Escape");
      // Place the fish in open water only to make its information tap deterministic.
      await page.evaluate(() => {
        mizuniwa.fish[0].x = 0.5;
        mizuniwa.fish[0].y = 0.42;
      });
      await page.mouse.click(
        options.viewport.width * 0.5,
        options.viewport.height * 0.42,
      );
      await page
        .locator('input[aria-label="メダカの名前"]')
        .fill("編集したメダカ");
      await page.locator('input[aria-label="メダカの名前"]').press("Tab");
      // ② Change the floor via the real settings UI and verify its pixels actually changed.
      await page.click("#settings");
      await page.selectOption('select[aria-label="水底"]', variant);
      await page.selectOption('select[aria-label="光の時間帯"]', "evening");
      await page.keyboard.press("Escape");
      assert.notEqual(
        await page.evaluate(() => mizuniwa.bottom.toDataURL()),
        initial.bottom,
      );
      pass(device + ": editable floor " + variant + " changes rendered pixels");
      // ③ Add, move, rotate and scale a pot.
      await page.click("#edit");
      await page.locator('[data-type="pot"]').click();
      const w = options.viewport.width,
        h = options.viewport.height;
      await page.mouse.click(w * 0.52, h * 0.3);
      await page.mouse.move(w * 0.52, h * 0.3);
      await page.mouse.down();
      await page.mouse.move(w * 0.62, h * 0.35, { steps: 10 });
      await page.mouse.up();
      await page.locator('input[aria-label="回転"]').fill("110");
      await page.locator('input[aria-label="大きさ"]').fill("1.7");
      assert(
        await page.evaluate(
          () =>
            mizuniwa.selected.type === "pot" &&
            Math.abs(mizuniwa.selected.size - 1.7) < 0.001 &&
            Math.abs(mizuniwa.selected.angle - (110 * Math.PI) / 180) < 0.001,
        ),
      );
      const edited = await page.evaluate(() => {
        mizuniwa.save();
        return mizuniwa.snapshot();
      });
      assert.notDeepEqual(edited.objects, initial.state.objects);
      assert.notDeepEqual(edited.plants, initial.state.plants);
      await page.keyboard.press("Escape");
      // Edited floor and placements must restore as well as reset.
      await page.reload();
      await frozenState(page);
      const restoredEdit = await page.evaluate(() => mizuniwa.snapshot());
      assert.equal(restoredEdit.state.bottom, variant);
      assert.deepEqual(restoredEdit.objects, edited.objects);
      assert.deepEqual(restoredEdit.plants, edited.plants);
      assert.equal(restoredEdit.fish[0].name, "編集したメダカ");
      await page.evaluate(() => {
        mizuniwa.feed(0.5, 0.5);
        mizuniwa.ripple(200, 200);
        mizuniwa.disturb(100, 100, 4);
        mizuniwa.fishWakeTimers.set("fish-0", 3);
      });
      // Cancel first to keep the confirmation contract.
      await page.click("#settings");
      page.once("dialog", (d) => d.dismiss());
      await page.click("#reset");
      assert.equal(
        await page.evaluate(() => mizuniwa.settings.bottom),
        variant,
      );
      // ④ Reset through the confirmed UI. ⑤ Compare all saved entities and the floor bitmap.
      page.once("dialog", (d) => d.accept());
      await page.click("#reset");
      const reset = await frozenState(page);
      assert.deepEqual(reset.state.objects, initial.state.objects);
      assert.deepEqual(reset.state.plants, initial.state.plants);
      assert.deepEqual(records(reset.state.fish), records(initial.state.fish));
      assert.deepEqual(reset.state.state, initial.state.state);
      assert.equal(hash(reset.bottom), hash(initial.bottom));
      const transient = await page.evaluate(() => ({
        food: mizuniwa.food.length,
        ripples: mizuniwa.ripples.length,
        waves: [mizuniwa.a, mizuniwa.b, mizuniwa.c].reduce(
          (s, a) => s + a.reduce((n, v) => n + Math.abs(v), 0),
          0,
        ),
        wakes: mizuniwa.fishWakeTimers.size,
        drag: mizuniwa.drag,
        mode: mizuniwa.mode,
        time: mizuniwa.time,
      }));
      assert.equal(transient.food, 0);
      assert.equal(transient.ripples, 0);
      assert.equal(transient.waves, 0);
      assert.equal(transient.wakes, 0);
      assert.equal(transient.mode, null);
      assert.equal(transient.time, 0);
      const saved = await page.evaluate(() =>
        JSON.parse(localStorage.getItem(mizuniwa.storageKey)),
      );
      assert.deepEqual(saved, reset.state);
      pass(
        device +
          ": confirmed reset restores all initial entities, floor pixels, settings, fish traits and transient water state (" +
          variant +
          ")",
      );
      // ⑥ Reload. ⑦ The default state must remain, with no deleted/new entities coming back.
      await page.reload();
      const reload = await frozenState(page);
      assert.deepEqual(reload.state.objects, initial.state.objects);
      assert.deepEqual(reload.state.plants, initial.state.plants);
      assert.deepEqual(records(reload.state.fish), records(initial.state.fish));
      assert.deepEqual(reload.state.state, initial.state.state);
      assert.equal(hash(reload.bottom), hash(initial.bottom));
      pass(
        device + ": reloading preserves the complete reset (" + variant + ")",
      );
    }
    // Existing V1 saves lacking bottom metadata retain user content.
    await page.evaluate(() => {
      const d = mizuniwa.snapshot();
      delete d.state.bottom;
      d.fish[0].name = "旧保存の子";
      localStorage.setItem(mizuniwa.storageKey, JSON.stringify(d));
      mizuniwa.save = () => true;
    });
    await page.reload();
    await frozenState(page);
    assert.equal(
      await page.evaluate(() => mizuniwa.settings.bottom),
      "natural",
    );
    assert.equal(
      await page.evaluate(() => mizuniwa.fish[0].name),
      "旧保存の子",
    );
    pass(device + ": old V1 save compatibility");
    // URL time overrides should be cleared by a full reset, including after reload.
    await page.goto(base + "/?time=night");
    await frozenState(page);
    await page.click("#settings");
    page.once("dialog", (d) => d.accept());
    await page.click("#reset");
    assert.equal(new URL(page.url()).searchParams.has("time"), false);
    await page.reload();
    await frozenState(page);
    assert.equal(await page.evaluate(() => mizuniwa.debugTime), null);
    pass(device + ": reset clears the URL time override");
    // ⑧ Capture all times, both calm and rippled, for visual inspection.
    let floor;
    for (const time of ["day", "evening", "night"]) {
      await page.goto(base + "/?time=" + time);
      await page.waitForTimeout(450);
      await shot(page, device + "-clear-" + time);
      const bitmap = await page.evaluate(() => mizuniwa.bottom.toDataURL());
      if (floor) assert.equal(bitmap, floor);
      floor = bitmap;
      await page.mouse.click(waterX(options), waterY(options));
      await page.waitForTimeout(600);
      await shot(page, device + "-clear-" + time + "-ripple");
      assert.equal(
        await page.evaluate(
          () =>
            mizuniwa.rippleBands(mizuniwa.ripples.find((r) => r.power === 1))
              .length,
        ),
        3,
      );
    }
    pass(
      device +
        ": day/evening/night do not recolor the floor; 3-front ripples captured",
    );
    // Prove refraction moves underlying image pixels even with the ring lighting removed.
    const distortion = await page.evaluate(() => {
      cancelAnimationFrame(mizuniwa.raf);
      mizuniwa.ripples = [];
      mizuniwa.a.fill(0);
      mizuniwa.b.fill(0);
      mizuniwa.c.fill(0);
      mizuniwa.drawWater();
      const first = mizuniwa.ctx.getImageData(
        0,
        0,
        mizuniwa.canvas.width,
        mizuniwa.canvas.height,
      ).data;
      mizuniwa.ripple(mizuniwa.w * 0.5, mizuniwa.h * 0.5, 1);
      mizuniwa.ripples[0].age = 0.65;
      mizuniwa.drawWater();
      const second = mizuniwa.ctx.getImageData(
        0,
        0,
        mizuniwa.canvas.width,
        mizuniwa.canvas.height,
      ).data;
      let pixels = 0;
      for (let i = 0; i < first.length; i += 4) {
        if (
          Math.abs(first[i] - second[i]) +
            Math.abs(first[i + 1] - second[i + 1]) +
            Math.abs(first[i + 2] - second[i + 2]) >
          6
        )
          pixels++;
      }
      return pixels;
    });
    assert(distortion > 80);
    pass(
      device +
        ": refraction changes actual underwater pixels independently of ring highlights",
      { changedPixels: distortion },
    );
    // Mouse strokes have height displacement but no click-strength ring fronts.
    await page.goto(base);
    await page.evaluate(() => {
      mizuniwa.ripples = [];
    });
    await page.mouse.move(170, 250);
    await page.mouse.move(190, 275, { steps: 5 });
    assert.equal(await page.evaluate(() => mizuniwa.ripples.length), 0);
    assert(
      await page.evaluate(() => mizuniwa.a.some((v) => Math.abs(v) > 0.01)),
    );
    await page.click("#feed");
    await page.mouse.click(waterX(options), waterY(options));
    assert(
      await page.evaluate(
        () =>
          mizuniwa.ripples.length === 7 &&
          mizuniwa.ripples.every((r) => r.power === 0.15),
      ),
    );
    pass(
      device + ": gentle pointer strokes and lower-strength feeding ripples",
    );
    // Measure responsiveness while strong waves are active, not just on a still pond.
    await page.goto(base + "/?time=day");
    await page.waitForTimeout(4000);
    await page.evaluate(() => {
      mizuniwa.stats.frameTimes = [];
      window.waveBenchmark = setInterval(
        () => mizuniwa.ripple(mizuniwa.w * 0.5, mizuniwa.h * 0.5),
        1000,
      );
    });
    await page.waitForTimeout(3000);
    const perf = await page.evaluate(() => {
      clearInterval(window.waveBenchmark);
      const t = mizuniwa.stats.frameTimes;
      return {
        fps: 1000 / (t.reduce((a, b) => a + b, 0) / t.length),
        frames: t.length,
        quality: mizuniwa.quality,
      };
    });
    report.performance.push({ device, ...perf });
    assert(perf.fps >= 30);
    pass(device + ": responsive with active ripple refraction", perf);
    await context.close();
  }
  assert.deepEqual(report.console, []);
  pass("no console errors or warnings");
  report.status = "passed";
})()
  .catch((e) => {
    report.status = "failed";
    report.error = e.stack;
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    fs.writeFileSync(
      path.join(out, "water-reset-report.json"),
      JSON.stringify(report, null, 2),
    );
    await browser?.close();
    server.kill();
  });
function waterX(o) {
  return o.viewport.width * 0.5;
}
function waterY(o) {
  return o.viewport.height * 0.42;
}
