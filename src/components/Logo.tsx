export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  // Bridge arch over two pillars: "setu" = bridge.
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="8" className="fill-primary" />
      <path d="M5 21 Q16 7 27 21" fill="none" strokeWidth="2.6" strokeLinecap="round" className="stroke-primary-foreground" />
      <path d="M4 21 H28" strokeWidth="2.6" strokeLinecap="round" className="stroke-primary-foreground" />
      <path d="M10.5 21 V15.6 M16 21 V12.6 M21.5 21 V15.6" strokeWidth="1.8" strokeLinecap="round" className="stroke-primary-foreground" />
      <circle cx="16" cy="25.5" r="1.6" className="fill-amber" />
    </svg>
  );
}
export function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      <span className="font-display text-xl font-semibold tracking-tight text-foreground">Kaam<span className="text-primary">Setu</span></span>
    </span>
  );
}
