import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createClientServices } from "../../src/application/client/services";
import type { SessionGateway } from "../../src/application/client/ports";
import type { SessionInfo } from "../../src/domain/session/session";
import { fakeGateway, fakeStore, reply } from "../support/fakes";

const openSession = { code: "K7M2Q", name: "Taller", closed: false, unlocked: 2, attemptLimit: null, collectEmails: false };
const joined = { "taller.session": JSON.stringify({ code: "K7M2Q", name: "Taller" }), "taller.team": "Bits", "taller.avatar": "3" };
const setup = (gateway: Partial<SessionGateway> = {}, stored: Record<string, string> = {}) => {
  const store = fakeStore(stored);
  return { store, services: createClientServices(store, fakeGateway(gateway)) };
};

describe("player profile", () => {
  it("keeps the team name trimmed and the avatar within range", () => {
    const { services, store } = setup();
    services.profile.renameTeam(`  ${"x".repeat(40)} `);
    assert.equal(services.profile.teamName().length, 30);
    assert.equal(services.profile.avatar(), 0);
    store.data["taller.avatar"] = "99";
    assert.equal(services.profile.avatar(), 7);
  });
});

describe("session membership", () => {
  it("joins an open session and remembers it", async () => {
    const { services, store } = setup({ findSession: async () => reply(200, openSession) });
    assert.deepEqual(await services.membership.join(" k7m2q ", "Bits"), { ok: true, session: { code: "K7M2Q", name: "Taller" }, collectEmails: false });
    assert.deepEqual(services.membership.current(), { code: "K7M2Q", name: "Taller" });
    assert.equal(store.data["taller.team"], "Bits");
  });

  it("explains why a session cannot be joined", async () => {
    assert.deepEqual(await setup().services.membership.join("", "Bits"), { ok: false, reason: "missing-fields" });
    assert.deepEqual(await setup({ findSession: async () => reply(404) }).services.membership.join("X", "Bits"), { ok: false, reason: "not-found" });
    assert.deepEqual(await setup({ findSession: async () => reply(200, { ...openSession, closed: true }) }).services.membership.join("X", "Bits"), { ok: false, reason: "closed" });
    assert.deepEqual(await setup().services.membership.join("X", "Bits"), { ok: false, reason: "offline" });
    assert.deepEqual(await setup({ findSession: async () => reply(200) }).services.membership.join("X", "Bits"), { ok: false, reason: "offline" });
  });

  it("tells whether the session asks for an email, and only a real true counts", async () => {
    const join = (body: object) => setup({ findSession: async () => reply(200, body as SessionInfo) }).services.membership.join("K7M2Q", "Bits");
    assert.deepEqual(await join({ ...openSession, collectEmails: true }), { ok: true, session: { code: "K7M2Q", name: "Taller" }, collectEmails: true });
    for (const collectEmails of ["true", 1, undefined]) {
      const result = await join({ ...openSession, collectEmails });
      assert.ok(result.ok && result.collectEmails === false);
    }
    const legacy = await join({ code: "K7M2Q", name: "Taller", closed: false, unlocked: 0, attemptLimit: null });
    assert.ok(legacy.ok && legacy.collectEmails === false);
  });

  it("erases the local scores of the session when leaving", () => {
    const { services, store } = setup({}, { ...joined, "taller.scores.K7M2Q": "{\"nivel-1\":200}" });
    services.membership.leave();
    assert.equal(services.membership.current(), null);
    assert.equal(store.data["taller.scores.K7M2Q"], undefined);
  });

  it("forgets that the email was asked when leaving, so the next team on the device is asked", () => {
    const { services, store } = setup({}, { ...joined, "taller.emailAsked.K7M2Q": "1" });
    services.membership.leave();
    assert.equal(store.data["taller.emailAsked.K7M2Q"], undefined);
  });
});

