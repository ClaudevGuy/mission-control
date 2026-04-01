"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronsUpDown, Check, Plus, Zap } from "lucide-react";
import { useProjectsStore } from "@/stores/projects-store";
import { useSettingsStore } from "@/stores/settings-store";
import { clearProjectData, reloadProjectData } from "@/lib/project-data";
import { NewProjectModal } from "./NewProjectModal";
import { cn } from "@/lib/utils";

interface Props {
  collapsed: boolean;
}

function ProjectAvatar({
  name,
  logo,
  size = "sm",
}: {
  name: string;
  logo: string;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "size-[26px]" : "size-[30px]";
  const text = size === "sm" ? "text-[10px]" : "text-[11px]";

  if (logo) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img src={logo} alt={name} className={cn(dim, "rounded-md object-cover shrink-0")} />
    );
  }

  // Generate a consistent colour from the name
  const colours = [
    "from-[#00D4FF]/30 to-[#0099bb]/20",
    "from-purple-500/30 to-purple-700/20",
    "from-amber-500/30 to-amber-700/20",
    "from-emerald-500/30 to-emerald-700/20",
    "from-rose-500/30 to-rose-700/20",
  ];
  const idx = name.charCodeAt(0) % colours.length;

  return (
    <div
      className={cn(
        dim,
        "rounded-md bg-gradient-to-br border border-white/10 flex items-center justify-center shrink-0",
        colours[idx]
      )}
    >
      <span className={cn(text, "font-bold text-foreground/80 uppercase leading-none")}>
        {name.slice(0, 2)}
      </span>
    </div>
  );
}

export function ProjectSwitcher({ collapsed }: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { projects, activeProjectId, switchProject, addProject } =
    useProjectsStore();
  const setProjectName = useSettingsStore((s) => s.setProjectName);
  const setProjectLogo = useSettingsStore((s) => s.setProjectLogo);

  const activeProject = projects.find((p) => p.id === activeProjectId);

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [dropdownOpen]);

  function handleSwitch(id: string) {
    setDropdownOpen(false);
    if (id === activeProjectId) return;

    switchProject(id);
    const project = projects.find((p) => p.id === id);
    if (project) {
      setProjectName(project.name);
      setProjectLogo(project.logo);
    }

    if (id === "default") {
      reloadProjectData();
    } else {
      clearProjectData();
    }
  }

  function handleCreate(name: string, description: string) {
    const project = addProject(name, description);
    // Immediately switch to the new project
    handleSwitch(project.id);
    // Override name since handleSwitch uses the projects array before state update
    setProjectName(project.name);
    setProjectLogo("");
    clearProjectData();
  }

  // Collapsed: just a logo/icon, no dropdown
  if (collapsed) {
    return (
      <div className="flex h-[58px] items-center justify-center border-b border-border/40">
        {activeProject?.logo ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={activeProject.logo}
            alt={activeProject.name}
            className="size-[30px] rounded-lg object-cover"
          />
        ) : (
          <div className="relative flex size-[30px] shrink-0 items-center justify-center">
            <div className="absolute inset-0 rounded-lg bg-[#00D4FF]/[0.12] border border-[#00D4FF]/20" />
            <Zap
              className="relative z-10 size-[14px] text-[#00D4FF]"
              strokeWidth={2.5}
              fill="rgba(0,212,255,0.2)"
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div ref={dropdownRef} className="relative border-b border-border/40">
        {/* Trigger */}
        <button
          onClick={() => setDropdownOpen((v) => !v)}
          className={cn(
            "flex h-[58px] w-full items-center gap-2.5 px-4",
            "transition-colors hover:bg-white/[0.025]",
            dropdownOpen && "bg-white/[0.02]"
          )}
        >
          {activeProject?.logo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={activeProject.logo}
              alt={activeProject.name}
              className="size-[30px] rounded-lg object-cover shrink-0"
            />
          ) : (
            <div className="relative flex size-[30px] shrink-0 items-center justify-center">
              <div className="absolute inset-0 rounded-lg bg-[#00D4FF]/[0.12] border border-[#00D4FF]/20" />
              <Zap
                className="relative z-10 size-[14px] text-[#00D4FF]"
                strokeWidth={2.5}
                fill="rgba(0,212,255,0.2)"
              />
              <div
                className="absolute inset-0 rounded-lg pointer-events-none"
                style={{ boxShadow: "0 0 14px rgba(0,212,255,0.15)" }}
              />
            </div>
          )}

          <span className="flex-1 truncate text-left font-heading text-[13px] font-bold uppercase tracking-[0.11em] text-foreground/90 leading-none">
            {activeProject?.name || "Mission Control"}
          </span>

          <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground/40" />
        </button>

        {/* Dropdown */}
        {dropdownOpen && (
          <div className="absolute left-0 right-0 top-full z-50 border-x border-b border-border/60 bg-card/95 backdrop-blur-sm shadow-xl rounded-b-xl overflow-hidden">
            {/* Project list */}
            <div className="py-1.5 max-h-[240px] overflow-y-auto">
              {projects.map((project) => {
                const isActive = project.id === activeProjectId;
                return (
                  <button
                    key={project.id}
                    onClick={() => handleSwitch(project.id)}
                    className={cn(
                      "flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors",
                      isActive
                        ? "bg-[#00D4FF]/[0.06]"
                        : "hover:bg-white/[0.04]"
                    )}
                  >
                    <ProjectAvatar name={project.name} logo={project.logo} />
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-xs font-medium truncate leading-tight",
                          isActive ? "text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {project.name}
                      </p>
                      {project.description && (
                        <p className="text-[10px] text-muted-foreground/50 truncate leading-tight mt-0.5">
                          {project.description}
                        </p>
                      )}
                    </div>
                    {isActive && (
                      <Check className="size-3 shrink-0 text-[#00D4FF]" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Divider + Add new */}
            <div className="border-t border-border/40">
              <button
                onClick={() => {
                  setDropdownOpen(false);
                  setModalOpen(true);
                }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04] group"
              >
                <div className="flex size-[26px] items-center justify-center rounded-md border border-dashed border-border/60 group-hover:border-[#00D4FF]/40 transition-colors shrink-0">
                  <Plus className="size-3 text-muted-foreground/50 group-hover:text-[#00D4FF]/70 transition-colors" />
                </div>
                <span className="text-xs text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
                  Add project
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      <NewProjectModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onConfirm={handleCreate}
      />
    </>
  );
}
