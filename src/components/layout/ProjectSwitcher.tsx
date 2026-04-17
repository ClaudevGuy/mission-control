"use client";

import { useState, useEffect } from "react";
import { ChevronsUpDown, Check, Plus } from "lucide-react";
import { useProjectsStore } from "@/stores/projects-store";
import { useSettingsStore } from "@/stores/settings-store";
import { clearProjectData, reloadProjectData } from "@/lib/project-data";
import { NewProjectModal } from "./NewProjectModal";
import { cn } from "@/lib/utils";

// Consistent avatar colour from project name
const AVATAR_GRADIENTS = [
  "from-cyan-500/25 to-cyan-700/15",
  "from-purple-500/25 to-purple-700/15",
  "from-amber-500/25 to-amber-700/15",
  "from-emerald-500/25 to-emerald-700/15",
  "from-rose-500/25 to-rose-700/15",
  "from-indigo-500/25 to-indigo-700/15",
];

function ProjectAvatar({ name, logo }: { name: string; logo: string }) {
  if (logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo}
        alt={name}
        className="size-[22px] rounded-md object-cover shrink-0"
      />
    );
  }
  const gradient = AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length];
  return (
    <div
      className={cn(
        "size-[22px] rounded-md bg-gradient-to-br border border-white/10",
        "flex items-center justify-center shrink-0",
        gradient
      )}
    >
      <span className="text-[9px] font-bold text-foreground/70 uppercase leading-none">
        {name.slice(0, 2)}
      </span>
    </div>
  );
}

export function ProjectSwitcher({ collapsed }: { collapsed: boolean }) {
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  // Zustand reads from localStorage on client which differs from SSR output.
  // Render the SSR-safe default until mounted to avoid hydration mismatch.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { projects, activeProjectId, switchProject, addProject, deleteProject } =
    useProjectsStore();
  const setProjectName = useSettingsStore((s) => s.setProjectName);
  const setProjectLogo = useSettingsStore((s) => s.setProjectLogo);

  const activeProject = projects.find((p) => p.id === activeProjectId);

  // Pre-hydration display: always show the canonical default to match server HTML
  const displayName = mounted ? (activeProject?.name ?? "MOTHERSHIP") : "MOTHERSHIP";
  const displayLogo = mounted ? (activeProject?.logo ?? "") : "";

  function handleSwitch(id: string) {
    setOpen(false);
    if (id === activeProjectId) return;
    switchProject(id);
    const project = projects.find((p) => p.id === id);
    if (project) {
      setProjectName(project.name);
      setProjectLogo(project.logo);
    }
    if (id === "default") reloadProjectData();
    else clearProjectData();
  }

  function handleCreate(name: string, description: string) {
    const project = addProject(name, description);
    switchProject(project.id);
    setProjectName(project.name);
    setProjectLogo("");
    clearProjectData();
  }

  // Collapsed sidebar: just a centred avatar, no text, no expand
  if (collapsed) {
    return (
      <div className="flex h-9 w-full items-center justify-center">
        <ProjectAvatar name={displayName} logo={displayLogo} />
      </div>
    );
  }

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px]",
          "text-[13px] font-medium transition-all duration-150 overflow-hidden",
          open
            ? "bg-white/[0.05] text-foreground"
            : "text-muted-foreground/70 hover:text-foreground/90 hover:bg-white/[0.035]"
        )}
      >
        <ProjectAvatar name={displayName} logo={displayLogo} />
        <span className="flex-1 truncate text-left leading-none">
          {displayName}
        </span>
        <ChevronsUpDown
          className={cn(
            "size-3 shrink-0 transition-colors duration-150",
            open ? "text-muted-foreground/50" : "text-muted-foreground/25"
          )}
        />
      </button>

      {/* Inline panel — no absolute positioning, expands in-flow */}
      {open && (
        <div className="mt-0.5 ml-1 mr-0.5 overflow-hidden rounded-lg border border-border/40 bg-black/[0.12]">
          {/* Project list */}
          <div className="py-1">
            {projects.map((project) => {
              const isActive = project.id === activeProjectId;
              return (
                <button
                  key={project.id}
                  onClick={() => handleSwitch(project.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 px-2.5 py-[6px] text-left",
                    "transition-colors duration-100",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground/55 hover:text-foreground/80 hover:bg-white/[0.03]"
                  )}
                >
                  <ProjectAvatar name={project.name} logo={project.logo} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate leading-tight">
                      {project.name}
                    </p>
                    {project.description && (
                      <p className="text-[10px] text-muted-foreground/40 truncate leading-tight mt-0.5">
                        {project.description}
                      </p>
                    )}
                  </div>
                  {isActive && (
                    <Check className="size-3 shrink-0 text-brand" />
                  )}
                  {project.id !== "default" && (
                    <span
                      role="button"
                      className="shrink-0 text-muted-foreground/30 hover:text-red-400 transition-colors ml-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteProject(project.id);
                        if (isActive) {
                          setProjectName("MOTHERSHIP");
                          setProjectLogo("");
                          reloadProjectData();
                        }
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Add project */}
          <div className="border-t border-border/30 py-1">
            <button
              onClick={() => {
                setOpen(false);
                setModalOpen(true);
              }}
              className={cn(
                "group/add flex w-full items-center gap-2.5 px-2.5 py-[6px] text-left",
                "text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors duration-100",
                "hover:bg-white/[0.03]"
              )}
            >
              <div className="flex size-[22px] items-center justify-center rounded-md border border-dashed border-border/40 group-hover/add:border-brand/30 transition-colors shrink-0">
                <Plus className="size-2.5" />
              </div>
              <span className="text-xs">Add project</span>
            </button>
          </div>
        </div>
      )}

      <NewProjectModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onConfirm={handleCreate}
      />
    </>
  );
}
