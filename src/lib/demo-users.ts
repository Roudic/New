export type DemoRole = "ADMIN" | "EMPLOYEE";

export interface DemoUser {
  email: string;
  password: string;
  name: string;
  role: DemoRole;
  locationName: string;
  jobTitle?: string;
}

export const demoUsers: DemoUser[] = [
  {
    email: "admin@joltcheck.com",
    password: "admin123",
    name: "Maria Santos",
    role: "ADMIN",
    locationName: "Main Street Kitchen",
    jobTitle: "Kitchen Manager",
  },
  {
    email: "alex@store.com",
    password: "employee123",
    name: "Alex Rivera",
    role: "EMPLOYEE",
    locationName: "Main Street Kitchen",
    jobTitle: "Line Cook",
  },
  {
    email: "sam@store.com",
    password: "employee123",
    name: "Sam Chen",
    role: "EMPLOYEE",
    locationName: "Main Street Kitchen",
    jobTitle: "Prep Cook",
  },
];

export function findDemoUser(email: string, password: string): DemoUser | null {
  const normalized = email.toLowerCase().trim();
  return (
    demoUsers.find(
      (user) =>
        user.email === normalized && user.password === password
    ) ?? null
  );
}

export function getDemoEmployees(): DemoUser[] {
  return demoUsers.filter((user) => user.role === "EMPLOYEE");
}
