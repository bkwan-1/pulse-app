"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/lib/supabase/client";

/* ─── types ──────────────────────────────────────────────────────── */

interface TaskRow {
  id: string;
  course: string | null;
  due_date: string | null;
  estimated_hours: number | null;
  status: string;
  created_at: string;
}

interface SessionRow {
  date: string;
  duration_hours: number;
}

interface ScheduleRow {
  duration: number;
  tasks: { course: string | null } | null;
}

interface BurnoutMetrics {
  score: number;
  overdueCount: number;
  totalTasks: number;
  completionRateThisWeek: number;
  completionRateLastWeek: number;
  avgDailyHours: number;
}

/* ─── constants ──────────────────────────────────────────────────── */

const HEAT_COLORS = [
  "bg-[var(--surface)]",
  "bg-violet-900/60",
  "bg-violet-700/70",
  "bg-violet-500/80",
  "bg-violet-400",
];

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

/* ─── date helpers ───────────────────────────────────────────────── */

function isoDate(d: Date) {
  return d.toISOString().split("T")[0];
}

function nWeeksAgo(n: number) {
  return isoDate(new Date(Date.now() - n * 7 * 86_400_000));
}

function weekLabel(weeksAgo: number): string {
  if (weeksAgo === 0) return "This wk";
  if (weeksAgo === 1) return "Last wk";
  return `${weeksAgo}w ago`;
}

function intensityBucket(hours: number): number {
  if (hours <= 0) return 0;
  if (hours <= 1) return 1;
  if (hours <= 2) return 2;
  if (hours <= 4) return 3;
  return 4;
}

/* ─── data transforms ────────────────────────────────────────────── */

function buildWorkloadHeat(sessions: SessionRow[]): number[][] {
  // [12][7] — weekIdx 0 = oldest, dayIdx 0 = Mon
  const grid: number[][] = Array.from({ length: 12 }, () => Array(7).fill(0));
  const today = new Date();
  sessions.forEach((s) => {
    const d = new Date(s.date + "T00:00:00");
    const daysAgo = Math.floor((today.getTime() - d.getTime()) / 86_400_000);
    if (daysAgo >= 84) return;
    const weekIdx = 11 - Math.floor(daysAgo / 7);
    const dayIdx = (d.getDay() + 6) % 7;
    grid[weekIdx][dayIdx] = (grid[weekIdx][dayIdx] ?? 0) + (s.duration_hours ?? 0);
  });
  return grid;
}

function buildFocusGrid(sessions: SessionRow[]): number[][] {
  // [7][7] — weekIdx 0 = oldest, dayIdx 0 = Mon
  const grid: number[][] = Array.from({ length: 7 }, () => Array(7).fill(0));
  const today = new Date();
  sessions.forEach((s) => {
    const d = new Date(s.date + "T00:00:00");
    const daysAgo = Math.floor((today.getTime() - d.getTime()) / 86_400_000);
    if (daysAgo >= 49) return;
    const weekIdx = 6 - Math.floor(daysAgo / 7);
    const dayIdx = (d.getDay() + 6) % 7;
    grid[weekIdx][dayIdx] = (grid[weekIdx][dayIdx] ?? 0) + (s.duration_hours ?? 0);
  });
  return grid;
}

function buildCompletionSeries(
  tasks: TaskRow[]
): { week: string; rate: number }[] {
  return Array.from({ length: 8 }, (_, i) => {
    const weeksAgo = 7 - i;
    const weekStart = new Date(Date.now() - (weeksAgo + 1) * 7 * 86_400_000);
    const weekEnd = new Date(Date.now() - weeksAgo * 7 * 86_400_000);
    const ws = isoDate(weekStart);
    const we = isoDate(weekEnd);
    const weekTasks = tasks.filter(
      (t) => t.due_date && t.due_date >= ws && t.due_date < we
    );
    const done = weekTasks.filter((t) => t.status === "done").length;
    const rate =
      weekTasks.length > 0 ? Math.round((done / weekTasks.length) * 100) : 0;
    return { week: weekLabel(weeksAgo), rate };
  });
}

function buildSubjectBars(
  tasks: TaskRow[],
  schedules: ScheduleRow[]
): { subject: string; estimated: number; scheduled: number }[] {
  const estMap: Record<string, number> = {};
  const schedMap: Record<string, number> = {};

  tasks.forEach((t) => {
    const key = t.course ?? "Other";
    estMap[key] = (estMap[key] ?? 0) + (t.estimated_hours ?? 0);
  });

  schedules.forEach((s) => {
    const key = s.tasks?.course ?? "Other";
    schedMap[key] = (schedMap[key] ?? 0) + (s.duration ?? 0);
  });

  return Object.entries(estMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([subject, estimated]) => ({
      subject: subject.length > 8 ? subject.slice(0, 7) + "…" : subject,
      estimated: Math.round(estimated * 10) / 10,
      scheduled: Math.round((schedMap[subject] ?? 0) * 10) / 10,
    }));
}

