"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { type Database } from "@/types/database";

type StudySessionRow = Database["public"]["Tables"]["study_sessions"]["Row"];
type StudySessionInsert = Database["public"]["Tables"]["study_sessions"]["Insert"];

export async function saveStudySession(
  payload: Omit<StudySessionInsert, "id" | "user_id" | "created_at">
): Promise<StudySessionRow> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You need to be signed in to save a study session.");
  }

  const sessionPayload: StudySessionInsert = {
    ...payload,
    user_id: user.id
  };

  const { data, error } = await supabase
    .from("study_sessions")
    .insert(sessionPayload as never)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}
