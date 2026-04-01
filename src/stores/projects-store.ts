import { create } from "zustand";

export interface Project {
  id: string;
  name: string;
  logo: string;
  description: string;
  createdAt: string;
}

const DEFAULT_PROJECT: Project = {
  id: "default",
  name: "Mission Control",
  logo: "",
  description: "AI-powered project command center",
  createdAt: new Date(0).toISOString(),
};

const STORAGE_KEY = "mc_projects_v1";

function loadFromStorage(): { projects: Project[]; activeId: string } {
  if (typeof window === "undefined")
    return { projects: [DEFAULT_PROJECT], activeId: "default" };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { projects: [DEFAULT_PROJECT], activeId: "default" };
    const parsed = JSON.parse(raw) as { projects: Project[]; activeId: string };
    // Always ensure the default project is present
    const hasDefault = parsed.projects.some((p) => p.id === "default");
    if (!hasDefault) parsed.projects.unshift(DEFAULT_PROJECT);
    return parsed;
  } catch {
    return { projects: [DEFAULT_PROJECT], activeId: "default" };
  }
}

function persist(projects: Project[], activeId: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ projects, activeId }));
}

interface ProjectsStore {
  projects: Project[];
  activeProjectId: string;
  getActiveProject: () => Project | undefined;
  addProject: (name: string, description: string) => Project;
  switchProject: (id: string) => void;
  updateProject: (
    id: string,
    updates: Partial<Pick<Project, "name" | "logo" | "description">>
  ) => void;
}

const initial = typeof window !== "undefined"
  ? loadFromStorage()
  : { projects: [DEFAULT_PROJECT], activeId: "default" };

export const useProjectsStore = create<ProjectsStore>((set, get) => ({
  projects: initial.projects,
  activeProjectId: initial.activeId,

  getActiveProject: () => {
    const { projects, activeProjectId } = get();
    return projects.find((p) => p.id === activeProjectId);
  },

  addProject: (name, description) => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name: name.trim(),
      logo: "",
      description: description.trim(),
      createdAt: new Date().toISOString(),
    };
    set((s) => {
      const projects = [...s.projects, newProject];
      persist(projects, s.activeProjectId);
      return { projects };
    });
    return newProject;
  },

  switchProject: (id) => {
    set((s) => {
      persist(s.projects, id);
      return { activeProjectId: id };
    });
  },

  updateProject: (id, updates) => {
    set((s) => {
      const projects = s.projects.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      );
      persist(projects, s.activeProjectId);
      return { projects };
    });
  },
}));
