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
import { resolveTemplate } from "@/lib/checklists";
import {
  defaultAppState,
  loadAppState,
  saveAppState,
} from "@/lib/storage";
import type {
  AppSettings,
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
  updateSettings: (settings: Partial<AppSettings>) => void;
  startChecklist: (templateId: string) => ChecklistRun | null;
  completeTask: (
    runId: string,
    completion: Omit<TaskCompletion, "completedAt" | "completedBy">
  ) => void;
  removeTaskCompletion: (runId: string, itemId: string) => void;
  getRunById: (runId: string) => ChecklistRun | undefined;
  getTemplateById: (id: string) => ChecklistTemplate | undefined;
  createChecklist: (draft: ChecklistDraft) => ChecklistTemplate;
  updateChecklist: (id: string, draft: ChecklistDraft) => void;
  deleteChecklist: (id: string) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [settings, setSettings] = useState(defaultAppState.settings);
  const [runs, setRuns] = useState<ChecklistRun[]>([]);
  const [customChecklists, setCustomChecklists] = useState<
    ChecklistTemplate[]
  >([]);

  useEffect(() => {
    try {
      const state = loadAppState();
      setSettings(state.settings);
      setRuns(state.runs);
      setCustomChecklists(state.customChecklists);
    } catch {
      // Storage can fail in private browsing; still show the app.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveAppState({ settings, runs, customChecklists });
  }, [hydrated, settings, runs, customChecklists]);

  const getTemplateById = useCallback(
    (id: string) => resolveTemplate(id, customChecklists),
    [customChecklists]
  );

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

  const startChecklist = useCallback(
    (templateId: string): ChecklistRun | null => {
      const template = resolveTemplate(templateId, customChecklists);
      if (!template) return null;

      const employeeName = settings.employeeName.trim() || "Team Member";
      const run: ChecklistRun = {
        id: generateId(),
        templateId: template.id,
        templateName: template.name,
        category: template.category,
        schedule: template.schedule,
        startedAt: new Date().toISOString(),
        startedBy: employeeName,
        completions: [],
        status: "in_progress",
      };

      setRuns((prev) => [run, ...prev]);
      return run;
    },
    [customChecklists, settings.employeeName]
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
          const updatedRun: ChecklistRun = {
            ...run,
            completions,
          };

          if (template && isRunComplete(template, updatedRun)) {
            return {
              ...updatedRun,
              status: "completed",
              completedAt: new Date().toISOString(),
            };
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
      updateSettings,
      startChecklist,
      completeTask,
      removeTaskCompletion,
      getRunById,
      getTemplateById,
      createChecklist,
      updateChecklist,
      deleteChecklist,
    }),
    [
      hydrated,
      settings,
      runs,
      customChecklists,
      updateSettings,
      startChecklist,
      completeTask,
      removeTaskCompletion,
      getRunById,
      getTemplateById,
      createChecklist,
      updateChecklist,
      deleteChecklist,
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
