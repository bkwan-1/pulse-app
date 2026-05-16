"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw, Sparkles } from "lucide-react";
import { Button, Skeleton } from "@/components/ui";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/lib/supabase/client";

/* ─── types ──────────────────────────────────────────────────────── */

interface ScheduleBlock {
  id: string;
  task_id: string;
  date: string;
  start_time: string;
  duration: number;
  tasks: {
    id: string;
    title: string;
    course: string | null;
    estimated_hours: number | null;
    priority: string | null;
  } | null;
}

interface ActivityItem {
  id: string;
  title: string;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  color: string;
}

/* ─── constants ──────────────────────────────────────────────────── */

const HOUR_HEIGHT   = 64;
const START_HOUR    = 0;
const END_HOUR      = 24;
const TOTAL_HOURS   = END_HOUR - START_HOUR;
const TOTAL_HEIGHT  = TOTAL_HOURS * HOUR_HEIGHT;
const HOURS         = Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i);
const DAY_LABELS    = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const BLOCK_PALETTE = [
  { bg: "bg-violet-500/20 border-l-2 border-violet-500",  text: "text-violet-200"  },
  { bg: "bg-blue-500/20 border-l-2 border-blue-500",      text: "text-blue-200"    },
  { bg: "bg-emerald-500/20 border-l-2 border-emerald-500",text: "text-emerald-200" },
  { bg: "bg-amber-500/20 border-l-2 border-amber-500",    text: "text-amber-200"   },
  { bg: "bg-rose-500/20 border-l-2 border-rose-500",      text: "text-rose-200"    },
  { bg: "bg-indigo-500/20 border-l-2 border-indigo-500",  text: "text-indigo-200"  },
  { bg: "bg-cyan-500/20 border-l-2 border-cyan-500",      text: "text-cyan-200"    },
  { bg: "bg-orange-500/20 border-l-2 border-orange-500",  text: "text-orange-200"  },
];

/* ─── helpers ────────────────────────────────────────────────────── */

function hashCourse(course: string): number {
  let h = 0;
  for (let i = 0; i < course.length; i++) h = (h * 31 + course.charCodeAt(i)) >>> 0;
  return h;
}

