"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useStudy } from "./study-provider";
import { errorMessage } from "@/lib/validation";
export function useResource<T>(load: () => Promise<T>) {
  const { revision } = useStudy();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const generation = useRef(0);
  const refresh = useCallback(() => setReload((n) => n + 1), []);
  useEffect(() => {
    const id = ++generation.current;
    let live = true;
    setLoading(true);
    setError(null);
    void load()
      .then((result) => {
        if (live && id === generation.current) setData(result);
      })
      .catch((error) => {
        if (live && id === generation.current) setError(errorMessage(error));
      })
      .finally(() => {
        if (live && id === generation.current) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [load, revision, reload]);
  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refresh]);
  return { data, error, loading, refresh };
}
