import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  TableRow,
  TableCell,
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
  useMap,
  useMapEvents,
} from "react-leaflet";

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const API_BASE_URL = API_BASE.replace(/\/$/, "");
const ST_PROMO_API = `${API_BASE_URL}/st-promo`;
const BARANGAY_LOCAL_URL = "/data/pangasinan_barangays.json";
const DEFAULT_CENTER = [15.9167, 120.3333];

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

const MONTHS = [
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
];

const ONLINE_ACTIVITY_OPTIONS = [
  "Press Releases",
  "ATM posts, Infographics",
  "TV/radio Interviews",
  "Press conference",
  "Webinars",
  "Others",
];

const ONSITE_ACTIVITY_OPTIONS = [
  "FGD",
  "Interview",
  "Meeting",
  "Forum",
  "Seminar",
  "Workshop",
  "Webinar",
  "Others",
];

const EMPTY_FORM = {
  id: null,
  entryMode: "ONLINE",
  date: new Date().toISOString().slice(0, 10),
  projectTitle: "",
  activityType: "",
  regional: "",
  provincial: "",
  cityMunicipality: "",
  male: "",
  female: "",
  totalParticipants: "",
  peopleReached: "",
  views: "",
  reaction: "",
  comment: "",
  share: "",
  totalEngagements: "",
  meansOfVerification: "",
  movPhotos: [],
  photos: [],
  address: "",
  addressMeta: null,
  municipality: "",
  district: "",
  barangay: "",
  staffName: "",
  customFields: {},
  remarks: "",
};

function uid() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeKey(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function toNumber(v) {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(String(v).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
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

function totalPromotionalActivities(entry) {
  return (
    toNumber(entry?.regional) +
    toNumber(entry?.provincial) +
    toNumber(entry?.cityMunicipality)
  );
}

function totalParticipants(entry) {
  return toNumber(entry?.male) + toNumber(entry?.female);
}

function totalEngagements(entry) {
  return (
    toNumber(entry?.reaction) +
    toNumber(entry?.comment) +
    toNumber(entry?.share)
  );
}

function detectMunicipalityName(feature) {
  const props = feature?.properties || {};
  const keys = [
    "name",
    "NAME",
    "NAME_3",
    "NAME_2",
    "ADM3_EN",
    "ADM3EN",
    "ADM3",
    "MUNICIPALI",
    "MUNICIPALITY",
    "CITY",
    "city",
    "municipality",
  ];
  for (const k of keys) if (props[k]) return String(props[k]).trim();
  return "";
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

function extractArrayResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.rows)) return data.rows;
  return [];
}

function extractObjectResponse(data, fallback = null) {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    if (data.data && typeof data.data === "object" && !Array.isArray(data.data)) return data.data;
    return data;
  }
  return fallback;
}
function parseStPromoCustomFields(value) {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value || "{}");
  } catch {
    return {};
  }
}

function parseStPromoPhotos(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "object") return [];
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getStPromoPhotos(entry = {}) {
  return parseStPromoPhotos(
    entry.photos ??
      entry.movPhotos ??
      entry.mov_photos ??
      entry.photoUrls ??
      entry.photo_urls ??
      entry.st_promo_photos
  );
}

function extractStPromoMovLinks(text) {
  return Array.from(new Set(String(text || "").match(/https?:\/\/[^\s]+/gi) || []));
}

function openStPromoFirstMovLink(text) {
  const links = extractStPromoMovLinks(text);
  if (!links.length) return alert("No URL found in Means of Verification.");
  window.open(links[0], "_blank", "noopener,noreferrer");
}