function blockColors(course: string | null) {
  if (!course) return BLOCK_PALETTE[0];
  return BLOCK_PALETTE[hashCourse(course) % BLOCK_PALETTE.length];
}

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function getWeekDates(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function offsetDate(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}min`;
  if (hours % 1 === 0) return `${hours}h`;
  return `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}min`;
}

function formatHour(h: number): string {
  if (h === 0 || h === 24) return "12 AM";
  if (h === 12) return "12 PM";
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

/* ─── droppable hour slot ────────────────────────────────────────── */

function HourSlot({ date, hour }: { date: string; hour: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: `${date}|${hour}` });
  return (
    <div
      ref={setNodeRef}
      style={{
        position: "absolute",
        top: (hour - START_HOUR) * HOUR_HEIGHT,
        height: HOUR_HEIGHT,
        left: 0,
        right: 0,
      }}
      className={cn(
        "border-b border-[var(--border-subtle)] transition-colors",
        isOver && "bg-[var(--accent)]/[0.08]"
      )}
    />
  );
}

/* ─── draggable block ────────────────────────────────────────────── */

function DraggableBlock({ block }: { block: ScheduleBlock }) {
  const { setNodeRef, listeners, attributes, transform, isDragging } =
    useDraggable({ id: block.id, data: { block } });

  const timeParts = block.start_time.split(":").map(Number);
  const blockHour = timeParts[0] ?? START_HOUR;
  const blockMin  = timeParts[1] ?? 0;
  const top       = (blockHour + blockMin / 60 - START_HOUR) * HOUR_HEIGHT;
  const height    = Math.max(block.duration * HOUR_HEIGHT - 4, 20);
  const colors    = blockColors(block.tasks?.course ?? null);

  const style: React.CSSProperties = {
    position: "absolute",
    top,
    height,
    left: 4,
    right: 4,
    zIndex: isDragging ? 50 : 2,
    ...(transform
      ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
      : {}),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab select-none overflow-hidden rounded-md px-2 py-1 text-xs transition-shadow",
        colors.bg,
        colors.text,
        isDragging && "cursor-grabbing opacity-75 shadow-xl ring-1 ring-[var(--accent)]"
      )}
    >
      {height <= 28 ? (
        /* very short block: single line with duration inline */
        <p className="truncate font-semibold leading-tight">
          {block.tasks?.title ?? "Task"} · {formatDuration(block.duration)}
        </p>
      ) : (
        /* taller block: title + duration on separate lines */
        <>
          <p className="truncate font-semibold leading-tight">
            {block.tasks?.title ?? "Task"}
          </p>
          <p className="truncate opacity-60">{formatDuration(block.duration)}</p>
          {height > 52 && block.tasks?.course && (
            <p className="truncate opacity-50">{block.tasks.course}</p>
          )}
        </>
      )}
    </div>
  );
}

/* ─── activity block (non-draggable) ────────────────────────────── */

function ActivityBlock({ activity }: { activity: ActivityItem }) {
  const [startH, startM] = activity.start_time.split(":").map(Number);
  const [endH,   endM]   = activity.end_time.split(":").map(Number);
  const startFrac = (startH ?? 0) + (startM ?? 0) / 60;
  const endFrac   = (endH   ?? 0) + (endM   ?? 0) / 60;
  const top    = (startFrac - START_HOUR) * HOUR_HEIGHT;
  const height = Math.max((endFrac - startFrac) * HOUR_HEIGHT - 2, 20);

  return (
    <div
      style={{
        position: "absolute",
        top,
        height,
        left: 4,
        right: 4,
        zIndex: 1,
        backgroundColor: activity.color + "33",
        borderLeft: `2px solid ${activity.color}`,
      }}
      className="overflow-hidden rounded-md px-2 py-1 text-xs select-none"
    >
      <p className="truncate font-semibold leading-tight" style={{ color: activity.color }}>
        {activity.title}
      </p>
      {height > 36 && (
        <p className="truncate opacity-70" style={{ color: activity.color }}>
          {activity.start_time}–{activity.end_time}
        </p>
      )}
    </div>
  );
}

/* ─── day column ─────────────────────────────────────────────────── */

function DayColumn({
  date,
  label,
  isToday,
  blocks,
  activities,
}: {
  date: Date;
  label: string;
  isToday: boolean;
  blocks: ScheduleBlock[];
  activities: ActivityItem[];
}) {
  const iso = isoDate(date);
  return (
    <div className="flex min-w-0 flex-1 flex-col">
      {/* day header */}
      <div
        className={cn(
          "flex flex-col items-center border-b border-[var(--border-subtle)] py-2",
          isToday && "border-b-[var(--accent)]"
        )}
      >
        <span className="text-[10px] font-medium uppercase tracking-widest text-[var(--text-muted)]">
          {label}
        </span>
        <span
          className={cn(
            "mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
            isToday
              ? "bg-[var(--accent)] text-white"
              : "text-[var(--text-secondary)]"
          )}
        >
          {date.getDate()}
        </span>
      </div>
      {/* time slots + blocks */}
      <div
        className="relative border-l border-[var(--border-subtle)]"
        style={{ height: TOTAL_HEIGHT }}
      >
        {HOURS.map((h) => (
          <HourSlot key={h} date={iso} hour={h} />
        ))}
        {activities.map((a) => (
          <ActivityBlock key={a.id} activity={a} />
        ))}
        {blocks.map((b) => (
          <DraggableBlock key={b.id} block={b} />
        ))}
      </div>
    </div>
  );
}

/* ─── week grid ──────────────────────────────────────────────────── */

function WeekGrid({
  weekDates,
  blocks,
  activities,
}: {
  weekDates: Date[];
  blocks: ScheduleBlock[];
  activities: ActivityItem[];
}) {
  const today = isoDate(new Date());

  return (
    <div className="flex overflow-x-auto rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)]">
      {/* time axis */}
      <div className="flex w-14 shrink-0 flex-col">
        {/* header spacer */}
        <div className="border-b border-[var(--border-subtle)] py-2">
          <div className="h-7" />
        </div>
        {/* hour labels */}
        <div className="relative" style={{ height: TOTAL_HEIGHT }}>
          {HOURS.map((h) => (
            <div
              key={h}
              style={{
                position: "absolute",
                top: h === 0 ? 4 : (h - START_HOUR) * HOUR_HEIGHT - 8,
              }}
              className="right-2 left-0 pl-2 text-right text-[10px] text-[var(--text-muted)]"
            >
              {formatHour(h)}
            </div>
          ))}
        </div>
      </div>

      {/* day columns */}
      {weekDates.map((date, i) => (
        <DayColumn
          key={isoDate(date)}
          date={date}
          label={DAY_LABELS[i]}
          isToday={isoDate(date) === today}
          blocks={blocks.filter((b) => b.date === isoDate(date))}
          activities={activities.filter((a) => a.days_of_week.includes(date.getDay()))}
        />
      ))}
    </div>
  );
}

/* ─── page ───────────────────────────────────────────────────────── */

export default function SchedulePage() {
  const { user } = useUser();
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const scrollRef = useRef<HTMLDivElement>(null);

  const weekDates = getWeekDates(weekStart);
  const startIso  = isoDate(weekStart);
  const endIso    = offsetDate(startIso, 6);

  const fetchBlocks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [schedulesRes, activitiesRes] = await Promise.all([
      createClient()
        .from("schedules")
        .select("*, tasks(id, title, course, estimated_hours, priority)")
        .eq("user_id", user.id)
        .gte("date", startIso)
        .lte("date", endIso),
      createClient()
        .from("activities")
        .select("id,title,days_of_week,start_time,end_time,color")
        .eq("user_id", user.id),
    ]);
    setBlocks((schedulesRes.data ?? []) as ScheduleBlock[]);
    setActivities((activitiesRes.data ?? []) as ActivityItem[]);
    setLoading(false);
  }, [user, startIso, endIso]);

  // Scroll to 6am on initial load
  useEffect(() => {
    if (!loading && scrollRef.current) {
      scrollRef.current.scrollTop = 6 * HOUR_HEIGHT;
    }
  }, [loading]);

  useEffect(() => {
    fetchBlocks();
  }, [fetchBlocks]);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-schedule", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      await fetchBlocks();
      toast.success("Schedule generated.", { description: "Your week has been planned." });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong";
      setError(msg);
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const blockId = active.id as string;
    const [date, hourStr] = (over.id as string).split("|");
    if (!date || !hourStr) return;
    const startTime = `${hourStr.padStart(2, "0")}:00`;

    const snapshot = blocks;
    setBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId ? { ...b, date, start_time: startTime } : b
      )
    );
    const { error } = await createClient()
      .from("schedules")
      .update({ date, start_time: startTime })
      .eq("id", blockId);
    if (error) {
      setBlocks(snapshot);
      toast.error("Failed to reschedule block.");
    }
  }

  const weekLabel = `${weekDates[0].toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  })} – ${weekDates[6].toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  })}`;

  return (
    <div className="flex max-w-full flex-col gap-6">
      {/* header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Schedule</h1>
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">{weekLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const d = new Date(weekStart);
              d.setDate(d.getDate() - 7);
              setWeekStart(d);
            }}
            className="rounded-lg border border-[var(--border-default)] bg-[var(--surface)] p-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              const d = new Date(weekStart);
              d.setDate(d.getDate() + 7);
              setWeekStart(d);
            }}
            className="rounded-lg border border-[var(--border-default)] bg-[var(--surface)] p-2 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          {blocks.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              loading={generating}
              onClick={handleGenerate}
            >
              {!generating && <RefreshCw className="h-4 w-4" />}
              Regenerate
            </Button>
          )}
        </div>
      </div>

      {/* error */}
      {error && (
        <div className="rounded-lg border border-red-800/40 bg-red-950/50 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* content */}
      {loading ? (
        <Skeleton className="h-[520px] w-full rounded-xl" />
      ) : blocks.length === 0 && activities.length === 0 ? (
        /* empty state */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-8 py-24 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20">
            <CalendarDays className="h-8 w-8 text-[var(--accent)]" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Your week is empty
          </h2>
          <p className="mt-2 max-w-xs text-sm text-[var(--text-secondary)]">
            Pulse will analyse your tasks and profile to build a realistic study
            schedule across the next 7 days.
          </p>
          <Button
            variant="primary"
            size="lg"
            className="mt-6"
            loading={generating}
            onClick={handleGenerate}
          >
            {!generating && <Sparkles className="h-4 w-4" />}
            Generate schedule
          </Button>
        </div>
      ) : (
        /* week grid */
        <div className="flex flex-col gap-3">
          {blocks.length === 0 && (
            <div className="flex items-center justify-between rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-5 py-4">
              <p className="text-sm text-[var(--text-secondary)]">No study blocks yet — generate a schedule to fill your week.</p>
              <Button variant="primary" size="sm" loading={generating} onClick={handleGenerate}>
                {!generating && <Sparkles className="h-4 w-4" />}
                Generate
              </Button>
            </div>
          )}
          <DndContext onDragEnd={handleDragEnd}>
            <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: "75vh" }}>
              <WeekGrid weekDates={weekDates} blocks={blocks} activities={activities} />
            </div>
          </DndContext>
        </div>
      )}

      {/* legend */}
      {!loading && (blocks.length > 0 || activities.length > 0) && (
        <p className="text-xs text-[var(--text-muted)]">
          {blocks.length > 0 && "Drag study blocks to reschedule"}
          {blocks.length > 0 && activities.length > 0 && " · "}
          {activities.length > 0 && "Coloured blocks are your activities (blocked time)"}
        </p>
      )}
    </div>
  );
}
