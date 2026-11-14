import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Briefcase, Hammer, Home, LogOut, Search, User } from "lucide-react";
import type { ReactNode } from "react";
import { Wordmark } from "./Logo";
import { useLang, useT } from "@/lib/i18n";
import { useMe } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: ReactNode }) {
  const { lang, setLang } = useLang();
  const t = useT();
  const me = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const unread = useQuery({
    queryKey: ["unread", me.userId],
    enabled: !!me.userId,
    refetchInterval: 20000,
    queryFn: async () => (await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("read", false)).count ?? 0,
  });

  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  const nav = [
    { to: "/", icon: Home, label: t("होम", "Home") },
    { to: "/work", icon: Search, label: t("काम ढूँढें", "Find work") },
    { to: "/hire", icon: Hammer, label: t("कारीगर बुलाएँ", "Hire") },
    { to: "/activity", icon: Briefcase, label: t("मेरा काम", "My activity") },
    { to: "/profile", icon: User, label: t("प्रोफ़ाइल", "Profile") },
  ] as const;

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="sticky top-0 z-[1000] border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
          <Link to="/" aria-label="KaamSetu home"><Wordmark /></Link>
          <nav className="ml-6 hidden gap-1 md:flex">
            {nav.slice(1).map((n) => (
              <Link key={n.to} to={n.to} className={`rounded-md px-3 py-1.5 text-sm font-medium ${path.startsWith(n.to) ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}>{n.label}</Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {me.isDemo && <span className="hidden rounded-full bg-amber-soft px-2 py-0.5 text-xs font-medium text-foreground sm:inline">{t("डेमो खाता", "Demo account")}</span>}
            <div className="flex rounded-full border p-0.5 text-xs font-medium" role="group" aria-label="Language">
              <button onClick={() => setLang("hi")} className={`rounded-full px-2.5 py-1 ${lang === "hi" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>हिं</button>
              <button onClick={() => setLang("en")} className={`rounded-full px-2.5 py-1 ${lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>EN</button>
            </div>
            {!me.ready ? null : me.userId ? (
              <>
                <Link to="/activity" search={{ tab: "notifications" }} className="relative rounded-full p-2 hover:bg-muted" aria-label={t("सूचनाएँ", "Notifications")}>
                  <Bell className="h-5 w-5" />
                  {!!unread.data && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-amber" />}
                </Link>
                <Button variant="ghost" size="icon" onClick={signOut} aria-label={t("साइन आउट", "Sign out")}><LogOut className="h-5 w-5" /></Button>
              </>
            ) : (
              <Button asChild size="sm"><Link to="/auth">{t("साइन इन", "Sign in")}</Link></Button>
            )}
          </div>
        </div>
      </header>
      <main>{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-[1000] grid grid-cols-5 border-t bg-card md:hidden">
        {nav.map((n) => {
          const active = n.to === "/" ? path === "/" : path.startsWith(n.to);
          return (
            <Link key={n.to} to={n.to} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${active ? "text-primary" : "text-muted-foreground"}`}>
              <n.icon className="h-5 w-5" />{n.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
