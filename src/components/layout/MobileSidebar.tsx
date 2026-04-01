"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { useUIStore } from "@/stores/ui-store";
import { SidebarContent } from "./Sidebar";

export function MobileSidebar() {
  const open = useUIStore((s) => s.mobileSidebarOpen);
  const setOpen = useUIStore((s) => s.setMobileSidebarOpen);
  const pathname = usePathname();

  // Auto-close when navigating to a new page
  useEffect(() => {
    setOpen(false);
  }, [pathname, setOpen]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="left"
        className="w-[260px] p-0 border-r border-border/50 [&>button]:hidden"
        style={{ background: "var(--sidebar-bg)" }}
      >
        <SheetTitle className="sr-only">Navigation</SheetTitle>
        <div className="relative flex h-full flex-col overflow-hidden select-none">
          <SidebarContent collapsed={false} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
