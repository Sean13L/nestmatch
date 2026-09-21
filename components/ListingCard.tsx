import Link from "next/link";
import type { Listing } from "@prisma/client";

function formatPrice(listing: Pick<Listing, "price" | "currency" | "priceInterval">) {
  const amount = new Intl.NumberFormat(undefined, { style: "currency", currency: listing.currency, maximumFractionDigits: 0 }).format(
    listing.price
  );
  return `${amount}/${listing.priceInterval}`;
}

export function ListingCard({ listing, score }: { listing: Listing; score?: number }) {
  return (
    <Link href={`/listings/${listing.id}`} className="card block p-4 transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-slate-900">{listing.title}</h3>
          <p className="text-sm text-slate-500">
            {[listing.city, listing.region, listing.country].filter(Boolean).join(", ")}
          </p>
        </div>
        {score != null && (
          <span className="tag shrink-0">{Math.round(score * 100)}% match</span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
        <span className="font-medium text-slate-900">{formatPrice(listing)}</span>
        {listing.bedrooms != null && <span>{listing.bedrooms} bd</span>}
        {listing.bathrooms != null && <span>{listing.bathrooms} ba</span>}
        {listing.rating != null && (
          <span>
            ★ {listing.rating.toFixed(1)} {listing.reviewCount ? `(${listing.reviewCount})` : ""}
          </span>
        )}
      </div>

      {listing.amenities.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {listing.amenities.slice(0, 5).map((a) => (
            <span key={a} className="tag">
              {a.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs uppercase tracking-wide text-slate-400">via {listing.source}</p>
    </Link>
  );
}
