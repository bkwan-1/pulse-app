"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Zap,
  LayoutDashboard,
  CalendarDays,
  CheckSquare,
  BarChart3,
  Brain,
  Settings,
  LogOut,
  CalendarClock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/lib/supabase/client";
import { CommandPalette } from "@/components/command-palette";

/* ─── constants ─────────────────────────────────────────────────── */

const EASE = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const NAV = [
  { href: "/dashboard",              icon: LayoutDashboard, label: "Dashboard"  },
  { href: "/dashboard/schedule",     icon: CalendarDays,    label: "Schedule"   },
  { href: "/dashboard/activities",   icon: CalendarClock,   label: "Activities" },
  { href: "/dashboard/tasks",        icon: CheckSquare,     label: "Tasks"      },
  { href: "/dashboard/analytics",    icon: BarChart3,       label: "Analytics"  },
  { href: "/dashboard/focus",        icon: Brain,           label: "Focus"      },
  { href: "/dashboard/settings",     icon: Settings,        label: "Settings"   },
] as const;

const TAB_BAR = NAV.filter((n) =>
  [
    "/dashboard",
    "/dashboard/schedule",
    "/dashboard/tasks",
    "/dashboard/focus",
    "/dashboard/settings",
  ].includes(n.href)
);

/* ─── helpers ───────────────────────────────────────────────────── */

function getInitials(raw: string): string {
  const parts = raw.trim().split(/\s+/);
  return parts
    .map((p) => p[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";
}

/* ─── layout ────────────────────────────────────────────────────── */

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email ??
    "";
  const initials = getInitials(displayName);
  const email = user?.email ?? "";
  const shortName = displayName.split(" ")[0] || email.split("@")[0];

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)]">
      {/* ── Desktop sidebar ──────────────────────────────────────── */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.35, ease: EASE }}
        className="hidden w-60 shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-secondary)] md:flex"
      >
        {/* Logo */}
        <div className="flex h-14 items-center gap-2 border-b border-[var(--border-subtle)] px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)]/10 border border-[var(--accent)]/20">
            <Zap className="h-4 w-4 text-[var(--accent)]" strokeWidth={2.5} />
          </div>
          <span className="text-sm font-semibold text-[var(--text-primary)]">Pulse</span>
        </div>

        {/* Nav */}
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
          {NAV.map(({ href, icon: Icon, label }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm transition-colors",
                  active
                    ? "bg-[var(--accent)]/[0.12] font-medium text-[var(--accent)]"
                    : "text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
                  )}
                />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="border-t border-[var(--border-subtle)] p-3">
          <div className="flex items-center gap-2.5">
            {/* Avatar */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/20 text-xs font-semibold text-[var(--accent)]">
              {initials}
            </div>
            {/* Name + email */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                {shortName || "—"}
              </p>
              <p className="truncate text-xs text-[var(--text-muted)]">{email}</p>
            </div>
            {/* Sign out */}
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="shrink-0 rounded-md p-1 text-[var(--text-muted)] transition-colors hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.aside>

      {/* ── Main content ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1, ease: EASE }}
        className="flex flex-1 flex-col overflow-hidden"
      >
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18, ease: EASE }}
              className="p-6"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </motion.div>

      {/* ── Command palette ──────────────────────────────────────── */}
      <CommandPalette user={user} />

      {/* ── Mobile bottom tab bar ────────────────────────────────── */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-around border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]/90 px-2 backdrop-blur-md md:hidden">
        {TAB_BAR.map(({ href, icon: Icon, label }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors",
                active ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
