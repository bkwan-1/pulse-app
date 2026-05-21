export interface ScheduleTask {
  id: string;
  title: string;
  course: string | null;
  due_date: string | null;
  estimated_hours: number | null;
  priority: "Low" | "Medium" | "High" | null;
  difficulty: number | null;
}

export interface ScheduleProfile {
  peak_hours: string[];  // ["morning", "afternoon", "night"]
  sleep_goal: number;    // 4–10
  challenges: string[];
}

export interface Activity {
  title: string;
  days_of_week: number[];  // 0=Sun, 1=Mon, ..., 6=Sat
  start_time: string;      // "HH:MM"
  end_time: string;        // "HH:MM"
}

export function offsetDate(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

const PEAK_WINDOWS: Record<string, string> = {
  morning:   "06:00–12:00",
  afternoon: "12:00–18:00",
  night:     "18:00–23:00",
};

const DAY_NAMES = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

export function buildSchedulePrompt(
  tasks: ScheduleTask[],
  profile: ScheduleProfile,
  today: string,
  daysAhead = 7,
  activities: Activity[] = []
): string {
  const endDate = offsetDate(today, daysAhead - 1);

  const peakStr =
    profile.peak_hours.length > 0
      ? profile.peak_hours
          .map((h) => `${h} (${PEAK_WINDOWS[h] ?? h})`)
          .join(", ")
      : "any time of day";

  // Sleep budget: bedtime is 22:00 minus extra hours beyond 8h sleep target
  // A student sleeping 8h aims for 22:00–06:00. Sleeping 6h → 00:00–06:00, etc.
  const bedtimeHour = Math.max(20, 22 - Math.max(0, 8 - profile.sleep_goal));
  const noScheduleAfter = `${bedtimeHour.toString().padStart(2, "0")}:00`;

  const challengeStr =
    profile.challenges.length > 0
      ? profile.challenges.join(", ")
      : "general workload management";

  const taskList =
    tasks.length > 0
      ? tasks
          .map(
            (t) =>
              `  - ID: ${t.id}` +
              ` | "${t.title}"` +
              ` | Course: ${t.course ?? "N/A"}` +
              ` | Due: ${t.due_date ?? "no deadline"}` +
              ` | Est: ${t.estimated_hours ?? 1}h` +
              ` | Priority: ${t.priority ?? "Medium"}` +
              ` | Difficulty: ${t.difficulty ?? 3}/5`
          )
          .join("\n")
      : "  (no tasks)";

  // Build blocked times string from activities
  let blockedRule = "";
  if (activities.length > 0) {
    const byDay: Record<number, string[]> = {};
    for (const a of activities) {
      for (const d of a.days_of_week) {
        if (!byDay[d]) byDay[d] = [];
        byDay[d].push(`${a.start_time}–${a.end_time} (${a.title})`);
      }
    }
    const lines = Object.entries(byDay)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([day, times]) => `  - ${DAY_NAMES[Number(day)]}: ${times.join(", ")}`);
    blockedRule = `\n12. NEVER schedule during these blocked times (activities/commitments the student cannot skip):\n${lines.join("\n")}`;
  }

  return `You are an expert academic schedule planner for students. Your job is to create a realistic, sustainable weekly study schedule.

STUDENT PROFILE:
- Peak productivity hours: ${peakStr}
- Sleep goal: ${profile.sleep_goal} hours/night → do not schedule after ${noScheduleAfter}
- Key challenges: ${challengeStr}

TASKS TO SCHEDULE (status: not yet done):
${taskList}

SCHEDULING WINDOW: ${today} (today) through ${endDate} (${daysAhead} days)

RULES — follow every rule strictly:
1. Prefer scheduling work during the student's peak hours
2. NEVER schedule a session on a date AFTER the task's due_date
3. If a task needs more than 2 hours, split it into multiple sessions of ≤2h each — each session is its own JSON object with the same taskId. The TOTAL duration across all sessions for one task MUST equal exactly that task's estimated_hours (or 1h if null). Never pad or round up.
4. Leave at least 30 minutes between any two consecutive sessions on the same day
5. Schedule NO MORE than 6 total study hours per calendar day
6. Do not schedule anything after ${noScheduleAfter} (respects sleep goal)
7. Do not schedule before 06:00
8. Prioritise High-priority tasks and place them earlier in the week
9. Schedule Difficulty 4–5 tasks during peak hours only
10. If estimated_hours is null for a task, assume 1 hour
11. Spread sessions across the week — avoid stacking all work on one or two days${blockedRule}

OUTPUT FORMAT:
Return ONLY a raw JSON array — no markdown fences, no explanation, no extra text.
Each element represents one study session:
{
  "taskId": "<exact UUID from the task list above>",
  "date": "YYYY-MM-DD",
  "startTime": "HH:MM",
  "duration": <decimal hours — e.g. 1.5 for 90 minutes>
}

If there are no tasks to schedule, return exactly: []`;
}
