import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  return { session, ready, userId: session?.user.id ?? null };
}

export function useMe() {
  const { session, ready, userId } = useSession();
  const q = useQuery({
    queryKey: ["me", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId!).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId!),
      ]);
      return { profile, roles: (roles ?? []).map((r) => r.role as string) };
    },
  });
  return {
    ready, session, userId,
    profile: q.data?.profile ?? null,
    roles: q.data?.roles ?? [],
    isWorker: q.data?.roles.includes("worker") ?? false,
    isContractor: q.data?.roles.includes("contractor") ?? false,
    isDemo: q.data?.profile?.is_demo ?? false,
    loading: !ready || (!!userId && q.isLoading),
    refetch: q.refetch,
  };
}
