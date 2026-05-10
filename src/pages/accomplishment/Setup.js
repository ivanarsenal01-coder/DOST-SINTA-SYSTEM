// Setup.js (FULL) ✅ fixed buttons + address modal front + addressMeta payload

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
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
import "./setup.css";
import API_BASE from "../../api";

/* ✅ Leaflet + React-Leaflet */
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

/* ✅ Fix Leaflet marker icons for CRA / webpack */
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const API = `${API_BASE}`;

function escapeHtml(value = "") {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const TECH_ROLLOUT_API = `${API}/technology-rollout`;

const CALIBRATION_TEST_TYPE_BY_SAMPLE = {
  "Weighing Scale": "Mass Calibration",
  Bucket: "Volume Calibration",
};
const CALIBRATION_RANGE_OPTIONS = ["<100 Kg", ">=100 Kg"];

function makeCalibrationBreakdownRow(prefillSample = "", autoFilled = false) {
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    range: "",
    noOfSample: prefillSample,
    cost: "",
    feesCollected: "",
    autoFilled,
  };
}

function getDefaultCalibrationData() {
  return {
    category: "PAYING",
    date: new Date().toISOString().slice(0, 10),
    typeOfSample: "Weighing Scale",
    testType: "Mass Calibration",
    noOfSample: "",
    range: "",
    cost: "",
    feesCollected: "",
    mcBreakdown: [makeCalibrationBreakdownRow()],
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
    remarks: "",
  };
}

