import { termsRows, termsSpeech, type Terms } from "@/lib/terms";
import { useLang, useT } from "@/lib/i18n";
import { SpeakButton } from "./SpeakButton";
import { LogoMark } from "./Logo";
import { Button } from "@/components/ui/button";
import { Copy, Download, ExternalLink, CheckCircle2 } from "lucide-react";
import { directionsUrl } from "@/lib/kaam";
import { toast } from "sonner";

export function TermsList({ terms, version }: { terms: Terms; version?: number }) {
  const { lang } = useLang();
  const t = useT();
  return (
    <div>
      <dl className="divide-y rounded-xl border bg-card">
        {termsRows(terms, lang).map(([k, v]) => (
          <div key={k} className="grid grid-cols-[8.5rem_1fr] gap-3 px-4 py-2.5 text-sm"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>
        ))}
      </dl>
      {version && <p className="mt-1.5 text-xs text-muted-foreground">{t("शर्तों का संस्करण", "Terms version")} {version}</p>}
      <div className="mt-3"><SpeakButton text={termsSpeech(terms, lang)} label={t("शर्तें सुनें", "Hear the terms")} /></div>
    </div>
  );
}

export function BaatPakkiCard({ booking }: { booking: { reference: string; terms: Terms; worker_name: string; contractor_name: string; created_at: string; status: string; terms_version: number } }) {
  const { lang } = useLang();
  const t = useT();
  const rows = termsRows(booking.terms, lang);
  // Summary excludes contact details and exact coordinates' owner info; it only restates agreed terms.
  const summary = [`KaamSetu — Baat Pakki ${booking.reference}`, ...rows.map(([k, v]) => `${k}: ${v}`), `${t("कारीगर", "Worker")}: ${booking.worker_name}`, `${t("ठेकेदार", "Contractor")}: ${booking.contractor_name}`, t("नोट: यह बुकिंग भुगतान या पहचान की गारंटी नहीं है।", "Note: this booking does not guarantee payment or verify identity.")].join("\n");
  function download() {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([summary], { type: "text/plain" }));
    a.download = `kaamsetu-${booking.reference}.txt`; a.click();
  }
  const cancelled = booking.status === "cancelled";
  return (
    <section className={`overflow-hidden rounded-2xl border-2 ${cancelled ? "border-border opacity-70" : "border-primary"} bg-card`}>
      <div className={`flex items-center justify-between gap-3 px-5 py-4 ${cancelled ? "bg-muted" : "bg-primary text-primary-foreground"}`}>
        <div className="flex items-center gap-3">
          <LogoMark className="h-9 w-9" />
          <div>
            <p className="font-display text-xl font-semibold">{cancelled ? t("बुकिंग रद्द", "Booking cancelled") : booking.status === "completed" ? t("काम पूरा", "Work completed") : t("दोनों की बात पक्की", "Dono ki Baat Pakki")}</p>
            <p className="text-xs opacity-90">{t("दोनों ने एक ही शर्तें मानीं", "Both parties accepted the same terms")} · v{booking.terms_version}</p>
          </div>
        </div>
        <div className="text-right"><p className="text-[10px] uppercase tracking-wider opacity-80">{t("बुकिंग नंबर", "Booking ref")}</p><p className="font-mono text-lg font-semibold">{booking.reference}</p></div>
      </div>
      <div className="p-5">
        <div className="mb-3 grid grid-cols-2 gap-3 text-sm">
          <div><p className="text-muted-foreground">{t("कारीगर", "Worker")}</p><p className="flex items-center gap-1 font-medium"><CheckCircle2 className="h-4 w-4 text-success" />{booking.worker_name}</p></div>
          <div><p className="text-muted-foreground">{t("ठेकेदार", "Contractor")}</p><p className="flex items-center gap-1 font-medium"><CheckCircle2 className="h-4 w-4 text-success" />{booking.contractor_name}</p></div>
        </div>
        <TermsList terms={booking.terms} />
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(summary); toast.success(t("कॉपी हो गया", "Copied")); }}><Copy className="h-4 w-4" />{t("कॉपी", "Copy")}</Button>
          <Button variant="outline" size="sm" onClick={download}><Download className="h-4 w-4" />{t("डाउनलोड", "Download")}</Button>
          <Button variant="outline" size="sm" asChild><a href={directionsUrl(booking.terms.lat, booking.terms.lng)} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />{t("रास्ता देखें", "Open directions")}</a></Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{t("यह बुकिंग भुगतान की गारंटी नहीं देती और किसी की पहचान सत्यापित नहीं करती।", "This booking does not guarantee payment and does not verify anyone's identity.")}</p>
      </div>
    </section>
  );
}
