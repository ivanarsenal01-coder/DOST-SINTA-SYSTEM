import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import API_BASE from "../../api";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, PageOrientation } from "docx";
import { useAuth } from "../../usrmngment/auth/AuthContext";

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

const TECH_PROMOTION_API = `${API_BASE}/technology-promotion`;

async function apiFetch(path, options = {}) {
  try {
    const method = String(options.method || "GET").toUpperCase();
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    const config = {
      method,
      url: `${TECH_PROMOTION_API}${path}`,
      headers,
      params: options.params || undefined,
    };

    if (options.body !== undefined) {
      config.data =
        typeof options.body === "string" ? JSON.parse(options.body) : options.body;
    }

    const res = await axios(config);
    return res.data;
  } catch (err) {
    const message =
      err?.response?.data?.message ||
      err?.message ||
      "Request failed";
    throw new Error(message);
  }
}

const parseMaybeJSON = (value, fallback = null) => {
  if (value === null || value === undefined || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const parseTechPromoCustomFields = (value) => {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value || "{}");
  } catch {
    return {};
  }
};

const cleanTechPromoCustomLabel = (value) =>
  String(value || "")
    .replace(/^#+/, "")
    .replace(/_/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());
const firstNonEmpty = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    if (typeof value === "string") {
      if (value.trim() !== "") return value;
      continue;
    }
    return value;
  }
  return null;
};

const normalizePhotos = (row) => {
  const candidates = [
    row?.photos,
    row?.photo_urls,
    row?.photoUrls,
    row?.technologyPromotionPhotos,
    row?.technology_promotion_photos,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
    const parsed = parseMaybeJSON(candidate, null);
    if (Array.isArray(parsed)) return parsed;
  }

  return [];
};

const buildVenueMeta = (row) => {
  const rawMeta =
    parseMaybeJSON(row?.activityVenueMeta, null) ||
    parseMaybeJSON(row?.activity_venue_meta, null) ||
    parseMaybeJSON(row?.venueMeta, null) ||
    null;

  const lat = firstNonEmpty(row?.venue_lat, row?.venueLat, rawMeta?.lat);
  const lng = firstNonEmpty(row?.venue_lng, row?.venueLng, rawMeta?.lng);

  const normalizedLat = Number.isFinite(Number(lat)) ? Number(lat) : null;
  const normalizedLng = Number.isFinite(Number(lng)) ? Number(lng) : null;

  const venueName = firstNonEmpty(row?.venue_name, row?.venueName, rawMeta?.venueName) || "";
  const manualText = firstNonEmpty(row?.venue_manual_text, row?.venueManualText, rawMeta?.manualText) || "";

  const displayText =
    firstNonEmpty(
      row?.venue_display_text,
      row?.venueDisplayText,
      row?.activityVenueAddress,
      row?.activity_venue_address,
      rawMeta?.displayText
    ) || "";

  const venueMeta = {
    mode: firstNonEmpty(row?.venue_mode, row?.venueMode, rawMeta?.mode) || null,
    venueName,
    manualText,
    displayText,
    province:
      firstNonEmpty(row?.venue_province, row?.venueProvince, rawMeta?.province) || null,
    municipality:
      firstNonEmpty(
        row?.venue_municipality,
        row?.venueMunicipality,
        rawMeta?.municipality
      ) || null,
    barangay:
      firstNonEmpty(row?.venue_barangay, row?.venueBarangay, rawMeta?.barangay) || null,
    lat: normalizedLat,
    lng: normalizedLng,
  };

  const hasAnyVenueMeta = Object.values(venueMeta).some(
    (v) => v !== null && v !== ""
  );

  return hasAnyVenueMeta ? venueMeta : null;
};

const normalizeEntryFromApi = (row) => {
  const venueMeta = buildVenueMeta(row);
  const activityVenueAddress =
    firstNonEmpty(
      row?.activityVenueAddress,
      row?.activity_venue_address,
      venueMeta?.displayText
    ) || "";

  return {
    ...row,
    id: firstNonEmpty(row?.id, row?.entry_id),
    project:
      firstNonEmpty(row?.project, row?.project_name, row?.projectName) || "",
    projectName:
      firstNonEmpty(row?.projectName, row?.project_name, row?.project) || "",
    activityDate:
      firstNonEmpty(row?.activityDate, row?.activity_date) || "",
    technologyPromoted:
      firstNonEmpty(row?.technologyPromoted, row?.technology_promoted) || "",
    technologyGenerator:
      firstNonEmpty(row?.technologyGenerator, row?.technology_generator) || "",
    modeOfPromotion:
      firstNonEmpty(row?.modeOfPromotion, row?.mode_of_promotion) || "",
    activityTitle:
      firstNonEmpty(row?.activityTitle, row?.activity_title) || "",
    activityVenueAddress,
    activityVenueMeta: venueMeta,
    customerName:
      firstNonEmpty(row?.customerName, row?.customer_name) || "",
    customerAddress:
      firstNonEmpty(row?.customerAddress, row?.customer_address) || "",
    sex: firstNonEmpty(row?.sex, row?.gender) || "N/A",
    meansOfVerification:
      firstNonEmpty(row?.meansOfVerification, row?.means_of_verification) || "",
    staffName:
      firstNonEmpty(row?.staffName, row?.staff_name) || "",
    nameOfStaff:
      firstNonEmpty(row?.nameOfStaff, row?.staffName, row?.staff_name) || "",
    customFields: parseTechPromoCustomFields(row?.customFields || row?.custom_fields),
    custom_fields: parseTechPromoCustomFields(row?.custom_fields || row?.customFields),
    photos: normalizePhotos(row),
    sourceModule:
      firstNonEmpty(row?.sourceModule, row?.source_module) || "",
    sourceProjectId:
      firstNonEmpty(row?.sourceProjectId, row?.source_project_id) || null,
    sourceInterventionId:
      firstNonEmpty(row?.sourceInterventionId, row?.source_intervention_id) || null,
    sourceType:
      firstNonEmpty(row?.sourceType, row?.source_type) || "",
  };
};



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

