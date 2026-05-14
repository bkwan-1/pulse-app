"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  ListTodo,
  Timer,
  Flame,
  Activity,
  Sparkles,
  Zap,
  Check,
  CheckCircle2,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { Button, Card, Badge, Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/lib/supabase/client";

/* ─── types ─────────────────────────────────────────────────────── */

interface StatData {
  tasksThisWeek: number;
  hoursToday: number;
  streak: number;
  workloadLevel: string;
}

interface ScheduleEvent {
  id: string;
  title: string;
  type: "class" | "study" | "focus" | string;
  start_time: string;
  duration_minutes: number;
}

interface Deadline {
  id: string;
  title: string;
  course: string;
  due_date: string;
}

interface ChartPoint {
  day: string;
  hours: number;
}

/* ─── animation constants ────────────────────────────────────────── */

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

/* ─── replan steps ───────────────────────────────────────────────── */

const REPLAN_STEPS = [
  "Reading your deadlines…",
  "Analyzing workload…",
  "Optimizing your schedule…",
  "Done!",
];

/* ─── helpers ───────────────────────────────────────────────────── */

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86_400_000);
}

function daysLabel(n: number): string {
  if (n <= 0) return "Today";
  if (n === 1) return "Tomorrow";
  return `${n} days`;
}

function deadlineBadge(n: number): "destructive" | "warning" | "default" {
  if (n <= 1) return "destructive";
  if (n <= 3) return "warning";
  return "default";
}

function workloadBadge(
  level: string
): "success" | "warning" | "destructive" | "default" {
  const l = level.toLowerCase();
  if (l === "low") return "success";
  if (l === "moderate") return "warning";
  if (l === "high" || l === "critical") return "destructive";
  return "default";
}

