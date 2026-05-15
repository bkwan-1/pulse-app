"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Sunrise, Sun, Moon } from "lucide-react";
import { toast } from "sonner";
import { Button, Input, Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/lib/supabase/client";

/* ─── constants ──────────────────────────────────────────────────── */

const EDUCATION_LEVELS = [
  "Freshman",
  "Sophomore",
  "Junior",
  "Senior",
  "Graduate",
  "Other",
];

const PEAK_OPTIONS = [
  { id: "morning",   icon: <Sunrise className="h-5 w-5" />, label: "Morning",   sub: "6am – 12pm" },
  { id: "afternoon", icon: <Sun     className="h-5 w-5" />, label: "Afternoon", sub: "12pm – 6pm" },
  { id: "night",     icon: <Moon    className="h-5 w-5" />, label: "Night",     sub: "6pm – 2am" },
];

const selectCls =
  "h-10 w-full appearance-none rounded-lg border border-[var(--border-default)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]";

/* ─── section label ──────────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
      {children}
    </p>
  );
}

/* ─── page ───────────────────────────────────────────────────────── */

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useUser();

  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const [profile, setProfile] = useState({
    school_name:     "",
    education_level: "",
    sleep_goal:      7,
    peak_hours:      [] as string[],
  });

  /* ── fetch profile ────────────────────────────────────────────── */
  useEffect(() => {
    if (!user) return;
    createClient()
      .from("user_profiles")
      .select("school_name,education_level,sleep_goal,peak_hours")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfile({
            school_name:     (data.school_name     as string)   ?? "",
            education_level: (data.education_level as string)   ?? "",
            sleep_goal:      (data.sleep_goal      as number)   ?? 7,
            peak_hours:      (data.peak_hours      as string[]) ?? [],
          });
        }
        setLoading(false);
      });
  }, [user]);

  /* ── helpers ──────────────────────────────────────────────────── */

  function togglePeak(id: string) {
    setProfile((p) => ({
      ...p,
      peak_hours: p.peak_hours.includes(id)
        ? p.peak_hours.filter((h) => h !== id)
        : [...p.peak_hours, id],
    }));
  }

  /* ── save ─────────────────────────────────────────────────────── */

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    const { error } = await createClient().from("user_profiles").upsert({
      user_id: user.id,
      ...profile,
    });
    setSaving(false);
    if (error) toast.error("Failed to save settings.");
    else toast.success("Settings saved.");
  }

  /* ── sign out ─────────────────────────────────────────────────── */

  async function handleSignOut() {
    setSigningOut(true);
    await createClient().auth.signOut();
    toast.success("Signed out.");
    router.push("/auth/login");
  }

  /* ── slider fill percentage ───────────────────────────────────── */

  const sleepPct = ((profile.sleep_goal - 4) / (10 - 4)) * 100;

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      {/* header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Settings</h1>
        <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
          Manage your profile and study preferences.
        </p>
      </div>

      {/* ── Profile ─────────────────────────────────────────────── */}
      <section>
        <SectionLabel>Profile</SectionLabel>
        {loading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <Input
              label="School or university"
              placeholder="e.g. MIT"
              value={profile.school_name}
              onChange={(e) =>
                setProfile((p) => ({ ...p, school_name: e.target.value }))
              }
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--text-primary)]">
                Education level
              </label>
              <div className="relative">
                <select
                  value={profile.education_level}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, education_level: e.target.value }))
                  }
                  className={cn(selectCls, "pr-9")}
                >
                  <option value="">Select level</option>
                  {EDUCATION_LEVELS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="border-t border-[var(--border-subtle)]" />

      {/* ── Study preferences ───────────────────────────────────── */}
      <section>
        <SectionLabel>Study preferences</SectionLabel>
        {loading ? (
          <div className="flex flex-col gap-6">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* sleep goal */}
            <div>
              <div className="mb-3 flex items-baseline justify-between">
                <label className="text-sm font-medium text-[var(--text-primary)]">
                  Sleep goal
                </label>
                <span className="text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
                  {profile.sleep_goal}<span className="ml-1 text-sm font-normal text-[var(--text-secondary)]">hrs</span>
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="w-full">
                  <input
                    type="range"
                    min={4}
                    max={10}
                    step={1}
                    value={profile.sleep_goal}
                    onChange={(e) =>
                      setProfile((p) => ({ ...p, sleep_goal: Number(e.target.value) }))
                    }
                    className="w-full cursor-pointer"
                    style={{
                      accentColor: "var(--accent)",
                      background: `linear-gradient(to right, var(--accent) ${sleepPct}%, var(--surface) ${sleepPct}%)`,
                      height: "6px",
                      borderRadius: "9999px",
                      outline: "none",
                      appearance: "none",
                      WebkitAppearance: "none",
                    }}
                  />
                  <div className="mt-1.5 flex justify-between text-xs text-[var(--text-muted)]">
                    <span>4h</span>
                    <span>10h</span>
                  </div>
                </div>
              </div>
            </div>

            {/* peak hours */}
            <div>
              <label className="mb-3 block text-sm font-medium text-[var(--text-primary)]">
                Peak productivity hours
              </label>
              <div className="grid grid-cols-3 gap-3">
                {PEAK_OPTIONS.map(({ id, icon, label, sub }) => {
                  const selected = profile.peak_hours.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => togglePeak(id)}
                      className={cn(
                        "flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                        selected
                          ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text-primary)]"
                          : "border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--surface)]"
                      )}
                    >
                      <span className={cn("transition-colors", selected ? "text-[var(--accent)]" : "text-[var(--text-muted)]")}>
                        {icon}
                      </span>
                      <span className="text-sm font-medium">{label}</span>
                      <span className="text-xs opacity-60">{sub}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>

      <div className="border-t border-[var(--border-subtle)]" />

      {/* ── Account ─────────────────────────────────────────────── */}
      <section>
        <SectionLabel>Account</SectionLabel>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3">
            <span className="text-xs text-[var(--text-muted)]">Email</span>
            <span className="text-sm text-[var(--text-secondary)]">
              {user?.email ?? "—"}
            </span>
          </div>
          <Button
            variant="secondary"
            size="md"
            className="w-fit"
            loading={signingOut}
            onClick={handleSignOut}
          >
            {!signingOut && <LogOut className="h-4 w-4" />}
            Sign out
          </Button>
        </div>
      </section>

      {/* ── Save button ──────────────────────────────────────────── */}
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        loading={saving}
        disabled={loading}
        onClick={handleSave}
      >
        Save settings
      </Button>
    </div>
  );
}
