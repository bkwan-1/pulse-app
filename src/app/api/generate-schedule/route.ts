import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildSchedulePrompt,
  offsetDate,
  type ScheduleTask,
  type ScheduleProfile,
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

    // 4. Build prompt + call Gemini
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
      7
    );

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const result = await ai.models.generateContent({
      model: "gemini-2.0-flash-lite",
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
      .map((b) => ({
        user_id: user.id,
        task_id: b.taskId,
        date: b.date,
        start_time: b.startTime,
        duration: b.duration,
      }));

    const { data: saved, error: insertError } = await supabase
      .from("schedules")
      .insert(rows)
      .select();

    if (insertError) throw insertError;

    return NextResponse.json({ blocks: saved ?? rows });
  } catch (err) {
    console.error("[generate-schedule]", err);
    const message =
      err instanceof Error ? err.message : "Schedule generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
