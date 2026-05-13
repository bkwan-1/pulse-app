"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronDown,
  Sun,
  Sunrise,
  Moon,
  Flame,
  Brain,
  Timer,
  Clock,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useOnboardingStore } from "@/store/onboarding";
import { createClient } from "@/lib/supabase/client";

/* ─── animation ────────────────────────────────────────────────── */

const EASE = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const VARIANTS = {
  enter: (dir: number) => ({ x: dir * 52, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.3, ease: EASE } },
  exit: (dir: number) => ({
    x: dir * -52,
    opacity: 0,
    transition: { duration: 0.2, ease: EASE },
  }),
};

/* ─── shared primitives ─────────────────────────────────────────── */

function StepHeading({
  title,
  hint,
}: {
  title: string;
  hint: string;
}) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-[var(--text-primary)]">{title}</h2>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">{hint}</p>
    </div>
  );
}

function SelectCard({
  selected,
  onClick,
  icon,
  label,
  sub,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sub?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
        selected
          ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text-primary)]"
          : "border-[var(--border-default)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:border-[var(--border-subtle)] hover:bg-[var(--surface)]"
      )}
    >
      <span
        className={cn(
          "text-xl transition-colors",
          selected ? "text-[var(--accent)]" : "text-[var(--text-muted)]"
        )}
      >
        {icon}
      </span>
      <span className="text-sm font-medium">{label}</span>
      {sub && <span className="text-xs opacity-60">{sub}</span>}
    </button>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-t border-[var(--border-subtle)] first:border-t-0">
      <span className="shrink-0 text-sm text-[var(--text-muted)]">{label}</span>
      <span className="text-sm font-medium text-[var(--text-primary)] text-right">{value}</span>
    </div>
  );
}

/* ─── steps ─────────────────────────────────────────────────────── */

