// src/app/(dashboard)/loading.tsx
// Shown by Next.js App Router automatically during page navigation
// while the incoming page's data is loading.

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6 p-6 animate-pulse">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between border-b border-border pb-6">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded-lg bg-muted/50" />
          <div className="h-4 w-72 rounded bg-muted/30" />
        </div>
        <div className="h-9 w-28 rounded-lg bg-muted/50" />
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card/50 p-4 space-y-3"
          >
            <div className="h-3 w-24 rounded bg-muted/40" />
            <div className="h-8 w-16 rounded-lg bg-muted/50" />
            <div className="h-3 w-12 rounded bg-muted/30" />
          </div>
        ))}
      </div>

      {/* Main content grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-card/50 p-5 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-32 rounded bg-muted/50" />
              <div className="h-5 w-16 rounded-full bg-muted/40" />
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-muted/30" />
              <div className="h-3 w-3/4 rounded bg-muted/30" />
              <div className="h-3 w-1/2 rounded bg-muted/30" />
            </div>
            <div className="h-8 w-full rounded-lg bg-muted/40" />
          </div>
        ))}
      </div>
    </div>
  );
}
