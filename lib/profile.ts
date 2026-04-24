import { type User } from "@supabase/supabase-js";

import { type Database } from "@/types/database";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export function getProfileFallback(user: User): ProfileRow {
  return {
    id: user.id,
    display_name: (user.user_metadata.display_name as string | undefined) ?? user.email?.split("@")[0] ?? "Study buddy",
    group_code: (user.user_metadata.group_code as string | undefined) ?? null,
    preferred_bgm: "off",
    default_focus_minutes: 25,
    default_break_minutes: 5,
    created_at: new Date().toISOString()
  };
}
