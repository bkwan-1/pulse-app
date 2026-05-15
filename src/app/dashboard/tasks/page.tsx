"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  Check,
  ChevronDown,
  CheckSquare,
  Pencil,
  Trash2,
  X,
  Plus,
} from "lucide-react";
import { Button, Badge, Input, Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useUser } from "@/hooks/useUser";
import { createClient } from "@/lib/supabase/client";

/* ─── types ──────────────────────────────────────────────────────── */

interface Task {
  id: string;
  user_id: string;
  title: string;
  course: string | null;
  due_date: string | null;
  estimated_hours: number | null;
  priority: "Low" | "Medium" | "High" | null;
  difficulty: number | null;
  status: "todo" | "in_progress" | "done";
  created_at: string;
}

interface TaskForm {
  title: string;
  course: string;
  due_date: string;
  estimated_hours: number;
  difficulty: number;
  priority: "Low" | "Medium" | "High";
}

type SortKey = "due_date" | "priority" | "course";

/* ─── constants ──────────────────────────────────────────────────── */

const EASE = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const DEFAULT_FORM: TaskForm = {
  title: "",
  course: "",
  due_date: "",
  estimated_hours: 1,
  difficulty: 3,
  priority: "Medium",
};

const PALETTE = [
  "bg-violet-500", "bg-blue-500", "bg-emerald-500", "bg-amber-500",
  "bg-rose-500",   "bg-indigo-500", "bg-cyan-500",  "bg-orange-500",
];

const PRIORITY_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 };

const PRIORITY_ACTIVE: Record<string, string> = {
  Low:    "bg-green-950 text-green-400 border border-green-800/60",
  Medium: "bg-yellow-950 text-yellow-400 border border-yellow-800/60",
  High:   "bg-red-950 text-red-400 border border-red-800/60",
};

const filterSelectCls =
  "h-8 appearance-none rounded-lg border border-[var(--border-default)] bg-[var(--surface)] pl-3 pr-7 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--accent)] cursor-pointer";

/* ─── helpers ────────────────────────────────────────────────────── */

