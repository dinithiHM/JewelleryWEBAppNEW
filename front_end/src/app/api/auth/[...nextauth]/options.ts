// Minimal Next-Auth configuration to prevent client-side errors
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize() {
        // Return null to indicate we're not using Next-Auth for authentication
        return null;
      }
    })
  ],
  // Disable sessions since we're using our own auth system
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  // Custom pages
  pages: {
    signIn: '/login',
    error: '/login',
  },
  // Disable callbacks
  callbacks: {
    async session() {
      return { user: null, expires: "" };
    },
    async jwt() {
      return { token: {} };
    }
  }
};
