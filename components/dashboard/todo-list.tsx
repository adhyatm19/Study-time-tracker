"use client";

import { type FormEvent, type KeyboardEvent, useEffect, useMemo, useState } from "react";
import { Check, CheckSquare2, GripVertical, Pencil, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/shared/button";
import { Card, CardTitle } from "@/components/shared/card";
import { Input } from "@/components/shared/input";
import { cn } from "@/lib/utils";

interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  createdAt: number;
}

const TODO_STORAGE_KEY = "quiet-ledger:todos:v1";

function createTodoId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function TodoList() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
    const raw = window.localStorage.getItem(TODO_STORAGE_KEY);

    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as TodoItem[];
      setTodos(Array.isArray(parsed) ? parsed : []);
    } catch {
      window.localStorage.removeItem(TODO_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(TODO_STORAGE_KEY, JSON.stringify(todos));
  }, [isHydrated, todos]);

  const completedCount = useMemo(() => todos.filter((todo) => todo.completed).length, [todos]);

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = draft.trim();

    if (!title) {
      return;
    }

    setTodos((current) => [
      {
        id: createTodoId(),
        title,
        completed: false,
        createdAt: Date.now()
      },
      ...current
    ]);
    setDraft("");
  }

  function handleToggle(todoId: string) {
    setTodos((current) =>
      current.map((todo) => (todo.id === todoId ? { ...todo, completed: !todo.completed } : todo))
    );
  }

  function handleDelete(todoId: string) {
    setTodos((current) => current.filter((todo) => todo.id !== todoId));
  }

  function handleStartEdit(todo: TodoItem) {
    setEditingId(todo.id);
    setEditDraft(todo.title);
  }

  function handleSaveEdit(todoId: string) {
    const title = editDraft.trim();

    if (!title) {
      setEditingId(null);
      setEditDraft("");
      return;
    }

    setTodos((current) => current.map((todo) => (todo.id === todoId ? { ...todo, title } : todo)));
    setEditingId(null);
    setEditDraft("");
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditDraft("");
  }

  function handleEditKeyDown(event: KeyboardEvent<HTMLInputElement>, todoId: string) {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSaveEdit(todoId);
    }

    if (event.key === "Escape") {
      handleCancelEdit();
    }
  }

  function handleClearCompleted() {
    setTodos((current) => current.filter((todo) => !todo.completed));
  }

  return (
    <Card className="rounded-[1.35rem] p-5">
      <div className="mb-4 flex items-center gap-3">
        <CheckSquare2 className="h-6 w-6 text-accent" aria-hidden="true" />
        <CardTitle>Todo List</CardTitle>
      </div>

      <form className="flex gap-2" onSubmit={handleAdd}>
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add a task..."
          className="h-11 rounded-xl py-2"
          aria-label="Add a task"
        />
        <Button type="submit" className="h-12 w-12 shrink-0 px-0" aria-label="Add task">
          <Plus className="h-7 w-7" strokeWidth={3} aria-hidden="true" />
        </Button>
      </form>

      <div className="mt-4 divide-y divide-border/70">
        {todos.length ? (
          todos.map((todo) => (
            <div key={todo.id} className="flex items-center gap-2 py-3">
              <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => handleToggle(todo.id)}
                className="h-4 w-4 shrink-0 rounded border-border accent-[hsl(var(--accent))]"
                aria-label={todo.completed ? "Mark task incomplete" : "Mark task complete"}
              />
              {editingId === todo.id ? (
                <>
                  <Input
                    value={editDraft}
                    onChange={(event) => setEditDraft(event.target.value)}
                    onKeyDown={(event) => handleEditKeyDown(event, todo.id)}
                    className="h-10 min-w-0 flex-1 rounded-xl py-2"
                    aria-label="Edit task"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => handleSaveEdit(todo.id)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-accent transition hover:bg-muted"
                    aria-label="Save task"
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    aria-label="Cancel edit"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </>
              ) : (
                <>
                  <p
                    className={cn(
                      "min-w-0 flex-1 truncate text-sm",
                      todo.completed && "text-muted-foreground line-through"
                    )}
                  >
                    {todo.title}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleStartEdit(todo)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    aria-label="Edit task"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(todo.id)}
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                    aria-label="Delete task"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </>
              )}
            </div>
          ))
        ) : (
          <div className="py-8 text-sm text-muted-foreground">
            No tasks yet. Add one thing you want to finish this session.
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2 rounded-xl border border-border/70 bg-background/70 px-3 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={handleClearCompleted}
          disabled={!completedCount}
          className="inline-flex items-center gap-2 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Clear completed
        </button>
        <span>
          {completedCount} of {todos.length} completed
        </span>
      </div>
    </Card>
  );
}
