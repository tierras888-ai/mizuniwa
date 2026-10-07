/* Development-only runner. The application itself has no dependencies. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const root = path.resolve(__dirname, "..");
const out = path.join(root, "artifacts");
fs.mkdirSync(out, { recursive: true });
const port = Number(process.env.TEST_PORT || 8173);
const base = `http://127.0.0.1:${port}`;
const server = spawn(
  "python3",
  ["-m", "http.server", String(port), "--bind", "127.0.0.1"],
  { cwd: root, stdio: "ignore" },
);
let browser;
const report = {
  timestamp: new Date().toISOString(),
  checks: [],
  console: [],
  performance: [],
  screenshots: [],
  scope:
    "Chromium desktop and mobile emulation; physical iOS/Android not tested",
};
function pass(name, detail) {
  report.checks.push({ name, status: "passed", detail });
  console.log(`PASS ${name}`);
}
async function open(options = {}) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  page.on("pageerror", (e) =>
    report.console.push({ type: "error", text: e.message }),
  );
  page.on("console", (m) => {
    if (["error", "warning"].includes(m.type()))
      report.console.push({ type: m.type(), text: m.text() });
  });
  await page.goto(base + "/?time=day");
  return { context, page };
}
async function shot(page, name) {
  await page.screenshot({ path: path.join(out, name + ".png") });
  report.screenshots.push(name + ".png");
}
async function gesture(page, points) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: points[0][0], y: points[0][1], id: 1 }],
  });
  for (const [x, y] of points.slice(1)) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x, y, id: 1 }],
    });
    await page.waitForTimeout(30);
  }
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await cdp.detach();
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
    headless: true,
    args: ["--no-sandbox"],
  });
  const { context, page } = await open({
    viewport: { width: 1440, height: 900 },
  });
  await page.waitForTimeout(400);
  assert.equal(await page.evaluate(() => mizuniwa.fish.length), 8);
  assert.equal(
    await page.evaluate(() => new Set(mizuniwa.fish.map((f) => f.speed)).size),
    8,
  );
  const oldPos = await page.evaluate(() =>
    mizuniwa.fish.map((f) => [f.x, f.y]),
  );
  await page.waitForTimeout(600);
  const newPos = await page.evaluate(() =>
    mizuniwa.fish.map((f) => [f.x, f.y]),
  );
  assert(
    newPos.some(
      (p, i) => Math.hypot(p[0] - oldPos[i][0], p[1] - oldPos[i][1]) > 0.001,
    ),
  );
  pass("8 medaka swim with individual speeds");
  const count = await page.evaluate(() => mizuniwa.ripples.length);
  await page.mouse.move(650, 410);
  await page.mouse.move(680, 430, { steps: 5 });
  assert.equal(await page.evaluate(() => mizuniwa.ripples.length), count);
  assert(
    await page.evaluate(
      () =>
        mizuniwa.stats.moves > 0 && mizuniwa.a.some((v) => Math.abs(v) > 0.01),
    ),
  );
  pass("pointer movement disturbs height map without circles");
  await page.mouse.click(680, 430);
  assert(await page.evaluate(() => mizuniwa.ripples.length > 0));
  await page.waitForTimeout(2800);
  assert.equal(await page.evaluate(() => mizuniwa.ripples.length), 0);
  pass("tap produces a decaying circular ripple");
  await page.evaluate(() => {
    const f = mizuniwa.fish[0];
    f.x = 0.5;
    f.y = 0.5;
    f.rest = 10;
  });
  await page.mouse.click(720, 450);
  await page.locator('input[aria-label="メダカの名前"]').fill("みなも");
  await page.locator('input[aria-label="メダカの名前"]').press("Tab");
  assert.equal(await page.evaluate(() => mizuniwa.fish[0].name), "みなも");
  assert(await page.evaluate(() => mizuniwa.fish.some((f) => f.scared > 0)));
  pass("fish info, name editing and startle response");
  await page.waitForTimeout(2400);
  assert(await page.evaluate(() => mizuniwa.fish.every((f) => f.scared === 0)));
  pass("startled fish return to ordinary swimming");
  assert.deepEqual(
    await page.evaluate(() =>
      [...new Set(mizuniwa.plants.map((p) => p.type))].sort(),
    ),
    ["anacharis", "float", "hornwort", "lily"],
  );
  pass("four plant species and surface/submerged layers");
  await page.evaluate(() => {
    mizuniwa.fish.forEach((f, i) => {
      f.x = 0.5 + (i - 4) * 0.012;
      f.y = 0.47;
      f.angle = Math.PI / 2;
      f.scared = 0;
    });
  });
  await page.click("#feed");
  assert.equal(await page.evaluate(() => mizuniwa.mode), "feed");
  await page.mouse.click(720, 450);
  assert.equal(await page.evaluate(() => mizuniwa.food.length), 7);
  assert.equal(
    await page.evaluate(() => mizuniwa.fish.filter((f) => f.target).length),
    0,
  );
  await page.waitForFunction(
    () => mizuniwa.fish.filter((f) => f.target).length > 1,
  );
  await page.waitForFunction(() => mizuniwa.consumed > 0, null, {
    timeout: 16000,
  });
  pass("UI feeding: delayed detection, gathering and consumption");
  await page.click("#feed");
  await page.click("#edit");
  const initialObjects = await page.evaluate(() => mizuniwa.objects.length);
  await page.click('[data-type="pot"]');
  await page.mouse.click(620, 340);
  await page.mouse.move(620, 340);
  await page.mouse.down();
  await page.mouse.move(760, 390, { steps: 12 });
  await page.mouse.up();
  await page.locator('input[aria-label="回転"]').fill("75");
  await page.locator('input[aria-label="大きさ"]').fill("1.45");
  assert(
    await page.evaluate(
      () =>
        Math.abs(mizuniwa.selected.x - 760 / 1440) < 0.01 &&
        Math.abs(mizuniwa.selected.angle - (Math.PI * 75) / 180) < 0.001 &&
        mizuniwa.selected.size === 1.45,
    ),
  );
  pass("place, drag, rotate and resize an object");
  const saved = await page.evaluate(() => {
    cancelAnimationFrame(mizuniwa.raf);
    mizuniwa.save();
    return mizuniwa.snapshot();
  });
  await page.reload();
  const restored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem(mizuniwa.storageKey)),
  );
  assert.deepEqual(restored.objects, saved.objects);
  assert.deepEqual(restored.plants, saved.plants);
  assert.deepEqual(restored.fish, saved.fish);
  pass("reload restores full fish records, plants and normalized placement");
  await page.click("#edit");
  await page.mouse.click(760, 390);
  await page.getByRole("button", { name: "削除", exact: true }).click();
  assert.equal(
    await page.evaluate(() => mizuniwa.objects.length),
    initialObjects,
  );
  const box = await page.locator('[data-type="bamboo"]').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(500, 450, { steps: 14 });
  await page.mouse.up();
  assert.equal(
    await page.evaluate(() => mizuniwa.objects.at(-1).type),
    "bamboo",
  );
  assert.equal(await page.evaluate(() => mizuniwa.pending), null);
  pass("delete object and drag directly from catalog");
  for (const type of [
    "stone",
    "moss",
    "wood",
    "pot",
    "lantern",
    "bridge",
    "bamboo",
    "torii",
    "lily",
    "hornwort",
    "anacharis",
    "float",
  ]) {
    await page.click(`[data-type="${type}"]`);
    await page.mouse.click(600, 360);
    assert.equal(await page.evaluate(() => mizuniwa.selected.type), type);
  }
  pass("all eight object types and four plants can be added");
  await page.keyboard.press("Escape");
  await page.click("#settings");
  await page.selectOption('select[aria-label="光の時間帯"]', "evening");
  await page.goto(base);
  assert.equal(await page.evaluate(() => mizuniwa.timeOfDay), "evening");
  await page.goto(base + "/?time=day");
  assert.equal(await page.evaluate(() => mizuniwa.timeOfDay), "day");
  assert.equal(await page.evaluate(() => mizuniwa.settings.time), "evening");
  pass("URL time override and saved time state");
  await page.click("#settings");
  page.once("dialog", (d) => d.dismiss());
  await page.click("#reset");
  assert(await page.evaluate(() => mizuniwa.objects.length > 4));
  page.once("dialog", (d) => d.accept());
  await page.click("#reset");
  assert.equal(await page.evaluate(() => mizuniwa.objects.length), 4);
  assert.equal(await page.evaluate(() => mizuniwa.fish[0].name), "こはく");
  pass("reset confirmation: cancellation preserves, acceptance restores");
  for (const corrupt of [
    "{broken",
    JSON.stringify({ version: 99 }),
    JSON.stringify({
      version: 1,
      fish: [],
      plants: [],
      objects: [],
      state: { time: "day" },
    }),
  ]) {
    await page.evaluate((v) => {
      localStorage.setItem("mizuniwa.garden.v1", v);
      mizuniwa.save = () => true;
    }, corrupt);
    await page.reload();
    assert.equal(await page.evaluate(() => mizuniwa.fish.length), 8);
    assert.match(
      await page.locator("#notice").textContent(),
      /保存データを読み込めない/,
    );
  }
  pass("malformed data, unknown schema and invalid records recover");
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("QuotaExceededError");
    };
    mizuniwa.save();
  });
  assert.equal(await page.evaluate(() => mizuniwa.storageOK), false);
  const frameBefore = await page.evaluate(() => mizuniwa.stats.frames);
  await page.waitForTimeout(200);
  assert((await page.evaluate(() => mizuniwa.stats.frames)) > frameBefore);
  pass("save failure leaves the garden running");
  await context.close();

  for (const [device, options] of Object.entries({
    desktop: { viewport: { width: 1440, height: 900 } },
    mobile: {
      viewport: { width: 375, height: 812 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    },
  })) {
    const { context, page } = await open(options);
    for (const time of ["day", "evening", "night"]) {
      await page.goto(base + "/?time=" + time);
      await page.waitForTimeout(350);
      await shot(page, device + "-" + time);
      assert.equal(await page.evaluate(() => mizuniwa.timeOfDay), time);
    }
    pass(device + ": day/evening/night screenshots captured");
    await page.click("#view");
    assert.equal(await page.locator(".ui:visible").count(), 0);
    await shot(page, device + "-viewing");
    if (device === "mobile") await page.touchscreen.tap(365, 802);
    else await page.mouse.click(1430, 890);
    assert.equal(await page.locator("#view:visible").count(), 1);
    pass(device + ": all UI hidden in viewing mode; corner restores it");
    if (device === "mobile") {
      const waveBefore = await page.evaluate(() => mizuniwa.stats.moves);
      await gesture(page, [
        [170, 350],
        [175, 360],
        [182, 370],
        [190, 380],
        [200, 390],
      ]);
      assert((await page.evaluate(() => mizuniwa.stats.moves)) > waveBefore);
      await page.touchscreen.tap(210, 410);
      assert((await page.evaluate(() => mizuniwa.ripples.length)) > 0);
      assert.equal(
        await page
          .locator("#garden")
          .evaluate((el) => getComputedStyle(el).touchAction),
        "none",
      );
      await page.click("#edit");
      await page.click('[data-type="lily"]');
      await page.touchscreen.tap(180, 230);
      await gesture(page, [
        [180, 230],
        [195, 225],
        [205, 215],
        [220, 205],
      ]);
      assert(
        await page.evaluate(
          () => Math.abs(mizuniwa.selected.x - 220 / 375) < 0.025,
        ),
      );
      await page.locator('input[aria-label="回転"]').fill("30");
      await page.locator('input[aria-label="大きさ"]').fill("1.1");
      assert(
        await page.evaluate(
          () =>
            Math.abs(mizuniwa.selected.angle - Math.PI / 6) < 0.01 &&
            mizuniwa.selected.size === 1.1,
        ),
      );
      await page.getByRole("button", { name: "削除", exact: true }).click();
      pass("375px touch: stroke, tap, place, drag, rotate, scale and delete");
      await page.keyboard.press("Escape");
      await page.evaluate(() => {
        const f = mizuniwa.fish[0];
        f.x = 0.5;
        f.y = 0.4;
        f.rest = 10;
      });
      await page.touchscreen.tap(187.5, 324.8);
      await page.locator('input[aria-label="メダカの名前"]').fill("スマホの子");
      await page.locator('input[aria-label="メダカの名前"]').press("Tab");
      assert.equal(
        await page.evaluate(() => mizuniwa.fish[0].name),
        "スマホの子",
      );
      await page.click("#feed");
      await page.touchscreen.tap(180, 350);
      assert.equal(await page.evaluate(() => mizuniwa.food.length), 7);
      await page.click("#feed");
      await page.click("#settings");
      await page.selectOption('select[aria-label="光の時間帯"]', "night");
      page.once("dialog", (d) => d.dismiss());
      await page.click("#reset");
      await page.keyboard.press("Escape");
      pass("375px touch: fish naming, feeding, settings and reset");
      const positions = await page.evaluate(() =>
        mizuniwa.plants.map((p) => [p.x, p.y]),
      );
      await page.setViewportSize({ width: 812, height: 375 });
      await page.waitForTimeout(200);
      assert.deepEqual(
        await page.evaluate(() => mizuniwa.plants.map((p) => [p.x, p.y])),
        positions,
      );
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth === innerWidth,
        ),
      );
      await shot(page, "mobile-landscape");
      await page.setViewportSize({ width: 375, height: 812 });
      pass("portrait/landscape resize preserves normalized coordinates");
    }
    await page.goto(base + "/?time=day");
    await page.waitForTimeout(5000);
    const perf = await page.evaluate(async () => {
      mizuniwa.stats.frameTimes = [];
      await new Promise((r) => setTimeout(r, 3000));
      const t = mizuniwa.stats.frameTimes;
      const sorted = [...t].sort((a, b) => a - b);
      return {
        fps: 1000 / (t.reduce((a, b) => a + b, 0) / t.length),
        p95FrameMs: sorted[Math.floor(sorted.length * 0.95)],
        samples: t.length,
        canvas: [mizuniwa.canvas.width, mizuniwa.canvas.height],
        dprCap: mizuniwa.dpr,
        quality: mizuniwa.quality,
      };
    });
    report.performance.push({ device, ...perf });
    assert(
      perf.fps >= (device === "mobile" ? 30 : 55),
      `${device} FPS ${perf.fps}`,
    );
    assert(perf.dprCap <= 2);
    pass(device + ": frame rate and DPR budget", perf);
    const pause = await page.evaluate(async () => {
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
      const a = mizuniwa.stats.frames;
      await new Promise((r) => setTimeout(r, 150));
      const b = mizuniwa.stats.frames;
      Object.defineProperty(document, "hidden", {
        configurable: true,
        get: () => false,
      });
      document.dispatchEvent(new Event("visibilitychange"));
      await new Promise((r) => setTimeout(r, 150));
      return [a, b, mizuniwa.stats.frames];
    });
    assert.equal(pause[0], pause[1]);
    assert(pause[2] > pause[1]);
    pass(device + ": hidden-tab handler pauses and resumes animation");
    await context.close();
  }
  const reduced = await open({
    viewport: { width: 375, height: 812 },
    reducedMotion: "reduce",
  });
  assert.equal(await reduced.page.evaluate(() => mizuniwa.reduced), true);
  pass("prefers-reduced-motion is honored");
  await reduced.context.close();
  assert.deepEqual(report.console, []);
  pass("zero console errors and warnings across all tests");
  report.status = "passed";
})()
  .catch((error) => {
    report.status = "failed";
    report.error = error.stack;
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    fs.writeFileSync(
      path.join(out, "test-report.json"),
      JSON.stringify(report, null, 2),
    );
    await browser?.close();
    server.kill();
  });
