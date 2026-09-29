// Test-only HTTP double. Real SQL, RLS, and migrations are tested independently with PGlite.
import http from "node:http";
import { randomUUID } from "node:crypto";
const A = "11111111-1111-4111-8111-111111111111",
  B = "22222222-2222-4222-8222-222222222222";
const profiles = {};
for (const [id, name] of [
  [A, "Aadhya"],
  [B, "Mira"]
])
  profiles[id] = {
    id,
    display_name: name,
    group_code: null,
    timezone: "Asia/Kolkata",
    preferred_bgm: "off",
    default_focus_minutes: 25,
    default_break_minutes: 5,
    created_at: new Date().toISOString()
  };
let sessions = [],
  tasks = [],
  goals = [];
const user = (id) => ({
  id,
  email: id === A ? "alice@example.test" : "bob@example.test",
  aud: "authenticated",
  role: "authenticated",
  email_confirmed_at: new Date().toISOString(),
  user_metadata: { display_name: profiles[id].display_name },
  app_metadata: { provider: "email", providers: ["email"] },
  created_at: new Date().toISOString()
});
const token = (id) =>
  [
    Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"),
    Buffer.from(
      JSON.stringify({
        sub: id,
        aud: "authenticated",
        role: "authenticated",
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      })
    ).toString("base64url"),
    "signature"
  ].join(".");
function uid(req) {
  try {
    return JSON.parse(Buffer.from(req.headers.authorization.split(" ")[1].split(".")[1], "base64url")).sub;
  } catch {
    return A;
  }
}
http
  .createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    res.setHeader("Content-Type", "application/json");
    if (req.method === "OPTIONS") {
      res.end();
      return;
    }
    const url = new URL(req.url, "http://localhost");
    let raw = "";
    for await (const part of req) raw += part;
    const body = raw ? JSON.parse(raw) : {};
    const id = uid(req);
    const send = (data, status = 200) => {
      res.statusCode = status;
      res.end(JSON.stringify(data));
    };
    if (url.pathname === "/health") return send({ ok: true });
    if (url.pathname === "/reset") {
      sessions = [];
      tasks = [];
      goals = [];
      return send({ ok: true });
    }
    if (url.pathname === "/auth/v1/token") {
      const account = body.email?.startsWith("bob") ? B : A;
      return send({
        access_token: token(account),
        refresh_token: "test-refresh",
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: "bearer",
        user: user(account)
      });
    }
    if (url.pathname === "/auth/v1/user") return send(user(id));
    if (url.pathname.startsWith("/auth/v1/")) return send({});
    const route = url.pathname.replace("/rest/v1/", "");
    const matchId = url.searchParams.get("id")?.replace("eq.", "");
    const accept = (rows) => (req.headers.accept?.includes("vnd.pgrst.object") ? (rows[0] ?? null) : rows);
    if (route === "profiles") {
      if (req.method === "POST") Object.assign(profiles[id], body);
      return send(accept([profiles[id]]));
    }
    if (route === "rpc/manage_group") return send(null);
    if (route === "rpc/get_group_leaderboard") return send([]);
    if (route === "rpc/save_study_session") {
      const existing = sessions.find((s) => s.id === body.session_id);
      if (existing) return send(accept([existing]));
      const row = {
        id: body.session_id,
        user_id: id,
        started_at: body.session_start,
        ended_at: body.session_end,
        duration_seconds: body.seconds,
        mode: body.timer_mode,
        note: body.session_note ?? null,
        subject: body.session_subject ?? null,
        task_id: body.session_task ?? null,
        created_at: new Date().toISOString()
      };
      sessions.unshift(row);
      return send(row);
    }
    if (route === "rpc/get_session_history")
      return send(
        sessions
          .filter(
            (s) =>
              s.user_id === id &&
              (!body.search_text ||
                `${s.subject} ${s.note}`.toLowerCase().includes(body.search_text.toLowerCase()))
          )
          .slice(0, body.page_size ?? 50)
      );
    if (route === "rpc/get_study_summary") {
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(new Date());
      const total = sessions.filter((s) => s.user_id === id).reduce((n, s) => n + s.duration_seconds, 0);
      const days = Array.from({ length: 56 }, (_, i) => {
        const d = new Date(`${today}T12:00:00Z`);
        d.setUTCDate(d.getUTCDate() - 55 + i);
        return { date: d.toISOString().slice(0, 10), seconds: i === 55 ? total : 0 };
      });
      return send({
        timezone: "Asia/Kolkata",
        today,
        total_seconds: total,
        first_day: total ? today : null,
        today_seconds: total,
        week_seconds: total,
        month_seconds: total,
        current_streak: total ? 1 : 0,
        best_streak: total ? 1 : 0,
        days
      });
    }
    if (route === "tasks") {
      if (req.method === "POST")
        tasks.unshift({
          id: body.id ?? randomUUID(),
          user_id: id,
          title: body.title,
          completed: false,
          created_at: new Date().toISOString()
        });
      if (req.method === "PATCH") tasks = tasks.map((t) => (t.id === matchId ? { ...t, ...body } : t));
      if (req.method === "DELETE") tasks = tasks.filter((t) => t.id !== matchId);
      return send(accept(tasks.filter((t) => t.user_id === id)));
    }
    if (route === "daily_goals") {
      if (req.method === "POST")
        goals = [...goals.filter((g) => g.user_id !== id || g.day !== body.day), body];
      if (req.method === "DELETE") goals = goals.filter((g) => g.user_id !== id);
      return send(
        accept(
          goals.filter((g) => g.user_id === id && g.day === url.searchParams.get("day")?.replace("eq.", ""))
        )
      );
    }
    if (route === "study_sessions") {
      if (req.method === "PATCH") sessions = sessions.map((s) => (s.id === matchId ? { ...s, ...body } : s));
      if (req.method === "DELETE") sessions = sessions.filter((s) => s.id !== matchId);
      return send(accept(sessions.filter((s) => s.user_id === id && (!matchId || s.id === matchId))));
    }
    send({ message: `Unhandled test API ${req.method} ${route}` }, 404);
  })
  .listen(54329, "127.0.0.1");
