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
import { signIn, signOut, useSession } from "next-auth/react";
import {
  cancelInvite as cancelCloudInvite,
  createCloudAssignment,
  createCloudChecklist,
  createInvite as createCloudInvite,
  createTeamMember as createCloudTeamMember,
  deactivateTeamMember as deactivateCloudTeamMember,
  deleteCloudChecklist,
  fetchAssignments,
  fetchEmployees,
  fetchHealth,
  fetchInvites,
  fetchRuns,
  fetchTeamMembers,
  fetchTemplates,
  startCloudRun,
  updateCloudChecklist,
  type CloudEmployee,
  type TeamInviteRecord,
} from "@/lib/api-client";
import { findDemoUser, getDemoEmployees, demoUsers } from "@/lib/demo-users";
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

export type StorageMode = "loading" | "local" | "cloud";

export interface AppEmployee {
  id?: string;
  email: string;
  name: string;
  locationName: string;
  jobTitle?: string;
  role?: string;
}

interface AppContextValue {
  storageMode: StorageMode;
  needsSeed: boolean;
  hydrated: boolean;
  settings: AppSettings;
  runs: ChecklistRun[];
  customChecklists: ChecklistTemplate[];
  assignments: Assignment[];
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshData: () => Promise<void>;
  updateSettings: (settings: Partial<AppSettings>) => void;
  startChecklist: (
    templateId: string,
    assignmentId?: string
  ) => Promise<ChecklistRun | null>;
  startAssignment: (assignmentId: string) => Promise<ChecklistRun | null>;
  completeTask: (
    runId: string,
    completion: Omit<TaskCompletion, "completedAt" | "completedBy">
  ) => void;
  removeTaskCompletion: (runId: string, itemId: string) => void;
  getRunById: (runId: string) => ChecklistRun | undefined;
  getTemplateById: (id: string) => ChecklistTemplate | undefined;
  getAllTemplates: () => ChecklistTemplate[];
  createChecklist: (draft: ChecklistDraft) => Promise<ChecklistTemplate>;
  updateChecklist: (id: string, draft: ChecklistDraft) => Promise<void>;
  deleteChecklist: (id: string) => Promise<void>;
  createAssignment: (input: {
    templateId: string;
    assignedToEmail: string;
    dueDate?: string;
    notes?: string;
  }) => Promise<void>;
  getTeamMembers: () => AppEmployee[];
  pendingInvites: TeamInviteRecord[];
  inviteTeamMember: (input: {
    name: string;
    email: string;
    jobTitle?: string;
    role?: "ADMIN" | "EMPLOYEE";
    locationName?: string;
  }) => Promise<TeamInviteRecord & { message?: string }>;
  addTeamMember: (input: {
    name: string;
    email: string;
    jobTitle?: string;
    role?: "ADMIN" | "EMPLOYEE";
    locationName?: string;
    password?: string;
  }) => Promise<{ tempPassword?: string; message: string }>;
  removeTeamMember: (id: string) => Promise<void>;
  cancelInvite: (id: string) => Promise<void>;
  resetAllData: () => void;
  getEmployees: () => AppEmployee[];
}

