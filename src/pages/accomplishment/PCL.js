import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const API = `${API_BASE}/packaging-labeling`;


const parseMaybeJSON = (value, fallback = null) => {
  if (value == null || value === "") return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};
const parsePackagingCustomFields = (value) => {
  if (!value) return {};
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value || "{}");
  } catch {
    return {};
  }
};

const normalizePackagingRecordFromApi = (row) => ({
  ...row,
  projectId: row?.projectId ?? row?.project_id ?? null,
  interventionId: row?.interventionId ?? row?.intervention_id ?? null,
  addressMeta: parseMaybeJSON(row?.addressMeta ?? row?.address_meta ?? row?.address_meta_json, null),
  photos: Array.isArray(row?.photos) ? row.photos : parseMaybeJSON(row?.photos, []),
  products: Array.isArray(row?.products) ? row.products : parseMaybeJSON(row?.products, []),
  nameOfStaff: row?.nameOfStaff ?? row?.name_of_staff ?? row?.staffName ?? row?.staff_name ?? "",
  customFields: parsePackagingCustomFields(row?.customFields ?? row?.custom_fields),
  custom_fields: parsePackagingCustomFields(row?.custom_fields ?? row?.customFields),
});

const sortPackagingRecordsByLinkedIntervention = (list) => {
  return [...(Array.isArray(list) ? list : [])].sort((a, b) => {
    const aProject = Number(a?.projectId ?? 0);
    const bProject = Number(b?.projectId ?? 0);
    if (aProject !== bProject) return aProject - bProject;

    const aIntervention = Number(a?.interventionId ?? 0);
    const bIntervention = Number(b?.interventionId ?? 0);
    if (aIntervention !== bIntervention) return aIntervention - bIntervention;

    const aDate = new Date(a?.dateCompleted || 0).getTime() || 0;
    const bDate = new Date(b?.dateCompleted || 0).getTime() || 0;
    if (aDate !== bDate) return aDate - bDate;

    return Number(a?.id ?? 0) - Number(b?.id ?? 0);
  });
};

