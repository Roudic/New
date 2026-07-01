"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { findDemoUser, getDemoEmployees } from "@/lib/demo-users";
import { getAllTemplates, resolveTemplate } from "@/lib/checklists";
import {
  defaultAppState,
  loadAppState,
  saveAppState,
} from "@/lib/storage";
import type {
  AppSettings,
  Assignment,
  ChecklistDraft,
  ChecklistRun,
  ChecklistTemplate,
  TaskCompletion,
} from "@/lib/types";
import { generateId, isRunComplete } from "@/lib/utils";

interface AppContextValue {
  hydrated: boolean;
  settings: AppSettings;
  runs: ChecklistRun[];
  customChecklists: ChecklistTemplate[];
  assignments: Assignment[];
  isLoggedIn: boolean;
  login: (email: string, password: string) => boolean;
  logout: () => void;
  updateSettings: (settings: Partial<AppSettings>) => void;
  startChecklist: (templateId: string, assignmentId?: string) => ChecklistRun | null;
  startAssignment: (assignmentId: string) => ChecklistRun | null;
  completeTask: (
    runId: string,
    completion: Omit<TaskCompletion, "completedAt" | "completedBy">
  ) => void;
  removeTaskCompletion: (runId: string, itemId: string) => void;
  getRunById: (runId: string) => ChecklistRun | undefined;
  getTemplateById: (id: string) => ChecklistTemplate | undefined;
  getAllTemplates: () => ChecklistTemplate[];
  createChecklist: (draft: ChecklistDraft) => ChecklistTemplate;
  updateChecklist: (id: string, draft: ChecklistDraft) => void;
  deleteChecklist: (id: string) => void;
  createAssignment: (input: {
    templateId: string;
    assignedToEmail: string;
    dueDate?: string;
    notes?: string;
  }) => void;
  resetAllData: () => void;
  getEmployees: () => ReturnType<typeof getDemoEmployees>;
}

