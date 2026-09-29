import { test } from "node:test";
import assert from "node:assert/strict";
import { createTestDatabase } from "../scripts/db-fixture.mjs";
const alice = "11111111-1111-4111-8111-111111111111",
  bob = "22222222-2222-4222-8222-222222222222",
  eve = "33333333-3333-4333-8333-333333333333";
test("migrations and authenticated database behavior", async (t) => {
  const db = await createTestDatabase();
  const as = async (id) => {
    await db.exec("reset role");
    await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [id]);
    await db.exec("set role authenticated");
  };
  const scalar = async (sql, args = []) => Object.values((await db.query(sql, args)).rows[0])[0];
  try {
    await db.query(
      `insert into auth.users(id,email) values($1,'alice@example.test'),($2,'bob@example.test'),($3,'eve@example.test')`,
      [alice, bob, eve]
    );
    await t.test("profile reads do not recurse and cannot expose another account", async () => {
      await as(alice);
      assert.equal((await db.query("select * from public.profiles")).rows.length, 1);
      assert.equal(await scalar("select count(*)::int from public.profiles where id=$1", [bob]), 0);
      await assert.rejects(() => db.query("update public.profiles set id=$1 where id=$2", [bob, alice]));
    });
    let gid, token;
    await t.test("groups require invitations, not old profile codes", async () => {
      await as(alice);
      const group = await scalar(`select public.manage_group('create','Study circle')`);
      gid = group.id;
      const invited = await scalar(`select public.manage_group('invite')`);
      token = invited.invite.token;
      await as(bob);
      await db.query(`update public.profiles set group_code='Study circle' where id=$1`, [bob]);
      assert.equal(await scalar(`select public.manage_group('get')`), null);
      await assert.rejects(() => db.query(`select public.manage_group('join','Study circle')`));
      const joined = await scalar(`select public.manage_group('join',$1)`, [token]);
      assert.equal(joined.id, gid);
      await assert.rejects(() => db.query(`select public.manage_group('invite')`));
      await as(eve);
      assert.equal((await db.query("select * from public.get_group_leaderboard()")).rows.length, 0);
    });
    await t.test("owner can revoke invitations", async () => {
      await as(alice);
      await db.query(`select public.manage_group('revoke')`);
      await as(eve);
      await assert.rejects(() => db.query(`select public.manage_group('join',$1)`, [token]));
    });
    const sessionId = "44444444-4444-4444-8444-444444444444";
    await t.test("save retries are idempotent and isolated by account", async () => {
      await as(alice);
      const args = [sessionId];
      await db.query(
        `select public.save_study_session($1,now()-interval '30 minutes',now()-interval '5 minutes',1500,'pomodoro')`,
        args
      );
      await db.query(
        `select public.save_study_session($1,now()-interval '30 minutes',now()-interval '5 minutes',1500,'pomodoro')`,
        args
      );
      assert.equal(await scalar("select count(*)::int from public.study_sessions"), 1);
      await as(eve);
      assert.equal(await scalar("select count(*)::int from public.study_sessions"), 0);
      await assert.rejects(() =>
        db.query(
          `select public.save_study_session($1,now()-interval '30 minutes',now(),1500,'pomodoro')`,
          args
        )
      );
    });
    await t.test("invalid timestamps, durations and timezone are rejected", async () => {
      await as(alice);
      for (const seconds of [-1, 0, 999999])
        await assert.rejects(() =>
          db.query(
            `insert into public.study_sessions(started_at,ended_at,duration_seconds,mode) values(now()-interval '1 minute',now(),$1,'stopwatch')`,
            [seconds]
          )
        );
      await assert.rejects(() =>
        db.query(
          `insert into public.study_sessions(started_at,ended_at,duration_seconds,mode) values(now()+interval '1 day',now()+interval '2 days',60,'stopwatch')`
        )
      );
      await assert.rejects(() =>
        db.query(`update public.profiles set timezone='invalid-zone' where id=$1`, [alice])
      );
    });
    await t.test("equal durations receive equal ranks; strangers are excluded", async () => {
      await as(bob);
      await db.query(
        `insert into public.study_sessions(started_at,ended_at,duration_seconds,mode) values(now()-interval '30 minutes',now()-interval '5 minutes',1500,'pomodoro')`
      );
      const board = (await db.query(`select * from public.get_group_leaderboard('all')`)).rows;
      assert.equal(board.length, 2);
      assert.equal(Number(board[0].rank_number), 1);
      assert.equal(Number(board[1].rank_number), 1);
    });
    await t.test("aggregates include more than 1000 sessions; history cursor has no duplicates", async () => {
      await as(alice);
      await db.exec(
        `insert into public.study_sessions(started_at,ended_at,duration_seconds,mode) select now()-interval '2 days',now()-interval '2 days'+interval '1 minute',60,'stopwatch' from generate_series(1,1100)`
      );
      const summary = await scalar("select public.get_study_summary()");
      assert.equal(summary.total_seconds, 67500);
      let cursor = null;
      const ids = new Set();
      for (;;) {
        const page = (
          await db.query(`select * from public.get_session_history($1,$2,null,null,'',500)`, [
            cursor?.started_at ?? null,
            cursor?.id ?? null
          ])
        ).rows;
        for (const row of page) {
          assert(!ids.has(row.id));
          ids.add(row.id);
        }
        if (page.length < 500) break;
        cursor = page.at(-1);
      }
      assert.equal(ids.size, 1101);
    });
    await t.test("tasks and goals cannot cross accounts; task deletion retains sessions", async () => {
      await as(alice);
      const task = await scalar(`insert into public.tasks(title) values('Read chapter 1') returning id`);
      await db.query(`update public.study_sessions set task_id=$1 where id=$2`, [task, sessionId]);
      await db.exec(`insert into public.daily_goals(day,seconds) values(current_date,7200)`);
      await as(eve);
      assert.equal(await scalar("select count(*)::int from public.tasks"), 0);
      assert.equal(await scalar("select count(*)::int from public.daily_goals"), 0);
      await assert.rejects(() =>
        db.query(
          `insert into public.study_sessions(started_at,ended_at,duration_seconds,mode,task_id) values(now()-interval '1 minute',now(),60,'stopwatch',$1)`,
          [task]
        )
      );
      await as(alice);
      await db.query("delete from public.tasks where id=$1", [task]);
      assert.equal(await scalar("select task_id from public.study_sessions where id=$1", [sessionId]), null);
      const recovered = await scalar(
        `select to_jsonb(public.save_study_session(gen_random_uuid(),now()-interval '1 minute',now(),60,'stopwatch',null,'Deleted task subject',$1))`,
        [task]
      );
      assert.equal(recovered.task_id, null);
      assert.equal(recovered.subject, "Deleted task subject");
    });
    await t.test("date filters and totals honor configured timezone and start-day attribution", async () => {
      await as(eve);
      await db.query(`update public.profiles set timezone='Asia/Kolkata' where id=$1`, [eve]);
      await db.query(
        `insert into public.study_sessions(started_at,ended_at,duration_seconds,mode,subject) values('2025-01-01T18:20:00Z','2025-01-01T18:40:00Z',1200,'stopwatch','Midnight')`
      );
      const first = (
        await db.query(
          `select * from public.get_session_history(null,null,'2025-01-01','2025-01-01','Midnight',50)`
        )
      ).rows;
      const next = (
        await db.query(
          `select * from public.get_session_history(null,null,'2025-01-02','2025-01-02','Midnight',50)`
        )
      ).rows;
      assert.equal(first.length, 1);
      assert.equal(next.length, 0);
    });
  } finally {
    await db.close();
  }
});

