import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";
import { checklistTemplates } from "../src/lib/templates";

const prisma = new PrismaClient();

async function main() {
  await prisma.taskCompletion.deleteMany();
  await prisma.checklistRun.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.checklistItem.deleteMany();
  await prisma.checklistTemplate.deleteMany();
  await prisma.user.deleteMany();

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

  console.log("Seed complete.");
  console.log("Admin: admin@joltcheck.com / admin123");
  console.log("Employees: alex@store.com, sam@store.com / employee123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
