import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Check, X, Pencil, Ban, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/useAuth";
import { SKILL_LABEL, STATUS_LABEL, errText, localityLabel, pick, useLang, useT, wageLabel } from "@/lib/i18n";
import { formatDate, hhmm, type Job, type JobDraft } from "@/lib/kaam";
import { JobComposer } from "@/components/JobComposer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/hire")({
  head: () => ({ meta: [
    { title: "Hire workers in Ghaziabad — KaamSetu" },
    { name: "description", content: "Post a job by voice and confirm painters, plumbers or electricians in Ghaziabad." },
    { property: "og:title", content: "Hire workers — KaamSetu" },
    { property: "og:description", content: "Voice job posting for Ghaziabad contractors." },
  ] }),
  component: HirePage,
});

function toPayload(d: JobDraft) { return d as unknown as Record<string, unknown>; }

function HirePage() {
  const t = useT();
  const { lang } = useLang();
  const me = useMe();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Job | null>(null);
  const mine = useQuery({
    queryKey: ["myjobs", me.userId], enabled: !!me.userId && me.isContractor,
    queryFn: async () => {
      const { data: jobs } = await supabase.from("jobs").select("*").eq("contractor_id", me.userId!).order("created_at", { ascending: false });
      const ids = (jobs ?? []).map((j) => j.id);
      const [{ data: apps }, { data: accs }] = await Promise.all([
        supabase.from("applications").select("*").in("job_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]).order("created_at"),
        supabase.from("term_acceptances").select("*").in("job_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]),
      ]);
      return { jobs: (jobs ?? []) as Job[], apps: apps ?? [], accs: accs ?? [] };
    },
  });

  if (me.loading) return <div className="mx-auto max-w-5xl p-6"><div className="h-40 animate-pulse rounded-xl bg-muted" /></div>;
  if (!me.isContractor) return (
    <div className="mx-auto max-w-xl px-4 py-10 text-center">
      <h1 className="text-2xl font-semibold">{t("ठेकेदार के रूप में शुरू करें", "Start as a contractor")}</h1>
      <p className="mt-2 text-muted-foreground">{t("काम पोस्ट करने के लिए ठेकेदार भूमिका जोड़ें।", "Add the contractor role to post jobs.")}</p>
      <Button className="mt-4" onClick={async () => { const { error } = await supabase.from("user_roles").insert({ user_id: me.userId!, role: "contractor" }); if (error) toast.error(errText(error, lang)); else me.refetch(); }}>{t("ठेकेदार भूमिका जोड़ें", "Add contractor role")}</Button>
    </div>
  );

  async function rpc(fn: () => PromiseLike<{ error: unknown }>, ok: string) {
    const { error } = await fn();
    if (error) { toast.error(errText(error, lang)); return false; }
    toast.success(ok); qc.invalidateQueries(); return true;
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-6 lg:grid-cols-2">
      <section>
        <h1 className="text-3xl font-semibold">{t("कारीगर बुलाएँ", "Hire workers")}</h1>
        <p className="mb-4 text-sm text-muted-foreground">{t("बोलिए या लिखिए — हम एक-एक करके बाकी जानकारी पूछेंगे।", "Speak or type — we'll ask for missing details one at a time.")}</p>
        <JobComposer saveLabel={t("काम पब्लिश करें", "Publish job")} onSave={(d) => rpc(() => supabase.rpc("publish_job", { p: toPayload(d) as never }), t("काम पब्लिश हो गया", "Job published"))} />
      </section>
      <section>
        <h2 className="text-2xl font-semibold">{t("मेरे काम", "My jobs")}</h2>
        {mine.isLoading && <div className="mt-3 h-32 animate-pulse rounded-xl bg-muted" />}
        {mine.data?.jobs.length === 0 && <p className="mt-3 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{t("अभी कोई काम पोस्ट नहीं किया।", "No jobs posted yet.")}</p>}
        <div className="mt-3 space-y-4">
          {mine.data?.jobs.map((j) => {
            const apps = mine.data.apps.filter((a) => a.job_id === j.id);
            const confirmed = apps.filter((a) => a.status === "confirmed").length;
            return (
              <article key={j.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm text-muted-foreground">{pick(SKILL_LABEL, j.skill, lang)} · {localityLabel(j.locality, lang)} · {formatDate(j.work_date, lang)} · {hhmm(j.start_time)}–{hhmm(j.end_time)}</p>
                    <Link to="/jobs/$id" params={{ id: j.id }} className="text-lg font-semibold hover:underline">{j.description}</Link>
                    <p className="text-sm">{wageLabel(j.wage, j.wage_unit, lang)} · {confirmed}/{j.workers_needed} {t("पक्के", "confirmed")} · v{j.terms_version}</p>
                  </div>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">{pick(STATUS_LABEL, j.status, lang)}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {j.status === "open" && <Button size="sm" variant="outline" onClick={() => setEditing(j)}><Pencil className="h-4 w-4" />{t("शर्तें बदलें", "Change terms")}</Button>}
                  {(j.status === "open" || j.status === "filled") && <>
                    <Button size="sm" variant="outline" onClick={() => rpc(() => supabase.rpc("set_job_status", { _job: j.id, _status: "completed" }), t("पूरा चिह्नित", "Marked completed"))}><CheckCheck className="h-4 w-4" />{t("पूरा", "Complete")}</Button>
                    <Button size="sm" variant="ghost" onClick={() => confirm(t("काम रद्द करें?", "Cancel this job?")) && rpc(() => supabase.rpc("set_job_status", { _job: j.id, _status: "cancelled" }), t("रद्द किया", "Cancelled"))}><Ban className="h-4 w-4" />{t("रद्द करें", "Cancel job")}</Button>
                  </>}
                </div>
                <div className="mt-3 border-t pt-3">
                  <p className="text-sm font-medium">{t("आवेदन", "Applicants")} ({apps.length})</p>
                  {apps.length === 0 && <p className="text-sm text-muted-foreground">{t("अभी कोई नहीं।", "None yet.")}</p>}
                  <ul className="mt-2 space-y-2">
                    {apps.map((a) => {
                      const accepted = mine.data.accs.some((x) => x.job_id === j.id && x.user_id === a.worker_id && x.terms_version === j.terms_version);
                      const skillMatch = a.worker_skills.includes(j.skill);
                      return (
                        <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/60 p-2.5 text-sm">
                          <div>
                            <p className="font-medium">{a.worker_name} <span className="text-xs text-muted-foreground">· {pick(STATUS_LABEL, a.status, lang)}</span></p>
                            <p className="text-xs text-muted-foreground">{a.worker_skills.map((s) => pick(SKILL_LABEL, s, lang)).join(", ") || "—"}{skillMatch && ` · ${t("कौशल मेल खाता है", "Skill matches")}`} · {a.worker_availability ?? t("उपलब्धता नहीं बताई", "Availability not given")}</p>
                            {a.status === "interested" && <p className={`text-xs ${accepted ? "text-success" : "text-destructive"}`}>{accepted ? t(`v${j.terms_version} शर्तें मानीं`, `Accepted terms v${j.terms_version}`) : t("नई शर्तें अभी नहीं मानीं", "Has not accepted the current terms")}</p>}
                          </div>
                          {a.status === "interested" && j.status === "open" && (
                            <div className="flex gap-1">
                              <Button size="sm" disabled={!accepted || confirmed >= j.workers_needed} onClick={() => rpc(() => supabase.rpc("confirm_worker", { _application: a.id }), t("बात पक्की!", "Baat Pakki!"))}><Check className="h-4 w-4" />{t("पक्का करें", "Confirm")}</Button>
                              <Button size="sm" variant="ghost" onClick={() => rpc(() => supabase.rpc("set_application_status", { _application: a.id, _status: "rejected" }), t("मना किया", "Declined"))}><X className="h-4 w-4" /></Button>
                            </div>
                          )}
                          {a.status === "confirmed" && <Button size="sm" variant="ghost" onClick={() => confirm(t("बुकिंग रद्द करें?", "Cancel this booking?")) && rpc(() => supabase.rpc("set_application_status", { _application: a.id, _status: "cancelled" }), t("बुकिंग रद्द", "Booking cancelled"))}>{t("बुकिंग रद्द", "Cancel booking")}</Button>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>{t("शर्तें बदलें — सभी आवेदकों को फिर से मानना होगा", "Change terms — all applicants must accept again")}</DialogTitle></DialogHeader>
          {editing && <JobComposer initial={{ ...editing, start_time: hhmm(editing.start_time), end_time: hhmm(editing.end_time) } as unknown as JobDraft} saveLabel={t("नई शर्तें सेव करें", "Save new terms")}
            onSave={async (d) => { const ok = await rpc(() => supabase.rpc("update_job_terms", { _job: editing.id, p: toPayload(d) as never }), t("शर्तें बदलीं", "Terms updated")); if (ok) setEditing(null); return ok; }} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
