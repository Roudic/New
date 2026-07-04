import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma, getDatabaseHint } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

if (!process.env.NEXTAUTH_SECRET) {
  console.error(
    "NEXTAUTH_SECRET is missing. Authentication will fail until it is configured."
  );
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const configError = getDatabaseHint();
        if (configError) {
          console.error(configError);
          throw new Error(configError);
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email.toLowerCase().trim() },
          });

          if (!user) return null;

          const valid = await verifyPassword(
            credentials.password,
            user.passwordHash
          );
          if (!valid) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role as "ADMIN" | "EMPLOYEE",
            locationName: user.locationName,
          };
        } catch (error) {
          console.error("Login database error:", error);
          throw new Error(
            "Database connection failed. Check DATABASE_URL and run db:push + db:seed."
          );
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.locationName = user.locationName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "EMPLOYEE";
        session.user.locationName = token.locationName as string;
      }
      return session;
    },
  },
};
