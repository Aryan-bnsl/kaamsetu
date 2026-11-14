import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/useAuth";
import { LOCALITIES, SKILLS } from "@/lib/kaam";
import { SKILL_LABEL, localityLabel, pick, useLang, useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [
    { title: "Profile — KaamSetu" },
    { name: "description", content: "Your KaamSetu profile: name, skills, locality and availability." },
    { property: "og:title", content: "Profile — KaamSetu" },
    { property: "og:description", content: "Set up your worker or contractor profile." },
  ] }),
  component: Profile,
});

function Profile() {
  const t = useT();
  const { lang } = useLang();
  const me = useMe();
  const [f, setF] = useState({ display_name: "", skills: [] as string[], locality: "", availability: "", expected_wage: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (me.profile) setF({ display_name: me.profile.display_name, skills: me.profile.skills, locality: me.profile.locality ?? "", availability: me.profile.availability ?? "", expected_wage: me.profile.expected_wage?.toString() ?? "" });
  }, [me.profile]);

  async function save() {
    if (!f.display_name.trim()) { toast.error(t("नाम ज़रूरी है", "Name is required")); return; }
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ display_name: f.display_name.trim(), skills: f.skills, locality: f.locality || null, availability: f.availability || null, expected_wage: f.expected_wage ? +f.expected_wage : null }).eq("id", me.userId!);
    if (!error && !me.isWorker && f.skills.length) await supabase.from("user_roles").insert({ user_id: me.userId!, role: "worker" });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t("सेव हो गया", "Saved")); me.refetch();
  }
  async function addRole(role: "worker" | "contractor") {
    const { error } = await supabase.from("user_roles").insert({ user_id: me.userId!, role });
    if (error) toast.error(error.message); else me.refetch();
  }

  if (me.loading) return <div className="mx-auto max-w-xl p-6"><div className="h-60 animate-pulse rounded-xl bg-muted" /></div>;
  return (
    <div className="mx-auto max-w-xl px-4 py-6">
      <h1 className="text-3xl font-semibold">{t("प्रोफ़ाइल", "Profile")}</h1>
      {me.isDemo && <p className="mt-2 rounded-lg bg-amber-soft p-2 text-sm">{t("यह काल्पनिक डेमो खाता है।", "This is a fictional demo account.")}</p>}
      <div className="mt-3 flex flex-wrap gap-2 text-sm">
        <span className="text-muted-foreground">{t("भूमिका", "Roles")}:</span>
        {me.isWorker ? <span className="rounded-full bg-teal-soft px-2">{t("कारीगर", "Worker")}</span> : <Button size="sm" variant="outline" onClick={() => addRole("worker")}>+ {t("कारीगर", "Worker")}</Button>}
        {me.isContractor ? <span className="rounded-full bg-amber-soft px-2">{t("ठेकेदार", "Contractor")}</span> : <Button size="sm" variant="outline" onClick={() => addRole("contractor")}>+ {t("ठेकेदार", "Contractor")}</Button>}
      </div>
      <div className="mt-5 space-y-4 rounded-2xl border bg-card p-5">
        <div><Label>{t("नाम", "Name")}</Label><Input value={f.display_name} onChange={(e) => setF({ ...f, display_name: e.target.value })} /></div>
        <div><Label>{t("काम (कौशल)", "Skills")}</Label>
          <div className="mt-1 flex flex-wrap gap-2">{SKILLS.map((s) => { const on = f.skills.includes(s); return (
            <button key={s} type="button" onClick={() => setF({ ...f, skills: on ? f.skills.filter((x) => x !== s) : [...f.skills, s] })} className={`rounded-full border px-3 py-1.5 text-sm ${on ? "border-primary bg-primary text-primary-foreground" : ""}`}>{pick(SKILL_LABEL, s, lang)}</button>); })}</div>
        </div>
        <div><Label>{t("मोहल्ला", "Locality")}</Label>
          <select className="h-10 w-full rounded-md border bg-card px-2 text-sm" value={f.locality} onChange={(e) => setF({ ...f, locality: e.target.value })}><option value="">—</option>{LOCALITIES.map((l) => <option key={l.name} value={l.name}>{localityLabel(l.name, lang)}</option>)}</select>
        </div>
        <div><Label>{t("कब उपलब्ध हैं", "Availability")}</Label><Input placeholder={t("जैसे: सोम–शनि, सुबह 9 से शाम 6", "e.g. Mon–Sat, 9am–6pm")} value={f.availability} onChange={(e) => setF({ ...f, availability: e.target.value })} /></div>
        <div><Label>{t("अपेक्षित रोज़ की मज़दूरी ₹ (वैकल्पिक)", "Expected daily wage ₹ (optional)")}</Label><Input type="number" min={0} value={f.expected_wage} onChange={(e) => setF({ ...f, expected_wage: e.target.value })} /></div>
        <p className="text-xs text-muted-foreground">{t("हम आधार, बैंक या पहचान दस्तावेज़ नहीं माँगते। आवाज़ की रिकॉर्डिंग सेव नहीं होती।", "We never ask for Aadhaar, bank details or ID documents. Voice recordings are not stored.")}</p>
        <Button onClick={save} disabled={busy} className="w-full">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{t("सेव करें", "Save")}</Button>
      </div>
    </div>
  );
}
