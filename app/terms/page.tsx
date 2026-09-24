import type { Metadata } from "next";
import Link from "next/link";
import { ContactLine, LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Terms of Service — NestMatch" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service">
      <p>By using NestMatch you agree to these terms. If you don&apos;t agree, please don&apos;t use the service.</p>

      <h2>What NestMatch is</h2>
      <p>
        NestMatch shows rental listings from third-party data providers, lets you save search profiles, and emails you
        when new listings match them. NestMatch is not a landlord, broker or agent and isn&apos;t part of any rental
        transaction.
      </p>

      <h2>Listing information</h2>
      <p>
        Listings, prices, availability and neighborhood details come from third parties and can be incomplete, out of
        date or wrong. Always confirm details directly with the landlord or listing agent before relying on them or
        paying anything.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You&apos;re responsible for activity on your account.</li>
        <li>
          Don&apos;t misuse the service: no automated scraping or bulk requests, no attempts to break or overload it,
          and no unlawful use.
        </li>
        <li>We may suspend accounts that break these terms.</li>
      </ul>

      <h2>No warranty</h2>
      <p>
        NestMatch is provided &ldquo;as is&rdquo;, without warranties of any kind. We don&apos;t guarantee it will be
        available, error-free, or that you&apos;ll find housing through it.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the extent the law allows, NestMatch isn&apos;t liable for indirect or consequential losses, or for losses
        arising from listing information or dealings with landlords or other third parties.
      </p>

      <h2>Privacy</h2>
      <p>
        How we handle your information is described in the{" "}
        <Link href="/privacy" className="text-brand hover:underline">
          Privacy Policy
        </Link>
        .
      </p>

      <h2>Changes</h2>
      <p>We may update these terms. The effective date above shows when they last changed.</p>

      <h2>Contact</h2>
      <p>
        <ContactLine />
      </p>
    </LegalPage>
  );
}
