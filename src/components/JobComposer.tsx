import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { extractJobDraft } from "@/lib/ai.functions";
import { EMPTY_DRAFT, LOCALITIES, SKILLS, missingFields, formatDate, todayIST, localityByName, type JobDraft } from "@/lib/kaam";
import { PAY_LABEL, SKILL_LABEL, TOOLS_LABEL, localityLabel, pick, useLang, useT } from "@/lib/i18n";
import { VoiceInput } from "./VoiceInput";
import { SpeakButton } from "./SpeakButton";
import { MapView } from "./MapView";
import { TermsList } from "./TermsCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { Terms } from "@/lib/terms";

const Q: Record<string, [string, string]> = {
  skill: ["किस काम के लिए कारीगर चाहिए — पेंटर, प्लंबर या इलेक्ट्रीशियन?", "Which skill do you need — painter, plumber or electrician?"],
  workers_needed: ["कितने कारीगर चाहिए?", "How many workers do you need?"],
  locality: ["काम किस मोहल्ले में है?", "Which locality is the work in?"],
  work_date: ["काम किस दिन है?", "Which day is the work?"],
  start_time: ["काम कितने बजे शुरू होगा?", "What time does work start?"],
  end_time: ["काम कितने बजे ख़त्म होगा?", "What time does work end?"],
  wage: ["हर कारीगर को कितनी मज़दूरी देंगे?", "What wage per worker?"],
  wage_unit: ["मज़दूरी रोज़ की है या घंटे की?", "Is the wage per day or per hour?"],
  description: ["काम के बारे में थोड़ा बताइए।", "Briefly describe the work."],
  tools_by: ["सामान कौन देगा — आप या कारीगर?", "Who supplies tools and materials — you or the worker?"],
  payment_timing: ["भुगतान कब करेंगे — उसी दिन, काम पूरा होने पर, या हफ़्ते में?", "When will you pay — same day, when work is done, or weekly?"],
  lat: ["नक्शे पर काम की सही जगह पर पिन लगाइए।", "Place a pin on the map at the work location."],
};

