import Link from "next/link";
import { Zap } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="mx-auto max-w-3xl px-6 py-16">

        {/* Nav */}
        <div className="mb-12 flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)]">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <Link href="/" className="text-sm font-semibold hover:text-[var(--accent)] transition-colors">
            Pulse
          </Link>
          <span className="text-[var(--text-muted)]">/</span>
          <span className="text-sm text-[var(--text-muted)]">Terms of Service</span>
        </div>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-3">Terms of Service</h1>
          <p className="text-sm text-[var(--text-muted)]">Last updated: May 13, 2026</p>
        </div>

        <div className="space-y-8 text-[var(--text-secondary)] leading-relaxed">

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using Pulse, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the service. These terms apply to all users of Pulse.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">2. Description of Service</h2>
            <p>Pulse is a student productivity application that helps you manage academic tasks, generate study schedules, track focus sessions, and gain insights into your workload. The service uses AI (Google Gemini) to generate schedules and provide recommendations.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">3. User Accounts</h2>
            <p>You must sign in with a Google account to use Pulse. You are responsible for maintaining the security of your account and for all activity that occurs under your account. You must be at least 13 years old to use this service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">4. Acceptable Use</h2>
            <p className="mb-2">You agree not to misuse Pulse. Prohibited activities include:</p>
            <ul className="list-disc list-inside space-y-1 text-[var(--text-muted)]">
              <li>Attempting to access other users&apos; data</li>
              <li>Using the service for any unlawful purpose</li>
              <li>Uploading malicious files or content</li>
              <li>Attempting to reverse engineer or scrape the service</li>
              <li>Abusing the AI features to generate harmful content</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">5. AI-Generated Content</h2>
            <p>Pulse uses Google Gemini to generate study schedules, extract tasks from syllabi, and provide burnout insights. AI-generated content is provided for informational purposes only. We do not guarantee the accuracy, completeness, or suitability of any AI-generated output. You should review all AI suggestions before acting on them.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">6. Data and Privacy</h2>
            <p>Your use of Pulse is also governed by our <Link href="/privacy" className="underline underline-offset-2 hover:text-[var(--accent)] transition-colors">Privacy Policy</Link>, which is incorporated into these Terms by reference.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">7. Intellectual Property</h2>
            <p>Pulse and its original content, features, and functionality are owned by the developers of Pulse. The content you create within Pulse (tasks, notes, schedules) remains yours. You grant Pulse a limited license to store and process your content solely to provide the service.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">8. Disclaimers</h2>
            <p>Pulse is provided &quot;as is&quot; without warranties of any kind. We do not guarantee that the service will be uninterrupted, error-free, or that AI-generated schedules will improve your academic performance. Use of Pulse is at your own risk.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">9. Limitation of Liability</h2>
            <p>To the fullest extent permitted by law, Pulse and its developers shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the service, including but not limited to missed deadlines or academic outcomes.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">10. Changes to Terms</h2>
            <p>We may update these Terms from time to time. We will notify you of significant changes by updating the date at the top of this page. Continued use of Pulse after changes constitutes acceptance of the updated Terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">11. Contact</h2>
            <p>If you have questions about these Terms, please contact us at <a href="mailto:brandonkyvr@gmail.com" className="underline underline-offset-2 hover:text-[var(--accent)] transition-colors">brandonkyvr@gmail.com</a>.</p>
          </section>

        </div>

        {/* Footer nav */}
        <div className="mt-16 pt-8 border-t border-[var(--border-subtle)] flex gap-6 text-sm text-[var(--text-muted)]">
          <Link href="/" className="hover:text-[var(--text-secondary)] transition-colors">← Back to home</Link>
          <Link href="/privacy" className="hover:text-[var(--text-secondary)] transition-colors">Privacy Policy</Link>
        </div>

      </div>
    </div>
  );
}
