import { createTestDatabase } from "./db-fixture.mjs";
import { writeFile, readFile } from "node:fs/promises";
const db = await createTestDatabase();
const tables = (
  await db.query(
    `select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by table_name`
  )
).rows;
const tableNames = new Set(tables.map((t) => t.table_name));
function tsType(type) {
  if (type.endsWith("[]")) return `${tsType(type.slice(0, -2))}[]`;
  if (tableNames.has(type)) return `Database['public']['Tables']['${type}']['Row']`;
  if (
    [
      "int2",
      "int4",
      "int8",
      "integer",
      "bigint",
      "numeric",
      "float4",
      "float8",
      "real",
      "double precision"
    ].includes(type)
  )
    return "number";
  if (["bool", "boolean"].includes(type)) return "boolean";
  if (["json", "jsonb"].includes(type)) return "Json";
  return "string";
}
let out = `// Generated from schema.sql + all migrations by npm run db:types. Do not edit by hand.\nexport type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];\nexport type Database = { public: { Tables: {\n`;
for (const { table_name: name } of tables) {
  const columns = (
    await db.query(
      `select column_name,udt_name,is_nullable,column_default from information_schema.columns where table_schema='public' and table_name=$1 order by ordinal_position`,
      [name]
    )
  ).rows;
  out += `  ${name}: {\n`;
  for (const mode of ["Row", "Insert", "Update"]) {
    out += `    ${mode}: {\n`;
    for (const c of columns) {
      let type = tsType(c.udt_name);
      if (c.column_name === "preferred_bgm") type = "'off' | 'white-noise' | 'fireplace' | 'rain'";
      if (c.column_name === "mode" && name === "study_sessions") type = "'stopwatch' | 'pomodoro'";
      const nullable = c.is_nullable === "YES";
      const optional = mode === "Update" || (mode === "Insert" && (nullable || c.column_default !== null));
      out += `      ${c.column_name}${optional ? "?" : ""}: ${type}${nullable ? " | null" : ""};\n`;
    }
    out += "    };\n";
  }
  out += "    Relationships: [];\n  };\n";
}
out += "}; Views: Record<string, never>; Functions: {\n";
const functions = (
  await db.query(
    `select p.proname,p.proargnames,p.proargtypes::oid[] as argtypes,p.pronargdefaults,p.prorettype::regtype::text as rettype,p.proretset,p.proallargtypes::oid[] as alltypes,p.proargmodes from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prorettype <> 'trigger'::regtype order by p.proname`
  )
).rows;
const typeRows = (await db.query("select oid,typname from pg_type")).rows;
const types = new Map(typeRows.map((t) => [t.oid, t.typname]));
for (const f of functions) {
  const args = f.argtypes ?? [];
  const names = f.proargnames ?? [];
  const argFields = args.map(
    (oid, i) =>
      `${names[i]}${i >= args.length - f.pronargdefaults ? "?" : ""}: ${tsType(types.get(oid))} | null`
  );
  let result = tsType(f.rettype.replace("public.", ""));
  if (f.rettype === "record" && f.proargmodes) {
    const fields = f.proargmodes
      .map((mode, i) =>
        mode === "t"
          ? `${names[i]}: ${tsType(types.get(f.alltypes[i]))}${names[i] === "display_name" || names[i] === "group_code" ? " | null" : ""}`
          : null
      )
      .filter(Boolean);
    result = `{ ${fields.join("; ")} }`;
  }
  // PostgREST represents table/composite RPC results as collections, even without SETOF.
  if (f.proretset || tableNames.has(f.rettype.replace("public.", ""))) result += "[]";
  out += `  ${f.proname}: { Args: ${argFields.length ? `{ ${argFields.join("; ")} }` : "Record<string, never>"}; Returns: ${result} };\n`;
}
out +=
  "}; Enums: Record<string, never>; CompositeTypes: Record<string, never>; } };\nexport type Profile = Database['public']['Tables']['profiles']['Row'];\nexport type StudySession = Database['public']['Tables']['study_sessions']['Row'];\nexport type Task = Database['public']['Tables']['tasks']['Row'];\n";
await db.close();
if (process.argv.includes("--check")) {
  if ((await readFile("types/database.ts", "utf8")) !== out)
    throw new Error("Database types are stale. Run npm run db:types.");
  console.log("Database types match all migrations.");
} else {
  await writeFile("types/database.ts", out);
  console.log("Generated types/database.ts from migrated PostgreSQL catalog.");
}
