import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SCORE_LABEL = (s: number) =>
  s < 26 ? "Healthy" : s < 51 ? "Moderate" : s < 76 ? "High" : "Critical";

export async function POST(request: NextRequest) {
  try {
    const {
      score,
      overdueCount,
      totalTasks,
      completionRateThisWeek,
      completionRateLastWeek,
      avgDailyHours,
    } = await request.json();

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const label = SCORE_LABEL(score ?? 0);

    const prompt = `You are a student wellbeing assistant providing brief, actionable feedback.

Student metrics:
- Burnout score: ${score}/100 (${label})
- Overdue tasks: ${overdueCount} of ${totalTasks} total tasks
- Completion rate this week: ${completionRateThisWeek}% (last week: ${completionRateLastWeek}%)
- Average daily focus hours: ${avgDailyHours}h

Write exactly 2 sentences of practical, empathetic feedback addressed directly to the student. Be specific to their metrics. No bullet points, no headers, no markdown.`;

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: prompt,
    });
    const insight = (result.text ?? "").trim();

    return NextResponse.json({ insight });
  } catch (err) {
    console.error("[burnout-insight]", err);
    return NextResponse.json(
      { error: "Insight generation failed." },
      { status: 500 }
    );
  }
}