describe("local progress", () => {
  it("keeps the best score, the medals and the play count per session", () => {
    const { services, store } = setup({}, joined);
    services.progress.saveScore("nivel-1", 200);
    services.progress.saveScore("nivel-1", 150);
    assert.deepEqual(services.progress.scores(), { "nivel-1": 200 });
    assert.deepEqual(services.progress.awardMedals("nivel-1", ["pleno", "frugal"]), ["pleno", "frugal"]);
    assert.deepEqual(services.progress.awardMedals("nivel-1", ["pleno", "primero"]), ["primero"]);
    assert.deepEqual(services.progress.medals(), ["nivel-1:pleno", "nivel-1:frugal", "nivel-1:primero"]);
    assert.equal(services.progress.countPlay("nivel-1"), 1);
    assert.equal(services.progress.countPlay("nivel-1"), 2);
    assert.ok("taller.scores.K7M2Q" in store.data);
  });
});

describe("score submitter", () => {
  it("does nothing without a session", async () => {
    assert.equal(await setup().services.scores.submit("Bits", "nivel-1", 100), "nosession");
  });

  it("sends the score with the session, team and avatar", async () => {
    const sent: unknown[] = [];
    const { services } = setup({ submitScore: async (payload) => { sent.push(payload); return reply(200, {}); } }, joined);
    assert.equal(await services.scores.submit("Bits", "nivel-1", 100, ["x"]), "ok");
    assert.deepEqual(sent, [{ session: "K7M2Q", team: "Bits", game: "nivel-1", score: 100, avatar: 3, tags: ["x"] }]);
  });

  it("maps the server's refusals", async () => {
    const withStatus = (status: number) => setup({ submitScore: async () => reply(status) }, joined).services.scores.submit("Bits", "nivel-1", 100);
    assert.equal(await withStatus(403), "closed");
    assert.equal(await withStatus(404), "gone");
    assert.equal(await withStatus(400), "fail");
    assert.equal(await withStatus(503), "queued");
  });

  it("queues the score while offline and re-sends it later, in order", async () => {
    let online = false;
    const sent: number[] = [];
    const { services } = setup({
      submitScore: async (payload) => { if (!online) throw new Error("offline"); sent.push(payload.score); return reply(200, {}); },
    }, joined);
    assert.equal(await services.scores.submit("Bits", "nivel-1", 100), "queued");
    assert.equal(await services.scores.submit("Bits", "nivel-2", 200), "queued");
    assert.equal(await services.scores.flushPending(), 2);
    online = true;
    assert.equal(await services.scores.flushPending(), 0);
    assert.deepEqual(sent, [100, 200]);
    assert.equal(services.scores.pendingCount(), 0);
  });
});

