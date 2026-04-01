"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html>
      <body className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 p-8 text-center max-w-md">
          <div className="flex size-14 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="size-7 text-red-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Something went wrong</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              An unexpected error occurred. Our team has been notified.
            </p>
            {error.digest && (
              <p className="mt-2 font-mono text-xs text-muted-foreground/50">
                Error ID: {error.digest}
              </p>
            )}
          </div>
          <button
            onClick={reset}
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
          >
            <RefreshCw className="size-3.5" />
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
