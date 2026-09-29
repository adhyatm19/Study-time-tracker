import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
export async function createTestDatabase(beforeMigrations) {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth, public to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;
    alter default privileges in schema public grant select,insert,update,delete on tables to authenticated;
  `);
  // PGlite provides gen_random_uuid natively; pgcrypto itself is a Supabase extension.
  await db.exec(
    (await readFile("supabase/schema.sql", "utf8")).replace("create extension if not exists pgcrypto;", "")
  );
  if (beforeMigrations) await beforeMigrations(db);
  for (const file of (await readdir("supabase/migrations")).sort())
    await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
  return db;
}
