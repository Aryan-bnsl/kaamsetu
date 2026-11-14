import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateResponse, GatewayError } from "@lovable.dev/ai-gateway";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LOCALITIES, resolveDateWord, todayIST, type JobDraft, type Filters } from "./kaam";

const nullable = (t: string, extra: Record<string, unknown> = {}) => ({ type: [t, "null"], ...extra });
const DATE_WORD = { type: ["string", "null"], enum: ["today", "tomorrow", "day_after_tomorrow", "explicit", null] };
const LOCALITY_NAMES = LOCALITIES.map((l) => l.name);

async function callJson(system: string, user: string, name: string, schema: Record<string, unknown>) {
  const res = await generateResponse({
    model: "openai/gpt-6-astra",
    input: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    text: { format: { type: "json_schema", name, strict: true, schema } },
  });
  let out = "";
  for (const item of (res as { output?: unknown[] }).output ?? []) {
    const it = item as { type?: string; content?: { type?: string; text?: string }[] };
    if (it.type === "message") for (const c of it.content ?? []) if (c.type === "output_text") out += c.text ?? "";
  }
  return JSON.parse(out) as Record<string, unknown>;
}

function aiErr(e: unknown) {
  console.error("ai extraction failed", e);
  if (e instanceof GatewayError) {
    if (e.httpStatus === 402) return "AI credits are exhausted. Please fill the form by hand.";
    if (e.httpStatus === 429) return "AI is busy. Please try again in a moment.";
  }
  return "Could not understand automatically. Please edit the details by hand.";
}

const draftSchema = {
  type: "object",
  additionalProperties: false,
  required: ["intent", "skill", "workers_needed", "locality", "address", "date_word", "explicit_date", "start_time", "end_time", "wage", "wage_unit", "description", "tools_by", "payment_timing"],
  properties: {
    intent: { type: "string", enum: ["update", "confirm", "cancel", "other"] },
    skill: nullable("string", { enum: ["painter", "plumber", "electrician", null] }),
    workers_needed: nullable("integer"),
    locality: nullable("string", { enum: [...LOCALITY_NAMES, null] }),
    address: nullable("string"),
    date_word: DATE_WORD,
    explicit_date: nullable("string"),
    start_time: nullable("string"),
    end_time: nullable("string"),
    wage: nullable("integer"),
    wage_unit: nullable("string", { enum: ["day", "hour", null] }),
    description: nullable("string"),
    tools_by: nullable("string", { enum: ["contractor", "worker", "shared", null] }),
    payment_timing: nullable("string", { enum: ["same_day", "end_of_work", "weekly", null] }),
  },
};

export const extractJobDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ transcript: z.string().min(1).max(2000), draft: z.record(z.string(), z.unknown()), lastQuestion: z.string().max(300).nullable() }).parse(d))
  .handler(async ({ data }): Promise<{ ok: true; draft: Partial<JobDraft>; intent: string } | { ok: false; message: string }> => {
    const today = todayIST();
    const system = `You extract a job posting for a local labour platform in Ghaziabad, India from Hindi/Hinglish/English speech.
Today in Asia/Kolkata is ${today}. Return ONLY fields that the NEW utterance states or corrects; every other field must be null. Never guess.
- "kal" = tomorrow, "aaj" = today, "parson" = day_after_tomorrow; for a specific calendar date set date_word "explicit" and explicit_date YYYY-MM-DD.
- Corrections like "nau sau nahi, ek hazaar" mean the new value (1000) replaces the old one.
- Numbers in Hindi words: "do"=2, "teen"=3, "nau sau"=900, "ek hazaar"=1000, "barah sau"=1200.
- "per person"/"roz"/"din ka"/"dihadi" => wage_unit day; "ghante ka"/"per hour" => hour.
- Times as 24h HH:MM. "subah nau baje" = 09:00, "shaam paanch" = 17:00.
- skill: painter (painting/putai/rang), plumber (nal/pipe), electrician (bijli/wiring).
- locality must be one of: ${LOCALITY_NAMES.join(", ")}; otherwise null.
- tools_by: contractor ("saaman hum denge"), worker ("apna saaman laana"), shared.
- payment_timing: same_day ("usi din"/"shaam ko"), end_of_work ("kaam khatam hone par"), weekly.
- intent: confirm if the user says haan/theek hai/publish karo/confirm; cancel if they want to stop; update if they gave details; else other.
- description: short English summary of the work only if described.`;
    const user = `Current draft: ${JSON.stringify(data.draft)}\nLast question asked: ${data.lastQuestion ?? "none"}\nNew utterance: ${data.transcript}`;
    try {
      const r = await callJson(system, user, "job_draft", draftSchema);
      const out: Partial<JobDraft> = {};
      for (const k of ["skill", "workers_needed", "locality", "address", "start_time", "end_time", "wage", "wage_unit", "description", "tools_by", "payment_timing"] as const) {
        if (r[k] !== null && r[k] !== undefined && r[k] !== "") (out as Record<string, unknown>)[k] = r[k];
      }
      const date = resolveDateWord(r['date_word'] as string | null, r['explicit_date'] as string | null);
      if (date) out.work_date = date;
      for (const k of ["start_time", "end_time"] as const) if (out[k] && !/^\d{2}:\d{2}$/.test(out[k]!)) delete out[k];
      return { ok: true, draft: out, intent: String(r['intent']) };
    } catch (e) {
      return { ok: false, message: aiErr(e) };
    }
  });

const searchSchema = {
  type: "object",
  additionalProperties: false,
  required: ["skill", "locality", "date_word", "explicit_date", "min_wage", "wage_unit"],
  properties: {
    skill: nullable("string", { enum: ["painter", "plumber", "electrician", null] }),
    locality: nullable("string", { enum: [...LOCALITY_NAMES, null] }),
    date_word: DATE_WORD,
    explicit_date: nullable("string"),
    min_wage: nullable("integer"),
    wage_unit: nullable("string", { enum: ["day", "hour", null] }),
  },
};

export const extractSearchFilters = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ transcript: z.string().min(1).max(1000) }).parse(d))
  .handler(async ({ data }): Promise<{ ok: true; filters: Filters } | { ok: false; message: string }> => {
    const system = `Extract job search filters for a worker in Ghaziabad from Hindi/Hinglish/English speech. Today (Asia/Kolkata) is ${todayIST()}.
Only fill what is stated; else null. "kal"=tomorrow, "aaj"=today, "parson"=day_after_tomorrow. "kam se kam nau sau" => min_wage 900.
"painting ka kaam" => painter; "plumbing/nal" => plumber; "bijli/wiring" => electrician. wage_unit day unless they say per hour/ghanta (null if no wage).
locality must be one of: ${LOCALITY_NAMES.join(", ")}.`;
    try {
      const r = await callJson(system, data.transcript, "job_search", searchSchema);
      return {
        ok: true,
        filters: {
          skill: (r['skill'] as Filters["skill"]) ?? null,
          locality: (r['locality'] as string) ?? null,
          date: resolveDateWord(r['date_word'] as string | null, r['explicit_date'] as string | null),
          minWage: (r['min_wage'] as number) ?? null,
          wageUnit: r['min_wage'] ? ((r['wage_unit'] as Filters["wageUnit"]) ?? "day") : null,
        },
      };
    } catch (e) {
      return { ok: false, message: aiErr(e) };
    }
  });