function formatTime(time: string): string {
  const [hStr, mStr] = time.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, "0")}${suffix}`;
}

function typeDot(type: string) {
  const cls =
    type === "class"
      ? "bg-violet-500"
      : type === "focus"
      ? "bg-blue-400"
      : "bg-indigo-400";
  return <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", cls)} />;
}

function typeBadge(type: string) {
  if (type === "class") return <Badge variant="violet">Class</Badge>;
  if (type === "focus") return <Badge variant="success">Focus</Badge>;
  return <Badge variant="default">Study</Badge>;
}

function buildChartData(
  sessions: { date: string; duration_hours: number }[]
): ChartPoint[] {
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86_400_000);
    const iso = d.toISOString().split("T")[0];
    const hours = sessions
      .filter((s) => s.date === iso)
      .reduce((acc, s) => acc + (s.duration_hours ?? 0), 0);
    return { day: DAY_NAMES[d.getDay()], hours: Math.round(hours * 10) / 10 };
  });
}

function sumTodayHours(
  sessions: { date: string; duration_hours: number }[],
  today: string
): number {
  return sessions
    .filter((s) => s.date === today)
    .reduce((acc, s) => acc + (s.duration_hours ?? 0), 0);
}

/* ─── confirmation modal ─────────────────────────────────────────── */

function ConfirmModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      key="confirm-overlay"
      variants={overlayVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <motion.div
        variants={dialogVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* icon */}
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--accent)]/20 bg-[var(--accent)]/10">
          <Sparkles className="h-6 w-6 text-[var(--accent)]" />
        </div>

        <h2 className="text-lg font-semibold text-[var(--text-primary)]">
          Rebuild your week?
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          Pulse will re-analyse your deadlines and generate a fresh, optimised
          schedule for the next 7 days.
        </p>

        <div className="mt-6 flex gap-3">
          <Button
            variant="secondary"
            size="md"
            className="flex-1"
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            className="flex-1"
            onClick={onConfirm}
          >
            Replan
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─── fullscreen replan overlay ──────────────────────────────────── */

function ReplanOverlay({ step }: { step: number }) {
  return (
    <motion.div
      key="replan-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-10 bg-[var(--bg-primary)]"
    >
      {/* pulsing logo */}
      <motion.div
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/10"
      >
        <Zap className="h-8 w-8 text-[var(--accent)]" strokeWidth={2.5} />
      </motion.div>

      {/* animated steps */}
      <div className="flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {REPLAN_STEPS.map((label, i) => {
            if (i > step) return null;
            const isPast    = i < step;
            const isCurrent = i === step;
            const isDone    = i === 3 && step === 3;

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: EASE }}
                className={cn(
                  "flex items-center gap-3",
                  isPast && "opacity-40"
                )}
              >
                {/* icon column */}
                <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                  {isPast ? (
                    <Check className="h-4 w-4 text-green-400" />
                  ) : isDone ? (
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  ) : (
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" />
                  )}
                </div>

                {/* label */}
                <span
                  className={cn(
                    "text-sm font-medium",
                    isPast && "line-through text-[var(--text-muted)]",
                    isCurrent && !isDone && "text-[var(--text-primary)]",
                    isDone && "text-lg font-semibold text-green-400"
                  )}
                >
                  {label}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ─── stat card ──────────────────────────────────────────────────── */

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--text-muted)]">{label}</span>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--bg-tertiary)]">
          {icon}
        </div>
      </div>
      <div>
        <p className="text-2xl font-semibold tabular-nums text-[var(--text-primary)]">
          {value}
        </p>
        {sub && <div className="mt-1.5">{sub}</div>}
      </div>
    </Card>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value?: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-2 text-xs shadow-lg">
      <p className="font-medium text-[var(--text-primary)]">{label}</p>
      <p className="text-[var(--text-secondary)]">{payload[0].value}h focus</p>
    </div>
  );
}

/* ─── page ───────────────────────────────────────────────────────── */

const DEFAULT_STATS: StatData = {
  tasksThisWeek: 0,
  hoursToday: 0,
  streak: 0,
  workloadLevel: "—",
};

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StatData>(DEFAULT_STATS);
  const [schedule, setSchedule] = useState<ScheduleEvent[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);

  // replan state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [replanning, setReplanning] = useState(false);
  const [replanStep, setReplanStep] = useState(-1);

  useEffect(() => {
    if (!user) return;

    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 6 * 86_400_000).toISOString().split("T")[0];
    const weekEnd = new Date(Date.now() + 7 * 86_400_000).toISOString().split("T")[0];

    Promise.all([
      supabase
        .from("tasks")
        .select("id,title,course,due_date")
        .eq("user_id", user.id)
        .neq("status", "done")
        .gte("due_date", today)
        .lte("due_date", weekEnd)
        .order("due_date"),
      supabase
        .from("user_profiles")
        .select("streak,workload_level")
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("schedule_events")
        .select("id,title,type,start_time,duration_minutes")
        .eq("user_id", user.id)
        .eq("date", today)
        .order("start_time"),
      supabase
        .from("focus_sessions")
        .select("date,duration_hours")
        .eq("user_id", user.id)
        .gte("date", weekAgo)
        .lte("date", today),
    ]).then(([tasksRes, profileRes, scheduleRes, sessionsRes]) => {
      const tasks = tasksRes.data ?? [];
      const sessions = sessionsRes.data ?? [];

      setDeadlines(tasks.slice(0, 5) as Deadline[]);
      setSchedule((scheduleRes.data ?? []) as ScheduleEvent[]);
      setChartData(buildChartData(sessions));
      setStats({
        tasksThisWeek: tasks.length,
        hoursToday: Math.round(sumTodayHours(sessions, today) * 10) / 10,
        streak: profileRes.data?.streak ?? 0,
        workloadLevel: profileRes.data?.workload_level ?? "—",
      });
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [user]);

  async function handleReplan() {
    setConfirmOpen(false);
    setReplanning(true);
    setReplanStep(0);

    const advance = (to: number, delayMs: number) =>
      new Promise<void>((res) => setTimeout(() => { setReplanStep(to); res(); }, delayMs));

    try {
      // API call and animation steps 0→2 run in parallel
      const [apiData] = await Promise.all([
        fetch("/api/generate-schedule", { method: "POST" }).then((r) => r.json()),
        advance(1, 800).then(() => advance(2, 800)),
      ]);

      if (apiData?.error) throw new Error(apiData.error);

      // Step 3: Done!
      setReplanStep(3);
      await new Promise((r) => setTimeout(r, 700));

      router.push("/dashboard/schedule");
      toast.success("Schedule rebuilt.", {
        description: "Your week has been replanned.",
      });
    } catch (e) {
      setReplanning(false);
      setReplanStep(-1);
      toast.error(e instanceof Error ? e.message : "Replan failed. Try again.");
    }
  }

  const greeting = getGreeting();
  const firstName =
    (user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    user?.email?.split("@")[0] ??
    "there";

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          Good {greeting}, {firstName} 👋
        </h1>
        <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
          Here&apos;s what&apos;s on your plate today.
        </p>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            icon={<ListTodo className="h-4 w-4 text-[var(--text-secondary)]" />}
            label="Tasks this week"
            value={stats.tasksThisWeek}
          />
          <StatCard
            icon={<Timer className="h-4 w-4 text-[var(--text-secondary)]" />}
            label="Hours today"
            value={stats.hoursToday}
          />
          <StatCard
            icon={<Flame className="h-4 w-4 text-[var(--text-secondary)]" />}
            label="Day streak"
            value={stats.streak}
          />
          <StatCard
            icon={<Activity className="h-4 w-4 text-[var(--text-secondary)]" />}
            label="Workload"
            value={stats.workloadLevel}
            sub={
              stats.workloadLevel !== "—" ? (
                <Badge variant={workloadBadge(stats.workloadLevel)}>
                  {stats.workloadLevel}
                </Badge>
              ) : undefined
            }
          />
        </div>
      )}

      {/* ── Middle row ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Today's Schedule — 60% */}
        <Card className="flex flex-col p-0 lg:w-[60%]">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Today&apos;s Schedule
            </h2>
            <span className="text-xs text-[var(--text-muted)]">{todayLabel}</span>
          </div>
          <div className="flex flex-col divide-y divide-[var(--border-subtle)] px-5">
            {loading ? (
              <div className="flex flex-col gap-3 py-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : schedule.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--text-muted)]">
                No events scheduled for today.
              </p>
            ) : (
              schedule.map((ev) => (
                <div key={ev.id} className="flex items-start gap-3 py-3">
                  {typeDot(ev.type)}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                      {ev.title}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {formatTime(ev.start_time)}
                      {ev.duration_minutes ? ` · ${ev.duration_minutes}min` : ""}
                    </p>
                  </div>
                  {typeBadge(ev.type)}
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Upcoming Deadlines — 40% */}
        <Card className="flex flex-col p-0 lg:w-[40%]">
          <div className="border-b border-[var(--border-subtle)] px-5 py-4">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Upcoming Deadlines
            </h2>
          </div>
          <div className="flex flex-col divide-y divide-[var(--border-subtle)] px-5">
            {loading ? (
              <div className="flex flex-col gap-3 py-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : deadlines.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--text-muted)]">
                No upcoming deadlines.
              </p>
            ) : (
              deadlines.map((dl) => {
                const n = daysUntil(dl.due_date);
                return (
                  <div key={dl.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      {dl.course && (
                        <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                          {dl.course}
                        </p>
                      )}
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                        {dl.title}
                      </p>
                    </div>
                    <Badge variant={deadlineBadge(n)} className="shrink-0">
                      {daysLabel(n)}
                    </Badge>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* ── Chart ───────────────────────────────────────────────── */}
      <Card className="p-5">
        <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
          Focus hours this week
        </h2>
        {loading ? (
          <Skeleton className="h-[220px] w-full rounded-xl" />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={chartData}
              barSize={28}
              margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
            >
              <CartesianGrid vertical={false} stroke="var(--border-subtle)" />
              <XAxis
                dataKey="day"
                tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ fill: "var(--surface)" }}
              />
              <Bar dataKey="hours" fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* ── Floating FAB ─────────────────────────────────────────── */}
      <button
        onClick={() => setConfirmOpen(true)}
        className="fixed bottom-24 right-6 z-40 flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-3 text-sm font-medium text-white shadow-[0_4px_24px_rgba(124,58,237,0.35)] transition-all hover:scale-105 hover:bg-[var(--accent)]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] md:bottom-8"
        aria-label="Replan my schedule"
      >
        <Sparkles className="h-4 w-4" />
        Replan my life
      </button>

      {/* ── Confirm modal ────────────────────────────────────────── */}
      <AnimatePresence>
        {confirmOpen && (
          <ConfirmModal
            onConfirm={handleReplan}
            onCancel={() => setConfirmOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Fullscreen replan overlay ─────────────────────────────── */}
      <AnimatePresence>
        {replanning && <ReplanOverlay step={replanStep} />}
      </AnimatePresence>
    </div>
  );
}