function seedDemoAssignments(): Assignment[] {
  const now = new Date().toISOString();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return [
    {
      id: "demo-assign-1",
      templateId: "kitchen-opening",
      templateName: "Kitchen Opening & Line Setup",
      templateCategory: "opening",
      assignedToEmail: "alex@store.com",
      assignedToName: "Alex Rivera",
      assignedToLocation: "Main Street Location",
      assignedByName: "Admin Manager",
      status: "pending",
      dueDate: tomorrow.toISOString(),
      notes: "Complete before lunch service — 11 AM.",
      createdAt: now,
    },
    {
      id: "demo-assign-2",
      templateId: "hot-line-temps",
      templateName: "Hot Line Temperature Check",
      templateCategory: "food_safety",
      assignedToEmail: "sam@store.com",
      assignedToName: "Sam Chen",
      assignedToLocation: "Main Street Location",
      assignedByName: "Admin Manager",
      status: "pending",
      dueDate: tomorrow.toISOString(),
      notes: "Lunch shift line check.",
      createdAt: now,
    },
    {
      id: "demo-assign-3",
      templateId: "manager-kitchen-audit",
      templateName: "Manager Kitchen Walk-through",
      templateCategory: "audit",
      assignedToEmail: "alex@store.com",
      assignedToName: "Alex Rivera",
      assignedToLocation: "Main Street Location",
      assignedByName: "Admin Manager",
      status: "pending",
      createdAt: now,
    },
  ];
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { data: session, status: sessionStatus } = useSession();
  const [storageMode, setStorageMode] = useState<StorageMode>("loading");
  const [needsSeed, setNeedsSeed] = useState(false);
  const [ready, setReady] = useState(false);
  const [settings, setSettings] = useState(defaultAppState.settings);
  const [runs, setRuns] = useState<ChecklistRun[]>([]);
  const [cloudTemplates, setCloudTemplates] = useState<ChecklistTemplate[]>([]);
  const [customChecklists, setCustomChecklists] = useState<ChecklistTemplate[]>(
    []
  );
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [cloudEmployees, setCloudEmployees] = useState<CloudEmployee[]>([]);
  const [cloudTeamMembers, setCloudTeamMembers] = useState<CloudEmployee[]>([]);
  const [pendingInvites, setPendingInvites] = useState<TeamInviteRecord[]>([]);

  useEffect(() => {
    fetchHealth().then((health) => {
      if (health.ok) {
        setStorageMode("cloud");
        setNeedsSeed(Boolean(health.needsSeed));
      } else {
        setStorageMode("local");
        setNeedsSeed(false);
      }
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (storageMode !== "local" || !ready) return;
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
    }
  }, [storageMode, ready]);

  useEffect(() => {
    if (storageMode !== "local" || !ready) return;
    saveAppState({ settings, runs, customChecklists, assignments });
  }, [storageMode, ready, settings, runs, customChecklists, assignments]);

  const cloudSettings = useMemo<AppSettings>(() => {
    if (!session?.user) return defaultAppState.settings;
    return {
      employeeName: session.user.name ?? "",
      locationName: session.user.locationName ?? "Main Street Location",
      email: session.user.email ?? undefined,
      role: session.user.role,
    };
  }, [session]);

  const activeSettings = storageMode === "cloud" ? cloudSettings : settings;
  const isLoggedIn =
    storageMode === "cloud"
      ? Boolean(session?.user)
      : Boolean(settings.role && settings.email);

  const hydrated =
    ready && (storageMode === "local" || sessionStatus !== "loading");

  const refreshData = useCallback(async () => {
    if (storageMode !== "cloud" || !session?.user) return;

    const [templates, nextAssignments, nextRuns] = await Promise.all([
      fetchTemplates(),
      fetchAssignments(),
      fetchRuns(),
    ]);

    setCloudTemplates(templates);
    setAssignments(nextAssignments);
    setRuns(nextRuns);

    if (session.user.role === "ADMIN") {
      const [employees, teamMembers, invites] = await Promise.all([
        fetchEmployees(),
        fetchTeamMembers(),
        fetchInvites(),
      ]);
      setCloudEmployees(employees);
      setCloudTeamMembers(teamMembers);
      setPendingInvites(invites);
    }
  }, [storageMode, session]);

  useEffect(() => {
    if (storageMode === "cloud" && session?.user) {
      refreshData().catch(console.error);
    }
  }, [storageMode, session?.user, refreshData]);

  const getTemplateById = useCallback(
    (id: string) => {
      if (storageMode === "cloud") {
        return cloudTemplates.find((t) => t.id === id);
      }
      return resolveTemplate(id, customChecklists);
    },
    [storageMode, cloudTemplates, customChecklists]
  );

  const getAllTemplatesList = useCallback(() => {
    if (storageMode === "cloud") return cloudTemplates;
    return getAllTemplates(customChecklists);
  }, [storageMode, cloudTemplates, customChecklists]);

  const login = useCallback(
    async (email: string, password: string) => {
      if (storageMode === "cloud") {
        if (needsSeed) return false;
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
        return !result?.error;
      }

      const user = findDemoUser(email, password);
      if (!user) return false;

      setSettings({
        employeeName: user.name,
        locationName: user.locationName,
        email: user.email,
        role: user.role,
      });
      return true;
    },
    [storageMode, needsSeed]
  );

  const logout = useCallback(async () => {
    if (storageMode === "cloud") {
      await signOut({ redirect: false });
      setCloudTemplates([]);
      setAssignments([]);
      setRuns([]);
      setCloudEmployees([]);
      setCloudTeamMembers([]);
      setPendingInvites([]);
      return;
    }

    setSettings({
      employeeName: "",
      locationName: "Main Street Location",
      email: undefined,
      role: undefined,
    });
  }, [storageMode]);

  const getRunById = useCallback(
    (runId: string) => runs.find((r) => r.id === runId),
    [runs]
  );

  const createChecklist = useCallback(
    async (draft: ChecklistDraft) => {
      if (storageMode === "cloud") {
        const checklist = await createCloudChecklist(draft);
        await refreshData();
        return checklist;
      }

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
    },
    [storageMode, refreshData]
  );

  const updateChecklistFn = useCallback(
    async (id: string, draft: ChecklistDraft) => {
      if (storageMode === "cloud") {
        await updateCloudChecklist(id, draft);
        await refreshData();
        return;
      }

      setCustomChecklists((prev) =>
        prev.map((c) =>
          c.id === id
            ? { ...c, ...draft, updatedAt: new Date().toISOString() }
            : c
        )
      );
    },
    [storageMode, refreshData]
  );

  const deleteChecklistFn = useCallback(
    async (id: string) => {
      if (storageMode === "cloud") {
        await deleteCloudChecklist(id);
        await refreshData();
        return;
      }

      setCustomChecklists((prev) => prev.filter((c) => c.id !== id));
    },
    [storageMode, refreshData]
  );

  const resetAllData = useCallback(() => {
    if (storageMode === "cloud") return;
    setSettings(defaultAppState.settings);
    setRuns([]);
    setCustomChecklists([]);
    setAssignments(seedDemoAssignments());
  }, [storageMode]);

  const createAssignmentFn = useCallback(
    async (input: {
      templateId: string;
      assignedToEmail: string;
      dueDate?: string;
      notes?: string;
    }) => {
      if (storageMode === "cloud") {
        const employee = cloudEmployees.find(
          (e) => e.email === input.assignedToEmail
        );
        if (!employee) return;

        await createCloudAssignment({
          templateId: input.templateId,
          assignedToId: employee.id,
          dueDate: input.dueDate,
          notes: input.notes,
        });
        await refreshData();
        return;
      }

      const employee = getDemoEmployees().find(
        (e) => e.email === input.assignedToEmail
      );
      if (!employee) return;

      const template = resolveTemplate(input.templateId, customChecklists);
      const assignment: Assignment = {
        id: generateId(),
        templateId: input.templateId,
        templateName: template?.name,
        templateCategory: template?.category,
        assignedToEmail: employee.email,
        assignedToName: employee.name,
        assignedToLocation: employee.locationName,
        assignedByName: settings.employeeName || "Admin",
        dueDate: input.dueDate,
        status: "pending",
        notes: input.notes,
        createdAt: new Date().toISOString(),
      };

      setAssignments((prev) => [assignment, ...prev]);
    },
    [storageMode, cloudEmployees, settings.employeeName, refreshData]
  );

  const startChecklist = useCallback(
    async (
      templateId: string,
      assignmentId?: string
    ): Promise<ChecklistRun | null> => {
      if (storageMode === "cloud") {
        const run = await startCloudRun(
          assignmentId ? { assignmentId } : { templateId }
        );
        await refreshData();
        return run;
      }

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
    [storageMode, customChecklists, runs, settings.employeeName, refreshData]
  );

  const startAssignment = useCallback(
    async (assignmentId: string) => {
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
      if (storageMode === "cloud") return;

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
    [storageMode, customChecklists, settings.employeeName]
  );

  const removeTaskCompletion = useCallback(
    (runId: string, itemId: string) => {
      if (storageMode === "cloud") return;

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
    },
    [storageMode]
  );

  const getEmployees = useCallback((): AppEmployee[] => {
    if (storageMode === "cloud") {
      return cloudEmployees.map((employee) => ({
        id: employee.id,
        email: employee.email,
        name: employee.name,
        locationName: employee.locationName,
        jobTitle: employee.jobTitle ?? undefined,
      }));
    }
    return getDemoEmployees();
  }, [storageMode, cloudEmployees]);

  const getTeamMembers = useCallback((): AppEmployee[] => {
    if (storageMode === "cloud") {
      return cloudTeamMembers.map((member) => ({
        id: member.id,
        email: member.email,
        name: member.name,
        locationName: member.locationName,
        jobTitle: member.jobTitle ?? undefined,
        role: member.role,
      }));
    }
    return demoUsers.map((u) => ({
      email: u.email,
      name: u.name,
      locationName: u.locationName,
      jobTitle: u.jobTitle,
      role: u.role,
    }));
  }, [storageMode, cloudTeamMembers]);

  const inviteTeamMember = useCallback(
    async (input: {
      name: string;
      email: string;
      jobTitle?: string;
      role?: "ADMIN" | "EMPLOYEE";
      locationName?: string;
    }) => {
      if (storageMode !== "cloud") {
        throw new Error("Team invites require cloud mode.");
      }
      const invite = await createCloudInvite(input);
      await refreshData();
      return invite;
    },
    [storageMode, refreshData]
  );

  const addTeamMember = useCallback(
    async (input: {
      name: string;
      email: string;
      jobTitle?: string;
      role?: "ADMIN" | "EMPLOYEE";
      locationName?: string;
      password?: string;
    }) => {
      if (storageMode !== "cloud") {
        throw new Error("Adding team members requires cloud mode.");
      }
      const result = await createCloudTeamMember(input);
      await refreshData();
      return { tempPassword: result.tempPassword, message: result.message };
    },
    [storageMode, refreshData]
  );

  const removeTeamMember = useCallback(
    async (id: string) => {
      if (storageMode !== "cloud") return;
      await deactivateCloudTeamMember(id);
      await refreshData();
    },
    [storageMode, refreshData]
  );

  const cancelInviteFn = useCallback(
    async (id: string) => {
      if (storageMode !== "cloud") return;
      await cancelCloudInvite(id);
      await refreshData();
    },
    [storageMode, refreshData]
  );

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  }, []);

  const value = useMemo(
    () => ({
      storageMode,
      needsSeed,
      hydrated,
      settings: activeSettings,
      runs,
      customChecklists:
        storageMode === "cloud"
          ? cloudTemplates.filter((t) => t.isCustom)
          : customChecklists,
      assignments,
      isLoggedIn,
      login,
      logout,
      refreshData,
      updateSettings,
      startChecklist,
      startAssignment,
      completeTask,
      removeTaskCompletion,
      getRunById,
      getTemplateById,
      getAllTemplates: getAllTemplatesList,
      createChecklist,
      updateChecklist: updateChecklistFn,
      deleteChecklist: deleteChecklistFn,
      createAssignment: createAssignmentFn,
      getTeamMembers,
      pendingInvites,
      inviteTeamMember,
      addTeamMember,
      removeTeamMember,
      cancelInvite: cancelInviteFn,
      resetAllData,
      getEmployees,
    }),
    [
      storageMode,
      needsSeed,
      hydrated,
      activeSettings,
      runs,
      cloudTemplates,
      customChecklists,
      assignments,
      isLoggedIn,
      login,
      logout,
      refreshData,
      updateSettings,
      startChecklist,
      startAssignment,
      completeTask,
      removeTaskCompletion,
      getRunById,
      getTemplateById,
      getAllTemplatesList,
      createChecklist,
      updateChecklistFn,
      deleteChecklistFn,
      createAssignmentFn,
      getTeamMembers,
      pendingInvites,
      inviteTeamMember,
      addTeamMember,
      removeTeamMember,
      cancelInviteFn,
      resetAllData,
      getEmployees,
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
