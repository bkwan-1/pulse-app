"use client";

import { useRef, useState } from "react";
import {
  Upload,
  FileText,
  X,
  ChevronDown,
  Sparkles,
  CheckCircle,
} from "lucide-react";
import { Button, Badge, Card, Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

/* ─── types ─────────────────────────────────────────────────────── */

interface ExtractedTask {
  title: string;
  due_date: string;
  subject: string;
  estimated_hours: number;
  difficulty: "Easy" | "Medium" | "Hard";
  priority: "Low" | "Medium" | "High";
}

type Tab = "upload" | "text";

/* ─── helpers ───────────────────────────────────────────────────── */

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
  });
}

const ACCEPTED_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];

function priorityBadge(p: string): "destructive" | "warning" | "success" {
  if (p === "High") return "destructive";
  if (p === "Medium") return "warning";
  return "success";
}

function difficultyBadge(d: string): "destructive" | "warning" | "success" {
  if (d === "Hard") return "destructive";
  if (d === "Medium") return "warning";
  return "success";
}

const selectCls =
  "h-10 w-full appearance-none rounded-lg border border-[var(--border-default)] bg-[var(--surface)] px-3 text-sm text-[var(--text-primary)] outline-none transition-colors focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]";

/* ─── editable task card ─────────────────────────────────────────── */

