import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { List, Map as MapIcon, LocateFixed, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { jobsQuery, savedQuery, toggleSave } from "@/lib/queries";
import { EMPTY_FILTERS, LOCALITIES, SKILLS, distanceKm, matchJob, todayIST, addDays, formatDate, localityByName, type Filters } from "@/lib/kaam";
import { SKILL_LABEL, localityLabel, pick, useLang, useT } from "@/lib/i18n";
import { extractSearchFilters } from "@/lib/ai.functions";
import { useMe } from "@/hooks/useAuth";
import { VoiceInput } from "@/components/VoiceInput";
import { JobCard } from "@/components/JobCard";
import { MapView } from "@/components/MapView";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/work")({
  head: () => ({ meta: [
    { title: "Find work in Ghaziabad — KaamSetu" },
    { name: "description", content: "Search painter, plumber and electrician jobs across Ghaziabad localities by voice or filters, on a list and map." },
    { property: "og:title", content: "Find work in Ghaziabad — KaamSetu" },
    { property: "og:description", content: "Voice search for local jobs in Ghaziabad." },
  ] }),
  component: WorkPage,
});

function WorkPage() {
  const t = useT();
  const { lang } = useLang();
  const me = useMe();
  const qc = useQueryClient();
  const jobs = useQuery(jobsQuery(me.userId));
  const saved = useQuery(savedQuery(me.userId));
  const extract = useServerFn(extractSearchFilters);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "map">("list");
  const [busy, setBusy] = useState(false);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [origin, setOrigin] = useState<string | null>(null); // manual locality fallback
  const [locating, setLocating] = useState(false);
  const today = todayIST();

  const ref = userLoc ?? (origin ? localityByName(origin) ?? null : null);
  const matched = useMemo(() => (jobs.data ?? []).map((j) => ({ j, r: matchJob(j, filters, today) })).filter((x) => x.r !== null), [jobs.data, filters, today]);

  async function onVoice(text: string) {
    setBusy(true);
    try {
      const r = await extract({ data: { transcript: text } });
      if (!r.ok) return void toast.error(r.message);
      setFilters(r.filters); setSelected(null);
      toast.success(t("फ़िल्टर लगाए गए", "Filters applied"));
    } catch { toast.error(t("समझ नहीं पाए। फ़िल्टर हाथ से चुनें।", "Couldn't understand. Please choose filters by hand.")); }
    finally { setBusy(false); }
  }

  function locate() {
    if (!navigator.geolocation) { toast.error(t("यह ब्राउज़र लोकेशन नहीं देता। मोहल्ला चुनें।", "Location isn't available. Choose your locality.")); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setUserLoc({ lat: p.coords.latitude, lng: p.coords.longitude }); setLocating(false); },
      () => { setLocating(false); toast(t("लोकेशन की अनुमति नहीं मिली। अपना मोहल्ला चुनें।", "Location permission denied. Choose your locality instead.")); },
      { timeout: 10000 },
    );
  }

  async function save(id: string) {
    if (!me.userId) { toast(t("सेव करने के लिए साइन इन करें।", "Sign in to save jobs.")); return; }
    await toggleSave(me.userId, id, saved.data?.has(id) ?? false);
    qc.invalidateQueries({ queryKey: ["saved"] });
  }

  const sel = "h-10 rounded-md border bg-card px-2 text-sm";
  const active = Object.values(filters).some((v) => v !== null);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="text-3xl font-semibold">{t("काम ढूँढें", "Find work")}</h1>
      <p className="text-sm text-muted-foreground">{t("ग़ाज़ियाबाद में पेंटर, प्लंबर और इलेक्ट्रीशियन का काम", "Painter, plumber and electrician work in Ghaziabad")}</p>
      <div className="mt-4"><VoiceInput onSubmit={onVoice} busy={busy} placeholder={t("बताइए कैसा काम चाहिए", "Say what work you want")} example="Vaishali mein kal painting ka kaam chahiye, kam se kam nau sau rupaye" /></div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <select aria-label={t("काम", "Skill")} className={sel} value={filters.skill ?? ""} onChange={(e) => setFilters({ ...filters, skill: (e.target.value || null) as Filters["skill"] })}>
          <option value="">{t("सभी काम", "All skills")}</option>
          {SKILLS.map((s) => <option key={s} value={s}>{pick(SKILL_LABEL, s, lang)}</option>)}
        </select>
        <select aria-label={t("मोहल्ला", "Locality")} className={sel} value={filters.locality ?? ""} onChange={(e) => setFilters({ ...filters, locality: e.target.value || null })}>
          <option value="">{t("सभी मोहल्ले", "All localities")}</option>
          {LOCALITIES.map((l) => <option key={l.name} value={l.name}>{localityLabel(l.name, lang)}</option>)}
        </select>
        <select aria-label={t("तारीख", "Date")} className={sel} value={filters.date ?? ""} onChange={(e) => setFilters({ ...filters, date: e.target.value || null })}>
          <option value="">{t("कोई भी तारीख", "Any date")}</option>
          {[0, 1, 2, 3, 4, 5, 6].map((n) => { const d = addDays(today, n); return <option key={d} value={d}>{n === 0 ? t("आज", "Today") : n === 1 ? t("कल", "Tomorrow") : ""} {formatDate(d, lang)}</option>; })}
          {filters.date && filters.date > addDays(today, 6) && <option value={filters.date}>{formatDate(filters.date, lang)}</option>}
        </select>
        <div className="flex items-center gap-1">
          <Input aria-label={t("न्यूनतम मज़दूरी", "Minimum wage")} type="number" min={0} placeholder={t("न्यूनतम ₹", "Min ₹")} className="h-10 w-24" value={filters.minWage ?? ""} onChange={(e) => setFilters({ ...filters, minWage: e.target.value ? +e.target.value : null, wageUnit: filters.wageUnit ?? "day" })} />
          <select aria-label={t("इकाई", "Unit")} className={sel} value={filters.wageUnit ?? "day"} onChange={(e) => setFilters({ ...filters, wageUnit: e.target.value as "day" | "hour" })}>
            <option value="day">{t("/दिन", "/day")}</option><option value="hour">{t("/घंटा", "/hour")}</option>
          </select>
        </div>
        {active && <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY_FILTERS)}><X className="h-4 w-4" />{t("फ़िल्टर हटाएँ", "Clear")}</Button>}
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={locate} disabled={locating}>{locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}{t("मेरी लोकेशन", "Use my location")}</Button>
          {!userLoc && (
            <select aria-label={t("आप कहाँ हैं", "Where are you")} className={sel} value={origin ?? ""} onChange={(e) => setOrigin(e.target.value || null)}>
              <option value="">{t("आप कहाँ हैं?", "You are near…")}</option>
              {LOCALITIES.map((l) => <option key={l.name} value={l.name}>{localityLabel(l.name, lang)}</option>)}
            </select>
          )}
        </div>
      </div>
      {filters.minWage !== null && <p className="mt-2 text-xs text-muted-foreground">{t("घंटे और दिन की मज़दूरी आपस में नहीं मिलाई जाती — सिर्फ़ चुनी इकाई वाले काम दिखेंगे।", "Hourly and daily wages are not compared — only jobs paid in the selected unit are shown.")}</p>}

      <div className="mt-3 flex rounded-lg border p-1 md:hidden">
        <button onClick={() => setView("list")} className={`flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-sm ${view === "list" ? "bg-primary text-primary-foreground" : ""}`}><List className="h-4 w-4" />{t("सूची", "List")}</button>
        <button onClick={() => setView("map")} className={`flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-sm ${view === "map" ? "bg-primary text-primary-foreground" : ""}`}><MapIcon className="h-4 w-4" />{t("नक्शा", "Map")}</button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className={`space-y-3 ${view === "map" ? "hidden md:block" : ""}`}>
          <p className="text-sm text-muted-foreground">{jobs.isLoading ? t("लोड हो रहा है…", "Loading…") : `${matched.length} ${t("काम मिले", "jobs found")}`}</p>
          {jobs.isError && <div className="rounded-xl border bg-card p-4 text-sm">{t("काम लोड नहीं हुए।", "Couldn't load jobs.")} <Button size="sm" variant="link" onClick={() => jobs.refetch()}>{t("फिर कोशिश करें", "Retry")}</Button></div>}
          {jobs.isLoading && [0, 1, 2].map((i) => <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />)}
          {!jobs.isLoading && matched.length === 0 && !jobs.isError && (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{t("इन फ़िल्टर से कोई काम नहीं मिला। फ़िल्टर कम करके देखें।", "No jobs match these filters. Try removing some.")}</div>
          )}
          {matched.map(({ j, r }) => (
            <JobCard key={j.id} job={j} remaining={j.workers_needed - j.confirmed} reasons={r} selected={selected === j.id}
              onSelect={() => setSelected(j.id)} saved={saved.data?.has(j.id)} onToggleSave={() => save(j.id)}
              distance={ref ? distanceKm(ref, j) : null} />
          ))}
        </div>
        <div className={`${view === "list" ? "hidden md:block" : ""} md:sticky md:top-20 md:self-start`}>
          <div className="h-[65vh] overflow-hidden rounded-xl border md:h-[calc(100vh-7rem)]">
            <MapView failText={t("नक्शा लोड नहीं हुआ। सूची से काम देखें।", "Map failed to load. Use the list instead.")}
              jobs={matched.map(({ j }) => ({ id: j.id, lat: j.lat, lng: j.lng, skill: j.skill, title: `${pick(SKILL_LABEL, j.skill, lang)} · ${localityLabel(j.locality, lang)}` }))}
              selectedId={selected} onSelect={(id) => { setSelected(id); setView("list"); setTimeout(() => document.querySelector(`[aria-selected="true"]`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50); }}
              userLoc={userLoc} />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground">{t("डेमो पिन अंदाज़न जगहें हैं, असली काम की जगह नहीं।", "Demo pins are approximate demo locations, not actual hiring sites.")}</p>
        </div>
      </div>
    </div>
  );
}
