import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROMPT = `You are a task extraction assistant for a student productivity app.
Extract every academic task, assignment, quiz, exam, project, or deadline from the provided content.

Return ONLY a raw JSON array — no markdown code fences, no explanation, no extra text.
Each element in the array must have exactly these fields:
{
  "title": "short descriptive task name (e.g. 'Problem Set 4', 'Midterm Exam')",
  "due_date": "YYYY-MM-DD format, or empty string if not mentioned",
  "subject": "course or subject name, or empty string if unknown",
  "estimated_hours": <realistic number, default 2 if unclear>,
  "difficulty": "Easy" or "Medium" or "Hard",
  "priority": "Low" or "Medium" or "High"
}

Infer priority from urgency (due date proximity) and difficulty.
If no tasks are found, return an empty array: []`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, text, fileData, mimeType } = body as {
      type: "text" | "file";
      text?: string;
      fileData?: string;
      mimeType?: string;
    };

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    let result;
    if (type === "file" && fileData && mimeType) {
      result = await model.generateContent([
        PROMPT,
        { inlineData: { data: fileData, mimeType } },
      ]);
    } else if (type === "text" && text) {
      result = await model.generateContent(`${PROMPT}\n\nContent to analyze:\n${text}`);
    } else {
      return NextResponse.json(
        { error: "Invalid request: provide text or file data." },
        { status: 400 }
      );
    }

    const raw = result.response.text().trim();
    // Strip accidental markdown code fences Gemini sometimes emits
    const cleaned = raw
      .replace(/^```(?:json)?\s*\n?/, "")
      .replace(/\n?```\s*$/, "")
      .trim();

    const tasks = JSON.parse(cleaned);
    return NextResponse.json({
      tasks: Array.isArray(tasks) ? tasks : [],
    });
  } catch (err) {
    console.error("[extract-tasks]", err);
    const message =
      err instanceof Error ? err.message : "Extraction failed unexpectedly.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
