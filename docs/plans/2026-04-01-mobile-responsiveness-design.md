# Mobile Responsiveness Design

**Date:** 2026-04-01
**Scope:** Full dashboard mobile responsiveness
**Approach:** Option C — shadcn Sheet for mobile nav + shared SidebarContent component
**Breakpoint:** Mobile = `< md (768px)`, Desktop = `md+`

---

## 1. Navigation

### Sidebar Refactor
- Extract `SidebarContent` component containing all nav markup (logo, ProjectSwitcher, nav groups, collapse button)
- **Desktop (`md+`):** existing `<aside>` wraps `<SidebarContent>`, hidden on mobile via `hidden md:flex`
- **Mobile (`< md`):** shadcn `<Sheet side="left">` wraps `<SidebarContent>`, `w-[260px]`
- Sheet triggered by hamburger button in Topbar
- Navigating to a new page auto-closes the drawer (usePathname effect)

### Topbar Changes
- Add `<Menu>` hamburger icon on far-left, `md:hidden`
- Search bar (`w-64`) → `hidden md:flex`; replaced on mobile by a `<Search>` icon button opening the command palette
- Breadcrumbs: show only last segment on mobile, full path on desktop (`hidden sm:inline` for intermediate crumbs)
- Bell + avatar unchanged

---

## 2. State

- Add to `useUIStore`: `mobileSidebarOpen: boolean`, `setMobileSidebarOpen(open: boolean)`
- Sheet `onOpenChange` → `setMobileSidebarOpen`
- Topbar hamburger → `setMobileSidebarOpen(true)`
- Auto-close on route change via `usePathname` effect in Sheet wrapper

---

## 3. Content & Grids

| Area | Change |
|------|--------|
| Page padding | `p-6` → `p-4 md:p-6` in layout.tsx |
| `PageHeader` | Action buttons: `flex-col sm:flex-row` gap |
| `QuickActions` | `grid-cols-1 sm:grid-cols-3` |
| `AgentStatusGrid` | Add `sm:` breakpoint step as needed |
| Data tables (Agents, Deployments, Logs, Costs, Incidents, Team) | Wrap in `overflow-x-auto` |
| Analytics tabs | Ensure tab bar wraps on mobile |
| Charts | Recharts uses `width="100%"` — no change needed |
| Overview bottom row | Already `grid-cols-1 lg:grid-cols-3` — no change |
| LiveStatsRow | Already `grid-cols-2 md:grid-cols-4` — no change |

---

## 4. Files Affected

| File | Change |
|------|--------|
| `src/stores/ui-store.ts` | Add `mobileSidebarOpen`, `setMobileSidebarOpen` |
| `src/components/layout/Sidebar.tsx` | Extract `SidebarContent`, wrap in `hidden md:flex` aside |
| `src/components/layout/MobileSidebar.tsx` | New — Sheet wrapping SidebarContent |
| `src/components/layout/Topbar.tsx` | Hamburger button, mobile search icon, responsive breadcrumbs |
| `src/app/(dashboard)/layout.tsx` | Include `<MobileSidebar>`, change padding |
| `src/components/shared/PageHeader.tsx` | Responsive action layout |
| `src/components/overview/QuickActions.tsx` | Grid breakpoint |
| `src/components/overview/AgentStatusGrid.tsx` | Grid breakpoint check |
| `src/app/(dashboard)/agents/page.tsx` | Table `overflow-x-auto` |
| `src/app/(dashboard)/deployments/page.tsx` | Table `overflow-x-auto` |
| `src/app/(dashboard)/logs/page.tsx` | Table `overflow-x-auto` |
| `src/app/(dashboard)/costs/page.tsx` | Table `overflow-x-auto` |
| `src/app/(dashboard)/incidents/page.tsx` | Table `overflow-x-auto` |
| `src/app/(dashboard)/team/page.tsx` | Table `overflow-x-auto` |
| `src/app/(dashboard)/analytics/page.tsx` | Tab bar responsive check |

---

## 5. Out of Scope

- Keyboard shortcuts (desktop-only, no change)
- Mobile-specific touch gestures (swipe to open/close drawer)
- Tablet-optimized layouts beyond the `md` breakpoint
