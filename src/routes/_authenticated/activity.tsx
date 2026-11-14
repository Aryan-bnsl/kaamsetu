import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/hooks/useAuth";
import { SKILL_LABEL, STATUS_LABEL, localityLabel, pick, useLang, useT, wageLabel } from "@/lib/i18n";
import { formatDate, type Job } from "@/lib/kaam";
import { BaatPakkiCard } from "@/components/TermsCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import type { Terms } from "@/lib/terms";

export const Route = createFileRoute("/_authenticated/activity")({
  validateSearch: z.object({ tab: z.enum(["applications", "bookings", "saved", "notifications"]).optional() }),
  head: () => ({ meta: [
    { title: "My activity — KaamSetu" },
    { name: "description", content: "Your applications, Baat Pakki bookings, saved jobs and notifications." },
    { property: "og:title", content: "My activity — KaamSetu" },
    { property: "og:description", content: "Applications, bookings and saved jobs." },
  ] }),
  component: Activity,
});

function Activity() {
  const t = useT();
  const { lang } = useLang();
  const { tab } = Route.useSearch();
  const me = useMe();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["activity", me.userId], enabled: !!me.userId,
    queryFn: async () => {
      const [apps, bookings, saved, notes, accs] = await Promise.all([
        supabase.from("applications").select("*, jobs(*)").eq("worker_id", me.userId!).order("created_at", { ascending: false }),
        supabase.from("bookings").select("*").order("created_at", { ascending: false }),
        supabase.from("saved_jobs").select("job_id, jobs(*)").eq("user_id", me.userId!),
        supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("term_acceptances").select("job_id, terms_version").eq("user_id", me.userId!),
      ]);
      return { apps: apps.data ?? [], bookings: bookings.data ?? [], saved: saved.data ?? [], notes: notes.data ?? [], accs: accs.data ?? [] };
    },
  });
  const d = q.data;

  async function markRead() {
    await supabase.from("notifications").update({ read: true }).eq("user_id", me.userId!).eq("read", false);
    qc.invalidateQueries();
  }

  const empty = (s: string) => <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{s}</p>;
  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="text-3xl font-semibold">{t("मेरा काम", "My activity")}</h1>
      <Tabs defaultValue={tab ?? "applications"} className="mt-4" onValueChange={(v) => v === "notifications" && markRead()}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="applications">{t("आवेदन", "Applications")}</TabsTrigger>
          <TabsTrigger value="bookings">{t("बुकिंग", "Bookings")}</TabsTrigger>
          <TabsTrigger value="saved">{t("सेव", "Saved")}</TabsTrigger>
          <TabsTrigger value="notifications">{t("सूचनाएँ", "Alerts")}</TabsTrigger>
        </TabsList>
        {q.isLoading && <div className="mt-4 h-32 animate-pulse rounded-xl bg-muted" />}
        {d && <>
          <TabsContent value="applications" className="space-y-2">
            {d.apps.length === 0 && empty(t("अभी कोई आवेदन नहीं।", "No applications yet."))}
            {d.apps.map((a) => {
              const j = a.jobs as unknown as Job;
              const accepted = Math.max(0, ...d.accs.filter((x) => x.job_id === a.job_id).map((x) => x.terms_version));
              const stale = a.status === "interested" && j && accepted < j.terms_version;
              return (
                <Link key={a.id} to="/jobs/$id" params={{ id: a.job_id }} className="block rounded-xl border bg-card p-4 hover:border-primary">
                  <div className="flex justify-between gap-2">
                    <div><p className="font-semibold">{j?.description}</p><p className="text-sm text-muted-foreground">{pick(SKILL_LABEL, j?.skill, lang)} · {localityLabel(j?.locality ?? "", lang)} · {j && formatDate(j.work_date, lang)} · {j && wageLabel(j.wage, j.wage_unit, lang)}</p></div>
                    <span className={`h-fit rounded-full px-2 py-0.5 text-xs font-semibold ${a.status === "confirmed" ? "bg-success text-primary-foreground" : a.status === "interested" ? "bg-teal-soft" : "bg-muted"}`}>{pick(STATUS_LABEL, a.status, lang)}</span>
                  </div>
                  {stale && <p className="mt-2 rounded bg-amber-soft px-2 py-1 text-xs">{t("शर्तें बदलीं — फिर से मानें", "Terms changed — accept again")}</p>}
                </Link>
              );
            })}
          </TabsContent>
          <TabsContent value="bookings" className="space-y-4">
            {d.bookings.length === 0 && empty(t("अभी कोई पक्की बुकिंग नहीं।", "No confirmed bookings yet."))}
            {d.bookings.map((b) => <BaatPakkiCard key={b.id} booking={{ ...b, terms: b.terms as unknown as Terms }} />)}
          </TabsContent>
          <TabsContent value="saved" className="space-y-2">
            {d.saved.length === 0 && empty(t("कोई काम सेव नहीं।", "No saved jobs."))}
            {d.saved.map((s) => { const j = s.jobs as unknown as Job; return j && (
              <Link key={s.job_id} to="/jobs/$id" params={{ id: s.job_id }} className="block rounded-xl border bg-card p-4 hover:border-primary">
                <p className="font-semibold">{j.description}</p>
                <p className="text-sm text-muted-foreground">{pick(SKILL_LABEL, j.skill, lang)} · {localityLabel(j.locality, lang)} · {formatDate(j.work_date, lang)} · {pick(STATUS_LABEL, j.status, lang)}</p>
              </Link>); })}
          </TabsContent>
          <TabsContent value="notifications" className="space-y-2">
            {d.notes.length === 0 && empty(t("कोई सूचना नहीं।", "No notifications."))}
            {d.notes.map((n) => (
              <div key={n.id} className={`rounded-xl border p-3 ${n.read ? "bg-card" : "border-primary/40 bg-teal-soft"}`}>
                <p className="font-medium">{n.title}</p><p className="text-sm text-muted-foreground">{n.body}</p>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{new Date(n.created_at).toLocaleString(lang === "hi" ? "hi-IN" : "en-IN", { timeZone: "Asia/Kolkata" })}</span>
                  {n.job_id && <Button asChild variant="link" size="sm" className="h-auto p-0"><Link to="/jobs/$id" params={{ id: n.job_id }}>{t("देखें", "View")}</Link></Button>}
                </div>
              </div>
            ))}
          </TabsContent>
        </>}
      </Tabs>
    </div>
  );
}