function Step1() {
  const { schoolName, educationLevel, setSchoolName, setEducationLevel } =
    useOnboardingStore();

  const levels = [
    "Freshman",
    "Sophomore",
    "Junior",
    "Senior",
    "Graduate",
    "Other",
  ];

  const inputCls =
    "h-11 w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-secondary)] px-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-colors focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]";

  return (
    <div>
      <StepHeading
        title="Where do you study?"
        hint="We'll use this to personalise your experience."
      />
      <div className="flex flex-col gap-4">
        <input
          className={inputCls}
          placeholder="School or university name"
          value={schoolName}
          onChange={(e) => setSchoolName(e.target.value)}
          autoFocus
        />
        <div className="relative">
          <select
            className={cn(inputCls, "appearance-none pr-9 cursor-pointer")}
            value={educationLevel}
            onChange={(e) => setEducationLevel(e.target.value)}
          >
            <option value="" disabled>
              Education level
            </option>
            {levels.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
        </div>
      </div>
    </div>
  );
}

function Step2() {
  const { peakHours, togglePeakHour } = useOnboardingStore();

  const options = [
    { id: "morning", icon: <Sunrise className="h-6 w-6" />, label: "Morning", sub: "6am – 12pm" },
    { id: "afternoon", icon: <Sun className="h-6 w-6" />, label: "Afternoon", sub: "12pm – 6pm" },
    { id: "night", icon: <Moon className="h-6 w-6" />, label: "Night", sub: "6pm – 2am" },
  ];

  return (
    <div>
      <StepHeading
        title="When are you most productive?"
        hint="Pick all that apply — we'll schedule study blocks around your peak hours."
      />
      <div className="grid grid-cols-3 gap-3">
        {options.map(({ id, icon, label, sub }) => (
          <SelectCard
            key={id}
            selected={peakHours.includes(id)}
            onClick={() => togglePeakHour(id)}
            icon={icon}
            label={label}
            sub={sub}
          />
        ))}
      </div>
    </div>
  );
}

function Step3() {
  const { sleepGoal, setSleepGoal } = useOnboardingStore();
  const pct = ((sleepGoal - 4) / (10 - 4)) * 100;

  return (
    <div>
      <StepHeading
        title="How much sleep do you aim for?"
        hint="We'll protect this time in your schedule."
      />
      <div className="flex flex-col items-center gap-8">
        {/* large value display */}
        <div className="text-center">
          <span className="text-6xl font-semibold tabular-nums text-[var(--text-primary)]">
            {sleepGoal}
          </span>
          <span className="ml-2 text-xl text-[var(--text-secondary)]">hours</span>
        </div>

        {/* slider */}
        <div className="w-full">
          <input
            type="range"
            min={4}
            max={10}
            step={1}
            value={sleepGoal}
            onChange={(e) => setSleepGoal(Number(e.target.value))}
            className="w-full cursor-pointer"
            style={{
              accentColor: "var(--accent)",
              background: `linear-gradient(to right, var(--accent) ${pct}%, var(--surface) ${pct}%)`,
              height: "6px",
              borderRadius: "9999px",
              outline: "none",
              appearance: "none",
              WebkitAppearance: "none",
            }}
          />
          <div className="mt-2 flex justify-between text-xs text-[var(--text-muted)]">
            <span>4h</span>
            <span>10h</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Step4() {
  const { challenges, toggleChallenge } = useOnboardingStore();

  const options = [
    { id: "procrastination", icon: <Flame className="h-6 w-6" />, label: "Procrastination" },
    { id: "focus", icon: <Brain className="h-6 w-6" />, label: "Staying focused" },
    { id: "estimating", icon: <Timer className="h-6 w-6" />, label: "Estimating time" },
    { id: "burnout", icon: <Clock className="h-6 w-6" />, label: "Burnout" },
  ];

  return (
    <div>
      <StepHeading
        title="What gets in your way?"
        hint="Pick all that apply — Pulse will focus on helping with these."
      />
      <div className="grid grid-cols-2 gap-3">
        {options.map(({ id, icon, label }) => (
          <SelectCard
            key={id}
            selected={challenges.includes(id)}
            onClick={() => toggleChallenge(id)}
            icon={icon}
            label={label}
          />
        ))}
      </div>
    </div>
  );
}

function Step5() {
  const router = useRouter();
  const {
    schoolName,
    educationLevel,
    peakHours,
    sleepGoal,
    challenges,
  } = useOnboardingStore();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const peakLabel: Record<string, string> = {
    morning: "Morning",
    afternoon: "Afternoon",
    night: "Night",
  };
  const challengeLabel: Record<string, string> = {
    procrastination: "Procrastination",
    focus: "Staying focused",
    estimating: "Estimating time",
    burnout: "Burnout",
  };

  async function handleFinish() {
    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error: dbError } = await supabase.from("user_profiles").upsert({
        user_id: user?.id,
        school_name: schoolName,
        education_level: educationLevel,
        peak_hours: peakHours,
        sleep_goal: sleepGoal,
        challenges,
        onboarding_completed: true,
      });

      if (dbError) throw dbError;
      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  const rows = [
    { label: "School", value: schoolName },
    { label: "Level", value: educationLevel },
    {
      label: "Peak hours",
      value: peakHours.map((h) => peakLabel[h] ?? h).join(", "),
    },
    { label: "Sleep goal", value: `${sleepGoal} hours / night` },
    {
      label: "Focus on",
      value: challenges.map((c) => challengeLabel[c] ?? c).join(", "),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">
          You&apos;re all set!
        </h2>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Here&apos;s what Pulse will use to build your workspace.
        </p>
      </div>

      {/* summary */}
      <div className="mb-6 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-1">
        {rows.map(({ label, value }) => (
          <SummaryRow key={label} label={label} value={value || "—"} />
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <Button
        variant="primary"
        size="lg"
        className="w-full"
        loading={saving}
        onClick={handleFinish}
      >
        {!saving && (
          <>
            Get started
            <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </div>
  );
}

/* ─── wizard shell ──────────────────────────────────────────────── */

const STEPS = [Step1, Step2, Step3, Step4, Step5];
const TOTAL = STEPS.length;

function canAdvance(
  step: number,
  state: {
    schoolName: string;
    educationLevel: string;
    peakHours: string[];
    challenges: string[];
  }
): boolean {
  if (step === 0) return state.schoolName.trim() !== "" && state.educationLevel !== "";
  if (step === 1) return state.peakHours.length > 0;
  if (step === 3) return state.challenges.length > 0;
  return true;
}

export default function OnboardingPage() {
  const dirRef = useRef<number>(1);
  const { step, setStep, schoolName, educationLevel, peakHours, challenges } =
    useOnboardingStore();

  function goNext() {
    dirRef.current = 1;
    setStep(Math.min(step + 1, TOTAL - 1));
  }

  function goBack() {
    dirRef.current = -1;
    setStep(Math.max(step - 1, 0));
  }

  const StepComponent = STEPS[step];
  const isLast = step === TOTAL - 1;
  const nextEnabled = canAdvance(step, {
    schoolName,
    educationLevel,
    peakHours,
    challenges,
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[var(--bg-primary)] px-4 py-12">
      <div className="w-full max-w-lg">
        {/* progress dots */}
        <div className="mb-6 flex items-center justify-center gap-2">
          {Array.from({ length: TOTAL }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "rounded-full transition-all duration-300",
                i === step
                  ? "h-2 w-5 bg-[var(--accent)]"
                  : i < step
                  ? "h-2 w-2 bg-[var(--accent)]/40"
                  : "h-2 w-2 border border-[var(--border-default)] bg-[var(--surface)]"
              )}
            />
          ))}
        </div>

        {/* card */}
        <div className="overflow-hidden rounded-2xl border border-[var(--border-default)] bg-[var(--surface)] p-8">
          <AnimatePresence mode="wait" custom={dirRef.current}>
            <motion.div
              key={step}
              custom={dirRef.current}
              variants={VARIANTS}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <StepComponent />
            </motion.div>
          </AnimatePresence>

          {/* navigation — only shown on steps 0–3 */}
          {!isLast && (
            <div className="mt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={goBack}
                disabled={step === 0}
                className={cn(
                  "flex items-center gap-1 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-secondary)]",
                  "disabled:pointer-events-none disabled:opacity-0"
                )}
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>

              <Button
                variant="primary"
                size="md"
                onClick={goNext}
                disabled={!nextEnabled}
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
