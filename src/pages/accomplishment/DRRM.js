import React, { useCallback, useEffect, useMemo, useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  GeoJSON,
  LayersControl,
  MapContainer,
  Marker,
  Pane,
  Polygon,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import * as XLSX from "xlsx";
import axios from "axios";
import API_BASE from "../../api";

/* Leaflet marker icons */
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const PANGASINAN_LGUS = [
  "Alaminos City", "Dagupan City", "San Carlos City", "Urdaneta City",
  "Agno", "Aguilar", "Alcala", "Anda", "Asingan", "Balungao", "Bani",
  "Basista", "Bautista", "Bayambang", "Binalonan", "Binmaley", "Bolinao",
  "Bugallon", "Burgos", "Calasiao", "Dasol", "Infanta", "Labrador",
  "Laoac", "Lingayen", "Mabini", "Malasiqui", "Manaoag", "Mangaldan",
  "Mangatarem", "Mapandan", "Natividad", "Pozorrubio", "Rosales",
  "San Fabian", "San Jacinto", "San Manuel", "San Nicolas", "San Quintin",
  "Santa Barbara", "Santa Maria", "Santo Tomas", "Sison", "Sual", "Tayug",
  "Umingan", "Urbiztondo", "Villasis",
].sort((a, b) => a.localeCompare(b));

const PANGASINAN_DISTRICTS = [
  { id: "District 1", municipalities: ["Agno", "Alaminos City", "Anda", "Bani", "Bolinao", "Burgos", "Dasol", "Infanta", "Mabini", "Sual"] },
  { id: "District 2", municipalities: ["Aguilar", "Basista", "Binmaley", "Bugallon", "Labrador", "Lingayen", "Mangatarem", "Urbiztondo"] },
  { id: "District 3", municipalities: ["Bayambang", "Calasiao", "Malasiqui", "Mapandan", "San Carlos City", "Santa Barbara"] },
  { id: "District 4", municipalities: ["Dagupan City", "Manaoag", "Mangaldan", "San Fabian", "San Jacinto"] },
  { id: "District 5", municipalities: ["Alcala", "Bautista", "Binalonan", "Laoac", "Pozorrubio", "Santo Tomas", "Sison", "Urdaneta City", "Villasis"] },
  { id: "District 6", municipalities: ["Asingan", "Balungao", "Natividad", "Rosales", "San Manuel", "San Nicolas", "San Quintin", "Santa Maria", "Tayug", "Umingan"] },
];

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const QUARTERS = ["1st", "2nd", "3rd", "4th"];
const BARANGAY_URL = "/data/pangasinan_barangays.json";
const PAGE_SIZE = 10;
const DRRM_API = `${API_BASE}/api/drrm`;
const PSCP_YEAR = new Date().getFullYear();

const fontFamily = '"Poppins", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial';

const DEFAULT_SECTOR_TYPES = ["NGA", "LGU", "Academe", "Education", "Media", "NGO", "Private Sector", "All Sector"].sort((a, b) => a.localeCompare(b));
const DEFAULT_IEC_TITLES = [
  "DANAS Source Book (Book)",
  "Reference for Emergency and Disaster (REDBOOK)",
  "Natural Signs of tsunami (Poster)",
  "Tsunami Community Preparedness (Poster)",
  "Earthquake Community Preparedness (Poster)",
  "Phivolcs Earthquake Intensity Scale (Brochure)",
  "Heavy Rainfall",
].sort((a, b) => a.localeCompare(b));
const DEFAULT_IEC_SOURCES = ["PHIVOLCS", "DOST-STII", "PAGASA", "OCD", "DENR-MGB"].sort((a, b) => a.localeCompare(b));
const DEFAULT_STAKEHOLDERS = [
  "RDRRMC1", "Prevention and Mitigation Cluster Member", "OCD 1", "OCD", "PDRRMO Pangasinan",
  "DOST-PHIVOLCS", "DOST-PAGASA", "PHIVOLCS", "PAGASA", "DOST-STII", "DENR-MGB",
].sort((a, b) => a.localeCompare(b));

const S = {
  page: { padding: 16, fontFamily },
  title: { background: "#2f6fd6", color: "#fff", padding: "12px 16px", borderRadius: 8, fontWeight: 900, fontSize: 22, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", fontFamily },
  mapCard: { marginTop: 10, border: "2px solid #6b7280", borderRadius: 12, overflow: "hidden", background: "#fff" },
  mapHead: { background: "#eef2f6", borderBottom: "2px solid #6b7280", padding: "10px 12px" },
  map: { height: 460, width: "100%" },
  filterRow: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 8 },
  labelSmall: { fontSize: 12, fontWeight: 900, opacity: 0.8, fontFamily },
  sel: { padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", fontWeight: 900, fontSize: 12, minWidth: 220, fontFamily },

  sectionTitleRow: { marginTop: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" },
  sectionTitle: { fontWeight: 900, fontSize: 13, color: "#0f172a", fontFamily },
  card: { marginTop: 12, border: "2px solid #6b7280", borderRadius: 12, overflow: "hidden", background: "#fff" },
  head: { padding: "10px 12px", background: "#f8fafc", borderBottom: "2px solid #6b7280", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" },
  hWrap: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  h: { fontWeight: 900, fontSize: 18, color: "#0f172a", fontFamily },
  showing: { fontSize: 12, fontWeight: 900, color: "#334155", opacity: 0.85, fontFamily },
  tools: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  search: { padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", width: 165, minWidth: 165, maxWidth: 180, fontSize: 12, fontFamily },
  dostPagerWrap: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, padding: "14px 0", fontFamily },
  dostPagerLogo: { lineHeight: 1, fontSize: 30, fontWeight: 1000, letterSpacing: -1, fontFamily },
  dostBlue: { color: "#23a8e0" },
  dostDark: { color: "#0f172a" },
  dostPagerControls: { display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", alignItems: "center", fontFamily },
  selPill: { padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", fontWeight: 900, fontSize: 12, minWidth: 120, fontFamily },

  btn: { padding: "8px 12px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", fontWeight: 900, cursor: "pointer", fontFamily },
  btnP: { padding: "8px 12px", borderRadius: 10, border: "1px solid #0b4ea2", background: "#0b4ea2", color: "#fff", fontWeight: 900, cursor: "pointer", fontFamily },
  tbtn: { padding: "4px 10px", borderRadius: 999, border: "1px solid rgba(15,23,42,.2)", background: "#fff", fontWeight: 900, fontSize: 11, cursor: "pointer", fontFamily },
  danger: { padding: "4px 10px", borderRadius: 10, border: "1px solid #ef4444", background: "#fff", color: "#ef4444", fontWeight: 900, fontSize: 11, cursor: "pointer", fontFamily },

  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", tableLayout: "fixed", minWidth: 1100, fontFamily },
  th: { border: "2px solid #6b7280", padding: 6, background: "#eef2f6", fontSize: 11, textAlign: "center", fontWeight: 900, wordBreak: "break-word", fontFamily },
  td: { border: "2px solid #6b7280", padding: 6, fontSize: 11, verticalAlign: "top", wordBreak: "break-word", fontFamily },
  tdC: { border: "2px solid #6b7280", padding: 6, fontSize: 11, verticalAlign: "top", textAlign: "center", wordBreak: "break-word", fontFamily },

  backdrop: { position: "fixed", inset: 0, background: "rgba(0,0,0,.4)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 999 },
  modal: { background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,.25)", maxHeight: "92vh", display: "flex", flexDirection: "column" },
  modalHead: { background: "#0b4ea2", color: "#fff", padding: "12px 16px", fontWeight: 900, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, fontFamily },
  x: { border: "1px solid rgba(255,255,255,.6)", background: "transparent", color: "#fff", borderRadius: 10, padding: "6px 10px", cursor: "pointer", fontWeight: 900, fontFamily },
  modalBody: { padding: 16, overflow: "auto" },
  modalFoot: { padding: 16, display: "flex", justifyContent: "flex-end", gap: 8, borderTop: "1px solid #e2e8f0" },
  f: { display: "flex", flexDirection: "column", gap: 6 },
  l: { fontSize: 12, fontWeight: 900, color: "#0f172a", fontFamily },
  in: { padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, fontFamily, width: "100%", boxSizing: "border-box" },
  ta: { padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, minHeight: 70, resize: "vertical", fontFamily, width: "100%", boxSizing: "border-box" },
  warn: { marginTop: 6, fontSize: 12, fontWeight: 800, color: "#7c2d12", background: "#fff7ed", border: "1px solid #fdba74", padding: "8px 10px", borderRadius: 10, fontFamily },
  pill: (active) => ({ padding: "8px 12px", borderRadius: 999, border: active ? "1px solid #0b4ea2" : "1px solid #cbd5e1", background: active ? "#dbeafe" : "#fff", fontWeight: 900, cursor: "pointer", fontFamily }),
  mapMini: { height: 320, border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" },
  listBox: { maxHeight: 320, overflow: "auto", border: "1px solid #e2e8f0", borderRadius: 12, padding: 6 },
  listBtn: { width: "100%", textAlign: "left", padding: "10px 10px", borderRadius: 10, border: "1px solid transparent", background: "transparent", cursor: "pointer", fontWeight: 800, fontFamily },
  listBtnActive: { background: "#e0f2fe", border: "1px solid #38bdf8" },
  tabBar: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 },
  tabBtn: { padding: "6px 10px", borderRadius: 999, border: "1px solid #cbd5e1", background: "#fff", fontWeight: 900, fontSize: 12, cursor: "pointer", fontFamily },
  tabBtnA: { padding: "6px 10px", borderRadius: 999, border: "1px solid #0b4ea2", background: "#dbeafe", color: "#0b4ea2", fontWeight: 900, fontSize: 12, cursor: "pointer", fontFamily },
  pager: { display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", padding: "14px 0" },
  link: { border: "none", background: "transparent", cursor: "pointer", fontWeight: 800, fontFamily, color: "#2563eb" },
  link2: (a) => ({ border: "none", background: "transparent", cursor: "pointer", fontWeight: a ? 900 : 800, color: a ? "#2563eb" : "#0f172a", textDecoration: a ? "underline" : "none", fontFamily }),
};

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function toNum(v) {
  const n = Number(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function uniq(arr) {
  return Array.from(new Set((arr || []).map((x) => String(x || "").trim()).filter(Boolean)));
}

function qFromDate(iso) {
  if (!iso) return 1;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return 1;
  const m = d.getMonth() + 1;
  if (m <= 3) return 1;
  if (m <= 6) return 2;
  if (m <= 9) return 3;
  return 4;
}

function qLabel(q) {
  return q === 1 ? "1st" : q === 2 ? "2nd" : q === 3 ? "3rd" : "4th";
}

function mName(iso) {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", { month: "long" });
}

function yNum(iso) {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "";
  return String(d.getFullYear());
}

function fmtDateShort(iso) {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const day = String(d.getDate()).padStart(2, "0");
  const mon = d.toLocaleString("en-US", { month: "short" });
  const yy = String(d.getFullYear()).slice(-2);
  return `${mon}-${day}-${yy}`;
}

function normalizeUrl(u) {
  const s = String(u || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s)) return s;
  if (/^www\./i.test(s)) return `https://${s}`;
  return s;
}

function extractUrls(text) {
  const t = String(text || "");
  const matches = t.match(/(https?:\/\/[^\s)]+|www\.[^\s)]+)/gi) || [];
  return uniq(matches.map(normalizeUrl).filter((x) => /^https?:\/\//i.test(x)));
}

function districtOfMunicipality(muni) {
  const found = PANGASINAN_DISTRICTS.find((d) => d.municipalities.includes(muni));
  return found?.id || "";
}

function normalizeEntry(raw) {
  const e = raw || {};
  return {
    ...e,
    id: e.id ?? e.activity_id ?? e.iec_id ?? e.collaboration_id ?? uid(),
    sectors: Array.isArray(e.sectors) ? e.sectors : typeof e.sectors === "string" ? e.sectors.split(",").map((x) => x.trim()).filter(Boolean) : [],
    titles: Array.isArray(e.titles) ? e.titles : typeof e.titles === "string" ? e.titles.split(",").map((x) => x.trim()).filter(Boolean) : [],
    sources: Array.isArray(e.sources) ? e.sources : typeof e.sources === "string" ? e.sources.split(",").map((x) => x.trim()).filter(Boolean) : [],
    stakeholders: Array.isArray(e.stakeholders) ? e.stakeholders : typeof e.stakeholders === "string" ? e.stakeholders.split(",").map((x) => x.trim()).filter(Boolean) : [],
    partners: Array.isArray(e.partners)
      ? e.partners
      : typeof e.partners === "string"
      ? e.partners.split(",").map((x) => x.trim()).filter(Boolean)
      : Array.isArray(e.stakeholders)
      ? e.stakeholders
      : typeof e.stakeholders === "string"
      ? e.stakeholders.split(",").map((x) => x.trim()).filter(Boolean)
      : [],
    venueMeta: typeof e.venueMeta === "string" ? safeParse(e.venueMeta, null) : e.venueMeta || null,
  };
}

function safeParse(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function Modal({ open, title, onClose, children, footer, width = 980, zIndex = 3000 }) {
  if (!open) return null;
  return (
    <div style={{ ...S.backdrop, zIndex }} onClick={onClose}>
      <div style={{ ...S.modal, width: `min(${width}px, 100%)`, position: "relative", zIndex: zIndex + 1 }} onClick={(e) => e.stopPropagation()}>
        <div style={S.modalHead}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>{title}</div>
          <button style={S.x} onClick={onClose}>✕</button>
        </div>
        <div style={S.modalBody}>{children}</div>
        {footer ? <div style={S.modalFoot}>{footer}</div> : null}
      </div>
    </div>
  );
}

function AddOptionModal({ open, title, placeholder, onCancel, onAdd }) {
  const [val, setVal] = useState("");
  useEffect(() => { if (open) setVal(""); }, [open]);
  return (
    <Modal
      open={open}
      title={<div>{title}</div>}
      onClose={onCancel}
      width={560}
      zIndex={4400}
      footer={
        <>
          <button style={S.btn} onClick={onCancel}>Cancel</button>
          <button style={S.btnP} onClick={() => { const v = val.trim(); if (!v) return window.alert("Type a value."); onAdd(v); }}>Add</button>
        </>
      }
    >
      <div style={S.f}>
        <div style={S.l}>New value</div>
        <input style={S.in} value={val} onChange={(e) => setVal(e.target.value)} placeholder={placeholder} />
      </div>
    </Modal>
  );
}

function MultiSelectModal({ open, title, options, selected, onConfirm, onClose, onAddNew }) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState([]);

  useEffect(() => {
    if (open) {
      setQ("");
      setSel(Array.isArray(selected) ? selected : []);
    }
  }, [open, selected]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return options || [];
    return (options || []).filter((x) => String(x).toLowerCase().includes(s));
  }, [options, q]);

  const toggle = (val) => setSel((p) => (p.includes(val) ? p.filter((x) => x !== val) : [...p, val]));

  if (!open) return null;

  return (
    <Modal open={open} title={<div>{title}</div>} onClose={onClose} width={560} zIndex={4300} footer={null}>
      <div style={{ display: "grid", gap: 10, fontFamily }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input style={{ ...S.in, flex: 1 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type to search..." />
          <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8, whiteSpace: "nowrap", fontFamily }}>Selected: {sel.length}</div>
        </div>
        <div style={{ border: "1px solid #cbd5e1", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
          <div style={{ maxHeight: 320, overflow: "auto" }}>
            {filtered.map((opt) => (
              <label key={opt} style={{ display: "grid", gridTemplateColumns: "18px 1fr", alignItems: "center", columnGap: 12, padding: "10px 12px", borderBottom: "1px solid #f1f5f9", cursor: "pointer", fontFamily }}>
                <input type="checkbox" checked={sel.includes(opt)} onChange={() => toggle(opt)} style={{ margin: 0, width: 14, height: 14 }} />
                <span style={{ fontWeight: 800, fontSize: 13, color: "#0f172a", textAlign: "left", fontFamily }}>{opt}</span>
              </label>
            ))}
            {filtered.length === 0 ? <div style={{ padding: 12, opacity: 0.7, fontFamily }}>No matches.</div> : null}
          </div>
          <div style={{ padding: 10, display: "flex", justifyContent: "flex-start", borderTop: "1px solid #e2e8f0" }}>
            <button style={S.tbtn} onClick={onAddNew}>+ Add new value...</button>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button style={S.btn} onClick={() => setSel(uniq([...(sel || []), ...(filtered || [])]))}>SELECT ALL</button>
            <button style={S.btn} onClick={() => setSel([])}>CLEAR</button>
          </div>
          <button style={S.btnP} onClick={() => { onConfirm(uniq(sel)); onClose(); }}>CONFIRM</button>
        </div>
      </div>
    </Modal>
  );
}

function ClickPick({ onPick }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

function FitAndLockToPangasinan({ bounds, borderMode, selectedMuni, selectedDist, filteredGeo }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !bounds) return;
    map.setMaxBounds(bounds.pad(0.15));
    map.setMinZoom(9);
    map.setMaxZoom(18);
    const fitGeo = (geo) => {
      try {
        const layer = L.geoJSON(geo);
        const b = layer.getBounds();
        if (b && b.isValid()) map.fitBounds(b.pad(0.05), { animate: true });
      } catch {}
    };
    if ((borderMode === "municipality" && selectedMuni) || (borderMode === "district" && selectedDist)) {
      if (filteredGeo?.features?.length) {
        fitGeo(filteredGeo);
        return;
      }
    }
    map.fitBounds(bounds.pad(0.05), { animate: true });
  }, [map, bounds, borderMode, selectedMuni, selectedDist, filteredGeo]);
  return null;
}

function parseCoordinates(text) {
  const s = String(text || "").trim();
  const m = s.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
    if (!res.ok) throw new Error("Reverse geocode failed");
    const data = await res.json();
    const a = data?.address || {};
    const brgy = a.village || a.hamlet || a.suburb || a.neighbourhood || a.quarter || "";
    const muni = a.city || a.town || a.municipality || a.county || "";
    const province = a.state || a.province || "Pangasinan";
    const compact = [brgy, muni, province].filter(Boolean).join(", ");
    return compact || data?.display_name || "";
  } catch {
    return "";
  }
}

function VenueFlowModal({ open, onClose, onSave, initialMeta }) {
  const [mode, setMode] = useState("hier");
  const [step, setStep] = useState(1);
  const [venue, setVenue] = useState("");
  const [muni, setMuni] = useState("");
  const [brgy, setBrgy] = useState("");
  const [manual, setManual] = useState("");
  const [coordsText, setCoordsText] = useState("");
  const [brgys, setBrgys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const [pin, setPin] = useState(null);

  useEffect(() => {
    if (!open) return;
    setMode(initialMeta?.mode === "manual" ? "manual" : "hier");
    setVenue(initialMeta?.venue || "");
    setMuni(initialMeta?.municipality || "");
    setBrgy(initialMeta?.barangay || "");
    setManual(initialMeta?.manualText || initialMeta?.addressText || "");
    const hasCoords = Number.isFinite(Number(initialMeta?.lat)) && Number.isFinite(Number(initialMeta?.lng));
    setPin(hasCoords ? { lat: Number(initialMeta.lat), lng: Number(initialMeta.lng) } : null);
    setCoordsText(hasCoords ? `${initialMeta.lat}, ${initialMeta.lng}` : "");
    setErr("");
    setSearch("");
    setBrgys([]);
    setLoading(false);
    if (initialMeta?.mode === "manual") setStep(1);
    else setStep(initialMeta?.municipality ? 2 : 1);
  }, [open, initialMeta]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!open || mode !== "hier" || !muni) return;
      setLoading(true);
      setErr("");
      try {
        const res = await fetch(BARANGAY_URL);
        if (!res.ok) throw new Error("Missing public/data/pangasinan_barangays.json");
        const data = await res.json();
        const key = Object.keys(data || {}).find((k) => k.toLowerCase().trim() === muni.toLowerCase().trim()) || muni;
        const arr = data?.[key];
        const list = Array.isArray(arr) ? arr : [];
        const norm = list
          .map((x) => typeof x === "string" ? { name: x, lat: null, lng: null } : { name: String(x?.name || ""), lat: Number.isFinite(Number(x?.lat)) ? Number(x.lat) : null, lng: Number.isFinite(Number(x?.lng)) ? Number(x.lng) : null })
          .filter((x) => x.name)
          .sort((a, b) => a.name.localeCompare(b.name));
        if (!cancel) setBrgys(norm);
      } catch (e) {
        if (!cancel) setErr(String(e?.message || e));
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [open, mode, muni]);

  const addressText = mode === "manual" ? manual.trim() : [brgy, muni, "Pangasinan"].filter(Boolean).join(", ");
  const displayText = [venue.trim(), addressText].filter(Boolean).join(", ");
  const canSave = Boolean(venue.trim() || addressText || pin);
  const breadcrumb = mode === "manual" ? "Manual Input" : step === 1 ? "Pangasinan > Select Municipality/City" : step === 2 ? `Pangasinan > ${muni} > Select Barangay` : `Pangasinan > ${muni} > ${brgy} > Pin`;

  const filteredBrgys = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return brgys;
    return brgys.filter((b) => b.name.toLowerCase().includes(s));
  }, [brgys, search]);

  const save = () => {
    if (!canSave) return window.alert("Add a Venue, Type Venue/Address, or Coordinates.");
    const meta = mode === "manual"
      ? { mode: "manual", venue: venue.trim(), manualText: manual.trim(), addressText: manual.trim(), displayText, province: "", municipality: "", barangay: "", lat: pin?.lat ?? null, lng: pin?.lng ?? null }
      : { mode: "hier", venue: venue.trim(), manualText: "", addressText, displayText, province: "Pangasinan", municipality: muni, barangay: brgy, lat: pin?.lat ?? null, lng: pin?.lng ?? null };
    onSave(meta);
    onClose();
  };

  const useCoordinates = async () => {
    const parsed = parseCoordinates(coordsText);
    if (!parsed) return window.alert("Invalid coordinates. Example: 15.123456, 120.123456");
    setPin(parsed);
    if (mode === "manual") {
      const addr = await reverseGeocode(parsed.lat, parsed.lng);
      if (addr) setManual(addr);
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return window.alert("Geolocation not supported.");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPin(p);
        setCoordsText(`${p.lat}, ${p.lng}`);
        if (mode === "manual") {
          const addr = await reverseGeocode(p.lat, p.lng);
          if (addr) setManual(addr);
        }
      },
      () => window.alert("Could not get location. Check browser permissions.")
    );
  };

  const back = () => {
    if (mode === "manual") return onClose();
    if (step === 1) return onClose();
    if (step === 2) { setStep(1); setSearch(""); return; }
    if (step === 3) { setStep(2); return; }
  };

  const goMap = () => {
    if (!muni || !brgy) return window.alert("Select municipality and barangay first.");
    if (!pin) setPin({ lat: 15.9167, lng: 120.3333 });
    setStep(3);
  };

  return (
    <Modal
      open={open}
      title={<div><div>Add Venue/Address</div><div style={{ fontSize: 12, opacity: 0.9, fontWeight: 800 }}>{breadcrumb}</div></div>}
      onClose={onClose}
      width={820}
      zIndex={4200}
      footer={null}
    >
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={S.pill(mode === "hier")} onClick={() => { setMode("hier"); setStep(1); setManual(""); }}>Hierarchical</button>
          <button style={S.pill(mode === "manual")} onClick={() => { setMode("manual"); setStep(1); setMuni(""); setBrgy(""); setSearch(""); }}>Manual Input</button>
        </div>

        <div style={S.f}>
          <div style={S.l}>Venue</div>
          <input style={S.in} value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g. Riverside Convention Center (optional)" />
        </div>

        {mode === "manual" ? (
          <>
            <div style={S.f}>
              <div style={S.l}>Type Venue/Address</div>
              <textarea style={S.ta} value={manual} onChange={(e) => setManual(e.target.value)} placeholder="e.g. Allabon, Agno, Pangasinan" />
            </div>
            <div style={S.f}>
              <div style={S.l}>Coordinates</div>
              <input style={S.in} value={coordsText} onChange={(e) => setCoordsText(e.target.value)} placeholder="Optional: 15.123456, 120.123456" />
              <div><button style={S.tbtn} onClick={useCoordinates}>Use Coordinates</button></div>
            </div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Preview: <b>{displayText || "—"}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <button style={S.btn} onClick={back}>Back</button>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button style={S.btn} onClick={useMyLocation}>Use My Location</button>
                <button style={S.btnP} onClick={save} disabled={!canSave}>Save</button>
              </div>
            </div>
          </>
        ) : step === 1 ? (
          <>
            <div style={S.f}>
              <div style={S.l}>Search Municipality/City</div>
              <input style={S.in} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Type to search..." />
            </div>
            <div style={S.l}>Select Municipality/City (Pangasinan)</div>
            <div style={S.listBox}>
              {PANGASINAN_LGUS.filter((m) => !search.trim() || m.toLowerCase().includes(search.trim().toLowerCase())).map((m) => (
                <button key={m} style={{ ...S.listBtn, ...(m === muni ? S.listBtnActive : {}) }} onClick={() => { setMuni(m); setBrgy(""); setPin(null); setSearch(""); setStep(2); }}>{m}</button>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><button style={S.btn} onClick={onClose}>Cancel</button></div>
          </>
        ) : step === 2 ? (
          <>
            <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.85 }}>Municipality: <b>{muni}</b></div>
            <div style={S.f}>
              <div style={S.l}>Search Barangay</div>
              <input style={S.in} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={loading ? "Loading..." : "Type to search barangays..."} disabled={loading} />
              {err ? <div style={S.warn}>⚠ {err}</div> : null}
            </div>
            <div style={S.l}>Select Barangay</div>
            <div style={S.listBox}>
              {filteredBrgys.map((b) => (
                <button key={b.name} style={{ ...S.listBtn, ...(b.name === brgy ? S.listBtnActive : {}) }} onClick={() => { setBrgy(b.name); if (Number.isFinite(b.lat) && Number.isFinite(b.lng)) { setPin({ lat: b.lat, lng: b.lng }); setCoordsText(`${b.lat}, ${b.lng}`); } }}>{b.name}</button>
              ))}
            </div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Preview: <b>{displayText || "—"}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <button style={S.btn} onClick={back}>Back</button>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button style={S.btn} onClick={goMap} disabled={!muni || !brgy}>Pin on Map</button>
                <button style={S.btnP} onClick={save} disabled={!canSave}>Save</button>
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.85 }}>Click map or drag marker</div>
            <div style={S.mapMini}>
              <MapContainer center={[pin?.lat || 15.9167, pin?.lng || 120.3333]} zoom={pin ? 16 : 12} minZoom={9} maxZoom={18} style={{ height: "100%", width: "100%" }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" opacity={0.9} />
                <ClickPick onPick={(p) => { setPin(p); setCoordsText(`${p.lat}, ${p.lng}`); }} />
                {pin ? <Marker position={[pin.lat, pin.lng]} draggable eventHandlers={{ dragend: (e) => { const p = e.target.getLatLng(); setPin({ lat: p.lat, lng: p.lng }); setCoordsText(`${p.lat}, ${p.lng}`); } }} /> : null}
              </MapContainer>
            </div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>
              <div><b>Selected:</b> {displayText || "—"}</div>
              <div><b>Coordinates:</b> {pin ? `${pin.lat}, ${pin.lng}` : "—"}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <button style={S.btn} onClick={back}>Back</button>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button style={S.btn} onClick={useMyLocation}>Use My Location</button>
                <button style={S.btnP} onClick={save} disabled={!canSave}>Save</button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

function Pagination({ total, page, onPage }) {
  const safePage = Math.max(1, Number(page) || 1);
  const groupStart = Math.floor((safePage - 1) / 10) * 10 + 1;
  const nums = Array.from({ length: 10 }, (_, i) => groupStart + i);
  return (
    <div style={S.dostPagerWrap}>
      <div style={S.dostPagerLogo} aria-label="DOST pagination logo">
        <span style={S.dostBlue}>D</span><span style={S.dostDark}>o</span><span style={S.dostBlue}>oooooooooo</span><span style={S.dostBlue}>st</span>
      </div>
      <div style={S.dostPagerControls}>
        <button style={S.link} onClick={() => onPage(Math.max(1, groupStart - 10))}>Previous</button>
        {nums.map((n) => <button key={n} style={S.link2(n === safePage)} onClick={() => onPage(n)}>{n}</button>)}
        <button style={S.link} onClick={() => onPage(groupStart + 10)}>Next</button>
      </div>
    </div>
  );
}

function SearchableShowing({ title, rows, filtered }) {
  return (
    <div style={S.hWrap}>
      <div style={S.h}>{title}</div>
      <span style={S.showing}>Showing {rows.length} of {filtered.length} / {filtered.length}</span>
    </div>
  );
}

function MovCell({ text }) {
  const urls = extractUrls(text);
  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div>{text || "—"}</div>
      {urls.length ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={S.tbtn} onClick={() => window.open(urls[0], "_blank")}>View link</button>
          {urls.length > 1 ? <span style={{ fontSize: 11, opacity: 0.75 }}>+{urls.length - 1} more</span> : null}
        </div>
      ) : null}
    </div>
  );
}

function ListCell({ items }) {
  const arr = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!arr.length) return <span>—</span>;
  return <div style={{ display: "grid", gap: 4 }}>{arr.map((v, i) => <div key={i} style={{ fontWeight: 800, textAlign: "left" }}>{String(v)}</div>)}</div>;
}

export default function DRRM() {
  const [act, setAct] = useState([]);
  const [iec, setIec] = useState([]);
  const [col, setCol] = useState([]);
  const [sectorOpts, setSectorOpts] = useState(DEFAULT_SECTOR_TYPES);
  const [iecTitleOpts, setIecTitleOpts] = useState(DEFAULT_IEC_TITLES);
  const [iecSourceOpts, setIecSourceOpts] = useState(DEFAULT_IEC_SOURCES);
  const [stakeOpts, setStakeOpts] = useState(DEFAULT_STAKEHOLDERS);
  const [pscp, setPscp] = useState({ crafted: { q1: "", q2: "", q3: "", q4: "" }, implemented: { q1: "", q2: "", q3: "", q4: "" } });

  const [outline, setOutline] = useState(null);
  const [muniGeo, setMuniGeo] = useState(null);
  const [geoErr, setGeoErr] = useState("");
  const [borderMode, setBorderMode] = useState("municipality");
  const [selMuni, setSelMuni] = useState("");
  const [selDist, setSelDist] = useState("");

  const [modal, setModal] = useState(null);
  const [venueOpen, setVenueOpen] = useState(false);
  const [addOpt, setAddOpt] = useState(null);
  const [msOpen, setMsOpen] = useState(null);
  const [msTarget, setMsTarget] = useState(null);

  const emptyAct = { title: "", sectors: [], dateMode: "single", dateStart: "", dateEnd: "", venueMeta: null, venueText: "", org: "", male: "", female: "", partners: [], mov: "", staffName: "", remarks: "" };
  const emptyIec = { titles: [], sources: [], date: "", male: "", female: "", mov: "", staffName: "", remarks: "" };
  const emptyCol = { title: "", stakeholders: [], date: "", mov: "", staffName: "", remarks: "" };

  const [fAct, setFAct] = useState(emptyAct);
  const [fIec, setFIec] = useState(emptyIec);
  const [fCol, setFCol] = useState(emptyCol);

  const [fa, setFa] = useState({ search: "", y: "", q: "", m: "", sort: "newest", page: 1 });
  const [fi, setFi] = useState({ search: "", y: "", q: "", m: "", sort: "newest", page: 1 });
  const [fc, setFc] = useState({ search: "", y: "", q: "", m: "", sort: "newest", page: 1 });

  const loadDrrmData = useCallback(async () => {
    try {
      const [activitiesRes, iecRes, collabRes, dropdownRes, pscpRes] = await Promise.all([
        axios.get(`${DRRM_API}/activities`),
        axios.get(`${DRRM_API}/iec-materials`),
        axios.get(`${DRRM_API}/collaborations`),
        axios.get(`${DRRM_API}/dropdowns`),
        axios.get(`${DRRM_API}/pscp/${PSCP_YEAR}`),
      ]);
      setAct(Array.isArray(activitiesRes.data) ? activitiesRes.data.map(normalizeEntry) : []);
      setIec(Array.isArray(iecRes.data) ? iecRes.data.map(normalizeEntry) : []);
      setCol(Array.isArray(collabRes.data) ? collabRes.data.map(normalizeEntry) : []);
      const dd = dropdownRes.data || {};
      if (Array.isArray(dd.sector) && dd.sector.length) setSectorOpts(dd.sector.sort((a, b) => a.localeCompare(b)));
      if (Array.isArray(dd.iec_title) && dd.iec_title.length) setIecTitleOpts(dd.iec_title.sort((a, b) => a.localeCompare(b)));
      if (Array.isArray(dd.iec_source) && dd.iec_source.length) setIecSourceOpts(dd.iec_source.sort((a, b) => a.localeCompare(b)));
      if (Array.isArray(dd.stakeholder) && dd.stakeholder.length) setStakeOpts(dd.stakeholder.sort((a, b) => a.localeCompare(b)));
      const p = pscpRes.data || null;
      if (p) {
        setPscp({
          crafted: { q1: p?.crafted?.q1 || "", q2: p?.crafted?.q2 || "", q3: p?.crafted?.q3 || "", q4: p?.crafted?.q4 || "" },
          implemented: { q1: p?.implemented?.q1 || "", q2: p?.implemented?.q2 || "", q3: p?.implemented?.q3 || "", q4: p?.implemented?.q4 || "" },
        });
      }
    } catch (err) {
      console.error("DRRM load error:", err);
      window.alert("Hindi ma-load ang DRRM data mula sa database. Check backend/server.js routes.");
    }
  }, []);

  useEffect(() => { loadDrrmData(); }, [loadDrrmData]);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const [a, b] = await Promise.all([fetch("/geo/pangasinan_outline.geojson"), fetch("/geo/pangasinan_municipalities.geojson")]);
        if (!a.ok) throw new Error("Missing /geo/pangasinan_outline.geojson");
        if (!b.ok) throw new Error("Missing /geo/pangasinan_municipalities.geojson");
        const [ao, bo] = await Promise.all([a.json(), b.json()]);
        if (!cancel) { setOutline(ao); setMuniGeo(bo); setGeoErr(""); }
      } catch (e) { if (!cancel) setGeoErr(String(e?.message || e)); }
    })();
    return () => { cancel = true; };
  }, []);

  const endpointForKind = (kind) => kind === "act" ? "activities" : kind === "iec" ? "iec-materials" : kind === "col" ? "collaborations" : "";
  const getFeatureName = (feature) => {
    const p = feature?.properties || {};
    return p.name || p.NAME || p.NAME_3 || p.NAME_2 || p.ADM3_EN || p.ADM3EN || p.ADM3 || p.MUNICIPALI || p.MUNICIPALITY || p.CITY || p.city || p.municipality || "";
  };

  const muniNames = useMemo(() => uniq((muniGeo?.features || []).map(getFeatureName).filter(Boolean)).sort((a, b) => a.localeCompare(b)), [muniGeo]);
  const distSet = useMemo(() => new Set(PANGASINAN_DISTRICTS.find((d) => d.id === selDist)?.municipalities || []), [selDist]);

  const filteredMuniGeo = useMemo(() => {
    if (!muniGeo) return null;
    const feats = muniGeo.features || [];
    if (borderMode === "municipality") {
      if (!selMuni) return muniGeo;
      return { type: "FeatureCollection", features: feats.filter((f) => String(getFeatureName(f)) === selMuni) };
    }
    if (!selDist) return muniGeo;
    return { type: "FeatureCollection", features: feats.filter((f) => distSet.has(String(getFeatureName(f)))) };
  }, [muniGeo, borderMode, selMuni, selDist, distSet]);

  const maskLatLngs = useMemo(() => {
    const world = [[-85, -180], [-85, 180], [85, 180], [85, -180]];
    const feat = outline?.features?.[0];
    if (!feat?.geometry) return null;
    const holes = [];
    if (feat.geometry.type === "Polygon") {
      const rings = feat.geometry.coordinates || [];
      if (rings.length > 0) holes.push(rings[0].map(([lng, lat]) => [lat, lng]));
    } else if (feat.geometry.type === "MultiPolygon") {
      (feat.geometry.coordinates || []).forEach((p) => { if (p?.[0]) holes.push(p[0].map(([lng, lat]) => [lat, lng])); });
    }
    return holes.length ? [world, ...holes] : null;
  }, [outline]);

  const pangBounds = useMemo(() => {
    if (!outline) return null;
    try { const b = L.geoJSON(outline).getBounds(); return b && b.isValid() ? b : null; } catch { return null; }
  }, [outline]);

  const pangasinanOutlineStyle = useCallback(() => ({ color: "#000000", weight: 1, opacity: 1, fillOpacity: 0.1, fillColor: "#93c5fd" }), []);
  const municipalityStyle = useCallback((feature) => {
    const name = String(getFeatureName(feature) || "");
    if (borderMode === "municipality") {
      const active = selMuni && name === selMuni;
      return { color: active ? "#16a34a" : "#475569", weight: active ? 4 : 1, opacity: 1, fillOpacity: active ? 0.12 : 0.02 };
    }
    const inDistrict = selDist ? distSet.has(name) : false;
    return { color: selDist ? (inDistrict ? "#f59e0b" : "transparent") : "#475569", weight: selDist ? (inDistrict ? 3 : 0) : 1, opacity: 1, fillOpacity: selDist ? (inDistrict ? 0.1 : 0) : 0.02 };
  }, [borderMode, selMuni, selDist, distSet]);

  const onEachMunicipality = useCallback((feature, layer) => {
    const name = String(getFeatureName(feature) || "");
    if (name) layer.bindTooltip(name, { sticky: true });
    layer.on("click", () => {
      if (borderMode === "municipality") setSelMuni(name);
      if (borderMode === "district") {
        const found = PANGASINAN_DISTRICTS.find((d) => d.municipalities.includes(name));
        if (found) setSelDist(found.id);
      }
    });
  }, [borderMode]);

  const venueText = useCallback((e) => String(e?.venueText || e?.venueMeta?.displayText || "").trim() || "—", []);
  const venueMuni = useCallback((e) => {
    const m = e?.venueMeta?.municipality;
    if (m) return String(m).trim();
    const t = venueText(e);
    const parts = t.split(",").map((s) => s.trim()).filter(Boolean);
    return parts.length >= 2 ? parts[parts.length - 2] : "";
  }, [venueText]);

  const pinsAll = useMemo(() => act.filter((e) => Number.isFinite(Number(e?.venueMeta?.lat)) && Number.isFinite(Number(e?.venueMeta?.lng))), [act]);
  const pinsVisible = useMemo(() => {
    if (borderMode === "municipality") return selMuni ? pinsAll.filter((e) => venueMuni(e) === selMuni) : pinsAll;
    return selDist ? pinsAll.filter((e) => distSet.has(venueMuni(e))) : pinsAll;
  }, [pinsAll, borderMode, selMuni, selDist, distSet, venueMuni]);

  const getActStartDate = (e) => e?.dateStart || e?.date || "";
  const actQuarter = (e) => qLabel(qFromDate(getActStartDate(e)));
  const actMonth = (e) => mName(getActStartDate(e));
  const actYear = (e) => yNum(getActStartDate(e));
  const formatActDate = (e) => {
    const start = e?.dateStart || e?.date || "";
    const end = e?.dateEnd || "";
    if (!start) return "—";
    if (!end || end === start) return fmtDateShort(start);
    const sD = new Date(`${start}T00:00:00`);
    const eD = new Date(`${end}T00:00:00`);
    if (Number.isNaN(sD.getTime()) || Number.isNaN(eD.getTime())) return `${start} - ${end}`;
    if (sD.getMonth() === eD.getMonth() && sD.getFullYear() === eD.getFullYear()) return `${sD.toLocaleString("en-US", { month: "short" })} ${sD.getDate()}–${eD.getDate()}, ${sD.getFullYear()}`;
    return `${fmtDateShort(start)} to ${fmtDateShort(end)}`;
  };

  const yearsFrom = (list, dateFn) => uniq(list.map((x) => yNum(dateFn(x))).filter(Boolean)).sort((a, b) => Number(b) - Number(a));
  const contains = (hay, needle) => String(hay || "").toLowerCase().includes(String(needle || "").toLowerCase().trim());

  const applyFiltersAct = (list, f) => {
    const q = f.search.trim().toLowerCase();
    const filtered = list.filter((x) => {
      if (f.y && actYear(x) !== f.y) return false;
      if (f.q && actQuarter(x) !== f.q) return false;
      if (f.m && actMonth(x) !== f.m) return false;
      if (q) {
        const blob = [x.title, (x.sectors || []).join(" "), formatActDate(x), venueText(x), x.org, (x.partners || []).join(" "), x.staffName, x.mov, x.remarks].join(" ").toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
    return [...filtered].sort((a, b) => {
      const da = new Date(`${getActStartDate(a) || "1970-01-01"}T00:00:00`).getTime();
      const db = new Date(`${getActStartDate(b) || "1970-01-01"}T00:00:00`).getTime();
      return f.sort === "oldest" ? da - db : db - da;
    });
  };

  const applyFiltersSimple = (list, dateKey, f, searchFields) => {
    const q = f.search.trim().toLowerCase();
    const filtered = list.filter((x) => {
      const d = x?.[dateKey];
      if (f.y && yNum(d) !== f.y) return false;
      if (f.q && qLabel(qFromDate(d)) !== f.q) return false;
      if (f.m && mName(d) !== f.m) return false;
      if (q) {
        const blob = searchFields(x).join(" ").toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
    return [...filtered].sort((a, b) => {
      const da = new Date(`${a?.[dateKey] || "1970-01-01"}T00:00:00`).getTime();
      const db = new Date(`${b?.[dateKey] || "1970-01-01"}T00:00:00`).getTime();
      return f.sort === "oldest" ? da - db : db - da;
    });
  };

  const paged = (arr, page) => arr.slice((page - 1) * PAGE_SIZE, (page - 1) * PAGE_SIZE + PAGE_SIZE);
  const actF = useMemo(() => applyFiltersAct(act, fa), [act, fa]);
  const iecF = useMemo(() => applyFiltersSimple(iec, "date", fi, (x) => [(x.titles || []).join(" "), (x.sources || []).join(" "), x.staffName, x.mov, x.remarks]), [iec, fi]);
  const colF = useMemo(() => applyFiltersSimple(col, "date", fc, (x) => [x.title, (x.stakeholders || []).join(" "), x.staffName, x.mov, x.remarks]), [col, fc]);

  useEffect(() => setFa((p) => ({ ...p, page: 1 })), [fa.search, fa.y, fa.q, fa.m, fa.sort]);
  useEffect(() => setFi((p) => ({ ...p, page: 1 })), [fi.search, fi.y, fi.q, fi.m, fi.sort]);
  useEffect(() => setFc((p) => ({ ...p, page: 1 })), [fc.search, fc.y, fc.q, fc.m, fc.sort]);

  const actRows = useMemo(() => paged(actF, fa.page), [actF, fa.page]);
  const iecRows = useMemo(() => paged(iecF, fi.page), [iecF, fi.page]);
  const colRows = useMemo(() => paged(colF, fc.page), [colF, fc.page]);

  const exportXlsx = (filename, rows) => {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, filename);
  };

  const safeFileName = (s) => String(s || "entry").replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim().slice(0, 80);

  const printTable = (title, cols, rows) => {
    const w = window.open("", "_blank");
    if (!w) return window.alert("Pop-up blocked. Allow pop-ups to print.");
    const esc = (s) => String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    const head = cols.map((c) => `<th>${esc(c)}</th>`).join("");
    const body = rows.map((r) => `<tr>${cols.map((c) => `<td>${esc(r[c])}</td>`).join("")}</tr>`).join("") || `<tr><td colspan="${cols.length}" style="text-align:center;">No rows</td></tr>`;
    w.document.open();
    w.document.write(`<html><head><title>${esc(title)}</title><style>body{font-family:Arial;padding:20px;}table{width:100%;border-collapse:collapse;table-layout:fixed;}th,td{border:2px solid #6b7280;padding:6px;font-size:11px;vertical-align:top;word-break:break-word;}th{background:#eef2f6;text-align:center;}button{display:none;}</style></head><body><h2>${esc(title)}</h2><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table><script>window.onload=()=>window.print();</script></body></html>`);
    w.document.close();
  };

  const actExportRows = (rows) => rows.map((e, i) => ({ "No.": i + 1, "Title of Activity": e.title, Sectors: (e.sectors || []).join(", "), "Date Conducted": formatActDate(e), "Venue/Address": venueText(e), "Name of Co-organizer": e.org, Male: e.male, Female: e.female, Total: e.total, Partners: (e.partners || []).join(", "), "Means of Verification": e.mov, Month: actMonth(e), "Name of Staff": e.staffName || "", Remarks: e.remarks || "" }));
  const iecExportRows = (rows) => rows.map((e, i) => ({ "No.": i + 1, "Title(s) of IEC Material": (e.titles || []).join(", "), "Source(s)": (e.sources || []).join(", "), Date: e.date ? fmtDateShort(e.date) : "—", Quarter: qLabel(qFromDate(e.date)), Month: mName(e.date), Male: e.male, Female: e.female, Total: e.total, "Means of Verification": e.mov, "Name of Staff": e.staffName || "", Remarks: e.remarks || "" }));
  const colExportRows = (rows) => rows.map((e, i) => ({ "No.": i + 1, "Title of Activity": e.title, "Stakeholder/s": (e.stakeholders || []).join(", "), Date: e.date ? fmtDateShort(e.date) : "—", Quarter: qLabel(qFromDate(e.date)), "Means of Verification": e.mov, "Name of Staff": e.staffName || "", Remarks: e.remarks || "" }));

  const printRows = (title, rows) => {
    const cols = rows.length ? Object.keys(rows[0]) : ["No."];
    printTable(title, cols, rows.map((r) => Object.fromEntries(cols.map((c) => [c, String(r[c] ?? "")]))));
  };

  const exportRowAct = (e) => exportXlsx(`DRRM_Activity_${safeFileName(e.title)}.xlsx`, actExportRows([e]));
  const exportRowIec = (e) => exportXlsx(`DRRM_IEC_${safeFileName((e.titles || [])[0] || "IEC")}.xlsx`, iecExportRows([e]));
  const exportRowCol = (e) => exportXlsx(`DRRM_Collab_${safeFileName(e.title)}.xlsx`, colExportRows([e]));

  const openAdd = (kind) => {
    if (kind === "act") setFAct(emptyAct);
    if (kind === "iec") setFIec(emptyIec);
    if (kind === "col") setFCol(emptyCol);
    setModal({ kind, mode: "add", id: null });
  };

  const openEdit = (kind, id) => {
    if (kind === "act") {
      const e = act.find((x) => x.id === id); if (!e) return;
      setFAct({ title: e.title || "", sectors: Array.isArray(e.sectors) ? e.sectors : [], dateMode: e.dateEnd ? "range" : "single", dateStart: e.dateStart || e.date || "", dateEnd: e.dateEnd || "", venueMeta: e.venueMeta || null, venueText: e.venueText || e.venueMeta?.displayText || "", org: e.org || "", male: e.male ?? "", female: e.female ?? "", partners: Array.isArray(e.partners) ? e.partners : Array.isArray(e.stakeholders) ? e.stakeholders : [], mov: e.mov || "", staffName: e.staffName || "", remarks: e.remarks || "" });
    }
    if (kind === "iec") {
      const e = iec.find((x) => x.id === id); if (!e) return;
      setFIec({ titles: Array.isArray(e.titles) ? e.titles : [], sources: Array.isArray(e.sources) ? e.sources : [], date: e.date || "", male: e.male ?? "", female: e.female ?? "", mov: e.mov || "", staffName: e.staffName || "", remarks: e.remarks || "" });
    }
    if (kind === "col") {
      const e = col.find((x) => x.id === id); if (!e) return;
      setFCol({ title: e.title || "", stakeholders: Array.isArray(e.stakeholders) ? e.stakeholders : [], date: e.date || "", mov: e.mov || "", staffName: e.staffName || "", remarks: e.remarks || "" });
    }
    setModal({ kind, mode: "edit", id });
  };

  const openView = (kind, id) => setModal({ kind, mode: "view", id });

  const del = async (kind, id) => {
    if (!window.confirm("Delete this entry?")) return;
    try {
      const endpoint = endpointForKind(kind);
      await axios.delete(`${DRRM_API}/${endpoint}/${id}`);
      await loadDrrmData();
    } catch (err) {
      console.error("DRRM delete error:", err);
      window.alert("Hindi na-delete sa database. Check backend logs.");
    }
  };

  const openMulti = (fieldKey) => {
    if (fieldKey === "actSectors") { setMsTarget(fieldKey); setMsOpen({ title: "Type of sector-specific learning and development intervention*", options: sectorOpts, selected: fAct.sectors }); return; }
    if (fieldKey === "actPartners") { setMsTarget(fieldKey); setMsOpen({ title: "Partners", options: stakeOpts, selected: fAct.partners }); return; }
    if (fieldKey === "iecTitles") { setMsTarget(fieldKey); setMsOpen({ title: "Title of IEC Material*", options: iecTitleOpts, selected: fIec.titles }); return; }
    if (fieldKey === "iecSources") { setMsTarget(fieldKey); setMsOpen({ title: "Source*", options: iecSourceOpts, selected: fIec.sources }); return; }
    if (fieldKey === "stakeholders") { setMsTarget(fieldKey); setMsOpen({ title: "Name of Stakeholder/s*", options: stakeOpts, selected: fCol.stakeholders }); }
  };

  const confirmMulti = (newSelected) => {
    if (msTarget === "actSectors") setFAct((p) => ({ ...p, sectors: uniq(newSelected) }));
    if (msTarget === "actPartners") setFAct((p) => ({ ...p, partners: uniq(newSelected) }));
    if (msTarget === "iecTitles") setFIec((p) => ({ ...p, titles: uniq(newSelected) }));
    if (msTarget === "iecSources") setFIec((p) => ({ ...p, sources: uniq(newSelected) }));
    if (msTarget === "stakeholders") setFCol((p) => ({ ...p, stakeholders: uniq(newSelected) }));
  };

  const openAddOptionForCurrentMulti = () => {
    if (msTarget === "actSectors") return setAddOpt({ listKey: "actSectors", title: "Add Sector Type", placeholder: 'e.g., "CSO"' });
    if (msTarget === "actPartners") return setAddOpt({ listKey: "stakeholders", title: "Add Partner", placeholder: 'e.g., "PDRRMO Pangasinan"' });
    if (msTarget === "iecTitles") return setAddOpt({ listKey: "iecTitles", title: "Add IEC Title", placeholder: 'e.g., "Flood Preparedness Poster"' });
    if (msTarget === "iecSources") return setAddOpt({ listKey: "iecSources", title: "Add IEC Source", placeholder: 'e.g., "DA"' });
    if (msTarget === "stakeholders") return setAddOpt({ listKey: "stakeholders", title: "Add Stakeholder", placeholder: 'e.g., "PDRRMO Pangasinan"' });
  };

  const onAddOpt = async (val) => {
    if (!addOpt) return;
    const categoryMap = { actSectors: "sector", iecTitles: "iec_title", iecSources: "iec_source", stakeholders: "stakeholder" };
    const category = categoryMap[addOpt.listKey];
    try {
      await axios.post(`${DRRM_API}/dropdowns`, { category, optionName: val.trim() });
      if (addOpt.listKey === "actSectors") setSectorOpts(uniq([...sectorOpts, val]).sort((a, b) => a.localeCompare(b)));
      if (addOpt.listKey === "iecTitles") setIecTitleOpts(uniq([...iecTitleOpts, val]).sort((a, b) => a.localeCompare(b)));
      if (addOpt.listKey === "iecSources") setIecSourceOpts(uniq([...iecSourceOpts, val]).sort((a, b) => a.localeCompare(b)));
      if (addOpt.listKey === "stakeholders") setStakeOpts(uniq([...stakeOpts, val]).sort((a, b) => a.localeCompare(b)));
      setAddOpt(null);
    } catch (err) {
      console.error("DRRM add dropdown error:", err);
      window.alert("Hindi na-save ang dropdown sa database. Check backend logs.");
    }
  };

  const saveEntry = async () => {
    if (!modal) return;
    try {
      if (modal.kind === "act") {
        if (!fAct.title.trim()) return window.alert("Required: Title of Activity");
        if (!Array.isArray(fAct.sectors) || fAct.sectors.length === 0) return window.alert("Required: Type of sector-specific learning and development intervention");
        if (!fAct.dateStart) return window.alert("Required: Date Conducted (start)");
        if (fAct.dateMode === "range" && !fAct.dateEnd) return window.alert("Required: End date");
        if (!fAct.venueText.trim()) return window.alert("Required: Venue/Address");
        const payload = { title: fAct.title.trim(), sectors: uniq(fAct.sectors), dateStart: fAct.dateStart, dateEnd: fAct.dateMode === "range" ? fAct.dateEnd : "", venueText: fAct.venueText.trim(), venueMeta: fAct.venueMeta || null, org: fAct.org.trim(), male: toNum(fAct.male), female: toNum(fAct.female), total: toNum(fAct.male) + toNum(fAct.female), partners: uniq(fAct.partners || []), mov: fAct.mov.trim(), staffName: fAct.staffName.trim(), remarks: fAct.remarks.trim() };
        if (modal.mode === "edit") await axios.put(`${DRRM_API}/activities/${modal.id}`, payload);
        else await axios.post(`${DRRM_API}/activities`, payload);
        await loadDrrmData(); setModal(null); return;
      }
      if (modal.kind === "iec") {
        if (!Array.isArray(fIec.titles) || fIec.titles.length === 0) return window.alert("Required: Title of IEC Material");
        if (!Array.isArray(fIec.sources) || fIec.sources.length === 0) return window.alert("Required: Source");
        if (!fIec.date) return window.alert("Required: Date");
        const payload = { titles: uniq(fIec.titles), sources: uniq(fIec.sources), date: fIec.date, male: toNum(fIec.male), female: toNum(fIec.female), total: toNum(fIec.male) + toNum(fIec.female), mov: fIec.mov.trim(), staffName: fIec.staffName.trim(), remarks: fIec.remarks.trim() };
        if (modal.mode === "edit") await axios.put(`${DRRM_API}/iec-materials/${modal.id}`, payload);
        else await axios.post(`${DRRM_API}/iec-materials`, payload);
        await loadDrrmData(); setModal(null); return;
      }
      if (modal.kind === "col") {
        if (!fCol.title.trim()) return window.alert("Required: Title of Activity");
        if (!Array.isArray(fCol.stakeholders) || fCol.stakeholders.length === 0) return window.alert("Required: Name of Stakeholder/s");
        if (!fCol.date) return window.alert("Required: Date");
        const payload = { title: fCol.title.trim(), stakeholders: uniq(fCol.stakeholders), date: fCol.date, mov: fCol.mov.trim(), staffName: fCol.staffName.trim(), remarks: fCol.remarks.trim() };
        if (modal.mode === "edit") await axios.put(`${DRRM_API}/collaborations/${modal.id}`, payload);
        else await axios.post(`${DRRM_API}/collaborations`, payload);
        await loadDrrmData(); setModal(null);
      }
    } catch (err) {
      console.error("DRRM save error:", err);
      window.alert("Hindi na-save sa database. Check backend/server.js routes and MySQL tables.");
    }
  };

  const viewEntry = useMemo(() => {
    if (!modal || modal.mode !== "view") return null;
    if (modal.kind === "act") return act.find((x) => x.id === modal.id) || null;
    if (modal.kind === "iec") return iec.find((x) => x.id === modal.id) || null;
    if (modal.kind === "col") return col.find((x) => x.id === modal.id) || null;
    return null;
  }, [modal, act, iec, col]);

  const setPscpQ = async (which, qKey, v) => {
    const next = { ...pscp, [which]: { ...pscp[which], [qKey]: v } };
    setPscp(next);
    try { await axios.put(`${DRRM_API}/pscp/${PSCP_YEAR}`, next); } catch (err) { console.error("DRRM PSCP save error:", err); }
  };

  const lguEngagement = useMemo(() => {
    const set = new Set();
    actF.forEach((e) => { const m = venueMuni(e); if (m) set.add(m); });
    const total = PANGASINAN_LGUS.length || 48;
    const count = set.size;
    const pct = total ? Math.round((count / total) * 1000) / 10 : 0;
    return { count, total, pct };
  }, [actF, venueMuni]);

  function ViewEntryBody({ kind, entry }) {
    const urls = extractUrls(entry?.mov);
    const isActivity = kind === "act";
    const isIec = kind === "iec";
    const canMap = isActivity && Number.isFinite(Number(entry?.venueMeta?.lat)) && Number.isFinite(Number(entry?.venueMeta?.lng));

    const viewStyles = {
      sectionTitle: { fontWeight: 900, fontSize: 22, marginBottom: 12, color: "#0f172a", fontFamily },
      subSectionTitle: { fontWeight: 900, fontSize: 20, marginBottom: 10, color: "#0f172a", fontFamily },
      grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18, marginBottom: 14 },
      value: { minHeight: 36, border: "1px solid #cbd5e1", borderRadius: 10, padding: "9px 11px", background: "#f8fafc", fontSize: 13, fontWeight: 800, color: "#0f172a", whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily },
      boxValue: { minHeight: 56, border: "1px solid #cbd5e1", borderRadius: 10, padding: "10px 12px", background: "#f8fafc", fontSize: 13, fontWeight: 800, color: "#0f172a", whiteSpace: "pre-wrap", wordBreak: "break-word", fontFamily },
      label: { ...S.l, marginBottom: 6 },
      section: { marginBottom: 18 },
      actions: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 },
    };

    const ValueField = ({ label, children }) => (
      <div>
        <div style={viewStyles.label}>{label}</div>
        <div style={viewStyles.value}>{children || "—"}</div>
      </div>
    );

    const BoxField = ({ label, children }) => (
      <div style={viewStyles.section}>
        <div style={viewStyles.label}>{label}</div>
        <div style={viewStyles.boxValue}>{children || "—"}</div>
      </div>
    );

    const renderMovBox = () => (
      <BoxField label="Means of Verification">
        <div>{entry?.mov || "—"}</div>
        {urls.length ? (
          <div style={viewStyles.actions}>
            {urls.map((url, idx) => (
              <button key={url} type="button" style={S.tbtn} onClick={() => window.open(url, "_blank")}>
                View Link{urls.length > 1 ? ` ${idx + 1}` : ""}
              </button>
            ))}
          </div>
        ) : null}
      </BoxField>
    );

    if (isActivity) {
      return (
        <div style={{ fontFamily }}>
          <div style={viewStyles.sectionTitle}>Activity Information</div>

          <div style={viewStyles.grid}>
            <ValueField label="Title of Activity">{entry?.title || "—"}</ValueField>
            <ValueField label="Date Conducted">{formatActDate(entry)}</ValueField>
            <ValueField label="Month">{actMonth(entry) || "—"}</ValueField>
            <ValueField label="Name of Co-organizer">{entry?.org || "—"}</ValueField>
            <ValueField label="Participants — Male">{String(toNum(entry?.male))}</ValueField>
            <ValueField label="Participants — Female">{String(toNum(entry?.female))}</ValueField>
            <ValueField label="Participants — Total">{String(toNum(entry?.total))}</ValueField>
            <ValueField label="Name of Staff">{entry?.staffName || "—"}</ValueField>
          </div>

          <BoxField label="Type of sector-specific learning and development intervention">
            <ListCell items={entry?.sectors || []} />
          </BoxField>

          <BoxField label="Venue/Address">
            <div>{venueText(entry)}</div>
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
              <b>Coordinates:</b> {canMap ? `${entry.venueMeta.lat}, ${entry.venueMeta.lng}` : "—"}
            </div>
            {canMap ? (
              <div style={viewStyles.actions}>
                <button type="button" style={S.tbtn} onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${entry.venueMeta.lat},${entry.venueMeta.lng}`, "_blank")}>
                  Map
                </button>
                <button type="button" style={S.tbtn} onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${entry.venueMeta.lat},${entry.venueMeta.lng}`, "_blank")}>
                  Directions
                </button>
              </div>
            ) : null}
          </BoxField>

          <BoxField label="Partners">
            <ListCell items={entry?.partners || []} />
          </BoxField>

          {renderMovBox()}

          <BoxField label="Remarks">{entry?.remarks || "—"}</BoxField>
        </div>
      );
    }

    if (isIec) {
      return (
        <div style={{ fontFamily }}>
          <div style={viewStyles.sectionTitle}>IEC Material Information</div>

          <div style={viewStyles.grid}>
            <ValueField label="Date">{entry?.date ? fmtDateShort(entry.date) : "—"}</ValueField>
            <ValueField label="Quarter">{entry?.date ? qLabel(qFromDate(entry.date)) : "—"}</ValueField>
            <ValueField label="Month">{entry?.date ? mName(entry.date) : "—"}</ValueField>
            <ValueField label="Beneficiary — Male">{String(toNum(entry?.male))}</ValueField>
            <ValueField label="Beneficiary — Female">{String(toNum(entry?.female))}</ValueField>
            <ValueField label="Beneficiary — Total">{String(toNum(entry?.total))}</ValueField>
            <ValueField label="Name of Staff">{entry?.staffName || "—"}</ValueField>
          </div>

          <BoxField label="Title of IEC Material">
            <ListCell items={entry?.titles || []} />
          </BoxField>

          <BoxField label="Source">
            <ListCell items={entry?.sources || []} />
          </BoxField>

          {renderMovBox()}

          <BoxField label="Remarks">{entry?.remarks || "—"}</BoxField>
        </div>
      );
    }

    return (
      <div style={{ fontFamily }}>
        <div style={viewStyles.sectionTitle}>Entry Information</div>
        <div style={viewStyles.grid}>
          <ValueField label="Title of Activity">{entry?.title || "—"}</ValueField>
          <ValueField label="Date">{entry?.date ? fmtDateShort(entry.date) : "—"}</ValueField>
          <ValueField label="Quarter">{entry?.date ? qLabel(qFromDate(entry.date)) : "—"}</ValueField>
          <ValueField label="Name of Staff">{entry?.staffName || "—"}</ValueField>
        </div>
        <BoxField label="Name of Stakeholder/s">
          <ListCell items={entry?.stakeholders || []} />
        </BoxField>
        {renderMovBox()}
        <BoxField label="Remarks">{entry?.remarks || "—"}</BoxField>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.title}>
        <div>DRRM</div>
        <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.95, fontFamily }}>Search, pagination, export, print, and Venue/Address updated</div>
      </div>

      <div style={S.mapCard}>
        <div style={S.mapHead}>
          <div style={{ fontWeight: 900, fontSize: 13, fontFamily }}>PANGASINAN MAP — DRRM Activities Pins</div>
          <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 800, fontFamily }}>Pins shown: <b>{pinsVisible.length}</b> / {pinsAll.length}</div>
          <div style={S.filterRow}>
            <span style={S.labelSmall}>Borders:</span>
            <select style={S.sel} value={borderMode} onChange={(e) => { setBorderMode(e.target.value); setSelMuni(""); setSelDist(""); }}>
              <option value="municipality">Municipality Borders</option>
              <option value="district">District View (highlight)</option>
            </select>
            {borderMode === "municipality" ? <><span style={S.labelSmall}>Municipality:</span><select style={S.sel} value={selMuni} onChange={(e) => setSelMuni(e.target.value)}><option value="">All Municipalities</option>{muniNames.map((m) => <option key={m} value={m}>{m}</option>)}</select></> : <><span style={S.labelSmall}>District:</span><select style={S.sel} value={selDist} onChange={(e) => setSelDist(e.target.value)}><option value="">Select District (optional)</option>{PANGASINAN_DISTRICTS.map((d) => <option key={d.id} value={d.id}>{d.id}</option>)}</select></>}
            <button style={S.btn} onClick={() => { setSelMuni(""); setSelDist(""); }}>Clear</button>
          </div>
          {geoErr ? <div style={S.warn}>⚠ {geoErr}</div> : null}
        </div>
        <div style={S.map}>
          <MapContainer center={[15.9167, 120.3333]} zoom={10} minZoom={9} maxZoom={13} style={{ height: "100%", width: "100%" }} attributionControl={false} zoomControl>
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Default (OSM)"><TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" opacity={0.9} /></LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Satellite (Esri)"><TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" opacity={0.9} attribution="Tiles © Esri" /></LayersControl.BaseLayer>
            </LayersControl>
            <Pane name="maskPane" style={{ zIndex: 300 }} />
            <Pane name="borderPane" style={{ zIndex: 500 }} />
            <Pane name="pinPane" style={{ zIndex: 700 }} />
            {maskLatLngs ? <Polygon positions={maskLatLngs} pathOptions={{ color: "transparent", weight: 0, fillColor: "#ffffff", fillOpacity: 1 }} pane="maskPane" /> : null}
            {outline ? <GeoJSON data={outline} style={pangasinanOutlineStyle} pane="borderPane" /> : null}
            {filteredMuniGeo ? <GeoJSON key={`${borderMode}-${selMuni}-${selDist}`} data={filteredMuniGeo} style={municipalityStyle} onEachFeature={onEachMunicipality} pane="borderPane" /> : null}
            {pangBounds ? <FitAndLockToPangasinan bounds={pangBounds} borderMode={borderMode} selectedMuni={selMuni} selectedDist={selDist} filteredGeo={filteredMuniGeo} /> : null}
            {pinsVisible.map((e) => <Marker key={e.id} position={[Number(e.venueMeta.lat), Number(e.venueMeta.lng)]} pane="pinPane"><Popup><div style={{ minWidth: 260, fontFamily }}><div style={{ fontWeight: 900, marginBottom: 6 }}>{e.title}</div><div style={{ fontSize: 12 }}><b>Date:</b> {formatActDate(e)}<br /><b>Sectors:</b> {(e.sectors || []).join(", ") || "—"}<br /><b>Participants:</b> {toNum(e.total)}<br /><b>Venue/Address:</b> {venueText(e)}</div><div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}><button style={S.tbtn} onClick={() => openView("act", e.id)}>View</button><button style={S.tbtn} onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${e.venueMeta.lat},${e.venueMeta.lng}`, "_blank")}>Map</button><button style={S.tbtn} onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${e.venueMeta.lat},${e.venueMeta.lng}`, "_blank")}>Directions</button></div></div></Popup></Marker>)}
          </MapContainer>
        </div>
      </div>

      <div style={S.sectionTitleRow}><div style={S.sectionTitle}>DRRM TABLE</div></div>

      {/* ACTIVITIES */}
      <div style={S.card}>
        <div style={S.head}>
          <SearchableShowing title="Activities" rows={actRows} filtered={actF} />
          <div style={S.tools}>
            <input style={S.search} value={fa.search} onChange={(e) => setFa((p) => ({ ...p, search: e.target.value }))} placeholder="Search..." />
            <select style={S.selPill} value={fa.y} onChange={(e) => setFa((p) => ({ ...p, y: e.target.value }))}><option value="">All Years</option>{yearsFrom(act, getActStartDate).map((y) => <option key={y} value={y}>{y}</option>)}</select>
            <select style={S.selPill} value={fa.q} onChange={(e) => setFa((p) => ({ ...p, q: e.target.value }))}><option value="">All Quarters</option>{QUARTERS.map((q) => <option key={q} value={q}>{q}</option>)}</select>
            <select style={S.selPill} value={fa.m} onChange={(e) => setFa((p) => ({ ...p, m: e.target.value }))}><option value="">All Months</option>{MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}</select>
            <select style={S.selPill} value={fa.sort} onChange={(e) => setFa((p) => ({ ...p, sort: e.target.value }))}><option value="newest">Sort: Newest</option><option value="oldest">Sort: Oldest</option></select>
            <button style={S.tbtn} onClick={() => setFa({ search: "", y: "", q: "", m: "", sort: "newest", page: 1 })}>Clear Filters</button>
            <button style={S.tbtn} onClick={() => exportXlsx("DRRM_Activities.xlsx", actExportRows(actF))}>Export</button>
            <button style={S.btnP} onClick={() => printRows("DRRM — Activities", actExportRows(actF))}>Print</button>
            <button style={S.btn} onClick={() => openAdd("act")}>+ Add Entry</button>
          </div>
        </div>
        <div style={S.tableWrap}>
          <table style={{ ...S.table, minWidth: 1900 }}>
            <thead><tr><th style={S.th} rowSpan={2}>NO.</th><th style={S.th} rowSpan={2}>TITLE OF ACTIVITY ON DRR and CC Learning and Development</th><th style={S.th} rowSpan={2}>TYPE OF SECTOR-SPECIFIC LEARNING AND DEVELOPMENT INTERVENTION*</th><th style={S.th} rowSpan={2}>DATE CONDUCTED</th><th style={S.th} rowSpan={2}>VENUE/ADDRESS</th><th style={S.th} rowSpan={2}>NAME OF CO-ORGANIZER</th><th style={S.th} colSpan={3}>NO. OF PARTICIPANT**</th><th style={S.th} rowSpan={2}>PARTNERS</th><th style={S.th} rowSpan={2}>MEANS OF VERIFICATION</th><th style={S.th} rowSpan={2}>MONTH</th><th style={S.th} rowSpan={2}>REMARKS</th><th style={S.th} rowSpan={2}>ACTIONS</th></tr><tr><th style={S.th}>MALE</th><th style={S.th}>FEMALE</th><th style={S.th}>TOTAL</th></tr></thead>
            <tbody>{actRows.length === 0 ? <tr><td style={S.tdC} colSpan={14}>No entries yet. Click “+ Add Entry”.</td></tr> : actRows.map((e, idx) => { const no = (fa.page - 1) * PAGE_SIZE + idx + 1; const hasCoords = Number.isFinite(Number(e?.venueMeta?.lat)) && Number.isFinite(Number(e?.venueMeta?.lng)); return <tr key={e.id}><td style={S.tdC}>{no}</td><td style={S.td}>{e.title}</td><td style={S.td}><ListCell items={e.sectors || []} /></td><td style={S.tdC}>{formatActDate(e)}</td><td style={S.td}><div style={{ display: "grid", gap: 6 }}><div>{venueText(e)}</div><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button style={S.tbtn} onClick={() => openView("act", e.id)}>View</button>{hasCoords ? <><button style={S.tbtn} onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${e.venueMeta.lat},${e.venueMeta.lng}`, "_blank")}>Map</button><button style={S.tbtn} onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${e.venueMeta.lat},${e.venueMeta.lng}`, "_blank")}>Directions</button></> : null}</div></div></td><td style={S.td}>{e.org || "—"}</td><td style={S.tdC}>{toNum(e.male)}</td><td style={S.tdC}>{toNum(e.female)}</td><td style={S.tdC}>{toNum(e.total)}</td><td style={S.td}><ListCell items={e.partners || []} /></td><td style={S.td}><MovCell text={e.mov} /></td><td style={S.tdC}>{actMonth(e) || "—"}</td><td style={S.td}>{e.remarks || "—"}</td><td style={S.tdC}><div style={{ display: "grid", gap: 6, justifyItems: "center" }}><div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}><button style={S.tbtn} onClick={() => openView("act", e.id)}>View</button><button style={S.tbtn} onClick={() => openEdit("act", e.id)}>Edit</button><button style={S.tbtn} onClick={() => printRows("DRRM — Activity (1 entry)", actExportRows([e]))}>Print</button></div><div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}><button style={S.tbtn} onClick={() => exportRowAct(e)}>Export</button><button style={S.danger} onClick={() => del("act", e.id)}>Delete</button></div></div></td></tr>; })}</tbody>
          </table>
        </div>
        <Pagination total={actF.length} page={fa.page} onPage={(p) => setFa((x) => ({ ...x, page: p }))} />
      </div>

      {/* IEC MATERIALS */}
      <div style={S.card}>
        <div style={S.head}>
          <SearchableShowing title="IEC Materials" rows={iecRows} filtered={iecF} />
          <div style={S.tools}>
            <input style={S.search} value={fi.search} onChange={(e) => setFi((p) => ({ ...p, search: e.target.value }))} placeholder="Search..." />
            <select style={S.selPill} value={fi.y} onChange={(e) => setFi((p) => ({ ...p, y: e.target.value }))}><option value="">All Years</option>{yearsFrom(iec, (x) => x.date).map((y) => <option key={y} value={y}>{y}</option>)}</select>
            <select style={S.selPill} value={fi.q} onChange={(e) => setFi((p) => ({ ...p, q: e.target.value }))}><option value="">All Quarters</option>{QUARTERS.map((q) => <option key={q} value={q}>{q}</option>)}</select>
            <select style={S.selPill} value={fi.m} onChange={(e) => setFi((p) => ({ ...p, m: e.target.value }))}><option value="">All Months</option>{MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}</select>
            <select style={S.selPill} value={fi.sort} onChange={(e) => setFi((p) => ({ ...p, sort: e.target.value }))}><option value="newest">Sort: Newest</option><option value="oldest">Sort: Oldest</option></select>
            <button style={S.tbtn} onClick={() => setFi({ search: "", y: "", q: "", m: "", sort: "newest", page: 1 })}>Clear Filters</button>
            <button style={S.tbtn} onClick={() => exportXlsx("DRRM_IEC_Materials.xlsx", iecExportRows(iecF))}>Export</button>
            <button style={S.btnP} onClick={() => printRows("DRRM — IEC Materials", iecExportRows(iecF))}>Print</button>
            <button style={S.btn} onClick={() => openAdd("iec")}>+ Add Entry</button>
          </div>
        </div>
        <div style={S.tableWrap}>
          <table style={{ ...S.table, minWidth: 1420 }}>
            <thead><tr><th style={S.th} rowSpan={2}>NO.</th><th style={S.th} rowSpan={2}>TITLE OF IEC MATERIAL</th><th style={S.th} rowSpan={2}>SOURCE</th><th style={S.th} colSpan={3}>NO. OF BENEFICIARY*</th><th style={S.th} rowSpan={2}>MEANS OF VERIFICATION</th><th style={S.th} rowSpan={2}>MONTH</th><th style={S.th} rowSpan={2}>REMARKS</th><th style={S.th} rowSpan={2}>ACTIONS</th></tr><tr><th style={S.th}>MALE</th><th style={S.th}>FEMALE</th><th style={S.th}>TOTAL</th></tr></thead>
            <tbody>{iecRows.length === 0 ? <tr><td style={S.tdC} colSpan={10}>No entries yet. Click “+ Add Entry”.</td></tr> : iecRows.map((e, idx) => { const no = (fi.page - 1) * PAGE_SIZE + idx + 1; return <tr key={e.id}><td style={S.tdC}>{no}</td><td style={S.td}><ListCell items={e.titles || []} /></td><td style={S.td}><ListCell items={e.sources || []} /></td><td style={S.tdC}>{toNum(e.male)}</td><td style={S.tdC}>{toNum(e.female)}</td><td style={S.tdC}>{toNum(e.total)}</td><td style={S.td}><MovCell text={e.mov} /></td><td style={S.tdC}>{mName(e.date) || "—"}</td><td style={S.td}>{e.remarks || "—"}</td><td style={S.tdC}><div style={{ display: "grid", gap: 6, justifyItems: "center" }}><div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}><button style={S.tbtn} onClick={() => openView("iec", e.id)}>View</button><button style={S.tbtn} onClick={() => openEdit("iec", e.id)}>Edit</button><button style={S.tbtn} onClick={() => printRows("DRRM — IEC (1 entry)", iecExportRows([e]))}>Print</button></div><div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}><button style={S.tbtn} onClick={() => exportRowIec(e)}>Export</button><button style={S.danger} onClick={() => del("iec", e.id)}>Delete</button></div></div></td></tr>; })}</tbody>
          </table>
        </div>
        <Pagination total={iecF.length} page={fi.page} onPage={(p) => setFi((x) => ({ ...x, page: p }))} />
      </div>

      {/* Collaboration card removed. Partners are now shown in the Activities table. */}

      <div style={S.card}>
        <div style={S.head}><div style={S.h}>Other DRRM Indicators</div></div>
        <div style={{ padding: 12, display: "grid", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}><div style={{ fontWeight: 900 }}>Percentage of LGUs engaged in DRR and CC Learning and Development</div><div style={{ fontWeight: 900, fontSize: 22 }}>{lguEngagement.pct}%</div></div>
          <div style={{ fontSize: 12, opacity: 0.75 }}>Covered LGUs: <b>{lguEngagement.count}</b> / {lguEngagement.total} (based on current Activities filters)</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ ...S.table, minWidth: 760 }}><thead><tr><th style={{ ...S.th, textAlign: "left" }}>Public Service Continuity Plan</th><th style={S.th}>Q1</th><th style={S.th}>Q2</th><th style={S.th}>Q3</th><th style={S.th}>Q4</th></tr></thead><tbody>{["crafted", "implemented"].map((which) => <tr key={which}><td style={S.td}><b>{which === "crafted" ? "Crafted/Updated" : "Implemented/Deployed"}</b></td>{["q1", "q2", "q3", "q4"].map((qk) => <td key={`${which}${qk}`} style={S.tdC}><select style={{ ...S.selPill, minWidth: 120 }} value={pscp[which]?.[qk] || ""} onChange={(e) => setPscpQ(which, qk, e.target.value)}><option value="">—</option><option value="YES">YES</option><option value="NO">NO</option></select></td>)}</tr>)}</tbody></table>
          </div>
        </div>
      </div>

      <Modal open={!!modal && (modal.mode === "add" || modal.mode === "edit")} title={<div>{modal?.mode === "edit" ? "Edit Entry" : "Add Entry"}</div>} onClose={() => setModal(null)} footer={<><button style={S.btn} onClick={() => setModal(null)}>Cancel</button><button style={S.btnP} onClick={saveEntry}>{modal?.mode === "edit" ? "Update" : "Save"}</button></>}>
        {modal?.kind === "act" ? <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ gridColumn: "1/-1" }}><div style={S.l}>Title of Activity *</div><textarea style={S.ta} value={fAct.title} onChange={(e) => setFAct((p) => ({ ...p, title: e.target.value }))} /></div>
          <div style={{ gridColumn: "1/-1" }}><div style={S.l}>Type of sector-specific learning and development intervention *</div><button type="button" style={{ ...S.in, background: "#f8fafc", cursor: "pointer", textAlign: "left" }} onClick={() => openMulti("actSectors")}>{fAct.sectors?.length ? fAct.sectors.join(", ") : "Click to select (multi-select)"}</button></div>
          <div style={{ gridColumn: "1/-1", display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}><div style={{ fontSize: 12, fontWeight: 900 }}>Date Type:</div><button style={S.pill(fAct.dateMode === "single")} type="button" onClick={() => setFAct((p) => ({ ...p, dateMode: "single", dateEnd: "" }))}>Single</button><button style={S.pill(fAct.dateMode === "range")} type="button" onClick={() => setFAct((p) => ({ ...p, dateMode: "range" }))}>Range</button></div>
          <div><div style={S.l}>Date Conducted (Start) *</div><input style={S.in} type="date" value={fAct.dateStart} onChange={(e) => setFAct((p) => ({ ...p, dateStart: e.target.value }))} /><div style={{ fontSize: 12, opacity: 0.75 }}>Quarter: <b>{qLabel(qFromDate(fAct.dateStart))}</b> • Month: <b>{mName(fAct.dateStart) || "—"}</b></div></div>
          <div><div style={S.l}>Date Conducted (End)</div><input style={S.in} type="date" value={fAct.dateEnd} onChange={(e) => setFAct((p) => ({ ...p, dateEnd: e.target.value }))} disabled={fAct.dateMode !== "range"} /><div style={{ fontSize: 12, opacity: 0.75 }}>{fAct.dateMode === "range" ? "Required if using range." : "Disabled (single date mode)"}</div></div>
          <div style={{ gridColumn: "1/-1" }}><div style={S.l}>Venue/Address *</div><button type="button" style={{ ...S.in, background: "#f8fafc", cursor: "pointer", textAlign: "left" }} onClick={() => setVenueOpen(true)}>{fAct.venueText || "Click to select Venue/Address"}</button>{Number.isFinite(Number(fAct?.venueMeta?.lat)) && Number.isFinite(Number(fAct?.venueMeta?.lng)) ? <div style={{ fontSize: 12, opacity: 0.85 }}><b>Coords:</b> {fAct.venueMeta.lat}, {fAct.venueMeta.lng}</div> : null}</div>
          <div style={{ gridColumn: "1/-1" }}><div style={S.l}>Name of Co-organizer</div><textarea style={S.ta} value={fAct.org} onChange={(e) => setFAct((p) => ({ ...p, org: e.target.value }))} /></div>
          <div><div style={S.l}>Participants (Male)</div><input style={S.in} type="number" value={fAct.male} onChange={(e) => setFAct((p) => ({ ...p, male: e.target.value }))} /></div>
          <div><div style={S.l}>Participants (Female)</div><input style={S.in} type="number" value={fAct.female} onChange={(e) => setFAct((p) => ({ ...p, female: e.target.value }))} /><div style={{ fontSize: 12, opacity: 0.75 }}>Total (auto): <b>{toNum(fAct.male) + toNum(fAct.female)}</b></div></div>
          <div style={{ gridColumn: "1/-1" }}><div style={S.l}>Partners</div><button type="button" style={{ ...S.in, background: "#f8fafc", cursor: "pointer", textAlign: "left" }} onClick={() => openMulti("actPartners")}>{fAct.partners?.length ? fAct.partners.join(", ") : "Click to select partners"}</button></div>
          <div style={{ gridColumn: "1/-1" }}><div style={S.l}>Means of Verification</div><textarea style={S.ta} value={fAct.mov} onChange={(e) => setFAct((p) => ({ ...p, mov: e.target.value }))} placeholder="Paste links here (auto-detected)..." /></div>
          <div style={{ gridColumn: "1/-1" }}><div style={S.l}>Name of Staff</div><input style={S.in} value={fAct.staffName} onChange={(e) => setFAct((p) => ({ ...p, staffName: e.target.value }))} placeholder="Optional" /></div>
          <div style={{ gridColumn: "1/-1" }}><div style={S.l}>Remarks (optional)</div><textarea style={S.ta} value={fAct.remarks} onChange={(e) => setFAct((p) => ({ ...p, remarks: e.target.value }))} /></div>
        </div> : null}

        {modal?.kind === "iec" ? <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ gridColumn: "1/-1" }}><div style={S.l}>Title of IEC Material *</div><button type="button" style={{ ...S.in, background: "#f8fafc", cursor: "pointer", textAlign: "left" }} onClick={() => openMulti("iecTitles")}>{fIec.titles?.length ? fIec.titles.join(", ") : "Click to select (multi-select)"}</button></div>
          <div style={{ gridColumn: "1/-1" }}><div style={S.l}>Source *</div><button type="button" style={{ ...S.in, background: "#f8fafc", cursor: "pointer", textAlign: "left" }} onClick={() => openMulti("iecSources")}>{fIec.sources?.length ? fIec.sources.join(", ") : "Click to select (multi-select)"}</button></div>
          <div><div style={S.l}>Date (for Month/Quarter) *</div><input style={S.in} type="date" value={fIec.date} onChange={(e) => setFIec((p) => ({ ...p, date: e.target.value }))} /><div style={{ fontSize: 12, opacity: 0.75 }}>Quarter: <b>{qLabel(qFromDate(fIec.date))}</b> • Month: <b>{mName(fIec.date) || "—"}</b></div></div>
          <div><div style={S.l}>Beneficiary (Male)</div><input style={S.in} type="number" value={fIec.male} onChange={(e) => setFIec((p) => ({ ...p, male: e.target.value }))} /></div>
          <div><div style={S.l}>Beneficiary (Female)</div><input style={S.in} type="number" value={fIec.female} onChange={(e) => setFIec((p) => ({ ...p, female: e.target.value }))} /><div style={{ fontSize: 12, opacity: 0.75 }}>Total (auto): <b>{toNum(fIec.male) + toNum(fIec.female)}</b></div></div>
          <div style={{ gridColumn: "1/-1" }}><div style={S.l}>Means of Verification</div><textarea style={S.ta} value={fIec.mov} onChange={(e) => setFIec((p) => ({ ...p, mov: e.target.value }))} placeholder="Paste links here (auto-detected)..." /></div>
          <div style={{ gridColumn: "1/-1" }}><div style={S.l}>Name of Staff</div><input style={S.in} value={fIec.staffName} onChange={(e) => setFIec((p) => ({ ...p, staffName: e.target.value }))} placeholder="Optional" /></div>
          <div style={{ gridColumn: "1/-1" }}><div style={S.l}>Remarks (optional)</div><textarea style={S.ta} value={fIec.remarks} onChange={(e) => setFIec((p) => ({ ...p, remarks: e.target.value }))} /></div>
        </div> : null}

        {modal?.kind === "col" ? <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ gridColumn: "1/-1" }}><div style={S.l}>Title of Activity *</div><textarea style={S.ta} value={fCol.title} onChange={(e) => setFCol((p) => ({ ...p, title: e.target.value }))} /></div>
          <div style={{ gridColumn: "1/-1" }}><div style={S.l}>Name of Stakeholder/s *</div><button type="button" style={{ ...S.in, background: "#f8fafc", cursor: "pointer", textAlign: "left" }} onClick={() => openMulti("stakeholders")}>{fCol.stakeholders?.length ? fCol.stakeholders.join(", ") : "Click to select (multi-select)"}</button></div>
          <div><div style={S.l}>Date (for Quarter) *</div><input style={S.in} type="date" value={fCol.date} onChange={(e) => setFCol((p) => ({ ...p, date: e.target.value }))} /><div style={{ fontSize: 12, opacity: 0.75 }}>Quarter: <b>{qLabel(qFromDate(fCol.date))}</b></div></div>
          <div style={{ gridColumn: "1/-1" }}><div style={S.l}>Means of Verification</div><textarea style={S.ta} value={fCol.mov} onChange={(e) => setFCol((p) => ({ ...p, mov: e.target.value }))} placeholder="Paste links here (auto-detected)..." /></div>
          <div style={{ gridColumn: "1/-1" }}><div style={S.l}>Name of Staff</div><input style={S.in} value={fCol.staffName} onChange={(e) => setFCol((p) => ({ ...p, staffName: e.target.value }))} placeholder="Optional" /></div>
          <div style={{ gridColumn: "1/-1" }}><div style={S.l}>Remarks (optional)</div><textarea style={S.ta} value={fCol.remarks} onChange={(e) => setFCol((p) => ({ ...p, remarks: e.target.value }))} /></div>
        </div> : null}
      </Modal>

      <Modal open={!!modal && modal.mode === "view" && !!viewEntry} title={<div><div>View Entry — {modal?.kind === "act" ? String(viewEntry?.title || "Activity") : modal?.kind === "iec" ? String((viewEntry?.titles || [])[0] || "IEC Material") : String(viewEntry?.title || "Collaboration")}</div><div style={{ fontSize: 12, opacity: 0.9, fontWeight: 800 }}>{modal?.kind === "act" ? "Activities" : modal?.kind === "iec" ? "IEC Materials" : "Collaboration"}</div></div>} onClose={() => setModal(null)} width={1100} footer={<><button style={S.btn} onClick={() => setModal(null)}>Close</button><button style={S.btnP} onClick={() => { const k = modal.kind; const id = modal.id; setModal(null); openEdit(k, id); }}>Edit</button></>}>
        {viewEntry ? <ViewEntryBody kind={modal.kind} entry={viewEntry} /> : null}
      </Modal>

      <VenueFlowModal open={venueOpen} initialMeta={fAct.venueMeta} onClose={() => setVenueOpen(false)} onSave={(meta) => setFAct((p) => ({ ...p, venueMeta: meta, venueText: meta?.displayText || "" }))} />
      <MultiSelectModal open={!!msOpen} title={msOpen?.title || "Multi-select"} options={msOpen?.options || []} selected={msOpen?.selected || []} onConfirm={confirmMulti} onClose={() => setMsOpen(null)} onAddNew={openAddOptionForCurrentMulti} />
      <AddOptionModal open={!!addOpt} title={addOpt?.title || "Add option"} placeholder={addOpt?.placeholder || "Type..."} onCancel={() => setAddOpt(null)} onAdd={onAddOpt} />
    </div>
  );
}