describe("attempt start", () => {
  it("is free without a session", async () => {
    assert.deepEqual(await setup().services.scores.startAttempt("Bits", "nivel-1"), { status: "free" });
  });

  it("reports the attempt used and the limit", async () => {
    const sent: unknown[] = [];
    const { services } = setup({ startAttempt: async (payload) => { sent.push(payload); return reply(200, { attempt: 1, limit: 2 }); } }, joined);
    assert.deepEqual(await services.scores.startAttempt("Bits", "nivel-1"), { status: "counted", attempt: 1, limit: 2 });
    assert.deepEqual(sent, [{ session: "K7M2Q", team: "Bits", game: "nivel-1" }]);
  });

  it("blocks play only when the attempts are exhausted", async () => {
    const withStatus = (status: number) => setup({ startAttempt: async () => reply(status) }, joined).services.scores.startAttempt("Bits", "nivel-1");
    assert.deepEqual(await withStatus(409), { status: "exhausted" });
    assert.deepEqual(await withStatus(403), { status: "closed" });
    assert.deepEqual(await withStatus(404), { status: "gone" });
    assert.deepEqual(await withStatus(400), { status: "fail" });
    assert.deepEqual(await withStatus(503), { status: "queued" });
  });

  it("queues the start while offline and sends it before the score", async () => {
    let online = false;
    const sent: string[] = [];
    const { services, store } = setup({
      startAttempt: async () => { if (!online) throw new Error("offline"); sent.push("start"); return reply(200, { attempt: 1, limit: 2 }); },
      submitScore: async () => { if (!online) throw new Error("offline"); sent.push("score"); return reply(200, {}); },
    }, joined);
    assert.deepEqual(await services.scores.startAttempt("Bits", "nivel-1"), { status: "queued" });
    assert.equal(await services.scores.submit("Bits", "nivel-1", 100), "queued");
    assert.equal(services.scores.pendingCount(), 2);
    online = true;
    assert.equal(await services.scores.flushPending(), 0);
    assert.deepEqual(sent, ["start", "score"]);
    assert.equal(JSON.parse(store.data["taller.queue"] ?? "[]").length, 0);
  });

  it("sends a new score after the queued items, never before", async () => {
    let online = false;
    const sent: string[] = [];
    const { services } = setup({
      startAttempt: async () => { if (!online) throw new Error("offline"); sent.push("start"); return reply(200, { attempt: 1, limit: 2 }); },
      submitScore: async (payload) => { if (!online) throw new Error("offline"); sent.push(`score${payload.score}`); return reply(200, {}); },
    }, joined);
    await services.scores.startAttempt("Bits", "nivel-1");
    online = true;
    assert.equal(await services.scores.submit("Bits", "nivel-1", 100), "ok");
    assert.deepEqual(sent, ["start", "score100"]);
    assert.equal(services.scores.pendingCount(), 0);
  });

  it("shares one flush between concurrent callers: the start is sent once and nothing is lost", async () => {
    let online = false;
    const sent: string[] = [];
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const { services } = setup({
      startAttempt: async () => { if (!online) throw new Error("offline"); sent.push("start"); await gate; return reply(200, { attempt: 1, limit: 2 }); },
      submitScore: async (payload) => { if (!online) throw new Error("offline"); sent.push(`score${payload.score}`); return reply(200, {}); },
    }, joined);
    await services.scores.startAttempt("Bits", "nivel-1");
    online = true;
    const first = services.scores.flushPending();
    const second = services.scores.flushPending();
    await Promise.resolve();
    // An item queued while the flush runs must survive it.
    assert.equal(await Promise.race([services.scores.submit("Bits", "nivel-1", 100), Promise.resolve("pending")]), "pending");
    release();
    assert.deepEqual(await Promise.all([first, second]), [0, 0]);
    assert.equal(sent.filter((entry) => entry === "start").length, 1);
    assert.equal(await services.scores.flushPending(), 0);
    assert.deepEqual(sent, ["start", "score100"]);
    assert.equal(services.scores.pendingCount(), 0);
  });

  it("drops a queued start that gets 409 and still sends its score", async () => {
    let online = false;
    const sent: string[] = [];
    const { services } = setup({
      startAttempt: async () => { if (!online) throw new Error("offline"); sent.push("start"); return reply(409); },
      submitScore: async (payload) => { if (!online) throw new Error("offline"); sent.push(`score${payload.score}`); return reply(200, {}); },
    }, joined);
    await services.scores.startAttempt("Bits", "nivel-1");
    await services.scores.submit("Bits", "nivel-1", 100);
    assert.equal(services.scores.pendingCount(), 2);
    online = true;
    assert.equal(await services.scores.flushPending(), 0);
    assert.deepEqual(sent, ["start", "score100"]);
  });

  it("queues a new start behind the queued items so it never overtakes them", async () => {
    let online = false;
    const sent: string[] = [];
    const { services } = setup({
      startAttempt: async (payload) => { if (!online) throw new Error("offline"); sent.push(`start-${payload.game}`); return reply(200, { attempt: 1, limit: 2 }); },
    }, joined);
    await services.scores.startAttempt("Bits", "nivel-1");
    assert.deepEqual(await services.scores.startAttempt("Bits", "nivel-2"), { status: "queued" });
    assert.equal(services.scores.pendingCount(), 2);
    online = true;
    assert.equal(await services.scores.flushPending(), 0);
    assert.deepEqual(sent, ["start-nivel-1", "start-nivel-2"]);
  });

  it("treats an unreadable 200 body on a start as unreachable", async () => {
    let readable = false;
    const { services } = setup({ startAttempt: async () => (readable ? reply(200, { attempt: 1, limit: 2 }) : reply(200)) }, joined);
    assert.deepEqual(await services.scores.startAttempt("Bits", "nivel-1"), { status: "queued" });
    assert.equal(await services.scores.flushPending(), 1);
    readable = true;
    assert.equal(await services.scores.flushPending(), 0);
  });

  it("sends an old queue item without kind as a score", async () => {
    const sent: unknown[] = [];
    const old = { session: "K7M2Q", team: "Bits", game: "nivel-1", score: 50, avatar: 3, tags: [] };
    const { services } = setup({ submitScore: async (payload) => { sent.push(payload); return reply(200, {}); } }, { ...joined, "taller.queue": JSON.stringify([old]) });
    assert.equal(await services.scores.flushPending(), 0);
    assert.deepEqual(sent, [old]);
  });

  it("tells when the server refuses a score that had no attempt", async () => {
    const { services } = setup({ submitScore: async () => reply(409) }, joined);
    assert.equal(await services.scores.submit("Bits", "nivel-1", 100), "refused");
    assert.equal(services.scores.pendingCount(), 0);
  });
});

