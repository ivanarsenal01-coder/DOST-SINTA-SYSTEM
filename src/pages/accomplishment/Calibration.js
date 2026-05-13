import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import API_BASE from "../../api";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table as DocxTable,
  TableRow as DocxTableRow,
  TableCell as DocxTableCell,
  WidthType,
  PageOrientation,
} from "docx";
import { useAuth } from "../../usrmngment/auth/AuthContext";
import {
  canAdd,
  canEdit,
  canDelete,
  canExport,
} from "../../usrmngment/utils/permissions";

/* =========================
   Leaflet + React-Leaflet
   ========================= */
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  GeoJSON,
  LayersControl,
  Pane,
  Polygon,
  useMapEvents,
  useMap,
} from "react-leaflet";

/* Fix Leaflet marker icons */
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/* =========================
   Pangasinan core data
   ========================= */
const PANGASINAN_LGUS = [
  "Alaminos City", "Dagupan City", "San Carlos City", "Urdaneta City", "Agno", "Aguilar", "Alcala", "Anda",
  "Asingan", "Balungao", "Bani", "Basista", "Bautista", "Bayambang", "Binalonan", "Binmaley", "Bolinao",
  "Bugallon", "Burgos", "Calasiao", "Dasol", "Infanta", "Labrador", "Laoac", "Lingayen", "Mabini", "Malasiqui",
  "Manaoag", "Mangaldan", "Mangatarem", "Mapandan", "Natividad", "Pozorrubio", "Rosales", "San Fabian",
  "San Jacinto", "San Manuel", "San Nicolas", "San Quintin", "Santa Barbara", "Santa Maria", "Santo Tomas",
  "Sison", "Sual", "Tayug", "Umingan", "Urbiztondo", "Villasis",
].sort((a, b) => a.localeCompare(b));

const PANGASINAN_DISTRICTS = [
  { id: "District 1", municipalities: ["Agno", "Alaminos City", "Anda", "Bani", "Bolinao", "Burgos", "Dasol", "Infanta", "Mabini", "Sual"] },
  { id: "District 2", municipalities: ["Aguilar", "Basista", "Binmaley", "Bugallon", "Labrador", "Lingayen", "Mangatarem", "Urbiztondo"] },
  { id: "District 3", municipalities: ["Bayambang", "Calasiao", "Malasiqui", "Mapandan", "San Carlos City", "Santa Barbara"] },
  { id: "District 4", municipalities: ["Dagupan City", "Manaoag", "Mangaldan", "San Fabian", "San Jacinto"] },
  { id: "District 5", municipalities: ["Alcala", "Bautista", "Binalonan", "Laoac", "Pozorrubio", "Santo Tomas", "Sison", "Urdaneta City", "Villasis"] },
  { id: "District 6", municipalities: ["Asingan", "Balungao", "Natividad", "Rosales", "San Manuel", "San Nicolas", "San Quintin", "Santa Maria", "Tayug", "Umingan"] },
];

/* =========================
   Helpers
   ========================= */
const CALIBRATION_API_URL = `${API_BASE}/calibration`;
const BARANGAY_LOCAL_URL = "/data/pangasinan_barangays.json";
const MC_RANGE_OPTIONS = ["<100 Kg", ">=100 Kg"];
const DEFAULT_CENTER = [15.8949, 120.2863];

function makeMCBreakdownRow(prefillSample = "", autoFilled = false) {
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    range: "",
    noOfSample: prefillSample,
    cost: "",
    feesCollected: "",
    autoFilled,
  };
}

