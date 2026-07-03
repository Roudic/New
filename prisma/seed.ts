import { hashPassword } from "../src/lib/password";
import { prisma } from "../src/lib/prisma";
import { checklistTemplates } from "../src/lib/templates";

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
      name: "Maria Santos",
      role: "ADMIN",
      locationName: "Main Street Kitchen",
      passwordHash: await hashPassword("admin123"),
    },
  });

  const employees = await Promise.all([
    prisma.user.create({
      data: {
        email: "alex@store.com",
        name: "Alex Rivera",
        role: "EMPLOYEE",
        locationName: "Main Street Kitchen",
        passwordHash: await hashPassword("employee123"),
      },
    }),
    prisma.user.create({
      data: {
        email: "sam@store.com",
        name: "Sam Chen",
        role: "EMPLOYEE",
        locationName: "Main Street Kitchen",
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
    where: { name: "Kitchen Opening & Line Setup" },
  });
  const hotLine = await prisma.checklistTemplate.findFirst({
    where: { name: "Hot Line Temperature Check" },
  });
  const managerAudit = await prisma.checklistTemplate.findFirst({
    where: { name: "Manager Kitchen Walk-through" },
  });

  if (opening) {
    await prisma.assignment.create({
      data: {
        templateId: opening.id,
        assignedToId: employees[0].id,
        assignedById: admin.id,
        dueDate: new Date(),
        notes: "Opening shift — complete before lunch service.",
      },
    });
  }

  if (hotLine) {
    await prisma.assignment.create({
      data: {
        templateId: hotLine.id,
        assignedToId: employees[1].id,
        assignedById: admin.id,
        dueDate: new Date(),
        notes: "Lunch line temperature check.",
      },
    });
  }

  if (managerAudit) {
    await prisma.assignment.create({
      data: {
        templateId: managerAudit.id,
        assignedToId: employees[0].id,
        assignedById: admin.id,
        notes: "Daily manager walk-through.",
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
