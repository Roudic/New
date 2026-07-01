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
import { getTemplateById } from "@/lib/templates";
import {
  defaultAppState,
  loadAppState,
  saveAppState,
} from "@/lib/storage";
import type {
  AppSettings,
  ChecklistRun,
  TaskCompletion,
} from "@/lib/types";
import { generateId, isRunComplete } from "@/lib/utils";

interface AppContextValue {
  hydrated: boolean;
  settings: AppSettings;
  runs: ChecklistRun[];
  updateSettings: (settings: Partial<AppSettings>) => void;
  startChecklist: (templateId: string) => ChecklistRun | null;
  completeTask: (
    runId: string,
    completion: Omit<TaskCompletion, "completedAt" | "completedBy">
  ) => void;
  removeTaskCompletion: (runId: string, itemId: string) => void;
  getRunById: (runId: string) => ChecklistRun | undefined;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [settings, setSettings] = useState(defaultAppState.settings);
  const [runs, setRuns] = useState<ChecklistRun[]>([]);

  useEffect(() => {
    const state = loadAppState();
    setSettings(state.settings);
    setRuns(state.runs);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveAppState({ settings, runs });
  }, [hydrated, settings, runs]);

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const getRunById = useCallback(
    (runId: string) => runs.find((r) => r.id === runId),
    [runs]
  );

  const startChecklist = useCallback(
    (templateId: string): ChecklistRun | null => {
      const template = getTemplateById(templateId);
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
    [settings.employeeName]
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

          const template = getTemplateById(run.templateId);
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
    [settings.employeeName]
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
      updateSettings,
      startChecklist,
      completeTask,
      removeTaskCompletion,
      getRunById,
    }),
    [
      hydrated,
      settings,
      runs,
      updateSettings,
      startChecklist,
      completeTask,
      removeTaskCompletion,
      getRunById,
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
