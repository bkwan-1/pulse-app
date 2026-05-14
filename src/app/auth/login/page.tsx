"use client";

import { useState } from "react";
import { Zap, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="currentColor"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleSignIn() {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
    // On success the browser is redirected by Supabase — no further action needed
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-primary)] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20">
            <Zap className="h-5 w-5 text-[var(--accent)]" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-semibold text-[var(--text-primary)]">Pulse</span>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] p-8">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-semibold text-[var(--text-primary)]">
              Sign in to Pulse
            </h1>
            <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
              Continue with your Google account to get started.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Google button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className={cn(
              "flex w-full items-center justify-center gap-3 rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors",
              "hover:bg-[var(--bg-tertiary)] hover:border-[var(--border-subtle)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
              "disabled:pointer-events-none disabled:opacity-50"
            )}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" />
            ) : (
              <GoogleIcon className="h-4 w-4" />
            )}
            {loading ? "Redirecting…" : "Continue with Google"}
          </button>

          {/* Fine print */}
          <p className="mt-5 text-center text-xs text-[var(--text-muted)]">
            By signing in you agree to our{" "}
            <a href="/terms" className="underline underline-offset-2 hover:text-[var(--text-secondary)] transition-colors">
              Terms
            </a>{" "}
            and{" "}
            <a href="/privacy" className="underline underline-offset-2 hover:text-[var(--text-secondary)] transition-colors">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