describe("level access", () => {
  it("caches the open levels for when there is no connection", async () => {
    const { services } = setup({ findSession: async () => reply(200, openSession) });
    assert.equal(await services.levelAccess.refreshUnlocked("K7M2Q"), 2);
    assert.equal(services.levelAccess.cachedUnlocked("K7M2Q"), 2);
  });

  it("treats a missing session as no open levels and an outage as unknown", async () => {
    assert.equal(await setup({ findSession: async () => reply(404) }).services.levelAccess.refreshUnlocked("X"), 0);
    assert.equal(await setup({ findSession: async () => reply(500) }).services.levelAccess.refreshUnlocked("X"), null);
    assert.equal(await setup().services.levelAccess.refreshUnlocked("X"), null);
  });

  it("can open every level on this device", () => {
    const { services } = setup();
    services.levelAccess.setAllUnlocked(true);
    assert.equal(services.levelAccess.allUnlocked(), true);
    services.levelAccess.setAllUnlocked(false);
    assert.equal(services.levelAccess.allUnlocked(), false);
  });
});

describe("facilitator", () => {
  it("remembers the sessions it creates, newest first, with their keys", async () => {
    let created = 0;
    const { services } = setup({ createSession: async (name) => reply(200, { code: `S${++created}`, name, adminKey: `key${created}` }) });
    await services.facilitator.createSession("One");
    assert.deepEqual(await services.facilitator.createSession("Two"), { ok: true, session: { code: "S2", name: "Two", key: "key2" } });
    assert.deepEqual(services.facilitator.sessions().map((session) => session.code), ["S2", "S1"]);
    services.facilitator.forget("S2");
    assert.deepEqual(services.facilitator.sessions().map((session) => session.code), ["S1"]);
  });

  it("reports failures when creating or reading a session", async () => {
    assert.deepEqual(await setup({ createSession: async () => reply(400) }).services.facilitator.createSession("x"), { ok: false, reason: "rejected" });
    assert.deepEqual(await setup().services.facilitator.createSession("x"), { ok: false, reason: "offline" });
    assert.deepEqual(await setup({ createSession: async () => reply(200) }).services.facilitator.createSession("x"), { ok: false, reason: "offline" });
    assert.equal(await setup({ findSession: async () => reply(404) }).services.facilitator.status("X"), "gone");
    assert.equal(await setup().services.facilitator.status("X"), null);
  });

  it("signs its actions with the session key", async () => {
    const calls: unknown[][] = [];
    const { services } = setup({ runFacilitatorAction: async (...args) => { calls.push(args); return reply(200, {}); } });
    assert.equal(await services.facilitator.act({ code: "S1", name: "One", key: "key1" }, "unlock", { level: 3 }), true);
    assert.deepEqual(calls, [["S1", "key1", "unlock", { level: 3 }]]);
  });

  it("passes the attempt limit when creating a session and when changing it", async () => {
    const created: unknown[][] = [];
    const calls: unknown[][] = [];
    const { services } = setup({
      createSession: async (...args) => { created.push(args); return reply(200, { code: "S1", name: "One", adminKey: "k" }); },
      runFacilitatorAction: async (...args) => { calls.push(args); return reply(200, {}); },
    });
    await services.facilitator.createSession("One", 3);
    await services.facilitator.act({ code: "S1", name: "One", key: "k" }, "attempts", { attempts: 4 });
    assert.deepEqual(created, [["One", 3, undefined]]);
    assert.deepEqual(calls, [["S1", "k", "attempts", { attempts: 4 }]]);
  });
});

