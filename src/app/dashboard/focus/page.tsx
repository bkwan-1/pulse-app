"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Brain,
  Play,
  Pause,
  SkipForward,
  X,
  ChevronDown,
  ArrowLeft,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

/* ─── constants ──────────────────────────────────────────────────── */

const POMODORO_WORK  = 25 * 60; // 1500 s
const POMODORO_BREAK = 5 * 60;  // 300 s
const FREE_TOTAL     = 60 * 60; // 3600 s — ring fills over 1 hour

const CIRCUMFERENCE  = 2 * Math.PI * 100; // ≈ 628.3

const EASE = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

/* ─── types ──────────────────────────────────────────────────────── */

type Phase = "setup" | "work" | "break" | "complete";
type Mode  = "pomodoro" | "free";

interface Task {
  id: string;
  title: string;
  course: string | null;
}

/* ─── helpers ────────────────────────────────────────────────────── */

function formatTime(s: number): string {
  const m   = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

/* ─── ring component ─────────────────────────────────────────────── */

function TimerRing({
  timeLeft,
  totalTime,
  phase,
}: {
  timeLeft: number;
  totalTime: number;
  phase: Phase;
}) {
  const fraction = totalTime > 0 ? timeLeft / totalTime : 0;
  const offset   = CIRCUMFERENCE * fraction;
  const stroke   = phase === "break" ? "#4A90B8" : "#3A6053";

  return (
    <svg viewBox="0 0 240 240" className="h-60 w-60">
      {/* track */}
      <circle
        cx={120} cy={120} r={100}
        fill="none"
        stroke="rgba(255,255,255,0.07)"
        strokeWidth={6}
      />
      {/* fill — rotated so start is at 12 o'clock */}
      <g transform="rotate(-90, 120, 120)">
        <motion.circle
          cx={120} cy={120} r={100}
          fill="none"
          stroke={stroke}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </g>
    </svg>
  );
}

/* ─── control button ─────────────────────────────────────────────── */

function IconBtn({
  onClick,
  children,
  className,
  disabled,
  title,
}: {
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border-default)] text-[var(--text-muted)] transition-colors hover:border-[var(--border-subtle)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] disabled:pointer-events-none disabled:opacity-30",
        className
      )}
    >
      {children}
    </button>
  );
}

/* ─── page ───────────────────────────────────────────────────────── */

