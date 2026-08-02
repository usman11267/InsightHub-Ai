"use client";

import * as React from "react";

/**
 * True only after hydration.
 *
 * Uses useSyncExternalStore rather than a mount effect: the server snapshot is
 * `false` and the client snapshot is `true`, so React resolves the difference
 * during hydration instead of triggering a second render pass.
 */
const emptySubscribe = () => () => {};

export function useMounted(): boolean {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