describe("play status reader", () => {
  const status = { limit: 2, games: { "nivel-1": { used: 1, left: 1, best: 200, arrivalTaken: 0, perfectBy: null, mine: null } } };
  const NONE = { state: "none" };

  it("shows nothing and asks nothing without a session or a team", async () => {
    let calls = 0;
    const getPlayStatus = async () => { calls++; return reply(200, { status }); };
    assert.deepEqual(await setup({ getPlayStatus }).services.playStatus.read("Bits"), NONE);
    assert.deepEqual(await setup({ getPlayStatus }, joined).services.playStatus.read("  "), NONE);
    assert.deepEqual(setup({ getPlayStatus }).services.playStatus.peek("Bits"), NONE);
    assert.equal(calls, 0);
  });

  it("reads the live status of the team and remembers it", async () => {
    const asked: unknown[][] = [];
    const { services } = setup({ getPlayStatus: async (...args) => { asked.push(args); return reply(200, { status }); } }, joined);
    assert.deepEqual(services.playStatus.peek("Bits"), NONE);
    assert.deepEqual(await services.playStatus.read(" Bits "), { state: "live", status });
    assert.deepEqual(asked, [["K7M2Q", "Bits"]]);
    assert.deepEqual(services.playStatus.peek("Bits"), { state: "offline", status });
  });

  it("shows nothing for a session without attempt limit and forgets what it knew", async () => {
    let answer = reply<{ status: typeof status | null }>(200, { status });
    const { services } = setup({ getPlayStatus: async () => answer }, joined);
    await services.playStatus.read("Bits");
    answer = reply(200, { status: null });
    assert.deepEqual(await services.playStatus.read("Bits"), NONE);
    assert.deepEqual(services.playStatus.peek("Bits"), NONE);
  });

  it("falls back to the last known status when offline, or to nothing", async () => {
    let online = true;
    const { services } = setup({ getPlayStatus: async () => { if (!online) throw new Error("offline"); return reply(200, { status }); } }, joined);
    assert.deepEqual(await services.playStatus.read("Other"), { state: "live", status });
    online = false;
    assert.deepEqual(await services.playStatus.read("Other"), { state: "offline", status });
    assert.deepEqual(await services.playStatus.read("Fresh"), NONE);
  });

  it("treats 404 and 400 as nothing and drops the cache", async () => {
    for (const code of [404, 400]) {
      let answer = reply(200, { status });
      const { services } = setup({ getPlayStatus: async () => answer }, joined);
      await services.playStatus.read("Bits");
      answer = reply(code, null as never);
      assert.deepEqual(await services.playStatus.read("Bits"), NONE);
      assert.deepEqual(services.playStatus.peek("Bits"), NONE);
    }
  });

  it("treats a server error or an unreadable answer as offline", async () => {
    let answer = reply(200, { status });
    const { services } = setup({ getPlayStatus: async () => answer }, joined);
    await services.playStatus.read("Bits");
    answer = reply(503, null as never);
    assert.deepEqual(await services.playStatus.read("Bits"), { state: "offline", status });
    answer = reply(200, null as never);
    assert.deepEqual(await services.playStatus.read("Bits"), { state: "offline", status });
  });
});

