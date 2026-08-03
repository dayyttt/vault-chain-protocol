"use client";

import { useSyncExternalStore } from "react";

const TICK_MS = 30_000;

let snapshot = 0;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function tick() {
  const next = Math.floor(Date.now() / 1000);
  if (next === snapshot) return;
  snapshot = next;
  for (const l of listeners) l();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  if (!timer) {
    tick();
    timer = setInterval(tick, TICK_MS);
  }
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/**
 * Ticking unix-seconds clock as an external store — reading Date.now() during render
 * is impure and makes derived launch params unstable across re-renders.
 * Returns 0 until the first tick (and during SSR), so callers must guard on falsy.
 */
export function useNowSeconds(): number {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => 0,
  );
}