test("upgrade preserves legacy sessions and group membership without keeping old codes as credentials", async () => {
  const db = await createTestDatabase(async (db) => {
    await db.query(
      `insert into auth.users(id,email,raw_user_meta_data) values($1,'alice@example.test','{"group_code":"OLD-CIRCLE"}'),($2,'bob@example.test','{"group_code":"OLD-CIRCLE"}')`,
      [alice, bob]
    );
    await db.query(
      `insert into public.study_sessions(user_id,started_at,ended_at,duration_seconds,mode,note) values($1,'2024-01-01','2024-01-01',500,'stopwatch','preserve legacy data')`,
      [alice]
    );
  });
  try {
    assert.equal((await db.query("select count(*)::int count from public.group_members")).rows[0].count, 2);
    assert.equal(
      (await db.query("select duration_seconds from public.study_sessions")).rows[0].duration_seconds,
      500
    );
    assert.equal((await db.query("select count(*)::int count from public.group_invites")).rows[0].count, 0);
    await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [alice]);
    await db.exec("set role authenticated");
    assert.equal((await db.query("select * from public.profiles")).rows.length, 1);
    assert.equal((await db.query(`select * from public.get_group_leaderboard('all')`)).rows.length, 2);
  } finally {
    await db.close();
  }
});

test("database streak remains active through today when yesterday was studied", async () => {
  const db = await createTestDatabase();
  try {
    await db.query(`insert into auth.users(id,email) values($1,'alice@example.test')`, [alice]);
    await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [alice]);
    await db.exec("set role authenticated");
    await db.exec(`insert into public.study_sessions(started_at,ended_at,duration_seconds,mode)
   select ((now() at time zone 'Asia/Kolkata')::date-offset_days + time '12:00') at time zone 'Asia/Kolkata',
          ((now() at time zone 'Asia/Kolkata')::date-offset_days + time '12:01') at time zone 'Asia/Kolkata',60,'stopwatch'
   from generate_series(1,3) offset_days`);
    let result = (await db.query("select public.get_study_summary() summary")).rows[0].summary;
    assert.equal(result.current_streak, 3);
    assert.equal(result.best_streak, 3);
    await db.exec(
      `delete from public.study_sessions where (started_at at time zone 'Asia/Kolkata')::date=(now() at time zone 'Asia/Kolkata')::date-1`
    );
    result = (await db.query("select public.get_study_summary() summary")).rows[0].summary;
    assert.equal(result.current_streak, 0);
    assert.equal(result.best_streak, 2);
  } finally {
    await db.close();
  }
});
