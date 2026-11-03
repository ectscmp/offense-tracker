import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import { getMicrosoftAuthStatus, type MicrosoftProfileClaims } from "@/lib/auth-config";

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
