import { execSync } from "child_process";
import { NextResponse } from "next/server";
import { getDatabaseHint, prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { checklistTemplates } from "@/lib/templates";

export const dynamic = "force-dynamic";

function ensureSchema() {
  try {
    execSync("npx prisma db push --skip-generate --accept-data-loss", {
      env: process.env,
      stdio: "pipe",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Schema push failed";
    throw new Error(message);
  }
}

async function countUsersSafely() {
  try {
    return await prisma.user.count();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("no such table")) {
      ensureSchema();
      return await prisma.user.count();
    }
    throw error;
  }
}

export async function POST(request: Request) {
  const secret = request.headers.get("x-setup-secret");
  if (!secret || secret !== process.env.SETUP_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const configError = getDatabaseHint();
  if (configError) {
    return NextResponse.json({ error: configError }, { status: 503 });
  }

  try {
    const existingUsers = await countUsersSafely();
    if (existingUsers > 0) {
      return NextResponse.json(
        { error: "Database already seeded", users: existingUsers },
        { status: 409 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: "Could not prepare database schema.",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }

  const admin = await prisma.user.create({
    data: {
      email: "admin@joltcheck.com",
      name: "Admin Manager",
      role: "ADMIN",
      locationName: "HQ Operations",
      passwordHash: await hashPassword("admin123"),
    },
  });

  const employees = await Promise.all([
    prisma.user.create({
      data: {
        email: "alex@store.com",
        name: "Alex Rivera",
        role: "EMPLOYEE",
        locationName: "Main Street Location",
        passwordHash: await hashPassword("employee123"),
      },
    }),
    prisma.user.create({
      data: {
        email: "sam@store.com",
        name: "Sam Chen",
        role: "EMPLOYEE",
        locationName: "Main Street Location",
        passwordHash: await hashPassword("employee123"),
      },
    }),
  ]);

  for (const template of checklistTemplates) {
    await prisma.checklistTemplate.create({
      data: {
        name: template.name,
        description: template.description,
        category: template.category,
        schedule: template.schedule,
        estimatedMinutes: template.estimatedMinutes,
        isBuiltIn: true,
        items: {
          create: template.items.map((item, index) => ({
            title: item.title,
            description: item.description,
            type: item.type,
            required: item.required,
            minTemp: item.minTemp,
            maxTemp: item.maxTemp,
            trainingNote: item.trainingNote,
            sortOrder: index,
          })),
        },
      },
    });
  }

  const opening = await prisma.checklistTemplate.findFirst({
    where: { name: "Store Opening" },
  });
  const closing = await prisma.checklistTemplate.findFirst({
    where: { name: "Store Closing" },
  });

  if (opening) {
    await prisma.assignment.create({
      data: {
        templateId: opening.id,
        assignedToId: employees[0].id,
        assignedById: admin.id,
        dueDate: new Date(),
        notes: "Complete before doors open.",
      },
    });
  }

  if (closing) {
    await prisma.assignment.create({
      data: {
        templateId: closing.id,
        assignedToId: employees[1].id,
        assignedById: admin.id,
        dueDate: new Date(),
        notes: "End of shift closing checklist.",
      },
    });
  }

  return NextResponse.json({
    ok: true,
    message: "Database seeded successfully",
    accounts: {
      admin: "admin@joltcheck.com / admin123",
      employees: "alex@store.com, sam@store.com / employee123",
    },
  });
}
