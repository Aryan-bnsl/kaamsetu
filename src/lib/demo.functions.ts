import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

// Demo identities: two fixed fictional accounts on a reserved domain. They are flagged
// is_demo by a database trigger, and database policies keep them away from real users' data.
const DEMO = {
  worker: { email: "worker@demo.kaamsetu.app", name: "Demo Kaarigar (fictional)", skills: ["painter"], locality: "Vaishali", availability: "Weekdays, 9am–6pm" },
  contractor: { email: "contractor@demo.kaamsetu.app", name: "Demo Thekedar (fictional)", skills: [], locality: "Indirapuram", availability: null },
} as const;

export const startDemoSession = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ role: z.enum(["worker", "contractor"]) }).parse(d))
  .handler(async ({ data }) => {
    const password = process.env["DEMO_ACCOUNT_PASSWORD"];
    if (!password) return { error: "Demo login needs DEMO_ACCOUNT_PASSWORD in Vercel. Please use email sign-in while the owner configures it." };
    const supabaseAdmin = process.env["SUPABASE_SERVICE_ROLE_KEY"]
      ? (await import("@/integrations/supabase/client.server")).supabaseAdmin
      : null;
    const d = DEMO[data.role];

    const url = process.env["SUPABASE_URL"]!;
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const pub = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      } },
    });

    let signIn = await pub.auth.signInWithPassword({ email: d.email, password });
    if (signIn.error && !supabaseAdmin) return { error: "Demo account sign-in failed. The owner must configure the existing demo account password in Vercel." };
    if (signIn.error && supabaseAdmin) {
      const created = await supabaseAdmin.auth.admin.createUser({ email: d.email, password, email_confirm: true, user_metadata: { display_name: d.name } });
      if (created.error && !/already/i.test(created.error.message)) throw new Error("Could not create demo account");
      if (created.error) {
        // Account exists with a different password: reset it.
        const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
        const u = list.users.find((x) => x.email === d.email);
        if (u) await supabaseAdmin.auth.admin.updateUserById(u.id, { password });
      }
      signIn = await pub.auth.signInWithPassword({ email: d.email, password });
      if (signIn.error || !signIn.data.session) throw new Error("Could not start demo session");
    }
    const uid = signIn.data.user!.id;
    if (!supabaseAdmin) {
      const { data: profile, error: profileError } = await pub.from("profiles").select("is_demo").eq("id", uid).single();
      const { data: roles, error: roleError } = await pub.from("user_roles").select("role").eq("user_id", uid).eq("role", data.role);
      if (profileError || roleError || !profile?.is_demo || !roles?.length) {
        await pub.auth.signOut();
        return { error: "The demo profile and role must be configured in the backend before this account can be used." };
      }
      return { access_token: signIn.data.session!.access_token, refresh_token: signIn.data.session!.refresh_token };
    }
    await supabaseAdmin.from("profiles").update({ display_name: d.name, is_demo: true, skills: [...d.skills], locality: d.locality, availability: d.availability }).eq("id", uid);
    await supabaseAdmin.from("user_roles").upsert({ user_id: uid, role: data.role }, { onConflict: "user_id,role" });
    if (data.role === "contractor") await supabaseAdmin.rpc("refresh_demo_jobs", { _contractor: uid });
    else {
      const { data: c } = await supabaseAdmin.from("profiles").select("id").eq("display_name", DEMO.contractor.name).eq("is_demo", true).maybeSingle();
      if (c) await supabaseAdmin.rpc("refresh_demo_jobs", { _contractor: c.id });
    }
    return { access_token: signIn.data.session!.access_token, refresh_token: signIn.data.session!.refresh_token };
  });
