import type { NextAuthConfig } from "next-auth";

// Edge-safe config: no providers/Prisma here, only what the middleware needs
// to decide whether a request is authorized. The Credentials provider (which
// touches Prisma) lives in auth.ts and is only loaded in the Node runtime.
export const authConfig: NextAuthConfig = {
  // Vercel serves requests through its own edge proxy, which changes the
  // Host header NextAuth sees. Without this, Auth.js rejects the request as
  // an untrusted host and the credentials sign-in silently fails.
  trustHost: true,
  pages: { signIn: "/admin/login" },
  providers: [],
  callbacks: {
    authorized: ({ auth, request }) => {
      const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
      const isLoginPage = request.nextUrl.pathname === "/admin/login";
      if (!isAdminRoute || isLoginPage) return true;
      return !!auth?.user;
    },
    jwt: ({ token, user }) => {
      if (user) token.id = user.id;
      return token;
    },
    session: ({ session, token }) => {
      if (session.user) session.user.id = token.id as string;
      return session;
    },
  },
};
