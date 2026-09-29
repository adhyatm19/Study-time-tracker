"use client";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database, StudySession } from "@/types/database";

type Payload = Database["public"]["Tables"]["study_sessions"]["Insert"];
export async function saveStudySession(
  payload: Payload & { id: string },
  ownerId: string
): Promise<StudySession> {
  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();
  if (authError || user?.id !== ownerId)
    throw new Error("Sign back into the account that started this session to save it.");
  const { data, error } = await supabase
    .rpc("save_study_session", {
      session_id: payload.id,
      session_start: payload.started_at,
      session_end: payload.ended_at,
      seconds: payload.duration_seconds,
      timer_mode: payload.mode,
      session_note: payload.note ?? null,
      session_subject: payload.subject ?? null,
      session_task: payload.task_id ?? null
    })
    .abortSignal(AbortSignal.timeout(15000))
    .single();
  if (error) throw error;
  return data;
}
export async function deleteStudySession(sessionId: string) {
  const { error } = await createSupabaseBrowserClient().from("study_sessions").delete().eq("id", sessionId);
  if (error) throw error;
}
