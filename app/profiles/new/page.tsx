"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const AMENITY_OPTIONS = [
  "gym",
  "in_unit_laundry",
  "parking",
  "wifi_included",
  "furnished",
  "pool",
  "study_room",
  "ac",
  "dishwasher",
];

export default function NewProfilePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [amenities, setAmenities] = useState<string[]>([]);

  function toggleAmenity(a: string) {
    setAmenities((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const payload = {
      name: form.get("name"),
      city: form.get("city") || undefined,
      region: form.get("region") || undefined,
      country: form.get("country"),
      radiusKm: Number(form.get("radiusKm") || 10),
      minPrice: form.get("minPrice") ? Number(form.get("minPrice")) : undefined,
      maxPrice: Number(form.get("maxPrice")),
      currency: form.get("currency") || "USD",
      minBedrooms: form.get("minBedrooms") ? Number(form.get("minBedrooms")) : undefined,
      minBathrooms: form.get("minBathrooms") ? Number(form.get("minBathrooms")) : undefined,
      moveInEarliest: form.get("moveInEarliest") || undefined,
      moveInLatest: form.get("moveInLatest") || undefined,
      amenities,
      petFriendly: form.get("petFriendly") === "on",
      studentFriendly: form.get("studentFriendly") === "on",
      minRating: form.get("minRating") ? Number(form.get("minRating")) : undefined,
    };

    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/signin");
          return;
        }
        throw new Error("Failed to save");
      }
      const data = await res.json();
      router.push(`/profiles/${data.profile.id}`);
    } catch {
      setError("Couldn't save this profile. Check the required fields and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">New search profile</h1>
      <form onSubmit={handleSubmit} className="card space-y-5 p-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Profile name</label>
          <input name="name" required placeholder="e.g. Fall semester apartment" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">City</label>
            <input name="city" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Region / State</label>
            <input name="region" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Country</label>
            <input name="country" required defaultValue="US" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Min price</label>
            <input name="minPrice" type="number" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Max price</label>
            <input name="maxPrice" type="number" required defaultValue={2000} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Currency</label>
            <input name="currency" defaultValue="USD" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Min bedrooms</label>
            <input name="minBedrooms" type="number" min={0} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Min bathrooms</label>
            <input name="minBathrooms" type="number" min={0} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Search radius (km)</label>
            <input name="radiusKm" type="number" defaultValue={10} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Move in earliest</label>
            <input name="moveInEarliest" type="date" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Move in by</label>
            <input name="moveInLatest" type="date" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Amenities</label>
          <div className="flex flex-wrap gap-2">
            {AMENITY_OPTIONS.map((a) => (
              <button
                type="button"
                key={a}
                onClick={() => toggleAmenity(a)}
                className={`tag border ${amenities.includes(a) ? "border-brand bg-brand/10 text-brand-dark" : "border-slate-200 bg-slate-50 text-slate-500"}`}
              >
                {a.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input name="petFriendly" type="checkbox" className="h-4 w-4 rounded border-slate-300" />
            Pet friendly required
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input name="studentFriendly" type="checkbox" className="h-4 w-4 rounded border-slate-300" />
            Near campus / student-friendly
          </label>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            Min rating
            <input name="minRating" type="number" min={0} max={5} step={0.1} className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm" />
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
        >
          {submitting ? "Saving…" : "Save profile"}
        </button>
      </form>
    </div>
  );
}
