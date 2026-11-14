import { Link } from "@tanstack/react-router";
import { Bookmark, BookmarkCheck, CalendarDays, Clock, MapPin, Users } from "lucide-react";
import { formatDate, hhmm, type Job, type MatchReason } from "@/lib/kaam";
import { SKILL_LABEL, STATUS_LABEL, localityLabel, pick, useLang, useT, wageLabel } from "@/lib/i18n";
import { termsSpeech, type Terms } from "@/lib/terms";
import { SpeakButton } from "./SpeakButton";

export function SkillDot({ skill }: { skill: string }) {
  const c = skill === "painter" ? "bg-skill-painter" : skill === "plumber" ? "bg-skill-plumber" : "bg-skill-electrician";
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${c}`} aria-hidden />;
}

export function JobCard({ job, remaining, reasons, selected, onSelect, saved, onToggleSave, distance }: {
  job: Job; remaining: number; reasons?: MatchReason[] | null | undefined; selected?: boolean | undefined; onSelect?: (() => void) | undefined;
  saved?: boolean | undefined; onToggleSave?: (() => void) | undefined; distance?: number | null | undefined;
}) {
  const { lang } = useLang();
  const t = useT();
  const reasonText = (reasons ?? []).map((r) =>
    r === "skill" ? pick(SKILL_LABEL, job.skill, lang)
    : r === "locality" ? localityLabel(job.locality, lang)
    : r === "date" ? t("आपकी चुनी तारीख", "Matches your selected date")
    : t("आपकी न्यूनतम मज़दूरी से ऊपर", "Meets your minimum wage"));
  return (
    <article
      onClick={onSelect}
      className={`cursor-pointer rounded-xl border bg-card p-4 transition ${selected ? "border-primary ring-2 ring-primary/30" : "hover:border-primary/50"}`}
      aria-selected={selected}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <SkillDot skill={job.skill} />{pick(SKILL_LABEL, job.skill, lang)}
            {job.is_demo && <span className="rounded bg-amber-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground">{t("डेमो", "Demo")}</span>}
            {job.status !== "open" && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold">{pick(STATUS_LABEL, job.status, lang)}</span>}
          </div>
          <h3 className="mt-1 text-lg font-semibold leading-snug">{job.description || pick(SKILL_LABEL, job.skill, lang)}</h3>
        </div>
        <div className="text-right">
          <div className="font-display text-xl font-semibold text-primary">{wageLabel(job.wage, job.wage_unit, lang)}</div>
          {onToggleSave && (
            <button onClick={(e) => { e.stopPropagation(); onToggleSave(); }} className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" aria-label={saved ? t("सेव हटाएँ", "Unsave") : t("सेव करें", "Save job")}>
              {saved ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}{saved ? t("सेव है", "Saved") : t("सेव", "Save")}
            </button>
          )}
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
        <div className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-muted-foreground" />{localityLabel(job.locality, lang)}</div>
        <div className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4 text-muted-foreground" />{formatDate(job.work_date, lang)}</div>
        <div className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-muted-foreground" />{hhmm(job.start_time)}–{hhmm(job.end_time)}</div>
        <div className="flex items-center gap-1.5"><Users className="h-4 w-4 text-muted-foreground" />{remaining} / {job.workers_needed} {t("जगह बाकी", "openings left")}</div>
      </dl>
      {distance != null && <p className="mt-2 text-xs text-muted-foreground">{t("लगभग सीधी दूरी", "Approx. straight-line distance")}: {distance.toFixed(1)} km</p>}
      {reasonText.length > 0 && <p className="mt-2 text-xs font-medium text-accent-foreground">{t("क्यों मेल खाता है", "Why this matches")}: {reasonText.join(" • ")}</p>}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
        <SpeakButton text={termsSpeech(job as unknown as Terms, lang)} label={t("यह काम सुनें", "Hear this job")} showSlow={false} />
        <Link to="/jobs/$id" params={{ id: job.id }} className="text-sm font-semibold text-primary hover:underline">{t("पूरी जानकारी →", "View details →")}</Link>
      </div>
    </article>
  );
}
