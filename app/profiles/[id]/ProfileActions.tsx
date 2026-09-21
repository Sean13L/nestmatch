"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ProfileActions({ profileId, active }: { profileId: string; active: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggleActive() {
    setBusy(true);
    await fetch(`/api/profiles/${profileId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    setBusy(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm("Delete this profile and its match history? This can't be undone.")) return;
    setBusy(true);
    await fetch(`/api/profiles/${profileId}`, { method: "DELETE" });
    router.push("/profiles");
    router.refresh();
  }

  return (
    <div className="flex shrink-0 gap-2">
      <button
        onClick={toggleActive}
        disabled={busy}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60"
      >
        {active ? "Pause" : "Resume"}
      </button>
      <button
        onClick={remove}
        disabled={busy}
        className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
      >
        Delete
      </button>
    </div>
  );
}
