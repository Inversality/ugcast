import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "./prisma";
import { UserService } from "./services/user";

export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
        // Applies any due monthly refresh and returns both buckets. The Navbar
        // shows `credits` = total spendable (allowance + top-ups).
        const balance = await UserService.getBalance(user.id);
        session.user.credits = balance.total;
        session.user.allowanceCredits = balance.credits;
        session.user.topupCredits = balance.topupCredits;
        session.user.unlimited = balance.unlimited || false; // founder = unlimited usage
        session.user.plan = user.plan || null;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
};

export default authOptions;

