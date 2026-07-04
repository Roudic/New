import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) return auth.error;

  const [employees, assignments, runs, templates] = await Promise.all([
    prisma.user.findMany({
      where: { role: "EMPLOYEE" },
      select: { id: true, name: true, email: true, locationName: true },
      orderBy: { name: "asc" },
    }),
    prisma.assignment.findMany({
      include: {
        assignedTo: { select: { id: true, name: true } },
        template: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.checklistRun.findMany({
      include: {
        user: { select: { name: true } },
        template: { select: { name: true } },
      },
      orderBy: { startedAt: "desc" },
      take: 20,
    }),
    prisma.checklistTemplate.count(),
  ]);

  const pending = assignments.filter((a) => a.status === "PENDING").length;
  const inProgress = assignments.filter((a) => a.status === "IN_PROGRESS").length;
  const completed = assignments.filter((a) => a.status === "COMPLETED").length;
  const completedRuns = runs.filter((r) => r.status === "COMPLETED").length;

  const employeeStats = await Promise.all(
    employees.map(async (employee) => {
      const employeeAssignments = await prisma.assignment.findMany({
        where: { assignedToId: employee.id },
      });
      const done = employeeAssignments.filter((a) => a.status === "COMPLETED").length;
      const total = employeeAssignments.length;
      return {
        ...employee,
        assigned: total,
        completed: done,
        completionRate: total === 0 ? 0 : Math.round((done / total) * 100),
      };
    })
  );

  return NextResponse.json({
    totals: {
      employees: employees.length,
      templates,
      pending,
      inProgress,
      completed,
      completedRuns,
    },
    employeeStats,
    recentAssignments: assignments.slice(0, 8).map((a) => ({
      id: a.id,
      templateName: a.template.name,
      assigneeName: a.assignedTo.name,
      status: a.status.toLowerCase(),
      dueDate: a.dueDate?.toISOString(),
      createdAt: a.createdAt.toISOString(),
    })),
    recentRuns: runs.slice(0, 8).map((r) => ({
      id: r.id,
      templateName: r.template.name,
      userName: r.user.name,
      status: r.status.toLowerCase(),
      startedAt: r.startedAt.toISOString(),
      completedAt: r.completedAt?.toISOString(),
    })),
  });
}
