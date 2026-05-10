import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Database,
  Layers3,
  CheckCircle2,
  Filter,
  Activity,
  AlertCircle,
  Table2,
  ArrowUpDown,
} from "lucide-react";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  GeoJSON,
  LayersControl,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
} from "react-leaflet";
import API_BASE from "../api";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function createCircleIcon(color) {
  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative; width:18px; height:18px;">
        <div style="width:18px;height:18px;border-radius:999px;background:${color};border:3px solid #ffffff;box-shadow:0 2px 8px rgba(0,0,0,0.28);"></div>
        <div style="position:absolute;left:50%;transform:translateX(-50%);top:16px;width:2px;height:10px;background:${color};border-radius:2px;"></div>
      </div>
    `,
    iconSize: [18, 28],
    iconAnchor: [9, 28],
    popupAnchor: [0, -22],
  });
}

const PROGRAM_META = {
  setup: { label: "SETUP", color: "#A6CEE3" },
  cest: { label: "CEST", color: "#1F78B4" },
  sscp: { label: "SSCP", color: "#B2DF8A" },
  rollout: { label: "Technology Roll Out", color: "#33A02C" },
  training: { label: "Technology Training", color: "#FB9A99" },
  tacs: { label: "TACS", color: "#E31A1C" },
  packaging: { label: "Packaging & Labeling", color: "#FDBF6F" },
  drrm: { label: "DRRM", color: "#FF7F00" },
  specialProject: { label: "Special Project", color: "#CAB2D6" },
  stPromo: { label: "S&T PROMO", color: "#6A3D9A" },
  techPromo: { label: "Technology Promotion", color: "#FFFF99" },
  calibration: { label: "Calibration", color: "#B15928" },
};

const PAP_KEYS = ["setup", "cest", "sscp", "drrm", "specialProject"];
const INTERVENTION_KEYS = Object.keys(PROGRAM_META).filter((key) => !PAP_KEYS.includes(key));
const PROGRAM_KEYS = Object.keys(PROGRAM_META);

const PANGASINAN_DISTRICTS = [
  { id: "District 1", municipalities: ["Agno", "Alaminos City", "Anda", "Bani", "Bolinao", "Burgos", "Dasol", "Infanta", "Mabini", "Sual"] },
  { id: "District 2", municipalities: ["Aguilar", "Basista", "Binmaley", "Bugallon", "Labrador", "Lingayen", "Mangatarem", "Urbiztondo"] },
  { id: "District 3", municipalities: ["Bayambang", "Calasiao", "Malasiqui", "Mapandan", "San Carlos City", "Santa Barbara"] },
  { id: "District 4", municipalities: ["Dagupan City", "Manaoag", "Mangaldan", "San Fabian", "San Jacinto"] },
  { id: "District 5", municipalities: ["Alcala", "Bautista", "Binalonan", "Laoac", "Pozorrubio", "Santo Tomas", "Sison", "Urdaneta City", "Villasis"] },
  { id: "District 6", municipalities: ["Asingan", "Balungao", "Natividad", "Rosales", "San Manuel", "San Nicolas", "San Quintin", "Santa Maria", "Tayug", "Umingan"] },
];

const DISTRICTS = PANGASINAN_DISTRICTS.map((d) => d.id);
const ALL_MUNICIPALITIES = PANGASINAN_DISTRICTS.flatMap((d) =>
  d.municipalities.map((name) => ({ name, district: d.id }))
);

const ENABLE_PROJECTS_API = true;
const API_BASE_URL = (API_BASE || "http://localhost:5000").replace(/\/$/, "");
const PROJECTS_API_URL = `${API_BASE_URL}/api/dashboard/projects`;

function normalizeProgramKey(value = "") {
  const raw = String(value || "").trim();
  const normalized = raw.toLowerCase().replace(/[^a-z0-9]+/g, "");

  const aliases = {
    setup: "setup",
    cest: "cest",
    sscp: "sscp",
    technologyrollout: "rollout",
    techrollout: "rollout",
    rollout: "rollout",
    technologytraining: "training",
    techtraining: "training",
    training: "training",
    tacs: "tacs",
    packaginglabeling: "packaging",
    packagingandlabeling: "packaging",
    packaging: "packaging",
    drrm: "drrm",
    disasterriskreductionmanagement: "drrm",
    disasterriskreductionandmanagement: "drrm",
    specialproject: "specialProject",
    specialprojects: "specialProject",
    stpromo: "stPromo",
    sandtpromo: "stPromo",
    scienceandtechnologypromo: "stPromo",
    technologypromotion: "techPromo",
    techpromo: "techPromo",
    calibration: "calibration",
  };

  return aliases[normalized] || raw;
}

function normalizeProjectRecord(record = {}, index = 0) {
  const municipality = record.municipality || record.municipality_name || record.lgu || "";
  const district = record.district || record.district_name || getDistrictFromMunicipality(municipality);
  const latValue = record.lat ?? record.latitude ?? null;
  const lngValue = record.lng ?? record.longitude ?? null;
  const normalizedProgram = normalizeProgramKey(record.program || "");

  return {
    id: record.id ?? record.project_id ?? index + 1,
    program: normalizedProgram,
    title: record.title || record.project_title || "Untitled Project",
    municipality,
    district,
    barangay: record.barangay || record.barangay_name || "",
    lat: latValue === "" || latValue == null ? null : Number(latValue),
    lng: lngValue === "" || lngValue == null ? null : Number(lngValue),
    status: record.status || "Pending",
    approvedProjectCost:
      record.approvedProjectCost ??
      record.approved_project_cost ??
      record.totalFund ??
      record.total_fund ??
      record.amount ??
      record.project_cost ??
      0,
    beneficiaries:
      record.beneficiaries ??
      record.totalBeneficiaries ??
      record.total_beneficiaries ??
      record.customers ??
      record.firms ??
      record.lgus ??
      0,
    createdAt: record.createdAt || record.created_at || new Date().toISOString().slice(0, 10),
  };
}

function normalizeProjects(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row, index) => normalizeProjectRecord(row, index))
    .filter((row) => PROGRAM_META[row.program] && row.municipality);
}

const SORT_OPTIONS = [
  ["name_az", "Name A-Z"],
  ["name_za", "Name Z-A"],
  ["district_az", "District A-Z"],
  ["district_za", "District Z-A"],
  ["projects_high", "Projects High-Low"],
  ["projects_low", "Projects Low-High"],
  ["year_newest", "Year Newest"],
  ["year_oldest", "Year Oldest"],
  ["quarter_high", "Quarter High-Low"],
  ["quarter_low", "Quarter Low-High"],
];

// Temporary placeholder for Intervention Top Used.
// Keep it empty for now, then replace with database/API records later.
// Expected future shape: { intervention: "Technology Training", program: "training", year: "2026", uses: 12 }
const INTERVENTION_TOP_USED_MOCK_DATA = [];

const INTERVENTION_TOP_YEAR_FILTERS = [
  { value: "all", label: "All Years" },
  ...Array.from({ length: 9 }, (_, index) => {
    const year = String(2018 + index);
    return { value: year, label: year };
  }),
];

const MATRIX_MODE_OPTIONS = [
  { value: "pap", label: "Program Activity Project" },
  { value: "interventions", label: "Interventions" },
];

const INNOVATION_FUNDING_SUPPORT_ROWS = [
  { key: "setup", pap: "SETUP", totalFund: "", projects: "", beneficiaries: "" },
  { key: "cest", pap: "CEST", totalFund: "", projects: "", beneficiaries: "" },
  { key: "sscp", pap: "SSCP", totalFund: "", projects: "", beneficiaries: "" },
];

const COMPARISON_PAP_KEYS = ["setup", "cest", "sscp"];
const COMPARISON_YEAR_OPTIONS = Array.from({ length: 9 }, (_, index) => String(2018 + index));

const INTERVENTIONS_ANALYTICS_ROWS = [
  {
    key: "setup",
    label: "SETUP",
    metricKey: "stiInterventionsProvided",
    metricLabel: "No. of S&T interventions provided (total)",
  },
  {
    key: "cest",
    label: "CEST",
    metricKey: "stiIntervention",
    metricLabel: "Number of S&T intervention",
  },
  {
    key: "sscp",
    label: "SSCP",
    metricKey: "technologiesAdopted",
    metricLabel: "No. of technologies adopted",
  },
];

// Temporary empty values. Later, replace this with API/database values.
// This card should only detect/count the S&T intervention-related metric, not the full KPI list.
// Expected shape:
// {
//   setup: { 2018: 0, 2019: 0, ... },
//   cest: { 2018: 0, 2019: 0, ... },
//   sscp: { 2018: 0, 2019: 0, ... },
// }
const INTERVENTIONS_ANALYTICS_MOCK_VALUES = {};

function fmtDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString();
}

function normalizeName(v) {
  return String(v || "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getFeatureName(feature) {
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
}

function getDistrictFromMunicipality(name) {
  const n = normalizeName(name);
  for (const d of PANGASINAN_DISTRICTS) {
    if (d.municipalities.some((m) => normalizeName(m) === n)) return d.id;
  }
  return "";
}

function displayDistrict(value) {
  return String(value || "").replace(/^District\s*/i, "").trim();
}

function getQuarterFromDate(dateString) {
  const d = new Date(dateString);
  const month = d.getMonth() + 1;
  if (month <= 3) return "Q1";
  if (month <= 6) return "Q2";
  if (month <= 9) return "Q3";
  return "Q4";
}

function getMonthLabel(dateString) {
  return new Date(dateString).toLocaleString("en-US", { month: "long" });
}

function getYearValue(dateString) {
  return new Date(dateString).getFullYear();
}

function buildYearRange(fromYear, toYear) {
  const start = Number(fromYear);
  const end = Number(toYear);

  if (!Number.isFinite(start) || !Number.isFinite(end)) return [];

  const min = Math.min(start, end);
  const max = Math.max(start, end);

  return Array.from({ length: max - min + 1 }, (_, index) => String(min + index));
}

function buildComparisonYears(mode, fromYear, toYear) {
  if (mode === "range") return buildYearRange(fromYear, toYear);

  if (String(fromYear) === String(toYear)) return [String(fromYear)];
  return [String(fromYear), String(toYear)];
}

function getQuarterNumeric(dateString) {
  return Number(getQuarterFromDate(dateString).replace("Q", ""));
}

function sortRows(rows, sortOption) {
  const data = [...rows];
  const compareText = (a, b) => String(a).localeCompare(String(b));
  const compareNum = (a, b) => Number(a) - Number(b);

  data.sort((a, b) => {
    if (sortOption === "name_az") return compareText(a.name, b.name);
    if (sortOption === "name_za") return compareText(b.name, a.name);
    if (sortOption === "district_az") return compareText(a.district, b.district) || compareText(a.name, b.name);
    if (sortOption === "district_za") return compareText(b.district, a.district) || compareText(a.name, b.name);
    if (sortOption === "projects_high") return compareNum(b.totalProjects, a.totalProjects) || compareText(a.name, b.name);
    if (sortOption === "projects_low") return compareNum(a.totalProjects, b.totalProjects) || compareText(a.name, b.name);
    if (sortOption === "year_newest") return compareNum(b.latestYear || 0, a.latestYear || 0) || compareText(a.name, b.name);
    if (sortOption === "year_oldest") return compareNum(a.latestYear || 0, b.latestYear || 0) || compareText(a.name, b.name);
    if (sortOption === "quarter_high") return compareNum(b.latestQuarter || 0, a.latestQuarter || 0) || compareText(a.name, b.name);
    if (sortOption === "quarter_low") return compareNum(a.latestQuarter || 0, b.latestQuarter || 0) || compareText(a.name, b.name);
    return compareText(a.name, b.name);
  });

  return data;
}

function SectionCard({ title, subtitle, right, children }) {
  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <div>
          <div style={styles.cardTitle}>{title}</div>
          {subtitle ? <div style={styles.cardSubtitle}>{subtitle}</div> : null}
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      <div style={styles.cardBody}>{children}</div>
    </div>
  );
}

function KpiCard({ label, value, hint, icon: Icon, onClick }) {
  const numericValue = Number(value) || 0;
  const isClickable = numericValue > 0 && typeof onClick === "function";

  return (
    <button
      type="button"
      style={isClickable ? styles.kpiCardClickable : styles.kpiCardDisabled}
      onClick={isClickable ? onClick : undefined}
      disabled={!isClickable}
      title={isClickable ? "Click to view details" : "No data to show"}
    >
      <div style={styles.kpiTopRow}>
        <div>
          <div style={styles.kpiLabel}>{label}</div>
          <div style={styles.kpiValue}>{value}</div>
          <div style={styles.kpiHint}>{hint}</div>
        </div>
        <div style={styles.kpiIconWrap}>
          <Icon size={18} color="#334155" />
        </div>
      </div>
    </button>
  );
}

function KpiDetailsModal({ data, onClose }) {
  if (!data) return null;

  return (
    <div style={styles.modalBackdrop} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <div style={styles.modalTitle}>{data.title}</div>
            {data.subtitle ? <div style={styles.modalSubtitle}>{data.subtitle}</div> : null}
          </div>
          <button type="button" style={styles.modalCloseBtn} onClick={onClose}>×</button>
        </div>

        <div style={styles.modalBody}>
          {data.items?.length ? (
            data.items.map((item, index) => (
              <div key={`${item.title}-${index}`} style={styles.modalListItem}>
                <div style={styles.modalItemTitle}>{item.title}</div>
                {item.meta ? <div style={styles.modalItemMeta}>{item.meta}</div> : null}
              </div>
            ))
          ) : (
            <div style={styles.emptyState}>No details available.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProgramTag({ label, kind = "neutral" }) {
  const style =
    kind === "present"
      ? styles.programTagPresent
      : kind === "missing"
        ? styles.programTagMissing
        : styles.programTagNeutral;

  return <span style={style}>{label}</span>;
}

function ProgramLegend() {
  return (
    <div style={styles.legendWrap}>
      {PROGRAM_KEYS.map((key) => (
        <div key={key} style={styles.legendItem}>
          <span style={{ ...styles.legendDot, background: PROGRAM_META[key].color }} />
          <span>{PROGRAM_META[key].label}</span>
        </div>
      ))}
    </div>
  );
}

function LeafletZIndexFix() {
  return (
    <style>{`
      .leaflet-container,
      .leaflet-pane,
      .leaflet-top,
      .leaflet-bottom,
      .leaflet-control,
      .leaflet-popup {
        z-index: 1 !important;
      }
    `}</style>
  );
}

function AreaMap({
  projects,
  selectedDistrict,
  selectedMunicipality,
  areaMode,
  coverageStatus,
  focusSet,
  unitMap,
  onAreaViewDetails,
}) {
  const [provinceGeo, setProvinceGeo] = useState(null);
  const [muniGeo, setMuniGeo] = useState(null);

  useEffect(() => {
    let alive = true;

    fetch("/geo/pangasinan_outline.geojson")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => alive && data && setProvinceGeo(data))
      .catch(() => { });

    fetch("/geo/pangasinan_municipalities.geojson")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => alive && data && setMuniGeo(data))
      .catch(() => { });

    return () => {
      alive = false;
    };
  }, []);

  const districtMunicipalitySet = useMemo(() => {
    if (!selectedDistrict) return new Set();
    const found = PANGASINAN_DISTRICTS.find((d) => d.id === selectedDistrict);
    return new Set((found?.municipalities || []).map((m) => normalizeName(m)));
  }, [selectedDistrict]);

  const visibleProjects = useMemo(() => {
    if (coverageStatus === "without") return [];
    return projects.filter((p) => {
      const unitKey = areaMode === "district" ? p.district : p.municipality;
      const row = unitMap.get(normalizeName(unitKey));
      if (!row) return false;
      return coverageStatus === "show_all" || row.status === coverageStatus;
    });
  }, [projects, coverageStatus, unitMap, areaMode]);

  const pinnedProjects = visibleProjects.filter((p) => p.lat && p.lng);
  return (
    <div style={styles.mapRoot}>
      <LeafletZIndexFix />

      <div style={styles.mapTopInfo}>
        <div style={styles.mapTitle}>Pangasinan Project Map</div>
      </div>

      <div style={styles.leafletWrap}>
        <MapContainer
          center={[15.97, 120.39]}
          zoom={9}
          minZoom={9}
          maxZoom={16}
          zoomControl={true}
          scrollWheelZoom={true}
          maxBounds={[[15.1, 119.4], [16.7, 121.2]]}
          maxBoundsViscosity={1.0}
          style={styles.mapContainer}
        >
          <LayersControl position="topright">
            <LayersControl.BaseLayer checked name="Default (OSM)">
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>

            <LayersControl.BaseLayer name="Satellite (Esri)">
              <TileLayer
                attribution="Tiles &copy; Esri"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
            </LayersControl.BaseLayer>

            {provinceGeo ? (
              <LayersControl.Overlay checked name="Province Outline">
                <GeoJSON
                  data={provinceGeo}
                  style={() => ({
                    color: "#7c6f9c",
                    weight: 2,
                    fillOpacity: 0,
                  })}
                />
              </LayersControl.Overlay>
            ) : null}

            {muniGeo ? (
              <LayersControl.Overlay checked name="Municipal Boundaries">
                <GeoJSON
                  data={muniGeo}
                  style={(feature) => {
                    const featureName = getFeatureName(feature);

                    if (coverageStatus === "show_all") {
                      if (areaMode === "district" && selectedDistrict) {
                        const inDistrict = districtMunicipalitySet.has(normalizeName(featureName));
                        return {
                          color: inDistrict ? "#1d4ed8" : "#374151",
                          weight: inDistrict ? 1.8 : 1.1,
                          fillOpacity: 0,
                        };
                      }

                      if (areaMode === "municipality" && selectedMunicipality) {
                        const isTarget = normalizeName(featureName) === normalizeName(selectedMunicipality);
                        return {
                          color: isTarget ? "#1d4ed8" : "#374151",
                          weight: isTarget ? 1.8 : 1.1,
                          fillOpacity: 0,
                        };
                      }

                      return {
                        color: "#374151",
                        weight: 1.1,
                        fillOpacity: 0,
                      };
                    }

                    if (coverageStatus === "without") {
                      const focusKey = areaMode === "district" ? getDistrictFromMunicipality(featureName) : featureName;
                      const isFocus = focusSet.has(normalizeName(focusKey));
                      return {
                        color: isFocus ? "#dc2626" : "#94a3b8",
                        weight: isFocus ? 2.2 : 1,
                        fillOpacity: isFocus ? 0.08 : 0.02,
                        fillColor: isFocus ? "#fee2e2" : "#e5e7eb",
                      };
                    }

                    if (areaMode === "district" && selectedDistrict) {
                      const inDistrict = districtMunicipalitySet.has(normalizeName(featureName));
                      return {
                        color: inDistrict ? "#1d4ed8" : "#374151",
                        weight: inDistrict ? 1.8 : 1.1,
                        fillOpacity: 0,
                      };
                    }

                    if (areaMode === "municipality" && selectedMunicipality) {
                      const isTarget = normalizeName(featureName) === normalizeName(selectedMunicipality);
                      return {
                        color: isTarget ? "#1d4ed8" : "#374151",
                        weight: isTarget ? 1.8 : 1.1,
                        fillOpacity: 0,
                      };
                    }

                    return {
                      color: "#374151",
                      weight: 1.1,
                      fillOpacity: 0,
                    };
                  }}
                  onEachFeature={(feature, layer) => {
                    const featureName = getFeatureName(feature);
                    const featureDistrict = getDistrictFromMunicipality(featureName);
                    const popupKey = areaMode === "district" ? featureDistrict : featureName;
                    const row = unitMap.get(normalizeName(popupKey));

                    const html = `
                      <div style="min-width:235px; font-family:Arial,sans-serif;">
                        <div style="font-weight:800; font-size:15px; margin-bottom:8px;">${popupKey || "Area"}</div>
                        <div style="font-size:12px; line-height:1.55;">
                          <div><strong>District:</strong> ${featureDistrict || "—"}</div>
                          <div><strong>Total Projects:</strong> ${row?.totalProjects ?? 0}</div>
                          <div><strong>Status:</strong> ${row?.statusLabel ?? "—"}</div>
                        </div>
                        <div style="margin-top:12px;">
                          <button id="view-full-${normalizeName(popupKey)}" style="width:100%; padding:8px 12px; border-radius:10px; border:1px solid #cbd5e1; background:#f8fafc; cursor:pointer; font-size:12px; font-weight:800;">
                            View Full Details
                          </button>
                        </div>
                      </div>
                    `;

                    layer.bindPopup(html);
                    layer.on("popupopen", () => {
                      const btn = document.getElementById(`view-full-${normalizeName(popupKey)}`);
                      if (btn) btn.onclick = () => onAreaViewDetails(popupKey);
                    });
                  }}
                />
              </LayersControl.Overlay>
            ) : null}

            {coverageStatus !== "without" &&
              PROGRAM_KEYS.map((programKey) => {
                const programProjects = pinnedProjects.filter((p) => p.program === programKey);

                return (
                  <LayersControl.Overlay
                    key={programKey}
                    checked
                    name={PROGRAM_META[programKey].label}
                  >
                    <>
                      {programProjects.map((project) => (
                        <Marker
                          key={project.id}
                          position={[project.lat, project.lng]}
                          icon={createCircleIcon(PROGRAM_META[project.program].color)}
                        >
                          <Popup>
                            <div style={{ minWidth: 235, fontFamily: "Arial, sans-serif" }}>
                              <div style={{ fontWeight: 800, fontSize: 14 }}>{project.title}</div>
                              <div style={{ marginTop: 8, fontSize: 12, lineHeight: 1.55 }}>
                                <div><strong>Program:</strong> {PROGRAM_META[project.program].label}</div>
                                <div><strong>Date:</strong> {fmtDate(project.createdAt)}</div>
                                <div><strong>Status:</strong> {project.status}</div>
                                <div><strong>Address:</strong> {project.barangay}, {project.municipality}, Pangasinan</div>
                                <div><strong>Coordinates:</strong> {project.lat ?? "—"}, {project.lng ?? "—"}</div>
                              </div>
                              <div style={{ marginTop: 12 }}>
                                <button
                                  style={styles.popupPrimaryBtn}
                                  onClick={() =>
                                    onAreaViewDetails(
                                      areaMode === "district"
                                        ? project.district
                                        : project.municipality
                                    )
                                  }
                                >
                                  View Full Details
                                </button>
                              </div>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    </>
                  </LayersControl.Overlay>
                );
              })}
          </LayersControl>
        </MapContainer>
      </div>

      <div style={{ marginTop: 14 }}>
        <ProgramLegend />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [selectedProgram, setSelectedProgram] = useState("");
  const [areaMode, setAreaMode] = useState("municipality");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedMunicipality, setSelectedMunicipality] = useState("");
  const [coverageStatus, setCoverageStatus] = useState("show_all");
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedQuarter, setSelectedQuarter] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [listSortOption, setListSortOption] = useState("name_az");
  const [interventionTopYear, setInterventionTopYear] = useState("all");
  const [coverageMatrixMode, setCoverageMatrixMode] = useState("pap");
  const [comparisonPap, setComparisonPap] = useState("setup");
  const [comparisonMode, setComparisonMode] = useState("range");
  const [comparisonFromYear, setComparisonFromYear] = useState("2018");
  const [comparisonToYear, setComparisonToYear] = useState("2026");
  const [selectedAreaName, setSelectedAreaName] = useState("");
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState("");
  const [kpiModalData, setKpiModalData] = useState(null);

  const rowRefs = useRef({});

  useEffect(() => {
    let alive = true;

    async function loadProjects() {
      setProjectsLoading(true);
      setProjectsError("");

      try {
        if (!ENABLE_PROJECTS_API) {
          if (alive) setProjects([]);
          return;
        }

        const response = await axios.get(PROJECTS_API_URL);
        const data = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.data?.rows)
            ? response.data.rows
            : [];
        const normalized = normalizeProjects(data);

        if (!alive) return;
        setProjects(normalized);
      } catch (error) {
        if (!alive) return;
        setProjects([]);
        setProjectsError(
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "Failed to load projects."
        );
      } finally {
        if (alive) setProjectsLoading(false);
      }
    }

    loadProjects();

    return () => {
      alive = false;
    };
  }, []);

  const allYears = useMemo(
    () =>
      [...new Set(projects.map((p) => String(getYearValue(p.createdAt))))].sort(
        (a, b) => Number(b) - Number(a)
      ),
    [projects]
  );

  const allMonths = [
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

  const districtMunicipalities = useMemo(() => {
    if (!selectedDistrict) return [];
    const found = PANGASINAN_DISTRICTS.find((d) => d.id === selectedDistrict);
    return (found?.municipalities || []).map((name) => ({
      name,
      district: selectedDistrict,
    }));
  }, [selectedDistrict]);

  const timeFilteredProjects = useMemo(() => {
    return projects
      .filter((p) => selectedYear === "all" || String(getYearValue(p.createdAt)) === String(selectedYear))
      .filter((p) => selectedQuarter === "all" || getQuarterFromDate(p.createdAt) === selectedQuarter)
      .filter((p) => selectedMonth === "all" || getMonthLabel(p.createdAt) === selectedMonth);
  }, [projects, selectedYear, selectedQuarter, selectedMonth]);

  const filteredProjects = useMemo(() => {
    return timeFilteredProjects
      .filter((p) => !selectedProgram || p.program === selectedProgram)
      .filter((p) => !selectedDistrict || p.district === selectedDistrict)
      .filter((p) => !selectedMunicipality || p.municipality === selectedMunicipality);
  }, [timeFilteredProjects, selectedProgram, selectedDistrict, selectedMunicipality]);

  const units = useMemo(() => {
    const source =
      areaMode === "district"
        ? DISTRICTS.map((district) => ({ name: district, district }))
        : ALL_MUNICIPALITIES.map((m) => ({ name: m.name, district: m.district }));

    return source.map((unit) => {
      const unitProjects = filteredProjects.filter((p) =>
        areaMode === "district"
          ? p.district === unit.name
          : normalizeName(p.municipality) === normalizeName(unit.name)
      );

      const existingPrograms = [...new Set(unitProjects.map((p) => p.program))];
      const existingPaps = existingPrograms.filter((key) => PAP_KEYS.includes(key));
      const missingPaps = PAP_KEYS.filter((key) => !existingPaps.includes(key));
      const missingPrograms = PROGRAM_KEYS.filter((key) => !existingPrograms.includes(key));

      let status = "without";
      if (selectedProgram) {
        if (unitProjects.length === 0) status = "without";
        else if (existingPrograms.includes(selectedProgram)) status = "complete";
        else status = "incomplete";
      } else {
        if (unitProjects.length === 0) status = "without";
        else if (existingPaps.length === PAP_KEYS.length) status = "complete";
        else status = "incomplete";
      }

      const latestProject = [...unitProjects].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      )[0];

      return {
        name: unit.name,
        district: unit.district,
        totalProjects: unitProjects.length,
        existingPrograms,
        existingPaps,
        missingPrograms,
        missingPaps,
        status,
        statusLabel:
          status === "complete"
            ? selectedProgram
              ? `Has ${PROGRAM_META[selectedProgram]?.label}`
              : "Complete"
            : status === "incomplete"
              ? selectedProgram
                ? `Missing ${PROGRAM_META[selectedProgram]?.label}`
                : "Incomplete"
              : selectedProgram
                ? `No ${PROGRAM_META[selectedProgram]?.label}`
                : "Without Projects",
        projects: unitProjects,
        latestYear: latestProject ? getYearValue(latestProject.createdAt) : 0,
        latestQuarter: latestProject ? getQuarterNumeric(latestProject.createdAt) : 0,
      };
    });
  }, [filteredProjects, areaMode, selectedProgram]);

  const unitMap = useMemo(() => {
    const map = new Map();
    units.forEach((unit) => map.set(normalizeName(unit.name), unit));
    return map;
  }, [units]);

  const visibleUnitsRaw = useMemo(
    () => (coverageStatus === "show_all" ? units : units.filter((u) => u.status === coverageStatus)),
    [units, coverageStatus]
  );

  const visibleUnits = useMemo(
    () => sortRows(visibleUnitsRaw, listSortOption),
    [visibleUnitsRaw, listSortOption]
  );

  const focusSet = useMemo(
    () => new Set(visibleUnits.map((u) => normalizeName(u.name))),
    [visibleUnits]
  );

  const completeCount = units.filter((u) => u.status === "complete").length;
  const incompleteCount = units.filter((u) => u.status === "incomplete").length;
  const withoutCount = units.filter((u) => u.status === "without").length;

  const projectsPerProgram = useMemo(
    () =>
      PAP_KEYS.map((key) => ({
        name: PROGRAM_META[key].label,
        value: filteredProjects.filter((p) => p.program === key).length,
        color: PROGRAM_META[key].color,
      })),
    [filteredProjects]
  );

  const interventionsPerProgram = useMemo(
    () =>
      INTERVENTION_KEYS.map((key) => ({
        name: PROGRAM_META[key].label,
        value: filteredProjects.filter((p) => p.program === key).length,
        color: PROGRAM_META[key].color,
      })),
    [filteredProjects]
  );

  const projectsPerDistrict = useMemo(
    () =>
      DISTRICTS.map((district) => ({
        district,
        districtLabel: displayDistrict(district),
        total: filteredProjects.filter((p) => p.district === district).length,
      })),
    [filteredProjects]
  );

  const interventionTopUsedData = useMemo(() => {
    const counts = new Map();

    projects.forEach((project) => {
      if (!INTERVENTION_KEYS.includes(project.program)) return;

      const year = String(getYearValue(project.createdAt));
      if (interventionTopYear !== "all" && year !== String(interventionTopYear)) return;

      const current = counts.get(project.program) || {
        intervention: PROGRAM_META[project.program]?.label || project.program,
        program: project.program,
        year: interventionTopYear === "all" ? "All Years" : year,
        uses: 0,
      };

      current.uses += 1;
      counts.set(project.program, current);
    });

    return Array.from(counts.values())
      .sort((a, b) => Number(b.uses || 0) - Number(a.uses || 0))
      .slice(0, 5);
  }, [projects, interventionTopYear]);

  const innovationFundingRows = useMemo(() => {
    return INNOVATION_FUNDING_SUPPORT_ROWS.map((row) => {
      const rows = projects.filter((p) => p.program === row.key);

      const totalFund = rows.reduce(
        (sum, p) => sum + Number(p.approvedProjectCost || p.totalFund || p.amount || 0),
        0
      );

      // Count of Customer / Firms / LGUs records, not total persons.
      const beneficiaries = rows.length;

      return {
        ...row,
        totalFund: totalFund > 0 ? `₱${totalFund.toLocaleString("en-PH")}` : "—",
        projects: rows.length,
        beneficiaries: beneficiaries > 0 ? beneficiaries.toLocaleString("en-PH") : "—",
      };
    });
  }, [projects]);

  const comparisonYears = useMemo(
    () => buildComparisonYears(comparisonMode, comparisonFromYear, comparisonToYear),
    [comparisonMode, comparisonFromYear, comparisonToYear]
  );

  const comparisonTableRows = useMemo(() => {
    const selectedRow =
      INTERVENTIONS_ANALYTICS_ROWS.find((row) => row.key === comparisonPap) ||
      INTERVENTIONS_ANALYTICS_ROWS[0];

    if (!selectedRow) return [];

    const values = comparisonYears.reduce((acc, year) => {
      const count = projects.filter(
        (p) =>
          p.program === selectedRow.key &&
          String(getYearValue(p.createdAt)) === String(year)
      ).length;

      acc[year] = count || "";
      return acc;
    }, {});

    return [
      {
        ...selectedRow,
        values,
      },
    ];
  }, [comparisonPap, comparisonYears, projects]);

  const comparisonChartData = useMemo(() => {
    return comparisonYears.map((year) => {
      const count = projects.filter(
        (p) =>
          p.program === comparisonPap &&
          String(getYearValue(p.createdAt)) === String(year)
      ).length;

      return {
        year,
        value: count,
      };
    });
  }, [comparisonPap, comparisonYears, projects]);

  const comparisonSelectedLabel = PROGRAM_META[comparisonPap]?.label || "SETUP";
  const comparisonSelectedMetricLabel =
    INTERVENTIONS_ANALYTICS_ROWS.find((item) => item.key === comparisonPap)?.metricLabel ||
    "No. of S&T interventions";

  const recentProjects = [...filteredProjects]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 8);

  const activePrograms = projectsPerProgram.filter((p) => p.value > 0).length;

  const coveredMunicipalitiesCount = useMemo(
    () => new Set(filteredProjects.map((p) => normalizeName(p.municipality))).size,
    [filteredProjects]
  );

  const coverageMatrixKeys = useMemo(
    () => (coverageMatrixMode === "pap" ? PAP_KEYS : INTERVENTION_KEYS),
    [coverageMatrixMode]
  );

  const coverageMatrixRows = useMemo(() => {
    return sortRows(
      units.map((unit) => {
        const row = {
          name: unit.name,
          district: unit.district,
          totalProjects: unit.totalProjects,
          latestYear: unit.latestYear,
          latestQuarter: unit.latestQuarter,
          matrixTotal: 0,
        };

        coverageMatrixKeys.forEach((key) => {
          const count = unit.projects.filter((p) => p.program === key).length;
          row[key] = count;
          row.matrixTotal += count;
        });

        return row;
      }),
      listSortOption
    );
  }, [units, listSortOption, coverageMatrixKeys]);

  const listTitle = useMemo(() => {
    const areaLabel = areaMode === "district" ? "Districts" : "Municipalities / LGUs";
    if (coverageStatus === "show_all") return `${areaLabel} — Show All`;
    if (coverageStatus === "complete") return `${areaLabel} — With Projects (Complete)`;
    if (coverageStatus === "incomplete") return `${areaLabel} — With Projects (Incomplete)`;
    return `${areaLabel} — Without Projects`;
  }, [coverageStatus, areaMode]);

  const listSubtitle = useMemo(() => {
    if (coverageStatus === "show_all") return "Adaptive list on the left, with support charts on the right.";
    if (coverageStatus === "complete") return "Only areas matching the complete rule under the current filters.";
    if (coverageStatus === "incomplete") return "Only areas with projects but still missing something under the current filters.";
    return "Only areas with no projects under the current filters.";
  }, [coverageStatus]);

  function openKpiDetails(kind) {
    if (kind === "totalProjects") {
      setKpiModalData({
        title: "Total Projects",
        subtitle: `${filteredProjects.length} project(s) under the current filters`,
        items: filteredProjects.map((project) => ({
          title: project.title,
          meta: `${PROGRAM_META[project.program]?.label || project.program} • ${project.status} • ${project.municipality}, ${displayDistrict(project.district)}`,
        })),
      });
      return;
    }

    if (kind === "activePrograms") {
      setKpiModalData({
        title: "Active PAP",
        subtitle: `${activePrograms} PAP with visible records under the current filters`,
        items: projectsPerProgram
          .filter((item) => item.value > 0)
          .map((item) => ({
            title: item.name,
            meta: `${item.value} project record(s)`,
          })),
      });
      return;
    }

    const areaSets = {
      completeAreas: {
        title: "Complete Areas",
        subtitle: "Areas that match the complete condition under the current filters",
        rows: units.filter((u) => u.status === "complete"),
      },
      incompleteAreas: {
        title: "Incomplete Areas",
        subtitle: "Areas with records but still missing PAP under the current filters",
        rows: units.filter((u) => u.status === "incomplete"),
      },
      withoutProjects: {
        title: "Without Projects",
        subtitle: "Areas with no project records under the current filters",
        rows: units.filter((u) => u.status === "without"),
      },
      coveredMunicipalities: {
        title: "Covered Municipalities",
        subtitle: "Municipalities with at least one visible project",
        rows: ALL_MUNICIPALITIES.filter((m) =>
          filteredProjects.some((p) => normalizeName(p.municipality) === normalizeName(m.name))
        ),
      },
    };

    const data = areaSets[kind];
    if (!data) return;

    setKpiModalData({
      title: data.title,
      subtitle: data.subtitle,
      items: data.rows.map((row) => ({
        title: row.name,
        meta: row.totalProjects != null ? `${displayDistrict(row.district)} • ${row.totalProjects} project(s)` : displayDistrict(row.district),
      })),
    });
  }

  function YearPickerButton({
    value,
    onChange,
    allowAll = false,
    allLabel = "All Years",
    buttonStyle,
  }) {
    const pickerCurrentYear = new Date().getFullYear();
    const selectedNumericYear =
      value === "all" ? pickerCurrentYear : normalizePickerYear(value, pickerCurrentYear);
    const activeYearValue = value === "all" ? String(pickerCurrentYear) : String(selectedNumericYear);

    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState(String(selectedNumericYear));
    const [range, setRange] = useState({
      start: selectedNumericYear - 80,
      end: selectedNumericYear + 80,
    });

    const listRef = useRef(null);
    const selectedRef = useRef(null);
    const didAutoScrollRef = useRef(false);

    function normalizePickerYear(nextValue, fallback = pickerCurrentYear) {
      const parsed = Number(nextValue);
      if (!Number.isFinite(parsed)) return fallback;
      return Math.trunc(parsed);
    }

    const years = useMemo(() => {
      const start = Math.min(range.start, range.end);
      const end = Math.max(range.start, range.end);

      return Array.from({ length: end - start + 1 }, (_, index) => start + index);
    }, [range]);

    function ensureYearInRange(year) {
      const safeYear = normalizePickerYear(year);

      setRange((prev) => {
        if (safeYear >= prev.start && safeYear <= prev.end) return prev;

        return {
          start: safeYear - 80,
          end: safeYear + 80,
        };
      });
    }

    function expandRange(direction) {
      const list = listRef.current;
      const oldScrollHeight = list?.scrollHeight || 0;
      const oldScrollTop = list?.scrollTop || 0;

      setRange((prev) => {
        if (direction === "up") {
          return { start: prev.start - 80, end: prev.end };
        }

        return { start: prev.start, end: prev.end + 80 };
      });

      if (direction === "up" && list) {
        window.requestAnimationFrame(() => {
          const newScrollHeight = list.scrollHeight || 0;
          list.scrollTop = oldScrollTop + (newScrollHeight - oldScrollHeight);
        });
      }
    }

    function handleScroll(e) {
      const el = e.currentTarget;
      const nearTop = el.scrollTop < 70;
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 70;

      if (nearTop) expandRange("up");
      if (nearBottom) expandRange("down");
    }

    function openPicker() {
      const safeYear = value === "all" ? pickerCurrentYear : normalizePickerYear(value);
      setRange({
        start: safeYear - 80,
        end: safeYear + 80,
      });
      setDraft(String(safeYear));
      setOpen(true);
    }

    function closePicker() {
      setOpen(false);
      didAutoScrollRef.current = false;
    }

    function applyDraft() {
      const safeYear = normalizePickerYear(draft);
      ensureYearInRange(safeYear);
      onChange(String(safeYear));
      closePicker();
    }

    useEffect(() => {
      if (!open) {
        didAutoScrollRef.current = false;
        return;
      }

      const safeYear = value === "all" ? pickerCurrentYear : normalizePickerYear(value);
      setDraft(String(safeYear));

      if (didAutoScrollRef.current) return;
      didAutoScrollRef.current = true;

      const timer = window.setTimeout(() => {
        window.requestAnimationFrame(() => {
          selectedRef.current?.scrollIntoView({
            block: "center",
            behavior: "auto",
          });
        });
      }, 120);

      return () => window.clearTimeout(timer);
    }, [open, value, years.length]);

    return (
      <>
        <button
          type="button"
          style={{ ...styles.yearPickerButton, ...buttonStyle }}
          onClick={openPicker}
          title="Open year picker"
        >
          {value === "all" ? allLabel : value} ▾
        </button>

        {open
          ? createPortal(
            <div style={styles.yearModalBackdrop} onMouseDown={closePicker}>
              <div style={styles.yearModal} onMouseDown={(e) => e.stopPropagation()}>
                <div style={styles.yearModalHeader}>
                  <div>
                    <div>Select Year</div>
                    <div style={styles.yearModalHeaderSub}>
                      Scroll up/down or type any year
                    </div>
                  </div>
                  <button type="button" style={styles.yearModalClose} onClick={closePicker}>
                    ✕
                  </button>
                </div>

                <div style={styles.yearModalBody}>
                  <div style={styles.yearModalInputRow}>
                    <input
                      type="number"
                      inputMode="numeric"
                      style={styles.yearModalInput}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") applyDraft();
                        if (e.key === "Escape") closePicker();
                      }}
                      placeholder="Type year"
                      autoFocus
                    />

                    <button type="button" style={styles.yearApplyBtn} onClick={applyDraft}>
                      Apply
                    </button>

                    {allowAll ? (
                      <button
                        type="button"
                        style={styles.yearAllBtn}
                        onClick={() => {
                          onChange("all");
                          closePicker();
                        }}
                      >
                        {allLabel}
                      </button>
                    ) : null}
                  </div>

                  <div
                    key={activeYearValue}
                    ref={listRef}
                    style={styles.yearModalList}
                    onScroll={handleScroll}
                    onWheel={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                  >
                    <div style={styles.yearModalListHint}>
                      Scroll up/down to load more years
                    </div>

                    {years.map((year) => {
                      const active = String(year) === activeYearValue;
                      return (
                        <button
                          type="button"
                          key={year}
                          ref={active ? selectedRef : null}
                          style={{
                            ...styles.yearModalOption,
                            ...(active ? styles.yearModalOptionActive : null),
                          }}
                          onClick={() => {
                            ensureYearInRange(year);
                            onChange(String(year));
                            closePicker();
                          }}
                        >
                          {year}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>,
            document.body
          )
          : null}
      </>
    );
  }

  function resetFilters() {
    setSelectedProgram("");
    setAreaMode("municipality");
    setSelectedDistrict("");
    setSelectedMunicipality("");
    setCoverageStatus("show_all");
    setSelectedYear("all");
    setSelectedQuarter("all");
    setSelectedMonth("all");
    setListSortOption("name_az");
    setInterventionTopYear("all");
    setCoverageMatrixMode("pap");
    setComparisonPap("setup");
    setComparisonFromYear("2018");
    setComparisonToYear("2026");
    setSelectedAreaName("");
  }

  function handleAreaViewDetails(areaName) {
    setSelectedAreaName(areaName);
    const key = normalizeName(areaName);

    setTimeout(() => {
      const row = rowRefs.current[key];
      if (row && typeof row.scrollIntoView === "function") {
        row.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 120);
  }

  useEffect(() => {
    if (!selectedAreaName) return;
    const timer = setTimeout(() => setSelectedAreaName(""), 3500);
    return () => clearTimeout(timer);
  }, [selectedAreaName]);

  return (
    <div style={styles.page}>
      <div
        style={styles.container}
        data-projects-loading={projectsLoading ? "true" : "false"}
      >
        <div style={styles.heroHeader}>
          <div>
            <div style={styles.heroTitle}>Provincial Projects Dashboard</div>

          </div>
        </div>

        <SectionCard
          title="Global Filters"
          subtitle="Only filters stay here. Sortation is inside the adaptive list row."
          right={
            <div style={styles.filterState}>
              <Filter size={14} /> Global controls only
            </div>
          }
        >
          <div style={styles.filterGridLarge}>
            <select
              style={styles.select}
              value={selectedProgram}
              onChange={(e) => setSelectedProgram(e.target.value)}
            >
              <option value="">All Programs / Overall</option>
              {PROGRAM_KEYS.map((key) => (
                <option key={key} value={key}>
                  {PROGRAM_META[key].label}
                </option>
              ))}
            </select>

            <select
              style={styles.select}
              value={coverageStatus}
              onChange={(e) => setCoverageStatus(e.target.value)}
            >
              <option value="show_all">Show All</option>
              <option value="complete">With Projects (Complete)</option>
              <option value="incomplete">With Projects (Incomplete)</option>
              <option value="without">Without Projects</option>
            </select>

            <YearPickerButton
              value={selectedYear}
              onChange={setSelectedYear}
              allowAll
              allLabel="All Years"
              buttonStyle={styles.yearPickerFilterButton}
            />

            <select
              style={styles.select}
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(e.target.value)}
            >
              <option value="all">All Quarters</option>
              <option value="Q1">Q1</option>
              <option value="Q2">Q2</option>
              <option value="Q3">Q3</option>
              <option value="Q4">Q4</option>
            </select>

            <select
              style={styles.select}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="all">All Months</option>
              {allMonths.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>

            <select
              style={styles.select}
              value={areaMode}
              onChange={(e) => {
                setAreaMode(e.target.value);
                setSelectedDistrict("");
                setSelectedMunicipality("");
              }}
            >
              <option value="municipality">Municipality / LGU</option>
              <option value="district">District</option>
            </select>

            {areaMode === "district" ? (
              <select
                style={styles.select}
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
              >
                <option value="">All Districts</option>
                {DISTRICTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            ) : (
              <select
                style={styles.select}
                value={selectedMunicipality}
                onChange={(e) => {
                  const muni = e.target.value;
                  setSelectedMunicipality(muni);
                  setSelectedDistrict(getDistrictFromMunicipality(muni) || "");
                }}
              >
                <option value="">All Municipalities / LGUs</option>
                {(selectedDistrict ? districtMunicipalities : ALL_MUNICIPALITIES).map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
            )}

            <button style={styles.actionBtn} onClick={resetFilters}>
              Clear
            </button>
          </div>
        </SectionCard>

        {projectsError ? (
          <SectionCard
            title="Dashboard Load Error"
            subtitle="Backend route or program mapping needs checking."
          >
            <div style={styles.emptyState}>{projectsError}</div>
          </SectionCard>
        ) : null}

        <div style={styles.mapSummaryGrid}>
          <div style={styles.mapCardShell}>
            <AreaMap
              projects={filteredProjects}
              selectedDistrict={selectedDistrict}
              selectedMunicipality={selectedMunicipality}
              areaMode={areaMode}
              coverageStatus={coverageStatus}
              focusSet={focusSet}
              unitMap={unitMap}
              onAreaViewDetails={handleAreaViewDetails}
            />
          </div>

          <div style={styles.coverageSummaryGrid}>
            <KpiCard label="Total Projects" value={filteredProjects.length} hint="Filtered actual project records" icon={Database} onClick={() => openKpiDetails("totalProjects")} />
            <KpiCard label="Active PAP" value={activePrograms} hint="PAP with visible projects" icon={Layers3} onClick={() => openKpiDetails("activePrograms")} />
            <KpiCard label="Complete Areas" value={completeCount} hint="Matches complete condition" icon={CheckCircle2} onClick={() => openKpiDetails("completeAreas")} />
            <KpiCard label="Incomplete Areas" value={incompleteCount} hint="Matches incomplete condition" icon={Activity} onClick={() => openKpiDetails("incompleteAreas")} />
            <KpiCard label="Without Projects" value={withoutCount} hint="Matches no-project condition" icon={AlertCircle} onClick={() => openKpiDetails("withoutProjects")} />
            <KpiCard label="Covered Municipalities" value={coveredMunicipalitiesCount} hint="Municipalities with at least one project" icon={Table2} onClick={() => openKpiDetails("coveredMunicipalities")} />
          </div>
        </div>

        <div style={styles.middleGrid}>
          <div style={{ minWidth: 0 }}>
            <SectionCard
              title={listTitle}
              subtitle={listSubtitle}
              right={
                <div style={styles.listHeaderActions}>
                  <div style={styles.filterState}>
                    <ArrowUpDown size={14} /> Adaptive list row
                  </div>
                  <select
                    style={styles.selectSmall}
                    value={listSortOption}
                    onChange={(e) => setListSortOption(e.target.value)}
                  >
                    {SORT_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              }
            >
              <div style={styles.answerTopMeta}>
                <div style={styles.answerCountBox}>
                  <div style={styles.answerCountLabel}>Count</div>
                  <div style={styles.answerCountValue}>{visibleUnits.length}</div>
                </div>
                <div style={styles.answerHelpText}>
                  Clicking <strong>View Full Details</strong> on the map jumps to the matching row below.
                  In district mode, this list automatically becomes district-based.
                </div>
              </div>

              <div style={styles.listWrapMedium}>
                {visibleUnits.length === 0 ? (
                  <div style={styles.emptyState}>No matching rows for the current filters.</div>
                ) : (
                  visibleUnits.map((row) => {
                    const isSelected = normalizeName(selectedAreaName) === normalizeName(row.name);

                    return (
                      <div
                        key={row.name}
                        ref={(el) => {
                          rowRefs.current[normalizeName(row.name)] = el;
                        }}
                        style={isSelected ? styles.highlightedAreaCard : styles.partialCoverageCard}
                      >
                        <div style={styles.partialCoverageHeader}>
                          <div>
                            <div style={styles.answerListTitle}>{row.name}</div>
                            <div style={styles.answerListMeta}>
                              {areaMode === "district"
                                ? `${row.totalProjects} project(s)`
                                : `${displayDistrict(row.district)} • ${row.totalProjects} project(s)`}
                            </div>
                          </div>
                        </div>

                        <div style={styles.programGroupWrap}>
                          <div>
                            <div style={styles.programGroupTitle}>Status</div>
                            <div style={styles.programTagWrap}>
                              <ProgramTag
                                label={row.statusLabel}
                                kind={
                                  row.status === "complete"
                                    ? "present"
                                    : row.status === "without"
                                      ? "missing"
                                      : "neutral"
                                }
                              />
                              {row.latestYear ? <ProgramTag label={`Year ${row.latestYear}`} kind="neutral" /> : null}
                              {row.latestQuarter ? <ProgramTag label={`Q${row.latestQuarter}`} kind="neutral" /> : null}
                            </div>
                          </div>

                          {row.status !== "without" ? (
                            <>
                              <div>
                                <div style={styles.programGroupTitle}>Existing PAP</div>
                                <div style={styles.programTagWrap}>
                                  {row.existingPaps.map((key) => (
                                    <ProgramTag key={key} label={PROGRAM_META[key].label} kind="present" />
                                  ))}
                                </div>
                              </div>

                              {row.status === "incomplete" ? (
                                <div>
                                  <div style={styles.programGroupTitle}>Missing PAP</div>
                                  <div style={styles.programTagWrap}>
                                    {row.missingPaps.map((key) => (
                                      <ProgramTag key={key} label={PROGRAM_META[key].label} kind="missing" />
                                    ))}
                                  </div>
                                </div>
                              ) : null}
                            </>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </SectionCard>
          </div>

          <div style={styles.rightChartColumn}>
            <SectionCard title="Projects per Program" subtitle="PAP only: SETUP, CEST, SSCP, DRRM, and Special Project">
              <div style={styles.chartWrap}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={projectsPerProgram}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={90}
                    />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {projectsPerProgram.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard title="Interventions" subtitle="Intervention records separated from PAP">
              <div style={styles.chartWrap}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={interventionsPerProgram}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11 }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={90}
                    />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {interventionsPerProgram.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </div>
        </div>

        <div style={styles.bottomGrid}>
          <SectionCard title="Projects per District" subtitle="District summary from actual filtered project records">
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectsPerDistrict} layout="vertical" margin={{ left: 10, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="districtLabel" width={90} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#2f6fd6" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard title="Recent Projects" subtitle="Latest actual filtered project records">
            <div style={styles.listWrap}>
              {recentProjects.map((project) => (
                <div key={project.id} style={styles.listCard}>
                  <div style={styles.listCardTop}>
                    <div>
                      <div style={styles.listTitle}>{project.title}</div>
                      <div style={styles.listMeta}>
                        {PROGRAM_META[project.program].label} • {project.municipality} • {displayDistrict(project.district)}
                      </div>
                    </div>
                  </div>
                  <div style={styles.listDateMeta}>
                    {fmtDate(project.createdAt)} • {getQuarterFromDate(project.createdAt)} • {getMonthLabel(project.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <div style={styles.bottomGrid}>
          <SectionCard
            title="Intervention Top Used"
            subtitle="Top 5 most used interventions based on the selected year."
            right={
              <YearPickerButton
                value={interventionTopYear}
                onChange={setInterventionTopYear}
                allowAll
                allLabel="All Years"
                buttonStyle={styles.selectSmallYearPicker}
              />
            }
          >
            <div style={styles.bottomExtraWrap}>
              {interventionTopUsedData.length === 0 ? (
                <div style={styles.emptyChartBox}>
                  No intervention usage data found for the selected year.
                </div>
              ) : (
                <div style={styles.topUsedList}>
                  {interventionTopUsedData.map((item, index) => (
                    <div key={`${item.program}-${item.year}-${index}`} style={styles.topUsedItem}>
                      <div style={styles.topUsedRank}>#{index + 1}</div>
                      <div style={styles.topUsedMain}>
                        <div style={styles.topUsedTitle}>{item.intervention || PROGRAM_META[item.program]?.label || "Intervention"}</div>
                        <div style={styles.topUsedMeta}>{item.year || "—"} • {PROGRAM_META[item.program]?.label || "—"}</div>
                      </div>
                      <div style={styles.topUsedValue}>{item.uses ?? 0}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Innovation Funding Support"
            subtitle="SETUP, CEST, and SSCP summary computed from dashboard records."
            right={
              <div style={styles.filterState}>
                <Table2 size={14} /> SETUP • CEST • SSCP
              </div>
            }
          >
            <div style={styles.innovationTableWrap}>
              <table style={styles.innovationTable}>
                <thead>
                  <tr>
                    <th style={styles.innovationTh}>Program</th>
                    <th style={styles.innovationThCenter}>Total Fund</th>
                    <th style={styles.innovationThCenter}>No. of Projects</th>
                    <th style={styles.innovationThCenter}>No. of Beneficiaries (Customer / Firms / LGUs)</th>
                  </tr>
                </thead>
                <tbody>
                  {innovationFundingRows.map((row) => (
                    <tr key={row.key}>
                      <td style={styles.innovationTdLabel}>{row.pap}</td>
                      <td style={styles.innovationTdCenter}>{row.totalFund}</td>
                      <td style={styles.innovationTdCenter}>{row.projects}</td>
                      <td style={styles.innovationTdCenter}>{row.beneficiaries}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        <SectionCard
          title="Interventions Analytics"
          subtitle="Compare selected PAP counts by two years or a full year range."
        >
          <div style={styles.comparisonControlsBelowTitle}>
            <select
              style={styles.comparisonSelect}
              value={comparisonPap}
              onChange={(e) => setComparisonPap(e.target.value)}
            >
              {COMPARISON_PAP_KEYS.map((key) => (
                <option key={key} value={key}>
                  {PROGRAM_META[key].label}
                </option>
              ))}
            </select>

            <select
              style={styles.comparisonSelect}
              value={comparisonMode}
              onChange={(e) => setComparisonMode(e.target.value)}
            >
              <option value="compare">Compare two years</option>
              <option value="range">Year range</option>
            </select>

            <YearPickerButton
              value={comparisonFromYear}
              onChange={setComparisonFromYear}
              buttonStyle={styles.comparisonYearPickerButton}
            />

            <span style={styles.comparisonToText}>{comparisonMode === "compare" ? "vs" : "to"}</span>

            <YearPickerButton
              value={comparisonToYear}
              onChange={setComparisonToYear}
              buttonStyle={styles.comparisonYearPickerButton}
            />
          </div>

          <div style={styles.comparisonLayout}>
            <div style={styles.comparisonTableWrap}>
              <table style={styles.comparisonTable}>
                <thead>
                  <tr>
                    <th style={styles.comparisonTh}>No. of Interventions</th>
                    {comparisonYears.map((year) => (
                      <th key={year} style={styles.comparisonThCenter}>
                        {year}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonTableRows.map((row) => (
                    <tr key={row.key}>
                      <td style={styles.comparisonTdLabel}>{row.label}</td>
                      {comparisonYears.map((year) => (
                        <td key={`${row.key}-${year}`} style={styles.comparisonTdCenter}>
                          {row.values[year] || ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={styles.comparisonChartWrap}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={comparisonChartData} margin={{ top: 12, right: 24, bottom: 8, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                  <YAxis
                    allowDecimals={false}
                    domain={[0, (dataMax) => Math.max(5, Number(dataMax || 0) + 1)]}
                  />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name={comparisonSelectedLabel}
                    stroke={PROGRAM_META[comparisonPap]?.color || "#2563eb"}
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title={
            <select
              style={styles.matrixTitleSelect}
              value={coverageMatrixMode}
              onChange={(e) => setCoverageMatrixMode(e.target.value)}
            >
              {MATRIX_MODE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          }
          subtitle={
            coverageMatrixMode === "pap"
              ? "Matrix for the 5 PAP only: SETUP, CEST, SSCP, DRRM, and Special Project."
              : "Matrix for interventions only. PAP columns are hidden in this view."
          }
          right={
            <div style={styles.filterState}>
              <Table2 size={14} /> Decision-support matrix
            </div>
          }
        >
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>{areaMode === "district" ? "District" : "Municipality / LGU"}</th>
                  {areaMode !== "district" ? <th style={styles.th}>District</th> : null}
                  {coverageMatrixKeys.map((programKey) => (
                    <th key={programKey} style={styles.thCenter}>
                      {PROGRAM_META[programKey].label}
                    </th>
                  ))}
                  <th style={styles.thCenter}>Total</th>
                </tr>
              </thead>
              <tbody>
                {coverageMatrixRows.map((row) => (
                  <tr key={row.name}>
                    <td style={styles.tdLabel}>{row.name}</td>
                    {areaMode !== "district" ? <td style={styles.td}>{displayDistrict(row.district)}</td> : null}
                    {coverageMatrixKeys.map((programKey) => (
                      <td key={programKey} style={styles.tdCenter}>
                        <span style={row[programKey] > 0 ? styles.matrixYes : styles.matrixNo}>
                          {row[programKey]}
                        </span>
                      </td>
                    ))}
                    <td style={styles.tdCenter}>
                      <strong>{row.matrixTotal}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>

      <KpiDetailsModal data={kpiModalData} onClose={() => setKpiModalData(null)} />
    </div>
  );
}

const styles = {
  page: {
    background: "#eef2f7",
    minHeight: "100%",
    padding: "16px 20px 20px",
    boxSizing: "border-box",
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial',
    color: "#0f172a",
    position: "relative",
    zIndex: 1,
  },
  container: {
    maxWidth: 1700,
    margin: "0 auto",
    position: "relative",
    zIndex: 1,
  },
  heroHeader: {
    background: "#2f6fd6",
    color: "#fff",
    borderRadius: 22,
    padding: 20,
    border: "1px solid #215fbd",
    boxShadow: "0 10px 24px rgba(47,111,214,0.18)",
    display: "flex",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 16,
    position: "relative",
    zIndex: 1,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 800,
    lineHeight: 1.1,
  },
  heroSubtitle: {
    fontSize: 14,
    opacity: 0.94,
    marginTop: 6,
  },
  card: {
    background: "#fff",
    border: "1px solid #cbd5e1",
    borderRadius: 20,
    overflow: "hidden",
    boxShadow: "0 4px 14px rgba(15,23,42,0.06)",
    marginBottom: 16,
    position: "relative",
    zIndex: 1,
  },
  cardHeader: {
    padding: "14px 16px",
    background: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: "#0f172a",
  },
  matrixTitleSelect: {
    border: "1px solid #cbd5e1",
    borderRadius: 12,
    background: "#fff",
    padding: "8px 12px",
    fontSize: 16,
    fontWeight: 800,
    color: "#0f172a",
    outline: "none",
    minWidth: 250,
  },
  cardSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: "#64748b",
  },
  cardBody: {
    padding: 16,
  },
  filterState: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    color: "#64748b",
    fontWeight: 600,
  },
  filterGridLarge: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: 10,
    alignItems: "center",
  },
  select: {
    width: "100%",
    border: "1px solid #cbd5e1",
    borderRadius: 12,
    background: "#fff",
    padding: "10px 12px",
    fontSize: 14,
    outline: "none",
  },
  selectSmall: {
    minWidth: 210,
    border: "1px solid #cbd5e1",
    borderRadius: 12,
    background: "#fff",
    padding: "8px 10px",
    fontSize: 13,
    outline: "none",
  },
  yearPickerButton: {
    minWidth: 140,
    border: "1px solid #cbd5e1",
    borderRadius: 12,
    background: "#fff",
    padding: "10px 12px",
    fontSize: 14,
    outline: "none",
    cursor: "pointer",
    textAlign: "left",
    color: "#0f172a",
  },
  yearPickerFilterButton: {
    width: "100%",
    height: "100%",
  },
  comparisonYearPickerButton: {
    minWidth: 92,
    padding: "8px 10px",
    fontSize: 13,
    textAlign: "center",
  },
  yearModalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.42)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 2147483647,
    overscrollBehavior: "contain",
  },
  yearModal: {
    width: "min(440px, 100%)",
    maxHeight: "min(680px, 90vh)",
    background: "#fff",
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: "0 18px 45px rgba(15, 23, 42, 0.28)",
    border: "1px solid #cbd5e1",
    position: "relative",
    zIndex: 2147483647,
  },
  yearModalHeader: {
    background: "#0b4ea2",
    color: "#fff",
    padding: "12px 14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    fontWeight: 900,
  },
  yearModalHeaderSub: {
    fontSize: 12,
    opacity: 0.9,
    fontWeight: 800,
    marginTop: 2,
  },
  yearModalClose: {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.7)",
    color: "#fff",
    borderRadius: 10,
    padding: "6px 10px",
    cursor: "pointer",
    fontWeight: 900,
  },
  yearModalBody: {
    padding: 14,
    display: "grid",
    gap: 12,
  },
  yearModalInputRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap",
  },
  yearModalInput: {
    flex: 1,
    minWidth: 150,
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: 10,
    fontSize: 18,
    fontWeight: 900,
    textAlign: "center",
    outline: "none",
  },
  yearApplyBtn: {
    border: "1px solid #1d4ed8",
    background: "#2563eb",
    color: "#fff",
    padding: "10px 12px",
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 900,
  },
  yearAllBtn: {
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    color: "#0f172a",
    padding: "10px 12px",
    borderRadius: 10,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 900,
  },
  yearModalList: {
    maxHeight: 390,
    overflowY: "auto",
    overscrollBehavior: "contain",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: 8,
    background: "#f8fafc",
  },
  yearModalListHint: {
    position: "sticky",
    top: 0,
    zIndex: 1,
    background: "#f8fafc",
    color: "#64748b",
    fontSize: 11,
    fontWeight: 800,
    textAlign: "center",
    padding: "6px 8px",
    marginBottom: 4,
    borderBottom: "1px solid #e2e8f0",
  },
  yearModalOption: {
    width: "100%",
    display: "block",
    border: "1px solid transparent",
    background: "transparent",
    padding: "9px 12px",
    textAlign: "center",
    cursor: "pointer",
    borderRadius: 10,
    fontWeight: 900,
    fontSize: 14,
    color: "#0f172a",
    marginBottom: 4,
  },
  yearModalOptionActive: {
    background: "#2563eb",
    border: "1px solid #1d4ed8",
    color: "#fff",
  },
  actionBtn: {
    width: "100%",
    border: "1px solid #cbd5e1",
    borderRadius: 12,
    background: "#fff",
    padding: "10px 12px",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    color: "#334155",
  },
  mapSummaryGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.7fr) minmax(360px, 0.95fr)",
    gap: 16,
    alignItems: "stretch",
    marginBottom: 16,
  },
  mapCardShell: {
    background: "#fff",
    border: "1px solid #cbd5e1",
    borderRadius: 20,
    overflow: "hidden",
    boxShadow: "0 4px 14px rgba(15,23,42,0.06)",
    padding: 16,
    minWidth: 0,
    position: "relative",
    zIndex: 1,
  },
  coverageSummaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 12,
    alignContent: "stretch",
    height: "100%",
  },
  kpiCardBase: {
    background: "#fff",
    border: "1px solid #cbd5e1",
    borderRadius: 18,
    padding: 16,
    boxShadow: "0 4px 12px rgba(15,23,42,0.05)",
    height: "100%",
    width: "100%",
    textAlign: "left",
    fontFamily: "inherit",
  },
  kpiCardClickable: {
    background: "#fff",
    border: "1px solid #cbd5e1",
    borderRadius: 18,
    padding: 16,
    boxShadow: "0 4px 12px rgba(15,23,42,0.05)",
    height: "100%",
    width: "100%",
    textAlign: "left",
    fontFamily: "inherit",
    cursor: "pointer",
  },
  kpiCardDisabled: {
    background: "#fff",
    border: "1px solid #cbd5e1",
    borderRadius: 18,
    padding: 16,
    boxShadow: "0 4px 12px rgba(15,23,42,0.05)",
    height: "100%",
    width: "100%",
    textAlign: "left",
    fontFamily: "inherit",
    cursor: "not-allowed",
    opacity: 1,
  },
  kpiTopRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  kpiLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontWeight: 800,
    color: "#64748b",
  },
  kpiValue: {
    marginTop: 8,
    fontSize: 30,
    lineHeight: 1,
    fontWeight: 800,
    color: "#0f172a",
  },
  kpiHint: {
    marginTop: 8,
    fontSize: 12,
    color: "#64748b",
    lineHeight: 1.4,
  },
  kpiIconWrap: {
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    borderRadius: 14,
    padding: 10,
  },
  mapRoot: {
    position: "relative",
    zIndex: 1,
  },
  mapTopInfo: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
    position: "relative",
    zIndex: 1,
  },
  mapTitle: {
    fontSize: 16,
    fontWeight: 800,
    color: "#0f172a",
  },
  leafletWrap: {
    height: 540,
    borderRadius: 18,
    overflow: "hidden",
    border: "1px solid #cbd5e1",
    position: "relative",
    zIndex: 1,
  },
  mapContainer: {
    height: "100%",
    width: "100%",
    borderRadius: 18,
    position: "relative",
    zIndex: 1,
  },
  popupPrimaryBtn: {
    border: "1px solid #cbd5e1",
    background: "#f8fafc",
    color: "#0f172a",
    padding: "8px 12px",
    borderRadius: 10,
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
    width: "100%",
  },
  legendWrap: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid #e2e8f0",
    background: "#fff",
    fontSize: 12,
    fontWeight: 700,
    color: "#334155",
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    display: "inline-block",
  },
  middleGrid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.25fr) minmax(320px, 0.75fr)",
    gap: 16,
    marginBottom: 16,
  },
  rightChartColumn: {
    display: "grid",
    gridTemplateRows: "1fr 1fr",
    gap: 16,
  },
  chartWrap: {
    height: 280,
  },
  listHeaderActions: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  answerTopMeta: {
    display: "grid",
    gridTemplateColumns: "140px 1fr",
    gap: 12,
    marginBottom: 14,
  },
  answerCountBox: {
    border: "1px solid #dbeafe",
    background: "#eff6ff",
    borderRadius: 16,
    padding: 14,
  },
  answerCountLabel: {
    fontSize: 12,
    fontWeight: 800,
    color: "#1d4ed8",
    textTransform: "uppercase",
  },
  answerCountValue: {
    fontSize: 32,
    fontWeight: 800,
    color: "#0f172a",
    marginTop: 8,
  },
  answerHelpText: {
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    borderRadius: 16,
    padding: 14,
    fontSize: 13,
    lineHeight: 1.6,
    color: "#475569",
  },
  listWrapMedium: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    maxHeight: 620,
    overflowY: "auto",
    paddingRight: 4,
  },
  partialCoverageCard: {
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    borderRadius: 16,
    padding: 14,
  },
  highlightedAreaCard: {
    border: "2px solid #2563eb",
    background: "#eff6ff",
    borderRadius: 16,
    padding: 14,
    boxShadow: "0 0 0 4px rgba(37,99,235,0.12)",
  },
  partialCoverageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  answerListTitle: {
    fontSize: 14,
    fontWeight: 800,
    color: "#0f172a",
  },
  answerListMeta: {
    marginTop: 4,
    fontSize: 12,
    color: "#64748b",
  },
  programGroupWrap: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 12,
  },
  programGroupTitle: {
    fontSize: 12,
    fontWeight: 800,
    color: "#475569",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  programTagWrap: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  programTagPresent: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    color: "#166534",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
  },
  programTagMissing: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    color: "#9f1239",
    background: "#fff1f2",
    border: "1px solid #fecdd3",
  },
  programTagNeutral: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    color: "#334155",
    background: "#f8fafc",
    border: "1px solid #cbd5e1",
  },
  bottomGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 16,
    marginBottom: 16,
  },
  listWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    maxHeight: 300,
    overflowY: "auto",
    paddingRight: 4,
  },
  listCard: {
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    borderRadius: 14,
    padding: 12,
  },
  listCardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: 800,
    color: "#0f172a",
  },
  listMeta: {
    marginTop: 4,
    fontSize: 12,
    color: "#64748b",
  },
  listDateMeta: {
    marginTop: 8,
    fontSize: 11,
    color: "#64748b",
  },
  innovationTableWrap: {
    overflowX: "auto",
  },
  innovationTable: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
  },
  innovationTh: {
    border: "1px solid #94a3b8",
    background: "#f1f5f9",
    textAlign: "left",
    padding: "12px 14px",
    fontWeight: 800,
  },
  innovationThCenter: {
    border: "1px solid #94a3b8",
    background: "#f1f5f9",
    textAlign: "center",
    padding: "12px 14px",
    fontWeight: 800,
  },
  innovationTdLabel: {
    border: "1px solid #cbd5e1",
    padding: "16px 14px",
    fontWeight: 800,
    background: "#fff",
    width: 180,
  },
  innovationTdCenter: {
    border: "1px solid #cbd5e1",
    padding: "16px 14px",
    textAlign: "center",
    background: "#fff",
    minHeight: 44,
  },
  comparisonControls: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  comparisonControlsBelowTitle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 12,
  },
  comparisonSelect: {
    minWidth: 140,
    border: "1px solid #cbd5e1",
    borderRadius: 12,
    background: "#fff",
    padding: "8px 10px",
    fontSize: 13,
    fontWeight: 700,
    outline: "none",
  },
  comparisonYearSelect: {
    minWidth: 92,
    border: "1px solid #cbd5e1",
    borderRadius: 12,
    background: "#fff",
    padding: "8px 10px",
    fontSize: 13,
    outline: "none",
  },
  comparisonToText: {
    fontSize: 12,
    fontWeight: 800,
    color: "#64748b",
    textTransform: "uppercase",
  },
  comparisonLayout: {
    display: "grid",
    gridTemplateColumns: "minmax(360px, 0.95fr) minmax(0, 1.35fr)",
    gap: 16,
    alignItems: "stretch",
  },
  comparisonTableWrap: {
    overflowX: "auto",
    border: "1px solid #cbd5e1",
    borderRadius: 16,
    background: "#fff",
  },
  comparisonTable: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
    minWidth: 620,
  },
  comparisonTh: {
    border: "1px solid #94a3b8",
    background: "#f8fafc",
    textAlign: "left",
    padding: 10,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },
  comparisonThCenter: {
    border: "1px solid #94a3b8",
    background: "#f8fafc",
    textAlign: "center",
    padding: 10,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },
  comparisonTdLabel: {
    border: "1px solid #cbd5e1",
    padding: 10,
    fontWeight: 800,
    background: "#fff",
    whiteSpace: "nowrap",
  },
  comparisonTdCenter: {
    border: "1px solid #cbd5e1",
    padding: 10,
    textAlign: "center",
    background: "#fff",
    minWidth: 70,
  },
  comparisonChartWrap: {
    height: 330,
    border: "1px solid #cbd5e1",
    borderRadius: 16,
    background: "#fff",
    padding: 12,
  },
  tableWrap: {
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 12,
  },
  th: {
    border: "1px solid #94a3b8",
    background: "#f1f5f9",
    textAlign: "left",
    padding: 8,
    fontWeight: 800,
  },
  thCenter: {
    border: "1px solid #94a3b8",
    background: "#f1f5f9",
    textAlign: "center",
    padding: 8,
    fontWeight: 800,
  },
  td: {
    border: "1px solid #cbd5e1",
    padding: 8,
    background: "#fff",
  },
  tdLabel: {
    border: "1px solid #cbd5e1",
    padding: 8,
    fontWeight: 700,
    background: "#fff",
  },
  tdCenter: {
    border: "1px solid #cbd5e1",
    padding: 8,
    textAlign: "center",
    background: "#fff",
  },
  matrixYes: {
    display: "inline-block",
    minWidth: 28,
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    color: "#166534",
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
  },
  matrixNo: {
    display: "inline-block",
    minWidth: 28,
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 800,
    color: "#9f1239",
    background: "#fff1f2",
    border: "1px solid #fecdd3",
  },
  modalBackdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(15,23,42,0.45)",
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "min(720px, 96vw)",
    maxHeight: "82vh",
    background: "#fff",
    borderRadius: 20,
    border: "1px solid #cbd5e1",
    boxShadow: "0 24px 80px rgba(15,23,42,0.28)",
    overflow: "hidden",
  },
  modalHeader: {
    padding: "16px 18px",
    background: "#f8fafc",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 900,
    color: "#0f172a",
  },
  modalSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#64748b",
  },
  modalCloseBtn: {
    border: "1px solid #cbd5e1",
    background: "#fff",
    borderRadius: 12,
    width: 34,
    height: 34,
    fontSize: 22,
    lineHeight: 1,
    cursor: "pointer",
    color: "#334155",
  },
  modalBody: {
    padding: 16,
    maxHeight: "64vh",
    overflowY: "auto",
  },
  modalListItem: {
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  modalItemTitle: {
    fontSize: 14,
    fontWeight: 900,
    color: "#0f172a",
  },
  modalItemMeta: {
    marginTop: 5,
    fontSize: 12,
    color: "#64748b",
    lineHeight: 1.45,
  },
  selectSmallYearPicker: {
    minWidth: 130,
    padding: "8px 10px",
    fontSize: 13,
    textAlign: "center",
  },
  bottomExtraWrap: {
    minHeight: 240,
  },
  emptyChartBox: {
    height: 240,
    border: "1px dashed #cbd5e1",
    borderRadius: 14,
    background: "#f8fafc",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
  },
  topUsedList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  topUsedItem: {
    display: "grid",
    gridTemplateColumns: "42px 1fr auto",
    alignItems: "center",
    gap: 12,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    borderRadius: 14,
    padding: 12,
  },
  topUsedRank: {
    width: 36,
    height: 36,
    borderRadius: 12,
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    color: "#1d4ed8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 900,
  },
  topUsedMain: {
    minWidth: 0,
  },
  topUsedTitle: {
    fontSize: 14,
    fontWeight: 900,
    color: "#0f172a",
  },
  topUsedMeta: {
    marginTop: 4,
    fontSize: 12,
    color: "#64748b",
  },
  topUsedValue: {
    minWidth: 44,
    textAlign: "center",
    borderRadius: 999,
    background: "#dcfce7",
    border: "1px solid #bbf7d0",
    color: "#166534",
    padding: "6px 10px",
    fontSize: 13,
    fontWeight: 900,
  },
  emptyState: {
    border: "1px dashed #cbd5e1",
    borderRadius: 14,
    background: "#f8fafc",
    padding: 16,
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
  },
};

