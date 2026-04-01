"use client";

import { useEffect, useRef } from "react";

/**
 * Hook that components call to trigger initial data fetch for a store.
 * Prevents re-fetching when deps haven't changed.
 */
export function useStoreInit(
  storeFetch: () => Promise<void>,
  deps: unknown[] = []
) {
  const called = useRef(false);

  useEffect(() => {
    if (!called.current) {
      called.current = true;
      storeFetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