export default function FocusPage() {
  const router     = useRouter();
  const { user }   = useUser();

  // phase & mode
  const [phase, setPhase]       = useState<Phase>("setup");
  const [mode, setMode]         = useState<Mode>("pomodoro");

  // timer
  const [isRunning, setIsRunning] = useState(false);
  const [timeLeft, setTimeLeft]   = useState(POMODORO_WORK);
  const [totalTime, setTotalTime] = useState(POMODORO_WORK);
  const [elapsed, setElapsed]     = useState(0);

  // tasks
  const [tasks, setTasks]               = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [saving, setSaving]             = useState(false);

  /* fetch tasks */
  useEffect(() => {
    if (!user) return;
    createClient()
      .from("tasks")
      .select("id,title,course")
      .eq("user_id", user.id)
      .neq("status", "done")
      .order("created_at", { ascending: false })
      .then(({ data }) => setTasks((data ?? []) as Task[]));
  }, [user]);

  /* log to focus_sessions */
  const logSession = useCallback(async () => {
    if (!user || elapsed < 10) return;
    setSaving(true);
    try {
      await createClient().from("focus_sessions").insert({
        user_id: user.id,
        task_id: selectedTaskId || null,
        date: new Date().toISOString().split("T")[0],
        duration_hours: Math.round((elapsed / 3600) * 100) / 100,
      });
      toast.success("Session logged.", {
        description: `${formatTime(elapsed)} of focus recorded.`,
      });
    } catch {
      toast.error("Failed to save session.");
    } finally {
      setSaving(false);
    }
  }, [user, elapsed, selectedTaskId]);

  /* handle timer reaching zero */
  const handleTimerEnd = useCallback(() => {
    setIsRunning(false);
    if (mode === "pomodoro" && phase === "work") {
      // auto-start break
      setPhase("break");
      setTimeLeft(POMODORO_BREAK);
      setTotalTime(POMODORO_BREAK);
      setIsRunning(true);
    } else {
      logSession().then(() => setPhase("complete"));
    }
  }, [mode, phase, logSession]);

  /* countdown tick */
  useEffect(() => {
    if (!isRunning || (phase !== "work" && phase !== "break")) return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(id);
          handleTimerEnd();
          return 0;
        }
        return t - 1;
      });
      if (phase === "work") setElapsed((e) => e + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning, phase, handleTimerEnd]);

  /* actions */
  function handleStart() {
    const workTime = mode === "pomodoro" ? POMODORO_WORK : FREE_TOTAL;
    setTimeLeft(workTime);
    setTotalTime(workTime);
    setElapsed(0);
    setPhase("work");
    setIsRunning(true);
  }

  async function handleEnd() {
    setIsRunning(false);
    await logSession();
    setPhase("complete");
  }

  function handleSkip() {
    // skip to break (Pomodoro work only)
    setIsRunning(false);
    setPhase("break");
    setTimeLeft(POMODORO_BREAK);
    setTotalTime(POMODORO_BREAK);
    setIsRunning(true);
  }

  function handleBackToWork() {
    setTimeLeft(POMODORO_WORK);
    setTotalTime(POMODORO_WORK);
    setPhase("work");
    setIsRunning(true);
  }

  function handleDone() {
    setPhase("setup");
    setIsRunning(false);
    setElapsed(0);
    setTimeLeft(mode === "pomodoro" ? POMODORO_WORK : FREE_TOTAL);
  }

  /* selected task label */
  const selectedTask = tasks.find((t) => t.id === selectedTaskId) ?? null;
  const taskLabel = selectedTask
    ? selectedTask.course
      ? `${selectedTask.course} · ${selectedTask.title}`
      : selectedTask.title
    : null;

  /* ── display time: free mode shows elapsed, work/break show timeLeft */
  const displayTime = mode === "free" && phase === "work"
    ? elapsed
    : timeLeft;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-[var(--bg-primary)]">

      {/* ── SETUP PHASE ───────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {phase === "setup" && (
          <motion.div
            key="setup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="flex flex-1 flex-col items-center justify-center px-6"
          >
            <div className="flex w-full max-w-sm flex-col items-center gap-6">
              {/* icon */}
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--accent)]/20 bg-[var(--accent)]/10">
                <Brain className="h-7 w-7 text-[var(--accent)]" />
              </div>

              {/* heading */}
              <div className="text-center">
                <h1 className="text-3xl font-light text-[var(--text-primary)]">
                  Focus
                </h1>
                <p className="mt-1 text-sm text-[var(--text-muted)]">
                  Choose a task and start your session
                </p>
              </div>

              {/* task select */}
              <div className="relative w-full">
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="h-11 w-full appearance-none rounded-xl border border-[var(--border-default)] bg-[var(--surface)] px-4 pr-10 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
                >
                  <option value="">No task — open session</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.course ? `${t.course} · ${t.title}` : t.title}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
              </div>

              {/* mode toggle */}
              <div className="flex w-full gap-1 rounded-xl bg-[var(--bg-secondary)] p-1">
                {(["pomodoro", "free"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={cn(
                      "flex-1 rounded-lg py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                      mode === m
                        ? "bg-[var(--surface)] text-[var(--text-primary)]"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    )}
                  >
                    {m === "pomodoro" ? "Pomodoro 25/5" : "Free timer"}
                  </button>
                ))}
              </div>

              {/* start button */}
              <button
                onClick={handleStart}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] text-sm font-medium text-white transition-colors hover:bg-[var(--accent)]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                <Play className="h-4 w-4" />
                Start focusing
              </button>
            </div>
          </motion.div>
        )}

        {/* ── WORK / BREAK PHASE ────────────────────────────────── */}
        {(phase === "work" || phase === "break") && (
          <motion.div
            key="timer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-1 flex-col"
          >
            {/* back button */}
            <div className="p-4">
              <button
                onClick={() => router.push("/dashboard")}
                className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            </div>

            {/* centered content */}
            <div className="flex flex-1 flex-col items-center justify-center gap-10 pb-8">
              {/* task name */}
              {taskLabel && (
                <p className="max-w-xs truncate text-center text-sm text-[var(--text-muted)]">
                  {taskLabel}
                </p>
              )}

              {/* ring + time */}
              <div className="relative flex items-center justify-center">
                <TimerRing
                  timeLeft={timeLeft}
                  totalTime={totalTime}
                  phase={phase}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-6xl font-thin tabular-nums tracking-tight text-[var(--text-primary)]">
                    {formatTime(displayTime)}
                  </span>
                  <span className="mt-1.5 text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
                    {phase === "break"
                      ? "break"
                      : mode === "pomodoro"
                      ? "focus"
                      : "free session"}
                  </span>
                </div>
              </div>

              {/* controls */}
              {phase === "work" && (
                <div className="flex items-center gap-6">
                  {/* skip (Pomodoro only) */}
                  {mode === "pomodoro" ? (
                    <IconBtn onClick={handleSkip} title="Skip to break">
                      <SkipForward className="h-5 w-5" />
                    </IconBtn>
                  ) : (
                    <div className="h-11 w-11" />
                  )}

                  {/* play/pause */}
                  <button
                    onClick={() => setIsRunning((r) => !r)}
                    className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-lg shadow-[var(--accent)]/20 transition-all hover:bg-[var(--accent)]/90 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  >
                    {isRunning ? (
                      <Pause className="h-7 w-7" />
                    ) : (
                      <Play className="h-7 w-7 translate-x-0.5" />
                    )}
                  </button>

                  {/* end */}
                  <IconBtn onClick={handleEnd} disabled={saving} title="End session">
                    <X className="h-5 w-5" />
                  </IconBtn>
                </div>
              )}

              {phase === "break" && (
                <div className="flex flex-col items-center gap-4">
                  <p className="text-sm text-[var(--text-secondary)]">
                    Take a break — you've earned it.
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleBackToWork}
                      className="rounded-full border border-[var(--border-default)] px-5 py-2 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                    >
                      Back to work
                    </button>
                    <IconBtn onClick={handleEnd} disabled={saving} title="End session">
                      <X className="h-5 w-5" />
                    </IconBtn>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── COMPLETE PHASE ────────────────────────────────────── */}
        {phase === "complete" && (
          <motion.div
            key="complete"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-1 flex-col items-center justify-center px-6"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="flex flex-col items-center gap-4 text-center"
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <CheckCircle2 className="h-20 w-20 text-green-400" />
              </motion.div>

              <div>
                <h2 className="text-2xl font-light text-[var(--text-primary)]">
                  Session complete
                </h2>
                {elapsed >= 10 && (
                  <p className="mt-1 text-sm text-[var(--text-muted)]">
                    You focused for {formatTime(elapsed)}
                  </p>
                )}
              </div>

              <p className="max-w-xs text-sm leading-relaxed text-[var(--text-secondary)]">
                Well done — take a moment to rest before your next session.
              </p>

              <button
                onClick={handleDone}
                className="mt-2 rounded-xl border border-[var(--border-default)] bg-[var(--surface)] px-8 py-2.5 text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-tertiary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