function cleanStPromoCustomLabel(value) {
  return String(value || "")
    .replace(/^#+/, "")
    .replace(/_/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function getApiErrorMessage(error, fallbackMessage) {
  return error?.response?.data?.message || error?.message || fallbackMessage;
}

async function fetchBarangaysForMunicipality_Local(muniName) {
  const res = await axios.get(BARANGAY_LOCAL_URL);
  const data = res.data;

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

function FitAndLockToPangasinan({ bounds, borderMode, selectedMuni, selectedDist, filteredGeo }) {
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

function AddressFlowModal({
  open,
  onClose,
  onSave,
  initialMeta,
  municipalityOptions,
  fetchBarangaysForMunicipality_Local,
  styles,
}) {
  const [mode, setMode] = useState(initialMeta?.mode || "hierarchical");
  const [step, setStep] = useState(1);
  const [venue, setVenue] = useState(initialMeta?.venue || initialMeta?.venueName || "");
  const [manualText, setManualText] = useState(initialMeta?.manualText || "");
  const [coordsText, setCoordsText] = useState(() => {
    const lat = Number(initialMeta?.lat);
    const lng = Number(initialMeta?.lng);
    return Number.isFinite(lat) && Number.isFinite(lng) ? `${lat}, ${lng}` : "";
  });
  const [coordinateLoading, setCoordinateLoading] = useState(false);
  const province = "Pangasinan";
  const [municipality, setMunicipality] = useState(initialMeta?.municipality || "");
  const [barangay, setBarangay] = useState(initialMeta?.barangay || "");
  const [barangayOptions, setBarangayOptions] = useState([]);
  const [barangayLoading, setBarangayLoading] = useState(false);
  const [barangayError, setBarangayError] = useState("");
  const [search, setSearch] = useState("");
  const [coords, setCoords] = useState(() => {
    const lat = initialMeta?.lat;
    const lng = initialMeta?.lng;
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  });

  useEffect(() => {
    if (!open) return;

    const initMode = initialMeta?.mode || "hierarchical";
    setMode(initMode);
    setVenue(initialMeta?.venue || initialMeta?.venueName || "");
    setManualText(initialMeta?.manualText || "");
    setMunicipality(initialMeta?.municipality || "");
    setBarangay(initialMeta?.barangay || "");

    const lat = initialMeta?.lat;
    const lng = initialMeta?.lng;
    const hasCoords = Number.isFinite(Number(lat)) && Number.isFinite(Number(lng));
    setCoords(hasCoords ? { lat: Number(lat), lng: Number(lng) } : null);
    setCoordsText(hasCoords ? `${Number(lat)}, ${Number(lng)}` : "");
    setCoordinateLoading(false);

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

  const filterList = (items) => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return items;
    return items.filter((x) => {
      const name = typeof x === "string" ? x : String(x?.name || "");
      return name.toLowerCase().includes(q);
    });
  };

  const parseCoordinates = (value = "") => {
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

  const handleUseCoordinates = async () => {
    const parsed = parseCoordinates(coordsText);
    if (!parsed) return alert("Invalid coordinates. Use format: 15.123456, 120.123456");
    setCoords(parsed);
    setCoordinateLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${parsed.lat}&lon=${parsed.lng}`);
      if (res.ok) {
        const data = await res.json();
        const address = compactReverseAddress(data);
        if (address) setManualText(address);
      }
    } catch { }
    finally {
      setCoordinateLoading(false);
    }
  };

  const addressOnlyText =
    mode === "manual"
      ? manualText.trim()
      : [barangay, municipality, province].filter(Boolean).join(", ");

  const displayText = [venue.trim(), addressOnlyText].filter(Boolean).join(",\n");

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
    if (step === 2) {
      setStep(1);
      setSearch("");
      return;
    }
    if (step === 3) setStep(2);
  };

  const goToMap = () => {
    if (!municipality || !barangay) return alert("Please select Municipality and Barangay first.");
    if (!coords) setCoords({ lat: 15.9167, lng: 120.3333 });
    setStep(3);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported in this browser.");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const picked = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(picked);
        setCoordsText(`${picked.lat}, ${picked.lng}`);
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
          venue: venue.trim(),
          venueName: venue.trim(),
          manualText: manualText.trim(),
          addressOnlyText,
          displayText,
          province: "",
          municipality: detectMunicipalityFromAddressText(manualText),
          barangay: "",
          lat: coords?.lat || null,
          lng: coords?.lng || null,
        }
        : {
          mode: "hierarchical",
          venue: venue.trim(),
          venueName: venue.trim(),
          province,
          municipality,
          barangay,
          manualText: "",
          addressOnlyText,
          displayText,
          lat: coords?.lat || null,
          lng: coords?.lng || null,
        };

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
            <div style={{ fontSize: 14, opacity: 0.9, fontWeight: 800 }}>{breadcrumb}</div>
          </div>
          <button style={styles.closeX} onClick={onClose}>✕</button>
        </div>

        <div style={styles.flowBody}>
          <div style={styles.tabsRow}>
            <button
              style={styles.tabBtn(mode === "hierarchical")}
              onClick={() => {
                setMode("hierarchical");
                setStep(1);
                setManualText("");
                setSearch("");
              }}
            >
              Hierarchical
            </button>
            <button
              style={styles.tabBtn(mode === "manual")}
              onClick={() => {
                setMode("manual");
                setStep(1);
                setMunicipality("");
                setBarangay("");
                setBarangayOptions([]);
                setBarangayError("");
                setSearch("");
              }}
            >
              Manual Input
            </button>
          </div>

          {mode === "manual" ? (
            <>
              <div style={styles.field}>
                <div style={styles.label}>Venue</div>
                <input
                  style={styles.input}
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="e.g. Riverside Convention Center (optional)"
                />
              </div>
              <div style={styles.field}>
                <div style={styles.label}>Type Venue/Address</div>
                <textarea
                  style={styles.textarea}
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="Optional: Bldg/Street, Barangay, City/Municipality, Pangasinan"
                />
              </div>

              <div style={styles.field}>
                <div style={styles.label}>Coordinates</div>
                <input
                  style={styles.input}
                  value={coordsText}
                  onChange={(e) => setCoordsText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleUseCoordinates(); } }}
                  placeholder="Optional: 15.123456, 120.123456"
                />
                <button type="button" style={{ ...styles.btnGhost, alignSelf: "flex-start" }} onClick={handleUseCoordinates} disabled={!coordsText.trim() || coordinateLoading}>
                  {coordinateLoading ? "Finding address..." : "Use Coordinates"}
                </button>
              </div>

              <div style={{ fontSize: 14, opacity: 0.75, whiteSpace: "pre-wrap" }}>Preview: <b>{displayText || "—"}</b></div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <button style={styles.btnGhost} onClick={back}>Back</button>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button style={styles.btnGhost} onClick={useMyLocation}>Use My Location</button>
                  <button style={styles.btnDark} onClick={save} disabled={!canSave}>Save</button>
                </div>
              </div>
            </>
          ) : (
            <>
              {step === 1 && (
                <>
                  <div style={styles.field}>
                    <div style={styles.label}>Venue</div>
                    <input
                      style={styles.input}
                      value={venue}
                      onChange={(e) => setVenue(e.target.value)}
                      placeholder="e.g. Riverside Convention Center (optional)"
                    />
                  </div>
                  <div style={styles.field}>
                    <div style={styles.label}>Search Municipality/City</div>
                    <input
                      style={styles.input}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Type to search..."
                    />
                  </div>

                  <div style={styles.label}>Select Municipality/City (Pangasinan)</div>
                  <div style={styles.list}>
                    {filterList(municipalityOptions).map((name) => {
                      const active = name === municipality;
                      return (
                        <button
                          key={name}
                          style={{ ...styles.listBtn, ...(active ? styles.listBtnActive : null) }}
                          onClick={() => {
                            setMunicipality(name);
                            setBarangay("");
                            setCoords(null);
                            setSearch("");
                            setStep(2);
                          }}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <button style={styles.btnGhost} onClick={onClose}>Cancel</button>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div style={styles.label}>Municipality: <b>{municipality}</b></div>

                  <div style={styles.field}>
                    <div style={styles.label}>Search Barangay</div>
                    <input
                      style={styles.input}
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={barangayLoading ? "Loading..." : "Type to search barangays..."}
                      disabled={barangayLoading}
                    />
                  </div>

                  {barangayLoading ? (
                    <div style={{ fontSize: 14, opacity: 0.8, fontWeight: 800 }}>Loading barangays...</div>
                  ) : barangayError ? (
                    <div style={styles.warn}>⚠ {barangayError}</div>
                  ) : (
                    <>
                      <div style={styles.label}>Select Barangay *</div>
                      <div style={styles.list}>
                        {filterList(barangayOptions).map((b) => {
                          const name = typeof b === "string" ? b : b.name;
                          const active = name === barangay;

                          return (
                            <button
                              key={name}
                              style={{ ...styles.listBtn, ...(active ? styles.listBtnActive : null) }}
                              onClick={() => {
                                setBarangay(name);
                                const lat = typeof b === "string" ? null : b.lat;
                                const lng = typeof b === "string" ? null : b.lng;
                                if (Number.isFinite(lat) && Number.isFinite(lng)) { setCoords({ lat, lng }); setCoordsText(`${lat}, ${lng}`); }
                                else { setCoords(null); setCoordsText(""); }
                              }}
                            >
                              {name}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}

                  <div style={{ fontSize: 14, opacity: 0.75 }}>
                    Preview: <b>{displayText || "—"}</b>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <button style={styles.btnGhost} onClick={back}>Back</button>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button style={styles.btnGhost} onClick={goToMap} disabled={!canSave}>Pin on Map</button>
                      <button style={styles.btnDark} onClick={save} disabled={!canSave}>Save</button>
                    </div>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div style={styles.label}>Click map or drag marker</div>

                  <div style={styles.mapBox}>
                    <MapContainer
                      center={[coords?.lat || 15.9167, coords?.lng || 120.3333]}
                      zoom={coords ? 16 : 12}
                      minZoom={9}
                      maxZoom={18}
                      style={{ height: "100%", width: "100%" }}
                      attributionControl={false}
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

                      <FlyToCenter coords={coords} zoom={16} />
                      <ClickToMoveMarker onPick={(p) => { setCoords(p); setCoordsText(`${p.lat}, ${p.lng}`); }} />

                      {coords && (
                        <Marker
                          position={[coords.lat, coords.lng]}
                          draggable
                          eventHandlers={{
                            dragend: (e) => {
                              const p = e.target.getLatLng();
                              setCoords({ lat: p.lat, lng: p.lng });
                              setCoordsText(`${p.lat}, ${p.lng}`);
                            },
                          }}
                        />
                      )}
                    </MapContainer>
                  </div>

                  <div style={{ fontSize: 14, opacity: 0.8 }}>
                    <div><b>Selected:</b> {displayText}</div>
                    <div><b>Coordinates:</b> {coords ? `${coords.lat}, ${coords.lng}` : "—"}</div>
                    {!coords ? (
                      <div style={{ marginTop: 4, opacity: 0.85 }}>
                        * This barangay has no coords in JSON. Please click the map to set a pin.
                      </div>
                    ) : null}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <button style={styles.btnGhost} onClick={back}>Back</button>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button style={styles.btnGhost} onClick={useMyLocation}>Use My Location</button>
                      <button style={styles.btnDark} onClick={save} disabled={!canSave}>Save</button>
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

export default function STPromo() {
  const { user } = useAuth();

  const allowAdd = canAdd(user, "promo") || canAdd(user, "stPromo");
  const allowEdit = canEdit(user, "promo") || canEdit(user, "stPromo");
  const allowDelete = canDelete(user, "promo") || canDelete(user, "stPromo");
  const allowExport = canExport(user, "promo") || canExport(user, "stPromo");

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

  const [entries, setEntries] = useState([]);
  const [stPromoCustomFields, setStPromoCustomFields] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showViewId, setShowViewId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [municipalGeoJson, setMunicipalGeoJson] = useState(null);
  const [outlineGeoJson, setOutlineGeoJson] = useState(null);
  const [mapViewMode, setMapViewMode] = useState("municipality");
  const [addressFlowOpen, setAddressFlowOpen] = useState(false);

  const [filterView, setFilterView] = useState("OVERALL");
  const [filterMunicipality, setFilterMunicipality] = useState("ALL");
  const [filterDistrict, setFilterDistrict] = useState("ALL");
  const [filterMonth, setFilterMonth] = useState("ALL");
  const [filterYear, setFilterYear] = useState("ALL");
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [savingEntry, setSavingEntry] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [viewTab, setViewTab] = useState("LIST");

  // ✅ Search + Pagination
  const [tableSearch, setTableSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEntries, setTotalEntries] = useState(0);
  const ROWS_PER_PAGE = 10;
  const PAGE_NUMBER_WINDOW = 10;

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

  const loadEntries = useCallback(async () => {
    try {
      setLoadingEntries(true);
      const res = await axios.get(ST_PROMO_API, {
        params: {
          page: currentPage,
          limit: ROWS_PER_PAGE,
          search: tableSearch.trim(),
          year: filterYear,
          month: filterMonth,
          municipality: filterMunicipality,
          district: filterDistrict,
          entryMode: filterView,
        },
      });

      const payload = res.data || {};
      const rows = Array.isArray(payload?.data)
        ? payload.data
        : extractArrayResponse(payload);

      setEntries((rows || []).map((row) => {
        const normalizedPhotos = getStPromoPhotos(row);
        return {
          ...row,
          meansOfVerification: row.meansOfVerification || row.means_of_verification || "",
          staffName: row.staffName || row.nameOfStaff || row.staff_name || row.name_of_staff || "",
          nameOfStaff: row.nameOfStaff || row.staffName || row.name_of_staff || row.staff_name || "",
          photos: normalizedPhotos,
          movPhotos: normalizedPhotos,
          mov_photos: normalizedPhotos,
          customFields: parseStPromoCustomFields(row.customFields || row.custom_fields),
          custom_fields: parseStPromoCustomFields(row.custom_fields || row.customFields),
        };
      }));
      setTotalEntries(Number(payload?.total ?? rows.length ?? 0));
    } catch (e) {
      console.error("Failed to load S&T Promo entries", e);
      setEntries([]);
      setTotalEntries(0);
    } finally {
      setLoadingEntries(false);
    }
  }, [currentPage, tableSearch, filterYear, filterMonth, filterMunicipality, filterDistrict, filterView]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);
  useEffect(() => {
    let cancelled = false;

    const fixedKeys = new Set([
      "no",
      "actions",
      "entryMode",
      "entry_mode",
      "date",
      "projectTitle",
      "project_title",
      "activityType",
      "activity_type",
      "regional",
      "provincial",
      "cityMunicipality",
      "city_municipality",
      "male",
      "female",
      "totalParticipants",
      "total_participants",
      "peopleReached",
      "people_reached",
      "views",
      "reaction",
      "comment",
      "share",
      "totalEngagements",
      "total_engagements",
      "meansOfVerification",
      "means_of_verification",
      "address",
      "addressMeta",
      "address_meta",
      "municipality",
      "district",
      "barangay",
      "staffName",
      "staff_name",
      "nameOfStaff",
      "name_of_staff",
      "remarks"
    ]);

    async function loadStPromoCustomFields() {
      try {
        const res = await axios.get(`${API_BASE_URL}/table-management/config`);
        const modules = Array.isArray(res.data) ? res.data : [];

        const mod = modules.find((m) => {
          const name = String(m.moduleName || m.module_name || m.name || "").toLowerCase();
          return (
            name === "s&t promo" ||
            name === "s&t promotion" ||
            name === "st promo" ||
            name === "st promotion" ||
            name.includes("promo")
          );
        });

        const table =
          (mod?.tables || []).find((t) => {
            const name = String(t.tableName || t.table_name || t.name || "").toLowerCase();
            return name === "main" || name.includes("promo");
          }) || (mod?.tables || [])[0];

        const fields = Array.isArray(table?.fields || table?.formFields)
          ? table.fields || table.formFields
          : [];

        const customFields = fields
          .filter((f) => {
            const key = String(f.fieldKey || f.field_key || f.key || "").trim();
            const label = String(f.fieldLabel || f.field_label || f.label || "").trim();
            const visible = f.isVisible ?? f.is_visible ?? true;
            const showAdd = f.showAdd ?? f.show_add ?? true;
            const showEdit = f.showEdit ?? f.show_edit ?? true;
            const systemField = f.isSystemField ?? f.is_system_field ?? false;

            return key && label && visible && !systemField && (showAdd || showEdit) && !fixedKeys.has(key);
          })
          .sort(
            (a, b) =>
              Number(a.sortOrder ?? a.sort_order ?? 999) -
              Number(b.sortOrder ?? b.sort_order ?? 999)
          );

        const finalCustomFields = customFields.length
          ? customFields
          : [
            {
              fieldKey: "funding",
              fieldLabel: "Funding",
              fieldType: "Text",
              sortOrder: 999,
            },
          ];

        if (!cancelled) setStPromoCustomFields(finalCustomFields);
      } catch (err) {
        console.error("Failed to load S&T Promo custom fields:", err);
        if (!cancelled) {
          setStPromoCustomFields([
            {
              fieldKey: "funding",
              fieldLabel: "Funding",
              fieldType: "Text",
              sortOrder: 999,
            },
          ]);
        }
      }
    }

    loadStPromoCustomFields();

    return () => {
      cancelled = true;
    };
  }, []);


  useEffect(() => {
    let isMounted = true;

    async function loadMapFiles() {
      try {
        const [municipalRes, outlineRes] = await Promise.all([
          axios.get("/geo/pangasinan_municipalities.geojson"),
          axios.get("/geo/pangasinan_outline.geojson"),
        ]);

        if (!isMounted) return;
        setMunicipalGeoJson(municipalRes.data || null);
        setOutlineGeoJson(outlineRes.data || null);
      } catch (e) {
        if (!isMounted) return;
        setMunicipalGeoJson(null);
        setOutlineGeoJson(null);
      }
    }

    loadMapFiles();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setShowAdd(false);
        setAddressFlowOpen(false);
        setShowViewId(null);
        setPrintModal((p) => ({ ...p, open: false }));
        setExportModal((p) => ({ ...p, open: false }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const availableYears = useMemo(() => {
    const years = [];
    for (let y = 2050; y >= 1970; y -= 1) {
      years.push(y);
    }
    return years;
  }, []);

  const municipalityOptions = useMemo(() => {
    const fromEntries = entries.map((e) => e.municipality).filter(Boolean);
    return Array.from(new Set([...PANGASINAN_LGUS, ...fromEntries])).sort((a, b) => a.localeCompare(b));
  }, [entries]);

  // Backend na ang gumagawa ng search/filter/pagination.
  // entries = current page rows only.
  const filteredEntries = entries;

  const totalPages = Math.max(1, Math.ceil(totalEntries / ROWS_PER_PAGE));

  useEffect(() => {
    setCurrentPage(1);
  }, [tableSearch, filterYear, filterMonth, filterMunicipality, filterDistrict, filterView]);

  const paginatedEntries = entries;

  const tableStartNo = (currentPage - 1) * ROWS_PER_PAGE;
  const pageStartItem = totalEntries ? tableStartNo + 1 : 0;
  const pageEndItem = totalEntries ? Math.min(currentPage * ROWS_PER_PAGE, totalEntries) : 0;

  const pageWindowStart =
    Math.floor((currentPage - 1) / PAGE_NUMBER_WINDOW) * PAGE_NUMBER_WINDOW + 1;

  // Infinite-style pagination window:
  // Page buttons are always shown by 10s: 1-10, 11-20, 21-30, etc.
  // This keeps the DOST pagination layout consistent even if the current
  // backend result count is still small.
  const visiblePageNumbers = Array.from(
    { length: PAGE_NUMBER_WINDOW },
    (_, i) => pageWindowStart + i
  );

  // DOST pagination logo:
  // The black "o" moves based on the active page.
  // Page 1 = first o, Page 2 = second o, ... Page 10 = tenth o.
  // Page 11 returns to first o because the visible page window becomes 11-20.
  const paginationLogoOSlots = Array.from(
    { length: PAGE_NUMBER_WINDOW },
    (_, i) => i
  );

  const activeLogoIndex = (currentPage - pageWindowStart) % PAGE_NUMBER_WINDOW;

  const pinnedEntries = useMemo(() => {
    return paginatedEntries.filter(
      (e) =>
        e.entryMode === "ONSITE" &&
        Number.isFinite(e?.addressMeta?.lat) &&
        Number.isFinite(e?.addressMeta?.lng)
    );
  }, [paginatedEntries]);

  const viewEntry = useMemo(() => {
    if (!showViewId) return null;
    return entries.find((e) => e.id === showViewId) || null;
  }, [showViewId, entries]);

  useEffect(() => {
    if (showViewId) setViewTab("LIST");
  }, [showViewId]);

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

  const tableMode = filterView === "ONSITE" ? "ONSITE" : "ONLINE";

  const onlineLikeTotals = useMemo(() => {
    const list = filteredEntries;
    return {
      regional: list.reduce((s, e) => s + toNumber(e.regional), 0),
      provincial: list.reduce((s, e) => s + toNumber(e.provincial), 0),
      cityMunicipality: list.reduce((s, e) => s + toNumber(e.cityMunicipality), 0),
      totalActivities: list.reduce((s, e) => s + totalPromotionalActivities(e), 0),
      male: list.reduce((s, e) => s + toNumber(e.male), 0),
      female: list.reduce((s, e) => s + toNumber(e.female), 0),
      totalParticipants: list.reduce((s, e) => s + totalParticipants(e), 0),
      peopleReached: list.reduce((s, e) => s + toNumber(e.peopleReached), 0),
      views: list.reduce((s, e) => s + toNumber(e.views), 0),
      reaction: list.reduce((s, e) => s + toNumber(e.reaction), 0),
      comment: list.reduce((s, e) => s + toNumber(e.comment), 0),
      share: list.reduce((s, e) => s + toNumber(e.share), 0),
      totalEngagements: list.reduce((s, e) => s + totalEngagements(e), 0),
    };
  }, [filteredEntries]);

  const onsiteTotals = useMemo(() => {
    const list = filteredEntries.filter((e) => e.entryMode === "ONSITE");
    return {
      regional: list.reduce((s, e) => s + toNumber(e.regional), 0),
      provincial: list.reduce((s, e) => s + toNumber(e.provincial), 0),
      cityMunicipality: list.reduce((s, e) => s + toNumber(e.cityMunicipality), 0),
      totalActivities: list.reduce((s, e) => s + totalPromotionalActivities(e), 0),
      male: list.reduce((s, e) => s + toNumber(e.male), 0),
      female: list.reduce((s, e) => s + toNumber(e.female), 0),
      totalParticipants: list.reduce((s, e) => s + totalParticipants(e), 0),
    };
  }, [filteredEntries]);

  function resetForm() {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      date: new Date().toISOString().slice(0, 10),
      customFields: {},
    });
  }

  function openAddEntry() {
    if (!allowAdd) {
      alert("You do not have permission to add S&T Promo entries.");
      return;
    }

    resetForm();
    setShowAdd(true);
  }

  function openEditEntry(entry) {
    if (!allowEdit) {
      alert("You do not have permission to edit S&T Promo entries.");
      return;
    }

    setEditingId(entry.id);
    setForm({
      ...EMPTY_FORM,
      ...entry,
      date: entry.date || new Date().toISOString().slice(0, 10),
      totalParticipants: String(totalParticipants(entry) || ""),
      totalEngagements: String(totalEngagements(entry) || ""),
      meansOfVerification: entry.meansOfVerification || entry.means_of_verification || "",
      photos: getStPromoPhotos(entry),
      movPhotos: getStPromoPhotos(entry),
      customFields: parseStPromoCustomFields(entry.customFields || entry.custom_fields),
    });
    setShowAdd(true);
  }

  function updateForm(key, value) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };

      if (key === "male" || key === "female") {
        const male = key === "male" ? toNumber(value) : toNumber(next.male);
        const female = key === "female" ? toNumber(value) : toNumber(next.female);
        next.totalParticipants = String(male + female || "");
      }

      if (key === "reaction" || key === "comment" || key === "share") {
        const reaction = key === "reaction" ? toNumber(value) : toNumber(next.reaction);
        const comment = key === "comment" ? toNumber(value) : toNumber(next.comment);
        const share = key === "share" ? toNumber(value) : toNumber(next.share);
        next.totalEngagements = String(reaction + comment + share || "");
      }

      if (key === "entryMode" && value === "ONSITE") {
        next.peopleReached = "";
        next.views = "";
        next.reaction = "";
        next.comment = "";
        next.share = "";
        next.totalEngagements = "";
      }

      if (key === "entryMode" && value === "ONLINE") {
        next.address = "";
        next.addressMeta = null;
        next.municipality = "";
        next.district = "";
        next.barangay = "";
      }

      return next;
    });
  }


  function getStPromoCustomPairs(entry = {}) {
    const values = parseStPromoCustomFields(entry.customFields || entry.custom_fields);

    return (stPromoCustomFields || []).map((field) => {
      const key = field.fieldKey || field.field_key || field.key;
      const rawLabel = field.fieldLabel || field.field_label || field.label || key;
      const value = values?.[key];

      return {
        key,
        label: cleanStPromoCustomLabel(rawLabel),
        value: value === null || value === undefined || value === "" ? "—" : String(value),
      };
    });
  }

  function renderStPromoCustomInputs() {
    if (!stPromoCustomFields.length) return null;

    return (
      <>
        {stPromoCustomFields.map((field) => {
          const key = field.fieldKey || field.field_key || field.key;
          const rawLabel = field.fieldLabel || field.field_label || field.label || key;
          const label = cleanStPromoCustomLabel(rawLabel);
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
                <textarea style={styles.textarea} {...commonProps} />
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
  }

  function renderStPromoCustomViewFields(entry) {
    const pairs = getStPromoCustomPairs(entry);
    if (!pairs.length) return null;

    return pairs.map((item) => (
      <React.Fragment key={`stpromo-custom-view-${item.key}`}>
        <div style={styles.viewLabel}>{item.label}</div>
        <div style={styles.viewBox}>{item.value}</div>
      </React.Fragment>
    ));
  }
  function validateForm() {
    if (!form.entryMode) return alert("Required: Entry Type"), false;
    if (!form.date) return alert("Required: Date"), false;
    if (!form.projectTitle.trim()) return alert("Required: Project Title"), false;
    if (!form.activityType.trim()) return alert("Required: Type of Promotional Activity"), false;
    if (form.entryMode === "ONSITE" && !form.address.trim()) return alert("Required: Venue/Address"), false;
    if (!form.meansOfVerification.trim()) return alert("Required: Means of Verification"), false;
    return true;
  }

  async function saveEntry() {
    if (editingId && !allowEdit) {
      alert("You do not have permission to edit S&T Promo entries.");
      return;
    }

    if (!editingId && !allowAdd) {
      alert("You do not have permission to add S&T Promo entries.");
      return;
    }

    if (!validateForm()) return;

    const payload = {
      ...form,
      id: editingId || uid(),
      regional: toNumber(form.regional),
      provincial: toNumber(form.provincial),
      cityMunicipality: toNumber(form.cityMunicipality),
      male: toNumber(form.male),
      female: toNumber(form.female),
      totalParticipants: totalParticipants(form),
      peopleReached: form.entryMode === "ONLINE" ? toNumber(form.peopleReached) : 0,
      views: form.entryMode === "ONLINE" ? toNumber(form.views) : 0,
      reaction: form.entryMode === "ONLINE" ? toNumber(form.reaction) : 0,
      comment: form.entryMode === "ONLINE" ? toNumber(form.comment) : 0,
      share: form.entryMode === "ONLINE" ? toNumber(form.share) : 0,
      totalEngagements: form.entryMode === "ONLINE" ? totalEngagements(form) : 0,
      address: form.entryMode === "ONSITE" ? (form.address || "") : "",
      addressMeta: form.entryMode === "ONSITE" ? (form.addressMeta || null) : null,
      barangay: form.entryMode === "ONSITE" ? (form.barangay || "") : "",
      municipality:
        form.entryMode === "ONSITE"
          ? (
            form.municipality ||
            detectMunicipalityFromAddressText(form.address) ||
            form.addressMeta?.municipality ||
            ""
          )
          : "",
      district:
        form.entryMode === "ONSITE"
          ? (
            form.district ||
            getDistrictFromMunicipality(
              form.municipality ||
              detectMunicipalityFromAddressText(form.address) ||
              form.addressMeta?.municipality ||
              ""
            )
          )
          : "",
      staffName: (form.staffName || "").trim(),
      nameOfStaff: (form.staffName || "").trim(),
      meansOfVerification: (form.meansOfVerification || "").trim(),
      means_of_verification: (form.meansOfVerification || "").trim(),
      movPhotos: Array.isArray(form.movPhotos) ? form.movPhotos : [],
      mov_photos: Array.isArray(form.movPhotos) ? form.movPhotos : [],
      photos: Array.isArray(form.movPhotos) ? form.movPhotos : [],
      custom_fields: form.customFields || {},
      customFields: form.customFields || {},
    };

    try {
      setSavingEntry(true);

      if (editingId) {
        await axios.put(`${ST_PROMO_API}/${editingId}`, payload);
      } else {
        await axios.post(ST_PROMO_API, payload);
        setCurrentPage(1);
      }

      await loadEntries();
      setShowAdd(false);
      resetForm();
    } catch (e) {
      console.error("Failed to save S&T Promo entry", e);
      alert(getApiErrorMessage(e, "Failed to save S&T Promo entry."));
    } finally {
      setSavingEntry(false);
    }
  }

  async function deleteEntry(id) {
    if (!allowDelete) {
      alert("You do not have permission to delete S&T Promo entries.");
      return;
    }

    if (!(await requestDeleteConfirm("Delete this S&T Promo entry?"))) return;

    try {
      setDeletingId(id);
      await axios.delete(`${ST_PROMO_API}/${id}`);
      await loadEntries();
    } catch (e) {
      console.error("Failed to delete S&T Promo entry", e);
      alert(getApiErrorMessage(e, "Failed to delete S&T Promo entry."));
    } finally {
      setDeletingId(null);
    }
  }

  function applyAddressMetaToForm(meta) {
    const detectedMunicipality =
      meta?.municipality ||
      detectMunicipalityFromAddressText(meta?.displayText || meta?.manualText || "") ||
      "";

    setForm((prev) => ({
      ...prev,
      municipality: detectedMunicipality,
      district: getDistrictFromMunicipality(detectedMunicipality),
      barangay: meta?.barangay || "",
      address: meta?.displayText || "",
      addressMeta: meta || null,
    }));
  }

  function clearFilters() {
    setTableSearch("");
    setCurrentPage(1);
    setFilterView("OVERALL");
    setFilterMunicipality("ALL");
    setFilterDistrict("ALL");
    setFilterMonth("ALL");
    setFilterYear("ALL");
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

  function csvEscape(value) {
    const text = String(value ?? "");
    if (/[",\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  }

  function safeFilePart(value) {
    return String(value || "")
      .trim()
      .replace(/[^\w-]+/g, "_")
      .slice(0, 45);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getStaffName(entry) {
    return entry?.staffName || entry?.nameOfStaff || "";
  }

  function getEntryLabel(entry) {
    return entry?.projectTitle || entry?.activityType || entry?.date || "Record";
  }

  const EXPORT_HEADERS = [
    "NO",
    "ENTRY TYPE",
    "DATE",
    "PROJECT TITLE",
    "TYPE OF PROMOTIONAL ACTIVITY",
    "REGIONAL",
    "PROVINCIAL",
    "CITY/MUNICIPALITY",
    "TOTAL ACTIVITIES",
    "MALE",
    "FEMALE",
    "TOTAL PARTICIPANTS",
    "PEOPLE REACHED",
    "VIEWS",
    "REACTION",
    "COMMENT",
    "SHARE",
    "TOTAL ENGAGEMENTS",
    "VENUE/ADDRESS",
    "MUNICIPALITY",
    "DISTRICT",
    "BARANGAY",
    "LAT",
    "LNG",
    "MEANS OF VERIFICATION",
    "MOV PHOTO COUNT",
    "NAME OF STAFF",
    "REMARKS",
  ];

  function entryToExportRow(entry, index) {
    return [
      index + 1,
      entry?.entryMode === "ONSITE" ? "Onsite" : "Online",
      entry?.date || "",
      entry?.projectTitle || "",
      entry?.activityType || "",
      toNumber(entry?.regional),
      toNumber(entry?.provincial),
      toNumber(entry?.cityMunicipality),
      totalPromotionalActivities(entry),
      toNumber(entry?.male),
      toNumber(entry?.female),
      totalParticipants(entry),
      toNumber(entry?.peopleReached),
      toNumber(entry?.views),
      toNumber(entry?.reaction),
      toNumber(entry?.comment),
      toNumber(entry?.share),
      totalEngagements(entry),
      entry?.address || "",
      entry?.municipality || entry?.addressMeta?.municipality || "",
      entry?.district || "",
      entry?.barangay || entry?.addressMeta?.barangay || "",
      Number.isFinite(entry?.addressMeta?.lat) ? entry.addressMeta.lat : "",
      Number.isFinite(entry?.addressMeta?.lng) ? entry.addressMeta.lng : "",
      entry?.meansOfVerification || "",
      getStPromoPhotos(entry).length,
      getStaffName(entry),
      entry?.remarks || "",
    ];
  }

  function exportEntriesCSV(rows, filename = "ST_Promo.csv") {
    const lines = [
      EXPORT_HEADERS.join(","),
      ...(rows || []).map((entry, index) => entryToExportRow(entry, index).map(csvEscape).join(",")),
    ];
    downloadBlob(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" }), filename.endsWith(".csv") ? filename : `${filename}.csv`);
  }

  function exportEntriesExcel(rows, filename = "ST_Promo.xlsx") {
    const data = (rows || []).map((entry, index) => {
      const values = entryToExportRow(entry, index);
      return EXPORT_HEADERS.reduce((obj, header, i) => {
        obj[header] = values[i];
        return obj;
      }, {});
    });
    const ws = XLSX.utils.json_to_sheet(data.length ? data : [EXPORT_HEADERS.reduce((obj, header) => ({ ...obj, [header]: "" }), {})], { skipHeader: false });
    if (!data.length) XLSX.utils.sheet_add_aoa(ws, [EXPORT_HEADERS], { origin: "A1" });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ST Promo");
    const arr = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    downloadBlob(new Blob([arr], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`);
  }

  async function exportEntriesPDF(rows, options = {}) {
    const {
      template = "TABLE",
      preset = "a4",
      orientation = "landscape",
      customSize = { width: 8.5, height: 13 },
      filename = "ST_Promo.pdf",
      titleLabel = "S&T Promo Export",
    } = options;

    const mmFromIn = (inch) => Number(inch) * 25.4;
    let format = "a4";
    if (preset === "letter") format = "letter";
    else if (preset === "legal") format = "legal";
    else if (preset === "custom") {
      const w = Number(customSize?.width) || 8.5;
      const h = Number(customSize?.height) || 13;
      format = [mmFromIn(w), mmFromIn(h)];
    }

    const doc = new jsPDF({
      orientation: orientation === "portrait" ? "p" : "l",
      unit: "mm",
      format,
    });

    const outName = String(filename || "ST_Promo.pdf").toLowerCase().endsWith(".pdf") ? filename : `${filename}.pdf`;
    const rowsToUse = Array.isArray(rows) ? rows : [];
    const hasMany = rowsToUse.length > 1;

    if (hasMany || template === "TABLE") {
      doc.setFontSize(14);
      doc.text(String(titleLabel || "S&T Promo Export"), 10, 12);
      doc.setFontSize(9);
      doc.text(`Rows: ${rowsToUse.length}`, 10, 18);
      autoTable(doc, {
        head: [EXPORT_HEADERS],
        body: rowsToUse.map((entry, index) => entryToExportRow(entry, index)),
        startY: 22,
        styles: { fontSize: 6.2, cellPadding: 1.2, overflow: "linebreak" },
        headStyles: { fontSize: 6.2 },
      });
    } else {
      const entry = rowsToUse[0];
      if (!entry) {
        doc.setFontSize(14);
        doc.text("S&T Promo Export Template", 10, 12);
        autoTable(doc, { head: [["Field", "Value"]], body: EXPORT_HEADERS.slice(1).map((h) => [h, ""]), startY: 20 });
      } else {
        const pairs = [
          ["Entry Type", entry.entryMode === "ONSITE" ? "Onsite" : "Online"],
          ["Date", entry.date || "—"],
          ["Project Title", entry.projectTitle || "—"],
          ["Promotional Activity", entry.activityType || "—"],
          ["Total Promotional Activities", totalPromotionalActivities(entry)],
          ["Total Participants", totalParticipants(entry)],
          ["People Reached", toNumber(entry.peopleReached)],
          ["Views", toNumber(entry.views)],
          ["Total Engagements", totalEngagements(entry)],
          ["Venue/Address", entry.address || "—"],
          ["Municipality", entry.municipality || entry.addressMeta?.municipality || "—"],
          ["District", entry.district || "—"],
          ["Coordinates", Number.isFinite(entry?.addressMeta?.lat) && Number.isFinite(entry?.addressMeta?.lng) ? `${entry.addressMeta.lat}, ${entry.addressMeta.lng}` : "—"],
          ["Means of Verification", entry.meansOfVerification || "—"],
          ["Name of Staff", getStaffName(entry) || "—"],
          ["Remarks", entry.remarks || "—"],
        ];
        doc.setFontSize(14);
        doc.text(`${titleLabel || "S&T Promo Record"}`, 10, 12);
        autoTable(doc, {
          head: [["Field", "Value"]],
          body: pairs,
          startY: 20,
          styles: { fontSize: 9, cellPadding: 2, overflow: "linebreak" },
          columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: "auto" } },
        });
      }
    }

    doc.save(outName);
  }

  async function exportEntriesDOCX(rows, options = {}) {
    const { filename = "ST_Promo.docx", orientation = "landscape" } = options;
    const rowsToUse = Array.isArray(rows) ? rows : [];
    const children = [
      new Paragraph({ children: [new TextRun({ text: "S&T Promo Export", bold: true, size: 32 })] }),
      new Paragraph({ text: `Rows: ${rowsToUse.length}` }),
      new Paragraph({ text: "" }),
    ];

    const makeKvTable = (pairs) => new DocxTable({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: pairs.map(([k, v]) => new TableRow({
        children: [
          new TableCell({ width: { size: 35, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: String(k), bold: true })] })] }),
          new TableCell({ width: { size: 65, type: WidthType.PERCENTAGE }, children: [new Paragraph(String(v ?? "—"))] }),
        ],
      })),
    });

    if (!rowsToUse.length) {
      children.push(makeKvTable(EXPORT_HEADERS.slice(1).map((h) => [h, ""])));
    } else {
      rowsToUse.forEach((entry, idx) => {
        if (idx > 0) children.push(new Paragraph({ pageBreakBefore: true }));
        children.push(new Paragraph({ children: [new TextRun({ text: `Record ${idx + 1}`, bold: true, size: 26 })] }));
        children.push(new Paragraph({ text: "" }));
        children.push(makeKvTable([
          ["Entry Type", entry.entryMode === "ONSITE" ? "Onsite" : "Online"],
          ["Date", entry.date || "—"],
          ["Project Title", entry.projectTitle || "—"],
          ["Promotional Activity", entry.activityType || "—"],
          ["Total Activities", totalPromotionalActivities(entry)],
          ["Total Participants", totalParticipants(entry)],
          ["Total Engagements", totalEngagements(entry)],
          ["Venue/Address", entry.address || "—"],
          ["Means of Verification", entry.meansOfVerification || "—"],
          ["Name of Staff", getStaffName(entry) || "—"],
          ["Remarks", entry.remarks || "—"],
        ]));
      });
    }

    const doc = new Document({
      sections: [{
        properties: { page: { size: { orientation: orientation === "portrait" ? PageOrientation.PORTRAIT : PageOrientation.LANDSCAPE } } },
        children,
      }],
    });
    const blob = await Packer.toBlob(doc);
    downloadBlob(blob, filename.endsWith(".docx") ? filename : `${filename}.docx`);
  }

  const PRINT_LAYOUT_LABEL = {
    FORM: "Form-Based Record Sheet",
    TABLE: "Table Sheet",
    COMPACT: "Compact Sheet",
  };

  function getPageRule(preset, orientation, custom) {
    const ori = orientation === "portrait" ? "portrait" : "landscape";
    if (preset === "a4") return `@page { size: A4 ${ori}; margin: 10mm; }`;
    if (preset === "letter") return `@page { size: Letter ${ori}; margin: 10mm; }`;
    if (preset === "legal") return `@page { size: Legal ${ori}; margin: 10mm; }`;
    if (preset === "custom" && custom?.width && custom?.height) {
      const w = Number(custom.width);
      const h = Number(custom.height);
      if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) return `@page { size: ${w}in ${h}in; margin: 10mm; }`;
    }
    return `@page { size: A4 ${ori}; margin: 10mm; }`;
  }

  function buildRecordSheetInner(entry, layoutKey, titleLabel) {
    const coords = Number.isFinite(entry?.addressMeta?.lat) && Number.isFinite(entry?.addressMeta?.lng)
      ? `${entry.addressMeta.lat}, ${entry.addressMeta.lng}`
      : "—";
    const pairs = [
      ["Entry Type", entry?.entryMode === "ONSITE" ? "Onsite" : "Online"],
      ["Date", entry?.date || "—"],
      ["Project Title", entry?.projectTitle || "—"],
      ["Type of Promotional Activity", entry?.activityType || "—"],
      ["Regional", toNumber(entry?.regional)],
      ["Provincial", toNumber(entry?.provincial)],
      ["City/Municipality", toNumber(entry?.cityMunicipality)],
      ["Total Promotional Activities", totalPromotionalActivities(entry)],
      ["Male", toNumber(entry?.male)],
      ["Female", toNumber(entry?.female)],
      ["Total Participants", totalParticipants(entry)],
      ["People Reached", toNumber(entry?.peopleReached)],
      ["Views", toNumber(entry?.views)],
      ["Reaction", toNumber(entry?.reaction)],
      ["Comment", toNumber(entry?.comment)],
      ["Share", toNumber(entry?.share)],
      ["Total Engagements", totalEngagements(entry)],
      ["Venue/Address", entry?.address || "—"],
      ["Coordinates", coords],
      ["Means of Verification", entry?.meansOfVerification || "—"],
      ["Name of Staff", getStaffName(entry) || "—"],
      ["Remarks", entry?.remarks || "—"],
    ];

    const header = `
      <div class="header">
        <div>
          <h1>S&amp;T Promo Record</h1>
          <div class="sub">${escapeHtml(PRINT_LAYOUT_LABEL[layoutKey] || "Print")}</div>
        </div>
        <div class="sub">${escapeHtml(titleLabel || "")}</div>
      </div>
    `;

    const formLayout = `<div class="grid">${pairs.map(([k, v]) => `<div class="field ${String(k).length > 22 || String(v).length > 35 ? "full" : ""}"><div class="label">${escapeHtml(k)}</div><div class="value">${escapeHtml(v)}</div></div>`).join("")}</div>`;
    const tableLayout = `<table class="kvTable"><tbody>${pairs.map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`).join("")}</tbody></table>`;
    const compactLayout = `<div class="compact">${pairs.map(([k, v]) => `<div><b>${escapeHtml(k)}:</b> ${escapeHtml(v)}</div>`).join("")}</div>`;
    const bodyHtml = layoutKey === "FORM" ? formLayout : layoutKey === "TABLE" ? tableLayout : compactLayout;

    return `<div class="sheet">${header}<div class="body">${bodyHtml}<div class="footer-note">Generated from S&amp;T Promotion page</div></div></div>`;
  }

  function buildPrintDocument(recordsToPrint, options) {
    const { preset, orientation, customSize, layoutKey, titleLabel } = options;
    const pageRule = getPageRule(preset, orientation, customSize);
    const rowsToUse = Array.isArray(recordsToPrint) ? recordsToPrint : [];
    const sheets = rowsToUse.map((r, idx) => `${buildRecordSheetInner(r, layoutKey, titleLabel || "")}${idx === rowsToUse.length - 1 ? "" : `<div class="pageBreak"></div>`}`).join("");

    return `<!DOCTYPE html><html><head><meta charset="utf-8" /><title>S&amp;T Promo Print</title><style>
      ${pageRule}
      *{box-sizing:border-box} html,body{margin:0;padding:0} body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;padding:12px;-webkit-print-color-adjust:exact;print-color-adjust:exact}.pageBreak{page-break-after:always}.sheet{width:100%;border:2px solid #334155;border-radius:10px;overflow:hidden}.header{background:#0b4ea2;color:white;padding:14px 16px;display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.header h1{margin:0;font-size:20px;line-height:1.2}.header .sub{margin-top:4px;font-size:12px;opacity:.95;font-weight:bold}.body{padding:14px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:14px}.field{border:1px solid #cbd5e1;border-radius:8px;padding:10px;min-height:58px}.field.full{grid-column:1/-1}.label{font-size:11px;font-weight:700;color:#334155;margin-bottom:6px;text-transform:uppercase;letter-spacing:.04em}.value{font-size:13px;font-weight:600;white-space:pre-wrap;word-break:break-word}.kvTable{width:100%;border-collapse:collapse}.kvTable th,.kvTable td{border:1px solid #cbd5e1;padding:8px 10px;font-size:12px;vertical-align:top}.kvTable th{background:#eef2f6;text-align:left;width:190px;font-weight:900}.compact{display:grid;gap:6px;font-size:12px;font-weight:600}.compact b{font-weight:900}.footer-note{margin-top:12px;font-size:11px;color:#64748b;text-align:right;font-weight:700}@media print{.no-print{display:none!important}body{padding:0}.sheet{border-radius:0}}
    </style></head><body><script>window.addEventListener('load',function(){setTimeout(function(){try{window.print();}catch(e){}},250);});</script><div class="no-print" style="margin:0 0 10px;padding:10px 12px;border:1px solid #cbd5e1;border-radius:10px;background:#f8fafc;font-weight:800;font-size:12px;">Tip: If the Print dialog did not open automatically, press <b>Ctrl+P</b>.</div>${sheets || `<div class="sheet"><div class="header"><h1>S&amp;T Promo Print Template</h1></div><div class="body"><div class="compact">No records selected.</div></div></div>`}</body></html>`;
  }

  function doPrint(rows, options) {
    const win = window.open("", "_blank", "width=1200,height=900");
    if (!win) return alert("Popup blocked. Please allow popups for printing.");
    win.document.open();
    win.document.write(buildPrintDocument(rows, options));
    win.document.close();
    win.focus();
  }

  async function fetchAllFilteredRowsForOutput() {
    if (!totalEntries) return [];
    try {
      const res = await axios.get(ST_PROMO_API, {
        params: {
          page: 1,
          limit: Math.max(totalEntries, ROWS_PER_PAGE),
          search: tableSearch.trim(),
          year: filterYear,
          month: filterMonth,
          municipality: filterMunicipality,
          district: filterDistrict,
          entryMode: filterView,
        },
      });
      const payload = res.data || {};
      const rows = Array.isArray(payload?.data) ? payload.data : extractArrayResponse(payload);
      return Array.isArray(rows) ? rows : [];
    } catch (e) {
      console.error("Failed to load rows for export/print", e);
      return filteredEntries;
    }
  }

  function openPrintPopupRow(entryId) {
    if (!allowExport) {
      alert("You do not have permission to print S&T Promo entries.");
      return;
    }

    setPrintModal((p) => ({ ...p, open: true, scope: "row", entryId, layout: "FORM", preset: "a4", orientation: "landscape" }));
  }

  function openPrintPopupBulk() {
    if (!allowExport) {
      alert("You do not have permission to print S&T Promo entries.");
      return;
    }

    setPrintModal((p) => ({ ...p, open: true, scope: "bulk", entryId: null, layout: "FORM", preset: "a4", orientation: "landscape" }));
  }

  function openExportPopupRow(entryId) {
    if (!allowExport) {
      alert("You do not have permission to export S&T Promo entries.");
      return;
    }

    setExportModal({ open: true, scope: "row", entryId, format: "excel", template: "TABLE", preset: "a4", orientation: "landscape", customSize: { width: 8.5, height: 13 } });
  }

  function openExportPopupBulk() {
    if (!allowExport) {
      alert("You do not have permission to export S&T Promo entries.");
      return;
    }

    setExportModal({ open: true, scope: "bulk", entryId: null, format: "excel", template: "TABLE", preset: "a4", orientation: "landscape", customSize: { width: 8.5, height: 13 } });
  }

  async function getRowsForPrintExport(scope, entryId) {
    if (scope === "row") return [entries.find((e) => e.id === entryId)].filter(Boolean);
    return fetchAllFilteredRowsForOutput();
  }

  async function confirmPrint() {
    if (!allowExport) {
      alert("You do not have permission to print S&T Promo entries.");
      return;
    }

    const rows = await getRowsForPrintExport(printModal.scope, printModal.entryId);
    const titleLabel = printModal.scope === "row"
      ? `${PRINT_LAYOUT_LABEL[printModal.layout] || "Print"} — ${getEntryLabel(rows[0])}`
      : `${PRINT_LAYOUT_LABEL[printModal.layout] || "Print"} — Filtered (${rows.length} records)`;
    doPrint(rows, { layoutKey: printModal.layout, preset: printModal.preset, orientation: printModal.orientation, customSize: printModal.customSize, titleLabel });
    setPrintModal((p) => ({ ...p, open: false }));
  }

  async function confirmExport() {
    if (!allowExport) {
      alert("You do not have permission to export S&T Promo entries.");
      return;
    }

    const rows = await getRowsForPrintExport(exportModal.scope, exportModal.entryId);
    const baseName = exportModal.scope === "row"
      ? `STPromo_${safeFilePart(getEntryLabel(rows[0]))}_${safeFilePart(rows[0]?.date)}`
      : `STPromo_Filtered_${rows.length}_records`;

    if (exportModal.format === "csv") exportEntriesCSV(rows, `${baseName}.csv`);
    else if (exportModal.format === "excel") exportEntriesExcel(rows, `${baseName}.xlsx`);
    else if (exportModal.format === "pdf") await exportEntriesPDF(rows, { template: exportModal.template, preset: exportModal.preset, orientation: exportModal.orientation, customSize: exportModal.customSize, titleLabel: exportModal.scope === "row" ? `Export PDF — ${getEntryLabel(rows[0])}` : `Export PDF — Filtered (${rows.length})`, filename: `${baseName}.pdf` });
    else if (exportModal.format === "docx") await exportEntriesDOCX(rows, { orientation: exportModal.orientation, filename: `${baseName}.docx` });

    setExportModal((p) => ({ ...p, open: false }));
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
  }

  const styles = {
    page: {
      padding: 10,
      position: "relative",
      fontFamily,
      background: "#f5f6fa",
      minHeight: "100vh",
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
    actionBar: {
      position: "sticky",
      top: 0,
      zIndex: 999,
      background: "#f5f6fa",
      paddingTop: 8,
      paddingBottom: 8,
    },
    sectionTitleRow: {
      marginTop: 14,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      flexWrap: "wrap",
      fontFamily,
    },
    toolbarInlineRow: {
      display: "flex",
      gap: 6,
      flexWrap: "nowrap",
      alignItems: "center",
      justifyContent: "flex-end",
      overflowX: "auto",
      position: "relative",
      zIndex: 1000,
      paddingBottom: 2,
    },
    sectionTitle: {
      fontWeight: 800,
      fontSize: 13,
      color: "#0f172a",
      fontFamily,
      whiteSpace: "nowrap",
      flex: "0 0 auto",
    },
    addBtn: {
      border: "1px solid rgba(15, 23, 42, 0.18)",
      background: "#fff",
      padding: "6px 10px",
      borderRadius: 8,
      cursor: "pointer",
      fontWeight: 800,
      fontSize: 11,
      fontFamily,
      boxShadow: "0 2px 0 rgba(2,6,23,0.06)",
      whiteSpace: "nowrap",
      height: 30,
      flex: "0 0 auto",
    },
    pillBtn: {
      border: "1px solid #d1d5db",
      background: "#fff",
      padding: "0 10px",
      height: 30,
      minWidth: 72,
      borderRadius: 6,
      cursor: "pointer",
      fontWeight: "bold",
      fontSize: 13,
      lineHeight: 1,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily,
      whiteSpace: "nowrap",
      boxShadow: "0 1px 0 rgba(2,6,23,0.03)",
    },
    tinyBtn: {
      border: "1px solid #bfc7d1",
      background: "#ffffff",
      color: "#111827",
      padding: "0 10px",
      height: 24,
      minWidth: 46,
      borderRadius: "999px",
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 14,
      lineHeight: 1,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily,
      whiteSpace: "nowrap",
      boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.06)",
    },
    dangerTiny: {
      border: "1px solid #ef4444",
      background: "#ffffff",
      color: "#ef4444",
      padding: "0 10px",
      height: 24,
      minWidth: 52,
      borderRadius: "999px",
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 14,
      lineHeight: 1,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily,
      whiteSpace: "nowrap",
      boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.04)",
    },
    actionCell: {
      border: "1px solid #7c8a99",
      padding: "5px 6px",
      fontSize: 10.5,
      textAlign: "center",
      fontFamily,
      verticalAlign: "middle",
      background: "#fff",
      whiteSpace: "nowrap",
    },
    actionWrap: {
      display: "inline-flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      width: "100%",
    },
    actionRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      flexWrap: "nowrap",
      width: "100%",
    },
    selectSm: {
      padding: "6px 9px",
      borderRadius: 8,
      border: "1px solid #cbd5e1",
      background: "#fff",
      fontWeight: 900,
      fontFamily,
      fontSize: 11,
      minWidth: 108,
      height: 30,
      flex: "0 0 auto",
    },
    toolbarSearch: {
      height: 30,
      width: 240,
      minWidth: 240,
      padding: "0 10px",
      borderRadius: 8,
      border: "1px solid #cbd5e1",
      background: "#fff",
      fontWeight: 800,
      fontFamily,
      fontSize: 11,
      outline: "none",
      flex: "0 0 auto",
    },
    dostPaginationWrap: {
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
    },
    dostWordmark: {
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
    dostBlueLetter: {
      display: "inline-block",
      color: "#1ba4df",
      fontWeight: 900,
      fontSize: 34,
      lineHeight: 1,
      letterSpacing: 0,
      fontFamily,
    },
    dostOTrack: {
      position: "relative",
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-start",
    },
    dostO: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      width: 20,
      color: "#1ba4df",
      fontWeight: 900,
      fontSize: 34,
      lineHeight: 1,
      fontFamily,
    },
    dostMovingO: (index = 0) => ({
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
      transform: `translateX(${index * 20}px)`,
      transition: "transform 220ms ease-in-out",
    }),
    dostPaginationRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 14,
      flexWrap: "wrap",
      width: "100%",
      lineHeight: 1,
      marginTop: 0,
    },
    dostPageNumbers: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 14,
      flexWrap: "wrap",
      width: "auto",
      lineHeight: 1,
    },
    dostNavBtn: (disabled = false) => ({
      border: "none",
      background: "transparent",
      color: disabled ? "#94a3b8" : "#2563eb",
      padding: 0,
      cursor: disabled ? "not-allowed" : "pointer",
      fontWeight: 700,
      fontSize: 14,
      fontFamily,
      lineHeight: 1,
      whiteSpace: "nowrap",
    }),
    // Same pagination number style as Packaging & Labeling:
    // inactive numbers = normal black, active/current page = blue
    dostPageBtn: (active = false) => ({
      border: "none",
      background: "transparent",
      color: active ? "#2563eb" : "#111827",
      padding: 0,
      minWidth: 18,
      cursor: "pointer",
      fontWeight: active ? 800 : 500,
      fontSize: 14,
      fontFamily,
      lineHeight: 1,
      textAlign: "center",
    }),
    dostPaginationInfo: {
      marginTop: 7,
      fontSize: 10,
      fontWeight: 700,
      color: "#64748b",
      textAlign: "center",
    },
    field: {
      display: "flex",
      flexDirection: "column",
      gap: 6,
      minWidth: 110,
    },
    label: {
      fontSize: 14,
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
    mapSub: { fontSize: 14, opacity: 0.8, fontWeight: 700 },
    mapWrapLarge: {
      height: 460,
      width: "100%",
      background: "linear-gradient(135deg, #e0f2fe 0%, #dbeafe 40%, #f0f9ff 100%)",
    },
    filterRow: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 8 },
    filterLabel: { fontSize: 14, fontWeight: 900, opacity: 0.8 },
    select: {
      padding: "8px 10px",
      borderRadius: 10,
      border: "1px solid #cbd5e1",
      background: "#fff",
      fontWeight: 800,
      fontFamily,
      fontSize: 14,
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
    modalBackdrop: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.42)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      zIndex: 1500,
    },
    modal: {
      width: "min(1020px, 100%)",
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
      gap: 14,
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
      padding: "0 10px",
      height: 30,
      minWidth: 72,
      borderRadius: 6,
      fontSize: 13,
      fontWeight: "bold",
      lineHeight: 1,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      fontFamily,
      whiteSpace: "nowrap",
    },
    btnGhost: {
      border: "1px solid #cbd5e1",
      background: "#fff",
      color: "#111827",
      padding: "0 10px",
      height: 30,
      minWidth: 72,
      borderRadius: 6,
      cursor: "pointer",
      fontWeight: "bold",
      fontSize: 13,
      lineHeight: 1,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily,
      whiteSpace: "nowrap",
    },
    mono: {
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    },
    flowShell: {
      width: "min(620px, 100%)",
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
      padding: "0 10px",
      height: 30,
      minWidth: 72,
      borderRadius: 6,
      border: active ? "1px solid #0b4ea2" : "1px solid #cbd5e1",
      background: active ? "#dbeafe" : "white",
      cursor: "pointer",
      fontWeight: "bold",
      fontSize: 13,
      lineHeight: 1,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
    }),
    mapBox: { height: 340, borderRadius: 12, overflow: "hidden", border: "1px solid #e2e8f0" },
    warn: {
      marginTop: 8,
      background: "#fff7ed",
      border: "1px solid #fdba74",
      padding: "10px 12px",
      borderRadius: 10,
      fontSize: 14,
      color: "#7c2d12",
      fontWeight: 800,
    },
    viewTabsRow: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      marginBottom: 12,
    },
    viewTabBtn: (active) => ({
      border: active ? "1px solid #0b4ea2" : "1px solid #cbd5e1",
      background: active ? "#eaf2ff" : "#fff",
      color: "#111827",
      padding: "4px 10px",
      minHeight: 28,
      borderRadius: 9999,
      cursor: "pointer",
      fontWeight: 800,
      fontSize: 14,
      fontFamily,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      whiteSpace: "nowrap",
    }),
    viewSectionTitle: {
      fontWeight: 900,
      fontSize: 34,
      color: "#0f172a",
      marginBottom: 10,
      lineHeight: 1.1,
      fontFamily,
    },
    viewInfoGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr 1fr",
      gap: 18,
      marginBottom: 12,
    },
    viewStack: {
      display: "grid",
      gap: 8,
      alignContent: "start",
    },
    viewLabel: {
      fontSize: 14,
      fontWeight: 900,
      color: "#0f172a",
      marginBottom: 2,
      fontFamily,
    },
    viewValue: {
      fontSize: 14,
      fontWeight: 700,
      color: "#111827",
      fontFamily,
      wordBreak: "break-word",
    },
    viewBox: {
      border: "1px solid #94a3b8",
      background: "#f8fafc",
      borderRadius: 4,
      padding: "10px 12px",
      fontSize: 14,
      fontWeight: 700,
      color: "#111827",
      fontFamily,
      wordBreak: "break-word",
    },
    viewMiniActions: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      marginTop: 8,
      marginBottom: 6,
    },
    viewBottomActions: {
      display: "flex",
      justifyContent: "flex-end",
      gap: 10,
      marginTop: 16,
    },
  };


  function PopupModal({ open, title, children, onClose, zIndex = 3600 }) {
    if (!open) return null;
    return (
      <div style={{ ...styles.modalBackdrop, zIndex }} onClick={onClose}>
        <div style={{ ...styles.modal, position: "relative", zIndex: zIndex + 1, width: "min(720px, 100%)" }} onClick={(e) => e.stopPropagation()}>
          <div style={styles.modalHeader}>
            <div>{title}</div>
            <button type="button" style={styles.closeX} onClick={onClose}>✕</button>
          </div>
          <div style={styles.modalBody}>{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.titleBar}>S&amp;T PROMOTION</div>

      <div style={styles.mapCard}>
        <div style={styles.mapHeader}>
          <div>
            <div style={styles.mapTitle}>PANGASINAN MAP — S&amp;T PROMO PINS</div>
            <div style={styles.mapSub}>
              Pins shown: <b>{pinnedEntries.length}</b> / {paginatedEntries.length}
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

              <button type="button" style={styles.pillBtn} onClick={() => {
                setFilterMunicipality("ALL");
                setFilterDistrict("ALL");
              }}>
                Clear
              </button>
            </div>
          </div>
        </div>

        <div style={styles.mapWrapLarge}>
          <MapContainer
            center={DEFAULT_CENTER}
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
                  <div style={{ minWidth: 240, fontSize: 12 }}>
                    <div><b>Project Title:</b> {e.projectTitle || "—"}</div>
                    <div><b>Date:</b> {e.date || "—"}</div>
                    <div><b>Type:</b> {e.activityType || "—"}</div>
                    <div><b>Mode:</b> {e.entryMode === "ONSITE" ? "Onsite" : "Online"}</div>
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
              S&amp;T PROMO TABLE
              <span style={{ marginLeft: 10, fontSize: 12, opacity: 0.75 }}>
                Showing <b>{pageStartItem}  of  {pageEndItem}</b> / {totalEntries}
              </span>
            </div>

            <div style={styles.toolbarInlineRow}>
              <input
                style={styles.toolbarSearch}
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                placeholder="Search project / activity / MOV..."
              />

              <select
                style={styles.selectSm}
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
              >
                <option value="ALL">All Years</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              <select style={styles.selectSm} value={filterDistrict} onChange={(e) => setFilterDistrict(e.target.value)}>
                <option value="ALL">All Districts</option>
                {PANGASINAN_DISTRICTS.map((d) => (
                  <option key={d.id} value={d.id}>{d.id}</option>
                ))}
              </select>

              <select
                style={styles.selectSm}
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value === "ALL" ? "ALL" : Number(e.target.value))}
              >
                <option value="ALL">All Months</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>{m}</option>
                ))}
              </select>

              <select style={styles.selectSm} value={filterMunicipality} onChange={(e) => setFilterMunicipality(e.target.value)}>
                <option value="ALL">All Municipalities</option>
                {municipalityOptions.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              <select style={styles.selectSm} value={filterView} onChange={(e) => setFilterView(e.target.value)}>
                <option value="OVERALL">Overall</option>
                <option value="ONLINE">Online</option>
                <option value="ONSITE">Onsite</option>
              </select>

              <button type="button" style={styles.addBtn} onClick={clearFilters}>Clear Filters</button>
              {allowExport && (
                <button type="button" style={styles.addBtn} onClick={openExportPopupBulk}>Export</button>
              )}
              {allowExport && (
                <button type="button" style={{ ...styles.addBtn, background: "#0b5ed7", borderColor: "#0b5ed7", color: "#fff" }} onClick={openPrintPopupBulk}>Print</button>
              )}
              {allowAdd && (
                <button type="button" style={styles.addBtn} onClick={openAddEntry}>+ Add Entry</button>
              )}
            </div>
          </div>
        </div>

        <div style={styles.tableWrap}>
          {tableMode === "ONSITE" ? (
            <table style={{ ...styles.table, minWidth: 1500 }}>
              <thead>
                <tr>
                  <th style={styles.th} rowSpan={2}>NO.</th>
                  <th style={styles.th} rowSpan={2}>DATE</th>
                  <th style={styles.th} rowSpan={2}>PROJECT TITLE</th>
                  <th style={styles.th} rowSpan={2}>TYPE OF PROMOTIONAL ACTIVITY</th>
                  <th style={styles.th} colSpan={4}>NO. OF PROMOTIONAL ACTIVITIES</th>
                  <th style={styles.th} colSpan={3}>NO. OF PARTICIPANTS</th>
                  <th style={styles.th} rowSpan={2}>MEANS OF VERIFICATION</th>
                  <th style={styles.th} rowSpan={2}>ACTIONS</th>
                </tr>
                <tr>
                  <th style={styles.th}>REGIONAL</th>
                  <th style={styles.th}>PROVINCIAL</th>
                  <th style={styles.th}>CITY/MUNICIPALITY</th>
                  <th style={styles.th}>TOTAL</th>
                  <th style={styles.th}>MALE</th>
                  <th style={styles.th}>FEMALE</th>
                  <th style={styles.th}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {loadingEntries ? (
                  <tr>
                    <td colSpan={13} style={styles.tdCenter}>Loading S&amp;T Promo entries...</td>
                  </tr>
                ) : !paginatedEntries.length ? (
                  <tr>
                    <td colSpan={13} style={styles.tdCenter}>No entries found.</td>
                  </tr>
                ) : (
                  paginatedEntries.map((e, idx) => (
                    <tr key={e.id}>
                      <td style={styles.tdCenter}>{tableStartNo + idx + 1}</td>
                      <td style={styles.tdCenter}>{e.date || "—"}</td>
                      <td style={styles.td}>{e.projectTitle || "—"}</td>
                      <td style={styles.td}>{e.activityType || "—"}</td>
                      <td style={styles.tdCenter}>{toNumber(e.regional)}</td>
                      <td style={styles.tdCenter}>{toNumber(e.provincial)}</td>
                      <td style={styles.tdCenter}>{toNumber(e.cityMunicipality)}</td>
                      <td style={styles.tdCenter}>{totalPromotionalActivities(e)}</td>
                      <td style={styles.tdCenter}>{toNumber(e.male)}</td>
                      <td style={styles.tdCenter}>{toNumber(e.female)}</td>
                      <td style={styles.tdCenter}>{totalParticipants(e)}</td>
                      <td style={{ ...styles.td, whiteSpace: "pre-wrap" }}>{e.meansOfVerification || "—"}</td>
                      <td style={styles.actionCell}>
                        <div style={styles.actionWrap}>
                          <div style={styles.actionRow}>
                            <button style={styles.tinyBtn} onClick={() => setShowViewId(e.id)}>View</button>
                            {allowEdit && (
                              <button style={styles.tinyBtn} onClick={() => openEditEntry(e)}>Edit</button>
                            )}
                          </div>
                          {allowExport && (
                            <div style={styles.actionRow}>
                              <button style={styles.tinyBtn} onClick={() => openPrintPopupRow(e.id)}>Print</button>
                              <button style={styles.tinyBtn} onClick={() => openExportPopupRow(e.id)}>Export</button>
                            </div>
                          )}
                          {allowDelete && (
                            <div style={styles.actionRow}>
                              <button
                                style={styles.dangerTiny}
                                onClick={() => deleteEntry(e.id)}
                                disabled={deletingId === e.id}
                              >
                                {deletingId === e.id ? "Deleting..." : "Delete"}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
                {!!filteredEntries.length && (
                  <tr>
                    <td colSpan={4} style={{ ...styles.tdCenter, fontWeight: 900 }}>TOTAL</td>
                    <td style={{ ...styles.tdCenter, fontWeight: 900 }}>{onsiteTotals.regional}</td>
                    <td style={{ ...styles.tdCenter, fontWeight: 900 }}>{onsiteTotals.provincial}</td>
                    <td style={{ ...styles.tdCenter, fontWeight: 900 }}>{onsiteTotals.cityMunicipality}</td>
                    <td style={{ ...styles.tdCenter, fontWeight: 900 }}>{onsiteTotals.totalActivities}</td>
                    <td style={{ ...styles.tdCenter, fontWeight: 900 }}>{onsiteTotals.male}</td>
                    <td style={{ ...styles.tdCenter, fontWeight: 900 }}>{onsiteTotals.female}</td>
                    <td style={{ ...styles.tdCenter, fontWeight: 900 }}>{onsiteTotals.totalParticipants}</td>
                    <td style={styles.td}></td>
                    <td style={styles.td}></td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table style={{ ...styles.table, minWidth: 2050 }}>
              <thead>
                <tr>
                  <th style={styles.th} rowSpan={2}>NO.</th>
                  <th style={styles.th} rowSpan={2}>DATE</th>
                  <th style={styles.th} rowSpan={2}>PROJECT TITLE</th>
                  <th style={styles.th} rowSpan={2}>TYPE OF PROMOTIONAL ACTIVITY</th>
                  <th style={styles.th} colSpan={4}>NO. OF PROMOTIONAL ACTIVITIES</th>
                  <th style={styles.th} colSpan={3}>NO. OF PARTICIPANTS</th>
                  <th style={styles.th} rowSpan={2}>NO. OF PEOPLE REACHED</th>
                  <th style={styles.th} rowSpan={2}>NO. OF VIEWS</th>
                  <th style={styles.th} colSpan={4}>NO. OF ENGAGEMENTS</th>
                  <th style={styles.th} rowSpan={2}>MEANS OF VERIFICATION</th>
                  <th style={styles.th} rowSpan={2}>ACTIONS</th>
                </tr>
                <tr>
                  <th style={styles.th}>REGIONAL</th>
                  <th style={styles.th}>PROVINCIAL</th>
                  <th style={styles.th}>CITY/MUNICIPALITY</th>
                  <th style={styles.th}>TOTAL</th>
                  <th style={styles.th}>MALE</th>
                  <th style={styles.th}>FEMALE</th>
                  <th style={styles.th}>TOTAL</th>
                  <th style={styles.th}>REACTION</th>
                  <th style={styles.th}>COMMENT</th>
                  <th style={styles.th}>SHARE</th>
                  <th style={styles.th}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {loadingEntries ? (
                  <tr>
                    <td colSpan={19} style={styles.tdCenter}>Loading S&amp;T Promo entries...</td>
                  </tr>
                ) : !paginatedEntries.length ? (
                  <tr>
                    <td colSpan={19} style={styles.tdCenter}>No entries found.</td>
                  </tr>
                ) : (
                  paginatedEntries.map((e, idx) => (
                    <tr key={e.id}>
                      <td style={styles.tdCenter}>{tableStartNo + idx + 1}</td>
                      <td style={styles.tdCenter}>{e.date || "—"}</td>
                      <td style={styles.td}>{e.projectTitle || "—"}</td>
                      <td style={styles.td}>{e.activityType || "—"}</td>
                      <td style={styles.tdCenter}>{toNumber(e.regional)}</td>
                      <td style={styles.tdCenter}>{toNumber(e.provincial)}</td>
                      <td style={styles.tdCenter}>{toNumber(e.cityMunicipality)}</td>
                      <td style={styles.tdCenter}>{totalPromotionalActivities(e)}</td>
                      <td style={styles.tdCenter}>{toNumber(e.male)}</td>
                      <td style={styles.tdCenter}>{toNumber(e.female)}</td>
                      <td style={styles.tdCenter}>{totalParticipants(e)}</td>
                      <td style={styles.tdCenter}>{toNumber(e.peopleReached) || ""}</td>
                      <td style={styles.tdCenter}>{toNumber(e.views) || ""}</td>
                      <td style={styles.tdCenter}>{toNumber(e.reaction) || ""}</td>
                      <td style={styles.tdCenter}>{toNumber(e.comment) || ""}</td>
                      <td style={styles.tdCenter}>{toNumber(e.share) || ""}</td>
                      <td style={styles.tdCenter}>{totalEngagements(e) || ""}</td>
                      <td style={{ ...styles.td, whiteSpace: "pre-wrap" }}>{e.meansOfVerification || "—"}</td>
                      <td style={styles.actionCell}>
                        <div style={styles.actionWrap}>
                          <div style={styles.actionRow}>
                            <button style={styles.tinyBtn} onClick={() => setShowViewId(e.id)}>View</button>
                            {allowEdit && (
                              <button style={styles.tinyBtn} onClick={() => openEditEntry(e)}>Edit</button>
                            )}
                          </div>
                          {allowExport && (
                            <div style={styles.actionRow}>
                              <button style={styles.tinyBtn} onClick={() => openPrintPopupRow(e.id)}>Print</button>
                              <button style={styles.tinyBtn} onClick={() => openExportPopupRow(e.id)}>Export</button>
                            </div>
                          )}
                          {allowDelete && (
                            <div style={styles.actionRow}>
                              <button
                                style={styles.dangerTiny}
                                onClick={() => deleteEntry(e.id)}
                                disabled={deletingId === e.id}
                              >
                                {deletingId === e.id ? "Deleting..." : "Delete"}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
                {!!filteredEntries.length && (
                  <tr>
                    <td colSpan={4} style={{ ...styles.tdCenter, fontWeight: 900 }}>TOTAL</td>
                    <td style={{ ...styles.tdCenter, fontWeight: 900 }}>{onlineLikeTotals.regional}</td>
                    <td style={{ ...styles.tdCenter, fontWeight: 900 }}>{onlineLikeTotals.provincial}</td>
                    <td style={{ ...styles.tdCenter, fontWeight: 900 }}>{onlineLikeTotals.cityMunicipality}</td>
                    <td style={{ ...styles.tdCenter, fontWeight: 900 }}>{onlineLikeTotals.totalActivities}</td>
                    <td style={{ ...styles.tdCenter, fontWeight: 900 }}>{onlineLikeTotals.male}</td>
                    <td style={{ ...styles.tdCenter, fontWeight: 900 }}>{onlineLikeTotals.female}</td>
                    <td style={{ ...styles.tdCenter, fontWeight: 900 }}>{onlineLikeTotals.totalParticipants}</td>
                    <td style={{ ...styles.tdCenter, fontWeight: 900 }}>{onlineLikeTotals.peopleReached || ""}</td>
                    <td style={{ ...styles.tdCenter, fontWeight: 900 }}>{onlineLikeTotals.views || ""}</td>
                    <td style={{ ...styles.tdCenter, fontWeight: 900 }}>{onlineLikeTotals.reaction || ""}</td>
                    <td style={{ ...styles.tdCenter, fontWeight: 900 }}>{onlineLikeTotals.comment || ""}</td>
                    <td style={{ ...styles.tdCenter, fontWeight: 900 }}>{onlineLikeTotals.share || ""}</td>
                    <td style={{ ...styles.tdCenter, fontWeight: 900 }}>{onlineLikeTotals.totalEngagements || ""}</td>
                    <td style={styles.td}></td>
                    <td style={styles.td}></td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            marginTop: 18,
            marginBottom: 8,
            width: "100%",
            background: "transparent",
            fontFamily,
            userSelect: "none",
            boxSizing: "border-box",
            padding: "10px 0",
            transform: "scale(0.75)",
    transformOrigin: "top center",
          }}
        >
          <style>{`
            @keyframes stPromoActivePagePop {
              0% { transform: scale(0.88); }
              70% { transform: scale(1.08); }
              100% { transform: scale(1); }
            }

            .stpromo-modern-page-btn:hover:not(:disabled):not(.stpromo-modern-page-active) {
              transform: translateY(-3px);
              border-color: #93c5fd !important;
              box-shadow: 0 12px 24px rgba(37, 99, 235, 0.14) !important;
            }

            .stpromo-modern-page-btn:active:not(:disabled) {
              transform: scale(0.94);
            }

            .stpromo-modern-page-active {
              animation: stPromoActivePagePop 0.28s ease;
            }
          `}</style>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              flexWrap: "wrap",
              width: "100%",
            }}
          >
            <button
              type="button"
              className="stpromo-modern-page-btn"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              title="Previous page"
              style={{
                minWidth: 54,
                height: 54,
                padding: "0 16px",
                border: "2px solid #e5e7eb",
                borderRadius: 16,
                background: "#ffffff",
                color: currentPage <= 1 ? "#a1a1aa" : "#2f3037",
                fontSize: 34,
                fontWeight: 900,
                cursor: currentPage <= 1 ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: currentPage <= 1 ? "none" : "0 8px 18px rgba(15, 23, 42, 0.06)",
                opacity: currentPage <= 1 ? 0.45 : 1,
                fontFamily,
                lineHeight: 1,
                transition:
                  "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease, color 0.18s ease",
              }}
            >
              ‹
            </button>

            {visiblePageNumbers.map((page) => {
              const isActive = currentPage === page;

              return (
                <button
                  key={page}
                  type="button"
                  className={`stpromo-modern-page-btn ${isActive ? "stpromo-modern-page-active" : ""}`}
                  onClick={() => setCurrentPage(page)}
                  title={`Page ${page}`}
                  style={{
                    minWidth: 54,
                    height: 54,
                    padding: "0 16px",
                    border: isActive ? "2px solid #3b82f6" : "2px solid #e5e7eb",
                    borderRadius: 16,
                    background: isActive ? "#3b82f6" : "#ffffff",
                    color: isActive ? "#ffffff" : "#2f3037",
                    fontSize: isActive ? 24 : 22,
                    fontWeight: 900,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: isActive
                      ? "0 14px 30px rgba(59, 130, 246, 0.28)"
                      : "0 8px 18px rgba(15, 23, 42, 0.06)",
                    fontFamily,
                    lineHeight: 1,
                    transition:
                      "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease, color 0.18s ease",
                  }}
                >
                  {page}
                </button>
              );
            })}

            <button
              type="button"
              className="stpromo-modern-page-btn"
              onClick={() => setCurrentPage((prev) => prev + 1)}
              title="Next page"
              style={{
                minWidth: 54,
                height: 54,
                padding: "0 16px",
                border: "2px solid #e5e7eb",
                borderRadius: 16,
                background: "#ffffff",
                color: "#2f3037",
                fontSize: 34,
                fontWeight: 900,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 18px rgba(15, 23, 42, 0.06)",
                fontFamily,
                lineHeight: 1,
                transition:
                  "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease, color 0.18s ease",
              }}
            >
              ›
            </button>
          </div>
        </div>
      </div>

      {showAdd && (
        <div style={{ ...styles.modalBackdrop, zIndex: 1500 }} onClick={() => setShowAdd(false)}>
          <div style={{ ...styles.modal, position: "relative", zIndex: 1501 }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>{editingId ? "Edit S&T Promo Entry" : "Add S&T Promo Entry"}</div>
              <button style={styles.closeX} onClick={() => setShowAdd(false)}>✕</button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.grid}>
                <div style={styles.field}>
                  <div style={styles.label}>Entry Type<span style={styles.req}>*</span></div>
                  <select style={styles.input} value={form.entryMode} onChange={(e) => updateForm("entryMode", e.target.value)}>
                    <option value="ONLINE">Online</option>
                    <option value="ONSITE">Onsite</option>
                  </select>
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Date<span style={styles.req}>*</span></div>
                  <input type="date" style={styles.input} value={form.date} onChange={(e) => updateForm("date", e.target.value)} />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Project Title<span style={styles.req}>*</span></div>
                  <input style={styles.input} value={form.projectTitle} onChange={(e) => updateForm("projectTitle", e.target.value)} />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Type of Promotional Activity<span style={styles.req}>*</span></div>
                  <input
                    style={styles.input}
                    value={form.activityType}
                    onChange={(e) => updateForm("activityType", e.target.value)}
                    placeholder="Enter promotional activity type"
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Regional</div>
                  <input type="number" min="0" style={styles.input} value={form.regional} onChange={(e) => updateForm("regional", e.target.value)} />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Provincial</div>
                  <input type="number" min="0" style={styles.input} value={form.provincial} onChange={(e) => updateForm("provincial", e.target.value)} />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>City/Municipality</div>
                  <input type="number" min="0" style={styles.input} value={form.cityMunicipality} onChange={(e) => updateForm("cityMunicipality", e.target.value)} />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Total No. of Promotional Activities</div>
                  <input type="number" style={{ ...styles.input, background: "#f8fafc" }} value={totalPromotionalActivities(form)} readOnly />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Male</div>
                  <input type="number" min="0" style={styles.input} value={form.male} onChange={(e) => updateForm("male", e.target.value)} />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Female</div>
                  <input type="number" min="0" style={styles.input} value={form.female} onChange={(e) => updateForm("female", e.target.value)} />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Total Participants</div>
                  <input type="number" style={{ ...styles.input, background: "#f8fafc" }} value={form.totalParticipants} readOnly />
                </div>

                {form.entryMode === "ONLINE" ? (
                  <>
                    <div style={styles.field}>
                      <div style={styles.label}>No. of People Reached</div>
                      <input type="number" min="0" style={styles.input} value={form.peopleReached} onChange={(e) => updateForm("peopleReached", e.target.value)} />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>No. of Views</div>
                      <input type="number" min="0" style={styles.input} value={form.views} onChange={(e) => updateForm("views", e.target.value)} />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Reaction</div>
                      <input type="number" min="0" style={styles.input} value={form.reaction} onChange={(e) => updateForm("reaction", e.target.value)} />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Comment</div>
                      <input type="number" min="0" style={styles.input} value={form.comment} onChange={(e) => updateForm("comment", e.target.value)} />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Share</div>
                      <input type="number" min="0" style={styles.input} value={form.share} onChange={(e) => updateForm("share", e.target.value)} />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Total Engagements</div>
                      <input type="number" style={{ ...styles.input, background: "#f8fafc" }} value={form.totalEngagements} readOnly />
                    </div>
                  </>
                ) : null}

                <UnifiedMOVSection
                  value={form.meansOfVerification}
                  photos={form.movPhotos}
                  onValueChange={(value) => updateForm("meansOfVerification", value)}
                  onPhotosChange={(photos) =>
                    setForm((prev) => ({
                      ...prev,
                      movPhotos: Array.isArray(photos) ? photos : [],
                      photos: Array.isArray(photos) ? photos : [],
                    }))
                  }
                  label={<>Means of Verification<span style={styles.req}>*</span></>}
                />

                {form.entryMode === "ONSITE" ? (
                  <>
                    <div style={{ ...styles.field, gridColumn: "1 / span 2" }}>
                      <div style={styles.label}>Venue/Address<span style={styles.req}>*</span></div>
                      <button type="button" onClick={() => setAddressFlowOpen(true)} style={styles.inputButton(Boolean(form.address))}>
                        <span style={{ opacity: form.address ? 1 : 0.6 }}>
                          {form.address || "Click to select venue/address"}
                        </span>
                        <span style={{ fontSize: 14, opacity: 0.65 }}>
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
                          <div style={{ fontSize: 14, opacity: 0.85, alignSelf: "center", ...styles.mono }}>
                            {form.addressMeta.lat.toFixed(6)}, {form.addressMeta.lng.toFixed(6)}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Municipality</div>
                      <input style={{ ...styles.input, background: "#f8fafc" }} value={form.municipality} readOnly />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>District</div>
                      <input style={{ ...styles.input, background: "#f8fafc" }} value={form.district} readOnly />
                    </div>
                  </>
                ) : null}

                <div style={{ ...styles.field, gridColumn: "1 / span 2" }}>
                  <div style={styles.label}>Name of Staff</div>
                  <input style={styles.input} value={form.staffName || form.nameOfStaff || ""} onChange={(e) => updateForm("staffName", e.target.value)} placeholder="Optional" />
                </div>

                {renderStPromoCustomInputs()}

                <div style={{ ...styles.field, gridColumn: "1 / span 2" }}>
                  <div style={styles.label}>Remarks</div>
                  <textarea style={styles.textarea} value={form.remarks} onChange={(e) => updateForm("remarks", e.target.value)} />
                </div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button type="button" style={styles.pillBtn} onClick={resetForm}>Clear</button>
              <button
                type="button"
                style={styles.btnDark}
                onClick={saveEntry}
                disabled={savingEntry || (editingId ? !allowEdit : !allowAdd)}
              >
                {savingEntry ? "Saving..." : editingId ? "Update Entry" : "Save Entry"}
              </button>
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
          <div style={{ ...styles.modal, position: "relative", zIndex: 1501, width: "min(1180px, 100%)" }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>View Entry</div>
              <button style={styles.closeX} onClick={() => setShowViewId(null)}>✕</button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.viewTabsRow}>
                <button type="button" style={styles.viewTabBtn(true)}>List View</button>
              </div>

              <div style={styles.viewSectionTitle}>Entry Information</div>

              <div style={styles.viewInfoGrid}>
                <div style={styles.viewStack}>
                  <div>
                    <div style={styles.viewLabel}>Entry Type</div>
                    <div style={styles.viewValue}>{viewEntry.entryMode === "ONSITE" ? "Onsite" : "Online"}</div>
                  </div>
                  <div>
                    <div style={styles.viewLabel}>Project Title</div>
                    <div style={styles.viewValue}>{viewEntry.projectTitle || "—"}</div>
                  </div>
                  <div>
                    <div style={styles.viewLabel}>Regional</div>
                    <div style={styles.viewValue}>{toNumber(viewEntry.regional)}</div>
                  </div>
                  <div>
                    <div style={styles.viewLabel}>City/Municipality</div>
                    <div style={styles.viewValue}>{toNumber(viewEntry.cityMunicipality)}</div>
                  </div>
                  <div>
                    <div style={styles.viewLabel}>Male</div>
                    <div style={styles.viewValue}>{toNumber(viewEntry.male)}</div>
                  </div>
                  <div>
                    <div style={styles.viewLabel}>Total Participants</div>
                    <div style={styles.viewValue}>{totalParticipants(viewEntry)}</div>
                  </div>
                  {viewEntry.entryMode === "ONLINE" ? (
                    <>
                      <div>
                        <div style={styles.viewLabel}>People Reached</div>
                        <div style={styles.viewValue}>{toNumber(viewEntry.peopleReached)}</div>
                      </div>
                      <div>
                        <div style={styles.viewLabel}>Reaction</div>
                        <div style={styles.viewValue}>{toNumber(viewEntry.reaction)}</div>
                      </div>
                      <div>
                        <div style={styles.viewLabel}>Share</div>
                        <div style={styles.viewValue}>{toNumber(viewEntry.share)}</div>
                      </div>
                    </>
                  ) : null}
                </div>

                <div style={styles.viewStack}>
                  <div>
                    <div style={styles.viewLabel}>Date Completed/Executed</div>
                    <div style={styles.viewValue}>{viewEntry.date || "—"}</div>
                  </div>
                  <div>
                    <div style={styles.viewLabel}>Type of Promotional Activity</div>
                    <div style={styles.viewValue}>{viewEntry.activityType || "—"}</div>
                  </div>
                  <div>
                    <div style={styles.viewLabel}>Provincial</div>
                    <div style={styles.viewValue}>{toNumber(viewEntry.provincial)}</div>
                  </div>
                  <div>
                    <div style={styles.viewLabel}>Total Activities</div>
                    <div style={styles.viewValue}>{totalPromotionalActivities(viewEntry)}</div>
                  </div>
                  <div>
                    <div style={styles.viewLabel}>Female</div>
                    <div style={styles.viewValue}>{toNumber(viewEntry.female)}</div>
                  </div>
                  <div>
                    <div style={styles.viewLabel}>Municipality</div>
                    <div style={styles.viewValue}>{viewEntry.municipality || "—"}</div>
                  </div>
                  {viewEntry.entryMode === "ONLINE" ? (
                    <>
                      <div>
                        <div style={styles.viewLabel}>Views</div>
                        <div style={styles.viewValue}>{toNumber(viewEntry.views)}</div>
                      </div>
                      <div>
                        <div style={styles.viewLabel}>Comment</div>
                        <div style={styles.viewValue}>{toNumber(viewEntry.comment)}</div>
                      </div>
                      <div>
                        <div style={styles.viewLabel}>Total Engagements</div>
                        <div style={styles.viewValue}>{totalEngagements(viewEntry)}</div>
                      </div>
                    </>
                  ) : null}
                </div>

                <div style={styles.viewStack}>
                  {viewEntry.entryMode === "ONSITE" ? (
                    <>
                      <div>
                        <div style={styles.viewLabel}>Barangay</div>
                        <div style={styles.viewValue}>{viewEntry.barangay || "—"}</div>
                      </div>
                      <div>
                        <div style={styles.viewLabel}>District</div>
                        <div style={styles.viewValue}>{viewEntry.district || "—"}</div>
                      </div>
                      <div>
                        <div style={styles.viewLabel}>Coordinates</div>
                        <div style={styles.viewValue}>
                          {Number.isFinite(viewEntry?.addressMeta?.lat) && Number.isFinite(viewEntry?.addressMeta?.lng)
                            ? `${viewEntry.addressMeta.lat}, ${viewEntry.addressMeta.lng}`
                            : "—"}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div>
                      <div style={styles.viewLabel}>Summary</div>
                      <div style={styles.viewValue}>Online promotional activity details</div>
                    </div>
                  )}
                </div>
              </div>

              {viewEntry.entryMode === "ONSITE" && (
                <>
                  <div style={styles.viewLabel}>Venue/Address</div>
                  <div style={styles.viewBox}>{viewEntry.address || "—"}</div>

                  <div style={{ ...styles.viewInfoGrid, marginTop: 10, marginBottom: 8 }}>
                    <div style={styles.viewStack}>
                      <div>
                        <div style={styles.viewLabel}>Municipality</div>
                        <div style={styles.viewValue}>{viewEntry.municipality || "—"}</div>
                      </div>
                    </div>
                    <div style={styles.viewStack}>
                      <div>
                        <div style={styles.viewLabel}>Coordinates</div>
                        <div style={styles.viewValue}>
                          {Number.isFinite(viewEntry?.addressMeta?.lat) && Number.isFinite(viewEntry?.addressMeta?.lng)
                            ? `${viewEntry.addressMeta.lat}, ${viewEntry.addressMeta.lng}`
                            : "—"}
                        </div>
                      </div>
                    </div>
                    <div style={styles.viewStack}></div>
                  </div>

                  {Number.isFinite(viewEntry?.addressMeta?.lat) && Number.isFinite(viewEntry?.addressMeta?.lng) ? (
                    <div style={styles.viewMiniActions}>
                      <button type="button" style={styles.pillBtn} onClick={() => openGoogleMap(viewEntry.addressMeta.lat, viewEntry.addressMeta.lng)}>Map</button>
                      <button type="button" style={styles.pillBtn} onClick={() => openGoogleDirections(viewEntry.addressMeta.lat, viewEntry.addressMeta.lng)}>Directions</button>
                    </div>
                  ) : null}
                </>
              )}

              <div style={styles.viewLabel}>Means of Verification</div>
              <div style={styles.viewBox}>{viewEntry.meansOfVerification || "—"}</div>

              <div style={styles.viewMiniActions}>
                <button
                  type="button"
                  style={styles.pillBtn}
                  onClick={() => openStPromoFirstMovLink(viewEntry.meansOfVerification)}
                >
                  View Link
                </button>
                <button type="button" style={styles.pillBtn}>
                  Photos: {getStPromoPhotos(viewEntry).length}
                </button>
              </div>

              {getStPromoPhotos(viewEntry).length ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "8px 0 12px" }}>
                  {getStPromoPhotos(viewEntry).map((photo, index) => (
                    <img
                      key={`${photo.name || "st-promo-photo"}_${index}`}
                      src={photo.dataUrl || photo.url}
                      alt={photo.name || `MOV Photo ${index + 1}`}
                      style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid #cbd5e1" }}
                      onClick={() => {
                        const src = photo.dataUrl || photo.url;
                        if (src) window.open(src, "_blank", "noopener,noreferrer");
                      }}
                    />
                  ))}
                </div>
              ) : null}

              <div style={styles.viewLabel}>Name of Staff</div>
              <div style={styles.viewBox}>{viewEntry.staffName || viewEntry.nameOfStaff || "—"}</div>

              {renderStPromoCustomViewFields(viewEntry)}

              <div style={styles.viewLabel}>Remarks</div>
              <div style={styles.viewBox}>{viewEntry.remarks || "—"}</div>

              {viewEntry.entryMode === "ONSITE" && Number.isFinite(viewEntry?.addressMeta?.lat) && Number.isFinite(viewEntry?.addressMeta?.lng) && (
                <div style={{ marginTop: 14 }}>
                  <div style={styles.viewLabel}>Pinned Location</div>
                  <div style={{ border: "1px solid #cbd5e1", borderRadius: 6, overflow: "hidden" }}>
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

              <div style={styles.viewBottomActions}>
                <button type="button" style={styles.pillBtn} onClick={() => setShowViewId(null)}>Close</button>
                {allowEdit && (
                  <button type="button" style={styles.btnDark} onClick={() => { setShowViewId(null); openEditEntry(viewEntry); }}>Edit</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}


      <PopupModal
        open={printModal.open}
        title={printModal.scope === "row" ? "Print (This Row)" : "Print (Filtered Rows)"}
        onClose={() => setPrintModal((p) => ({ ...p, open: false }))}
      >
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8 }}>
            {printModal.scope === "row"
              ? `Institution: ${getEntryLabel(entries.find((e) => e.id === printModal.entryId)) || "—"}`
              : `Records: ${totalEntries}`}
          </div>

          <div style={styles.grid}>
            <div style={styles.field}>
              <div style={styles.label}>Layout</div>
              <select style={styles.input} value={printModal.layout} onChange={(e) => setPrintModal((p) => ({ ...p, layout: e.target.value }))}>
                <option value="FORM">Form-Based Record Sheet</option>
                <option value="TABLE">Table Sheet</option>
                <option value="COMPACT">Compact Sheet</option>
              </select>
            </div>

            <div style={styles.field}>
              <div style={styles.label}>Orientation</div>
              <select style={styles.input} value={printModal.orientation} onChange={(e) => setPrintModal((p) => ({ ...p, orientation: e.target.value }))}>
                <option value="landscape">Landscape (default)</option>
                <option value="portrait">Portrait</option>
              </select>
            </div>

            <div style={styles.field}>
              <div style={styles.label}>Paper Size</div>
              <select style={styles.input} value={printModal.preset} onChange={(e) => setPrintModal((p) => ({ ...p, preset: e.target.value }))}>
                <option value="a4">A4</option>
                <option value="letter">Letter</option>
                <option value="legal">Legal</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            <div style={styles.field}>
              <div style={styles.label}>Custom Size (inches)</div>
              <div style={{ display: "flex", gap: 8 }}>
                <input style={styles.input} disabled={printModal.preset !== "custom"} value={printModal.customSize.width} onChange={(e) => setPrintModal((p) => ({ ...p, customSize: { ...p.customSize, width: e.target.value } }))} placeholder="Width" />
                <input style={styles.input} disabled={printModal.preset !== "custom"} value={printModal.customSize.height} onChange={(e) => setPrintModal((p) => ({ ...p, customSize: { ...p.customSize, height: e.target.value } }))} placeholder="Height" />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" style={styles.btnGhost} onClick={() => setPrintModal((p) => ({ ...p, open: false }))}>Cancel</button>
            <button type="button" style={styles.btnDark} onClick={confirmPrint}>Print Now</button>
          </div>
        </div>
      </PopupModal>

      <PopupModal
        open={exportModal.open}
        title={exportModal.scope === "row" ? "Export (This Row)" : "Export (Filtered Rows)"}
        onClose={() => setExportModal((p) => ({ ...p, open: false }))}
      >
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8 }}>
            {exportModal.scope === "row"
              ? `Institution: ${getEntryLabel(entries.find((e) => e.id === exportModal.entryId)) || "—"}`
              : `Records: ${totalEntries}`}
          </div>

          <div style={styles.field}>
            <div style={styles.label}>Format</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["excel", "csv", "pdf", "docx"].map((f) => (
                <button
                  key={f}
                  type="button"
                  style={{
                    ...styles.pillBtn,
                    ...(exportModal.format === f ? { border: "1px solid #0b4ea2", background: "#dbeafe" } : null),
                  }}
                  onClick={() => setExportModal((p) => ({ ...p, format: f }))}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {["pdf", "docx"].includes(exportModal.format) ? (
            <div style={styles.grid}>
              <div style={styles.field}>
                <div style={styles.label}>Template / Layout</div>
                <select style={styles.input} value={exportModal.template} onChange={(e) => setExportModal((p) => ({ ...p, template: e.target.value }))}>
                  <option value="TABLE">Table Sheet</option>
                  <option value="FORM">Form-Based Record Sheet</option>
                  <option value="COMPACT">Compact Sheet</option>
                </select>
              </div>

              <div style={styles.field}>
                <div style={styles.label}>Orientation</div>
                <select style={styles.input} value={exportModal.orientation} onChange={(e) => setExportModal((p) => ({ ...p, orientation: e.target.value }))}>
                  <option value="landscape">Landscape (default)</option>
                  <option value="portrait">Portrait</option>
                </select>
              </div>

              {exportModal.format === "pdf" ? (
                <>
                  <div style={styles.field}>
                    <div style={styles.label}>Paper Size</div>
                    <select style={styles.input} value={exportModal.preset} onChange={(e) => setExportModal((p) => ({ ...p, preset: e.target.value }))}>
                      <option value="a4">A4</option>
                      <option value="letter">Letter</option>
                      <option value="legal">Legal</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  <div style={styles.field}>
                    <div style={styles.label}>Custom Size (inches)</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input style={styles.input} disabled={exportModal.preset !== "custom"} value={exportModal.customSize.width} onChange={(e) => setExportModal((p) => ({ ...p, customSize: { ...p.customSize, width: e.target.value } }))} />
                      <input style={styles.input} disabled={exportModal.preset !== "custom"} value={exportModal.customSize.height} onChange={(e) => setExportModal((p) => ({ ...p, customSize: { ...p.customSize, height: e.target.value } }))} />
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button type="button" style={styles.btnGhost} onClick={() => setExportModal((p) => ({ ...p, open: false }))}>Cancel</button>
            <button type="button" style={styles.btnDark} onClick={confirmExport}>Export Now</button>
          </div>
        </div>
      </PopupModal>
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

