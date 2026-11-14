import { useEffect, useState } from "react";
import { Loader2, Volume2, Snail, Square } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { synthesizeSpeech } from "@/lib/voice.functions";
import { cacheAudio, getCached, onAudioChange, playUrl, stopAllAudio, isPlaying } from "@/lib/audio";
import { useLang, useT } from "@/lib/i18n";
import { useSession } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function SpeakButton({ text, label, showSlow = true, size = "sm" }: { text: string; label?: string; showSlow?: boolean; size?: "sm" | "default" }) {
  const t = useT();
  const { lang } = useLang();
  const { userId } = useSession();
  const tts = useServerFn(synthesizeSpeech);
  const [loading, setLoading] = useState<null | "n" | "s">(null);
  const [playing, setPlaying] = useState<null | "n" | "s">(null);
  useEffect(() => onAudioChange(() => { if (!isPlaying()) setPlaying(null); }), []);

  async function speak(slow: boolean) {
    if (!userId) { toast(t("सुनने के लिए साइन इन करें।", "Sign in to hear spoken details.")); return; }
    const mode = slow ? "s" : "n";
    if (playing) { stopAllAudio(); if (playing === mode) return; }
    const key = `${lang}|${slow}|${text}`;
    let url = getCached(key);
    if (!url) {
      setLoading(mode);
      try {
        const r = await tts({ data: { text, slow, lang } });
        if (!r.ok) { toast.error(`${t("Gnani आवाज़ नहीं बना पाया", "Gnani text-to-speech failed")}: ${r.message}`); return; }
        url = cacheAudio(key, r.data.audioBase64);
      } catch { toast.error(t("आवाज़ सेवा से जुड़ नहीं पाए।", "Couldn't reach the voice service.")); return; }
      finally { setLoading(null); }
    }
    setPlaying(mode);
    try { await playUrl(url); } catch { toast.error(t("आवाज़ चल नहीं पाई।", "Audio playback failed.")); }
    setPlaying(null);
  }

  const icon = (m: "n" | "s", I: typeof Volume2) => loading === m ? <Loader2 className="h-4 w-4 animate-spin" /> : playing === m ? <Square className="h-4 w-4" /> : <I className="h-4 w-4" />;
  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size={size} onClick={() => speak(false)} disabled={!!loading}>
        {icon("n", Volume2)}{playing === "n" ? t("रोकें", "Stop") : label ?? t("सुनें", "Hear this")}
      </Button>
      {showSlow && (
        <Button type="button" variant="ghost" size={size} onClick={() => speak(true)} disabled={!!loading}>
          {icon("s", Snail)}{t("धीरे सुनें", "Repeat slowly")}
        </Button>
      )}
    </div>
  );
}
