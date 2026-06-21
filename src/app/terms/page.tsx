import type { Metadata } from "next";
import { LegalShell } from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Terms of Service - Flowz",
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updated="June 20, 2026">
      <Section title="Acceptance">
        <p>
          By using Flowz, you agree to these terms. If you do not agree, do
          not use the app.
        </p>
      </Section>

      <Section title="Description of Service">
        <p>
          Flowz is a music player that lets you search for songs, save them to
          a local library, and download audio for offline playback. All data is
          stored on your device. No accounts are created on any server.
        </p>
      </Section>

      <Section title="Third-Party APIs">
        <p>
          Flowz interfaces with third-party services including the YouTube Data
          API v3 (using a user-provided key) and publicly available JioSaavn
          endpoints. You are responsible for complying with the terms of service
          of each third-party service you use through Flowz.
        </p>
      </Section>

      <Section title="User Responsibilities">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            You must provide your own YouTube Data API key for search
            functionality.
          </li>
          <li>
            You are responsible for maintaining the confidentiality of your
            on-device account credentials.
          </li>
          <li>
            You agree not to use Flowz to infringe on any copyrights or
            intellectual property rights.
          </li>
          <li>
            You agree not to reverse-engineer, modify, or distribute altered
            versions of the app.
          </li>
        </ul>
      </Section>

      <Section title="Intellectual Property">
        <p>
            The Flowz name, logo, and app design are the property of the app
            developer. The app software is provided for personal, non-commercial
            use. Music content accessed through the app is the property of its
            respective owners.
        </p>
      </Section>

      <Section title="Disclaimer of Warranties">
        <p>
          Flowz is provided &quot;as is&quot; without warranty of any kind,
          express or implied. We do not guarantee that the app will be
          uninterrupted, error-free, or that third-party APIs will remain
          available.
        </p>
      </Section>

      <Section title="Limitation of Liability">
        <p>
          To the maximum extent permitted by law, the developers of Flowz
          shall not be liable for any indirect, incidental, special, or
          consequential damages arising from your use of the app, including but
          not limited to downtime, data loss, or third-party API unavailability.
        </p>
      </Section>

      <Section title="Changes to Terms">
        <p>
          We reserve the right to update these terms at any time. The updated
          date at the top of this page reflects the latest revision. Continued
          use of the app after changes constitutes acceptance of the new terms.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          For questions about these terms, please reach out via the{" "}
          <a href="/contact" className="text-accent underline hover:text-accent-hover">
            Contact page
          </a>
          .
        </p>
      </Section>
    </LegalShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-on-surface">{title}</h2>
      <div className="text-sm leading-relaxed text-muted">{children}</div>
    </section>
  );
}
