import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, Mic, Square, Send, Keyboard } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { transcribeSpeech } from "@/lib/voice.functions";
import { encodeWav, stopAllAudio, toBase64 } from "@/lib/audio";
import { useT } from "@/lib/i18n";
import { useSession } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const MAX_SECONDS = 12;
type State = "idle" | "recording" | "transcribing" | "review";

export function VoiceInput({ onSubmit, placeholder, example, busy }: { onSubmit: (text: string) => void | Promise<void>; placeholder: string; example: string; busy?: boolean }) {
  const t = useT();
  const { userId, ready } = useSession();
  const transcribe = useServerFn(transcribeSpeech);
  const [state, setState] = useState<State>("idle");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [secs, setSecs] = useState(0);
  const rec = useRef<{ ctx: AudioContext; stream: MediaStream; node: ScriptProcessorNode; chunks: Float32Array[]; timer: number; stop: () => void } | null>(null);

  useEffect(() => () => rec.current?.stop(), []);

  async function start() {
    setError(null);
    stopAllAudio(); // never transcribe our own voice
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
    } catch {
      setError(t("माइक की अनुमति नहीं मिली। नीचे लिखकर बताइए।", "Microphone permission was denied. Please type below instead."));
      setState("review");
      return;
    }
    const ctx = new AudioContext({ sampleRate: 16000 });
    const src = ctx.createMediaStreamSource(stream);
    const node = ctx.createScriptProcessor(4096, 1, 1);
    const chunks: Float32Array[] = [];
    node.onaudioprocess = (e) => chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
    src.connect(node); node.connect(ctx.destination);
    const started = Date.now();
    const timer = window.setInterval(() => {
      const s = (Date.now() - started) / 1000; setSecs(Math.floor(s));
      if (s >= MAX_SECONDS) finish();
    }, 250);
    const stop = () => { window.clearInterval(timer); node.disconnect(); src.disconnect(); stream.getTracks().forEach((x) => x.stop()); ctx.close().catch(() => {}); };
    rec.current = { ctx, stream, node, chunks, timer, stop };
    setSecs(0); setState("recording");
  }

  async function finish() {
    const r = rec.current; if (!r) return;
    rec.current = null;
    const rate = r.ctx.sampleRate;
    r.stop();
    const len = r.chunks.reduce((a, c) => a + c.length, 0);
    if (len < rate * 0.5) { setError(t("आवाज़ बहुत छोटी थी। फिर से बोलें।", "That was too short. Please speak again.")); setState("idle"); return; }
    const all = new Float32Array(len); let o = 0; for (const c of r.chunks) { all.set(c, o); o += c.length; }
    let peak = 0; for (let i = 0; i < all.length; i += 50) peak = Math.max(peak, Math.abs(all[i] ?? 0));
    if (peak < 0.01) { setError(t("कोई आवाज़ सुनाई नहीं दी।", "No speech was detected.")); setState("idle"); return; }
    setState("transcribing");
    try {
      const res = await transcribe({ data: { audioBase64: toBase64(encodeWav(all, rate)) } });
      if (!res.ok) { setError(`${t("Gnani से जवाब नहीं मिला", "Gnani speech-to-text failed")}: ${res.message} ${t("आप लिखकर भी बता सकते हैं।", "You can type instead.")}`); setState("review"); return; }
      if (!res.data.transcript) { setError(t("कुछ समझ नहीं आया। फिर से बोलें या लिखें।", "Nothing was recognised. Speak again or type.")); setState("review"); return; }
      setText(res.data.transcript); setState("review");
    } catch {
      setError(t("आवाज़ सेवा से जुड़ नहीं पाए। लिखकर बताइए।", "Couldn't reach the voice service. Please type instead.")); setState("review");
    }
  }

  async function submit() {
    if (!text.trim()) return;
    await onSubmit(text.trim());
    setText(""); setState("idle");
  }

  const signedIn = ready && !!userId;
  return (
    <div className="rounded-2xl border bg-card p-4 sm:p-5">
      <div className="flex items-center gap-4">
        {signedIn ? (
          <button
            type="button"
            onClick={state === "recording" ? finish : start}
            disabled={state === "transcribing" || busy}
            aria-label={state === "recording" ? t("रिकॉर्डिंग रोकें", "Stop recording") : t("बोलना शुरू करें", "Start speaking")}
            className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full transition ${state === "recording" ? "recording-pulse bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground hover:opacity-90"} disabled:opacity-60`}
          >
            {state === "transcribing" ? <Loader2 className="h-8 w-8 animate-spin" /> : state === "recording" ? <Square className="h-7 w-7" /> : <Mic className="h-9 w-9" />}
          </button>
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"><Mic className="h-9 w-9" /></div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {state === "recording" ? `${t("सुन रहे हैं…", "Listening…")} ${secs}s / ${MAX_SECONDS}s`
              : state === "transcribing" ? t("Gnani से लिख रहे हैं…", "Transcribing with Gnani…")
              : signedIn ? placeholder : t("आवाज़ के लिए साइन इन करें", "Sign in to use voice")}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">{t("उदाहरण", "Example")}: “{example}”</p>
          {!signedIn && ready && <Link to="/auth" className="mt-1 inline-block text-sm font-medium text-primary underline">{t("साइन इन / डेमो", "Sign in / try demo")}</Link>}
        </div>
      </div>
      {error && <p role="alert" className="mt-3 rounded-lg bg-amber-soft px-3 py-2 text-sm">{error}</p>}
      {(state === "review" || state === "idle") && (
        <div className="mt-3 space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Keyboard className="h-3.5 w-3.5" />{state === "review" ? t("जाँचें और ज़रूरत हो तो बदलें", "Check and edit the transcript") : t("या लिखें", "Or type")}</label>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder={example} disabled={!signedIn} />
          <div className="flex justify-end">
            <Button onClick={submit} disabled={!text.trim() || busy || !signedIn}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{t("भेजें", "Submit")}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
