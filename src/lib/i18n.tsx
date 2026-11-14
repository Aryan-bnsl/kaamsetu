import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { LOCALITIES } from "./kaam";

export type Lang = "hi" | "en";
const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: "hi", setLang: () => {} });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("hi");
  useEffect(() => {
    const s = localStorage.getItem("ks-lang");
    if (s === "en" || s === "hi") setLangState(s);
  }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const setLang = (l: Lang) => { setLangState(l); localStorage.setItem("ks-lang", l); };
  return <Ctx.Provider value={{ lang, setLang }}>{children}</Ctx.Provider>;
}
export function useLang() { return useContext(Ctx); }
/** t("हिंदी", "English") */
export function useT() {
  const { lang } = useLang();
  return (hi: string, en: string) => (lang === "hi" ? hi : en);
}

export const SKILL_LABEL: Record<string, [string, string]> = {
  painter: ["पेंटर", "Painter"], plumber: ["प्लंबर", "Plumber"], electrician: ["इलेक्ट्रीशियन", "Electrician"],
};
export const TOOLS_LABEL: Record<string, [string, string]> = {
  contractor: ["सामान ठेकेदार देगा", "Contractor supplies tools & materials"],
  worker: ["कारीगर अपना सामान लाएगा", "Worker brings own tools"],
  shared: ["सामान दोनों मिलकर", "Shared: contractor materials, worker tools"],
};
export const PAY_LABEL: Record<string, [string, string]> = {
  same_day: ["उसी दिन भुगतान", "Paid the same day"],
  end_of_work: ["काम पूरा होने पर भुगतान", "Paid when work is finished"],
  weekly: ["हफ़्ते में भुगतान", "Paid weekly"],
};
export const STATUS_LABEL: Record<string, [string, string]> = {
  open: ["खुला", "Open"], filled: ["भर गया", "Filled"], completed: ["पूरा", "Completed"], cancelled: ["रद्द", "Cancelled"],
  interested: ["रुचि भेजी", "Interest sent"], confirmed: ["बुकिंग पक्की", "Booking confirmed"],
  rejected: ["चयन नहीं", "Not selected"], withdrawn: ["वापस लिया", "Withdrawn"],
};
export function pick(map: Record<string, [string, string]>, k: string | null | undefined, lang: Lang) {
  if (!k) return "";
  const v = map[k]; return v ? v[lang === "hi" ? 0 : 1] : k;
}
export function localityLabel(name: string, lang: Lang) {
  const l = LOCALITIES.find((x) => x.name === name);
  return lang === "hi" && l ? l.hi : name;
}
export function wageLabel(wage: number, unit: string, lang: Lang) {
  return `₹${wage.toLocaleString("en-IN")} ${unit === "hour" ? (lang === "hi" ? "/ घंटा" : "/ hour") : (lang === "hi" ? "/ दिन" : "/ day")}`;
}

const ERR: Record<string, [string, string]> = {
  duplicate_application: ["आप इस काम के लिए पहले ही रुचि भेज चुके हैं।", "You have already applied to this job."],
  job_full: ["सभी जगहें भर चुकी हैं।", "All openings are already filled."],
  terms_outdated: ["शर्तें बदल गई हैं। नई शर्तें देखें।", "The terms changed. Please review the new terms."],
  job_not_open: ["यह काम अब खुला नहीं है।", "This job is no longer open."],
  not_worker: ["पहले कारीगर प्रोफ़ाइल बनाएँ।", "Create a worker profile first."],
  not_contractor: ["पहले ठेकेदार प्रोफ़ाइल चुनें।", "Choose the contractor role first."],
  worker_terms_pending: ["कारीगर ने नई शर्तें अभी नहीं मानीं।", "The worker has not accepted the current terms yet."],
  has_confirmed_bookings: ["पक्की बुकिंग के बाद शर्तें नहीं बदल सकते।", "Terms can't change after a booking is confirmed."],
  demo_isolation: ["डेमो और असली खाते आपस में नहीं जुड़ सकते।", "Demo and real accounts can't interact."],
  missing_pin: ["नक्शे पर जगह चुनें।", "Place the location pin on the map."],
  date_in_past: ["तारीख बीत चुकी है।", "That date is in the past."],
  invalid_hours: ["समाप्ति समय शुरुआत के बाद होना चाहिए।", "End time must be after start time."],
  invalid_state_change: ["यह बदलाव संभव नहीं।", "This status change isn't allowed."],
  own_job: ["अपने ही काम पर आवेदन नहीं कर सकते।", "You can't apply to your own job."],
};
export function errText(e: unknown, lang: Lang) {
  const m = (e as { message?: string })?.message ?? String(e);
  for (const k of Object.keys(ERR)) if (m.includes(k)) return ERR[k]![lang === "hi" ? 0 : 1];
  return lang === "hi" ? "कुछ गड़बड़ हुई। फिर कोशिश करें।" : "Something went wrong. Please try again.";
}
