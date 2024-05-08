/**
 * Copied with appreciation from https://github.com/sergiodxa/remix-utils/blob/main/src/react/use-hydrated.ts
 * Please refer to the original code.
 */

import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

export function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