function calculateBurnout(
  tasks: TaskRow[],
  sessions: SessionRow[]
): BurnoutMetrics {
  const today = isoDate(new Date());
  const total = tasks.length;
  const overdue = tasks.filter(
    (t) => t.due_date && t.due_date < today && t.status !== "done"
  ).length;

  const thisWeekStart = nWeeksAgo(1);
  const lastWeekStart = nWeeksAgo(2);

  const thisWeekTasks = tasks.filter(
    (t) => t.due_date && t.due_date >= thisWeekStart && t.due_date < today
  );
  const lastWeekTasks = tasks.filter(
    (t) =>
      t.due_date &&
      t.due_date >= lastWeekStart &&
      t.due_date < thisWeekStart
  );

  const rateOf = (arr: TaskRow[]) =>
    arr.length > 0
      ? Math.round(
          (arr.filter((t) => t.status === "done").length / arr.length) * 100
        )
      : 0;

  const completionRateThisWeek = rateOf(thisWeekTasks);
  const completionRateLastWeek = rateOf(lastWeekTasks);

  const recent7 = sessions.filter((s) => s.date >= nWeeksAgo(1));
  const avgDailyHours =
    recent7.length > 0
      ? Math.round(
          (recent7.reduce((a, s) => a + (s.duration_hours ?? 0), 0) / 7) * 10
        ) / 10
      : 0;

  const overdueFactor = (overdue / Math.max(total, 1)) * 40;
  const trendDrop = Math.max(0, completionRateLastWeek - completionRateThisWeek);
  const trendFactor =
    (trendDrop / Math.max(completionRateLastWeek, 1)) * 30;
  const hoursFactor = Math.min(avgDailyHours / 8, 1) * 30;
  const score = Math.round(overdueFactor + trendFactor + hoursFactor);

  return {
    score: Math.min(score, 100),
    overdueCount: overdue,
    totalTasks: total,
    completionRateThisWeek,
    completionRateLastWeek,
    avgDailyHours,
  };
}

/* ─── burnout gauge ──────────────────────────────────────────────── */

function burnoutColor(score: number) {
  if (score < 26) return "#22c55e";
  if (score < 51) return "#eab308";
  if (score < 76) return "#f97316";
  return "#ef4444";
}

function burnoutLabel(score: number) {
  if (score < 26) return "Healthy";
  if (score < 51) return "Moderate";
  if (score < 76) return "High";
  return "Critical";
}

function BurnoutGauge({ score }: { score: number }) {
  const r = 60;
  const circ = Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color = burnoutColor(score);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 160 90" className="w-36">
        <path
          d="M 20 80 A 60 60 0 0 1 140 80"
          fill="none"
          stroke="var(--surface)"
          strokeWidth={14}
          strokeLinecap="round"
        />
        <path
          d="M 20 80 A 60 60 0 0 1 140 80"
          fill="none"
          stroke={color}
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
        />
        <text
          x="80"
          y="74"
          textAnchor="middle"
          fontSize={24}
          fontWeight={700}
          fill="var(--text-primary)"
        >
          {score}
        </text>
      </svg>
      <span className="text-sm font-semibold" style={{ color }}>
        {burnoutLabel(score)}
      </span>
    </div>
  );
}

/* ─── custom recharts tooltips ───────────────────────────────────── */

function CompletionTooltip({
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
      <p className="text-[var(--text-secondary)]">{payload[0].value}% completed</p>
    </div>
  );
}

function SubjectTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-[var(--text-primary)]">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {p.value}h
        </p>
      ))}
    </div>
  );
}

/* ─── page ───────────────────────────────────────────────────────── */