function subjectColor(course: string): string {
  let h = 0;
  for (let i = 0; i < course.length; i++) h = (h * 31 + course.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}min`;
  if (hours % 1 === 0) return `${hours}h`;
  return `${Math.floor(hours)}h ${Math.round((hours % 1) * 60)}min`;
}

function formatDate(iso: string): string {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(iso + "T00:00:00");
  const diff = Math.round((d.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 0 && diff < 7) return d.toLocaleDateString("en-US", { weekday: "short" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function priorityVariant(p: string | null): "destructive" | "warning" | "success" | "default" {
  if (p === "High") return "destructive";
  if (p === "Medium") return "warning";
  if (p === "Low") return "success";
  return "default";
}

function sortTasks(list: Task[], by: SortKey): Task[] {
  return [...list].sort((a, b) => {
    if (by === "due_date") {
      if (!a.due_date && !b.due_date) return 0;
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    }
    if (by === "priority") {
      const pa = a.priority ? PRIORITY_ORDER[a.priority] : 99;
      const pb = b.priority ? PRIORITY_ORDER[b.priority] : 99;
      return pa - pb;
    }
    // course
    return (a.course ?? "").localeCompare(b.course ?? "");
  });
}

function groupTasks(list: Task[]): { label: string; tasks: Task[] }[] {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];
  const weekEnd = new Date(today.getTime() + 7 * 86_400_000).toISOString().split("T")[0];

  const groups: Record<string, Task[]> = {
    Overdue: [], Today: [], "This week": [], Later: [], Completed: [],
  };

  for (const t of list) {
    if (t.status === "done") { groups.Completed.push(t); continue; }
    if (!t.due_date) { groups.Later.push(t); continue; }
    if (t.due_date < todayStr) { groups.Overdue.push(t); continue; }
    if (t.due_date === todayStr) { groups.Today.push(t); continue; }
    if (t.due_date <= weekEnd) { groups["This week"].push(t); continue; }
    groups.Later.push(t);
  }

  return ["Overdue", "Today", "This week", "Later", "Completed"]
    .filter((k) => groups[k].length > 0)
    .map((k) => ({ label: k, tasks: groups[k] }));
}

/* ─── sub-components ─────────────────────────────────────────────── */

function GroupHeader({ label, count }: { label: string; count: number }) {
  const accent =
    label === "Overdue" ? "text-red-400" : "text-[var(--text-muted)]";
  return (
    <div className="flex items-center gap-2 bg-[var(--bg-primary)] px-4 py-2">
      <span className={cn("text-xs font-semibold uppercase tracking-widest", accent)}>
        {label}
      </span>
      <span className="text-xs text-[var(--text-muted)]">({count})</span>
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: Task;
  onToggle: (t: Task) => void;
  onEdit: (t: Task) => void;
  onDelete: (id: string) => void;
}) {
  const done = task.status === "done";

  return (
    <div className="group flex items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-3 transition-colors hover:bg-[var(--bg-tertiary)]">
      {/* checkbox */}
      <button
        onClick={() => onToggle(task)}
        className="shrink-0 focus-visible:outline-none"
        aria-label={done ? "Mark incomplete" : "Mark complete"}
      >
        <motion.div
          animate={done ? { scale: [1, 1.25, 1] } : { scale: 1 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors",
            done
              ? "border-[var(--accent)] bg-[var(--accent)]"
              : "border-[var(--border-default)] hover:border-[var(--accent)]"
          )}
        >
          {done && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
        </motion.div>
      </button>

      {/* row content — fade when done */}
      <motion.div
        animate={{ opacity: done ? 0.4 : 1 }}
        transition={{ duration: 0.25 }}
        className="grid min-w-0 flex-1 grid-cols-[10px_9rem_1fr_5rem_4rem_7rem_64px] items-center gap-3"
      >
        {/* color dot */}
        <span
          className={cn(
            "h-2.5 w-2.5 shrink-0 rounded-full",
            task.course ? subjectColor(task.course) : "bg-[var(--text-muted)]"
          )}
        />

        {/* course */}
        <span className="truncate text-xs text-[var(--text-muted)]">
          {task.course ?? "—"}
        </span>

        {/* title */}
        <span
          className={cn(
            "truncate text-sm font-medium transition-all duration-300",
            done
              ? "text-[var(--text-muted)] line-through"
              : "text-[var(--text-primary)]"
          )}
        >
          {task.title}
        </span>

        {/* due date */}
        <span className="text-xs text-[var(--text-muted)]">
          {task.due_date ? formatDate(task.due_date) : "—"}
        </span>

        {/* hours */}
        <span className="text-xs text-[var(--text-muted)]">
          {task.estimated_hours ? formatDuration(task.estimated_hours) : "—"}
        </span>

        {/* priority */}
        <div>
          {task.priority ? (
            <Badge variant={priorityVariant(task.priority)}>{task.priority}</Badge>
          ) : (
            <span className="text-xs text-[var(--text-muted)]">—</span>
          )}
        </div>

        {/* actions */}
        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={() => onEdit(task)}
            className="rounded-md p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--text-primary)] focus-visible:outline-none"
            aria-label="Edit task"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            className="rounded-md p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface)] hover:text-red-400 focus-visible:outline-none"
            aria-label="Delete task"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── slide panel ────────────────────────────────────────────────── */

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
  form: TaskForm;
  saving: boolean;
  onClose: () => void;
  onChange: <K extends keyof TaskForm>(k: K, v: TaskForm[K]) => void;
  onSave: () => void;
}) {
  const pct = ((form.estimated_hours - 0.25) / (8 - 0.25)) * 100;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[59] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            key="panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.28, ease: EASE }}
            className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-md flex-col border-l border-[var(--border-subtle)] bg-[var(--bg-secondary)] shadow-2xl"
          >
            {/* header */}
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--border-subtle)] px-5">
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
              <button
                onClick={onClose}
                className="rounded-md p-1.5 text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* form body */}
            <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5">
              <Input
                label="Title"
                value={form.title}
                onChange={(e) => onChange("title", e.target.value)}
                placeholder="e.g. Problem Set 4"
                autoFocus
              />
              <Input
                label="Subject / course"
                value={form.course}
                onChange={(e) => onChange("course", e.target.value)}
                placeholder="e.g. CS 101"
              />
              <Input
                label="Due date"
                type="date"
                value={form.due_date}
                onChange={(e) => onChange("due_date", e.target.value)}
              />

              {/* time slider */}
              <div className="flex flex-col gap-3">
                <label className="text-sm font-medium text-[var(--text-primary)]">
                  Estimated time
                </label>
                <p className="text-center text-2xl font-semibold text-[var(--text-primary)]">
                  {formatDuration(form.estimated_hours)}
                </p>
                <input
                  type="range"
                  min={0.25}
                  max={8}
                  step={0.25}
                  value={form.estimated_hours}
                  onChange={(e) => onChange("estimated_hours", parseFloat(e.target.value))}
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
                <div className="flex justify-between text-xs text-[var(--text-muted)]">
                  <span>15 min</span>
                  <span>8 hours</span>
                </div>
              </div>

              {/* difficulty */}
              <div className="flex flex-col gap-3">
                <label className="text-sm font-medium text-[var(--text-primary)]">
                  Difficulty
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => onChange("difficulty", d)}
                      className={cn(
                        "h-9 w-9 rounded-full border text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                        form.difficulty >= d
                          ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                          : "border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--accent)]/50"
                      )}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {/* priority */}
              <div className="flex flex-col gap-3">
                <label className="text-sm font-medium text-[var(--text-primary)]">
                  Priority
                </label>
                <div className="flex gap-2">
                  {(["Low", "Medium", "High"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => onChange("priority", p)}
                      className={cn(
                        "flex-1 rounded-lg py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                        form.priority === p
                          ? PRIORITY_ACTIVE[p]
                          : "border border-[var(--border-default)] bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* sticky footer */}
            <div className="flex shrink-0 gap-3 border-t border-[var(--border-subtle)] p-4">
              <Button variant="ghost" size="md" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                className="flex-1"
                loading={saving}
                disabled={!form.title.trim() || saving}
                onClick={onSave}
              >
                {saving ? null : "Save task"}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ─── page ───────────────────────────────────────────────────────── */

export default function TasksPage() {
  const { user } = useUser();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [form, setForm] = useState<TaskForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>("due_date");
  const [filterSubject, setFilterSubject] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  /* fetch */
  useEffect(() => {
    if (!user) return;
    createClient()
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setTasks((data ?? []) as Task[]);
        setLoading(false);
      });
  }, [user]);

  /* derived */
  const uniqueSubjects = [...new Set(tasks.map((t) => t.course).filter(Boolean))] as string[];

  const filtered = tasks.filter((t) => {
    if (filterSubject !== "all" && t.course !== filterSubject) return false;
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    return true;
  });

  const sorted = sortTasks(filtered, sortBy);
  const grouped = groupTasks(sorted);

  /* panel helpers */
  function setF<K extends keyof TaskForm>(k: K, v: TaskForm[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function openAdd() {
    setEditingTask(null);
    setForm(DEFAULT_FORM);
    setPanelOpen(true);
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setForm({
      title: task.title,
      course: task.course ?? "",
      due_date: task.due_date ?? "",
      estimated_hours: task.estimated_hours ?? 1,
      difficulty: task.difficulty ?? 3,
      priority: task.priority ?? "Medium",
    });
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
    setEditingTask(null);
  }

  /* mutations */
  async function toggleComplete(task: Task) {
    const newStatus = task.status === "done" ? "todo" : "done";
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus } : t)));
    const { error } = await createClient()
      .from("tasks")
      .update({ status: newStatus })
      .eq("id", task.id);
    if (error) {
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: task.status } : t)));
    }
  }

  async function deleteTask(id: string) {
    const snapshot = [...tasks];
    setTasks((prev) => prev.filter((t) => t.id !== id));
    toast.success("Task deleted.");
    const client = createClient();
    // Delete schedule blocks first (FK is ON DELETE SET NULL, so must clean up manually)
    await client.from("schedules").delete().eq("task_id", id);
    const { error } = await client.from("tasks").delete().eq("id", id);
    if (error) {
      setTasks(snapshot);
      toast.error("Failed to delete task.");
    }
  }

  async function handleSave() {
    if (!user || !form.title.trim()) return;
    setSaving(true);

    const row = {
      user_id: user.id,
      title: form.title.trim(),
      course: form.course.trim() || null,
      due_date: form.due_date || null,
      estimated_hours: form.estimated_hours,
      difficulty: form.difficulty,
      priority: form.priority,
      status: "todo" as const,
    };

    if (editingTask) {
      const original = tasks.find((t) => t.id === editingTask.id)!;
      setTasks((prev) =>
        prev.map((t) => (t.id === editingTask.id ? { ...t, ...row } : t))
      );
      toast.success("Task updated.");
      closePanel();
      const { error } = await createClient()
        .from("tasks")
        .update(row)
        .eq("id", editingTask.id);
      if (error) {
        console.error("Update task error:", error);
        setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? original : t)));
        toast.error(`Failed to update task: ${error.message}`);
      }
    } else {
      const tempId = `temp-${Date.now()}`;
      const optimistic: Task = {
        ...row,
        id: tempId,
        created_at: new Date().toISOString(),
      };
      setTasks((prev) => [optimistic, ...prev]);
      toast.success("Task added.");
      closePanel();
      const { data, error } = await createClient()
        .from("tasks")
        .insert(row)
        .select()
        .single();
      if (error) {
        console.error("Insert task error:", error);
        setTasks((prev) => prev.filter((t) => t.id !== tempId));
        toast.error(`Failed to add task: ${error.message}`);
      } else {
        setTasks((prev) => prev.map((t) => (t.id === tempId ? (data as Task) : t)));
      }
    }

    setSaving(false);
  }

  /* render */
  return (
    <div className="flex max-w-6xl flex-col gap-6">
      {/* header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Tasks</h1>
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
            Manage and track all your assignments.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={openAdd} className="shrink-0">
          <Plus className="h-4 w-4" />
          Add task
        </Button>
      </div>

      {/* sort/filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* sort */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className={filterSelectCls}
          >
            <option value="due_date">Sort: Due date</option>
            <option value="priority">Sort: Priority</option>
            <option value="course">Sort: Subject</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
        </div>

        {/* subject filter */}
        <div className="relative">
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className={filterSelectCls}
          >
            <option value="all">Subject: All</option>
            {uniqueSubjects.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
        </div>

        {/* status filter */}
        <div className="relative">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={filterSelectCls}
          >
            <option value="all">Status: All</option>
            <option value="todo">To do</option>
            <option value="in_progress">In progress</option>
            <option value="done">Done</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
        </div>

        {/* priority filter */}
        <div className="relative">
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className={filterSelectCls}
          >
            <option value="all">Priority: All</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
        </div>

        <span className="ml-auto text-xs text-[var(--text-muted)]">
          {filtered.length} task{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* task list */}
      <div className="overflow-hidden rounded-xl border border-[var(--border-default)] bg-[var(--surface)]">
        {/* column headers */}
        <div className="hidden grid-cols-[20px_10px_9rem_1fr_5rem_4rem_7rem_64px] items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-2 md:grid">
          {["", "", "Subject", "Title", "Due", "Time", "Priority", ""].map((h, i) => (
            <span key={i} className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)]">
              {h}
            </span>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col gap-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-3">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <CheckSquare className="mb-4 h-12 w-12 text-[var(--text-muted)]" />
            <p className="text-sm font-medium text-[var(--text-secondary)]">
              {filtered.length === 0 && tasks.length > 0 ? "No tasks match your filters" : "No tasks yet"}
            </p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {filtered.length === 0 && tasks.length > 0
                ? "Try adjusting the filters above"
                : "Add your first task to get started"}
            </p>
            {tasks.length === 0 && (
              <Button variant="ghost" size="sm" className="mt-4" onClick={openAdd}>
                + Add task
              </Button>
            )}
          </div>
        ) : (
          grouped.map(({ label, tasks: groupedTasks }) => (
            <div key={label}>
              <GroupHeader label={label} count={groupedTasks.length} />
              {groupedTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onToggle={toggleComplete}
                  onEdit={openEdit}
                  onDelete={deleteTask}
                />
              ))}
            </div>
          ))
        )}
      </div>

      {/* slide panel */}
      <SlidePanel
        open={panelOpen}
        title={editingTask ? "Edit task" : "Add task"}
        form={form}
        saving={saving}
        onClose={closePanel}
        onChange={setF}
        onSave={handleSave}
      />
    </div>
  );
}
