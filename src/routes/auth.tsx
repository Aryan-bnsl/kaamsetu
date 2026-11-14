import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { startDemoSession } from "@/lib/demo.functions";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ redirect: z.string().optional() }),
  head: () => ({ meta: [
    { title: "Sign in — KaamSetu" },
    { name: "description", content: "Sign in to KaamSetu or try a demo worker or contractor account." },
    { property: "og:title", content: "Sign in — KaamSetu" },
    { property: "og:description", content: "Sign in to post or apply to local jobs in Ghaziabad." },
  ] }),
  component: AuthPage,
});

function safe(p?: string) { return p && p.startsWith("/") && !p.startsWith("//") ? p : "/work"; }

function AuthPage() {
  const t = useT();
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const demo = useServerFn(startDemoSession);
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (active && session) void navigate({ to: safe(redirect) });
    });
    return () => { active = false; };
  }, [navigate, redirect]);

  async function startDemo(role: "worker" | "contractor") {
    setBusy(role);
    try {
      const s = await demo({ data: { role } });
      if ("error" in s) { toast.error(s.error); return; }
      const { error } = await supabase.auth.setSession(s);
      if (error) throw error;
      navigate({ to: role === "worker" ? "/work" : "/hire" });
    } catch { toast.error(t("डेमो शुरू नहीं हो पाया।", "Could not start the demo.")); }
    finally { setBusy(null); }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy("email");
    if (mode === "up") {
      const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin, data: { display_name: name } } });
      setBusy(null);
      if (error) { toast.error(error.message); return; }
      toast.success(t("ईमेल देखें और पुष्टि लिंक दबाएँ।", "Check your email and click the confirmation link."));
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(null);
      if (error) { toast.error(error.message); return; }
      navigate({ to: safe(redirect) });
    }
  }

  async function google() {
    setBusy("google");
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/settings`, {
        headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
      });
      if (!response.ok) throw new Error(t("साइन इन सेवा उपलब्ध नहीं है। ईमेल से कोशिश करें।", "Sign-in service is unavailable. Please try email sign-in."));
      const settings = await response.json();
      if (!settings.external?.google) {
        toast.error(t("Google साइन इन की सेटिंग बाकी है। अभी ईमेल से साइन इन करें।", "Google sign-in needs backend configuration. Please use email sign-in for now."));
        return;
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth?redirect=${encodeURIComponent(safe(redirect))}` },
      });
      if (error) throw error;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Google साइन इन नहीं हुआ।", "Google sign-in failed."));
    } finally { setBusy(null); }
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-8 px-4 py-10 md:grid-cols-2">
      <section>
        <h1 className="text-3xl font-semibold">{t("डेमो आज़माएँ", "Try the demo")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("काल्पनिक डेमो खाते असली खातों से पूरी तरह अलग हैं। डेमो में आप सिर्फ़ डेमो काम देखेंगे।", "Fictional demo accounts are fully separate from real accounts. In demo mode you only see demo jobs.")}</p>
        <div className="mt-5 space-y-3">
          <Button className="h-14 w-full justify-start text-base" variant="outline" onClick={() => startDemo("worker")} disabled={!!busy}>
            {busy === "worker" && <Loader2 className="h-4 w-4 animate-spin" />}{t("डेमो कारीगर (पेंटर, वैशाली)", "Demo worker (painter, Vaishali)")}
          </Button>
          <Button className="h-14 w-full justify-start text-base" variant="outline" onClick={() => startDemo("contractor")} disabled={!!busy}>
            {busy === "contractor" && <Loader2 className="h-4 w-4 animate-spin" />}{t("डेमो ठेकेदार", "Demo contractor")}
          </Button>
        </div>
      </section>
      <section className="rounded-2xl border bg-card p-6">
        <h2 className="text-2xl font-semibold">{mode === "in" ? t("साइन इन", "Sign in") : t("खाता बनाएँ", "Create account")}</h2>
        <Button variant="outline" className="mt-4 w-full border-[#747775] bg-[#FFFFFF] text-[#1F1F1F] hover:bg-[#F2F2F2]" onClick={google} disabled={!!busy}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
          Continue with Google
        </Button>
        <form onSubmit={submit} className="mt-4 space-y-3">
          {mode === "up" && <div><Label htmlFor="n">{t("नाम", "Name")}</Label><Input id="n" value={name} onChange={(e) => setName(e.target.value)} required /></div>}
          <div><Label htmlFor="e">{t("ईमेल", "Email")}</Label><Input id="e" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div><Label htmlFor="p">{t("पासवर्ड", "Password")}</Label><Input id="p" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          <Button type="submit" className="w-full" disabled={busy === "email"}>{busy === "email" && <Loader2 className="h-4 w-4 animate-spin" />}{mode === "in" ? t("साइन इन", "Sign in") : t("खाता बनाएँ", "Create account")}</Button>
        </form>
        <button className="mt-3 text-sm text-primary underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>{mode === "in" ? t("नया खाता बनाएँ", "Create a new account") : t("पहले से खाता है? साइन इन", "Have an account? Sign in")}</button>
      </section>
    </div>
  );
}
