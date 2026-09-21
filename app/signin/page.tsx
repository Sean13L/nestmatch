"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Sign in</h1>

      <button
        onClick={() => signIn("google", { callbackUrl: "/" })}
        className="mb-4 w-full rounded-lg border border-slate-300 bg-white py-2.5 font-medium text-slate-700 hover:bg-slate-50"
      >
        Continue with Google
      </button>

      <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
        <div className="h-px flex-1 bg-slate-200" />
        or
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      {sent ? (
        <p className="text-sm text-slate-600">Check {email} for a sign-in link.</p>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await signIn("email", { email, redirect: false });
            setSent(true);
          }}
          className="space-y-3"
        >
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-brand py-2.5 font-medium text-white hover:bg-brand-dark"
          >
            Send magic link
          </button>
        </form>
      )}
    </div>
  );
}
