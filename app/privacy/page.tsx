import type { Metadata } from "next";
import { ContactLine, LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = { title: "Privacy Policy — NestMatch" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        NestMatch helps you search for housing, save what you&apos;re looking for, and get emailed when new listings
        match. This page explains what information NestMatch handles and why.
      </p>

      <h2>Information we collect</h2>
      <ul>
        <li>
          <strong>Account details.</strong> When you sign in with Google, Google shares your name, email address and
          profile picture with us. When you sign in with an email link, we receive your email address.
        </li>
        <li>
          <strong>What you save.</strong> Your search profiles (location, budget, move-in dates, amenities and other
          preferences) and the listings matched to them.
        </li>
        <li>
          <strong>A sign-in cookie.</strong> Used only to keep you signed in. NestMatch has no advertising or analytics
          cookies.
        </li>
        <li>
          <strong>Technical logs.</strong> Our hosting provider keeps standard request logs (such as IP address and
          time of request) for security and troubleshooting.
        </li>
      </ul>

      <h2>Information from Google</h2>
      <p>
        We only use the name, email address and profile picture Google provides at sign-in, to identify your account
        and to email you about matches. NestMatch does not request access to your Gmail, Calendar, Drive, contacts or
        any other Google data.
      </p>

      <h2>How we use it</h2>
      <ul>
        <li>To sign you in and keep your saved profiles tied to your account.</li>
        <li>To run your saved searches on a schedule and email you new matches.</li>
        <li>To send sign-in links when you choose email sign-in.</li>
      </ul>
      <p>We don&apos;t sell your information or use it for advertising.</p>

      <h2>Who we share it with</h2>
      <p>Only the service providers NestMatch runs on, and only as needed to operate it:</p>
      <ul>
        <li>Vercel (hosting) and Neon (database), which store and serve the app and your data.</li>
        <li>Resend, which delivers sign-in and match emails to your address.</li>
        <li>Google, for &ldquo;Sign in with Google&rdquo;.</li>
        <li>
          Listing and map data providers (RentCast, Google Maps Platform). They receive the area you search in and
          listing locations, never your name or email address.
        </li>
      </ul>
      <p>We may also disclose information if required by law.</p>

      <h2>Keeping and deleting your data</h2>
      <p>
        We keep your account and saved profiles until you delete them. You can delete any search profile yourself
        (along with its matches) from its page. To delete your whole account and everything tied to it, email{" "}
        <ContactLine /> from the address you sign in with.
      </p>

      <h2>Children</h2>
      <p>NestMatch isn&apos;t intended for anyone under 13, and we don&apos;t knowingly collect their information.</p>

      <h2>Changes</h2>
      <p>If this policy changes, we&apos;ll update it here and change the effective date above.</p>

      <h2>Contact</h2>
      <p>
        Questions about privacy: <ContactLine />.
      </p>
    </LegalPage>
  );
}
