"use client";
import { useCallback, useState } from "react";
import { Play, Pencil, Trash2, Check, X, Plus, ListTodo } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useStudy } from "@/components/study/study-provider";
import { useResource } from "@/components/study/use-resource";
import { Button } from "@/components/shared/button";
import { Card } from "@/components/shared/card";
import { Input, Label } from "@/components/shared/input";
import { Feedback, LoadError } from "@/components/shared/feedback";
import { Dialog } from "@/components/shared/dialog";
import { errorMessage } from "@/lib/validation";
import type { Task } from "@/types/database";
export function TodoList() {
  const s = useStudy();
  const [draft, setDraft] = useState("");
  const [edit, setEdit] = useState<Task | null>(null);
  const [title, setTitle] = useState("");
  const [remove, setRemove] = useState<Task | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    const db = createSupabaseBrowserClient();
    const all: Task[] = [];
    for (let from = 0; ; from += 500) {
      const { data, error } = await db
        .from("tasks")
        .select("*")
        .eq("user_id", s.profile.id)
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, from + 499);
      if (error) throw error;
      all.push(...data);
      if (data.length < 500) break;
    }
    return all;
  }, [s.profile.id]);
  const tasks = useResource(load);
  async function change(operation: () => PromiseLike<{ error: unknown }>) {
    setBusy(true);
    setError(null);
    try {
      const result = await operation();
      if (result.error) throw result.error;
      tasks.refresh();
      s.invalidate();
      return true;
    } catch (error) {
      setError(errorMessage(error));
      return false;
    } finally {
      setBusy(false);
    }
  }
  const db = () => createSupabaseBrowserClient();
  if (tasks.error) return <LoadError label="Tasks" onRetry={tasks.refresh} />;
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2.5">
        <span className="section-icon tone-peach">
          <ListTodo size={17} aria-hidden="true" />
        </span>
        <h2 className="text-[15px] font-semibold tracking-tight">Your study plan</h2>
        {tasks.data ? (
          <span className="ml-auto rounded-md bg-muted px-2 py-1 text-xs tabular-nums text-muted-foreground">
            {tasks.data.filter((task) => !task.completed).length} to do
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-[13px] leading-5 text-muted-foreground">
        Choose one thing. Give it your attention.
      </p>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (draft.trim())
            void change(() => db().from("tasks").insert({ title: draft.trim(), user_id: s.profile.id })).then(
              (ok) => {
                if (ok) setDraft("");
              }
            );
        }}
      >
        <Label htmlFor="new-task" className="sr-only">
          New study task
        </Label>
        <Input
          id="new-task"
          placeholder="Add one thing to work on"
          maxLength={200}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          required
        />
        <Button type="submit" disabled={busy || !draft.trim()} aria-label="Add study task" size="icon">
          <Plus size={20} />
        </Button>
      </form>
      <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
        {tasks.loading && !tasks.data ? <p role="status">Loading tasks…</p> : null}
        {tasks.data?.length === 0 ? (
          <p className="rounded-xl bg-muted/50 px-4 py-6 text-center text-[13px] text-muted-foreground">
            Start with one small, achievable task.
          </p>
        ) : null}
        {tasks.data?.map((task) => (
          <div
            key={task.id}
            data-completed={task.completed}
            className="task-row flex flex-wrap items-start gap-2 px-3 py-2"
          >
            <input
              id={`task-${task.id}`}
              type="checkbox"
              checked={task.completed}
              disabled={busy}
              className="mt-3 h-5 w-5 shrink-0 cursor-pointer accent-[hsl(var(--accent))]"
              onChange={() =>
                void change(() => db().from("tasks").update({ completed: !task.completed }).eq("id", task.id))
              }
            />
            <label
              htmlFor={`task-${task.id}`}
              className={`min-w-16 flex-1 break-words py-3 text-[13px] font-medium ${task.completed ? "text-muted-foreground line-through" : ""}`}
            >
              {task.title}
            </label>
            <div className="flex flex-wrap justify-end">
              {!task.completed ? (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Study ${task.title}`}
                  title="Study this task"
                  disabled={busy || s.state.status !== "idle"}
                  onClick={() => s.studyTask(task.id, task.title)}
                >
                  <Play size={16} />
                </Button>
              ) : null}
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Edit ${task.title}`}
                onClick={() => {
                  setEdit(task);
                  setTitle(task.title);
                }}
              >
                <Pencil size={16} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Delete ${task.title}`}
                disabled={busy || (s.state.taskId === task.id && s.state.status !== "idle")}
                onClick={() => setRemove(task)}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <Feedback error message={error} />
      </div>
      <Dialog open={!!edit} title="Edit task" busy={busy} onClose={() => setEdit(null)}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (edit && title.trim())
              void change(() => db().from("tasks").update({ title: title.trim() }).eq("id", edit.id)).then(
                (ok) => {
                  if (ok) setEdit(null);
                }
              );
          }}
          className="space-y-4"
        >
          <Label htmlFor="edit-task">Task name</Label>
          <Input
            id="edit-task"
            value={title}
            maxLength={200}
            required
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <Feedback error message={error} />
          <Button type="submit" disabled={busy || !title.trim()}>
            <Check size={16} className="mr-2" />
            Save changes
          </Button>
        </form>
      </Dialog>
      <Dialog open={!!remove} title="Delete task?" busy={busy} onClose={() => setRemove(null)}>
        <p className="mb-4 text-sm">Previously saved study sessions are kept.</p>
        <Feedback error message={error} />
        <div className="mt-4 flex gap-2">
          <Button variant="outline" onClick={() => setRemove(null)} disabled={busy}>
            <X size={16} className="mr-2" />
            Keep task
          </Button>
          <Button
            disabled={busy}
            onClick={() => {
              if (remove)
                void change(() => db().from("tasks").delete().eq("id", remove.id)).then((ok) => {
                  if (ok) setRemove(null);
                });
            }}
          >
            Delete task
          </Button>
        </div>
      </Dialog>
    </Card>
  );
}
