"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { type Database } from "@/types/database";

type StudySessionRow = Database["public"]["Tables"]["study_sessions"]["Row"];
type StudySessionInsert = Database["public"]["Tables"]["study_sessions"]["Insert"];

async function getAuthenticatedUserId() {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You need to be signed in to manage study sessions.");
  }

  return { supabase, userId: user.id };
}

export async function saveStudySession(
  payload: Omit<StudySessionInsert, "id" | "user_id" | "created_at">
): Promise<StudySessionRow> {
  const { supabase, userId } = await getAuthenticatedUserId();

  const sessionPayload: StudySessionInsert = {
    ...payload,
    user_id: userId
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

export async function deleteStudySession(sessionId: string) {
  const { supabase, userId } = await getAuthenticatedUserId();

  const { error } = await supabase
    .from("study_sessions")
    .delete()
    .eq("id", sessionId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}