export default function PackagingAndLabeling() {
  const fontFamily =
    '"Poppins", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"';

  const UI_LAYERS = {
    toolbar: 900,
    modalBackdrop: 2000,
    modalContent: 2001,
    viewBackdrop: 2500,
    viewContent: 2501,
    nestedBackdrop: 3200,
    nestedContent: 3201,
    popupBackdrop: 3600,
    popupContent: 3601,
    photoBackdrop: 4000,
    photoContent: 4001,
  };

  const INTERVENTION_OPTIONS = [
    "Label Design",
    "Packaging Execution",
    "Packaging Materials",
  ];

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
    const foundKey = Object.keys(data || {}).find(
      (k) => normalizeKey(k) === target
    );
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

  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ""));
      r.onerror = reject;
      r.readAsDataURL(file);
    });

  const photoCount = (obj) =>
    Array.isArray(obj?.photos) ? obj.photos.length : 0;

  const openLinkMaybe = (text) => {
    const t = String(text || "").trim();
    if (!t) return alert("No Means of Verification saved.");
    const match = t.match(/https?:\/\/[^\s]+/i);
    const url = match ? match[0] : null;
    if (!url) return alert("No URL found in Means of Verification.");
    window.open(url, "_blank", "noopener,noreferrer");
  };


  const parseCoordinateInput = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return null;
    const match = raw.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
    if (!match) return null;
    const lat = Number(match[1]);
    const lng = Number(match[2]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
  };

  const reverseGeocodeAddress = async (lat, lng) => {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("Reverse geocoding failed");
      const data = await res.json();
      const a = data?.address || {};
      const barangay = a.village || a.suburb || a.hamlet || a.neighbourhood || a.quarter || "";
      const municipality = a.city || a.town || a.municipality || a.county || "";
      const province = a.state || "Pangasinan";
      const parts = [barangay, municipality, province].filter(Boolean);
      return {
        barangay,
        municipality,
        province,
        text: parts.length ? parts.join(", ") : String(data?.display_name || ""),
      };
    } catch {
      return { barangay: "", municipality: "", province: "", text: "" };
    }
  };

  const composeVenueAddress = (venue, addressText) => {
    const v = String(venue || "").trim();
    const a = String(addressText || "").trim();
    return [v, a].filter(Boolean).join(", ");
  };

  // ===== Export helpers (CSV / Excel) =====
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

  const flattenProducts = (r) =>
    Array.isArray(r?.products) && r.products.length
      ? r.products
        .map((p) => String(p?.productName || "").trim())
        .filter(Boolean)
        .join(" | ")
      : "";

  const safeFilePart = (s) =>
    String(s || "")
      .trim()
      .replace(/[^\w-]+/g, "_")
      .slice(0, 40);

  const exportRecordsCSV = (rows, filename = "PackagingAndLabeling.csv") => {
    const headers = [
      "NO",
      "PROVINCE",
      "NAME OF PRODUCT",
      "TYPE OF INTERVENTION",
      "SIZE/VARIANT/PACKAGING TYPE",
      "NO. OF PACKAGING MATERIALS PROVIDED",
      "DATE COMPLETED/EXECUTED",
      "CUSTOMER NAME",
      "SEX",
      "FIRM/INSTITUTION",
      "ADDRESS / VENUE",
      "MUNICIPALITY",
      "BARANGAY",
      "LAT",
      "LNG",
      "MEANS OF VERIFICATION",
      "NAME OF STAFF",
      "REMARKS",
      "PHOTO COUNT",
      "QUARTER",
    ];

    const lines = [
      headers.join(","),
      ...(rows || []).map((r, i) => {
        const muni = r?.addressMeta?.municipality || "";
        const brgy = r?.addressMeta?.barangay || "";
        const lat = Number.isFinite(r?.addressMeta?.lat)
          ? r.addressMeta.lat
          : "";
        const lng = Number.isFinite(r?.addressMeta?.lng)
          ? r.addressMeta.lng
          : "";

        return [
          i + 1,
          r?.province || "Pangasinan",
          flattenProducts(r),
          r?.typeOfIntervention || "",
          r?.sizeVariant || "",
          r?.packagingMaterialsProvided || "",
          r?.dateCompleted || "",
          r?.customerName || "",
          r?.sex || "",
          r?.firmName || "",
          r?.address || "",
          muni,
          brgy,
          lat,
          lng,
          r?.meansOfVerification || "",
          r?.nameOfStaff || "",
          r?.remarks || "",
          Array.isArray(r?.photos) ? r.photos.length : 0,
          r?.quarter ? `${String(r.quarter)}Q` : "",
        ]
          .map(csvEscape)
          .join(",");
      }),
    ];

    const out = filename.endsWith(".csv") ? filename : `${filename}.csv`;
    downloadBlob(
      new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" }),
      out
    );
  };

  const exportRecordsExcel = (rows, filename = "PackagingAndLabeling.xlsx") => {
    const data = (rows || []).map((r, i) => ({
      NO: i + 1,
      PROVINCE: r?.province || "Pangasinan",
      "NAME OF PRODUCT": flattenProducts(r),
      "TYPE OF INTERVENTION": r?.typeOfIntervention || "",
      "SIZE/VARIANT/PACKAGING TYPE": r?.sizeVariant || "",
      "NO. OF PACKAGING MATERIALS PROVIDED":
        r?.packagingMaterialsProvided || "",
      "DATE COMPLETED/EXECUTED": r?.dateCompleted || "",
      "CUSTOMER NAME": r?.customerName || "",
      SEX: r?.sex || "",
      "FIRM/INSTITUTION": r?.firmName || "",
      "ADDRESS / VENUE": r?.address || "",
      MUNICIPALITY: r?.addressMeta?.municipality || "",
      BARANGAY: r?.addressMeta?.barangay || "",
      LAT: Number.isFinite(r?.addressMeta?.lat) ? r.addressMeta.lat : "",
      LNG: Number.isFinite(r?.addressMeta?.lng) ? r.addressMeta.lng : "",
      "MEANS OF VERIFICATION": r?.meansOfVerification || "",
      "NAME OF STAFF": r?.nameOfStaff || "",
      REMARKS: r?.remarks || "",
      "PHOTO COUNT": Array.isArray(r?.photos) ? r.photos.length : 0,
      QUARTER: r?.quarter ? `${String(r.quarter)}Q` : "",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PackagingLabeling");

    const arr = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const out = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;

    downloadBlob(
      new Blob([arr], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      out
    );
  };



  // ===== Export helpers (PDF / DOCX using templates) =====
  // ===== Export helpers (PDF / DOCX using templates) =====

  const exportRecordsPDF = async (rows, options) => {
    // ✅ Auto-download PDF (no print dialog), using jsPDF + autotable (reliable in CRA)
    const {
      template = "FORM",
      preset = "a4",
      orientation = "landscape",
      customSize = { width: 8.5, height: 13 },
      filename = "PackagingAndLabeling.pdf",
      titleLabel = "Packaging and Labeling Export",
    } = options || {};

    const mmFromIn = (inch) => Number(inch) * 25.4;

    let format = "a4";
    if (preset === "letter") format = "letter";
    else if (preset === "legal") format = "legal";
    else if (preset === "custom") {
      const w = Number(customSize?.width) || 8.5;
      const h = Number(customSize?.height) || 13;
      const wmm = mmFromIn(w);
      const hmm = mmFromIn(h);
      format = [wmm, hmm]; // jsPDF accepts custom size array in the same unit
    }

    const doc = new jsPDF({
      orientation: orientation === "portrait" ? "p" : "l",
      unit: "mm",
      format,
    });

    const safeName = String(filename || "PackagingAndLabeling.pdf");
    const outName = safeName.toLowerCase().endsWith(".pdf") ? safeName : `${safeName}.pdf`;

    const hasMany = Array.isArray(rows) && rows.length > 1;

    // Helper: dataset table (like Excel export)
    const buildDatasetTable = (rowsToUse) => {
      const head = [[
        "NO",
        "PROVINCE",
        "NAME OF PRODUCT",
        "TYPE OF INTERVENTION",
        "SIZE/VARIANT/PACKAGING TYPE",
        "NO. OF PACKAGING MATERIALS PROVIDED",
        "DATE COMPLETED/EXECUTED",
        "CUSTOMER NAME",
        "SEX",
        "FIRM/INSTITUTION",
        "ADDRESS / VENUE",
        "MUNICIPALITY",
        "BARANGAY",
        "LAT",
        "LNG",
        "MEANS OF VERIFICATION",
        "NAME OF STAFF",
        "REMARKS",
        "PHOTO COUNT",
        "QUARTER",
      ]];

      const body = (rowsToUse || []).map((r, i) => {
        const muni = r?.addressMeta?.municipality || "";
        const brgy = r?.addressMeta?.barangay || "";
        const lat = Number.isFinite(r?.addressMeta?.lat) ? r.addressMeta.lat : "";
        const lng = Number.isFinite(r?.addressMeta?.lng) ? r.addressMeta.lng : "";

        return [
          i + 1,
          r?.province || "Pangasinan",
          flattenProducts(r),
          r?.typeOfIntervention || "",
          r?.sizeVariant || "",
          r?.packagingMaterialsProvided || "",
          r?.dateCompleted || "",
          r?.customerName || "",
          r?.sex || "",
          r?.firmName || "",
          r?.address || "",
          muni,
          brgy,
          lat,
          lng,
          r?.meansOfVerification || "",
          r?.nameOfStaff || "",
          r?.remarks || "",
          Array.isArray(r?.photos) ? r.photos.length : 0,
          r?.quarter ? `${String(r.quarter)}Q` : "",
        ];
      });

      doc.setFontSize(14);
      doc.text(String(titleLabel || "Packaging and Labeling Export"), 10, 12);
      doc.setFontSize(9);
      doc.text(`Rows: ${body.length}`, 10, 18);

      autoTable(doc, {
        head,
        body,
        startY: 22,
        styles: { fontSize: 7, cellPadding: 1.5, overflow: "linebreak" },
        headStyles: { fontSize: 7 },
        columnStyles: {
          0: { cellWidth: 8 },
          1: { cellWidth: 18 },
          2: { cellWidth: 26 },
          3: { cellWidth: 20 },
          4: { cellWidth: 28 },
          5: { cellWidth: 18 },
          6: { cellWidth: 18 },
          7: { cellWidth: 22 },
          8: { cellWidth: 10 },
          9: { cellWidth: 24 },
          10: { cellWidth: 26 },
          11: { cellWidth: 18 },
          12: { cellWidth: 18 },
          13: { cellWidth: 12 },
          14: { cellWidth: 12 },
          15: { cellWidth: 30 },
          16: { cellWidth: 22 },
          17: { cellWidth: 12 },
          18: { cellWidth: 12 },
        },
        didDrawPage: (data) => {
          const pageCount = doc.getNumberOfPages();
          doc.setFontSize(8);
          doc.text(`Page ${data.pageNumber} / ${pageCount}`, doc.internal.pageSize.getWidth() - 30, doc.internal.pageSize.getHeight() - 6);
        },
      });
    };

    // Helper: key-value sheet per record (FORM/ISO/etc)
    const buildKeyValueRecord = (r, recordIndex) => {
      const coords =
        Number.isFinite(r?.addressMeta?.lat) && Number.isFinite(r?.addressMeta?.lng)
          ? `${r.addressMeta.lat}, ${r.addressMeta.lng}`
          : "—";

      const pairsBase = [
        ["Quarter", r?.quarter ? `${String(r.quarter)}Q` : "—"],
        ["Province", r?.province || "Pangasinan"],
        ["Date Completed/Executed", r?.dateCompleted || "—"],
        ["Type of Intervention", r?.typeOfIntervention || "—"],
        ["Size/Variant", r?.sizeVariant || "—"],
        ["No. of Packaging Materials Provided", r?.packagingMaterialsProvided || "—"],
        ["Customer Name", r?.customerName || "—"],
        ["Sex", r?.sex || "—"],
        ["Firm/Institution", r?.firmName || "—"],
        ["Address / Venue", r?.address || "—"],
        ["Coordinates", coords],
        ["Products", flattenProducts(r) || "—"],
        ["Means of Verification", r?.meansOfVerification || "—"],
        ["Name of Staff", r?.nameOfStaff || "—"],
        ["Remarks", r?.remarks || "—"],
        ["Photo Count", Array.isArray(r?.photos) ? r.photos.length : 0],
      ];

      const isoExtra = [
        ["Design no", (Array.isArray(r?.products) && r.products[0]?.productName) ? r.products[0].productName : "—"],
        ["Project no", ""],
        ["Team leader", ""],
        ["Design change approved", "YES / NO"],
        ["Designation", ""],
        ["Signature", ""],
      ];

      const pairs = template === "ISO" ? [...pairsBase, ...isoExtra] : pairsBase;

      doc.setFontSize(14);
      doc.text(`${titleLabel || "Record"} — ${recordIndex + 1}`, 10, 12);
      doc.setFontSize(10);
      doc.text(`Template: ${template}`, 10, 18);

      autoTable(doc, {
        head: [["Field", "Value"]],
        body: pairs.map(([k, v]) => [String(k), String(v ?? "")]),
        startY: 22,
        styles: { fontSize: 9, cellPadding: 2, overflow: "linebreak" },
        columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: "auto" } },
      });
    };

    // Decision:
    // - If exporting MANY rows: always export as dataset table (like Excel) — this matches what you asked ("tables").
    // - If exporting ONE row: use the selected template (including ISO) as a key-value record.
    if (hasMany) {
      buildDatasetTable(rows);
    } else {
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
        children: [new TextRun({ text: "Packaging and Labeling Export", bold: true, size: 32 })],
      })
    );

    const addSpacer = () => children.push(new Paragraph({ text: "" }));

    const makeTable = (pairs) => {
      const rows = pairs.map(([k, v]) =>
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
        rows,
      });
    };

    const addISO = (r) => {
      const firstProduct =
        Array.isArray(r?.products) && r.products.length ? r.products[0].productName : "";

      children.push(new Paragraph({ children: [new TextRun({ text: "ISO Design Change Record", bold: true, size: 28 })] }));
      addSpacer();

      children.push(
        makeTable([
          ["Customer name", r?.customerName || "—"],
          ["Design no", firstProduct || "—"],
          ["Date", r?.dateCompleted || "—"],
          ["Project no", ""],
          ["Team leader", ""],
          ["Details of change required", r?.sizeVariant || "—"],
          ["Requirements", r?.meansOfVerification || "—"],
          ["Remarks", r?.remarks || "—"],
        ])
      );
    };

    rows.forEach((r, idx) => {
      if (idx > 0) children.push(new Paragraph({ pageBreakBefore: true }));

      if (template === "ISO") {
        addISO(r);
        return;
      }

      // Generic record export (FORM/TABLE/COMPACT/LABEL)
      children.push(
        new Paragraph({
          children: [new TextRun({ text: `Record ${(effectivePage - 1) * rowsPerPage + idx + 1}`, bold: true, size: 26 })],
        })
      );
      addSpacer();

      const coords =
        Number.isFinite(r?.addressMeta?.lat) && Number.isFinite(r?.addressMeta?.lng)
          ? `${r.addressMeta.lat}, ${r.addressMeta.lng}`
          : "—";

      const products =
        Array.isArray(r?.products) && r.products.length
          ? r.products.map((p) => p.productName).filter(Boolean).join(", ")
          : "—";

      children.push(
        makeTable([
          ["Quarter", r?.quarter ? `${String(r.quarter)}Q` : "—"],
          ["Province", r?.province || "Pangasinan"],
          ["Date Completed/Executed", r?.dateCompleted || "—"],
          ["Type of Intervention", r?.typeOfIntervention || "—"],
          ["Size/Variant", r?.sizeVariant || "—"],
          ["No. of Packaging Materials Provided", r?.packagingMaterialsProvided || "—"],
          ["Customer Name", r?.customerName || "—"],
          ["Sex", r?.sex || "—"],
          ["Firm/Institution", r?.firmName || "—"],
          ["Address / Venue", r?.address || "—"],
          ["Coordinates", coords],
          ["Products", products],
          ["Means of Verification", r?.meansOfVerification || "—"],
          ["Name of Staff", r?.nameOfStaff || "—"],
          ["Remarks", r?.remarks || "—"],
          ["Photo Count", Array.isArray(r?.photos) ? r.photos.length : 0],
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

  // ===== State =====
  const [records, setRecords] = useState([]);
  const [packagingCustomFields, setPackagingCustomFields] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [serverTotalRows, setServerTotalRows] = useState(0);
  const [serverTotalPages, setServerTotalPages] = useState(1);

  const [showAdd, setShowAdd] = useState(false);
  const [editRecordId, setEditRecordId] = useState(null);

  // ✅ View modal
  const [viewRecordId, setViewRecordId] = useState(null);
  const [viewMode, setViewMode] = useState("list");

  // ✅ Photo viewer
  const [photoViewer, setPhotoViewer] = useState(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  const [form, setForm] = useState({
    quarter: "",
    province: "Pangasinan",
    dateCompleted: "",
    typeOfIntervention: "Label Design",
    sizeVariant: "",
    packagingMaterialsProvided: "",
    customerName: "",
    sex: "",
    firmName: "",
    address: "",
    addressMeta: null,
    meansOfVerification: "",
    nameOfStaff: "",
    remarks: "",
    customFields: {},
    photos: [],
  });

  const photoInputRef = useRef(null);

  const [addressFlowOpen, setAddressFlowOpen] = useState(false);
  const [addressViewForRecordId, setAddressViewForRecordId] = useState(null);

  const [selectedProductByRecord, setSelectedProductByRecord] = useState({});
  const [productModalFor, setProductModalFor] = useState(null);
  const [productForm, setProductForm] = useState({ productName: "" });

  // ✅ Filter / Sort state
  const [filterYear, setFilterYear] = useState("");
  const [filterDistrict, setFilterDistrict] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterMunicipality, setFilterMunicipality] = useState("");
  const [filterQuarter, setFilterQuarter] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");

  // ✅ Print & Export Modals
  const [printModal, setPrintModal] = useState({
    open: false,
    scope: "bulk", // bulk | row
    recordId: null,
    layout: "FORM", // FORM | TABLE | COMPACT | LABEL | ISO
    preset: "a4", // a4 | letter | legal | custom
    orientation: "landscape", // landscape | portrait
    customSize: { width: 8.5, height: 13 },
  });

  const [exportModal, setExportModal] = useState({
    open: false,
    scope: "bulk", // bulk | row
    recordId: null,
    format: "excel", // excel | csv | pdf | docx
    template: "FORM", // FORM | TABLE | COMPACT | LABEL | ISO
    preset: "a4", // a4 | letter | legal | custom (PDF)
    orientation: "landscape", // landscape | portrait (PDF/DOCX)
    customSize: { width: 8.5, height: 13 }, // PDF custom
  });

  // ===== MAP =====
  const [outlineGeo, setOutlineGeo] = useState(null);
  const [municipalGeo, setMunicipalGeo] = useState(null);
  const [geoError, setGeoError] = useState("");

  const [borderMode, setBorderMode] = useState("municipality");
  const [selectedMunicipality, setSelectedMunicipality] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");

  const fetchRecords = useCallback(async () => {
    try {
      const res = await axios.get(API, {
        params: {
          page: currentPage,
          limit: rowsPerPage,
          search: debouncedSearch.trim(),
          year: filterYear || "ALL",
          district: filterDistrict || "ALL",
          month: filterMonth || "ALL",
          municipality: filterMunicipality || "ALL",
          quarter: filterQuarter || "ALL",
          sort: sortOrder || "newest",
        },
      });

      const payload = res?.data || {};
      const rows = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.rows)
          ? payload.rows
          : Array.isArray(payload)
            ? payload
            : [];

      const normalized = rows.map(normalizePackagingRecordFromApi);
      const sorted = sortPackagingRecordsByLinkedIntervention(normalized);
      setRecords(sorted);
      setServerTotalRows(Number(payload?.total || rows.length || 0));
      setServerTotalPages(Math.max(1, Number(payload?.totalPages || 1)));
    } catch (err) {
      console.error("Failed to fetch packaging and labeling records:", err);
      setRecords([]);
      setServerTotalRows(0);
      setServerTotalPages(1);
    }
  }, [
    currentPage,
    rowsPerPage,
    debouncedSearch,
    filterYear,
    filterDistrict,
    filterMonth,
    filterMunicipality,
    filterQuarter,
    sortOrder,
  ]);


  useEffect(() => {
    let cancelled = false;

    const fixedKeys = new Set([
      "no",
      "actions",
      "quarter",
      "province",
      "nameOfProduct",
      "name_of_product",
      "productName",
      "product_name",
      "typeOfIntervention",
      "type_of_intervention",
      "sizeVariant",
      "size_variant",
      "packagingMaterialsProvided",
      "packaging_materials_provided",
      "dateCompleted",
      "date_completed",
      "dateCompletedExecuted",
      "date_completed_executed",
      "customerName",
      "customer_name",
      "sex",
      "firmName",
      "firm_name",
      "firmInstitution",
      "firm_institution",
      "address",
      "venueAddress",
      "venue_address",
      "addressVenue",
      "address_venue",
      "addressMeta",
      "address_meta",
      "meansOfVerification",
      "means_of_verification",
      "nameOfStaff",
      "name_of_staff",
      "staffName",
      "staff_name",
      "remarks",
      "photoCount",
      "photo_count",
      "photos"
    ]);

    async function loadPackagingCustomFields() {
      try {
        const res = await axios.get(`${API_BASE}/table-management/config`);
        const modules = Array.isArray(res.data) ? res.data : [];

        const mod = modules.find((m) => {
          const name = String(m.moduleName || m.module_name || m.name || "").toLowerCase();
          return name === "packaging & labeling" || name === "packaging and labeling" || name === "packaging labeling";
        });

        const table =
          (mod?.tables || []).find((t) => {
            const name = String(t.tableName || t.table_name || t.name || "").toLowerCase();
            return name === "main" || name === "packaging & labeling" || name === "packaging and labeling";
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

        if (!cancelled) setPackagingCustomFields(finalCustomFields);
      } catch (err) {
        console.error("Failed to load Packaging custom fields:", err);
        if (!cancelled) setPackagingCustomFields([]);
      }
    }

    loadPackagingCustomFields();

    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

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

  const saveRecords = (next) => {
    setRecords(next);
  };



  const nextPhoto = useCallback(() => {
    if (!photoViewer) return;
    const n = photoViewer.photos.length;
    setPhotoIndex((p) => (p + 1) % n);
  }, [photoViewer]);

  const prevPhoto = useCallback(() => {
    if (!photoViewer) return;
    const n = photoViewer.photos.length;
    setPhotoIndex((p) => (p - 1 + n) % n);
  }, [photoViewer]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setShowAdd(false);
        setEditRecordId(null);
        setViewRecordId(null);
        setAddressFlowOpen(false);
        setAddressViewForRecordId(null);
        setProductModalFor(null);
        setPhotoViewer(null);
        setPrintModal((p) => ({ ...p, open: false }));
        setExportModal((p) => ({ ...p, open: false }));
      }
      if (e.key === "ArrowRight" && photoViewer) nextPhoto();
      if (e.key === "ArrowLeft" && photoViewer) prevPhoto();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [photoViewer, nextPhoto, prevPhoto]);

  const resetForm = () => {
    setForm({
      quarter: "",
      province: "Pangasinan",
      dateCompleted: "",
      typeOfIntervention: "Label Design",
      sizeVariant: "",
      packagingMaterialsProvided: "",
      customerName: "",
      sex: "",
      firmName: "",
      address: "",
      addressMeta: null,
      meansOfVerification: "",
      nameOfStaff: "",
      remarks: "",
      customFields: {},
      photos: [],
    });
  };

  const resetProductForm = () => setProductForm({ productName: "" });

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

      if (converted.length === 0) return alert("No valid image files selected.");

      setForm((prev) => ({
        ...prev,
        photos: [...(prev.photos || []), ...converted],
      }));
    } catch {
      alert("Failed to add photos.");
    }
  };

  const removePhotoAt = (idx) => {
    setForm((prev) => ({
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
  // ===== Filtered/sorted dataset =====
  const yearOptions = useMemo(
    () => Array.from({ length: 2050 - 1970 + 1 }, (_, index) => 2050 - index),
    []
  );

  const toolbarDistrictOptions = useMemo(
    () => PANGASINAN_DISTRICTS.map((d) => d.id),
    []
  );

  const toolbarMunicipalityOptions = useMemo(
    () => ["", ...PANGASINAN_LGUS],
    []
  );

  const getDistrictFromMunicipality = useCallback((municipalityName) => {
    const target = String(municipalityName || "").trim().toLowerCase();
    if (!target) return "";

    const found = PANGASINAN_DISTRICTS.find((district) =>
      (district.municipalities || []).some(
        (municipality) => String(municipality || "").trim().toLowerCase() === target
      )
    );

    return found?.id || "";
  }, []);

  const filteredRecords = useMemo(() => {
    return Array.isArray(records) ? records : [];
  }, [records]);

  const getRecordById = (id) => records.find((x) => String(x.id) === String(id)) || null;

  const PAGE_NUMBER_WINDOW = 10;
  const effectivePage = currentPage;
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

  const paginationLogoOSlots = Array.from(
    { length: PAGE_NUMBER_WINDOW },
    (_, i) => i
  );


  // ===== PRINT (single + bulk) =====
  const PRINT_LAYOUT_LABEL = {
    FORM: "Form-Based Record Sheet",
    TABLE: "Table Sheet",
    COMPACT: "Compact Sheet",
    LABEL: "Label / Custom Template",
    ISO: "ISO Design Change Record",
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

  const buildIsoLayoutHtml = (record) => {
    const firstProduct =
      Array.isArray(record?.products) && record.products.length
        ? record.products[0].productName
        : "";
    const details = [
      record?.typeOfIntervention ? `Intervention: ${record.typeOfIntervention}` : "",
      record?.sizeVariant ? `Variant/Type: ${record.sizeVariant}` : "",
      record?.packagingMaterialsProvided
        ? `Materials Provided: ${record.packagingMaterialsProvided}`
        : "",
      record?.address ? `Address: ${record.address}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const req = record?.meansOfVerification || "";
    const remarks = record?.remarks || "";

    return `
      <div class="isoWrap">
        <div class="isoTitle">Design Change record</div>

        <table class="isoTable">
          <tr>
            <th class="w30">Customer name :</th>
            <td class="w70">${escapeHtml(record?.customerName || "")}</td>
          </tr>
          <tr>
            <th>Design no</th>
            <td>${escapeHtml(firstProduct || "")}</td>
          </tr>
          <tr>
            <th>Date</th>
            <td>${escapeHtml(record?.dateCompleted || "")}</td>
          </tr>
          <tr>
            <th>Project no</th>
            <td>&nbsp;</td>
          </tr>
          <tr>
            <th>Team leader</th>
            <td>&nbsp;</td>
          </tr>
        </table>

        <div class="isoRow">
          <div class="isoLabel">Design change Request From :</div>
          <div class="isoChecks">
            <span>☐ Marketing</span>
            <span>☐ Production</span>
            <span>☐ Servicing</span>
            <span>☐ Design</span>
            <span>☐ Inspection</span>
          </div>
        </div>

        <div class="isoBlock">
          <div class="isoBlockLabel">Details of change required :</div>
          <div class="isoBlockBox">${escapeHtml(details || "")}</div>
        </div>

        <div class="isoBlock">
          <div class="isoBlockLabel">Requirements :</div>
          <div class="isoBlockBox">${escapeHtml(req || "")}</div>
        </div>

        <div class="isoBlock">
          <div class="isoBlockLabel">New Design Input:</div>
          <div class="isoBlockBox">&nbsp;</div>
        </div>

        <div class="isoBlock">
          <div class="isoBlockLabel">New Design Output:</div>
          <div class="isoBlockBox">&nbsp;</div>
        </div>

        <div class="isoBlock">
          <div class="isoBlockLabel">New Design Verification:</div>
          <div class="isoBlockBox">&nbsp;</div>
        </div>

        <div class="isoBlock">
          <div class="isoBlockLabel">New Design validation:</div>
          <div class="isoBlockBox">&nbsp;</div>
        </div>

        <div class="isoBlock">
          <div class="isoBlockLabel">Related Design Changes:</div>
          <div class="isoBlockBox">&nbsp;</div>
        </div>

        <div class="isoBlock">
          <div class="isoBlockLabel">Related Document Changes:</div>
          <div class="isoBlockBox">&nbsp;</div>
        </div>

        <div class="isoBlock">
          <div class="isoBlockLabel">Additional Requirements (if any) :</div>
          <div class="isoBlockBox">&nbsp;</div>
        </div>

        <div class="isoBlock">
          <div class="isoBlockLabel">Development Reference :</div>
          <div class="isoChecks">
            <span>☐ Letter</span>
            <span>☐ Discussions with ________</span>
            <span>☐ Sample</span>
            <span>☐ Drawing</span>
            <span>☐ Product Catalog</span>
          </div>
        </div>

        <div class="isoBlock">
          <div class="isoBlockLabel">About Application :</div>
          <div class="isoBlockBox">&nbsp;</div>
        </div>

        <div class="isoBlock">
          <div class="isoBlockLabel">Application Description:</div>
          <div class="isoBlockBox">&nbsp;</div>
        </div>

        <div class="isoBottomGrid">
          <div class="isoBottomLeft">
            <div class="isoBlockLabel">Remarks :</div>
            <div class="isoBottomLeftBox">${escapeHtml(remarks || "")}</div>
          </div>

          <div class="isoBottomRight">
            <div class="isoApprove">
              <div class="isoApproveLabel">Design change approved</div>
              <div class="isoApproveYN">YES / NO</div>
            </div>
            <div class="isoSigRow">
              <div class="isoSigLabel">Designation:</div>
              <div class="isoSigLine">&nbsp;</div>
            </div>
            <div class="isoSigRow">
              <div class="isoSigLabel">Signature :</div>
              <div class="isoSigLine">&nbsp;</div>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  const buildRecordSheetInner = (record, layoutKey, presetLabel) => {
    const products = Array.isArray(record.products) ? record.products : [];
    const photos = Array.isArray(record.photos) ? record.photos : [];

    const productInline = products.length
      ? products.map((p) => escapeHtml(p.productName || "—")).join(", ")
      : "—";

    const productList = products.length
      ? `<ol>${products
        .map((p) => `<li>${escapeHtml(p.productName || "—")}</li>`)
        .join("")}</ol>`
      : `<div class="muted">—</div>`;

    const photoGrid = photos.length
      ? `<div class="photos">${photos
        .map(
          (p) => `
              <div class="photo-card">
                <img src="${p.dataUrl}" alt="${escapeHtml(p.name || "photo")}" />
                <div class="photo-name">${escapeHtml(p.name || "Photo")}</div>
              </div>
            `
        )
        .join("")}</div>`
      : `<div class="muted">—</div>`;

    const coords =
      Number.isFinite(record?.addressMeta?.lat) &&
        Number.isFinite(record?.addressMeta?.lng)
        ? `${record.addressMeta.lat}, ${record.addressMeta.lng}`
        : "—";

    const header = `
      <div class="header">
        <div>
          <h1>Packaging and Labeling Record</h1>
          <div class="sub">${escapeHtml(PRINT_LAYOUT_LABEL[layoutKey] || "Print")}</div>
        </div>
        <div class="sub">${escapeHtml(presetLabel)}</div>
      </div>
    `;

    const commonFieldsHtml = `
      <div class="grid">
        <div class="field">
          <div class="label">Quarter</div>
          <div class="value">${escapeHtml(
      String(record.quarter || "") ? `${record.quarter}Q` : "—"
    )}</div>
        </div>
        <div class="field">
          <div class="label">Province</div>
          <div class="value">${escapeHtml(record.province || "Pangasinan")}</div>
        </div>

        <div class="field">
          <div class="label">Date Completed / Executed</div>
          <div class="value">${escapeHtml(record.dateCompleted || "—")}</div>
        </div>
        <div class="field">
          <div class="label">Type of Intervention</div>
          <div class="value">${escapeHtml(record.typeOfIntervention || "—")}</div>
        </div>

        <div class="field">
          <div class="label">Size / Variant / Packaging Type</div>
          <div class="value">${escapeHtml(record.sizeVariant || "—")}</div>
        </div>
        <div class="field">
          <div class="label">No. of Packaging Materials Provided</div>
          <div class="value">${escapeHtml(record.packagingMaterialsProvided || "—")}</div>
        </div>

        <div class="field">
          <div class="label">Name of Customer</div>
          <div class="value">${escapeHtml(record.customerName || "—")}</div>
        </div>
        <div class="field">
          <div class="label">Sex</div>
          <div class="value">${escapeHtml(record.sex || "—")}</div>
        </div>

        <div class="field">
          <div class="label">Firm / Institution</div>
          <div class="value">${escapeHtml(record.firmName || "—")}</div>
        </div>
        <div class="field">
          <div class="label">Coordinates</div>
          <div class="value">${escapeHtml(coords)}</div>
        </div>

        <div class="field full">
          <div class="label">Address / Venue</div>
          <div class="value">${escapeHtml(record.address || "—")}</div>
        </div>
        <div class="field full">
          <div class="label">Means of Verification</div>
          <div class="value">${escapeHtml(record.meansOfVerification || "—")}</div>
        </div>
        <div class="field full">
          <div class="label">Name of Staff</div>
          <div class="value">${escapeHtml(record.nameOfStaff || "—")}</div>
        </div>
        <div class="field full">
          <div class="label">Remarks</div>
          <div class="value">${escapeHtml(record.remarks || "—")}</div>
        </div>
      </div>
    `;

    const formLayout = `
      ${commonFieldsHtml}
      <div class="section-title">Products</div>
      <div class="box">${productList}</div>

      <div class="section-title">Attached Photos</div>
      <div class="box">${photoGrid}</div>
    `;

    const tableLayout = `
      <table class="kvTable">
        <tbody>
          <tr><th>Quarter</th><td>${escapeHtml(
      String(record.quarter || "") ? `${record.quarter}Q` : "—"
    )}</td><th>Province</th><td>${escapeHtml(record.province || "Pangasinan")}</td></tr>
          <tr><th>Date Completed</th><td>${escapeHtml(record.dateCompleted || "—")}</td><th>Type of Intervention</th><td>${escapeHtml(record.typeOfIntervention || "—")}</td></tr>
          <tr><th>Size/Variant</th><td>${escapeHtml(record.sizeVariant || "—")}</td><th>Materials Provided</th><td>${escapeHtml(record.packagingMaterialsProvided || "—")}</td></tr>
          <tr><th>Customer</th><td>${escapeHtml(record.customerName || "—")}</td><th>Sex</th><td>${escapeHtml(record.sex || "—")}</td></tr>
          <tr><th>Firm/Institution</th><td>${escapeHtml(record.firmName || "—")}</td><th>Coordinates</th><td>${escapeHtml(coords)}</td></tr>
          <tr><th>Address / Venue</th><td colspan="3">${escapeHtml(record.address || "—")}</td></tr>
          <tr><th>Means of Verification</th><td colspan="3">${escapeHtml(record.meansOfVerification || "—")}</td></tr>
          <tr><th>Name of Staff</th><td colspan="3">${escapeHtml(record.nameOfStaff || "—")}</td></tr>
          <tr><th>Remarks</th><td colspan="3">${escapeHtml(record.remarks || "—")}</td></tr>
        </tbody>
      </table>

      <div class="section-title">Products</div>
      <div class="box">${productList}</div>

      <div class="section-title">Attached Photos</div>
      <div class="box">${photoGrid}</div>
    `;

    const compactLayout = `
      <div class="compact">
        <div><b>Customer:</b> ${escapeHtml(record.customerName || "—")} &nbsp; <b>(${escapeHtml(record.sex || "—")})</b></div>
        <div><b>Firm:</b> ${escapeHtml(record.firmName || "—")}</div>
        <div><b>Date:</b> ${escapeHtml(record.dateCompleted || "—")} &nbsp; <b>Quarter:</b> ${escapeHtml(
      String(record.quarter || "") ? `${record.quarter}Q` : "—"
    )}</div>
        <div><b>Intervention:</b> ${escapeHtml(record.typeOfIntervention || "—")}</div>
        <div><b>Variant/Type:</b> ${escapeHtml(record.sizeVariant || "—")}</div>
        <div><b>Materials Provided:</b> ${escapeHtml(record.packagingMaterialsProvided || "—")}</div>
        <div><b>Address / Venue:</b> ${escapeHtml(record.address || "—")}</div>
        <div><b>Coordinates:</b> ${escapeHtml(coords)}</div>
        <div><b>Products:</b> ${productInline}</div>
        <div><b>MOV:</b> ${escapeHtml(record.meansOfVerification || "—")}</div>
        <div><b>Name of Staff:</b> ${escapeHtml(record.nameOfStaff || "—")}</div>
        <div><b>Photos:</b> ${photos.length}</div>
        ${record.remarks
        ? `<div><b>Remarks:</b> ${escapeHtml(record.remarks)}</div>`
        : ""
      }
      </div>
    `;

    const labelLayout = `
      <div class="labelCard">
        <div class="labelTop">
          <div class="labelTitle">Packaging & Labeling</div>
          <div class="labelPill">${escapeHtml(record.dateCompleted || "—")}</div>
        </div>

        <div class="labelBig">${escapeHtml(products[0]?.productName || "PRODUCT")}</div>
        <div class="labelLine"><b>Customer:</b> ${escapeHtml(record.customerName || "—")}</div>
        <div class="labelLine"><b>Firm:</b> ${escapeHtml(record.firmName || "—")}</div>
        <div class="labelLine"><b>Municipality:</b> ${escapeHtml(record?.addressMeta?.municipality || "—")}</div>
        <div class="labelLine"><b>Barangay:</b> ${escapeHtml(record?.addressMeta?.barangay || "—")}</div>

        <div class="qrRow">
          <div class="qrBox"></div>
          <div class="qrNote">
            <div style="font-weight:800;">Label / Custom Template</div>
            <div style="opacity:.85;">(placeholder layout for future sticker/label printing)</div>
          </div>
        </div>
      </div>
    `;

    const isoLayout = buildIsoLayoutHtml(record);

    const bodyHtml =
      layoutKey === "FORM"
        ? formLayout
        : layoutKey === "TABLE"
          ? tableLayout
          : layoutKey === "COMPACT"
            ? compactLayout
            : layoutKey === "LABEL"
              ? labelLayout
              : isoLayout;

    return `
      <div class="sheet">
        ${header}
        <div class="body">
          ${bodyHtml}
          <div class="footer-note">Generated from Packaging and Labeling page</div>
        </div>
      </div>
    `;
  };

  const buildPrintDocument = (recordsToPrint, options) => {
    const { preset, orientation, customSize, layoutKey, titleLabel } = options;

    const pageRule = getPageRule(preset, orientation, customSize);

    const presetLabel =
      preset === "custom"
        ? `Custom (${customSize?.width}in × ${customSize?.height}in) — ${orientation}`
        : `${String(preset).toUpperCase()} — ${orientation}`;

    const sheets = (recordsToPrint || [])
      .map((r, idx) => {
        const html = buildRecordSheetInner(r, layoutKey, titleLabel || presetLabel);
        const breaker = idx === recordsToPrint.length - 1 ? "" : `<div class="pageBreak"></div>`;
        return html + breaker;
      })
      .join("");

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Packaging and Labeling Print</title>
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

    .section-title { margin: 14px 0 8px; font-size: 13px; font-weight: 800; color: #0f172a; }
    .box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; }
    .box ol { margin: 0; padding-left: 18px; }
    .box li { margin: 0 0 6px; font-size: 13px; font-weight: 600; }
    .muted { font-size: 13px; color: #64748b; font-weight: 600; }

    .photos { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; }
    .photo-card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px; background: #fff; }
    .photo-card img { width: 100%; height: 160px; object-fit: cover; border-radius: 6px; border: 1px solid #e2e8f0; display: block; }
    .photo-name { margin-top: 6px; font-size: 11px; font-weight: 700; word-break: break-word; }

    .kvTable { width: 100%; border-collapse: collapse; }
    .kvTable th, .kvTable td { border: 1px solid #cbd5e1; padding: 8px 10px; font-size: 12px; vertical-align: top; }
    .kvTable th { background: #eef2f6; text-align: left; width: 160px; font-weight: 900; }

    .compact { display: grid; gap: 6px; font-size: 12px; font-weight: 600; }
    .compact b { font-weight: 900; }

    .labelCard{ border: 2px dashed #0b4ea2; border-radius: 14px; padding: 14px; background: #f8fafc; display: grid; gap: 10px; }
    .labelTop{ display:flex; justify-content:space-between; align-items:center; gap:10px; }
    .labelTitle{ font-weight: 900; color:#0b4ea2; letter-spacing:.3px; }
    .labelPill{ border:1px solid #cbd5e1; background:#fff; padding:6px 10px; border-radius:999px; font-size:12px; font-weight:900; }
    .labelBig{ font-size: 22px; font-weight: 900; line-height:1.1; }
    .labelLine{ font-size:12px; font-weight:700; }
    .qrRow{ display:flex; gap:12px; align-items:center; margin-top:6px; }
    .qrBox{ width:80px; height:80px; border:2px solid #334155; border-radius:10px; background:#fff; }
    .qrNote{ font-size:12px; font-weight:700; color:#334155; }

    .footer-note { margin-top: 12px; font-size: 11px; color: #64748b; text-align: right; font-weight: 700; }

    /* ISO layout */
    .isoWrap { border: 2px solid #111827; padding: 10px; }
    .isoTitle { text-align:center; font-weight: 900; font-size: 18px; padding: 6px 0 10px; border-bottom: 2px solid #111827; margin-bottom: 10px; font-family: "Times New Roman", serif; }
    .isoTable { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    .isoTable th, .isoTable td { border: 1px solid #111827; padding: 6px 8px; font-size: 12px; }
    .isoTable th { text-align: left; width: 220px; font-weight: 900; }
    .isoRow { display:flex; gap: 10px; align-items:center; border: 1px solid #111827; padding: 6px 8px; margin-bottom: 10px; }
    .isoLabel { font-weight: 900; font-size: 12px; }
    .isoChecks { display:flex; gap: 14px; flex-wrap: wrap; font-size: 12px; font-weight: 700; }
    .isoBlock { border: 1px solid #111827; margin-bottom: 10px; }
    .isoBlockLabel { font-weight: 900; padding: 6px 8px; border-bottom: 1px solid #111827; font-size: 12px; }
    .isoBlockBox { min-height: 42px; padding: 8px; font-size: 12px; white-space: pre-wrap; }
    .isoBottomGrid { display:grid; grid-template-columns: 1fr 0.9fr; gap: 10px; margin-top: 10px; }
    .isoBottomLeft { border: 1px solid #111827; }
    .isoBottomLeftBox { min-height: 120px; padding: 8px; font-size: 12px; white-space: pre-wrap; }
    .isoBottomRight { border: 1px solid #111827; display:grid; grid-template-rows: 1fr auto auto; }
    .isoApprove { border-bottom: 1px solid #111827; padding: 10px; display:flex; justify-content:space-between; align-items:center; gap:10px; }
    .isoApproveLabel { font-weight: 900; }
    .isoApproveYN { font-weight: 900; }
    .isoSigRow { border-top: 1px solid #111827; padding: 10px; display:flex; gap:10px; }
    .isoSigLabel { font-weight: 900; width: 120px; }
    .isoSigLine { flex:1; border-bottom: 1px solid #111827; min-height: 18px; }

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

    // Try open print dialog (some browsers may block; HTML also calls print on load)
    try {
      win.onload = () => {
        setTimeout(() => {
          try { win.print(); } catch { }
        }, 250);
      };
    } catch { }
  };

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
    const scope = printModal.scope;
    const layoutKey = printModal.layout;
    const preset = printModal.preset;
    const orientation = printModal.orientation;
    const customSize = printModal.customSize;

    const rows =
      scope === "row"
        ? [getRecordById(printModal.recordId)].filter(Boolean)
        : filteredRecords;

    if (!rows.length) return alert("No rows to print.");

    const titleLabel =
      scope === "row"
        ? `${PRINT_LAYOUT_LABEL[layoutKey] || "Print"} — ${rows[0]?.customerName || "Record"}`
        : `${PRINT_LAYOUT_LABEL[layoutKey] || "Print"} — Filtered (${rows.length} records)`;

    doPrint(rows, { layoutKey, preset, orientation, customSize, titleLabel });
    setPrintModal((p) => ({ ...p, open: false }));
  };

  // ===== Export popup =====
  const openExportPopupRow = (recordId) => {
    setExportModal({
      open: true,
      scope: "row",
      recordId,
      format: "excel",
      template: "FORM",
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
      template: "FORM",
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
        ? `PackagingAndLabeling_${safeFilePart(rows[0]?.customerName)}_${safeFilePart(rows[0]?.dateCompleted)}`
        : `PackagingAndLabeling_Filtered_${rows.length}_rows`;

    if (exportModal.format === "csv") {
      exportRecordsCSV(rows, `${baseName}.csv`);
    } else if (exportModal.format === "excel") {
      exportRecordsExcel(rows, `${baseName}.xlsx`);
    } else if (exportModal.format === "pdf") {
      await exportRecordsPDF(rows, {
        layoutKey: exportModal.template,
        preset: exportModal.preset,
        orientation: exportModal.orientation,
        customSize: exportModal.customSize,
        titleLabel:
          exportModal.scope === "row"
            ? `Export PDF — ${rows[0]?.customerName || "Record"}`
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


  const cleanPackagingCustomLabel = (value) =>
    String(value || "")
      .replace(/^#+/, "")
      .replace(/_/g, " ")
      .trim()
      .replace(/\b\w/g, (m) => m.toUpperCase());

  const getPackagingCustomPairs = (record = {}) => {
    const values = parsePackagingCustomFields(record?.customFields || record?.custom_fields);

    return (packagingCustomFields || []).map((field) => {
      const key = field.fieldKey || field.field_key || field.key;
      const rawLabel = field.fieldLabel || field.field_label || field.label || key;
      const value = values?.[key];

      return {
        key,
        label: cleanPackagingCustomLabel(rawLabel),
        value: value === null || value === undefined || value === "" ? "—" : String(value),
      };
    });
  };

  const renderPackagingCustomInputs = () => {
    if (!packagingCustomFields.length) return null;

    return (
      <>
        {packagingCustomFields.map((field) => {
          const key = field.fieldKey || field.field_key || field.key;
          const rawLabel = field.fieldLabel || field.field_label || field.label || key;
          const label = cleanPackagingCustomLabel(rawLabel);
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

  const renderPackagingCustomViewFields = (record) => {
    const pairs = getPackagingCustomPairs(record);
    if (!pairs.length) return null;

    return pairs.map((item) => (
      <div key={`packaging-custom-view-${item.key}`} style={{ display: "grid", gap: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a", lineHeight: 1.2 }}>
          {item.label}
        </div>
        <div
          style={{
            border: "1px solid #b6c2d2",
            borderRadius: 6,
            background: "#f8fafc",
            padding: "10px 12px",
            fontSize: 14,
            fontWeight: 700,
            color: "#111827",
            wordBreak: "break-word",
          }}
        >
          {item.value}
        </div>
      </div>
    ));
  };

  const renderPackagingCustomTableRows = (record) => {
    const pairs = getPackagingCustomPairs(record);
    if (!pairs.length) return null;

    return pairs.map((item) => (
      <tr key={`packaging-custom-row-${item.key}`}>
        <th style={styles.viewTh} colSpan={3}>{item.label}</th>
        <td style={styles.viewTd} colSpan={8}>{item.value}</td>
      </tr>
    ));
  };
  // ===== MAIN RECORD CRUD =====
  const openAddRecord = () => {
    setEditRecordId(null);
    resetForm();
    setShowAdd(true);
  };

  const openEditRecord = (id) => {
    const r = records.find((x) => String(x.id) === String(id));
    if (!r) return;

    setEditRecordId(id);
    setForm({
      quarter: quarterFromDate(r.dateCompleted),
      province: r.province || "Pangasinan",
      dateCompleted: r.dateCompleted || "",
      typeOfIntervention: r.typeOfIntervention || "Label Design",
      sizeVariant: r.sizeVariant || "",
      packagingMaterialsProvided: r.packagingMaterialsProvided || "",
      customerName: r.customerName || "",
      sex: r.sex || "",
      firmName: r.firmName || "",
      address: r.address || "",
      addressMeta: r.addressMeta || null,
      meansOfVerification: r.meansOfVerification || "",
      nameOfStaff: r.nameOfStaff || r.staffName || "",
      remarks: r.remarks || "",
      customFields: r.customFields || r.custom_fields || {},
      photos: Array.isArray(r.photos) ? r.photos : [],
    });
    setShowAdd(true);
  };

  const saveRecord = async () => {
    if (!form.dateCompleted)
      return alert("Required: Date Completed/Executed");
    if (!form.typeOfIntervention.trim())
      return alert("Required: Type of Intervention");
    if (!form.sizeVariant.trim())
      return alert(
        "Required: Size/Variant of Label Design / Type of Packaging Material"
      );

    if (String(form.packagingMaterialsProvided ?? "").trim() === "")
      return alert("Required: No. of Packaging Materials Provided");

    if (!form.customerName.trim()) return alert("Required: Name of Customer");
    if (!form.firmName.trim())
      return alert("Required: Name of Firm/Institution");
    if (!form.address.trim()) return alert("Required: Address / Venue");

    const computedQuarter = quarterFromDate(form.dateCompleted);
    if (!computedQuarter) return alert("Invalid Date Completed/Executed");

    const existingProducts = editRecordId
      ? records.find((r) => String(r.id) === String(editRecordId))?.products || []
      : [];

    const payload = {
      quarter: String(computedQuarter),
      province: "Pangasinan",
      dateCompleted: form.dateCompleted || "",
      typeOfIntervention: (form.typeOfIntervention || "").trim(),
      sizeVariant: (form.sizeVariant || "").trim(),
      packagingMaterialsProvided: (form.packagingMaterialsProvided || "").trim(),
      customerName: (form.customerName || "").trim(),
      sex: (form.sex || "").trim(),
      firmName: (form.firmName || "").trim(),
      address: (form.address || "").trim(),
      addressMeta: form.addressMeta || null,
      meansOfVerification: (form.meansOfVerification || "").trim(),
      nameOfStaff: (form.nameOfStaff || "").trim(),
      remarks: (form.remarks || "").trim(),
      custom_fields: form.customFields || {},
      customFields: form.customFields || {},
      photos: Array.isArray(form.photos) ? form.photos : [],
      products: existingProducts,
    };

    try {
      if (!editRecordId) {
        await axios.post(API, payload);
      } else {
        await axios.put(`${API}/${editRecordId}`, payload);
      }

      await fetchRecords();
      setShowAdd(false);
      setEditRecordId(null);
      resetForm();
    } catch (err) {
      console.error("Failed to save packaging and labeling record:", err);
      alert("Failed to save record.");
    }
  };

  const deleteRecord = async (id) => {
    if (!window.confirm("Delete this entry?")) return;

    try {
      await axios.delete(`${API}/${id}`);
      await fetchRecords();
    } catch (err) {
      console.error("Failed to delete packaging and labeling record:", err);
      alert("Failed to delete record.");
    }
  };

  // ===== PRODUCT CRUD =====
  const openProductModal_Add = (recordId) => {
    resetProductForm();
    setProductModalFor({ recordId, mode: "add" });
  };

  const openProductModal_Edit = (recordId, productId) => {
    const record = records.find((x) => x.id === recordId);
    const product = record?.products?.find((x) => x.id === productId);
    if (!record || !product) return;

    setProductForm({ productName: product.productName || "" });
    setProductModalFor({ recordId, mode: "edit", productId });
  };

  const saveProduct = async () => {
    if (!productModalFor) return;
    if (!productForm.productName.trim()) return alert("Required: Product Name");

    try {
      if (productModalFor.mode === "add") {
        await axios.post(`${API}/${productModalFor.recordId}/products`, {
          productName: productForm.productName.trim(),
        });
      } else {
        await axios.put(`${API}/products/${productModalFor.productId}`, {
          productName: productForm.productName.trim(),
        });
      }

      await fetchRecords();
      setSelectedProductByRecord((prev) => ({
        ...prev,
        [productModalFor.recordId]: "",
      }));
      setProductModalFor(null);
      resetProductForm();
    } catch (err) {
      console.error("Failed to save product:", err);
      alert("Failed to save product.");
    }
  };

  const deleteProduct = async (recordId, productId) => {
    if (!window.confirm("Delete this product?")) return;

    try {
      await axios.delete(`${API}/products/${productId}`);
      await fetchRecords();

      setSelectedProductByRecord((prev) => {
        if (prev[recordId] !== productId) return prev;
        const { [recordId]: _, ...rest } = prev;
        return rest;
      });
    } catch (err) {
      console.error("Failed to delete product:", err);
      alert("Failed to delete product.");
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

  const maskPathOptions = { color: "transparent", weight: 0, fillColor: "#ffffff", fillOpacity: 1 };

  const openGoogleMap = (lat, lng) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    window.open(url, "_blank");
  };

  const openGoogleDirections = (lat, lng) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    window.open(url, "_blank");
  };

  // ===== Address flow =====
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
    const [coordinatesInput, setCoordinatesInput] = useState(
      Number.isFinite(initialMeta?.lat) && Number.isFinite(initialMeta?.lng)
        ? `${initialMeta.lat}, ${initialMeta.lng}`
        : ""
    );
    const [coordinateStatus, setCoordinateStatus] = useState("");

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
      setManualText(initialMeta?.manualText || "");
      setMunicipality(initialMeta?.municipality || "");
      setBarangay(initialMeta?.barangay || "");

      const lat = initialMeta?.lat;
      const lng = initialMeta?.lng;
      const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
      setCoords(hasCoords ? { lat, lng } : null);
      setCoordinatesInput(hasCoords ? `${lat}, ${lng}` : "");
      setCoordinateStatus("");

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

    const addressOnlyText =
      mode === "manual"
        ? manualText.trim()
        : [barangay, municipality, province].filter(Boolean).join(", ");

    const displayText = composeVenueAddress(venue, addressOnlyText);

    const canSave =
      displayText.trim().length > 0 ||
      Boolean(coords?.lat && coords?.lng) ||
      Boolean(venue.trim());

    const breadcrumb =
      mode === "manual"
        ? "Manual Input"
        : step === 1
          ? "Pangasinan > Select Municipality/City"
          : step === 2
            ? `Pangasinan > ${municipality || "Municipality"} > Select Barangay`
            : `Pangasinan > ${municipality || "Municipality"} > ${barangay || "Barangay"} > Pin`;

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
          setCoordinatesInput(`${next.lat}, ${next.lng}`);
        },
        () => alert("Could not get your location. Check browser permissions.")
      );
    };

    const useCoordinates = async () => {
      const parsed = parseCoordinateInput(coordinatesInput);
      if (!parsed) return alert("Invalid coordinates. Use format like: 15.123456, 120.123456");
      setCoords(parsed);
      setCoordinateStatus("Checking address from coordinates...");
      const resolved = await reverseGeocodeAddress(parsed.lat, parsed.lng);
      if (resolved?.text) {
        setManualText(resolved.text);
        setMunicipality(resolved.municipality || "");
        setBarangay(resolved.barangay || "");
        setCoordinateStatus("Address detected from coordinates.");
        setMode("manual");
        setStep(1);
      } else {
        setCoordinateStatus("Coordinates saved. Address can be typed manually if needed.");
      }
    };

    const save = () => {
      if (!canSave) return;

      const baseAddress = addressOnlyText.trim();
      const finalDisplay = composeVenueAddress(venue, baseAddress);

      const meta =
        mode === "manual"
          ? {
            mode: "manual",
            venue: venue.trim(),
            manualText: baseAddress,
            displayText: finalDisplay || (coords ? `${coords.lat}, ${coords.lng}` : ""),
            province: "",
            municipality: municipality || "",
            barangay: barangay || "",
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
            displayText: finalDisplay,
            lat: coords?.lat || null,
            lng: coords?.lng || null,
          };

      onSave(meta);
      onClose();
    };

    if (!open) return null;

    return (
      <div style={{ ...styles.modalBackdrop, zIndex: UI_LAYERS.nestedBackdrop }} onClick={onClose}>
        <div style={{ ...styles.flowShell, zIndex: UI_LAYERS.nestedContent }} onClick={(e) => e.stopPropagation()}>
          <div style={styles.modalHeader}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div>Add Venue/Address</div>
              <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 800 }}>
                {breadcrumb}
              </div>
            </div>
            <button type="button" style={styles.closeX} onClick={onClose}>
              ✕
            </button>
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
                placeholder="e.g. Riverside Convention Center (optional)"
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
                    placeholder="Optional: e.g. Bldg/Street, Barangay, City/Municipality, Pangasinan"
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Coordinates</div>
                  <input
                    style={styles.input}
                    value={coordinatesInput}
                    onChange={(e) => setCoordinatesInput(e.target.value)}
                    placeholder="Optional: 15.123456, 120.123456"
                  />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" style={styles.tinyBtn} onClick={useCoordinates}>
                      Use Coordinates
                    </button>
                    <button type="button" style={styles.tinyBtn} onClick={useMyLocation}>
                      Use My Location
                    </button>
                  </div>
                  {coordinateStatus ? <div style={{ fontSize: 12, opacity: 0.8 }}>{coordinateStatus}</div> : null}
                </div>

                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  Preview: <b>{displayText || "—"}</b>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" style={styles.btnGhost} onClick={back}>
                    Back
                  </button>
                  <button type="button" style={styles.btnDark} onClick={save} disabled={!canSave}>
                    Save
                  </button>
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
                      <button type="button" style={styles.btnGhost} onClick={onClose}>
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
                          <div style={{ fontFamily: styles.mono.fontFamily }}>
                            public/data/pangasinan_barangays.json
                          </div>
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

                                  if (Number.isFinite(lat) && Number.isFinite(lng)) {
                                    setCoords({ lat, lng });
                                    setCoordinatesInput(`${lat}, ${lng}`);
                                  } else {
                                    setCoords(null);
                                    setCoordinatesInput("");
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

                    <div style={{ fontSize: 12, opacity: 0.75 }}>
                      Preview: <b>{displayText || "—"}</b>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" style={styles.btnGhost} onClick={back}>
                        Back
                      </button>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button type="button" style={styles.btnGhost} onClick={goToMap} disabled={!canSave}>
                          Pin on Map
                        </button>
                        <button type="button" style={styles.btnDark} onClick={save} disabled={!canSave}>
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
                        center={[coords?.lat || 15.9167, coords?.lng || 120.3333]}
                        zoom={coords ? 16 : 12}
                        minZoom={9}
                        maxZoom={18}
                        style={{ height: "100%", width: "100%" }}
                        attributionControl={false}
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

                        <FlyToCenter coords={coords} zoom={16} />
                        <ClickToMoveMarker onPick={(next) => {
                          setCoords(next);
                          setCoordinatesInput(`${next.lat}, ${next.lng}`);
                        }} />

                        {coords && (
                          <Marker
                            position={[coords.lat, coords.lng]}
                            draggable
                            eventHandlers={{
                              dragend: (e) => {
                                const p = e.target.getLatLng();
                                setCoords({ lat: p.lat, lng: p.lng });
                                setCoordinatesInput(`${p.lat}, ${p.lng}`);
                              },
                            }}
                          />
                        )}
                      </MapContainer>
                    </div>

                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      <div><b>Selected:</b> {displayText || "—"}</div>
                      <div><b>Coordinates:</b> {coords ? `${coords.lat}, ${coords.lng}` : "—"}</div>
                      {!coords ? (
                        <div style={{ marginTop: 4, opacity: 0.85 }}>
                          * This barangay has no coords in JSON. Please click the map to set a pin.
                        </div>
                      ) : null}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" style={styles.btnGhost} onClick={back}>
                        Back
                      </button>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button type="button" style={styles.btnGhost} onClick={useMyLocation}>
                          Use My Location
                        </button>
                        <button type="button" style={styles.btnDark} onClick={save} disabled={!canSave}>
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
      <div style={{ ...styles.modalBackdrop, zIndex: UI_LAYERS.nestedBackdrop }} onClick={onClose}>
        <div style={{ ...styles.modal, zIndex: UI_LAYERS.nestedContent, width: "min(720px, calc(100vw - 24px))" }} onClick={(e) => e.stopPropagation()}>
          <div style={styles.modalHeader}>
            <div>View Address / Venue — {record.customerName}</div>
            <button type="button" style={styles.closeX} onClick={onClose}>✕</button>
          </div>

          <div style={styles.modalBody}>
            <div style={{ display: "grid", gap: 10 }}>
              <div>
                <div style={styles.label}>Display Address / Venue</div>
                <div style={{ padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 10, background: "#f8fafc" }}>
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
                  <div style={{ ...styles.mono, fontSize: 12 }}>
                    {hasCoords ? `${lat}, ${lng}` : "—"}
                  </div>
                </div>
              </div>

              {hasCoords ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" style={styles.tinyBtn} onClick={() => openGoogleMap(lat, lng)}>Map</button>
                  <button type="button" style={styles.tinyBtn} onClick={() => openGoogleDirections(lat, lng)}>Directions</button>
                </div>
              ) : (
                <div style={{ fontSize: 12, opacity: 0.7 }}>* No coordinates saved yet (Pin on Map not used).</div>
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


  function ViewRecordModal({ record, onClose }) {
    if (!record) return null;

    const hasCoords =
      Number.isFinite(record?.addressMeta?.lat) &&
      Number.isFinite(record?.addressMeta?.lng);

    const coordsText = hasCoords
      ? `${record.addressMeta.lat}, ${record.addressMeta.lng}`
      : "—";

    const municipalityText = record?.addressMeta?.municipality || "—";
    const products = Array.isArray(record?.products) ? record.products : [];
    const photosTotal = photoCount(record);

    const infoCellStyle = {
      display: "grid",
      gap: 4,
      minWidth: 0,
    };

    const infoLabelStyle = {
      fontSize: 12,
      fontWeight: 800,
      color: "#0f172a",
      lineHeight: 1.2,
    };

    const infoValueStyle = {
      fontSize: 14,
      fontWeight: 800,
      color: "#111827",
      lineHeight: 1.35,
      wordBreak: "break-word",
    };

    const boxStyle = {
      border: "1px solid #b6c2d2",
      borderRadius: 6,
      background: "#f8fafc",
      padding: "10px 12px",
      fontSize: 14,
      fontWeight: 700,
      color: "#111827",
      wordBreak: "break-word",
    };

    const activeTabStyle = {
      border: "1px solid #0b4ea2",
      background: "#dbeafe",
      color: "#111827",
    };

    return (
      <div style={{ ...styles.modalBackdrop, zIndex: UI_LAYERS.viewBackdrop }} onClick={onClose}>
        <div
          style={{
            ...styles.modal,
            zIndex: UI_LAYERS.viewContent,
            width: "min(1120px, calc(100vw - 24px))",
            borderRadius: 12,
            overflow: "hidden",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={styles.modalHeader}>
            <div>View Entry</div>
            <button type="button" style={styles.closeX} onClick={onClose}>
              ✕
            </button>
          </div>

          <div
            style={{
              ...styles.modalBody,
              maxHeight: "76vh",
              overflowY: "auto",
              padding: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <button
                type="button"
                style={{
                  ...styles.pillBtn,
                  ...(viewMode === "list" ? activeTabStyle : null),
                }}
                onClick={() => setViewMode("list")}
              >
                List View
              </button>

              <button
                type="button"
                style={{
                  ...styles.pillBtn,
                  ...(viewMode === "table" ? activeTabStyle : null),
                }}
                onClick={() => setViewMode("table")}
              >
                Table View
              </button>

              <span style={styles.pill}>Photos: {photosTotal}</span>

              {photosTotal ? (
                <button
                  type="button"
                  style={styles.tinyBtn}
                  onClick={() =>
                    openPhotos(
                      record.photos,
                      `Photos — ${record.customerName || "Packaging and Labeling"}`
                    )
                  }
                >
                  View Photos
                </button>
              ) : null}
            </div>

            {viewMode === "list" ? (
              <div style={{ display: "grid", gap: 12 }}>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 900,
                    color: "#111827",
                    lineHeight: 1.1,
                  }}
                >
                  Entry Information
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, minmax(220px, 1fr))",
                    gap: 18,
                    alignItems: "start",
                  }}
                >
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={infoCellStyle}>
                      <div style={infoLabelStyle}>Quarter</div>
                      <div style={infoValueStyle}>
                        {record.quarter ? `${record.quarter}Q` : "—"}
                      </div>
                    </div>

                    <div style={infoCellStyle}>
                      <div style={infoLabelStyle}>Province</div>
                      <div style={infoValueStyle}>
                        {record.province || "Pangasinan"}
                      </div>
                    </div>

                    <div style={infoCellStyle}>
                      <div style={infoLabelStyle}>Type of Intervention</div>
                      <div style={infoValueStyle}>
                        {record.typeOfIntervention || "—"}
                      </div>
                    </div>

                    <div style={infoCellStyle}>
                      <div style={infoLabelStyle}>Name of Customer</div>
                      <div style={infoValueStyle}>
                        {record.customerName || "—"}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={infoCellStyle}>
                      <div style={infoLabelStyle}>Date Completed/Executed</div>
                      <div style={infoValueStyle}>
                        {record.dateCompleted || "—"}
                      </div>
                    </div>

                    <div style={infoCellStyle}>
                      <div style={infoLabelStyle}>Size / Variant</div>
                      <div style={infoValueStyle}>{record.sizeVariant || "—"}</div>
                    </div>

                    <div style={infoCellStyle}>
                      <div style={infoLabelStyle}>
                        No. of Packaging Materials Provided
                      </div>
                      <div style={infoValueStyle}>
                        {record.packagingMaterialsProvided || "—"}
                      </div>
                    </div>

                    <div style={infoCellStyle}>
                      <div style={infoLabelStyle}>Sex (M/F)</div>
                      <div style={infoValueStyle}>{record.sex || "—"}</div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={infoCellStyle}>
                      <div style={infoLabelStyle}>Name of Firm/Institution</div>
                      <div style={infoValueStyle}>{record.firmName || "—"}</div>
                    </div>

                    <div style={infoCellStyle}>
                      <div style={infoLabelStyle}>Photos</div>
                      <div style={infoValueStyle}>{photosTotal}</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <div style={infoLabelStyle}>Address / Venue</div>
                  <div style={boxStyle}>{record.address || "—"}</div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(220px, 1fr))",
                    gap: 18,
                    alignItems: "start",
                  }}
                >
                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={infoLabelStyle}>Municipality</div>
                    <div style={infoValueStyle}>{municipalityText}</div>

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
                          type="button"
                          style={styles.tinyBtn}
                          onClick={() =>
                            openGoogleMap(
                              record.addressMeta.lat,
                              record.addressMeta.lng
                            )
                          }
                        >
                          Map
                        </button>
                        <button
                          type="button"
                          style={styles.tinyBtn}
                          onClick={() =>
                            openGoogleDirections(
                              record.addressMeta.lat,
                              record.addressMeta.lng
                            )
                          }
                        >
                          Directions
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div style={{ display: "grid", gap: 4 }}>
                    <div style={infoLabelStyle}>Coordinates</div>
                    <div style={infoValueStyle}>{coordsText}</div>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <div style={infoLabelStyle}>Means of Verification</div>
                  <div style={boxStyle}>{record.meansOfVerification || "—"}</div>
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <div style={infoLabelStyle}>Name of Staff</div>
                  <div style={boxStyle}>{record.nameOfStaff || "—"}</div>
                </div>

                {renderPackagingCustomViewFields(record)}

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
                    onClick={() => openLinkMaybe(record.meansOfVerification)}
                  >
                    View Link
                  </button>
                  <span style={styles.pill}>Photos: {photosTotal}</span>
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <div style={infoLabelStyle}>Products</div>
                  <div style={boxStyle}>
                    {products.length ? (
                      <ol style={{ margin: 0, paddingLeft: 18 }}>
                        {products.map((p, i) => (
                          <li key={p.id || i} style={{ marginBottom: 4 }}>
                            {p.productName || "—"}
                          </li>
                        ))}
                      </ol>
                    ) : (
                      "—"
                    )}
                  </div>
                </div>

                {record.remarks ? (
                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={infoLabelStyle}>Remarks</div>
                    <div style={boxStyle}>{record.remarks}</div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div style={styles.viewTableWrap}>
                <table style={styles.viewTable}>
                  <thead>
                    <tr>
                      <th style={styles.viewTh}>QUARTER</th>
                      <th style={styles.viewTh}>PROVINCE</th>
                      <th style={styles.viewTh}>TYPE OF INTERVENTION</th>
                      <th style={styles.viewTh}>SIZE / VARIANT / PACKAGING TYPE</th>
                      <th style={styles.viewTh}>NO. OF PACKAGING MATERIALS PROVIDED</th>
                      <th style={styles.viewTh}>DATE COMPLETED</th>
                      <th style={styles.viewTh}>CUSTOMER</th>
                      <th style={styles.viewTh}>SEX</th>
                      <th style={styles.viewTh}>FIRM / INSTITUTION</th>
                      <th style={styles.viewTh}>ADDRESS / VENUE</th>
                      <th style={styles.viewTh}>MEANS OF VERIFICATION</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={styles.viewTdCenter}>
                        {String(record.quarter || "") ? `${record.quarter}Q` : "—"}
                      </td>
                      <td style={styles.viewTdCenter}>{record.province || "Pangasinan"}</td>
                      <td style={styles.viewTdCenter}>{record.typeOfIntervention || "—"}</td>
                      <td style={styles.viewTd}>{record.sizeVariant || "—"}</td>
                      <td style={styles.viewTdCenter}>{record.packagingMaterialsProvided || "—"}</td>
                      <td style={styles.viewTdCenter}>{record.dateCompleted || "—"}</td>
                      <td style={styles.viewTd}>{record.customerName || "—"}</td>
                      <td style={styles.viewTdCenter}>{record.sex || "—"}</td>
                      <td style={styles.viewTd}>{record.firmName || "—"}</td>
                      <td style={styles.viewTd}>
                        <div style={{ display: "grid", gap: 6 }}>
                          <div>{record.address || "—"}</div>
                          <div style={{ fontSize: 12, opacity: 0.85 }}>
                            <b>Municipality:</b> {municipalityText}
                            <br />
                            <b>Coord:</b> {coordsText}
                          </div>
                        </div>
                      </td>
                      <td style={styles.viewTd}>{record.meansOfVerification || "—"}</td>
                    </tr>

                    <tr>
                      <th style={styles.viewTh} colSpan={11}>PRODUCTS</th>
                    </tr>
                    <tr>
                      <td style={styles.viewTd} colSpan={11}>
                        {products.length ? (
                          <ol style={{ margin: 0, paddingLeft: 18 }}>
                            {products.map((p, i) => (
                              <li key={p.id || i}>{p.productName || "—"}</li>
                            ))}
                          </ol>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>

                    {renderPackagingCustomTableRows(record)}

                    {record.remarks ? (
                      <>
                        <tr>
                          <th style={styles.viewTh} colSpan={11}>REMARKS</th>
                        </tr>
                        <tr>
                          <td style={styles.viewTd} colSpan={11}>{record.remarks}</td>
                        </tr>
                      </>
                    ) : null}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={styles.modalFooter}>
            <button type="button" style={styles.btnGhost} onClick={onClose}>
              Close
            </button>
            <button
              type="button"
              style={styles.btnDark}
              onClick={() => {
                onClose();
                openEditRecord(record.id);
              }}
            >
              Edit
            </button>
          </div>
        </div>
      </div>
    );
  }

  const productRecord = useMemo(() => {
    if (!productModalFor) return null;
    return records.find((r) => String(r.id) === String(productModalFor.recordId)) || null;
  }, [productModalFor, records]);

  const viewRecord = useMemo(() => {
    if (!viewRecordId) return null;
    return records.find((r) => String(r.id) === String(viewRecordId)) || null;
  }, [viewRecordId, records]);

  const addressViewRecord = useMemo(() => {
    if (!addressViewForRecordId) return null;
    return records.find((r) => String(r.id) === String(addressViewForRecordId)) || null;
  }, [addressViewForRecordId, records]);


  // ===== Styles =====
  const styles = {
    page: { padding: 16, position: "relative", fontFamily },

    actionBar: {
      position: "sticky",
      top: 0,
      zIndex: UI_LAYERS.toolbar,
      background: "#fff",
      paddingTop: 8,
      paddingBottom: 8,
    },

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

    sectionTitle: { fontWeight: 800, fontSize: 13, color: "#0f172a", fontFamily },

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

    pill: {
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 999,
      border: "1px solid #cbd5e1",
      background: "#f8fafc",
      fontSize: 11,
      fontWeight: 900,
    },

    modalBackdrop: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "flex-start",
      justifyContent: "center",
      padding: "20px 12px",
      zIndex: UI_LAYERS.modalBackdrop,
      overflowY: "auto",
    },

    modal: {
      position: "relative",
      zIndex: UI_LAYERS.modalContent,
      width: "min(1100px, calc(100vw - 24px))",
      maxHeight: "calc(100vh - 40px)",
      background: "white",
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      fontFamily,
      margin: "0 auto",
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

    modalBody: {
      padding: 16,
      maxHeight: "calc(100vh - 170px)",
      overflowY: "auto",
      overflowX: "hidden",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      gap: 10,
    },
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
      borderRadius: 8,
      fontSize: 11,
      fontWeight: 900,
      cursor: "pointer",
      fontFamily,
      whiteSpace: "nowrap",
      height: 30,
      flex: "0 0 auto",
    },

    btnGhost: {
      background: "white",
      border: "1px solid #cbd5e1",
      color: "#0f172a",
      padding: "6px 10px",
      borderRadius: 8,
      fontSize: 11,
      fontWeight: 900,
      cursor: "pointer",
      fontFamily,
      whiteSpace: "nowrap",
      height: 30,
      flex: "0 0 auto",
    },

    miniModal: {
      position: "relative",
      zIndex: UI_LAYERS.modalContent,
      width: "min(520px, calc(100vw - 24px))",
      maxHeight: "calc(100vh - 40px)",
      background: "white",
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      fontFamily,
      margin: "0 auto",
    },

    dividerTitle: { marginTop: 14, fontWeight: 900, fontSize: 12, color: "#0f172a" },
    dividerLine: { height: 1, background: "#e2e8f0", marginTop: 8, marginBottom: 10 },

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

    flowShell: {
      position: "relative",
      zIndex: UI_LAYERS.modalContent,
      width: "min(620px, calc(100vw - 24px))",
      maxHeight: "calc(100vh - 40px)",
      background: "white",
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      fontFamily,
      margin: "0 auto",
    },
    flowBody: { padding: 14, display: "grid", gap: 10, maxHeight: "calc(100vh - 140px)", overflowY: "auto" },
    list: { maxHeight: 320, overflow: "auto", border: "1px solid #e2e8f0", borderRadius: 12, padding: 6 },
    listBtn: { width: "100%", textAlign: "left", padding: "10px 10px", borderRadius: 10, border: "1px solid transparent", background: "transparent", cursor: "pointer", fontWeight: 800, fontFamily },
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

    mapCard: { marginTop: 10, border: "2px solid #6b7280", borderRadius: 10, overflow: "hidden", background: "#fff" },
    mapHeader: { background: "#eef2f6", padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", borderBottom: "2px solid #6b7280" },
    mapTitle: { fontWeight: 900, fontSize: 13, color: "#0f172a" },
    mapSub: { fontSize: 12, opacity: 0.8, fontWeight: 700 },
    mapWrapLarge: { height: 460, width: "100%", background: "linear-gradient(135deg, #e0f2fe 0%, #dbeafe 40%, #f0f9ff 100%)" },
    filterRow: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 8 },
    filterLabel: { fontSize: 12, fontWeight: 900, opacity: 0.8 },
    select: { padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1", background: "#fff", fontWeight: 900, fontFamily, fontSize: 12, minWidth: 240 },
    selectSm: { padding: "6px 9px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", fontWeight: 900, fontFamily, fontSize: 11, minWidth: 108, height: 30, flex: "0 0 auto" },
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
    warn: { marginTop: 8, background: "#fff7ed", border: "1px solid #fdba74", padding: "10px 12px", borderRadius: 10, fontSize: 12, color: "#7c2d12", fontWeight: 800 },

    viewTableWrap: { width: "100%", overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 10 },
    viewTable: { width: "100%", borderCollapse: "collapse", tableLayout: "auto", minWidth: 1500, fontFamily },
    viewTh: { border: "2px solid #6b7280", padding: "8px 10px", background: "#eef2f6", fontSize: 12, textAlign: "center", fontFamily, fontWeight: 900, whiteSpace: "nowrap", wordBreak: "normal", overflowWrap: "normal" },
    viewTd: { border: "2px solid #6b7280", padding: "8px 10px", fontSize: 12, fontFamily, verticalAlign: "top", background: "white", whiteSpace: "normal", wordBreak: "break-word", overflowWrap: "anywhere" },
    viewTdCenter: { border: "2px solid #6b7280", padding: "8px 10px", fontSize: 12, textAlign: "center", fontFamily, verticalAlign: "top", background: "white", whiteSpace: "nowrap" },
  };

  function PopupModal({ open, title, children, onClose }) {
    if (!open) return null;
    return (
      <div style={{ ...styles.modalBackdrop, zIndex: UI_LAYERS.popupBackdrop }} onClick={onClose}>
        <div style={{ ...styles.modal, zIndex: UI_LAYERS.popupContent, width: "min(720px, calc(100vw - 24px))" }} onClick={(e) => e.stopPropagation()}>
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
      <div style={styles.titleBar}>
        <div>PACKAGING AND LABELING</div>
        <div style={{ fontSize: 12, opacity: 0.95, fontWeight: 800, fontFamily }}>

        </div>
      </div>

      {/* MAP */}
      <div style={styles.mapCard}>
        <div style={styles.mapHeader}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, width: "100%" }}>
            <div style={styles.mapTitle}>PANGASINAN MAP — Packaging & Labeling Pins</div>
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
              <Marker key={r.id} position={[r.addressMeta.lat, r.addressMeta.lng]} pane="pinPane">
                <Popup>
                  <div style={{ minWidth: 260, fontFamily }}>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>{r.customerName || "—"}</div>

                    <div style={{ fontSize: 12, marginBottom: 6 }}>
                      <b>Intervention:</b> {r.typeOfIntervention || "—"}
                      <br />
                      <b>Firm:</b> {r.firmName || "—"}
                      <br />
                      <b>Municipality:</b> {getRecordMunicipality(r) || "—"}
                    </div>

                    <div style={{ fontSize: 12, marginBottom: 8 }}>
                      <b>Address / Venue:</b> {r.address || "—"}
                      <br />
                      <b>Coordinates:</b> {r.addressMeta.lat}, {r.addressMeta.lng}
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" style={styles.tinyBtn} onClick={() => setAddressViewForRecordId(r.id)}>Address / Venue</button>
                      <button type="button" style={styles.tinyBtn} onClick={() => openGoogleMap(r.addressMeta.lat, r.addressMeta.lng)}>Map</button>
                      <button type="button" style={styles.tinyBtn} onClick={() => openGoogleDirections(r.addressMeta.lat, r.addressMeta.lng)}>Directions</button>
                      <button type="button" style={styles.tinyBtn} onClick={() => { setViewMode("list"); setViewRecordId(r.id); }}>
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

      {/* ✅ FILTER/SORT + Export/Print + Add Entry */}
      <div style={styles.actionBar}>
        <div style={styles.sectionTitleRow}>
          <div style={styles.sectionTitle}>
            PACKAGING AND LABELING DESIGN AND EXECUTION
            <span style={{ marginLeft: 10, fontSize: 12, opacity: 0.75 }}>
              Showing <b>{filteredRecords.length}</b> of {serverTotalRows} / {serverTotalRows}
            </span>
          </div>

          <div style={styles.toolbarInlineRow}>
            <input
              style={styles.toolbarSearch}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer / firm / address..."
            />

            <select
              style={styles.selectSm}
              value={filterYear}
              onChange={(e) => {
                setFilterYear(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Years</option>
              {yearOptions.map((y) => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>

            <select
              style={styles.selectSm}
              value={filterDistrict}
              onChange={(e) => {
                setFilterDistrict(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Districts</option>
              {toolbarDistrictOptions.map((district) => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>

            <select
              style={styles.selectSm}
              value={filterMonth}
              onChange={(e) => {
                setFilterMonth(e.target.value);
                setCurrentPage(1);
              }}
            >
              {MONTH_OPTIONS.map((m) => (
                <option key={m.value || "all"} value={m.value}>{m.label}</option>
              ))}
            </select>

            <select
              style={styles.selectSm}
              value={filterMunicipality}
              onChange={(e) => {
                setFilterMunicipality(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Municipalities</option>
              {toolbarMunicipalityOptions.filter(Boolean).map((municipality) => (
                <option key={municipality} value={municipality}>{municipality}</option>
              ))}
            </select>

            <select
              style={styles.selectSm}
              value={filterQuarter}
              onChange={(e) => {
                setFilterQuarter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">All Quarters</option>
              <option value="1">1Q</option>
              <option value="2">2Q</option>
              <option value="3">3Q</option>
              <option value="4">4Q</option>
            </select>

            <select
              style={styles.selectSm}
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
            </select>

            <button
              type="button"
              style={styles.addBtn}
              onClick={() => {
                setSearch("");
                setDebouncedSearch("");
                setCurrentPage(1);
                setFilterYear("");
                setFilterDistrict("");
                setFilterMonth("");
                setFilterMunicipality("");
                setFilterQuarter("");
                setSortOrder("newest");
              }}
            >
              Clear Filters
            </button>

            <button type="button" style={styles.btnGhost} onClick={openExportPopupBulk} disabled={filteredRecords.length === 0}>
              Export
            </button>

            <button type="button" style={styles.btnDark} onClick={openPrintPopupBulk} disabled={filteredRecords.length === 0}>
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
        <table style={{ ...styles.table, minWidth: 2000 }}>
          <colgroup>
            <col style={{ width: "4%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "5%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "12%" }} />
          </colgroup>

          <thead>
            <tr>
              <th style={styles.th}>NO.</th>
              <th style={styles.th}>PROVINCE</th>
              <th style={styles.th}>NAME OF PRODUCT</th>
              <th style={styles.th}>TYPE OF INTERVENTION</th>
              <th style={styles.th}>Size/Variant of Label Design/Type of Packaging Material</th>
              <th style={styles.th}>No. of Packaging Materials Provided</th>
              <th style={styles.th}>Date Completed/Executed</th>
              <th style={styles.th}>Name of Customer</th>
              <th style={styles.th}>SEX (M/F)</th>
              <th style={styles.th}>Name of Firm/Institution / Address / Venue</th>
              <th style={styles.th}>Means of Verification</th>
              <th style={styles.th}>ACTIONS</th>
            </tr>
          </thead>

          <tbody>
            {filteredRecords.length === 0 ? (
              <tr>
                <td style={styles.tdCenter} colSpan={12}>
                  Walang entries sa current filter. (Try “Clear Filters”)
                </td>
              </tr>
            ) : (
              filteredRecords.map((r, idx) => {
                const selectedProductId = selectedProductByRecord[r.id] || "";
                const hasCoords = Number.isFinite(r?.addressMeta?.lat) && Number.isFinite(r?.addressMeta?.lng);

                return (
                  <tr key={r.id}>
                    <td style={styles.tdCenter}>{(effectivePage - 1) * rowsPerPage + idx + 1}</td>
                    <td style={styles.tdCenter}>{r.province || "Pangasinan"}</td>

                    <td style={styles.td}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {Array.isArray(r.products) && r.products.length > 0 ? (
                          <div style={{ display: "grid", gap: 6 }}>
                            {r.products.map((p, i) => {
                              const isSelected = selectedProductId === p.id;
                              return (
                                <button
                                  type="button"
                                  key={p.id}
                                  onClick={() => setSelectedProductByRecord((prev) => ({ ...prev, [r.id]: p.id }))}
                                  style={{
                                    textAlign: "left",
                                    background: isSelected ? "#e0f2fe" : "transparent",
                                    border: isSelected ? "1px solid #38bdf8" : "1px solid transparent",
                                    borderRadius: 8,
                                    padding: "4px 6px",
                                    cursor: "pointer",
                                    fontSize: 11,
                                    fontFamily,
                                  }}
                                >
                                  {i + 1}. {p.productName}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={{ fontSize: 11, opacity: 0.6 }}>—</div>
                        )}

                        <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                          <button type="button" style={styles.pillBtn} onClick={() => openProductModal_Add(r.id)}>+ Add</button>
                          <button type="button" style={styles.tinyBtn} disabled={!selectedProductId} onClick={() => openProductModal_Edit(r.id, selectedProductId)}>Edit</button>
                          <button type="button" style={styles.dangerTiny} disabled={!selectedProductId} onClick={() => deleteProduct(r.id, selectedProductId)}>Delete</button>
                        </div>
                      </div>
                    </td>

                    <td style={styles.tdCenter}>{r.typeOfIntervention || "—"}</td>
                    <td style={styles.td}>{r.sizeVariant || "—"}</td>
                    <td style={styles.tdCenter}>{r.packagingMaterialsProvided || "—"}</td>
                    <td style={styles.tdCenter}>{r.dateCompleted || "—"}</td>
                    <td style={styles.td}>{r.customerName || "—"}</td>
                    <td style={styles.tdCenter}>{r.sex || "—"}</td>

                    <td style={styles.td}>
                      <div style={{ display: "grid", gap: 8 }}>
                        <div style={{ fontSize: 12 }}>
                          <div style={{ fontWeight: 900 }}>{r.firmName || "—"}</div>
                          <div style={{ marginTop: 4 }}>{r.address || "—"}</div>
                        </div>

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button type="button" style={styles.tinyBtn} onClick={() => setAddressViewForRecordId(r.id)}>View</button>
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
                      <div style={{ display: "grid", gap: 8 }}>
                        <div>{r.meansOfVerification || "—"}</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          <button type="button" style={styles.tinyBtn} onClick={() => openLinkMaybe(r.meansOfVerification)}>View Link</button>
                          <span style={styles.pill}>Photos: {photoCount(r)}</span>
                          {photoCount(r) ? (
                            <button type="button" style={styles.tinyBtn} onClick={() => openPhotos(r.photos, `Photos — ${r.customerName || "Packaging and Labeling"}`)}>View Photos</button>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    <td style={styles.tdCenter}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", alignItems: "center" }}>
                        <button type="button" style={styles.tinyBtn} onClick={() => { setViewMode("list"); setViewRecordId(r.id); }}>View</button>
                        <button type="button" style={styles.tinyBtn} onClick={() => openEditRecord(r.id)}>Edit</button>
                        <button type="button" style={styles.tinyBtn} onClick={() => openPrintPopupRow(r.id)}>Print</button>
                        <button type="button" style={styles.tinyBtn} onClick={() => openExportPopupRow(r.id)}>Export</button>
                        <button type="button" style={styles.dangerBtn} onClick={() => deleteRecord(r.id)}>Delete</button>
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
          <span style={styles.googleLetterBlue({ marginRight: 2 })}>D</span>

          <div
            style={{
              ...styles.googleWordmarkTrack,
              width: paginationLogoOSlots.length * 20,
            }}
          >
            {paginationLogoOSlots.map((slot) => (
              <span key={`slot-${slot}`} style={styles.googleLetterO()}>
                o
              </span>
            ))}

            <span style={styles.googleMovingBlackO(activeLogoIndex)}>o</span>
          </div>

          <span style={styles.googleLetterBlue({ marginLeft: 2 })}>st</span>
        </div>

        <div style={styles.googlePaginationRow}>
          <button
            type="button"
            style={styles.googleNavBtn(currentPage <= 1)}
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          >
            Previous
          </button>

          <div style={styles.googlePageNumbers}>
            {visiblePageNumbers.map((pageNum) =>
              pageNum === currentPage ? (
                <span key={pageNum} style={styles.googlePageCurrent}>
                  {pageNum}
                </span>
              ) : (
                <button
                  key={pageNum}
                  type="button"
                  style={styles.googlePageBtn}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              )
            )}
          </div>

          <button
            type="button"
            style={styles.googleNavBtn(false)}
            onClick={() => setCurrentPage((prev) => prev + 1)}
          >
            Next
          </button>
        </div>
      </div>

      {addressViewForRecordId && <AddressViewModal record={addressViewRecord} onClose={() => setAddressViewForRecordId(null)} />}
      {viewRecordId && <ViewRecordModal record={viewRecord} onClose={() => setViewRecordId(null)} />}

      {productModalFor && (
        <div style={{ ...styles.modalBackdrop, zIndex: UI_LAYERS.popupBackdrop }} onClick={() => setProductModalFor(null)}>
          <div style={{ ...styles.miniModal, zIndex: UI_LAYERS.popupContent }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                {productModalFor.mode === "edit" ? "Edit Product" : "Add Product"}
                {productRecord ? <span style={{ opacity: 0.9, fontWeight: 800 }}> — {productRecord.customerName}</span> : null}
              </div>
              <button type="button" style={styles.closeX} onClick={() => setProductModalFor(null)}>✕</button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.field}>
                <div style={styles.label}>Product Name *</div>
                <input style={styles.input} value={productForm.productName} onChange={(e) => setProductForm({ ...productForm, productName: e.target.value })} placeholder="e.g. Brown Rice" />
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button type="button" style={styles.btnGhost} onClick={() => { setProductModalFor(null); resetProductForm(); }}>Cancel</button>
              <button type="button" style={styles.btnDark} onClick={saveProduct}>{productModalFor.mode === "edit" ? "Update" : "Save"}</button>
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div style={{ ...styles.modalBackdrop, zIndex: UI_LAYERS.modalBackdrop }} onClick={() => setShowAdd(false)}>
          <div style={{ ...styles.modal, zIndex: UI_LAYERS.modalContent, width: "min(1200px, calc(100vw - 24px))" }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>{editRecordId ? "Edit Entry" : "Add Entry"}</div>
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
                  <div style={styles.label}>Province *</div>
                  <input style={{ ...styles.input, background: "#f1f5f9" }} value={form.province} disabled />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Date Completed/Executed *</div>
                  <input
                    style={styles.input}
                    type="date"
                    value={form.dateCompleted}
                    onChange={(e) => {
                      const v = e.target.value;
                      const q = quarterFromDate(v);
                      setForm((prev) => ({ ...prev, dateCompleted: v, quarter: q }));
                    }}
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Type of Intervention *</div>
                  <select style={styles.input} value={form.typeOfIntervention} onChange={(e) => setForm({ ...form, typeOfIntervention: e.target.value })}>
                    {INTERVENTION_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Size/Variant of Label Design/Type of Packaging Material *</div>
                  <input style={styles.input} value={form.sizeVariant} onChange={(e) => setForm({ ...form, sizeVariant: e.target.value })} placeholder="e.g. 4x5.6 inches Sticker type" />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>No. of Packaging Materials Provided *</div>
                  <input style={styles.input} value={form.packagingMaterialsProvided} onChange={(e) => setForm({ ...form, packagingMaterialsProvided: e.target.value })} placeholder="e.g. N/A or quantity" />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Name of Customer *</div>
                  <input style={styles.input} value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
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
                  <div style={styles.label}>Name of Firm/Institution *</div>
                  <input style={styles.input} value={form.firmName} onChange={(e) => setForm({ ...form, firmName: e.target.value })} placeholder="e.g. RiceBIS Bayambang Agriculture Cooperative" />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Address / Venue *</div>
                  <button type="button" onClick={() => setAddressFlowOpen(true)} style={styles.inputButton(Boolean(form.address))}>
                    <span style={{ opacity: form.address ? 1 : 0.6 }}>{form.address || "Click to select address / venue"}</span>
                    <span style={{ fontSize: 11, opacity: 0.65 }}>{form.address ? "Change" : "Select"}</span>
                  </button>
                </div>

                <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                  <div style={styles.label}>Means of Verification</div>
                  <textarea style={styles.textarea} value={form.meansOfVerification} onChange={(e) => setForm({ ...form, meansOfVerification: e.target.value })} placeholder="Design approval sheet / links / OR / AR / report / photos..." />

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <button type="button" style={styles.tinyBtn} onClick={() => openLinkMaybe(form.meansOfVerification)}>View Link</button>
                    <button type="button" style={styles.tinyBtn} onClick={triggerAddPhotos}>Add Photos</button>
                    <span style={styles.pill}>Photos: {photoCount(form)}</span>
                  </div>

                  <input ref={photoInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => onPickPhotos(e.target.files)} />

                  {Array.isArray(form.photos) && form.photos.length > 0 ? (
                    <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                      {form.photos.map((p, idx) => (
                        <div key={`${p.name}_${idx}`} style={{ display: "flex", gap: 10, alignItems: "center", border: "1px solid #e2e8f0", borderRadius: 10, padding: 8 }}>
                          <img src={p.dataUrl} alt={p.name} style={{ width: 54, height: 54, objectFit: "cover", borderRadius: 8, border: "1px solid #e2e8f0" }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 900, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                            <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 900 }}>{p.type}</div>
                          </div>
                          <button type="button" style={styles.dangerTiny} onClick={() => removePhotoAt(idx)}>Remove</button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                  <div style={styles.label}>Name of Staff</div>
                  <input
                    style={styles.input}
                    value={form.nameOfStaff}
                    onChange={(e) => setForm({ ...form, nameOfStaff: e.target.value })}
                    placeholder="Optional"
                  />
                </div>

                {renderPackagingCustomInputs()}

                <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                  <div style={styles.label}>Remarks</div>
                  <textarea style={styles.textarea} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
                </div>

                <div style={{ gridColumn: "1 / -1", fontSize: 12, opacity: 0.75 }}>
                  * After saving the entry, add the product names from the main table.
                </div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button type="button" style={styles.btnGhost} onClick={() => { setShowAdd(false); setEditRecordId(null); resetForm(); }}>Cancel</button>
              <button type="button" style={styles.btnDark} onClick={saveRecord}>{editRecordId ? "Update Entry" : "Save Entry"}</button>
            </div>
          </div>

          <AddressFlowModal open={addressFlowOpen} onClose={() => setAddressFlowOpen(false)} onSave={applyAddressMetaToForm} initialMeta={form.addressMeta} />
        </div>
      )}

      {photoViewer && (
        <div style={{ ...styles.modalBackdrop, zIndex: UI_LAYERS.photoBackdrop }} onClick={() => setPhotoViewer(null)}>
          <div style={{ ...styles.modal, zIndex: UI_LAYERS.photoContent, width: "min(980px, calc(100vw - 24px))" }} onClick={(ev) => ev.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>{photoViewer.title} — {photoIndex + 1}/{photoViewer.photos.length}</div>
              <button type="button" style={styles.closeX} onClick={() => setPhotoViewer(null)}>✕</button>
            </div>

            <div style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <img
                  src={photoViewer.photos[photoIndex].dataUrl}
                  alt={photoViewer.photos[photoIndex].name}
                  style={{ maxWidth: "100%", maxHeight: "60vh", borderRadius: 12, border: "1px solid #e2e8f0" }}
                />
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                <button type="button" style={styles.tinyBtn} onClick={prevPhoto}>◀ Prev</button>
                <button type="button" style={styles.tinyBtn} onClick={nextPhoto}>Next ▶</button>
              </div>

              <div style={{ marginTop: 10, fontSize: 12, fontWeight: 900, opacity: 0.85, textAlign: "center" }}>
                {photoViewer.photos[photoIndex].name}
              </div>
            </div>
          </div>
        </div>
      )}

      <PopupModal open={printModal.open} title={printModal.scope === "row" ? "Print (This Row)" : "Print (Filtered Rows)"} onClose={() => setPrintModal((p) => ({ ...p, open: false }))}>
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8 }}>
            {printModal.scope === "row" ? `Record: ${getRecordById(printModal.recordId)?.customerName || "—"}` : `Records: ${filteredRecords.length}`}
          </div>

          <div style={styles.grid}>
            <div style={styles.field}>
              <div style={styles.label}>Layout</div>
              <select style={styles.input} value={printModal.layout} onChange={(e) => setPrintModal((p) => ({ ...p, layout: e.target.value }))}>
                <option value="FORM">Form-Based Record Sheet</option>
                <option value="TABLE">Table Sheet</option>
                <option value="COMPACT">Compact Sheet</option>
                <option value="LABEL">Label / Custom Template</option>
                <option value="ISO">ISO Design Change Record</option>
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

      <PopupModal open={exportModal.open} title={exportModal.scope === "row" ? "Export (This Row)" : "Export (Filtered Rows)"} onClose={() => setExportModal((p) => ({ ...p, open: false }))}>
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.8 }}>
            {exportModal.scope === "row"
              ? `Record: ${getRecordById(exportModal.recordId)?.customerName || "—"}`
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
                    ...(exportModal.format === f
                      ? { border: "1px solid #0b4ea2", background: "#dbeafe" }
                      : null),
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
                <select
                  style={styles.input}
                  value={exportModal.template}
                  onChange={(e) =>
                    setExportModal((p) => ({ ...p, template: e.target.value }))
                  }
                >
                  <option value="FORM">Form-Based Record Sheet</option>
                  <option value="TABLE">Table Sheet</option>
                  <option value="COMPACT">Compact Sheet</option>
                  <option value="LABEL">Label / Custom Template</option>
                  <option value="ISO">ISO Design Change Record</option>
                </select>
              </div>

              <div style={styles.field}>
                <div style={styles.label}>Orientation</div>
                <select
                  style={styles.input}
                  value={exportModal.orientation}
                  onChange={(e) =>
                    setExportModal((p) => ({ ...p, orientation: e.target.value }))
                  }
                >
                  <option value="landscape">Landscape (default)</option>
                  <option value="portrait">Portrait</option>
                </select>
              </div>

              {exportModal.format === "pdf" ? (
                <>
                  <div style={styles.field}>
                    <div style={styles.label}>Paper Size</div>
                    <select
                      style={styles.input}
                      value={exportModal.preset}
                      onChange={(e) =>
                        setExportModal((p) => ({ ...p, preset: e.target.value }))
                      }
                    >
                      <option value="a4">A4</option>
                      <option value="letter">Letter</option>
                      <option value="legal">Legal</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>

                  <div style={styles.field}>
                    <div style={styles.label}>Custom Size (inches)</div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        style={styles.input}
                        disabled={exportModal.preset !== "custom"}
                        value={exportModal.customSize.width}
                        onChange={(e) =>
                          setExportModal((p) => ({
                            ...p,
                            customSize: { ...p.customSize, width: e.target.value },
                          }))
                        }
                      />
                      <input
                        style={styles.input}
                        disabled={exportModal.preset !== "custom"}
                        value={exportModal.customSize.height}
                        onChange={(e) =>
                          setExportModal((p) => ({
                            ...p,
                            customSize: { ...p.customSize, height: e.target.value },
                          }))
                        }
                      />
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="button"
              style={styles.btnGhost}
              onClick={() => setExportModal((p) => ({ ...p, open: false }))}
            >
              Cancel
            </button>
            <button type="button" style={styles.btnDark} onClick={confirmExport}>
              Export Now
            </button>
          </div>
        </div>
      </PopupModal>
    </div>
  );
}




