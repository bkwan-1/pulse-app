"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Pencil, Clock } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { Button, Skeleton } from "@/components/ui";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/* ─── types ─────────────────────────────────────────────────────── */

interface ActivityItem {
  id: string;
  user_id: string;
  title: string;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  color: string;
  created_at: string;
}

interface ActivityForm {
  title: string;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  color: string;
}

/* ─── constants ─────────────────────────────────────────────────── */

const EASE = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const DEFAULT_FORM: ActivityForm = {
  title: "",
  days_of_week: [],
  start_time: "09:00",
  end_time: "10:00",
  color: "#7c3aed",
};

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const DAY_NAMES  = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const COLOR_SWATCHES = [
  "#7c3aed", // violet
  "#2563eb", // blue
  "#16a34a", // green
  "#ea580c", // orange
  "#dc2626", // red
  "#db2777", // pink
];

/* ─── helpers ───────────────────────────────────────────────────── */

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const hour = h ?? 0;
  const min  = m ?? 0;
  const ampm = hour < 12 ? "AM" : "PM";
  const h12  = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${min.toString().padStart(2, "0")} ${ampm}`;
}

function dayBadges(days: number[]): string {
  return [...days].sort((a, b) => a - b).map((d) => DAY_LABELS[d]).join(" ");
}

/* ─── slide panel ───────────────────────────────────────────────── */

function SlidePanel({
  open,
  title,
  form,
  saving,
  onClose,
  onChange,
  onSave,
}: {
  open: boolean;
  title: string;
  form: ActivityForm;
  saving: boolean;
  onClose: () => void;
  onChange: <K extends keyof ActivityForm>(k: K, v: ActivityForm[K]) => void;
  onSave: () => void;
}) {
  function toggleDay(d: number) {
    const next = form.days_of_week.includes(d)
      ? form.days_of_week.filter((x) => x !== d)
      : [...form.days_of_week, d];
    onChange("days_of_week", next);
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[59] bg-black/50 backdrop-blur-sm"
          />
          {/* panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.28, ease: EASE }}
            className="fixed right-0 top-0 z-[60] flex h-full w-full max-w-md flex-col bg-[var(--bg-secondary)] shadow-2xl"
          >
            {/* header */}
            <div className="flex h-14 items-center justify-between border-b border-[var(--border-subtle)] px-5">
              <h2 className="font-semibold text-[var(--text-primary)]">{title}</h2>
              <button
                onClick={onClose}
                className="rounded-md p-1 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                ✕
              </button>
            </div>

            {/* body */}
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">

              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">Activity name *</label>
                <input
                  autoFocus
                  value={form.title}
                  onChange={(e) => onChange("title", e.target.value)}
                  placeholder="e.g. Soccer Practice, CS101 Class"
                  className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                />
              </div>

              {/* Days of week */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">Repeats on *</label>
                <div className="flex gap-1.5">
                  {DAY_LABELS.map((label, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDay(i)}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg text-xs font-semibold transition-colors",
                        form.days_of_week.includes(i)
                          ? "bg-[var(--accent)] text-white"
                          : "border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time range */}
              <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">Start time *</label>
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => onChange("start_time", e.target.value)}
                    className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <label className="text-xs font-medium text-[var(--text-secondary)]">End time *</label>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => onChange("end_time", e.target.value)}
                    className="w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                  />
                </div>
              </div>

              {/* Color */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">Colour</label>
                <div className="flex gap-2">
                  {COLOR_SWATCHES.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => onChange("color", hex)}
                      style={{ backgroundColor: hex }}
                      className={cn(
                        "h-8 w-8 rounded-full transition-transform hover:scale-110",
                        form.color === hex && "ring-2 ring-white ring-offset-2 ring-offset-[var(--bg-secondary)]"
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* footer */}
            <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] px-5 py-4">
              <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
              <Button variant="primary" size="sm" loading={saving} onClick={onSave}>
                Save activity
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── page ──────────────────────────────────────────────────────── */

export default function ActivitiesPage() {
  const { user } = useUser();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [form, setForm] = useState<ActivityForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityItem | null>(null);

  function onChange<K extends keyof ActivityForm>(k: K, v: ActivityForm[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function openAdd() {
    setEditingActivity(null);
    setForm(DEFAULT_FORM);
    setPanelOpen(true);
  }

  function openEdit(a: ActivityItem) {
    setEditingActivity(a);
    setForm({
      title: a.title,
      days_of_week: a.days_of_week,
      start_time: a.start_time.slice(0, 5),
      end_time: a.end_time.slice(0, 5),
      color: a.color,
    });
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
    setEditingActivity(null);
    setForm(DEFAULT_FORM);
  }

  useEffect(() => {
    if (!user) return;
    createClient()
      .from("activities")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .then(({ data, error }) => {
        if (error) toast.error("Failed to load activities.");
        setActivities((data ?? []) as ActivityItem[]);
        setLoading(false);
      });
  }, [user]);

  async function handleSave() {
    if (!user) return;
    if (!form.title.trim()) { toast.error("Activity name is required."); return; }
    if (form.days_of_week.length === 0) { toast.error("Select at least one day."); return; }
    if (form.start_time >= form.end_time) { toast.error("End time must be after start time."); return; }

    setSaving(true);
    const row = {
      user_id: user.id,
      title: form.title.trim(),
      days_of_week: form.days_of_week,
      start_time: form.start_time,
      end_time: form.end_time,
      color: form.color,
    };

    if (editingActivity) {
      const original = editingActivity;
      setActivities((prev) => prev.map((a) => a.id === editingActivity.id ? { ...a, ...row } : a));
      toast.success("Activity updated.");
      closePanel();
      const { error } = await createClient().from("activities").update(row).eq("id", editingActivity.id);
      if (error) {
        setActivities((prev) => prev.map((a) => a.id === original.id ? original : a));
        toast.error("Failed to update activity.");
      }
    } else {
      const tempId = `temp-${Date.now()}`;
      const optimistic: ActivityItem = { ...row, id: tempId, created_at: new Date().toISOString() };
      setActivities((prev) => [...prev, optimistic]);
      toast.success("Activity added.");
      closePanel();
      const { data, error } = await createClient().from("activities").insert(row).select().single();
      if (error) {
        setActivities((prev) => prev.filter((a) => a.id !== tempId));
        toast.error("Failed to add activity.");
      } else if (data) {
        setActivities((prev) => prev.map((a) => a.id === tempId ? (data as ActivityItem) : a));
      }
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const snapshot = activities;
    setActivities((prev) => prev.filter((a) => a.id !== id));
    toast.success("Activity deleted.");
    const { error } = await createClient().from("activities").delete().eq("id", id);
    if (error) {
      setActivities(snapshot);
      toast.error("Failed to delete activity.");
    }
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Activities</h1>
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
            Recurring commitments that block time on your schedule
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4" />
          Add activity
        </Button>
      </div>

      {/* list */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-8 py-16 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20">
            <Clock className="h-6 w-6 text-[var(--accent)]" />
          </div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">No activities yet</h2>
          <p className="mt-1.5 max-w-xs text-sm text-[var(--text-secondary)]">
            Add classes, sports, work shifts, or any recurring commitment. Pulse will avoid scheduling study time during these blocks.
          </p>
          <Button variant="primary" size="sm" className="mt-5" onClick={openAdd}>
            <Plus className="h-4 w-4" />
            Add your first activity
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {activities.map((a) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.18, ease: EASE }}
                className="group relative flex items-center gap-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] px-4 py-3 hover:border-[var(--border-default)]"
                style={{ borderLeft: `3px solid ${a.color}` }}
              >
                {/* color dot */}
                <div
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: a.color }}
                />

                {/* info */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{a.title}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-[var(--text-muted)]">
                    <span>{dayBadges(a.days_of_week)}</span>
                    <span>·</span>
                    <span>{formatTime(a.start_time.slice(0, 5))} – {formatTime(a.end_time.slice(0, 5))}</span>
                  </div>
                </div>

                {/* day badges */}
                <div className="hidden shrink-0 flex-wrap gap-1 sm:flex">
                  {[...a.days_of_week].sort((x, y) => x - y).map((d) => (
                    <span
                      key={d}
                      className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                      style={{ backgroundColor: a.color + "22", color: a.color }}
                    >
                      {DAY_NAMES[d]?.slice(0, 3)}
                    </span>
                  ))}
                </div>

                {/* actions */}
                <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => openEdit(a)}
                    className="rounded-md p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="rounded-md p-1.5 text-[var(--text-muted)] transition-colors hover:bg-red-950/40 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* hint */}
      {activities.length > 0 && (
        <p className="text-xs text-[var(--text-muted)]">
          These times are blocked on your schedule. Regenerate your schedule after adding activities.
        </p>
      )}

      <SlidePanel
        open={panelOpen}
        title={editingActivity ? "Edit activity" : "Add activity"}
        form={form}
        saving={saving}
        onClose={closePanel}
        onChange={onChange}
        onSave={handleSave}
      />
    </div>
  );
}
