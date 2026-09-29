const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const vm = require("node:vm");
function load(name) {
  const source = ts.transpileModule(fs.readFileSync(`lib/${name}.ts`, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, require: (p) => load(p.replace("./", "")), Intl, Date, Map, Set });
  return exports;
}
const t = load("timer-engine");
const u = load("utils");
const summary = load("summary");
const csv = load("csv");
const owner = "11111111-1111-4111-8111-111111111111";
const id = "22222222-2222-4222-8222-222222222222";
test("pause/resume excludes pauses and refresh preserves elapsed time", () => {
  let s = t.start(t.initialTimer(owner), id, 10000);
  s = t.pause(s, 30000);
  assert.equal(t.elapsed(s, 90000), 20);
  s = t.resume(s, 90000);
  assert.equal(t.elapsed(s, 100000), 30);
  assert.equal(t.elapsed(t.parseTimer(JSON.stringify(s), owner), 110000), 40);
});
test("storage is scoped to account; malformed valid JSON is rejected", () => {
  const s = t.start(t.initialTimer(owner), id, 10000);
  assert.equal(t.parseTimer(JSON.stringify(s), "another-user"), null);
  for (const raw of ["null", "{}", "[]", '{"version":2}', "bad"])
    assert.equal(t.parseTimer(raw, owner), null);
  assert.notEqual(t.timerKey(owner), t.timerKey("other"));
  assert.equal(t.parseTimer(JSON.stringify({ ...s, pausedMs: -1 }), owner), null);
});
test("retry keeps the same ID, timestamp, duration and notes", () => {
  let s = t.start(t.initialTimer(owner), id, 10000);
  s = t.prepareSave({ ...s, note: "chapter 1" }, 70000);
  const retry = t.prepareSave(t.parseTimer(JSON.stringify(s), owner), 90000);
  assert.equal(JSON.stringify(s), JSON.stringify(retry));
  assert.equal(retry.pending.seconds, 60);
  assert.equal(retry.id, id);
  assert.equal(t.resume(s, 100000).status, "pending");
});
test("Pomodoro completion after sleep uses deadline, not wake time", () => {
  let s = { ...t.initialTimer(owner, 25, 5), mode: "pomodoro" };
  s = t.start(s, id, 10000);
  s = t.prepareSave(s, 4000010, true);
  assert.equal(s.pending.seconds, 1500);
  assert.equal(s.pending.endedAt, 1510000);
  const next = t.afterSave(s, 4000010);
  assert.equal(next.phase, "break");
  assert.equal(t.remaining(next, 4000010), 300);
});
test("paused Pomodoro deadline includes actual pauses", () => {
  let s = t.start({ ...t.initialTimer(owner, 1, 5), mode: "pomodoro" }, id, 10000);
  s = t.pause(s, 30000);
  s = t.resume(s, 90000);
  s = t.prepareSave(s, 200000, true);
  assert.equal(s.pending.endedAt, 130000);
  assert.equal(s.pending.seconds, 60);
});
test("timer mode and subject survive completed manual session", () => {
  const s = t.prepareSave(
    t.start({ ...t.initialTimer(owner), mode: "pomodoro", subject: "Math" }, id, 10000),
    70000
  );
  const next = t.afterSave(s, 80000);
  assert.equal(next.mode, "pomodoro");
  assert.equal(next.subject, "Math");
  assert.equal(next.status, "idle");
});
test("invalid focus settings fail before starting", () => {
  for (const value of [0, 181, 2.5, NaN, Infinity])
    assert.throws(() => t.start({ ...t.initialTimer(owner), focusMinutes: value }, id, 0));
});
test("short sessions retain precision and tooltip duration", () => {
  const data = summary.chartDays([{ date: "2026-09-24", seconds: 120 }], 1);
  assert.equal(data[0].hours, 120 / 3600);
  assert.equal(u.formatDuration(Math.round((1500 / 3600) * 3600)), "25m 0s");
});
test("timezone date rollover is independent of device timezone", () => {
  assert.equal(summary.dateInZone("Asia/Kolkata", new Date("2026-09-24T19:00:00Z")), "2026-09-25");
  assert.equal(summary.dateInZone("America/New_York", new Date("2026-09-24T02:00:00Z")), "2026-09-23");
});
test("weekly average uses elapsed days and skips truncated first week", () => {
  const days = [
    { date: "2026-09-20", seconds: 3600 },
    { date: "2026-09-21", seconds: 7200 },
    { date: "2026-09-22", seconds: 3600 }
  ];
  const chart = summary.weeklyChart({ days });
  assert.equal(chart.length, 1);
  assert.equal(chart[0].hours, 1.5);
});
test("CSV quotes embedded delimiters and prevents formula injection", () => {
  assert.equal(csv.csvCell("=SUM(A1:A2)"), `"'=SUM(A1:A2)"`);
  assert.equal(csv.csvCell('a,"b"'), `"a,""b"""`);
});

test("older timers recover paused, preserving duration and original start", () => {
  const legacy = load("legacy");
  const old = {
    status: "paused",
    startedAt: new Date(10000).toISOString(),
    pausedAt: new Date(80000).toISOString(),
    accumulatedPausedMs: 10000
  };
  const recovered = legacy.convertLegacyTimer(JSON.stringify(old), owner, "stopwatch", id, 100000);
  assert.equal(recovered.status, "paused");
  assert.equal(recovered.startedAt, 10000);
  assert.equal(t.elapsed(recovered, 100000), 60);
  assert.throws(() =>
    legacy.convertLegacyTimer('{"status":"running","startedAt":"invalid"}', owner, "stopwatch", id)
  );
});
