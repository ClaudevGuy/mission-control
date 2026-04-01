import { create } from "zustand";

interface UIState {
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  commandPaletteOpen: boolean;
  shortcutsOpen: boolean;
  gKeyActive: boolean;
  toggleSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  toggleShortcuts: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  setGKeyActive: (active: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  commandPaletteOpen: false,
  shortcutsOpen: false,
  gKeyActive: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  toggleCommandPalette: () =>
    set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  toggleShortcuts: () => set((s) => ({ shortcutsOpen: !s.shortcutsOpen })),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setShortcutsOpen: (open) => set({ shortcutsOpen: open }),
  setGKeyActive: (active) => set({ gKeyActive: active }),
}));
