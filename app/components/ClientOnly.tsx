/**
 * Copied with appreciation from https://github.com/sergiodxa/remix-utils/blob/main/src/react/client-only.tsx
 * Please refer to the original code.
 */

import { useHydrated } from "~/hooks/useHydrated";
type Props = {
  children(): React.ReactNode;
  fallback?: React.ReactNode;
};

export function ClientOnly({ children, fallback = null }: Props) {
  return useHydrated() ? <>{children()}</> : <>{fallback}</>;
}