describe("email collector", () => {
  const EMAIL = "x@y.es";
  const withEmails = { ...openSession, collectEmails: true };
  const submitStatus = (status: number, body: unknown = {}) => setup({ submitEmail: async () => reply(status, status < 300 ? body : null) }, joined);

  it("checks the answer with the shared domain rule", () => {
    const { services } = setup();
    assert.equal(services.emails.check("", true), "invalid-email");
    assert.equal(services.emails.check(EMAIL, false), "missing-consent");
    assert.equal(services.emails.check(EMAIL, true), "ok");
  });

  it("needs an answer only with the flag on, a session and nothing answered yet", () => {
    assert.equal(setup({}, joined).services.emails.needsAnswer(true), true);
    assert.equal(setup({}, joined).services.emails.needsAnswer(false), false);
    assert.equal(setup().services.emails.needsAnswer(true), false);
    assert.equal(setup({}, { ...joined, "taller.emailAsked.K7M2Q": "1" }).services.emails.needsAnswer(true), false);
  });

  it("sends the answer with the session and maps every status", async () => {
    const sent: unknown[] = [];
    const { services } = setup({ submitEmail: async (payload) => { sent.push(payload); return reply(200, { ok: true }); } }, joined);
    assert.equal(await services.emails.submit("Bits", EMAIL, true), "ok");
    assert.deepEqual(sent, [{ session: "K7M2Q", team: "Bits", email: EMAIL, consent: true }]);
    const expected: [number, string][] = [[400, "invalid"], [403, "closed"], [404, "gone"], [409, "disabled"], [500, "offline"], [503, "offline"], [418, "offline"]];
    for (const [status, result] of expected) assert.equal(await submitStatus(status).services.emails.submit("Bits", EMAIL, true), result, String(status));
    assert.equal(await submitStatus(200, null).services.emails.submit("Bits", EMAIL, true), "offline");
  });

  it("does not call the server for an invalid answer or without a session", async () => {
    let calls = 0;
    const gateway = { submitEmail: async () => { calls++; return reply(200, {}); } };
    assert.equal(await setup(gateway, joined).services.emails.submit("Bits", "nope", true), "invalid");
    assert.equal(await setup(gateway, joined).services.emails.submit("Bits", EMAIL, false), "invalid");
    assert.equal(await setup(gateway).services.emails.submit("Bits", EMAIL, true), "nosession");
    assert.equal(calls, 0);
  });

  it("keeps nothing of the email on the device when offline, and does not mark the question as answered", async () => {
    const { services, store } = setup({}, joined);
    assert.equal(await services.emails.submit("Bits", EMAIL, true), "offline");
    assert.ok(!JSON.stringify(store.data).includes(EMAIL));
    assert.ok(!JSON.stringify(store.data).includes("y.es"));
    assert.equal(store.data["taller.emailAsked.K7M2Q"], undefined);
    assert.equal(store.data["taller.queue"], undefined);
  });

  it("marks the question as answered when the email is saved or the team says not now, without storing the email", async () => {
    const saved = submitStatus(200, { ok: true });
    assert.equal(await saved.services.emails.submit("Bits", EMAIL, true), "ok");
    assert.equal(saved.store.data["taller.emailAsked.K7M2Q"], "1");
    assert.ok(!JSON.stringify(saved.store.data).includes(EMAIL));
    assert.equal(saved.services.emails.needsAnswer(true), false);
    const dismissed = setup({}, joined);
    dismissed.services.emails.dismiss();
    assert.equal(dismissed.store.data["taller.emailAsked.K7M2Q"], "1");
    const nobody = setup();
    nobody.services.emails.dismiss();
    assert.deepEqual(nobody.store.data, {});
  });

  it("asks a team already in the session once, only while the session is open and collecting", async () => {
    const ask = (body: object | null, stored: Record<string, string> = joined) => setup({ findSession: async () => (body ? reply(200, body as SessionInfo) : reply(404)) }, stored).services.emails.shouldAsk();
    assert.equal(await ask(withEmails), true);
    assert.equal(await ask(openSession), false);
    assert.equal(await ask({ ...withEmails, closed: true }), false);
    assert.equal(await ask(null), false);
    assert.equal(await ask(withEmails, {}), false);
    assert.equal(await ask(withEmails, { ...joined, "taller.emailAsked.K7M2Q": "1" }), false);
    assert.equal(await setup({}, joined).services.emails.shouldAsk(), false);
  });

  it("does not ask the server when the question was already answered", async () => {
    let calls = 0;
    const { services } = setup({ findSession: async () => { calls++; return reply(200, withEmails); } }, { ...joined, "taller.emailAsked.K7M2Q": "1" });
    assert.equal(await services.emails.shouldAsk(), false);
    assert.equal(calls, 0);
  });
});

