import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact - Flowz",
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8 md:px-6 md:py-12">
      <div>
        <Link
          href="/settings"
          className="mb-4 inline-flex items-center gap-1 text-xs text-muted hover:text-on-surface"
        >
          ← Back to Settings
        </Link>
        <h1 className="text-lg font-bold text-on-base">Contact & Support</h1>
      </div>

      <div className="space-y-4">
        <ContactCard
          title="Email"
          description="For bug reports, feature requests, or general questions."
          action={
            <a
              href="mailto:support@spotube.app"
              className="text-sm text-accent underline hover:text-accent-hover"
            >
              support@spotube.app
            </a>
          }
        />

        <ContactCard
          title="Bug Reports"
          description="Found something broken? Include steps to reproduce and what device you are using."
          action={
            <a
              href="mailto:support@spotube.app?subject=Bug%20Report"
              className="text-sm text-accent underline hover:text-accent-hover"
            >
              Report a bug
            </a>
          }
        />

        <ContactCard
          title="Data Access Requests"
          description="Because all your data stays on your device, no personal data is stored by us. If you have questions, reach out via email."
          action={
            <a
              href="mailto:support@spotube.app?subject=Privacy%20Question"
              className="text-sm text-accent underline hover:text-accent-hover"
            >
              Ask a privacy question
            </a>
          }
        />
      </div>

      <div className="rounded-xl bg-elevated p-4">
        <h2 className="text-sm font-semibold text-on-surface">Response Time</h2>
        <p className="mt-1 text-xs text-muted">
          We aim to respond within 48 hours on business days.
        </p>
      </div>
    </div>
  );
}

function ContactCard({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-elevated p-4">
      <h2 className="text-sm font-semibold text-on-surface">{title}</h2>
      <p className="mt-1 text-xs text-muted">{description}</p>
      <div className="mt-2">{action}</div>
    </div>
  );
}
