import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildSchedulePrompt,
  offsetDate,
  type ScheduleTask,
  type ScheduleProfile,
  type Activity,
} from "@/lib/ai/schedulePrompt";

const DEFAULT_PROFILE: ScheduleProfile = {
  peak_hours: ["morning"],
  sleep_goal: 7,
  challenges: [],
};

interface GeminiBlock {
  taskId: string;
  date: string;
  startTime: string;
  duration: number;
}

export async function POST() {
  try {
    // 1. Authenticate
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch incomplete tasks
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("id,title,course,due_date,estimated_hours,priority,difficulty")
      .eq("user_id", user.id)
      .neq("status", "done");

    if (tasksError) throw tasksError;

    // 3. Fetch user profile
    const { data: profileRow } = await supabase
      .from("user_profiles")
      .select("peak_hours,sleep_goal,challenges")
      .eq("user_id", user.id)
      .single();

    const profile: ScheduleProfile = profileRow
      ? {
          peak_hours: (profileRow.peak_hours as string[]) ?? [],
          sleep_goal: (profileRow.sleep_goal as number) ?? 7,
          challenges: (profileRow.challenges as string[]) ?? [],
        }
      : DEFAULT_PROFILE;

    // 4. Fetch activities (blocked times)
    const { data: activitiesData } = await supabase
      .from("activities")
      .select("title,days_of_week,start_time,end_time")
      .eq("user_id", user.id);

    // 5. Build prompt + call Gemini
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const today = new Date().toISOString().split("T")[0];
    const prompt = buildSchedulePrompt(
      (tasks ?? []) as ScheduleTask[],
      profile,
      today,
      7,
      (activitiesData ?? []) as Activity[]
    );

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
    });
    const raw = (result.text ?? "")
      .trim()
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?```\s*$/, "")
      .trim();

    const blocks: GeminiBlock[] = JSON.parse(raw);

    if (!Array.isArray(blocks)) {
      return NextResponse.json({ blocks: [] });
    }

    // 5. Replace future schedule (clean slate for dates >= today)
    await supabase
      .from("schedules")
      .delete()
      .eq("user_id", user.id)
      .gte("date", today);

    if (blocks.length === 0) {
      return NextResponse.json({ blocks: [] });
    }

    // 6. Validate + filter blocks (guard against bad Gemini output)
    const endDate = offsetDate(today, 7);
    const validTaskIds = new Set((tasks ?? []).map((t) => t.id));

    // Per-task hour caps and dedup state
    const taskMaxHours = new Map(
      (tasks ?? []).map((t) => [t.id, t.estimated_hours ?? 1])
    );
    const taskScheduled = new Map<string, number>();
    const seenSlots = new Set<string>();

    const rows = blocks
      .filter(
        (b) =>
          b.taskId &&
          validTaskIds.has(b.taskId) &&
          b.date >= today &&
          b.date <= endDate &&
          b.startTime &&
          typeof b.duration === "number" &&
          b.duration > 0 &&
          b.duration <= 8
      )
      .reduce<{ user_id: string; task_id: string; date: string; start_time: string; duration: number }[]>(
        (acc, b) => {
          // Drop exact duplicate slots for the same task
          const slotKey = `${b.taskId}|${b.date}|${b.startTime}`;
          if (seenSlots.has(slotKey)) return acc;
          seenSlots.add(slotKey);

          // Cap total scheduled hours at the task's estimated_hours
          const maxHours = taskMaxHours.get(b.taskId) ?? 1;
          const already = taskScheduled.get(b.taskId) ?? 0;
          if (already >= maxHours) return acc;

          const duration = Math.min(b.duration, maxHours - already);
          taskScheduled.set(b.taskId, already + duration);

          acc.push({
            user_id: user.id,
            task_id: b.taskId,
            date: b.date,
            start_time: b.startTime,
            duration,
          });
          return acc;
        },
        []
      );

    const { data: saved, error: insertError } = await supabase
      .from("schedules")
      .insert(rows)
      .select();

    if (insertError) throw insertError;

    return NextResponse.json({ blocks: saved ?? rows });
  } catch (err) {
    console.error("[generate-schedule]", err);

    let message = "Schedule generation failed.";
    if (err instanceof Error) {
      // Gemini SDK throws with the raw API JSON as the message — parse it
      try {
        const parsed = JSON.parse(err.message) as { error?: { code?: number; message?: string } };
        const inner = parsed?.error?.message ?? "";
        const code = parsed?.error?.code;
        if (code === 429 || inner.toLowerCase().includes("quota") || inner.includes("RESOURCE_EXHAUSTED")) {
          message = "AI quota exceeded. Please wait a moment and try again.";
        } else if (inner) {
          message = inner.split("\\n")[0].trim();
        }
      } catch {
        message = err.message;
      }
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
