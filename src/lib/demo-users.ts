export type DemoRole = "ADMIN" | "EMPLOYEE";

export interface DemoUser {
  email: string;
  password: string;
  name: string;
  role: DemoRole;
  locationName: string;
}

export const demoUsers: DemoUser[] = [
  {
    email: "admin@joltcheck.com",
    password: "admin123",
    name: "Admin Manager",
    role: "ADMIN",
    locationName: "HQ Operations",
  },
  {
    email: "alex@store.com",
    password: "employee123",
    name: "Alex Rivera",
    role: "EMPLOYEE",
    locationName: "Main Street Location",
  },
  {
    email: "sam@store.com",
    password: "employee123",
    name: "Sam Chen",
    role: "EMPLOYEE",
    locationName: "Main Street Location",
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
