import { Resend } from "resend";
import type { Listing, SearchProfile } from "@prisma/client";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function formatListingRow(listing: Listing): string {
  const price = new Intl.NumberFormat("en-US", { style: "currency", currency: listing.currency }).format(
    listing.price
  );
  return `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
        <a href="${listing.url}" style="font-weight:600;color:#1d4ed8;text-decoration:none;">${listing.title}</a><br/>
        <span style="color:#64748b;font-size:14px;">${listing.city ?? ""}${listing.region ? ", " + listing.region : ""} · ${price}/${listing.priceInterval}</span>
      </td>
    </tr>`;
}

/**
 * Sends one digest email per profile with its newly-matched listings.
 * No-ops (and logs) when RESEND_API_KEY isn't set — same "gracefully
 * degrade without a configured provider" pattern used elsewhere; the
 * matching job still records Match rows either way so nothing is lost
 * once email is configured.
 */
export async function sendMatchNotification(
  toEmail: string,
  profile: SearchProfile,
  listings: Listing[]
): Promise<boolean> {
  if (listings.length === 0) return false;

  if (!resend) {
    console.warn(
      `RESEND_API_KEY not set — skipping email for profile "${profile.name}" (${listings.length} new match(es)).`
    );
    return false;
  }

  const from = process.env.EMAIL_FROM ?? "NestMatch <notifications@nestmatch.app>";
  const rows = listings.map(formatListingRow).join("");

  await resend.emails.send({
    from,
    to: toEmail,
    subject: `${listings.length} new match${listings.length > 1 ? "es" : ""} for "${profile.name}"`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
        <h2 style="color:#0f172a;">New matches for "${profile.name}"</h2>
        <p style="color:#64748b;">These fit your saved search criteria and weren't there last time we checked.</p>
        <table style="width:100%;border-collapse:collapse;">${rows}</table>
        <p style="margin-top:24px;"><a href="${process.env.NEXTAUTH_URL ?? ""}/dashboard" style="color:#1d4ed8;">View all matches →</a></p>
      </div>
    `,
  });

  return true;
}
