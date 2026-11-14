// Shared, browser-safe domain constants and deterministic helpers.
export const SKILLS = ["painter", "plumber", "electrician"] as const;
export type Skill = (typeof SKILLS)[number];
export type WageUnit = "day" | "hour";
export type ToolsBy = "contractor" | "worker" | "shared";
export type PaymentTiming = "same_day" | "end_of_work" | "weekly";
export type JobStatus = "open" | "filled" | "completed" | "cancelled";

// Approximate locality reference points (not exact sites).
export const LOCALITIES: { name: string; hi: string; lat: number; lng: number }[] = [
  { name: "Indirapuram", hi: "इंदिरापुरम", lat: 28.646, lng: 77.3695 },
  { name: "Vaishali", hi: "वैशाली", lat: 28.645, lng: 77.339 },
  { name: "Vasundhara", hi: "वसुंधरा", lat: 28.66, lng: 77.357 },
  { name: "Raj Nagar", hi: "राज नगर", lat: 28.685, lng: 77.443 },
  { name: "Kavi Nagar", hi: "कवि नगर", lat: 28.672, lng: 77.45 },
  { name: "Crossings Republik", hi: "क्रॉसिंग्स रिपब्लिक", lat: 28.629, lng: 77.437 },
];
export const GHAZIABAD_CENTER: [number, number] = [28.655, 77.395];

export function localityByName(n: string | null | undefined) {
  if (!n) return undefined;
  const k = n.toLowerCase().replace(/\s+/g, "");
  return LOCALITIES.find((l) => l.name.toLowerCase().replace(/\s+/g, "") === k);
}

export type Job = {
  id: string;
  contractor_id: string | null;
  contractor_name: string;
  is_demo: boolean;
  skill: string;
  workers_needed: number;
  locality: string;
  address: string;
  lat: number;
  lng: number;
  work_date: string;
  start_time: string;
  end_time: string;
  wage: number;
  wage_unit: string;
  description: string;
  tools_by: string;
  payment_timing: string;
  status: string;
  terms_version: number;
  created_at: string;
};

export type JobDraft = {
  skill: Skill | null;
  workers_needed: number | null;
  locality: string | null;
  address: string | null;
  work_date: string | null;
  start_time: string | null;
  end_time: string | null;
  wage: number | null;
  wage_unit: WageUnit | null;
  description: string | null;
  tools_by: ToolsBy | null;
  payment_timing: PaymentTiming | null;
  lat: number | null;
  lng: number | null;
};

export const EMPTY_DRAFT: JobDraft = {
  skill: null, workers_needed: null, locality: null, address: null, work_date: null,
  start_time: null, end_time: null, wage: null, wage_unit: null, description: null,
  tools_by: null, payment_timing: null, lat: null, lng: null,
};

// Order in which missing details are asked, one at a time.
export const REQUIRED_ORDER: (keyof JobDraft)[] = [
  "skill", "workers_needed", "locality", "work_date", "start_time", "end_time",
  "wage", "wage_unit", "description", "tools_by", "payment_timing",
];

export function missingFields(d: JobDraft): (keyof JobDraft)[] {
  const m = REQUIRED_ORDER.filter((k) => d[k] === null || d[k] === "");
  if (d.lat === null || d.lng === null) m.push("lat");
  return m;
}

/** Today's date in Asia/Kolkata as YYYY-MM-DD. */
export function todayIST(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function resolveDateWord(word: string | null, explicit: string | null, now: Date = new Date()): string | null {
  const t = todayIST(now);
  if (word === "today") return t;
  if (word === "tomorrow") return addDays(t, 1);
  if (word === "day_after_tomorrow") return addDays(t, 2);
  if (explicit && /^\d{4}-\d{2}-\d{2}$/.test(explicit)) return explicit;
  return null;
}

export function formatDate(iso: string, lang: "hi" | "en") {
  const d = new Date(iso + "T00:00:00+05:30");
  return new Intl.DateTimeFormat(lang === "hi" ? "hi-IN" : "en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(d);
}
export function hhmm(t: string) {
  return t?.slice(0, 5) ?? "";
}

/** Haversine straight-line distance in km. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, toR = (x: number) => (x * Math.PI) / 180;
  const dLat = toR(b.lat - a.lat), dLng = toR(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a.lat)) * Math.cos(toR(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function directionsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export type Filters = {
  skill: Skill | null;
  locality: string | null;
  date: string | null;
  minWage: number | null;
  wageUnit: WageUnit | null; // unit of minWage
};
export const EMPTY_FILTERS: Filters = { skill: null, locality: null, date: null, minWage: null, wageUnit: null };

export type MatchReason = "skill" | "locality" | "date" | "wage";
/**
 * Deterministic matching. Returns null if the job does not match.
 * A minimum wage is only compared against jobs with the same wage unit; hourly and
 * daily wages are never converted into each other.
 */
export function matchJob(job: Pick<Job, "skill" | "locality" | "work_date" | "wage" | "wage_unit" | "status">, f: Filters, today = todayIST()): MatchReason[] | null {
  if (job.status !== "open") return null;
  if (job.work_date < today) return null;
  const reasons: MatchReason[] = [];
  if (f.skill) { if (job.skill !== f.skill) return null; reasons.push("skill"); }
  if (f.locality) { if (job.locality.toLowerCase() !== f.locality.toLowerCase()) return null; reasons.push("locality"); }
  if (f.date) { if (job.work_date !== f.date) return null; reasons.push("date"); }
  if (f.minWage !== null) {
    const unit = f.wageUnit ?? "day";
    if (job.wage_unit !== unit) return null;
    if (job.wage < f.minWage) return null;
    reasons.push("wage");
  }
  return reasons;
}

export function bookingReferenceValid(r: string) {
  return /^KS-[A-F0-9]{6}$/.test(r);
}
