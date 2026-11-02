import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { getMicrosoftAuthStatus } from "@/lib/auth-config";

const microsoft = getMicrosoftAuthStatus();
const providers = [];

if (microsoft.configured) {
  providers.push(
    MicrosoftEntraID({
      clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
      authorization: {
        params: {
          scope: "openid profile email",
          prompt: "select_account",
        },
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email || profile.preferred_username,
        };
      },
    }),
  );
}

if (microsoft.devAuthEnabled) {
  providers.push(
    Credentials({
      id: "dev",
      name: "Development sign-in",
      credentials: {},
      async authorize() {
        return {
          id: "dev-teacher",
          name: "Ms. Rivera",
          email: "rivera@northside.edu",
        };
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "microsoft-entra-id") return true;

      const microsoftProfile = profile as
        | { tid?: string; email?: string; preferred_username?: string }
        | undefined;
      if (microsoft.tenantRestricted && microsoftProfile?.tid !== microsoft.tenantId) {
        return false;
      }
      return Boolean(microsoftProfile?.email || microsoftProfile?.preferred_username);
    },
    async jwt({ token, user }) {
      if (user) {
        token.teacherEmail = user.email;
        token.teacherName = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = (token.teacherEmail as string | undefined) ?? session.user.email;
        session.user.name = (token.teacherName as string | undefined) ?? session.user.name;
      }
      return session;
    },
  },
});
