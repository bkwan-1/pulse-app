import Link from "next/link";
import { Zap } from "lucide-react";

export default function PrivacyPage() {
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
          <span className="text-sm text-[var(--text-muted)]">Privacy Policy</span>
        </div>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-3">Privacy Policy</h1>
          <p className="text-sm text-[var(--text-muted)]">Last updated: May 13, 2026</p>
        </div>

        <div className="space-y-8 text-[var(--text-secondary)] leading-relaxed">

          <section>
            <p>Pulse is committed to protecting your privacy. This policy explains what data we collect, how we use it, and your rights regarding that data.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">1. Information We Collect</h2>
            <p className="mb-2">We collect the following information when you use Pulse:</p>
            <ul className="list-disc list-inside space-y-1 text-[var(--text-muted)]">
              <li><strong className="text-[var(--text-secondary)]">Account information</strong> — your name and email address from Google OAuth</li>
              <li><strong className="text-[var(--text-secondary)]">Profile data</strong> — school name, education level, sleep goal, peak study hours, and challenges you provide during onboarding</li>
              <li><strong className="text-[var(--text-secondary)]">Tasks</strong> — titles, due dates, subjects, priorities, and completion status</li>
              <li><strong className="text-[var(--text-secondary)]">Schedules</strong> — AI-generated study blocks saved to your calendar</li>
              <li><strong className="text-[var(--text-secondary)]">Focus sessions</strong> — duration and task associations of your Pomodoro/focus sessions</li>
              <li><strong className="text-[var(--text-secondary)]">Uploaded content</strong> — syllabi or text you paste into the AI intake feature (processed and not permanently stored)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">2. How We Use Your Information</h2>
            <p className="mb-2">Your data is used exclusively to provide and improve the Pulse service:</p>
            <ul className="list-disc list-inside space-y-1 text-[var(--text-muted)]">
              <li>Generating personalised study schedules based on your tasks and profile</li>
              <li>Displaying your analytics dashboard and workload trends</li>
              <li>Calculating burnout indicators and generating AI wellbeing feedback</li>
              <li>Syncing your data across devices</li>
            </ul>
            <p className="mt-2">We do not sell your data, use it for advertising, or share it with third parties except as described below.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">3. Data Storage (Supabase)</h2>
            <p>Your data is stored in a PostgreSQL database hosted by <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-[var(--accent)] transition-colors">Supabase</a>. Each user can only access their own data — enforced at the database level through Row Level Security policies. Supabase is SOC 2 Type II compliant.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">4. Google OAuth</h2>
            <p>Pulse uses Google OAuth for authentication. When you sign in, we receive your name, email address, and profile photo from Google. We do not receive access to your Google Drive, Gmail, or other Google services. Your Google credentials are managed by Supabase Auth and are never stored directly by Pulse.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">5. AI Processing (Google Gemini)</h2>
            <p>When you use AI features (schedule generation, syllabus extraction, burnout insights), your task data, profile, and any uploaded content are sent to Google Gemini&apos;s API for processing. This data is subject to <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-[var(--accent)] transition-colors">Google&apos;s Gemini API Terms of Service</a>. Uploaded syllabi and pasted text are sent to Gemini only at the moment of processing and are not stored beyond that request.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">6. Data Retention</h2>
            <p>Your data is retained for as long as your account is active. You can delete your tasks, focus sessions, and schedule data at any time through the app. To request full account deletion, contact us at the email below.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">7. Your Rights</h2>
            <p className="mb-2">You have the right to:</p>
            <ul className="list-disc list-inside space-y-1 text-[var(--text-muted)]">
              <li>Access the data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and data</li>
              <li>Export your data</li>
            </ul>
            <p className="mt-2">To exercise any of these rights, contact us at the email below.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">8. Cookies</h2>
            <p>Pulse uses session cookies managed by Supabase to keep you signed in. We do not use tracking cookies, advertising cookies, or third-party analytics cookies.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">9. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by updating the date at the top of this page. Continued use of Pulse after changes constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">10. Contact</h2>
            <p>If you have questions or concerns about this Privacy Policy, please contact us at <a href="mailto:brandonkyvr@gmail.com" className="underline underline-offset-2 hover:text-[var(--accent)] transition-colors">brandonkyvr@gmail.com</a>.</p>
          </section>

        </div>

        {/* Footer nav */}
        <div className="mt-16 pt-8 border-t border-[var(--border-subtle)] flex gap-6 text-sm text-[var(--text-muted)]">
          <Link href="/" className="hover:text-[var(--text-secondary)] transition-colors">← Back to home</Link>
          <Link href="/terms" className="hover:text-[var(--text-secondary)] transition-colors">Terms of Service</Link>
        </div>

      </div>
    </div>
  );
}
