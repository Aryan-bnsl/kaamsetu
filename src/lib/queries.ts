import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Job } from "./kaam";
import type { Terms } from "./terms";

export const jobsQuery = (userId: string | null) => queryOptions({
  queryKey: ["jobs", userId],
  queryFn: async () => {
    const [{ data: jobs, error }, { data: counts }] = await Promise.all([
      supabase.from("jobs").select("*").in("status", ["open", "filled"]).order("work_date"),
      supabase.rpc("job_confirmed_counts"),
    ]);
    if (error) throw error;
    const c = new Map((counts ?? []).map((r) => [r.job_id, r.confirmed]));
    return (jobs as Job[]).map((j) => ({ ...j, confirmed: c.get(j.id) ?? 0 }));
  },
});

export const jobQuery = (id: string, userId: string | null) => queryOptions({
  queryKey: ["job", id, userId],
  queryFn: async () => {
    const { data: job, error } = await supabase.from("jobs").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!job) return null;
    const [{ data: terms }, { data: counts }] = await Promise.all([
      supabase.from("job_terms").select("*").eq("job_id", id).eq("version", job.terms_version).maybeSingle(),
      supabase.rpc("job_confirmed_counts"),
    ]);
    const confirmed = (counts ?? []).find((r) => r.job_id === id)?.confirmed ?? 0;
    return { job: job as Job, terms: (terms?.terms ?? null) as Terms | null, confirmed };
  },
});

export const savedQuery = (userId: string | null) => queryOptions({
  queryKey: ["saved", userId],
  enabled: !!userId,
  queryFn: async () => new Set(((await supabase.from("saved_jobs").select("job_id")).data ?? []).map((r) => r.job_id)),
});

export async function toggleSave(userId: string, jobId: string, saved: boolean) {
  if (saved) await supabase.from("saved_jobs").delete().eq("user_id", userId).eq("job_id", jobId);
  else await supabase.from("saved_jobs").insert({ user_id: userId, job_id: jobId });
}