describe("facilitator emails", () => {
  const session = { code: "S1", name: "One", key: "k" };

  it("passes the email option when creating a session and when switching it", async () => {
    const created: unknown[][] = [];
    const calls: unknown[][] = [];
    const { services } = setup({
      createSession: async (...args) => { created.push(args); return reply(200, { code: "S1", name: "One", adminKey: "k" }); },
      runFacilitatorAction: async (...args) => { calls.push(args); return reply(200, {}); },
    });
    await services.facilitator.createSession("One", 2, true);
    await services.facilitator.act(session, "emails", { enabled: false });
    assert.deepEqual(created, [["One", 2, true]]);
    assert.deepEqual(calls, [["S1", "k", "emails", { enabled: false }]]);
  });

  it("reads the email option of a session in its status", async () => {
    const status = await setup({ findSession: async () => reply(200, { ...openSession, collectEmails: true }) }).services.facilitator.status("S1");
    assert.ok(typeof status === "object" && status !== null && status.collectEmails);
  });

  it("counts the emails with the key, and says null when it cannot know", async () => {
    const calls: unknown[][] = [];
    const ok = setup({ getEmailCount: async (...args) => { calls.push(args); return reply(200, { count: 3 }); } });
    assert.equal(await ok.services.facilitator.emailCount(session), 3);
    assert.deepEqual(calls, [["S1", "k"]]);
    assert.equal(await setup({ getEmailCount: async () => reply(403) }).services.facilitator.emailCount(session), null);
    assert.equal(await setup({ getEmailCount: async () => reply(200) }).services.facilitator.emailCount(session), null);
    assert.equal(await setup().services.facilitator.emailCount(session), null);
  });

  it("exports the CSV and tells rejected from offline, keeping nothing on the device", async () => {
    const { services, store } = setup({ exportEmails: async () => reply(200, { fileName: "correos-S1.csv", csv: "a,b\r\n" }) });
    assert.deepEqual(await services.facilitator.exportEmails(session), { ok: true, fileName: "correos-S1.csv", csv: "a,b\r\n" });
    assert.deepEqual(store.data, {});
    assert.deepEqual(await setup({ exportEmails: async () => reply(403) }).services.facilitator.exportEmails(session), { ok: false, reason: "rejected" });
    assert.deepEqual(await setup({ exportEmails: async () => reply(200) }).services.facilitator.exportEmails(session), { ok: false, reason: "offline" });
    assert.deepEqual(await setup().services.facilitator.exportEmails(session), { ok: false, reason: "offline" });
  });
});
