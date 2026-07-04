import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "EMPLOYEE";
      locationName: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: "ADMIN" | "EMPLOYEE";
    locationName: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "ADMIN" | "EMPLOYEE";
    locationName: string;
  }
}

export {};