export function JobComposer({ initial, onSave, saveLabel }: { initial?: JobDraft; onSave: (d: JobDraft) => Promise<boolean>; saveLabel: string }) {
  const t = useT();
  const { lang } = useLang();
  const extract = useServerFn(extractJobDraft);
  const [draft, setDraft] = useState<JobDraft>(initial ?? EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [agree, setAgree] = useState(false);
  const [saving, setSaving] = useState(false);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(initial?.lat ? { lat: initial.lat, lng: initial.lng! } : null);
  const missing = missingFields(draft);
  const next = missing[0];
  const question = next ? (Q[next]?.[lang === "hi" ? 0 : 1] ?? null) : null;
  const set = <K extends keyof JobDraft>(k: K, v: JobDraft[K]) => { setDraft((d) => ({ ...d, [k]: v })); setPreview(false); setAgree(false); };

  async function onVoice(text: string) {
    setBusy(true);
    try {
      const r = await extract({ data: { transcript: text, draft: draft as unknown as Record<string, unknown>, lastQuestion: question } });
      if (!r.ok) return void toast.error(r.message);
      const merged = { ...draft, ...r.draft };
      if (r.draft.locality && r.draft.locality !== draft.locality) {
        const l = localityByName(r.draft.locality); if (l) setCenter({ lat: l.lat, lng: l.lng });
      }
      setDraft(merged);
      if (r.intent === "confirm" && missingFields(merged).length === 0) setPreview(true);
      else setPreview(false);
      setAgree(false);
    } catch { toast.error(t("समझ नहीं पाए। फ़ॉर्म में भरें।", "Couldn't understand. Please fill the form.")); }
    finally { setBusy(false); }
  }

  const terms = useMemo(() => (missing.length ? null : (draft as unknown as Terms)), [draft, missing.length]);
  const sel = "h-10 w-full rounded-md border bg-card px-2 text-sm";

  return (
    <div className="space-y-4">
      <VoiceInput onSubmit={onVoice} busy={busy} placeholder={t("बोलकर काम बताइए", "Describe the job by voice")} example="Kal Vaishali mein do painter chahiye, nau sau rupaye per person" />
      {question && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/40 bg-teal-soft p-3">
          <p className="font-medium">{question}</p>
          <SpeakButton text={question} label={t("सवाल सुनें", "Hear question")} showSlow={false} />
        </div>
      )}
      <div className="grid gap-3 rounded-2xl border bg-card p-4 sm:grid-cols-2">
        <div><Label>{t("काम", "Skill")}</Label><select className={sel} value={draft.skill ?? ""} onChange={(e) => set("skill", (e.target.value || null) as JobDraft["skill"])}><option value="">—</option>{SKILLS.map((s) => <option key={s} value={s}>{pick(SKILL_LABEL, s, lang)}</option>)}</select></div>
        <div><Label>{t("कितने कारीगर", "Workers needed")}</Label><Input type="number" min={1} max={50} value={draft.workers_needed ?? ""} onChange={(e) => set("workers_needed", e.target.value ? +e.target.value : null)} /></div>
        <div><Label>{t("मोहल्ला", "Locality")}</Label><select className={sel} value={draft.locality ?? ""} onChange={(e) => { set("locality", e.target.value || null); const l = localityByName(e.target.value); if (l) setCenter({ lat: l.lat, lng: l.lng }); }}><option value="">—</option>{LOCALITIES.map((l) => <option key={l.name} value={l.name}>{localityLabel(l.name, lang)}</option>)}</select></div>
        <div><Label>{t("पता / निशानी (वैकल्पिक)", "Address or landmark (optional)")}</Label><Input value={draft.address ?? ""} onChange={(e) => set("address", e.target.value || null)} /></div>
        <div><Label>{t("तारीख", "Date")}</Label><Input type="date" min={todayIST()} value={draft.work_date ?? ""} onChange={(e) => set("work_date", e.target.value || null)} />{draft.work_date && <p className="mt-1 text-xs font-medium text-primary">{formatDate(draft.work_date, lang)}</p>}</div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>{t("शुरू", "Start")}</Label><Input type="time" value={draft.start_time ?? ""} onChange={(e) => set("start_time", e.target.value || null)} /></div>
          <div><Label>{t("ख़त्म", "End")}</Label><Input type="time" value={draft.end_time ?? ""} onChange={(e) => set("end_time", e.target.value || null)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label>{t("मज़दूरी ₹ (प्रति कारीगर)", "Wage ₹ per worker")}</Label><Input type="number" min={1} value={draft.wage ?? ""} onChange={(e) => set("wage", e.target.value ? +e.target.value : null)} /></div>
          <div><Label>{t("इकाई", "Unit")}</Label><select className={sel} value={draft.wage_unit ?? ""} onChange={(e) => set("wage_unit", (e.target.value || null) as JobDraft["wage_unit"])}><option value="">—</option><option value="day">{t("प्रति दिन", "per day")}</option><option value="hour">{t("प्रति घंटा", "per hour")}</option></select></div>
        </div>
        <div><Label>{t("भुगतान कब", "Payment timing")}</Label><select className={sel} value={draft.payment_timing ?? ""} onChange={(e) => set("payment_timing", (e.target.value || null) as JobDraft["payment_timing"])}><option value="">—</option>{Object.keys(PAY_LABEL).map((k) => <option key={k} value={k}>{pick(PAY_LABEL, k, lang)}</option>)}</select></div>
        <div><Label>{t("सामान कौन देगा", "Tools & materials")}</Label><select className={sel} value={draft.tools_by ?? ""} onChange={(e) => set("tools_by", (e.target.value || null) as JobDraft["tools_by"])}><option value="">—</option>{Object.keys(TOOLS_LABEL).map((k) => <option key={k} value={k}>{pick(TOOLS_LABEL, k, lang)}</option>)}</select></div>
        <div className="sm:col-span-2"><Label>{t("काम का विवरण", "Work description")}</Label><Input value={draft.description ?? ""} onChange={(e) => set("description", e.target.value || null)} /></div>
        <div className="sm:col-span-2">
          <Label className="flex items-center gap-1"><MapPin className="h-4 w-4" />{t("नक्शे पर टैप करके पिन लगाएँ (खींचकर बदल सकते हैं)", "Tap the map to place the pin (drag to adjust)")}</Label>
          <div className="mt-1 h-64 overflow-hidden rounded-xl border">
            <MapView failText={t("नक्शा लोड नहीं हुआ — पिन के बिना काम पोस्ट नहीं हो सकता।", "Map failed to load — a pin is required to post.")}
              pin={draft.lat !== null && draft.lng !== null ? { lat: draft.lat, lng: draft.lng } : null}
              onPick={(p) => { setDraft((d) => ({ ...d, lat: p.lat, lng: p.lng })); setPreview(false); setAgree(false); }} center={center} />
          </div>
          {draft.lat !== null && <p className="mt-1 text-xs text-muted-foreground">{draft.lat.toFixed(5)}, {draft.lng!.toFixed(5)}</p>}
        </div>
      </div>

      {!preview ? (
        <Button size="lg" className="w-full" disabled={missing.length > 0} onClick={() => setPreview(true)}>
          {missing.length ? `${missing.length} ${t("जानकारी बाकी", "details missing")}` : t("पूर्वावलोकन देखें", "Preview job")}
        </Button>
      ) : terms && (
        <div className="space-y-3 rounded-2xl border-2 border-primary bg-card p-4">
          <h3 className="text-xl font-semibold">{t("पूर्वावलोकन — यही शर्तें कारीगर देखेंगे", "Preview — workers will see these exact terms")}</h3>
          <TermsList terms={terms} />
          <label className="flex items-start gap-2 text-sm"><Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} className="mt-0.5" />{t("मैं इन शर्तों पर काम देने को तैयार हूँ।", "I confirm these terms.")}</label>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setPreview(false)}>{t("बदलें", "Edit")}</Button>
            <Button className="flex-1" disabled={!agree || saving} onClick={async () => { setSaving(true); const ok = await onSave(draft); setSaving(false); if (ok && !initial) { setDraft(EMPTY_DRAFT); setPreview(false); setAgree(false); } }}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}{saveLabel}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
