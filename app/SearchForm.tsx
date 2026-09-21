"use client";

import { useState } from "react";
import type { Listing } from "@prisma/client";
import { ListingCard } from "@/components/ListingCard";

export function SearchForm() {
  const [loading, setLoading] = useState(false);
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const payload = {
      city: form.get("city") || undefined,
      country: form.get("country"),
      maxPrice: Number(form.get("maxPrice")),
      minBedrooms: form.get("minBedrooms") ? Number(form.get("minBedrooms")) : undefined,
      petFriendly: form.get("petFriendly") === "on",
    };

    try {
      const res = await fetch("/api/listings/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setListings(data.listings);
    } catch {
      setError("Something went wrong searching. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
        <div className="sm:col-span-1">
          <label className="mb-1 block text-xs font-medium text-slate-600">City</label>
          <input name="city" placeholder="e.g. Waterloo" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div className="sm:col-span-1">
          <label className="mb-1 block text-xs font-medium text-slate-600">Country</label>
          <input name="country" required defaultValue="US" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div className="sm:col-span-1">
          <label className="mb-1 block text-xs font-medium text-slate-600">Max price / month</label>
          <input name="maxPrice" type="number" required defaultValue={2000} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div className="sm:col-span-1">
          <label className="mb-1 block text-xs font-medium text-slate-600">Min bedrooms</label>
          <input name="minBedrooms" type="number" min={0} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        </div>
        <div className="flex items-end gap-2 sm:col-span-1">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input name="petFriendly" type="checkbox" className="h-4 w-4 rounded border-slate-300" />
            Pet friendly
          </label>
        </div>
        <div className="sm:col-span-2 lg:col-span-5">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-brand px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {loading ? "Searching…" : "Search listings"}
          </button>
        </div>
      </form>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {listings && (
        <div className="mt-6">
          <p className="mb-3 text-sm text-slate-500">{listings.length} listing(s) found</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
