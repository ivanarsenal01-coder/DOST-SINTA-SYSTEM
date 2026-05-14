import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../usrmngment/auth/AuthContext";
import {
  canAdd,
  canEdit,
  canDelete,
  canExport,
} from "../../usrmngment/utils/permissions";
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

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

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

export default function SpecialProject() {
  const { user } = useAuth();

  const allowAdd = canAdd(user, "specialProject");
  const allowEdit = canEdit(user, "specialProject");
  const allowDelete = canDelete(user, "specialProject");
  const allowExport = canExport(user, "specialProject");

  const deny = (message) => {
    alert(message);
    return false;
  };

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

  const STORAGE_KEY = "special_project_records_v1";
  const SPECIAL_PROJECT_OPTIONS_KEY = "special_project_dropdown_options_v1";
  const DEFAULT_SPECIAL_PROJECT_OPTIONS = [
    "STARBOOKS",
    "IFUND",
    "TECHGROW",
    "SILLAG",
    "GRIND",
    "ONEASIN",
  ];
  const INTERVENTION_OPTIONS = [
    "Training",
    "Tech Roll Out",
    "TACS",
    "Packaging & Labeling",
    "Calibration",
    "TNA Report",
  ];
  const TACS_CONSULTANCY_OPTIONS = [
    "Advisory Services",
    "Technical Assistance",
    "Process Improvement",
    "Product Development",
    "Packaging and Labeling",
    "Food Safety",
    "Calibration",
    "Business / Marketing",
    "Other",
  ];
  const PAGE_SIZE = 10;

  const fontFamily =
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"';

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
    const foundKey = Object.keys(data || {}).find((k) => normalizeKey(k) === target);
    if (foundKey) {
      list = pick(foundKey);
      if (list) return list;
    }

    throw new Error(`No hardcoded barangay list for "${muniName}"`);
  }

  const toNumber = (v) => {
    if (v === "" || v === null || v === undefined) return 0;
    const n = Number(String(v).replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const formatCurrency = (v) => {
    const n = toNumber(v);
    return n.toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

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

  const extractFirstUrl = (text) => {
    const match = String(text || "").match(/https?:\/\/[^\s]+/i);
    return match ? match[0] : "";
  };

  const normalizeMovPhotos = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === "object") return [];
    try {
      const parsed = JSON.parse(value || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const getMovPhotos = (record = {}) =>
    normalizeMovPhotos(record.movPhotos ?? record.mov_photos ?? record.photos);

  const openVerificationLink = (text) => {
    const url = extractFirstUrl(text);
    if (!url) {
      alert("No valid URL found in Means of Verification.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const exportRecordsCSV = (rows, filename = "SpecialProject.csv") => {
    const headers = [
      "NO",
      "NAME OF BENEFICIARY",
      "VENUE/ADDRESS",
      "MUNICIPALITY",
      "BARANGAY",
      "LAT",
      "LNG",
      "SPECIAL PROJECT",
      "DATE PROJECT APPROVED",
      "PROJECT COST",
      "MEANS OF VERIFICATION",
      "MOV PHOTO COUNT",
      "NAME OF STAFF",
      "QUARTER",
    ];

    const lines = [
      headers.join(","),
      ...(rows || []).map((r, i) => {
        const muni = r?.addressMeta?.municipality || "";
        const brgy = r?.addressMeta?.barangay || "";
        const lat = Number.isFinite(r?.addressMeta?.lat) ? r.addressMeta.lat : "";
        const lng = Number.isFinite(r?.addressMeta?.lng) ? r.addressMeta.lng : "";

        return [
          i + 1,
          r?.beneficiaryName || "",
          r?.address || "",
          muni,
          brgy,
          lat,
          lng,
          r?.specialProject || "",
          r?.dateProjectApproved || "",
          toNumber(r?.projectCost),
          r?.meansOfVerification || "",
          getMovPhotos(r).length,
          r?.staffName || "",
          r?.quarter ? `${String(r.quarter)}Q` : "",
        ]
          .map(csvEscape)
          .join(",");
      }),
    ];

    const out = filename.endsWith(".csv") ? filename : `${filename}.csv`;
    downloadBlob(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" }), out);
  };

  const exportRecordsExcel = (rows, filename = "SpecialProject.xlsx") => {
    const data = (rows || []).map((r, i) => ({
      NO: i + 1,
      "NAME OF BENEFICIARY": r?.beneficiaryName || "",
      "VENUE/ADDRESS": r?.address || "",
      MUNICIPALITY: r?.addressMeta?.municipality || "",
      BARANGAY: r?.addressMeta?.barangay || "",
      LAT: Number.isFinite(r?.addressMeta?.lat) ? r.addressMeta.lat : "",
      LNG: Number.isFinite(r?.addressMeta?.lng) ? r.addressMeta.lng : "",
      "SPECIAL PROJECT": r?.specialProject || "",
      "DATE PROJECT APPROVED": r?.dateProjectApproved || "",
      "PROJECT COST": toNumber(r?.projectCost),
      "MEANS OF VERIFICATION": r?.meansOfVerification || "",
      "MOV PHOTO COUNT": getMovPhotos(r).length,
      "NAME OF STAFF": r?.staffName || "",
      QUARTER: r?.quarter ? `${String(r.quarter)}Q` : "",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SpecialProject");

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
      filename = "SpecialProject.pdf",
      titleLabel = "Special Project Export",
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

    const safeName = String(filename || "SpecialProject.pdf");
    const outName = safeName.toLowerCase().endsWith(".pdf") ? safeName : `${safeName}.pdf`;
    const hasMany = Array.isArray(rows) && rows.length > 1;

    const buildDatasetTable = (rowsToUse) => {
      const head = [[
        "NO",
        "BENEFICIARY",
        "VENUE/ADDRESS",
        "SPECIAL PROJECT",
        "DATE APPROVED",
        "PROJECT COST",
        "MEANS OF VERIFICATION",
        "NAME OF STAFF",
        "QUARTER",
      ]];

      const body = (rowsToUse || []).map((r, i) => [
        i + 1,
        r?.beneficiaryName || "",
        r?.address || "",
        r?.specialProject || "",
        r?.dateProjectApproved || "",
        `PHP ${formatCurrency(r?.projectCost)}`,
        r?.meansOfVerification || "—",
        r?.staffName || "—",
        r?.quarter ? `${String(r.quarter)}Q` : "",
      ]);

      doc.setFontSize(14);
      doc.text(String(titleLabel || "Special Project Export"), 10, 12);
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
        Number.isFinite(r?.addressMeta?.lat) && Number.isFinite(r?.addressMeta?.lng)
          ? `${r.addressMeta.lat}, ${r.addressMeta.lng}`
          : "—";

      const pairs = [
        ["Quarter", r?.quarter ? `${String(r.quarter)}Q` : "—"],
        ["Name of Beneficiary", r?.beneficiaryName || "—"],
        ["Address", r?.address || "—"],
        ["Coordinates", coords],
        ["Special Project", r?.specialProject || "—"],
        ["Date Project Approved", r?.dateProjectApproved || "—"],
        ["Project Cost", `PHP ${formatCurrency(r?.projectCost)}`],
        ["Means of Verification", r?.meansOfVerification || "—"],
        ["MOV Photo Count", getMovPhotos(r).length],
        ["Name of Staff", r?.staffName || "—"],
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
    const { filename, orientation } = options;

    const children = [];
    children.push(
      new Paragraph({
        children: [new TextRun({ text: "Special Project Export", bold: true, size: 32 })],
      })
    );

    const addSpacer = () => children.push(new Paragraph({ text: "" }));

    const makeTable = (pairs) => {
      const rowsDoc = pairs.map(([k, v]) =>
        new TableRow({
          children: [
            new TableCell({
              width: { size: 35, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [new TextRun({ text: String(k), bold: true })],
                }),
              ],
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
        Number.isFinite(r?.addressMeta?.lat) && Number.isFinite(r?.addressMeta?.lng)
          ? `${r.addressMeta.lat}, ${r.addressMeta.lng}`
          : "—";

      children.push(
        makeTable([
          ["Quarter", r?.quarter ? `${String(r.quarter)}Q` : "—"],
          ["Name of Beneficiary", r?.beneficiaryName || "—"],
          ["Address", r?.address || "—"],
          ["Coordinates", coords],
          ["Special Project", r?.specialProject || "—"],
          ["Date Project Approved", r?.dateProjectApproved || "—"],
          ["Project Cost", `PHP ${formatCurrency(r?.projectCost)}`],
          ["Means of Verification", r?.meansOfVerification || "—"],
          ["Name of Staff", r?.staffName || "—"],
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
      Number.isFinite(record?.addressMeta?.lat) && Number.isFinite(record?.addressMeta?.lng)
        ? `${record.addressMeta.lat}, ${record.addressMeta.lng}`
        : "—";

    const header = `
      <div class="header">
        <div>
          <h1>Special Project Record</h1>
          <div class="sub">${escapeHtml(PRINT_LAYOUT_LABEL[layoutKey] || "Print")}</div>
        </div>
        <div class="sub">${escapeHtml(titleLabel || "")}</div>
      </div>
    `;

    const formLayout = `
      <div class="grid">
        <div class="field full"><div class="label">Name of Beneficiary</div><div class="value">${escapeHtml(record?.beneficiaryName || "—")}</div></div>
        <div class="field full"><div class="label">Venue/Address</div><div class="value">${escapeHtml(record?.address || "—")}</div></div>
        <div class="field"><div class="label">Coordinates</div><div class="value">${escapeHtml(coords)}</div></div>
        <div class="field"><div class="label">Quarter</div><div class="value">${escapeHtml(record?.quarter ? `${record.quarter}Q` : "—")}</div></div>
        <div class="field full"><div class="label">Special Project</div><div class="value">${escapeHtml(record?.specialProject || "—")}</div></div>
        <div class="field"><div class="label">Date Project Approved</div><div class="value">${escapeHtml(record?.dateProjectApproved || "—")}</div></div>
        <div class="field"><div class="label">Project Cost</div><div class="value">PHP ${escapeHtml(formatCurrency(record?.projectCost))}</div></div>
        <div class="field full"><div class="label">Means of Verification</div><div class="value">${escapeHtml(record?.meansOfVerification || "—")}</div></div>
        <div class="field"><div class="label">MOV Photo Count</div><div class="value">${getMovPhotos(record).length}</div></div>
        <div class="field full"><div class="label">Name of Staff</div><div class="value">${escapeHtml(record?.staffName || "—")}</div></div>
      </div>
    `;

    const tableLayout = `
      <table class="kvTable">
        <tbody>
          <tr><th>Name of Beneficiary</th><td colspan="3">${escapeHtml(record?.beneficiaryName || "—")}</td></tr>
          <tr><th>Venue/Address</th><td colspan="3">${escapeHtml(record?.address || "—")}</td></tr>
          <tr><th>Coordinates</th><td>${escapeHtml(coords)}</td><th>Quarter</th><td>${escapeHtml(record?.quarter ? `${record.quarter}Q` : "—")}</td></tr>
          <tr><th>Special Project</th><td colspan="3">${escapeHtml(record?.specialProject || "—")}</td></tr>
          <tr><th>Date Project Approved</th><td>${escapeHtml(record?.dateProjectApproved || "—")}</td><th>Project Cost</th><td>PHP ${escapeHtml(formatCurrency(record?.projectCost))}</td></tr>
          <tr><th>Means of Verification</th><td colspan="3">${escapeHtml(record?.meansOfVerification || "—")}</td></tr>
          <tr><th>MOV Photo Count</th><td colspan="3">${getMovPhotos(record).length}</td></tr>
          <tr><th>Name of Staff</th><td colspan="3">${escapeHtml(record?.staffName || "—")}</td></tr>
        </tbody>
      </table>
    `;

    const compactLayout = `
      <div class="compact">
        <div><b>Name of Beneficiary:</b> ${escapeHtml(record?.beneficiaryName || "—")}</div>
        <div><b>Venue/Address:</b> ${escapeHtml(record?.address || "—")}</div>
        <div><b>Coordinates:</b> ${escapeHtml(coords)}</div>
        <div><b>Special Project:</b> ${escapeHtml(record?.specialProject || "—")}</div>
        <div><b>Date Project Approved:</b> ${escapeHtml(record?.dateProjectApproved || "—")}</div>
        <div><b>Project Cost:</b> PHP ${escapeHtml(formatCurrency(record?.projectCost))}</div>
        <div><b>Means of Verification:</b> ${escapeHtml(record?.meansOfVerification || "—")}</div>
        <div><b>MOV Photo Count:</b> ${getMovPhotos(record).length}</div>
        <div><b>Name of Staff:</b> ${escapeHtml(record?.staffName || "—")}</div>
        <div><b>Quarter:</b> ${escapeHtml(record?.quarter ? `${record.quarter}Q` : "—")}</div>
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
          <div class="footer-note">Generated from Special Project page</div>
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
  <title>Special Project Print</title>
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
          try {
            win.print();
          } catch { }
        }, 250);
      };
    } catch { }
  };

  const [records, setRecords] = useState([]);
  const [specialProjectCustomFields, setSpecialProjectCustomFields] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editRecordId, setEditRecordId] = useState(null);
  const [viewRecordId, setViewRecordId] = useState(null);
  const [viewMode, setViewMode] = useState("list");
  const [addressFlowOpen, setAddressFlowOpen] = useState(false);
  const [addressViewForId, setAddressViewForId] = useState(null);
  const [pickForId, setPickForId] = useState(null);
  const [detailFor, setDetailFor] = useState(null);
  const [detailForm, setDetailForm] = useState({
    type: "", title: "", date: "", venue: "", noOfFirms: "", male: "", female: "", total: "", projectProgramUnit: "", notes: "", techRows: [],
    trainingProgram: "", trainingProvince: "PANGASINAN", trainingStartDate: "", trainingEndDate: "", trainingVenueAddress: "",
    trainingParticipantsFemale: "", trainingParticipantsMale: "", trainingSeniorFemale: "", trainingSeniorMale: "", trainingIpFemale: "", trainingIpMale: "", trainingFourPsFemale: "", trainingFourPsMale: "", trainingPwdFemale: "", trainingPwdMale: "", trainingFirmsSucsHeisLgusCount: "", trainingFirmsAssociationsList: "", trainingTrainorAffiliation: "", trainingCostDost: "", trainingCostPartnerAgency: "",
    promoProject: "SPECIAL PROJECT", promoActivityDate: "", promoTechnologyPromoted: "", promoTechnologyGenerator: "", promoModeOfPromotion: "Social Media", promoActivityTitle: "", promoActivityVenueAddress: "", promoCustomerName: "", promoCustomerAddress: "", promoSex: "N/A", promoStaffName: "", promoMeansVerification: "",
    consultancyType: "", dateEngagement: "", expertInstitution: "", customerName: "", customerSex: "", customerAddress: "", meansVerification: "", noOfAdvice: "",
    packagingQuarter: "", packagingProvince: "Pangasinan", packagingDateCompleted: "", packagingTypeOfIntervention: "Label Design", packagingProductName: "", packagingSizeVariant: "", packagingMaterialsProvided: "", packagingCustomerName: "", packagingSex: "", packagingFirmInstitution: "", packagingAddress: "", packagingMeansVerification: "", packagingRemarks: "",
  });

  const [selectedSntIds, setSelectedSntIds] = useState({});

  const selectedSntIdFor = (recordId) => selectedSntIds?.[recordId] || "";

  const setSelectedSntIdFor = (recordId, entryId) => {
    setSelectedSntIds((prev) => ({ ...prev, [recordId]: entryId }));
  };

  const [filterYear, setFilterYear] = useState("");
  const [filterQuarter, setFilterQuarter] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

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

  const [form, setForm] = useState({
    quarter: "",
    specialProject: "",
    projectTitle: "",
    projectCost: "",
    dateProjectApproved: "",
    beneficiaryName: "",
    address: "",
    addressMeta: null,
    meansOfVerification: "",
    movPhotos: [],
    staffName: "",
    customFields: {},
  });

  const [specialProjectOptions, setSpecialProjectOptions] = useState(DEFAULT_SPECIAL_PROJECT_OPTIONS);

  const [outlineGeo, setOutlineGeo] = useState(null);
  const [municipalGeo, setMunicipalGeo] = useState(null);
  const [geoError, setGeoError] = useState("");
  const [borderMode, setBorderMode] = useState("municipality");
  const [selectedMunicipality, setSelectedMunicipality] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");

  const fetchRecords = async () => {
    try {
      const res = await axios.get(`${API_BASE}/special-projects`);
      const rows = Array.isArray(res.data) ? res.data : [];
      setRecords(rows.map((row) => {
        const photos = normalizeMovPhotos(row.movPhotos ?? row.mov_photos ?? row.photos);
        return {
          ...row,
          movPhotos: photos,
          mov_photos: photos,
          photos,
        };
      }));
    } catch (err) {
      console.error(err);
      setRecords([]);
      alert(`Failed to load Special Project records from server.`);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SPECIAL_PROJECT_OPTIONS_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed) && parsed.length) {
        const cleaned = parsed.map((x) => String(x || "").trim()).filter(Boolean);
        setSpecialProjectOptions(Array.from(new Set(cleaned)));
      }
    } catch {
      setSpecialProjectOptions(DEFAULT_SPECIAL_PROJECT_OPTIONS);
    }
  }, []);

  const saveSpecialProjectOptions = (next) => {
    const cleaned = Array.from(
      new Set((next || []).map((x) => String(x || "").trim()).filter(Boolean))
    );
    setSpecialProjectOptions(cleaned);
    try {
      localStorage.setItem(SPECIAL_PROJECT_OPTIONS_KEY, JSON.stringify(cleaned));
    } catch { }
  };

  const handleSpecialProjectChange = (value) => {
    if (value === "__ADD_NEW__") {
      const name = window.prompt("Add new Special Project dropdown value:");
      const cleaned = String(name || "").trim();
      if (!cleaned) return;
      const exists = specialProjectOptions.some((x) => x.toLowerCase() === cleaned.toLowerCase());
      const next = exists ? specialProjectOptions : [...specialProjectOptions, cleaned];
      saveSpecialProjectOptions(next);
      setForm((prev) => ({ ...prev, specialProject: cleaned }));
      return;
    }
    setForm((prev) => ({ ...prev, specialProject: value }));
  };

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
    let cancelled = false;

    const fixedKeys = new Set([
      "no",
      "actions",
      "quarter",
      "specialProject",
      "special_project",
      "projectTitle",
      "project_title",
      "projectCost",
      "project_cost",
      "dateProjectApproved",
      "date_project_approved",
      "beneficiaryName",
      "beneficiary_name",
      "beneficiaries",
      "address",
      "venueAddress",
      "venue_address",
      "meansOfVerification",
      "means_of_verification",
      "staffName",
      "staff_name",
      "sntInterventions",
      "snt_interventions"
    ]);

    async function loadSpecialProjectCustomFields() {
      try {
        const res = await axios.get(`${API_BASE}/table-management/config`);
        const modules = Array.isArray(res.data) ? res.data : [];

        const mod = modules.find(
          (m) => String(m.moduleName || m.module_name || m.name || "").toLowerCase() === "special project"
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

        if (!cancelled) setSpecialProjectCustomFields(customFields);
      } catch (err) {
        console.error("Failed to load Special Project custom fields:", err);
        if (!cancelled) setSpecialProjectCustomFields([]);
      }
    }

    loadSpecialProjectCustomFields();

    return () => {
      cancelled = true;
    };
  }, []);
  const saveRecords = (next) => {
    setRecords(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch { }
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setShowAdd(false);
        setEditRecordId(null);
        setViewRecordId(null);
        setAddressFlowOpen(false);
        setAddressViewForId(null);
        setPickForId(null);
        setDetailFor(null);
        setPrintModal((p) => ({ ...p, open: false }));
        setExportModal((p) => ({ ...p, open: false }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const resetForm = () => {
    setForm({
      quarter: "",
      specialProject: "",
      projectTitle: "",
      projectCost: "",
      dateProjectApproved: "",
      beneficiaryName: "",
      address: "",
      addressMeta: null,
      meansOfVerification: "",
      movPhotos: [],
      staffName: "",
      customFields: {},
    });
  };

  const yearOptions = useMemo(() => {
    const years = (records || [])
      .map((r) => getYearFromDate(r?.dateProjectApproved))
      .filter((y) => Number.isFinite(y));
    return Array.from(new Set(years)).sort((a, b) => b - a);
  }, [records]);

  const filteredRecords = useMemo(() => {
    let arr = Array.isArray(records) ? [...records] : [];

    if (filterYear) {
      const y = Number(filterYear);
      arr = arr.filter((r) => getYearFromDate(r?.dateProjectApproved) === y);
    }

    if (filterQuarter) {
      arr = arr.filter((r) => String(r?.quarter || "") === String(filterQuarter));
    }

    if (filterMonth) {
      const m = Number(filterMonth);
      arr = arr.filter((r) => getMonthFromDate(r?.dateProjectApproved) === m);
    }

    const q = searchTerm.trim().toLowerCase();
    if (q) {
      arr = arr.filter((r) => {
        const blob = [
          r?.beneficiaryName,
          r?.projectTitle,
          r?.address,
          r?.addressMeta?.venue,
          r?.addressMeta?.municipality,
          r?.addressMeta?.barangay,
          r?.specialProject,
          r?.dateProjectApproved,
          r?.projectCost,
          r?.meansOfVerification,
          r?.staffName,
          r?.quarter ? `${String(r.quarter)}Q` : "",
        ].join(" ").toLowerCase();
        return blob.includes(q);
      });
    }

    const toTime = (iso) => {
      const d = new Date(iso || "");
      return Number.isNaN(d.getTime()) ? 0 : d.getTime();
    };

    arr.sort((a, b) => {
      const ta = toTime(a?.dateProjectApproved);
      const tb = toTime(b?.dateProjectApproved);
      return sortOrder === "oldest" ? ta - tb : tb - ta;
    });

    return arr;
  }, [records, filterYear, filterQuarter, filterMonth, sortOrder, searchTerm]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterYear, filterQuarter, filterMonth, sortOrder]);

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRecords.slice(start, start + PAGE_SIZE);
  }, [filteredRecords, currentPage]);



  const getRecordById = (id) => records.find((x) => x.id === id) || null;

  const makeDefaultTechRows = () => [
    {
      quarter: "", unitCenter: "DOST-PANGASINAN", nameOfTechnologyTransferred: "", technologyGenerator: "", modeOfTransfer: "", isDostDevelopedFunded: false,
      dateTransferred: "", activityTitle: "", activityDate: "", activityVenue: "", institutionName: "", institutionAddress: "", classification: "", representativeName: "", representativeDesignation: "", sex: "",
    },
  ];

  const emptyDetailForm = (type = "") => ({
    type, title: "", date: "", venue: "", noOfFirms: "", male: "", female: "", total: "", projectProgramUnit: "", notes: "", techRows: type === "Tech Roll Out" ? makeDefaultTechRows() : [],
    trainingProgram: "", trainingProvince: "PANGASINAN", trainingStartDate: "", trainingEndDate: "", trainingVenueAddress: "", trainingParticipantsFemale: "", trainingParticipantsMale: "", trainingSeniorFemale: "", trainingSeniorMale: "", trainingIpFemale: "", trainingIpMale: "", trainingFourPsFemale: "", trainingFourPsMale: "", trainingPwdFemale: "", trainingPwdMale: "", trainingFirmsSucsHeisLgusCount: "", trainingFirmsAssociationsList: "", trainingTrainorAffiliation: "", trainingCostDost: "", trainingCostPartnerAgency: "",
    promoProject: "SPECIAL PROJECT", promoActivityDate: "", promoTechnologyPromoted: "", promoTechnologyGenerator: "", promoModeOfPromotion: "Social Media", promoActivityTitle: "", promoActivityVenueAddress: "", promoCustomerName: "", promoCustomerAddress: "", promoSex: "N/A", promoStaffName: "", promoMeansVerification: "",
    consultancyType: "", dateEngagement: "", expertInstitution: "", customerName: "", customerSex: "", customerAddress: "", meansVerification: "", noOfAdvice: "",
    packagingQuarter: "", packagingProvince: "Pangasinan", packagingDateCompleted: "", packagingTypeOfIntervention: "Label Design", packagingProductName: "", packagingSizeVariant: "", packagingMaterialsProvided: "", packagingCustomerName: "", packagingSex: "", packagingFirmInstitution: "", packagingAddress: "", packagingMeansVerification: "", packagingRemarks: "",
  });

  const resetDetailForm = (type = "") => setDetailForm(emptyDetailForm(type));

  const getInterventionLabel = (it) => {
    const type = it?.type || "";
    if (type === "Tech Roll Out") {
      const rows = Array.isArray(it?.techRows) ? it.techRows : [];
      return rows.map((r) => String(r?.nameOfTechnologyTransferred || "").trim()).find(Boolean) || it?.title || "Tech Roll Out";
    }
    if (type === "Training") return it?.trainingProgram || it?.title || "Training";
    if (type === "Tech Promo" || type === "S&T Promo") return it?.promoActivityTitle || it?.title || type;
    if (type === "TACS") return it?.consultancyType || it?.title || "TACS";
    if (type === "Packaging & Labeling") return it?.packagingProductName || it?.title || "Packaging & Labeling";
    if (type === "TNA Report") return it?.notes || it?.title || "TNA Report";
    return it?.title || type || "—";
  };

  const openInterventionPicker = (recordId) => {
    if (!allowAdd) return deny("You do not have permission to add Special Project interventions.");
    setPickForId(recordId);
  };
  const openInterventionDetails_Add = (recordId, type) => {
    if (!allowAdd) return deny("You do not have permission to add Special Project interventions.");
    setPickForId(null);
    resetDetailForm(type);
    setDetailFor({ recordId, mode: "add" });
  };
  const openInterventionDetails_Edit = (recordId, entryId) => {
    if (!allowEdit) return deny("You do not have permission to edit Special Project interventions.");
    const record = getRecordById(recordId);
    const entry = (record?.sntInterventions || []).find((x) => x.id === entryId);
    if (!record || !entry) return;
    setDetailForm({ ...emptyDetailForm(entry.type || ""), ...entry, techRows: Array.isArray(entry.techRows) && entry.techRows.length ? entry.techRows : (entry.type === "Tech Roll Out" ? makeDefaultTechRows() : []) });
    setDetailFor({ recordId, entryId, mode: "edit" });
  };

  const updateTechRow = (idx, key, val) => setDetailForm((prev) => { const next = [...(prev.techRows || [])]; next[idx] = { ...(next[idx] || {}), [key]: val }; return { ...prev, techRows: next }; });
  const addTechRow = () => setDetailForm((prev) => ({ ...prev, techRows: [...(prev.techRows || []), ...makeDefaultTechRows()] }));
  const removeTechRow = (idx) => setDetailForm((prev) => { const arr = [...(prev.techRows || [])]; arr.splice(idx, 1); return { ...prev, techRows: arr.length ? arr : makeDefaultTechRows() }; });

  const saveInterventionDetails = () => {
    if (!detailFor) return;
    if (detailFor.mode === "add" && !allowAdd) return deny("You do not have permission to add Special Project interventions.");
    if (detailFor.mode === "edit" && !allowEdit) return deny("You do not have permission to edit Special Project interventions.");
    const type = (detailForm.type || "").trim();
    const isTech = type === "Tech Roll Out";
    const isTraining = type === "Training";
    const isPromoLike = type === "Tech Promo" || type === "S&T Promo";
    const isTacs = type === "TACS";
    const isPackaging = type === "Packaging & Labeling";
    if (!type) return alert("Missing intervention type");
    if (isTech && !(detailForm.techRows || []).some((r) => String(r?.nameOfTechnologyTransferred || "").trim())) return alert("Complete at least one Tech Roll Out row.");
    if (isTraining && !(detailForm.trainingProgram || detailForm.title || "").trim()) return alert("Required: Training Program / Title");
    if (isPromoLike && !(detailForm.promoActivityTitle || detailForm.title || "").trim()) return alert("Required: Activity Title");
    if (isTacs && !(detailForm.consultancyType || "").trim()) return alert("Required: Type of Consultancy");
    if (isPackaging && !(detailForm.packagingProductName || "").trim()) return alert("Required: Product Name");
    const title = isTraining ? detailForm.trainingProgram || detailForm.title : isPromoLike ? detailForm.promoActivityTitle || detailForm.title : isTacs ? detailForm.consultancyType || detailForm.title : isPackaging ? detailForm.packagingProductName || detailForm.title : detailForm.title || type;
    const date = isTraining ? detailForm.trainingStartDate : isPromoLike ? detailForm.promoActivityDate : isTacs ? detailForm.dateEngagement : isPackaging ? detailForm.packagingDateCompleted : detailForm.date;
    const venue = isTraining ? detailForm.trainingVenueAddress : isPromoLike ? detailForm.promoActivityVenueAddress : isTacs ? detailForm.customerAddress : isPackaging ? detailForm.packagingAddress : detailForm.venue;
    const item = { ...detailForm, id: detailFor.entryId || `${Date.now()}_${Math.random().toString(16).slice(2)}`, type, title: String(title || "").trim(), date: date || "", venue: String(venue || "").trim(), noOfFirms: toNumber(detailForm.noOfFirms), male: toNumber(detailForm.male), female: toNumber(detailForm.female), total: toNumber(detailForm.total) || toNumber(detailForm.male) + toNumber(detailForm.female), trainingParticipantsFemale: toNumber(detailForm.trainingParticipantsFemale), trainingParticipantsMale: toNumber(detailForm.trainingParticipantsMale), trainingSeniorFemale: toNumber(detailForm.trainingSeniorFemale), trainingSeniorMale: toNumber(detailForm.trainingSeniorMale), trainingIpFemale: toNumber(detailForm.trainingIpFemale), trainingIpMale: toNumber(detailForm.trainingIpMale), trainingFourPsFemale: toNumber(detailForm.trainingFourPsFemale), trainingFourPsMale: toNumber(detailForm.trainingFourPsMale), trainingPwdFemale: toNumber(detailForm.trainingPwdFemale), trainingPwdMale: toNumber(detailForm.trainingPwdMale), trainingFirmsSucsHeisLgusCount: toNumber(detailForm.trainingFirmsSucsHeisLgusCount), trainingCostDost: toNumber(detailForm.trainingCostDost), trainingCostPartnerAgency: toNumber(detailForm.trainingCostPartnerAgency), noOfAdvice: toNumber(detailForm.noOfAdvice) };
    const next = records.map((r) => { if (r.id !== detailFor.recordId) return r; const list = Array.isArray(r.sntInterventions) ? [...r.sntInterventions] : []; const idx = list.findIndex((x) => x.id === item.id); if (idx >= 0) list[idx] = item; else list.push(item); return { ...r, sntInterventions: list }; });
    saveRecords(next);
    setDetailFor(null);
    resetDetailForm();
  };

  const deleteIntervention = async (recordId, entryId) => {
    if (!allowDelete) return deny("You do not have permission to delete Special Project interventions.");
    if (!(await requestDeleteConfirm("Delete this intervention entry?"))) return;
    saveRecords(records.map((r) => r.id === recordId ? { ...r, sntInterventions: (r.sntInterventions || []).filter((x) => x.id !== entryId) } : r));
    setSelectedSntIds((prev) => {
      const next = { ...prev };
      if (next[recordId] === entryId) delete next[recordId];
      return next;
    });
  };

  const getSelectedSntEntry = (recordId) => {
    const record = getRecordById(recordId);
    const selectedId = selectedSntIdFor(recordId);
    return (record?.sntInterventions || []).find((x) => x.id === selectedId) || null;
  };

  const openSelectedSntEntry = (recordId) => {
    const selected = getSelectedSntEntry(recordId);
    if (!selected) return;
    openInterventionDetails_Edit(recordId, selected.id);
  };

  const deleteSelectedSntEntry = async (recordId) => {
    const selected = getSelectedSntEntry(recordId);
    if (!selected) return;
    deleteIntervention(recordId, selected.id);
  };

  const openPrintPopupRow = (recordId) => {
    if (!allowExport) return deny("You do not have permission to print Special Project records.");
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
    if (!allowExport) return deny("You do not have permission to print Special Project records.");
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
    if (!allowExport) return deny("You do not have permission to print Special Project records.");
    const rows =
      printModal.scope === "row"
        ? [getRecordById(printModal.recordId)].filter(Boolean)
        : filteredRecords;

    if (!rows.length) return alert("No rows to print.");

    const titleLabel =
      printModal.scope === "row"
        ? `${PRINT_LAYOUT_LABEL[printModal.layout] || "Print"} — ${rows[0]?.beneficiaryName || "Record"}`
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
    if (!allowExport) return deny("You do not have permission to export Special Project records.");
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
    if (!allowExport) return deny("You do not have permission to export Special Project records.");
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
    if (!allowExport) return deny("You do not have permission to export Special Project records.");
    const rows =
      exportModal.scope === "row"
        ? [getRecordById(exportModal.recordId)].filter(Boolean)
        : filteredRecords;

    if (!rows.length) return alert("No rows to export.");

    const baseName =
      exportModal.scope === "row"
        ? `SpecialProject_${safeFilePart(rows[0]?.beneficiaryName)}_${safeFilePart(rows[0]?.dateProjectApproved)}`
        : `SpecialProject_Filtered_${rows.length}_rows`;

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
            ? `Export PDF — ${rows[0]?.beneficiaryName || "Record"}`
            : `Export PDF — Filtered (${rows.length})`,
        filename: `${baseName}.pdf`,
      });
    } else if (exportModal.format === "docx") {
      await exportRecordsDOCX(rows, {
        orientation: exportModal.orientation,
        filename: `${baseName}.docx`,
      });
    }

    setExportModal((p) => ({ ...p, open: false }));
  };

  const openAddRecord = () => {
    if (!allowAdd) return deny("You do not have permission to add Special Project records.");
    setEditRecordId(null);
    resetForm();
    setShowAdd(true);
  };

  const openViewRecord = (id, mode = "list") => {
    setViewMode(mode);
    setViewRecordId(id);
  };

  const openEditRecord = (id) => {
    if (!allowEdit) return deny("You do not have permission to edit Special Project records.");
    const r = records.find((x) => x.id === id);
    if (!r) return;

    setEditRecordId(id);
    setForm({
      quarter: r.quarter || quarterFromDate(r.dateProjectApproved),
      specialProject: r.specialProject || "",
      projectTitle: r.projectTitle || "",
      projectCost: r.projectCost ?? "",
      dateProjectApproved: r.dateProjectApproved || "",
      beneficiaryName: r.beneficiaryName || "",
      address: r.address || "",
      addressMeta: r.addressMeta || null,
      meansOfVerification: r.meansOfVerification || "",
      movPhotos: getMovPhotos(r),
      staffName: r.staffName || "",
      customFields: r.customFields || r.custom_fields || {},
    });
    setShowAdd(true);
  };



  const cleanCustomLabel = (value) =>
    String(value || "")
      .replace(/^#+/, "")
      .replace(/_/g, " ")
      .trim()
      .replace(/\b\w/g, (m) => m.toUpperCase());

  const parseSpecialProjectCustomValues = (record = {}) => {
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

  const getSpecialProjectCustomPairs = (record = {}) => {
    const values = parseSpecialProjectCustomValues(record);

    return (specialProjectCustomFields || []).map((field) => {
      const key = field.fieldKey || field.field_key || field.key;
      const rawLabel = field.fieldLabel || field.field_label || field.label || key;
      const value = values?.[key];

      return {
        key,
        label: cleanCustomLabel(rawLabel),
        value: value === null || value === undefined || value === "" ? "—" : String(value),
      };
    });
  };

  const renderSpecialProjectCustomViewFields = (record) => {
    const pairs = getSpecialProjectCustomPairs(record);
    if (!pairs.length) return null;

    return pairs.map((item) => (
      <div key={`custom-view-${item.key}`}>
        <b>{item.label}:</b> {item.value}
      </div>
    ));
  };

  const renderSpecialProjectCustomViewRows = (record) => {
    const pairs = getSpecialProjectCustomPairs(record);
    if (!pairs.length) return null;

    return pairs.map((item) => (
      <tr key={`custom-row-${item.key}`}>
        <td style={styles.viewTd}><b>{item.label}</b></td>
        <td style={styles.viewTd}>{item.value}</td>
      </tr>
    ));
  };
  const renderSpecialProjectCustomInputs = () => {
    if (!specialProjectCustomFields.length) return null;

    return (
      <>
        {specialProjectCustomFields.map((field) => {
          const key = field.fieldKey || field.field_key || field.key;
          const label = field.fieldLabel || field.field_label || field.label || key;
          const type = String(field.fieldType || field.field_type || field.type || "Text");
          const required = Boolean(field.isRequired ?? field.is_required ?? field.required ?? false);

          return (
            <label key={key}>
              <div style={styles.label}>{label}{required ? " *" : ""}</div>

              {type.toLowerCase().includes("textarea") ? (
                <textarea
                  style={styles.textarea || styles.input}
                  value={form.customFields?.[key] || ""}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      customFields: { ...(p.customFields || {}), [key]: e.target.value },
                    }))
                  }
                  placeholder={`Enter ${label}`}
                />
              ) : (
                <input
                  style={styles.input}
                  type={type.toLowerCase().includes("number") ? "number" : "text"}
                  value={form.customFields?.[key] || ""}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      customFields: { ...(p.customFields || {}), [key]: e.target.value },
                    }))
                  }
                  placeholder={`Enter ${label}`}
                />
              )}
            </label>
          );
        })}
      </>
    );
  };
  const saveRecord = async () => {
    if (!editRecordId && !allowAdd) return deny("You do not have permission to add Special Project records.");
    if (editRecordId && !allowEdit) return deny("You do not have permission to edit Special Project records.");
    if (!form.specialProject.trim()) return alert("Required: Special Project");
    if (!form.projectTitle.trim()) return alert("Required: Project Title");
    if (String(form.projectCost).trim() === "") return alert("Required: Project Cost");
    if (!form.dateProjectApproved) return alert("Required: Date Approved");
    if (!form.beneficiaryName.trim()) return alert("Required: Beneficiaries");
    if (!form.address.trim()) return alert("Required: Venue/Address");

    const computedQuarter = quarterFromDate(form.dateProjectApproved);
    if (!computedQuarter) return alert("Invalid Date Approved");

    const existing = editRecordId ? getRecordById(editRecordId) : null;
    const base = {
      quarter: String(computedQuarter),
      specialProject: form.specialProject.trim(),
      projectTitle: form.projectTitle.trim(),
      projectCost: toNumber(form.projectCost),
      dateProjectApproved: form.dateProjectApproved,
      beneficiaryName: form.beneficiaryName.trim(),
      address: form.address.trim(),
      addressMeta: form.addressMeta || null,
      meansOfVerification: (form.meansOfVerification || "").trim(),
      means_of_verification: (form.meansOfVerification || "").trim(),
      movPhotos: Array.isArray(form.movPhotos) ? form.movPhotos : [],
      mov_photos: Array.isArray(form.movPhotos) ? form.movPhotos : [],
      photos: Array.isArray(form.movPhotos) ? form.movPhotos : [],
      staffName: (form.staffName || "").trim(),
      custom_fields: form.customFields || {},
      customFields: form.customFields || {},
      sntInterventions: Array.isArray(existing?.sntInterventions) ? existing.sntInterventions : [],
    };

    try {
      if (!editRecordId) {
        await axios.post(`${API_BASE}/special-projects`, base);
      } else {
        await axios.put(`${API_BASE}/special-projects/${editRecordId}`, base);
      }

      await fetchRecords();

      setShowAdd(false);
      setEditRecordId(null);
      resetForm();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Failed to save Special Project record.");
    }
  };

  const deleteRecord = async (id) => {
    if (!allowDelete) return deny("You do not have permission to delete Special Project records.");
    if (!(await requestDeleteConfirm("Delete this record?"))) return;

    try {
      await axios.delete(`${API_BASE}/special-projects/${id}`);
      await fetchRecords();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Failed to delete Special Project record.");
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

  const getRecordMunicipality = (r) => {
    const m1 = r?.addressMeta?.municipality;
    if (m1) return String(m1).trim();

    const addr = String(r?.address || "").trim();
    if (!addr) return "";

    const parts = addr.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) return parts[parts.length - 2];
    return "";
  };

  const allPinnedRecords = useMemo(() => {
    return filteredRecords.filter(
      (r) => Number.isFinite(r?.addressMeta?.lat) && Number.isFinite(r?.addressMeta?.lng)
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

  const maskPathOptions = {
    color: "transparent",
    weight: 0,
    fillColor: "#ffffff",
    fillOpacity: 1,
  };

  const openGoogleMap = (lat, lng) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    window.open(url, "_blank");
  };

  const openGoogleDirections = (lat, lng) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    window.open(url, "_blank");
  };

  const parseCoordinates = (text) => {
    const s = String(text || "").trim();
    const m = s.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
    if (!m) return null;
    const lat = Number(m[1]);
    const lng = Number(m[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`);
      if (!res.ok) throw new Error("Reverse geocode failed");
      const data = await res.json();
      const a = data?.address || {};
      const brgy = a.village || a.hamlet || a.suburb || a.neighbourhood || a.quarter || "";
      const muni = a.city || a.town || a.municipality || a.county || "";
      const province = a.state || a.province || "Pangasinan";
      return [brgy, muni, province].filter(Boolean).join(", ") || data?.display_name || "";
    } catch {
      return "";
    }
  };

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
    const [venue, setVenue] = useState(initialMeta?.venue || "");
    const [manualText, setManualText] = useState(initialMeta?.manualText || "");
    const [coordsText, setCoordsText] = useState("");
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
      setVenue(initialMeta?.venue || "");
      setManualText(initialMeta?.manualText || initialMeta?.addressText || "");
      setMunicipality(initialMeta?.municipality || "");
      setBarangay(initialMeta?.barangay || "");
      const lat = initialMeta?.lat;
      const lng = initialMeta?.lng;
      setCoords(Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null);
      setCoordsText(Number.isFinite(lat) && Number.isFinite(lng) ? `${lat}, ${lng}` : "");
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

    const addressText =
      mode === "manual"
        ? manualText.trim()
        : [barangay, municipality, province].filter(Boolean).join(", ");
    const displayText = [venue.trim(), addressText].filter(Boolean).join(", ");

    const canSave = Boolean(venue.trim() || addressText || coords);

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
        async (pos) => {
          const picked = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCoords(picked);
          setCoordsText(`${picked.lat}, ${picked.lng}`);
          if (mode === "manual" && !manualText.trim()) {
            const addr = await reverseGeocode(picked.lat, picked.lng);
            if (addr) setManualText(addr);
          }
        },
        () => alert("Could not get your location. Check browser permissions.")
      );
    };

    const useCoordinates = async () => {
      const picked = parseCoordinates(coordsText);
      if (!picked) return alert("Invalid coordinates. Example: 15.123456, 120.123456");
      setCoords(picked);
      if (mode === "manual") {
        const addr = await reverseGeocode(picked.lat, picked.lng);
        if (addr) setManualText(addr);
      }
    };

    const save = () => {
      if (!canSave) return;

      const meta =
        mode === "manual"
          ? {
            mode: "manual",
            venue: venue.trim(),
            manualText: manualText.trim(),
            addressText,
            displayText,
            province: "",
            municipality: "",
            barangay: "",
            lat: coords?.lat || null,
            lng: coords?.lng || null,
          }
          : {
            mode: "hierarchical",
            venue: venue.trim(),
            province,
            municipality,
            barangay,
            manualText: "",
            addressText,
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
              <button
                type="button"
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
                type="button"
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
              <div style={styles.label}>Venue</div>
              <input
                style={styles.input}
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="Optional: e.g. Riverside Convention Center"
              />
            </div>

            {mode === "manual" ? (
              <>
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
                    placeholder="Optional: 15.123456, 120.123456"
                  />
                  <div>
                    <button type="button" style={styles.tinyBtn} onClick={useCoordinates}>Use Coordinates</button>
                  </div>
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
                      <input
                        style={styles.input}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Type to search..."
                      />
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
                        <div style={styles.label}>Select Barangay *</div>
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
                                  if (Number.isFinite(lat) && Number.isFinite(lng)) {
                                    setCoords({ lat, lng });
                                    setCoordsText(`${lat}, ${lng}`);
                                  } else {
                                    setCoords(null);
                                    setCoordsText("");
                                  }
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

  const applyAddressMetaToForm = (meta) => {
    setForm((prev) => ({
      ...prev,
      address: meta?.displayText || "",
      addressMeta: meta || null,
    }));
  };

  function AddressViewModal({ record, onClose }) {
    if (!record) return null;
    const meta = record.addressMeta || null;
    const lat = meta?.lat;
    const lng = meta?.lng;
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

    return (
      <div style={{ ...styles.modalBackdrop, zIndex: 3200 }} onClick={onClose}>
        <div style={{ ...styles.modal, position: "relative", zIndex: 3201, width: "min(720px, 100%)" }} onClick={(e) => e.stopPropagation()}>
          <div style={styles.modalHeader}>
            <div>View Venue/Address — {record.beneficiaryName}</div>
            <button type="button" style={styles.closeX} onClick={onClose}>✕</button>
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
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {record.address || "—"}
                </div>
              </div>

              <div style={styles.grid}>
                <div style={styles.field}>
                  <div style={styles.label}>Venue</div>
                  <div style={{ fontWeight: 900 }}>{meta?.venue || "—"}</div>
                </div>

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
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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

  function PopupModal({ open, title, children, onClose, zIndex = 1600 }) {
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

  const viewRecord = useMemo(() => {
    if (!viewRecordId) return null;
    return records.find((r) => r.id === viewRecordId) || null;
  }, [viewRecordId, records]);

  const addressViewRecord = useMemo(() => {
    if (!addressViewForId) return null;
    return records.find((r) => r.id === addressViewForId) || null;
  }, [addressViewForId, records]);

  
  const PAGINATION_SCALE = 0.85;
  function Pagination({ page, onPage }) {
    const safePage = Math.max(1, Number(page) || 1);
    const groupStart = Math.floor((safePage - 1) / 10) * 10 + 1;
    const nums = Array.from({ length: 10 }, (_, i) => groupStart + i);
    

    return (
      <div style={styles.modernPagerWrap}>
        <style>{`
          .special-project-page-btn:hover:not(:disabled):not(.special-project-page-active) {
            transform: translateY(-3px);
            border-color: #93c5fd !important;
            box-shadow: 0 12px 24px rgba(37, 99, 235, 0.14) !important;
          }

          .special-project-page-btn:active:not(:disabled) {
            transform: scale(0.94);
          }

          .special-project-page-active {
            animation: specialProjectActivePagePop 0.28s ease;
          }

          @keyframes specialProjectActivePagePop {
            0% { transform: scale(0.88); }
            70% { transform: scale(1.07); }
            100% { transform: scale(1); }
          }
        `}</style>

        <div style={styles.modernPagerControls}>
          <button
            type="button"
            className="special-project-page-btn"
            style={styles.modernPageBtn(safePage === 1, false, true)}
            onClick={() => onPage(Math.max(1, safePage - 1))}
            disabled={safePage === 1}
            title="Previous page"
          >
            ‹
          </button>

          {nums.map((n) => {
            const active = n === safePage;

            return (
              <button
                key={n}
                type="button"
                className={`special-project-page-btn ${active ? "special-project-page-active" : ""}`}
                style={styles.modernPageBtn(false, active, false)}
                onClick={() => onPage(n)}
                title={`Page ${n}`}
              >
                {n}
              </button>
            );
          })}

          <button
            type="button"
            className="special-project-page-btn"
            style={styles.modernPageBtn(false, false, true)}
            onClick={() => onPage(safePage + 1)}
            title="Next page"
          >
            ›
          </button>
        </div>
      </div>
    );
  }
  

  const styles = {
    page: { padding: 16, position: "relative", fontFamily },
    actionBar: { position: "sticky", top: 0, zIndex: 900, background: "#fff", paddingTop: 8, paddingBottom: 8 },
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
    searchInput: {
      padding: "8px 10px",
      borderRadius: 10,
      border: "1px solid #cbd5e1",
      background: "#fff",
      width: 170,
      minWidth: 150,
      maxWidth: 190,
      fontSize: 12,
      fontFamily,
      outline: "none",
    },
    modernPagerWrap: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: "100%",
      padding: "18px 0 14px",
      fontFamily,
      transform: `scale(${PAGINATION_SCALE})`,
      transformOrigin: "top center",
    },
    modernPagerControls: {
      display: "flex",
      justifyContent: "center",
      gap: 10,
      flexWrap: "wrap",
      alignItems: "center",
      fontFamily,
    },
    modernPageBtn: (disabled = false, active = false, arrow = false) => ({
      minWidth: 48,
      height: 48,
      padding: arrow ? "0 15px" : "0 14px",
      border: active ? "2px solid #3b82f6" : "2px solid #e5e7eb",
      borderRadius: 15,
      background: active ? "#3b82f6" : "#ffffff",
      color: disabled ? "#a1a1aa" : active ? "#ffffff" : "#2f3037",
      fontSize: arrow ? 34 : 17,
      lineHeight: 1,
      fontWeight: 900,
      cursor: disabled ? "not-allowed" : "pointer",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: active
        ? "0 14px 30px rgba(59, 130, 246, 0.28)"
        : "0 8px 18px rgba(15, 23, 42, 0.06)",
      opacity: disabled ? 0.45 : 1,
      fontFamily,
      transition:
        "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease, color 0.18s ease",
    }),

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
    modalBackdrop: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      zIndex: 1500,
    },
    addressModalBackdrop: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.42)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      zIndex: 3200,
    },
    modal: {
      width: "min(980px, 100%)",
      background: "white",
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      fontFamily,
      position: "relative",
      zIndex: 1501,
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
    modalBody: { padding: 16 },
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
      padding: "10px 12px",
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
      padding: "10px 12px",
      borderRadius: 10,
      fontSize: 12,
      fontWeight: 900,
      cursor: "pointer",
      fontFamily,
      whiteSpace: "nowrap",
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
    mono: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" },
    flowShell: { width: "min(620px, 100%)", background: "white", borderRadius: 12, overflow: "hidden", boxShadow: "0 10px 30px rgba(0,0,0,0.25)", fontFamily, position: "relative", zIndex: 3201 },
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
    selectSm: { padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", fontWeight: 900, fontFamily, fontSize: 12, minWidth: 150 },
    warn: { marginTop: 8, background: "#fff7ed", border: "1px solid #fdba74", padding: "10px 12px", borderRadius: 10, fontSize: 12, color: "#7c2d12", fontWeight: 800 },
    viewTableWrap: { width: "100%", overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 10 },
    viewTable: { width: "100%", borderCollapse: "collapse", tableLayout: "auto", minWidth: 1100, fontFamily },
    viewTh: { border: "2px solid #6b7280", padding: "8px 10px", background: "#eef2f6", fontSize: 12, textAlign: "center", fontFamily, fontWeight: 900, whiteSpace: "nowrap" },
    viewTd: { border: "2px solid #6b7280", padding: "8px 10px", fontSize: 12, fontFamily, verticalAlign: "top", background: "white", whiteSpace: "normal", wordBreak: "break-word", overflowWrap: "anywhere" },
    viewTdCenter: { border: "2px solid #6b7280", padding: "8px 10px", fontSize: 12, textAlign: "center", fontFamily, verticalAlign: "top", background: "white", whiteSpace: "nowrap" },
  };


  function SntInterventionsBlock({ record }) {
    const interventions = Array.isArray(record?.sntInterventions) ? record.sntInterventions : [];
    return (
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontWeight: 900, fontSize: 16 }}>S&amp;T Interventions</div>
          {allowAdd && (<button type="button" style={styles.btnDark} onClick={() => openInterventionPicker(record.id)}>+ Add S&amp;T Intervention</button>)}
        </div>
        <div style={styles.viewTableWrap}>
          <table style={{ ...styles.viewTable, minWidth: 760 }}>
            <thead>
              <tr>
                <th style={styles.viewTh}>#</th>
                <th style={styles.viewTh}>Type</th>
                <th style={styles.viewTh}>Title / Label</th>
                <th style={styles.viewTh}>Date</th>
                <th style={styles.viewTh}>Venue</th>
                <th style={styles.viewTh}>Action</th>
              </tr>
            </thead>
            <tbody>
              {interventions.length ? (
                interventions.map((it, i) => (
                  <tr key={it.id}>
                    <td style={styles.viewTdCenter}>{i + 1}</td>
                    <td style={styles.viewTdCenter}>{it.type || "—"}</td>
                    <td style={styles.viewTd}>{getInterventionLabel(it)}</td>
                    <td style={styles.viewTdCenter}>{it.date || "—"}</td>
                    <td style={styles.viewTd}>{it.venue || "—"}</td>
                    <td style={styles.viewTdCenter}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                        {allowEdit ? (
                          <button type="button" style={styles.tinyBtn} onClick={() => openInterventionDetails_Edit(record.id, it.id)}>View / Edit</button>
                        ) : (
                          <button type="button" style={styles.tinyBtn} disabled>View Only</button>
                        )}
                        {allowDelete && (<button type="button" style={styles.dangerBtn} onClick={() => deleteIntervention(record.id, it.id)}>Delete</button>)}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td style={styles.viewTdCenter} colSpan={6}>No S&amp;T Interventions yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function InterventionFields() {
    const type = detailForm.type || "";
    const isTech = type === "Tech Roll Out";
    const isTraining = type === "Training";
    const isPromoLike = type === "Tech Promo" || type === "S&T Promo";
    const isTacs = type === "TACS";
    const isPackaging = type === "Packaging & Labeling";
    const isSimple = type === "Calibration" || type === "TNA Report" || (!isTech && !isTraining && !isPromoLike && !isTacs && !isPackaging);

    const trainingTotalFemale = toNumber(detailForm.trainingParticipantsFemale) + toNumber(detailForm.trainingSeniorFemale) + toNumber(detailForm.trainingIpFemale) + toNumber(detailForm.trainingFourPsFemale) + toNumber(detailForm.trainingPwdFemale);
    const trainingTotalMale = toNumber(detailForm.trainingParticipantsMale) + toNumber(detailForm.trainingSeniorMale) + toNumber(detailForm.trainingIpMale) + toNumber(detailForm.trainingFourPsMale) + toNumber(detailForm.trainingPwdMale);
    const trainingTotalCost = toNumber(detailForm.trainingCostDost) + toNumber(detailForm.trainingCostPartnerAgency);

    const input = (key, label, inputType = "text") => (
      <div style={styles.field}>
        <div style={styles.label}>{label}</div>
        <input style={styles.input} type={inputType} value={detailForm[key] || ""} onChange={(e) => setDetailForm({ ...detailForm, [key]: e.target.value })} />
      </div>
    );

    return (
      <div style={{ display: "grid", gap: 12 }}>
        <div style={styles.grid}>
          <div style={styles.field}>
            <div style={styles.label}>Intervention Type *</div>
            <select style={styles.input} value={detailForm.type} onChange={(e) => resetDetailForm(e.target.value)}>
              <option value="">Select Type</option>
              {INTERVENTION_OPTIONS.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          {!isTraining && !isPromoLike && !isTacs && !isPackaging ? input("date", "Date", "date") : null}
        </div>

        {isTech ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <b>Tech Roll Out Rows</b>
              <button type="button" style={styles.tinyBtn} onClick={addTechRow}>+ Add Row</button>
            </div>
            {(detailForm.techRows || []).map((row, idx) => (
              <div key={idx} style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 12, display: "grid", gap: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <b>Tech Roll Out #{idx + 1}</b>
                  <button type="button" style={styles.dangerBtn} onClick={() => removeTechRow(idx)}>Remove</button>
                </div>
                <div style={styles.grid}>
                  {[
                    ["quarter", "Quarter"], ["unitCenter", "Unit/Center"], ["nameOfTechnologyTransferred", "Name of Technology Transferred"], ["technologyGenerator", "Technology Generator"], ["modeOfTransfer", "Mode of Transfer"], ["dateTransferred", "Date Transferred", "date"], ["activityTitle", "Activity Title"], ["activityDate", "Activity Date", "date"], ["activityVenue", "Activity Venue"], ["institutionName", "Institution Name"], ["institutionAddress", "Institution Address"], ["classification", "Classification"], ["representativeName", "Representative Name"], ["representativeDesignation", "Representative Designation"], ["sex", "Sex"],
                  ].map(([key, label, t]) => (
                    <div style={styles.field} key={key}>
                      <div style={styles.label}>{label}</div>
                      <input style={styles.input} type={t || "text"} value={row[key] || ""} onChange={(e) => updateTechRow(idx, key, e.target.value)} />
                    </div>
                  ))}
                  <div style={styles.field}>
                    <div style={styles.label}>DOST Developed/Funded?</div>
                    <select style={styles.input} value={row.isDostDevelopedFunded ? "Yes" : "No"} onChange={(e) => updateTechRow(idx, "isDostDevelopedFunded", e.target.value === "Yes")}>
                      <option>No</option><option>Yes</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {isTraining ? (
          <div style={styles.grid}>
            {input("trainingProgram", "Training Program / Title *")}
            {input("trainingProvince", "Province")}
            {input("trainingStartDate", "Start Date", "date")}
            {input("trainingEndDate", "End Date", "date")}
            <div style={{ ...styles.field, gridColumn: "1 / -1" }}><div style={styles.label}>Venue / Address</div><input style={styles.input} value={detailForm.trainingVenueAddress || ""} onChange={(e) => setDetailForm({ ...detailForm, trainingVenueAddress: e.target.value })} /></div>
            {input("trainingParticipantsFemale", "Regular Female", "number")}{input("trainingParticipantsMale", "Regular Male", "number")}
            {input("trainingSeniorFemale", "Senior Female", "number")}{input("trainingSeniorMale", "Senior Male", "number")}
            {input("trainingIpFemale", "IP Female", "number")}{input("trainingIpMale", "IP Male", "number")}
            {input("trainingFourPsFemale", "4Ps Female", "number")}{input("trainingFourPsMale", "4Ps Male", "number")}
            {input("trainingPwdFemale", "PWD Female", "number")}{input("trainingPwdMale", "PWD Male", "number")}
            <div style={styles.field}><div style={styles.label}>Total Female</div><input style={{ ...styles.input, background: "#f1f5f9" }} value={trainingTotalFemale} disabled /></div>
            <div style={styles.field}><div style={styles.label}>Total Male</div><input style={{ ...styles.input, background: "#f1f5f9" }} value={trainingTotalMale} disabled /></div>
            <div style={styles.field}><div style={styles.label}>Total Participants</div><input style={{ ...styles.input, background: "#f1f5f9" }} value={trainingTotalFemale + trainingTotalMale} disabled /></div>
            {input("trainingFirmsSucsHeisLgusCount", "No. of Firms/SUCs/HEIs/LGUs", "number")}
            <div style={{ ...styles.field, gridColumn: "1 / -1" }}><div style={styles.label}>List of Firms / Associations</div><textarea style={styles.textarea} value={detailForm.trainingFirmsAssociationsList || ""} onChange={(e) => setDetailForm({ ...detailForm, trainingFirmsAssociationsList: e.target.value })} /></div>
            {input("trainingTrainorAffiliation", "Name of Trainor / Affiliation")}{input("trainingCostDost", "DOST Cost", "number")}{input("trainingCostPartnerAgency", "Partner Agency Cost", "number")}
            <div style={styles.field}><div style={styles.label}>Total Cost</div><input style={{ ...styles.input, background: "#f1f5f9" }} value={formatCurrency(trainingTotalCost)} disabled /></div>
          </div>
        ) : null}

        {isPromoLike ? (
          <div style={styles.grid}>
            {input("promoProject", "Project")}{input("promoActivityDate", "Activity Date", "date")}{input("promoTechnologyPromoted", "Technology Promoted")}{input("promoTechnologyGenerator", "Technology Generator")}{input("promoModeOfPromotion", "Mode of Promotion")}{input("promoActivityTitle", "Activity Title *")}
            <div style={{ ...styles.field, gridColumn: "1 / -1" }}><div style={styles.label}>Activity Venue Address</div><input style={styles.input} value={detailForm.promoActivityVenueAddress || ""} onChange={(e) => setDetailForm({ ...detailForm, promoActivityVenueAddress: e.target.value })} /></div>
            {input("promoCustomerName", "Customer Name")}{input("promoSex", "Sex")}
            <div style={{ ...styles.field, gridColumn: "1 / -1" }}><div style={styles.label}>Customer Address</div><input style={styles.input} value={detailForm.promoCustomerAddress || ""} onChange={(e) => setDetailForm({ ...detailForm, promoCustomerAddress: e.target.value })} /></div>
            {input("promoStaffName", "Staff Name")}
            <div style={{ ...styles.field, gridColumn: "1 / -1" }}><div style={styles.label}>Means of Verification</div><input style={styles.input} value={detailForm.promoMeansVerification || ""} onChange={(e) => setDetailForm({ ...detailForm, promoMeansVerification: e.target.value })} /></div>
          </div>
        ) : null}

        {isTacs ? (
          <div style={styles.grid}>
            <div style={styles.field}><div style={styles.label}>Type of Consultancy *</div><select style={styles.input} value={detailForm.consultancyType || ""} onChange={(e) => setDetailForm({ ...detailForm, consultancyType: e.target.value })}><option value="">Select</option>{TACS_CONSULTANCY_OPTIONS.map((x) => <option key={x}>{x}</option>)}</select></div>
            {input("dateEngagement", "Date of Engagement", "date")}
            <div style={{ ...styles.field, gridColumn: "1 / -1" }}><div style={styles.label}>Name of Expert / Institution</div><input style={styles.input} value={detailForm.expertInstitution || ""} onChange={(e) => setDetailForm({ ...detailForm, expertInstitution: e.target.value })} /></div>
            {input("customerName", "Customer Name")}{input("customerSex", "Sex")}
            <div style={{ ...styles.field, gridColumn: "1 / -1" }}><div style={styles.label}>Customer Address</div><input style={styles.input} value={detailForm.customerAddress || ""} onChange={(e) => setDetailForm({ ...detailForm, customerAddress: e.target.value })} /></div>
            {input("noOfAdvice", "No. of Technical Advice", "number")}
            <div style={{ ...styles.field, gridColumn: "1 / -1" }}><div style={styles.label}>Means of Verification</div><input style={styles.input} value={detailForm.meansVerification || ""} onChange={(e) => setDetailForm({ ...detailForm, meansVerification: e.target.value })} /></div>
          </div>
        ) : null}

        {isPackaging ? (
          <div style={styles.grid}>
            {input("packagingQuarter", "Quarter")}{input("packagingProvince", "Province")}{input("packagingDateCompleted", "Date Completed", "date")}{input("packagingTypeOfIntervention", "Type of Intervention")}{input("packagingProductName", "Product Name *")}{input("packagingSizeVariant", "Size / Variant")}
            <div style={{ ...styles.field, gridColumn: "1 / -1" }}><div style={styles.label}>Materials Provided</div><textarea style={styles.textarea} value={detailForm.packagingMaterialsProvided || ""} onChange={(e) => setDetailForm({ ...detailForm, packagingMaterialsProvided: e.target.value })} /></div>
            {input("packagingCustomerName", "Customer Name")}{input("packagingSex", "Sex")}
            <div style={{ ...styles.field, gridColumn: "1 / -1" }}><div style={styles.label}>Firm / Institution</div><input style={styles.input} value={detailForm.packagingFirmInstitution || ""} onChange={(e) => setDetailForm({ ...detailForm, packagingFirmInstitution: e.target.value })} /></div>
            <div style={{ ...styles.field, gridColumn: "1 / -1" }}><div style={styles.label}>Address</div><input style={styles.input} value={detailForm.packagingAddress || ""} onChange={(e) => setDetailForm({ ...detailForm, packagingAddress: e.target.value })} /></div>
            <div style={{ ...styles.field, gridColumn: "1 / -1" }}><div style={styles.label}>Means of Verification</div><input style={styles.input} value={detailForm.packagingMeansVerification || ""} onChange={(e) => setDetailForm({ ...detailForm, packagingMeansVerification: e.target.value })} /></div>
            <div style={{ ...styles.field, gridColumn: "1 / -1" }}><div style={styles.label}>Remarks</div><textarea style={styles.textarea} value={detailForm.packagingRemarks || ""} onChange={(e) => setDetailForm({ ...detailForm, packagingRemarks: e.target.value })} /></div>
          </div>
        ) : null}

        {isSimple ? (
          <div style={styles.grid}>
            {input("title", "Title / Label")}
            <div style={{ ...styles.field, gridColumn: "1 / -1" }}><div style={styles.label}>Venue</div><input style={styles.input} value={detailForm.venue || ""} onChange={(e) => setDetailForm({ ...detailForm, venue: e.target.value })} /></div>
            {input("noOfFirms", "No. of Firms", "number")}{input("male", "Male", "number")}{input("female", "Female", "number")}{input("total", "Total", "number")}{input("projectProgramUnit", "Project / Program / Unit")}
            <div style={{ ...styles.field, gridColumn: "1 / -1" }}><div style={styles.label}>Notes / Remarks</div><textarea style={styles.textarea} value={detailForm.notes || ""} onChange={(e) => setDetailForm({ ...detailForm, notes: e.target.value })} /></div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.titleBar}>
        <div>SPECIAL PROJECT</div>
        <div style={{ fontSize: 12, opacity: 0.95, fontWeight: 800, fontFamily }}>

        </div>
      </div>

      <div style={styles.mapCard}>
        <div style={styles.mapHeader}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, width: "100%" }}>
            <div style={styles.mapTitle}>PANGASINAN MAP — Special Project Pins</div>
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
                  attribution="Tiles &copy; Esri"
                  opacity={0.9}
                />
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
              <FitAndLockToPangasinan
                bounds={pangasinanBounds}
                borderMode={borderMode}
                selectedMuni={selectedMunicipality}
                selectedDist={selectedDistrict}
                filteredGeo={filteredMunicipalityGeojson}
              />
            ) : null}

            {visiblePinnedRecords.map((r) => (
              <Marker key={r.id} position={[r.addressMeta.lat, r.addressMeta.lng]} pane="pinPane">
                <Popup>
                  <div style={{ minWidth: 260, fontFamily }}>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>{r.beneficiaryName || "—"}</div>
                    <div style={{ fontSize: 12, marginBottom: 6 }}>
                      <b>Special Project:</b> {r.specialProject || "—"}
                      <br />
                      <b>Project Title:</b> {r.projectTitle || "—"}
                      <br />
                      <b>Municipality:</b> {getRecordMunicipality(r) || "—"}
                      <br />
                      <b>Date Approved:</b> {r.dateProjectApproved || "—"}
                    </div>
                    <div style={{ fontSize: 12, marginBottom: 8 }}>
                      <b>Venue/Address:</b> {r.address || "—"}
                      <br />
                      <b>Project Cost:</b> PHP {formatCurrency(r.projectCost)}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" style={styles.tinyBtn} onClick={() => setAddressViewForId(r.id)}>Address</button>
                      <button type="button" style={styles.tinyBtn} onClick={() => openGoogleMap(r.addressMeta.lat, r.addressMeta.lng)}>Map</button>
                      <button type="button" style={styles.tinyBtn} onClick={() => openGoogleDirections(r.addressMeta.lat, r.addressMeta.lng)}>Directions</button>
                      <button type="button" style={styles.tinyBtn} onClick={() => openViewRecord(r.id, "list")}>Full Details</button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      <div style={styles.actionBar}>
        <div style={styles.sectionTitleRow}>
          <div style={styles.sectionTitle}>
            SPECIAL PROJECT RECORDS
            <span style={{ marginLeft: 10, fontSize: 12, opacity: 0.75 }}>
              Showing <b>{paginatedRecords.length}</b> of {filteredRecords.length} / {records.length}
            </span>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", position: "relative", zIndex: 1000 }}>
            <input
              style={styles.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
            />

            <select style={styles.selectSm} value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
              <option value="">All Years</option>
              {yearOptions.map((y) => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>

            <select style={styles.selectSm} value={filterQuarter} onChange={(e) => setFilterQuarter(e.target.value)}>
              <option value="">All Quarters</option>
              <option value="1">1Q</option>
              <option value="2">2Q</option>
              <option value="3">3Q</option>
              <option value="4">4Q</option>
            </select>

            <select style={styles.selectSm} value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
              {MONTH_OPTIONS.map((m) => (
                <option key={m.value || "all"} value={m.value}>{m.label}</option>
              ))}
            </select>

            <select style={styles.selectSm} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
            </select>

            <button type="button" style={styles.addBtn} onClick={() => { setSearchTerm(""); setFilterYear(""); setFilterQuarter(""); setFilterMonth(""); setSortOrder("newest"); setCurrentPage(1); }}>
              Clear Filters
            </button>

            {allowExport && (
              <button type="button" style={styles.btnGhost} onClick={openExportPopupBulk} disabled={filteredRecords.length === 0}>
                Export
              </button>
            )}

            {allowExport && (
              <button type="button" style={styles.btnDark} onClick={openPrintPopupBulk} disabled={filteredRecords.length === 0}>
                Print
              </button>
            )}

            {allowAdd && (
              <button type="button" style={styles.addBtn} onClick={openAddRecord}>
                + Add Project
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={styles.tableWrap}>
        <table style={{ ...styles.table, minWidth: 2350 }}>
          <colgroup>
            <col style={{ width: 52 }} />
            <col style={{ width: 190 }} />
            <col style={{ width: 260 }} />
            <col style={{ width: 150 }} />
            <col style={{ width: 150 }} />
            <col style={{ width: 100 }} />
            <col style={{ width: 220 }} />
            <col style={{ width: 420 }} />
            <col style={{ width: 310 }} />
            <col style={{ width: 250 }} />
            <col style={{ width: 220 }} />
          </colgroup>
          <thead>
            <tr>
              <th style={styles.th}>NO.</th>
              <th style={styles.th}>SPECIAL PROJECT</th>
              <th style={styles.th}>PROJECT TITLE</th>
              <th style={styles.th}>PROJECT COST</th>
              <th style={styles.th}>DATE APPROVED</th>
              <th style={styles.th}>QUARTER</th>
              <th style={styles.th}>BENEFICIARIES</th>
              <th style={styles.th}>VENUE/ADDRESS</th>
              <th style={styles.th}>S&T INTERVENTIONS</th>
              <th style={styles.th}>MEANS OF VERIFICATION</th>
              <th style={styles.th}>ACTIONS</th>
            </tr>
          </thead>

          <tbody>
            {paginatedRecords.length === 0 ? (
              <tr>
                <td style={styles.tdCenter} colSpan={11}>
                  Walang entries sa current filter. (Try “Clear Filters”)
                </td>
              </tr>
            ) : (
              paginatedRecords.map((r, idx) => {
                const hasCoords = Number.isFinite(r?.addressMeta?.lat) && Number.isFinite(r?.addressMeta?.lng);
                const hasMovUrl = !!extractFirstUrl(r?.meansOfVerification);
                const count = Array.isArray(r.sntInterventions) ? r.sntInterventions.length : 0;

                return (
                  <tr key={r.id}>
                    <td style={styles.tdCenter}>{(currentPage - 1) * PAGE_SIZE + idx + 1}</td>
                    <td style={styles.td}>{r.specialProject || "—"}</td>
                    <td style={styles.td}><div style={{ fontWeight: 900 }}>{r.projectTitle || "—"}</div></td>
                    <td style={styles.tdCenter}>PHP {formatCurrency(r.projectCost)}</td>
                    <td style={styles.tdCenter}>{r.dateProjectApproved || "—"}</td>
                    <td style={styles.tdCenter}>{r.quarter ? `${r.quarter}Q` : "—"}</td>
                    <td style={styles.td}>{r.beneficiaryName || "—"}</td>

                    <td style={styles.td}>
                      <div style={{ display: "grid", gap: 8 }}>
                        <div>{r.address || "—"}</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button type="button" style={styles.tinyBtn} onClick={() => setAddressViewForId(r.id)}>View</button>
                          {hasCoords ? (
                            <>
                              <button type="button" style={styles.tinyBtn} onClick={() => openGoogleMap(r.addressMeta.lat, r.addressMeta.lng)}>Map</button>
                              <button type="button" style={styles.tinyBtn} onClick={() => openGoogleDirections(r.addressMeta.lat, r.addressMeta.lng)}>Directions</button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    <td style={styles.td}>
                      {Array.isArray(r.sntInterventions) && r.sntInterventions.length ? (
                        <div style={{ display: "grid", gap: 6 }}>
                          {r.sntInterventions.map((it, snIdx) => {
                            const selected = selectedSntIdFor(r.id) === it.id;
                            return (
                              <button
                                key={it.id}
                                type="button"
                                onClick={() => setSelectedSntIdFor(r.id, it.id)}
                                style={{
                                  border: selected ? "1px solid #0b4ea2" : "1px solid transparent",
                                  background: selected ? "#dbeafe" : "transparent",
                                  textAlign: "left",
                                  padding: "4px 6px",
                                  borderRadius: 8,
                                  fontSize: 11,
                                  fontWeight: 800,
                                  cursor: "pointer",
                                  fontFamily,
                                  lineHeight: 1.25,
                                }}
                                title="Click to select this intervention for Edit/Delete"
                              >
                                {snIdx + 1}. [{it.type || "—"}] {getInterventionLabel(it)}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div style={{ textAlign: "center", opacity: 0.75 }}>—</div>
                      )}

                      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginTop: 10 }}>
                        {allowAdd && (<button type="button" style={styles.tinyBtn} onClick={() => openInterventionPicker(r.id)}>+ Add</button>)}
                        {allowEdit && (
                        <button
                          type="button"
                          style={{ ...styles.tinyBtn, opacity: getSelectedSntEntry(r.id) ? 1 : 0.45, cursor: getSelectedSntEntry(r.id) ? "pointer" : "not-allowed" }}
                          onClick={() => openSelectedSntEntry(r.id)}
                          disabled={!getSelectedSntEntry(r.id)}
                        >
                          Edit
                        </button>
                        )}
                        {allowDelete && (
                        <button
                          type="button"
                          style={{ ...styles.dangerBtn, opacity: getSelectedSntEntry(r.id) ? 1 : 0.45, cursor: getSelectedSntEntry(r.id) ? "pointer" : "not-allowed" }}
                          onClick={() => deleteSelectedSntEntry(r.id)}
                          disabled={!getSelectedSntEntry(r.id)}
                        >
                          Delete
                        </button>
                        )}
                      </div>
                    </td>

                    <td style={styles.td}>
                      <div style={{ display: "grid", gap: 8 }}>
                        <div>{r.meansOfVerification || "—"}</div>
                        <div style={{ fontSize: 11, fontWeight: 900, color: "#334155" }}>
                          Photos: {getMovPhotos(r).length}
                        </div>
                        {hasMovUrl ? (
                          <div>
                            <button type="button" style={styles.tinyBtn} onClick={() => openVerificationLink(r.meansOfVerification)}>
                              Open Link
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </td>

                    <td style={styles.tdCenter}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
                        <button type="button" style={styles.tinyBtn} onClick={() => openViewRecord(r.id, "list")}>View</button>
                        {allowEdit && (<button type="button" style={styles.tinyBtn} onClick={() => openEditRecord(r.id)}>Edit</button>)}
                        {allowExport && (<button type="button" style={styles.tinyBtn} onClick={() => openPrintPopupRow(r.id)}>Print</button>)}
                        {allowExport && (<button type="button" style={styles.tinyBtn} onClick={() => openExportPopupRow(r.id)}>Export</button>)}
                        {allowDelete && (<button type="button" style={styles.dangerBtn} onClick={() => deleteRecord(r.id)}>Delete</button>)}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={currentPage} onPage={setCurrentPage} />

      {addressViewForId && (
        <AddressViewModal record={addressViewRecord} onClose={() => setAddressViewForId(null)} />
      )}

      {showAdd && (
        <div style={{ ...styles.modalBackdrop, zIndex: 1500 }} onClick={() => setShowAdd(false)}>
          <div style={{ ...styles.modal, position: "relative", zIndex: 1501 }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>{editRecordId ? "Edit Project" : "Add Project"}</div>
              <button type="button" style={styles.closeX} onClick={() => setShowAdd(false)}>✕</button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.grid}>
                <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                  <div style={styles.label}>Special Project *</div>
                  <select
                    style={styles.input}
                    value={form.specialProject}
                    onChange={(e) => handleSpecialProjectChange(e.target.value)}
                  >
                    <option value="">Select Special Project</option>
                    {specialProjectOptions.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                    <option value="__ADD_NEW__">+ Add dropdown list</option>
                  </select>
                </div>

                <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                  <div style={styles.label}>Project Title *</div>
                  <input
                    style={styles.input}
                    value={form.projectTitle}
                    onChange={(e) => setForm({ ...form, projectTitle: e.target.value })}
                    placeholder="Enter project title"
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Project Cost *</div>
                  <input
                    style={styles.input}
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.projectCost}
                    onChange={(e) => setForm({ ...form, projectCost: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Date Approved *</div>
                  <input
                    style={styles.input}
                    type="date"
                    value={form.dateProjectApproved}
                    onChange={(e) => {
                      const v = e.target.value;
                      const q = quarterFromDate(v);
                      setForm((prev) => ({ ...prev, dateProjectApproved: v, quarter: q }));
                    }}
                  />
                </div>

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

                <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                  <div style={styles.label}>Beneficiaries *</div>
                  <input
                    style={styles.input}
                    value={form.beneficiaryName}
                    onChange={(e) => setForm({ ...form, beneficiaryName: e.target.value })}
                    placeholder="Enter beneficiaries"
                  />
                </div>

                <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                  <div style={styles.label}>Venue/Address *</div>
                  <button
                    type="button"
                    onClick={() => setAddressFlowOpen(true)}
                    style={styles.inputButton(Boolean(form.address))}
                  >
                    <span style={{ opacity: form.address ? 1 : 0.6 }}>{form.address || "Click to select Venue/Address"}</span>
                    <span style={{ fontSize: 11, opacity: 0.65 }}>{form.address ? "Change" : "Select"}</span>
                  </button>

                  {Number.isFinite(form?.addressMeta?.lat) && Number.isFinite(form?.addressMeta?.lng) ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" style={styles.tinyBtn} onClick={() => openGoogleMap(form.addressMeta.lat, form.addressMeta.lng)}>Map</button>
                      <button type="button" style={styles.tinyBtn} onClick={() => openGoogleDirections(form.addressMeta.lat, form.addressMeta.lng)}>Directions</button>
                      <div style={{ fontSize: 12, opacity: 0.85, alignSelf: "center", ...styles.mono }}>
                        {form.addressMeta.lat.toFixed(6)}, {form.addressMeta.lng.toFixed(6)}
                      </div>
                    </div>
                  ) : null}
                </div>

                <UnifiedMOVSection
                  value={form.meansOfVerification}
                  photos={Array.isArray(form.movPhotos) ? form.movPhotos : []}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, meansOfVerification: value }))}
                  onPhotosChange={(photos) => setForm((prev) => ({ ...prev, movPhotos: photos }))}
                />

                <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                  <div style={styles.label}>Name of Staff</div>
                  <input
                    style={styles.input}
                    value={form.staffName}
                    onChange={(e) => setForm({ ...form, staffName: e.target.value })}
                    placeholder="Optional"
                  />
                </div>

                {renderSpecialProjectCustomInputs()}
              </div>
            </div>


            <div style={styles.modalFooter}>
              <button
                type="button"
                style={styles.btnGhost}
                onClick={() => {
                  setShowAdd(false);
                  setEditRecordId(null);
                  resetForm();
                }}
              >
                Cancel
              </button>
              <button type="button" style={styles.btnDark} onClick={saveRecord}>
                {editRecordId ? "Update Project" : "Save Project"}
              </button>
            </div>
          </div>

          <AddressFlowModal
            open={addressFlowOpen}
            onClose={() => setAddressFlowOpen(false)}
            onSave={applyAddressMetaToForm}
            initialMeta={form.addressMeta}
          />
        </div>
      )}

      {viewRecordId && viewRecord && (
        <PopupModal
          open={true}
          title={`View Entry — ${viewRecord.beneficiaryName || "Record"}`}
          onClose={() => setViewRecordId(null)}
        >
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                style={{
                  ...styles.pillBtn,
                  ...(viewMode === "list"
                    ? { border: "1px solid #0b4ea2", background: "#dbeafe" }
                    : null),
                }}
                onClick={() => setViewMode("list")}
              >
                List View
              </button>
              <button
                type="button"
                style={{
                  ...styles.pillBtn,
                  ...(viewMode === "table"
                    ? { border: "1px solid #0b4ea2", background: "#dbeafe" }
                    : null),
                }}
                onClick={() => setViewMode("table")}
              >
                Table View
              </button>
              {extractFirstUrl(viewRecord?.meansOfVerification) ? (
                <button
                  type="button"
                  style={styles.pillBtn}
                  onClick={() => openVerificationLink(viewRecord.meansOfVerification)}
                >
                  View Link
                </button>
              ) : null}
            </div>

            {viewMode === "list" ? (
              <div style={{ display: "grid", gap: 10, fontSize: 13 }}>
                <div><b>Beneficiaries:</b> {viewRecord.beneficiaryName || "—"}</div>
                <div><b>Venue/Address:</b> {viewRecord.address || "—"}</div>
                <div>
                  <b>Coordinates:</b>{" "}
                  {Number.isFinite(viewRecord?.addressMeta?.lat) &&
                    Number.isFinite(viewRecord?.addressMeta?.lng)
                    ? `${viewRecord.addressMeta.lat}, ${viewRecord.addressMeta.lng}`
                    : "—"}
                </div>
                <div><b>Special Project:</b> {viewRecord.specialProject || "—"}</div>
                <div><b>Project Title:</b> {viewRecord.projectTitle || "—"}</div>
                <div><b>Date Approved:</b> {viewRecord.dateProjectApproved || "—"}</div>
                <div><b>Project Cost:</b> PHP {formatCurrency(viewRecord.projectCost)}</div>
                <div><b>Means of Verification:</b> {viewRecord.meansOfVerification || "—"}</div>
                <div>
                  <b>MOV Photos:</b> {getMovPhotos(viewRecord).length}
                  {getMovPhotos(viewRecord).length ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                      {getMovPhotos(viewRecord).map((photo, idx) => (
                        <img
                          key={`${photo.name || "mov-photo"}_${idx}`}
                          src={photo.dataUrl || photo.url}
                          alt={photo.name || `MOV Photo ${idx + 1}`}
                          style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid #cbd5e1" }}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
                <div><b>Name of Staff:</b> {viewRecord.staffName || "—"}</div>
                {renderSpecialProjectCustomViewFields(viewRecord)}
                <div><b>Quarter:</b> {viewRecord.quarter ? `${viewRecord.quarter}Q` : "—"}</div>
              </div>
            ) : (
              <div style={styles.viewTableWrap}>
                <table style={styles.viewTable}>
                  <tbody>
                    <tr>
                      <th style={styles.viewTh}>Field</th>
                      <th style={styles.viewTh}>Value</th>
                    </tr>
                    <tr>
                      <td style={styles.viewTd}><b>Beneficiaries</b></td>
                      <td style={styles.viewTd}>{viewRecord.beneficiaryName || "—"}</td>
                    </tr>
                    <tr>
                      <td style={styles.viewTd}><b>Venue/Address</b></td>
                      <td style={styles.viewTd}>{viewRecord.address || "—"}</td>
                    </tr>
                    <tr>
                      <td style={styles.viewTd}><b>Coordinates</b></td>
                      <td style={styles.viewTd}>
                        {Number.isFinite(viewRecord?.addressMeta?.lat) && Number.isFinite(viewRecord?.addressMeta?.lng)
                          ? `${viewRecord.addressMeta.lat}, ${viewRecord.addressMeta.lng}`
                          : "—"}
                      </td>
                    </tr>
                    <tr>
                      <td style={styles.viewTd}><b>Special Project</b></td>
                      <td style={styles.viewTd}>{viewRecord.specialProject || "—"}</td>
                    </tr>
                    <tr>
                      <td style={styles.viewTd}><b>Project Title</b></td>
                      <td style={styles.viewTd}>{viewRecord.projectTitle || "—"}</td>
                    </tr>
                    <tr>
                      <td style={styles.viewTd}><b>Date Approved</b></td>
                      <td style={styles.viewTd}>{viewRecord.dateProjectApproved || "—"}</td>
                    </tr>
                    <tr>
                      <td style={styles.viewTd}><b>Project Cost</b></td>
                      <td style={styles.viewTd}>PHP {formatCurrency(viewRecord.projectCost)}</td>
                    </tr>
                    <tr>
                      <td style={styles.viewTd}><b>Means of Verification</b></td>
                      <td style={styles.viewTd}>{viewRecord.meansOfVerification || "—"}</td>
                    </tr>
                    <tr>
                      <td style={styles.viewTd}><b>MOV Photos</b></td>
                      <td style={styles.viewTd}>
                        {getMovPhotos(viewRecord).length}
                        {getMovPhotos(viewRecord).length ? (
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                            {getMovPhotos(viewRecord).map((photo, idx) => (
                              <img
                                key={`${photo.name || "mov-photo"}_${idx}`}
                                src={photo.dataUrl || photo.url}
                                alt={photo.name || `MOV Photo ${idx + 1}`}
                                style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid #cbd5e1" }}
                              />
                            ))}
                          </div>
                        ) : null}
                      </td>
                    </tr>
                    <tr>
                      <td style={styles.viewTd}><b>Name of Staff</b></td>
                      <td style={styles.viewTd}>{viewRecord.staffName || "—"}</td>
                    </tr>
                    {renderSpecialProjectCustomViewRows(viewRecord)}
                    <tr>
                      <td style={styles.viewTd}><b>Quarter</b></td>
                      <td style={styles.viewTd}>{viewRecord.quarter ? `${viewRecord.quarter}Q` : "—"}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            <SntInterventionsBlock record={viewRecord} />

            <div
              style={{
                marginTop: 4,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: "1px solid #e2e8f0",
                paddingTop: 12,
              }}
            >
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {Number.isFinite(viewRecord?.addressMeta?.lat) &&
                  Number.isFinite(viewRecord?.addressMeta?.lng) ? (
                  <>
                    <button
                      type="button"
                      style={styles.btnGhost}
                      onClick={() =>
                        openGoogleMap(
                          viewRecord.addressMeta.lat,
                          viewRecord.addressMeta.lng
                        )
                      }
                    >
                      Map
                    </button>
                    <button
                      type="button"
                      style={styles.btnGhost}
                      onClick={() =>
                        openGoogleDirections(
                          viewRecord.addressMeta.lat,
                          viewRecord.addressMeta.lng
                        )
                      }
                    >
                      Directions
                    </button>
                  </>
                ) : null}
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {allowEdit && (
                <button
                  type="button"
                  style={styles.btnGhost}
                  onClick={() => {
                    setViewRecordId(null);
                    openEditRecord(viewRecord.id);
                  }}
                >
                  Edit
                </button>
                )}
                <button
                  type="button"
                  style={styles.btnDark}
                  onClick={() => setViewRecordId(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </PopupModal>
      )}

      <PopupModal
        open={Boolean(pickForId)}
        title={`Add S&T Intervention${getRecordById(pickForId)?.projectTitle ? ` — ${getRecordById(pickForId).projectTitle}` : ""}`}
        onClose={() => setPickForId(null)}
      >
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gap: 8 }}>
            {INTERVENTION_OPTIONS.map((type) => (
              <button
                key={type}
                type="button"
                style={{ ...styles.btnGhost, width: "100%", textAlign: "left", borderRadius: 12, padding: "12px 14px" }}
                onClick={() => openInterventionDetails_Add(pickForId, type)}
              >
                {type}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.65 }}>* Selecting a type will open the form.</div>
        </div>
      </PopupModal>

      <PopupModal
        open={Boolean(detailFor)}
        title={detailFor?.mode === "edit" ? "View / Edit S&T Intervention" : "Add S&T Intervention Details"}
        onClose={() => { setDetailFor(null); resetDetailForm(); }}
      >
        <div style={{ display: "grid", gap: 12 }}>
          <InterventionFields />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, borderTop: "1px solid #e2e8f0", paddingTop: 12 }}>
            <button type="button" style={styles.btnGhost} onClick={() => { setDetailFor(null); resetDetailForm(); }}>
              Cancel
            </button>
            <button type="button" style={styles.btnDark} onClick={saveInterventionDetails}>
              {detailFor?.mode === "edit" ? "Update Intervention" : "Save Intervention"}
            </button>
          </div>
        </div>
      </PopupModal>

      <PopupModal
        open={printModal.open}
        title={printModal.scope === "row" ? "Print (This Row)" : "Print (Filtered Rows)"}
        onClose={() => setPrintModal((p) => ({ ...p, open: false }))}
      >
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8 }}>
            {printModal.scope === "row"
              ? `Beneficiary: ${getRecordById(printModal.recordId)?.beneficiaryName || "—"}`
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

      <PopupModal
        open={exportModal.open}
        title={exportModal.scope === "row" ? "Export (This Row)" : "Export (Filtered Rows)"}
        onClose={() => setExportModal((p) => ({ ...p, open: false }))}
      >
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8 }}>
            {exportModal.scope === "row"
              ? `Beneficiary: ${getRecordById(exportModal.recordId)?.beneficiaryName || "—"}`
              : `Records: ${filteredRecords.length}`}
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

