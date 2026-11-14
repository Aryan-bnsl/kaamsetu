import { formatDate, hhmm } from "./kaam";
import { SKILL_LABEL, TOOLS_LABEL, PAY_LABEL, localityLabel, pick, wageLabel, type Lang } from "./i18n";

export type Terms = {
  skill: string; workers_needed: number; description: string; work_date: string; start_time: string; end_time: string;
  locality: string; address: string; lat: number; lng: number; wage: number; wage_unit: string; payment_timing: string; tools_by: string;
};

export function termsSpeech(t: Terms, lang: Lang) {
  const unit = t.wage_unit === "hour" ? (lang === "hi" ? "प्रति घंटा" : "per hour") : (lang === "hi" ? "प्रति दिन" : "per day");
  if (lang === "hi")
    return `काम: ${pick(SKILL_LABEL, t.skill, lang)}, ${t.workers_needed} लोग। ${t.description}. तारीख ${formatDate(t.work_date, "hi")}, समय ${hhmm(t.start_time)} से ${hhmm(t.end_time)} तक। जगह ${localityLabel(t.locality, "hi")}, ग़ाज़ियाबाद${t.address ? ", " + t.address : ""}। मज़दूरी हर कारीगर को ${t.wage} रुपये ${unit}। ${pick(PAY_LABEL, t.payment_timing, lang)}। ${pick(TOOLS_LABEL, t.tools_by, lang)}।`;
  return `Work: ${pick(SKILL_LABEL, t.skill, lang)}, ${t.workers_needed} people. ${t.description}. Date ${formatDate(t.work_date, "en")}, from ${hhmm(t.start_time)} to ${hhmm(t.end_time)}. Location ${t.locality}, Ghaziabad${t.address ? ", " + t.address : ""}. Wage ${t.wage} rupees ${unit} per worker. ${pick(PAY_LABEL, t.payment_timing, lang)}. ${pick(TOOLS_LABEL, t.tools_by, lang)}.`;
}

export function termsRows(t: Terms, lang: Lang): [string, string][] {
  const hi = lang === "hi";
  return [
    [hi ? "काम" : "Work", `${pick(SKILL_LABEL, t.skill, lang)} × ${t.workers_needed}${t.description ? " — " + t.description : ""}`],
    [hi ? "तारीख" : "Date", formatDate(t.work_date, lang)],
    [hi ? "समय" : "Hours", `${hhmm(t.start_time)} – ${hhmm(t.end_time)}`],
    [hi ? "जगह" : "Location", `${localityLabel(t.locality, lang)}, ${hi ? "ग़ाज़ियाबाद" : "Ghaziabad"}${t.address ? " · " + t.address : ""}`],
    [hi ? "मज़दूरी (प्रति कारीगर)" : "Wage per worker", wageLabel(t.wage, t.wage_unit, lang)],
    [hi ? "भुगतान" : "Payment", pick(PAY_LABEL, t.payment_timing, lang)],
    [hi ? "सामान" : "Tools & materials", pick(TOOLS_LABEL, t.tools_by, lang)],
  ];
}
