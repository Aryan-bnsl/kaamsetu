import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ExternalLink, Bookmark, BookmarkCheck, Loader2, LocateFixed, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { jobQuery, savedQuery, toggleSave } from "@/lib/queries";
import { directionsUrl, distanceKm } from "@/lib/kaam";
import { SKILL_LABEL, STATUS_LABEL, errText, localityLabel, pick, useLang, useT } from "@/lib/i18n";
import { useMe } from "@/hooks/useAuth";
import { MapView } from "@/components/MapView";
import { TermsList, BaatPakkiCard } from "@/components/TermsCard";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import type { Terms } from "@/lib/terms";

export const Route = createFileRoute("/jobs/$id")({
  head: () => ({ meta: [
    { title: "Job details — KaamSetu Ghaziabad" },
    { name: "description", content: "Job terms, location and spoken summary for a local job in Ghaziabad." },
    { property: "og:title", content: "Job details — KaamSetu" },
    { property: "og:description", content: "See the work, date, hours, wage and location before you apply." },
  ] }),
  component: JobPage,
});

function JobPage() {
  const { id } = Route.useParams();
  const t = useT();
  const { lang } = useLang();
  const me = useMe();
  const qc = useQueryClient();
  const q = useQuery(jobQuery(id, me.userId));
  const saved = useQuery(savedQuery(me.userId));
  const mine = useQuery({
    queryKey: ["myapp", id, me.userId], enabled: !!me.userId,
    queryFn: async () => {
      const [{ data: app }, { data: acc }] = await Promise.all([
        supabase.from("applications").select("*").eq("job_id", id).eq("worker_id", me.userId!).maybeSingle(),
        supabase.from("term_acceptances").select("terms_version").eq("job_id", id).eq("user_id", me.userId!).order("terms_version", { ascending: false }).limit(1),
      ]);
      const booking = app ? (await supabase.from("bookings").select("*").eq("application_id", app.id).maybeSingle()).data : null;
      return { app, acceptedVersion: acc?.[0]?.terms_version ?? 0, booking };
    },
  });
  const [open, setOpen] = useState(false);
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(null);

  if (q.isLoading) return <div className="mx-auto max-w-5xl p-6"><div className="h-64 animate-pulse rounded-xl bg-muted" /></div>;
  if (q.isError) return <div className="mx-auto max-w-5xl p-6">{t("काम लोड नहीं हुआ।", "Couldn't load this job.")} <Button variant="link" onClick={() => q.refetch()}>{t("फिर कोशिश करें", "Retry")}</Button></div>;
  if (!q.data || !q.data.terms) return <div className="mx-auto max-w-5xl p-6">{t("यह काम नहीं मिला।", "Job not found.")} <Link to="/work" className="text-primary underline">{t("सभी काम", "All jobs")}</Link></div>;
  const { job, terms, confirmed } = q.data;
  const remaining = job.workers_needed - confirmed;
  const isOwner = me.userId && job.contractor_id === me.userId;
  const app = mine.data?.app;
  const stale = app && app.status === "interested" && (mine.data?.acceptedVersion ?? 0) < job.terms_version;

  async function apply() {
    setBusy(true);
    const { error } = app ? await supabase.rpc("accept_current_terms", { _job: job.id, _version: job.terms_version }) : await supabase.rpc("apply_to_job", { _job: job.id, _version: job.terms_version });
    setBusy(false);
    if (error) { toast.error(errText(error, lang)); return; }
    toast.success(app ? t("नई शर्तें मान लीं", "New terms accepted") : t("रुचि भेज दी — ठेकेदार की पुष्टि का इंतज़ार", "Interest sent — waiting for the contractor to confirm"));
    setOpen(false); setAgree(false);
    qc.invalidateQueries();
  }
  async function withdraw() {
    if (!app) return;
    const { error } = await supabase.rpc("set_application_status", { _application: app.id, _status: "withdrawn" });
    if (error) { toast.error(errText(error, lang)); return; }
    qc.invalidateQueries();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Link to="/work" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />{t("सभी काम", "All jobs")}</Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{pick(SKILL_LABEL, job.skill, lang)} · {localityLabel(job.locality, lang)} · {pick(STATUS_LABEL, job.status, lang)} {job.is_demo && <span className="ml-1 rounded bg-amber-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase">{t("डेमो — काल्पनिक", "Demo — fictional")}</span>}</p>
          <h1 className="mt-1 text-3xl font-semibold">{job.description || pick(SKILL_LABEL, job.skill, lang)}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("पोस्ट किया", "Posted by")}: {job.contractor_name} · {remaining} / {job.workers_needed} {t("जगह बाकी", "openings left")}</p>
        </div>
        {me.userId && (
          <Button variant="outline" onClick={async () => { await toggleSave(me.userId!, job.id, saved.data?.has(job.id) ?? false); qc.invalidateQueries({ queryKey: ["saved"] }); }}>
            {saved.data?.has(job.id) ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}{saved.data?.has(job.id) ? t("सेव है", "Saved") : t("सेव करें", "Save")}
          </Button>
        )}
      </div>

      <div className="mt-5 grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          {mine.data?.booking && <BaatPakkiCard booking={{ ...mine.data.booking, terms: mine.data.booking.terms as unknown as Terms }} />}
          <TermsList terms={terms} version={job.terms_version} />

          {isOwner ? (
            <Button asChild><Link to="/hire">{t("आवेदन देखें", "Manage applicants")}</Link></Button>
          ) : !me.userId ? (
            <div className="rounded-xl border bg-card p-4 text-sm">{t("रुचि भेजने के लिए साइन इन करें।", "Sign in to apply.")} <Link to="/auth" search={{ redirect: `/jobs/${job.id}` }} className="font-semibold text-primary underline">{t("साइन इन / डेमो", "Sign in / demo")}</Link></div>
          ) : !me.isWorker ? (
            <div className="rounded-xl border bg-card p-4 text-sm">{t("आवेदन के लिए कारीगर प्रोफ़ाइल बनाएँ।", "Create a worker profile to apply.")} <Link to="/profile" className="font-semibold text-primary underline">{t("प्रोफ़ाइल", "Profile")}</Link></div>
          ) : app ? (
            <div className="rounded-xl border bg-card p-4">
              <p className="text-sm text-muted-foreground">{t("आपकी स्थिति", "Your status")}</p>
              <p className={`text-lg font-semibold ${app.status === "confirmed" ? "text-success" : ""}`}>{pick(STATUS_LABEL, app.status, lang)}</p>
              {app.status === "interested" && !stale && <p className="text-sm text-muted-foreground">{t("आपने शर्तें मान लीं। बुकिंग तब पक्की होगी जब ठेकेदार पुष्टि करेगा।", "You accepted the terms. The booking is confirmed only when the contractor confirms.")}</p>}
              {stale && <div className="mt-2 rounded-lg bg-amber-soft p-3 text-sm">{t("ठेकेदार ने शर्तें बदली हैं। आगे बढ़ने के लिए नई शर्तें मानें।", "The contractor changed the terms. Accept the new terms to continue.")}<Button size="sm" className="mt-2 block" onClick={() => setOpen(true)}>{t("नई शर्तें देखें और मानें", "Review & accept new terms")}</Button></div>}
              {app.status === "interested" && <Button size="sm" variant="ghost" className="mt-2" onClick={withdraw}>{t("रुचि वापस लें", "Withdraw interest")}</Button>}
            </div>
          ) : job.status === "open" && remaining > 0 ? (
            <Button size="lg" className="w-full" onClick={() => setOpen(true)}>{t("शर्तें मानकर रुचि भेजें", "Accept terms & send interest")}</Button>
          ) : <p className="text-sm text-muted-foreground">{t("यह काम अभी आवेदन नहीं ले रहा।", "This job is not accepting applications.")}</p>}
        </div>
        <div>
          <div className="h-80 overflow-hidden rounded-xl border">
            <MapView failText={t("नक्शा लोड नहीं हुआ।", "Map failed to load.")} jobs={[{ id: job.id, lat: job.lat, lng: job.lng, skill: job.skill, title: job.locality }]} selectedId={job.id} center={{ lat: job.lat, lng: job.lng }} userLoc={loc} />
          </div>
          {job.is_demo && <p className="mt-1.5 text-xs text-muted-foreground">{t("अंदाज़न डेमो जगह — असली काम की जगह नहीं।", "Approximate demo location — not an actual hiring site.")}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="outline" asChild><a href={directionsUrl(job.lat, job.lng)} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />{t("रास्ता खोलें", "Open directions")}</a></Button>
            <Button variant="ghost" onClick={() => navigator.geolocation?.getCurrentPosition((p) => setLoc({ lat: p.coords.latitude, lng: p.coords.longitude }), () => toast(t("लोकेशन की अनुमति नहीं मिली।", "Location permission denied.")))}><LocateFixed className="h-4 w-4" />{t("मेरी लोकेशन", "Use my location")}</Button>
          </div>
          {loc && <p className="mt-2 text-sm">{t("लगभग सीधी दूरी", "Approx. straight-line distance")}: <strong>{distanceKm(loc, job).toFixed(1)} km</strong> <span className="text-xs text-muted-foreground">({t("गाड़ी की दूरी या समय नहीं", "not driving distance or time")})</span></p>}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("शर्तें पक्की करें", "Confirm the terms")}</DialogTitle>
            <DialogDescription>{t("ध्यान से सुनें या पढ़ें। आप यही शर्तें मान रहे हैं।", "Listen or read carefully. These are the exact terms you accept.")}</DialogDescription>
          </DialogHeader>
          <TermsList terms={terms} version={job.terms_version} />
          <label className="flex items-start gap-2 text-sm"><Checkbox checked={agree} onCheckedChange={(v) => setAgree(!!v)} className="mt-0.5" />{t("मैं इन शर्तों पर काम करने को तैयार हूँ।", "I agree to work on these terms.")}</label>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>{t("रद्द", "Cancel")}</Button>
            <Button onClick={apply} disabled={!agree || busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{t("हाँ, शर्तें मंज़ूर", "Yes, I accept")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
