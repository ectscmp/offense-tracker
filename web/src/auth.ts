import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { getMicrosoftAuthStatus, type MicrosoftProfileClaims } from "@/lib/auth-config";
import { normalizeDevAccount } from "@/lib/dev-account";
import { isDevAuthEnabled } from "@/lib/dev-auth";

const microsoft = getMicrosoftAuthStatus();
const providers = [];

if (microsoft.configured) {
  providers.push(
    MicrosoftEntraID({
      clientId: microsoft.clientId,
      clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
      issuer: microsoft.issuer,
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

if (isDevAuthEnabled()) {
  providers.push(
    Credentials({
      id: "dev",
      name: "Local development account",
      credentials: {
        email: { label: "Email", type: "email" },
        name: { label: "Name", type: "text" },
      },
      async authorize(credentials) {
        // Re-check at request time in case this module is evaluated in a build
        // that is later served in production.
        if (!isDevAuthEnabled()) return null;

        const account = normalizeDevAccount(credentials);
        return { id: account.email, email: account.email, name: account.name };
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
  // AUTH_URL may point at a deployed origin even during local development.
  // Keep dev cookies usable on http://localhost instead of requiring __Secure-
  // cookies. Production builds always use secure cookies.
  useSecureCookies: process.env.NODE_ENV === "production",
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === "dev") return isDevAuthEnabled();
      if (account?.provider !== "microsoft-entra-id") return true;

      const microsoftProfile = profile as MicrosoftProfileClaims | undefined;
      if (!microsoftProfile) return false;
      if (
        microsoft.tenantRestricted &&
        microsoftProfile.tid?.toLowerCase() !== microsoft.tenantId.toLowerCase()
      ) {
        console.warn("[auth] Denied sign-in: account tenant does not match the configured tenant.");
        return false;
      }
      return Boolean(
        microsoftProfile.email ||
          microsoftProfile.preferred_username ||
          microsoftProfile.upn,
      );
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.teacherEmail = user.email;
        token.teacherName = user.name;
      }
      if (account?.provider) token.authProvider = account.provider;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // Defense in depth: a dev-issued JWT must never authenticate a
        // production build, even if AUTH_SECRET was reused by mistake.
        if (token.authProvider === "dev" && !isDevAuthEnabled()) {
          session.user.email = "";
          session.user.name = "";
        } else {
          session.user.email = (token.teacherEmail as string | undefined) ?? session.user.email;
          session.user.name = (token.teacherName as string | undefined) ?? session.user.name;
        }
      }
      return session;
    },
  },
});
