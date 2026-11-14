import { createFileRoute, Link } from "@tanstack/react-router";
import { Hammer, Search, Mic, Handshake, MapPinned } from "lucide-react";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KaamSetu — काम ढूँढें या कारीगर बुलाएँ | Ghaziabad" },
      { name: "description", content: "Ghaziabad's voice-first local jobs bridge for painters, plumbers and electricians. Speak in Hindi or Hinglish." },
      { property: "og:title", content: "KaamSetu — Ghaziabad local jobs by voice" },
      { property: "og:description", content: "Find work or hire local workers in Ghaziabad by speaking in Hindi or Hinglish." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const t = useT();
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:py-16">
      <p className="text-sm font-semibold uppercase tracking-wider text-primary">{t("ग़ाज़ियाबाद", "Ghaziabad")} · गाज़ियाबाद</p>
      <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight sm:text-5xl">
        {t("बोलकर काम ढूँढें, बोलकर कारीगर बुलाएँ।", "Speak to find work. Speak to hire.")}
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
        {t("पेंटर, प्लंबर और इलेक्ट्रीशियन के लिए स्थानीय काम — इंदिरापुरम, वैशाली, वसुंधरा, राज नगर, कवि नगर और क्रॉसिंग्स रिपब्लिक में। हिंदी या हिंग्लिश में बोलिए।",
          "Local work for painters, plumbers and electricians across Indirapuram, Vaishali, Vasundhara, Raj Nagar, Kavi Nagar and Crossings Republik. Speak in Hindi or Hinglish.")}
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Link to="/work" className="group rounded-2xl border bg-card p-6 transition hover:border-primary">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-soft text-primary"><Search className="h-6 w-6" /></span>
          <h2 className="mt-4 text-2xl font-semibold">काम ढूँढें</h2>
          <p className="text-sm font-medium text-muted-foreground">Find work</p>
          <p className="mt-3 text-sm text-muted-foreground">{t("“वैशाली में कल पेंटिंग का काम चाहिए, कम से कम नौ सौ रुपये।”", "“Vaishali mein kal painting ka kaam chahiye, kam se kam nau sau rupaye.”")}</p>
        </Link>
        <Link to="/hire" className="group rounded-2xl border bg-card p-6 transition hover:border-primary">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-soft text-foreground"><Hammer className="h-6 w-6" /></span>
          <h2 className="mt-4 text-2xl font-semibold">कारीगर बुलाएँ</h2>
          <p className="text-sm font-medium text-muted-foreground">Hire workers</p>
          <p className="mt-3 text-sm text-muted-foreground">{t("“कल वैशाली में दो पेंटर चाहिए, नौ सौ रुपये प्रति व्यक्ति।”", "“Kal Vaishali mein do painter chahiye, nau sau rupaye per person.”")}</p>
        </Link>
      </div>
      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {[
          [Mic, t("बोलिए", "Speak"), t("माइक दबाकर अपनी बात बोलिए। हम लिखकर दिखाएँगे, आप बदल सकते हैं।", "Tap the mic and speak. You see the transcript and can edit it.")],
          [MapPinned, t("नक्शे पर देखें", "See it on the map"), t("हर काम की जगह नक्शे पर, और सीधी दूरी का अंदाज़ा।", "Every job on a map, with approximate straight-line distance.")],
          [Handshake, t("दोनों की बात पक्की", "Dono ki Baat Pakki"), t("बुकिंग तभी पक्की जब दोनों एक ही शर्तें मानें।", "A booking is confirmed only when both accept the same terms.")],
        ].map(([I, h, p], i) => {
          const Icon = I as typeof Mic;
          return (
            <div key={i}>
              <Icon className="h-6 w-6 text-primary" />
              <h3 className="mt-2 text-lg font-semibold">{h as string}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p as string}</p>
            </div>
          );
        })}
      </div>
      <p className="mt-12 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
        {t("यह एक प्रोटोटाइप है। डेमो काम काल्पनिक हैं और नक्शे पर उनकी जगह अंदाज़न है — ये असली नौकरियाँ नहीं हैं।", "This is a prototype. Demo jobs are fictional and their map pins are approximate demo locations — not real hiring sites.")}
      </p>
    </div>
  );
}
