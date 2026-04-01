import Link from "next/link";
import { Zap, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-8 p-8 text-center">
      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="relative flex size-8 shrink-0 items-center justify-center">
          <div className="absolute inset-0 rounded-lg bg-[#00D4FF]/[0.08]" />
          <Zap className="relative z-10 size-4 text-[#00D4FF]" strokeWidth={2.5} aria-hidden="true" />
        </div>
        <span className="font-heading text-sm font-bold uppercase tracking-[0.12em] text-foreground">
          Mission Control
        </span>
      </div>

      {/* 404 number */}
      <div>
        <p
          className="text-[120px] font-bold leading-none tracking-tighter"
          style={{
            background: "linear-gradient(135deg, #00D4FF 0%, #A855F7 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          404
        </p>
        <h1 className="mt-2 text-xl font-semibold text-foreground">Page not found</h1>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-xs mx-auto">
          This route doesn&apos;t exist. It may have been moved or the URL is incorrect.
        </p>
      </div>

      <Link
        href="/overview"
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
      >
        <Home className="size-3.5" aria-hidden="true" />
        Back to Overview
      </Link>
    </div>
  );
}
