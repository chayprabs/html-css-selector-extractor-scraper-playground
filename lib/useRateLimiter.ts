"use client";

/**
 * Hook: sliding-window rate limiter.
 *
 * Tracks timestamps of calls within a rolling window.
 * Returns whether the next call is allowed and, if not, how long to wait.
 */

import { useRef, useCallback } from "react";

export function useRateLimiter(maxPerMinute: number) {
  const callTimestamps = useRef<number[]>([]);

  const checkLimit = useCallback((): { allowed: boolean; retryAfterMs?: number } => {
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;

    // Evict timestamps older than 1 minute
    callTimestamps.current = callTimestamps.current.filter((t) => t > oneMinuteAgo);

    if (callTimestamps.current.length >= maxPerMinute) {
      const oldestInWindow = callTimestamps.current[0];
      const retryAfterMs = oldestInWindow + 60_000 - now;
      return { allowed: false, retryAfterMs };
    }

    callTimestamps.current.push(now);
    return { allowed: true };
  }, [maxPerMinute]);

  const reset = useCallback(() => {
    callTimestamps.current = [];
  }, []);

  return { checkLimit, reset };
}
