import type { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "database" },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    EmailProvider({
      // Magic links via a direct Resend API call rather than nodemailer's
      // SMTP transport (sendVerificationRequest below is fully overridden,
      // so `server` is never used) — Resend's HTTP API is what the rest of
      // the app's transactional email already uses. `nodemailer` stays a
      // dependency only because next-auth's EmailProvider module has a
      // static import on it that the bundler needs to resolve.
      server: "",
      from: process.env.EMAIL_FROM ?? "NestMatch <notifications@nestmatch.app>",
      async sendVerificationRequest({ identifier, url, provider }) {
        if (!resend) {
          console.warn(`RESEND_API_KEY not set — cannot send magic link to ${identifier}. Link: ${url}`);
          return;
        }
        await resend.emails.send({
          from: provider.from as string,
          to: identifier,
          subject: "Sign in to NestMatch",
          html: `<p>Click below to sign in:</p><p><a href="${url}">Sign in to NestMatch</a></p><p>If you didn't request this, you can ignore this email.</p>`,
        });
      },
    }),
  ],
  pages: {
    signIn: "/signin",
  },
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
};
