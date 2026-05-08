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
  Table,
  TableRow,
  TableCell,
  WidthType,
  PageOrientation,
} from "docx";

/* =========================
   ✅ Leaflet + React-Leaflet (Map integration)
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

/* ✅ Fix Leaflet marker icons */
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/* ✅ Pangasinan Municipalities/Cities */
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

/* ✅ District mapping */
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

const API_BASE_URL = `${API_BASE}/api/technology-rollout`;

const parseTechRolloutCustomFields = (value) => {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value || "{}");
  } catch {
    return {};
  }
};

const cleanTechRolloutCustomLabel = (value) =>
  String(value || "")
    .replace(/^#+/, "")
    .replace(/_/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());

const emptyForm = {
  quarter: "",
  unitCenter: "DOST-PANGASINAN",
  nameOfTechnologyTransferred: "",
  technologyGenerator: "",
  modeOfTransfer: "",
  isDostDevelopedFunded: false,
  dateTransferred: "",
  activityTitle: "",
  activityDate: "",
  activityVenue: "",
  institutionName: "",
  institutionAddress: "",
  institutionAddressMeta: null,
  classification: "",
  representativeName: "",
  representativeDesignation: "",
  sex: "",
  nameOfStaff: "",
  customFields: {},
};

const mapDbRowToUi = (row) => ({
  id: row.id,
  projectId:
    row.project_id !== null && row.project_id !== undefined
      ? Number(row.project_id)
      : null,
  interventionId:
    row.intervention_id !== null && row.intervention_id !== undefined
      ? Number(row.intervention_id)
      : null,
  quarter: row.quarter ? String(row.quarter) : "",
  unitCenter: row.unit_center || row.unitCenter || "DOST-PANGASINAN",

  nameOfTechnologyTransferred:
    row.name_of_technology_transferred ||
    row.nameOfTechnologyTransferred ||
    "",

  technologyGenerator:
    row.technology_generator ||
    row.technologyGenerator ||
    "",

  modeOfTransfer:
    row.mode_of_transfer ||
    row.modeOfTransfer ||
    "",

  isDostDevelopedFunded: Boolean(
    row.is_dost_developed_funded ?? row.isDostDevelopedFunded
  ),

  dateTransferred:
    row.date_transferred ||
    row.dateTransferred ||
    "",

  activityTitle:
    row.activity_title ||
    row.activityTitle ||
    "",

  activityDate:
    row.activity_date ||
    row.activityDate ||
    "",

  activityVenue:
    row.activity_venue ||
    row.activityVenue ||
    "",

  institutionName:
    row.institution_name ||
    row.institutionName ||
    "",

  institutionAddress:
    row.institution_address ||
    row.institutionAddress ||
    "",

  institutionAddressMeta: {
    mode: row.address_mode || row?.institutionAddressMeta?.mode || null,
    manualText:
      row.address_manual_text || row?.institutionAddressMeta?.manualText || "",
    displayText:
      row.address_display_text ||
      row?.institutionAddressMeta?.displayText ||
      row.institution_address ||
      row.institutionAddress ||
      "",
    province:
      row.address_province || row?.institutionAddressMeta?.province || "",
    municipality:
      row.address_municipality || row?.institutionAddressMeta?.municipality || "",
    barangay:
      row.address_barangay || row?.institutionAddressMeta?.barangay || "",
    lat:
      row.address_lat !== null && row.address_lat !== undefined
        ? Number(row.address_lat)
        : Number.isFinite(Number(row?.institutionAddressMeta?.lat))
        ? Number(row.institutionAddressMeta.lat)
        : null,
    lng:
      row.address_lng !== null && row.address_lng !== undefined
        ? Number(row.address_lng)
        : Number.isFinite(Number(row?.institutionAddressMeta?.lng))
        ? Number(row.institutionAddressMeta.lng)
        : null,
  },

  classification: row.classification || "",

  representativeName:
    row.representative_name ||
    row.representativeName ||
    "",

  representativeDesignation:
    row.representative_designation ||
    row.representativeDesignation ||
    "",

  sex: row.sex || "",
  nameOfStaff: row.name_of_staff || row.nameOfStaff || row.staffName || row.staff_name || "",
  staffName: row.name_of_staff || row.nameOfStaff || row.staffName || row.staff_name || "",
  customFields: parseTechRolloutCustomFields(row.customFields || row.custom_fields),
  custom_fields: parseTechRolloutCustomFields(row.custom_fields || row.customFields),
  sourceModule: row.source_module || row.sourceModule || "",
  sourceLabel: row.source_label || row.sourceLabel || "",
  createdAt: row.created_at || row.createdAt,
  updatedAt: row.updated_at || row.updatedAt,
});

const mapUiToApiPayload = (form) => {
  const finalInstitutionAddress = (
    form.institutionAddress ||
    form.institutionAddressMeta?.displayText ||
    form.institutionAddressMeta?.manualText ||
    ""
  ).trim();

  const quarter = Number(form.quarter || 0);
  const unitCenter = (form.unitCenter || "DOST-PANGASINAN").trim();
  const nameOfTechnologyTransferred = (form.nameOfTechnologyTransferred || "").trim();
  const technologyGenerator = (form.technologyGenerator || "").trim();
  const modeOfTransfer = form.modeOfTransfer || "";
  const isDostDevelopedFunded = form.isDostDevelopedFunded ? 1 : 0;
  const dateTransferred = form.dateTransferred || null;
  const activityTitle = (form.activityTitle || "").trim();
  const activityDate = form.activityDate || null;
  const activityVenue = (form.activityVenue || "").trim() || null;
  const institutionName = (form.institutionName || "").trim();
  const classification = form.classification || "";
  const representativeName = (form.representativeName || "").trim();
  const representativeDesignation =
    (form.representativeDesignation || "").trim() || null;
  const sex = (form.sex || "").trim() || null;
  const nameOfStaff = (form.nameOfStaff || "").trim() || null;

  const addressMode = form.institutionAddressMeta?.mode || null;
  const addressManualText = form.institutionAddressMeta?.manualText || null;
  const addressDisplayText =
    form.institutionAddressMeta?.displayText || finalInstitutionAddress || null;
  const addressProvince = form.institutionAddressMeta?.province || null;
  const addressMunicipality = form.institutionAddressMeta?.municipality || null;
  const addressBarangay = form.institutionAddressMeta?.barangay || null;
  const addressLat = Number.isFinite(Number(form.institutionAddressMeta?.lat))
    ? Number(form.institutionAddressMeta.lat)
    : null;
  const addressLng = Number.isFinite(Number(form.institutionAddressMeta?.lng))
    ? Number(form.institutionAddressMeta.lng)
    : null;

  return {
    quarter,

    unitCenter,
    unit_center: unitCenter,

    nameOfTechnologyTransferred,
    name_of_technology_transferred: nameOfTechnologyTransferred,

    technologyGenerator,
    technology_generator: technologyGenerator,

    modeOfTransfer,
    mode_of_transfer: modeOfTransfer,

    isDostDevelopedFunded,
    is_dost_developed_funded: isDostDevelopedFunded,

    dateTransferred,
    date_transferred: dateTransferred,

    activityTitle,
    activity_title: activityTitle,

    activityDate,
    activity_date: activityDate,

    activityVenue,
    activity_venue: activityVenue,

    institutionName,
    institution_name: institutionName,

    institutionAddress: finalInstitutionAddress,
    institution_address: finalInstitutionAddress,

    institutionAddressMeta: {
      mode: addressMode,
      manualText: addressManualText,
      displayText: addressDisplayText,
      province: addressProvince,
      municipality: addressMunicipality,
      barangay: addressBarangay,
      lat: addressLat,
      lng: addressLng,
    },

    addressMeta: {
      mode: addressMode,
      manualText: addressManualText,
      displayText: addressDisplayText,
      province: addressProvince,
      municipality: addressMunicipality,
      barangay: addressBarangay,
      lat: addressLat,
      lng: addressLng,
    },

    address_mode: addressMode,
    address_manual_text: addressManualText,
    address_display_text: addressDisplayText,
    address_province: addressProvince,
    address_municipality: addressMunicipality,
    address_barangay: addressBarangay,
    address_lat: addressLat,
    address_lng: addressLng,

    classification,

    representativeName,
    representative_name: representativeName,

    representativeDesignation,
    representative_designation: representativeDesignation,

    sex,

    nameOfStaff,
    name_of_staff: nameOfStaff,
    staffName: nameOfStaff,
    staff_name: nameOfStaff,
    custom_fields: form.customFields || {},
    customFields: form.customFields || {},
  };
};

const isRolloutSyncedFromIntervention = (row) => {
  const source = String(row?.sourceModule || row?.source_module || "").toLowerCase();
  if (source === "cest_interventions") return true;

  return (
    row?.interventionId !== null &&
    row?.interventionId !== undefined &&
    row?.interventionId !== ""
  );
};


export default function TechnologyRollout() {

  const fontFamily =
    '"Poppins", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"';

  const MODE_OF_TRANSFER_OPTIONS = ["Commercialization", "Extension", "Public Good"];

  const CLASSIFICATION_OPTIONS = [
    "Individual",
    "MSME/Firm",
    "Academe",
    "LGU",
    "Cooperative/Association",
  ];

  // ✅ Address selection data (Pangasinan muni list)
  const ADDRESS_DATA = useMemo(
    () => [
      {
        name: "Pangasinan",
        municipalities: PANGASINAN_LGUS.map((name) => ({
          name,
          center: null,
          barangays: null,
        })),
      },
    ],
    []
  );

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
    const foundKey = Object.keys(data || {}).find((k) => normalizeKey(k) === target);
    if (foundKey) {
      list = pick(foundKey);
      if (list) return list;
    }

    throw new Error(`No hardcoded barangay list for "${muniName}"`);
  }

  const quarterFromDate = (isoDate) => {
    if (!isoDate) return "";
    const d = new Date(isoDate);
    if (Number.isNaN(d.getTime())) return "";
    const m = d.getMonth() + 1;
    if (m <= 3) return "1";
    if (m <= 6) return "2";
    if (m <= 9) return "3";
    return "4";
  };

  const getYearFromDate = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.getFullYear();
  };

  const getMonthFromDate = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.getMonth() + 1;
  };

  const MONTH_OPTIONS = [
    { value: "", label: "All Months" },
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  // ===== Export helpers =====
  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const csvEscape = (v) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const safeFilePart = (s) =>
    String(s || "")
      .trim()
      .replace(/[^\w-]+/g, "_")
      .slice(0, 40);

  const exportRecordsCSV = (rows, filename = "TechnologyRollout.csv") => {
    const headers = [
      "NO",
      "UNIT/CENTER",
      "NAME OF KNOWLEDGE/TECHNOLOGY TRANSFERRED",
      "TECHNOLOGY GENERATOR",
      "MODE OF TRANSFER",
      "DOST-DEVELOPED/FUNDED",
      "DATE TRANSFERRED",
      "ACTIVITY TITLE",
      "ACTIVITY DATE",
      "ACTIVITY VENUE",
      "INSTITUTION NAME",
      "INSTITUTION ADDRESS",
      "MUNICIPALITY",
      "BARANGAY",
      "LAT",
      "LNG",
      "CLASSIFICATION",
      "REPRESENTATIVE NAME",
      "REPRESENTATIVE DESIGNATION",
      "SEX",
      "NAME OF STAFF",
      "QUARTER",
    ];

    const lines = [
      headers.join(","),
      ...(rows || []).map((r, i) => {
        const muni = r?.institutionAddressMeta?.municipality || "";
        const brgy = r?.institutionAddressMeta?.barangay || "";
        const lat = Number.isFinite(r?.institutionAddressMeta?.lat)
          ? r.institutionAddressMeta.lat
          : "";
        const lng = Number.isFinite(r?.institutionAddressMeta?.lng)
          ? r.institutionAddressMeta.lng
          : "";

        return [
          i + 1,
          r?.unitCenter || "DOST-PANGASINAN",
          r?.nameOfTechnologyTransferred || "",
          r?.technologyGenerator || "",
          r?.modeOfTransfer || "",
          r?.isDostDevelopedFunded ? "YES" : "NO",
          r?.dateTransferred || "",
          r?.activityTitle || "",
          r?.activityDate || "",
          r?.activityVenue || "",
          r?.institutionName || "",
          r?.institutionAddress || "",
          muni,
          brgy,
          lat,
          lng,
          r?.classification || "",
          r?.representativeName || "",
          r?.representativeDesignation || "",
          r?.sex || "",
          r?.nameOfStaff || r?.staffName || "",
          r?.quarter ? `${String(r.quarter)}Q` : "",
        ]
          .map(csvEscape)
          .join(",");
      }),
    ];

    const out = filename.endsWith(".csv") ? filename : `${filename}.csv`;
    downloadBlob(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" }), out);
  };

  const exportRecordsExcel = (rows, filename = "TechnologyRollout.xlsx") => {
    const data = (rows || []).map((r, i) => ({
      NO: i + 1,
      "UNIT/CENTER": r?.unitCenter || "DOST-PANGASINAN",
      "NAME OF KNOWLEDGE/TECHNOLOGY TRANSFERRED":
        r?.nameOfTechnologyTransferred || "",
      "TECHNOLOGY GENERATOR": r?.technologyGenerator || "",
      "MODE OF TRANSFER": r?.modeOfTransfer || "",
      "DOST-DEVELOPED/FUNDED": r?.isDostDevelopedFunded ? "YES" : "NO",
      "DATE TRANSFERRED": r?.dateTransferred || "",
      "ACTIVITY TITLE": r?.activityTitle || "",
      "ACTIVITY DATE": r?.activityDate || "",
      "ACTIVITY VENUE": r?.activityVenue || "",
      "INSTITUTION NAME": r?.institutionName || "",
      "INSTITUTION ADDRESS": r?.institutionAddress || "",
      MUNICIPALITY: r?.institutionAddressMeta?.municipality || "",
      BARANGAY: r?.institutionAddressMeta?.barangay || "",
      LAT: Number.isFinite(r?.institutionAddressMeta?.lat)
        ? r.institutionAddressMeta.lat
        : "",
      LNG: Number.isFinite(r?.institutionAddressMeta?.lng)
        ? r.institutionAddressMeta.lng
        : "",
      CLASSIFICATION: r?.classification || "",
      "REPRESENTATIVE NAME": r?.representativeName || "",
      "REPRESENTATIVE DESIGNATION": r?.representativeDesignation || "",
      SEX: r?.sex || "",
      "NAME OF STAFF": r?.nameOfStaff || r?.staffName || "",
      QUARTER: r?.quarter ? `${String(r.quarter)}Q` : "",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "TechnologyRollout");

    const arr = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const out = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;

    downloadBlob(
      new Blob([arr], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      out
    );
  };

  const exportRecordsPDF = async (rows, options) => {
    const {
      template = "TABLE",
      preset = "a4",
      orientation = "landscape",
      customSize = { width: 8.5, height: 13 },
      filename = "TechnologyRollout.pdf",
      titleLabel = "Technology Rollout Export",
    } = options || {};

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

    const safeName = String(filename || "TechnologyRollout.pdf");
    const outName = safeName.toLowerCase().endsWith(".pdf")
      ? safeName
      : `${safeName}.pdf`;

    const hasMany = Array.isArray(rows) && rows.length > 1;

    const buildDatasetTable = (rowsToUse) => {
      const head = [[
        "NO",
        "UNIT/CENTER",
        "KNOWLEDGE/TECHNOLOGY",
        "GENERATOR",
        "MODE",
        "DOST",
        "DATE TRANSFERRED",
        "ACTIVITY TITLE",
        "ACTIVITY DATE/VENUE",
        "INSTITUTION",
        "CLASSIFICATION",
        "REPRESENTATIVE",
        "SEX",
        "QUARTER",
      ]];

      const body = (rowsToUse || []).map((r, i) => {
        const dateVenue = `${r?.activityDate || ""}${r?.activityVenue ? ` / ${r.activityVenue}` : ""}`.trim();
        const inst = `${r?.institutionName || ""}${r?.institutionAddress ? `\n${r.institutionAddress}` : ""}`.trim();
        const rep = `${r?.representativeName || ""}${r?.representativeDesignation ? `\n${r.representativeDesignation}` : ""}`.trim();

        return [
          i + 1,
          r?.unitCenter || "DOST-PANGASINAN",
          r?.nameOfTechnologyTransferred || "",
          r?.technologyGenerator || "",
          r?.modeOfTransfer || "",
          r?.isDostDevelopedFunded ? "YES" : "NO",
          r?.dateTransferred || "",
          r?.activityTitle || "",
          dateVenue || "—",
          inst || "—",
          r?.classification || "",
          rep || "—",
          r?.sex || "",
          r?.nameOfStaff || r?.staffName || "",
          r?.quarter ? `${String(r.quarter)}Q` : "",
        ];
      });

      doc.setFontSize(14);
      doc.text(String(titleLabel || "Technology Rollout Export"), 10, 12);
      doc.setFontSize(9);
      doc.text(`Rows: ${body.length}`, 10, 18);

      autoTable(doc, {
        head,
        body,
        startY: 22,
        styles: { fontSize: 7, cellPadding: 1.5, overflow: "linebreak" },
        headStyles: { fontSize: 7 },
      });
    };

    const buildKeyValueRecord = (r, recordIndex) => {
      const coords =
        Number.isFinite(r?.institutionAddressMeta?.lat) &&
        Number.isFinite(r?.institutionAddressMeta?.lng)
          ? `${r.institutionAddressMeta.lat}, ${r.institutionAddressMeta.lng}`
          : "—";

      const pairs = [
        ["Quarter", r?.quarter ? `${String(r.quarter)}Q` : "—"],
        ["Unit/Center", r?.unitCenter || "DOST-PANGASINAN"],
        ["Knowledge/Technology Transferred", r?.nameOfTechnologyTransferred || "—"],
        ["Technology Generator", r?.technologyGenerator || "—"],
        ["Mode of Transfer", r?.modeOfTransfer || "—"],
        ["DOST-developed/funded", r?.isDostDevelopedFunded ? "YES" : "NO"],
        ["Date Transferred", r?.dateTransferred || "—"],
        ["Activity Title", r?.activityTitle || "—"],
        ["Activity Date", r?.activityDate || "—"],
        ["Activity Venue", r?.activityVenue || "—"],
        ["Institution Name", r?.institutionName || "—"],
        ["Institution Address", r?.institutionAddress || "—"],
        ["Coordinates", coords],
        ["Classification", r?.classification || "—"],
        ["Representative Name", r?.representativeName || "—"],
        ["Representative Designation", r?.representativeDesignation || "—"],
        ["Sex", r?.sex || "—"],
        ["Name of Staff", r?.nameOfStaff || r?.staffName || "—"],
      ];

      doc.setFontSize(14);
      doc.text(`${titleLabel || "Record"} — ${recordIndex + 1}`, 10, 12);
      doc.setFontSize(10);
      doc.text(`Template: ${template}`, 10, 18);

      autoTable(doc, {
        head: [["Field", "Value"]],
        body: pairs.map(([k, v]) => [String(k), String(v ?? "")]),
        startY: 22,
        styles: { fontSize: 9, cellPadding: 2, overflow: "linebreak" },
        columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: "auto" } },
      });
    };

    if (hasMany || template === "TABLE") buildDatasetTable(rows);
    else {
      const r = (rows || [])[0];
      if (!r) return alert("No record to export.");
      buildKeyValueRecord(r, 0);
    }

    doc.save(outName);
  };

  const exportRecordsDOCX = async (rows, options) => {
    const { template, filename, orientation } = options;

    const children = [];
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "Technology Rollout Export", bold: true, size: 32 })],
      })
    );

    const addSpacer = () => children.push(new Paragraph({ text: "" }));

    const makeTable = (pairs) => {
      const rowsDoc = pairs.map(([k, v]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 35, type: WidthType.PERCENTAGE },
              children: [new Paragraph({ children: [new TextRun({ text: String(k), bold: true })] })],
            }),
            new TableCell({
              width: { size: 65, type: WidthType.PERCENTAGE },
              children: [new Paragraph(String(v ?? "—"))],
            }),
          ],
        })
      );

      return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: rowsDoc,
      });
    };

    rows.forEach((r, idx) => {
      if (idx > 0) children.push(new Paragraph({ pageBreakBefore: true }));

      children.push(
        new Paragraph({
          children: [new TextRun({ text: `Record ${idx + 1}`, bold: true, size: 26 })],
        })
      );
      addSpacer();

      const coords =
        Number.isFinite(r?.institutionAddressMeta?.lat) &&
        Number.isFinite(r?.institutionAddressMeta?.lng)
          ? `${r.institutionAddressMeta.lat}, ${r.institutionAddressMeta.lng}`
          : "—";

      children.push(
        makeTable([
          ["Quarter", r?.quarter ? `${String(r.quarter)}Q` : "—"],
          ["Unit/Center", r?.unitCenter || "DOST-PANGASINAN"],
          ["Knowledge/Technology Transferred", r?.nameOfTechnologyTransferred || "—"],
          ["Technology Generator", r?.technologyGenerator || "—"],
          ["Mode of Transfer", r?.modeOfTransfer || "—"],
          ["DOST-developed/funded", r?.isDostDevelopedFunded ? "YES" : "NO"],
          ["Date Transferred", r?.dateTransferred || "—"],
          ["Activity Title", r?.activityTitle || "—"],
          ["Activity Date", r?.activityDate || "—"],
          ["Activity Venue", r?.activityVenue || "—"],
          ["Institution Name", r?.institutionName || "—"],
          ["Institution Address", r?.institutionAddress || "—"],
          ["Coordinates", coords],
          ["Classification", r?.classification || "—"],
          ["Representative Name", r?.representativeName || "—"],
          ["Representative Designation", r?.representativeDesignation || "—"],
          ["Sex", r?.sex || "—"],
          ["Name of Staff", r?.nameOfStaff || r?.staffName || "—"],
        ])
      );
    });

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              size: {
                orientation:
                  orientation === "portrait"
                    ? PageOrientation.PORTRAIT
                    : PageOrientation.LANDSCAPE,
              },
            },
          },
          children,
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    downloadBlob(blob, filename.endsWith(".docx") ? filename : `${filename}.docx`);
  };

  // ===== Print helpers (HTML print) =====
  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const PRINT_LAYOUT_LABEL = {
    FORM: "Form-Based Record Sheet",
    TABLE: "Table Sheet",
    COMPACT: "Compact Sheet",
  };

  const getPageRule = (preset, orientation, custom) => {
    const ori = orientation === "portrait" ? "portrait" : "landscape";
    if (preset === "a4") return `@page { size: A4 ${ori}; margin: 10mm; }`;
    if (preset === "letter") return `@page { size: Letter ${ori}; margin: 10mm; }`;
    if (preset === "legal") return `@page { size: Legal ${ori}; margin: 10mm; }`;
    if (preset === "custom" && custom?.width && custom?.height) {
      const w = Number(custom.width);
      const h = Number(custom.height);
      if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
        return `@page { size: ${w}in ${h}in; margin: 10mm; }`;
      }
    }
    return `@page { size: A4 ${ori}; margin: 10mm; }`;
  };

  const buildRecordSheetInner = (record, layoutKey, titleLabel) => {
    const coords =
      Number.isFinite(record?.institutionAddressMeta?.lat) &&
      Number.isFinite(record?.institutionAddressMeta?.lng)
        ? `${record.institutionAddressMeta.lat}, ${record.institutionAddressMeta.lng}`
        : "—";

    const header = `
      <div class="header">
        <div>
          <h1>Technology Rollout Record</h1>
          <div class="sub">${escapeHtml(PRINT_LAYOUT_LABEL[layoutKey] || "Print")}</div>
        </div>
        <div class="sub">${escapeHtml(titleLabel || "")}</div>
      </div>
    `;

    const formLayout = `
      <div class="grid">
        <div class="field"><div class="label">Quarter</div><div class="value">${escapeHtml(record?.quarter ? `${record.quarter}Q` : "—")}</div></div>
        <div class="field"><div class="label">Unit/Center</div><div class="value">${escapeHtml(record?.unitCenter || "DOST-PANGASINAN")}</div></div>

        <div class="field full"><div class="label">Knowledge/Technology Transferred</div><div class="value">${escapeHtml(record?.nameOfTechnologyTransferred || "—")}</div></div>

        <div class="field"><div class="label">Technology Generator</div><div class="value">${escapeHtml(record?.technologyGenerator || "—")}</div></div>
        <div class="field"><div class="label">Mode of Transfer</div><div class="value">${escapeHtml(record?.modeOfTransfer || "—")}</div></div>

        <div class="field"><div class="label">DOST-developed/funded</div><div class="value">${escapeHtml(record?.isDostDevelopedFunded ? "YES" : "NO")}</div></div>
        <div class="field"><div class="label">Date Transferred</div><div class="value">${escapeHtml(record?.dateTransferred || "—")}</div></div>

        <div class="field full"><div class="label">Activity Title</div><div class="value">${escapeHtml(record?.activityTitle || "—")}</div></div>

        <div class="field"><div class="label">Activity Date</div><div class="value">${escapeHtml(record?.activityDate || "—")}</div></div>
        <div class="field"><div class="label">Activity Venue</div><div class="value">${escapeHtml(record?.activityVenue || "—")}</div></div>

        <div class="field"><div class="label">Institution Name</div><div class="value">${escapeHtml(record?.institutionName || "—")}</div></div>
        <div class="field"><div class="label">Classification</div><div class="value">${escapeHtml(record?.classification || "—")}</div></div>

        <div class="field full"><div class="label">Institution Address</div><div class="value">${escapeHtml(record?.institutionAddress || "—")}</div></div>

        <div class="field"><div class="label">Coordinates</div><div class="value">${escapeHtml(coords)}</div></div>
        <div class="field"><div class="label">Sex</div><div class="value">${escapeHtml(record?.sex || "—")}</div></div>
        <div class="field"><div class="label">Name of Staff</div><div class="value">${escapeHtml(record?.nameOfStaff || record?.staffName || "—")}</div></div>

        <div class="field"><div class="label">Representative Name</div><div class="value">${escapeHtml(record?.representativeName || "—")}</div></div>
        <div class="field"><div class="label">Representative Designation</div><div class="value">${escapeHtml(record?.representativeDesignation || "—")}</div></div>
      </div>
    `;

    const tableLayout = `
      <table class="kvTable">
        <tbody>
          <tr><th>Quarter</th><td>${escapeHtml(record?.quarter ? `${record.quarter}Q` : "—")}</td><th>Unit/Center</th><td>${escapeHtml(record?.unitCenter || "DOST-PANGASINAN")}</td></tr>
          <tr><th>Knowledge/Technology</th><td colspan="3">${escapeHtml(record?.nameOfTechnologyTransferred || "—")}</td></tr>
          <tr><th>Generator</th><td>${escapeHtml(record?.technologyGenerator || "—")}</td><th>Mode</th><td>${escapeHtml(record?.modeOfTransfer || "—")}</td></tr>
          <tr><th>DOST</th><td>${escapeHtml(record?.isDostDevelopedFunded ? "YES" : "NO")}</td><th>Date Transferred</th><td>${escapeHtml(record?.dateTransferred || "—")}</td></tr>
          <tr><th>Activity Title</th><td colspan="3">${escapeHtml(record?.activityTitle || "—")}</td></tr>
          <tr><th>Activity Date</th><td>${escapeHtml(record?.activityDate || "—")}</td><th>Venue</th><td>${escapeHtml(record?.activityVenue || "—")}</td></tr>
          <tr><th>Institution</th><td>${escapeHtml(record?.institutionName || "—")}</td><th>Classification</th><td>${escapeHtml(record?.classification || "—")}</td></tr>
          <tr><th>Institution Address</th><td colspan="3">${escapeHtml(record?.institutionAddress || "—")}</td></tr>
          <tr><th>Coordinates</th><td>${escapeHtml(coords)}</td><th>Sex</th><td>${escapeHtml(record?.sex || "—")}</td></tr>
          <tr><th>Representative</th><td>${escapeHtml(record?.representativeName || "—")}</td><th>Designation</th><td>${escapeHtml(record?.representativeDesignation || "—")}</td></tr>
        </tbody>
      </table>
    `;

    const compactLayout = `
      <div class="compact">
        <div><b>Knowledge/Technology:</b> ${escapeHtml(record?.nameOfTechnologyTransferred || "—")}</div>
        <div><b>Generator:</b> ${escapeHtml(record?.technologyGenerator || "—")}</div>
        <div><b>Mode:</b> ${escapeHtml(record?.modeOfTransfer || "—")} &nbsp; <b>DOST:</b> ${escapeHtml(record?.isDostDevelopedFunded ? "YES" : "NO")}</div>
        <div><b>Date Transferred:</b> ${escapeHtml(record?.dateTransferred || "—")} &nbsp; <b>Quarter:</b> ${escapeHtml(record?.quarter ? `${record.quarter}Q` : "—")}</div>
        <div><b>Activity:</b> ${escapeHtml(record?.activityTitle || "—")}</div>
        <div><b>Date/Venue:</b> ${escapeHtml(record?.activityDate || "—")} / ${escapeHtml(record?.activityVenue || "—")}</div>
        <div><b>Institution:</b> ${escapeHtml(record?.institutionName || "—")}</div>
        <div><b>Address:</b> ${escapeHtml(record?.institutionAddress || "—")}</div>
        <div><b>Coords:</b> ${escapeHtml(coords)}</div>
        <div><b>Representative:</b> ${escapeHtml(record?.representativeName || "—")} (${escapeHtml(record?.sex || "—")})</div>
        <div><b>Name of Staff:</b> ${escapeHtml(record?.nameOfStaff || record?.staffName || "—")}</div>
        <div><b>Designation:</b> ${escapeHtml(record?.representativeDesignation || "—")}</div>
      </div>
    `;

    const bodyHtml =
      layoutKey === "FORM"
        ? formLayout
        : layoutKey === "TABLE"
        ? tableLayout
        : compactLayout;

    return `
      <div class="sheet">
        ${header}
        <div class="body">
          ${bodyHtml}
          <div class="footer-note">Generated from Technology Rollout page</div>
        </div>
      </div>
    `;
  };

  const buildPrintDocument = (recordsToPrint, options) => {
    const { preset, orientation, customSize, layoutKey, titleLabel } = options;
    const pageRule = getPageRule(preset, orientation, customSize);

    const sheets = (recordsToPrint || [])
      .map((r, idx) => {
        const html = buildRecordSheetInner(r, layoutKey, titleLabel || "");
        const breaker = idx === recordsToPrint.length - 1 ? "" : `<div class="pageBreak"></div>`;
        return html + breaker;
      })
      .join("");

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Technology Rollout Print</title>
  <style>
    ${pageRule}
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #0f172a;
      padding: 12px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .pageBreak { page-break-after: always; }

    .sheet { width: 100%; border: 2px solid #334155; border-radius: 10px; overflow: hidden; }
    .header { background: #0b4ea2; color: white; padding: 14px 16px; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
    .header h1 { margin: 0; font-size: 20px; line-height: 1.2; }
    .header .sub { margin-top: 4px; font-size: 12px; opacity: 0.95; font-weight: bold; }
    .body { padding: 14px; }

    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-bottom: 14px; }
    .field { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; min-height: 58px; }
    .field.full { grid-column: 1 / -1; }
    .label { font-size: 11px; font-weight: 700; color: #334155; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.04em; }
    .value { font-size: 13px; font-weight: 600; white-space: pre-wrap; word-break: break-word; }

    .kvTable { width: 100%; border-collapse: collapse; }
    .kvTable th, .kvTable td { border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 12px; vertical-align: top; }
    .kvTable th { background: #eef2f6; text-align: left; width: 170px; font-weight: 900; }

    .compact { display: grid; gap: 6px; font-size: 12px; font-weight: 600; }
    .compact b { font-weight: 900; }

    .footer-note { margin-top: 12px; font-size: 11px; color: #64748b; text-align: right; font-weight: 700; }

    @media print {
      .no-print { display: none !important; }
      body { padding: 0; }
      .sheet { border-radius: 0; }
    }
  </style>
</head>
<body>
  <script>
    window.addEventListener('load', function(){
      setTimeout(function(){
        try { window.print(); } catch(e) {}
      }, 250);
    });
  </script>
  <div class="no-print" style="margin:0 0 10px; padding:10px 12px; border:1px solid #cbd5e1; border-radius:10px; background:#f8fafc; font-weight:800; font-size:12px;">
    Tip: If the Print dialog did not open automatically, press <b>Ctrl+P</b>. Then choose <b>Destination → Save as PDF</b>.
  </div>
  ${sheets}
</body>
</html>
    `;
  };

  const doPrint = (rows, options) => {
    const win = window.open("", "_blank", "width=1200,height=900");
    if (!win) {
      alert("Popup blocked. Please allow popups for printing.");
      return;
    }

    const html = buildPrintDocument(rows, options);

    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();

    try {
      win.onload = () => {
        setTimeout(() => {
          try { win.print(); } catch {}
        }, 250);
      };
    } catch {}
  };

  // ===== State =====
  const [records, setRecords] = useState([]);
  const [techRolloutCustomFields, setTechRolloutCustomFields] = useState([]);

  const [showAdd, setShowAdd] = useState(false);
  const [editRecordId, setEditRecordId] = useState(null);

  const [viewRecordId, setViewRecordId] = useState(null);
  const [viewMode, setViewMode] = useState("list");

  const [addressFlowOpen, setAddressFlowOpen] = useState(false);
  const [institutionAddressViewForId, setInstitutionAddressViewForId] = useState(null);

  // ✅ Filter / Sort state
  const [filterYear, setFilterYear] = useState("");
  const [filterDistrict, setFilterDistrict] = useState("");
  const [filterQuarter, setFilterQuarter] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterMunicipality, setFilterMunicipality] = useState("");
  const [recordView, setRecordView] = useState("overall");
  const [sortOrder, setSortOrder] = useState("oldest");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [serverTotalRows, setServerTotalRows] = useState(0);
  const [serverTotalPages, setServerTotalPages] = useState(1);

  const ITEMS_PER_PAGE = 10;
  const PAGE_NUMBER_WINDOW = 10;

  // ✅ Print & Export Modals
  const [printModal, setPrintModal] = useState({
    open: false,
    scope: "bulk",
    recordId: null,
    layout: "FORM",
    preset: "a4",
    orientation: "landscape",
    customSize: { width: 8.5, height: 13 },
  });

  const [exportModal, setExportModal] = useState({
    open: false,
    scope: "bulk",
    recordId: null,
    format: "excel",
    template: "TABLE",
    preset: "a4",
    orientation: "landscape",
    customSize: { width: 8.5, height: 13 },
  });

  const [form, setForm] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState("");

  // ===== MAP =====
  const [outlineGeo, setOutlineGeo] = useState(null);
  const [municipalGeo, setMunicipalGeo] = useState(null);
  const [geoError, setGeoError] = useState("");

  const [borderMode, setBorderMode] = useState("municipality");
  const [selectedMunicipality, setSelectedMunicipality] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");


  useEffect(() => {
    let cancelled = false;

    const fixedKeys = new Set([
      "no",
      "actions",
      "quarter",
      "unitCenter",
      "unit_center",
      "nameOfTechnologyTransferred",
      "name_of_technology_transferred",
      "technologyGenerator",
      "technology_generator",
      "modeOfTransfer",
      "mode_of_transfer",
      "isDostDevelopedFunded",
      "is_dost_developed_funded",
      "dateTransferred",
      "date_transferred",
      "activityTitle",
      "activity_title",
      "activityDate",
      "activity_date",
      "activityVenue",
      "activity_venue",
      "institutionName",
      "institution_name",
      "institutionAddress",
      "institution_address",
      "institutionAddressMeta",
      "classification",
      "representativeName",
      "representative_name",
      "representativeDesignation",
      "representative_designation",
      "sex",
      "nameOfStaff",
      "name_of_staff",
      "staffName",
      "staff_name",
      "source",
      "sourceModule",
      "source_module"
    ]);

    async function loadTechRolloutCustomFields() {
      try {
        const res = await axios.get(`${API_BASE}/api/table-management/config`);
        const modules = Array.isArray(res.data) ? res.data : [];

        const mod = modules.find((m) => {
          const name = String(m.moduleName || m.module_name || m.name || "").toLowerCase();
          return (
            name === "technology rollout" ||
            name === "technology roll out" ||
            name === "tech rollout" ||
            name === "tech roll out" ||
            name.includes("technology rollout") ||
            name.includes("technology roll out") ||
            name.includes("tech rollout") ||
            name.includes("tech roll out")
          );
        });

        const table =
          (mod?.tables || []).find((t) => {
            const name = String(t.tableName || t.table_name || t.name || "").toLowerCase();
            return name === "main" || name.includes("rollout") || name.includes("roll out");
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

        if (!cancelled) setTechRolloutCustomFields(finalCustomFields);
      } catch (err) {
        console.error("Failed to load Technology Rollout custom fields:", err);
        if (!cancelled) {
          setTechRolloutCustomFields([
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

    loadTechRolloutCustomFields();

    return () => {
      cancelled = true;
    };
  }, []);
  const loadRecords = async (pageArg = currentPage) => {
    setIsLoading(true);
    setApiError("");
    try {
      const requestedPage = Math.max(1, Number(pageArg || 1));

      const res = await axios.get(API_BASE_URL, {
        params: {
          page: requestedPage,
          limit: ITEMS_PER_PAGE,
          search: debouncedSearch,
          year: filterYear,
          quarter: filterQuarter,
          month: filterMonth,
          district: filterDistrict,
          municipality: filterMunicipality,
        },
      });

      const rows = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.rows)
        ? res.data.rows
        : [];

      setRecords(
        rows.map((row) => {
          const mapped = mapDbRowToUi(row);
          return {
            ...mapped,
            syncedFromIntervention: isRolloutSyncedFromIntervention(mapped),
          };
        })
      );

      setServerTotalRows(Number(res?.data?.total || rows.length || 0));
      setServerTotalPages(Math.max(1, Number(res?.data?.totalPages || 1)));
    } catch (err) {
      console.error("Failed to load technology rollout records:", err);
      setApiError(
        err?.response?.data?.message || "Failed to load technology rollout records."
      );
      setRecords([]);
      setServerTotalRows(0);
      setServerTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRecords(currentPage);
  }, [
    currentPage,
    debouncedSearch,
    filterYear,
    filterQuarter,
    filterMonth,
    filterDistrict,
    filterMunicipality,
  ]);

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
        if (!mRes.ok) throw new Error("Missing /geo/pangasinan_municipalities.geojson");

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
        setShowAdd(false);
        setEditRecordId(null);
        setViewRecordId(null);
        setAddressFlowOpen(false);
        setInstitutionAddressViewForId(null);
        setPrintModal((p) => ({ ...p, open: false }));
        setExportModal((p) => ({ ...p, open: false }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(String(searchTerm || "").trim());
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    debouncedSearch,
    filterYear,
    filterQuarter,
    filterMonth,
    filterDistrict,
    filterMunicipality,
  ]);

  // ===== Filtered/sorted dataset =====
  const yearOptions = useMemo(() => {
    return Array.from({ length: 2050 - 1970 + 1 }, (_, index) => 2050 - index);
  }, []);

  const getDistrictFromMunicipality = (municipality) => {
    const target = String(municipality || "").trim().toLowerCase();
    if (!target) return "";

    const found = PANGASINAN_DISTRICTS.find((district) =>
      district.municipalities.some((name) => String(name || "").trim().toLowerCase() === target)
    );

    return found?.id || "";
  };

  const getRecordMunicipality = (r) => {
    const m1 = r?.institutionAddressMeta?.municipality;
    if (m1) return String(m1).trim();

    const addr = String(r?.institutionAddress || "").trim();
    if (!addr) return "";

    const parts = addr.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) return parts[parts.length - 2];
    return "";
  };

  const municipalityFilterOptions = useMemo(() => {
    if (!filterDistrict) return [...PANGASINAN_LGUS];

    const district = PANGASINAN_DISTRICTS.find((item) => item.id === filterDistrict);
    return [...(district?.municipalities || [])].sort((a, b) => a.localeCompare(b));
  }, [filterDistrict]);

  const filteredRecords = useMemo(() => {
    return records;
  }, [records]);

  const totalPages = Math.max(1, Number(serverTotalPages || 1));
  const effectivePage = Math.min(currentPage, totalPages);

  const pageWindowStart =
    Math.floor((currentPage - 1) / PAGE_NUMBER_WINDOW) * PAGE_NUMBER_WINDOW + 1;

  const visiblePageNumbers = Array.from(
    { length: PAGE_NUMBER_WINDOW },
    (_, i) => pageWindowStart + i
  );

  const activeLogoIndex = Math.min(
    PAGE_NUMBER_WINDOW - 1,
    Math.max(0, currentPage - pageWindowStart)
  );

  const paginationLogoOSlots = Array.from({ length: PAGE_NUMBER_WINDOW }, (_, i) => i);

  const getRecordById = (id) => filteredRecords.find((x) => x.id === id) || null;

  // ===== Print / Export popup actions =====
  const openPrintPopupRow = (recordId) => {
    setPrintModal((p) => ({
      ...p,
      open: true,
      scope: "row",
      recordId,
      layout: "FORM",
      preset: "a4",
      orientation: "landscape",
    }));
  };

  const openPrintPopupBulk = () => {
    setPrintModal((p) => ({
      ...p,
      open: true,
      scope: "bulk",
      recordId: null,
      layout: "FORM",
      preset: "a4",
      orientation: "landscape",
    }));
  };

  const confirmPrint = () => {
    const rows =
      printModal.scope === "row"
        ? [getRecordById(printModal.recordId)].filter(Boolean)
        : filteredRecords;

    if (!rows.length) return alert("No rows to print.");

    const titleLabel =
      printModal.scope === "row"
        ? `${PRINT_LAYOUT_LABEL[printModal.layout] || "Print"} — ${rows[0]?.institutionName || "Record"}`
        : `${PRINT_LAYOUT_LABEL[printModal.layout] || "Print"} — Filtered (${rows.length} records)`;

    doPrint(rows, {
      layoutKey: printModal.layout,
      preset: printModal.preset,
      orientation: printModal.orientation,
      customSize: printModal.customSize,
      titleLabel,
    });

    setPrintModal((p) => ({ ...p, open: false }));
  };

  const openExportPopupRow = (recordId) => {
    setExportModal({
      open: true,
      scope: "row",
      recordId,
      format: "excel",
      template: "TABLE",
      preset: "a4",
      orientation: "landscape",
      customSize: { width: 8.5, height: 13 },
    });
  };

  const openExportPopupBulk = () => {
    setExportModal({
      open: true,
      scope: "bulk",
      recordId: null,
      format: "excel",
      template: "TABLE",
      preset: "a4",
      orientation: "landscape",
      customSize: { width: 8.5, height: 13 },
    });
  };

  const confirmExport = async () => {
    const rows =
      exportModal.scope === "row"
        ? [getRecordById(exportModal.recordId)].filter(Boolean)
        : filteredRecords;

    if (!rows.length) return alert("No rows to export.");

    const baseName =
      exportModal.scope === "row"
        ? `TechnologyRollout_${safeFilePart(rows[0]?.institutionName)}_${safeFilePart(rows[0]?.dateTransferred)}`
        : `TechnologyRollout_Filtered_${rows.length}_rows`;

    if (exportModal.format === "csv") {
      exportRecordsCSV(rows, `${baseName}.csv`);
    } else if (exportModal.format === "excel") {
      exportRecordsExcel(rows, `${baseName}.xlsx`);
    } else if (exportModal.format === "pdf") {
      await exportRecordsPDF(rows, {
        template: exportModal.template,
        preset: exportModal.preset,
        orientation: exportModal.orientation,
        customSize: exportModal.customSize,
        titleLabel:
          exportModal.scope === "row"
            ? `Export PDF — ${rows[0]?.institutionName || "Record"}`
            : `Export PDF — Filtered (${rows.length})`,
        filename: `${baseName}.pdf`,
      });
    } else if (exportModal.format === "docx") {
      await exportRecordsDOCX(rows, {
        template: exportModal.template,
        orientation: exportModal.orientation,
        filename: `${baseName}.docx`,
      });
    }

    setExportModal((p) => ({ ...p, open: false }));
  };


  const getTechRolloutCustomPairs = (entry = {}) => {
    const values = parseTechRolloutCustomFields(entry.customFields || entry.custom_fields);

    return (techRolloutCustomFields || []).map((field) => {
      const key = field.fieldKey || field.field_key || field.key;
      const rawLabel = field.fieldLabel || field.field_label || field.label || key;
      const value = values?.[key];

      return {
        key,
        label: cleanTechRolloutCustomLabel(rawLabel),
        value: value === null || value === undefined || value === "" ? "—" : String(value),
      };
    });
  };

  const renderTechRolloutCustomInputs = () => {
    if (!techRolloutCustomFields.length) return null;

    return (
      <>
        {techRolloutCustomFields.map((field) => {
          const key = field.fieldKey || field.field_key || field.key;
          const rawLabel = field.fieldLabel || field.field_label || field.label || key;
          const label = cleanTechRolloutCustomLabel(rawLabel);
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
            <div key={key} style={{ ...styles.field, gridColumn: "1 / -1" }}>
              <div style={styles.label}>
                {label}
                {required ? " *" : ""}
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

  const renderTechRolloutCustomViewFields = (entry) => {
    const pairs = getTechRolloutCustomPairs(entry);
    if (!pairs.length) return null;

    return pairs.map((item) => (
      <div key={`techrollout-custom-view-${item.key}`} style={styles.viewInfoItem}>
        <div style={styles.viewInfoLabel}>{item.label}</div>
        <div style={styles.viewInfoValue}>{item.value}</div>
      </div>
    ));
  };
  // ===== MAIN CRUD =====
  const openAddRecord = () => {
    setEditRecordId(null);
    resetForm();
    setShowAdd(true);
  };

  const openEditRecord = (id) => {
    const r = records.find((x) => x.id === id);
    if (!r) return;

    setEditRecordId(id);
    setForm({
      quarter: String(r.quarter || quarterFromDate(r.activityDate) || ""),
      unitCenter: r.unitCenter || "DOST-PANGASINAN",
      nameOfTechnologyTransferred: r.nameOfTechnologyTransferred || "",
      technologyGenerator: r.technologyGenerator || "",
      modeOfTransfer: r.modeOfTransfer || "",
      isDostDevelopedFunded: Boolean(r.isDostDevelopedFunded),
      dateTransferred: r.dateTransferred || "",
      activityTitle: r.activityTitle || "",
      activityDate: r.activityDate || "",
      activityVenue: r.activityVenue || "",
      institutionName: r.institutionName || "",
      institutionAddress: r.institutionAddress || "",
      institutionAddressMeta: r.institutionAddressMeta || null,
      classification: r.classification || "",
      representativeName: r.representativeName || "",
      representativeDesignation: r.representativeDesignation || "",
      sex: r.sex || "",
      nameOfStaff: r.nameOfStaff || r.staffName || "",
      customFields: parseTechRolloutCustomFields(r.customFields || r.custom_fields),
    });
    setShowAdd(true);
  };

  const saveRecord = async () => {
    if (!form.nameOfTechnologyTransferred.trim())
      return alert("Required: Name of Knowledge/Technology Transferred");
    if (!form.technologyGenerator.trim())
      return alert("Required: Technology Generator");
    if (!form.modeOfTransfer) return alert("Required: Mode of Transfer");
    if (!form.dateTransferred) return alert("Required: Date Transferred");
    if (!form.activityTitle.trim()) return alert("Required: Activity Title");
    if (!form.activityDate) return alert("Required: Activity Date");
    if (!form.institutionName.trim()) return alert("Required: Name of Institution");
    const finalInstitutionAddress = (
      form.institutionAddress ||
      form.institutionAddressMeta?.displayText ||
      form.institutionAddressMeta?.manualText ||
      ""
    ).trim();

    if (!finalInstitutionAddress) return alert("Required: Institution Address");
    if (!form.classification) return alert("Required: Classification");
    if (!form.representativeName.trim()) return alert("Required: Name of Representative");

    const computedQuarter = quarterFromDate(form.activityDate);
    if (!computedQuarter) return alert("Invalid Activity Date");

    const payload = mapUiToApiPayload({
      ...form,
      quarter: computedQuarter,
      unitCenter: "DOST-PANGASINAN",
    });

    setIsSaving(true);
    setApiError("");

    try {
      if (!editRecordId) {
        await axios.post(API_BASE_URL, payload);
      } else {
        await axios.put(`${API_BASE_URL}/${editRecordId}`, payload);
      }

      await loadRecords();
      setShowAdd(false);
      setEditRecordId(null);
      resetForm();
    } catch (err) {
      console.error("Failed to save technology rollout record:", err);
      console.error("saveRecord response status:", err?.response?.status);
      console.error("saveRecord response data:", err?.response?.data);

      alert(
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Failed to save record."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const deleteRecord = async (id) => {
    if (!window.confirm("Delete this record?")) return;

    try {
      await axios.delete(`${API_BASE_URL}/${id}`);
      await loadRecords();
    } catch (err) {
      console.error("Failed to delete technology rollout record:", err);
      alert(err?.response?.data?.message || "Failed to delete record.");
    }
  };

  // ===== Map helpers =====
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

  const districtOptions = useMemo(() => PANGASINAN_DISTRICTS.map((d) => d.id), []);

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
        features: feats.filter((f) => String(getFeatureName(f) || "") === selectedMunicipality),
      };
    }

    if (borderMode === "district") {
      if (!selectedDistrict) return municipalGeo;
      const feats = municipalGeo?.features || [];
      return {
        type: "FeatureCollection",
        features: feats.filter((f) => selectedDistrictSet.has(String(getFeatureName(f) || ""))),
      };
    }

    return municipalGeo;
  }, [municipalGeo, borderMode, selectedMunicipality, selectedDistrict, selectedDistrictSet]);

  const allPinnedRecords = useMemo(() => {
    return filteredRecords.filter(
      (r) => Number.isFinite(r?.institutionAddressMeta?.lat) && Number.isFinite(r?.institutionAddressMeta?.lng)
    );
  }, [filteredRecords]);

  const visiblePinnedRecords = useMemo(() => {
    let arr = allPinnedRecords;

    if (borderMode === "municipality") {
      if (!selectedMunicipality) return arr;
      return arr.filter((r) => getRecordMunicipality(r) === selectedMunicipality);
    }

    if (!selectedDistrict) return arr;
    return arr.filter((r) => selectedDistrictSet.has(getRecordMunicipality(r)));
  }, [allPinnedRecords, borderMode, selectedMunicipality, selectedDistrict, selectedDistrictSet]);

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
  };

  const maskLatLngs = useMemo(() => buildInverseMaskFromPolygon(outlineGeo), [outlineGeo]);

  const pangasinanBounds = useMemo(() => {
    if (!outlineGeo) return null;
    try {
      const b = L.geoJSON(outlineGeo).getBounds();
      return b && b.isValid() ? b : null;
    } catch {
      return null;
    }
  }, [outlineGeo]);

  function FitAndLockToPangasinan({ bounds, borderMode, selectedMuni, selectedDist, filteredGeo }) {
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
        } catch {}
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
      color: selectedDistrict ? (inDistrict ? "#f59e0b" : "transparent") : "#475569",
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
        const found = PANGASINAN_DISTRICTS.find((d) => d.municipalities.includes(name));
        if (found) setSelectedDistrict(found.id);
      }
    });
  };

  const maskPathOptions = { color: "transparent", weight: 0, fillColor: "#ffffff", fillOpacity: 1 };

  const openGoogleMap = (lat, lng) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    window.open(url, "_blank");
  };

  const openGoogleDirections = (lat, lng) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    window.open(url, "_blank");
  };

  // ===== Address flow components =====
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

  // ===== Address Modal (reused) =====
  function AddressFlowModal({ open, onClose, onSave, initialMeta }) {
    const [mode, setMode] = useState(initialMeta?.mode || "hierarchical");
    const [step, setStep] = useState(1);
    const [manualText, setManualText] = useState(initialMeta?.manualText || "");

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

      setManualText(initialMeta?.manualText || "");
      setMunicipality(initialMeta?.municipality || "");
      setBarangay(initialMeta?.barangay || "");

      const lat = initialMeta?.lat;
      const lng = initialMeta?.lng;
      setCoords(Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null);

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

    const pangasinanObj = ADDRESS_DATA.find((x) => x.name === "Pangasinan") || null;
    const municipalityList = (pangasinanObj?.municipalities || []).map((m) => m.name);

    const displayText =
      mode === "manual"
        ? manualText.trim()
        : [barangay, municipality, province].filter(Boolean).join(", ");

    const canSave =
      mode === "manual"
        ? manualText.trim().length >= 3
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
      if (!municipality || !barangay) return alert("Please select Municipality and Barangay first.");
      if (!coords) setCoords({ lat: 15.9167, lng: 120.3333 });
      setStep(3);
    };

    const useMyLocation = () => {
      if (!navigator.geolocation) return alert("Geolocation not supported in this browser.");
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => alert("Could not get your location. Check browser permissions.")
      );
    };

    const save = () => {
      if (!canSave) return;

      const meta =
        mode === "manual"
          ? {
              mode: "manual",
              manualText: manualText.trim(),
              displayText: manualText.trim(),
              province: "",
              municipality: "",
              barangay: "",
              lat: coords?.lat || null,
              lng: coords?.lng || null,
            }
          : {
              mode: "hierarchical",
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
      <div style={styles.modalBackdrop} onClick={onClose}>
        <div style={styles.flowShell} onClick={(e) => e.stopPropagation()}>
          <div style={styles.modalHeader}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div>Add Institution Address</div>
              <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 800 }}>{breadcrumb}</div>
            </div>
            <button type="button" style={styles.closeX} onClick={onClose}>✕</button>
          </div>

          <div style={styles.flowBody}>
            <div style={styles.tabsRow}>
              <button type="button" style={styles.tabBtn(mode === "hierarchical")} onClick={() => { setMode("hierarchical"); setStep(1); setManualText(""); setSearch(""); }}>
                Hierarchical
              </button>
              <button type="button" style={styles.tabBtn(mode === "manual")} onClick={() => { setMode("manual"); setStep(1); setMunicipality(""); setBarangay(""); setBarangayOptions([]); setBarangayError(""); setSearch(""); }}>
                Manual Input
              </button>
            </div>

            {mode === "manual" ? (
              <>
                <div style={styles.field}>
                  <div style={styles.label}>Type Venue/Address</div>
                  <textarea style={styles.textarea} value={manualText} onChange={(e) => setManualText(e.target.value)} placeholder="e.g. Bldg/Street, Barangay, City/Municipality, Pangasinan" />
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" style={styles.btnGhost} onClick={back}>Back</button>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: -2 }}>
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
                          <button
                            type="button"
                            key={name}
                            style={{ ...styles.listBtn, ...(active ? styles.listBtnActive : null) }}
                            onClick={() => { setMunicipality(name); setBarangay(""); setCoords(null); setSearch(""); setStep(2); }}
                          >
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
                      <input
                        style={styles.input}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={barangayLoading ? "Loading..." : "Type to search barangays..."}
                        disabled={barangayLoading}
                      />
                    </div>

                    {barangayLoading ? (
                      <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 800 }}>Loading barangays...</div>
                    ) : barangayError ? (
                      <div style={styles.warn}>
                        ⚠ {barangayError}
                        <div style={{ marginTop: 6, opacity: 0.9 }}>
                          Make sure file exists:
                          <div style={{ fontFamily: styles.mono.fontFamily }}>public/data/pangasinan_barangays.json</div>
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
                                type="button"
                                key={name}
                                style={{ ...styles.listBtn, ...(active ? styles.listBtnActive : null) }}
                                onClick={() => {
                                  setBarangay(name);
                                  const lat = typeof b === "string" ? null : b.lat;
                                  const lng = typeof b === "string" ? null : b.lng;
                                  if (Number.isFinite(lat) && Number.isFinite(lng)) setCoords({ lat, lng });
                                  else setCoords(null);
                                }}
                              >
                                {name}
                              </button>
                            );
                          })}

                          {barangayOptions.length === 0 ? (
                            <div style={{ padding: 10, fontSize: 12, opacity: 0.75 }}>
                              No barangays found for this municipality in the JSON file.
                            </div>
                          ) : null}
                        </div>
                      </>
                    )}

                    <div style={{ fontSize: 12, opacity: 0.75 }}>Preview: <b>{displayText || "—"}</b></div>

                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" style={styles.btnGhost} onClick={back}>Back</button>

                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: -2 }}>
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
                              attribution="Tiles &copy; Esri"
                              opacity={0.9}
                            />
                          </LayersControl.BaseLayer>
                        </LayersControl>

                        <FlyToCenter coords={coords} zoom={16} />
                        <ClickToMoveMarker onPick={setCoords} />

                        {coords && (
                          <Marker
                            position={[coords.lat, coords.lng]}
                            draggable
                            eventHandlers={{
                              dragend: (e) => {
                                const p = e.target.getLatLng();
                                setCoords({ lat: p.lat, lng: p.lng });
                              },
                            }}
                          />
                        )}
                      </MapContainer>
                    </div>

                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      <div><b>Selected:</b> {displayText}</div>
                      <div><b>Coordinates:</b> {coords ? `${coords.lat}, ${coords.lng}` : "—"}</div>
                      {!coords ? (
                        <div style={{ marginTop: 4, opacity: 0.85 }}>
                          * This barangay has no coords in JSON. Please click the map to set a pin.
                        </div>
                      ) : null}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" style={styles.btnGhost} onClick={back}>Back</button>

                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: -2 }}>
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

  const applyInstitutionAddressMetaToForm = (meta) => {
    const finalAddress = (
      meta?.displayText ||
      meta?.manualText ||
      ""
    ).trim();

    setForm((prev) => ({
      ...prev,
      institutionAddress: finalAddress,
      institutionAddressMeta: meta
        ? {
            ...meta,
            displayText: meta.displayText || finalAddress,
          }
        : null,
    }));
  };

  function AddressViewModal({ record, onClose }) {
    if (!record) return null;
    const meta = record.institutionAddressMeta || null;
    const lat = meta?.lat;
    const lng = meta?.lng;
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

    return (
      <div style={{ ...styles.modalBackdrop, zIndex: 3600 }} onClick={onClose}>
        <div style={{ ...styles.modal, width: "min(720px, 100%)", position: "relative", zIndex: 3601 }} onClick={(e) => e.stopPropagation()}>
          <div style={styles.modalHeader}>
            <div>View Institution Address — {record.institutionName}</div>
            <button type="button" style={styles.closeX} onClick={onClose}>✕</button>
          </div>

          <div style={styles.modalBody}>
            <div style={{ display: "grid", gap: 10 }}>
              <div>
                <div style={styles.label}>Display Address</div>
                <div style={{ padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 10, background: "#f8fafc", whiteSpace: "pre-wrap" }}>
                  {record.institutionAddress || "—"}
                </div>
              </div>

              <div style={styles.grid}>
                <div style={styles.field}>
                  <div style={styles.label}>Mode</div>
                  <div style={{ fontWeight: 900 }}>{meta?.mode || "—"}</div>
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Coordinates</div>
                  <div style={{ ...styles.mono, fontSize: 12 }}>{hasCoords ? `${lat}, ${lng}` : "—"}</div>
                </div>
              </div>

              {hasCoords ? (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: -2 }}>
                  <button type="button" style={styles.tinyBtn} onClick={() => openGoogleMap(lat, lng)}>Map</button>
                  <button type="button" style={styles.tinyBtn} onClick={() => openGoogleDirections(lat, lng)}>Directions</button>
                </div>
              ) : (
                <div style={{ fontSize: 12, opacity: 0.7 }}>* No coordinates saved yet.</div>
              )}
            </div>
          </div>

          <div style={styles.modalFooter}>
            <button type="button" style={styles.btnDark} onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    );
  }

  function PopupModal({ open, title, children, onClose }) {
    if (!open) return null;
    return (
      <div style={{ ...styles.modalBackdrop, zIndex: 3600 }} onClick={onClose}>
        <div style={{ ...styles.modal, width: "min(720px, 100%)", position: "relative", zIndex: 3601 }} onClick={(e) => e.stopPropagation()}>
          <div style={styles.modalHeader}>
            <div>{title}</div>
            <button type="button" style={styles.closeX} onClick={onClose}>✕</button>
          </div>
          <div style={styles.modalBody}>{children}</div>
        </div>
      </div>
    );
  }

  const viewRecord = useMemo(() => {
    if (!viewRecordId) return null;
    return records.find((r) => r.id === viewRecordId) || null;
  }, [viewRecordId, records]);

  const institutionAddressViewRecord = useMemo(() => {
    if (!institutionAddressViewForId) return null;
    return records.find((r) => r.id === institutionAddressViewForId) || null;
  }, [institutionAddressViewForId, records]);

  // ===== Styles (reused from Packaging) =====
  const styles = {
    page: { padding: 16, position: "relative", fontFamily },

    actionBar: { position: "sticky", top: 0, zIndex: 1000, background: "#fff", paddingTop: 8, paddingBottom: 8 },

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
    table: { width: "100%", borderCollapse: "collapse", fontFamily, tableLayout: "fixed" },

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

    green: { background: "#dff3df" },
    blue: { background: "#dbeafe" },

    sectionTitleRow: {
      marginTop: 14,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      flexWrap: "wrap",
      fontFamily,
    },

    sectionTitle: { fontWeight: 800, fontSize: 13, color: "#0f172a", fontFamily },

    tableHeaderRow: {
      marginTop: 14,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      flexWrap: "wrap",
      fontFamily,
    },

    tableHeaderTitleWrap: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
    },

    tableHeaderTitle: {
      fontWeight: 900,
      fontSize: 14,
      color: "#0f172a",
      textTransform: "uppercase",
      fontFamily,
      whiteSpace: "nowrap",
    },

    tableHeaderMeta: {
      fontSize: 12,
      opacity: 0.75,
      fontWeight: 800,
      fontFamily,
      whiteSpace: "nowrap",
    },

    tableFilterBar: {
      display: "flex",
      gap: 8,
      flexWrap: "wrap",
      alignItems: "center",
      justifyContent: "flex-end",
      position: "relative",
      zIndex: 1000,
      marginLeft: "auto",
      flex: 1,
      minWidth: 520,
    },

    tableSearchInput: {
      height: 30,
      minWidth: 180,
      width: 180,
      padding: "4px 10px",
      borderRadius: 10,
      border: "1px solid #cbd5e1",
      background: "#fff",
      fontWeight: "bold",
      fontFamily,
      fontSize: 11,
      boxSizing: "border-box",
      outline: "none",
    },

    addBtn: {
      border: "1px solid rgba(15, 23, 42, 0.18)",
      background: "#fff",
      padding: "6px 10px",
      borderRadius: 10,
      cursor: "pointer",
      fontWeight: "bold",
      fontSize: 11,
      height: 30,
      minWidth: 90,
      fontFamily,
      boxShadow: "0 1px 0 rgba(2,6,23,0.06)",
      whiteSpace: "nowrap",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
    },

    pillBtn: {
      border: "1px solid rgba(15, 23, 42, 0.18)",
      background: "#fff",
      padding: "6px 10px",
      borderRadius: 999,
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

    modalBackdrop: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      zIndex: 9999,
    },

    modal: {
      width: "min(980px, 100%)",
      background: "white",
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      fontFamily,
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
    },

    closeX: {
      background: "transparent",
      border: "1px solid rgba(255,255,255,0.6)",
      color: "white",
      borderRadius: 10,
      padding: "6px 10px",
      cursor: "pointer",
      fontWeight: 900,
      fontFamily,
    },

    modalBody: { padding: "14px 16px 16px" },
    grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
    field: { display: "flex", flexDirection: "column", gap: 6 },
    label: { fontSize: 12, fontWeight: 900, color: "#0f172a", fontFamily },

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

    modalFooter: {
      padding: 16,
      display: "flex",
      justifyContent: "flex-end",
      gap: 8,
      borderTop: "1px solid #e2e8f0",
    },

    btnDark: {
      background: "#0b4ea2",
      border: "1px solid #0b4ea2",
      color: "white",
      padding: "6px 10px",
      borderRadius: 10,
      fontSize: 11,
      fontWeight: "bold",
      height: 30,
      minWidth: 52,
      cursor: "pointer",
      fontFamily,
      whiteSpace: "nowrap",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
    },

    btnGhost: {
      background: "white",
      border: "1px solid #cbd5e1",
      color: "#0f172a",
      padding: "6px 10px",
      borderRadius: 10,
      fontSize: 11,
      fontWeight: "bold",
      height: 30,
      minWidth: 52,
      cursor: "pointer",
      fontFamily,
      whiteSpace: "nowrap",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
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

    viewValue: { padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 10, background: "#f8fafc", minHeight: 42, whiteSpace: "pre-wrap" },
    viewSection: { display: "grid", gap: 8 },
    viewSectionTitle: { fontSize: 18, fontWeight: 900, color: "#0f172a", fontFamily, lineHeight: 1.15, marginBottom: 2 },
    viewInfoGrid: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", columnGap: 56, rowGap: 12, alignItems: "start" },
    viewInfoItem: { display: "grid", gap: 3, alignContent: "start", minHeight: 40 },
    viewInfoLabel: { fontSize: 12, fontWeight: 900, color: "#111827", fontFamily, lineHeight: 1.15, marginBottom: 1 },
    viewInfoValue: { fontSize: 14, fontWeight: 900, color: "#0f172a", fontFamily, lineHeight: 1.2, whiteSpace: "pre-wrap", wordBreak: "break-word" },
    viewWideBox: { padding: "8px 12px", border: "1px solid #cbd5e1", borderRadius: 8, background: "#f8fafc", fontSize: 14, fontWeight: 900, color: "#0f172a", fontFamily, lineHeight: 1.2, whiteSpace: "pre-wrap", wordBreak: "break-word" },
    viewMiniBtn: { border: "1px solid rgba(15, 23, 42, 0.18)", background: "#fff", padding: "3px 10px", borderRadius: 7, cursor: "pointer", fontWeight: 800, fontSize: 11, fontFamily, whiteSpace: "nowrap", height: 22 },
    viewIndicatorsTable: { width: "100%", borderCollapse: "collapse", fontFamily },
    viewIndicatorsTh: { border: "1px solid #64748b", padding: "6px 10px", background: "#eef2f6", fontSize: 11, fontWeight: 900, textAlign: "center", fontFamily },
    viewIndicatorsTd: { border: "1px solid #64748b", padding: "6px 10px", background: "#fff", fontSize: 11, fontFamily },

    mono: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" },

    flowShell: { width: "min(620px, 100%)", background: "white", borderRadius: 12, overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.25)", fontFamily },
    flowBody: { padding: 14, display: "grid", gap: 10 },
    list: { maxHeight: 320, overflow: "auto", border: "1px solid #e2e8f0", borderRadius: 12, padding: 6 },
    listBtn: { width: "100%", textAlign: "left", padding: "10px 10px", borderRadius: 10, border: "1px solid transparent", background: "transparent", cursor: "pointer", fontWeight: 800, fontFamily },
    listBtnActive: { background: "#e0f2fe", border: "1px solid #38bdf8" },
    tabsRow: { display: "flex", gap: 8, flexWrap: "wrap" },
    tabBtn: (active) => ({ padding: "8px 10px", borderRadius: 999, border: active ? "1px solid #0b4ea2" : "1px solid #cbd5e1", background: active ? "#dbeafe" : "white", cursor: "pointer", fontWeight: 900, fontSize: 12 }),
    mapBox: { height: 340, borderRadius: 12, overflow: "hidden", border: "1px solid #e2e8f0" },

    mapCard: { marginTop: 10, border: "2px solid #6b7280", borderRadius: 10, overflow: "hidden", background: "#fff" },
    mapHeader: { background: "#eef2f6", padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", borderBottom: "2px solid #6b7280" },
    mapTitle: { fontWeight: 900, fontSize: 13, color: "#0f172a" },
    mapSub: { fontSize: 12, opacity: 0.8, fontWeight: 700 },
    mapWrapLarge: { height: 460, width: "100%", background: "linear-gradient(135deg, #e0f2fe 0%, #dbeafe 40%, #f0f9ff 100%)" },
    filterRow: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 8 },
    filterLabel: { fontSize: 12, fontWeight: 900, opacity: 0.8 },
    select: { padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", fontWeight: 900, fontFamily, fontSize: 12, minWidth: 240 },
    selectSm: {
      padding: "4px 10px",
      borderRadius: 10,
      border: "1px solid #cbd5e1",
      background: "#fff",
      fontWeight: "bold",
      fontFamily,
      fontSize: 11,
      height: 30,
      minWidth: 112,
      boxSizing: "border-box",
    },
    warn: { marginTop: 8, background: "#fff7ed", border: "1px solid #fdba74", padding: "10px 12px", borderRadius: 10, fontSize: 12, color: "#7c2d12", fontWeight: 800 },

    viewTableWrap: { width: "100%", overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 10 },
    viewTable: { width: "100%", borderCollapse: "collapse", tableLayout: "auto", minWidth: 1700, fontFamily },
    viewTh: { border: "2px solid #6b7280", padding: "8px 10px", background: "#eef2f6", fontSize: 12, textAlign: "center", fontFamily, fontWeight: 900, whiteSpace: "nowrap" },
    viewTd: { border: "2px solid #6b7280", padding: "8px 10px", fontSize: 12, fontFamily, verticalAlign: "top", background: "white", whiteSpace: "normal", wordBreak: "break-word", overflowWrap: "anywhere" },
    viewTdCenter: { border: "2px solid #6b7280", padding: "8px 10px", fontSize: 12, textAlign: "center", fontFamily, verticalAlign: "top", background: "white", whiteSpace: "nowrap" },

    // Checkbox design (like your reference)
    checkOption: { display: "flex", alignItems: "center", gap: 14, padding: "8px 0", cursor: "pointer" },
    checkInput: { width: 22, height: 22, cursor: "pointer", accentColor: "#2563eb", flexShrink: 0 },
    checkText: { fontSize: 15, fontWeight: 800, color: "#374151", lineHeight: 1.4 },
  };

  // ===== JSX =====
  return (
    <div style={styles.page}>
      <div style={styles.titleBar}>
        <div>TECHNOLOGY ROLLOUT</div>
        <div style={{ fontSize: 12, opacity: 0.95, fontWeight: 800, fontFamily }}>
          Quarter auto-based on Activity Date (Quarter field is read-only)
        </div>
      </div>

      {/* MAP */}
      <div style={styles.mapCard}>
        <div style={styles.mapHeader}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, width: "100%" }}>
            <div style={styles.mapTitle}>PANGASINAN MAP — Technology Rollout Pins</div>
            <div style={styles.mapSub}>
              Pins shown: <b>{visiblePinnedRecords.length}</b> / {allPinnedRecords.length}
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
                  <select style={styles.select} value={selectedMunicipality} onChange={(e) => setSelectedMunicipality(e.target.value)}>
                    <option value="">All Municipalities</option>
                    {municipalityOptions.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </>
              ) : (
                <>
                  <span style={styles.filterLabel}>District:</span>
                  <select style={styles.select} value={selectedDistrict} onChange={(e) => setSelectedDistrict(e.target.value)}>
                    <option value="">Select District (optional)</option>
                    {districtOptions.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </>
              )}

              <button type="button" style={styles.addBtn} onClick={() => { setSelectedMunicipality(""); setSelectedDistrict(""); }}>
                Clear
              </button>

              {geoError ? (
                <div style={styles.warn}>
                  ⚠ GeoJSON not loaded: <span style={{ fontWeight: 900 }}>{geoError}</span>
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
          <MapContainer center={[15.9167, 120.3333]} zoom={10} minZoom={9} maxZoom={13} attributionControl={false} style={{ height: "100%", width: "100%" }} zoomControl>
            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Default (OSM)">
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" opacity={0.9} />
              </LayersControl.BaseLayer>

              <LayersControl.BaseLayer name="Satellite (Esri)">
                <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Tiles &copy; Esri" opacity={0.9} />
              </LayersControl.BaseLayer>
            </LayersControl>

            <Pane name="maskPane" style={{ zIndex: 300 }} />
            <Pane name="borderPane" style={{ zIndex: 500 }} />
            <Pane name="pinPane" style={{ zIndex: 700 }} />

            {maskLatLngs ? <Polygon positions={maskLatLngs} pathOptions={maskPathOptions} pane="maskPane" /> : null}
            {outlineGeo?.features?.length ? <GeoJSON data={outlineGeo} style={pangasinanOutlineStyle} pane="borderPane" /> : null}
            {filteredMunicipalityGeojson?.features?.length ? (
              <GeoJSON data={filteredMunicipalityGeojson} style={municipalityStyle} onEachFeature={onEachMunicipality} pane="borderPane" />
            ) : null}

            {pangasinanBounds ? (
              <FitAndLockToPangasinan bounds={pangasinanBounds} borderMode={borderMode} selectedMuni={selectedMunicipality} selectedDist={selectedDistrict} filteredGeo={filteredMunicipalityGeojson} />
            ) : null}

            {visiblePinnedRecords.map((r) => (
              <Marker key={r.id} position={[r.institutionAddressMeta.lat, r.institutionAddressMeta.lng]} pane="pinPane">
                <Popup>
                  <div style={{ minWidth: 260, fontFamily }}>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>{r.nameOfTechnologyTransferred || "—"}</div>

                    <div style={{ fontSize: 12, marginBottom: 6 }}>
                      <b>Mode:</b> {r.modeOfTransfer || "—"}
                      <br />
                      <b>Institution:</b> {r.institutionName || "—"}
                      <br />
                      <b>Municipality:</b> {getRecordMunicipality(r) || "—"}
                    </div>

                    <div style={{ fontSize: 12, marginBottom: 8 }}>
                      <b>Address:</b> {r.institutionAddress || "—"}
                      <br />
                      <b>Coordinates:</b> {r.institutionAddressMeta.lat}, {r.institutionAddressMeta.lng}
                    </div>

                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: -2 }}>
                      <button type="button" style={styles.tinyBtn} onClick={() => setInstitutionAddressViewForId(r.id)}>Address</button>
                      <button type="button" style={styles.tinyBtn} onClick={() => openGoogleMap(r.institutionAddressMeta.lat, r.institutionAddressMeta.lng)}>Map</button>
                      <button type="button" style={styles.tinyBtn} onClick={() => openGoogleDirections(r.institutionAddressMeta.lat, r.institutionAddressMeta.lng)}>Directions</button>
                      <button type="button" style={styles.tinyBtn} onClick={() => { setViewMode("list"); setViewRecordId(r.id); }}>Full Details</button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* FILTER/SORT + Export/Print + Add */}
      <div style={styles.actionBar}>
        <div style={styles.tableHeaderRow}>
          <div style={styles.tableHeaderTitleWrap}>
            <div style={styles.tableHeaderTitle}>TECHNOLOGY ROLLOUT RECORDS</div>
            <div style={styles.tableHeaderMeta}>
              Showing <b>{filteredRecords.length}</b> of {serverTotalRows} / {serverTotalRows}
            </div>
          </div>

          <div style={styles.tableFilterBar}>
            <input
              type="text"
              style={styles.tableSearchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search project / association"
            />

            <select style={styles.selectSm} value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
              <option value="">All Years</option>
              {yearOptions.map((y) => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>

            <select
              style={styles.selectSm}
              value={filterDistrict}
              onChange={(e) => {
                const nextDistrict = e.target.value;
                setFilterDistrict(nextDistrict);
                setFilterMunicipality(
                  nextDistrict &&
                    !PANGASINAN_DISTRICTS.find((item) => item.id === nextDistrict)?.municipalities.includes(filterMunicipality)
                    ? ""
                    : filterMunicipality
                );
              }}
            >
              <option value="">All Districts</option>
              {PANGASINAN_DISTRICTS.map((district) => (
                <option key={district.id} value={district.id}>{district.id}</option>
              ))}
            </select>

            <select style={styles.selectSm} value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
              {MONTH_OPTIONS.map((m) => (
                <option key={m.value || "all"} value={m.value}>{m.label}</option>
              ))}
            </select>

            <select style={styles.selectSm} value={filterMunicipality} onChange={(e) => setFilterMunicipality(e.target.value)}>
              <option value="">All Municipalities</option>
              {municipalityFilterOptions.map((municipality) => (
                <option key={municipality} value={municipality}>{municipality}</option>
              ))}
            </select>

            <select style={styles.selectSm} value={recordView} onChange={(e) => setRecordView(e.target.value)}>
              <option value="overall">Overall</option>
            </select>

            <button
              type="button"
              style={styles.addBtn}
              onClick={() => {
                setFilterYear("");
                setFilterDistrict("");
                setFilterQuarter("");
                setFilterMonth("");
                setFilterMunicipality("");
                setRecordView("overall");
                setSortOrder("oldest");
                setSearchTerm("");
                setCurrentPage(1);
              }}
            >
              Clear Filters
            </button>

            <button type="button" style={styles.btnGhost} onClick={openExportPopupBulk}>
              Export
            </button>

            <button type="button" style={styles.btnDark} onClick={openPrintPopupBulk}>
              Print
            </button>

            <button type="button" style={styles.addBtn} onClick={openAddRecord}>
              + Add Entry
            </button>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div style={styles.tableWrap}>
        <table style={{ ...styles.table, minWidth: 2200 }}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: 56 }}>NO.</th>
              <th style={styles.th}>UNIT/CENTER</th>
              <th style={styles.th}>NAME OF KNOWLEDGE / TECHNOLOGY TRANSFERRED</th>
              <th style={styles.th}>TECHNOLOGY GENERATOR</th>
              <th style={styles.th}>MODE OF TRANSFER</th>
              <th style={styles.th}>DATE TRANSFERRED</th>
              <th style={styles.th}>ACTIVITY TITLE</th>
              <th style={styles.th}>ACTIVITY DATE / VENUE</th>
              <th style={styles.th}>NAME AND ADDRESS OF INSTITUTION</th>
              <th style={styles.th}>CLASSIFICATION</th>
              <th style={styles.th}>NAME AND DESIGNATION OF REPRESENTATIVE</th>
              <th style={styles.th}>SEX</th>
              <th style={styles.th}>ACTIONS</th>
            </tr>
          </thead>

          <tbody>
            {filteredRecords.length === 0 ? (
              <tr>
                <td style={styles.tdCenter} colSpan={13}>
                  {Number(serverTotalRows || 0) === 0
                    ? "Wala pang entries. Click “Add Project”."
                    : "Walang entries sa current filter. (Try “Clear Filters”)"}
                </td>
              </tr>
            ) : (
              filteredRecords.map((r, idx) => {
                const hasCoords =
                  Number.isFinite(r?.institutionAddressMeta?.lat) &&
                  Number.isFinite(r?.institutionAddressMeta?.lng);

                const dateVenue = `${r?.activityDate || ""}${r?.activityVenue ? ` / ${r.activityVenue}` : ""}`.trim();

                return (
                  <tr key={r.id}>
                    <td style={styles.tdCenter}>{(effectivePage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                    <td style={styles.tdCenter}>{r.unitCenter || "DOST-PANGASINAN"}</td>

                    <td style={styles.td}>
                      <div style={{ display: "grid", gap: 6 }}>
                        <div>{r.nameOfTechnologyTransferred || "—"}</div>
                        {r.isDostDevelopedFunded ? (
                          <div style={{
                            display: "inline-flex",
                            width: "fit-content",
                            padding: "3px 8px",
                            borderRadius: 999,
                            fontSize: 10,
                            fontWeight: 900,
                            background: "#dcfce7",
                            border: "1px solid #86efac",
                            color: "#166534",
                          }}>
                            DOST-developed/funded
                          </div>
                        ) : null}
                      </div>
                    </td>

                    <td style={styles.td}>{r.technologyGenerator || "—"}</td>
                    <td style={styles.tdCenter}>{r.modeOfTransfer || "—"}</td>
                    <td style={styles.tdCenter}>{r.dateTransferred || "—"}</td>
                    <td style={styles.td}>{r.activityTitle || "—"}</td>
                    <td style={styles.td}>{dateVenue || "—"}</td>

                    <td style={styles.td}>
                      <div style={{ display: "grid", gap: 8 }}>
                        <div style={{ fontSize: 12 }}>
                          <div style={{ fontWeight: 900 }}>{r.institutionName || "—"}</div>
                          <div style={{ marginTop: 4 }}>{r.institutionAddress || "—"}</div>
                        </div>

                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: -2 }}>
                          <button type="button" style={styles.tinyBtn} onClick={() => setInstitutionAddressViewForId(r.id)}>View</button>
                          {hasCoords ? (
                            <>
                              <button type="button" style={styles.tinyBtn} onClick={() => openGoogleMap(r.institutionAddressMeta.lat, r.institutionAddressMeta.lng)}>Map</button>
                              <button type="button" style={styles.tinyBtn} onClick={() => openGoogleDirections(r.institutionAddressMeta.lat, r.institutionAddressMeta.lng)}>Directions</button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    <td style={styles.tdCenter}>{r.classification || "—"}</td>

                    <td style={styles.td}>
                      <div style={{ display: "grid", gap: 4 }}>
                        <div style={{ fontWeight: 900 }}>{r.representativeName || "—"}</div>
                        <div style={{ opacity: 0.9 }}>{r.representativeDesignation || "—"}</div>
                      </div>
                    </td>

                    <td style={styles.tdCenter}>{r.sex || "—"}</td>

                    <td style={styles.tdCenter}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
                        <button type="button" style={styles.tinyBtn} onClick={() => { setViewMode("list"); setViewRecordId(r.id); }}>View</button>
                        <button
                          type="button"
                          style={{
                            ...styles.tinyBtn,
                            opacity: r.syncedFromIntervention ? 0.6 : 1,
                            cursor: r.syncedFromIntervention ? "not-allowed" : "pointer",
                          }}
                          onClick={() => {
                            if (r.syncedFromIntervention) {
                              alert("This entry is synced from S&T Intervention. Edit it from the source module.");
                              return;
                            }
                            openEditRecord(r.id);
                          }}
                        >
                          Edit
                        </button>
                        <button type="button" style={styles.tinyBtn} onClick={() => openPrintPopupRow(r.id)}>Print</button>
                        <button type="button" style={styles.tinyBtn} onClick={() => openExportPopupRow(r.id)}>Export</button>
                        <button
                          type="button"
                          style={{
                            ...styles.dangerBtn,
                            opacity: r.syncedFromIntervention ? 0.6 : 1,
                            cursor: r.syncedFromIntervention ? "not-allowed" : "pointer",
                          }}
                          onClick={() => {
                            if (r.syncedFromIntervention) {
                              alert("This entry is synced from S&T Intervention. Delete it from the source module.");
                              return;
                            }
                            deleteRecord(r.id);
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

              if (isActive) {
                return (
                  <span key={page} style={styles.googlePageCurrent}>
                    {page}
                  </span>
                );
              }

              return (
                <button
                  key={page}
                  type="button"
                  style={styles.googlePageBtn}
                  onClick={() => setCurrentPage(page)}
                  disabled={false}
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

      {institutionAddressViewForId && (
        <AddressViewModal record={institutionAddressViewRecord} onClose={() => setInstitutionAddressViewForId(null)} />
      )}

      {viewRecordId && viewRecord && (
        <div style={styles.modalBackdrop} onClick={() => setViewRecordId(null)}>
          <div style={{ ...styles.modal, width: "min(980px, 100%)" }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>View Project</div>
              <button type="button" style={styles.closeX} onClick={() => setViewRecordId(null)}>✕</button>
            </div>

            <div style={styles.modalBody}>
              <div style={{ display: "grid", gap: 14 }}>
                <div style={styles.viewSection}>
                  <div style={styles.viewSectionTitle}>Project Information</div>

                  <div style={styles.viewInfoGrid}>
                    <div style={styles.viewInfoItem}>
                      <div style={styles.viewInfoLabel}>Name of Knowledge / Technology Transferred</div>
                      <div style={styles.viewInfoValue}>{viewRecord.nameOfTechnologyTransferred || "—"}</div>
                    </div>
                    <div style={styles.viewInfoItem}>
                      <div style={styles.viewInfoLabel}>Technology Generator</div>
                      <div style={styles.viewInfoValue}>{viewRecord.technologyGenerator || "—"}</div>
                    </div>
                    <div style={styles.viewInfoItem}>
                      <div style={styles.viewInfoLabel}>Representative Name</div>
                      <div style={styles.viewInfoValue}>{viewRecord.representativeName || "—"}</div>
                    </div>
                    <div style={styles.viewInfoItem}>
                      <div style={styles.viewInfoLabel}>Sex</div>
                      <div style={styles.viewInfoValue}>{viewRecord.sex || "—"}</div>
                    </div>
                    <div style={styles.viewInfoItem}>
                      <div style={styles.viewInfoLabel}>Classification</div>
                      <div style={styles.viewInfoValue}>{viewRecord.classification || "—"}</div>
                    </div>
                    <div style={styles.viewInfoItem}>
                      <div style={styles.viewInfoLabel}>DOST-developed / funded</div>
                      <div style={styles.viewInfoValue}>{viewRecord.isDostDevelopedFunded ? "Yes" : "No"}</div>
                    </div>
                    <div style={styles.viewInfoItem}>
                      <div style={styles.viewInfoLabel}>Mode of Transfer</div>
                      <div style={styles.viewInfoValue}>{viewRecord.modeOfTransfer || "—"}</div>
                    </div>
                    <div style={styles.viewInfoItem}>
                      <div style={styles.viewInfoLabel}>Quarter</div>
                      <div style={styles.viewInfoValue}>{viewRecord.quarter ? `${viewRecord.quarter}Q` : "—"}</div>
                    </div>
                    <div style={styles.viewInfoItem}>
                      <div style={styles.viewInfoLabel}>Unit / Center</div>
                      <div style={styles.viewInfoValue}>{viewRecord.unitCenter || "—"}</div>
                    </div>

                    {renderTechRolloutCustomViewFields(viewRecord)}

                    <div style={styles.viewInfoItem}>
                      <div style={styles.viewInfoLabel}>Date Transferred</div>
                      <div style={styles.viewInfoValue}>{viewRecord.dateTransferred || "—"}</div>
                    </div>
                    <div style={styles.viewInfoItem}>
                      <div style={styles.viewInfoLabel}>Activity Title</div>
                      <div style={styles.viewInfoValue}>{viewRecord.activityTitle || "—"}</div>
                    </div>
                    <div style={styles.viewInfoItem}>
                      <div style={styles.viewInfoLabel}>Activity Date / Venue</div>
                      <div style={styles.viewInfoValue}>{[viewRecord.activityDate || "", viewRecord.activityVenue || ""].filter(Boolean).join(" / ") || "—"}</div>
                    </div>
                  </div>
                </div>

                <div style={styles.viewSection}>
                  <div style={styles.viewInfoLabel}>Institution Name</div>
                  <div style={styles.viewWideBox}>{viewRecord.institutionName || "—"}</div>
                </div>

                <div style={styles.viewSection}>
                  <div style={styles.viewInfoLabel}>Institution Address</div>
                  <div style={styles.viewWideBox}>{viewRecord.institutionAddress || "—"}</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 70, rowGap: 10, alignItems: "start" }}>
                  <div style={styles.viewInfoItem}>
                    <div style={styles.viewInfoLabel}>Municipality</div>
                    <div style={styles.viewInfoValue}>{getRecordMunicipality(viewRecord) || viewRecord?.institutionAddressMeta?.municipality || "—"}</div>
                  </div>
                  <div style={styles.viewInfoItem}>
                    <div style={styles.viewInfoLabel}>Coordinates</div>
                    <div style={styles.viewInfoValue}>
                      {Number.isFinite(Number(viewRecord?.institutionAddressMeta?.lat)) && Number.isFinite(Number(viewRecord?.institutionAddressMeta?.lng))
                        ? `${viewRecord.institutionAddressMeta.lat}, ${viewRecord.institutionAddressMeta.lng}`
                        : "—"}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: -2 }}>
                  <button
                    type="button"
                    style={styles.viewMiniBtn}
                    onClick={() => {
                      const lat = Number(viewRecord?.institutionAddressMeta?.lat);
                      const lng = Number(viewRecord?.institutionAddressMeta?.lng);
                      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
                      window.open(`https://www.google.com/maps?q=${lat},${lng}`, "_blank", "noopener,noreferrer");
                    }}
                    disabled={!(Number.isFinite(Number(viewRecord?.institutionAddressMeta?.lat)) && Number.isFinite(Number(viewRecord?.institutionAddressMeta?.lng)))}
                  >
                    Map
                  </button>
                  <button
                    type="button"
                    style={styles.viewMiniBtn}
                    onClick={() => {
                      const lat = Number(viewRecord?.institutionAddressMeta?.lat);
                      const lng = Number(viewRecord?.institutionAddressMeta?.lng);
                      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
                      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, "_blank", "noopener,noreferrer");
                    }}
                    disabled={!(Number.isFinite(Number(viewRecord?.institutionAddressMeta?.lat)) && Number.isFinite(Number(viewRecord?.institutionAddressMeta?.lng)))}
                  >
                    Directions
                  </button>
                </div>

                <div style={styles.viewSection}>
                  <div style={styles.viewSectionTitle}>S&T Interventions</div>
                  <div style={styles.viewTableWrap}>
                    <table style={{ ...styles.viewIndicatorsTable, minWidth: 700 }}>
                      <thead>
                        <tr>
                          <th style={{ ...styles.viewIndicatorsTh, width: 42 }}>#</th>
                          <th style={styles.viewIndicatorsTh}>Type</th>
                          <th style={styles.viewIndicatorsTh}>Title / Label</th>
                          <th style={styles.viewIndicatorsTh}>Date</th>
                          <th style={styles.viewIndicatorsTh}>Venue</th>
                          <th style={styles.viewIndicatorsTh}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{ ...styles.viewIndicatorsTd, textAlign: "center" }}>1</td>
                          <td style={styles.viewIndicatorsTd}>{viewRecord.sourceModule || viewRecord.source_module || "Technology Rollout"}</td>
                          <td style={styles.viewIndicatorsTd}>{viewRecord.activityTitle || viewRecord.nameOfTechnologyTransferred || "—"}</td>
                          <td style={styles.viewIndicatorsTd}>{viewRecord.activityDate || viewRecord.dateTransferred || "—"}</td>
                          <td style={styles.viewIndicatorsTd}>{viewRecord.activityVenue || viewRecord.institutionAddress || "—"}</td>
                          <td style={{ ...styles.viewIndicatorsTd, textAlign: "center" }}>—</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={styles.viewSection}>
                  <div style={styles.viewSectionTitle}>Other Indicators</div>
                  <div style={styles.viewTableWrap}>
                    <table style={styles.viewIndicatorsTable}>
                      <thead>
                        <tr>
                          <th style={styles.viewIndicatorsTh}>Indicator</th>
                          <th style={{ ...styles.viewIndicatorsTh, width: 100 }}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={styles.viewIndicatorsTd}>Technology rollout record available</td>
                          <td style={{ ...styles.viewIndicatorsTd, textAlign: "center" }}>1</td>
                        </tr>
                        <tr>
                          <td style={styles.viewIndicatorsTd}>Has mapped institution coordinates</td>
                          <td style={{ ...styles.viewIndicatorsTd, textAlign: "center" }}>{Number.isFinite(Number(viewRecord?.institutionAddressMeta?.lat)) && Number.isFinite(Number(viewRecord?.institutionAddressMeta?.lng)) ? 1 : 0}</td>
                        </tr>
                        <tr>
                          <td style={styles.viewIndicatorsTd}>DOST-developed / funded technology</td>
                          <td style={{ ...styles.viewIndicatorsTd, textAlign: "center" }}>{viewRecord.isDostDevelopedFunded ? 1 : 0}</td>
                        </tr>
                        <tr>
                          <td style={styles.viewIndicatorsTd}>Representative details captured</td>
                          <td style={{ ...styles.viewIndicatorsTd, textAlign: "center" }}>{viewRecord.representativeName || viewRecord.representativeDesignation ? 1 : 0}</td>
                        </tr>
                        <tr>
                          <td style={styles.viewIndicatorsTd}>Quarter tagged</td>
                          <td style={{ ...styles.viewIndicatorsTd, textAlign: "center" }}>{viewRecord.quarter ? 1 : 0}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button type="button" style={styles.btnDark} onClick={() => setViewRecordId(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD/EDIT MODAL */}
      {showAdd && (
        <div style={styles.modalBackdrop} onClick={() => setShowAdd(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>{editRecordId ? "Edit Record" : "Add Record"}</div>
              <button type="button" style={styles.closeX} onClick={() => setShowAdd(false)}>✕</button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.grid}>
                <div style={styles.field}>
                  <div style={styles.label}>Quarter *</div>
                  <select style={{ ...styles.input, background: "#f1f5f9" }} value={form.quarter} disabled>
                    <option value="">--</option>
                    <option value="1">1Q</option>
                    <option value="2">2Q</option>
                    <option value="3">3Q</option>
                    <option value="4">4Q</option>
                  </select>
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Unit/Center *</div>
                  <input style={{ ...styles.input, background: "#f1f5f9" }} value={form.unitCenter} disabled />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Name of Knowledge/Technology Transferred *</div>
                  <input style={styles.input} value={form.nameOfTechnologyTransferred} onChange={(e) => setForm({ ...form, nameOfTechnologyTransferred: e.target.value })} />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Technology Generator *</div>
                  <input style={styles.input} value={form.technologyGenerator} onChange={(e) => setForm({ ...form, technologyGenerator: e.target.value })} />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Mode of Transfer *</div>
                  <select style={styles.input} value={form.modeOfTransfer} onChange={(e) => setForm({ ...form, modeOfTransfer: e.target.value })}>
                    <option value="">-- Select --</option>
                    {MODE_OF_TRANSFER_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Date Transferred *</div>
                  <input
                    style={styles.input}
                    type="date"
                    value={form.dateTransferred}
                    onChange={(e) => setForm({ ...form, dateTransferred: e.target.value })}
                  />
                </div>

                <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                  <div style={styles.label}>DOST-developed/funded knowledge/technology</div>
                  <label style={styles.checkOption}>
                    <input
                      type="checkbox"
                      checked={form.isDostDevelopedFunded}
                      onChange={(e) => setForm({ ...form, isDostDevelopedFunded: e.target.checked })}
                      style={styles.checkInput}
                    />
                    <span style={styles.checkText}>The transferred knowledge/technology is DOST-developed/funded</span>
                  </label>
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Activity Title *</div>
                  <input style={styles.input} value={form.activityTitle} onChange={(e) => setForm({ ...form, activityTitle: e.target.value })} />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Activity Date *</div>
                  <input
                    style={styles.input}
                    type="date"
                    value={form.activityDate}
                    onChange={(e) => {
                      const v = e.target.value;
                      const q = quarterFromDate(v);
                      setForm((prev) => ({ ...prev, activityDate: v, quarter: q }));
                    }}
                  />
                </div>

                <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                  <div style={styles.label}>Activity Venue</div>
                  <input style={styles.input} value={form.activityVenue} onChange={(e) => setForm({ ...form, activityVenue: e.target.value })} />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Institution Name *</div>
                  <input style={styles.input} value={form.institutionName} onChange={(e) => setForm({ ...form, institutionName: e.target.value })} />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Classification *</div>
                  <select style={styles.input} value={form.classification} onChange={(e) => setForm({ ...form, classification: e.target.value })}>
                    <option value="">-- Select --</option>
                    {CLASSIFICATION_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                  <div style={styles.label}>Institution Address *</div>
                  <button type="button" onClick={() => setAddressFlowOpen(true)} style={styles.inputButton(Boolean(form.institutionAddress))}>
                    <span style={{ opacity: form.institutionAddress ? 1 : 0.6 }}>{form.institutionAddress || "Click to select address"}</span>
                    <span style={{ fontSize: 11, opacity: 0.65 }}>{form.institutionAddress ? "Change" : "Select"}</span>
                  </button>

                  {Number.isFinite(form?.institutionAddressMeta?.lat) && Number.isFinite(form?.institutionAddressMeta?.lng) ? (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: -2 }}>
                      <button type="button" style={styles.tinyBtn} onClick={() => openGoogleMap(form.institutionAddressMeta.lat, form.institutionAddressMeta.lng)}>Map</button>
                      <button type="button" style={styles.tinyBtn} onClick={() => openGoogleDirections(form.institutionAddressMeta.lat, form.institutionAddressMeta.lng)}>Directions</button>
                      <div style={{ fontSize: 12, opacity: 0.85, alignSelf: "center", ...styles.mono }}>
                        {form.institutionAddressMeta.lat.toFixed(6)}, {form.institutionAddressMeta.lng.toFixed(6)}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Representative Name *</div>
                  <input style={styles.input} value={form.representativeName} onChange={(e) => setForm({ ...form, representativeName: e.target.value })} />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Representative Designation</div>
                  <input style={styles.input} value={form.representativeDesignation} onChange={(e) => setForm({ ...form, representativeDesignation: e.target.value })} />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Sex (M/F)</div>
                  <select style={styles.input} value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })}>
                    <option value="">--</option>
                    <option value="M">M</option>
                    <option value="F">F</option>
                  </select>
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Name of Staff</div>
                  <input
                    style={styles.input}
                    value={form.nameOfStaff || ""}
                    onChange={(e) => setForm({ ...form, nameOfStaff: e.target.value })}
                  />
                </div>

                {renderTechRolloutCustomInputs()}
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button type="button" style={styles.btnGhost} onClick={() => { setShowAdd(false); setEditRecordId(null); resetForm(); }}>Cancel</button>
              <button type="button" style={styles.btnDark} onClick={saveRecord} disabled={isSaving}>{isSaving ? "Saving..." : editRecordId ? "Update Record" : "Save Record"}</button>
            </div>
          </div>

          <AddressFlowModal open={addressFlowOpen} onClose={() => setAddressFlowOpen(false)} onSave={applyInstitutionAddressMetaToForm} initialMeta={form.institutionAddressMeta} />
        </div>
      )}

      {/* Print Modal */}
      <PopupModal open={printModal.open} title={printModal.scope === "row" ? "Print (This Row)" : "Print (Filtered Rows)"} onClose={() => setPrintModal((p) => ({ ...p, open: false }))}>
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8 }}>
            {printModal.scope === "row"
              ? `Institution: ${getRecordById(printModal.recordId)?.institutionName || "—"}`
              : `Records: ${filteredRecords.length}`}
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

      {/* Export Modal */}
      <PopupModal open={exportModal.open} title={exportModal.scope === "row" ? "Export (This Row)" : "Export (Filtered Rows)"} onClose={() => setExportModal((p) => ({ ...p, open: false }))}>
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8 }}>
            {exportModal.scope === "row"
              ? `Institution: ${getRecordById(exportModal.recordId)?.institutionName || "—"}`
              : `Records: ${filteredRecords.length}`}
          </div>

          <div style={styles.field}>
            <div style={styles.label}>Format</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: -2 }}>
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

          </div>
  );
}

