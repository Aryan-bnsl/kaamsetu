import { useEffect, useRef } from "react";
import L from "leaflet";
import { GHAZIABAD_CENTER } from "@/lib/kaam";

export type MapJob = { id: string; lat: number; lng: number; skill: string; title: string };
type Props = {
  jobs?: MapJob[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  pin?: { lat: number; lng: number } | null;
  onPick?: (p: { lat: number; lng: number }) => void;
  center?: { lat: number; lng: number } | null;
  userLoc?: { lat: number; lng: number } | null;
  className?: string;
};

const SKILL_VAR: Record<string, string> = { painter: "--skill-painter", plumber: "--skill-plumber", electrician: "--skill-electrician" };
const LETTER: Record<string, string> = { painter: "P", plumber: "Pl", electrician: "E" };

function icon(skill: string, selected: boolean) {
  const size = selected ? 38 : 30;
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    html: `<div style="width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:var(${SKILL_VAR[skill] ?? "--primary"});border:${selected ? 3 : 2}px solid var(--card);box-shadow:0 1px 4px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center"><span style="transform:rotate(45deg);color:white;font:600 ${selected ? 13 : 11}px var(--font-sans)">${LETTER[skill] ?? "•"}</span></div>`,
  });
}

export default function JobMap({ jobs = [], selectedId, onSelect, pin, onPick, center, userLoc, className = "h-full w-full" }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const markers = useRef(new Map<string, L.Marker>());
  const pinMarker = useRef<L.Marker | null>(null);
  const userMarker = useRef<L.CircleMarker | null>(null);
  const pickRef = useRef(onPick); pickRef.current = onPick;
  const selRef = useRef(onSelect); selRef.current = onSelect;

  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, { zoomControl: true }).setView(GHAZIABAD_CENTER, 12);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap contributors" }).addTo(m);
    layer.current = L.layerGroup().addTo(m);
    m.on("click", (e: L.LeafletMouseEvent) => pickRef.current?.({ lat: +e.latlng.lat.toFixed(6), lng: +e.latlng.lng.toFixed(6) }));
    map.current = m;
    const ro = new ResizeObserver(() => m.invalidateSize()); ro.observe(el.current);
    return () => { ro.disconnect(); m.remove(); map.current = null; markers.current.clear(); pinMarker.current = null; userMarker.current = null; };
  }, []);

  useEffect(() => {
    const g = layer.current; if (!g) return;
    g.clearLayers(); markers.current.clear();
    for (const j of jobs) {
      const mk = L.marker([j.lat, j.lng], { icon: icon(j.skill, j.id === selectedId), title: j.title, keyboard: true, zIndexOffset: j.id === selectedId ? 1000 : 0 });
      mk.on("click", () => selRef.current?.(j.id));
      mk.bindTooltip(j.title);
      mk.addTo(g); markers.current.set(j.id, mk);
    }
  }, [jobs, selectedId]);

  useEffect(() => {
    const m = map.current; if (!m || !selectedId) return;
    const mk = markers.current.get(selectedId);
    if (mk) m.panTo(mk.getLatLng(), { animate: true });
  }, [selectedId]);

  useEffect(() => {
    const m = map.current; if (!m) return;
    if (pin) {
      if (!pinMarker.current) {
        pinMarker.current = L.marker([pin.lat, pin.lng], { draggable: !!onPick, icon: icon("pin", true) }).addTo(m);
        pinMarker.current.on("dragend", () => { const p = pinMarker.current!.getLatLng(); pickRef.current?.({ lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6) }); });
      } else pinMarker.current.setLatLng([pin.lat, pin.lng]);
    } else if (pinMarker.current) { pinMarker.current.remove(); pinMarker.current = null; }
  }, [pin, onPick]);

  useEffect(() => { if (center && map.current) map.current.setView([center.lat, center.lng], 15); }, [center]);

  useEffect(() => {
    const m = map.current; if (!m) return;
    if (userLoc) {
      if (!userMarker.current) userMarker.current = L.circleMarker([userLoc.lat, userLoc.lng], { radius: 8, color: "#fff", weight: 2, fillColor: "#2563eb", fillOpacity: 1 }).bindTooltip("You").addTo(m);
      else userMarker.current.setLatLng([userLoc.lat, userLoc.lng]);
    }
  }, [userLoc]);

  return <div ref={el} className={className} role="application" aria-label="Map of Ghaziabad" />;
}