function seedDemoAssignments(): Assignment[] {
  const now = new Date().toISOString();
  return [
    {
      id: "demo-assign-1",
      templateId: "store-opening",
      assignedToEmail: "alex@store.com",
      assignedToName: "Alex Rivera",
      assignedByName: "Admin",
      status: "pending",
      notes: "Complete before doors open.",
      createdAt: now,
    },
    {
      id: "demo-assign-2",
      templateId: "food-safety-temps",
      assignedToEmail: "sam@store.com",
      assignedToName: "Sam Chen",
      assignedByName: "Admin",
      status: "pending",
      createdAt: now,
    },
  ];
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [settings, setSettings] = useState(defaultAppState.settings);
  const [runs, setRuns] = useState<ChecklistRun[]>([]);
  const [customChecklists, setCustomChecklists] = useState<ChecklistTemplate[]>(
    []
  );
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    try {
      const state = loadAppState();
      setSettings(state.settings);
      setRuns(state.runs);
      setCustomChecklists(state.customChecklists);
      setAssignments(
        state.assignments.length > 0 ? state.assignments : seedDemoAssignments()
      );
    } catch {
      // Storage can fail in private browsing.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveAppState({ settings, runs, customChecklists, assignments });
  }, [hydrated, settings, runs, customChecklists, assignments]);

  const isLoggedIn = Boolean(settings.role && settings.email);

  const getTemplateById = useCallback(
    (id: string) => resolveTemplate(id, customChecklists),
    [customChecklists]
  );

  const getAllTemplatesList = useCallback(
    () => getAllTemplates(customChecklists),
    [customChecklists]
  );

  const login = useCallback((email: string, password: string) => {
    const user = findDemoUser(email, password);
    if (!user) return false;

    setSettings({
      employeeName: user.name,
      locationName: user.locationName,
      email: user.email,
      role: user.role,
    });
    return true;
  }, []);

  const logout = useCallback(() => {
    setSettings({
      employeeName: "",
      locationName: "Main Street Location",
      email: undefined,
      role: undefined,
    });
  }, []);

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const getRunById = useCallback(
    (runId: string) => runs.find((r) => r.id === runId),
    [runs]
  );

  const createChecklist = useCallback((draft: ChecklistDraft) => {
    const now = new Date().toISOString();
    const checklist: ChecklistTemplate = {
      ...draft,
      id: `custom-${generateId()}`,
      isCustom: true,
      createdAt: now,
      updatedAt: now,
    };
    setCustomChecklists((prev) => [checklist, ...prev]);
    return checklist;
  }, []);

  const updateChecklist = useCallback((id: string, draft: ChecklistDraft) => {
    setCustomChecklists((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, ...draft, updatedAt: new Date().toISOString() }
          : c
      )
    );
  }, []);

  const deleteChecklist = useCallback((id: string) => {
    setCustomChecklists((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const resetAllData = useCallback(() => {
    setSettings(defaultAppState.settings);
    setRuns([]);
    setCustomChecklists([]);
    setAssignments(seedDemoAssignments());
  }, []);

  const createAssignment = useCallback(
    (input: {
      templateId: string;
      assignedToEmail: string;
      dueDate?: string;
      notes?: string;
    }) => {
      const employee = getDemoEmployees().find(
        (e) => e.email === input.assignedToEmail
      );
      if (!employee) return;

      const assignment: Assignment = {
        id: generateId(),
        templateId: input.templateId,
        assignedToEmail: employee.email,
        assignedToName: employee.name,
        assignedByName: settings.employeeName || "Admin",
        dueDate: input.dueDate,
        status: "pending",
        notes: input.notes,
        createdAt: new Date().toISOString(),
      };

      setAssignments((prev) => [assignment, ...prev]);
    },
    [settings.employeeName]
  );

  const startChecklist = useCallback(
    (templateId: string, assignmentId?: string): ChecklistRun | null => {
      const template = resolveTemplate(templateId, customChecklists);
      if (!template) return null;

      if (assignmentId) {
        const existing = runs.find(
          (r) => r.assignmentId === assignmentId && r.status === "in_progress"
        );
        if (existing) return existing;
      }

      const employeeName = settings.employeeName.trim() || "Team Member";
      const run: ChecklistRun = {
        id: generateId(),
        templateId: template.id,
        templateName: template.name,
        category: template.category,
        schedule: template.schedule,
        assignmentId,
        startedAt: new Date().toISOString(),
        startedBy: employeeName,
        completions: [],
        status: "in_progress",
      };

      setRuns((prev) => [run, ...prev]);

      if (assignmentId) {
        setAssignments((prev) =>
          prev.map((a) =>
            a.id === assignmentId
              ? { ...a, status: "in_progress", activeRunId: run.id }
              : a
          )
        );
      }

      return run;
    },
    [customChecklists, runs, settings.employeeName]
  );

  const startAssignment = useCallback(
    (assignmentId: string) => {
      const assignment = assignments.find((a) => a.id === assignmentId);
      if (!assignment) return null;
      return startChecklist(assignment.templateId, assignmentId);
    },
    [assignments, startChecklist]
  );

  const completeTask = useCallback(
    (
      runId: string,
      completion: Omit<TaskCompletion, "completedAt" | "completedBy">
    ) => {
      setRuns((prev) =>
        prev.map((run) => {
          if (run.id !== runId) return run;

          const employeeName = settings.employeeName.trim() || run.startedBy;
          const fullCompletion: TaskCompletion = {
            ...completion,
            completedAt: new Date().toISOString(),
            completedBy: employeeName,
          };

          const completions = run.completions.filter(
            (c) => c.itemId !== completion.itemId
          );
          completions.push(fullCompletion);

          const template = resolveTemplate(run.templateId, customChecklists);
          const updatedRun: ChecklistRun = { ...run, completions };

          if (template && isRunComplete(template, updatedRun)) {
            const completedRun = {
              ...updatedRun,
              status: "completed" as const,
              completedAt: new Date().toISOString(),
            };

            if (run.assignmentId) {
              setAssignments((prevAssignments) =>
                prevAssignments.map((a) =>
                  a.id === run.assignmentId
                    ? { ...a, status: "completed" as const }
                    : a
                )
              );
            }

            return completedRun;
          }

          return updatedRun;
        })
      );
    },
    [customChecklists, settings.employeeName]
  );

  const removeTaskCompletion = useCallback((runId: string, itemId: string) => {
    setRuns((prev) =>
      prev.map((run) => {
        if (run.id !== runId) return run;

        if (run.assignmentId) {
          setAssignments((prevAssignments) =>
            prevAssignments.map((a) =>
              a.id === run.assignmentId
                ? { ...a, status: "in_progress" as const }
                : a
            )
          );
        }

        return {
          ...run,
          status: "in_progress",
          completedAt: undefined,
          completions: run.completions.filter((c) => c.itemId !== itemId),
        };
      })
    );
  }, []);

  const value = useMemo(
    () => ({
      hydrated,
      settings,
      runs,
      customChecklists,
      assignments,
      isLoggedIn,
      login,
      logout,
      updateSettings,
      startChecklist,
      startAssignment,
      completeTask,
      removeTaskCompletion,
      getRunById,
      getTemplateById,
      getAllTemplates: getAllTemplatesList,
      createChecklist,
      updateChecklist,
      deleteChecklist,
      createAssignment,
      resetAllData,
      getEmployees: getDemoEmployees,
    }),
    [
      hydrated,
      settings,
      runs,
      customChecklists,
      assignments,
      isLoggedIn,
      login,
      logout,
      updateSettings,
      startChecklist,
      startAssignment,
      completeTask,
      removeTaskCompletion,
      getRunById,
      getTemplateById,
      getAllTemplatesList,
      createChecklist,
      updateChecklist,
      deleteChecklist,
      createAssignment,
      resetAllData,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp must be used within AppProvider");
  }
  return ctx;
}
