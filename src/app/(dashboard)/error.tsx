"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("[DashboardError]", error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
        <AlertTriangle className="size-8 text-red-400" />
      </div>
      <div className="max-w-sm">
        <h2 className="text-lg font-semibold text-foreground">Page crashed</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          An unexpected error occurred on this page.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-muted-foreground/50">
            Ref: {error.digest}
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
        >
          <RefreshCw className="size-3.5" />
          Try again
        </button>
        <button
          onClick={() => router.push("/overview")}
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <Home className="size-3.5" />
          Go to Overview
        </button>
      </div>
    </div>
  );
}
