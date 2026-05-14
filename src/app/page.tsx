"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import {
  Zap,
  ArrowRight,
  CheckCircle2,
  Brain,
  CalendarDays,
  Activity,
  BookOpen,
  Clock,
  LayoutDashboard,
  StickyNote,
  HeartPulse,
} from "lucide-react";
import Link from "next/link";
import { Button, Badge } from "@/components/ui";
import { cn } from "@/lib/utils";

/* ─── hero animation variants ─────────────────────────────────── */

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.11, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.65,
      ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
    },
  },
};

/* ─── shared scroll-reveal wrapper ────────────────────────────── */

function SectionReveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px 0px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 36 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 36 }}
      transition={{
        duration: 0.7,
        delay,
        ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── shared feature-text block ───────────────────────────────── */

function FeatureText({
  eyebrow,
  headline,
  sub,
  bullets,
}: {
  eyebrow: string;
  headline: React.ReactNode;
  sub: string;
  bullets: { icon: React.ReactNode; text: string }[];
}) {
  return (
    <div className="flex flex-col">
      <span className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
        {eyebrow}
      </span>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text-primary)] md:text-4xl">
        {headline}
      </h2>
      <p className="mt-4 text-base leading-relaxed text-[var(--text-secondary)]">{sub}</p>
      <ul className="mt-6 flex flex-col gap-3">
        {bullets.map(({ icon, text }, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="mt-0.5 shrink-0 text-[var(--accent)]">{icon}</span>
            <span className="text-sm text-[var(--text-secondary)]">{text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── section 1: AI intake ─────────────────────────────────────── */

function AssignmentCard() {
  const fields = [
    { label: "Due", value: "Oct 14 · 11:59 PM" },
    { label: "Type", value: "Problem Set" },
    { label: "Est.", value: "~3 hours" },
  ];
  const subtasks = [
    "Read Chapter 8",
    "Complete exercises 1–5",
    "Write up solutions",
  ];
  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface)] overflow-hidden">
      {/* status strip */}
      <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--accent)]/[0.06] px-4 py-2.5">
        <CheckCircle2 className="h-3.5 w-3.5 text-[var(--accent)]" />
        <span className="text-xs font-medium text-[var(--accent)]">
          AI parsed · from syllabus PDF
        </span>
      </div>
      <div className="p-5 space-y-4">
        {/* header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-[var(--text-muted)]">CS 101</p>
            <h3 className="mt-0.5 text-sm font-semibold text-[var(--text-primary)]">
              Problem Set 4
            </h3>
          </div>
          <Badge variant="destructive">Urgent</Badge>
        </div>
        {/* fields */}
        <div className="space-y-2">
          {fields.map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-muted)]">{label}</span>
              <span className="text-xs font-medium text-[var(--text-primary)]">{value}</span>
            </div>
          ))}
        </div>
        {/* subtasks */}
        <div className="space-y-2 pt-1">
          <p className="text-xs font-medium text-[var(--text-muted)]">Subtasks</p>
          {subtasks.map((task) => (
            <div key={task} className="flex items-center gap-2.5">
              <div className="h-3.5 w-3.5 shrink-0 rounded-full border border-[var(--border-default)]" />
              <span className="text-xs text-[var(--text-secondary)]">{task}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AIIntakeSection() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-28 md:px-10">
      <div className="grid grid-cols-1 gap-16 md:grid-cols-2 md:items-center">
        <SectionReveal delay={0}>
          <FeatureText
            eyebrow="AI Intake"
            headline={
              <>
                Paste anything.{" "}
                <span className="text-[var(--text-secondary)]">
                  Pulse handles the rest.
                </span>
              </>
            }
            sub="Drop in a syllabus, an email, or a Canvas link. Pulse extracts every deadline, requirement, and detail — no manual entry needed."
            bullets={[
              {
                icon: <CheckCircle2 className="h-4 w-4" />,
                text: "Reads syllabi, emails, PDFs, and raw text",
              },
              {
                icon: <CheckCircle2 className="h-4 w-4" />,
                text: "Extracts due dates, task types, and time estimates",
              },
              {
                icon: <CheckCircle2 className="h-4 w-4" />,
                text: "Flags conflicts and urgent items automatically",
              },
            ]}
          />
        </SectionReveal>
        <SectionReveal delay={0.15}>
          <AssignmentCard />
        </SectionReveal>
      </div>
    </section>
  );
}

/* ─── section 2: adaptive scheduling ───────────────────────────── */

const CAL: (string | null)[][] = [
  [null, "CS 101", "CS 101", null, "Study", null, null, null],
  [null, null, "Math", "Math", null, null, null, null],
  [null, "CS 101", "CS 101", null, "Focus", "Focus", null, null],
  [null, null, "Math", "Math", null, "Study", null, null],
  [null, "CS 101", "CS 101", null, null, null, null, null],
  [null, null, "Study", null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
];

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIME_LABELS = ["8am", "9am", "10am", "11am", "12pm", "1pm", "2pm", "3pm"];

function cellColor(label: string | null) {
  if (label === "CS 101" || label === "Math")
    return "bg-violet-500/20 border-l-2 border-violet-500/60 text-violet-300";
  if (label === "Study" || label === "Focus")
    return "bg-indigo-500/20 border-l-2 border-indigo-500/60 text-indigo-300";
  return "bg-[var(--bg-tertiary)]";
}

function WeeklyCalendar() {
  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface)] p-4 overflow-hidden">
      {/* day headers */}
      <div className="mb-1 grid grid-cols-[32px_repeat(7,1fr)] gap-1">
        <div />
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-[var(--text-muted)]">
            {d}
          </div>
        ))}
      </div>
      {/* grid */}
      <div className="grid grid-cols-[32px_repeat(7,1fr)] gap-1">
        {TIME_LABELS.map((time, row) => (
          <>
            <div
              key={time}
              className="flex items-center justify-end pr-1 text-[9px] text-[var(--text-muted)]"
            >
              {time}
            </div>
            {CAL.map((daySlots, col) => {
              const label = daySlots[row];
              const prevLabel = row > 0 ? daySlots[row - 1] : null;
              return (
                <div
                  key={col}
                  className={cn(
                    "h-8 rounded-sm px-1 flex items-center",
                    cellColor(label)
                  )}
                >
                  {label && label !== prevLabel && (
                    <span className="truncate text-[9px] font-medium">{label}</span>
                  )}
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}

function SchedulingSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-28 md:px-10">
      <div className="grid grid-cols-1 gap-16 md:grid-cols-2 md:items-center">
        <SectionReveal delay={0} className="order-2 md:order-1">
          <WeeklyCalendar />
        </SectionReveal>
        <SectionReveal delay={0.15} className="order-1 md:order-2">
          <FeatureText
            eyebrow="Adaptive Scheduling"
            headline={
              <>
                Your week,{" "}
                <span className="text-[var(--text-secondary)]">
                  intelligently arranged.
                </span>
              </>
            }
            sub="Pulse maps your deadlines against your existing commitments and builds a schedule that actually fits your life — not just your calendar."
            bullets={[
              {
                icon: <CheckCircle2 className="h-4 w-4" />,
                text: "Blocks study time around classes and commitments",
              },
              {
                icon: <CheckCircle2 className="h-4 w-4" />,
                text: "Adjusts automatically when plans change",
              },
              {
                icon: <CheckCircle2 className="h-4 w-4" />,
                text: "Protects rest and recovery time by default",
              },
            ]}
          />
        </SectionReveal>
      </div>
    </section>
  );
}

/* ─── section 3: burnout detection ─────────────────────────────── */

const HEAT: number[][] = [
  [1, 1, 0, 1, 1, 0, 0],
  [1, 2, 1, 1, 2, 0, 0],
  [2, 1, 2, 2, 1, 1, 0],
  [2, 2, 2, 1, 2, 1, 0],
  [2, 3, 2, 2, 3, 1, 0],
  [3, 2, 3, 3, 2, 2, 1],
  [3, 3, 3, 2, 3, 2, 1],
  [3, 4, 3, 3, 4, 2, 1],
  [4, 3, 4, 4, 3, 3, 1],
  [4, 4, 4, 3, 4, 3, 2],
  [4, 4, 4, 4, 4, 4, 2],
  [3, 3, 4, 3, 3, 2, 1],
];

const HEAT_COLORS = [
  "bg-[var(--surface)]",
  "bg-violet-900/60",
  "bg-violet-700/70",
  "bg-violet-500/80",
  "bg-amber-500/80",
];

const DAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"];

function Heatmap() {
  return (
    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--surface)] p-5">
      {/* week labels */}
      <div className="mb-1.5 flex gap-1 pl-5">
        {HEAT.map((_, w) => (
          <div key={w} className="w-3.5 text-center text-[9px] text-[var(--text-muted)]">
            {w + 1}
          </div>
        ))}
      </div>
      {/* grid: 7 rows × 12 cols */}
      {DAY_INITIALS.map((d, dayIdx) => (
        <div key={dayIdx} className="flex items-center gap-1 mb-1">
          <span className="w-4 text-[9px] text-[var(--text-muted)]">{d}</span>
          {HEAT.map((week, weekIdx) => (
            <div
              key={weekIdx}
              className={cn(
                "h-3.5 w-3.5 rounded-sm",
                HEAT_COLORS[week[dayIdx]]
              )}
            />
          ))}
        </div>
      ))}
      {/* legend */}
      <div className="mt-4 flex items-center gap-2">
        <span className="text-[10px] text-[var(--text-muted)]">Low</span>
        {HEAT_COLORS.map((c, i) => (
          <div key={i} className={cn("h-3 w-3 rounded-sm", c)} />
        ))}
        <span className="text-[10px] text-[var(--text-muted)]">Overload</span>
      </div>
    </div>
  );
}

function BurnoutSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-28 md:px-10">
      <div className="grid grid-cols-1 gap-16 md:grid-cols-2 md:items-center">
        <SectionReveal delay={0}>
          <FeatureText
            eyebrow="Burnout Guard"
            headline={
              <>
                Know before{" "}
                <span className="text-[var(--text-secondary)]">you break.</span>
              </>
            }
            sub="Pulse tracks your workload week by week and surfaces patterns that predict burnout — before you're in the middle of it."
            bullets={[
              {
                icon: <CheckCircle2 className="h-4 w-4" />,
                text: "Visualizes workload density across the semester",
              },
              {
                icon: <CheckCircle2 className="h-4 w-4" />,
                text: "Flags exam stacks and consecutive high-load weeks",
              },
              {
                icon: <CheckCircle2 className="h-4 w-4" />,
                text: "Recommends buffer days before crunch periods",
              },
            ]}
          />
        </SectionReveal>
        <SectionReveal delay={0.15}>
          <Heatmap />
        </SectionReveal>
      </div>
    </section>
  );
}

