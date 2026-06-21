import type { Metadata } from "next";
import { LegalShell } from "@/components/LegalShell";

export const metadata: Metadata = {
  title: "Privacy Policy - Flowz",
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="June 20, 2026">
      <Section title="Data Collection">
        <p>
          Flowz does <strong>not</strong> collect, store, transmit, or share
          any personal data. There is no backend server, no database, and no
          analytics SDK. All information you enter — your username, password,
          saved songs, playlists, and downloaded audio — stays exclusively on
          your device inside your browser&apos;s local storage and IndexedDB.
        </p>
      </Section>

      <Section title="Account Data">
        <p>
          Your username and a salted SHA-256 hash of your password are stored in
          your browser&apos;s localStorage. This data never leaves your device.
          You can delete your account at any time from the Settings screen,
          which erases all stored data.
        </p>
      </Section>

      <Section title="YouTube Data API">
        <p>
          Flowz can use the YouTube Data API v3 to search for music. You
          provide your own API key, which is stored locally on your device. All
          search requests are made directly from your device to YouTube&apos;s
          servers and are subject to{" "}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">
            Google&apos;s Privacy Policy
          </a>
          . We do not have access to your key or your search history.
        </p>
      </Section>

      <Section title="JioSaavn & Lyrics APIs">
        <p>
          Audio playback uses publicly available JioSaavn endpoints. Lyrics are
          fetched from public APIs (LRCLib, BetterLyrics, Kugou, Paxsenix).
          These requests are made directly from your device. No identifying
          information is sent with these requests.
        </p>
      </Section>

      <Section title="Microphone Permission">
        <p>
          The Shazam-style music identification feature requests microphone
          access. Audio captured by the microphone is processed entirely
          on-device and is never transmitted to any server. You can deny this
          permission and still use all other features of the app.
        </p>
      </Section>

      <Section title="Third-Party Services">
        <p>
          Flowz links to external services such as the Google Cloud Console
          for obtaining a YouTube API key. These services have their own privacy
          policies, and we encourage you to review them.
        </p>
      </Section>

      <Section title="Your Rights">
        <p>
          Because Flowz does not collect or store any of your data on a
          server, there is no personal data for us to provide, modify, or
          delete upon request. All your data is on your device and under your
          full control. You can clear it at any time via the app settings or by
          clearing your browser&apos;s site data.
        </p>
      </Section>

      <Section title="Changes">
        <p>
          If this policy changes, the updated date at the top of this page will
          be revised. Continued use of the app after changes constitutes
          acceptance of the updated policy.
        </p>
      </Section>

      <Section title="Contact">
        <p>
          If you have questions about this privacy policy, please reach out via
          the{" "}
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