export default function AnalyticsPage() {
  const { user } = useUser();

  const [workloadGrid, setWorkloadGrid] = useState<number[][] | null>(null);
  const [completionSeries, setCompletionSeries] = useState<
    { week: string; rate: number }[] | null
  >(null);
  const [subjectBars, setSubjectBars] = useState<
    { subject: string; estimated: number; scheduled: number }[] | null
  >(null);
  const [focusGrid, setFocusGrid] = useState<number[][] | null>(null);
  const [burnout, setBurnout] = useState<BurnoutMetrics | null>(null);
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    Promise.all([
      supabase
        .from("tasks")
        .select("id,course,due_date,estimated_hours,status,created_at")
        .eq("user_id", user.id),
      supabase
        .from("focus_sessions")
        .select("date,duration_hours")
        .eq("user_id", user.id)
        .gte("date", nWeeksAgo(12)),
      supabase
        .from("schedules")
        .select("duration, tasks(course)")
        .eq("user_id", user.id),
    ]).then(([tasksRes, sessionsRes, schedulesRes]) => {
      const tasks = (tasksRes.data ?? []) as TaskRow[];
      const sessions = (sessionsRes.data ?? []) as SessionRow[];
      const schedules = (schedulesRes.data ?? []) as unknown as ScheduleRow[];

      setWorkloadGrid(buildWorkloadHeat(sessions));
      setCompletionSeries(buildCompletionSeries(tasks));
      setSubjectBars(buildSubjectBars(tasks, schedules));
      setFocusGrid(buildFocusGrid(sessions));
      setBurnout(calculateBurnout(tasks, sessions));
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [user]);

  // Fetch Gemini insight once burnout metrics are ready
  useEffect(() => {
    if (!burnout) return;
    setInsightLoading(true);
    fetch("/api/burnout-insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(burnout),
    })
      .then((r) => r.json())
      .then((d) =>
        setInsight(
          d.insight ??
            "Focus on completing your highest-priority tasks first. Small consistent progress beats large bursts of effort."
        )
      )
      .catch(() =>
        setInsight(
          "Focus on completing your highest-priority tasks first. Small consistent progress beats large bursts of effort."
        )
      )
      .finally(() => setInsightLoading(false));
  }, [burnout]);

  return (
    <div className="flex max-w-6xl flex-col gap-6">
      {/* header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Analytics</h1>
        <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
          Track your productivity and wellbeing over time.
        </p>
      </div>

      {/* ── 1. Workload heatmap ──────────────────────────────────── */}
      <Card className="p-5">
        <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
          12-week workload
        </h2>
        {loading || !workloadGrid ? (
          <Skeleton className="h-28 w-full rounded-xl" />
        ) : (
          <WorkloadHeatmap grid={workloadGrid} />
        )}
      </Card>

      {/* ── 2. Completion rate ───────────────────────────────────── */}
      <Card className="p-5">
        <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
          Completion rate
        </h2>
        {loading || !completionSeries ? (
          <Skeleton className="h-[200px] w-full rounded-xl" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart
              data={completionSeries}
              margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
            >
              <defs>
                <linearGradient id="completionGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border-subtle)" />
              <XAxis
                dataKey="week"
                tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                content={<CompletionTooltip />}
                cursor={{ stroke: "var(--border-default)" }}
              />
              <Area
                type="monotone"
                dataKey="rate"
                stroke="#7c3aed"
                strokeWidth={2}
                fill="url(#completionGrad)"
                dot={{ fill: "#7c3aed", r: 3 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* ── 3 + 4. Subject bars + Focus grid ────────────────────── */}
      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Estimated vs Scheduled */}
        <Card className="flex-1 p-5 lg:w-[60%]">
          <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
            Estimated vs scheduled by subject
          </h2>
          {loading || !subjectBars ? (
            <Skeleton className="h-[200px] w-full rounded-xl" />
          ) : subjectBars.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--text-muted)]">
              No task data yet.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={subjectBars}
                barCategoryGap="30%"
                margin={{ top: 4, right: 4, bottom: 0, left: -20 }}
              >
                <CartesianGrid vertical={false} stroke="var(--border-subtle)" />
                <XAxis
                  dataKey="subject"
                  tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<SubjectTooltip />}
                  cursor={{ fill: "var(--surface)" }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: "var(--text-muted)" }}
                />
                <Bar
                  dataKey="estimated"
                  name="Estimated"
                  fill="#7c3aed"
                  barSize={14}
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="scheduled"
                  name="Scheduled"
                  fill="#3b82f6"
                  barSize={14}
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Weekly Focus Pattern */}
        <Card className="p-5 lg:w-[40%]">
          <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
            Weekly focus pattern
          </h2>
          {loading || !focusGrid ? (
            <Skeleton className="h-44 w-full rounded-xl" />
          ) : (
            <FocusGrid grid={focusGrid} />
          )}
        </Card>
      </div>

      {/* ── 5. Burnout indicator ─────────────────────────────────── */}
      <Card className="p-5">
        <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">
          Burnout indicator
        </h2>
        {loading || !burnout ? (
          <Skeleton className="h-32 w-full rounded-xl" />
        ) : (
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            {/* gauge */}
            <div className="flex shrink-0 justify-center">
              <BurnoutGauge score={burnout.score} />
            </div>

            {/* stats */}
            <div className="flex flex-col gap-2 text-sm min-w-[160px]">
              <StatRow
                label="Score"
                value={`${burnout.score}/100`}
                color={burnoutColor(burnout.score)}
              />
              <StatRow
                label="Overdue tasks"
                value={`${burnout.overdueCount} of ${burnout.totalTasks}`}
              />
              <StatRow
                label="This week"
                value={`${burnout.completionRateThisWeek}% done`}
              />
              <StatRow
                label="Last week"
                value={`${burnout.completionRateLastWeek}% done`}
              />
              <StatRow
                label="Daily avg"
                value={`${burnout.avgDailyHours}h focus`}
              />
            </div>

            {/* insight */}
            <div className="flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3">
              {insightLoading ? (
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              ) : (
                <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
                  {insight}
                </p>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ─── sub-components ─────────────────────────────────────────────── */

function WorkloadHeatmap({ grid }: { grid: number[][] }) {
  const [hovered, setHovered] = useState<{
    week: number;
    day: number;
    hours: number;
  } | null>(null);

  return (
    <div className="relative inline-block">
      {/* week number header */}
      <div className="mb-1 flex gap-1 pl-5">
        {Array.from({ length: 12 }, (_, w) => (
          <div
            key={w}
            className="w-3.5 text-center text-[9px] text-[var(--text-muted)]"
          >
            {w + 1}
          </div>
        ))}
      </div>

      {/* grid */}
      {DAY_LABELS.map((day, dayIdx) => (
        <div key={dayIdx} className="mb-1 flex items-center gap-1">
          <span className="w-4 text-right text-[9px] text-[var(--text-muted)]">
            {day}
          </span>
          {grid.map((week, weekIdx) => {
            const hours = Math.round((week[dayIdx] ?? 0) * 10) / 10;
            return (
              <div
                key={weekIdx}
                className={cn(
                  "h-3.5 w-3.5 cursor-default rounded-sm transition-opacity hover:opacity-80",
                  HEAT_COLORS[intensityBucket(hours)]
                )}
                onMouseEnter={() => setHovered({ week: weekIdx + 1, day: dayIdx, hours })}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}
        </div>
      ))}

      {/* legend */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-[10px] text-[var(--text-muted)]">Low</span>
        {HEAT_COLORS.map((c, i) => (
          <div key={i} className={cn("h-3 w-3 rounded-sm", c)} />
        ))}
        <span className="text-[10px] text-[var(--text-muted)]">High</span>
      </div>

      {/* tooltip */}
      {hovered && (
        <div className="pointer-events-none absolute -top-8 left-6 rounded-md border border-[var(--border-default)] bg-[var(--bg-secondary)] px-2 py-1 text-[11px] text-[var(--text-primary)] shadow-lg whitespace-nowrap z-10">
          W{hovered.week} · {DAY_LABELS[hovered.day]} · {hovered.hours}h
        </div>
      )}
    </div>
  );
}

function FocusGrid({ grid }: { grid: number[][] }) {
  const rowLabels = ["6w ago", "5w ago", "4w ago", "3w ago", "2w ago", "Last wk", "This wk"];

  return (
    <div className="flex flex-col gap-1.5">
      {/* col headers */}
      <div className="flex items-center gap-1.5 pl-14">
        {DAY_LABELS.map((d, i) => (
          <div key={i} className="w-5 text-center text-[9px] text-[var(--text-muted)]">
            {d}
          </div>
        ))}
      </div>
      {/* rows */}
      {grid.map((week, wIdx) => (
        <div key={wIdx} className="flex items-center gap-1.5">
          <span className="w-14 shrink-0 text-right text-[9px] text-[var(--text-muted)]">
            {rowLabels[wIdx]}
          </span>
          {week.map((hours, dIdx) => (
            <div
              key={dIdx}
              className={cn(
                "h-5 w-5 rounded-sm",
                HEAT_COLORS[intensityBucket(hours)]
              )}
              title={`${hours.toFixed(1)}h`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function StatRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-[var(--text-muted)]">{label}</span>
      <span
        className="text-xs font-medium text-[var(--text-primary)]"
        style={color ? { color } : undefined}
      >
        {value}
      </span>
    </div>
  );
}