/* ─── dashboard mockup ─────────────────────────────────────────── */

const NAV_ITEMS = [
  { icon: <LayoutDashboard className="h-3.5 w-3.5" />, label: "Dashboard", active: true },
  { icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: "Tasks" },
  { icon: <CalendarDays className="h-3.5 w-3.5" />, label: "Calendar" },
  { icon: <StickyNote className="h-3.5 w-3.5" />, label: "Notes" },
  { icon: <HeartPulse className="h-3.5 w-3.5" />, label: "Burnout" },
];

const STATS = [
  { label: "Tasks due", value: "12", bars: [2, 5, 3, 6, 4, 7, 5] },
  { label: "Focus hrs", value: "4.2", bars: [4, 3, 6, 5, 4, 3, 6] },
  { label: "Completed", value: "28", bars: [3, 5, 4, 6, 5, 7, 6] },
  { label: "Streak", value: "7d", bars: [1, 2, 3, 4, 5, 6, 7] },
];

const CHART_ROWS = [
  { label: "CS 101", pct: 85, color: "bg-violet-500/70" },
  { label: "Calculus", pct: 60, color: "bg-indigo-500/70" },
  { label: "Writing", pct: 40, color: "bg-blue-500/60" },
  { label: "Physics", pct: 70, color: "bg-violet-400/60" },
  { label: "History", pct: 30, color: "bg-indigo-400/50" },
];

