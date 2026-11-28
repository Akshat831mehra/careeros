"use client";

import * as React from "react";

type DraftPayload = { draft?: { data?: unknown } | null };

type DraftState<T> = { key: string; value: T; ready: boolean };

async function saveDraft(key: string, data: unknown) {
  try {
    await fetch(`/api/drafts?key=${encodeURIComponent(key)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, data }),
      keepalive: true,
    });
  } catch {
    // A failed draft write must never interrupt the user.
  }
}

export async function deleteDraftByKey(key: string) {
  try {
    await fetch(`/api/drafts?key=${encodeURIComponent(key)}`, { method: "DELETE" });
  } catch {
    // A failed draft delete must never interrupt the user.
  }
}

/**
 * User-scoped, server-backed form state. Drafts are only written after an
 * explicit value change, so empty initial values can never overwrite saved
 * drafts during hydration or API refetches.
 */
export function useDraft<T>(
  key: string,
  initialValue: T,
  options: { debounceMs?: number } = {},
) {
  const [state, setState] = React.useState<DraftState<T>>({
    key,
    value: initialValue,
    ready: false,
  });

  const initialRef = React.useRef(initialValue);
  const valueRef = React.useRef(state.value);
  const dirtyRef = React.useRef(false);
  const timerRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    initialRef.current = initialValue;
  }, [initialValue]);

  React.useEffect(() => {
    valueRef.current = state.value;
  }, [state.value]);

  React.useEffect(() => {
    let active = true;
    const activeKey = key;
    dirtyRef.current = false;

    queueMicrotask(() => {
      if (!active) return;
      setState((previous) =>
        previous.key === activeKey
          ? previous
          : { key: activeKey, value: initialRef.current, ready: false },
      );
    });

    fetch(`/api/drafts?key=${encodeURIComponent(activeKey)}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: DraftPayload | null) => {
        if (!active) return;
        const data = payload?.draft?.data;
        setState((previous) => {
          if (previous.key !== activeKey) return previous;
          return {
            key: activeKey,
            // A draft fetched after the user starts typing must never replace edits.
            value: dirtyRef.current || typeof data === "undefined" ? previous.value : (data as T),
            ready: true,
          };
        });
      })
      .catch(() => {
        if (!active) return;
        setState((previous) =>
          previous.key === activeKey ? { ...previous, ready: true } : previous,
        );
      });

    // Reloads and tab closes do not run React cleanup, so flush pending edits here.
    const handlePageHide = () => {
      if (dirtyRef.current) void saveDraft(activeKey, valueRef.current);
    };
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      active = false;
      window.removeEventListener("pagehide", handlePageHide);
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      if (dirtyRef.current) void saveDraft(activeKey, valueRef.current);
    };
  }, [key]); // initialValue intentionally excluded: server refetches must not reset edits.

  React.useEffect(() => {
    if (!state.ready || !dirtyRef.current) return;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      void saveDraft(state.key, valueRef.current);
    }, options.debounceMs ?? 300);

    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [state.value, state.ready, state.key, options.debounceMs]);

  const setDraftValue = React.useCallback((next: React.SetStateAction<T>) => {
    dirtyRef.current = true;
    setState((previous) => {
      const base = previous.key === key ? previous.value : initialRef.current;
      const resolved = typeof next === "function" ? (next as (prev: T) => T)(base) : next;
      valueRef.current = resolved;
      return { key, value: resolved, ready: previous.ready };
    });
  }, [key]);

  const clearDraft = React.useCallback(
    async (resetValue?: T) => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = null;
      dirtyRef.current = false;
      const reset = typeof resetValue === "undefined" ? initialRef.current : resetValue;
      valueRef.current = reset;
      setState({ key, value: reset, ready: true });
      await deleteDraftByKey(key);
    },
    [key],
  );

  return { value: state.value, setValue: setDraftValue, clearDraft, ready: state.ready };
}