function TaskCard({
  task,
  index,
  onUpdate,
  onRemove,
}: {
  task: ExtractedTask;
  index: number;
  onUpdate: (index: number, field: keyof ExtractedTask, value: string | number) => void;
  onRemove: (index: number) => void;
}) {
  return (
    <Card className="flex flex-col gap-4 p-4">
      {/* badges + delete */}
      <div className="flex items-center gap-2">
        <Badge variant={priorityBadge(task.priority)}>{task.priority} priority</Badge>
        <Badge variant={difficultyBadge(task.difficulty)}>{task.difficulty}</Badge>
        <button
          onClick={() => onRemove(index)}
          className="ml-auto rounded-md p-1 text-[var(--text-muted)] transition-colors hover:text-red-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
          aria-label="Remove task"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* title */}
      <Input
        label="Title"
        value={task.title}
        onChange={(e) => onUpdate(index, "title", e.target.value)}
        placeholder="Task title"
      />

      {/* subject + due date */}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Subject"
          value={task.subject}
          onChange={(e) => onUpdate(index, "subject", e.target.value)}
          placeholder="Course name"
        />
        <Input
          label="Due date"
          type="date"
          value={task.due_date}
          onChange={(e) => onUpdate(index, "due_date", e.target.value)}
        />
      </div>

      {/* hours + priority + difficulty */}
      <div className="grid grid-cols-3 gap-3">
        <Input
          label="Est. hours"
          type="number"
          min={0}
          step={0.5}
          value={task.estimated_hours}
          onChange={(e) => onUpdate(index, "estimated_hours", parseFloat(e.target.value) || 0)}
        />

        {/* priority select */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--text-primary)]">Priority</label>
          <div className="relative">
            <select
              value={task.priority}
              onChange={(e) =>
                onUpdate(index, "priority", e.target.value as ExtractedTask["priority"])
              }
              className={selectCls}
            >
              {["Low", "Medium", "High"].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          </div>
        </div>

        {/* difficulty select */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--text-primary)]">Difficulty</label>
          <div className="relative">
            <select
              value={task.difficulty}
              onChange={(e) =>
                onUpdate(index, "difficulty", e.target.value as ExtractedTask["difficulty"])
              }
              className={selectCls}
            >
              {["Easy", "Medium", "Hard"].map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ─── page ───────────────────────────────────────────────────────── */

export default function IntakePage() {
  const [tab, setTab] = useState<Tab>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [tasks, setTasks] = useState<ExtractedTask[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── file helpers ──────────────────────────────────────────────── */

  function acceptFile(f: File) {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      setError("Only PDF, PNG, and JPG files are accepted.");
      return;
    }
    setError(null);
    setFile(f);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) acceptFile(dropped);
  }

  /* ── extract ───────────────────────────────────────────────────── */

  async function handleExtract() {
    setExtracting(true);
    setError(null);
    setTasks([]);
    setSavedCount(null);

    try {
      let body: object;
      if (tab === "upload") {
        const base64 = await fileToBase64(file!);
        body = { type: "file", fileData: base64, mimeType: file!.type };
      } else {
        body = { type: "text", text: pasteText };
      }

      const res = await fetch("/api/extract-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Extraction failed");
      if (!Array.isArray(data.tasks) || data.tasks.length === 0) {
        setError("No tasks found. Try providing more detailed content.");
        return;
      }
      setTasks(data.tasks);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setExtracting(false);
    }
  }

  /* ── task mutations ────────────────────────────────────────────── */

  function updateTask(index: number, field: keyof ExtractedTask, value: string | number) {
    setTasks((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    );
  }

  function removeTask(index: number) {
    setTasks((prev) => prev.filter((_, i) => i !== index));
  }

  /* ── save ──────────────────────────────────────────────────────── */

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Not authenticated");

      const rows = tasks.map((t) => ({
        user_id: user.id,
        title: t.title,
        course: t.subject || null,
        due_date: t.due_date || null,
        estimated_hours: t.estimated_hours,
        status: "todo",
      }));

      const { error: dbError } = await supabase.from("tasks").insert(rows);
      if (dbError) throw dbError;

      setSavedCount(tasks.length);
      setTasks([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const canExtract =
    tab === "upload" ? !!file : pasteText.trim().length > 0;

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      {/* header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">AI Intake</h1>
        <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
          Drop a syllabus or paste text — Pulse extracts every deadline automatically.
        </p>
      </div>

      {/* tab bar */}
      <div className="flex gap-1 rounded-xl bg-[var(--bg-secondary)] p-1">
        {(["upload", "text"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setFile(null);
              setError(null);
              setSavedCount(null);
            }}
            className={cn(
              "flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
              tab === t
                ? "bg-[var(--surface)] text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}
          >
            {t === "upload" ? "Upload file" : "Paste text"}
          </button>
        ))}
      </div>

      {/* tab content */}
      {tab === "upload" ? (
        <div>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed transition-colors",
              isDragOver
                ? "border-[var(--accent)] bg-[var(--accent)]/[0.06]"
                : file
                ? "border-[var(--accent)]/40 bg-[var(--bg-secondary)]"
                : "border-[var(--border-default)] bg-[var(--bg-secondary)] hover:border-[var(--text-muted)]"
            )}
          >
            {file ? (
              <div className="flex items-center gap-3 px-6">
                <FileText className="h-6 w-6 shrink-0 text-[var(--accent)]" />
                <span className="max-w-[280px] truncate text-sm font-medium text-[var(--text-primary)]">
                  {file.name}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  className="ml-auto rounded p-1 text-[var(--text-muted)] transition-colors hover:text-red-400"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="h-8 w-8 text-[var(--text-muted)]" />
                <div className="text-center">
                  <p className="text-sm font-medium text-[var(--text-secondary)]">
                    Drag & drop or click to upload
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    PDF, PNG, JPG accepted
                  </p>
                </div>
              </>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) acceptFile(f);
            }}
          />
        </div>
      ) : (
        <textarea
          value={pasteText}
          onChange={(e) => setPasteText(e.target.value)}
          placeholder="Paste your syllabus, assignment email, or any text with deadlines…"
          rows={10}
          className="w-full resize-y rounded-xl border border-[var(--border-default)] bg-[var(--bg-secondary)] p-4 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-colors focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]"
        />
      )}

      {/* error banner */}
      {error && (
        <div className="rounded-lg border border-[var(--status-overload)]/30 bg-[var(--status-overload)]/10 px-4 py-3 text-sm text-[var(--status-overload)]">
          {error}
        </div>
      )}

      {/* success banner */}
      {savedCount !== null && (
        <div className="flex items-center gap-2 rounded-lg border border-[var(--status-success)]/30 bg-[var(--status-success)]/10 px-4 py-3 text-sm text-[var(--status-success)]">
          <CheckCircle className="h-4 w-4 shrink-0" />
          {savedCount} task{savedCount !== 1 ? "s" : ""} saved to your task list.
        </div>
      )}

      {/* extract button */}
      <Button
        variant="primary"
        size="lg"
        loading={extracting}
        disabled={!canExtract || extracting}
        onClick={handleExtract}
        className="w-full"
      >
        {!extracting && <Sparkles className="h-4 w-4" />}
        Extract deadlines
      </Button>

      {/* extracted tasks */}
      {tasks.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              {tasks.length} task{tasks.length !== 1 ? "s" : ""} found — review and edit before saving
            </h2>
            <span className="text-xs text-[var(--text-muted)]">
              All fields are editable
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {tasks.map((task, i) => (
              <TaskCard
                key={i}
                task={task}
                index={i}
                onUpdate={updateTask}
                onRemove={removeTask}
              />
            ))}
          </div>

          <Button
            variant="primary"
            size="lg"
            loading={saving}
            onClick={handleSave}
            className="w-full"
          >
            Save {tasks.length} task{tasks.length !== 1 ? "s" : ""}
          </Button>
        </div>
      )}
    </div>
  );
}
