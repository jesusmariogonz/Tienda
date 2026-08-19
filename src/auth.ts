import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  debug: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      authorize: async (credentials) => {
        try {
          const email = credentials?.email as string | undefined;
          const password = credentials?.password as string | undefined;
          if (!email || !password) {
            console.error("[auth] missing email or password in credentials");
            return null;
          }

          const user = await prisma.user.findUnique({ where: { email } });
          if (!user) {
            console.error("[auth] no user found for email:", email);
            return null;
          }

          const valid = await bcrypt.compare(password, user.passwordHash);
          if (!valid) {
            console.error("[auth] password mismatch for email:", email);
            return null;
          }

          return { id: user.id, email: user.email, name: user.name };
        } catch (err) {
          console.error("[auth] authorize threw:", err);
          throw err;
        }
      },
    }),
  ],
});
