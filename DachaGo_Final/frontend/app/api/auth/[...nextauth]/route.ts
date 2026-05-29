import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AppleProvider from "next-auth/providers/apple";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    AppleProvider({
      clientId: process.env.APPLE_ID || "",
      clientSecret: process.env.APPLE_SECRET || "",
    }),
    CredentialsProvider({
      name: "DachaGo Account",
      credentials: {
        email_or_phone: { label: "Email or Phone", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          const res = await fetch("http://localhost:5000/api/login", {
            method: 'POST',
            body: JSON.stringify(credentials),
            headers: { "Content-Type": "application/json" }
          });
          const user = await res.json();

          if (res.ok && user) {
            return user;
          } else {
            // Forward the error message from the backend
            throw new Error(user.error || "Ошибка входа");
          }
        } catch (e: any) {
          throw new Error(e.message || "Ошибка сервера");
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: '/auth',
    error: '/auth', // Redirect back to auth page on error
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google' || account?.provider === 'apple') {
        try {
          const res = await fetch("http://localhost:5000/api/auth/social", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: user.email,
              name: user.name,
              avatar: user.image,
              provider: account.provider,
              provider_id: account.providerAccountId,
            })
          });
          const data = await res.json();
          if (res.ok) {
            user.id = data.id; // Sync unique ID from our DB
            return true;
          }
          return false;
        } catch (e) {
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.phone = (user as any).phone;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).phone = token.phone;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || "dacha-go-super-secret-2026",
});

export { handler as GET, handler as POST };