const RECENT_TASKS = [
  { label: "Problem Set 4", badge: <Badge variant="destructive">Urgent</Badge> },
  { label: "Essay outline draft", badge: <Badge variant="warning">Due soon</Badge> },
  { label: "Lab report section 3", badge: <Badge variant="default">In progress</Badge> },
];

function DashboardMockup() {
  return (
    <section className="py-24 px-6 md:px-10">
      <SectionReveal className="mx-auto max-w-5xl">
        {/* heading */}
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-[var(--text-primary)] md:text-4xl">
            Everything{" "}
            <span className="text-[var(--text-secondary)]">in one place.</span>
          </h2>
          <p className="mt-3 text-base text-[var(--text-secondary)]">
            One workspace for every part of your academic life.
          </p>
        </div>

        {/* mock frame */}
        <div
          className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)]"
          style={{ boxShadow: "0 0 80px rgba(124,58,237,0.07)" }}
        >
          <div className="flex">
            {/* sidebar */}
            <div className="hidden w-44 shrink-0 border-r border-[var(--border-subtle)] bg-[var(--bg-tertiary)] p-4 md:block">
              <div className="mb-5 flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-[var(--accent)]" strokeWidth={2.5} />
                <span className="text-sm font-semibold text-[var(--text-primary)]">Pulse</span>
              </div>
              <nav className="flex flex-col gap-0.5">
                {NAV_ITEMS.map(({ icon, label, active }) => (
                  <div
                    key={label}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors",
                      active
                        ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                        : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                    )}
                  >
                    {icon}
                    {label}
                  </div>
                ))}
              </nav>
            </div>

            {/* main content */}
            <div className="flex-1 p-5 space-y-4 min-w-0">
              {/* topbar */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  Dashboard
                </span>
                <div className="h-6 w-6 rounded-full bg-[var(--accent)]/20 border border-[var(--accent)]/30" />
              </div>

              {/* stat cards */}
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {STATS.map(({ label, value, bars }) => (
                  <div
                    key={label}
                    className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] p-3"
                  >
                    <p className="text-[10px] text-[var(--text-muted)]">{label}</p>
                    <p className="mt-0.5 text-lg font-semibold text-[var(--text-primary)]">
                      {value}
                    </p>
                    {/* sparkline */}
                    <div className="mt-2 flex items-end gap-0.5 h-4">
                      {bars.map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-sm bg-[var(--accent)]/40"
                          style={{ height: `${(h / 7) * 100}%` }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* bar chart */}
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
                <p className="mb-3 text-xs font-medium text-[var(--text-secondary)]">
                  Workload by course
                </p>
                <div className="flex flex-col gap-2">
                  {CHART_ROWS.map(({ label, pct, color }) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className="w-14 shrink-0 text-[10px] text-[var(--text-muted)]">
                        {label}
                      </span>
                      <div className="flex-1 rounded-full bg-[var(--bg-tertiary)] h-1.5">
                        <div
                          className={cn("h-full rounded-full", color)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-[var(--text-muted)]">{pct}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* recent tasks */}
              <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
                <p className="mb-3 text-xs font-medium text-[var(--text-secondary)]">
                  Recent tasks
                </p>
                <div className="flex flex-col gap-2">
                  {RECENT_TASKS.map(({ label, badge }) => (
                    <div key={label} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="h-3.5 w-3.5 shrink-0 rounded-full border border-[var(--border-default)]" />
                        <span className="text-xs text-[var(--text-secondary)]">{label}</span>
                      </div>
                      {badge}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </SectionReveal>
    </section>
  );
}

/* ─── footer ───────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="border-t border-[var(--border-subtle)] px-6 py-8 md:px-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-[var(--text-muted)]">
          <Zap className="h-4 w-4 text-[var(--accent)]" strokeWidth={2.5} />
          Pulse
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          © 2025 Pulse. Built for students.
        </p>
        <div className="flex gap-5 text-xs text-[var(--text-muted)]">
          {["Privacy", "Terms", "Contact"].map((link) => (
            <a
              key={link}
              href="#"
              className="transition-colors hover:text-[var(--text-secondary)]"
            >
              {link}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

/* ─── navbar ───────────────────────────────────────────────────── */

function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={cn(
        "fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between px-6 transition-all duration-300 md:px-10",
        scrolled
          ? "border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/80 backdrop-blur-md"
          : "bg-transparent"
      )}
    >
      <div className="flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)]">
        <Zap className="h-5 w-5 text-[var(--accent)]" strokeWidth={2.5} />
        Pulse
      </div>
      <div className="flex items-center gap-3">
        <Link href="/auth/login">
          <Button variant="ghost" size="sm">Sign in</Button>
        </Link>
        <Link href="/auth/login">
          <Button variant="primary" size="sm">Get started</Button>
        </Link>
      </div>
    </nav>
  );
}

/* ─── hero ─────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-6 pt-16 text-center">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex max-w-3xl flex-col items-center gap-6"
      >
        <motion.div variants={item}>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-default)] bg-[var(--surface)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
            Now in early access
          </span>
        </motion.div>

        <motion.h1
          variants={item}
          className="text-5xl font-semibold tracking-tight text-[var(--text-primary)] md:text-6xl lg:text-7xl"
        >
          The operating system
          <br />
          <span className="text-[var(--text-secondary)]">for overwhelmed students.</span>
        </motion.h1>

        <motion.p
          variants={item}
          className="max-w-xl text-lg leading-relaxed text-[var(--text-secondary)] md:text-xl"
        >
          Pulse brings your deadlines, notes, and focus sessions into one
          calm, intelligent workspace.
        </motion.p>

        <motion.div variants={item} className="mt-2 flex items-center gap-3">
          <Link href="/auth/login">
            <Button variant="primary" size="lg">Get started free</Button>
          </Link>
          <Link href="#features">
            <Button variant="ghost" size="lg" className="group">
              See how it works
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ─── page ─────────────────────────────────────────────────────── */

export default function Home() {
  return (
    <main className="relative overflow-x-hidden bg-[var(--bg-primary)]">
      {/* hero orbs */}
      <div className="pointer-events-none absolute -left-40 -top-40 h-[600px] w-[600px] rounded-full bg-violet-600/[0.12] blur-[120px]" />
      <div className="pointer-events-none absolute -right-20 top-[30vh] h-[480px] w-[480px] rounded-full bg-violet-500/[0.07] blur-[100px]" />
      <Navbar />
      <Hero />
      <AIIntakeSection />
      <SchedulingSection />
      <BurnoutSection />
      <DashboardMockup />
      <Footer />
    </main>
  );
}
