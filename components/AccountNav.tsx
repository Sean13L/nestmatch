"use client";

import { signIn, signOut, useSession } from "next-auth/react";

export function AccountNav() {
  const { data: session, status } = useSession();

  if (status === "loading") return null;

  if (!session) {
    return (
      <button
        onClick={() => signIn()}
        className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-dark"
      >
        Sign in
      </button>
    );
  }

  return (
    <button onClick={() => signOut()} className="text-sm text-slate-500 hover:text-slate-900">
      Sign out
    </button>
  );
}
