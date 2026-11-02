"use client";

import { useEffect, useRef, useState } from "react";
import { rpaApi } from "../services/api";
import { PlaybackStatus } from "../types";

/** Cheap signature of the fields the UI actually renders. */
const signature = (s: PlaybackStatus | null) =>
  s
    ? `${s.playing}|${s.paused}|${s.templateName}|${s.currentStep}|${s.totalSteps}|${s.stepDescription}|${Math.floor(
        s.remainingSeconds
      )}|${s.progressPercent}`
    : "null";

/**
 * Polls /play/status but only triggers a React re-render when something
 * visible actually changed. Before: the whole Studio re-rendered every 450ms
 * even when nothing was playing. After: zero re-renders while idle.
 *
 * - No overlapping requests (a slow backend can't stack up calls)
 * - Polls fast while playing, slower while idle
 * - Stops while the window is hidden
 * - poke() refreshes instantly after a user action (Run / Pause / Stop)
 */
export function usePlaybackStatus(activeMs = 450, idleMs = 1200) {
  const [status, setStatus] = useState<PlaybackStatus | null>(null);
  const sigRef = useRef("null");
  const pokeRef = useRef<() => void>(() => {});

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;
    let playing = false;
    let inFlight = false;
    let wantFast = false;

    const tick = async () => {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.hidden) {
        timer = setTimeout(tick, idleMs);
        return;
      }
      inFlight = true;
      try {
        const next = await rpaApi.getPlaybackStatus();
        if (cancelled) return;
        playing = !!next?.playing;
        const sig = signature(next);
        if (sig !== sigRef.current) {
          sigRef.current = sig;
          setStatus(next);
        }
      } catch {
        /* backend offline — keep last known state */
      }
      inFlight = false;
      const delay = wantFast ? 120 : playing ? activeMs : idleMs;
      wantFast = false;
      if (!cancelled) timer = setTimeout(tick, delay);
    };

    pokeRef.current = () => {
      if (inFlight) {
        wantFast = true; // the running request will reschedule quickly
        return;
      }
      if (timer) clearTimeout(timer);
      timer = setTimeout(tick, 120);
    };

    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [activeMs, idleMs]);

  /** Force an immediate refresh (e.g. right after pressing Run). Stable identity. */
  const poke = useRef(() => pokeRef.current()).current;

  return [status, poke] as const;
}