const EMPTY_FORM = {
  id: null,
  category: "PAYING",
  date: new Date().toISOString().slice(0, 10),
  typeOfSample: "Weighing Scale",
  testType: "Mass Calibration",
  noOfSample: "",
  range: "",
  cost: "",
  feesCollected: "",
  mcBreakdown: [makeMCBreakdownRow()],
  barangay: "",
  address: "",
  addressMeta: null,
  female: "",
  male: "",
  totalCustomers: "",
  noOfFirms: "",
  noOfNewFirms: "",
  ageRange: "",
  pwd: "",
  ip: "",
  sc: "",
  fourPs: "",
  nameOfStaff: "",
  meansOfVerification: "",
  movPhotos: [],
  remarks: "",
  customFields: {},
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function normalizeKey(s) {
  return String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
}
function uid() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
function toNumber(v) {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}
function money(v) {
  return toNumber(v).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function whole(v) {
  return toNumber(v).toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
function getYearFromDate(dateStr) {
  return dateStr ? new Date(dateStr).getFullYear() : "";
}
function getMonthFromDate(dateStr) {
  return dateStr ? new Date(dateStr).getMonth() + 1 : "";
}
function getDistrictFromMunicipality(muni) {
  const target = normalizeKey(muni);
  for (const d of PANGASINAN_DISTRICTS) {
    if (d.municipalities.some((m) => normalizeKey(m) === target)) return d.id;
  }
  return "";
}
function detectMunicipalityFromAddressText(text) {
  const src = normalizeKey(text);
  for (const muni of PANGASINAN_LGUS) {
    if (src.includes(normalizeKey(muni))) return muni;
  }
  if (src.includes("urdaneta")) return "Urdaneta City";
  if (src.includes("dagupan")) return "Dagupan City";
  if (src.includes("san carlos")) return "San Carlos City";
  if (src.includes("alaminos")) return "Alaminos City";
  return "";
}

function deriveMunicipalityFromEntry(entry) {
  return (
    entry?.addressMeta?.municipality ||
    detectMunicipalityFromAddressText(
      entry?.addressMeta?.displayText ||
      entry?.addressMeta?.manualText ||
      entry?.address ||
      ""
    ) ||
    ""
  );
}
function deriveDistrictFromEntry(entry) {
  const derivedMunicipality = deriveMunicipalityFromEntry(entry);
  return getDistrictFromMunicipality(derivedMunicipality) || "";
}
function sanitizeEntry(raw = {}) {
  return {
    ...EMPTY_FORM,
    ...raw,
    id: raw?.id || uid(),
    date: raw?.date || new Date().toISOString().slice(0, 10),
    address: raw?.address || raw?.addressMeta?.displayText || "",
    addressMeta: raw?.addressMeta || null,
    customFields: raw?.customFields || raw?.custom_fields || {},
    custom_fields: raw?.custom_fields || raw?.customFields || {},
    mcBreakdown: Array.isArray(raw?.mcBreakdown)
      ? raw.mcBreakdown.map((row) => ({
        id: row?.id || uid(),
        range: row?.range || "",
        noOfSample: row?.noOfSample ?? "",
        cost: row?.cost ?? "",
        feesCollected: row?.feesCollected ?? "",
        autoFilled: Boolean(row?.autoFilled),
      }))
      : [],
  };
}
function buildInverseMaskFromPolygon(pangasinanPolygonGeojson) {
  const world = [
    [-85, -180],
    [-85, 180],
    [85, 180],
    [85, -180],
  ];

  const feat = pangasinanPolygonGeojson?.features?.[0];
  if (!feat?.geometry) return null;

  const geom = feat.geometry;
  const holes = [];

  if (geom.type === "Polygon") {
    const rings = geom.coordinates || [];
    if (rings.length > 0) holes.push(rings[0].map(([lng, lat]) => [lat, lng]));
  } else if (geom.type === "MultiPolygon") {
    (geom.coordinates || []).forEach((poly) => {
      const rings = poly || [];
      if (rings.length > 0) holes.push(rings[0].map(([lng, lat]) => [lat, lng]));
    });
  } else {
    return null;
  }

  return [world, ...holes];
}

function FitAndLockToPangasinan({ bounds, borderMode, selectedMuni, selectedDist, filteredGeo }) {
  const map = useMap();

  React.useEffect(() => {
    if (!map || !bounds) return;

    const padded = bounds.pad(0.15);
    map.setMaxBounds(padded);
    map.setMinZoom(9);
    map.setMaxZoom(13);

    const fitGeo = (geo) => {
      try {
        const layer = L.geoJSON(geo);
        const b = layer.getBounds();
        if (b && b.isValid()) map.fitBounds(b.pad(0.05), { animate: true });
      } catch { }
    };

    if (borderMode === "municipality" && selectedMuni && filteredGeo?.features?.length) {
      fitGeo(filteredGeo);
      return;
    }
    if (borderMode === "district" && selectedDist && filteredGeo?.features?.length) {
      fitGeo(filteredGeo);
      return;
    }

    map.fitBounds(bounds.pad(0.05), { animate: true });
  }, [map, bounds, borderMode, selectedMuni, selectedDist, filteredGeo]);

  return null;
}

function detectMunicipalityName(feature) {
  const props = feature?.properties || {};
  const keys = ["name", "NAME", "NAME_3", "NAME_2", "ADM3_EN", "ADM3EN", "ADM3", "MUNICIPALI", "MUNICIPALITY", "CITY", "city", "municipality"];
  for (const k of keys) if (props[k]) return String(props[k]).trim();
  return "";
}
async function fetchBarangaysForMunicipality_Local(muniName) {
  const { data } = await axios.get(BARANGAY_LOCAL_URL);

  const pick = (key) => {
    const arr = data?.[key];
    if (!Array.isArray(arr)) return null;

    if (typeof arr[0] === "string") {
      return arr
        .map((name) => ({ name: String(name), lat: null, lng: null }))
        .filter((x) => x.name)
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    return arr
      .map((x) => ({
        name: String(x?.name || ""),
        lat: Number.isFinite(Number(x?.lat)) ? Number(x.lat) : null,
        lng: Number.isFinite(Number(x?.lng)) ? Number(x.lng) : null,
      }))
      .filter((x) => x.name)
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  let list = pick(muniName);
  if (list) return list;

  const target = normalizeKey(muniName);
  const foundKey = Object.keys(data || {}).find((k) => normalizeKey(k) === target);
  if (foundKey) {
    list = pick(foundKey);
    if (list) return list;
  }

  throw new Error(`No hardcoded barangay list for "${muniName}"`);
}
function openGoogleMap(lat, lng) {
  window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank");
}
function openGoogleDirections(lat, lng) {
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank");
}
function getRangeDisplayLines(entry) {
  if (entry.typeOfSample === "Weighing Scale" && Array.isArray(entry.mcBreakdown) && entry.mcBreakdown.length) {
    const lines = entry.mcBreakdown
      .filter((r) => r.range && toNumber(r.noOfSample) > 0)
      .map((r) => `${r.range} (${toNumber(r.noOfSample)})`);
    if (lines.length) return lines;
  }
  return [entry.range || "—"];
}
function formatRangeDisplay(entry) {
  return getRangeDisplayLines(entry).join(", ");
}
function getCostDisplayLines(entry) {
  if (entry.typeOfSample === "Weighing Scale" && Array.isArray(entry.mcBreakdown) && entry.mcBreakdown.length) {
    const lines = entry.mcBreakdown
      .filter((r) => r.range && (toNumber(r.cost) > 0 || toNumber(r.noOfSample) > 0))
      .map((r) => `${r.range}: ${money(r.cost)}`);
    if (lines.length) return lines;
  }
  return [money(entry.cost)];
}
function formatCostDisplay(entry) {
  return getCostDisplayLines(entry).join(", ");
}
function getFeesCollectedDisplayLines(entry) {
  if (entry.typeOfSample === "Weighing Scale" && Array.isArray(entry.mcBreakdown) && entry.mcBreakdown.length) {
    const lines = entry.mcBreakdown
      .filter((r) => r.range && (toNumber(r.feesCollected) > 0 || toNumber(r.noOfSample) > 0))
      .map((r) => `${r.range}: ${money(r.feesCollected)}`);
    if (lines.length) return lines;
  }
  return [money(entry.feesCollected)];
}
function computeMCBreakdownTotals(rows, category) {
  const cleanRows = Array.isArray(rows) ? rows : [];
  const totalSamples = cleanRows.reduce((sum, r) => sum + toNumber(r.noOfSample), 0);
  const totalFees = category === "PAYING"
    ? cleanRows.reduce((sum, r) => sum + toNumber(r.noOfSample) * toNumber(r.cost), 0)
    : 0;
  return { totalSamples, totalFees };
}

function formatCalibrationApiError(error) {
  const responseData = error?.response?.data;
  return (
    responseData?.message ||
    responseData?.sqlMessage ||
    responseData?.error ||
    error?.message ||
    "Failed to save calibration entry."
  );
}

function ClickToMoveMarker({ onPick }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function FlyToCenter({ coords, zoom = 16 }) {
  const map = useMap();
  React.useEffect(() => {
    if (!coords?.lat || !coords?.lng) return;
    map.setView([coords.lat, coords.lng], zoom, { animate: true });
  }, [map, coords?.lat, coords?.lng, zoom]);
  return null;
}

function AddressFlowModal({
  open,
  onClose,
  onSave,
  initialMeta,
  municipalityOptions,
  fetchBarangaysForMunicipality_Local,
  styles,
}) {
  const [mode, setMode] = React.useState(initialMeta?.mode || "hierarchical");
  const [step, setStep] = React.useState(1);
  const [venue, setVenue] = React.useState(initialMeta?.venue || "");
  const [manualText, setManualText] = React.useState(initialMeta?.manualText || "");
  const [coordsText, setCoordsText] = React.useState(() => {
    const lat = initialMeta?.lat;
    const lng = initialMeta?.lng;
    return Number.isFinite(lat) && Number.isFinite(lng) ? `${lat}, ${lng}` : "";
  });

  const province = "Pangasinan";
  const [municipality, setMunicipality] = React.useState(initialMeta?.municipality || "");
  const [barangay, setBarangay] = React.useState(initialMeta?.barangay || "");

  const [barangayOptions, setBarangayOptions] = React.useState([]);
  const [barangayLoading, setBarangayLoading] = React.useState(false);
  const [barangayError, setBarangayError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [coordinateLoading, setCoordinateLoading] = React.useState(false);

  const [coords, setCoords] = React.useState(() => {
    const lat = initialMeta?.lat;
    const lng = initialMeta?.lng;
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  });

  const parseCoordinates = (value) => {
    const cleaned = String(value || "").trim();
    const match = cleaned.match(/(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)/);
    if (!match) return null;
    const lat = Number(match[1]);
    const lng = Number(match[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
  };

  const reverseGeocodeCoordinates = async () => {
    const parsed = parseCoordinates(coordsText);
    if (!parsed) return alert("Invalid coordinates. Use format like: 15.123456, 120.123456");

    setCoords(parsed);
    setCoordinateLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(parsed.lat)}&lon=${encodeURIComponent(parsed.lng)}`
      );
      const data = await res.json();
      const display = data?.display_name || "";
      if (display) setManualText(display);
    } catch {
      // Keep coordinates even if reverse lookup fails.
    } finally {
      setCoordinateLoading(false);
    }
  };

  React.useEffect(() => {
    if (!open) return;
    const initMode = initialMeta?.mode || "hierarchical";
    setMode(initMode);
    setVenue(initialMeta?.venue || "");
    setManualText(initialMeta?.manualText || "");
    setMunicipality(initialMeta?.municipality || "");
    setBarangay(initialMeta?.barangay || "");
    const lat = initialMeta?.lat;
    const lng = initialMeta?.lng;
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
    setCoords(hasCoords ? { lat, lng } : null);
    setCoordsText(hasCoords ? `${lat}, ${lng}` : "");
    setSearch("");
    setBarangayOptions([]);
    setBarangayLoading(false);
    setBarangayError("");
    setCoordinateLoading(false);
    if (initMode === "manual") setStep(1);
    else setStep(initialMeta?.municipality ? 2 : 1);
  }, [open, initialMeta]);

  React.useEffect(() => {
    let cancelled = false;
    async function loadBarangays() {
      setBarangayOptions([]);
      setBarangayError("");
      setBarangayLoading(false);
      if (!open || mode !== "hierarchical" || !municipality) return;
      setBarangayLoading(true);
      try {
        const list = await fetchBarangaysForMunicipality_Local(municipality);
        if (cancelled) return;
        setBarangayOptions(Array.isArray(list) ? list : []);
      } catch (e) {
        if (cancelled) return;
        setBarangayError(String(e?.message || e));
        setBarangayOptions([]);
      } finally {
        if (!cancelled) setBarangayLoading(false);
      }
    }
    loadBarangays();
    return () => { cancelled = true; };
  }, [open, mode, municipality, fetchBarangaysForMunicipality_Local]);

  const filterList = (items) => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return items;
    return items.filter((x) => {
      const name = typeof x === "string" ? x : String(x?.name || "");
      return name.toLowerCase().includes(q);
    });
  };

  const addressOnlyText =
    mode === "manual" ? manualText.trim() : [barangay, municipality, province].filter(Boolean).join(", ");
  const displayText = [venue.trim(), addressOnlyText].filter(Boolean).join(venue.trim() && addressOnlyText ? ",\n" : "");
  const canSave =
    mode === "manual"
      ? Boolean(venue.trim() || manualText.trim() || coords)
      : Boolean((municipality && barangay) || venue.trim() || coords);
  const breadcrumb =
    mode === "manual"
      ? "Manual Input"
      : step === 1
        ? "Pangasinan > Select Municipality/City"
        : step === 2
          ? `Pangasinan > ${municipality} > Select Barangay`
          : `Pangasinan > ${municipality} > ${barangay || "Barangay"} > Pin`;

  const back = () => {
    if (mode === "manual") return onClose();
    if (step === 1) return onClose();
    if (step === 2) { setStep(1); setSearch(""); return; }
    if (step === 3) setStep(2);
  };
  const goToMap = () => { if (!coords) setCoords({ lat: 15.9167, lng: 120.3333 }); setStep(3); };
  const useMyLocation = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported in this browser.");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(nextCoords);
        setCoordsText(`${nextCoords.lat}, ${nextCoords.lng}`);
      },
      () => alert("Could not get your location. Check browser permissions.")
    );
  };

  const save = () => {
    if (!canSave) return alert("Please add a venue, address, or coordinates.");
    const meta =
      mode === "manual"
        ? { mode: "manual", venue: venue.trim(), manualText: manualText.trim(), displayText, province: "", municipality: detectMunicipalityFromAddressText(manualText), barangay: "", lat: coords?.lat || null, lng: coords?.lng || null }
        : { mode: "hierarchical", venue: venue.trim(), province, municipality, barangay, manualText: "", displayText, lat: coords?.lat || null, lng: coords?.lng || null };
    onSave(meta);
    onClose();
  };

  if (!open) return null;

  return (
    <div style={{ ...styles.modalBackdrop, zIndex: 3200 }} onClick={onClose}>
      <div style={{ ...styles.flowShell, position: "relative", zIndex: 3201 }} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div>Add Venue/Address</div>
            <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 800 }}>{breadcrumb}</div>
          </div>
          <button type="button" style={styles.closeX} onClick={onClose}>✕</button>
        </div>

        <div style={styles.flowBody}>
          <div style={styles.tabsRow}>
            <button type="button" style={styles.tabBtn(mode === "hierarchical")} onClick={() => { setMode("hierarchical"); setStep(1); setManualText(""); setSearch(""); }}>Hierarchical</button>
            <button type="button" style={styles.tabBtn(mode === "manual")} onClick={() => { setMode("manual"); setStep(1); setMunicipality(""); setBarangay(""); setBarangayOptions([]); setBarangayError(""); setSearch(""); }}>Manual Input</button>
          </div>

          {mode === "manual" ? (
            <>
              <div style={styles.field}>
                <div style={styles.label}>Venue</div>
                <input style={styles.input} value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g. Riverside Convention Center (optional)" />
              </div>
              <div style={styles.field}>
                <div style={styles.label}>Type Venue/Address</div>
                <textarea style={styles.textarea} value={manualText} onChange={(e) => setManualText(e.target.value)} placeholder="e.g. Allabon, Agno, Pangasinan" />
              </div>
              <div style={styles.field}>
                <div style={styles.label}>Coordinates</div>
                <input style={styles.input} value={coordsText} onChange={(e) => setCoordsText(e.target.value)} placeholder="Optional: 15.123456, 120.123456" />
                <button type="button" style={{ ...styles.btnGhost, alignSelf: "flex-start", padding: "6px 10px" }} onClick={reverseGeocodeCoordinates} disabled={coordinateLoading}>{coordinateLoading ? "Checking..." : "Use Coordinates"}</button>
              </div>
              <div style={{ fontSize: 12, opacity: 0.75, whiteSpace: "pre-wrap" }}>Preview: <b>{displayText || "—"}</b></div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <button type="button" style={styles.btnGhost} onClick={back}>Back</button>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" style={styles.btnGhost} onClick={useMyLocation}>Use My Location</button>
                  <button type="button" style={styles.btnDark} onClick={save} disabled={!canSave}>Save</button>
                </div>
              </div>
            </>
          ) : (
            <>
              {step === 1 && (
                <>
                  <div style={styles.field}>
                    <div style={styles.label}>Venue</div>
                    <input style={styles.input} value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="e.g. Riverside Convention Center (optional)" />
                  </div>
                  <div style={styles.field}>
                    <div style={styles.label}>Search Municipality/City</div>
                    <input style={styles.input} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Type to search..." />
                  </div>
                  <div style={styles.label}>Select Municipality/City (Pangasinan)</div>
                  <div style={styles.list}>{filterList(municipalityOptions).map((name) => {
                    const active = name === municipality;
                    return <button type="button" key={name} style={{ ...styles.listBtn, ...(active ? styles.listBtnActive : null) }} onClick={() => { setMunicipality(name); setBarangay(""); setCoords(null); setCoordsText(""); setSearch(""); setStep(2); }}>{name}</button>;
                  })}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><button type="button" style={styles.btnGhost} onClick={onClose}>Cancel</button></div>
                </>
              )}

              {step === 2 && (
                <>
                  <div style={styles.label}>Municipality: <b>{municipality}</b></div>
                  <div style={styles.field}>
                    <div style={styles.label}>Search Barangay</div>
                    <input style={styles.input} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={barangayLoading ? "Loading..." : "Type to search barangays..."} disabled={barangayLoading} />
                  </div>
                  {barangayLoading ? <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 800 }}>Loading barangays...</div> : barangayError ? <div style={styles.warn}>⚠ {barangayError}</div> : (
                    <>
                      <div style={styles.label}>Select Barangay</div>
                      <div style={styles.list}>{filterList(barangayOptions).map((b) => {
                        const name = typeof b === "string" ? b : b.name;
                        const active = name === barangay;
                        return <button type="button" key={name} style={{ ...styles.listBtn, ...(active ? styles.listBtnActive : null) }} onClick={() => { setBarangay(name); const lat = typeof b === "string" ? null : b.lat; const lng = typeof b === "string" ? null : b.lng; if (Number.isFinite(lat) && Number.isFinite(lng)) { setCoords({ lat, lng }); setCoordsText(`${lat}, ${lng}`); } else { setCoords(null); setCoordsText(""); } }}>{name}</button>;
                      })}</div>
                    </>
                  )}
                  <div style={{ fontSize: 12, opacity: 0.75, whiteSpace: "pre-wrap" }}>Preview: <b>{displayText || "—"}</b></div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" style={styles.btnGhost} onClick={back}>Back</button>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" style={styles.btnGhost} onClick={goToMap}>Pin on Map</button>
                      <button type="button" style={styles.btnDark} onClick={save} disabled={!canSave}>Save</button>
                    </div>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div style={styles.label}>Click map or drag marker</div>
                  <div style={styles.mapBox}>
                    <MapContainer center={[coords?.lat || 15.9167, coords?.lng || 120.3333]} zoom={coords ? 16 : 12} minZoom={9} maxZoom={18} style={{ height: "100%", width: "100%" }} attributionControl={false}>
                      <LayersControl position="topright">
                        <LayersControl.BaseLayer checked name="Default (OSM)"><TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" opacity={0.9} /></LayersControl.BaseLayer>
                        <LayersControl.BaseLayer name="Satellite (Esri)"><TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Tiles © Esri" opacity={0.9} /></LayersControl.BaseLayer>
                      </LayersControl>
                      <FlyToCenter coords={coords} zoom={16} />
                      <ClickToMoveMarker onPick={(point) => { setCoords(point); setCoordsText(`${point.lat}, ${point.lng}`); }} />
                      {coords && <Marker position={[coords.lat, coords.lng]} draggable eventHandlers={{ dragend: (e) => { const p = e.target.getLatLng(); setCoords({ lat: p.lat, lng: p.lng }); setCoordsText(`${p.lat}, ${p.lng}`); } }} />}
                    </MapContainer>
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.8, whiteSpace: "pre-wrap" }}><div><b>Selected:</b> {displayText || "—"}</div><div><b>Coordinates:</b> {coords ? `${coords.lat}, ${coords.lng}` : "—"}</div></div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" style={styles.btnGhost} onClick={back}>Back</button>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" style={styles.btnGhost} onClick={useMyLocation}>Use My Location</button>
                      <button type="button" style={styles.btnDark} onClick={save} disabled={!canSave}>Save</button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}







function extractMovLinks(text) {
  const matches = String(text || "").match(/https?:\/\/[^\s]+/gi) || [];
  return Array.from(new Set(matches));
}

function openMovFirstLink(text) {
  const links = extractMovLinks(text);
  if (!links.length) return alert("No URL found in Means of Verification.");
  window.open(links[0], "_blank", "noopener,noreferrer");
}

function openMovLink(url) {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

function movFileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function pickMovPhotos(currentPhotos = [], onChange) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.multiple = true;
  input.onchange = async () => {
    const files = Array.from(input.files || []).filter((file) => String(file.type || "").startsWith("image/"));
    const converted = [];
    for (const file of files) {
      converted.push({ name: file.name, type: file.type, dataUrl: await movFileToDataUrl(file) });
    }
    if (converted.length) onChange([...(Array.isArray(currentPhotos) ? currentPhotos : []), ...converted]);
  };
  input.click();
}


function UnifiedMOVSection({ value = "", photos = [], onValueChange, onPhotosChange, label = "Means of Verification" }) {
  const [viewer, setViewer] = useState(null);
  const cleanPhotos = Array.isArray(photos) ? photos : [];
  const links = Array.from(new Set(String(value || "").match(/https?:\/\/[^\s]+/gi) || []));

  const addPhotos = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.multiple = true;
    input.onchange = async () => {
      const files = Array.from(input.files || []).filter((file) => String(file.type || "").startsWith("image/"));
      const converted = await Promise.all(files.map((file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ name: file.name, type: file.type, dataUrl: String(reader.result || "") });
        reader.onerror = reject;
        reader.readAsDataURL(file);
      })));
      if (converted.length) onPhotosChange?.([...cleanPhotos, ...converted]);
    };
    input.click();
  };

  const openFirstLink = () => {
    if (!links.length) return alert("No URL found in Means of Verification.");
    window.open(links[0], "_blank", "noopener,noreferrer");
  };

  const removePhoto = (idx) => {
    onPhotosChange?.(cleanPhotos.filter((_, i) => i !== idx));
  };

  const currentPhoto = viewer ? cleanPhotos[viewer.index] : null;

  return (
    <div style={{ gridColumn: "1 / -1", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 900, color: "#0f172a" }}>{label}</div>
      <textarea
        style={{ padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13, outline: "none", minHeight: 72, resize: "vertical", fontFamily: "inherit" }}
        value={value || ""}
        onChange={(e) => onValueChange?.(e.target.value)}
        placeholder="Attendance sheet / links to posts / activity reports / photos..."
      />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" style={{ border: "1px solid rgba(15,23,42,.18)", background: "#fff", padding: "5px 9px", borderRadius: 8, cursor: "pointer", fontWeight: 900, fontSize: 11, fontFamily: "inherit" }} onClick={openFirstLink}>View First Link</button>
        <button type="button" style={{ border: "1px solid rgba(15,23,42,.18)", background: "#fff", padding: "5px 9px", borderRadius: 8, cursor: "pointer", fontWeight: 900, fontSize: 11, fontFamily: "inherit" }} onClick={addPhotos}>Add Photos</button>
        <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: 999, border: "1px solid #cbd5e1", background: "#f8fafc", fontSize: 11, fontWeight: 900 }}>Photos: {cleanPhotos.length}</span>
      </div>
      {links.length ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {links.map((url, idx) => (
            <button key={`${url}_${idx}`} type="button" title={url} style={{ border: "1px solid #93c5fd", background: "#eff6ff", color: "#0b4ea2", padding: "5px 9px", borderRadius: 999, cursor: "pointer", fontWeight: 900, fontSize: 11, fontFamily: "inherit" }} onClick={() => window.open(url, "_blank", "noopener,noreferrer")}>Link {idx + 1}</button>
          ))}
        </div>
      ) : null}
      {cleanPhotos.length ? (
        <div style={{ display: "grid", gap: 8 }}>
          {cleanPhotos.map((photo, idx) => (
            <div key={`${photo.name || 'photo'}_${idx}`} style={{ display: "flex", gap: 10, alignItems: "center", border: "1px solid #e2e8f0", borderRadius: 10, padding: 8 }}>
              <img src={photo.dataUrl || photo.url} alt={photo.name || `Photo ${idx + 1}`} style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 8, border: "1px solid #e2e8f0", cursor: "pointer" }} onClick={() => setViewer({ index: idx })} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 900, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{photo.name || `Photo ${idx + 1}`}</div>
                <div style={{ fontSize: 11, opacity: 0.7, fontWeight: 800 }}>{photo.type || "image"}</div>
              </div>
              <button type="button" style={{ border: "1px solid #0b4ea2", background: "#fff", color: "#0b4ea2", padding: "5px 9px", borderRadius: 8, cursor: "pointer", fontWeight: 900, fontSize: 11, fontFamily: "inherit" }} onClick={() => removePhoto(idx)}>Remove</button>
            </div>
          ))}
        </div>
      ) : null}
      {currentPhoto ? (
        <div onClick={() => setViewer(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 999999 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(900px, 100%)", background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,.25)" }}>
            <div style={{ background: "#0b4ea2", color: "#fff", padding: "10px 14px", fontWeight: 900, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>{currentPhoto.name || "Photo"}</div>
              <button type="button" onClick={() => setViewer(null)} style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, padding: "6px 10px", fontWeight: 900, cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ padding: 16, display: "flex", justifyContent: "center" }}>
              <img src={currentPhoto.dataUrl || currentPhoto.url} alt={currentPhoto.name || "Photo"} style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: 10 }} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function Calibration() {
  const [deleteConfirmState, setDeleteConfirmState] = useState(null);

  const requestDeleteConfirm = (message = "Delete this record?") =>
    new Promise((resolve) => {
      setDeleteConfirmState({ message, resolve });
    });

  const cancelDeleteConfirm = () => {
    if (deleteConfirmState?.resolve) deleteConfirmState.resolve(false);
    setDeleteConfirmState(null);
  };

  const proceedDeleteConfirm = () => {
    if (deleteConfirmState?.resolve) deleteConfirmState.resolve(true);
    setDeleteConfirmState(null);
  };

  const fontFamily =
    '"Poppins", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"';

  const { user } = useAuth();
  const allowAdd = canAdd(user, "calibration");
  const allowEdit = canEdit(user, "calibration");
  const allowDelete = canDelete(user, "calibration");
  const allowExport = canExport(user, "calibration");

  const [entries, setEntries] = useState([]);
  const [calibrationCustomFields, setCalibrationCustomFields] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showViewId, setShowViewId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [municipalGeoJson, setMunicipalGeoJson] = useState(null);
  const [outlineGeoJson, setOutlineGeoJson] = useState(null);
  const [mapViewMode, setMapViewMode] = useState("municipality");

  const [addressFlowOpen, setAddressFlowOpen] = useState(false);

  const [filterCategory, setFilterCategory] = useState("ALL");
  const [filterMunicipality, setFilterMunicipality] = useState("ALL");
  const [filterDistrict, setFilterDistrict] = useState("ALL");
  const [filterMonth, setFilterMonth] = useState("ALL");
  const [filterYear, setFilterYear] = useState("ALL");

  // ✅ Search + pagination (Technology Promotion layout)
  const ROWS_PER_PAGE = 10;
  const PAGE_WINDOW_SIZE = 10;
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [printModal, setPrintModal] = useState({
    open: false,
    scope: "bulk",
    entryId: null,
    layout: "FORM",
    preset: "a4",
    orientation: "landscape",
    customSize: { width: 8.5, height: 13 },
  });

  const [exportModal, setExportModal] = useState({
    open: false,
    scope: "bulk",
    entryId: null,
    format: "excel",
    template: "TABLE",
    preset: "a4",
    orientation: "landscape",
    customSize: { width: 8.5, height: 13 },
  });


  useEffect(() => {
    let cancelled = false;

    const fixedKeys = new Set([
      "no",
      "actions",
      "category",
      "date",
      "typeOfSample",
      "type_of_sample",
      "testType",
      "test_type",
      "noOfSample",
      "no_of_sample",
      "range",
      "cost",
      "feesCollected",
      "fees_collected",
      "mcBreakdown",
      "mc_breakdown",
      "barangay",
      "address",
      "venueAddress",
      "venue_address",
      "addressMeta",
      "address_meta",
      "female",
      "male",
      "totalCustomers",
      "total_customers",
      "noOfFirms",
      "no_of_firms",
      "noOfNewFirms",
      "no_of_new_firms",
      "ageRange",
      "age_range",
      "pwd",
      "ip",
      "sc",
      "fourPs",
      "four_ps",
      "nameOfStaff",
      "name_of_staff",
      "staffName",
      "staff_name",
      "remarks"
    ]);

    async function loadCalibrationCustomFields() {
      try {
        const res = await axios.get(`${API_BASE}/table-management/config`);
        const modules = Array.isArray(res.data) ? res.data : [];

        const mod = modules.find(
          (m) => String(m.moduleName || m.module_name || m.name || "").toLowerCase() === "calibration"
        );

        const table =
          (mod?.tables || []).find(
            (t) => String(t.tableName || t.table_name || t.name || "").toLowerCase() === "main"
          ) || (mod?.tables || [])[0];

        const fields = Array.isArray(table?.fields || table?.formFields)
          ? table.fields || table.formFields
          : [];

        const customFields = fields
          .filter((f) => {
            const key = String(f.fieldKey || f.field_key || f.key || "").trim();
            const visible = f.isVisible ?? f.is_visible ?? true;
            const showAdd = f.showAdd ?? f.show_add ?? true;
            const showEdit = f.showEdit ?? f.show_edit ?? true;
            const systemField = f.isSystemField ?? f.is_system_field ?? false;
            return key && visible && !systemField && (showAdd || showEdit) && !fixedKeys.has(key);
          })
          .sort(
            (a, b) =>
              Number(a.sortOrder ?? a.sort_order ?? 999) -
              Number(b.sortOrder ?? b.sort_order ?? 999)
          );

        if (!cancelled) setCalibrationCustomFields(customFields);
      } catch (err) {
        console.error("Failed to load Calibration custom fields:", err);
        if (!cancelled) setCalibrationCustomFields([]);
      }
    }

    loadCalibrationCustomFields();

    return () => {
      cancelled = true;
    };
  }, []);
  async function loadEntries() {
    try {
      const { data } = await axios.get(CALIBRATION_API_URL);
      const rows = Array.isArray(data) ? data : data?.rows || [];
      setEntries(rows.map((entry) => sanitizeEntry(entry)));
    } catch (e) {
      console.error("Failed to load calibration entries", e);
      setEntries([]);
    }
  }

  useEffect(() => {
    loadEntries();
  }, []);

  useEffect(() => {
    Promise.all([
      axios.get("/geo/pangasinan_municipalities.geojson"),
      axios.get("/geo/pangasinan_outline.geojson"),
    ])
      .then(([municipalRes, outlineRes]) => {
        setMunicipalGeoJson(municipalRes.data || null);
        setOutlineGeoJson(outlineRes.data || null);
      })
      .catch(() => {
        setMunicipalGeoJson(null);
        setOutlineGeoJson(null);
      });
  }, []);

  const maskLatLngs = useMemo(() => buildInverseMaskFromPolygon(outlineGeoJson), [outlineGeoJson]);

  const pangasinanBounds = useMemo(() => {
    if (!outlineGeoJson) return null;
    try {
      const b = L.geoJSON(outlineGeoJson).getBounds();
      return b && b.isValid() ? b : null;
    } catch {
      return null;
    }
  }, [outlineGeoJson]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setShowAdd(false);
        setAddressFlowOpen(false);
        setShowViewId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const availableYears = useMemo(() => {
    return Array.from({ length: 2050 - 1970 + 1 }, (_, index) => 2050 - index);
  }, []);

  const municipalityOptions = useMemo(() => {
    const fromEntries = entries
      .map((e) => deriveMunicipalityFromEntry(e))
      .filter(Boolean);
    return Array.from(new Set([...PANGASINAN_LGUS, ...fromEntries])).sort((a, b) => a.localeCompare(b));
  }, [entries]);

  const filteredEntries = useMemo(() => {
    return entries.filter((item) => {
      const derivedMunicipality = deriveMunicipalityFromEntry(item);
      const derivedDistrict = deriveDistrictFromEntry(item);
      const q = normalizeKey(searchTerm);
      const searchableText = normalizeKey(
        [
          item?.category,
          item?.date,
          item?.typeOfSample,
          item?.testType,
          item?.range,
          formatRangeDisplay(item),
          formatCostDisplay(item),
          item?.address,
          item?.barangay,
          derivedMunicipality,
          derivedDistrict,
          item?.female,
          item?.male,
          item?.totalCustomers,
          item?.noOfFirms,
          item?.noOfNewFirms,
          item?.ageRange,
          item?.pwd,
          item?.ip,
          item?.sc,
          item?.fourPs,
          item?.nameOfStaff,
          item?.remarks,
        ]
          .filter((value) => value !== null && value !== undefined)
          .join(" ")
      );

      if (q && !searchableText.includes(q)) return false;
      if (!item?.date) return false;
      if (filterYear !== "ALL" && getYearFromDate(item.date) !== Number(filterYear)) return false;
      if (filterMonth !== "ALL" && getMonthFromDate(item.date) !== Number(filterMonth)) return false;
      if (filterCategory !== "ALL" && item.category !== filterCategory) return false;
      if (
        filterMunicipality !== "ALL" &&
        normalizeKey(derivedMunicipality) !== normalizeKey(filterMunicipality)
      ) {
        return false;
      }
      if (filterDistrict !== "ALL" && derivedDistrict !== filterDistrict) return false;
      return true;
    });
  }, [entries, filterCategory, filterMunicipality, filterDistrict, filterMonth, filterYear, searchTerm]);

  // ✅ Reset to page 1 kapag nag-search or nag-filter
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, filterMunicipality, filterDistrict, filterMonth, filterYear]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredEntries.length / ROWS_PER_PAGE));
  }, [filteredEntries.length]);

  // Same behavior as Technology Promotion: the pagination window can move by 10s
  // while the table still shows only 10 rows per page.
  const safeCurrentPage = Math.max(currentPage, 1);

  const pageStartIndex = (safeCurrentPage - 1) * ROWS_PER_PAGE;
  const pageEndIndex = Math.min(pageStartIndex + ROWS_PER_PAGE, filteredEntries.length);

  // ✅ Ito ang ginagamit ng table para 10 rows lang kada page
  const paginatedEntries = useMemo(() => {
    return filteredEntries.slice(pageStartIndex, pageStartIndex + ROWS_PER_PAGE);
  }, [filteredEntries, pageStartIndex]);

  const pageStart = paginatedEntries.length ? pageStartIndex + 1 : 0;
  const pageEnd = paginatedEntries.length
    ? Math.min(safeCurrentPage * ROWS_PER_PAGE, filteredEntries.length)
    : 0;

  // ✅ Ito ang ginagamit ng map para current page lang ang pins
  const pinnedEntries = useMemo(() => {
    return paginatedEntries.filter((e) => Number.isFinite(e?.addressMeta?.lat) && Number.isFinite(e?.addressMeta?.lng));
  }, [paginatedEntries]);

  const pageWindowStart =
    Math.floor((safeCurrentPage - 1) / PAGE_WINDOW_SIZE) * PAGE_WINDOW_SIZE + 1;

  // ✅ DOST layout: 1-10, then 11-20, then 21-30
  const visiblePageNumbers = useMemo(() => {
    return Array.from({ length: PAGE_WINDOW_SIZE }, (_, i) => pageWindowStart + i);
  }, [pageWindowStart]);

  const paginationLogoOSlots = useMemo(() => {
    return Array.from({ length: PAGE_WINDOW_SIZE }, (_, i) => i);
  }, []);

  const activeLogoIndex =
    ((safeCurrentPage - pageWindowStart) % PAGE_WINDOW_SIZE + PAGE_WINDOW_SIZE) %
    PAGE_WINDOW_SIZE;

  const selectedDistrictSet = useMemo(() => {
    const d = PANGASINAN_DISTRICTS.find((x) => x.id === filterDistrict);
    return new Set(d?.municipalities || []);
  }, [filterDistrict]);

  const filteredMunicipalityGeojson = useMemo(() => {
    if (!municipalGeoJson) return null;

    if (mapViewMode === "municipality") {
      if (filterMunicipality === "ALL") return municipalGeoJson;
      const feats = municipalGeoJson?.features || [];
      return {
        type: "FeatureCollection",
        features: feats.filter((f) => String(detectMunicipalityName(f) || "") === filterMunicipality),
      };
    }

    if (mapViewMode === "district") {
      if (filterDistrict === "ALL") return municipalGeoJson;
      const feats = municipalGeoJson?.features || [];
      return {
        type: "FeatureCollection",
        features: feats.filter((f) => selectedDistrictSet.has(String(detectMunicipalityName(f) || ""))),
      };
    }

    return municipalGeoJson;
  }, [municipalGeoJson, mapViewMode, filterMunicipality, filterDistrict, selectedDistrictSet]);

  const summary = useMemo(() => {
    const totalCalibratedMC = filteredEntries
      .filter((e) => e.typeOfSample === "Weighing Scale")
      .reduce((sum, e) => sum + toNumber(e.noOfSample), 0);

    const totalCalibratedVC = filteredEntries
      .filter((e) => e.typeOfSample === "Bucket")
      .reduce((sum, e) => sum + toNumber(e.noOfSample), 0);

    const totalIncomeGenerated = filteredEntries
      .filter((e) => e.category === "PAYING")
      .reduce((sum, e) => sum + toNumber(e.feesCollected), 0);

    const totalAmountAssistance = filteredEntries
      .filter((e) => e.category === "NON-PAYING")
      .reduce((sum, e) => sum + toNumber(e.cost), 0);

    const totalCustomersAll = filteredEntries
      .reduce((sum, e) => sum + toNumber(e.totalCustomers), 0);

    return {
      totalCalibratedMC,
      totalCalibratedVC,
      totalIncomeGenerated,
      totalAmountAssistance,
      totalCustomersAll,
    };
  }, [filteredEntries]);

  const viewEntry = useMemo(() => {
    if (!showViewId) return null;
    return entries.find((e) => e.id === showViewId) || null;
  }, [showViewId, entries]);

  function resetForm() {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      date: new Date().toISOString().slice(0, 10),
      mcBreakdown: [makeMCBreakdownRow()],
    });
  }

  function openAddEntry() {
    if (!allowAdd) {
      alert("You do not have permission to add Calibration entries.");
      return;
    }

    resetForm();
    setShowAdd(true);
  }

  function openEditEntry(entry) {
    if (!allowEdit) {
      alert("You do not have permission to edit Calibration entries.");
      return;
    }

    setEditingId(entry.id);
    setForm({
      ...EMPTY_FORM,
      ...entry,
      mcBreakdown:
        entry.typeOfSample === "Weighing Scale"
          ? (Array.isArray(entry.mcBreakdown) && entry.mcBreakdown.length
            ? entry.mcBreakdown.map((r) => ({ ...r, id: r.id || uid(), autoFilled: Boolean(r.autoFilled) }))
            : [makeMCBreakdownRow()])
          : [makeMCBreakdownRow()],
      date: entry.date || new Date().toISOString().slice(0, 10),
    });
    setShowAdd(true);
  }

  function updateForm(key, value) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };

      if (key === "typeOfSample") {
        if (value === "Weighing Scale") {
          next.testType = "Mass Calibration";
          next.range = "";
          if (!Array.isArray(next.mcBreakdown) || !next.mcBreakdown.length) {
            next.mcBreakdown = [makeMCBreakdownRow()];
          }
          const totals = computeMCBreakdownTotals(next.mcBreakdown, next.category);
          next.noOfSample = String(totals.totalSamples || "");
          next.feesCollected = String(totals.totalFees || "");
          next.cost = "";
        } else if (value === "Bucket") {
          next.testType = "Volume Calibration";
          next.mcBreakdown = [makeMCBreakdownRow()];
          next.range = "";
          next.noOfSample = "";
          next.cost = "";
          next.feesCollected = "";
        }
      }


      if (key === "female" || key === "male") {
        const female = key === "female" ? toNumber(value) : toNumber(next.female);
        const male = key === "male" ? toNumber(value) : toNumber(next.male);
        const total = female + male;
        next.totalCustomers = String(total || "");
        next.noOfFirms = String(total || "");
      }

      if (next.typeOfSample === "Bucket" && (key === "cost" || key === "noOfSample" || key === "category")) {
        const cost = key === "cost" ? toNumber(value) : toNumber(next.cost);
        const noOfSample = key === "noOfSample" ? toNumber(value) : toNumber(next.noOfSample);
        const category = key === "category" ? value : next.category;
        next.feesCollected = category === "PAYING" ? String(cost * noOfSample || "") : "";
      }

      if (key === "category" && next.typeOfSample === "Weighing Scale") {
        const totals = computeMCBreakdownTotals(next.mcBreakdown, value);
        next.noOfSample = String(totals.totalSamples || "");
        next.feesCollected = String(totals.totalFees || "");
      }

      return next;
    });
  }

  function updateMCBreakdownRow(rowId, key, value) {
    setForm((prev) => {
      const rows = [...(prev.mcBreakdown || [])];
      const currentIndex = rows.findIndex((row) => row.id === rowId);

      const updatedRows = rows.map((row) => {
        if (row.id !== rowId) return row;

        const nextRow = {
          ...row,
          [key]: value,
          autoFilled: key === "noOfSample" ? false : row.autoFilled,
        };

        nextRow.feesCollected =
          prev.category === "PAYING"
            ? String(toNumber(nextRow.noOfSample) * toNumber(nextRow.cost) || "")
            : "";

        return nextRow;
      });

      if (key === "noOfSample" && currentIndex >= 0 && currentIndex < updatedRows.length - 1) {
        const nextIndex = currentIndex + 1;
        const nextRow = updatedRows[nextIndex];

        if (
          nextRow &&
          (nextRow.autoFilled ||
            String(nextRow.noOfSample || "").trim() === "" ||
            toNumber(nextRow.noOfSample) === 0)
        ) {
          const usedWithoutNext = updatedRows.reduce((sum, row, idx) => {
            if (idx === nextIndex) return sum;
            return sum + toNumber(row.noOfSample);
          }, 0);

          const remainingForNext = Math.max(0, toNumber(prev.noOfSample) - usedWithoutNext);

          updatedRows[nextIndex] = {
            ...nextRow,
            noOfSample: remainingForNext ? String(remainingForNext) : "",
            autoFilled: true,
            feesCollected:
              prev.category === "PAYING"
                ? String(remainingForNext * toNumber(nextRow.cost) || "")
                : "",
          };
        }
      }

      const totalFees =
        prev.category === "PAYING"
          ? updatedRows.reduce(
            (sum, r) => sum + toNumber(r.noOfSample) * toNumber(r.cost),
            0
          )
          : 0;

      return {
        ...prev,
        mcBreakdown: updatedRows,
        feesCollected: String(totalFees || ""),
      };
    });
  }

  function addMCBreakdownRow() {
    setForm((prev) => {
      const currentTotal = (prev.mcBreakdown || []).reduce((sum, r) => sum + toNumber(r.noOfSample), 0);
      const remaining = Math.max(0, toNumber(prev.noOfSample) - currentTotal);
      return {
        ...prev,
        mcBreakdown: [
          ...(prev.mcBreakdown || []),
          makeMCBreakdownRow(remaining ? String(remaining) : "", true),
        ],
      };
    });
  }

  function removeMCBreakdownRow(rowId) {
    setForm((prev) => {
      const remaining = (prev.mcBreakdown || []).filter((row) => row.id !== rowId);
      const rows = remaining.length ? remaining : [makeMCBreakdownRow()];
      const totals = computeMCBreakdownTotals(rows, prev.category);
      return {
        ...prev,
        mcBreakdown: rows,
        noOfSample: String(totals.totalSamples || ""),
        feesCollected: String(totals.totalFees || ""),
      };
    });
  }


  const cleanCalibrationCustomLabel = (value) =>
    String(value || "")
      .replace(/^#+/, "")
      .replace(/_/g, " ")
      .trim()
      .replace(/\b\w/g, (m) => m.toUpperCase());

  const parseCalibrationCustomValues = (record = {}) => {
    const raw = record?.customFields || record?.custom_fields || {};
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw || "{}");
      } catch {
        return {};
      }
    }
    return raw || {};
  };

  const getCalibrationCustomPairs = (record = {}) => {
    const values = parseCalibrationCustomValues(record);

    return (calibrationCustomFields || []).map((field) => {
      const key = field.fieldKey || field.field_key || field.key;
      const rawLabel = field.fieldLabel || field.field_label || field.label || key;
      const value = values?.[key];

      return {
        key,
        label: cleanCalibrationCustomLabel(rawLabel),
        value: value === null || value === undefined || value === "" ? "—" : String(value),
      };
    });
  };

  const renderCalibrationCustomInputs = () => {
    if (!calibrationCustomFields.length) return null;

    return (
      <>
        {calibrationCustomFields.map((field) => {
          const key = field.fieldKey || field.field_key || field.key;
          const rawLabel = field.fieldLabel || field.field_label || field.label || key;
          const label = cleanCalibrationCustomLabel(rawLabel);
          const type = String(field.fieldType || field.field_type || field.type || "Text").toLowerCase();
          const required = Boolean(field.isRequired ?? field.is_required ?? field.required ?? false);

          const commonProps = {
            value: form.customFields?.[key] || "",
            onChange: (e) =>
              setForm((prev) => ({
                ...prev,
                customFields: { ...(prev.customFields || {}), [key]: e.target.value },
              })),
            placeholder: `Enter ${label}`,
          };

          return (
            <div key={key} style={{ ...styles.field, gridColumn: "1 / span 2" }}>
              <div style={styles.label}>
                {label}
                {required ? <span style={styles.req}>*</span> : null}
              </div>

              {type.includes("textarea") ? (
                <textarea
                  style={styles.textarea}
                  {...commonProps}
                />
              ) : (
                <input
                  style={styles.input}
                  type={type.includes("number") || type.includes("currency") ? "number" : "text"}
                  {...commonProps}
                />
              )}
            </div>
          );
        })}
      </>
    );
  };

  const renderCalibrationCustomViewFields = (record) => {
    const pairs = getCalibrationCustomPairs(record);
    if (!pairs.length) return null;

    return pairs.map((item) => (
      <div key={`calibration-custom-view-${item.key}`} style={{ gridColumn: "1 / span 2" }}>
        <b>{item.label}:</b> {item.value}
      </div>
    ));
  };
  function validateForm() {
    if (!form.category) return alert("Required: Category"), false;
    if (!form.date) return alert("Required: Date"), false;
    if (!form.typeOfSample) return alert("Required: Type of Samples"), false;

    if (!String(form.noOfSample).trim() || toNumber(form.noOfSample) <= 0) return alert("Required: No. of Sample"), false;

    if (form.typeOfSample === "Weighing Scale") {
      const validRows = (form.mcBreakdown || []).filter((r) => r.range || toNumber(r.noOfSample) > 0 || toNumber(r.cost) > 0);
      if (!validRows.length) return alert("Add at least one MC breakdown row."), false;
      const breakdownTotal = validRows.reduce((sum, r) => sum + toNumber(r.noOfSample), 0);
      if (breakdownTotal > toNumber(form.noOfSample)) {
        return alert("MC breakdown total cannot be greater than the main No. of Sample."), false;
      }
      for (const row of validRows) {
        if (!row.range) return alert("Each MC breakdown row needs a range."), false;
        if (toNumber(row.noOfSample) <= 0) return alert("Each MC breakdown row needs no. of sample."), false;
        if (form.category === "PAYING" && toNumber(row.cost) <= 0) return alert("Each MC breakdown row needs cost for PAYING."), false;
      }
      if (breakdownTotal !== toNumber(form.noOfSample)) {
        return alert("MC breakdown total samples must match the main No. of Sample."), false;
      }
    } else {
      if (!String(form.noOfSample).trim() || toNumber(form.noOfSample) <= 0) return alert("Required: No. of Sample"), false;
      if (form.category === "PAYING" && toNumber(form.cost) <= 0) return alert("Required: Cost for PAYING entry"), false;
    }

    if (!form.address.trim()) return alert("Required: Address"), false;
    return true;
  }

  async function saveEntry() {
    if (editingId && !allowEdit) {
      alert("You do not have permission to edit Calibration entries.");
      return;
    }

    if (!editingId && !allowAdd) {
      alert("You do not have permission to add Calibration entries.");
      return;
    }

    if (!validateForm()) return;

    let payload = {
      ...form,
      id: editingId || uid(),
      female: toNumber(form.female),
      male: toNumber(form.male),
      totalCustomers: toNumber(form.totalCustomers),
      noOfFirms: toNumber(form.noOfFirms),
      noOfNewFirms: toNumber(form.noOfNewFirms),
      pwd: toNumber(form.pwd),
      ip: toNumber(form.ip),
      sc: toNumber(form.sc),
      fourPs: toNumber(form.fourPs),
      custom_fields: form.customFields || {},
      customFields: form.customFields || {},
    };

    if (form.typeOfSample === "Weighing Scale") {
      const cleanRows = (form.mcBreakdown || [])
        .filter((r) => r.range && toNumber(r.noOfSample) > 0)
        .map((r) => ({
          id: r.id || uid(),
          range: r.range,
          noOfSample: toNumber(r.noOfSample),
          cost: toNumber(r.cost),
          feesCollected: form.category === "PAYING" ? toNumber(r.noOfSample) * toNumber(r.cost) : 0,
          autoFilled: Boolean(r.autoFilled),
        }));

      const totals = computeMCBreakdownTotals(cleanRows, form.category);

      payload = {
        ...payload,
        mcBreakdown: cleanRows,
        range: "",
        noOfSample: toNumber(form.noOfSample),
        cost: 0,
        feesCollected: form.category === "PAYING" ? totals.totalFees : 0,
      };
    } else {
      payload = {
        ...payload,
        mcBreakdown: [],
        noOfSample: toNumber(form.noOfSample),
        cost: toNumber(form.cost),
        feesCollected: form.category === "PAYING" ? toNumber(form.feesCollected) : 0,
      };
    }

    try {
      const cleanPayload = sanitizeEntry(payload);

      console.log("[CALIBRATION SAVE] mode:", editingId ? "update" : "create");
      console.log("[CALIBRATION SAVE] endpoint:", editingId ? `${CALIBRATION_API_URL}/${editingId}` : CALIBRATION_API_URL);
      console.log("[CALIBRATION SAVE] payload:", cleanPayload);

      if (editingId) {
        await axios.put(`${CALIBRATION_API_URL}/${editingId}`, cleanPayload);
      } else {
        await axios.post(CALIBRATION_API_URL, cleanPayload);
      }

      await loadEntries();
      setShowAdd(false);
      resetForm();
    } catch (error) {
      const responseData = error?.response?.data;
      const message = formatCalibrationApiError(error);

      console.error("Failed to save calibration entry", error);
      console.error("[CALIBRATION SAVE] response data:", responseData);
      console.error("[CALIBRATION SAVE] payload used:", payload);

      alert(message);
    }
  }

  async function deleteEntry(id) {
    if (!allowDelete) {
      alert("You do not have permission to delete Calibration entries.");
      return;
    }

    if (!(await requestDeleteConfirm("Delete this calibration entry?"))) return;

    try {
      await axios.delete(`${CALIBRATION_API_URL}/${id}`);
      await loadEntries();
    } catch (error) {
      const message = error?.response?.data?.message || error?.response?.data?.sqlMessage || error?.message || "Failed to delete calibration entry.";
      console.error("Failed to delete calibration entry", error);
      console.error("[CALIBRATION DELETE] response data:", error?.response?.data);
      alert(message);
    }
  }

  function openAddressModal() {
    setAddressFlowOpen(true);
  }

  function applyAddressMetaToForm(meta) {
    setForm((prev) => ({
      ...prev,
      barangay: meta?.barangay || "",
      address: meta?.displayText || "",
      addressMeta: meta || null,
    }));
  }


  function csvEscape(value) {
    const text = String(value ?? "");
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }



  const buildCalibrationExportRows = (rows = []) =>
    (Array.isArray(rows) ? rows : []).map((entry, index) => ({
      "No.": index + 1,
      "Category": entry?.category || "",
      "Date": entry?.date || "",
      "Type of Samples": entry?.typeOfSample || "",
      "Type of Test / Analysis / Calibration": entry?.testType || "",
      "Range": formatRangeDisplay(entry),
      "No. of Sample": entry?.noOfSample || "",
      "Cost": money(entry?.cost),
      "Fees Collected (PHP)": money(entry?.feesCollected),
      "Venue/Address": entry?.address || "",
      "Female": entry?.female || "",
      "Male": entry?.male || "",
      "Total Customers": entry?.totalCustomers || "",
      "No. of Firms": entry?.noOfFirms || "",
      "No. of New Firms": entry?.noOfNewFirms || "",
      "Age Range": entry?.ageRange || "",
      "PWD": entry?.pwd || "",
      "IP": entry?.ip || "",
      "Senior Citizen": entry?.sc || "",
      "4Ps": entry?.fourPs || "",
      "Name of Staff": entry?.nameOfStaff || "",
      "Remarks": entry?.remarks || "",
    }));

  function exportEntriesCSV(rows, filename = "Calibration.csv") {
    const headers = ["NO", "CATEGORY", "DATE", "TYPE OF SAMPLES", "TYPE OF TEST / ANALYSIS / CALIBRATION", "RANGE", "NO. OF SAMPLE", "COST", "FEES COLLECTED", "VENUE/ADDRESS", "MUNICIPALITY", "BARANGAY", "LAT", "LNG", "FEMALE", "MALE", "TOTAL CUSTOMERS", "NO. OF FIRMS", "NO. OF NEW FIRMS", "AGE RANGE", "PWD", "IP", "SENIOR CITIZEN", "4PS", "NAME OF STAFF", "REMARKS"];
    const lines = [headers.join(","), ...(rows || []).map((entry, index) => [index + 1, entry?.category || "", entry?.date || "", entry?.typeOfSample || "", entry?.testType || "", formatRangeDisplay(entry), toNumber(entry?.noOfSample), formatCostDisplay(entry), money(entry?.feesCollected), entry?.address || "", deriveMunicipalityFromEntry(entry), entry?.barangay || entry?.addressMeta?.barangay || "", Number.isFinite(entry?.addressMeta?.lat) ? entry.addressMeta.lat : "", Number.isFinite(entry?.addressMeta?.lng) ? entry.addressMeta.lng : "", toNumber(entry?.female), toNumber(entry?.male), toNumber(entry?.totalCustomers), toNumber(entry?.noOfFirms), toNumber(entry?.noOfNewFirms), entry?.ageRange || "", toNumber(entry?.pwd), toNumber(entry?.ip), toNumber(entry?.sc), toNumber(entry?.fourPs), entry?.nameOfStaff || "", entry?.remarks || ""].map(csvEscape).join(","))];
    downloadBlob(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" }), filename);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function printEntries(rows, title = "Calibration Report") {
    const printableRows = Array.isArray(rows) ? rows : [];
    if (!printableRows.length) return alert("No rows to print.");
    const bodyRows = printableRows.map((entry, index) => `
      <tr><td>${index + 1}</td><td>${escapeHtml(entry?.category || "")}</td><td>${escapeHtml(entry?.date || "")}</td><td>${escapeHtml(entry?.typeOfSample || "")}</td><td>${escapeHtml(entry?.testType || "")}</td><td>${escapeHtml(formatRangeDisplay(entry))}</td><td>${escapeHtml(toNumber(entry?.noOfSample))}</td><td>${escapeHtml(formatCostDisplay(entry))}</td><td>${escapeHtml(money(entry?.feesCollected))}</td><td>${escapeHtml(entry?.address || "")}</td><td>${escapeHtml(toNumber(entry?.female))}</td><td>${escapeHtml(toNumber(entry?.male))}</td><td>${escapeHtml(toNumber(entry?.totalCustomers))}</td><td>${escapeHtml(entry?.nameOfStaff || "")}</td><td>${escapeHtml(entry?.remarks || "")}</td></tr>
    `).join("");
    const win = window.open("", "_blank", "width=1200,height=900");
    if (!win) return alert("Popup blocked. Please allow popups for printing.");
    win.document.open();
    win.document.write(`<!doctype html><html><head><meta charset="utf-8" /><title>${escapeHtml(title)}</title><style>@page{size:Legal landscape;margin:10mm}body{font-family:Arial,sans-serif;color:#0f172a}h1{font-size:18px;margin:0 0 8px}.meta{font-size:11px;margin-bottom:10px;font-weight:700}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #64748b;padding:5px;font-size:9px;vertical-align:top;word-break:break-word}th{background:#eef2f6;font-weight:900;text-align:center}</style></head><body><h1>${escapeHtml(title)}</h1><div class="meta">Rows: ${printableRows.length}</div><table><thead><tr><th>No.</th><th>Category</th><th>Date</th><th>Type of Samples</th><th>Test Type</th><th>Range</th><th>No. of Sample</th><th>Cost</th><th>Fees Collected</th><th>Venue/Address</th><th>Female</th><th>Male</th><th>Total Customers</th><th>Name of Staff</th><th>Remarks</th></tr></thead><tbody>${bodyRows}</tbody></table><script>window.onload=function(){setTimeout(function(){window.print();},250);};</script></body></html>`);
    win.document.close();
    win.focus();
  }



  const OUTPUT_LAYOUT_LABEL = {
    FORM: "Form-Based Record Sheet",
    TABLE: "Table Layout",
    COMPACT: "Compact Summary",
  };

  const OUTPUT_PRESET_LABEL = {
    a4: "A4",
    letter: "Letter",
    legal: "Legal",
    custom: "Custom",
  };

  const getCALIBRATIONOutputLabel = (row) => row?.typeOfSample || row?.date || row?.id || "Record";

  const ensureCALIBRATIONOutputRows = (rows = []) => {
    const clean = Array.isArray(rows) ? rows : [];
    if (clean.length) return clean;
    return [{ "No.": "", Template: "No records found for the current filter." }];
  };

  const downloadCALIBRATIONBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const sanitizeCALIBRATIONFilename = (value = "CALIBRATION") =>
    String(value || "CALIBRATION").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "CALIBRATION";

  const getCALIBRATIONRowsForOutput = async (scope, entryId) => {
    if (scope === "row") {
      const row = entries.find((p) => String(p.id) === String(entryId));
      return row ? [row] : [];
    }
    const rows = filteredEntries;
    return Array.isArray(rows) ? rows : [];
  };

  const buildCALIBRATIONObjectRowsForOutput = (sourceRows = []) =>
    ensureCALIBRATIONOutputRows(buildCalibrationExportRows(sourceRows));

  const exportCALIBRATIONCSV = (objectRows, filename) => {
    const rows = ensureCALIBRATIONOutputRows(objectRows);
    const headers = Object.keys(rows[0] || { "No.": "" });
    const csvEscape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [
      headers.map(csvEscape).join(","),
      ...rows.map((row) => headers.map((h) => csvEscape(row[h])).join(",")),
    ].join("\n");
    downloadCALIBRATIONBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename);
  };

  const exportCALIBRATIONExcel = (objectRows, filename) => {
    const rows = ensureCALIBRATIONOutputRows(objectRows);
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CALIBRATION");
    XLSX.writeFile(wb, filename);
  };

  const exportCALIBRATIONPDF = async (objectRows, options = {}) => {
    const rows = ensureCALIBRATIONOutputRows(objectRows);
    const headers = Object.keys(rows[0] || { "No.": "" });
    const orientation = options.orientation || "landscape";
    const preset = options.preset === "custom" ? [Number(options.customSize?.width || 8.5) * 72, Number(options.customSize?.height || 13) * 72] : (options.preset || "a4");
    const doc = new jsPDF({ orientation, unit: "pt", format: preset });
    doc.setFontSize(14);
    doc.text(options.titleLabel || "CALIBRATION Export", 32, 32);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 32, 48);
    autoTable(doc, {
      head: [headers],
      body: rows.map((row) => headers.map((h) => String(row[h] ?? ""))),
      startY: 62,
      styles: { fontSize: 7, cellPadding: 3, overflow: "linebreak" },
      headStyles: { fillColor: [11, 78, 162] },
    });
    doc.save(options.filename || "CALIBRATION.pdf");
  };

  const exportCALIBRATIONDOCX = async (objectRows, options = {}) => {
    const rows = ensureCALIBRATIONOutputRows(objectRows);
    const headers = Object.keys(rows[0] || { "No.": "" });
    const tableRows = [
      new DocxTableRow({ children: headers.map((h) => new DocxTableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })] })) }),
      ...rows.map((row) => new DocxTableRow({
        children: headers.map((h) => new DocxTableCell({ children: [new Paragraph(String(row[h] ?? ""))] })),
      })),
    ];
    const doc = new Document({
      sections: [{
        properties: { page: { size: { orientation: options.orientation === "portrait" ? PageOrientation.PORTRAIT : PageOrientation.LANDSCAPE } } },
        children: [
          new Paragraph({ children: [new TextRun({ text: "CALIBRATION Export", bold: true, size: 28 })] }),
          new Paragraph(`Generated: ${new Date().toLocaleString()}`),
          new DocxTable({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
        ],
      }],
    });
    const blob = await Packer.toBlob(doc);
    downloadCALIBRATIONBlob(blob, options.filename || "CALIBRATION.docx");
  };

  const buildCALIBRATIONPrintHtml = (objectRows, options = {}) => {
    const rows = ensureCALIBRATIONOutputRows(objectRows);
    const headers = Object.keys(rows[0] || { "No.": "" });
    const orientation = options.orientation || "landscape";
    const presetLabel = OUTPUT_PRESET_LABEL[options.preset] || "A4";
    const customSize = options.preset === "custom" ? `${options.customSize?.width || 8.5}in ${options.customSize?.height || 13}in` : presetLabel;
    const layout = options.layoutKey || "FORM";
    const escape = (v) => escapeHtml(String(v ?? ""));
    const table = `<table><thead><tr>${headers.map((h) => `<th>${escape(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${headers.map((h) => `<td>${escape(row[h]) || "&nbsp;"}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    const compact = rows.map((row, idx) => `<div class="compact-card"><b>Record ${idx + 1}</b>${headers.map((h) => `<div><b>${escape(h)}:</b> ${escape(row[h]) || "—"}</div>`).join("")}</div>`).join("");
    return `<!doctype html><html><head><meta charset="utf-8" /><title>${escape(options.titleLabel || "CALIBRATION Print")}</title><style>
      @page { size: ${customSize} ${orientation}; margin: 10mm; }
      * { box-sizing: border-box; } body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; padding: 12px; }
      h1 { margin: 0 0 4px; font-size: 18px; } .sub { font-size: 11px; color: #475569; font-weight: 700; margin-bottom: 10px; }
      table { width: 100%; border-collapse: collapse; font-size: 9px; table-layout: fixed; } th, td { border: 1px solid #64748b; padding: 5px; vertical-align: top; word-break: break-word; } th { background: #eef2f6; font-weight: 900; }
      .compact-card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; margin-bottom: 8px; font-size: 12px; }
      .tip { margin: 0 0 10px; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 10px; background: #f8fafc; font-weight: 800; font-size: 12px; }
      @media print { .no-print { display:none!important; } body { padding:0; } }
    </style></head><body><div class="tip no-print">Tip: If the Print dialog did not open automatically, press <b>Ctrl+P</b>.</div><h1>${escape(options.titleLabel || "CALIBRATION Print")}</h1><div class="sub">${escape(OUTPUT_LAYOUT_LABEL[layout] || "Print")} • Records: ${rows.length} • Generated: ${escape(new Date().toLocaleString())}</div>${layout === "COMPACT" ? compact : table}<script>window.addEventListener('load',function(){setTimeout(function(){try{window.print();}catch(e){}},250);});</script></body></html>`;
  };

  const doCALIBRATIONPrint = (objectRows, options = {}) => {
    const win = window.open("", "_blank", "width=1200,height=800");
    if (!win) return alert("Popup blocked. Please allow popups for printing.");
    win.document.open();
    win.document.write(buildCALIBRATIONPrintHtml(objectRows, options));
    win.document.close();
  };

  const openCALIBRATIONPrintPopupRow = (entryId) => {
    if (!allowExport) {
      alert("You do not have permission to print Calibration records.");
      return;
    }

    setPrintModal({ open: true, scope: "row", entryId, layout: "FORM", preset: "a4", orientation: "landscape", customSize: { width: 8.5, height: 13 } });
  };

  const openCALIBRATIONPrintPopupBulk = () => {
    if (!allowExport) {
      alert("You do not have permission to print Calibration records.");
      return;
    }

    setPrintModal({ open: true, scope: "bulk", entryId: null, layout: "FORM", preset: "a4", orientation: "landscape", customSize: { width: 8.5, height: 13 } });
  };

  const openCALIBRATIONExportPopupRow = (entryId) => {
    if (!allowExport) {
      alert("You do not have permission to export Calibration records.");
      return;
    }

    setExportModal({ open: true, scope: "row", entryId, format: "excel", template: "TABLE", preset: "a4", orientation: "landscape", customSize: { width: 8.5, height: 13 } });
  };

  const openCALIBRATIONExportPopupBulk = () => {
    if (!allowExport) {
      alert("You do not have permission to export Calibration records.");
      return;
    }

    setExportModal({ open: true, scope: "bulk", entryId: null, format: "excel", template: "TABLE", preset: "a4", orientation: "landscape", customSize: { width: 8.5, height: 13 } });
  };

  const confirmCALIBRATIONPrint = async () => {
    if (!allowExport) {
      alert("You do not have permission to print Calibration records.");
      return;
    }

    const sourceRows = await getCALIBRATIONRowsForOutput(printModal.scope, printModal.entryId);
    const objectRows = buildCALIBRATIONObjectRowsForOutput(sourceRows);
    const titleLabel = printModal.scope === "row"
      ? `Print — ${getCALIBRATIONOutputLabel(sourceRows[0]) || "Record"}`
      : `Print — Filtered Rows (${objectRows.length})`;
    doCALIBRATIONPrint(objectRows, { layoutKey: printModal.layout, preset: printModal.preset, orientation: printModal.orientation, customSize: printModal.customSize, titleLabel });
    setPrintModal((p) => ({ ...p, open: false }));
  };

  const confirmCALIBRATIONExport = async () => {
    if (!allowExport) {
      alert("You do not have permission to export Calibration records.");
      return;
    }

    const sourceRows = await getCALIBRATIONRowsForOutput(exportModal.scope, exportModal.entryId);
    const objectRows = buildCALIBRATIONObjectRowsForOutput(sourceRows);
    const baseName = exportModal.scope === "row"
      ? sanitizeCALIBRATIONFilename(`CALIBRATION_${getCALIBRATIONOutputLabel(sourceRows[0]) || "record"}`)
      : sanitizeCALIBRATIONFilename(`CALIBRATION_Filtered_Rows`);
    if (exportModal.format === "csv") exportCALIBRATIONCSV(objectRows, `${baseName}.csv`);
    else if (exportModal.format === "excel") exportCALIBRATIONExcel(objectRows, `${baseName}.xlsx`);
    else if (exportModal.format === "pdf") await exportCALIBRATIONPDF(objectRows, { template: exportModal.template, preset: exportModal.preset, orientation: exportModal.orientation, customSize: exportModal.customSize, titleLabel: exportModal.scope === "row" ? `Export PDF — ${getCALIBRATIONOutputLabel(sourceRows[0]) || "Record"}` : `Export PDF — Filtered (${objectRows.length})`, filename: `${baseName}.pdf` });
    else if (exportModal.format === "docx") await exportCALIBRATIONDOCX(objectRows, { orientation: exportModal.orientation, filename: `${baseName}.docx` });
    setExportModal((p) => ({ ...p, open: false }));
  };

  function exportFilteredEntries() {
    if (!allowExport) {
      alert("You do not have permission to export Calibration records.");
      return;
    }

    if (!filteredEntries.length) return alert("No rows to export.");
    exportEntriesCSV(filteredEntries, "Calibration_Filtered.csv");
  }

  function printFilteredEntries() {
    if (!allowExport) {
      alert("You do not have permission to print Calibration records.");
      return;
    }

    printEntries(filteredEntries, "Calibration Filtered Report");
  }

  function exportSingleEntry(entry) {
    if (!allowExport) {
      alert("You do not have permission to export Calibration records.");
      return;
    }

    if (!entry) return;
    exportEntriesCSV([entry], `Calibration_${entry?.date || "entry"}.csv`);
  }

  function printSingleEntry(entry) {
    if (!allowExport) {
      alert("You do not have permission to print Calibration records.");
      return;
    }

    if (!entry) return;
    printEntries([entry], `Calibration Entry — ${entry?.date || "Record"}`);
  }

  const pangasinanOutlineStyle = () => ({
    color: "#0b4ea2",
    weight: 4,
    opacity: 1,
    fillOpacity: 0.1,
    fillColor: "#93c5fd",
  });

  const maskPathOptions = {
    color: "transparent",
    weight: 0,
    fillColor: "#ffffff",
    fillOpacity: 1,
  };

  function mapStyleByFeature(feature) {
    const name = String(detectMunicipalityName(feature) || "");

    if (mapViewMode === "municipality") {
      const active = filterMunicipality !== "ALL" && name === filterMunicipality;
      return {
        color: active ? "#16a34a" : "#475569",
        weight: active ? 4 : 1,
        opacity: 1,
        fillOpacity: active ? 0.12 : 0.02,
      };
    }

    const inDistrict = filterDistrict !== "ALL" ? selectedDistrictSet.has(name) : false;
    return {
      color: filterDistrict !== "ALL" ? (inDistrict ? "#f59e0b" : "transparent") : "#475569",
      weight: filterDistrict !== "ALL" ? (inDistrict ? 3 : 0) : 1,
      opacity: 1,
      fillOpacity: filterDistrict !== "ALL" ? (inDistrict ? 0.1 : 0) : 0.02,
    };
  }

  function onEachMunicipality(feature, layer) {
    const name = String(detectMunicipalityName(feature) || "");
    if (name) layer.bindTooltip(name, { sticky: true });

    layer.on("click", () => {
      if (mapViewMode === "municipality") setFilterMunicipality(name);
      if (mapViewMode === "district") {
        const found = PANGASINAN_DISTRICTS.find((d) => d.municipalities.includes(name));
        if (found) setFilterDistrict(found.id);
      }
    });
  };

  const styles = {
    page: {
      padding: 10,
      position: "relative",
      fontFamily,
      background: "#f5f6fa",
      minHeight: "100vh",
    },
    actionBar: {
      position: "sticky",
      top: 0,
      zIndex: 999,
      background: "#f5f6fa",
      paddingTop: 8,
      paddingBottom: 8,
    },
    titleBar: {
      background: "#2f6fd6",
      color: "#fff",
      fontWeight: 900,
      padding: "12px 16px",
      letterSpacing: 0.4,
      fontSize: 22,
      borderRadius: 6,
      fontFamily,
    },
    card: {
      marginTop: 10,
      padding: 0,
      background: "transparent",
    },
    sectionTitleRow: {
      marginTop: 14,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      flexWrap: "nowrap",
      overflowX: "auto",
      whiteSpace: "nowrap",
      fontFamily,
    },
    sectionTitle: {
      fontWeight: 900,
      fontSize: 13,
      color: "#0f172a",
      whiteSpace: "nowrap",
      flex: "0 0 auto",
      fontFamily,
    },
    sectionTitleRight: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexWrap: "nowrap",
      whiteSpace: "nowrap",
      marginLeft: "auto",
      flex: "0 0 auto",
      fontFamily,
    },
    toolbarRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      flexWrap: "nowrap",
      whiteSpace: "nowrap",
      marginTop: 0,
      marginBottom: 0,
      fontFamily,
    },
    toolbarLeft: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexWrap: "nowrap",
      whiteSpace: "nowrap",
      fontFamily,
    },
    toolbarRight: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexWrap: "nowrap",
      whiteSpace: "nowrap",
      marginLeft: "auto",
      fontFamily,
    },
    toolbarSelect: {
      height: 34,
      minWidth: 120,
      padding: "0 12px",
      borderRadius: 10,
      border: "1px solid #cbd5e1",
      background: "#fff",
      fontSize: 12,
      fontWeight: 700,
      outline: "none",
      cursor: "pointer",
      boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
      fontFamily,
    },
    toolbarBtn: {
      height: 34,
      minWidth: 96,
      padding: "0 12px",
      borderRadius: 10,
      border: "1px solid #cbd5e1",
      background: "#fff",
      fontSize: 12,
      fontWeight: 700,
      cursor: "pointer",
      boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
      fontFamily,
    },
    toolbarAddBtn: {
      height: 34,
      minWidth: 96,
      padding: "0 12px",
      borderRadius: 10,
      border: "1px solid #cbd5e1",
      background: "#fff",
      color: "#111827",
      fontSize: 12,
      fontWeight: 700,
      cursor: "pointer",
      boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
      fontFamily,
    },
    toolbarCount: {
      fontSize: 12,
      fontWeight: 800,
      color: "#334155",
      whiteSpace: "nowrap",
      fontFamily,
    },
    addBtn: {
      border: "1px solid rgba(15, 23, 42, 0.18)",
      background: "#fff",
      padding: "8px 12px",
      borderRadius: 12,
      cursor: "pointer",
      fontWeight: 800,
      fontSize: 12,
      fontFamily,
      boxShadow: "0 2px 0 rgba(2,6,23,0.06)",
      whiteSpace: "nowrap",
    },
    selectSm: {
      padding: "8px 10px",
      borderRadius: 10,
      border: "1px solid #cbd5e1",
      background: "#fff",
      fontWeight: 900,
      fontFamily,
      fontSize: 12,
      minWidth: 150,
    },
    field: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      minWidth: 110,
    },
    label: {
      fontSize: 12,
      fontWeight: 900,
      color: "#0f172a",
      fontFamily,
    },
    req: {
      color: "#dc2626",
      marginLeft: 2,
    },
    input: {
      padding: "8px 10px",
      border: "1px solid #cbd5e1",
      borderRadius: 8,
      fontSize: 13,
      outline: "none",
      fontFamily,
      background: "#fff",
    },
    inputButton: (hasValue) => ({
      padding: "8px 10px",
      border: "1px solid #cbd5e1",
      borderRadius: 8,
      fontSize: 13,
      outline: "none",
      fontFamily,
      textAlign: "left",
      background: "#f8fafc",
      cursor: "pointer",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      fontWeight: hasValue ? 800 : 600,
      width: "100%",
    }),
    textarea: {
      padding: "8px 10px",
      border: "1px solid #cbd5e1",
      borderRadius: 8,
      fontSize: 13,
      outline: "none",
      minHeight: 70,
      resize: "vertical",
      fontFamily,
    },
    pillBtn: {
      border: "1px solid #d1d5db",
      background: "#fff",
      padding: "8px 14px",
      borderRadius: 10,
      cursor: "pointer",
      fontWeight: 900,
      fontSize: 12,
      fontFamily,
      whiteSpace: "nowrap",
      boxShadow: "0 1px 0 rgba(2,6,23,0.03)",
    },
    btnGhost: {
      border: "1px solid #cbd5e1",
      background: "#fff",
      color: "#111827",
      padding: "8px 14px",
      borderRadius: 10,
      cursor: "pointer",
      fontWeight: 900,
      fontSize: 12,
      fontFamily,
      whiteSpace: "nowrap",
    },
    tinyBtn: {
      border: "1px solid rgba(15, 23, 42, 0.18)",
      background: "#fff",
      padding: "4px 8px",
      borderRadius: 8,
      cursor: "pointer",
      fontWeight: 800,
      fontSize: 11,
      fontFamily,
      whiteSpace: "nowrap",
      marginRight: 6,
      marginBottom: 4,
    },
    dangerTiny: {
      border: "1px solid #ef4444",
      background: "#fff",
      color: "#ef4444",
      padding: "4px 8px",
      borderRadius: 8,
      cursor: "pointer",
      fontWeight: 900,
      fontSize: 11,
      fontFamily,
      whiteSpace: "nowrap",
      marginBottom: 4,
    },
    mapCard: {
      marginTop: 10,
      border: "2px solid #6b7280",
      borderRadius: 10,
      overflow: "hidden",
      background: "#fff",
    },
    mapHeader: {
      background: "#eef2f6",
      padding: "10px 12px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      flexWrap: "wrap",
      borderBottom: "2px solid #6b7280",
    },
    mapTitle: { fontWeight: 900, fontSize: 13, color: "#0f172a" },
    mapSub: { fontSize: 12, opacity: 0.8, fontWeight: 700 },
    mapWrapLarge: {
      height: 460,
      width: "100%",
      background: "linear-gradient(135deg, #e0f2fe 0%, #dbeafe 40%, #f0f9ff 100%)",
    },
    filterRow: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 8 },
    filterLabel: { fontSize: 12, fontWeight: 900, opacity: 0.8 },
    select: {
      padding: "8px 10px",
      borderRadius: 10,
      border: "1px solid #cbd5e1",
      background: "#fff",
      fontWeight: 800,
      fontFamily,
      fontSize: 12,
      minWidth: 160,
    },
    tableWrap: {
      marginTop: 8,
      overflowX: "auto",
      border: "1px solid #9ca3af",
      borderRadius: 0,
      background: "#fff",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      fontFamily,
      tableLayout: "fixed",
      background: "#fff",
    },
    th: {
      border: "1px solid #7c8a99",
      padding: "5px 6px",
      background: "#f3f4f6",
      fontSize: 10.5,
      textAlign: "center",
      fontFamily,
      fontWeight: 800,
      whiteSpace: "normal",
      wordBreak: "break-word",
      overflowWrap: "anywhere",
      lineHeight: 1.15,
    },
    td: {
      border: "1px solid #7c8a99",
      padding: "5px 6px",
      fontSize: 10.5,
      fontFamily,
      verticalAlign: "top",
      background: "#fff",
      whiteSpace: "normal",
      wordBreak: "break-word",
      overflowWrap: "anywhere",
      lineHeight: 1.2,
    },
    tdCenter: {
      border: "1px solid #7c8a99",
      padding: "5px 6px",
      fontSize: 10.5,
      textAlign: "center",
      fontFamily,
      verticalAlign: "top",
      background: "#fff",
      whiteSpace: "normal",
      wordBreak: "break-word",
      overflowWrap: "anywhere",
      lineHeight: 1.2,
    },
    tdRight: {
      border: "1px solid #7c8a99",
      padding: "5px 6px",
      fontSize: 10.5,
      textAlign: "right",
      fontFamily,
      verticalAlign: "top",
      background: "#fff",
      whiteSpace: "nowrap",
    },
    tdRightWrap: {
      border: "1px solid #7c8a99",
      padding: "5px 6px",
      fontSize: 10.5,
      textAlign: "right",
      fontFamily,
      verticalAlign: "top",
      background: "#fff",
      whiteSpace: "normal",
      wordBreak: "break-word",
      overflowWrap: "anywhere",
      lineHeight: 1.25,
    },
    breakdownBox: {
      border: "1px solid #cbd5e1",
      borderRadius: 10,
      padding: 10,
      background: "#f8fafc",
      gridColumn: "1 / span 2",
    },
    breakdownRow: {
      display: "grid",
      gridTemplateColumns: "1.2fr 1fr 1fr 1fr auto",
      gap: 8,
      alignItems: "end",
      marginBottom: 8,
    },
    breakdownHead: {
      fontSize: 12,
      fontWeight: 900,
      marginBottom: 8,
      color: "#0f172a",
    },
    breakdownTotals: {
      display: "flex",
      gap: 18,
      flexWrap: "wrap",
      marginTop: 8,
      fontSize: 12,
      fontWeight: 800,
    },
    kpiTable: {
      width: "100%",
      borderCollapse: "collapse",
      tableLayout: "fixed",
      fontFamily,
      background: "#fff",
    },
    kpiTh: {
      border: "1px solid #7c8a99",
      background: "#f3f4f6",
      padding: "5px 7px",
      fontSize: 10.5,
      fontWeight: 800,
      textAlign: "center",
      fontFamily,
      lineHeight: 1.15,
    },
    kpiThQuarter: {
      border: "1px solid #7c8a99",
      background: "#dbead8",
      padding: "5px 7px",
      fontSize: 10.5,
      fontWeight: 800,
      textAlign: "center",
      fontFamily,
      lineHeight: 1.15,
    },
    kpiThAccomp: {
      border: "1px solid #7c8a99",
      background: "#dbe7f6",
      padding: "5px 7px",
      fontSize: 10.5,
      fontWeight: 800,
      textAlign: "center",
      fontFamily,
      lineHeight: 1.15,
    },
    kpiTdLabel: {
      border: "1px solid #7c8a99",
      padding: "5px 7px",
      fontSize: 10.5,
      textAlign: "left",
      fontFamily,
      background: "#fff",
      lineHeight: 1.15,
    },
    kpiTdCenter: {
      border: "1px solid #7c8a99",
      padding: "5px 7px",
      fontSize: 10.5,
      textAlign: "center",
      fontFamily,
      background: "#fff",
      lineHeight: 1.15,
    },
    kpiTdQuarter: {
      border: "1px solid #7c8a99",
      padding: "5px 7px",
      fontSize: 10.5,
      textAlign: "center",
      fontFamily,
      background: "#dbead8",
      lineHeight: 1.15,
    },
    kpiTdAccomp: {
      border: "1px solid #7c8a99",
      padding: "5px 7px",
      fontSize: 10.5,
      textAlign: "center",
      fontFamily,
      background: "#dbe7f6",
      lineHeight: 1.15,
    },
    modalBackdrop: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.42)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      zIndex: 1000,
    },
    modal: {
      width: "min(1020px, 100%)",
      position: "relative",
      zIndex: 1001,
      background: "#fff",
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      fontFamily,
      maxHeight: "92vh",
      overflowY: "auto",
    },
    modalHeader: {
      background: "#0b4ea2",
      color: "#fff",
      padding: "12px 16px",
      fontWeight: 900,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      fontFamily,
      position: "sticky",
      top: 0,
      zIndex: 2,
    },
    closeX: {
      background: "transparent",
      border: "1px solid rgba(255,255,255,0.6)",
      color: "#fff",
      borderRadius: 10,
      padding: "6px 10px",
      cursor: "pointer",
      fontWeight: 900,
      fontFamily,
    },
    modalBody: {
      padding: 16,
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 10,
    },
    modalFooter: {
      padding: 16,
      display: "flex",
      justifyContent: "flex-end",
      gap: 8,
      borderTop: "1px solid #e2e8f0",
    },
    btnDark: {
      background: "#0b5ed7",
      border: "1px solid #0b5ed7",
      color: "#fff",
      padding: "8px 14px",
      borderRadius: 10,
      fontSize: 12,
      fontWeight: 900,
      cursor: "pointer",
      fontFamily,
      whiteSpace: "nowrap",
    },
    mono: {
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    },
    flowShell: {
      width: "min(620px, 100%)",
      position: "relative",
      zIndex: 3201,
      background: "white",
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      fontFamily,
    },
    flowBody: { padding: 14, display: "grid", gap: 10 },
    list: {
      maxHeight: 320,
      overflow: "auto",
      border: "1px solid #e2e8f0",
      borderRadius: 12,
      padding: 6,
    },
    listBtn: {
      width: "100%",
      textAlign: "left",
      padding: "10px 10px",
      borderRadius: 10,
      border: "1px solid transparent",
      background: "transparent",
      cursor: "pointer",
      fontWeight: 800,
      fontFamily,
    },
    listBtnActive: { background: "#e0f2fe", border: "1px solid #38bdf8" },
    tabsRow: { display: "flex", gap: 8, flexWrap: "wrap" },
    tabBtn: (active) => ({
      padding: "8px 10px",
      borderRadius: 999,
      border: active ? "1px solid #0b4ea2" : "1px solid #cbd5e1",
      background: active ? "#dbeafe" : "white",
      cursor: "pointer",
      fontWeight: 900,
      fontSize: 12,
    }),
    mapBox: { height: 340, borderRadius: 12, overflow: "hidden", border: "1px solid #e2e8f0" },
    mapShell: { height: 320, borderRadius: 12, overflow: "hidden", border: "1px solid #e2e8f0", background: "#fff" },
  };

  return (
    <div style={styles.page}>
      <div style={styles.titleBar}>CALIBRATION</div>

      <div style={styles.mapCard}>
        <div style={styles.mapHeader}>
          <div>
            <div style={styles.mapTitle}>PANGASINAN MAP — CALIBRATION PINS</div>
            <div style={styles.mapSub}>
              Pins shown: <b>{pinnedEntries.length}</b> / {paginatedEntries.length} on current page
            </div>

            <div style={styles.filterRow}>
              <span style={styles.filterLabel}>Borders:</span>
              <select
                style={styles.select}
                value={mapViewMode}
                onChange={(e) => {
                  const v = e.target.value;
                  setMapViewMode(v);
                  setFilterMunicipality("ALL");
                  setFilterDistrict("ALL");
                }}
              >
                <option value="municipality">Municipality Borders</option>
                <option value="district">District View (highlight)</option>
              </select>

              {mapViewMode === "municipality" ? (
                <>
                  <span style={styles.filterLabel}>Municipality:</span>
                  <select
                    style={styles.select}
                    value={filterMunicipality}
                    onChange={(e) => setFilterMunicipality(e.target.value)}
                  >
                    <option value="ALL">All Municipalities</option>
                    {municipalityOptions.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </>
              ) : (
                <>
                  <span style={styles.filterLabel}>District:</span>
                  <select
                    style={styles.select}
                    value={filterDistrict}
                    onChange={(e) => setFilterDistrict(e.target.value)}
                  >
                    <option value="ALL">All Districts</option>
                    {PANGASINAN_DISTRICTS.map((d) => (
                      <option key={d.id} value={d.id}>{d.id}</option>
                    ))}
                  </select>
                </>
              )}

              <button
                type="button"
                style={styles.pillBtn}
                onClick={() => {
                  setFilterMunicipality("ALL");
                  setFilterDistrict("ALL");
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        <div style={styles.mapWrapLarge}>
          <MapContainer
            center={[15.9167, 120.3333]}
            zoom={10}
            minZoom={9}
            maxZoom={13}
            attributionControl={false}
            style={{ height: "100%", width: "100%" }}
            zoomControl
          >
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Default (OSM)">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" opacity={0.9} />
              </LayersControl.BaseLayer>

              <LayersControl.BaseLayer name="Satellite (Esri)">
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  attribution="Tiles © Esri"
                  opacity={0.9}
                />
              </LayersControl.BaseLayer>
            </LayersControl>

            <Pane name="maskPane" style={{ zIndex: 300 }} />
            <Pane name="boundaryPane" style={{ zIndex: 500 }} />
            <Pane name="pinPane" style={{ zIndex: 700 }} />

            {maskLatLngs ? <Polygon positions={maskLatLngs} pathOptions={maskPathOptions} pane="maskPane" /> : null}
            {outlineGeoJson?.features?.length ? (
              <GeoJSON data={outlineGeoJson} style={pangasinanOutlineStyle} pane="boundaryPane" />
            ) : null}
            {filteredMunicipalityGeojson?.features?.length ? (
              <GeoJSON
                data={filteredMunicipalityGeojson}
                pane="boundaryPane"
                style={mapStyleByFeature}
                onEachFeature={onEachMunicipality}
              />
            ) : null}

            {pangasinanBounds ? (
              <FitAndLockToPangasinan
                bounds={pangasinanBounds}
                borderMode={mapViewMode}
                selectedMuni={filterMunicipality}
                selectedDist={filterDistrict}
                filteredGeo={filteredMunicipalityGeojson}
              />
            ) : null}

            {pinnedEntries.map((e) => (
              <Marker key={e.id} position={[e.addressMeta.lat, e.addressMeta.lng]} pane="pinPane">
                <Popup>
                  <div style={{ minWidth: 220, fontSize: 12 }}>
                    <div><b>Category:</b> {e.category}</div>
                    <div><b>Type of Samples:</b> {e.typeOfSample}</div>
                    <div><b>Range:</b> {formatRangeDisplay(e)}</div>
                    <div><b>No. of Sample:</b> {toNumber(e.noOfSample)}</div>
                    <div><b>Address:</b> {e.address || "—"}</div>
                    <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button style={styles.tinyBtn} onClick={() => setShowViewId(e.id)}>View</button>
                      <button style={styles.tinyBtn} onClick={() => openGoogleMap(e.addressMeta.lat, e.addressMeta.lng)}>Map</button>
                      <button style={styles.tinyBtn} onClick={() => openGoogleDirections(e.addressMeta.lat, e.addressMeta.lng)}>Directions</button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.actionBar}>
          <div style={styles.sectionTitleRow}>
            <div style={styles.sectionTitle}>
              CALIBRATION TABLE — {filterYear === "ALL" ? "All Years" : `CY ${filterYear}`}
              <span style={{ marginLeft: 10, fontSize: 12, opacity: 0.75 }}>
                Showing <b>{paginatedEntries.length}</b> of {filteredEntries.length} / {entries.length}
              </span>
            </div>

            <div style={styles.sectionTitleRight}>
              <div style={styles.toolbarRow}>
                <div style={styles.toolbarLeft}>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search..."
                    style={{
                      height: 34,
                      minWidth: 260,
                      padding: "0 12px",
                      borderRadius: 10,
                      border: "1px solid #cbd5e1",
                      background: "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                      outline: "none",
                      boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
                      fontFamily,
                    }}
                  />

                  <select
                    style={styles.toolbarSelect}
                    value={filterYear}
                    onChange={(e) => setFilterYear(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
                  >
                    <option value="ALL">All Years</option>
                    {availableYears.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>

                  <select
                    style={styles.toolbarSelect}
                    value={filterDistrict}
                    onChange={(e) => setFilterDistrict(e.target.value)}
                  >
                    <option value="ALL">All Districts</option>
                    {PANGASINAN_DISTRICTS.map((d) => (
                      <option key={d.id} value={d.id}>{d.id}</option>
                    ))}
                  </select>

                  <select
                    style={styles.toolbarSelect}
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
                  >
                    <option value="ALL">All Months</option>
                    {MONTHS.map((m, i) => (
                      <option key={m} value={i + 1}>{m}</option>
                    ))}
                  </select>

                  <select
                    style={styles.toolbarSelect}
                    value={filterMunicipality}
                    onChange={(e) => setFilterMunicipality(e.target.value)}
                  >
                    <option value="ALL">All Municipalities</option>
                    {municipalityOptions.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>

                  <select
                    style={styles.toolbarSelect}
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                  >
                    <option value="ALL">Overall</option>
                    <option value="PAYING">Paying</option>
                    <option value="NON-PAYING">Non-Paying</option>
                  </select>

                  <button
                    type="button"
                    style={styles.toolbarBtn}
                    onClick={() => {
                      setFilterCategory("ALL");
                      setFilterMunicipality("ALL");
                      setFilterDistrict("ALL");
                      setFilterMonth("ALL");
                      setFilterYear("ALL");
                      setSearchTerm("");
                      setCurrentPage(1);
                    }}
                  >
                    Clear Filters
                  </button>

                  {allowExport && (
                    <button type="button" style={styles.toolbarBtn} onClick={openCALIBRATIONExportPopupBulk}>
                      Export
                    </button>
                  )}

                  {allowExport && (
                    <button type="button" style={{ ...styles.toolbarBtn, background: "#0b5ed7", borderColor: "#0b5ed7", color: "#fff" }} onClick={openCALIBRATIONPrintPopupBulk}>
                      Print
                    </button>
                  )}

                  {allowAdd && (
                    <button type="button" style={styles.toolbarAddBtn} onClick={openAddEntry}>
                      Add Entry
                    </button>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: 55 }}>NO.</th>
                <th style={{ ...styles.th, width: 110 }}>CATEGORY</th>
                <th style={{ ...styles.th, width: 95 }}>DATE</th>
                <th style={{ ...styles.th, width: 150 }}>TYPE OF SAMPLES</th>
                <th style={{ ...styles.th, width: 190 }}>TYPE OF TEST / ANALYSIS / CALIBRATION (PER LAB)</th>
                <th style={{ ...styles.th, width: 120 }}>RANGE</th>
                <th style={{ ...styles.th, width: 90 }}>NO. OF SAMPLE</th>
                <th style={{ ...styles.th, width: 85 }}>COST</th>
                <th style={{ ...styles.th, width: 110 }}>FEES COLLECTED (PHP)</th>
                <th style={{ ...styles.th, width: 280 }}>VENUE/ADDRESS</th>
                <th style={{ ...styles.th, width: 70 }}>FEMALE</th>
                <th style={{ ...styles.th, width: 70 }}>MALE</th>
                <th style={{ ...styles.th, width: 95 }}>TOTAL CUSTOMERS</th>
                <th style={{ ...styles.th, width: 85 }}>NO. OF FIRMS</th>
                <th style={{ ...styles.th, width: 105 }}>NO. OF NEW FIRMS</th>
                <th style={{ ...styles.th, width: 85 }}>AGE RANGE</th>
                <th style={{ ...styles.th, width: 55 }}>PWD</th>
                <th style={{ ...styles.th, width: 55 }}>IP</th>
                <th style={{ ...styles.th, width: 95 }}>SENIOR CITIZEN</th>
                <th style={{ ...styles.th, width: 55 }}>4PS</th>
                <th style={{ ...styles.th, width: 190 }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {!paginatedEntries.length ? (
                <tr>
                  <td colSpan={21} style={styles.tdCenter}>No entries found.</td>
                </tr>
              ) : (
                paginatedEntries.map((e, idx) => (
                  <tr key={e.id}>
                    <td style={styles.tdCenter}>{pageStart + idx}</td>
                    <td style={styles.tdCenter}>{e.category || "—"}</td>
                    <td style={styles.tdCenter}>{e.date || "—"}</td>
                    <td style={styles.td}>{e.typeOfSample || "—"}</td>
                    <td style={styles.td}>{e.testType || "—"}</td>
                    <td style={styles.td}>
                      {getRangeDisplayLines(e).map((line, lineIdx) => (
                        <div key={`${e.id}_range_${lineIdx}`}>{line}</div>
                      ))}
                    </td>
                    <td style={styles.tdCenter}>{toNumber(e.noOfSample)}</td>
                    <td style={styles.tdRightWrap}>
                      {getCostDisplayLines(e).map((line, lineIdx) => (
                        <div key={`${e.id}_cost_${lineIdx}`}>{line}</div>
                      ))}
                    </td>
                    <td style={styles.tdRightWrap}>
                      {getFeesCollectedDisplayLines(e).map((line, lineIdx) => (
                        <div key={`${e.id}_fee_${lineIdx}`}>{line}</div>
                      ))}
                    </td>
                    <td style={styles.td}>
                      <div>{e.address || "—"}</div>
                      {Number.isFinite(e?.addressMeta?.lat) && Number.isFinite(e?.addressMeta?.lng) && (
                        <div style={{ marginTop: 6 }}>
                          <button style={styles.tinyBtn} onClick={() => setShowViewId(e.id)}>View</button>
                          <button style={styles.tinyBtn} onClick={() => openGoogleMap(e.addressMeta.lat, e.addressMeta.lng)}>Map</button>
                          <button style={styles.tinyBtn} onClick={() => openGoogleDirections(e.addressMeta.lat, e.addressMeta.lng)}>Directions</button>
                        </div>
                      )}
                    </td>
                    <td style={styles.tdCenter}>{toNumber(e.female)}</td>
                    <td style={styles.tdCenter}>{toNumber(e.male)}</td>
                    <td style={styles.tdCenter}>{toNumber(e.totalCustomers)}</td>
                    <td style={styles.tdCenter}>{toNumber(e.noOfFirms)}</td>
                    <td style={styles.tdCenter}>{toNumber(e.noOfNewFirms)}</td>
                    <td style={styles.tdCenter}>{e.ageRange || "—"}</td>
                    <td style={styles.tdCenter}>{toNumber(e.pwd)}</td>
                    <td style={styles.tdCenter}>{toNumber(e.ip)}</td>
                    <td style={styles.tdCenter}>{toNumber(e.sc)}</td>
                    <td style={styles.tdCenter}>{toNumber(e.fourPs)}</td>
                    <td style={styles.tdCenter}>
                      <button type="button" style={styles.tinyBtn} onClick={() => setShowViewId(e.id)}>View</button>
                      {allowEdit && (
                        <button type="button" style={styles.tinyBtn} onClick={() => openEditEntry(e)}>Edit</button>
                      )}
                      {allowExport && (
                        <button type="button" style={styles.tinyBtn} onClick={() => openCALIBRATIONPrintPopupRow(e.id)}>Print</button>
                      )}
                      {allowExport && (
                        <button type="button" style={styles.tinyBtn} onClick={() => openCALIBRATIONExportPopupRow(e.id)}>Export</button>
                      )}
                      {allowDelete && (
                        <button type="button" style={styles.dangerTiny} onClick={() => deleteEntry(e.id)}>Delete</button>
                      )}
                    </td>
                  </tr>
                ))
              )}

              {!!filteredEntries.length && filterCategory !== "ALL" && (
                <tr>
                  <td colSpan={8} style={{ ...styles.tdRight, fontWeight: 900, background: "#fff8dc" }}>
                    {filterCategory === "PAYING" ? "Paying Total" : "Non-Paying Total"}
                  </td>
                  <td style={{ ...styles.tdRight, fontWeight: 900, background: "#fff8dc" }}>
                    {money(filteredEntries.reduce((sum, e) => sum + toNumber(e.feesCollected), 0))}
                  </td>
                  <td colSpan={12} style={styles.td}></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            marginTop: 18,
            marginBottom: 8,
            width: "100%",
            background: "transparent",
            fontFamily,
            userSelect: "none",
            boxSizing: "border-box",
          }}
        >

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 0,
              lineHeight: 1,
              background: "transparent",
              border: "none",
              boxShadow: "none",
              padding: 0,
              borderRadius: 0,
            }}
            aria-hidden="true"
          >
            <span
              style={{
                display: "inline-block",
                color: "#1ba4df",
                fontWeight: 900,
                fontSize: 34,
                lineHeight: 1,
                letterSpacing: 0,
                fontFamily,
              }}
            >
              D
            </span>

            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                width: paginationLogoOSlots.length * 20,
              }}
            >
              {paginationLogoOSlots.map((slot) => (
                <span
                  key={`dost-blue-o-${slot}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 20,
                    color: "#1ba4df",
                    fontWeight: 900,
                    fontSize: 34,
                    lineHeight: 1,
                    fontFamily,
                  }}
                >
                  o
                </span>
              ))}

              <span
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 20,
                  color: "#111827",
                  fontWeight: 900,
                  fontSize: 34,
                  lineHeight: 1,
                  fontFamily,
                  pointerEvents: "none",
                  transform: `translateX(${activeLogoIndex * 20}px)`,
                  transition: "transform 220ms ease-in-out",
                }}
              >
                o
              </span>
            </div>

            <span
              style={{
                display: "inline-block",
                color: "#1ba4df",
                fontWeight: 900,
                fontSize: 34,
                lineHeight: 1,
                letterSpacing: 0,
                fontFamily,
              }}
            >
              st
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              flexWrap: "wrap",
              width: "100%",
              lineHeight: 1,
              marginTop: 0,
            }}
          >
            <button
              type="button"
              disabled={safeCurrentPage <= 1}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              style={{
                border: "none",
                background: "transparent",
                color: safeCurrentPage <= 1 ? "#94a3b8" : "#2563eb",
                padding: 0,
                cursor: safeCurrentPage <= 1 ? "not-allowed" : "pointer",
                fontWeight: 700,
                fontSize: 14,
                fontFamily,
                lineHeight: 1,
                whiteSpace: "nowrap",
              }}
            >
              Previous
            </button>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 14,
                flexWrap: "wrap",
                width: "auto",
                lineHeight: 1,
              }}
            >
              {visiblePageNumbers.map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: safeCurrentPage === page ? "#2563eb" : "#111827",
                    padding: 0,
                    minWidth: 18,
                    cursor: "pointer",
                    fontWeight: safeCurrentPage === page ? 800 : 500,
                    fontSize: 14,
                    fontFamily,
                    lineHeight: 1,
                    textAlign: "center",
                  }}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage((prev) => prev + 1)}
              style={{
                border: "none",
                background: "transparent",
                color: "#2563eb",
                padding: 0,
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 14,
                fontFamily,
                lineHeight: 1,
                whiteSpace: "nowrap",
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>




      {printModal.open ? (
        <div style={{ ...styles.modalBackdrop, zIndex: 4200 }} onClick={() => setPrintModal((p) => ({ ...p, open: false }))}>
          <div style={{ ...styles.modal, width: "min(720px, calc(100vw - 24px))", maxWidth: 720, position: "relative", zIndex: 4201 }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>{printModal.scope === "row" ? "Print (This Row)" : "Print (Filtered Rows)"}</div>
              <button type="button" style={styles.closeX || styles.btnGhost} onClick={() => setPrintModal((p) => ({ ...p, open: false }))}>✕</button>
            </div>
            <div style={styles.modalBody}>
              <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 10 }}>
                {printModal.scope === "row" ? `Entry: ${getCALIBRATIONOutputLabel((entries.find((p) => String(p.id) === String(printModal.entryId || exportModal.entryId)))) || "—"}` : "Records: filtered rows"}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                <div style={styles.field}><div style={styles.label}>Layout</div><select style={styles.input} value={printModal.layout} onChange={(e) => setPrintModal((p) => ({ ...p, layout: e.target.value }))}><option value="FORM">Form-Based Record Sheet</option><option value="TABLE">Table Layout</option><option value="COMPACT">Compact Summary</option></select></div>
                <div style={styles.field}><div style={styles.label}>Orientation</div><select style={styles.input} value={printModal.orientation} onChange={(e) => setPrintModal((p) => ({ ...p, orientation: e.target.value }))}><option value="landscape">Landscape (default)</option><option value="portrait">Portrait</option></select></div>
                <div style={styles.field}><div style={styles.label}>Paper Size</div><select style={styles.input} value={printModal.preset} onChange={(e) => setPrintModal((p) => ({ ...p, preset: e.target.value }))}><option value="a4">A4</option><option value="letter">Letter</option><option value="legal">Legal</option><option value="custom">Custom</option></select></div>
                <div style={styles.field}><div style={styles.label}>Custom Size (inches)</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><input style={styles.input} disabled={printModal.preset !== "custom"} value={printModal.customSize.width} onChange={(e) => setPrintModal((p) => ({ ...p, customSize: { ...p.customSize, width: e.target.value } }))} placeholder="Width" /><input style={styles.input} disabled={printModal.preset !== "custom"} value={printModal.customSize.height} onChange={(e) => setPrintModal((p) => ({ ...p, customSize: { ...p.customSize, height: e.target.value } }))} placeholder="Height" /></div></div>
              </div>
            </div>
            <div style={styles.modalFooter}><button type="button" style={styles.btnGhost} onClick={() => setPrintModal((p) => ({ ...p, open: false }))}>Cancel</button><button type="button" style={styles.btnDark} onClick={confirmCALIBRATIONPrint}>Print Now</button></div>
          </div>
        </div>
      ) : null}

      {exportModal.open ? (
        <div style={{ ...styles.modalBackdrop, zIndex: 4200 }} onClick={() => setExportModal((p) => ({ ...p, open: false }))}>
          <div style={{ ...styles.modal, width: "min(720px, calc(100vw - 24px))", maxWidth: 720, position: "relative", zIndex: 4201 }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>{exportModal.scope === "row" ? "Export (This Row)" : "Export (Filtered Rows)"}</div>
              <button type="button" style={styles.closeX || styles.btnGhost} onClick={() => setExportModal((p) => ({ ...p, open: false }))}>✕</button>
            </div>
            <div style={styles.modalBody}>
              <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 10 }}>{exportModal.scope === "row" ? `Entry: ${getCALIBRATIONOutputLabel((entries.find((p) => String(p.id) === String(printModal.entryId || exportModal.entryId)))) || "—"}` : "Records: filtered rows"}</div>
              <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 900 }}>Format</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["excel", "csv", "pdf", "docx"].map((f) => (<button key={f} type="button" style={{ ...(styles.tinyBtn || styles.btnGhost), ...(exportModal.format === f ? { border: "1px solid #0b4ea2", background: "#dbeafe" } : null) }} onClick={() => setExportModal((p) => ({ ...p, format: f }))}>{f.toUpperCase()}</button>))}
              </div>
              {["pdf", "docx"].includes(exportModal.format) ? (<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, marginTop: 12 }}>
                <div style={styles.field}><div style={styles.label}>Layout</div><select style={styles.input} value={exportModal.template} onChange={(e) => setExportModal((p) => ({ ...p, template: e.target.value }))}><option value="TABLE">Table Layout</option><option value="FORM">Form-Based Record Sheet</option><option value="COMPACT">Compact Summary</option></select></div>
                <div style={styles.field}><div style={styles.label}>Orientation</div><select style={styles.input} value={exportModal.orientation} onChange={(e) => setExportModal((p) => ({ ...p, orientation: e.target.value }))}><option value="landscape">Landscape</option><option value="portrait">Portrait</option></select></div>
                {exportModal.format === "pdf" ? (<><div style={styles.field}><div style={styles.label}>Paper Size</div><select style={styles.input} value={exportModal.preset} onChange={(e) => setExportModal((p) => ({ ...p, preset: e.target.value }))}><option value="a4">A4</option><option value="letter">Letter</option><option value="legal">Legal</option><option value="custom">Custom</option></select></div><div style={styles.field}><div style={styles.label}>Custom Size (inches)</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><input style={styles.input} disabled={exportModal.preset !== "custom"} value={exportModal.customSize.width} onChange={(e) => setExportModal((p) => ({ ...p, customSize: { ...p.customSize, width: e.target.value } }))} /><input style={styles.input} disabled={exportModal.preset !== "custom"} value={exportModal.customSize.height} onChange={(e) => setExportModal((p) => ({ ...p, customSize: { ...p.customSize, height: e.target.value } }))} /></div></div></>) : null}
              </div>) : null}
            </div>
            <div style={styles.modalFooter}><button type="button" style={styles.btnGhost} onClick={() => setExportModal((p) => ({ ...p, open: false }))}>Cancel</button><button type="button" style={styles.btnDark} onClick={confirmCALIBRATIONExport}>Export Now</button></div>
          </div>
        </div>
      ) : null}

      {showAdd && (
        <div style={{ ...styles.modalBackdrop, zIndex: 1000 }} onClick={() => setShowAdd(false)}>
          <div style={{ ...styles.modal, position: "relative", zIndex: 1001 }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>{editingId ? "Edit Calibration Entry" : "Add Calibration Entry"}</div>
              <button style={styles.closeX} onClick={() => setShowAdd(false)}>✕</button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.grid}>
                <div style={styles.field}>
                  <div style={styles.label}>Category<span style={styles.req}>*</span></div>
                  <select style={styles.input} value={form.category} onChange={(e) => updateForm("category", e.target.value)}>
                    <option value="PAYING">PAYING</option>
                    <option value="NON-PAYING">NON-PAYING</option>
                  </select>
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Date<span style={styles.req}>*</span></div>
                  <input type="date" style={styles.input} value={form.date} onChange={(e) => updateForm("date", e.target.value)} />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Type of Samples<span style={styles.req}>*</span></div>
                  <select style={styles.input} value={form.typeOfSample} onChange={(e) => updateForm("typeOfSample", e.target.value)}>
                    <option value="Weighing Scale">Weighing Scale</option>
                    <option value="Bucket">Bucket</option>
                  </select>
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Type of Test / Analysis / Calibration (Per Lab)</div>
                  <input type="text" style={{ ...styles.input, background: "#f8fafc" }} value={form.testType} readOnly />
                </div>

                {form.typeOfSample === "Weighing Scale" ? (
                  <>
                    <div style={styles.field}>
                      <div style={styles.label}>No. of Sample<span style={styles.req}>*</span></div>
                      <input
                        type="number"
                        min="1"
                        style={styles.input}
                        value={form.noOfSample}
                        onChange={(e) => updateForm("noOfSample", e.target.value)}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Fees Collected (PHP)</div>
                      <input type="number" style={{ ...styles.input, background: "#f8fafc" }} value={form.feesCollected} readOnly />
                    </div>

                    <div style={styles.breakdownBox}>
                      <div style={styles.breakdownHead}>MC Range Breakdown<span style={styles.req}>*</span></div>
                      <div style={{ fontSize: 12, marginBottom: 8, opacity: 0.8 }}>
                        Tip: when you add a new row, the system auto-fills the next row with the remaining sample count. You can still edit it.
                      </div>
                      {toNumber(form.noOfSample) <= 0 ? (
                        <div style={{ fontSize: 12, marginBottom: 8, color: "#b45309", fontWeight: 800 }}>
                          Please enter a value in the main No. of Sample field first before editing the breakdown sample fields.
                        </div>
                      ) : null}

                      {(form.mcBreakdown || []).map((row, index) => (
                        <div key={row.id} style={styles.breakdownRow}>
                          <div style={styles.field}>
                            <div style={styles.label}>Range<span style={styles.req}>*</span></div>
                            <select
                              style={styles.input}
                              value={row.range}
                              onChange={(e) => updateMCBreakdownRow(row.id, "range", e.target.value)}
                            >
                              <option value="">Select range</option>
                              {MC_RANGE_OPTIONS.map((r) => (
                                <option key={r} value={r}>{r}</option>
                              ))}
                            </select>
                          </div>

                          <div style={styles.field}>
                            <div style={styles.label}>No. of Sample<span style={styles.req}>*</span></div>
                            <input
                              type="number"
                              min="1"
                              style={{
                                ...styles.input,
                                background: toNumber(form.noOfSample) > 0 ? "#fff" : "#f1f5f9",
                                cursor: toNumber(form.noOfSample) > 0 ? "text" : "not-allowed",
                              }}
                              value={row.noOfSample}
                              onChange={(e) => updateMCBreakdownRow(row.id, "noOfSample", e.target.value)}
                              disabled={toNumber(form.noOfSample) <= 0}
                              placeholder={toNumber(form.noOfSample) > 0 ? "" : "Enter main No. of Sample first"}
                            />
                          </div>

                          <div style={styles.field}>
                            <div style={styles.label}>
                              Cost{form.category === "PAYING" ? <span style={styles.req}>*</span> : null}
                            </div>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              style={styles.input}
                              value={row.cost}
                              onChange={(e) => updateMCBreakdownRow(row.id, "cost", e.target.value)}
                            />
                          </div>

                          <div style={styles.field}>
                            <div style={styles.label}>Fees Collected</div>
                            <input
                              type="number"
                              style={{ ...styles.input, background: "#f8fafc" }}
                              value={row.feesCollected}
                              readOnly
                            />
                          </div>

                          <div style={{ alignSelf: "end" }}>
                            <button
                              type="button"
                              style={index === 0 && (form.mcBreakdown || []).length === 1 ? { ...styles.dangerTiny, opacity: 0.45, cursor: "not-allowed" } : styles.dangerTiny}
                              disabled={index === 0 && (form.mcBreakdown || []).length === 1}
                              onClick={() => removeMCBreakdownRow(row.id)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}

                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                        <button type="button" style={styles.pillBtn} onClick={addMCBreakdownRow}>
                          + Add MC Range Breakdown
                        </button>

                        <div style={styles.breakdownTotals}>
                          <div>Main No. of Sample: {toNumber(form.noOfSample)}</div>
                          <div>Breakdown Total: {(form.mcBreakdown || []).reduce((sum, r) => sum + toNumber(r.noOfSample), 0)}</div>
                          <div>
                            Remaining: {Math.max(0, toNumber(form.noOfSample) - (form.mcBreakdown || []).reduce((sum, r) => sum + toNumber(r.noOfSample), 0))}
                          </div>
                          <div>Total Fees: {money(form.feesCollected)}</div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={styles.field}>
                      <div style={styles.label}>No. of Sample<span style={styles.req}>*</span></div>
                      <input type="number" min="1" style={styles.input} value={form.noOfSample} onChange={(e) => updateForm("noOfSample", e.target.value)} />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Range</div>
                      <input style={styles.input} value={form.range} onChange={(e) => updateForm("range", e.target.value)} placeholder="Optional for VC" />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>
                        Cost{form.category === "PAYING" ? <span style={styles.req}>*</span> : null}
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        style={styles.input}
                        value={form.cost}
                        onChange={(e) => updateForm("cost", e.target.value)}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Fees Collected (PHP)</div>
                      <input type="number" min="0" step="0.01" style={{ ...styles.input, background: "#f8fafc" }} value={form.feesCollected} readOnly />
                    </div>
                  </>
                )}

                <div style={{ ...styles.field, gridColumn: "1 / span 2" }}>
                  <div style={styles.label}>Venue/Address<span style={styles.req}>*</span></div>
                  <button
                    type="button"
                    onClick={openAddressModal}
                    style={styles.inputButton(Boolean(form.address))}
                  >
                    <span style={{ opacity: form.address ? 1 : 0.6 }}>
                      {form.address || "Click to select venue/address"}
                    </span>
                    <span style={{ fontSize: 11, opacity: 0.65 }}>
                      {form.address ? "Change" : "Select"}
                    </span>
                  </button>

                  {Number.isFinite(form?.addressMeta?.lat) && Number.isFinite(form?.addressMeta?.lng) ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" style={styles.tinyBtn} onClick={() => openGoogleMap(form.addressMeta.lat, form.addressMeta.lng)}>
                        Map
                      </button>
                      <button type="button" style={styles.tinyBtn} onClick={() => openGoogleDirections(form.addressMeta.lat, form.addressMeta.lng)}>
                        Directions
                      </button>
                      <div style={{ fontSize: 12, opacity: 0.85, alignSelf: "center", ...styles.mono }}>
                        {form.addressMeta.lat.toFixed(6)}, {form.addressMeta.lng.toFixed(6)}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Female</div>
                  <input type="number" min="0" style={styles.input} value={form.female} onChange={(e) => updateForm("female", e.target.value)} />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Male</div>
                  <input type="number" min="0" style={styles.input} value={form.male} onChange={(e) => updateForm("male", e.target.value)} />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Total Customers</div>
                  <input type="number" style={{ ...styles.input, background: "#f8fafc" }} value={form.totalCustomers} readOnly />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>No. of Firms</div>
                  <input type="number" min="0" style={styles.input} value={form.noOfFirms} onChange={(e) => updateForm("noOfFirms", e.target.value)} />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>No. of New Firms</div>
                  <input type="number" min="0" style={styles.input} value={form.noOfNewFirms} onChange={(e) => updateForm("noOfNewFirms", e.target.value)} />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Age Range</div>
                  <input style={styles.input} value={form.ageRange} onChange={(e) => updateForm("ageRange", e.target.value)} />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>PWD</div>
                  <input type="number" min="0" style={styles.input} value={form.pwd} onChange={(e) => updateForm("pwd", e.target.value)} />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>IP</div>
                  <input type="number" min="0" style={styles.input} value={form.ip} onChange={(e) => updateForm("ip", e.target.value)} />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Senior Citizen</div>
                  <input type="number" min="0" style={styles.input} value={form.sc} onChange={(e) => updateForm("sc", e.target.value)} />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>4PS</div>
                  <input type="number" min="0" style={styles.input} value={form.fourPs} onChange={(e) => updateForm("fourPs", e.target.value)} />
                </div>

                <div style={{ ...styles.field, gridColumn: "1 / span 2" }}>
                  <div style={styles.label}>Name of Staff</div>
                  <input
                    type="text"
                    style={styles.input}
                    value={form.nameOfStaff}
                    onChange={(e) => updateForm("nameOfStaff", e.target.value)}
                    placeholder="Optional"
                  />
                </div>

                {renderCalibrationCustomInputs()}

                <div style={{ ...styles.field, gridColumn: "1 / span 2" }}>
                  <div style={styles.label}>Means of Verification</div>
                  <textarea
                    style={styles.textarea}
                    value={form.meansOfVerification || ""}
                    onChange={(e) => updateForm("meansOfVerification", e.target.value)}
                    placeholder="Attendance sheet / links / activity reports / photos..."
                  />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    <button type="button" style={styles.tinyBtn} onClick={() => openMovFirstLink(form.meansOfVerification)}>View First Link</button>
                    <button type="button" style={styles.tinyBtn} onClick={() => pickMovPhotos(form.movPhotos, (photos) => updateForm("movPhotos", photos))}>Add Photos</button>
                    <span style={{ fontSize: 12, fontWeight: 900 }}>Photos: {Array.isArray(form.movPhotos) ? form.movPhotos.length : 0}</span>
                  </div>
                  {extractMovLinks(form.meansOfVerification).length > 0 ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                      {extractMovLinks(form.meansOfVerification).map((url, idx) => (
                        <button type="button" key={url} style={styles.tinyBtn} onClick={() => openMovLink(url)}>Link {idx + 1}</button>
                      ))}
                    </div>
                  ) : null}
                  {Array.isArray(form.movPhotos) && form.movPhotos.length > 0 ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                      {form.movPhotos.map((photo, idx) => (
                        <div key={`${photo.name || "photo"}_${idx}`} style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid #e2e8f0", borderRadius: 8, padding: 6 }}>
                          <img src={photo.dataUrl || photo.url} alt={photo.name || `Photo ${idx + 1}`} style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 6 }} />
                          <button type="button" style={styles.dangerTiny} onClick={() => updateForm("movPhotos", form.movPhotos.filter((_, i) => i !== idx))}>Remove</button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                  <div style={styles.label}>Remarks</div>
                  <textarea style={styles.textarea} value={form.remarks} onChange={(e) => updateForm("remarks", e.target.value)} />
                </div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button type="button" style={styles.pillBtn} onClick={resetForm}>Clear</button>
              {(editingId ? allowEdit : allowAdd) && (
                <button type="button" style={styles.btnDark} onClick={saveEntry}>
                  {editingId ? "Update Entry" : "Save Entry"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <AddressFlowModal
        open={addressFlowOpen}
        onClose={() => setAddressFlowOpen(false)}
        onSave={applyAddressMetaToForm}
        initialMeta={form.addressMeta}
        municipalityOptions={municipalityOptions}
        fetchBarangaysForMunicipality_Local={fetchBarangaysForMunicipality_Local}
        styles={styles}
      />

      {viewEntry && (
        <div style={{ ...styles.modalBackdrop, zIndex: 1500 }} onClick={() => setShowViewId(null)}>
          <div style={{ ...styles.modal, width: "min(980px, 100%)", position: "relative", zIndex: 1501 }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>Calibration Entry Details</div>
              <button style={styles.closeX} onClick={() => setShowViewId(null)}>✕</button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.grid}>
                <div><b>Category:</b> {viewEntry.category || "—"}</div>
                <div><b>Date:</b> {viewEntry.date || "—"}</div>
                <div><b>Type of Samples:</b> {viewEntry.typeOfSample || "—"}</div>
                <div><b>Type of Test / Analysis / Calibration:</b> {viewEntry.testType || "—"}</div>
                <div><b>Range:</b> {formatRangeDisplay(viewEntry)}</div>
                <div><b>No. of Sample:</b> {toNumber(viewEntry.noOfSample)}</div>
                <div><b>Cost:</b> {formatCostDisplay(viewEntry)}</div>
                <div><b>Fees Collected:</b> {money(viewEntry.feesCollected)}</div>
                <div style={{ gridColumn: "1 / span 2" }}><b>Venue/Address:</b> {viewEntry.address || "—"}</div>

                {viewEntry.typeOfSample === "Weighing Scale" && Array.isArray(viewEntry.mcBreakdown) && viewEntry.mcBreakdown.length ? (
                  <div style={{ gridColumn: "1 / span 2", marginTop: 6 }}>
                    <div style={{ fontWeight: 900, marginBottom: 8 }}>MC Breakdown</div>
                    <table style={{ ...styles.table, tableLayout: "fixed" }}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Range</th>
                          <th style={styles.th}>No. of Sample</th>
                          <th style={styles.th}>Cost</th>
                          <th style={styles.th}>Fees Collected</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewEntry.mcBreakdown.map((r) => (
                          <tr key={r.id}>
                            <td style={styles.tdCenter}>{r.range || "—"}</td>
                            <td style={styles.tdCenter}>{toNumber(r.noOfSample)}</td>
                            <td style={styles.tdRight}>{money(r.cost)}</td>
                            <td style={styles.tdRight}>{money(r.feesCollected)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                <div><b>Female:</b> {toNumber(viewEntry.female)}</div>
                <div><b>Male:</b> {toNumber(viewEntry.male)}</div>
                <div><b>Total Customers:</b> {toNumber(viewEntry.totalCustomers)}</div>
                <div><b>No. of Firms:</b> {toNumber(viewEntry.noOfFirms)}</div>
                <div><b>No. of New Firms:</b> {toNumber(viewEntry.noOfNewFirms)}</div>
                <div><b>Age Range:</b> {viewEntry.ageRange || "—"}</div>
                <div><b>PWD:</b> {toNumber(viewEntry.pwd)}</div>
                <div><b>IP:</b> {toNumber(viewEntry.ip)}</div>
                <div><b>Senior Citizen:</b> {toNumber(viewEntry.sc)}</div>
                <div><b>4PS:</b> {toNumber(viewEntry.fourPs)}</div>
                <div style={{ gridColumn: "1 / span 2" }}><b>Name of Staff:</b> {viewEntry.nameOfStaff || "—"}</div>
                {renderCalibrationCustomViewFields(viewEntry)}
                <div style={{ gridColumn: "1 / span 2" }}><b>Remarks:</b> {viewEntry.remarks || "—"}</div>
              </div>

              {Number.isFinite(viewEntry?.addressMeta?.lat) && Number.isFinite(viewEntry?.addressMeta?.lng) && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontWeight: 800, marginBottom: 8 }}>Pinned Location</div>
                  <div style={styles.mapShell}>
                    <MapContainer
                      center={[viewEntry.addressMeta.lat, viewEntry.addressMeta.lng]}
                      zoom={14}
                      minZoom={9}
                      style={{ height: 320, width: "100%" }}
                    >
                      <TileLayer
                        attribution='&copy; OpenStreetMap contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <Marker position={[viewEntry.addressMeta.lat, viewEntry.addressMeta.lng]}>
                        <Popup>{viewEntry.address}</Popup>
                      </Marker>
                    </MapContainer>
                  </div>
                </div>
              )}
            </div>

            <div style={styles.modalFooter}>
              <button type="button" style={styles.pillBtn} onClick={() => setShowViewId(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
      {deleteConfirmState && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.42)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 99999,
            fontFamily: "inherit",
          }}
          onClick={cancelDeleteConfirm}
        >
          <div
            style={{
              width: "min(430px, 100%)",
              background: "#fff",
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: "0 18px 45px rgba(15,23,42,0.28)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                background: "#0b4ea2",
                color: "#fff",
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                fontWeight: 900,
              }}
            >
              <span>Confirm Delete</span>
              <button
                type="button"
                onClick={cancelDeleteConfirm}
                style={{
                  border: "1px solid rgba(255,255,255,0.75)",
                  background: "#fff",
                  color: "#0f172a",
                  borderRadius: 10,
                  padding: "6px 10px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 6, color: "#0f172a" }}>
                Are you sure you want to delete this?
              </div>
              <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.4 }}>
                {deleteConfirmState.message || "This action cannot be undone."}
              </div>
            </div>
            <div
              style={{
                padding: 14,
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                borderTop: "1px solid #e2e8f0",
              }}
            >
              <button
                type="button"
                onClick={cancelDeleteConfirm}
                style={{
                  background: "#fff",
                  border: "1px solid #cbd5e1",
                  color: "#0f172a",
                  padding: "9px 12px",
                  borderRadius: 10,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={proceedDeleteConfirm}
                style={{
                  background: "#0b4ea2",
                  border: "1px solid #0b4ea2",
                  color: "#fff",
                  padding: "9px 12px",
                  borderRadius: 10,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

