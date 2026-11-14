import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type VoiceResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string };

function gnaniError(status: number, body: string): { code: string; message: string } {
  let code = `HTTP_${status}`;
  let msg = "";
  try {
    const j = JSON.parse(body);
    code = j?.error?.type ?? j?.detail?.error_code ?? j?.code ?? code;
    msg = j?.error?.message ?? j?.detail?.message ?? j?.message ?? "";
  } catch { /* not json */ }
  const friendly: Record<number, string> = {
    401: "Gnani rejected the API key.",
    402: "Gnani credits are exhausted.",
    403: "This Gnani key is not allowed to use this service.",
    429: "Gnani is busy (one request at a time). Please wait a moment and try again.",
    504: "Gnani took too long to respond.",
  };
  return { code, message: friendly[status] ?? (msg || `Gnani request failed (${status}).`) };
}

/** Gnani Prisma v3.0 REST speech-to-text. Audio is a short WAV clip, never stored. */
export const transcribeSpeech = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ audioBase64: z.string().min(10).max(2_000_000) }).parse(d))
  .handler(async ({ data }): Promise<VoiceResult<{ transcript: string }>> => {
    const key = process.env["GNANI_API_KEY"];
    if (!key) return { ok: false, code: "NO_KEY", message: "Voice service is not configured." };
    const bytes = Uint8Array.from(atob(data.audioBase64), (c) => c.charCodeAt(0));
    if (bytes.length < 1000) return { ok: false, code: "EMPTY_AUDIO", message: "No speech was recorded." };
    const form = new FormData();
    form.append("audio_file", new Blob([bytes], { type: "audio/wav" }), "clip.wav");
    form.append("model", "prisma-v3.0");
    form.append("language_code", "hi-IN,en-IN");
    try {
      const res = await fetch("https://api.vachana.ai/stt/v3", {
        method: "POST",
        headers: { "X-API-Key-ID": key },
        body: form,
        signal: AbortSignal.timeout(25_000),
      });
      const text = await res.text();
      if (!res.ok) return { ok: false, ...gnaniError(res.status, text) };
      const j = JSON.parse(text) as { success?: boolean; transcript?: string };
      return { ok: true, data: { transcript: (j.transcript ?? "").trim() } };
    } catch (e) {
      const timeout = e instanceof Error && e.name === "TimeoutError";
      console.error("gnani stt failed", timeout ? "timeout" : e);
      return { ok: false, code: timeout ? "TIMEOUT" : "NETWORK", message: timeout ? "Gnani speech-to-text timed out." : "Could not reach Gnani speech-to-text." };
    }
  });

/** Gnani Timbre v2.5 REST text-to-speech, returns base64 WAV. */
export const synthesizeSpeech = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ text: z.string().min(1).max(1500), slow: z.boolean().default(false), lang: z.enum(["hi", "en"]).default("hi") }).parse(d))
  .handler(async ({ data }): Promise<VoiceResult<{ audioBase64: string }>> => {
    const key = process.env["GNANI_API_KEY"];
    if (!key) return { ok: false, code: "NO_KEY", message: "Voice service is not configured." };
    try {
      const res = await fetch("https://api.vachana.ai/api/v1/tts/inference", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key-ID": key },
        body: JSON.stringify({
          text: data.text,
          voice: data.lang === "en" ? "Kaveri" : "Nalini",
          model: "timbre-v2.5",
          language: data.lang === "en" ? "en-IN" : "hi-IN",
          speed: data.slow ? 0.85 : 1.0,
          audio_config: { sample_rate: 24000, num_channels: 1, sample_width: 2, encoding: "linear_pcm", container: "wav" },
        }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!res.ok) return { ok: false, ...gnaniError(res.status, await res.text()) };
      const buf = new Uint8Array(await res.arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      return { ok: true, data: { audioBase64: btoa(bin) } };
    } catch (e) {
      const timeout = e instanceof Error && e.name === "TimeoutError";
      console.error("gnani tts failed", timeout ? "timeout" : e);
      return { ok: false, code: timeout ? "TIMEOUT" : "NETWORK", message: timeout ? "Gnani text-to-speech timed out." : "Could not reach Gnani text-to-speech." };
    }
  });