function calibrationToNumber(v) {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function computeCalibrationBreakdownTotals(rows, category) {
  const cleanRows = Array.isArray(rows) ? rows : [];
  const totalSamples = cleanRows.reduce((sum, r) => sum + calibrationToNumber(r.noOfSample), 0);
  const totalFees = category === "PAYING"
    ? cleanRows.reduce((sum, r) => sum + calibrationToNumber(r.noOfSample) * calibrationToNumber(r.cost), 0)
    : 0;
  return { totalSamples, totalFees };
}

function normalizeCalibrationData(raw = {}) {
  const base = getDefaultCalibrationData();
  const next = { ...base, ...(raw || {}) };
  next.testType = CALIBRATION_TEST_TYPE_BY_SAMPLE[next.typeOfSample] || next.testType || "Mass Calibration";
  next.address = next.address || next.addressMeta?.displayText || "";
  next.mcBreakdown = Array.isArray(raw?.mcBreakdown) && raw.mcBreakdown.length
    ? raw.mcBreakdown.map((row) => ({
      id: row?.id || makeCalibrationBreakdownRow().id,
      range: row?.range || "",
      noOfSample: row?.noOfSample ?? "",
      cost: row?.cost ?? "",
      feesCollected: row?.feesCollected ?? "",
      autoFilled: Boolean(row?.autoFilled),
    }))
    : [makeCalibrationBreakdownRow()];
  return next;
}


/* ✅ Pangasinan Municipalities/Cities (COMPLETE) */
const PANGASINAN_LGUS = [
  "Alaminos City",
  "Dagupan City",
  "San Carlos City",
  "Urdaneta City",
  "Agno",
  "Aguilar",
  "Alcala",
  "Anda",
  "Asingan",
  "Balungao",
  "Bani",
  "Basista",
  "Bautista",
  "Bayambang",
  "Binalonan",
  "Binmaley",
  "Bolinao",
  "Bugallon",
  "Burgos",
  "Calasiao",
  "Dasol",
  "Infanta",
  "Labrador",
  "Laoac",
  "Lingayen",
  "Mabini",
  "Malasiqui",
  "Manaoag",
  "Mangaldan",
  "Mangatarem",
  "Mapandan",
  "Natividad",
  "Pozorrubio",
  "Rosales",
  "San Fabian",
  "San Jacinto",
  "San Manuel",
  "San Nicolas",
  "San Quintin",
  "Santa Barbara",
  "Santa Maria",
  "Santo Tomas",
  "Sison",
  "Sual",
  "Tayug",
  "Umingan",
  "Urbiztondo",
  "Villasis",
].sort((a, b) => a.localeCompare(b));

/**
 * ✅ District mapping
 */
const PANGASINAN_DISTRICTS = [
  {
    id: "District 1",
    municipalities: [
      "Agno",
      "Alaminos City",
      "Anda",
      "Bani",
      "Bolinao",
      "Burgos",
      "Dasol",
      "Infanta",
      "Mabini",
      "Sual",
    ],
  },
  {
    id: "District 2",
    municipalities: [
      "Aguilar",
      "Basista",
      "Binmaley",
      "Bugallon",
      "Labrador",
      "Lingayen",
      "Mangatarem",
      "Urbiztondo",
    ],
  },
  {
    id: "District 3",
    municipalities: [
      "Bayambang",
      "Calasiao",
      "Malasiqui",
      "Mapandan",
      "San Carlos City",
      "Santa Barbara",
    ],
  },
  {
    id: "District 4",
    municipalities: [
      "Dagupan City",
      "Manaoag",
      "Mangaldan",
      "San Fabian",
      "San Jacinto",
    ],
  },
  {
    id: "District 5",
    municipalities: [
      "Alcala",
      "Bautista",
      "Binalonan",
      "Laoac",
      "Pozorrubio",
      "Santo Tomas",
      "Sison",
      "Urdaneta City",
      "Villasis",
    ],
  },
  {
    id: "District 6",
    municipalities: [
      "Asingan",
      "Balungao",
      "Natividad",
      "Rosales",
      "San Manuel",
      "San Nicolas",
      "San Quintin",
      "Santa Maria",
      "Tayug",
      "Umingan",
    ],
  },
];

/* ==========================================================
   ✅ BARANGAY LOCAL JSON
   Put file at: public/data/pangasinan_barangays.json
   Supports formats:
   1) { "Urdaneta City": ["Barangay 1", ...] }
   2) { "Urdaneta City": [ {name,lat,lng}, ... ] }
   ========================================================== */
const BARANGAY_LOCAL_URL = "/data/pangasinan_barangays.json";

const normalizeKey = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

async function fetchBarangaysForMunicipality_Local(muniName) {
  const res = await fetch(BARANGAY_LOCAL_URL);
  if (!res.ok)
    throw new Error("Missing file: public/data/pangasinan_barangays.json");

  const data = await res.json();

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
  const foundKey = Object.keys(data || {}).find(
    (k) => normalizeKey(k) === target
  );
  if (foundKey) {
    list = pick(foundKey);
    if (list) return list;
  }

  throw new Error(`No hardcoded barangay list for "${muniName}"`);
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

  useEffect(() => {
    if (!coords?.lat || !coords?.lng) return;
    map.setView([coords.lat, coords.lng], zoom, { animate: true });
  }, [map, coords?.lat, coords?.lng, zoom]);

  return null;
}

function FitAndLockToPangasinan({
  bounds,
  borderMode,
  selectedMuni,
  selectedDist,
  filteredGeo,
}) {
  const map = useMap();

  useEffect(() => {
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

    if (
      borderMode === "municipality" &&
      selectedMuni &&
      filteredGeo?.features?.length
    ) {
      fitGeo(filteredGeo);
      return;
    }

    if (
      borderMode === "district" &&
      selectedDist &&
      filteredGeo?.features?.length
    ) {
      fitGeo(filteredGeo);
      return;
    }

    map.fitBounds(bounds.pad(0.05), { animate: true });
  }, [map, bounds, borderMode, selectedMuni, selectedDist, filteredGeo]);

  return null;
}

function AddressFlowModal({
  open,
  onClose,
  onSave,
  initialMeta,
  styles,
  fetchBarangaysForMunicipality_Local,
}) {
  const [mode, setMode] = useState(initialMeta?.mode || "hierarchical");
  const [step, setStep] = useState(1);
  const [venueName, setVenueName] = useState(initialMeta?.venueName || "");
  const [manualText, setManualText] = useState(initialMeta?.manualText || "");

  const province = "Pangasinan";
  const [municipality, setMunicipality] = useState(initialMeta?.municipality || "");
  const [barangay, setBarangay] = useState(initialMeta?.barangay || "");

  const [barangayOptions, setBarangayOptions] = useState([]);
  const [barangayLoading, setBarangayLoading] = useState(false);
  const [barangayError, setBarangayError] = useState("");
  const [search, setSearch] = useState("");

  const [manualCoordsText, setManualCoordsText] = useState(() => {
    const lat = initialMeta?.lat;
    const lng = initialMeta?.lng;
    return Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) ? `${lat}, ${lng}` : "";
  });
  const [reverseLoading, setReverseLoading] = useState(false);
  const [reverseError, setReverseError] = useState("");

  const [coords, setCoords] = useState(() => {
    const lat = Number(initialMeta?.lat);
    const lng = Number(initialMeta?.lng);
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  });

  useEffect(() => {
    if (!open) return;

    const initMode = initialMeta?.mode || "hierarchical";
    setMode(initMode);
    setVenueName(initialMeta?.venueName || "");
    setManualText(initialMeta?.manualText || "");
    setMunicipality(initialMeta?.municipality || "");
    setBarangay(initialMeta?.barangay || "");

    const lat = Number(initialMeta?.lat);
    const lng = Number(initialMeta?.lng);
    const nextCoords = Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
    setCoords(nextCoords);
    setManualCoordsText(nextCoords ? `${nextCoords.lat}, ${nextCoords.lng}` : "");
    setReverseLoading(false);
    setReverseError("");

    setSearch("");
    setBarangayOptions([]);
    setBarangayLoading(false);
    setBarangayError("");

    if (initMode === "manual") setStep(1);
    else setStep(initialMeta?.municipality ? 2 : 1);
  }, [open, initialMeta]);

  useEffect(() => {
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
    return () => {
      cancelled = true;
    };
  }, [open, mode, municipality, fetchBarangaysForMunicipality_Local]);

  const municipalityList = PANGASINAN_LGUS;

  const filterList = (items) => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return items;

    return items.filter((x) => {
      const name = typeof x === "string" ? x : String(x?.name || "");
      return name.toLowerCase().includes(q);
    });
  };

  const parseCoords = (value = "") => {
    const parts = String(value || "")
      .trim()
      .split(/[ ,]+/)
      .map((x) => Number(x))
      .filter((x) => Number.isFinite(x));
    if (parts.length < 2) return null;
    const [lat, lng] = parts;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
  };

  const compactReverseAddress = (data) => {
    const a = data?.address || {};
    const first = a.amenity || a.building || a.road || a.neighbourhood || "";
    const barangayLike = a.village || a.suburb || a.hamlet || a.quarter || a.neighbourhood || "";
    const cityLike = a.city || a.town || a.municipality || a.county || "";
    const provinceLike = a.state || a.province || "";
    const parts = [first, barangayLike, cityLike, provinceLike].filter(Boolean);
    return Array.from(new Set(parts)).join(", ") || data?.display_name || "";
  };

  const lookupManualCoordinates = async () => {
    const parsed = parseCoords(manualCoordsText);
    if (!parsed) {
      setReverseError("Invalid coordinates. Use format: 15.123456, 120.123456");
      return;
    }

    setCoords(parsed);
    setReverseLoading(true);
    setReverseError("");

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${parsed.lat}&lon=${parsed.lng}`
      );
      if (!res.ok) throw new Error("Reverse geocoding failed");
      const data = await res.json();
      const nextAddress = compactReverseAddress(data);
      if (nextAddress) setManualText(nextAddress);
    } catch (e) {
      setReverseError("Coordinates saved, but auto-address lookup failed. You can type the address manually.");
    } finally {
      setReverseLoading(false);
    }
  };

  const baseAddressText =
    mode === "manual"
      ? manualText.trim()
      : [barangay, municipality, province].filter(Boolean).join(", ");

  const displayText = [venueName.trim(), baseAddressText].filter(Boolean).join(", ");

  const canSave =
    mode === "manual"
      ? Boolean(venueName.trim() || manualText.trim() || coords)
      : Boolean(municipality && barangay);

  const breadcrumb =
    mode === "manual"
      ? "Manual Venue/Address"
      : step === 1
        ? "Pangasinan > Select Municipality/City"
        : step === 2
          ? `Pangasinan > ${municipality} > Select Barangay`
          : `Pangasinan > ${municipality} > ${barangay || "Barangay"} > Pin`;

  const back = () => {
    if (mode === "manual") return onClose();
    if (step === 1) return onClose();
    if (step === 2) {
      setStep(1);
      setSearch("");
      return;
    }
    if (step === 3) setStep(2);
  };

  const goToMap = () => {
    if (!municipality || !barangay)
      return alert("Please select Municipality and Barangay first.");
    if (!coords) setCoords({ lat: 15.9167, lng: 120.3333 });
    setStep(3);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation)
      return alert("Geolocation not supported in this browser.");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(next);
        setManualCoordsText(`${next.lat}, ${next.lng}`);
      },
      () => alert("Could not get your location. Check browser permissions.")
    );
  };

  const save = () => {
    if (!canSave) return;

    const meta =
      mode === "manual"
        ? {
          mode: "manual",
          venueName: venueName.trim(),
          manualText: manualText.trim(),
          addressOnlyText: manualText.trim(),
          displayText,
          province: "",
          municipality: "",
          barangay: "",
          lat: coords?.lat || null,
          lng: coords?.lng || null,
        }
        : {
          mode: "hierarchical",
          venueName: venueName.trim(),
          province,
          municipality,
          barangay,
          manualText: "",
          addressOnlyText: baseAddressText,
          displayText,
          lat: coords?.lat || null,
          lng: coords?.lng || null,
        };

    onSave(meta);
    onClose();
  };

  if (!open) return null;

  return (
    <div style={styles.addressModalBackdrop} onClick={onClose}>
      <div style={styles.flowShell} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div>Add Venue/Address</div>
            <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 800 }}>
              {breadcrumb}
            </div>
          </div>
          <button type="button" style={styles.btnGhost} onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={styles.flowBody}>
          <div style={styles.tabsRow}>
            <button type="button" style={styles.tabBtn(mode === "hierarchical")} onClick={() => { setMode("hierarchical"); setStep(1); setManualText(""); setManualCoordsText(""); setReverseError(""); setSearch(""); }}>
              Hierarchical
            </button>
            <button type="button" style={styles.tabBtn(mode === "manual")} onClick={() => { setMode("manual"); setStep(1); setMunicipality(""); setBarangay(""); setBarangayOptions([]); setBarangayError(""); setSearch(""); }}>
              Manual Input
            </button>
          </div>

          <div style={styles.field}>
            <div style={styles.label}>Venue</div>
            <input style={styles.input} value={venueName} onChange={(e) => setVenueName(e.target.value)} placeholder="e.g. Riverside Convention Center (optional)" />
          </div>

          {mode === "manual" ? (
            <>
              <div style={styles.field}>
                <div style={styles.label}>Type Venue/Address</div>
                <textarea style={styles.textarea} value={manualText} onChange={(e) => setManualText(e.target.value)} placeholder="e.g. Allabon, Agno, Pangasinan" />
              </div>

              <div style={styles.field}>
                <div style={styles.label}>Coordinates</div>
                <input
                  style={styles.input}
                  value={manualCoordsText}
                  onChange={(e) => setManualCoordsText(e.target.value)}
                  onBlur={() => { if (manualCoordsText.trim()) lookupManualCoordinates(); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); lookupManualCoordinates(); } }}
                  placeholder="Optional: 15.123456, 120.123456"
                />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <button type="button" style={styles.tinyBtn} onClick={lookupManualCoordinates} disabled={!manualCoordsText.trim() || reverseLoading}>
                    {reverseLoading ? "Finding address..." : "Use Coordinates"}
                  </button>
                  {coords ? <span style={{ fontSize: 12, opacity: 0.8, ...styles.mono }}>{coords.lat}, {coords.lng}</span> : null}
                </div>
                {reverseError ? <div style={{ fontSize: 12, color: "#b91c1c", fontWeight: 800 }}>{reverseError}</div> : null}
              </div>

              <div style={{ fontSize: 12, opacity: 0.75 }}>Preview: <b>{displayText || "—"}</b></div>

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
                    <div style={styles.label}>Search Municipality/City</div>
                    <input style={styles.input} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Type to search..." />
                  </div>

                  <div style={styles.label}>Select Municipality/City (Pangasinan)</div>
                  <div style={styles.list}>
                    {filterList(municipalityList).map((name) => {
                      const active = name === municipality;
                      return (
                        <button type="button" key={name} style={{ ...styles.listBtn, ...(active ? styles.listBtnActive : null) }} onClick={() => { setMunicipality(name); setBarangay(""); setCoords(null); setSearch(""); setStep(2); }}>
                          {name}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <button type="button" style={styles.btnGhost} onClick={onClose}>Cancel</button>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div style={styles.label}>Municipality: <b>{municipality}</b></div>

                  <div style={styles.field}>
                    <div style={styles.label}>Search Barangay</div>
                    <input style={styles.input} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={barangayLoading ? "Loading..." : "Type to search barangays..."} disabled={barangayLoading} />
                  </div>

                  {barangayLoading ? (
                    <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 800 }}>Loading barangays...</div>
                  ) : barangayError ? (
                    <div style={styles.warn}>⚠ {barangayError}<div style={{ marginTop: 6, opacity: 0.9 }}>Make sure this file exists:<div style={{ marginTop: 4, fontFamily: styles.mono.fontFamily }}>public/data/pangasinan_barangays.json</div></div></div>
                  ) : (
                    <>
                      <div style={styles.label}>Select Barangay *</div>
                      <div style={styles.list}>
                        {filterList(barangayOptions).map((b) => {
                          const name = typeof b === "string" ? b : b.name;
                          const active = name === barangay;
                          return (
                            <button type="button" key={name} style={{ ...styles.listBtn, ...(active ? styles.listBtnActive : null) }} onClick={() => { setBarangay(name); const lat = typeof b === "string" ? null : Number(b.lat); const lng = typeof b === "string" ? null : Number(b.lng); if (Number.isFinite(lat) && Number.isFinite(lng)) setCoords({ lat, lng }); else setCoords(null); }}>
                              {name}
                            </button>
                          );
                        })}
                        {barangayOptions.length === 0 ? <div style={{ padding: 10, fontSize: 12, opacity: 0.75 }}>No barangays found for this municipality in the JSON file.</div> : null}
                      </div>
                    </>
                  )}

                  <div style={{ fontSize: 12, opacity: 0.75 }}>Preview: <b>{displayText || "—"}</b></div>

                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" style={styles.btnGhost} onClick={back}>Back</button>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" style={styles.btnGhost} onClick={goToMap} disabled={!canSave}>Pin on Map</button>
                      <button type="button" style={styles.btnDark} onClick={save} disabled={!canSave}>Save</button>
                    </div>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div style={styles.label}>Click map or drag marker</div>
                  <div style={styles.mapBox}>
                    <MapContainer center={[coords?.lat || 15.9167, coords?.lng || 120.3333]} zoom={coords ? 16 : 12} minZoom={9} maxZoom={18} style={{ height: "100%", width: "100%" }}>
                      <LayersControl position="topright">
                        <LayersControl.BaseLayer checked name="Default (OSM)"><TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" /></LayersControl.BaseLayer>
                        <LayersControl.BaseLayer name="Satellite (Esri)"><TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Tiles &copy; Esri" /></LayersControl.BaseLayer>
                      </LayersControl>
                      <FlyToCenter coords={coords} zoom={16} />
                      <ClickToMoveMarker onPick={setCoords} />
                      {coords && (<Marker position={[coords.lat, coords.lng]} draggable eventHandlers={{ dragend: (e) => { const p = e.target.getLatLng(); setCoords({ lat: p.lat, lng: p.lng }); } }} />)}
                    </MapContainer>
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>
                    <div><b>Selected:</b> {displayText}</div>
                    <div><b>Coordinates:</b> {coords ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : "—"}</div>
                    {!coords ? <div style={{ marginTop: 4, opacity: 0.85 }}>* This barangay has no coords in JSON. Please click the map to set a pin.</div> : null}
                  </div>
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

function AddressViewModal({
  project,
  onClose,
  styles,
  openGoogleMap,
  openGoogleDirections,
}) {
  if (!project) return null;

  const meta = project.addressMeta || null;
  const hasCoords =
    Number.isFinite(Number(meta?.lat)) && Number.isFinite(Number(meta?.lng));

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div
        style={{ ...styles.modal, width: "min(720px, 100%)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.modalHeader}>
          <div>View Venue/Address — {project.projectTitle}</div>
          <button type="button" style={styles.btnGhost} onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={styles.modalBody}>
          <div style={{ display: "grid", gap: 10 }}>
            <div>
              <div style={styles.label}>Display Venue/Address</div>
              <div
                style={{
                  padding: "10px 12px",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  background: "#f8fafc",
                }}
              >
                {project.address || "—"}
              </div>
            </div>

            <div style={styles.grid}>
              <div style={styles.field}>
                <div style={styles.label}>Mode</div>
                <div style={{ fontWeight: 900 }}>{meta?.mode || "—"}</div>
              </div>

              <div style={styles.field}>
                <div style={styles.label}>Coordinates</div>
                <div style={{ ...styles.mono, fontSize: 12 }}>
                  {hasCoords ? `${meta.lat}, ${meta.lng}` : "—"}
                </div>
              </div>
            </div>

            {hasCoords ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  style={styles.tinyBtn}
                  onClick={() => openGoogleMap(meta.lat, meta.lng)}
                >
                  Map
                </button>
                <button
                  type="button"
                  style={styles.tinyBtn}
                  onClick={() => openGoogleDirections(meta.lat, meta.lng)}
                >
                  Directions
                </button>
              </div>
            ) : (
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                * No coordinates saved yet (Pin on Map not used).
              </div>
            )}
          </div>
        </div>

        <div style={styles.modalFooter}>
          <button type="button" style={styles.btnDark} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ViewProjectModal({
  project,
  onClose,
  styles,
  getOI,
  sumOI,
  blankQuarterObj,
  money,
  getInterventionLabel,
  openGoogleMap,
  openGoogleDirections,
  onViewIntervention,
  onSaveDateApproved,
  setupCustomFields = [],
}) {
  const [dateApprovedInput, setDateApprovedInput] = useState("");

  useEffect(() => {
    setDateApprovedInput(
      project?.dateApproved || project?.date_approved || project?.dateProjectApproval || ""
    );
  }, [project]);

  if (!project) return null;

  const meta = project.addressMeta || null;
  const hasCoords =
    Number.isFinite(Number(meta?.lat)) && Number.isFinite(Number(meta?.lng));

  const rawCustomFields = project?.customFields || project?.custom_fields || {};

  const projectCustomFields =
    typeof rawCustomFields === "string"
      ? (() => {
        try {
          return JSON.parse(rawCustomFields || "{}");
        } catch {
          return {};
        }
      })()
      : rawCustomFields || {};

  const displayCustomFields =
    setupCustomFields.length > 0
      ? setupCustomFields
      : Object.keys(projectCustomFields || {}).map((key) => ({
        key,
        fieldKey: key,
        field_label: key,
        fieldLabel: key,
      }));

  const oi = getOI(project.id);
  const totalJobs = sumOI(oi.jobsGenerated || blankQuarterObj());
  const totalInc = sumOI(oi.jobsIncreasePct || blankQuarterObj());
  const totalProd = sumOI(oi.productivityPct || blankQuarterObj());
  const totalGross = sumOI(oi.grossSales || blankQuarterObj());

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div
        style={{ ...styles.modal, width: "min(980px, 100%)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.modalHeader}>
          <div>View Project</div>
          <button type="button" style={styles.btnGhost} onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={styles.modalBody}>
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ fontWeight: 900, fontSize: 14, color: "#0f172a" }}>
              Project Information
            </div>

            <div style={styles.grid}>
              <div style={styles.field}>
                <div style={styles.label}>Project Title</div>
                <div style={{ fontWeight: 900 }}>{project.projectTitle || "—"}</div>
              </div>

              <div style={styles.field}>
                <div style={styles.label}>Name of Firm</div>
                <div style={{ fontWeight: 900 }}>{project.firmName || "—"}</div>
              </div>

              <div style={styles.field}>
                <div style={styles.label}>Cooperator Name</div>
                <div style={{ fontWeight: 900 }}>
                  {project.cooperatorName || "—"}
                </div>
              </div>

              <div style={styles.field}>
                <div style={styles.label}>Age</div>
                <div style={{ fontWeight: 900 }}>{project.age ?? "—"}</div>
              </div>

              <div style={styles.field}>
                <div style={styles.label}>Sex</div>
                <div style={{ fontWeight: 900 }}>{project.sex || "—"}</div>
              </div>
              <div style={styles.field}>
                <div style={styles.label}>SPIN Number</div>
                <div style={{ fontWeight: 900 }}>{project.spinNumber || "—"}</div>
              </div>

              <div style={styles.field}>
                <div style={styles.label}>Sector</div>
                <div style={{ fontWeight: 900 }}>{project.sector || "—"}</div>
              </div>
              <div style={styles.field}>
                <div style={styles.label}>District</div>
                <div style={{ fontWeight: 900 }}>{project.district || "—"}</div>
              </div>

              <div style={styles.field}>
                <div style={styles.label}>Funded</div>
                <div style={{ fontWeight: 900 }}>{project.funded || "—"}</div>
              </div>

              <div style={styles.field}>
                <div style={styles.label}>Amount</div>
                <div style={{ fontWeight: 900 }}>{money(project.amount)}</div>
              </div>

              <div style={styles.field}>
                <div style={styles.label}>Status</div>
                <div style={{ fontWeight: 900 }}>{project.status || "—"}</div>
              </div>

              <div style={styles.field}>
                <div style={styles.label}>Type</div>
                <div style={{ fontWeight: 900 }}>{project.type || "—"}</div>
              </div>

              <div style={styles.field}>
                <div style={styles.label}>Date Approved</div>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <input
                    style={{ ...styles.input, maxWidth: 220 }}
                    type="date"
                    value={dateApprovedInput || ""}
                    onChange={(e) => setDateApprovedInput(e.target.value)}
                  />
                  <button
                    type="button"
                    style={styles.tinyBtn}
                    onClick={() => onSaveDateApproved(project.id, dateApprovedInput || "")}
                  >
                    Save Date
                  </button>
                </div>
              </div>
            </div>

            <div>
              <div style={styles.label}>Venue/Address</div>
              <div
                style={{
                  padding: "10px 12px",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  background: "#f8fafc",
                  fontWeight: 800,
                }}
              >
                {project.address || "—"}
              </div>
            </div>

            <div style={styles.grid}>
              <div style={styles.field}>
                <div style={styles.label}>Venue/Address Mode</div>
                <div style={{ fontWeight: 900 }}>{meta?.mode || "—"}</div>
              </div>

              <div style={styles.field}>
                <div style={styles.label}>Coordinates</div>
                <div
                  style={{
                    ...styles.mono,
                    fontSize: 12,
                    fontWeight: 900,
                  }}
                >
                  {hasCoords ? `${meta.lat}, ${meta.lng}` : "—"}
                </div>
              </div>
            </div>

            {hasCoords ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  style={styles.tinyBtn}
                  onClick={() => openGoogleMap(meta.lat, meta.lng)}
                >
                  Map
                </button>
                <button
                  type="button"
                  style={styles.tinyBtn}
                  onClick={() => openGoogleDirections(meta.lat, meta.lng)}
                >
                  Directions
                </button>
              </div>
            ) : null}

            {displayCustomFields.length > 0 ? (
              <div>
                <div
                  style={{
                    fontWeight: 900,
                    fontSize: 14,
                    color: "#0f172a",
                    marginBottom: 10,
                  }}
                >
                  Custom Fields
                </div>

                <div style={styles.grid}>
                  {displayCustomFields.map((field) => {
                    const key = field.fieldKey || field.field_key || field.key;
                    const label =
                      field.fieldLabel || field.field_label || field.label || key;
                    const value = projectCustomFields?.[key];

                    return (
                      <div style={styles.field} key={key}>
                        <div style={styles.label}>{label}</div>
                        <div
                          style={{
                            padding: "10px 12px",
                            border: "1px solid #e2e8f0",
                            borderRadius: 10,
                            background: "#f8fafc",
                            fontWeight: 800,
                            minHeight: 38,
                            whiteSpace: "pre-wrap",
                          }}
                        >
                          {value === null ||
                            value === undefined ||
                            value === ""
                            ? "—"
                            : String(value)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div>
              <div style={styles.label}>Name of Staff</div>
              <div
                style={{
                  padding: "10px 12px",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  background: "#f8fafc",
                  fontWeight: 800,
                }}
              >
                {project.nameOfStaff || "—"}
              </div>
            </div>

            <div>
              <div style={styles.label}>Remarks</div>
              <div
                style={{
                  padding: "10px 12px",
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  background: "#f8fafc",
                  whiteSpace: "pre-wrap",
                  fontWeight: 800,
                  minHeight: 50,
                }}
              >
                {project.remarks || "—"}
              </div>
            </div>

            <div style={{ fontWeight: 900, fontSize: 14, color: "#0f172a" }}>
              S&amp;T Interventions
            </div>

            {Array.isArray(project.interventions) &&
              project.interventions.length > 0 ? (
              <div
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: 10,
                  overflow: "hidden",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={styles.rptTh}>#</th>
                      <th style={styles.rptTh}>Type</th>
                      <th style={styles.rptTh}>Title / Label</th>
                      <th style={styles.rptTh}>Date</th>
                      <th style={styles.rptTh}>Venue</th>
                      <th style={styles.rptTh}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {project.interventions.map((it, idx) => (
                      <tr key={it.id}>
                        <td style={styles.rptTd}>{idx + 1}</td>
                        <td style={styles.rptTd}>{it.type || "—"}</td>
                        <td style={styles.rptTd}>{getInterventionLabel(it)}</td>
                        <td style={styles.rptTd}>{it.date || "—"}</td>
                        <td style={styles.rptTd}>{it.venue || "—"}</td>
                        <td style={styles.rptTd}>
                          <button
                            type="button"
                            style={styles.tinyBtn}
                            onClick={() => onViewIntervention(project.id, it.id)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                No interventions yet.
              </div>
            )}

            <div style={{ fontWeight: 900, fontSize: 14, color: "#0f172a" }}>
              Other Indicators
            </div>

            <div
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={styles.rptTh}>Indicator</th>
                    <th style={styles.rptTh}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={styles.rptTdLeft}>No. of Jobs Generated</td>
                    <td style={styles.rptTd}>{totalJobs || "—"}</td>
                  </tr>
                  <tr>
                    <td style={styles.rptTdLeft}>
                      % increase in jobs generated
                    </td>
                    <td style={styles.rptTd}>
                      {totalInc ? `${totalInc}%` : "—"}
                    </td>
                  </tr>
                  <tr>
                    <td style={styles.rptTdLeft}>
                      % improvement in productivity
                    </td>
                    <td style={styles.rptTd}>
                      {totalProd ? `${totalProd}%` : "—"}
                    </td>
                  </tr>
                  <tr>
                    <td style={styles.rptTdLeft}>
                      Amount of gross sales generated (in Php&apos;000)
                    </td>
                    <td style={styles.rptTd}>
                      {totalGross ? money(totalGross) : "—"}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div style={styles.modalFooter}>
          <button type="button" style={styles.btnDark} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function AddEditProjectModal({
  open,
  onClose,
  onSave,
  editProjectId,
  form,
  setForm,
  styles,
  STATUS_OPTIONS,
  TYPE_OPTIONS,
  SECTOR_OPTIONS,
  setupCustomFields = [],
  detectMunicipalityFromAddressText,
  getDistrictFromMunicipality,
  setAddressFlowOpen,
  setAddressFlowTarget,
}) {
  if (!open) return null;

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>{editProjectId ? "Edit Project" : "Add Project"}</div>
          <button type="button" style={styles.btnGhost} onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={styles.modalBody}>
          <div style={styles.grid}>
            <div style={styles.field}>
              <div style={styles.label}>Project Title *</div>
              <input
                style={styles.input}
                value={form.projectTitle}
                onChange={(e) =>
                  setForm((p) => ({ ...p, projectTitle: e.target.value }))
                }
              />
            </div>

            <div style={styles.field}>
              <div style={styles.label}>Name of Firm *</div>
              <input
                style={styles.input}
                value={form.firmName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, firmName: e.target.value }))
                }
              />
            </div>

            <div style={styles.field}>
              <div style={styles.label}>Cooperator Name *</div>
              <input
                style={styles.input}
                value={form.cooperatorName}
                onChange={(e) =>
                  setForm((p) => ({ ...p, cooperatorName: e.target.value }))
                }
              />
            </div>

            <div style={styles.field}>
              <div style={styles.label}>Age</div>
              <input
                style={styles.input}
                type="number"
                min="0"
                value={form.age}
                onChange={(e) =>
                  setForm((p) => ({ ...p, age: e.target.value }))
                }
              />
            </div>

            <div style={styles.field}>
              <div style={styles.label}>Sex</div>
              <select
                style={styles.input}
                value={form.sex}
                onChange={(e) =>
                  setForm((p) => ({ ...p, sex: e.target.value }))
                }
              >

                <option value="M">M</option>
                <option value="F">F</option>
              </select>
            </div>

            <div style={styles.field}>
              <div style={styles.label}>SPIN Number</div>
              <input
                style={styles.input}
                value={form.spinNumber}
                onChange={(e) =>
                  setForm((p) => ({ ...p, spinNumber: e.target.value }))
                }
              />
            </div>

            <div style={styles.field}>
              <div style={styles.label}>Sector</div>
              <select
                style={styles.input}
                value={form.sector}
                onChange={(e) =>
                  setForm((p) => ({ ...p, sector: e.target.value }))
                }
              >
                <option value="">-- Select Sector --</option>
                {SECTOR_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.field}>
              <div style={styles.label}>District</div>
              <input
                style={{ ...styles.input, background: "#f8fafc" }}
                value={form.district || ""}
                readOnly
                placeholder="Auto-filled from address"
              />
            </div>

            <div style={styles.field}>
              <div style={styles.label}>Funded</div>
              <select
                style={styles.input}
                value={form.funded}
                onChange={(e) =>
                  setForm((p) => ({ ...p, funded: e.target.value }))
                }
              >
                <option value="N">N</option>
                <option value="Y">Y</option>
              </select>
            </div>

            <div style={styles.field}>
              <div style={styles.label}>Amount *</div>
              <input
                style={styles.input}
                type="number"
                value={form.amount}
                onChange={(e) =>
                  setForm((p) => ({ ...p, amount: e.target.value }))
                }
              />
            </div>

            <div style={styles.field}>
              <div style={styles.label}>Status</div>
              <select
                style={styles.input}
                value={form.status}
                onChange={(e) =>
                  setForm((p) => ({ ...p, status: e.target.value }))
                }
              >

                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div style={styles.field}>
              <div style={styles.label}>Type</div>
              <select
                style={styles.input}
                value={form.type}
                onChange={(e) =>
                  setForm((p) => ({ ...p, type: e.target.value }))
                }
              >

                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
              <div style={styles.label}>Venue/Address *</div>

              <button
                type="button"
                onClick={() => {
                  setAddressFlowTarget("project");
                  setAddressFlowOpen(true);
                }}
                style={{
                  position: "relative",
                  width: "100%",
                  border: "1px solid #cbd5e1",
                  borderRadius: 10,
                  background: "#fff",
                  minHeight: 42,
                  padding: "0 92px 0 12px",
                  textAlign: "left",
                  cursor: "pointer",
                  fontFamily: styles.input.fontFamily,
                }}
              >
                <span
                  style={{
                    display: "block",
                    fontSize: 13,
                    color: form.address ? "#0f172a" : "#64748b",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    lineHeight: "40px",
                  }}
                >
                  {form.address || "Click to select venue/address"}
                </span>

                <span
                  style={{
                    position: "absolute",
                    right: 6,
                    top: "50%",
                    transform: "translateY(-50%)",
                    border: "1px solid #cbd5e1",
                    background: "#fff",
                    padding: "6px 12px",
                    borderRadius: 8,
                    fontWeight: 800,
                    fontSize: 12,
                    color: "#0f172a",
                    pointerEvents: "none",
                  }}
                >
                  Select
                </span>
              </button>
            </div>

            <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
              <div style={styles.label}>Name of Staff</div>
              <input
                style={styles.input}
                value={form.nameOfStaff || ""}
                onChange={(e) =>
                  setForm((p) => ({ ...p, nameOfStaff: e.target.value }))
                }
                placeholder="Optional"
              />
            </div>

            {setupCustomFields.length > 0 && (
              <div
                style={{
                  gridColumn: "1 / -1",
                  marginTop: 4,
                  paddingTop: 14,
                  borderTop: "1px solid #e5e7eb",
                }}
              >
                <div style={styles.formGrid}>
                  {setupCustomFields
                    .filter((field) => {
                      const key = String(field.fieldKey || field.field_key || field.key || "").trim();
                      return ![
                        "dateApproved",
                        "date_approved",
                        "dateProjectApproval",
                        "date_project_approval",
                        "approvedDate",
                        "approved_date",
                      ].includes(key);
                    })
                    .map((field) => {
                      const key = field.fieldKey || field.field_key;
                      const label = field.fieldLabel || field.field_label || key;
                      const type = String(field.fieldType || field.field_type || "Text").toLowerCase();
                      const value = form.customFields?.[key] ?? "";

                      const updateCustomField = (newValue) => {
                        setForm((prev) => ({
                          ...prev,
                          customFields: {
                            ...(prev.customFields || {}),
                            [key]: newValue,
                          },
                        }));
                      };

                      if (type.includes("textarea")) {
                        return (
                          <div style={styles.field} key={key}>
                            <div style={styles.label}>{label}</div>
                            <textarea
                              style={styles.textarea}
                              value={value}
                              onChange={(e) => updateCustomField(e.target.value)}
                            />
                          </div>
                        );
                      }

                      if (type.includes("date")) {
                        return (
                          <div style={styles.field} key={key}>
                            <div style={styles.label}>{label}</div>
                            <input
                              type="date"
                              style={styles.input}
                              value={value}
                              onChange={(e) => updateCustomField(e.target.value)}
                            />
                          </div>
                        );
                      }

                      if (type.includes("number") || type.includes("currency")) {
                        return (
                          <div style={styles.field} key={key}>
                            <div style={styles.label}>{label}</div>
                            <input
                              type="number"
                              style={styles.input}
                              value={value}
                              onChange={(e) => updateCustomField(e.target.value)}
                            />
                          </div>
                        );
                      }

                      if (type.includes("yes/no")) {
                        return (
                          <div style={styles.field} key={key}>
                            <div style={styles.label}>{label}</div>
                            <select
                              style={styles.input}
                              value={value}
                              onChange={(e) => updateCustomField(e.target.value)}
                            >
                              <option value="">-- Select --</option>
                              <option value="Yes">Yes</option>
                              <option value="No">No</option>
                            </select>
                          </div>
                        );
                      }

                      return (
                        <div style={styles.field} key={key}>
                          <div style={styles.label}>{label}</div>
                          <input
                            style={styles.input}
                            value={value}
                            onChange={(e) => updateCustomField(e.target.value)}
                          />
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
            <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
              <div style={styles.label}>Remarks</div>
              <textarea
                style={styles.textarea}
                value={form.remarks}
                onChange={(e) =>
                  setForm((p) => ({ ...p, remarks: e.target.value }))
                }
              />
            </div>
          </div>
        </div>

        <div style={styles.modalFooter}>
          <button type="button" style={styles.btnGhost} onClick={onClose}>
            Cancel
          </button>
          <button type="button" style={styles.btnDark} onClick={onSave}>
            {editProjectId ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReportModal({
  open,
  onClose,
  styles,
  reportProject,
  reportForm,
  setReportForm,
  saveReport,
}) {
  if (!open) return null;

  const setQ = (key, q, v) => {
    setReportForm((p) => ({
      ...p,
      [key]: { ...(p[key] || {}), [q]: v },
    }));
  };

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            Other Indicators Report{" "}
            {reportProject ? `— ${reportProject.projectTitle}` : ""}
          </div>
          <button type="button" style={styles.btnGhost} onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={styles.modalBody}>
          <table style={styles.rptTable}>
            <thead>
              <tr>
                <th style={styles.rptTh}>Indicator</th>
                <th style={styles.rptTh}>Q1</th>
                <th style={styles.rptTh}>Q2</th>
                <th style={styles.rptTh}>Q3</th>
                <th style={styles.rptTh}>Q4</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["jobsGenerated", "No. of Jobs Generated"],
                ["jobsIncreasePct", "% increase in jobs generated"],
                ["productivityPct", "% improvement in productivity"],
                ["grossSales", "Amount of gross sales generated (in Php'000)"],
              ].map(([k, label]) => (
                <tr key={k}>
                  <td style={styles.rptTdLeft}>{label}</td>
                  {["q1", "q2", "q3", "q4"].map((q) => (
                    <td key={q} style={styles.rptTd}>
                      <input
                        style={styles.rptInput}
                        value={reportForm?.[k]?.[q] ?? ""}
                        onChange={(e) => setQ(k, q, e.target.value)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={styles.modalFooter}>
          <button type="button" style={styles.btnGhost} onClick={onClose}>
            Cancel
          </button>
          <button type="button" style={styles.btnDark} onClick={saveReport}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Setup() {
  const fontFamily =
    '"Poppins", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"';

  const INTERVENTION_OPTIONS = [
    "Training",
    "Tech Roll Out",
    "TACS",
    "Packaging & Labeling",
    "Calibration",
    "TNA Report",
  ];
  const STATUS_OPTIONS = ["Ongoing", "Terminated", "Graduated"];
  const TYPE_OPTIONS = ["Phase 1 (New)", "Phase 2", "Phase 3"];
  const SECTOR_OPTIONS = [
    "Food Processing",
    "Crop and animal production, hunting, and related service activities",
    "Forestry and Logging",
    "Fishing and Aquaculture",
    "Furniture Manufacturing",
    "Fabricated Metal Products Manufacturing",
    "Machinery and Equipment, NEC (Not Elsewhere Classified) Manufacturing",
    "Information and Communication",
    "Basic Pharmaceutical Products and Pharmaceutical Preparations Manufacturing",
    "Beverage Manufacturing",
    "Textile Manufacturing",
    "Wood and Products of Wood and Cork Manufacturing",
    "Paper and Paper Products Manufacturing",
    "Rubber and Plastic Products Manufacturing",
    "Non-metallic Mineral Products Manufacturing",
    "Other Transport Equipment Manufacturing",
    "Weaving Apparel Manufacturing",
    "Leather and Related Products Manufacturing",
    "Chemicals and Chemical Products Manufacturing",
  ];
  const DEFAULT_TACS_CONSULTANCY_OPTIONS = [
    "Plant layout",
    "Simple TACS",
    "Food safety/assessment",
    "Cleaner Production",
    "Energy audit",
  ];

  const ADDRESS_META_STORAGE_KEY = "setup_address_meta_by_project_v1";

  const [projects, setProjects] = useState([]);
  const [addressMetaByProject, setAddressMetaByProject] = useState({});
  const [otherIndicatorsByProject, setOtherIndicatorsByProject] = useState({});

  const [showAdd, setShowAdd] = useState(false);
  const [editProjectId, setEditProjectId] = useState(null);
  const [viewProjectId, setViewProjectId] = useState(null);

  const [viewAllIntvProjectId, setViewAllIntvProjectId] = useState(null);

  const [reportForProjectId, setReportForProjectId] = useState(null);
  const [reportForm, setReportForm] = useState({
    jobsGenerated: { q1: "", q2: "", q3: "", q4: "" },
    jobsIncreasePct: { q1: "", q2: "", q3: "", q4: "" },
    productivityPct: { q1: "", q2: "", q3: "", q4: "" },
    grossSales: { q1: "", q2: "", q3: "", q4: "" },
  });

  const [addressFlowOpen, setAddressFlowOpen] = useState(false);
  const [addressFlowTarget, setAddressFlowTarget] = useState("project");
  const [addressViewForProjectId, setAddressViewForProjectId] = useState(null);
  const [customTacsConsultancyOptions, setCustomTacsConsultancyOptions] =
    useState([]);
  const [newTacsType, setNewTacsType] = useState("");
  const [showAddTacsTypeModal, setShowAddTacsTypeModal] = useState(false);
  const [setupCustomFields, setSetupCustomFields] = useState([]);

  const [form, setForm] = useState({
    projectTitle: "",
    firmName: "",
    cooperatorName: "",
    age: "",
    sex: "",
    spinNumber: "",
    sector: "",
    district: "",
    address: "",
    funded: "N",
    amount: "",
    status: "",
    type: "",
    dateApproved: "",
    nameOfStaff: "",
    remarks: "",
    addressMeta: null,
    customFields: {},
  });

  const [pickForId, setPickForId] = useState(null);
  const [selectedInterventionByProject, setSelectedInterventionByProject] =
    useState({});

  const makeDefaultTechRows = () => [
    {
      unitCenter: "DOST-PANGASINAN",
      knowledgeTech: "",
      techGenerator: "",
      modeTransfer: "",
      dateTransferred: "",
      activityTitle: "",
      activityDateVenue: "",
      institutionNameAddress: "",
      classification: "",
      representativeNameDesignation: "",
      sex: "",
    },
  ];

  const [detailFor, setDetailFor] = useState(null);
  const [viewInterventionFor, setViewInterventionFor] = useState(null);
  const [detailForm, setDetailForm] = useState({
    type: "",
    title: "",
    date: "",
    venue: "",
    venueMeta: null,
    noOfFirms: "",
    firmsSucsHeisLgusCount: "",
    male: "",
    female: "",
    total: "",
    seniorFemale: "",
    seniorMale: "",
    ipFemale: "",
    ipMale: "",
    fourPsFemale: "",
    fourPsMale: "",
    pwdFemale: "",
    pwdMale: "",
    firmsAssociationsList: "",
    trainorAffiliation: "",
    projectProgramUnit: "",
    costDost: "",
    costPartnerAgency: "",
    totalCost: "",
    notesEndDate: "",
    notesProvince: "Pangasinan",
    notes: "",
    techRows: [],

    // ✅ TACS fields
    consultancyType: "",
    dateEngagement: "",
    expertInstitution: "",
    customerName: "",
    customerSex: "",
    customerAddress: "",
    customerAddressMeta: null,
    meansVerification: "",
    noOfAdvice: "",

    // ✅ Packaging & Labeling fields
    packagingQuarter: "",
    packagingProvince: "Pangasinan",
    packagingDateCompleted: "",
    packagingServiceType: "Label Design",
    packagingProductName: "",
    packagingSizeVariantMaterial: "",
    packagingMaterialsProvided: "",
    packagingCustomerName: "",
    packagingCustomerSex: "",
    packagingFirmName: "",
    packagingAddress: "",
    packagingAddressMeta: null,
    packagingMeansVerification: "",
    packagingRemarks: "",

    calibrationData: getDefaultCalibrationData(),
  });

  const updateTechRow = (idx, key, val) => {
    setDetailForm((prev) => {
      const next = [...(prev.techRows || [])];
      next[idx] = { ...(next[idx] || {}), [key]: val };
      return { ...prev, techRows: next };
    });
  };

  const addTechRow = () => {
    setDetailForm((prev) => ({
      ...prev,
      techRows: [...(prev.techRows || []), ...makeDefaultTechRows()],
    }));
  };

  const removeTechRow = (idx) => {
    setDetailForm((prev) => {
      const arr = [...(prev.techRows || [])];
      arr.splice(idx, 1);
      return { ...prev, techRows: arr.length ? arr : makeDefaultTechRows() };
    });
  };

  const [outlineGeo, setOutlineGeo] = useState(null);
  const [municipalGeo, setMunicipalGeo] = useState(null);
  const [geoError, setGeoError] = useState("");

  const [borderMode, setBorderMode] = useState("municipality");
  const [selectedMunicipality, setSelectedMunicipality] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");

  const [tableFilterYear, setTableFilterYear] = useState("ALL");
  const [tableFilterDistrict, setTableFilterDistrict] = useState("ALL");
  const [tableFilterMonth, setTableFilterMonth] = useState("ALL");
  const [tableFilterMunicipality, setTableFilterMunicipality] = useState("ALL");
  const [tableFilterStatus, setTableFilterStatus] = useState("ALL");
  const [tableFilterFirmName, setTableFilterFirmName] = useState("");
  const [debouncedFirmName, setDebouncedFirmName] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [serverTotalPages, setServerTotalPages] = useState(1);
  const [serverTotalRows, setServerTotalRows] = useState(0);

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
  const ITEMS_PER_PAGE = 10;
  const PAGE_NUMBER_WINDOW = 10;

  const tacsConsultancyOptions = Array.from(
    new Set(
      [
        ...DEFAULT_TACS_CONSULTANCY_OPTIONS,
        ...customTacsConsultancyOptions,
      ]
        .map((x) => String(x || "").trim())
        .filter(Boolean)
    )
  );

  const toNumber = (v) => {
    if (v === "" || v === null || v === undefined) return 0;
    const n = Number(String(v).replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const getTrainingParticipantsFemale = (row = {}) =>
    toNumber(row.female ?? row.participantsFemale);

  const getTrainingParticipantsMale = (row = {}) =>
    toNumber(row.male ?? row.participantsMale);

  const getTrainingFemaleTotal = (row = {}) => {
    return getTrainingParticipantsFemale(row);
  };

  const getTrainingMaleTotal = (row = {}) => {
    return getTrainingParticipantsMale(row);
  };

  const getTrainingGrandTotal = (row = {}) => {
    return getTrainingParticipantsFemale(row) + getTrainingParticipantsMale(row);
  };

  const money = (n) =>
    toNumber(n).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const blankQuarterObj = () => ({ q1: 0, q2: 0, q3: 0, q4: 0 });
  const sumOI = (o) =>
    toNumber(o.q1) + toNumber(o.q2) + toNumber(o.q3) + toNumber(o.q4);

  const getQuarterFromDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;
    const m = d.getMonth() + 1;
    if (m <= 3) return 1;
    if (m <= 6) return 2;
    if (m <= 9) return 3;
    return 4;
  };

  const mapDbOI = (rowOrNull) => {
    const r = rowOrNull || {};
    return {
      jobsGenerated: {
        q1: toNumber(r.jobs_q1),
        q2: toNumber(r.jobs_q2),
        q3: toNumber(r.jobs_q3),
        q4: toNumber(r.jobs_q4),
      },
      jobsIncreasePct: {
        q1: toNumber(r.jobs_inc_q1),
        q2: toNumber(r.jobs_inc_q2),
        q3: toNumber(r.jobs_inc_q3),
        q4: toNumber(r.jobs_inc_q4),
      },
      productivityPct: {
        q1: toNumber(r.prod_q1),
        q2: toNumber(r.prod_q2),
        q3: toNumber(r.prod_q3),
        q4: toNumber(r.prod_q4),
      },
      grossSales: {
        q1: toNumber(r.gross_q1),
        q2: toNumber(r.gross_q2),
        q3: toNumber(r.gross_q3),
        q4: toNumber(r.gross_q4),
      },
    };
  };

  const fetchOtherIndicatorsForProjects = async (projectIds) => {
    if (!Array.isArray(projectIds) || projectIds.length === 0) {
      setOtherIndicatorsByProject({});
      return;
    }

    try {
      const requests = projectIds.map((id) =>
        axios
          .get(`${API}/projects/${id}/other-indicators`)
          .then((res) => ({ id, data: res.data }))
          .catch(() => ({ id, data: null }))
      );

      const results = await Promise.all(requests);

      setOtherIndicatorsByProject((prev) => {
        const next = { ...prev };
        results.forEach(({ id, data }) => {
          next[id] = mapDbOI(data);
        });
        return next;
      });
    } catch (e) {
      console.error(e);
    }
  };

  const getOI = (projectId) => {
    const oi = otherIndicatorsByProject?.[projectId] || {};
    return {
      jobsGenerated: oi.jobsGenerated || blankQuarterObj(),
      jobsIncreasePct: oi.jobsIncreasePct || blankQuarterObj(),
      productivityPct: oi.productivityPct || blankQuarterObj(),
      grossSales: oi.grossSales || blankQuarterObj(),
    };
  };

  const hasAnyOI = (projectId) => {
    const oi = otherIndicatorsByProject?.[projectId];
    if (!oi) return false;
    const total =
      sumOI(oi.jobsGenerated || blankQuarterObj()) +
      sumOI(oi.jobsIncreasePct || blankQuarterObj()) +
      sumOI(oi.productivityPct || blankQuarterObj()) +
      sumOI(oi.grossSales || blankQuarterObj());
    return total !== 0;
  };

  const loadAddressMetaStorage = () => {
    try {
      const raw = localStorage.getItem(ADDRESS_META_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  };

  const saveAddressMetaStorage = (nextMap) => {
    setAddressMetaByProject(nextMap);
    try {
      localStorage.setItem(ADDRESS_META_STORAGE_KEY, JSON.stringify(nextMap));
    } catch { }
  };

  useEffect(() => {
    saveAddressMetaStorage(loadAddressMetaStorage());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getDistrictFromMunicipality = (municipalityName) => {
    const muni = String(municipalityName || "")
      .trim()
      .toLowerCase();

    const found = PANGASINAN_DISTRICTS.find((d) =>
      d.municipalities.some((m) => String(m).trim().toLowerCase() === muni)
    );

    return found?.id || "";
  };

  const detectMunicipalityFromAddressText = (addressText) => {
    const text = String(addressText || "").toLowerCase();

    const found = PANGASINAN_LGUS.find((muni) =>
      text.includes(String(muni).toLowerCase())
    );

    return found || "";
  };

  const applyAddressMetaToForm = (meta) => {
    const municipality =
      meta?.municipality ||
      detectMunicipalityFromAddressText(meta?.displayText || "");

    const autoDistrict = getDistrictFromMunicipality(municipality);

    setForm((prev) => ({
      ...prev,
      address: meta?.displayText || "",
      addressMeta: meta || null,
      district: autoDistrict || prev.district,
    }));
  };

  const applyAddressMetaToDetailForm = (meta, target = "tacs") => {
    setDetailForm((prev) => {
      if (target === "training") {
        return {
          ...prev,
          venue: meta?.displayText || "",
          venueMeta: meta || null,
        };
      }

      if (target === "packaging") {
        return {
          ...prev,
          packagingAddress: meta?.displayText || "",
          packagingAddressMeta: meta || null,
        };
      }

      if (target === "calibration") {
        return {
          ...prev,
          calibrationData: {
            ...(prev.calibrationData || getDefaultCalibrationData()),
            address: meta?.displayText || "",
            addressMeta: meta || null,
          },
        };
      }

      return {
        ...prev,
        customerAddress: meta?.displayText || "",
        customerAddressMeta: meta || null,
      };
    });
  };

  const persistProjectAddressMeta = (projectId, meta) => {
    if (!projectId) return;
    const next = { ...(loadAddressMetaStorage() || {}) };
    if (meta) next[String(projectId)] = meta;
    else delete next[String(projectId)];
    saveAddressMetaStorage(next);
  };

  const fetchProjects = async (signal) => {
    try {
      const res = await axios.get(`${API}/projects`, {
        params: {
          page: currentPage,
          limit: ITEMS_PER_PAGE,
          year: tableFilterYear,
          district: tableFilterDistrict,
          month: tableFilterMonth,
          municipality: tableFilterMunicipality,
          status: tableFilterStatus,
          search: debouncedFirmName,
        },
        signal,
      });

      const raw = res.data;
      const metaMap = loadAddressMetaStorage();
      const rows = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
          ? raw.data
          : [];

      setServerTotalPages(Array.isArray(raw) ? 1 : Number(raw?.totalPages || 1));
      setServerTotalRows(
        Array.isArray(raw) ? rows.length : Number(raw?.total || rows.length)
      );

      const normalized = rows.map((p) => {
        const dateApproved = (p.dateApproved ?? p.date_approved ?? "") || "";
        const quarterFromDate = getQuarterFromDate(dateApproved);
        const quarter = String(p.quarter ?? quarterFromDate ?? "1");

        const id = Number(p.id);

        const dbMeta = p.addressMeta || null;
        const localMeta = metaMap?.[String(id)] || null;
        const finalMeta = dbMeta || localMeta || null;

        return {
          id,
          projectTitle: p.projectTitle ?? p.project_title ?? "",
          quarter,
          firmName: p.firmName ?? p.firm_name ?? "",
          cooperatorName: p.cooperatorName ?? p.cooperator_name ?? "",
          age: p.age ?? "",
          sex: p.sex ?? "",
          spinNumber: p.spinNumber ?? p.spin_number ?? "",
          sector: p.sector ?? "",
          district: p.district ?? "",
          address: p.address ?? "",
          funded: String(p.funded ?? "N").toUpperCase(),
          amount: Number(p.amount ?? 0),
          nameOfStaff: p.nameOfStaff ?? p.name_of_staff ?? "",
          remarks: p.remarks ?? "",
          createdAt: p.createdAt ?? p.created_at ?? null,

          status: p.status ?? p.stpms_status ?? "",
          type: p.type ?? p.phase ?? "",
          dateApproved,
          moaSigned: (p.moaSigned ?? p.moa_signed ?? "") || "",

          addressMeta: finalMeta,
          customFields: p.customFields ?? p.custom_fields ?? {},
          custom_fields: p.custom_fields ?? p.customFields ?? {},

          interventions: Array.isArray(p.interventions)
            ? p.interventions.map((it) => ({
              id: Number(it.id),
              type: it.type ?? "",
              title: it.title ?? "",
              date: it.date ?? "",
              venue: it.venue ?? "",
              noOfFirms: it.noOfFirms ?? it.no_of_firms ?? "",
              male: it.male ?? "",
              female: it.female ?? "",
              total: it.total ?? "",
              notes: it.notes ?? "",

              tacsConsultancyType:
                it.tacsConsultancyType ?? it.tacs_consultancy_type ?? "",
              tacsDateEngagement:
                it.tacsDateEngagement ?? it.tacs_date_engagement ?? "",
              tacsExpertInstitution:
                it.tacsExpertInstitution ?? it.tacs_expert_institution ?? "",
              tacsCustomerName:
                it.tacsCustomerName ?? it.tacs_customer_name ?? "",
              tacsCustomerSex:
                it.tacsCustomerSex ?? it.tacs_customer_sex ?? "",
              tacsCustomerAddress:
                it.tacsCustomerAddress ?? it.tacs_customer_address ?? "",
              tacsCustomerAddressMeta:
                it.tacsCustomerAddressMeta ?? it.tacs_customer_address_meta ?? null,
              tacsMeansVerification:
                it.tacsMeansVerification ?? it.tacs_means_verification ?? "",
              tacsNoOfAdvice:
                it.tacsNoOfAdvice ?? it.tacs_no_of_advice ?? "",
              tacsRemarks:
                it.tacsRemarks ?? it.tacs_remarks ?? "",
            }))
            : [],
        };
      });

      setProjects(normalized);

      const ids = normalized.map((p) => p.id);
      await fetchOtherIndicatorsForProjects(ids);
    } catch (e) {
      if (
        e?.name === "CanceledError" ||
        e?.code === "ERR_CANCELED" ||
        axios.isCancel?.(e)
      ) {
        return;
      }

      console.error(e);
      setProjects([]);
      setOtherIndicatorsByProject({});
      setServerTotalPages(1);
      setServerTotalRows(0);
      alert("Failed to load projects from server. Check backend is running.");
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFirmName(String(tableFilterFirmName || "").trim());
    }, 500);

    return () => clearTimeout(timer);
  }, [tableFilterFirmName]);

  useEffect(() => {
    const controller = new AbortController();
    fetchProjects(controller.signal);

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentPage,
    tableFilterYear,
    tableFilterDistrict,
    tableFilterMonth,
    tableFilterMunicipality,
    tableFilterStatus,
    debouncedFirmName,
  ]);

  useEffect(() => {
    let cancelled = false;

    const fixedKeys = new Set([
      "no",
      "actions",
      "coordinates",
      "projectTitle",
      "project_title",
      "firmName",
      "firm_name",
      "cooperatorName",
      "cooperator_name",
      "age",
      "sex",
      "spinNumber",
      "spin_number",
      "sector",
      "district",
      "funded",
      "amount",
      "status",
      "stpms_status",
      "type",
      "phase",
      "address",
      "venueAddress",
      "venue_address",
      "nameOfStaff",
      "name_of_staff",
      "staffName",
      "staff_name",
      "remarks",
    ]);

    async function loadSetupCustomFields() {
      try {
        const res = await axios.get(`${API}/table-management/config`);
        const modules = Array.isArray(res.data) ? res.data : [];
        const setupModule = modules.find(
          (m) => String(m.moduleName || m.module_name || "").toUpperCase() === "SETUP"
        );

        const setupTable =
          (setupModule?.tables || []).find(
            (t) => String(t.tableName || t.table_name || "").toLowerCase() === "main"
          ) || (setupModule?.tables || [])[0];

        const fields = Array.isArray(setupTable?.fields) ? setupTable.fields : [];

        const customFields = fields
          .filter((f) => {
            const key = String(f.fieldKey || f.field_key || "").trim();
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

        if (!cancelled) setSetupCustomFields(customFields);
      } catch (err) {
        console.error("Failed to load SETUP custom fields:", err);
        if (!cancelled) setSetupCustomFields([]);
      }
    }

    loadSetupCustomFields();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    fetchCustomTacsConsultancyOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setGeoError("");
      try {
        const [oRes, mRes] = await Promise.all([
          fetch("/geo/pangasinan_outline.geojson"),
          fetch("/geo/pangasinan_municipalities.geojson"),
        ]);

        if (!oRes.ok) throw new Error("Missing /geo/pangasinan_outline.geojson");
        if (!mRes.ok)
          throw new Error("Missing /geo/pangasinan_municipalities.geojson");

        const [oJson, mJson] = await Promise.all([oRes.json(), mRes.json()]);
        if (cancelled) return;

        setOutlineGeo(oJson);
        setMunicipalGeo(mJson);
      } catch (e) {
        if (cancelled) return;
        setGeoError(String(e?.message || e));
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setPickForId(null);
        setDetailFor(null);
        setShowAdd(false);
        setEditProjectId(null);
        setViewProjectId(null);
        setViewAllIntvProjectId(null);
        setReportForProjectId(null);
        setAddressFlowOpen(false);
        setAddressViewForProjectId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const resetForm = () => {
    setForm({
      projectTitle: "",
      firmName: "",
      cooperatorName: "",
      age: "",
      sex: "",
      spinNumber: "",
      sector: "",
      district: "",
      address: "",
      funded: "N",
      amount: "",
      status: "",
      type: "",
      dateApproved: "",
      nameOfStaff: "",
      remarks: "",
      addressMeta: null,
      customFields: {},
    });
  };

  const openAddProject = () => {
    setEditProjectId(null);
    resetForm();
    setShowAdd(true);
  };

  const openEditProject = (id) => {
    const p = projects.find((x) => x.id === id);
    if (!p) return;

    setEditProjectId(id);
    setForm({
      projectTitle: p.projectTitle || "",
      firmName: p.firmName || "",
      cooperatorName: p.cooperatorName || "",
      age: p.age ?? "",
      sex: p.sex || "",
      spinNumber: p.spinNumber || "",
      sector: p.sector || "",
      district:
        p.district ||
        getDistrictFromMunicipality(
          p.addressMeta?.municipality ||
          detectMunicipalityFromAddressText(p.address)
        ) ||
        "",
      address: p.address || "",
      funded: String(p.funded || "N").toUpperCase(),
      amount: p.amount ?? "",
      status: p.status || "",
      type: p.type || "",
      dateApproved: p.dateApproved || "",
      nameOfStaff: p.nameOfStaff || p.name_of_staff || "",
      remarks: p.remarks || "",
      addressMeta: p.addressMeta || null,
      customFields: p.customFields || p.custom_fields || {},
    });

    setShowAdd(true);
  };

  const saveProject = async () => {
    if (!form.projectTitle.trim()) return alert("Required: Project Title");
    if (!form.firmName.trim()) return alert("Required: Name of Firm");
    if (!form.cooperatorName.trim())
      return alert("Required: Name of Cooperator");
    if (!form.address.trim()) return alert("Required: Address");
    if (form.amount === "" || Number.isNaN(Number(form.amount)))
      return alert("Required: Amount (number)");

    const existing = editProjectId
      ? projects.find((p) => p.id === editProjectId)
      : null;

    const qComputed =
      getQuarterFromDate(form.dateApproved) ?? Number(existing?.quarter) ?? 1;

    const payload = {
      project_title: form.projectTitle.trim(),
      quarter: qComputed,
      firm_name: form.firmName.trim(),
      cooperator_name: form.cooperatorName.trim(),
      age: form.age === "" ? null : Number(form.age),
      sex: (form.sex || "").trim(),
      spin_number: (form.spinNumber || "").trim(),
      sector: (form.sector || "").trim(),
      district: (
        form.district ||
        getDistrictFromMunicipality(
          form.addressMeta?.municipality ||
          detectMunicipalityFromAddressText(form.address)
        )
      ).trim(),
      address: form.address.trim(),
      funded: String(form.funded || "N").toUpperCase(),
      amount: Number(form.amount || 0),
      name_of_staff: (form.nameOfStaff || "").trim(),
      nameOfStaff: (form.nameOfStaff || "").trim(),
      remarks: (form.remarks || "").trim(),
      stpms_status: (form.status || "").trim(),
      phase: (form.type || "").trim(),
      date_approved: form.dateApproved || null,
      moa_signed: editProjectId ? existing?.moaSigned || null : null,
      addressMeta: form.addressMeta || null,
      custom_fields: form.customFields || {},
      customFields: form.customFields || {},
    };

    try {
      if (!editProjectId) {
        const res = await axios.post(`${API}/projects`, payload);
        const newId = res?.data?.id ? Number(res.data.id) : null;

        if (newId && form.addressMeta) {
          persistProjectAddressMeta(newId, form.addressMeta);
        }
      } else {
        await axios.put(`${API}/projects/${editProjectId}`, payload);

        if (form.addressMeta)
          persistProjectAddressMeta(editProjectId, form.addressMeta);
        else persistProjectAddressMeta(editProjectId, null);
      }

      await fetchProjects();

      setShowAdd(false);
      setEditProjectId(null);
      resetForm();
    } catch (e) {
      console.error(e);
      alert("Failed to save project.");
    }
  };

  const saveProjectDateApproved = async (projectId, dateApproved) => {
    const p = projects.find((x) => x.id === projectId);
    if (!p) return;

    const qComputed =
      getQuarterFromDate(dateApproved) ?? Number(p.quarter) ?? 1;

    const payload = {
      project_title: p.projectTitle || "",
      quarter: qComputed,
      firm_name: p.firmName || "",
      cooperator_name: p.cooperatorName || "",
      age: p.age === "" || p.age === null || p.age === undefined ? null : Number(p.age),
      sex: (p.sex || "").trim(),
      spin_number: (p.spinNumber || "").trim(),
      sector: (p.sector || "").trim(),
      district: (p.district || "").trim(),
      address: p.address || "",
      funded: String(p.funded || "N").toUpperCase(),
      amount: Number(p.amount || 0),
      name_of_staff: p.nameOfStaff || "",
      nameOfStaff: p.nameOfStaff || "",
      remarks: p.remarks || "",
      stpms_status: p.status || "",
      phase: p.type || "",
      date_approved: dateApproved || null,
      moa_signed: p.moaSigned || null,
      addressMeta: p.addressMeta || null,
    };

    try {
      await axios.put(`${API}/projects/${projectId}`, payload);
      await fetchProjects();
      setViewProjectId(projectId);
      alert("Date Approved saved successfully.");
    } catch (e) {
      console.error("Save Date Approved error:", e?.response?.data || e.message || e);
      alert("Failed to save Date Approved.");
    }
  };

  const deleteProject = async (id) => {
    if (!window.confirm("Delete this project?")) return;
    try {
      await axios.delete(`${API}/projects/${id}`);
      persistProjectAddressMeta(id, null);
      await fetchProjects();
    } catch (e) {
      console.error(e);
      alert("Failed to delete project.");
    }
  };

  const fetchCustomTacsConsultancyOptions = async () => {
    try {
      const res = await axios.get(`${API}/tacs-consultancy-types`);
      setCustomTacsConsultancyOptions(
        Array.isArray(res.data)
          ? res.data.map((x) => String(x.name || x).trim()).filter(Boolean)
          : []
      );
    } catch (e) {
      console.error(e);
      setCustomTacsConsultancyOptions([]);
    }
  };

  const addCustomTacsConsultancyType = async () => {
    const name = String(newTacsType || "").trim();
    if (!name) return alert("Required: Consultancy type");

    const exists = tacsConsultancyOptions.some(
      (x) => String(x).toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      setDetailForm((p) => ({
        ...p,
        consultancyType: name,
      }));
      setNewTacsType("");
      setShowAddTacsTypeModal(false);
      return;
    }

    try {
      await axios.post(`${API}/tacs-consultancy-types`, { name });
      await fetchCustomTacsConsultancyOptions();

      setDetailForm((p) => ({
        ...p,
        consultancyType: name,
      }));

      setNewTacsType("");
      setShowAddTacsTypeModal(false);
    } catch (e) {
      console.error(e);
      alert("Failed to add consultancy type.");
    }
  };

  const deleteCustomTacsConsultancyType = async (name) => {
    const cleanName = String(name || "").trim();
    if (!cleanName) return;

    const isDefault = DEFAULT_TACS_CONSULTANCY_OPTIONS.some(
      (x) => x.toLowerCase() === cleanName.toLowerCase()
    );
    if (isDefault) return alert("Default options cannot be deleted.");

    if (!window.confirm(`Delete "${cleanName}"?`)) return;

    try {
      await axios.delete(
        `${API}/tacs-consultancy-types/${encodeURIComponent(cleanName)}`
      );

      await fetchCustomTacsConsultancyOptions();

      setDetailForm((prev) => ({
        ...prev,
        consultancyType:
          String(prev.consultancyType || "").toLowerCase() ===
            cleanName.toLowerCase()
            ? ""
            : prev.consultancyType,
      }));
    } catch (e) {
      console.error(e);
      alert("Failed to delete consultancy type.");
    }
  };

  const openInterventionPicker = (projectId) => setPickForId(projectId);

  const resetDetailForm = (type = "") => {
    const isTech = type === "Tech Roll Out";
    const isTraining = type === "Training";
    const isTacs = type === "TACS";
    const isPackaging = type === "Packaging & Labeling";
    const isCalibration = type === "Calibration";

    setDetailForm({
      type: type || "",
      title: isTraining ? "" : "",
      date: isTraining ? "" : "",
      venue: isTraining ? "" : "",
      venueMeta: null,
      noOfFirms: isTraining ? "" : "",
      firmsSucsHeisLgusCount: isTraining ? "" : "",
      male: isTraining ? "" : "",
      female: isTraining ? "" : "",
      total: isTraining ? "" : "",
      seniorFemale: isTraining ? "" : "",
      seniorMale: isTraining ? "" : "",
      ipFemale: isTraining ? "" : "",
      ipMale: isTraining ? "" : "",
      fourPsFemale: isTraining ? "" : "",
      fourPsMale: isTraining ? "" : "",
      pwdFemale: isTraining ? "" : "",
      pwdMale: isTraining ? "" : "",
      firmsAssociationsList: isTraining ? "" : "",
      trainorAffiliation: isTraining ? "" : "",
      projectProgramUnit: isTraining ? "" : "",
      costDost: isTraining ? "" : "",
      costPartnerAgency: isTraining ? "" : "",
      totalCost: isTraining ? "" : "",
      notesEndDate: isTraining ? "" : "",
      notesProvince: isTraining ? "Pangasinan" : "Pangasinan",
      notes: "",
      techRows: isTech ? makeDefaultTechRows() : [],

      consultancyType: isTacs ? "" : "",
      dateEngagement: isTacs ? "" : "",
      expertInstitution: isTacs ? "" : "",
      customerName: isTacs ? "" : "",
      customerSex: isTacs ? "" : "",
      customerAddress: isTacs ? "" : "",
      customerAddressMeta: null,
      meansVerification: isTacs ? "" : "",
      noOfAdvice: isTacs ? "" : "",

      packagingQuarter: isPackaging ? "" : "",
      packagingProvince: "Pangasinan",
      packagingDateCompleted: isPackaging ? "" : "",
      packagingServiceType: "Label Design",
      packagingProductName: isPackaging ? "" : "",
      packagingSizeVariantMaterial: isPackaging ? "" : "",
      packagingMaterialsProvided: isPackaging ? "" : "",
      packagingCustomerName: isPackaging ? "" : "",
      packagingCustomerSex: isPackaging ? "" : "",
      packagingFirmName: isPackaging ? "" : "",
      packagingAddress: isPackaging ? "" : "",
      packagingAddressMeta: null,
      packagingMeansVerification: isPackaging ? "" : "",
      packagingRemarks: isPackaging ? "" : "",

      calibrationData: isCalibration ? getDefaultCalibrationData() : getDefaultCalibrationData(),
    });
  };

  const openInterventionDetails_Add = (projectId, type) => {
    setPickForId(null);
    resetDetailForm(type);
    setDetailFor({ projectId, mode: "add" });
  };

  const openInterventionDetails_Edit = (projectId, entryId) => {
    const p = projects.find((x) => x.id === projectId);
    const entry = p?.interventions?.find((x) => x.id === entryId);
    if (!p || !entry) return;

    const type = entry.type || "";
    const isTech = type === "Tech Roll Out";
    const isTraining = type === "Training";
    const isTacs = type === "TACS";
    const isPackaging = type === "Packaging & Labeling";
    const isCalibration = type === "Calibration";

    let parsedRows = null;
    let parsedFreeText = null;

    if (isTech) {
      try {
        const obj = JSON.parse(entry?.notes || "");
        if (obj && typeof obj === "object") {
          if (Array.isArray(obj.techRollOutRows)) parsedRows = obj.techRollOutRows;
          if (typeof obj.freeText === "string") parsedFreeText = obj.freeText;
        }
      } catch { }
    }

    let tacsConsultancyType = "";
    let tacsDateEngagement = "";
    let tacsExpertInstitution = "";
    let tacsCustomerName = "";
    let tacsCustomerSex = "";
    let tacsCustomerAddress = "";
    let tacsCustomerAddressMeta = null;
    let tacsMeansVerification = "";
    let tacsNoOfAdvice = "";
    let tacsRemarks = entry.notes || "";

    let packagingQuarter = "";
    let packagingProvince = "Pangasinan";
    let packagingDateCompleted = "";
    let packagingServiceType = entry.title || "Label Design";
    let packagingProductName = "";
    let packagingSizeVariantMaterial = "";
    let packagingMaterialsProvided = "";
    let packagingCustomerName = "";
    let packagingCustomerSex = "";
    let packagingFirmName = "";
    let packagingAddress = entry.venue || "";
    let packagingAddressMeta = null;
    let packagingMeansVerification = "";
    let packagingRemarks = entry.notes || "";
    let calibrationData = getDefaultCalibrationData();

    if (isCalibration) {
      try {
        const obj = JSON.parse(entry?.notes || "{}");
        calibrationData = normalizeCalibrationData(obj?.calibration || obj || {});
      } catch {
        calibrationData = getDefaultCalibrationData();
      }
    }

    if (isTacs) {
      tacsConsultancyType =
        entry.tacsConsultancyType || entry.title || "";
      tacsDateEngagement =
        entry.tacsDateEngagement || entry.date || "";
      tacsExpertInstitution =
        entry.tacsExpertInstitution || "";
      tacsCustomerName =
        entry.tacsCustomerName || "";
      tacsCustomerSex =
        entry.tacsCustomerSex || "";
      tacsCustomerAddress =
        entry.tacsCustomerAddress || entry.venue || "";
      tacsCustomerAddressMeta =
        entry.tacsCustomerAddressMeta || null;
      tacsMeansVerification =
        entry.tacsMeansVerification || "";
      tacsNoOfAdvice =
        entry.tacsNoOfAdvice === null || entry.tacsNoOfAdvice === undefined
          ? ""
          : String(entry.tacsNoOfAdvice);
      tacsRemarks =
        entry.tacsRemarks || "";
    }

    if (isPackaging) {
      try {
        const obj = JSON.parse(entry?.notes || "");
        if (obj && typeof obj === "object") {
          packagingQuarter = obj.quarter || "";
          packagingProvince = obj.province || "Pangasinan";
          packagingDateCompleted = obj.dateCompleted || entry.date || "";
          packagingServiceType =
            obj.serviceType || entry.title || "Label Design";
          packagingProductName = obj.productName || "";
          packagingSizeVariantMaterial = obj.sizeVariantMaterial || "";
          packagingMaterialsProvided =
            obj.packagingMaterialsProvided === null ||
              obj.packagingMaterialsProvided === undefined
              ? ""
              : String(obj.packagingMaterialsProvided);
          packagingCustomerName = obj.customerName || "";
          packagingCustomerSex = obj.customerSex || "";
          packagingFirmName = obj.firmName || "";
          packagingAddress = obj.address || entry.venue || "";
          packagingAddressMeta = obj.addressMeta || null;
          packagingMeansVerification = obj.meansVerification || "";
          packagingRemarks = obj.remarks || "";
        }
      } catch {
        packagingDateCompleted = entry.date || "";
        packagingServiceType = entry.title || "Label Design";
        packagingAddress = entry.venue || "";
        packagingRemarks = entry.notes || "";
      }
    }
    let trainingMeta = {};
    let trainingPPU = "";
    let trainingRemarks = entry.notes || "";
    let trainingVenueMeta = null;
    let trainingFirmsSucsHeisLgusCount = "";
    let trainingSeniorFemale = "";
    let trainingSeniorMale = "";
    let trainingIpFemale = "";
    let trainingIpMale = "";
    let trainingFourPsFemale = "";
    let trainingFourPsMale = "";
    let trainingPwdFemale = "";
    let trainingPwdMale = "";
    let trainingFirmsAssociationsList = "";
    let trainingTrainorAffiliation = "";
    let trainingCostDost = "";
    let trainingCostPartnerAgency = "";
    let trainingTotalCost = "";

    if (isTraining) {
      try {
        const obj = JSON.parse(entry?.notes || "");
        if (obj && typeof obj === "object") {
          trainingMeta = obj;
          trainingVenueMeta = obj.venueMeta || null;
          trainingPPU =
            typeof obj.projectProgramUnit === "string"
              ? obj.projectProgramUnit
              : "";
          trainingRemarks =
            typeof obj.remarks === "string" ? obj.remarks : entry.notes || "";
          trainingFirmsSucsHeisLgusCount =
            obj.firmsSucsHeisLgusCount === null ||
              obj.firmsSucsHeisLgusCount === undefined
              ? ""
              : String(obj.firmsSucsHeisLgusCount);
          trainingSeniorFemale =
            obj.seniorFemale === null || obj.seniorFemale === undefined
              ? ""
              : String(obj.seniorFemale);
          trainingSeniorMale =
            obj.seniorMale === null || obj.seniorMale === undefined
              ? ""
              : String(obj.seniorMale);
          trainingIpFemale =
            obj.ipFemale === null || obj.ipFemale === undefined
              ? ""
              : String(obj.ipFemale);
          trainingIpMale =
            obj.ipMale === null || obj.ipMale === undefined
              ? ""
              : String(obj.ipMale);
          trainingFourPsFemale =
            obj.fourPsFemale === null || obj.fourPsFemale === undefined
              ? ""
              : String(obj.fourPsFemale);
          trainingFourPsMale =
            obj.fourPsMale === null || obj.fourPsMale === undefined
              ? ""
              : String(obj.fourPsMale);
          trainingPwdFemale =
            obj.pwdFemale === null || obj.pwdFemale === undefined
              ? ""
              : String(obj.pwdFemale);
          trainingPwdMale =
            obj.pwdMale === null || obj.pwdMale === undefined
              ? ""
              : String(obj.pwdMale);
          trainingFirmsAssociationsList =
            typeof obj.firmsAssociationsList === "string"
              ? obj.firmsAssociationsList
              : "";
          trainingTrainorAffiliation =
            typeof obj.trainorAffiliation === "string"
              ? obj.trainorAffiliation
              : "";
          trainingCostDost =
            obj.costDost === null || obj.costDost === undefined
              ? ""
              : String(obj.costDost);
          trainingCostPartnerAgency =
            obj.costPartnerAgency === null || obj.costPartnerAgency === undefined
              ? ""
              : String(obj.costPartnerAgency);
          trainingTotalCost =
            obj.totalCost === null || obj.totalCost === undefined
              ? ""
              : String(obj.totalCost);
        }
      } catch {
        trainingMeta = {};
        trainingVenueMeta = null;
        trainingPPU = "";
        trainingRemarks = entry.notes || "";
      }
    }

    setDetailFor({ projectId, mode: "edit", entryId });

    setDetailForm({
      type,
      title: entry.title || (isTraining ? "" : type),
      date: entry.date || "",
      venue: entry.venue || "",
      venueMeta: isTraining ? trainingVenueMeta : null,
      noOfFirms: entry.noOfFirms ?? "",
      firmsSucsHeisLgusCount: isTraining ? trainingFirmsSucsHeisLgusCount : "",
      male: entry.male ?? "",
      female: entry.female ?? "",
      total: entry.total ?? "",
      seniorFemale: isTraining ? trainingSeniorFemale : "",
      seniorMale: isTraining ? trainingSeniorMale : "",
      ipFemale: isTraining ? trainingIpFemale : "",
      ipMale: isTraining ? trainingIpMale : "",
      fourPsFemale: isTraining ? trainingFourPsFemale : "",
      fourPsMale: isTraining ? trainingFourPsMale : "",
      pwdFemale: isTraining ? trainingPwdFemale : "",
      pwdMale: isTraining ? trainingPwdMale : "",
      firmsAssociationsList: isTraining ? trainingFirmsAssociationsList : "",
      trainorAffiliation: isTraining ? trainingTrainorAffiliation : "",
      projectProgramUnit: trainingPPU,
      costDost: isTraining ? trainingCostDost : "",
      costPartnerAgency: isTraining ? trainingCostPartnerAgency : "",
      totalCost: isTraining ? trainingTotalCost : "",
      notesEndDate:
        isTraining && typeof trainingMeta.endDate === "string"
          ? trainingMeta.endDate
          : "",
      notesProvince:
        isTraining && typeof trainingMeta.province === "string"
          ? trainingMeta.province
          : "Pangasinan",
      notes: isTech
        ? parsedFreeText ?? ""
        : isTraining
          ? trainingRemarks
          : isTacs
            ? tacsRemarks
            : isPackaging
              ? packagingRemarks
              : entry.notes || "",
      techRows: isTech
        ? Array.isArray(parsedRows) && parsedRows.length
          ? parsedRows
          : makeDefaultTechRows()
        : [],

      consultancyType: isTacs ? tacsConsultancyType : "",
      dateEngagement: isTacs ? tacsDateEngagement : "",
      expertInstitution: isTacs ? tacsExpertInstitution : "",
      customerName: isTacs ? tacsCustomerName : "",
      customerSex: isTacs ? tacsCustomerSex : "",
      customerAddress: isTacs ? tacsCustomerAddress : "",
      customerAddressMeta: isTacs ? tacsCustomerAddressMeta : null,
      meansVerification: isTacs ? tacsMeansVerification : "",
      noOfAdvice: isTacs ? tacsNoOfAdvice : "",

      packagingQuarter: isPackaging ? packagingQuarter : "",
      packagingProvince: isPackaging ? packagingProvince : "Pangasinan",
      packagingDateCompleted: isPackaging ? packagingDateCompleted : "",
      packagingServiceType: isPackaging ? packagingServiceType : "Label Design",
      packagingProductName: isPackaging ? packagingProductName : "",
      packagingSizeVariantMaterial: isPackaging ? packagingSizeVariantMaterial : "",
      packagingMaterialsProvided: isPackaging ? packagingMaterialsProvided : "",
      packagingCustomerName: isPackaging ? packagingCustomerName : "",
      packagingCustomerSex: isPackaging ? packagingCustomerSex : "",
      packagingFirmName: isPackaging ? packagingFirmName : "",
      packagingAddress: isPackaging ? packagingAddress : "",
      packagingAddressMeta: isPackaging ? packagingAddressMeta : null,
      packagingMeansVerification: isPackaging ? packagingMeansVerification : "",
      packagingRemarks: isPackaging ? packagingRemarks : "",

      calibrationData: isCalibration ? calibrationData : getDefaultCalibrationData(),
    });
  };
  const openInterventionDetails_View = (projectId, entryId) => {
    const p = projects.find((x) => x.id === projectId);
    const entry = p?.interventions?.find((x) => x.id === entryId);
    if (!p || !entry) return;

    const type = entry.type || "";
    const isTech = type === "Tech Roll Out";
    const isTraining = type === "Training";
    const isTacs = type === "TACS";
    const isPackaging = type === "Packaging & Labeling";
    const isCalibration = type === "Calibration";

    let parsedRows = null;
    let parsedFreeText = null;

    if (isTech) {
      try {
        const obj = JSON.parse(entry?.notes || "");
        if (obj && typeof obj === "object") {
          if (Array.isArray(obj.techRollOutRows)) parsedRows = obj.techRollOutRows;
          if (typeof obj.freeText === "string") parsedFreeText = obj.freeText;
        }
      } catch { }
    }

    let trainingPPU = "";
    let trainingRemarks = entry.notes || "";
    let trainingVenueMeta = null;

    let packagingQuarter = "";
    let packagingProvince = "Pangasinan";
    let packagingDateCompleted = "";
    let packagingServiceType = entry.title || "Label Design";
    let packagingProductName = "";
    let packagingSizeVariantMaterial = "";
    let packagingMaterialsProvided = "";
    let packagingCustomerName = "";
    let packagingCustomerSex = "";
    let packagingFirmName = "";
    let packagingAddress = entry.venue || "";
    let packagingAddressMeta = null;
    let packagingMeansVerification = "";
    let packagingRemarks = entry.notes || "";
    let calibrationData = getDefaultCalibrationData();

    if (isCalibration) {
      try {
        const obj = JSON.parse(entry?.notes || "{}");
        calibrationData = normalizeCalibrationData(obj?.calibration || obj || {});
      } catch {
        calibrationData = getDefaultCalibrationData();
      }
    }

    let trainingFirmsSucsHeisLgusCount = "";
    let trainingSeniorFemale = "";
    let trainingSeniorMale = "";
    let trainingIpFemale = "";
    let trainingIpMale = "";
    let trainingFourPsFemale = "";
    let trainingFourPsMale = "";
    let trainingPwdFemale = "";
    let trainingPwdMale = "";
    let trainingFirmsAssociationsList = "";
    let trainingTrainorAffiliation = "";
    let trainingCostDost = "";
    let trainingCostPartnerAgency = "";
    let trainingTotalCost = "";
    let trainingEndDate = "";
    let trainingProvince = "Pangasinan";

    if (isTraining) {
      try {
        const obj = JSON.parse(entry?.notes || "");
        if (obj && typeof obj === "object") {
          trainingVenueMeta = obj.venueMeta || null;
          trainingPPU =
            typeof obj.projectProgramUnit === "string"
              ? obj.projectProgramUnit
              : "";
          trainingRemarks =
            typeof obj.remarks === "string" ? obj.remarks : entry.notes || "";
          trainingFirmsSucsHeisLgusCount =
            obj.firmsSucsHeisLgusCount === null ||
              obj.firmsSucsHeisLgusCount === undefined
              ? ""
              : String(obj.firmsSucsHeisLgusCount);
          trainingSeniorFemale =
            obj.seniorFemale === null || obj.seniorFemale === undefined
              ? ""
              : String(obj.seniorFemale);
          trainingSeniorMale =
            obj.seniorMale === null || obj.seniorMale === undefined
              ? ""
              : String(obj.seniorMale);
          trainingIpFemale =
            obj.ipFemale === null || obj.ipFemale === undefined
              ? ""
              : String(obj.ipFemale);
          trainingIpMale =
            obj.ipMale === null || obj.ipMale === undefined
              ? ""
              : String(obj.ipMale);
          trainingFourPsFemale =
            obj.fourPsFemale === null || obj.fourPsFemale === undefined
              ? ""
              : String(obj.fourPsFemale);
          trainingFourPsMale =
            obj.fourPsMale === null || obj.fourPsMale === undefined
              ? ""
              : String(obj.fourPsMale);
          trainingPwdFemale =
            obj.pwdFemale === null || obj.pwdFemale === undefined
              ? ""
              : String(obj.pwdFemale);
          trainingPwdMale =
            obj.pwdMale === null || obj.pwdMale === undefined
              ? ""
              : String(obj.pwdMale);
          trainingFirmsAssociationsList =
            typeof obj.firmsAssociationsList === "string"
              ? obj.firmsAssociationsList
              : "";
          trainingTrainorAffiliation =
            typeof obj.trainorAffiliation === "string"
              ? obj.trainorAffiliation
              : "";
          trainingCostDost =
            obj.costDost === null || obj.costDost === undefined
              ? ""
              : String(obj.costDost);
          trainingCostPartnerAgency =
            obj.costPartnerAgency === null || obj.costPartnerAgency === undefined
              ? ""
              : String(obj.costPartnerAgency);
          trainingTotalCost =
            obj.totalCost === null || obj.totalCost === undefined
              ? ""
              : String(obj.totalCost);
          trainingEndDate =
            typeof obj.endDate === "string" ? obj.endDate : "";
          trainingProvince =
            typeof obj.province === "string" && obj.province.trim()
              ? obj.province
              : "Pangasinan";
        }
      } catch {
        trainingVenueMeta = null;
        trainingPPU = "";
        trainingRemarks = entry.notes || "";
        trainingEndDate = "";
        trainingProvince = "Pangasinan";
      }
    }

    if (isPackaging) {
      try {
        const obj = JSON.parse(entry?.notes || "");
        if (obj && typeof obj === "object") {
          packagingQuarter = obj.quarter || "";
          packagingProvince = obj.province || "Pangasinan";
          packagingDateCompleted = obj.dateCompleted || entry.date || "";
          packagingServiceType = obj.serviceType || entry.title || "Label Design";
          packagingProductName = obj.productName || "";
          packagingSizeVariantMaterial = obj.sizeVariantMaterial || "";
          packagingMaterialsProvided =
            obj.packagingMaterialsProvided === null ||
              obj.packagingMaterialsProvided === undefined
              ? ""
              : String(obj.packagingMaterialsProvided);
          packagingCustomerName = obj.customerName || "";
          packagingCustomerSex = obj.customerSex || "";
          packagingFirmName = obj.firmName || "";
          packagingAddress = obj.address || entry.venue || "";
          packagingAddressMeta = obj.addressMeta || null;
          packagingMeansVerification = obj.meansVerification || "";
          packagingRemarks = obj.remarks || "";
        }
      } catch {
        packagingDateCompleted = entry.date || "";
        packagingServiceType = entry.title || "Label Design";
        packagingAddress = entry.venue || "";
        packagingRemarks = entry.notes || "";
      }
    }

    setViewInterventionFor({ projectId, entryId });

    setDetailForm({
      type,
      title: entry.title || (isTraining ? "" : type),
      date: entry.date || "",
      venue: entry.venue || "",
      venueMeta: isTraining ? trainingVenueMeta : null,
      noOfFirms: entry.noOfFirms ?? "",
      firmsSucsHeisLgusCount: isTraining ? trainingFirmsSucsHeisLgusCount : "",
      male: entry.male ?? "",
      female: entry.female ?? "",
      total: entry.total ?? "",
      seniorFemale: isTraining ? trainingSeniorFemale : "",
      seniorMale: isTraining ? trainingSeniorMale : "",
      ipFemale: isTraining ? trainingIpFemale : "",
      ipMale: isTraining ? trainingIpMale : "",
      fourPsFemale: isTraining ? trainingFourPsFemale : "",
      fourPsMale: isTraining ? trainingFourPsMale : "",
      pwdFemale: isTraining ? trainingPwdFemale : "",
      pwdMale: isTraining ? trainingPwdMale : "",
      firmsAssociationsList: isTraining ? trainingFirmsAssociationsList : "",
      trainorAffiliation: isTraining ? trainingTrainorAffiliation : "",
      projectProgramUnit: trainingPPU,
      costDost: isTraining ? trainingCostDost : "",
      costPartnerAgency: isTraining ? trainingCostPartnerAgency : "",
      totalCost: isTraining ? trainingTotalCost : "",
      notesEndDate: isTraining ? trainingEndDate : "",
      notesProvince: isTraining ? trainingProvince : "Pangasinan",
      notes: isTech
        ? parsedFreeText ?? ""
        : isTraining
          ? trainingRemarks
          : isTacs
            ? entry.tacsRemarks || ""
            : isPackaging
              ? packagingRemarks
              : entry.notes || "",
      techRows: isTech
        ? Array.isArray(parsedRows) && parsedRows.length
          ? parsedRows
          : makeDefaultTechRows()
        : [],

      consultancyType: isTacs ? entry.tacsConsultancyType || "" : "",
      dateEngagement: isTacs ? entry.tacsDateEngagement || "" : "",
      expertInstitution: isTacs ? entry.tacsExpertInstitution || "" : "",
      customerName: isTacs ? entry.tacsCustomerName || "" : "",
      customerSex: isTacs ? entry.tacsCustomerSex || "" : "",
      customerAddress: isTacs ? entry.tacsCustomerAddress || "" : "",
      customerAddressMeta: isTacs ? entry.tacsCustomerAddressMeta || null : null,
      meansVerification: isTacs ? entry.tacsMeansVerification || "" : "",
      noOfAdvice:
        isTacs && entry.tacsNoOfAdvice !== null && entry.tacsNoOfAdvice !== undefined
          ? String(entry.tacsNoOfAdvice)
          : "",

      packagingQuarter: isPackaging ? packagingQuarter : "",
      packagingProvince: isPackaging ? packagingProvince : "Pangasinan",
      packagingDateCompleted: isPackaging ? packagingDateCompleted : "",
      packagingServiceType: isPackaging ? packagingServiceType : "Label Design",
      packagingProductName: isPackaging ? packagingProductName : "",
      packagingSizeVariantMaterial: isPackaging ? packagingSizeVariantMaterial : "",
      packagingMaterialsProvided: isPackaging ? packagingMaterialsProvided : "",
      packagingCustomerName: isPackaging ? packagingCustomerName : "",
      packagingCustomerSex: isPackaging ? packagingCustomerSex : "",
      packagingFirmName: isPackaging ? packagingFirmName : "",
      packagingAddress: isPackaging ? packagingAddress : "",
      packagingAddressMeta: isPackaging ? packagingAddressMeta : null,
      packagingMeansVerification: isPackaging ? packagingMeansVerification : "",
      packagingRemarks: isPackaging ? packagingRemarks : "",

      calibrationData: isCalibration ? calibrationData : getDefaultCalibrationData(),
    });
  };

  const deleteIntervention = async (projectId, entryId) => {
    if (!window.confirm("Delete this intervention entry?")) return;

    try {
      await axios.delete(`${API}/interventions/${entryId}`);
      await fetchProjects();

      setSelectedInterventionByProject((prev) => {
        if (prev[projectId] !== entryId) return prev;
        const { [projectId]: _, ...rest } = prev;
        return rest;
      });
    } catch (e) {
      console.error(e);
      alert("Failed to delete intervention.");
    }
  };


  const parseJsonSafe = (raw, fallback = null) => {
    try {
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };

  const extractTechRolloutMeta = (notesRaw) => {
    const obj = parseJsonSafe(notesRaw, {}) || {};
    return {
      techRollOutRows: Array.isArray(obj.techRollOutRows) ? obj.techRollOutRows : [],
      freeText: typeof obj.freeText === "string" ? obj.freeText : "",
      techRolloutEntryIds: Array.isArray(obj.techRolloutEntryIds)
        ? obj.techRolloutEntryIds
          .map((x) => Number(x))
          .filter((x) => Number.isFinite(x) && x > 0)
        : [],
    };
  };

  const buildTechRolloutPayloads = (rows, project) => {
    const quarterFromProject = Number(project?.quarter || 0) || 1;

    return (Array.isArray(rows) ? rows : [])
      .map((row) => {
        const dateTransferred = row?.dateTransferred || "";
        const unitCenter = (row?.unitCenter || "DOST-PANGASINAN").trim();
        const knowledgeTech = (row?.knowledgeTech || "").trim();
        const technologyGenerator = (row?.techGenerator || "").trim();
        const modeOfTransfer = (row?.modeTransfer || "").trim();
        const activityTitle = (row?.activityTitle || "").trim();
        const activityDateVenue = (row?.activityDateVenue || "").trim();
        const institutionName =
          (project?.firmName || "").trim() ||
          (row?.institutionNameAddress || "").trim();
        const institutionAddress =
          (row?.institutionNameAddress || "").trim() ||
          (project?.address || "").trim();
        const classification = (row?.classification || "").trim();
        const representativeName =
          (row?.representativeNameDesignation || "").trim();
        const sex = (row?.sex || "").trim();

        return {
          quarter:
            Number(getQuarterFromDate(dateTransferred)) || quarterFromProject,

          unitCenter,
          unit_center: unitCenter,

          nameOfTechnologyTransferred: knowledgeTech,
          name_of_technology_transferred: knowledgeTech,
          knowledgeTech,
          knowledge_tech: knowledgeTech,
          technologyTransferred: knowledgeTech,
          technology_transferred: knowledgeTech,

          technologyGenerator,
          technology_generator: technologyGenerator,

          modeOfTransfer,
          mode_of_transfer: modeOfTransfer,

          isDostDevelopedFunded: false,
          is_dost_developed_funded: false,

          dateTransferred,
          date_transferred: dateTransferred,

          activityTitle,
          activity_title: activityTitle,

          activityDate: dateTransferred,
          activity_date: dateTransferred,

          activityVenue: activityDateVenue,
          activity_venue: activityDateVenue,
          activityDateVenue,
          activity_date_venue: activityDateVenue,

          institutionName,
          institution_name: institutionName,

          institutionAddress,
          institution_address: institutionAddress,

          addressMeta: project?.addressMeta || null,
          address_meta: project?.addressMeta || null,

          classification,

          representativeName,
          representative_name: representativeName,

          representativeDesignation: null,
          representative_designation: null,

          sex,
        };
      })
      .filter(
        (row) =>
          row.nameOfTechnologyTransferred &&
          row.technologyGenerator &&
          row.modeOfTransfer &&
          row.dateTransferred &&
          row.activityTitle &&
          row.activityDate &&
          row.institutionName &&
          row.institutionAddress &&
          row.classification &&
          row.representativeName
      );
  };

  const deleteTechRolloutEntriesByIds = async (ids = []) => {
    const cleanIds = (Array.isArray(ids) ? ids : [])
      .map((x) => Number(x))
      .filter((x) => Number.isFinite(x) && x > 0);

    await Promise.all(
      cleanIds.map((id) =>
        axios.delete(`${TECH_ROLLOUT_API}/${id}`).catch((err) => {
          console.error("Delete linked tech rollout error:", err);
          return null;
        })
      )
    );
  };

  const cleanTechRows = (rows) =>
    (Array.isArray(rows) ? rows : []).map((r) => ({
      unitCenter: (r.unitCenter || "").trim(),
      knowledgeTech: (r.knowledgeTech || "").trim(),
      techGenerator: (r.techGenerator || "").trim(),
      modeTransfer: (r.modeTransfer || "").trim(),
      dateTransferred: r.dateTransferred || "",
      activityTitle: (r.activityTitle || "").trim(),
      activityDateVenue: (r.activityDateVenue || "").trim(),
      institutionNameAddress: (r.institutionNameAddress || "").trim(),
      classification: (r.classification || "").trim(),
      representativeNameDesignation: (r.representativeNameDesignation || "").trim(),
      sex: (r.sex || "").trim(),
    }));

  const saveInterventionDetails = async () => {
    if (!detailFor) return;

    const type = (detailForm.type || "").trim();
    const isTech = type === "Tech Roll Out";
    const isTraining = type === "Training";
    const isTacs = type === "TACS";
    const isPackaging = type === "Packaging & Labeling";
    const isCalibration = type === "Calibration";
    if (!type) return alert("Missing intervention type");

    if (isTech) {
      const validTechRows = buildTechRolloutPayloads(
        cleanTechRows(detailForm.techRows),
        detailProject
      );

      if (validTechRows.length === 0) {
        return alert(
          "Complete at least one valid Tech Roll Out row before saving."
        );
      }
    }

    if (isTraining && !(detailForm.title || "").trim()) {
      return alert("Required: Training Title");
    }
    if (isTraining && !(detailForm.venue || "").trim()) {
      return alert("Required: Venue / Address");
    }
    if (isTacs && !(detailForm.consultancyType || "").trim()) {
      return alert("Required: Type of Consultancy");
    }
    if (isTacs && !(detailForm.dateEngagement || "").trim()) {
      return alert("Required: Date of Engagement");
    }
    if (isTacs && !(detailForm.customerName || "").trim()) {
      return alert("Required: Name of Customer");
    }
    if (isTacs && !(detailForm.customerAddress || "").trim()) {
      return alert("Required: Address of Customer");
    }
    if (isTacs && !(detailForm.meansVerification || "").trim()) {
      return alert("Required: Means of Verification");
    }
    if (
      isTacs &&
      (detailForm.noOfAdvice === "" ||
        Number.isNaN(Number(detailForm.noOfAdvice)))
    ) {
      return alert("Required: No. of Advice / Recommendations");
    }

    if (isPackaging && !(detailForm.packagingDateCompleted || "").trim()) {
      return alert("Required: Date Completed/Executed");
    }
    if (isPackaging && !(detailForm.packagingFirmName || "").trim()) {
      return alert("Required: Name of Firm / Institution");
    }
    if (isPackaging && !(detailForm.packagingAddress || "").trim()) {
      return alert("Required: Address");
    }

    if (isCalibration) {
      const calibration = normalizeCalibrationData(detailForm.calibrationData || {});
      if (!(calibration.date || "").trim()) return alert("Required: Date");
      if (!(calibration.typeOfSample || "").trim()) return alert("Required: Type of Samples");
      if (!(calibration.address || "").trim()) return alert("Required: Address");

      if (calibration.typeOfSample === "Weighing Scale") {
        if (!String(calibration.noOfSample).trim() || calibrationToNumber(calibration.noOfSample) <= 0) {
          return alert("Required: No. of Sample");
        }
        const cleanRows = (calibration.mcBreakdown || [])
          .filter((r) => r.range && calibrationToNumber(r.noOfSample) > 0)
          .map((r) => ({
            ...r,
            feesCollected:
              calibration.category === "PAYING"
                ? calibrationToNumber(r.noOfSample) * calibrationToNumber(r.cost)
                : 0,
          }));
        if (!cleanRows.length) {
          return alert("Required: At least one MC Range Breakdown row");
        }
        const totals = computeCalibrationBreakdownTotals(cleanRows, calibration.category);
        if (totals.totalSamples !== calibrationToNumber(calibration.noOfSample)) {
          return alert("MC breakdown total samples must match the main No. of Sample.");
        }
      } else {
        if (!String(calibration.noOfSample).trim() || calibrationToNumber(calibration.noOfSample) <= 0) {
          return alert("Required: No. of Sample");
        }
      }
    }

    let notesToSave = isTech
      ? JSON.stringify({
        techRollOutRows: cleanTechRows(detailForm.techRows),
        freeText: (detailForm.notes || "").trim(),
        techRolloutEntryIds: [],
      })
      : isTraining
        ? JSON.stringify({
          venueMeta: detailForm.venueMeta || null,
          firmsSucsHeisLgusCount:
            detailForm.firmsSucsHeisLgusCount === ""
              ? null
              : Number(detailForm.firmsSucsHeisLgusCount),
          seniorFemale:
            detailForm.seniorFemale === ""
              ? null
              : Number(detailForm.seniorFemale),
          seniorMale:
            detailForm.seniorMale === ""
              ? null
              : Number(detailForm.seniorMale),
          ipFemale:
            detailForm.ipFemale === ""
              ? null
              : Number(detailForm.ipFemale),
          ipMale:
            detailForm.ipMale === ""
              ? null
              : Number(detailForm.ipMale),
          fourPsFemale:
            detailForm.fourPsFemale === ""
              ? null
              : Number(detailForm.fourPsFemale),
          fourPsMale:
            detailForm.fourPsMale === ""
              ? null
              : Number(detailForm.fourPsMale),
          pwdFemale:
            detailForm.pwdFemale === ""
              ? null
              : Number(detailForm.pwdFemale),
          pwdMale:
            detailForm.pwdMale === ""
              ? null
              : Number(detailForm.pwdMale),
          firmsAssociationsList: (detailForm.firmsAssociationsList || "").trim(),
          trainorAffiliation: (detailForm.trainorAffiliation || "").trim(),
          projectProgramUnit: (detailForm.projectProgramUnit || "").trim(),
          endDate: detailForm.notesEndDate || "",
          province: (detailForm.notesProvince || "Pangasinan").trim(),
          costDost:
            detailForm.costDost === "" ? null : Number(detailForm.costDost),
          costPartnerAgency:
            detailForm.costPartnerAgency === ""
              ? null
              : Number(detailForm.costPartnerAgency),
          totalCost:
            detailForm.totalCost === "" ? null : Number(detailForm.totalCost),
          totalFemale:
            detailForm.type === "Training"
              ? getTrainingFemaleTotal(detailForm)
              : null,
          totalMale:
            detailForm.type === "Training"
              ? getTrainingMaleTotal(detailForm)
              : null,
          grandTotal:
            detailForm.type === "Training"
              ? getTrainingGrandTotal(detailForm)
              : null,
          remarks: (detailForm.notes || "").trim(),
        })
        : isTacs
          ? JSON.stringify({
            consultancyType: (detailForm.consultancyType || "").trim(),
            dateEngagement: detailForm.dateEngagement || "",
            expertInstitution: (detailForm.expertInstitution || "").trim(),
            customerName: (detailForm.customerName || "").trim(),
            customerSex: (detailForm.customerSex || "").trim(),
            customerAddress: (detailForm.customerAddress || "").trim(),
            customerAddressMeta: detailForm.customerAddressMeta || null,
            meansVerification: (detailForm.meansVerification || "").trim(),
            noOfAdvice:
              detailForm.noOfAdvice === ""
                ? null
                : Number(detailForm.noOfAdvice),
            remarks: (detailForm.notes || "").trim(),
          })
          : isPackaging
            ? JSON.stringify({
              quarter: (detailForm.packagingQuarter || "").trim(),
              province: (detailForm.packagingProvince || "Pangasinan").trim(),
              dateCompleted: detailForm.packagingDateCompleted || "",
              serviceType: (detailForm.packagingServiceType || "Label Design").trim(),
              productName: (detailForm.packagingProductName || "").trim(),
              sizeVariantMaterial: (detailForm.packagingSizeVariantMaterial || "").trim(),
              packagingMaterialsProvided:
                detailForm.packagingMaterialsProvided === ""
                  ? null
                  : Number(detailForm.packagingMaterialsProvided),
              customerName: (detailForm.packagingCustomerName || "").trim(),
              customerSex: (detailForm.packagingCustomerSex || "").trim(),
              firmName: (detailForm.packagingFirmName || "").trim(),
              address: (detailForm.packagingAddress || "").trim(),
              addressMeta: detailForm.packagingAddressMeta || null,
              meansVerification: (detailForm.packagingMeansVerification || "").trim(),
              remarks: (detailForm.notes || "").trim(),
            })
            : isCalibration
              ? (() => {
                const calibration = normalizeCalibrationData(detailForm.calibrationData || {});
                const cleanRows = calibration.typeOfSample === "Weighing Scale"
                  ? (calibration.mcBreakdown || [])
                    .filter((r) => r.range && calibrationToNumber(r.noOfSample) > 0)
                    .map((r) => ({
                      id: r.id || makeCalibrationBreakdownRow().id,
                      range: r.range,
                      noOfSample: calibrationToNumber(r.noOfSample),
                      cost: calibrationToNumber(r.cost),
                      feesCollected:
                        calibration.category === "PAYING"
                          ? calibrationToNumber(r.noOfSample) * calibrationToNumber(r.cost)
                          : 0,
                      autoFilled: Boolean(r.autoFilled),
                    }))
                  : [];
                const totals = computeCalibrationBreakdownTotals(cleanRows, calibration.category);
                return JSON.stringify({
                  calibration: {
                    ...calibration,
                    noOfSample: calibrationToNumber(calibration.noOfSample),
                    cost: calibrationToNumber(calibration.cost),
                    feesCollected:
                      calibration.typeOfSample === "Weighing Scale"
                        ? (calibration.category === "PAYING" ? totals.totalFees : 0)
                        : (calibration.category === "PAYING" ? calibrationToNumber(calibration.feesCollected) : 0),
                    female: calibrationToNumber(calibration.female),
                    male: calibrationToNumber(calibration.male),
                    totalCustomers: calibrationToNumber(calibration.female) + calibrationToNumber(calibration.male),
                    noOfFirms: calibrationToNumber(calibration.noOfFirms),
                    noOfNewFirms: calibrationToNumber(calibration.noOfNewFirms),
                    pwd: calibrationToNumber(calibration.pwd),
                    ip: calibrationToNumber(calibration.ip),
                    sc: calibrationToNumber(calibration.sc),
                    fourPs: calibrationToNumber(calibration.fourPs),
                    mcBreakdown: cleanRows,
                  },
                });
              })()
              : (detailForm.notes || "").trim();

    const payload = {
      type,
      title: isTraining
        ? (detailForm.title || "").trim()
        : isTacs
          ? (detailForm.consultancyType || "").trim()
          : isPackaging
            ? (detailForm.packagingServiceType || "").trim()
            : isCalibration
              ? ((detailForm.calibrationData?.typeOfSample || "Calibration").trim())
              : type,
      date: isTraining
        ? detailForm.date || null
        : isTacs
          ? detailForm.dateEngagement || null
          : isPackaging
            ? detailForm.packagingDateCompleted || null
            : isCalibration
              ? detailForm.calibrationData?.date || null
              : null,
      venue: isTraining
        ? detailForm.venue || ""
        : isTacs
          ? (detailForm.customerAddress || "").trim()
          : isPackaging
            ? (detailForm.packagingAddress || "").trim()
            : isCalibration
              ? (detailForm.calibrationData?.address || "").trim()
              : "",
      noOfFirms: isTraining
        ? detailForm.noOfFirms === ""
          ? null
          : Number(detailForm.noOfFirms)
        : isCalibration
          ? calibrationToNumber(detailForm.calibrationData?.noOfFirms)
          : null,
      male: isTraining ? getTrainingMaleTotal(detailForm) : isCalibration ? calibrationToNumber(detailForm.calibrationData?.male) : null,
      female: isTraining ? getTrainingFemaleTotal(detailForm) : isCalibration ? calibrationToNumber(detailForm.calibrationData?.female) : null,
      total: isTraining ? getTrainingGrandTotal(detailForm) : isCalibration ? calibrationToNumber(detailForm.calibrationData?.female) + calibrationToNumber(detailForm.calibrationData?.male) : null,
      notes: isTacs ? "" : notesToSave,

      tacs_consultancy_type: isTacs
        ? (detailForm.consultancyType || "").trim()
        : null,
      tacs_date_engagement: isTacs
        ? detailForm.dateEngagement || null
        : null,
      tacs_expert_institution: isTacs
        ? (detailForm.expertInstitution || "").trim()
        : null,
      tacs_customer_name: isTacs
        ? (detailForm.customerName || "").trim()
        : null,
      tacs_customer_sex: isTacs
        ? (detailForm.customerSex || "").trim()
        : null,
      tacs_customer_address: isTacs
        ? (detailForm.customerAddress || "").trim()
        : null,
      tacs_customer_address_meta: isTacs
        ? detailForm.customerAddressMeta || null
        : null,
      tacs_means_verification: isTacs
        ? (detailForm.meansVerification || "").trim()
        : null,
      tacs_no_of_advice: isTacs
        ? detailForm.noOfAdvice === ""
          ? null
          : Number(detailForm.noOfAdvice)
        : null,
      tacs_remarks: isTacs
        ? (detailForm.notes || "").trim()
        : null,

      techRolloutRows: isTech ? cleanTechRows(detailForm.techRows) : undefined,
    };

    try {
      if (isTech) {
        notesToSave = JSON.stringify({
          techRollOutRows: cleanTechRows(detailForm.techRows),
          freeText: (detailForm.notes || "").trim(),
          techRolloutEntryIds: [],
        });
      }

      payload.notes = isTacs ? "" : notesToSave;

      if (detailFor.mode === "add") {
        const res = await axios.post(
          `${API}/projects/${detailFor.projectId}/interventions`,
          payload
        );
        const newId = res?.data?.id;

        await fetchProjects();

        if (newId)
          setSelectedInterventionByProject((prev) => ({
            ...prev,
            [detailFor.projectId]: newId,
          }));
      } else {
        await axios.put(`${API}/interventions/${detailFor.entryId}`, payload);
        await fetchProjects();

        setSelectedInterventionByProject((prev) => ({
          ...prev,
          [detailFor.projectId]: detailFor.entryId,
        }));
      }

      setDetailFor(null);
      resetDetailForm("");
    } catch (e) {
      console.error("saveInterventionDetails ERROR:", e);
      console.error("response status:", e?.response?.status);
      console.error("response data:", e?.response?.data);

      alert(
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        "Failed to save intervention."
      );
    }
  };

  const openAddReport = (projectId) => {
    const { jobsGenerated, jobsIncreasePct, productivityPct, grossSales } =
      getOI(projectId);

    setReportForProjectId(projectId);
    setReportForm({
      jobsGenerated: {
        q1: jobsGenerated.q1 ? String(jobsGenerated.q1) : "",
        q2: jobsGenerated.q2 ? String(jobsGenerated.q2) : "",
        q3: jobsGenerated.q3 ? String(jobsGenerated.q3) : "",
        q4: jobsGenerated.q4 ? String(jobsGenerated.q4) : "",
      },
      jobsIncreasePct: {
        q1: jobsIncreasePct.q1 ? String(jobsIncreasePct.q1) : "",
        q2: jobsIncreasePct.q2 ? String(jobsIncreasePct.q2) : "",
        q3: jobsIncreasePct.q3 ? String(jobsIncreasePct.q3) : "",
        q4: jobsIncreasePct.q4 ? String(jobsIncreasePct.q4) : "",
      },
      productivityPct: {
        q1: productivityPct.q1 ? String(productivityPct.q1) : "",
        q2: productivityPct.q2 ? String(productivityPct.q2) : "",
        q3: productivityPct.q3 ? String(productivityPct.q3) : "",
        q4: productivityPct.q4 ? String(productivityPct.q4) : "",
      },
      grossSales: {
        q1: grossSales.q1 ? String(grossSales.q1) : "",
        q2: grossSales.q2 ? String(grossSales.q2) : "",
        q3: grossSales.q3 ? String(grossSales.q3) : "",
        q4: grossSales.q4 ? String(grossSales.q4) : "",
      },
    });
  };

  const deleteOtherIndicators = async (projectId) => {
    if (!window.confirm("Delete Other Indicators report for this project?"))
      return;

    try {
      await axios.delete(`${API}/projects/${projectId}/other-indicators`);
      setOtherIndicatorsByProject((prev) => ({
        ...prev,
        [projectId]: mapDbOI(null),
      }));
    } catch (e) {
      console.error(e);
      alert("Failed to delete Other Indicators (DB).");
    }
  };

  const saveReport = async () => {
    if (!reportForProjectId) return;

    const cleanQuarter = (obj) => ({
      q1: obj.q1 === "" ? 0 : toNumber(obj.q1),
      q2: obj.q2 === "" ? 0 : toNumber(obj.q2),
      q3: obj.q3 === "" ? 0 : toNumber(obj.q3),
      q4: obj.q4 === "" ? 0 : toNumber(obj.q4),
    });

    const payload = {
      jobsGenerated: cleanQuarter(reportForm.jobsGenerated),
      jobsIncreasePct: cleanQuarter(reportForm.jobsIncreasePct),
      productivityPct: cleanQuarter(reportForm.productivityPct),
      grossSales: cleanQuarter(reportForm.grossSales),
    };

    try {
      await axios.put(
        `${API}/projects/${reportForProjectId}/other-indicators`,
        payload
      );
      setOtherIndicatorsByProject((prev) => ({
        ...prev,
        [reportForProjectId]: payload,
      }));
      setReportForProjectId(null);
    } catch (e) {
      console.error(e);
      alert("Failed to save Other Indicators (DB).");
    }
  };

  const getFeatureName = (feature) => {
    const p = feature?.properties || {};
    return (
      p.name ||
      p.NAME ||
      p.NAME_3 ||
      p.NAME_2 ||
      p.ADM3_EN ||
      p.ADM3EN ||
      p.ADM3 ||
      p.MUNICIPALI ||
      p.MUNICIPALITY ||
      p.CITY ||
      p.city ||
      p.municipality ||
      ""
    );
  };

  const municipalityOptions = useMemo(() => {
    const feats = municipalGeo?.features || [];
    const names = feats.map((f) => String(getFeatureName(f) || "")).filter(Boolean);
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
  }, [municipalGeo]);

  const districtOptions = useMemo(
    () => PANGASINAN_DISTRICTS.map((d) => d.id),
    []
  );
  const selectedDistrictSet = useMemo(() => {
    const d = PANGASINAN_DISTRICTS.find((x) => x.id === selectedDistrict);
    return new Set(d?.municipalities || []);
  }, [selectedDistrict]);

  const filteredMunicipalityGeojson = useMemo(() => {
    if (!municipalGeo) return null;

    if (borderMode === "municipality") {
      if (!selectedMunicipality) return municipalGeo;
      const feats = municipalGeo?.features || [];
      return {
        type: "FeatureCollection",
        features: feats.filter(
          (f) => String(getFeatureName(f) || "") === selectedMunicipality
        ),
      };
    }

    if (borderMode === "district") {
      if (!selectedDistrict) return municipalGeo;
      const feats = municipalGeo?.features || [];
      return {
        type: "FeatureCollection",
        features: feats.filter((f) =>
          selectedDistrictSet.has(String(getFeatureName(f) || ""))
        ),
      };
    }

    return municipalGeo;
  }, [
    municipalGeo,
    borderMode,
    selectedMunicipality,
    selectedDistrict,
    selectedDistrictSet,
  ]);

  const getProjectMunicipality = (p) => {
    const m1 = p?.addressMeta?.municipality;
    if (m1) return String(m1).trim();

    const addr = String(p?.address || "").trim();
    if (!addr) return "";

    const parts = addr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length >= 2) return parts[parts.length - 2];
    return "";
  };

  const getProjectDateSource = (p) => {
    return (
      p?.dateApproved ||
      p?.date_approved ||
      p?.dateProjectApproval ||
      p?.date_project_approval ||
      p?.approvedDate ||
      p?.approved_date ||
      p?.created_at ||
      p?.createdAt ||
      ""
    );
  };

  const extractYearMonthFromDateValue = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return { year: "", month: "" };

    const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      return {
        year: isoMatch[1],
        month: String(Number(isoMatch[2])),
      };
    }

    const slashYMDMatch = raw.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})/);
    if (slashYMDMatch) {
      return {
        year: slashYMDMatch[1],
        month: String(Number(slashYMDMatch[2])),
      };
    }

    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return {
        year: String(parsed.getFullYear()),
        month: String(parsed.getMonth() + 1),
      };
    }

    const yearMatch = raw.match(/\b(19|20)\d{2}\b/);
    return {
      year: yearMatch ? yearMatch[0] : "",
      month: "",
    };
  };

  const getProjectYear = (p) => {
    return extractYearMonthFromDateValue(getProjectDateSource(p)).year;
  };

  const getProjectMonth = (p) => {
    return extractYearMonthFromDateValue(getProjectDateSource(p)).month;
  };

  const tableYearOptions = useMemo(() => {
    const years = [];

    for (let year = 1970; year <= 2050; year += 1) {
      years.push(String(year));
    }

    const projectYears = projects
      .map((p) => getProjectYear(p))
      .filter(Boolean);

    return Array.from(new Set([...years, ...projectYears])).sort(
      (a, b) => Number(b) - Number(a)
    );
  }, [projects]);

  const tableDistrictOptions = useMemo(() => {
    return ["District 1", "District 2", "District 3", "District 4", "District 5", "District 6"];
  }, []);

  const tableMunicipalityOptions = useMemo(() => {
    return [...PANGASINAN_LGUS].sort((a, b) => a.localeCompare(b));
  }, []);

  const tableStatusOptions = useMemo(() => {
    return ["Ongoing", "Terminated", "Graduated"];
  }, []);

  const filteredProjects = useMemo(() => {
    return projects;
  }, [projects]);


  const actualTotalPages = Math.max(1, Number(serverTotalPages || 1));

  const paginatedProjects = useMemo(() => {
    return filteredProjects;
  }, [filteredProjects]);

  const pageWindowStart =
    Math.floor((currentPage - 1) / PAGE_NUMBER_WINDOW) * PAGE_NUMBER_WINDOW + 1;
  const pageWindowEnd = pageWindowStart + PAGE_NUMBER_WINDOW - 1;

  const visiblePageNumbers = Array.from(
    { length: PAGE_NUMBER_WINDOW },
    (_, i) => pageWindowStart + i
  );

  const activeLogoIndex = Math.min(
    PAGE_NUMBER_WINDOW - 1,
    Math.max(0, currentPage - pageWindowStart)
  );

  const paginationLogoOSlots = Array.from(
    { length: PAGE_NUMBER_WINDOW },
    (_, i) => i
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [
    tableFilterYear,
    tableFilterDistrict,
    tableFilterMonth,
    tableFilterMunicipality,
    tableFilterStatus,
    debouncedFirmName,
  ]);

  useEffect(() => {
    if (currentPage < 1) {
      setCurrentPage(1);
    }
  }, [currentPage]);

  const clearTableFilters = () => {
    setTableFilterYear("ALL");
    setTableFilterDistrict("ALL");
    setTableFilterMonth("ALL");
    setTableFilterMunicipality("ALL");
    setTableFilterStatus("ALL");
    setTableFilterFirmName("");
    setCurrentPage(1);
  };

  const filteredPinnedProjects = useMemo(
    () =>
      filteredProjects.filter(
        (p) =>
          Number.isFinite(Number(p?.addressMeta?.lat)) &&
          Number.isFinite(Number(p?.addressMeta?.lng))
      ),
    [filteredProjects]
  );

  const paginatedPinnedProjects = useMemo(
    () =>
      paginatedProjects.filter(
        (p) =>
          Number.isFinite(Number(p?.addressMeta?.lat)) &&
          Number.isFinite(Number(p?.addressMeta?.lng))
      ),
    [paginatedProjects]
  );

  const visiblePinnedProjects = useMemo(() => {
    let arr = paginatedPinnedProjects;

    if (borderMode === "municipality") {
      if (!selectedMunicipality) return arr;
      return arr.filter(
        (p) => getProjectMunicipality(p) === selectedMunicipality
      );
    }

    if (!selectedDistrict) return arr;
    return arr.filter((p) =>
      selectedDistrictSet.has(getProjectMunicipality(p))
    );
  }, [
    paginatedPinnedProjects,
    borderMode,
    selectedMunicipality,
    selectedDistrict,
    selectedDistrictSet,
  ]);

  const buildInverseMaskFromPolygon = (pangasinanPolygonGeojson) => {
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
      if (rings.length > 0)
        holes.push(rings[0].map(([lng, lat]) => [lat, lng]));
    } else if (geom.type === "MultiPolygon") {
      (geom.coordinates || []).forEach((poly) => {
        const rings = poly || [];
        if (rings.length > 0)
          holes.push(rings[0].map(([lng, lat]) => [lat, lng]));
      });
    } else {
      return null;
    }

    return [world, ...holes];
  };

  const maskLatLngs = useMemo(
    () => buildInverseMaskFromPolygon(outlineGeo),
    [outlineGeo]
  );

  const pangasinanBounds = useMemo(() => {
    if (!outlineGeo) return null;
    try {
      const b = L.geoJSON(outlineGeo).getBounds();
      return b && b.isValid() ? b : null;
    } catch {
      return null;
    }
  }, [outlineGeo]);

  const pangasinanOutlineStyle = () => ({
    color: "#0b4ea2",
    weight: 4,
    opacity: 1,
    fillOpacity: 0.1,
    fillColor: "#93c5fd",
  });

  const municipalityStyle = (feature) => {
    const name = String(getFeatureName(feature) || "");

    if (borderMode === "municipality") {
      const active = selectedMunicipality && name === selectedMunicipality;
      return {
        color: active ? "#16a34a" : "#475569",
        weight: active ? 4 : 1,
        opacity: 1,
        fillOpacity: active ? 0.12 : 0.02,
      };
    }

    const inDistrict = selectedDistrict ? selectedDistrictSet.has(name) : false;
    return {
      color: selectedDistrict
        ? inDistrict
          ? "#f59e0b"
          : "transparent"
        : "#475569",
      weight: selectedDistrict ? (inDistrict ? 3 : 0) : 1,
      opacity: 1,
      fillOpacity: selectedDistrict ? (inDistrict ? 0.1 : 0) : 0.02,
    };
  };

  const onEachMunicipality = (feature, layer) => {
    const name = String(getFeatureName(feature) || "");
    if (name) layer.bindTooltip(name, { sticky: true });

    layer.on("click", () => {
      if (borderMode === "municipality") setSelectedMunicipality(name);
      if (borderMode === "district") {
        const found = PANGASINAN_DISTRICTS.find((d) =>
          d.municipalities.includes(name)
        );
        if (found) setSelectedDistrict(found.id);
      }
    });
  };

  const maskPathOptions = {
    color: "transparent",
    weight: 0,
    fillColor: "#ffffff",
    fillOpacity: 1,
  };

  const openGoogleMap = (lat, lng) =>
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      "_blank"
    );
  const openGoogleDirections = (lat, lng) =>
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`,
      "_blank"
    );

  const getInterventionLabel = (it) => {
    const type = it?.type || "";

    if (type === "Tech Roll Out") {
      try {
        const obj = JSON.parse(it?.notes || "");
        const rows = Array.isArray(obj?.techRollOutRows)
          ? obj.techRollOutRows
          : [];

        const firstTech = rows
          .map((r) => String(r?.knowledgeTech || "").trim())
          .find((x) => x);

        if (firstTech) return firstTech;
      } catch { }
      return "Tech Roll Out";
    }

    if (type === "Training") {
      return (it?.title || "Training").trim();
    }

    if (type === "TNA Report") {
      return (it?.notes || "").trim() || "TNA Report";
    }

    if (type === "Calibration") {
      try {
        const obj = JSON.parse(it?.notes || "{}");
        const calibration = obj?.calibration || obj || {};
        return (
          calibration?.typeOfSample ||
          calibration?.testType ||
          it?.title ||
          "Calibration"
        );
      } catch {
        return it?.title || "Calibration";
      }
    }

    return (it?.title || type || "—").trim();
  };


  const buildProjectExportRows = (rows = []) => {
    return (Array.isArray(rows) ? rows : []).map((p, idx) => ({
      No: idx + 1,
      "Project Title": p.projectTitle || "",
      "Name of Firm": p.firmName || "",
      "Cooperator Name": p.cooperatorName || "",
      Age: p.age ?? "",
      Sex: p.sex || "",
      "SPIN Number": p.spinNumber || "",
      Sector: p.sector || "",
      District: p.district || "",
      "Venue/Address": p.address || "",
      Funded: p.funded || "",
      Amount: toNumber(p.amount),
      Status: p.status || "",
      Type: p.type || "",
      "Date Approved": p.dateApproved || "",
      "Name of Staff": p.nameOfStaff || "",
      Remarks: p.remarks || "",
      "S&T Interventions": Array.isArray(p.interventions)
        ? p.interventions.map((it, i) => `${i + 1}. [${it.type || "—"}] ${getInterventionLabel(it)}`).join("\n")
        : "",
    }));
  };

  const exportProjects = (rows = paginatedProjects, filename = "SETUP_Export.xlsx") => {
    const data = buildProjectExportRows(rows);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "SETUP");
    XLSX.writeFile(wb, filename);
  };

  const printProjects = (rows = paginatedProjects, title = "SETUP Report") => {
    const data = buildProjectExportRows(rows);
    const htmlRows = data
      .map(
        (r) => `
          <tr>
            <td>${r.No}</td>
            <td>${r["Project Title"]}</td>
            <td>${r["Name of Firm"]}</td>
            <td>${r["SPIN Number"]}</td>
            <td>${r.Sector}</td>
            <td>${r.District}</td>
            <td>${r["Venue/Address"]}</td>
            <td style="text-align:right">${money(r.Amount)}</td>
            <td>${String(r["S&T Interventions"] || "").replace(/\n/g, "<br/>")}</td>
            <td>${r.Status}</td>
            <td>${r.Type}</td>
            <td>${r["Date Approved"]}</td>
            <td>${r["Name of Staff"]}</td>
            <td>${r.Remarks}</td>
          </tr>`
      )
      .join("");

    const w = window.open("", "_blank", "width=1200,height=800");
    if (!w) return alert("Please allow pop-ups to print.");
    w.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 18px; }
            h2 { margin: 0 0 12px; color: #0b4ea2; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #475569; padding: 6px; vertical-align: top; }
            th { background: #eef2f6; }
          </style>
        </head>
        <body>
          <h2>${title}</h2>
          <table>
            <thead>
              <tr>
                <th>No.</th>
                <th>Project Title</th>
                <th>Name of Firm</th>
                <th>SPIN Number</th>
                <th>Sector</th>
                <th>District</th>
                <th>Venue/Address</th>
                <th>Amount</th>
                <th>S&T Interventions</th>
                <th>Status</th>
                <th>Type</th>
                <th>Date Approved</th>
                <th>Name of Staff</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>${htmlRows || `<tr><td colspan="14">No records found.</td></tr>`}</tbody>
          </table>
          <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); };</script>
        </body>
      </html>
    `);
    w.document.close();
  };

  const pickedProject = useMemo(
    () => projects.find((p) => p.id === pickForId) || null,
    [projects, pickForId]
  );

  const detailProject = useMemo(() => {
    if (!detailFor) return null;
    return projects.find((p) => p.id === detailFor.projectId) || null;
  }, [detailFor, projects]);

  const viewProject = useMemo(() => {
    if (!viewProjectId) return null;
    return projects.find((p) => p.id === viewProjectId) || null;
  }, [viewProjectId, projects]);

  const reportProject = useMemo(() => {
    if (!reportForProjectId) return null;
    return projects.find((p) => p.id === reportForProjectId) || null;
  }, [reportForProjectId, projects]);

  const addressViewProject = useMemo(() => {
    if (!addressViewForProjectId) return null;
    return projects.find((p) => p.id === addressViewForProjectId) || null;
  }, [addressViewForProjectId, projects]);


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

  const getSETUPOutputLabel = (row) => row?.firmName || row?.projectTitle || row?.id || "Record";

  const ensureSETUPOutputRows = (rows = []) => {
    const clean = Array.isArray(rows) ? rows : [];
    if (clean.length) return clean;
    return [{ "No.": "", Template: "No records found for the current filter." }];
  };

  const downloadSETUPBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const sanitizeSETUPFilename = (value = "SETUP") =>
    String(value || "SETUP").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "SETUP";

  const getSETUPRowsForOutput = async (scope, entryId) => {
    if (scope === "row") {
      const row = projects.find((p) => String(p.id) === String(entryId));
      return row ? [row] : [];
    }
    const rows = paginatedProjects;
    return Array.isArray(rows) ? rows : [];
  };

  const buildSETUPObjectRowsForOutput = (sourceRows = []) =>
    ensureSETUPOutputRows(buildProjectExportRows(sourceRows));

  const exportSETUPCSV = (objectRows, filename) => {
    const rows = ensureSETUPOutputRows(objectRows);
    const headers = Object.keys(rows[0] || { "No.": "" });
    const csvEscape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [
      headers.map(csvEscape).join(","),
      ...rows.map((row) => headers.map((h) => csvEscape(row[h])).join(",")),
    ].join("\n");
    downloadSETUPBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename);
  };

  const exportSETUPExcel = (objectRows, filename) => {
    const rows = ensureSETUPOutputRows(objectRows);
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SETUP");
    XLSX.writeFile(wb, filename);
  };

  const exportSETUPPDF = async (objectRows, options = {}) => {
    const rows = ensureSETUPOutputRows(objectRows);
    const headers = Object.keys(rows[0] || { "No.": "" });
    const orientation = options.orientation || "landscape";
    const preset = options.preset === "custom" ? [Number(options.customSize?.width || 8.5) * 72, Number(options.customSize?.height || 13) * 72] : (options.preset || "a4");
    const doc = new jsPDF({ orientation, unit: "pt", format: preset });
    doc.setFontSize(14);
    doc.text(options.titleLabel || "SETUP Export", 32, 32);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 32, 48);
    autoTable(doc, {
      head: [headers],
      body: rows.map((row) => headers.map((h) => String(row[h] ?? ""))),
      startY: 62,
      styles: { fontSize: 7, cellPadding: 3, overflow: "linebreak" },
      headStyles: { fillColor: [11, 78, 162] },
    });
    doc.save(options.filename || "SETUP.pdf");
  };

  const exportSETUPDOCX = async (objectRows, options = {}) => {
    const rows = ensureSETUPOutputRows(objectRows);
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
          new Paragraph({ children: [new TextRun({ text: "SETUP Export", bold: true, size: 28 })] }),
          new Paragraph(`Generated: ${new Date().toLocaleString()}`),
          new DocxTable({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
        ],
      }],
    });
    const blob = await Packer.toBlob(doc);
    downloadSETUPBlob(blob, options.filename || "SETUP.docx");
  };

  const buildSETUPPrintHtml = (objectRows, options = {}) => {
    const rows = ensureSETUPOutputRows(objectRows);
    const headers = Object.keys(rows[0] || { "No.": "" });
    const orientation = options.orientation || "landscape";
    const presetLabel = OUTPUT_PRESET_LABEL[options.preset] || "A4";
    const customSize = options.preset === "custom" ? `${options.customSize?.width || 8.5}in ${options.customSize?.height || 13}in` : presetLabel;
    const layout = options.layoutKey || "FORM";
    const escape = (v) => escapeHtml(String(v ?? ""));
    const table = `<table><thead><tr>${headers.map((h) => `<th>${escape(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${headers.map((h) => `<td>${escape(row[h]) || "&nbsp;"}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    const compact = rows.map((row, idx) => `<div class="compact-card"><b>Record ${idx + 1}</b>${headers.map((h) => `<div><b>${escape(h)}:</b> ${escape(row[h]) || "—"}</div>`).join("")}</div>`).join("");
    return `<!doctype html><html><head><meta charset="utf-8" /><title>${escape(options.titleLabel || "SETUP Print")}</title><style>
      @page { size: ${customSize} ${orientation}; margin: 10mm; }
      * { box-sizing: border-box; } body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; padding: 12px; }
      h1 { margin: 0 0 4px; font-size: 18px; } .sub { font-size: 11px; color: #475569; font-weight: 700; margin-bottom: 10px; }
      table { width: 100%; border-collapse: collapse; font-size: 9px; table-layout: fixed; } th, td { border: 1px solid #64748b; padding: 5px; vertical-align: top; word-break: break-word; } th { background: #eef2f6; font-weight: 900; }
      .compact-card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; margin-bottom: 8px; font-size: 12px; }
      .tip { margin: 0 0 10px; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 10px; background: #f8fafc; font-weight: 800; font-size: 12px; }
      @media print { .no-print { display:none!important; } body { padding:0; } }
    </style></head><body><div class="tip no-print">Tip: If the Print dialog did not open automatically, press <b>Ctrl+P</b>.</div><h1>${escape(options.titleLabel || "SETUP Print")}</h1><div class="sub">${escape(OUTPUT_LAYOUT_LABEL[layout] || "Print")} • Records: ${rows.length} • Generated: ${escape(new Date().toLocaleString())}</div>${layout === "COMPACT" ? compact : table}<script>window.addEventListener('load',function(){setTimeout(function(){try{window.print();}catch(e){}},250);});</script></body></html>`;
  };

  const doSETUPPrint = (objectRows, options = {}) => {
    const win = window.open("", "_blank", "width=1200,height=800");
    if (!win) return alert("Popup blocked. Please allow popups for printing.");
    win.document.open();
    win.document.write(buildSETUPPrintHtml(objectRows, options));
    win.document.close();
  };

  const openSETUPPrintPopupRow = (entryId) => {
    setPrintModal({ open: true, scope: "row", entryId, layout: "FORM", preset: "a4", orientation: "landscape", customSize: { width: 8.5, height: 13 } });
  };

  const openSETUPPrintPopupBulk = () => {
    setPrintModal({ open: true, scope: "bulk", entryId: null, layout: "FORM", preset: "a4", orientation: "landscape", customSize: { width: 8.5, height: 13 } });
  };

  const openSETUPExportPopupRow = (entryId) => {
    setExportModal({ open: true, scope: "row", entryId, format: "excel", template: "TABLE", preset: "a4", orientation: "landscape", customSize: { width: 8.5, height: 13 } });
  };

  const openSETUPExportPopupBulk = () => {
    setExportModal({ open: true, scope: "bulk", entryId: null, format: "excel", template: "TABLE", preset: "a4", orientation: "landscape", customSize: { width: 8.5, height: 13 } });
  };

  const confirmSETUPPrint = async () => {
    const sourceRows = await getSETUPRowsForOutput(printModal.scope, printModal.entryId);
    const objectRows = buildSETUPObjectRowsForOutput(sourceRows);
    const titleLabel = printModal.scope === "row"
      ? `Print — ${getSETUPOutputLabel(sourceRows[0]) || "Record"}`
      : `Print — Filtered Rows (${objectRows.length})`;
    doSETUPPrint(objectRows, { layoutKey: printModal.layout, preset: printModal.preset, orientation: printModal.orientation, customSize: printModal.customSize, titleLabel });
    setPrintModal((p) => ({ ...p, open: false }));
  };

  const confirmSETUPExport = async () => {
    const sourceRows = await getSETUPRowsForOutput(exportModal.scope, exportModal.entryId);
    const objectRows = buildSETUPObjectRowsForOutput(sourceRows);
    const baseName = exportModal.scope === "row"
      ? sanitizeSETUPFilename(`SETUP_${getSETUPOutputLabel(sourceRows[0]) || "record"}`)
      : sanitizeSETUPFilename(`SETUP_Filtered_Rows`);
    if (exportModal.format === "csv") exportSETUPCSV(objectRows, `${baseName}.csv`);
    else if (exportModal.format === "excel") exportSETUPExcel(objectRows, `${baseName}.xlsx`);
    else if (exportModal.format === "pdf") await exportSETUPPDF(objectRows, { template: exportModal.template, preset: exportModal.preset, orientation: exportModal.orientation, customSize: exportModal.customSize, titleLabel: exportModal.scope === "row" ? `Export PDF — ${getSETUPOutputLabel(sourceRows[0]) || "Record"}` : `Export PDF — Filtered (${objectRows.length})`, filename: `${baseName}.pdf` });
    else if (exportModal.format === "docx") await exportSETUPDOCX(objectRows, { orientation: exportModal.orientation, filename: `${baseName}.docx` });
    setExportModal((p) => ({ ...p, open: false }));
  };

  const styles = {
    page: {
      padding: 14,
      position: "relative",
      fontFamily,
    },

    titleBar: {
      background: "#2f6fd6",
      color: "#fff",
      fontWeight: 900,
      padding: "10px 14px",
      letterSpacing: 0.5,
      fontSize: 22,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap",
      borderRadius: 6,
      fontFamily,
    },

    sectionTitleRow: {
      marginTop: 12,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      flexWrap: "wrap",
      fontFamily,
      position: "relative",
      zIndex: 2,
    },
    sectionTitle: {
      fontWeight: 800,
      fontSize: 13,
      color: "#0f172a",
      fontFamily,
    },

    tableHeaderRow: {
      marginTop: 10,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      flexWrap: "wrap",
      width: "100%",
      position: "relative",
      zIndex: 2,
    },
    tableHeaderTitle: {
      fontSize: 18,
      fontWeight: 800,
      color: "#123b5d",
      letterSpacing: 0.4,
      textTransform: "uppercase",
      whiteSpace: "nowrap",
      fontFamily,
    },
    tableFilterBar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 6,
      flexWrap: "wrap",
      width: "auto",
      marginLeft: "auto",
      position: "relative",
      zIndex: 2,
      overflowX: "auto",
      paddingBottom: 2,
    },
    tableFilterSelect: {
      padding: "6px 9px",
      borderRadius: 8,
      border: "1px solid #cbd5e1",
      background: "#fff",
      fontWeight: "bold",
      fontFamily,
      fontSize: 12,
      minWidth: 96,
      height: 34,
    },
    tableSearchInput: {
      padding: "6px 10px",
      borderRadius: 8,
      border: "1px solid #cbd5e1",
      background: "#fff",
      fontWeight: 600,
      fontFamily,
      fontSize: 12,
      minWidth: 170,
      width: 170,
      height: 34,
      outline: "none",
    },
    tableClearBtn: {
      border: "1px solid rgba(15, 23, 42, 0.18)",
      background: "#fff",
      padding: "6px 10px",
      borderRadius: 8,
      cursor: "pointer",
      fontWeight: "bold",
      fontSize: 12,
      fontFamily,
      height: 34,
      whiteSpace: "nowrap",
    },

    tableWrap: {
      marginTop: 8,
      overflowX: "auto",
      position: "relative",
      zIndex: 2,
    },
    table: { width: "100%", borderCollapse: "collapse", minWidth: 1200, fontFamily },
    th: {
      border: "2px solid #6b7280",
      padding: 7,
      background: "#eef2f6",
      fontSize: 12,
      textAlign: "center",
      fontFamily,
      fontWeight: 700,
      whiteSpace: "nowrap",
    },
    td: {
      border: "2px solid #6b7280",
      padding: 7,
      fontSize: 12,
      fontFamily,
      verticalAlign: "top",
    },
    tdCenter: {
      border: "2px solid #6b7280",
      padding: 7,
      fontSize: 12,
      textAlign: "center",
      fontFamily,
      verticalAlign: "top",
    },
    tdRight: {
      border: "2px solid #6b7280",
      padding: 7,
      fontSize: 12,
      textAlign: "right",
      whiteSpace: "nowrap",
      fontFamily,
      verticalAlign: "top",
    },

    googlePaginationWrap: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      marginTop: 18,
      marginBottom: 8,
      width: "100%",
    },
    googleWordmark: {
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
    },
    googleWordmarkTrack: {
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-start",
    },
    googleLetterO: (extra = {}) => ({
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 20,
      fontFamily,
      fontWeight: 900,
      fontSize: 34,
      lineHeight: 1,
      color: "#20a4e0",
      background: "transparent",
      border: "none",
      boxShadow: "none",
      borderRadius: 0,
      padding: 0,
      margin: 0,
      textShadow: "none",
      ...extra,
    }),
    googleMovingBlackO: (index = 0) => ({
      position: "absolute",
      left: 0,
      top: 0,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 20,
      fontFamily,
      fontWeight: 900,
      fontSize: 34,
      lineHeight: 1,
      color: "#111111",
      background: "transparent",
      border: "none",
      boxShadow: "none",
      borderRadius: 0,
      padding: 0,
      margin: 0,
      textShadow: "none",
      pointerEvents: "none",
      transform: `translateX(${index * 20}px)`,
      transition: "transform 240ms ease-in-out, color 240ms ease-in-out",
      willChange: "transform",
    }),
    googleLetterBlue: (extra = {}) => ({
      display: "inline-block",
      fontFamily,
      fontWeight: 900,
      fontSize: 34,
      lineHeight: 1,
      color: "#20a4e0",
      background: "transparent",
      border: "none",
      boxShadow: "none",
      borderRadius: 0,
      padding: 0,
      margin: 0,
      textShadow: "none",
      ...extra,
    }),
    googleLetterRed: (extra = {}) => ({
      display: "inline-block",
      fontFamily,
      fontWeight: 900,
      fontSize: 34,
      lineHeight: 1,
      color: "#111111",
      background: "transparent",
      border: "none",
      boxShadow: "none",
      borderRadius: 0,
      padding: 0,
      margin: 0,
      textShadow: "none",
      ...extra,
    }),
    googleLetterYellow: (extra = {}) => ({
      display: "inline-block",
      fontFamily,
      fontWeight: 900,
      fontSize: 34,
      lineHeight: 1,
      color: "#20a4e0",
      background: "transparent",
      border: "none",
      boxShadow: "none",
      borderRadius: 0,
      padding: 0,
      margin: 0,
      textShadow: "none",
      ...extra,
    }),
    googleLetterGreen: (extra = {}) => ({
      display: "inline-block",
      fontFamily,
      fontWeight: 900,
      fontSize: 34,
      lineHeight: 1,
      color: "#111111",
      background: "transparent",
      border: "none",
      boxShadow: "none",
      borderRadius: 0,
      padding: 0,
      margin: 0,
      textShadow: "none",
      ...extra,
    }),
    googlePaginationRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 14,
      flexWrap: "wrap",
      width: "100%",
    },
    googlePageNumbers: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 14,
      flexWrap: "wrap",
      width: "auto",
    },
    googleNavBtn: (disabled) => ({
      border: "none",
      background: "transparent",
      color: disabled ? "#94a3b8" : "#2563eb",
      fontWeight: 700,
      fontSize: 14,
      cursor: disabled ? "not-allowed" : "pointer",
      padding: 0,
      fontFamily,
    }),
    googlePageBtn: {
      border: "none",
      background: "transparent",
      color: "#111827",
      fontWeight: 500,
      fontSize: 14,
      cursor: "pointer",
      padding: 0,
      minWidth: 18,
      textAlign: "center",
      fontFamily,
    },
    googlePageBtnDisabled: {
      border: "none",
      background: "transparent",
      color: "#cbd5e1",
      fontWeight: 500,
      fontSize: 14,
      cursor: "not-allowed",
      padding: 0,
      minWidth: 18,
      textAlign: "center",
      fontFamily,
    },
    googlePageCurrent: {
      border: "none",
      background: "transparent",
      color: "#2563eb",
      fontWeight: 800,
      fontSize: 14,
      padding: 0,
      minWidth: 18,
      textAlign: "center",
      fontFamily,
    },

    tablePrintBtn: {
      border: "1px solid #0b4ea2",
      background: "#0b4ea2",
      color: "white",
      padding: "6px 10px",
      borderRadius: 8,
      cursor: "pointer",
      fontWeight: "bold",
      fontSize: 12,
      fontFamily,
      height: 34,
      whiteSpace: "nowrap",
    },
    addBtn: {
      border: "1px solid rgba(15, 23, 42, 0.18)",
      background: "#fff",
      padding: "6px 10px",
      borderRadius: 8,
      cursor: "pointer",
      fontWeight: "bold",
      fontSize: 12,
      fontFamily,
      height: 34,
      boxShadow: "0 2px 0 rgba(2,6,23,0.06)",
    },
    pillBtn: {
      border: "1px solid rgba(15, 23, 42, 0.18)",
      background: "#fff",
      padding: "5px 10px",
      borderRadius: 999,
      cursor: "pointer",
      fontWeight: 800,
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
    },
    dangerBtn: {
      padding: "6px 10px",
      borderRadius: 8,
      border: "1px solid #ef4444",
      background: "white",
      color: "#ef4444",
      fontWeight: 900,
      cursor: "pointer",
      fontSize: 12,
      fontFamily,
      whiteSpace: "nowrap",
    },

    modalBackdrop: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 14,
      zIndex: 9999,
    },

    addressModalBackdrop: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 14,
      zIndex: 20000,
    },

    modal: {
      width: "min(900px, 100%)",
      background: "white",
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      fontFamily,
      display: "flex",
      flexDirection: "column",
      maxHeight: "90vh",
    },
    modalHeader: {
      background: "#0b4ea2",
      color: "white",
      padding: "10px 14px",
      fontWeight: 900,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
      fontFamily,
      flex: "0 0 auto",
    },
    modalBody: { padding: 14, overflowY: "auto", flex: "1 1 auto" },
    modalFooter: {
      padding: 14,
      display: "flex",
      justifyContent: "flex-end",
      gap: 8,
      borderTop: "1px solid #e2e8f0",
      flex: "0 0 auto",
      background: "white",
    },

    grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
    field: { display: "flex", flexDirection: "column", gap: 6 },
    label: { fontSize: 12, fontWeight: 700, color: "#0f172a", fontFamily },

    input: {
      padding: "8px 10px",
      border: "1px solid #cbd5e1",
      borderRadius: 8,
      fontSize: 13,
      outline: "none",
      fontFamily,
      width: "100%",
      background: "white",
    },
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

    btnDark: {
      background: "#0b4ea2",
      border: "1px solid #0b4ea2",
      color: "white",
      padding: "9px 12px",
      borderRadius: 10,
      fontSize: 12,
      fontWeight: 900,
      cursor: "pointer",
      fontFamily,
      whiteSpace: "nowrap",
    },
    btnGhost: {
      background: "white",
      border: "1px solid #cbd5e1",
      color: "#0f172a",
      padding: "9px 12px",
      borderRadius: 10,
      fontSize: 12,
      fontWeight: 900,
      cursor: "pointer",
      fontFamily,
      whiteSpace: "nowrap",
    },

    pickModal: {
      width: "min(520px, 100%)",
      background: "white",
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      fontFamily,
      display: "flex",
      flexDirection: "column",
      maxHeight: "90vh",
    },
    pickHeader: {
      background: "#0b4ea2",
      color: "white",
      padding: "10px 14px",
      fontWeight: 900,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
      fontFamily,
      flex: "0 0 auto",
    },
    pickBody: { padding: 12, display: "grid", gap: 10, overflowY: "auto" },
    optionBtn: {
      width: "100%",
      textAlign: "left",
      padding: "10px 12px",
      borderRadius: 12,
      border: "1px solid rgba(15,23,42,0.14)",
      background: "#fff",
      cursor: "pointer",
      fontWeight: 800,
      fontFamily,
    },

    detailsModal: {
      width: "min(860px, 100%)",
      background: "white",
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      fontFamily,
      display: "flex",
      flexDirection: "column",
      maxHeight: "90vh",
    },

    techGridWrap: { marginTop: 10, display: "grid", gap: 10 },
    techRowCard: {
      border: "1px solid #e2e8f0",
      borderRadius: 12,
      padding: 12,
      background: "#fff",
    },
    techRowHead: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8,
      marginBottom: 10,
    },
    techRowTitle: { fontWeight: 900, fontSize: 12, color: "#0f172a" },
    techGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
    techGridFull: { gridColumn: "1 / -1" },

    oiWrap: { display: "grid", gap: 6 },
    oiTable: { width: "100%", borderCollapse: "collapse", fontFamily },
    oiTh: {
      border: "1px solid #94a3b8",
      padding: 5,
      background: "#eef2f6",
      fontSize: 11,
      textAlign: "center",
      fontWeight: 900,
      whiteSpace: "nowrap",
    },
    oiTd: {
      border: "1px solid #94a3b8",
      padding: 5,
      fontSize: 11,
      textAlign: "center",
    },
    oiTdLeft: {
      border: "1px solid #94a3b8",
      padding: 5,
      fontSize: 11,
      textAlign: "left",
      fontWeight: 800,
    },

    rptTable: { width: "100%", borderCollapse: "collapse", fontFamily },
    rptTh: {
      border: "1px solid #94a3b8",
      padding: 8,
      background: "#eef2f6",
      fontSize: 12,
      textAlign: "center",
      fontWeight: 900,
      whiteSpace: "nowrap",
    },
    rptTdLeft: {
      border: "1px solid #94a3b8",
      padding: 8,
      fontSize: 12,
      fontWeight: 800,
      textAlign: "left",
      minWidth: 260,
    },
    rptTd: {
      border: "1px solid #94a3b8",
      padding: 8,
      fontSize: 12,
      textAlign: "center",
    },
    rptInput: {
      width: 72,
      padding: "7px 8px",
      border: "1px solid #cbd5e1",
      borderRadius: 8,
      fontSize: 13,
      outline: "none",
      fontFamily,
      textAlign: "center",
      background: "white",
    },

    mono: {
      fontFamily:
        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    },

    flowShell: {
      width: "min(620px, 100%)",
      background: "white",
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      fontFamily,
      position: "relative",
      zIndex: 20001,
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
    mapBox: {
      height: 340,
      borderRadius: 12,
      overflow: "hidden",
      border: "1px solid #e2e8f0",
    },

    mapCard: {
      marginTop: 10,
      border: "2px solid #6b7280",
      borderRadius: 10,
      overflow: "hidden",
      background: "#fff",
      position: "relative",
      zIndex: 0,
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
    mapWrapLarge: { height: 460, width: "100%" },
    filterRow: {
      display: "flex",
      gap: 10,
      flexWrap: "wrap",
      alignItems: "center",
      marginTop: 8,
    },
    filterLabel: { fontSize: 12, fontWeight: 900, opacity: 0.8 },
    select: {
      padding: "8px 10px",
      borderRadius: 10,
      border: "1px solid #cbd5e1",
      background: "#fff",
      fontWeight: 800,
      fontFamily,
      fontSize: 12,
      minWidth: 220,
    },
    warn: {
      marginTop: 8,
      background: "#fff7ed",
      border: "1px solid #fdba74",
      padding: "10px 12px",
      borderRadius: 10,
      fontSize: 12,
      color: "#7c2d12",
      fontWeight: 800,
    },
  };

  return (
    <div style={styles.page} className="setup-page">
      <div style={styles.titleBar}>
        <div>SETUP</div>
        <div
          style={{ fontSize: 12, opacity: 0.95, fontWeight: 800, fontFamily }}
        >

        </div>
      </div>

      <div style={styles.mapCard}>
        <div style={styles.mapHeader}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              width: "100%",
            }}
          >
            <div style={styles.mapTitle}>
              PANGASINAN MAP — Approved Projects (Pinned Points)
            </div>
            <div style={styles.mapSub}>
              Pins shown: <b>{visiblePinnedProjects.length}</b> /{" "}
              {filteredPinnedProjects.length}
            </div>

            <div style={styles.filterRow}>
              <span style={styles.filterLabel}>Borders:</span>

              <select
                style={styles.select}
                value={borderMode}
                onChange={(e) => {
                  const v = e.target.value;
                  setBorderMode(v);
                  setSelectedMunicipality("");
                  setSelectedDistrict("");
                }}
              >
                <option value="municipality">Municipality Borders</option>
                <option value="district">District View (highlight)</option>
              </select>

              {borderMode === "municipality" ? (
                <>
                  <span style={styles.filterLabel}>Municipality:</span>
                  <select
                    style={styles.select}
                    value={selectedMunicipality}
                    onChange={(e) => setSelectedMunicipality(e.target.value)}
                  >
                    <option value="">All Municipalities</option>
                    {municipalityOptions.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <>
                  <span style={styles.filterLabel}>District:</span>
                  <select
                    style={styles.select}
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                  >
                    <option value="">Select District (optional)</option>
                    {districtOptions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </>
              )}

              <button
                type="button"
                style={styles.addBtn}
                onClick={() => {
                  setSelectedMunicipality("");
                  setSelectedDistrict("");
                }}
              >
                Clear
              </button>

              {geoError ? (
                <div style={styles.warn}>
                  ⚠ GeoJSON not loaded:{" "}
                  <span style={{ fontWeight: 900 }}>{geoError}</span>
                  <div style={{ marginTop: 6, opacity: 0.9 }}>
                    Make sure files exist:
                    <div style={{ fontFamily: styles.mono.fontFamily }}>
                      public/geo/pangasinan_outline.geojson
                      <br />
                      public/geo/pangasinan_municipalities.geojson
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div style={styles.mapWrapLarge}>
          <MapContainer
            center={[15.9167, 120.3333]}
            zoom={10}
            minZoom={9}
            maxZoom={13}
            style={{ height: "100%", width: "100%" }}
            zoomControl
          >
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Default (OSM)">
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                  opacity={0.9}
                />
              </LayersControl.BaseLayer>

              <LayersControl.BaseLayer name="Satellite (Esri)">
                <TileLayer
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                  attribution="Tiles &copy; Esri"
                  opacity={0.9}
                />
              </LayersControl.BaseLayer>
            </LayersControl>

            <Pane name="maskPane" style={{ zIndex: 300 }} />
            <Pane name="borderPane" style={{ zIndex: 500 }} />
            <Pane name="pinPane" style={{ zIndex: 700 }} />

            {maskLatLngs ? (
              <Polygon
                positions={maskLatLngs}
                pathOptions={maskPathOptions}
                pane="maskPane"
              />
            ) : null}
            {outlineGeo?.features?.length ? (
              <GeoJSON
                data={outlineGeo}
                style={pangasinanOutlineStyle}
                pane="borderPane"
              />
            ) : null}
            {filteredMunicipalityGeojson?.features?.length ? (
              <GeoJSON
                data={filteredMunicipalityGeojson}
                style={municipalityStyle}
                onEachFeature={onEachMunicipality}
                pane="borderPane"
              />
            ) : null}

            {pangasinanBounds ? (
              <FitAndLockToPangasinan
                bounds={pangasinanBounds}
                borderMode={borderMode}
                selectedMuni={selectedMunicipality}
                selectedDist={selectedDistrict}
                filteredGeo={filteredMunicipalityGeojson}
              />
            ) : null}

            {visiblePinnedProjects
              .filter((p) => {
                const lat = Number(p?.addressMeta?.lat);
                const lng = Number(p?.addressMeta?.lng);
                return Number.isFinite(lat) && Number.isFinite(lng);
              })
              .map((p) => (
                <Marker
                  key={p.id}
                  position={[Number(p.addressMeta.lat), Number(p.addressMeta.lng)]}
                  pane="pinPane"
                >
                  <Popup>
                    <div style={{ minWidth: 240, fontFamily }}>
                      <div style={{ fontWeight: 900, marginBottom: 6 }}>
                        {p.projectTitle}
                      </div>
                      <div style={{ fontSize: 12, marginBottom: 6 }}>
                        <b>Firm:</b> {p.firmName || "—"}
                        <br />
                        <b>Cooperator:</b> {p.cooperatorName || "—"}
                        <br />
                        <b>District:</b> {p.district || "—"}
                        <br />
                        <b>Municipality:</b> {getProjectMunicipality(p) || "—"}
                      </div>

                      <div style={{ fontSize: 12, marginBottom: 8 }}>
                        <b>Venue/Address:</b> {p.address || "—"}
                        <br />
                        <span style={{ ...styles.mono, fontSize: 12 }}>
                          {Number(p.addressMeta.lat).toFixed(6)},{" "}
                          {Number(p.addressMeta.lng).toFixed(6)}
                        </span>
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          style={styles.tinyBtn}
                          onClick={() =>
                            openGoogleMap(p.addressMeta.lat, p.addressMeta.lng)
                          }
                        >
                          Map
                        </button>
                        <button
                          type="button"
                          style={styles.tinyBtn}
                          onClick={() =>
                            openGoogleDirections(
                              p.addressMeta.lat,
                              p.addressMeta.lng
                            )
                          }
                        >
                          Directions
                        </button>
                        <button
                          type="button"
                          style={styles.tinyBtn}
                          onClick={() => setAddressViewForProjectId(p.id)}
                        >
                          View
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
          </MapContainer>
        </div>
      </div>

      <div style={styles.tableHeaderRow}>
        <div style={styles.tableHeaderTitle}>
          SETUP TABLE
          <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.75 }}>
            Showing <b>{paginatedProjects.length}</b> of {serverTotalRows} / {serverTotalRows}
          </span>
        </div>

        <div style={styles.tableFilterBar}>
          <input
            type="text"
            style={styles.tableSearchInput}
            value={tableFilterFirmName}
            onChange={(e) => setTableFilterFirmName(e.target.value)}
            placeholder="Search firm from database..."
          />

          <select
            style={styles.tableFilterSelect}
            value={tableFilterYear}
            onChange={(e) => setTableFilterYear(e.target.value)}
          >
            <option value="ALL">All Years</option>
            {tableYearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>

          <select
            style={styles.tableFilterSelect}
            value={tableFilterDistrict}
            onChange={(e) => setTableFilterDistrict(e.target.value)}
          >
            <option value="ALL">All Districts</option>
            {tableDistrictOptions.map((district) => (
              <option key={district} value={district}>
                {district}
              </option>
            ))}
          </select>

          <select
            style={styles.tableFilterSelect}
            value={tableFilterMonth}
            onChange={(e) => setTableFilterMonth(e.target.value)}
          >
            <option value="ALL">All Months</option>
            {[
              "January",
              "February",
              "March",
              "April",
              "May",
              "June",
              "July",
              "August",
              "September",
              "October",
              "November",
              "December",
            ].map((label, index) => (
              <option key={label} value={String(index + 1)}>
                {label}
              </option>
            ))}
          </select>

          <select
            style={styles.tableFilterSelect}
            value={tableFilterMunicipality}
            onChange={(e) => setTableFilterMunicipality(e.target.value)}
          >
            <option value="ALL">All Municipalities</option>
            {tableMunicipalityOptions.map((municipality) => (
              <option key={municipality} value={municipality}>
                {municipality}
              </option>
            ))}
          </select>

          <select
            style={styles.tableFilterSelect}
            value={tableFilterStatus}
            onChange={(e) => setTableFilterStatus(e.target.value)}
          >
            <option value="ALL">Overall</option>
            {tableStatusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <button type="button" style={styles.tableClearBtn} onClick={clearTableFilters}>
            Clear Filters
          </button>

          <button type="button" style={styles.addBtn} onClick={openSETUPExportPopupBulk}>
            Export
          </button>

          <button type="button" style={styles.tablePrintBtn} onClick={openSETUPPrintPopupBulk}>
            Print
          </button>

          <button type="button" style={styles.addBtn} onClick={openAddProject}>
            + Add Project
          </button>
        </div>
      </div>

      <div style={styles.tableWrap}>
        <table style={{ ...styles.table, minWidth: 1580 }}>
          <thead>
            <tr>
              <th style={styles.th}>NO.</th>
              <th style={styles.th}>NAME OF FIRM</th>
              <th style={styles.th}>SPIN NUMBER</th>
              <th style={styles.th}>SECTOR</th>
              <th style={styles.th}>DISTRICT</th>
              <th style={styles.th}>VENUE/ADDRESS</th>
              <th style={styles.th}>AMOUNT</th>
              <th style={styles.th}>S&amp;T INTERVENTION</th>
              <th style={styles.th}>OTHER INDICATORS</th>
              <th style={styles.th}>STATUS</th>
              <th style={styles.th}>TYPE</th>
              <th style={styles.th}>DATE APPROVED</th>
              <th style={styles.th}>ACTIONS</th>
            </tr>
          </thead>

          <tbody>
            {paginatedProjects.length === 0 ? (
              <tr>
                <td style={styles.tdCenter} colSpan={13}>
                  {projects.length === 0
                    ? 'Wala pang entries. Click “Add Project”.'
                    : "No matching projects found."}
                </td>
              </tr>
            ) : (
              paginatedProjects.map((p, idx) => {
                const selectedId = selectedInterventionByProject[p.id] || "";
                const {
                  jobsGenerated,
                  jobsIncreasePct,
                  productivityPct,
                  grossSales,
                } = getOI(p.id);

                const totalJobs = sumOI(jobsGenerated);
                const totalInc = sumOI(jobsIncreasePct);
                const totalProd = sumOI(productivityPct);
                const totalGross = sumOI(grossSales);

                const canEditOI = hasAnyOI(p.id);
                const hasCoords =
                  Number.isFinite(Number(p.addressMeta?.lat)) &&
                  Number.isFinite(Number(p.addressMeta?.lng));

                const stop = (e) => e.stopPropagation();

                return (
                  <tr key={p.id}>
                    <td style={styles.tdCenter}>{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                    <td style={styles.td}>{p.firmName}</td>
                    <td style={styles.tdCenter}>{p.spinNumber || "—"}</td>
                    <td style={styles.td}>{p.sector || "—"}</td>
                    <td style={styles.tdCenter}>{p.district}</td>

                    <td style={styles.td}>
                      <div style={{ display: "grid", gap: 8 }}>
                        <div style={{ fontSize: 12 }}>
                          {p.address || <span style={{ opacity: 0.65 }}>—</span>}
                        </div>

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            style={styles.tinyBtn}
                            onClick={(e) => {
                              stop(e);
                              setAddressViewForProjectId(p.id);
                            }}
                          >
                            View
                          </button>

                          {hasCoords ? (
                            <>
                              <button
                                type="button"
                                style={styles.tinyBtn}
                                onClick={(e) => {
                                  stop(e);
                                  openGoogleMap(
                                    p.addressMeta.lat,
                                    p.addressMeta.lng
                                  );
                                }}
                              >
                                Map
                              </button>
                              <button
                                type="button"
                                style={styles.tinyBtn}
                                onClick={(e) => {
                                  stop(e);
                                  openGoogleDirections(
                                    p.addressMeta.lat,
                                    p.addressMeta.lng
                                  );
                                }}
                              >
                                Directions
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    <td style={styles.tdRight}>{money(p.amount)}</td>

                    <td style={styles.td}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {Array.isArray(p.interventions) &&
                          p.interventions.length > 0 ? (
                          <div style={{ display: "grid", gap: 6 }}>
                            {p.interventions.map((it, i) => {
                              const isSelected = selectedId === it.id;
                              return (
                                <button
                                  type="button"
                                  key={it.id}
                                  onClick={(e) => {
                                    stop(e);
                                    setSelectedInterventionByProject((prev) => ({
                                      ...prev,
                                      [p.id]: it.id,
                                    }));
                                  }}
                                  style={{
                                    textAlign: "left",
                                    background: isSelected
                                      ? "#e0f2fe"
                                      : "transparent",
                                    border: isSelected
                                      ? "1px solid #38bdf8"
                                      : "1px solid transparent",
                                    borderRadius: 8,
                                    padding: "4px 6px",
                                    cursor: "pointer",
                                    fontSize: 12,
                                    fontFamily,
                                  }}
                                  title={it.type || ""}
                                >
                                  {i + 1}. [{it.type || "—"}]{" "}
                                  {getInterventionLabel(it)}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={{ fontSize: 12, opacity: 0.6 }}>—</div>
                        )}

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            type="button"
                            style={styles.pillBtn}
                            onClick={(e) => {
                              stop(e);
                              openInterventionPicker(p.id);
                            }}
                          >
                            + Add
                          </button>

                          <button
                            type="button"
                            style={styles.tinyBtn}
                            disabled={!selectedId}
                            onClick={(e) => {
                              stop(e);
                              openInterventionDetails_Edit(p.id, selectedId);
                            }}
                            title={
                              !selectedId
                                ? "Select an intervention first"
                                : "Edit selected"
                            }
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            style={styles.dangerTiny}
                            disabled={!selectedId}
                            onClick={(e) => {
                              stop(e);
                              deleteIntervention(p.id, selectedId);
                            }}
                            title={
                              !selectedId
                                ? "Select an intervention first"
                                : "Delete selected"
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </td>

                    <td style={styles.td}>
                      <div style={styles.oiWrap}>
                        <table style={styles.oiTable}>
                          <thead>
                            <tr>
                              <th style={styles.oiTh} />
                              <th style={styles.oiTh}>TOTAL</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td style={styles.oiTdLeft}>
                                No. of Jobs Generated
                              </td>
                              <td style={styles.oiTd}>{totalJobs || ""}</td>
                            </tr>
                            <tr>
                              <td style={styles.oiTdLeft}>
                                % increase in jobs generated
                              </td>
                              <td style={styles.oiTd}>
                                {totalInc ? `${totalInc}%` : ""}
                              </td>
                            </tr>
                            <tr>
                              <td style={styles.oiTdLeft}>
                                % improvement in productivity
                              </td>
                              <td style={styles.oiTd}>
                                {totalProd ? `${totalProd}%` : ""}
                              </td>
                            </tr>
                            <tr>
                              <td style={styles.oiTdLeft}>
                                Amount of gross sales generated (in Php&apos;000)
                              </td>
                              <td style={styles.oiTd}>
                                {totalGross ? money(totalGross) : ""}
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            type="button"
                            style={styles.pillBtn}
                            onClick={(e) => {
                              stop(e);
                              openAddReport(p.id);
                            }}
                          >
                            + Add Report
                          </button>
                          <button
                            type="button"
                            style={styles.tinyBtn}
                            disabled={!canEditOI}
                            onClick={(e) => {
                              stop(e);
                              openAddReport(p.id);
                            }}
                            title={!canEditOI ? "No report yet" : "Edit report"}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            style={styles.dangerTiny}
                            disabled={!canEditOI}
                            onClick={(e) => {
                              stop(e);
                              deleteOtherIndicators(p.id);
                            }}
                            title={!canEditOI ? "No report yet" : "Delete report"}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </td>

                    <td style={styles.tdCenter}>{p.status || "—"}</td>
                    <td style={styles.tdCenter}>{p.type || "—"}</td>
                    <td style={styles.tdCenter}>{p.dateApproved || "—"}</td>

                    <td style={styles.tdCenter}>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          justifyContent: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          type="button"
                          style={styles.tinyBtn}
                          onClick={(e) => {
                            stop(e);
                            setViewProjectId(p.id);
                          }}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          style={styles.tinyBtn}
                          onClick={(e) => {
                            stop(e);
                            openEditProject(p.id);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          style={styles.tinyBtn}
                          onClick={(e) => {
                            stop(e);
                            printProjects([p], `SETUP Project - ${p.firmName || p.projectTitle || "Record"}`);
                          }}
                        >
                          Print
                        </button>
                        <button
                          type="button"
                          style={styles.tinyBtn}
                          onClick={(e) => {
                            stop(e);
                            exportProjects([p], `SETUP_Project_${p.id || "record"}.xlsx`);
                          }}
                        >
                          Export
                        </button>
                        <button
                          type="button"
                          style={styles.dangerBtn}
                          onClick={(e) => {
                            stop(e);
                            deleteProject(p.id);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div style={styles.googlePaginationWrap}>
        <div style={styles.googleWordmark} aria-hidden="true">
          <span style={styles.googleLetterBlue()}>D</span>

          <div style={styles.googleWordmarkTrack}>
            {paginationLogoOSlots.map((slot) => (
              <span key={slot} style={styles.googleLetterO()}>
                o
              </span>
            ))}

            <span style={styles.googleMovingBlackO(activeLogoIndex)}>o</span>
          </div>

          <span style={styles.googleLetterBlue()}>s</span>
          <span style={styles.googleLetterBlue()}>t</span>
        </div>

        <div style={styles.googlePaginationRow}>
          <button
            type="button"
            style={styles.googleNavBtn(pageWindowStart === 1)}
            onClick={() =>
              setCurrentPage((prev) =>
                Math.max(
                  1,
                  Math.floor((prev - 1) / PAGE_NUMBER_WINDOW) * PAGE_NUMBER_WINDOW -
                  (PAGE_NUMBER_WINDOW - 1)
                )
              )
            }
            disabled={pageWindowStart === 1}
          >
            Previous
          </button>

          <div style={styles.googlePageNumbers}>
            {visiblePageNumbers.map((page) => {
              const isActive = page === currentPage;

              return isActive ? (
                <span key={page} style={styles.googlePageCurrent}>
                  {page}
                </span>
              ) : (
                <button
                  key={page}
                  type="button"
                  style={styles.googlePageBtn}
                  onClick={() => {
                    setCurrentPage(page);
                  }}
                >
                  {page}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            style={styles.googleNavBtn(false)}
            onClick={() =>
              setCurrentPage(
                Math.floor((currentPage - 1) / PAGE_NUMBER_WINDOW) * PAGE_NUMBER_WINDOW +
                PAGE_NUMBER_WINDOW +
                1
              )
            }
            disabled={false}
          >
            Next
          </button>
        </div>
      </div>

      {addressViewForProjectId && (
        <AddressViewModal
          project={addressViewProject}
          onClose={() => setAddressViewForProjectId(null)}
          styles={styles}
          openGoogleMap={openGoogleMap}
          openGoogleDirections={openGoogleDirections}
        />
      )}

      {viewProjectId && (
        <ViewProjectModal
          project={viewProject}
          onClose={() => setViewProjectId(null)}
          styles={styles}
          getOI={getOI}
          sumOI={sumOI}
          blankQuarterObj={blankQuarterObj}
          money={money}
          getInterventionLabel={getInterventionLabel}
          openGoogleMap={openGoogleMap}
          openGoogleDirections={openGoogleDirections}
          onViewIntervention={openInterventionDetails_View}
          onSaveDateApproved={saveProjectDateApproved}
          setupCustomFields={setupCustomFields}
        />
      )}



      {printModal.open ? (
        <div style={{ ...styles.modalBackdrop, zIndex: 4200 }} onClick={() => setPrintModal((p) => ({ ...p, open: false }))}>
          <div style={{ ...styles.modal, width: "min(720px, calc(100vw - 24px))", maxWidth: 720, position: "relative", zIndex: 4201 }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>{printModal.scope === "row" ? "Print (This Row)" : "Print (Filtered Rows)"}</div>
              <button type="button" style={styles.closeX || styles.btnGhost} onClick={() => setPrintModal((p) => ({ ...p, open: false }))}>✕</button>
            </div>
            <div style={styles.modalBody}>
              <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 10 }}>
                {printModal.scope === "row" ? `Firm: ${getSETUPOutputLabel((projects.find((p) => String(p.id) === String(printModal.entryId || exportModal.entryId)))) || "—"}` : "Records: filtered rows"}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                <div style={styles.field}><div style={styles.label}>Layout</div><select style={styles.input} value={printModal.layout} onChange={(e) => setPrintModal((p) => ({ ...p, layout: e.target.value }))}><option value="FORM">Form-Based Record Sheet</option><option value="TABLE">Table Layout</option><option value="COMPACT">Compact Summary</option></select></div>
                <div style={styles.field}><div style={styles.label}>Orientation</div><select style={styles.input} value={printModal.orientation} onChange={(e) => setPrintModal((p) => ({ ...p, orientation: e.target.value }))}><option value="landscape">Landscape (default)</option><option value="portrait">Portrait</option></select></div>
                <div style={styles.field}><div style={styles.label}>Paper Size</div><select style={styles.input} value={printModal.preset} onChange={(e) => setPrintModal((p) => ({ ...p, preset: e.target.value }))}><option value="a4">A4</option><option value="letter">Letter</option><option value="legal">Legal</option><option value="custom">Custom</option></select></div>
                <div style={styles.field}><div style={styles.label}>Custom Size (inches)</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><input style={styles.input} disabled={printModal.preset !== "custom"} value={printModal.customSize.width} onChange={(e) => setPrintModal((p) => ({ ...p, customSize: { ...p.customSize, width: e.target.value } }))} placeholder="Width" /><input style={styles.input} disabled={printModal.preset !== "custom"} value={printModal.customSize.height} onChange={(e) => setPrintModal((p) => ({ ...p, customSize: { ...p.customSize, height: e.target.value } }))} placeholder="Height" /></div></div>
              </div>
            </div>
            <div style={styles.modalFooter}><button type="button" style={styles.btnGhost} onClick={() => setPrintModal((p) => ({ ...p, open: false }))}>Cancel</button><button type="button" style={styles.btnDark} onClick={confirmSETUPPrint}>Print Now</button></div>
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
              <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 10 }}>{exportModal.scope === "row" ? `Firm: ${getSETUPOutputLabel((projects.find((p) => String(p.id) === String(printModal.entryId || exportModal.entryId)))) || "—"}` : "Records: filtered rows"}</div>
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
            <div style={styles.modalFooter}><button type="button" style={styles.btnGhost} onClick={() => setExportModal((p) => ({ ...p, open: false }))}>Cancel</button><button type="button" style={styles.btnDark} onClick={confirmSETUPExport}>Export Now</button></div>
          </div>
        </div>
      ) : null}

      <AddEditProjectModal
        open={showAdd}
        onClose={() => {
          setShowAdd(false);
          setEditProjectId(null);
        }}
        onSave={async () => {
          await saveProject();
        }}
        editProjectId={editProjectId}
        form={form}
        setForm={setForm}
        styles={styles}
        STATUS_OPTIONS={STATUS_OPTIONS}
        TYPE_OPTIONS={TYPE_OPTIONS}
        SECTOR_OPTIONS={SECTOR_OPTIONS}
        setupCustomFields={setupCustomFields}
        detectMunicipalityFromAddressText={detectMunicipalityFromAddressText}
        getDistrictFromMunicipality={getDistrictFromMunicipality}
        setAddressFlowOpen={setAddressFlowOpen}
        setAddressFlowTarget={setAddressFlowTarget}
      />

      {addressFlowOpen && (
        <AddressFlowModal
          open={addressFlowOpen}
          onClose={() => {
            setAddressFlowOpen(false);
            setAddressFlowTarget("project");
          }}
          onSave={(meta) => {
            if (
              addressFlowTarget === "training" ||
              addressFlowTarget === "tacs" ||
              addressFlowTarget === "packaging" ||
              addressFlowTarget === "calibration"
            ) {
              applyAddressMetaToDetailForm(meta, addressFlowTarget);
            } else {
              applyAddressMetaToForm(meta);
            }
          }}
          initialMeta={
            addressFlowTarget === "training"
              ? detailForm.venueMeta
              : addressFlowTarget === "tacs"
                ? detailForm.customerAddressMeta
                : addressFlowTarget === "packaging"
                  ? detailForm.packagingAddressMeta
                  : addressFlowTarget === "calibration"
                    ? detailForm.calibrationData?.addressMeta
                    : form.addressMeta
          }
          styles={styles}
          fetchBarangaysForMunicipality_Local={
            fetchBarangaysForMunicipality_Local
          }
        />
      )}

      <ReportModal
        open={Boolean(reportForProjectId)}
        onClose={() => setReportForProjectId(null)}
        styles={styles}
        reportProject={reportProject}
        reportForm={reportForm}
        setReportForm={setReportForm}
        saveReport={saveReport}
      />

      {pickForId && (
        <div style={styles.modalBackdrop} onClick={() => setPickForId(null)}>
          <div style={styles.pickModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.pickHeader}>
              <div>
                Add S&amp;T Intervention
                {pickedProject ? (
                  <span style={{ opacity: 0.9, fontWeight: 800 }}>
                    {" "}
                    — {pickedProject.projectTitle}
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                style={styles.btnGhost}
                onClick={() => setPickForId(null)}
              >
                ✕
              </button>
            </div>

            <div style={styles.pickBody}>
              {INTERVENTION_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt}
                  style={styles.optionBtn}
                  onClick={() => openInterventionDetails_Add(pickForId, opt)}
                >
                  {opt}
                </button>
              ))}
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                * Selecting a type will open the form.
              </div>
            </div>
          </div>
        </div>
      )}

      {(detailFor || viewInterventionFor) && (
        <div
          style={styles.modalBackdrop}
          onClick={() => {
            setDetailFor(null);
            setViewInterventionFor(null);
          }}
        >
          <div style={styles.detailsModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                {viewInterventionFor
                  ? "View"
                  : detailFor?.mode === "edit"
                    ? "Edit"
                    : "Add"}{" "}
                {detailForm.type} Details
                {detailProject ? (
                  <span style={{ opacity: 0.9, fontWeight: 800 }}>
                    {" "}
                    — {detailProject.projectTitle}
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                style={styles.btnGhost}
                onClick={() => {
                  setDetailFor(null);
                  setViewInterventionFor(null);
                  resetDetailForm("");
                }}
              >
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={{ maxWidth: 360 }}>
                <div style={styles.label}>Intervention Type</div>
                <input style={styles.input} value={detailForm.type} disabled />
              </div>

              {detailForm.type === "Training" ? (
                <>
                  <div
                    style={{
                      marginTop: 12,
                      fontWeight: 900,
                      fontSize: 13,
                      color: "#0f172a",
                    }}
                  >
                    Training / Seminar Details
                  </div>

                  <div style={{ ...styles.grid, marginTop: 10 }}>
                    <div style={styles.field}>
                      <div style={styles.label}>Title *</div>
                      <input
                        style={styles.input}
                        value={detailForm.title}
                        onChange={(e) =>
                          setDetailForm((p) => ({
                            ...p,
                            title: e.target.value,
                          }))
                        }
                        placeholder="Training title"
                        readOnly={Boolean(viewInterventionFor)}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Start Date</div>
                      <input
                        style={styles.input}
                        type="date"
                        value={detailForm.date}
                        onChange={(e) =>
                          setDetailForm((p) => ({
                            ...p,
                            date: e.target.value,
                          }))
                        }
                        readOnly={Boolean(viewInterventionFor)}
                      />
                    </div>

                    <div style={{ ...styles.field }}>
                      <div style={styles.label}>End Date</div>
                      <input
                        style={styles.input}
                        type="date"
                        value={detailForm.notesEndDate || ""}
                        onChange={(e) =>
                          setDetailForm((p) => ({
                            ...p,
                            notesEndDate: e.target.value,
                          }))
                        }
                        readOnly={Boolean(viewInterventionFor)}
                      />
                    </div>

                    <div style={{ ...styles.field }}>
                      <div style={styles.label}>Province</div>
                      <input
                        style={styles.input}
                        value={detailForm.notesProvince || "Pangasinan"}
                        onChange={(e) =>
                          setDetailForm((p) => ({
                            ...p,
                            notesProvince: e.target.value,
                          }))
                        }
                        readOnly={Boolean(viewInterventionFor)}
                      />
                    </div>

                    <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                      <div style={styles.label}>Venue / Address *</div>

                      <button
                        type="button"
                        onClick={() => {
                          if (viewInterventionFor) return;
                          setAddressFlowTarget("training");
                          setAddressFlowOpen(true);
                        }}
                        disabled={Boolean(viewInterventionFor)}
                        style={{
                          position: "relative",
                          width: "100%",
                          border: "1px solid #cbd5e1",
                          borderRadius: 10,
                          background: "#fff",
                          minHeight: 42,
                          padding: "0 92px 0 12px",
                          textAlign: "left",
                          cursor: viewInterventionFor ? "default" : "pointer",
                          fontFamily,
                          opacity: viewInterventionFor ? 0.95 : 1,
                        }}
                      >
                        <span
                          style={{
                            display: "block",
                            fontSize: 13,
                            color: detailForm.venue ? "#0f172a" : "#64748b",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            lineHeight: "40px",
                          }}
                        >
                          {detailForm.venue || "Click to select venue/address"}
                        </span>

                        <span
                          style={{
                            position: "absolute",
                            right: 6,
                            top: "50%",
                            transform: "translateY(-50%)",
                            border: "1px solid #cbd5e1",
                            background: "#fff",
                            padding: "6px 12px",
                            borderRadius: 8,
                            fontWeight: 800,
                            fontSize: 12,
                            color: "#0f172a",
                            pointerEvents: "none",
                          }}
                        >
                          Select
                        </span>
                      </button>
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>No. of Firms</div>
                      <input
                        style={styles.input}
                        type="number"
                        value={detailForm.noOfFirms}
                        onChange={(e) =>
                          setDetailForm((p) => ({
                            ...p,
                            noOfFirms: e.target.value,
                          }))
                        }
                        placeholder="0"
                        readOnly={Boolean(viewInterventionFor)}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>
                        No. of Firms / SUCs / HEIs / LGUs
                      </div>
                      <input
                        style={styles.input}
                        type="number"
                        value={detailForm.firmsSucsHeisLgusCount}
                        onChange={(e) =>
                          setDetailForm((p) => ({
                            ...p,
                            firmsSucsHeisLgusCount: e.target.value,
                          }))
                        }
                        placeholder="0"
                        readOnly={Boolean(viewInterventionFor)}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Participants Female</div>
                      <input
                        style={styles.input}
                        type="number"
                        value={detailForm.female}
                        onChange={(e) => {
                          const female = e.target.value;
                          setDetailForm((p) => {
                            const next = { ...p, female };
                            return {
                              ...next,
                              totalFemale: String(getTrainingFemaleTotal(next)),
                              totalMale: String(getTrainingMaleTotal(next)),
                              total: String(getTrainingGrandTotal(next)),
                            };
                          });
                        }}
                        placeholder="0"
                        readOnly={Boolean(viewInterventionFor)}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Participants Male</div>
                      <input
                        style={styles.input}
                        type="number"
                        value={detailForm.male}
                        onChange={(e) => {
                          const male = e.target.value;
                          setDetailForm((p) => {
                            const next = { ...p, male };
                            return {
                              ...next,
                              totalFemale: String(getTrainingFemaleTotal(next)),
                              totalMale: String(getTrainingMaleTotal(next)),
                              total: String(getTrainingGrandTotal(next)),
                            };
                          });
                        }}
                        placeholder="0"
                        readOnly={Boolean(viewInterventionFor)}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Senior Female</div>
                      <input
                        style={styles.input}
                        type="number"
                        value={detailForm.seniorFemale}
                        onChange={(e) =>
                          setDetailForm((p) => ({
                            ...p,
                            seniorFemale: e.target.value,
                          }))
                        }
                        placeholder="0"
                        readOnly={Boolean(viewInterventionFor)}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Senior Male</div>
                      <input
                        style={styles.input}
                        type="number"
                        value={detailForm.seniorMale}
                        onChange={(e) =>
                          setDetailForm((p) => ({
                            ...p,
                            seniorMale: e.target.value,
                          }))
                        }
                        placeholder="0"
                        readOnly={Boolean(viewInterventionFor)}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>IPs Female</div>
                      <input
                        style={styles.input}
                        type="number"
                        value={detailForm.ipFemale}
                        onChange={(e) =>
                          setDetailForm((p) => ({
                            ...p,
                            ipFemale: e.target.value,
                          }))
                        }
                        placeholder="0"
                        readOnly={Boolean(viewInterventionFor)}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>IPs Male</div>
                      <input
                        style={styles.input}
                        type="number"
                        value={detailForm.ipMale}
                        onChange={(e) =>
                          setDetailForm((p) => ({
                            ...p,
                            ipMale: e.target.value,
                          }))
                        }
                        placeholder="0"
                        readOnly={Boolean(viewInterventionFor)}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>4Ps Female</div>
                      <input
                        style={styles.input}
                        type="number"
                        value={detailForm.fourPsFemale}
                        onChange={(e) =>
                          setDetailForm((p) => ({
                            ...p,
                            fourPsFemale: e.target.value,
                          }))
                        }
                        placeholder="0"
                        readOnly={Boolean(viewInterventionFor)}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>4Ps Male</div>
                      <input
                        style={styles.input}
                        type="number"
                        value={detailForm.fourPsMale}
                        onChange={(e) =>
                          setDetailForm((p) => ({
                            ...p,
                            fourPsMale: e.target.value,
                          }))
                        }
                        placeholder="0"
                        readOnly={Boolean(viewInterventionFor)}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>PWD Female</div>
                      <input
                        style={styles.input}
                        type="number"
                        value={detailForm.pwdFemale}
                        onChange={(e) =>
                          setDetailForm((p) => ({
                            ...p,
                            pwdFemale: e.target.value,
                          }))
                        }
                        placeholder="0"
                        readOnly={Boolean(viewInterventionFor)}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>PWD Male</div>
                      <input
                        style={styles.input}
                        type="number"
                        value={detailForm.pwdMale}
                        onChange={(e) =>
                          setDetailForm((p) => ({
                            ...p,
                            pwdMale: e.target.value,
                          }))
                        }
                        placeholder="0"
                        readOnly={Boolean(viewInterventionFor)}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Total Female</div>
                      <input
                        style={styles.input}
                        type="number"
                        value={String(getTrainingFemaleTotal(detailForm))}
                        readOnly
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Total Male</div>
                      <input
                        style={styles.input}
                        type="number"
                        value={String(getTrainingMaleTotal(detailForm))}
                        readOnly
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Total Participants</div>
                      <input
                        style={styles.input}
                        type="number"
                        value={String(getTrainingGrandTotal(detailForm))}
                        placeholder="0"
                        readOnly
                      />
                    </div>

                    <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                      <div style={styles.label}>List of Firms / Associations</div>
                      <textarea
                        style={styles.textarea}
                        value={detailForm.firmsAssociationsList}
                        onChange={(e) =>
                          setDetailForm((p) => ({
                            ...p,
                            firmsAssociationsList: e.target.value,
                          }))
                        }
                        readOnly={Boolean(viewInterventionFor)}
                      />
                    </div>

                    <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                      <div style={styles.label}>Name of Trainer / Affiliation</div>
                      <textarea
                        style={styles.textarea}
                        value={detailForm.trainorAffiliation}
                        onChange={(e) =>
                          setDetailForm((p) => ({
                            ...p,
                            trainorAffiliation: e.target.value,
                          }))
                        }
                        readOnly={Boolean(viewInterventionFor)}
                      />
                    </div>

                    <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                      <div style={styles.label}>
                        Name of Program / Project / Unit
                      </div>
                      <input
                        style={styles.input}
                        value={detailForm.projectProgramUnit}
                        onChange={(e) =>
                          setDetailForm((p) => ({
                            ...p,
                            projectProgramUnit: e.target.value,
                          }))
                        }
                        placeholder="e.g. SETUP / CEST / Unit name"
                        readOnly={Boolean(viewInterventionFor)}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>DOST Cost</div>
                      <input
                        style={styles.input}
                        type="number"
                        min="0"
                        step="0.01"
                        value={detailForm.costDost}
                        onChange={(e) =>
                          setDetailForm((p) => {
                            const costDost = e.target.value;
                            const totalCost =
                              costDost === "" && p.costPartnerAgency === ""
                                ? ""
                                : String(
                                  Number(costDost || 0) +
                                  Number(p.costPartnerAgency || 0)
                                );
                            return { ...p, costDost, totalCost };
                          })
                        }
                        placeholder="0"
                        readOnly={Boolean(viewInterventionFor)}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Partner Agency Cost</div>
                      <input
                        style={styles.input}
                        type="number"
                        min="0"
                        step="0.01"
                        value={detailForm.costPartnerAgency}
                        onChange={(e) =>
                          setDetailForm((p) => {
                            const costPartnerAgency = e.target.value;
                            const totalCost =
                              p.costDost === "" && costPartnerAgency === ""
                                ? ""
                                : String(
                                  Number(p.costDost || 0) +
                                  Number(costPartnerAgency || 0)
                                );
                            return { ...p, costPartnerAgency, totalCost };
                          })
                        }
                        placeholder="0"
                        readOnly={Boolean(viewInterventionFor)}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Total Cost</div>
                      <input
                        style={styles.input}
                        type="number"
                        min="0"
                        step="0.01"
                        value={detailForm.totalCost}
                        onChange={(e) =>
                          setDetailForm((p) => ({
                            ...p,
                            totalCost: e.target.value,
                          }))
                        }
                        placeholder="0"
                        readOnly={Boolean(viewInterventionFor)}
                      />
                    </div>
                  </div>
                </>
              ) : null}

              {detailForm.type === "Tech Roll Out" ? (
                <>
                  <div
                    style={{
                      marginTop: 12,
                      fontWeight: 900,
                      fontSize: 13,
                      color: "#0f172a",
                    }}
                  >
                    Tech Roll Out — Technology Transfer (Grid)
                  </div>

                  <div style={styles.techGridWrap}>
                    {(detailForm.techRows || []).map((r, idx) => (
                      <div key={idx} style={styles.techRowCard}>
                        <div style={styles.techRowHead}>
                          <div style={styles.techRowTitle}>Row #{idx + 1}</div>
                          {!viewInterventionFor ? (
                            <button
                              type="button"
                              style={styles.dangerTiny}
                              onClick={() => removeTechRow(idx)}
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>

                        <div style={styles.techGrid}>
                          <div style={styles.field}>
                            <div style={styles.label}>UNIT/CENTER</div>
                            <input
                              style={styles.input}
                              value={r.unitCenter || ""}
                              onChange={(e) =>
                                updateTechRow(idx, "unitCenter", e.target.value)
                              }
                              readOnly={Boolean(viewInterventionFor)}
                            />
                          </div>

                          <div style={styles.field}>
                            <div style={styles.label}>TECHNOLOGY GENERATOR</div>
                            <input
                              style={styles.input}
                              value={r.techGenerator || ""}
                              onChange={(e) =>
                                updateTechRow(
                                  idx,
                                  "techGenerator",
                                  e.target.value
                                )
                              }
                              readOnly={Boolean(viewInterventionFor)}
                            />
                          </div>

                          <div
                            style={{ ...styles.field, ...styles.techGridFull }}
                          >
                            <div style={styles.label}>
                              NAME OF KNOWLEDGE/TECHNOLOGY TRANSFERRED
                            </div>
                            <input
                              style={styles.input}
                              value={r.knowledgeTech || ""}
                              onChange={(e) =>
                                updateTechRow(
                                  idx,
                                  "knowledgeTech",
                                  e.target.value
                                )
                              }
                              readOnly={Boolean(viewInterventionFor)}
                            />
                          </div>

                          <div style={styles.field}>
                            <div style={styles.label}>MODE OF TRANSFER</div>
                            <select
                              style={styles.input}
                              value={r.modeTransfer || ""}
                              onChange={(e) =>
                                updateTechRow(
                                  idx,
                                  "modeTransfer",
                                  e.target.value
                                )
                              }
                              disabled={Boolean(viewInterventionFor)}
                            >

                              <option value="Commercialization">
                                Commercialization
                              </option>
                              <option value="Extension">Extension</option>
                              <option value="Public Good">Public Good</option>
                            </select>
                          </div>

                          <div style={styles.field}>
                            <div style={styles.label}>DATE TRANSFERRED</div>
                            <input
                              style={styles.input}
                              type="date"
                              value={r.dateTransferred || ""}
                              onChange={(e) =>
                                updateTechRow(
                                  idx,
                                  "dateTransferred",
                                  e.target.value
                                )
                              }
                              readOnly={Boolean(viewInterventionFor)}
                            />
                          </div>

                          <div style={styles.field}>
                            <div style={styles.label}>ACTIVITY TITLE</div>
                            <input
                              style={styles.input}
                              value={r.activityTitle || ""}
                              onChange={(e) =>
                                updateTechRow(
                                  idx,
                                  "activityTitle",
                                  e.target.value
                                )
                              }
                              readOnly={Boolean(viewInterventionFor)}
                            />
                          </div>

                          <div style={styles.field}>
                            <div style={styles.label}>ACTIVITY DATE/VENUE</div>
                            <input
                              style={styles.input}
                              value={r.activityDateVenue || ""}
                              onChange={(e) =>
                                updateTechRow(
                                  idx,
                                  "activityDateVenue",
                                  e.target.value
                                )
                              }
                              readOnly={Boolean(viewInterventionFor)}
                            />
                          </div>

                          <div
                            style={{ ...styles.field, ...styles.techGridFull }}
                          >
                            <div style={styles.label}>
                              NAME AND ADDRESS OF INSTITUTION
                            </div>
                            <input
                              style={styles.input}
                              value={r.institutionNameAddress || ""}
                              onChange={(e) =>
                                updateTechRow(
                                  idx,
                                  "institutionNameAddress",
                                  e.target.value
                                )
                              }
                              readOnly={Boolean(viewInterventionFor)}
                            />
                          </div>

                          <div
                            style={{ ...styles.field, ...styles.techGridFull }}
                          >
                            <div style={styles.label}>
                              NAME AND DESIGNATION OF REPRESENTATIVE
                            </div>
                            <input
                              style={styles.input}
                              value={r.representativeNameDesignation || ""}
                              onChange={(e) =>
                                updateTechRow(
                                  idx,
                                  "representativeNameDesignation",
                                  e.target.value
                                )
                              }
                              readOnly={Boolean(viewInterventionFor)}
                            />
                          </div>

                          <div style={styles.field}>
                            <div style={styles.label}>CLASSIFICATION</div>
                            <select
                              style={styles.input}
                              value={r.classification || ""}
                              onChange={(e) =>
                                updateTechRow(
                                  idx,
                                  "classification",
                                  e.target.value
                                )
                              }
                              disabled={Boolean(viewInterventionFor)}
                            >

                              <option value="Individual">Individual</option>
                              <option value="MSME/Firm">MSME/Firm</option>
                              <option value="Academe">Academe</option>
                              <option value="LGU">LGU</option>
                              <option value="Cooperative/Association">
                                Cooperative/Association
                              </option>
                            </select>
                          </div>

                          <div style={styles.field}>
                            <div style={styles.label}>SEX (M/F)</div>
                            <select
                              style={styles.input}
                              value={r.sex || ""}
                              onChange={(e) =>
                                updateTechRow(idx, "sex", e.target.value)
                              }
                              disabled={Boolean(viewInterventionFor)}
                            >

                              <option value="M">M</option>
                              <option value="F">F</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}

                    {!viewInterventionFor ? (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          style={styles.tinyBtn}
                          onClick={addTechRow}
                        >
                          + Add Row
                        </button>
                      </div>
                    ) : null}
                  </div>
                </>
              ) : null}

              {detailForm.type === "TACS" ? (
                <>
                  <div
                    style={{
                      marginTop: 12,
                      fontWeight: 900,
                      fontSize: 13,
                      color: "#0f172a",
                    }}
                  >
                    TACS Entry
                  </div>

                  <div style={{ ...styles.grid, marginTop: 10 }}>
                    <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                      <div style={styles.label}>Type of Consultancy *</div>
                      <select
                        style={styles.input}
                        value={detailForm.consultancyType}
                        onChange={(e) => {
                          const value = e.target.value;

                          if (value === "__ADD_CUSTOM_TACS_OPTION__") {
                            setNewTacsType("");
                            setShowAddTacsTypeModal(true);
                            return;
                          }

                          setDetailForm((p) => ({
                            ...p,
                            consultancyType: value,
                          }));
                        }}
                        disabled={Boolean(viewInterventionFor)}
                      >
                        <option value="">-- Select --</option>

                        {tacsConsultancyOptions.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}

                        {!viewInterventionFor ? (
                          <option value="__ADD_CUSTOM_TACS_OPTION__">
                            + Add type of consultancy...
                          </option>
                        ) : null}
                      </select>
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Date of Engagement *</div>
                      <input
                        style={styles.input}
                        type="date"
                        value={detailForm.dateEngagement}
                        onChange={(e) =>
                          setDetailForm((p) => ({
                            ...p,
                            dateEngagement: e.target.value,
                          }))
                        }
                        readOnly={Boolean(viewInterventionFor)}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Expert / Institution</div>
                      <input
                        style={styles.input}
                        value={detailForm.expertInstitution}
                        onChange={(e) =>
                          setDetailForm((p) => ({
                            ...p,
                            expertInstitution: e.target.value,
                          }))
                        }
                        placeholder="Expert / Institution"
                        readOnly={Boolean(viewInterventionFor)}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Name of Customer *</div>
                      <input
                        style={styles.input}
                        value={detailForm.customerName}
                        onChange={(e) =>
                          setDetailForm((p) => ({
                            ...p,
                            customerName: e.target.value,
                          }))
                        }
                        readOnly={Boolean(viewInterventionFor)}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Sex (M/F)</div>
                      <select
                        style={styles.input}
                        value={detailForm.customerSex}
                        onChange={(e) =>
                          setDetailForm((p) => ({
                            ...p,
                            customerSex: e.target.value,
                          }))
                        }
                        disabled={Boolean(viewInterventionFor)}
                      >

                        <option value="M">M</option>
                        <option value="F">F</option>
                      </select>
                    </div>

                    <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                      <div style={styles.label}>Venue/Address of Customer *</div>

                      <button
                        type="button"
                        onClick={() => {
                          if (viewInterventionFor) return;
                          setAddressFlowTarget("tacs");
                          setAddressFlowOpen(true);
                        }}
                        disabled={Boolean(viewInterventionFor)}
                        style={{
                          position: "relative",
                          width: "100%",
                          border: "1px solid #cbd5e1",
                          borderRadius: 10,
                          background: "#fff",
                          minHeight: 42,
                          padding: "0 92px 0 12px",
                          textAlign: "left",
                          cursor: viewInterventionFor ? "default" : "pointer",
                          fontFamily,
                          opacity: viewInterventionFor ? 0.95 : 1,
                        }}
                      >
                        <span
                          style={{
                            display: "block",
                            fontSize: 13,
                            color: detailForm.customerAddress ? "#0f172a" : "#64748b",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            lineHeight: "40px",
                          }}
                        >
                          {detailForm.customerAddress ||
                            "Click to select venue/address of customer"}
                        </span>

                        <span
                          style={{
                            position: "absolute",
                            right: 6,
                            top: "50%",
                            transform: "translateY(-50%)",
                            border: "1px solid #cbd5e1",
                            background: "#fff",
                            padding: "6px 12px",
                            borderRadius: 8,
                            fontWeight: 800,
                            fontSize: 12,
                            color: "#0f172a",
                            pointerEvents: "none",
                          }}
                        >
                          Select
                        </span>
                      </button>
                    </div>

                    <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                      <div style={styles.label}>Means of Verification *</div>
                      <textarea
                        style={styles.textarea}
                        value={detailForm.meansVerification}
                        onChange={(e) =>
                          setDetailForm((p) => ({
                            ...p,
                            meansVerification: e.target.value,
                          }))
                        }
                        placeholder="Acceptance report / recommendation / document reference / link..."
                        readOnly={Boolean(viewInterventionFor)}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>
                        No. of Advice / Recommendations *
                      </div>
                      <input
                        style={styles.input}
                        type="number"
                        min="0"
                        value={detailForm.noOfAdvice}
                        onChange={(e) =>
                          setDetailForm((p) => ({
                            ...p,
                            noOfAdvice: e.target.value,
                          }))
                        }
                        readOnly={Boolean(viewInterventionFor)}
                      />
                    </div>
                  </div>
                </>
              ) : null}


              {detailForm.type === "Packaging & Labeling" ? (
                <>
                  <div
                    style={{
                      marginTop: 12,
                      fontWeight: 900,
                      fontSize: 13,
                      color: "#0f172a",
                    }}
                  >
                    Packaging & Labeling Entry
                  </div>

                  <div style={{ ...styles.grid, marginTop: 10 }}>
                    <div style={styles.field}>
                      <div style={styles.label}>Quarter *</div>
                      <select
                        style={styles.input}
                        value={detailForm.packagingQuarter}
                        onChange={(e) =>
                          setDetailForm((p) => ({
                            ...p,
                            packagingQuarter: e.target.value,
                          }))
                        }
                        disabled={Boolean(viewInterventionFor)}
                      >

                        <option value="1">1st Quarter</option>
                        <option value="2">2nd Quarter</option>
                        <option value="3">3rd Quarter</option>
                        <option value="4">4th Quarter</option>
                      </select>
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Province *</div>
                      <input
                        style={styles.input}
                        value={detailForm.packagingProvince}
                        onChange={(e) =>
                          setDetailForm((p) => ({
                            ...p,
                            packagingProvince: e.target.value,
                          }))
                        }
                        readOnly={Boolean(viewInterventionFor)}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Date Completed/Executed *</div>
                      <input
                        style={styles.input}
                        type="date"
                        value={detailForm.packagingDateCompleted}
                        onChange={(e) =>
                          setDetailForm((p) => ({
                            ...p,
                            packagingDateCompleted: e.target.value,
                          }))
                        }
                        readOnly={Boolean(viewInterventionFor)}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Type of Intervention *</div>
                      <select
                        style={styles.input}
                        value={detailForm.packagingServiceType}
                        onChange={(e) =>
                          setDetailForm((p) => ({
                            ...p,
                            packagingServiceType: e.target.value,
                          }))
                        }
                        disabled={Boolean(viewInterventionFor)}
                      >
                        <option value="Label Design">Label Design</option>
                        <option value="Packaging Design">Packaging Design</option>
                        <option value="Label Printing">Label Printing</option>
                        <option value="Packaging Material Provision">
                          Packaging Material Provision
                        </option>
                        <option value="Packaging & Labeling">Packaging & Labeling</option>
                      </select>
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Name of Product</div>
                      <input
                        style={styles.input}
                        value={detailForm.packagingProductName}
                        onChange={(e) =>
                          setDetailForm((p) => ({
                            ...p,
                            packagingProductName: e.target.value,
                          }))
                        }
                        placeholder="e.g. Banana Chips"
                        readOnly={Boolean(viewInterventionFor)}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>
                        Size/Variant of Label Design/Type of Packaging Material *
                      </div>
                      <input
                        style={styles.input}
                        value={detailForm.packagingSizeVariantMaterial}
                        onChange={(e) =>
                          setDetailForm((p) => ({
                            ...p,
                            packagingSizeVariantMaterial: e.target.value,
                          }))
                        }
                        placeholder="e.g. 4x5.6 inches sticker type"
                        readOnly={Boolean(viewInterventionFor)}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>No. of Packaging Materials Provided *</div>
                      <input
                        style={styles.input}
                        type="number"
                        min="0"
                        value={detailForm.packagingMaterialsProvided}
                        onChange={(e) =>
                          setDetailForm((p) => ({
                            ...p,
                            packagingMaterialsProvided: e.target.value,
                          }))
                        }
                        placeholder="e.g. N/A or quantity"
                        readOnly={Boolean(viewInterventionFor)}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Name of Customer *</div>
                      <input
                        style={styles.input}
                        value={detailForm.packagingCustomerName}
                        onChange={(e) =>
                          setDetailForm((p) => ({
                            ...p,
                            packagingCustomerName: e.target.value,
                          }))
                        }
                        readOnly={Boolean(viewInterventionFor)}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Sex (M/F)</div>
                      <select
                        style={styles.input}
                        value={detailForm.packagingCustomerSex}
                        onChange={(e) =>
                          setDetailForm((p) => ({
                            ...p,
                            packagingCustomerSex: e.target.value,
                          }))
                        }
                        disabled={Boolean(viewInterventionFor)}
                      >

                        <option value="M">M</option>
                        <option value="F">F</option>
                      </select>
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Name of Firm / Institution *</div>
                      <input
                        style={styles.input}
                        value={detailForm.packagingFirmName}
                        onChange={(e) =>
                          setDetailForm((p) => ({
                            ...p,
                            packagingFirmName: e.target.value,
                          }))
                        }
                        placeholder="e.g. RiceBIS Bayambang Agriculture Cooperative"
                        readOnly={Boolean(viewInterventionFor)}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Venue/Address *</div>

                      <button
                        type="button"
                        onClick={() => {
                          if (viewInterventionFor) return;
                          setAddressFlowTarget("packaging");
                          setAddressFlowOpen(true);
                        }}
                        disabled={Boolean(viewInterventionFor)}
                        style={{
                          position: "relative",
                          width: "100%",
                          border: "1px solid #cbd5e1",
                          borderRadius: 10,
                          background: "#fff",
                          minHeight: 42,
                          padding: "0 92px 0 12px",
                          textAlign: "left",
                          cursor: viewInterventionFor ? "default" : "pointer",
                          fontFamily,
                          opacity: viewInterventionFor ? 0.95 : 1,
                        }}
                      >
                        <span
                          style={{
                            display: "block",
                            fontSize: 13,
                            color: detailForm.packagingAddress ? "#0f172a" : "#64748b",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            lineHeight: "40px",
                          }}
                        >
                          {detailForm.packagingAddress || "Click to select venue/address"}
                        </span>

                        <span
                          style={{
                            position: "absolute",
                            right: 6,
                            top: "50%",
                            transform: "translateY(-50%)",
                            border: "1px solid #cbd5e1",
                            background: "#fff",
                            padding: "6px 12px",
                            borderRadius: 8,
                            fontWeight: 800,
                            fontSize: 12,
                            color: "#0f172a",
                            pointerEvents: "none",
                          }}
                        >
                          Select
                        </span>
                      </button>
                    </div>

                    <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                      <div style={styles.label}>Means of Verification</div>
                      <textarea
                        style={styles.textarea}
                        value={detailForm.packagingMeansVerification}
                        onChange={(e) =>
                          setDetailForm((p) => ({
                            ...p,
                            packagingMeansVerification: e.target.value,
                          }))
                        }
                        placeholder="Design approval sheet / links / OR / AR / report / photos..."
                        readOnly={Boolean(viewInterventionFor)}
                      />
                    </div>

                  </div>
                </>
              ) : null}

              {detailForm.type === "Calibration" ? (() => {
                const calibration = normalizeCalibrationData(detailForm.calibrationData || {});
                const breakdownTotals = computeCalibrationBreakdownTotals(
                  calibration.mcBreakdown || [],
                  calibration.category
                );
                const remainingSamples = Math.max(
                  0,
                  calibrationToNumber(calibration.noOfSample) - breakdownTotals.totalSamples
                );
                const setCalibrationField = (key, value) => {
                  setDetailForm((prev) => {
                    const current = normalizeCalibrationData(prev.calibrationData || {});
                    const next = { ...current, [key]: value };
                    if (key === "typeOfSample") {
                      next.testType = CALIBRATION_TEST_TYPE_BY_SAMPLE[value] || current.testType || "Mass Calibration";
                      if (value !== "Weighing Scale") {
                        next.mcBreakdown = [makeCalibrationBreakdownRow()];
                        next.range = "";
                        next.cost = "";
                        next.feesCollected = "";
                      }
                    }
                    if (key === "category" && next.typeOfSample === "Weighing Scale") {
                      next.mcBreakdown = (next.mcBreakdown || []).map((row) => ({
                        ...row,
                        feesCollected:
                          value === "PAYING"
                            ? calibrationToNumber(row.noOfSample) * calibrationToNumber(row.cost)
                            : 0,
                      }));
                    }
                    if (key === "female" || key === "male") {
                      next.totalCustomers =
                        calibrationToNumber(key === "female" ? value : next.female) +
                        calibrationToNumber(key === "male" ? value : next.male);
                    }
                    return { ...prev, calibrationData: next };
                  });
                };
                const setCalibrationBreakdownRow = (rowId, key, value) => {
                  setDetailForm((prev) => {
                    const current = normalizeCalibrationData(prev.calibrationData || {});
                    const nextRows = (current.mcBreakdown || []).map((row) => {
                      if (row.id !== rowId) return row;
                      const updated = { ...row, [key]: value };
                      updated.feesCollected =
                        current.category === "PAYING"
                          ? calibrationToNumber(updated.noOfSample) * calibrationToNumber(updated.cost)
                          : 0;
                      return updated;
                    });
                    return {
                      ...prev,
                      calibrationData: {
                        ...current,
                        mcBreakdown: nextRows,
                      },
                    };
                  });
                };
                const addCalibrationBreakdownRow = () => {
                  setDetailForm((prev) => {
                    const current = normalizeCalibrationData(prev.calibrationData || {});
                    const totals = computeCalibrationBreakdownTotals(current.mcBreakdown || [], current.category);
                    const remaining = Math.max(0, calibrationToNumber(current.noOfSample) - totals.totalSamples);
                    return {
                      ...prev,
                      calibrationData: {
                        ...current,
                        mcBreakdown: [
                          ...(current.mcBreakdown || []),
                          makeCalibrationBreakdownRow(remaining ? String(remaining) : "", true),
                        ],
                      },
                    };
                  });
                };
                const removeCalibrationBreakdownRow = (rowId) => {
                  setDetailForm((prev) => {
                    const current = normalizeCalibrationData(prev.calibrationData || {});
                    const remaining = (current.mcBreakdown || []).filter((row) => row.id !== rowId);
                    return {
                      ...prev,
                      calibrationData: {
                        ...current,
                        mcBreakdown: remaining.length ? remaining : [makeCalibrationBreakdownRow()],
                      },
                    };
                  });
                };

                return (
                  <>
                    <div
                      style={{
                        marginTop: 12,
                        fontWeight: 900,
                        fontSize: 13,
                        color: "#0f172a",
                      }}
                    >
                      Calibration Entry
                    </div>

                    <div style={{ ...styles.grid, marginTop: 10 }}>
                      <div style={styles.field}>
                        <div style={styles.label}>Category *</div>
                        <select
                          style={styles.input}
                          value={calibration.category}
                          onChange={(e) => setCalibrationField("category", e.target.value)}
                          disabled={Boolean(viewInterventionFor)}
                        >
                          <option value="PAYING">PAYING</option>
                          <option value="NON-PAYING">NON-PAYING</option>
                        </select>
                      </div>

                      <div style={styles.field}>
                        <div style={styles.label}>Date *</div>
                        <input
                          type="date"
                          style={styles.input}
                          value={calibration.date || ""}
                          onChange={(e) => setCalibrationField("date", e.target.value)}
                          readOnly={Boolean(viewInterventionFor)}
                        />
                      </div>

                      <div style={styles.field}>
                        <div style={styles.label}>Type of Samples *</div>
                        <select
                          style={styles.input}
                          value={calibration.typeOfSample}
                          onChange={(e) => setCalibrationField("typeOfSample", e.target.value)}
                          disabled={Boolean(viewInterventionFor)}
                        >
                          <option value="Weighing Scale">Weighing Scale</option>
                          <option value="Bucket">Bucket</option>
                        </select>
                      </div>

                      <div style={styles.field}>
                        <div style={styles.label}>Type of Test / Analysis / Calibration (Per Lab)</div>
                        <input
                          type="text"
                          style={{ ...styles.input, background: "#f8fafc" }}
                          value={calibration.testType || ""}
                          readOnly
                        />
                      </div>

                      <div style={styles.field}>
                        <div style={styles.label}>No. of Sample *</div>
                        <input
                          type="number"
                          min="1"
                          style={styles.input}
                          value={calibration.noOfSample}
                          onChange={(e) => setCalibrationField("noOfSample", e.target.value)}
                          readOnly={Boolean(viewInterventionFor)}
                        />
                      </div>

                      <div style={styles.field}>
                        <div style={styles.label}>Fees Collected (PHP)</div>
                        <input
                          type="number"
                          style={{ ...styles.input, background: "#f8fafc" }}
                          value={
                            calibration.typeOfSample === "Weighing Scale"
                              ? calibration.category === "PAYING"
                                ? breakdownTotals.totalFees
                                : 0
                              : calibration.category === "PAYING"
                                ? calibration.feesCollected
                                : 0
                          }
                          readOnly
                        />
                      </div>

                      {calibration.typeOfSample === "Weighing Scale" ? (
                        <div
                          style={{
                            gridColumn: "1 / -1",
                            border: "1px solid #cbd5e1",
                            borderRadius: 10,
                            padding: 12,
                            background: "#fff",
                          }}
                        >
                          <div style={{ ...styles.label, marginBottom: 6 }}>MC Range Breakdown *</div>
                          <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 8 }}>
                            Tip: when you add a new row, the system auto-fills the next row with the remaining sample count. You can still edit it.
                          </div>
                          <div style={{ fontSize: 12, color: "#c2410c", fontWeight: 800, marginBottom: 8 }}>
                            Please enter a value in the main No. of Sample field first before editing the breakdown sample fields.
                          </div>

                          {(calibration.mcBreakdown || []).map((row, idx) => (
                            <div
                              key={row.id}
                              style={{
                                display: "grid",
                                gridTemplateColumns: "1.1fr 0.9fr 1fr 1fr auto",
                                gap: 8,
                                marginBottom: 8,
                                alignItems: "end",
                              }}
                            >
                              <div style={styles.field}>
                                <div style={styles.label}>Range *</div>
                                <select
                                  style={styles.input}
                                  value={row.range || ""}
                                  onChange={(e) => setCalibrationBreakdownRow(row.id, "range", e.target.value)}
                                  disabled={Boolean(viewInterventionFor)}
                                >
                                  <option value="">Select range</option>
                                  {CALIBRATION_RANGE_OPTIONS.map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              </div>

                              <div style={styles.field}>
                                <div style={styles.label}>No. of Sample *</div>
                                <input
                                  type="number"
                                  min="0"
                                  style={styles.input}
                                  value={row.noOfSample}
                                  onChange={(e) => setCalibrationBreakdownRow(row.id, "noOfSample", e.target.value)}
                                  placeholder={idx === 0 ? "Enter main No. of Sample first" : "0"}
                                  readOnly={Boolean(viewInterventionFor)}
                                />
                              </div>

                              <div style={styles.field}>
                                <div style={styles.label}>Cost *</div>
                                <input
                                  type="number"
                                  min="0"
                                  style={styles.input}
                                  value={row.cost}
                                  onChange={(e) => setCalibrationBreakdownRow(row.id, "cost", e.target.value)}
                                  readOnly={Boolean(viewInterventionFor)}
                                />
                              </div>

                              <div style={styles.field}>
                                <div style={styles.label}>Fees Collected</div>
                                <input
                                  type="number"
                                  style={{ ...styles.input, background: "#f8fafc" }}
                                  value={calibration.category === "PAYING" ? calibrationToNumber(row.noOfSample) * calibrationToNumber(row.cost) : 0}
                                  readOnly
                                />
                              </div>

                              {!viewInterventionFor ? (
                                <button
                                  type="button"
                                  style={styles.dangerTiny}
                                  onClick={() => removeCalibrationBreakdownRow(row.id)}
                                >
                                  Remove
                                </button>
                              ) : null}
                            </div>
                          ))}

                          {!viewInterventionFor ? (
                            <button type="button" style={styles.tinyBtn} onClick={addCalibrationBreakdownRow}>
                              + Add MC Range Breakdown
                            </button>
                          ) : null}

                          <div
                            style={{
                              display: "flex",
                              justifyContent: "flex-end",
                              gap: 16,
                              fontSize: 12,
                              fontWeight: 800,
                              marginTop: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            <span>Main No. of Sample: {calibrationToNumber(calibration.noOfSample)}</span>
                            <span>Breakdown Total: {breakdownTotals.totalSamples}</span>
                            <span>Remaining: {remainingSamples}</span>
                            <span>Total Fees: {breakdownTotals.totalFees.toFixed(2)}</span>
                          </div>
                        </div>
                      ) : null}

                      <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                        <div style={styles.label}>Venue/Address *</div>
                        <button
                          type="button"
                          onClick={() => {
                            if (viewInterventionFor) return;
                            setAddressFlowTarget("calibration");
                            setAddressFlowOpen(true);
                          }}
                          disabled={Boolean(viewInterventionFor)}
                          style={{
                            position: "relative",
                            width: "100%",
                            border: "1px solid #cbd5e1",
                            borderRadius: 10,
                            background: "#fff",
                            minHeight: 42,
                            padding: "0 92px 0 12px",
                            textAlign: "left",
                            cursor: viewInterventionFor ? "default" : "pointer",
                            fontFamily,
                            opacity: viewInterventionFor ? 0.95 : 1,
                          }}
                        >
                          <span
                            style={{
                              display: "block",
                              fontSize: 13,
                              color: calibration.address ? "#0f172a" : "#64748b",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              lineHeight: "40px",
                            }}
                          >
                            {calibration.address || "Click to select venue/address"}
                          </span>
                          <span
                            style={{
                              position: "absolute",
                              right: 6,
                              top: "50%",
                              transform: "translateY(-50%)",
                              border: "1px solid #cbd5e1",
                              background: "#fff",
                              padding: "6px 12px",
                              borderRadius: 8,
                              fontWeight: 800,
                              fontSize: 12,
                              color: "#0f172a",
                              pointerEvents: "none",
                            }}
                          >
                            Select
                          </span>
                        </button>
                      </div>

                      <div style={styles.field}><div style={styles.label}>Female</div><input type="number" min="0" style={styles.input} value={calibration.female} onChange={(e) => setCalibrationField("female", e.target.value)} readOnly={Boolean(viewInterventionFor)} /></div>
                      <div style={styles.field}><div style={styles.label}>Male</div><input type="number" min="0" style={styles.input} value={calibration.male} onChange={(e) => setCalibrationField("male", e.target.value)} readOnly={Boolean(viewInterventionFor)} /></div>
                      <div style={{ ...styles.field, gridColumn: "1 / -1" }}><div style={styles.label}>Total Customers</div><input type="number" min="0" style={{ ...styles.input, background: "#f8fafc", fontWeight: 800 }} value={calibrationToNumber(calibration.female) + calibrationToNumber(calibration.male)} readOnly /></div>

                      <div
                        style={{
                          gridColumn: "1 / -1",
                          marginTop: 4,
                          padding: 10,
                          border: "1px solid #e2e8f0",
                          borderRadius: 10,
                          background: "#f8fafc",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 800,
                            color: "#334155",
                            marginBottom: 8,
                          }}
                        >
                          Customer Breakdown
                        </div>

                        <div style={{ ...styles.grid }}>
                          <div style={styles.field}><div style={styles.label}>PWD</div><input type="number" min="0" style={styles.input} value={calibration.pwd} onChange={(e) => setCalibrationField("pwd", e.target.value)} readOnly={Boolean(viewInterventionFor)} /></div>
                          <div style={styles.field}><div style={styles.label}>IP</div><input type="number" min="0" style={styles.input} value={calibration.ip} onChange={(e) => setCalibrationField("ip", e.target.value)} readOnly={Boolean(viewInterventionFor)} /></div>
                          <div style={styles.field}><div style={styles.label}>Senior Citizen</div><input type="number" min="0" style={styles.input} value={calibration.sc} onChange={(e) => setCalibrationField("sc", e.target.value)} readOnly={Boolean(viewInterventionFor)} /></div>
                          <div style={styles.field}><div style={styles.label}>4Ps</div><input type="number" min="0" style={styles.input} value={calibration.fourPs} onChange={(e) => setCalibrationField("fourPs", e.target.value)} readOnly={Boolean(viewInterventionFor)} /></div>
                        </div>
                      </div>

                      <div style={styles.field}><div style={styles.label}>No. of Firms</div><input type="number" min="0" style={styles.input} value={calibration.noOfFirms} onChange={(e) => setCalibrationField("noOfFirms", e.target.value)} readOnly={Boolean(viewInterventionFor)} /></div>
                      <div style={styles.field}><div style={styles.label}>No. of New Firms</div><input type="number" min="0" style={styles.input} value={calibration.noOfNewFirms} onChange={(e) => setCalibrationField("noOfNewFirms", e.target.value)} readOnly={Boolean(viewInterventionFor)} /></div>
                      <div style={{ ...styles.field, gridColumn: "1 / -1" }}><div style={styles.label}>Age Range</div><input style={styles.input} value={calibration.ageRange} onChange={(e) => setCalibrationField("ageRange", e.target.value)} readOnly={Boolean(viewInterventionFor)} /></div>

                      <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                        <div style={styles.label}>Remarks</div>
                        <textarea
                          style={styles.textarea}
                          value={calibration.remarks || ""}
                          onChange={(e) => setCalibrationField("remarks", e.target.value)}
                          readOnly={Boolean(viewInterventionFor)}
                        />
                      </div>
                    </div>
                  </>
                );
              })() : null}

              {detailForm.type !== "Calibration" ? (
                <div style={{ ...styles.field, marginTop: 12 }}>
                  <div style={styles.label}>Notes / Remarks</div>
                  <textarea
                    style={styles.textarea}
                    value={detailForm.notes}
                    onChange={(e) =>
                      setDetailForm((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    readOnly={Boolean(viewInterventionFor)}
                  />
                </div>
              ) : null}
            </div>

            <div style={styles.modalFooter}>
              {viewInterventionFor ? (
                <button
                  type="button"
                  style={styles.btnDark}
                  onClick={() => {
                    setViewInterventionFor(null);
                    resetDetailForm("");
                  }}
                >
                  Close
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    style={styles.btnGhost}
                    onClick={() => {
                      setDetailFor(null);
                      setShowAddTacsTypeModal(false);
                      setNewTacsType("");
                      resetDetailForm("");
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    style={styles.btnDark}
                    onClick={saveInterventionDetails}
                  >
                    {detailFor?.mode === "edit" ? "Update" : "Save"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showAddTacsTypeModal && (
        <div
          style={styles.modalBackdrop}
          onClick={() => setShowAddTacsTypeModal(false)}
        >
          <div
            style={{ ...styles.modal, width: "min(560px, 100%)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <div>Add Type of Consultancy</div>
              <button
                type="button"
                style={styles.btnGhost}
                onClick={() => setShowAddTacsTypeModal(false)}
              >
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.field}>
                <div style={styles.label}>New type name</div>
                <input
                  style={styles.input}
                  value={newTacsType}
                  onChange={(e) => setNewTacsType(e.target.value)}
                  placeholder='e.g., "Food Safety Audit"'
                  autoFocus
                />
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button
                type="button"
                style={styles.btnGhost}
                onClick={() => setShowAddTacsTypeModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                style={styles.btnDark}
                onClick={addCustomTacsConsultancyType}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