export default function TechnologyPromotion() {
  const [deleteConfirmState, setDeleteConfirmState] = useState(null);

  const requestDeleteConfirm = (message = "This action cannot be undone.", title = "Confirm Delete", confirmText = "Delete") =>
    new Promise((resolve) => {
      setDeleteConfirmState({ message, title, confirmText, resolve });
    });

  const cancelDeleteConfirm = () => {
    if (deleteConfirmState?.resolve) deleteConfirmState.resolve(false);
    setDeleteConfirmState(null);
  };

  const proceedDeleteConfirm = () => {
    if (deleteConfirmState?.resolve) deleteConfirmState.resolve(true);
    setDeleteConfirmState(null);
  };

  const MODE_ADD = "__ADD_MODE__";
  const PROJECT_ADD = "__ADD_PROJECT__";

  const fontFamily =
    '"Poppins", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"';

  const { hasPageAccess } = useAuth();
  const canTechPromo = (action) =>
    Boolean(
      hasPageAccess?.("technologyPromotion", action) ||
      hasPageAccess?.("technology_promotion", action) ||
      hasPageAccess?.("techPromotion", action) ||
      hasPageAccess?.("techPromo", action) ||
      hasPageAccess?.("technologyPromotion", "manage") ||
      hasPageAccess?.("techPromotion", "manage")
    );

  const canAdd = canTechPromo("add");
  const canEdit = canTechPromo("edit");
  const canDelete = canTechPromo("delete");
  const canExport = canTechPromo("export");

  const denyAccess = (action = "perform this action") => {
    alert(`You don't have privilege to ${action}.`);
    return false;
  };

  // =========================
  // Pangasinan lists
  // =========================
  const PANGASINAN_LGUS = useMemo(
    () =>
      [
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
      ].sort((a, b) => a.localeCompare(b)),
    []
  );

  const PANGASINAN_DISTRICTS = useMemo(
    () => [
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
    ],
    []
  );

  // =========================
  // Offline barangay json
  // public/data/pangasinan_barangays.json
  // =========================
  const BARANGAY_LOCAL_URL = "/data/pangasinan_barangays.json";
  const normalizeKey = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

  async function fetchBarangaysForMunicipality_Local(muniName) {
    const res = await fetch(BARANGAY_LOCAL_URL);
    if (!res.ok) {
      throw new Error("Missing file: public/data/pangasinan_barangays.json");
    }
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

  // =========================
  // Helpers
  // =========================
  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(d.getTime())) return dateStr;
    return dateStr;
  };

  const getYearFromDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(d.getTime())) return "";
    return d.getFullYear();
  };

  const getMonthFromDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(d.getTime())) return "";
    return d.getMonth() + 1;
  };

  const getDistrictFromMunicipality = (municipality) => {
    const muni = String(municipality || "").trim().toLowerCase();
    if (!muni) return "";

    const found = PANGASINAN_DISTRICTS.find((d) =>
      (d.municipalities || []).some(
        (m) => String(m || "").trim().toLowerCase() === muni
      )
    );

    return found?.id || "";
  };

  const getMunicipalityFromEntry = (entry) => {
    return (
      entry?.activityVenueMeta?.municipality ||
      entry?.venueMunicipality ||
      entry?.municipality ||
      ""
    );
  };

  const isManualEntry = (entry) => {
    return !entry?.sourceModule;
  };

  const isSyncedEntry = (entry) => {
    return !!entry?.sourceModule;
  };

  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ""));
      r.onerror = reject;
      r.readAsDataURL(file);
    });

  // =========================
  // Defaults
  // =========================
  const DEFAULT_MODE_OPTIONS = [
    "TechnoTransfer Day",
    "Forum",
    "Seminar",
    "Training",
    "Exhibit",
    "Caravan",
    "FGD",
    "Brochure",
    "Walk-in customers",
    "Social Media",
    "Interviews",
  ];
  const DEFAULT_PROJECT_OPTIONS = ["Setup", "CEST", "SSCP"];

  // =========================
  // State
  // =========================
  const [entries, setEntries] = useState([]);
  const [techPromoCustomFields, setTechPromoCustomFields] = useState([]);
  const [loading, setLoading] = useState(false);

  const ROWS_PER_PAGE = 10;
  const PAGE_WINDOW_SIZE = 10;
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const CURRENT_YEAR = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState("ALL");
  const [selectedDistrictFilter, setSelectedDistrictFilter] = useState("ALL");
  const [selectedMonthFilter, setSelectedMonthFilter] = useState("ALL");
  const [selectedMunicipalityFilter, setSelectedMunicipalityFilter] = useState("ALL");
  const [selectedViewFilter, setSelectedViewFilter] = useState("OVERALL");

  const [modeOptions, setModeOptions] = useState(DEFAULT_MODE_OPTIONS);
  const [modeModalOpen, setModeModalOpen] = useState(false);
  const [newModeName, setNewModeName] = useState("");

  const [projectOptions, setProjectOptions] = useState(DEFAULT_PROJECT_OPTIONS);
  const [projectFilter, setProjectFilter] = useState("ALL");
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  const [entryModal, setEntryModal] = useState(null);
  const [entryForm, setEntryForm] = useState({
    project: "",
    activityDate: "",
    technologyPromoted: "",
    technologyGenerator: "",
    modeOfPromotion: "Social Media",
    activityTitle: "",
    activityVenueMeta: null,
    activityVenueAddress: "",
    customerName: "",
    customerAddress: "",
    sex: "N/A",
    meansOfVerification: "",
    staffName: "",
    customFields: {},
    photos: [],
  });

  const photoInputRef = useRef(null);
  const [photoViewer, setPhotoViewer] = useState(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  const [venueFlowOpen, setVenueFlowOpen] = useState(false);

  const [venueViewEntryId, setVenueViewEntryId] = useState(null);
  const venueViewEntry = useMemo(
    () => entries.find((x) => String(x.id) === String(venueViewEntryId)) || null,
    [entries, venueViewEntryId]
  );

  const [printModal, setPrintModal] = useState({ open: false, scope: "bulk", entryId: null, layout: "FORM", preset: "a4", orientation: "landscape", customSize: { width: 8.5, height: 13 } });
  const [exportModal, setExportModal] = useState({ open: false, scope: "bulk", entryId: null, format: "excel", template: "TABLE", preset: "a4", orientation: "landscape", customSize: { width: 8.5, height: 13 } });

  const [viewEntryId, setViewEntryId] = useState(null);
  const viewEntry = useMemo(
    () => entries.find((x) => String(x.id) === String(viewEntryId)) || null,
    [entries, viewEntryId]
  );

  const bootedRef = useRef(false);

  // =========================
  // API Loaders
  // =========================
  const loadLookups = async () => {
    const data = await apiFetch("/lookups");

    const modes = Array.isArray(data?.modes) ? data.modes : [];
    const projects = Array.isArray(data?.projects) ? data.projects : [];

    setModeOptions(modes.length ? modes : DEFAULT_MODE_OPTIONS);

    const mergedProjects = Array.from(
      new Set(
        [...DEFAULT_PROJECT_OPTIONS, ...projects]
          .map((x) => String(x || "").trim())
          .filter(Boolean)
      )
    );
    setProjectOptions(
      mergedProjects.length ? mergedProjects : DEFAULT_PROJECT_OPTIONS
    );
  };

  const loadEntries = async (projectVal = "ALL", yearVal = selectedYear) => {
    const data = await apiFetch("/entries", {
      method: "GET",
      params: {
        year: yearVal === "ALL" ? "" : String(yearVal),
        project: String(projectVal),
      },
    });

    setEntries(Array.isArray(data) ? data.map(normalizeEntryFromApi) : []);
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);

        if (!bootedRef.current) {
          await loadLookups();
          bootedRef.current = true;
        }

        if (!cancelled) {
          await loadEntries(projectFilter, selectedYear);
        }
      } catch (err) {
        if (!cancelled) {
          alert(err.message || "Failed to load Technology Promotion data.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectFilter, selectedYear]);


  useEffect(() => {
    let cancelled = false;

    const fixedKeys = new Set([
      "no",
      "actions",
      "project",
      "projectName",
      "project_name",
      "activityDate",
      "activity_date",
      "technologyPromoted",
      "technology_promoted",
      "technologyGenerator",
      "technology_generator",
      "modeOfPromotion",
      "mode_of_promotion",
      "activityTitle",
      "activity_title",
      "activityVenueAddress",
      "activity_venue_address",
      "activityVenueMeta",
      "activity_venue_meta",
      "customerName",
      "customer_name",
      "customerAddress",
      "customer_address",
      "sex",
      "meansOfVerification",
      "means_of_verification",
      "staffName",
      "staff_name",
      "nameOfStaff",
      "name_of_staff",
      "photos",
      "source",
      "sourceModule",
      "source_module"
    ]);

    async function loadTechPromoCustomFields() {
      try {
        const res = await axios.get(`${API_BASE}/table-management/config`);
        const modules = Array.isArray(res.data) ? res.data : [];

        const mod = modules.find((m) => {
          const name = String(m.moduleName || m.module_name || m.name || "").toLowerCase();
          return (
            name === "technology promotion" ||
            name === "tech promotion" ||
            name.includes("technology promotion") ||
            name.includes("tech promo")
          );
        });

        const table =
          (mod?.tables || []).find((t) => {
            const name = String(t.tableName || t.table_name || t.name || "").toLowerCase();
            return name === "main" || name.includes("promotion") || name.includes("promo");
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

        if (!cancelled) setTechPromoCustomFields(finalCustomFields);
      } catch (err) {
        console.error("Failed to load Technology Promotion custom fields:", err);
        if (!cancelled) {
          setTechPromoCustomFields([
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

    loadTechPromoCustomFields();

    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setEntryModal(null);
        setModeModalOpen(false);
        setProjectModalOpen(false);
        setVenueFlowOpen(false);
        setPhotoViewer(null);
        setViewEntryId(null);
        setVenueViewEntryId(null);
        setPrintModal((p) => ({ ...p, open: false }));
        setExportModal((p) => ({ ...p, open: false }));
      }
      if (e.key === "ArrowRight" && photoViewer) nextPhoto();
      if (e.key === "ArrowLeft" && photoViewer) prevPhoto();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [photoViewer]);

  // =========================
  // Filtering
  // =========================
  const yearOptions = useMemo(() => {
    const years = ["ALL"];
    for (let y = 2050; y >= 1970; y -= 1) {
      years.push(String(y));
    }
    return years;
  }, []);

  const municipalityFilterOptions = useMemo(() => {
    return [...PANGASINAN_LGUS].sort((a, b) => a.localeCompare(b));
  }, [PANGASINAN_LGUS]);

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      const entryDate = entry?.activityDate || "";
      const entryYear = getYearFromDate(entryDate);
      const entryMonth = getMonthFromDate(entryDate);
      const entryMunicipality = getMunicipalityFromEntry(entry);
      const entryDistrict = getDistrictFromMunicipality(entryMunicipality);

      const yearMatch =
        selectedYear === "ALL" || Number(entryYear) === Number(selectedYear);

      const districtMatch =
        selectedDistrictFilter === "ALL" ||
        entryDistrict === selectedDistrictFilter;

      const monthMatch =
        selectedMonthFilter === "ALL" ||
        Number(entryMonth) === Number(selectedMonthFilter);

      const municipalityMatch =
        selectedMunicipalityFilter === "ALL" ||
        entryMunicipality === selectedMunicipalityFilter;

      const viewMatch =
        selectedViewFilter === "OVERALL" ||
        (selectedViewFilter === "MANUAL" && isManualEntry(entry)) ||
        (selectedViewFilter === "SYNCED" && isSyncedEntry(entry));

      return (
        yearMatch &&
        districtMatch &&
        monthMatch &&
        municipalityMatch &&
        viewMatch
      );
    });
  }, [
    entries,
    selectedYear,
    selectedDistrictFilter,
    selectedMonthFilter,
    selectedMunicipalityFilter,
    selectedViewFilter,
  ]);

  const searchedEntries = useMemo(() => {
    const q = String(searchTerm || "").trim().toLowerCase();

    if (!q) return filteredEntries;

    return filteredEntries.filter((entry) => {
      const searchableText = [
        entry.project,
        entry.projectName,
        entry.activityDate,
        entry.technologyPromoted,
        entry.technologyGenerator,
        entry.modeOfPromotion,
        entry.activityTitle,
        entry.activityVenueAddress,
        entry.activityVenueMeta?.displayText,
        entry.activityVenueMeta?.municipality,
        entry.activityVenueMeta?.barangay,
        entry.customerName,
        entry.customerAddress,
        entry.sex,
        entry.meansOfVerification,
        entry.staffName,
        entry.sourceModule,
        entry.sourceType,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(q);
    });
  }, [filteredEntries, searchTerm]);

  const totalPages = Math.max(
    1,
    Math.ceil(searchedEntries.length / ROWS_PER_PAGE)
  );

  // Do not clamp to totalPages. This keeps the DOST pagination window movable
  // like S&T Promo while the table still shows only 10 rows per page.
  const safeCurrentPage = Math.max(currentPage, 1);

  const currentPageEntries = useMemo(() => {
    const start = (safeCurrentPage - 1) * ROWS_PER_PAGE;
    const end = start + ROWS_PER_PAGE;
    return searchedEntries.slice(start, end);
  }, [searchedEntries, safeCurrentPage]);

  const pageStart = currentPageEntries.length
    ? (safeCurrentPage - 1) * ROWS_PER_PAGE + 1
    : 0;

  const pageEnd = currentPageEntries.length
    ? Math.min(safeCurrentPage * ROWS_PER_PAGE, searchedEntries.length)
    : 0;

  const pageWindowStart =
    Math.floor((safeCurrentPage - 1) / PAGE_WINDOW_SIZE) * PAGE_WINDOW_SIZE + 1;

  // DOST pagination window: always show 10 page numbers like S&T Promo.
  // Example: 1-10, then 11-20, then 21-30.
  // Do not limit this by totalPages, so the DOST wordmark always has 10 o-slots.
  const visiblePageNumbers = useMemo(() => {
    return Array.from(
      { length: PAGE_WINDOW_SIZE },
      (_, i) => pageWindowStart + i
    );
  }, [pageWindowStart]);

  // DOST pagination logo slots. Always 10 blue o's.
  // The black o moves based on the active/current page slot.
  const paginationLogoOSlots = useMemo(
    () => Array.from({ length: PAGE_WINDOW_SIZE }, (_, i) => i),
    []
  );

  const activeLogoIndex =
    ((safeCurrentPage - pageWindowStart) % PAGE_WINDOW_SIZE + PAGE_WINDOW_SIZE) %
    PAGE_WINDOW_SIZE;

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    projectFilter,
    selectedYear,
    selectedDistrictFilter,
    selectedMonthFilter,
    selectedMunicipalityFilter,
    selectedViewFilter,
  ]);

  // Important: no clamp-to-totalPages here.
  // If currentPage is 2, 3, 4, etc., the DOST black o can move even when
  // the visible number window is 1-10, 11-20, 21-30.

  const clearToolbarFilters = () => {
    setSelectedYear("ALL");
    setSelectedDistrictFilter("ALL");
    setSelectedMonthFilter("ALL");
    setSelectedMunicipalityFilter("ALL");
    setSelectedViewFilter("OVERALL");
  };


  // =========================
  // Export / Print popup actions
  // =========================
  const escapeHtml = (value = "") => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  const downloadBlob = (blob, filename) => { const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); };
  const safeFilePart = (value = "") => String(value || "").trim().replace(/[^\w-]+/g, "_").slice(0, 60) || "export";
  const promoColumns = ["No.", "Project", "Activity Date", "Technology Promoted", "Technology Generator", "Mode of Promotion", "Activity Title", "Activity Venue/Address", "Coordinates", "Customer/Participant", "Customer Address", "Sex", "Name of Staff", "Means of Verification", "Source"];
  const buildPromoRows = (scope = "bulk", entryId = null) => {
    const source = scope === "row" && entryId ? searchedEntries.filter((e) => String(e.id) === String(entryId)) : searchedEntries;
    return source.map((e, i) => ({
      "No.": i + 1,
      Project: e.project || e.projectName || "",
      "Activity Date": formatDateDisplay(e.activityDate),
      "Technology Promoted": e.technologyPromoted || "",
      "Technology Generator": e.technologyGenerator || "",
      "Mode of Promotion": e.modeOfPromotion || "",
      "Activity Title": e.activityTitle || "",
      "Activity Venue/Address": venueAddressText(e),
      Coordinates: venueCoordText(e),
      "Customer/Participant": e.customerName || "",
      "Customer Address": e.customerAddress || "",
      Sex: e.sex || "",
      "Name of Staff": e.staffName || "",
      "Means of Verification": e.meansOfVerification || "",
      Source: sourceLabel(e) || "",
    }));
  };
  const openPrintPopupRow = (entryId) => {
    if (!canExport) return denyAccess("print");
    setPrintModal((p) => ({ ...p, open: true, scope: "row", entryId, layout: "FORM" }));
  };
  const openPrintPopupBulk = () => {
    if (!canExport) return denyAccess("print");
    setPrintModal((p) => ({ ...p, open: true, scope: "bulk", entryId: null, layout: "FORM" }));
  };
  const openExportPopupRow = (entryId) => {
    if (!canExport) return denyAccess("export");
    setExportModal((p) => ({ ...p, open: true, scope: "row", entryId, format: "excel" }));
  };
  const openExportPopupBulk = () => {
    if (!canExport) return denyAccess("export");
    setExportModal((p) => ({ ...p, open: true, scope: "bulk", entryId: null, format: "excel" }));
  };
  const confirmExport = async () => {
    if (!canExport) return denyAccess("export");
    const rows = buildPromoRows(exportModal.scope, exportModal.entryId);
    const base = exportModal.scope === "row" ? `technology_promotion_${safeFilePart(exportModal.entryId)}` : `technology_promotion_filtered_${rows.length}_rows`;
    if (exportModal.format === "csv") {
      const csv = [promoColumns.join(","), ...rows.map((r) => promoColumns.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
      downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `${base}.csv`);
    } else if (exportModal.format === "pdf") {
      const doc = new jsPDF({ orientation: exportModal.orientation === "portrait" ? "p" : "l", unit: "pt", format: exportModal.preset === "legal" ? "legal" : exportModal.preset === "letter" ? "letter" : "a4" });
      doc.setFontSize(14); doc.text("Technology Promotion Export", 40, 38);
      autoTable(doc, { head: [promoColumns], body: rows.map((r) => promoColumns.map((c) => String(r[c] ?? ""))), startY: 55, styles: { fontSize: 7, cellPadding: 3, overflow: "linebreak" }, headStyles: { fillColor: [11, 78, 162] } });
      doc.save(`${base}.pdf`);
    } else if (exportModal.format === "docx") {
      const tableRows = [new TableRow({ children: promoColumns.map((c) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: c, bold: true })] })] })) }), ...rows.map((r) => new TableRow({ children: promoColumns.map((c) => new TableCell({ children: [new Paragraph(String(r[c] ?? ""))] })) }))];
      const doc = new Document({ sections: [{ properties: { page: { size: { orientation: exportModal.orientation === "portrait" ? PageOrientation.PORTRAIT : PageOrientation.LANDSCAPE } } }, children: [new Paragraph({ children: [new TextRun({ text: "Technology Promotion Export", bold: true, size: 28 })] }), new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } })] }] });
      downloadBlob(await Packer.toBlob(doc), `${base}.docx`);
    } else {
      const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [Object.fromEntries(promoColumns.map((c) => [c, ""]))]); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Technology Promotion"); XLSX.writeFile(wb, `${base}.xlsx`);
    }
    setExportModal((p) => ({ ...p, open: false }));
  };
  const confirmPrint = () => {
    if (!canExport) return denyAccess("print");
    const rows = buildPromoRows(printModal.scope, printModal.entryId);
    const tableHtml = `<table><thead><tr>${promoColumns.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr></thead><tbody>${rows.length ? rows.map((r) => `<tr>${promoColumns.map((c) => `<td>${escapeHtml(r[c])}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${promoColumns.length}">No data available. Template/header only.</td></tr>`}</tbody></table>`;
    const cardsHtml = rows.length ? rows.map((r) => `<div class="card">${promoColumns.map((c) => `<div><b>${escapeHtml(c)}:</b> ${escapeHtml(r[c])}</div>`).join("")}</div>`).join("") : `<div class="card">No data available. Template/header only.</div>`;
    const body = printModal.layout === "TABLE" ? tableHtml : cardsHtml;
    const win = window.open("", "_blank", "width=1200,height=900"); if (!win) return alert("Popup blocked. Please allow popups for printing.");
    win.document.write(`<!doctype html><html><head><title>Technology Promotion Print</title><style>@page{size:${printModal.preset || "a4"} ${printModal.orientation || "landscape"};margin:10mm;}body{font-family:Arial;padding:12px;color:#0f172a}h1{font-size:18px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #94a3b8;padding:6px;font-size:10px;vertical-align:top}th{background:#e2e8f0}.card{border:1px solid #94a3b8;border-radius:8px;padding:10px;margin-bottom:10px;display:grid;gap:4px;font-size:12px}</style></head><body><h1>Technology Promotion Print</h1>${body}<script>setTimeout(()=>window.print(),250)</script></body></html>`); win.document.close(); win.focus();
    setPrintModal((p) => ({ ...p, open: false }));
  };

  // =========================
  // Styles
  // =========================
  const styles = {
    page: { padding: 16, position: "relative", fontFamily },
    titleBar: {
      background: "#2f6fd6",
      color: "#fff",
      fontWeight: 900,
      padding: "12px 16px",
      letterSpacing: 0.5,
      fontSize: 22,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      flexWrap: "wrap",
      borderRadius: 6,
      fontFamily,
    },

    tableWrap: { marginTop: 10, overflowX: "auto" },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      fontFamily,
      tableLayout: "fixed",
    },

    th: {
      border: "2px solid #6b7280",
      padding: "6px 6px",
      background: "#eef2f6",
      fontSize: 11,
      textAlign: "center",
      fontFamily,
      fontWeight: 800,
      whiteSpace: "normal",
      wordBreak: "break-word",
      overflowWrap: "anywhere",
      lineHeight: 1.2,
    },
    td: {
      border: "2px solid #6b7280",
      padding: "6px 6px",
      fontSize: 11,
      fontFamily,
      verticalAlign: "top",
      background: "white",
      whiteSpace: "normal",
      wordBreak: "break-word",
      overflowWrap: "anywhere",
      lineHeight: 1.2,
    },
    tdCenter: {
      border: "2px solid #6b7280",
      padding: "6px 6px",
      fontSize: 11,
      textAlign: "center",
      fontFamily,
      verticalAlign: "top",
      background: "white",
      whiteSpace: "normal",
      wordBreak: "break-word",
      overflowWrap: "anywhere",
      lineHeight: 1.2,
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
      justifyContent: "flex-end",
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
      boxShadow: "0 2px 0 rgba(2, 6, 23, 0.06)",
      whiteSpace: "nowrap",
    },
    tinyBtn: {
      border: "1px solid rgba(15, 23, 42, 0.18)",
      background: "#fff",
      padding: "4px 8px",
      borderRadius: 999,
      cursor: "pointer",
      fontWeight: 900,
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
    select: {
      padding: "8px 10px",
      borderRadius: 10,
      border: "1px solid #cbd5e1",
      background: "#fff",
      fontWeight: 900,
      fontFamily,
      fontSize: 12,
      minWidth: 180,
    },
    toolbarRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 6,
      flexWrap: "nowrap",
      whiteSpace: "nowrap",
      marginTop: 0,
      marginBottom: 0,
      fontFamily,
    },
    toolbarLeft: {
      display: "flex",
      alignItems: "center",
      gap: 6,
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
      minWidth: 108,
      padding: "0 10px",
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
      minWidth: 82,
      padding: "0 10px",
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
      minWidth: 82,
      padding: "0 10px",
      borderRadius: 10,
      border: "1px solid #cbd5e1",
      background: "#fff",
      color: "#0f172a",
      fontSize: 12,
      fontWeight: 800,
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
    modalBackdrop: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "center",
      padding: 16,
      zIndex: 1000,
      overflowY: "auto",
    },
    modal: {
      width: "min(980px, 100%)",
      maxHeight: "calc(100vh - 32px)",
      background: "white",
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      fontFamily,
      display: "flex",
      flexDirection: "column",
      marginTop: 8,
    },
    modalHeader: {
      background: "#0b4ea2",
      color: "white",
      padding: "12px 16px",
      fontWeight: 900,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      fontFamily,
      flexShrink: 0,
    },
    modalBody: {
      padding: 16,
      overflowY: "auto",
      flex: 1,
      minHeight: 0,
    },
    modalFooter: {
      padding: 16,
      display: "flex",
      justifyContent: "flex-end",
      gap: 8,
      borderTop: "1px solid #e2e8f0",
      background: "white",
      flexShrink: 0,
    },
    btnDark: {
      background: "#0b4ea2",
      border: "1px solid #0b4ea2",
      color: "white",
      padding: "10px 12px",
      borderRadius: 10,
      fontSize: 12,
      fontWeight: 900,
      cursor: "pointer",
      fontFamily,
      whiteSpace: "nowrap",
    },
    closeX: { background: "transparent", border: "1px solid rgba(255,255,255,0.6)", color: "white", borderRadius: 10, padding: "6px 10px", cursor: "pointer", fontWeight: 900, fontFamily },
    btnGhost: {
      background: "white",
      border: "1px solid #cbd5e1",
      color: "#0f172a",
      padding: "10px 12px",
      borderRadius: 10,
      fontSize: 12,
      fontWeight: 900,
      cursor: "pointer",
      fontFamily,
      whiteSpace: "nowrap",
    },

    grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
    field: { display: "flex", flexDirection: "column", gap: 6 },
    label: {
      fontSize: 12,
      fontWeight: 900,
      color: "#0f172a",
      fontFamily,
    },
    input: {
      padding: "8px 10px",
      border: "1px solid #cbd5e1",
      borderRadius: 8,
      fontSize: 13,
      outline: "none",
      fontFamily,
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
    required: { color: "#ef4444", fontWeight: 900 },

    pill: {
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 999,
      border: "1px solid #cbd5e1",
      background: "#f8fafc",
      fontSize: 11,
      fontWeight: 900,
    },
    sourcePill: {
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 999,
      border: "1px solid #93c5fd",
      background: "#eff6ff",
      color: "#0b4ea2",
      fontSize: 10,
      fontWeight: 900,
      marginTop: 6,
    },
    linkChip: {
      border: "1px solid #cbd5e1",
      background: "#eff6ff",
      color: "#0b4ea2",
      padding: "6px 10px",
      borderRadius: 999,
      cursor: "pointer",
      fontWeight: 900,
      fontSize: 11,
      fontFamily,
      whiteSpace: "nowrap",
    },

    photoThumb: {
      width: 54,
      height: 54,
      objectFit: "cover",
      borderRadius: 8,
      border: "1px solid #e2e8f0",
      cursor: "pointer",
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
    }),

    mono: {
      fontFamily:
        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
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
      background:
        "linear-gradient(135deg, #e0f2fe 0%, #dbeafe 40%, #f0f9ff 100%)",
    },
    filterRow: {
      display: "flex",
      gap: 10,
      flexWrap: "wrap",
      alignItems: "center",
      marginTop: 8,
    },
    filterLabel: { fontSize: 12, fontWeight: 900, opacity: 0.8 },
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

    pillBtn: (active) => ({
      border: active
        ? "1px solid #0b4ea2"
        : "1px solid rgba(15, 23, 42, 0.18)",
      background: active ? "#dbeafe" : "#fff",
      padding: "6px 10px",
      borderRadius: 999,
      cursor: "pointer",
      fontWeight: 900,
      fontSize: 12,
      fontFamily,
    }),
    viewSectionTitle: {
      fontWeight: 900,
      fontSize: 13,
      color: "#0f172a",
      marginBottom: 8,
      fontFamily,
    },
    viewGrid2: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: 14,
    },
    viewInfoBlock: {
      display: "grid",
      gap: 8,
    },
    viewLabel: {
      fontSize: 11,
      fontWeight: 900,
      color: "#0f172a",
      opacity: 0.85,
      fontFamily,
    },
    viewValue: {
      fontSize: 14,
      fontWeight: 800,
      color: "#111827",
      fontFamily,
      lineHeight: 1.35,
    },
    viewBox: {
      border: "1px solid #cbd5e1",
      borderRadius: 8,
      background: "#f8fafc",
      padding: "10px 12px",
      fontSize: 13,
      fontWeight: 800,
      color: "#111827",
      minHeight: 42,
      display: "flex",
      alignItems: "center",
      fontFamily,
    },
    divider: {
      height: 1,
      background: "#e2e8f0",
      margin: "14px 0",
    },
  };

  // =========================
  // Mode/project add flows
  // =========================
  const handleModeChange = (val) => {
    if (val === MODE_ADD) {
      if (!canAdd) return denyAccess("add mode of promotion");
      return setModeModalOpen(true);
    }
    setEntryForm((prev) => ({ ...prev, modeOfPromotion: val }));
  };

  const commitAddMode = async () => {
    if (!canAdd) return denyAccess("add mode of promotion");
    try {
      const name = String(newModeName || "").trim();
      if (!name) return alert("Please type a mode of promotion.");

      await apiFetch("/modes", {
        method: "POST",
        body: JSON.stringify({ name }),
      });

      await loadLookups();
      setEntryForm((prev) => ({ ...prev, modeOfPromotion: name }));
      setNewModeName("");
      setModeModalOpen(false);
    } catch (err) {
      alert(err.message || "Failed to add mode.");
    }
  };

  const handleProjectChange = (val) => {
    if (val === PROJECT_ADD) {
      if (!canAdd) return denyAccess("add project option");
      return setProjectModalOpen(true);
    }
    setEntryForm((prev) => ({ ...prev, project: val }));
  };

  const commitAddProject = async () => {
    if (!canAdd) return denyAccess("add project option");
    try {
      const name = String(newProjectName || "").trim();
      if (!name) return alert("Please type a project name.");

      await apiFetch("/projects", {
        method: "POST",
        body: JSON.stringify({ name }),
      });

      await loadLookups();
      setEntryForm((prev) => ({ ...prev, project: name }));
      setNewProjectName("");
      setProjectModalOpen(false);
    } catch (err) {
      alert(err.message || "Failed to add project.");
    }
  };

  // =========================
  // Photos
  // =========================
  const triggerAddPhotos = () => {
    if (!photoInputRef.current) return;
    photoInputRef.current.value = "";
    photoInputRef.current.click();
  };

  const onPickPhotos = async (files) => {
    try {
      const arr = Array.from(files || []);
      if (arr.length === 0) return;

      const converted = [];
      for (const f of arr) {
        if (!String(f.type || "").startsWith("image/")) continue;
        const dataUrl = await fileToDataUrl(f);
        converted.push({ name: f.name, type: f.type, dataUrl });
      }

      if (converted.length === 0) {
        return alert("No valid image files selected.");
      }

      setEntryForm((prev) => ({
        ...prev,
        photos: [...(prev.photos || []), ...converted],
      }));
    } catch {
      alert("Failed to add photos.");
    }
  };

  const removePhotoAt = (idx) => {
    setEntryForm((prev) => ({
      ...prev,
      photos: (prev.photos || []).filter((_, i) => i !== idx),
    }));
  };

  const openPhotos = (photos, title = "Photos") => {
    const list = Array.isArray(photos) ? photos : [];
    if (list.length === 0) return alert("No photos saved.");
    setPhotoViewer({ photos: list, title });
    setPhotoIndex(0);
  };

  const nextPhoto = () => {
    if (!photoViewer) return;
    const n = photoViewer.photos.length;
    setPhotoIndex((p) => (p + 1) % n);
  };

  const prevPhoto = () => {
    if (!photoViewer) return;
    const n = photoViewer.photos.length;
    setPhotoIndex((p) => (p - 1 + n) % n);
  };


  const getTechPromoCustomPairs = (entry = {}) => {
    const values = parseTechPromoCustomFields(entry.customFields || entry.custom_fields);

    return (techPromoCustomFields || []).map((field) => {
      const key = field.fieldKey || field.field_key || field.key;
      const rawLabel = field.fieldLabel || field.field_label || field.label || key;
      const value = values?.[key];

      return {
        key,
        label: cleanTechPromoCustomLabel(rawLabel),
        value: value === null || value === undefined || value === "" ? "—" : String(value),
      };
    });
  };

  const renderTechPromoCustomInputs = () => {
    if (!techPromoCustomFields.length) return null;

    return (
      <>
        {techPromoCustomFields.map((field) => {
          const key = field.fieldKey || field.field_key || field.key;
          const rawLabel = field.fieldLabel || field.field_label || field.label || key;
          const label = cleanTechPromoCustomLabel(rawLabel);
          const type = String(field.fieldType || field.field_type || field.type || "Text").toLowerCase();
          const required = Boolean(field.isRequired ?? field.is_required ?? field.required ?? false);

          const commonProps = {
            value: entryForm.customFields?.[key] || "",
            onChange: (e) =>
              setEntryForm((prev) => ({
                ...prev,
                customFields: { ...(prev.customFields || {}), [key]: e.target.value },
              })),
            placeholder: `Enter ${label}`,
          };

          return (
            <div key={key} style={{ ...styles.field, gridColumn: "1 / -1" }}>
              <div style={styles.label}>
                {label}
                {required ? <span style={styles.required}>*</span> : null}
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
  };

  const renderTechPromoCustomViewFields = (entry) => {
    const pairs = getTechPromoCustomPairs(entry);
    if (!pairs.length) return null;

    return pairs.map((item) => (
      <div key={`techpromo-custom-view-${item.key}`}>
        <div style={styles.viewLabel}>{item.label}</div>
        <div style={styles.viewValue}>{item.value}</div>
      </div>
    ));
  };
  // =========================
  // Entry CRUD
  // =========================
  const resetEntryForm = () => {
    setEntryForm({
      project: "",
      activityDate: "",
      technologyPromoted: "",
      technologyGenerator: "",
      modeOfPromotion: "Social Media",
      activityTitle: "",
      activityVenueMeta: null,
      activityVenueAddress: "",
      customerName: "",
      customerAddress: "",
      sex: "N/A",
      meansOfVerification: "",
      staffName: "",
      photos: [],
    });
    setNewModeName("");
    setNewProjectName("");
  };

  const openAddEntry = () => {
    if (!canAdd) return denyAccess("add entry");
    resetEntryForm();
    setEntryModal({ mode: "add" });
  };

  const openEditEntry = (entryId) => {
    if (!canEdit) return denyAccess("edit entry");
    const e = entries.find((x) => String(x.id) === String(entryId));
    if (!e) return;

    setEntryForm({
      project: e.project || e.projectName || "",
      activityDate: e.activityDate || "",
      technologyPromoted: e.technologyPromoted || "",
      technologyGenerator: e.technologyGenerator || "",
      modeOfPromotion: e.modeOfPromotion || "Social Media",
      activityTitle: e.activityTitle || "",
      activityVenueMeta: e.activityVenueMeta ? { ...e.activityVenueMeta } : null,
      activityVenueAddress:
        e.activityVenueAddress || e.activityVenueMeta?.displayText || "",
      customerName: e.customerName || "",
      customerAddress: e.customerAddress || "",
      sex: e.sex || "N/A",
      meansOfVerification: e.meansOfVerification || "",
      staffName: e.staffName || e.nameOfStaff || "",
      customFields: parseTechPromoCustomFields(e.customFields || e.custom_fields),
      photos: Array.isArray(e.photos) ? [...e.photos] : [],
    });

    setEntryModal({ mode: "edit", entryId: e.id });
  };

  const deleteEntry = async (entryId) => {
    if (!canDelete) return denyAccess("delete entry");
    try {
      if (!(await requestDeleteConfirm("Delete this entry?", "Confirm Delete", "Delete"))) return;

      await apiFetch(`/entries/${entryId}`, {
        method: "DELETE",
      });

      await loadEntries(projectFilter, selectedYear);
    } catch (err) {
      alert(err.message || "Failed to delete entry.");
    }
  };

  const validateEntry = () => {
    if (!String(entryForm.activityDate || "").trim())
      return "Required: Activity Date";
    if (!String(entryForm.technologyPromoted || "").trim())
      return "Required: Technology Promoted";
    if (!String(entryForm.technologyGenerator || "").trim())
      return "Required: Technology Generator";
    if (
      !String(entryForm.modeOfPromotion || "").trim() ||
      entryForm.modeOfPromotion === MODE_ADD
    ) {
      return "Required: Mode of Promotion";
    }
    if (!String(entryForm.activityTitle || "").trim())
      return "Required: Activity Title";
    if (!String(entryForm.activityVenueAddress || "").trim())
      return "Required: Activity Venue/Address";
    if (!String(entryForm.customerName || "").trim())
      return "Required: Name of Customer/Participant";
    if (!String(entryForm.customerAddress || "").trim())
      return "Required: Customer/Participant Address";
    if (!String(entryForm.staffName || "").trim())
      return "Required: Name of Staff";
    return "";
  };

  const saveEntry = async () => {
    if (entryModal?.mode === "add" && !canAdd) return denyAccess("add entry");
    if (entryModal?.mode === "edit" && !canEdit) return denyAccess("edit entry");
    try {
      const err = validateEntry();
      if (err) return alert(err);

      const payload = {
        project: String(entryForm.project || "").trim(),
        activityDate: String(entryForm.activityDate || "").trim(),
        technologyPromoted: String(entryForm.technologyPromoted || "").trim(),
        technologyGenerator: String(
          entryForm.technologyGenerator || ""
        ).trim(),
        modeOfPromotion: String(entryForm.modeOfPromotion || "").trim(),
        activityTitle: String(entryForm.activityTitle || "").trim(),
        activityVenueAddress: String(
          entryForm.activityVenueAddress || ""
        ).trim(),
        activityVenueMeta: entryForm.activityVenueMeta || null,
        customerName: String(entryForm.customerName || "").trim(),
        customerAddress: String(entryForm.customerAddress || "").trim(),
        sex: String(entryForm.sex || "N/A").trim(),
        meansOfVerification: String(
          entryForm.meansOfVerification || ""
        ).trim(),
        staffName: String(entryForm.staffName || "").trim(),
        nameOfStaff: String(entryForm.staffName || "").trim(),
        custom_fields: entryForm.customFields || {},
        customFields: entryForm.customFields || {},
        photos: Array.isArray(entryForm.photos) ? entryForm.photos : [],
      };

      if (entryModal.mode === "add") {
        await apiFetch("/entries", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch(`/entries/${entryModal.entryId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      }

      const currentProjectValue = String(projectFilter);
      const payloadProjectValue = String(payload.project || "");

      const shouldStayOnFilter =
        currentProjectValue === "ALL" ||
        currentProjectValue === payloadProjectValue;

      if (!shouldStayOnFilter) {
        setProjectFilter("ALL");
      } else {
        await loadEntries(currentProjectValue, selectedYear);
      }

      setEntryModal(null);
      setVenueFlowOpen(false);
      resetEntryForm();
    } catch (err) {
      alert(err.message || "Failed to save Technology Promotion entry.");
    }
  };

  const extractLinks = (text) => {
    const t = String(text || "").trim();
    if (!t) return [];
    const matches = t.match(/https?:\/\/[^\s]+/gi) || [];
    return Array.from(new Set(matches));
  };
  const separateLinks = (text) =>
    String(text || "")
      .replace(/(https?:\/\/\S+)/gi, "\n$1")
      .replace(/\n{2,}/g, "\n")
      .trim();

  const openLinkMaybe = (text) => {
    const links = extractLinks(text);
    if (!links.length) return alert("No URL found in Means of Verification.");
    window.open(links[0], "_blank", "noopener,noreferrer");
  };

  const openSpecificLink = (url) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // =========================
  // Venue formatting
  // =========================
  const venueAddressText = (e) =>
    String(
      e?.activityVenueAddress || e?.activityVenueMeta?.displayText || ""
    ).trim() || "—";

  const venueCoordText = (e) => {
    const lat = e?.activityVenueMeta?.lat;
    const lng = e?.activityVenueMeta?.lng;
    const ok = Number.isFinite(lat) && Number.isFinite(lng);
    return ok ? `${lat}, ${lng}` : "—";
  };

  const photoCount = (e) => (Array.isArray(e?.photos) ? e.photos.length : 0);
  const entryLabel = (e) =>
    String(e?.activityTitle || "").trim() || "Technology Promotion Entry";

  const sourceLabel = (e) => {
    const sourceModule = String(e?.sourceModule || "").trim();
    const sourceType = String(e?.sourceType || "").trim();
    if (!sourceModule && !sourceType) return "";
    return [sourceModule, sourceType].filter(Boolean).join(" • ");
  };

  // =========================
  // Google map helpers
  // =========================
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

  // =========================
  // Address Flow Modal (Venue)
  // =========================
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

  function AddressFlowModal({ open, onClose, onSave, initialMeta }) {
    const [mode, setMode] = useState(initialMeta?.mode || "hierarchical");
    const [step, setStep] = useState(1);

    const [manualText, setManualText] = useState(initialMeta?.manualText || "");
    const [venueName, setVenueName] = useState(initialMeta?.venueName || "");
    const [coordinatesText, setCoordinatesText] = useState(() => Number.isFinite(initialMeta?.lat) && Number.isFinite(initialMeta?.lng) ? `${initialMeta.lat}, ${initialMeta.lng}` : "");

    const province = "Pangasinan";
    const [municipality, setMunicipality] = useState(
      initialMeta?.municipality || ""
    );
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

      setManualText(initialMeta?.manualText || "");
      setVenueName(initialMeta?.venueName || "");
      setCoordinatesText(Number.isFinite(initialMeta?.lat) && Number.isFinite(initialMeta?.lng) ? `${initialMeta.lat}, ${initialMeta.lng}` : "");
      setMunicipality(initialMeta?.municipality || "");
      setBarangay(initialMeta?.barangay || "");

      const lat = initialMeta?.lat;
      const lng = initialMeta?.lng;
      setCoords(
        Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
      );
      setCoordinatesText(Number.isFinite(lat) && Number.isFinite(lng) ? `${lat}, ${lng}` : "");

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
    }, [open, mode, municipality]);

    const filterList = (items) => {
      const q = (search || "").trim().toLowerCase();
      if (!q) return items;
      return items.filter((x) => {
        const name = typeof x === "string" ? x : String(x?.name || "");
        return name.toLowerCase().includes(q);
      });
    };

    const baseAddressText =
      mode === "manual"
        ? manualText.trim()
        : [barangay, municipality, province].filter(Boolean).join(", ");
    const displayText = [venueName.trim(), baseAddressText].filter(Boolean).join(", ");

    const canSave =
      mode === "manual"
        ? true
        : Boolean(municipality && barangay);

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
      if (!municipality || !barangay) {
        return alert("Please select Municipality and Barangay first.");
      }
      if (!coords) setCoords({ lat: 15.9167, lng: 120.3333 });
      setStep(3);
    };

    const applyCoordinateText = async () => {
      const raw = String(coordinatesText || "").trim();
      if (!raw) return;
      const parts = raw.split(/[ ,]+/).map(Number).filter((n) => Number.isFinite(n));
      if (parts.length < 2) return alert("Enter coordinates as latitude, longitude.");
      const nextCoords = { lat: parts[0], lng: parts[1] };
      setCoords(nextCoords);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${nextCoords.lat}&lon=${nextCoords.lng}`);
        const data = await res.json();
        if (data?.display_name) setManualText(data.display_name);
      } catch { }
    };

    const useMyLocation = () => {
      if (!navigator.geolocation) {
        return alert("Geolocation not supported in this browser.");
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const nextCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCoords(nextCoords);
          setCoordinatesText(`${nextCoords.lat}, ${nextCoords.lng}`);
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
            displayText,
            lat: coords?.lat || null,
            lng: coords?.lng || null,
          };

      onSave(meta);
      onClose();
    };

    if (!open) return null;

    return (
      <div style={{ ...styles.modalBackdrop, zIndex: 2200 }} onClick={onClose}>
        <div style={{ ...styles.flowShell, position: "relative", zIndex: 2201 }} onClick={(e) => e.stopPropagation()}>
          <div style={styles.modalHeader}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div>Add Activity Venue/Address</div>
              <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 800 }}>
                {breadcrumb}
              </div>
            </div>
            <button
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.6)",
                color: "white",
                borderRadius: 10,
                padding: "6px 10px",
                cursor: "pointer",
                fontWeight: 900,
                fontFamily,
              }}
              onClick={onClose}
            >
              ✕
            </button>
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

            <div style={styles.field}>
              <div style={styles.label}>Venue Name / Landmark</div>
              <input
                style={styles.input}
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="e.g. Riverside Convention Center"
              />
            </div>

            <div style={styles.field}>
              <div style={styles.label}>Coordinates</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  style={{ ...styles.input, flex: 1 }}
                  value={coordinatesText}
                  onChange={(e) => setCoordinatesText(e.target.value)}
                  placeholder="e.g. 15.9167, 120.3333"
                />
                <button type="button" style={styles.btnGhost} onClick={applyCoordinateText}>Use Coordinates</button>
              </div>
            </div>

            {mode === "manual" ? (
              <>
                <div style={styles.field}>
                  <div style={styles.label}>Type Venue/Address</div>
                  <textarea
                    style={styles.textarea}
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder="e.g. Venue/Building, Barangay, City/Municipality, Pangasinan"
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <button style={styles.btnGhost} onClick={back}>
                    Back
                  </button>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button style={styles.btnGhost} onClick={useMyLocation}>
                      Use My Location
                    </button>
                    <button
                      style={styles.btnDark}
                      onClick={save}
                      disabled={!canSave}
                    >
                      Save
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {step === 1 && (
                  <>
                    <div style={styles.field}>
                      <div style={styles.label}>Search Municipality/City</div>
                      <input
                        style={styles.input}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Type to search..."
                      />
                    </div>

                    <div style={styles.label}>
                      Select Municipality/City (Pangasinan)
                    </div>
                    <div style={styles.list}>
                      {filterList(PANGASINAN_LGUS).map((name) => {
                        const active = name === municipality;
                        return (
                          <button
                            key={name}
                            style={{
                              ...styles.listBtn,
                              ...(active ? styles.listBtnActive : null),
                            }}
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

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <button style={styles.btnGhost} onClick={onClose}>
                        Cancel
                      </button>
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <div style={styles.label}>
                      Municipality: <b>{municipality}</b>
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Search Barangay</div>
                      <input
                        style={styles.input}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={
                          barangayLoading
                            ? "Loading..."
                            : "Type to search barangays..."
                        }
                        disabled={barangayLoading}
                      />
                    </div>

                    {barangayLoading ? (
                      <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 800 }}>
                        Loading barangays...
                      </div>
                    ) : barangayError ? (
                      <div style={styles.warn}>
                        ⚠ {barangayError}
                        <div style={{ marginTop: 6, opacity: 0.9 }}>
                          Make sure file exists:{" "}
                          <span style={styles.mono}>
                            public/data/pangasinan_barangays.json
                          </span>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={styles.label}>Select Barangay</div>
                        <div style={styles.list}>
                          {filterList(barangayOptions).map((b) => {
                            const name = typeof b === "string" ? b : b.name;
                            const active = name === barangay;

                            return (
                              <button
                                key={name}
                                style={{
                                  ...styles.listBtn,
                                  ...(active ? styles.listBtnActive : null),
                                }}
                                onClick={() => {
                                  setBarangay(name);
                                  const lat =
                                    typeof b === "string" ? null : b.lat;
                                  const lng =
                                    typeof b === "string" ? null : b.lng;
                                  if (
                                    Number.isFinite(lat) &&
                                    Number.isFinite(lng)
                                  ) {
                                    setCoords({ lat, lng });
                                    setCoordinatesText(`${lat}, ${lng}`);
                                  } else {
                                    setCoords(null);
                                  }
                                }}
                              >
                                {name}
                              </button>
                            );
                          })}

                          {barangayOptions.length === 0 ? (
                            <div
                              style={{ padding: 10, fontSize: 12, opacity: 0.75 }}
                            >
                              No barangays found for this municipality in the JSON
                              file.
                            </div>
                          ) : null}
                        </div>
                      </>
                    )}

                    <div style={{ fontSize: 12, opacity: 0.75 }}>
                      Preview: <b>{displayText || "—"}</b>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <button style={styles.btnGhost} onClick={back}>
                        Back
                      </button>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          style={styles.btnGhost}
                          onClick={goToMap}
                          disabled={!canSave}
                        >
                          Pin on Map
                        </button>
                        <button
                          style={styles.btnDark}
                          onClick={save}
                          disabled={!canSave}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {step === 3 && (
                  <>
                    <div style={styles.label}>Click map or drag marker</div>

                    <div style={styles.mapBox}>
                      <MapContainer
                        center={[
                          coords?.lat || 15.9167,
                          coords?.lng || 120.3333,
                        ]}
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
                              attribution="Tiles &copy; Esri"
                              opacity={0.9}
                            />
                          </LayersControl.BaseLayer>
                        </LayersControl>

                        <FlyToCenter coords={coords} zoom={16} />
                        <ClickToMoveMarker onPick={(picked) => { setCoords(picked); setCoordinatesText(`${picked.lat}, ${picked.lng}`); }} />

                        {coords && (
                          <Marker
                            position={[coords.lat, coords.lng]}
                            draggable
                            eventHandlers={{
                              dragend: (e) => {
                                const p = e.target.getLatLng();
                                setCoords({ lat: p.lat, lng: p.lng });
                                setCoordinatesText(`${p.lat}, ${p.lng}`);
                              },
                            }}
                          />
                        )}
                      </MapContainer>
                    </div>

                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      <div>
                        <b>Selected:</b> {displayText}
                      </div>
                      <div>
                        <b>Coordinates:</b>{" "}
                        {coords ? `${coords.lat}, ${coords.lng}` : "—"}
                      </div>
                      {!coords ? (
                        <div style={{ marginTop: 4, opacity: 0.85 }}>
                          * This barangay has no coords in JSON. Please click the
                          map to set a pin.
                        </div>
                      ) : null}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <button style={styles.btnGhost} onClick={back}>
                        Back
                      </button>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button style={styles.btnGhost} onClick={useMyLocation}>
                          Use My Location
                        </button>
                        <button
                          style={styles.btnDark}
                          onClick={save}
                          disabled={!canSave}
                        >
                          Save
                        </button>
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

  const applyVenueMetaToEntryForm = (meta) => {
    setEntryForm((prev) => ({
      ...prev,
      activityVenueMeta: meta || null,
      activityVenueAddress: meta?.displayText || "",
    }));
  };

  // =========================
  // Map dashboard
  // =========================
  const [outlineGeo, setOutlineGeo] = useState(null);
  const [municipalGeo, setMunicipalGeo] = useState(null);
  const [geoError, setGeoError] = useState("");

  const [borderMode, setBorderMode] = useState("municipality");
  const [selectedMunicipality, setSelectedMunicipality] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setGeoError("");
      try {
        const [oRes, mRes] = await Promise.all([
          fetch("/geo/pangasinan_outline.geojson"),
          fetch("/geo/pangasinan_municipalities.geojson"),
        ]);

        if (!oRes.ok) {
          throw new Error("Missing /geo/pangasinan_outline.geojson");
        }
        if (!mRes.ok) {
          throw new Error("Missing /geo/pangasinan_municipalities.geojson");
        }

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
    [PANGASINAN_DISTRICTS]
  );

  const selectedDistrictSet = useMemo(() => {
    const d = PANGASINAN_DISTRICTS.find((x) => x.id === selectedDistrict);
    return new Set(d?.municipalities || []);
  }, [PANGASINAN_DISTRICTS, selectedDistrict]);

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

  const allPinnedEntries = useMemo(
    () =>
      currentPageEntries.filter(
        (e) =>
          Number.isFinite(e?.activityVenueMeta?.lat) &&
          Number.isFinite(e?.activityVenueMeta?.lng)
      ),
    [currentPageEntries]
  );

  const getEntryMunicipality = (e) => {
    const m = e?.activityVenueMeta?.municipality;
    if (m) return String(m).trim();

    const addr = venueAddressText(e);
    if (!addr || addr === "—") return "";
    const parts = addr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length >= 2) return parts[parts.length - 2];
    return "";
  };

  const visiblePinnedEntries = useMemo(() => {
    let arr = allPinnedEntries;

    if (borderMode === "municipality") {
      if (!selectedMunicipality) return arr;
      return arr.filter(
        (e) => getEntryMunicipality(e) === selectedMunicipality
      );
    }

    if (!selectedDistrict) return arr;
    return arr.filter((e) =>
      selectedDistrictSet.has(getEntryMunicipality(e))
    );
  }, [
    allPinnedEntries,
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
      if (rings.length > 0) {
        holes.push(rings[0].map(([lng, lat]) => [lat, lng]));
      }
    } else if (geom.type === "MultiPolygon") {
      (geom.coordinates || []).forEach((poly) => {
        const rings = poly || [];
        if (rings.length > 0) {
          holes.push(rings[0].map(([lng, lat]) => [lat, lng]));
        }
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
      map.setMaxZoom(18);

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

  // =========================
  // Venue View modal
  // =========================
  function VenueViewModal({ entry, onClose }) {
    if (!entry) return null;
    const addr = venueAddressText(entry);
    const coords = venueCoordText(entry);
    const lat = entry?.activityVenueMeta?.lat;
    const lng = entry?.activityVenueMeta?.lng;
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

    return (
      <div style={{ ...styles.modalBackdrop, zIndex: 3200 }} onClick={onClose}>
        <div
          style={{ ...styles.modal, width: "min(720px, 100%)", position: "relative", zIndex: 3201 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={styles.modalHeader}>
            <div>View Address — {entryLabel(entry)}</div>
            <button
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.6)",
                color: "white",
                borderRadius: 10,
                padding: "6px 10px",
                cursor: "pointer",
                fontWeight: 900,
                fontFamily,
              }}
              onClick={onClose}
            >
              ✕
            </button>
          </div>

          <div style={styles.modalBody}>
            <div style={{ display: "grid", gap: 8, fontSize: 14 }}>
              <div>
                <b>Address:</b> {addr}
              </div>
              <div>
                <b>Coordinates:</b> {coords}
              </div>

              {hasCoords ? (
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    marginTop: 6,
                  }}
                >
                  <button
                    style={styles.tinyBtn}
                    onClick={() => openGoogleMap(lat, lng)}
                  >
                    Map
                  </button>
                  <button
                    style={styles.tinyBtn}
                    onClick={() => openGoogleDirections(lat, lng)}
                  >
                    Directions
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div style={styles.modalFooter}>
            <button style={styles.btnDark} onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================
  // RENDER
  // =========================
  const modalIsOpen =
    entryModal ||
    modeModalOpen ||
    projectModalOpen ||
    venueFlowOpen ||
    viewEntryId ||
    venueViewEntryId ||
    photoViewer ||
    printModal.open ||
    exportModal.open;

  return (
    <div
      style={styles.page}
      className={modalIsOpen ? "tp-page modal-open" : "tp-page"}
    >
      <style>{`
        .tp-page.modal-open .leaflet-control-container,
        .tp-page.modal-open .leaflet-top,
        .tp-page.modal-open .leaflet-bottom,
        .tp-page.modal-open .leaflet-pane,
        .tp-page.modal-open .leaflet-control-zoom {
          z-index: 0 !important;
        }
      `}</style>

      <div style={styles.titleBar}>
        <div>TECHNOLOGY PROMOTION</div>
        <div
          style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}
        >
          <div
            style={{
              fontSize: 12,
              opacity: 0.95,
              fontWeight: 800,
              fontFamily,
            }}
          >
            Same style as SETUP / CEST / SSCP
          </div>
          {loading ? <span style={styles.pill}>Loading...</span> : null}
        </div>
      </div>

      {/* MAP DASHBOARD */}
      <div style={styles.mapCard}>
        <div style={styles.mapHeader}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, width: "100%" }}>
            <div style={styles.mapTitle}>
              PANGASINAN MAP — Technology Promotion (Pinned Venues)
            </div>
            <div style={styles.mapSub}>
              Pins shown: <b>{visiblePinnedEntries.length}</b> /{" "}
              {allPinnedEntries.length}
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
            attributionControl={false}
            style={{ height: "100%", width: "100%" }}
            zoomControl
          >
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Default (OSM)">
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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

            {visiblePinnedEntries.map((e) => (
              <Marker
                key={e.id}
                position={[e.activityVenueMeta.lat, e.activityVenueMeta.lng]}
                pane="pinPane"
              >
                <Popup>
                  <div style={{ minWidth: 260, fontFamily }}>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>
                      {e.activityTitle || "—"}
                    </div>
                    <div style={{ fontSize: 12, marginBottom: 6 }}>
                      <b>Date:</b> {formatDateDisplay(e.activityDate)}
                      <br />
                      <b>Technology:</b> {e.technologyPromoted || "—"}
                      <br />
                      <b>Mode:</b> {e.modeOfPromotion || "—"}
                    </div>

                    <div style={{ fontSize: 12, marginBottom: 8 }}>
                      <b>Address:</b> {venueAddressText(e)}
                      <br />
                      <b>Coordinates:</b> {venueCoordText(e)}
                    </div>

                    {sourceLabel(e) ? (
                      <div style={styles.sourcePill}>From {sourceLabel(e)}</div>
                    ) : null}

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                      <button
                        style={styles.tinyBtn}
                        onClick={() => setVenueViewEntryId(e.id)}
                      >
                        View
                      </button>
                      <button
                        style={styles.tinyBtn}
                        onClick={() =>
                          openGoogleMap(
                            e.activityVenueMeta.lat,
                            e.activityVenueMeta.lng
                          )
                        }
                      >
                        Map
                      </button>
                      <button
                        style={styles.tinyBtn}
                        onClick={() =>
                          openGoogleDirections(
                            e.activityVenueMeta.lat,
                            e.activityVenueMeta.lng
                          )
                        }
                      >
                        Directions
                      </button>
                      <button
                        style={styles.tinyBtn}
                        onClick={() => setViewEntryId(e.id)}
                      >
                        Full Details
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* HEADER + FILTER + ADD */}
      <div style={styles.sectionTitleRow}>
        <div style={styles.sectionTitle}>
          TECHNOLOGY PROMOTED — {selectedYear === "ALL" ? "All Years" : `CY ${selectedYear}`}
          <span style={{ marginLeft: 8, fontSize: 11, color: "#475569", fontWeight: 900 }}>
            Showing {currentPageEntries.length} of {searchedEntries.length} / {searchedEntries.length}
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
                  width: 190,
                  minWidth: 190,
                  maxWidth: 190,
                  flex: "0 0 190px",
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
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                <option value="ALL">All Years</option>
                {yearOptions
                  .filter((year) => year !== "ALL")
                  .map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
              </select>

              <select
                style={styles.toolbarSelect}
                value={selectedDistrictFilter}
                onChange={(e) => setSelectedDistrictFilter(e.target.value)}
              >
                <option value="ALL">All Districts</option>
                {PANGASINAN_DISTRICTS.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.id}
                  </option>
                ))}
              </select>

              <select
                style={styles.toolbarSelect}
                value={selectedMonthFilter}
                onChange={(e) => setSelectedMonthFilter(e.target.value)}
              >
                <option value="ALL">All Months</option>
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>

              <select
                style={styles.toolbarSelect}
                value={selectedMunicipalityFilter}
                onChange={(e) => setSelectedMunicipalityFilter(e.target.value)}
              >
                <option value="ALL">All Municipalities</option>
                {municipalityFilterOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                style={styles.toolbarSelect}
                value={selectedViewFilter}
                onChange={(e) => setSelectedViewFilter(e.target.value)}
              >
                <option value="OVERALL">Overall</option>
                <option value="MANUAL">Manual</option>
                <option value="SYNCED">Synced</option>
              </select>

              <button
                type="button"
                style={styles.toolbarBtn}
                onClick={clearToolbarFilters}
              >
                Clear Filters
              </button>

              {canExport ? (
                <button
                  type="button"
                  style={styles.toolbarBtn}
                  onClick={openExportPopupBulk}
                >
                  Export
                </button>
              ) : null}

              {canExport ? (
                <button
                  type="button"
                  style={styles.btnDark}
                  onClick={openPrintPopupBulk}
                >
                  Print
                </button>
              ) : null}

              {canAdd ? (
                <button
                  type="button"
                  style={styles.toolbarAddBtn}
                  onClick={openAddEntry}
                >
                  + Add Entry
                </button>
              ) : null}
            </div>

          </div>
        </div>
      </div>

      {/* MAIN TABLE */}
      <div style={styles.tableWrap}>
        <table style={{ ...styles.table, minWidth: 1650 }}>
          <colgroup>
            <col style={{ width: "9%" }} />
            <col style={{ width: "4%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
          </colgroup>

          <thead>
            <tr>
              <th style={styles.th}>ACTIVITY DATE</th>
              <th style={styles.th}>NO.</th>
              <th style={styles.th}>TECHNOLOGY PROMOTED</th>
              <th style={styles.th}>TECHNOLOGY GENERATOR</th>
              <th style={styles.th}>MODE OF PROMOTION</th>
              <th style={styles.th}>ACTIVITY TITLE</th>
              <th style={styles.th}>ACTIVITY VENUE/ADDRESS</th>
              <th style={styles.th}>NAME OF CUSTOMER/PARTICIPANT</th>
              <th style={styles.th}>CUSTOMER/PARTICIPANT ADDRESS</th>
              <th style={styles.th}>ACTIONS</th>
            </tr>
          </thead>

          <tbody>
            {searchedEntries.length === 0 ? (
              <tr>
                <td style={styles.tdCenter} colSpan={10}>
                  Wala pang entries
                  {projectFilter !== "ALL"
                    ? ` for project "${projectFilter || "(No Project)"}"`
                    : ""}
                  . Click “Add Entry”.
                </td>
              </tr>
            ) : (
              currentPageEntries.map((e, i) => {
                const lat = e?.activityVenueMeta?.lat;
                const lng = e?.activityVenueMeta?.lng;
                const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

                return (
                  <tr key={e.id}>
                    <td style={styles.tdCenter}>
                      {formatDateDisplay(e.activityDate)}
                    </td>
                    <td style={styles.tdCenter}>{pageStart + i}</td>
                    <td style={styles.td}>
                      <div>{e.technologyPromoted || "—"}</div>
                      {sourceLabel(e) ? (
                        <div style={styles.sourcePill}>From {sourceLabel(e)}</div>
                      ) : null}
                    </td>
                    <td style={styles.td}>{e.technologyGenerator || "—"}</td>
                    <td style={styles.td}>{e.modeOfPromotion || "—"}</td>
                    <td style={styles.td}>{e.activityTitle || "—"}</td>

                    <td style={styles.td}>
                      <div style={{ display: "grid", gap: 8 }}>
                        <div style={{ fontSize: 12 }}>{venueAddressText(e)}</div>

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            style={styles.tinyBtn}
                            onClick={() => setVenueViewEntryId(e.id)}
                          >
                            View
                          </button>

                          {hasCoords ? (
                            <>
                              <button
                                style={styles.tinyBtn}
                                onClick={() => openGoogleMap(lat, lng)}
                              >
                                Map
                              </button>
                              <button
                                style={styles.tinyBtn}
                                onClick={() => openGoogleDirections(lat, lng)}
                              >
                                Directions
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    <td style={styles.td}>{e.customerName || "—"}</td>
                    <td style={styles.td}>{e.customerAddress || "—"}</td>

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
                          style={styles.tinyBtn}
                          onClick={() => setViewEntryId(e.id)}
                        >
                          View
                        </button>
                        {canExport ? (
                          <button
                            style={styles.tinyBtn}
                            onClick={() => openPrintPopupRow(e.id)}
                          >
                            Print
                          </button>
                        ) : null}
                        {canExport ? (
                          <button
                            style={styles.tinyBtn}
                            onClick={() => openExportPopupRow(e.id)}
                          >
                            Export
                          </button>
                        ) : null}
                        {canEdit ? (
                          <button
                            style={styles.tinyBtn}
                            onClick={() => openEditEntry(e.id)}
                          >
                            Edit
                          </button>
                        ) : null}
                        {canDelete ? (
                          <button
                            style={styles.dangerTiny}
                            onClick={() => deleteEntry(e.id)}
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

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
              onClick={() => setCurrentPage((prev) => Math.max(1, pageWindowStart - PAGE_WINDOW_SIZE))}
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
              disabled={false}
              onClick={() => setCurrentPage((prev) => pageWindowStart + PAGE_WINDOW_SIZE)}
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

      {/* Venue quick view modal */}
      {venueViewEntryId && (
        <VenueViewModal
          entry={venueViewEntry}
          onClose={() => setVenueViewEntryId(null)}
        />
      )}

      {/* ENTRY MODAL */}
      {entryModal && (
        <div style={{ ...styles.modalBackdrop, zIndex: 1000 }} onClick={() => setEntryModal(null)}>
          <div style={styles.modal} onClick={(ev) => ev.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                {entryModal.mode === "edit" ? "Edit" : "Add"} Technology Promoted
                Entry
              </div>
              <button
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.6)",
                  color: "white",
                  borderRadius: 10,
                  padding: "6px 10px",
                  cursor: "pointer",
                  fontWeight: 900,
                  fontFamily,
                }}
                onClick={() => setEntryModal(null)}
              >
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <div
                style={{
                  fontSize: 12,
                  opacity: 0.8,
                  fontWeight: 900,
                  marginBottom: 10,
                }}
              >
                Fields with <span style={styles.required}>*</span> are required.
                (Project is optional.)
              </div>

              <div style={styles.grid}>
                <div style={styles.field}>
                  <div style={styles.label}>Project (optional)</div>
                  <select
                    style={styles.input}
                    value={entryForm.project}
                    onChange={(e) => handleProjectChange(e.target.value)}
                  >
                    <option value="">(None)</option>
                    {projectOptions.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                    {canAdd ? <option value={PROJECT_ADD}>+ Add project...</option> : null}
                  </select>
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>
                    Activity Date <span style={styles.required}>*</span>
                  </div>
                  <input
                    style={styles.input}
                    type="date"
                    value={entryForm.activityDate}
                    onChange={(e) =>
                      setEntryForm({
                        ...entryForm,
                        activityDate: e.target.value,
                      })
                    }
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>
                    Technology Promoted <span style={styles.required}>*</span>
                  </div>
                  <input
                    style={styles.input}
                    value={entryForm.technologyPromoted}
                    onChange={(e) =>
                      setEntryForm({
                        ...entryForm,
                        technologyPromoted: e.target.value,
                      })
                    }
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>
                    Technology Generator{" "}
                    <span style={styles.required}>*</span>
                  </div>
                  <input
                    style={styles.input}
                    value={entryForm.technologyGenerator}
                    onChange={(e) =>
                      setEntryForm({
                        ...entryForm,
                        technologyGenerator: e.target.value,
                      })
                    }
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>
                    Mode of Promotion <span style={styles.required}>*</span>
                  </div>
                  <select
                    style={styles.input}
                    value={entryForm.modeOfPromotion}
                    onChange={(e) => handleModeChange(e.target.value)}
                  >
                    {modeOptions.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                    {canAdd ? <option value={MODE_ADD}>+ Add mode of promotion...</option> : null}
                  </select>
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>
                    Activity Title <span style={styles.required}>*</span>
                  </div>
                  <input
                    style={styles.input}
                    value={entryForm.activityTitle}
                    onChange={(e) =>
                      setEntryForm({
                        ...entryForm,
                        activityTitle: e.target.value,
                      })
                    }
                  />
                </div>

                <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                  <div style={styles.label}>
                    Activity Venue/Address{" "}
                    <span style={styles.required}>*</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setVenueFlowOpen(true)}
                    style={styles.inputButton(
                      Boolean(entryForm.activityVenueAddress)
                    )}
                  >
                    <span
                      style={{
                        opacity: entryForm.activityVenueAddress ? 1 : 0.6,
                      }}
                    >
                      {entryForm.activityVenueAddress ||
                        "Click to select activity venue/address"}
                    </span>
                    <span style={{ fontSize: 11, opacity: 0.65 }}>
                      {entryForm.activityVenueAddress ? "Change" : "Select"}
                    </span>
                  </button>

                  {Number.isFinite(entryForm.activityVenueMeta?.lat) &&
                    Number.isFinite(entryForm.activityVenueMeta?.lng) ? (
                    <div style={{ fontSize: 12, opacity: 0.85 }}>
                      <b>Coordinates:</b> {entryForm.activityVenueMeta.lat},{" "}
                      {entryForm.activityVenueMeta.lng}
                    </div>
                  ) : null}
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>
                    Name of Customer/Participant{" "}
                    <span style={styles.required}>*</span>
                  </div>
                  <input
                    style={styles.input}
                    value={entryForm.customerName}
                    onChange={(e) =>
                      setEntryForm({
                        ...entryForm,
                        customerName: e.target.value,
                      })
                    }
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>
                    Customer/Participant Address{" "}
                    <span style={styles.required}>*</span>
                  </div>
                  <input
                    style={styles.input}
                    value={entryForm.customerAddress}
                    onChange={(e) =>
                      setEntryForm({
                        ...entryForm,
                        customerAddress: e.target.value,
                      })
                    }
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Sex (M/F)</div>
                  <select
                    style={styles.input}
                    value={entryForm.sex}
                    onChange={(e) =>
                      setEntryForm({ ...entryForm, sex: e.target.value })
                    }
                  >
                    <option value="N/A">N/A</option>
                    <option value="M">M</option>
                    <option value="F">F</option>
                  </select>
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>
                    Name of Staff <span style={styles.required}>*</span>
                  </div>
                  <input
                    style={styles.input}
                    value={entryForm.staffName}
                    onChange={(e) =>
                      setEntryForm({
                        ...entryForm,
                        staffName: e.target.value,
                      })
                    }
                  />
                </div>

                {renderTechPromoCustomInputs()}

                <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                  <div style={styles.label}>Means of Verification</div>
                  <textarea
                    style={styles.textarea}
                    value={entryForm.meansOfVerification}
                    onChange={(e) =>
                      setEntryForm({
                        ...entryForm,
                        meansOfVerification: e.target.value,
                      })
                    }
                    placeholder="Attendance sheet / links to socmed posts / activity reports / photos..."
                  />

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <button
                      type="button"
                      style={styles.tinyBtn}
                      onClick={() =>
                        openLinkMaybe(entryForm.meansOfVerification)
                      }
                    >
                      View First Link
                    </button>

                    <button
                      type="button"
                      style={styles.tinyBtn}
                      onClick={triggerAddPhotos}
                    >
                      Add Photos
                    </button>

                    <span style={styles.pill}>
                      Photos: {photoCount(entryForm)}
                    </span>
                  </div>

                  {extractLinks(entryForm.meansOfVerification).length > 0 ? (
                    <div
                      style={{
                        marginTop: 8,
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      {extractLinks(entryForm.meansOfVerification).map((url, idx) => (
                        <button
                          key={`${url}_${idx}`}
                          type="button"
                          style={styles.linkChip}
                          onClick={() => openSpecificLink(url)}
                          title={url}
                        >
                          Link {idx + 1}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: "none" }}
                    onChange={(e) => onPickPhotos(e.target.files)}
                  />

                  {Array.isArray(entryForm.photos) &&
                    entryForm.photos.length > 0 ? (
                    <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                      {entryForm.photos.map((p, idx) => (
                        <div
                          key={`${p.name || "photo"}_${idx}`}
                          style={{
                            display: "flex",
                            gap: 10,
                            alignItems: "center",
                            border: "1px solid #e2e8f0",
                            borderRadius: 10,
                            padding: 8,
                          }}
                        >
                          <img
                            src={p.dataUrl || p.url}
                            alt={p.name || `Photo ${idx + 1}`}
                            style={styles.photoThumb}
                            onClick={() => {
                              setPhotoViewer({
                                photos: entryForm.photos,
                                title: `Photos — ${entryForm.activityTitle || "Technology Promotion Entry"}`,
                              });
                              setPhotoIndex(idx);
                            }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontWeight: 900,
                                fontSize: 12,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {p.name || `Photo ${idx + 1}`}
                            </div>
                            <div
                              style={{
                                fontSize: 11,
                                opacity: 0.75,
                                fontWeight: 900,
                              }}
                            >
                              {p.type || "image"}
                            </div>
                          </div>
                          <button
                            type="button"
                            style={styles.dangerTiny}
                            onClick={() => removePhotoAt(idx)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button
                style={styles.btnGhost}
                onClick={() => setEntryModal(null)}
              >
                Cancel
              </button>
              {((entryModal.mode === "add" && canAdd) || (entryModal.mode === "edit" && canEdit)) ? (
                <button style={styles.btnDark} onClick={saveEntry}>
                  {entryModal.mode === "edit" ? "Update" : "Save"}
                </button>
              ) : null}
            </div>
          </div>

          <AddressFlowModal
            open={venueFlowOpen}
            onClose={() => setVenueFlowOpen(false)}
            onSave={applyVenueMetaToEntryForm}
            initialMeta={entryForm.activityVenueMeta}
          />
        </div>
      )}

      {/* ADD MODE MODAL */}
      {modeModalOpen && (
        <div
          style={styles.modalBackdrop}
          onClick={() => setModeModalOpen(false)}
        >
          <div
            style={{ ...styles.modal, width: "min(560px, 100%)" }}
            onClick={(ev) => ev.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <div>Add Mode of Promotion</div>
              <button
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.6)",
                  color: "white",
                  borderRadius: 10,
                  padding: "6px 10px",
                  cursor: "pointer",
                  fontWeight: 900,
                  fontFamily,
                }}
                onClick={() => setModeModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.field}>
                <div style={styles.label}>New mode name</div>
                <input
                  style={styles.input}
                  value={newModeName}
                  onChange={(e) => setNewModeName(e.target.value)}
                  placeholder='e.g., "Radio Guesting"'
                />
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button
                style={styles.btnGhost}
                onClick={() => setModeModalOpen(false)}
              >
                Cancel
              </button>
              {canAdd ? (
                <button style={styles.btnDark} onClick={commitAddMode}>
                  Add
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ADD PROJECT MODAL */}
      {projectModalOpen && (
        <div
          style={styles.modalBackdrop}
          onClick={() => setProjectModalOpen(false)}
        >
          <div
            style={{ ...styles.modal, width: "min(560px, 100%)" }}
            onClick={(ev) => ev.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <div>Add Project</div>
              <button
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.6)",
                  color: "white",
                  borderRadius: 10,
                  padding: "6px 10px",
                  cursor: "pointer",
                  fontWeight: 900,
                  fontFamily,
                }}
                onClick={() => setProjectModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.field}>
                <div style={styles.label}>New project name</div>
                <input
                  style={styles.input}
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder='e.g., "GIA Program"'
                />
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button
                style={styles.btnGhost}
                onClick={() => setProjectModalOpen(false)}
              >
                Cancel
              </button>
              {canAdd ? (
                <button style={styles.btnDark} onClick={commitAddProject}>
                  Add
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* VIEW ENTRY MODAL */}
      {viewEntryId && viewEntry && (
        <div style={{ ...styles.modalBackdrop, zIndex: 1500 }} onClick={() => setViewEntryId(null)}>
          <div
            style={{ ...styles.modal, width: "min(980px, 100%)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <div>View Entry</div>
              <button
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.6)",
                  color: "white",
                  borderRadius: 10,
                  padding: "6px 10px",
                  cursor: "pointer",
                  fontWeight: 900,
                  fontFamily,
                }}
                onClick={() => setViewEntryId(null)}
              >
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.viewSectionTitle}>
                Technology Promotion Information
              </div>

              <div style={styles.viewGrid2}>
                <div style={styles.viewInfoBlock}>
                  <div>
                    <div style={styles.viewLabel}>Project</div>
                    <div style={styles.viewValue}>
                      {String(viewEntry.project || viewEntry.projectName || "").trim() || "—"}
                    </div>
                  </div>

                  <div>
                    <div style={styles.viewLabel}>Activity Date</div>
                    <div style={styles.viewValue}>
                      {formatDateDisplay(viewEntry.activityDate)}
                    </div>
                  </div>

                  <div>
                    <div style={styles.viewLabel}>Technology Promoted</div>
                    <div style={styles.viewValue}>
                      {viewEntry.technologyPromoted || "—"}
                    </div>
                  </div>

                  <div>
                    <div style={styles.viewLabel}>Mode of Promotion</div>
                    <div style={styles.viewValue}>
                      {viewEntry.modeOfPromotion || "—"}
                    </div>
                  </div>

                  <div>
                    <div style={styles.viewLabel}>Activity Title</div>
                    <div style={styles.viewValue}>
                      {viewEntry.activityTitle || "—"}
                    </div>
                  </div>

                  <div>
                    <div style={styles.viewLabel}>Customer / Participant Name</div>
                    <div style={styles.viewValue}>
                      {viewEntry.customerName || "—"}
                    </div>
                  </div>

                  <div>
                    <div style={styles.viewLabel}>Customer / Participant Address</div>
                    <div style={styles.viewValue}>
                      {viewEntry.customerAddress || "—"}
                    </div>
                  </div>
                </div>

                <div style={styles.viewInfoBlock}>
                  <div>
                    <div style={styles.viewLabel}>Technology Generator</div>
                    <div style={styles.viewValue}>
                      {viewEntry.technologyGenerator || "—"}
                    </div>
                  </div>

                  <div>
                    <div style={styles.viewLabel}>Sex</div>
                    <div style={styles.viewValue}>{viewEntry.sex || "—"}</div>
                  </div>

                  <div>
                    <div style={styles.viewLabel}>Name of Staff</div>
                    <div style={styles.viewValue}>
                      {viewEntry.staffName || viewEntry.nameOfStaff || "—"}
                    </div>
                  </div>

                  {renderTechPromoCustomViewFields(viewEntry)}

                  <div>
                    <div style={styles.viewLabel}>Coordinates</div>
                    <div style={styles.viewValue}>{venueCoordText(viewEntry)}</div>
                  </div>

                  <div>
                    <div style={styles.viewLabel}>Photos</div>
                    <div style={styles.viewValue}>{photoCount(viewEntry)}</div>
                  </div>

                  <div>
                    <div style={styles.viewLabel}>Source</div>
                    <div style={styles.viewValue}>{sourceLabel(viewEntry) || "—"}</div>
                  </div>
                </div>
              </div>

              <div style={styles.divider} />

              <div>
                <div style={styles.viewLabel}>Address</div>
                <div
                  style={{
                    ...styles.viewBox,
                    display: "block",
                    minHeight: "unset",
                  }}
                >
                  <div>{venueAddressText(viewEntry)}</div>
                  <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                    <b>Coordinates:</b> {venueCoordText(viewEntry)}
                  </div>
                </div>

                {Number.isFinite(viewEntry?.activityVenueMeta?.lat) &&
                  Number.isFinite(viewEntry?.activityVenueMeta?.lng) ? (
                  <div
                    style={{
                      marginTop: 10,
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      style={styles.tinyBtn}
                      onClick={() =>
                        openGoogleMap(
                          viewEntry.activityVenueMeta.lat,
                          viewEntry.activityVenueMeta.lng
                        )
                      }
                    >
                      Map
                    </button>
                    <button
                      style={styles.tinyBtn}
                      onClick={() =>
                        openGoogleDirections(
                          viewEntry.activityVenueMeta.lat,
                          viewEntry.activityVenueMeta.lng
                        )
                      }
                    >
                      Directions
                    </button>
                  </div>
                ) : null}
              </div>

              <div style={styles.divider} />

              <div style={{ display: "grid", gap: 10 }}>
                <div>
                  <div style={styles.viewLabel}>Means of Verification</div>
                  <div
                    style={{
                      ...styles.viewBox,
                      display: "block",
                      minHeight: "unset",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {separateLinks(viewEntry.meansOfVerification) || "—"}
                  </div>
                </div>

                <div>
                  <div style={styles.viewLabel}>Links</div>
                  <div
                    style={{
                      ...styles.viewBox,
                      display: "block",
                      minHeight: "unset",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {extractLinks(viewEntry.meansOfVerification).length > 0 ? (
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        {extractLinks(viewEntry.meansOfVerification).map((url, idx) => (
                          <button
                            key={`${url}_${idx}`}
                            style={styles.linkChip}
                            onClick={() => openSpecificLink(url)}
                            title={url}
                          >
                            Link {idx + 1}
                          </button>
                        ))}
                      </div>
                    ) : (
                      "—"
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <button
                    style={styles.tinyBtn}
                    onClick={() => openLinkMaybe(viewEntry.meansOfVerification)}
                  >
                    View First Link
                  </button>

                  <span style={styles.pill}>Photos: {photoCount(viewEntry)}</span>

                  {photoCount(viewEntry) ? (
                    <button
                      style={styles.tinyBtn}
                      onClick={() =>
                        openPhotos(
                          viewEntry.photos,
                          `Photos — ${entryLabel(viewEntry)}`
                        )
                      }
                    >
                      View Photos
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button
                style={styles.btnGhost}
                onClick={() => setViewEntryId(null)}
              >
                Close
              </button>
              {canEdit ? (
                <button
                  style={styles.btnDark}
                  onClick={() => {
                    setViewEntryId(null);
                    openEditEntry(viewEntry.id);
                  }}
                >
                  Edit
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* PHOTO VIEWER MODAL */}
      {photoViewer && (
        <div
          style={{ ...styles.modalBackdrop, zIndex: 4000 }}
          onClick={() => setPhotoViewer(null)}
        >
          <div
            style={{ ...styles.modal, width: "min(980px, 100%)" }}
            onClick={(ev) => ev.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <div>
                {photoViewer.title} — {photoIndex + 1}/
                {photoViewer.photos.length}
              </div>
              <button
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.6)",
                  color: "white",
                  borderRadius: 10,
                  padding: "6px 10px",
                  cursor: "pointer",
                  fontWeight: 900,
                  fontFamily,
                }}
                onClick={() => setPhotoViewer(null)}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <img
                  src={photoViewer.photos[photoIndex].dataUrl || photoViewer.photos[photoIndex].url}
                  alt={photoViewer.photos[photoIndex].name || `Photo ${photoIndex + 1}`}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "60vh",
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                  }}
                />
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 8,
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                <button type="button" style={styles.tinyBtn} onClick={prevPhoto}>
                  ◀ Prev
                </button>
                <button type="button" style={styles.tinyBtn} onClick={nextPhoto}>
                  Next ▶
                </button>
              </div>

              <div
                style={{
                  marginTop: 10,
                  fontSize: 12,
                  fontWeight: 900,
                  opacity: 0.85,
                  textAlign: "center",
                }}
              >
                {photoViewer.photos[photoIndex].name || `Photo ${photoIndex + 1}`}
              </div>
            </div>
          </div>
        </div>
      )}

      {printModal.open && (
        <div style={{ ...styles.modalBackdrop, alignItems: "center", justifyContent: "center", zIndex: 3600 }} onClick={() => setPrintModal((p) => ({ ...p, open: false }))}>
          <div style={{ ...styles.modal, width: "min(720px, 100%)", marginTop: 0, position: "relative", zIndex: 3601 }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>{printModal.scope === "row" ? "Print (This Row)" : "Print (Filtered Rows)"}</div>
              <button style={styles.closeX} onClick={() => setPrintModal((p) => ({ ...p, open: false }))}>✕</button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.grid}>
                <div style={styles.field}>
                  <div style={styles.label}>Layout</div>
                  <select style={styles.input} value={printModal.layout} onChange={(e) => setPrintModal((p) => ({ ...p, layout: e.target.value }))}>
                    <option value="FORM">Form-Based</option>
                    <option value="TABLE">Table</option>
                    <option value="COMPACT">Compact</option>
                  </select>
                </div>
                <div style={styles.field}>
                  <div style={styles.label}>Orientation</div>
                  <select style={styles.input} value={printModal.orientation} onChange={(e) => setPrintModal((p) => ({ ...p, orientation: e.target.value }))}>
                    <option value="landscape">Landscape</option>
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
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.btnGhost} onClick={() => setPrintModal((p) => ({ ...p, open: false }))}>Cancel</button>
              <button style={styles.btnDark} onClick={confirmPrint}>Print Now</button>
            </div>
          </div>
        </div>
      )}

      {exportModal.open && (
        <div style={{ ...styles.modalBackdrop, alignItems: "center", justifyContent: "center", zIndex: 3600 }} onClick={() => setExportModal((p) => ({ ...p, open: false }))}>
          <div style={{ ...styles.modal, width: "min(720px, 100%)", marginTop: 0, position: "relative", zIndex: 3601 }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>{exportModal.scope === "row" ? "Export (This Row)" : "Export (Filtered Rows)"}</div>
              <button style={styles.closeX} onClick={() => setExportModal((p) => ({ ...p, open: false }))}>✕</button>
            </div>
            <div style={styles.modalBody}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["excel", "csv", "pdf", "docx"].map((format) => (
                  <button key={format} type="button" style={exportModal.format === format ? styles.btnDark : styles.btnGhost} onClick={() => setExportModal((p) => ({ ...p, format }))}>
                    {format.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.btnGhost} onClick={() => setExportModal((p) => ({ ...p, open: false }))}>Cancel</button>
              <button style={styles.btnDark} onClick={confirmExport}>Export Now</button>
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
              <span>{deleteConfirmState.title || "Confirm Delete"}</span>
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
                Are you sure you want to continue?
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
                {deleteConfirmState.confirmText || "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

