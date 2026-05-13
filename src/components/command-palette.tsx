"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Command } from "cmdk";
import {
  Search,
  LayoutDashboard,
  CalendarDays,
  CheckSquare,
  BarChart3,
  Brain,
  Settings,
  PlusCircle,
  CalendarClock,
  Sparkles,
  Timer,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

/* ─── types ─────────────────────────────────────────────────────── */

interface CommandPaletteProps {
  user: User | null;
}

interface RecentTask {
  id: string;
  title: string;
  course: string | null;
}

/* ─── static data ───────────────────────────────────────────────── */

const NAV_ITEMS = [
  { label: "Dashboard",  icon: LayoutDashboard, href: "/dashboard" },
  { label: "Schedule",   icon: CalendarDays,    href: "/dashboard/schedule" },
  { label: "Tasks",      icon: CheckSquare,     href: "/dashboard/tasks" },
  { label: "Analytics",  icon: BarChart3,       href: "/dashboard/analytics" },
  { label: "Focus",      icon: Brain,           href: "/dashboard/focus" },
  { label: "Settings",   icon: Settings,        href: "/dashboard/settings" },
] as const;

const ACTION_ITEMS: {
  label: string;
  icon: React.ElementType;
  href: string | null;
}[] = [
  { label: "Add task",          icon: PlusCircle,    href: "/dashboard/tasks?new=true" },
  { label: "Generate schedule", icon: CalendarClock, href: "/dashboard/schedule?generate=true" },
  { label: "Replan my life",    icon: Sparkles,      href: null },
  { label: "Start focus mode",  icon: Timer,         href: "/dashboard/focus" },
];

/* ─── animation ─────────────────────────────────────────────────── */

const EASE = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const overlayVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
  exit:    { opacity: 0, transition: { duration: 0.12 } },
};

const dialogVariants = {
  hidden:  { opacity: 0, scale: 0.96, y: -6 },
  visible: { opacity: 1, scale: 1,    y: 0,  transition: { duration: 0.18, ease: EASE } },
  exit:    { opacity: 0, scale: 0.96, y: -6, transition: { duration: 0.14, ease: EASE } },
};

/* ─── shared item component ─────────────────────────────────────── */

function PaletteItem({
  label,
  icon: Icon,
  onSelect,
}: {
  label: string;
  icon: React.ElementType;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={label}
      onSelect={onSelect}
      className={cn(
        "group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
        "text-[var(--text-secondary)] outline-none transition-colors",
        "data-[selected=true]:bg-[var(--accent)]/[0.1] data-[selected=true]:text-[var(--text-primary)]"
      )}
    >
      <Icon className="h-4 w-4 shrink-0 text-[var(--text-muted)] group-data-[selected=true]:text-[var(--accent)]" />
      <span className="flex-1">{label}</span>
      <kbd className="text-[10px] text-[var(--text-muted)] opacity-0 transition-opacity group-data-[selected=true]:opacity-60">
        ↵
      </kbd>
    </Command.Item>
  );
}

/* ─── main component ─────────────────────────────────────────────── */

export function CommandPalette({ user }: CommandPaletteProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);

  /* Cmd+K toggle */
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  /* Fetch recent tasks when user is available */
  useEffect(() => {
    if (!user) return;
    createClient()
      .from("tasks")
      .select("id,title,course")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3)
      .then(({ data }) => setRecentTasks((data ?? []) as RecentTask[]));
  }, [user]);

  function runItem(href: string | null) {
    setOpen(false);
    if (href) router.push(href);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="palette-overlay"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 pt-[15vh] backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <motion.div
            variants={dialogVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="w-full max-w-lg overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Command
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpen(false);
              }}
              className={cn(
                "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-3",
                "[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold",
                "[&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest",
                "[&_[cmdk-group-heading]]:text-[var(--text-muted)]"
              )}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-3">
                <Search className="h-4 w-4 shrink-0 text-[var(--text-muted)]" />
                <Command.Input
                  placeholder="Search or jump to…"
                  className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
                />
              </div>

              {/* Results */}
              <Command.List className="max-h-80 overflow-y-auto p-2">
                <Command.Empty className="py-8 text-center text-sm text-[var(--text-muted)]">
                  No results found.
                </Command.Empty>

                {/* Navigation */}
                <Command.Group heading="Navigation">
                  {NAV_ITEMS.map(({ label, icon, href }) => (
                    <PaletteItem
                      key={href}
                      label={label}
                      icon={icon}
                      onSelect={() => runItem(href)}
                    />
                  ))}
                </Command.Group>

                {/* Quick Actions */}
                <Command.Group heading="Quick Actions">
                  {ACTION_ITEMS.map(({ label, icon, href }) => (
                    <PaletteItem
                      key={label}
                      label={label}
                      icon={icon}
                      onSelect={() => runItem(href)}
                    />
                  ))}
                </Command.Group>

                {/* Recent Tasks — only shown when data exists */}
                {recentTasks.length > 0 && (
                  <Command.Group heading="Recent Tasks">
                    {recentTasks.map((task) => (
                      <Command.Item
                        key={task.id}
                        value={task.title}
                        onSelect={() => runItem(`/dashboard/tasks?id=${task.id}`)}
                        className={cn(
                          "group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
                          "text-[var(--text-secondary)] outline-none transition-colors",
                          "data-[selected=true]:bg-[var(--accent)]/[0.1] data-[selected=true]:text-[var(--text-primary)]"
                        )}
                      >
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--text-muted)] group-data-[selected=true]:text-[var(--accent)]" />
                        <span className="flex-1 truncate">{task.title}</span>
                        {task.course && (
                          <span className="shrink-0 text-[10px] text-[var(--text-muted)]">
                            {task.course}
                          </span>
                        )}
                        <kbd className="text-[10px] text-[var(--text-muted)] opacity-0 transition-opacity group-data-[selected=true]:opacity-60">
                          ↵
                        </kbd>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </Command.List>

              {/* Footer hints */}
              <div className="flex items-center justify-between border-t border-[var(--border-subtle)] px-4 py-2">
                <span className="text-[10px] text-[var(--text-muted)]">
                  ↑↓ navigate · ↵ select · Esc close
                </span>
                <kbd className="rounded bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
                  ⌘K
                </kbd>
              </div>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
