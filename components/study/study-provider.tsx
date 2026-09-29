"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { saveStudySession } from "@/lib/study-sessions";
import {
  afterSave,
  duration,
  elapsed,
  initialTimer,
  parseTimer,
  pause,
  prepareSave,
  remaining,
  resume,
  start,
  timerKey,
  type TimerState
} from "@/lib/timer-engine";
import { errorMessage } from "@/lib/validation";
import type { Profile } from "@/types/database";
import { useFloatingTimer } from "@/components/dashboard/use-floating-timer";
import { BgmPlayer, type BgmPlayerHandle } from "@/components/dashboard/bgm-player";

function useStudyController(profile: Profile) {
  const router = useRouter();
  const [state, setState] = useState(() =>
    initialTimer(profile.id, profile.default_focus_minutes, profile.default_break_minutes)
  );
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(Date.now);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState(false);
  const [revision, setRevision] = useState(0);
  const [focused, setFocused] = useState(false);
  const [notifications, setNotifications] = useState(false);
  const [track, setTrack] = useState(profile.preferred_bgm);
  const [volume, setVolume] = useState(0.45);
  const audioRef = useRef<BgmPlayerHandle>(null);
  const activeAccount = useRef(true);
  const notificationKey = `quiet-ledger:${profile.id}:notifications`;
  const key = timerKey(profile.id);
  const lockRef = useRef(false);
  const publish = useCallback(
    (next: TimerState) => {
      // Persist before updating the UI; storage failure must not silently lose a session.
      window.localStorage.setItem(key, JSON.stringify(next));
      setState(next);
      setNow(Date.now());
    },
    [key]
  );
  const invalidate = useCallback(() => {
    setRevision((value) => value + 1);
    try {
      localStorage.setItem(`quiet-ledger:${profile.id}:updated`, crypto.randomUUID());
    } catch {
      /* Data is already committed. */
    }
  }, [profile.id]);
  const read = useCallback(() => {
    const raw = localStorage.getItem(key);
    const saved = parseTimer(raw, profile.id);
    if (raw && !saved)
      throw new Error("Saved timer data could not be read. Back it up before resetting this timer.");
    return saved ?? initialTimer(profile.id, profile.default_focus_minutes, profile.default_break_minutes);
  }, [key, profile.id, profile.default_focus_minutes, profile.default_break_minutes]);

  useEffect(() => {
    try {
      const restored = read();
      setState(restored);
      setReview(restored.status === "review");
      // Probe storage now so Start never promises recovery when persistence is unavailable.
      localStorage.setItem(`${key}:probe`, "1");
      localStorage.removeItem(`${key}:probe`);
      setNotifications(
        "Notification" in window &&
          Notification.permission === "granted" &&
          localStorage.getItem(notificationKey) === "true"
      );
      if (!navigator.locks)
        throw new Error(
          "This browser cannot safely coordinate study timers. Open the app in a browser with Web Locks support."
        );
      setReady(true);
    } catch (error) {
      setReady(false);
      setMessage(errorMessage(error));
    }
    const sync = (event: StorageEvent) => {
      if (event.key === key) {
        try {
          const next = read();
          setState(next);
          setNow(Date.now());
          setReview(next.status === "review");
        } catch (error) {
          setMessage(errorMessage(error));
        }
      }
      if (event.key === `quiet-ledger:${profile.id}:updated`) setRevision((value) => value + 1);
    };
    window.addEventListener("storage", sync);
    const {
      data: { subscription }
    } = createSupabaseBrowserClient().auth.onAuthStateChange((_event, session) => {
      if (session?.user.id !== profile.id) {
        activeAccount.current = false;
        setReady(false);
        audioRef.current?.pause();
        setReview(false);
        setState(initialTimer(profile.id));
        setTimeout(() => router.replace("/auth/login"), 0);
      } else activeAccount.current = true;
    });
    return () => {
      window.removeEventListener("storage", sync);
      subscription.unsubscribe();
    };
  }, [key, notificationKey, profile.id, read, router]);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    let id: ReturnType<typeof setTimeout>;
    const schedule = () => {
      id = setTimeout(
        () => {
          tick();
          schedule();
        },
        Math.min(state.status === "running" ? 1000 : 60000, 60000 - (Date.now() % 60000))
      );
    };
    schedule();
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearTimeout(id);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [state.status]);
  const mutate = useCallback(
    async (operation: (current: TimerState) => Promise<void> | void) => {
      if (!ready || !activeAccount.current || lockRef.current) return;
      lockRef.current = true;
      setBusy(true);
      setMessage(null);
      try {
        await navigator.locks.request(key, { ifAvailable: true }, async (lock) => {
          if (!lock) throw new Error("This timer is being updated in another tab. Please try again.");
          if (!activeAccount.current) return;
          await operation(read());
        });
      } catch (error) {
        setMessage(errorMessage(error));
      } finally {
        lockRef.current = false;
        setBusy(false);
      }
    },
    [key, read, ready]
  );
  const persist = useCallback(
    async (next: TimerState) => {
      if (!next.id || !next.pending || next.startedAt === null) return;
      publish(next);
      // Keep this exact payload on disk until acknowledged; retries use the same ID and values.
      await saveStudySession(
        {
          id: next.id,
          started_at: new Date(next.startedAt).toISOString(),
          ended_at: new Date(next.pending.endedAt).toISOString(),
          duration_seconds: next.pending.seconds,
          mode: next.mode,
          note: next.note || null,
          subject: next.subject || null,
          task_id: next.taskId
        },
        profile.id
      );
      if (!activeAccount.current) return;
      publish(afterSave(next, Date.now()));
      setReview(false);
      setMessage("Session saved.");
      invalidate();
    },
    [invalidate, profile.id, publish]
  );
  useEffect(() => {
    if (!ready || busy || state.status !== "running") return;
    if (state.mode === "pomodoro" && remaining(state, now) <= 0) {
      void mutate(async (current) => {
        if (current.status !== "running" || remaining(current, Date.now()) > 0) return;
        if (current.phase === "break") {
          publish({
            ...initialTimer(profile.id, current.focusMinutes, current.breakMinutes),
            mode: "pomodoro",
            taskId: current.taskId,
            subject: current.subject
          });
          setMessage("Break complete. Ready for your next focus block.");
        } else {
          const next = prepareSave(current, Date.now(), true);
          await persist(next);
        }
        if (notifications && "Notification" in window && Notification.permission === "granted") {
          try {
            new Notification(current.phase === "focus" ? "Focus complete" : "Break complete", {
              body:
                current.phase === "focus"
                  ? "Your session is saved. Time for a break."
                  : "Start when you are ready.",
              tag: `study-${current.id ?? current.startedAt}`
            });
          } catch {
            /* In-app status remains available. */
          }
        }
      });
    } else if (elapsed(state, now) >= 86400) {
      void mutate((current) => {
        publish({ ...pause(current, Date.now()), status: "review" });
        setReview(true);
        setMessage("This timer reached 24 hours. Review the duration before saving.");
      });
    }
  }, [busy, mutate, notifications, now, persist, profile.id, publish, ready, state]);
  const elapsedSeconds = elapsed(state, now);
  const seconds = state.mode === "pomodoro" ? remaining(state, now) : elapsedSeconds;
  const floating = useFloatingTimer({
    mode: state.mode,
    phase: state.mode === "pomodoro" ? state.phase : undefined,
    status: !ready
      ? "idle"
      : state.status === "running"
        ? "running"
        : state.status === "idle"
          ? "idle"
          : "paused",
    seconds,
    rounding: state.mode === "pomodoro" ? "ceil" : "floor"
  });
  async function toggleNotifications() {
    try {
      if (!("Notification" in window)) throw new Error("Notifications are unavailable in this browser.");
      const enabled = !notifications;
      if (enabled && (await Notification.requestPermission()) !== "granted")
        throw new Error("Enable notifications in your browser settings to receive reminders.");
      localStorage.setItem(notificationKey, String(enabled));
      setNotifications(enabled);
    } catch (error) {
      setMessage(errorMessage(error));
    }
  }
  function startOrResume() {
    void audioRef.current?.playFromGesture().catch(() => {});
    void mutate((current) =>
      publish(
        current.status === "idle"
          ? start(current, crypto.randomUUID(), Date.now())
          : resume(current, Date.now())
      )
    );
  }
  function finish() {
    void mutate((current) => {
      if (current.status === "pending") {
        setReview(true);
        return;
      }
      if (current.phase === "break") {
        publish({
          ...initialTimer(profile.id, current.focusMinutes, current.breakMinutes),
          mode: current.mode,
          taskId: current.taskId,
          subject: current.subject
        });
        return;
      }
      if (current.status === "idle") return;
      publish({ ...pause(current, Date.now()), status: "review" });
      setReview(true);
    });
  }
  return {
    profile,
    state,
    ready,
    busy,
    now,
    seconds,
    elapsedSeconds,
    review,
    setReview,
    message,
    setMessage,
    focused,
    setFocused,
    revision,
    invalidate,
    track,
    setTrack,
    volume,
    setVolume,
    audioRef,
    notifications,
    toggleNotifications,
    ...floating,
    startOrResume,
    finish,
    pause: () => void mutate((current) => publish(pause(current, Date.now()))),
    resetUnreadable: async () => {
      try {
        if (!activeAccount.current || !navigator.locks) return;
        await navigator.locks.request(key, async () => {
          const raw = localStorage.getItem(key);
          if (parseTimer(raw, profile.id))
            throw new Error("This timer is readable again. Reload to recover it.");
          const next = initialTimer(profile.id, profile.default_focus_minutes, profile.default_break_minutes);
          publish(next);
          setReady(true);
          setMessage("Timer reset. Saved study sessions are unchanged.");
        });
      } catch (error) {
        setMessage(errorMessage(error));
      }
    },
    backupTimer: () => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) throw new Error("There is no timer draft to back up.");
        const url = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = "quiet-ledger-timer-backup.json";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } catch (error) {
        setMessage(errorMessage(error));
      }
    },
    continueStudying: () => {
      setReview(false);
      void mutate((current) => publish(resume(current, Date.now())));
    },
    configure: (
      patch: Partial<Pick<TimerState, "mode" | "focusMinutes" | "breakMinutes" | "taskId" | "subject">>
    ) =>
      mutate((current) => {
        if (current.status === "idle") publish({ ...current, ...patch });
      }),
    studyTask: (taskId: string, title: string) =>
      void mutate((current) => {
        if (current.status !== "idle")
          throw new Error("Finish your current session before choosing another task.");
        publish({ ...current, taskId, subject: title.slice(0, 120) });
        router.push("/dashboard");
      }),
    cancelReview: () => {
      setReview(false);
      void mutate((current) => {
        if (current.status === "review") publish({ ...current, status: "paused" });
      });
    },
    discard: () =>
      void mutate((current) => {
        if (current.status === "pending")
          throw new Error("Retry this save before discarding; it may already be stored.");
        publish({
          ...initialTimer(profile.id, current.focusMinutes, current.breakMinutes),
          mode: current.mode
        });
        setReview(false);
      }),
    save: (subject: string, note: string) =>
      void mutate(async (current) => {
        if (!["review", "paused", "pending"].includes(current.status)) return;
        await persist(
          prepareSave(
            current.pending
              ? current
              : { ...current, subject: subject.trim().slice(0, 120), note: note.trim().slice(0, 2000) },
            Date.now()
          )
        );
      }),
    retry: () =>
      void mutate(async (current) => {
        if (current.pending) await persist(current);
      }),
    progress: state.mode === "pomodoro" ? Math.min(100, (elapsedSeconds / duration(state)) * 100) : 0
  };
}
type StudyContextValue = ReturnType<typeof useStudyController>;
const StudyContext = createContext<StudyContextValue | null>(null);
export function StudyProvider({ profile, children }: { profile: Profile; children: ReactNode }) {
  const controller = useStudyController(profile);
  return <StudyContext.Provider value={controller}>{children}</StudyContext.Provider>;
}
export function useStudy() {
  const value = useContext(StudyContext);
  if (!value) throw new Error("StudyProvider is missing.");
  return value;
}
export function PersistentAudio() {
  const s = useStudy();
  return (
    <BgmPlayer
      ref={s.audioRef}
      track={s.track}
      volume={s.volume}
      shouldPlay={s.ready && s.state.status === "running" && s.state.phase === "focus"}
      onTrackChange={s.setTrack}
      onVolumeChange={s.setVolume}
      embedded
    />
  );
}
