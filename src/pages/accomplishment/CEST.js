import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useAuth } from "../../usrmngment/auth/AuthContext";
import { canAdd, canEdit, canDelete, canExport } from "../../usrmngment/utils/permissions";
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
import "./cest.css";

/* =========================
   ✅ Leaflet + React-Leaflet (Map integration)
   ========================= */
import "leaflet/dist/leaflet.css";
import L from "leaflet";
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
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
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
    municipalities: ["Agno", "Alaminos City", "Anda", "Bani", "Bolinao", "Burgos", "Dasol", "Infanta", "Mabini", "Sual"],
  },
  {
    id: "District 2",
    municipalities: ["Aguilar", "Basista", "Binmaley", "Bugallon", "Labrador", "Lingayen", "Mangatarem", "Urbiztondo"],
  },
  {
    id: "District 3",
    municipalities: ["Bayambang", "Calasiao", "Malasiqui", "Mapandan", "San Carlos City", "Santa Barbara"],
  },
  {
    id: "District 4",
    municipalities: ["Dagupan City", "Manaoag", "Mangaldan", "San Fabian", "San Jacinto"],
  },
  {
    id: "District 5",
    municipalities: ["Alcala", "Bautista", "Binalonan", "Laoac", "Pozorrubio", "Santo Tomas", "Sison", "Urdaneta City", "Villasis"],
  },
  {
    id: "District 6",
    municipalities: ["Asingan", "Balungao", "Natividad", "Rosales", "San Manuel", "San Nicolas", "San Quintin", "Santa Maria", "Tayug", "Umingan"],
  },
];

const API = API_BASE;



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

export default function CEST() {
  const { user } = useAuth();

  const allowAdd = canAdd(user, "cest");
  const allowEdit = canEdit(user, "cest");
  const allowDelete = canDelete(user, "cest");
  const allowExport = canExport(user, "cest");

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

  const INTERVENTION_OPTIONS = [
    "Training",
    "Tech Roll Out",
    "Tech Promo",
    "S&T Promo",
    "TACS",
    "Packaging & Labeling",
    "Calibration",
    "TNA Report",
  ];
  const COMMUNITY_TYPE_OPTIONS = ["New Communities", "Continuing Communities"];
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

  // ✅ barangay JSON
  const BARANGAY_LOCAL_URL = "/data/pangasinan_barangays.json";

  const normalizeKey = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

  async function fetchBarangaysForMunicipality_Local(muniName) {
    const res = await fetch(BARANGAY_LOCAL_URL);
    if (!res.ok) throw new Error("Missing file: public/data/pangasinan_barangays.json");
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

  const money = (n) =>
    toNumber(n).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const getInterventionLabel = (it) => {
    const type = it?.type || "";

    if (type === "Tech Roll Out") {
      try {
        const obj = JSON.parse(it?.notes || "");
        const rows = Array.isArray(obj?.techRollOutRows)
          ? obj.techRollOutRows
          : [];

        const firstTech = rows
          .map((r) =>
            String(
              r?.nameOfTechnologyTransferred ||
              r?.knowledgeTech ||
              ""
            ).trim()
          )
          .find((x) => x);

        if (firstTech) return firstTech;
      } catch { }
      return "Tech Roll Out";
    }

    if (
      type === "Training" ||
      type === "Tech Promo" ||
      type === "S&T Promo"
    ) {
      return (it?.title || type || "Training").trim();
    }

    if (type === "TNA Report") {
      return (it?.notes || "").trim() || "TNA Report";
    }

    return (it?.title || type || "—").trim();
  };

  // ===== State =====
  const [projects, setProjects] = useState([]);

  // Project modals
  const [showAdd, setShowAdd] = useState(false);
  const [editProjectId, setEditProjectId] = useState(null);
  const [viewProjectId, setViewProjectId] = useState(null);

  // ✅ View mode
  const [viewMode, setViewMode] = useState("list");

  // Project form
  const [form, setForm] = useState({
    quarter: "1",
    type: "New Communities",
    projectTitle: "",
    dateProjectApproval: "",
    approvedProjectCost: "",
    dateFundRelease: "",

    associationName: "",
    address: "",
    addressMeta: null,
    lguNumbersOfCommunities: "",
    numberOfMoa: "",

    projectProponent: "",
    sex: "",
    processSystem: "",
    meansOfVerification: "",
    movPhotos: [],
    staffName: "",
    communitiesAssisted: "",
    technologiesDeployed: "",
    beneficiaries: "",
    startupsAssisted: "",
    jobsGenerated: "",
    customFields: {},

  });

  // Address modal
  const [addressFlowOpen, setAddressFlowOpen] = useState(false);
  const [addressFlowTarget, setAddressFlowTarget] = useState("project");
  const [addressViewForProjectId, setAddressViewForProjectId] = useState(null);
  const [cestCustomFields, setCestCustomFields] = useState([]);

  // Intervention picker
  const [pickForId, setPickForId] = useState(null);
  const [selectedInterventionByProject, setSelectedInterventionByProject] = useState({});

  // Intervention details modal
  const [detailFor, setDetailFor] = useState(null);

  const makeDefaultTechRows = () => [
    {
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
    },
  ];

  const CALIBRATION_MC_RANGE_OPTIONS = ["<100 Kg", ">=100 Kg"];

  const makeCalibrationBreakdownRow = (prefillSample = "", autoFilled = false) => ({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    range: "",
    noOfSample: prefillSample,
    cost: "",
    feesCollected: "",
    autoFilled,
  });

  const computeCalibrationBreakdownTotals = (rows, category) => {
    const cleanRows = Array.isArray(rows) ? rows : [];
    const totalSamples = cleanRows.reduce((sum, r) => sum + toNumber(r.noOfSample), 0);
    const totalFees =
      category === "PAYING"
        ? cleanRows.reduce((sum, r) => sum + toNumber(r.noOfSample) * toNumber(r.cost), 0)
        : 0;

    return { totalSamples, totalFees };
  };

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
      return {
        ...prev,
        techRows: arr.length ? arr : makeDefaultTechRows(),
      };
    });
  };


  const updateCalibrationForm = (key, value) => {
    setDetailForm((prev) => {
      const next = { ...prev, [key]: value };

      if (key === "calibrationTypeOfSample") {
        if (value === "Weighing Scale") {
          next.calibrationTestType = "Mass Calibration";
          next.calibrationRange = "";
          if (!Array.isArray(next.calibrationMcBreakdown) || !next.calibrationMcBreakdown.length) {
            next.calibrationMcBreakdown = [makeCalibrationBreakdownRow()];
          }
          const totals = computeCalibrationBreakdownTotals(
            next.calibrationMcBreakdown,
            next.calibrationCategory
          );
          next.calibrationNoOfSample = String(totals.totalSamples || "");
          next.calibrationFeesCollected = String(totals.totalFees || "");
          next.calibrationCost = "";
        } else if (value === "Bucket") {
          next.calibrationTestType = "Volume Calibration";
          next.calibrationMcBreakdown = [makeCalibrationBreakdownRow()];
          next.calibrationRange = "";
          next.calibrationNoOfSample = "";
          next.calibrationCost = "";
          next.calibrationFeesCollected = "";
        }
      }

      if (key === "calibrationFemale" || key === "calibrationMale") {
        const female = key === "calibrationFemale" ? toNumber(value) : toNumber(next.calibrationFemale);
        const male = key === "calibrationMale" ? toNumber(value) : toNumber(next.calibrationMale);
        const total = female + male;
        next.calibrationTotalCustomers = String(total || "");
        next.calibrationNoOfFirms = String(total || "");
      }

      if (
        next.calibrationTypeOfSample === "Bucket" &&
        (key === "calibrationCost" || key === "calibrationNoOfSample" || key === "calibrationCategory")
      ) {
        const cost = key === "calibrationCost" ? toNumber(value) : toNumber(next.calibrationCost);
        const noOfSample =
          key === "calibrationNoOfSample" ? toNumber(value) : toNumber(next.calibrationNoOfSample);
        const category = key === "calibrationCategory" ? value : next.calibrationCategory;
        next.calibrationFeesCollected =
          category === "PAYING" ? String(cost * noOfSample || "") : "";
      }

      if (key === "calibrationCategory" && next.calibrationTypeOfSample === "Weighing Scale") {
        const totals = computeCalibrationBreakdownTotals(
          next.calibrationMcBreakdown,
          value
        );
        next.calibrationNoOfSample = String(totals.totalSamples || "");
        next.calibrationFeesCollected = String(totals.totalFees || "");
      }

      return next;
    });
  };

  const updateCalibrationBreakdownRow = (rowId, key, value) => {
    setDetailForm((prev) => {
      const rows = [...(prev.calibrationMcBreakdown || [])];
      const currentIndex = rows.findIndex((row) => row.id === rowId);

      const updatedRows = rows.map((row) => {
        if (row.id !== rowId) return row;

        const nextRow = {
          ...row,
          [key]: value,
          autoFilled: key === "noOfSample" ? false : row.autoFilled,
        };

        nextRow.feesCollected =
          prev.calibrationCategory === "PAYING"
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

          const remainingForNext = Math.max(
            0,
            toNumber(prev.calibrationNoOfSample) - usedWithoutNext
          );

          updatedRows[nextIndex] = {
            ...nextRow,
            noOfSample: remainingForNext ? String(remainingForNext) : "",
            autoFilled: true,
            feesCollected:
              prev.calibrationCategory === "PAYING"
                ? String(remainingForNext * toNumber(nextRow.cost) || "")
                : "",
          };
        }
      }

      const totalFees =
        prev.calibrationCategory === "PAYING"
          ? updatedRows.reduce(
            (sum, r) => sum + toNumber(r.noOfSample) * toNumber(r.cost),
            0
          )
          : 0;

      return {
        ...prev,
        calibrationMcBreakdown: updatedRows,
        calibrationFeesCollected: String(totalFees || ""),
      };
    });
  };

  const addCalibrationBreakdownRow = () => {
    setDetailForm((prev) => {
      const currentTotal = (prev.calibrationMcBreakdown || []).reduce(
        (sum, r) => sum + toNumber(r.noOfSample),
        0
      );
      const remaining = Math.max(0, toNumber(prev.calibrationNoOfSample) - currentTotal);
      return {
        ...prev,
        calibrationMcBreakdown: [
          ...(prev.calibrationMcBreakdown || []),
          makeCalibrationBreakdownRow(remaining ? String(remaining) : "", true),
        ],
      };
    });
  };

  const removeCalibrationBreakdownRow = (rowId) => {
    setDetailForm((prev) => {
      const remaining = (prev.calibrationMcBreakdown || []).filter((row) => row.id !== rowId);
      const rows = remaining.length ? remaining : [makeCalibrationBreakdownRow()];
      const totals = computeCalibrationBreakdownTotals(rows, prev.calibrationCategory);
      return {
        ...prev,
        calibrationMcBreakdown: rows,
        calibrationNoOfSample: String(totals.totalSamples || ""),
        calibrationFeesCollected: String(totals.totalFees || ""),
      };
    });
  };

  const [detailForm, setDetailForm] = useState({
    type: "",
    title: "",
    date: "",
    venue: "",
    noOfFirms: "",
    male: "",
    female: "",
    total: "",
    projectProgramUnit: "",
    notes: "",
    techRows: [],

    trainingProgram: "",
    trainingProvince: "PANGASINAN",
    trainingStartDate: "",
    trainingEndDate: "",
    trainingVenueAddress: "",
    trainingVenueAddressMeta: null,
    trainingParticipantsFemale: "",
    trainingParticipantsMale: "",
    trainingSeniorFemale: "",
    trainingSeniorMale: "",
    trainingIpFemale: "",
    trainingIpMale: "",
    trainingFourPsFemale: "",
    trainingFourPsMale: "",
    trainingPwdFemale: "",
    trainingPwdMale: "",
    trainingFirmsSucsHeisLgusCount: "",
    trainingFirmsAssociationsList: "",
    trainingTrainorAffiliation: "",
    trainingCostDost: "",
    trainingCostPartnerAgency: "",

    promoProject: "",
    promoActivityDate: "",
    promoTechnologyPromoted: "",
    promoTechnologyGenerator: "",
    promoModeOfPromotion: "Social Media",
    promoActivityTitle: "",
    promoActivityVenueAddress: "",
    promoActivityVenueMeta: null,
    promoCustomerName: "",
    promoCustomerAddress: "",
    promoCustomerAddressMeta: null,
    promoSex: "N/A",
    promoStaffName: "",
    promoMeansVerification: "",
    promoPhotos: [],

    calibrationCategory: "PAYING",
    calibrationDate: "",
    calibrationTypeOfSample: "Weighing Scale",
    calibrationTestType: "Mass Calibration",
    calibrationNoOfSample: "",
    calibrationRange: "",
    calibrationCost: "",
    calibrationFeesCollected: "",
    calibrationMcBreakdown: [makeCalibrationBreakdownRow()],
    calibrationBarangay: "",
    calibrationAddress: "",
    calibrationAddressMeta: null,
    calibrationFemale: "",
    calibrationMale: "",
    calibrationTotalCustomers: "",
    calibrationNoOfFirms: "",
    calibrationNoOfNewFirms: "",
    calibrationAgeRange: "",
    calibrationPwd: "",
    calibrationIp: "",
    calibrationSc: "",
    calibrationFourPs: "",

    consultancyType: "",
    dateEngagement: "",
    expertInstitution: "",
    customerName: "",
    customerSex: "",
    customerAddress: "",
    customerAddressMeta: null,
    meansVerification: "",
    noOfAdvice: "",
    tacsPhotos: [],
  });

  const trainingTotalFemale =
    toNumber(detailForm.trainingParticipantsFemale) +
    toNumber(detailForm.trainingSeniorFemale) +
    toNumber(detailForm.trainingIpFemale) +
    toNumber(detailForm.trainingFourPsFemale) +
    toNumber(detailForm.trainingPwdFemale);

  const trainingTotalMale =
    toNumber(detailForm.trainingParticipantsMale) +
    toNumber(detailForm.trainingSeniorMale) +
    toNumber(detailForm.trainingIpMale) +
    toNumber(detailForm.trainingFourPsMale) +
    toNumber(detailForm.trainingPwdMale);

  const trainingTotalParticipants = trainingTotalFemale + trainingTotalMale;

  const trainingTotalCost =
    toNumber(detailForm.trainingCostDost) +
    toNumber(detailForm.trainingCostPartnerAgency);

  const calibrationBreakdownTotal = (detailForm.calibrationMcBreakdown || []).reduce(
    (sum, r) => sum + toNumber(r.noOfSample),
    0
  );

  const calibrationRemainingSamples = Math.max(
    0,
    toNumber(detailForm.calibrationNoOfSample) - calibrationBreakdownTotal
  );

  const promoPhotoInputRef = useRef(null);
  const [promoPhotoViewerIndex, setPromoPhotoViewerIndex] = useState(-1);
  const packagingPhotoInputRef = useRef(null);
  const [packagingPhotoViewerIndex, setPackagingPhotoViewerIndex] = useState(-1);
  const tacsPhotoInputRef = useRef(null);
  const [tacsPhotoViewerIndex, setTacsPhotoViewerIndex] = useState(-1);


  const extractLinks = (value = "") =>
    String(value || "").match(/https?:\/\/[^\s]+/gi) || [];

  const openSpecificLink = (url) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const openLinkMaybe = (value = "") => {
    const first = extractLinks(value)[0];
    if (!first) {
      alert("No URL found in Means of Verification.");
      return;
    }
    openSpecificLink(first);
  };

  const triggerAddPromoPhotos = () => {
    if (promoPhotoInputRef.current) promoPhotoInputRef.current.click();
  };

  const onPickPromoPhotos = (files) => {
    const picked = Array.from(files || []);
    if (!picked.length) return;

    Promise.all(
      picked.map(
        (file) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({
                name: file.name,
                type: file.type,
                size: file.size,
                url: reader.result,
              });
            reader.onerror = reject;
            reader.readAsDataURL(file);
          })
      )
    )
      .then((items) => {
        setDetailForm((prev) => ({
          ...prev,
          promoPhotos: [...(Array.isArray(prev.promoPhotos) ? prev.promoPhotos : []), ...items],
        }));
      })
      .catch((err) => {
        console.error(err);
        alert("Failed to read selected photo(s).");
      });
  };

  const promoPhotoCount = () =>
    Array.isArray(detailForm?.promoPhotos) ? detailForm.promoPhotos.length : 0;

  const getPromoPhotoUrl = (photo) => {
    if (!photo) return "";
    return String(photo.url || photo.dataUrl || photo.preview || photo.src || "").trim();
  };

  const triggerAddPackagingPhotos = () => {
    if (packagingPhotoInputRef.current) packagingPhotoInputRef.current.click();
  };

  const onPickPackagingPhotos = (files) => {
    const picked = Array.from(files || []);
    if (!picked.length) return;

    Promise.all(
      picked.map(
        (file) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({
                name: file.name,
                type: file.type,
                size: file.size,
                url: reader.result,
              });
            reader.onerror = reject;
            reader.readAsDataURL(file);
          })
      )
    )
      .then((items) => {
        setDetailForm((prev) => ({
          ...prev,
          packagingPhotos: [...(Array.isArray(prev.packagingPhotos) ? prev.packagingPhotos : []), ...items],
        }));
      })
      .catch((err) => {
        console.error(err);
        alert("Failed to read selected photo(s).");
      });
  };

  const packagingPhotoCount = () =>
    Array.isArray(detailForm?.packagingPhotos) ? detailForm.packagingPhotos.length : 0;

  const getPackagingPhotoUrl = (photo) => {
    if (!photo) return "";
    return String(photo.url || photo.dataUrl || photo.preview || photo.src || "").trim();
  };

  const openPackagingPhoto = (photo) => {
    const url = getPackagingPhotoUrl(photo);
    if (!url) {
      alert("No photo found.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const openPackagingPhotoViewerAt = (idx = 0) => {
    const photos = Array.isArray(detailForm?.packagingPhotos) ? detailForm.packagingPhotos : [];
    if (!photos.length) {
      alert("No photos yet.");
      return;
    }
    const safeIdx = Math.max(0, Math.min(Number(idx) || 0, photos.length - 1));
    setPackagingPhotoViewerIndex(safeIdx);
  };

  const closePackagingPhotoViewer = () => setPackagingPhotoViewerIndex(-1);

  const showPrevPackagingPhoto = () => {
    const photos = Array.isArray(detailForm?.packagingPhotos) ? detailForm.packagingPhotos : [];
    if (!photos.length) return;
    setPackagingPhotoViewerIndex((prev) => {
      const current = Number.isFinite(prev) ? prev : 0;
      return (current - 1 + photos.length) % photos.length;
    });
  };

  const showNextPackagingPhoto = () => {
    const photos = Array.isArray(detailForm?.packagingPhotos) ? detailForm.packagingPhotos : [];
    if (!photos.length) return;
    setPackagingPhotoViewerIndex((prev) => {
      const current = Number.isFinite(prev) ? prev : 0;
      return (current + 1) % photos.length;
    });
  };

  const openPromoPhoto = (photo) => {
    const url = getPromoPhotoUrl(photo);
    if (!url) {
      alert("No photo found.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const openPromoPhotoViewerAt = (idx = 0) => {
    const photos = Array.isArray(detailForm?.promoPhotos) ? detailForm.promoPhotos : [];
    if (!photos.length) {
      alert("No photos yet.");
      return;
    }
    const safeIdx = Math.max(0, Math.min(Number(idx) || 0, photos.length - 1));
    setPromoPhotoViewerIndex(safeIdx);
  };

  const closePromoPhotoViewer = () => setPromoPhotoViewerIndex(-1);

  const showPrevPromoPhoto = () => {
    const photos = Array.isArray(detailForm?.promoPhotos) ? detailForm.promoPhotos : [];
    if (!photos.length) return;
    setPromoPhotoViewerIndex((prev) => {
      const current = Number.isFinite(prev) ? prev : 0;
      return (current - 1 + photos.length) % photos.length;
    });
  };

  const showNextPromoPhoto = () => {
    const photos = Array.isArray(detailForm?.promoPhotos) ? detailForm.promoPhotos : [];
    if (!photos.length) return;
    setPromoPhotoViewerIndex((prev) => {
      const current = Number.isFinite(prev) ? prev : 0;
      return (current + 1) % photos.length;
    });
  };

  const triggerAddTacsPhotos = () => {
    if (tacsPhotoInputRef.current) tacsPhotoInputRef.current.click();
  };

  const onPickTacsPhotos = (files) => {
    const picked = Array.from(files || []);
    if (!picked.length) return;

    Promise.all(
      picked.map(
        (file) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({
                name: file.name,
                type: file.type,
                size: file.size,
                url: reader.result,
              });
            reader.onerror = reject;
            reader.readAsDataURL(file);
          })
      )
    )
      .then((items) => {
        setDetailForm((prev) => ({
          ...prev,
          tacsPhotos: [
            ...(Array.isArray(prev.tacsPhotos) ? prev.tacsPhotos : []),
            ...items,
          ],
        }));
      })
      .catch((err) => {
        console.error(err);
        alert("Failed to read selected photo(s).");
      });
  };

  const tacsPhotoCount = () =>
    Array.isArray(detailForm?.tacsPhotos) ? detailForm.tacsPhotos.length : 0;

  const getTacsPhotoUrl = (photo) => {
    if (!photo) return "";
    return String(photo.url || photo.dataUrl || photo.preview || photo.src || "").trim();
  };

  const openTacsPhoto = (photo) => {
    const url = getTacsPhotoUrl(photo);
    if (!url) {
      alert("No photo found.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const openTacsPhotoViewerAt = (idx = 0) => {
    const photos = Array.isArray(detailForm?.tacsPhotos) ? detailForm.tacsPhotos : [];
    if (!photos.length) {
      alert("No photos yet.");
      return;
    }
    const safeIdx = Math.max(0, Math.min(Number(idx) || 0, photos.length - 1));
    setTacsPhotoViewerIndex(safeIdx);
  };

  const closeTacsPhotoViewer = () => setTacsPhotoViewerIndex(-1);

  const showPrevTacsPhoto = () => {
    const photos = Array.isArray(detailForm?.tacsPhotos) ? detailForm.tacsPhotos : [];
    if (!photos.length) return;
    setTacsPhotoViewerIndex((prev) => {
      const current = Number.isFinite(prev) ? prev : 0;
      return (current - 1 + photos.length) % photos.length;
    });
  };

  const showNextTacsPhoto = () => {
    const photos = Array.isArray(detailForm?.tacsPhotos) ? detailForm.tacsPhotos : [];
    if (!photos.length) return;
    setTacsPhotoViewerIndex((prev) => {
      const current = Number.isFinite(prev) ? prev : 0;
      return (current + 1) % photos.length;
    });
  };

  // ===== MAP: load GeoJSON =====
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
  const [tableFilterSearch, setTableFilterSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [serverTotalPages, setServerTotalPages] = useState(1);
  const [serverTotal, setServerTotal] = useState(0);

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

  // Load storage
  const fetchProjects = async (pageArg = currentPage) => {
    try {
      const params = {
        page: pageArg,
        limit: ITEMS_PER_PAGE,
      };

      if (debouncedSearch) params.search = debouncedSearch;
      if (tableFilterYear !== "ALL") params.year = tableFilterYear;
      if (tableFilterDistrict !== "ALL") params.district = tableFilterDistrict;
      if (tableFilterMonth !== "ALL") params.month = tableFilterMonth;
      if (tableFilterMunicipality !== "ALL") params.municipality = tableFilterMunicipality;
      if (tableFilterStatus !== "ALL") params.status = tableFilterStatus;

      const res = await axios.get(`${API}/cest`, { params });
      const payload = res?.data || {};
      const rows = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(res?.data)
          ? res.data
          : [];

      const normalized = rows.map((p) => {
        const municipality =
          p?.addressMeta?.municipality ||
          p?.address_municipality ||
          (() => {
            const addr = String(p?.address || "").trim();
            if (!addr) return "";
            const parts = addr.split(",").map((s) => s.trim()).filter(Boolean);
            return parts.length >= 2 ? parts[parts.length - 2] : "";
          })();

        const district =
          PANGASINAN_DISTRICTS.find((d) =>
            d.municipalities.includes(String(municipality || "").trim())
          )?.id || "";

        return {
          id: p.id,
          quarter: String(p.quarter || "1"),
          type: p.type || "New Communities",
          projectTitle: p.projectTitle || p.project_title || "",
          dateProjectApproval: p.dateProjectApproval || p.date_approved || "",
          approvedProjectCost: Number(p.approvedProjectCost ?? p.amount ?? 0),
          dateFundRelease: p.dateFundRelease || p.date_fund_release || "",
          associationName: p.associationName || p.firmName || p.firm_name || "",
          address: p.address || "",
          addressMeta: p.addressMeta || null,
          lguNumbersOfCommunities:
            p.lguNumbersOfCommunities ?? p.lgu_numbers_of_communities ?? "",
          numberOfMoa: Number(p.numberOfMoa ?? p.number_of_moa ?? 0),
          projectProponent: p.projectProponent || "",
          sex: p.sex || "",
          processSystem: p.processSystem || "",
          staffName: p.staffName || p.nameOfStaff || p.staff_name || "",
          communitiesAssisted: Number(p.communitiesAssisted ?? 0),
          technologiesDeployed: Number(p.technologiesDeployed ?? 0),
          beneficiaries: Number(p.beneficiaries ?? 0),
          pressRelease: Number(p.pressRelease ?? p.press_release ?? 0),
          startupsAssisted:
            p.startupsAssisted === null || p.startupsAssisted === undefined
              ? ""
              : String(p.startupsAssisted),
          jobsGenerated: Number(p.jobsGenerated ?? 0),
          customFields:
            typeof (p.customFields ?? p.custom_fields ?? {}) === "string"
              ? (() => {
                try {
                  return JSON.parse(p.customFields ?? p.custom_fields ?? "{}");
                } catch {
                  return {};
                }
              })()
              : p.customFields ?? p.custom_fields ?? {},
          custom_fields:
            typeof (p.custom_fields ?? p.customFields ?? {}) === "string"
              ? (() => {
                try {
                  return JSON.parse(p.custom_fields ?? p.customFields ?? "{}");
                } catch {
                  return {};
                }
              })()
              : p.custom_fields ?? p.customFields ?? {},
          district,
          interventions: Array.isArray(p.interventions) ? p.interventions : [],
        };
      });

      setProjects(normalized);
      setServerTotalPages(Math.max(1, Number(payload?.totalPages || 1)));
      setServerTotal(Number(payload?.total || normalized.length || 0));
    } catch (err) {
      console.error(err);
      setProjects([]);
      setServerTotalPages(1);
      setServerTotal(0);
      alert("Failed to load CEST projects from server.");
    }
  };

  useEffect(() => {
    fetchProjects(currentPage);
  }, [
    currentPage,
    debouncedSearch,
    tableFilterYear,
    tableFilterDistrict,
    tableFilterMonth,
    tableFilterMunicipality,
    tableFilterStatus,
  ]);
  useEffect(() => {
    let cancelled = false;

    const fixedKeys = new Set([
      "no",
      "actions",
      "coordinates",
      "quarter",
      "type",
      "projectTitle",
      "project_title",
      "dateProjectApproval",
      "date_project_approval",
      "dateApproved",
      "date_approved",
      "approvedProjectCost",
      "approved_project_cost",
      "amount",
      "dateFundRelease",
      "date_fund_release",
      "associationName",
      "association_name",
      "firmName",
      "firm_name",
      "address",
      "addressMeta",
      "address_meta",
      "lguNumbersOfCommunities",
      "lgu_numbers_of_communities",
      "numberOfMoa",
      "number_of_moa",
      "projectProponent",
      "project_proponent",
      "sex",
      "processSystem",
      "process_system",
      "staffName",
      "staff_name",
      "communitiesAssisted",
      "communities_assisted",
      "technologiesDeployed",
      "technologies_deployed",
      "beneficiaries",
      "pressRelease",
      "press_release",
      "startupsAssisted",
      "startups_assisted",
      "jobsGenerated",
      "jobs_generated",
      "district",
      "interventions",
    ]);

    async function loadCestCustomFields() {
      try {
        const res = await axios.get(`${API}/table-management/config`);
        const modules = Array.isArray(res.data) ? res.data : [];

        const cestModule = modules.find(
          (m) => String(m.moduleName || m.module_name || m.name || "").toUpperCase() === "CEST"
        );

        const tables = Array.isArray(cestModule?.tables) ? cestModule.tables : [];
        const mainTable =
          tables.find((t) =>
            ["main", "projects", "project", "cest"].includes(
              String(t.tableName || t.table_name || t.name || "").toLowerCase()
            )
          ) || tables[0];

        const fields = Array.isArray(mainTable?.fields)
          ? mainTable.fields
          : Array.isArray(cestModule?.fields)
            ? cestModule.fields
            : Array.isArray(cestModule?.formFields)
              ? cestModule.formFields
              : [];

        const customFields = fields
          .filter((f) => {
            const key = String(f.fieldKey || f.field_key || f.key || "").trim();
            const visible = f.isVisible ?? f.is_visible ?? f.visible ?? true;
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

        if (!cancelled) setCestCustomFields(customFields);
      } catch (err) {
        console.error("Failed to load CEST custom fields:", err);
        if (!cancelled) setCestCustomFields([]);
      }
    }

    loadCestCustomFields();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load GeoJSON files
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

  // ESC closes modals
  useEffect(() => {
    if (!detailFor) {
      setPromoPhotoViewerIndex(-1);
      setPackagingPhotoViewerIndex(-1);
      setTacsPhotoViewerIndex(-1);
    }
  }, [detailFor]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setPickForId(null);
        setDetailFor(null);
        setShowAdd(false);
        setEditProjectId(null);
        setViewProjectId(null);
        setAddressFlowOpen(false);
        setAddressViewForProjectId(null);
        setPromoPhotoViewerIndex(-1);
        setPackagingPhotoViewerIndex(-1);
        setTacsPhotoViewerIndex(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const saveProjects = (next) => {
    setProjects(next);
  };

  const resetForm = () => {
    setForm({
      quarter: "1",
      type: "New Communities",
      projectTitle: "",
      dateProjectApproval: "",
      approvedProjectCost: "",
      dateFundRelease: "",
      associationName: "",
      address: "",
      addressMeta: null,
      lguNumbersOfCommunities: "",
      numberOfMoa: "",
      projectProponent: "",
      sex: "",
      processSystem: "",
      meansOfVerification: "",
      movPhotos: [],
      staffName: "",
      communitiesAssisted: "",
      technologiesDeployed: "",
      beneficiaries: "",
      startupsAssisted: "",
      jobsGenerated: "",
      customFields: {},
    });
  };

  const resetDetailForm = (type = "") => {
    const isTech = type === "Tech Roll Out";
    const isTraining = type === "Training";
    const isPromoLike = type === "Tech Promo" || type === "S&T Promo";
    const isTacs = type === "TACS";
    const isPackaging = type === "Packaging & Labeling";
    const isCalibration = type === "Calibration";

    setDetailForm({
      type: type || "",
      title: "",
      date: "",
      venue: "",
      noOfFirms: "",
      male: "",
      female: "",
      total: "",
      projectProgramUnit: "",
      notes: "",
      techRows: isTech ? makeDefaultTechRows() : [],

      packagingQuarter: isPackaging ? "" : "",
      packagingProvince: isPackaging ? "Pangasinan" : "Pangasinan",
      packagingDateCompleted: isPackaging ? "" : "",
      packagingTypeOfIntervention: isPackaging ? "Label Design" : "Label Design",
      packagingProductName: isPackaging ? "" : "",
      packagingSizeVariant: isPackaging ? "" : "",
      packagingMaterialsProvided: isPackaging ? "" : "",
      packagingCustomerName: isPackaging ? "" : "",
      packagingSex: isPackaging ? "" : "",
      packagingFirmInstitution: isPackaging ? "" : "",
      packagingAddress: isPackaging ? "" : "",
      packagingAddressMeta: null,
      packagingMeansVerification: isPackaging ? "" : "",
      packagingPhotos: [],

      trainingProgram: isTraining ? "" : "",
      trainingProvince: "PANGASINAN",
      trainingStartDate: isTraining ? "" : "",
      trainingEndDate: isTraining ? "" : "",
      trainingVenueAddress: isTraining ? "" : "",
      trainingVenueAddressMeta: null,
      trainingParticipantsFemale: isTraining ? "" : "",
      trainingParticipantsMale: isTraining ? "" : "",
      trainingSeniorFemale: isTraining ? "" : "",
      trainingSeniorMale: isTraining ? "" : "",
      trainingIpFemale: isTraining ? "" : "",
      trainingIpMale: isTraining ? "" : "",
      trainingFourPsFemale: isTraining ? "" : "",
      trainingFourPsMale: isTraining ? "" : "",
      trainingPwdFemale: isTraining ? "" : "",
      trainingPwdMale: isTraining ? "" : "",
      trainingFirmsSucsHeisLgusCount: isTraining ? "" : "",
      trainingFirmsAssociationsList: isTraining ? "" : "",
      trainingTrainorAffiliation: isTraining ? "" : "",
      trainingCostDost: isTraining ? "" : "",
      trainingCostPartnerAgency: isTraining ? "" : "",

      promoProject: isPromoLike ? "CEST" : "",
      promoActivityDate: isPromoLike ? "" : "",
      promoTechnologyPromoted: isPromoLike ? "" : "",
      promoTechnologyGenerator: isPromoLike ? "" : "",
      promoModeOfPromotion: isPromoLike ? "Social Media" : "Social Media",
      promoActivityTitle: isPromoLike ? "" : "",
      promoActivityVenueAddress: isPromoLike ? "" : "",
      promoActivityVenueMeta: null,
      promoCustomerName: isPromoLike ? "" : "",
      promoCustomerAddress: isPromoLike ? "" : "",
      promoCustomerAddressMeta: null,
      promoSex: isPromoLike ? "N/A" : "N/A",
      promoStaffName: isPromoLike ? "" : "",
      promoMeansVerification: isPromoLike ? "" : "",
      promoPhotos: [],

      calibrationCategory: isCalibration ? "PAYING" : "PAYING",
      calibrationDate: isCalibration ? "" : "",
      calibrationTypeOfSample: isCalibration ? "Weighing Scale" : "Weighing Scale",
      calibrationTestType: isCalibration ? "Mass Calibration" : "Mass Calibration",
      calibrationNoOfSample: isCalibration ? "" : "",
      calibrationRange: isCalibration ? "" : "",
      calibrationCost: isCalibration ? "" : "",
      calibrationFeesCollected: isCalibration ? "" : "",
      calibrationMcBreakdown: isCalibration ? [makeCalibrationBreakdownRow()] : [makeCalibrationBreakdownRow()],
      calibrationBarangay: isCalibration ? "" : "",
      calibrationAddress: isCalibration ? "" : "",
      calibrationAddressMeta: null,
      calibrationFemale: isCalibration ? "" : "",
      calibrationMale: isCalibration ? "" : "",
      calibrationTotalCustomers: isCalibration ? "" : "",
      calibrationNoOfFirms: isCalibration ? "" : "",
      calibrationNoOfNewFirms: isCalibration ? "" : "",
      calibrationAgeRange: isCalibration ? "" : "",
      calibrationPwd: isCalibration ? "" : "",
      calibrationIp: isCalibration ? "" : "",
      calibrationSc: isCalibration ? "" : "",
      calibrationFourPs: isCalibration ? "" : "",

      consultancyType: isTacs ? "" : "",
      dateEngagement: isTacs ? "" : "",
      expertInstitution: isTacs ? "" : "",
      customerName: isTacs ? "" : "",
      customerSex: isTacs ? "" : "",
      customerAddress: isTacs ? "" : "",
      customerAddressMeta: null,
      meansVerification: isTacs ? "" : "",
      noOfAdvice: isTacs ? "" : "",
      tacsPhotos: [],
    });
  };

  // ===== PROJECT CRUD =====
  const openAddProject = () => {
    if (!allowAdd) {
      alert("You do not have permission to add CEST projects.");
      return;
    }

    setEditProjectId(null);
    resetForm();
    setShowAdd(true);
  };

  const openEditProject = (id) => {
    if (!allowEdit) {
      alert("You do not have permission to edit CEST projects.");
      return;
    }

    const p = projects.find((x) => x.id === id);
    if (!p) return;

    setEditProjectId(id);
    setForm({
      quarter: String(p.quarter || "1"),
      type: p.type || "New Communities",
      projectTitle: p.projectTitle || "",
      dateProjectApproval: p.dateProjectApproval || "",
      approvedProjectCost: p.approvedProjectCost ?? "",
      dateFundRelease: p.dateFundRelease || "",
      associationName: p.associationName || "",
      address: p.address || "",
      addressMeta: p.addressMeta || null,
      lguNumbersOfCommunities: p.lguNumbersOfCommunities ?? "",
      numberOfMoa: p.numberOfMoa ?? "",
      projectProponent: p.projectProponent || "",
      sex: p.sex || "",
      processSystem: p.processSystem || "",
      meansOfVerification: p.meansOfVerification || p.means_of_verification || "",
      movPhotos: Array.isArray(p.movPhotos) ? p.movPhotos : Array.isArray(p.mov_photos) ? p.mov_photos : [],
      staffName: p.staffName || "",
      communitiesAssisted: p.communitiesAssisted ?? "",
      technologiesDeployed: p.technologiesDeployed ?? "",
      beneficiaries: p.beneficiaries ?? "",
      startupsAssisted:
        p.startupsAssisted === null || p.startupsAssisted === undefined
          ? ""
          : String(p.startupsAssisted),
      jobsGenerated:
        p.jobsGenerated === null || p.jobsGenerated === undefined
          ? ""
          : String(p.jobsGenerated),
      customFields: p.customFields || p.custom_fields || {},
    });

    setShowAdd(true);
  };

  const saveProject = async () => {
    if (editProjectId && !allowEdit) {
      alert("You do not have permission to edit CEST projects.");
      return;
    }

    if (!editProjectId && !allowAdd) {
      alert("You do not have permission to add CEST projects.");
      return;
    }

    if (!form.projectTitle.trim()) return alert("Required: Project Title");
    if (!form.dateProjectApproval) return alert("Required: Date of Project Approval");
    if (form.approvedProjectCost === "" || Number.isNaN(Number(form.approvedProjectCost))) {
      return alert("Required: Approved Project Cost (number)");
    }
    if (!form.address.trim()) return alert("Required: Venue/Address");
    if (!form.projectProponent.trim()) return alert("Required: Name of Project Proponent");

    const payload = {
      quarter: String(form.quarter || "1"),
      type: (form.type || "New Communities").trim(),
      projectTitle: form.projectTitle.trim(),
      dateProjectApproval: form.dateProjectApproval || "",
      approvedProjectCost: toNumber(form.approvedProjectCost),
      dateFundRelease: form.dateFundRelease || "",
      associationName: form.associationName.trim(),
      address: form.address.trim(),
      addressMeta: form.addressMeta || null,
      lguNumbersOfCommunities: String(form.lguNumbersOfCommunities || "").trim(),
      numberOfMoa: toNumber(form.numberOfMoa),
      projectProponent: form.projectProponent.trim(),
      sex: (form.sex || "").trim(),
      processSystem: (form.processSystem || "").trim(),
      meansOfVerification: (form.meansOfVerification || "").trim(),
      means_of_verification: (form.meansOfVerification || "").trim(),
      movPhotos: Array.isArray(form.movPhotos) ? form.movPhotos : [],
      mov_photos: Array.isArray(form.movPhotos) ? form.movPhotos : [],
      staffName: (form.staffName || "").trim(),
      communitiesAssisted: toNumber(form.communitiesAssisted),
      technologiesDeployed: toNumber(form.technologiesDeployed),
      beneficiaries: toNumber(form.beneficiaries),
      startupsAssisted: String(form.startupsAssisted || "").trim(),
      jobsGenerated: toNumber(form.jobsGenerated),
      custom_fields: form.customFields || {},
      customFields: form.customFields || {},
    };

    try {
      if (!editProjectId) {
        await axios.post(`${API}/cest`, payload);
      } else {
        await axios.put(`${API}/cest/${editProjectId}`, payload);
      }

      await fetchProjects();
      setShowAdd(false);
      setEditProjectId(null);
      resetForm();
    } catch (err) {
      console.error(err);
      alert("Failed to save project.");
    }
  };


  const deleteProject = async (id) => {
    if (!allowDelete) {
      alert("You do not have permission to delete CEST projects.");
      return;
    }

    if (!(await requestDeleteConfirm("Delete this project?"))) return;

    try {
      await axios.delete(`${API}/cest/${id}`);
      await fetchProjects();
    } catch (err) {
      console.error(err);
      alert("Failed to delete project.");
    }
  };

  // ===== INTERVENTION CRUD =====
  const openInterventionPicker = (projectId) => {
    if (!allowAdd) {
      alert("You do not have permission to add CEST interventions.");
      return;
    }

    setPickForId(projectId);
  };

  const openInterventionDetails_Add = (projectId, type) => {
    if (!allowAdd) {
      alert("You do not have permission to add CEST interventions.");
      return;
    }

    setPickForId(null);
    resetDetailForm(type);
    setDetailFor({ projectId, mode: "add" });
  };

  const openInterventionDetails_Edit = (projectId, entryId) => {
    if (!allowEdit) {
      alert("You do not have permission to edit CEST interventions.");
      return;
    }

    const p = projects.find((x) => x.id === projectId);
    const entry = p?.interventions?.find((x) => x.id === entryId);
    if (!p || !entry) return;

    const type = entry.type || "";
    const isTech = type === "Tech Roll Out";
    const isTraining = type === "Training";
    const isPromoLike = type === "Tech Promo" || type === "S&T Promo";
    const isTrainingLike = isTraining || isPromoLike;
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

    let packagingQuarter = "";
    let packagingProvince = "Pangasinan";
    let packagingDateCompleted = entry.date || "";
    let packagingTypeOfIntervention = "Label Design";
    let packagingProductName = "";
    let packagingSizeVariant = "";
    let packagingMaterialsProvided = "";
    let packagingCustomerName = "";
    let packagingSex = "";
    let packagingFirmInstitution = "";
    let packagingAddress = entry.venue || "";
    let packagingAddressMeta = null;
    let packagingMeansVerification = "";
    let packagingPhotos = [];
    let packagingRemarks = entry.notes || "";

    let trainingProgram = "";
    let trainingProvince = "PANGASINAN";
    let trainingStartDate = entry.date || "";
    let trainingEndDate = "";
    let trainingVenueAddress = entry.venue || "";
    let trainingVenueAddressMeta = null;
    let trainingNoOfFirms = entry.noOfFirms ?? "";
    let trainingParticipantsFemale = "";
    let trainingParticipantsMale = "";
    let trainingSeniorFemale = "";
    let trainingSeniorMale = "";
    let trainingIpFemale = "";
    let trainingIpMale = "";
    let trainingFourPsFemale = "";
    let trainingFourPsMale = "";
    let trainingPwdFemale = "";
    let trainingPwdMale = "";
    let trainingFirmsSucsHeisLgusCount = "";
    let trainingFirmsAssociationsList = "";
    let trainingTrainorAffiliation = "";
    let trainingProjectProgramUnit = "";
    let trainingCostDost = "";
    let trainingCostPartnerAgency = "";
    let trainingRemarks = entry.notes || "";
    let promoProject = "CEST";
    let promoActivityDate = entry.date || "";
    let promoTechnologyPromoted = "";
    let promoTechnologyGenerator = "";
    let promoModeOfPromotion = "Social Media";
    let promoActivityTitle = entry.title || "";
    let promoActivityVenueAddress = entry.venue || "";
    let promoActivityVenueMeta = null;
    let promoCustomerName = "";
    let promoCustomerAddress = "";
    let promoCustomerAddressMeta = null;
    let promoSex = "N/A";
    let promoStaffName = "";
    let promoMeansVerification = "";
    let promoPhotos = [];
    let tacsConsultancyType = "";
    let tacsDateEngagement = "";
    let tacsExpertInstitution = "";
    let tacsCustomerName = "";
    let tacsCustomerSex = "";
    let tacsCustomerAddress = "";
    let tacsCustomerAddressMeta = null;
    let tacsMeansVerification = "";
    let tacsNoOfAdvice = "";
    let tacsPhotos = [];
    let tacsRemarks = entry.notes || "";
    let calibrationCategory = "PAYING";
    let calibrationDate = entry.date || "";
    let calibrationTypeOfSample = "Weighing Scale";
    let calibrationTestType = "Mass Calibration";
    let calibrationNoOfSample = "";
    let calibrationRange = "";
    let calibrationCost = "";
    let calibrationFeesCollected = "";
    let calibrationMcBreakdown = [makeCalibrationBreakdownRow()];
    let calibrationBarangay = "";
    let calibrationAddress = entry.venue || "";
    let calibrationAddressMeta = null;
    let calibrationFemale = entry.female ?? "";
    let calibrationMale = entry.male ?? "";
    let calibrationTotalCustomers = entry.total ?? "";
    let calibrationNoOfFirms = entry.noOfFirms ?? "";
    let calibrationNoOfNewFirms = "";
    let calibrationAgeRange = "";
    let calibrationPwd = "";
    let calibrationIp = "";
    let calibrationSc = "";
    let calibrationFourPs = "";
    let calibrationRemarks = entry.notes || "";

    if (isCalibration) {
      try {
        const obj = JSON.parse(entry?.notes || "");
        if (obj && typeof obj === "object") {
          calibrationCategory = obj.category || "PAYING";
          calibrationDate = obj.date || entry.date || "";
          calibrationTypeOfSample = obj.typeOfSample || "Weighing Scale";
          calibrationTestType =
            obj.testType ||
            (calibrationTypeOfSample === "Bucket" ? "Volume Calibration" : "Mass Calibration");
          calibrationNoOfSample =
            obj.noOfSample === null || obj.noOfSample === undefined ? "" : String(obj.noOfSample);
          calibrationRange = obj.range || "";
          calibrationCost =
            obj.cost === null || obj.cost === undefined ? "" : String(obj.cost);
          calibrationFeesCollected =
            obj.feesCollected === null || obj.feesCollected === undefined
              ? ""
              : String(obj.feesCollected);
          calibrationMcBreakdown = Array.isArray(obj.mcBreakdown) && obj.mcBreakdown.length
            ? obj.mcBreakdown.map((row) => ({
              id: row?.id || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              range: row?.range || "",
              noOfSample:
                row?.noOfSample === null || row?.noOfSample === undefined
                  ? ""
                  : String(row.noOfSample),
              cost:
                row?.cost === null || row?.cost === undefined ? "" : String(row.cost),
              feesCollected:
                row?.feesCollected === null || row?.feesCollected === undefined
                  ? ""
                  : String(row.feesCollected),
              autoFilled: Boolean(row?.autoFilled),
            }))
            : [makeCalibrationBreakdownRow()];
          calibrationBarangay = obj.barangay || "";
          calibrationAddress = obj.address || entry.venue || "";
          calibrationAddressMeta = obj.addressMeta || null;
          calibrationFemale =
            obj.female === null || obj.female === undefined ? "" : String(obj.female);
          calibrationMale =
            obj.male === null || obj.male === undefined ? "" : String(obj.male);
          calibrationTotalCustomers =
            obj.totalCustomers === null || obj.totalCustomers === undefined
              ? ""
              : String(obj.totalCustomers);
          calibrationNoOfFirms =
            obj.noOfFirms === null || obj.noOfFirms === undefined ? "" : String(obj.noOfFirms);
          calibrationNoOfNewFirms =
            obj.noOfNewFirms === null || obj.noOfNewFirms === undefined
              ? ""
              : String(obj.noOfNewFirms);
          calibrationAgeRange = obj.ageRange || "";
          calibrationPwd =
            obj.pwd === null || obj.pwd === undefined ? "" : String(obj.pwd);
          calibrationIp =
            obj.ip === null || obj.ip === undefined ? "" : String(obj.ip);
          calibrationSc =
            obj.sc === null || obj.sc === undefined ? "" : String(obj.sc);
          calibrationFourPs =
            obj.fourPs === null || obj.fourPs === undefined ? "" : String(obj.fourPs);
          calibrationRemarks = obj.remarks || entry.notes || "";
        }
      } catch {
        calibrationRemarks = entry.notes || "";
      }
    }

    if (type === "Training") {
      try {
        const obj = JSON.parse(entry?.notes || "");
        if (obj && typeof obj === "object") {
          trainingProgram = obj.trainingProgram || "";
          trainingProvince = obj.trainingProvince || "PANGASINAN";
          trainingStartDate = obj.trainingStartDate || entry.date || "";
          trainingEndDate = obj.trainingEndDate || "";
          trainingVenueAddress = obj.trainingVenueAddress || entry.venue || "";
          trainingVenueAddressMeta = obj.trainingVenueAddressMeta || null;
          trainingNoOfFirms =
            obj.trainingNoOfFirms === null || obj.trainingNoOfFirms === undefined
              ? entry.noOfFirms ?? ""
              : String(obj.trainingNoOfFirms);
          trainingParticipantsFemale =
            obj.trainingParticipantsFemale === null || obj.trainingParticipantsFemale === undefined
              ? ""
              : String(obj.trainingParticipantsFemale);
          trainingParticipantsMale =
            obj.trainingParticipantsMale === null || obj.trainingParticipantsMale === undefined
              ? ""
              : String(obj.trainingParticipantsMale);
          trainingSeniorFemale = obj.trainingSeniorFemale === null || obj.trainingSeniorFemale === undefined ? "" : String(obj.trainingSeniorFemale);
          trainingSeniorMale = obj.trainingSeniorMale === null || obj.trainingSeniorMale === undefined ? "" : String(obj.trainingSeniorMale);
          trainingIpFemale = obj.trainingIpFemale === null || obj.trainingIpFemale === undefined ? "" : String(obj.trainingIpFemale);
          trainingIpMale = obj.trainingIpMale === null || obj.trainingIpMale === undefined ? "" : String(obj.trainingIpMale);
          trainingFourPsFemale = obj.trainingFourPsFemale === null || obj.trainingFourPsFemale === undefined ? "" : String(obj.trainingFourPsFemale);
          trainingFourPsMale = obj.trainingFourPsMale === null || obj.trainingFourPsMale === undefined ? "" : String(obj.trainingFourPsMale);
          trainingPwdFemale = obj.trainingPwdFemale === null || obj.trainingPwdFemale === undefined ? "" : String(obj.trainingPwdFemale);
          trainingPwdMale = obj.trainingPwdMale === null || obj.trainingPwdMale === undefined ? "" : String(obj.trainingPwdMale);
          trainingFirmsSucsHeisLgusCount = obj.trainingFirmsSucsHeisLgusCount === null || obj.trainingFirmsSucsHeisLgusCount === undefined ? "" : String(obj.trainingFirmsSucsHeisLgusCount);
          trainingFirmsAssociationsList = obj.trainingFirmsAssociationsList || "";
          trainingTrainorAffiliation = obj.trainingTrainorAffiliation || "";
          trainingProjectProgramUnit = obj.projectProgramUnit || "";
          trainingCostDost = obj.trainingCostDost === null || obj.trainingCostDost === undefined ? "" : String(obj.trainingCostDost);
          trainingCostPartnerAgency = obj.trainingCostPartnerAgency === null || obj.trainingCostPartnerAgency === undefined ? "" : String(obj.trainingCostPartnerAgency);
          trainingRemarks = typeof obj.remarks === "string" ? obj.remarks : entry.notes || "";
        }
      } catch {
        trainingRemarks = entry.notes || "";
        trainingProjectProgramUnit = "";
      }
    } else if (isPromoLike) {
      try {
        const obj = JSON.parse(entry?.notes || "");
        if (obj && typeof obj === "object") {
          promoProject = obj.project || "CEST";
          promoActivityDate = obj.activityDate || entry.date || "";
          promoTechnologyPromoted = obj.technologyPromoted || "";
          promoTechnologyGenerator = obj.technologyGenerator || "";
          promoModeOfPromotion = obj.modeOfPromotion || "Social Media";
          promoActivityTitle = obj.activityTitle || entry.title || "";
          promoActivityVenueAddress = obj.activityVenueAddress || entry.venue || "";
          promoActivityVenueMeta = obj.activityVenueMeta || null;
          promoCustomerName = obj.customerParticipantName || "";
          promoCustomerAddress = obj.customerParticipantAddress || "";
          promoCustomerAddressMeta = obj.customerParticipantAddressMeta || null;
          promoSex = obj.sex || "N/A";
          promoStaffName = obj.staffName || "";
          promoMeansVerification = obj.meansOfVerification || "";
          promoPhotos = Array.isArray(obj.photos) ? obj.photos : [];
          trainingProjectProgramUnit =
            typeof obj.projectProgramUnit === "string" ? obj.projectProgramUnit : "";
          trainingRemarks =
            typeof obj.remarks === "string" ? obj.remarks : entry.notes || "";
        }
      } catch {
        promoProject = "CEST";
        promoActivityDate = entry.date || "";
        promoTechnologyPromoted = entry.title || "";
        promoTechnologyGenerator = "";
        promoModeOfPromotion = "Social Media";
        promoActivityTitle = entry.title || "";
        promoActivityVenueAddress = entry.venue || "";
        promoActivityVenueMeta = null;
        promoCustomerName = "";
        promoCustomerAddress = "";
        promoCustomerAddressMeta = null;
        promoSex = "N/A";
        promoStaffName = "";
        promoMeansVerification = "";
        promoPhotos = [];
        trainingProjectProgramUnit = "";
        trainingRemarks = entry.notes || "";
      }
    }

    if (isPackaging) {
      packagingQuarter =
        entry?.packagingQuarter === null || entry?.packagingQuarter === undefined
          ? ""
          : String(entry.packagingQuarter || "");
      packagingProvince = entry?.packagingProvince || "Pangasinan";
      packagingDateCompleted =
        entry?.packagingDateCompleted || entry?.date || "";
      packagingTypeOfIntervention =
        entry?.packagingTypeOfIntervention || "Label Design";
      packagingProductName = entry?.packagingProductName || "";
      packagingSizeVariant = entry?.packagingSizeVariant || "";
      packagingMaterialsProvided = entry?.packagingMaterialsProvided || "";
      packagingCustomerName = entry?.packagingCustomerName || "";
      packagingSex = entry?.packagingSex || "";
      packagingFirmInstitution = entry?.packagingFirmInstitution || "";
      packagingAddress = entry?.packagingAddress || entry?.venue || "";
      packagingAddressMeta = entry?.packagingAddressMeta || null;
      packagingMeansVerification = entry?.packagingMeansVerification || "";
      packagingPhotos = Array.isArray(entry?.packagingPhotos) ? entry.packagingPhotos : [];
      packagingRemarks = entry?.packagingRemarks || "";

      if (
        !packagingQuarter &&
        !packagingProductName &&
        !packagingSizeVariant &&
        !packagingMaterialsProvided &&
        !packagingCustomerName &&
        !packagingFirmInstitution &&
        !packagingAddress &&
        (entry?.notes || "").trim().startsWith("{")
      ) {
        try {
          const obj = JSON.parse(entry?.notes || "");
          if (obj && typeof obj === "object") {
            packagingQuarter =
              obj.quarter === null || obj.quarter === undefined ? "" : String(obj.quarter);
            packagingProvince = obj.province || "Pangasinan";
            packagingDateCompleted =
              obj.dateCompletedExecuted || obj.dateCompleted || entry.date || "";
            packagingTypeOfIntervention =
              obj.packagingType || obj.typeOfIntervention || "Label Design";
            packagingProductName =
              obj.packagingProductName || obj.productName || "";
            packagingSizeVariant =
              obj.sizeVariantMaterial || obj.sizeVariant || "";
            packagingMaterialsProvided =
              obj.noOfPackagingMaterialsProvided ||
              obj.packagingMaterialsProvided ||
              "";
            packagingCustomerName =
              obj.packagingCustomerName || obj.customerName || "";
            packagingSex = obj.packagingSex || obj.sex || "";
            packagingFirmInstitution =
              obj.packagingFirmInstitution || obj.firmName || "";
            packagingAddress =
              obj.packagingAddress || obj.address || entry.venue || "";
            packagingAddressMeta =
              obj.packagingAddressMeta || obj.addressMeta || null;
            packagingMeansVerification =
              obj.packagingMeansVerification || obj.meansOfVerification || "";
            packagingPhotos = Array.isArray(obj.packagingPhotos)
              ? obj.packagingPhotos
              : Array.isArray(obj.photos)
                ? obj.photos
                : [];
            packagingRemarks =
              obj.packagingNotesRemarks ||
              obj.packagingRemarks ||
              obj.remarks ||
              "";
          }
        } catch { }
      }
    }

    if (isTacs) {
      try {
        const obj = JSON.parse(entry?.notes || "");
        if (obj && typeof obj === "object") {
          tacsConsultancyType = obj.consultancyType || entry.title || "";
          tacsDateEngagement = obj.dateEngagement || entry.date || "";
          tacsExpertInstitution = obj.expertInstitution || "";
          tacsCustomerName = obj.customerName || "";
          tacsCustomerSex = obj.customerSex || "";
          tacsCustomerAddress = obj.customerAddress || entry.venue || "";
          tacsCustomerAddressMeta = obj.customerAddressMeta || null;
          tacsMeansVerification = obj.meansVerification || "";
          tacsNoOfAdvice =
            obj.noOfAdvice === null || obj.noOfAdvice === undefined
              ? ""
              : String(obj.noOfAdvice);
          tacsPhotos = Array.isArray(obj.tacsPhotos)
            ? obj.tacsPhotos
            : Array.isArray(obj.photos)
              ? obj.photos
              : [];
          tacsRemarks = obj.remarks || "";
        }
      } catch {
        tacsConsultancyType = entry.title || "";
        tacsDateEngagement = entry.date || "";
        tacsCustomerAddress = entry.venue || "";
        tacsRemarks = entry.notes || "";
      }
    }

    setDetailFor({ projectId, mode: "edit", entryId });

    setDetailForm({
      type,
      title: entry.title || (isTrainingLike ? "" : type),
      date: entry.date || "",
      venue: entry.venue || "",
      noOfFirms: entry.noOfFirms ?? "",
      male: entry.male ?? "",
      female: entry.female ?? "",
      total: entry.total ?? "",
      projectProgramUnit: trainingProjectProgramUnit,
      notes: isTech
        ? parsedFreeText ?? ""
        : isTrainingLike
          ? trainingRemarks
          : isPackaging
            ? packagingRemarks
            : isTacs
              ? tacsRemarks
              : entry.notes || "",
      techRows: isTech
        ? Array.isArray(parsedRows) && parsedRows.length
          ? parsedRows.map((row) => ({
            quarter: row?.quarter || "",
            unitCenter: row?.unitCenter || "DOST-PANGASINAN",
            nameOfTechnologyTransferred:
              row?.nameOfTechnologyTransferred || row?.knowledgeTech || "",
            technologyGenerator:
              row?.technologyGenerator || row?.techGenerator || "",
            modeOfTransfer: row?.modeOfTransfer || row?.modeTransfer || "",
            isDostDevelopedFunded: Boolean(row?.isDostDevelopedFunded),
            dateTransferred: row?.dateTransferred || "",
            activityTitle: row?.activityTitle || "",
            activityDate: row?.activityDate || "",
            activityVenue:
              row?.activityVenue ||
              row?.activityDateVenue ||
              "",
            institutionName: row?.institutionName || "",
            institutionAddress:
              row?.institutionAddress ||
              row?.institutionNameAddress ||
              "",
            institutionAddressMeta: row?.institutionAddressMeta || null,
            classification: row?.classification || "",
            representativeName: row?.representativeName || "",
            representativeDesignation:
              row?.representativeDesignation ||
              row?.representativeNameDesignation ||
              "",
            sex: row?.sex || "",
          }))
          : makeDefaultTechRows()
        : [],

      packagingQuarter: isPackaging ? packagingQuarter : "",
      packagingProvince: isPackaging ? packagingProvince : "Pangasinan",
      packagingDateCompleted: isPackaging ? packagingDateCompleted : "",
      packagingTypeOfIntervention: isPackaging ? packagingTypeOfIntervention : "Label Design",
      packagingProductName: isPackaging ? packagingProductName : "",
      packagingSizeVariant: isPackaging ? packagingSizeVariant : "",
      packagingMaterialsProvided: isPackaging ? packagingMaterialsProvided : "",
      packagingCustomerName: isPackaging ? packagingCustomerName : "",
      packagingSex: isPackaging ? packagingSex : "",
      packagingFirmInstitution: isPackaging ? packagingFirmInstitution : "",
      packagingAddress: isPackaging ? packagingAddress : "",
      packagingAddressMeta: isPackaging ? packagingAddressMeta : null,
      packagingMeansVerification: isPackaging ? packagingMeansVerification : "",
      packagingPhotos: isPackaging ? packagingPhotos : [],

      trainingProgram,
      trainingProvince,
      trainingStartDate,
      trainingEndDate,
      trainingVenueAddress,
      trainingVenueAddressMeta,
      trainingParticipantsFemale,
      trainingParticipantsMale,
      trainingSeniorFemale,
      trainingSeniorMale,
      trainingIpFemale,
      trainingIpMale,
      trainingFourPsFemale,
      trainingFourPsMale,
      trainingPwdFemale,
      trainingPwdMale,
      trainingFirmsSucsHeisLgusCount,
      trainingFirmsAssociationsList,
      trainingTrainorAffiliation,
      trainingCostDost,
      trainingCostPartnerAgency,

      promoProject: isTrainingLike && !isTraining ? promoProject : "",
      promoActivityDate: isTrainingLike && !isTraining ? promoActivityDate : "",
      promoTechnologyPromoted: isTrainingLike && !isTraining ? promoTechnologyPromoted : "",
      promoTechnologyGenerator: isTrainingLike && !isTraining ? promoTechnologyGenerator : "",
      promoModeOfPromotion: isTrainingLike && !isTraining ? promoModeOfPromotion : "Social Media",
      promoActivityTitle: isTrainingLike && !isTraining ? promoActivityTitle : "",
      promoActivityVenueAddress: isTrainingLike && !isTraining ? promoActivityVenueAddress : "",
      promoActivityVenueMeta: isTrainingLike && !isTraining ? promoActivityVenueMeta : null,
      promoCustomerName: isTrainingLike && !isTraining ? promoCustomerName : "",
      promoCustomerAddress: isTrainingLike && !isTraining ? promoCustomerAddress : "",
      promoCustomerAddressMeta: isTrainingLike && !isTraining ? promoCustomerAddressMeta : null,
      promoSex: isTrainingLike && !isTraining ? promoSex : "N/A",
      promoStaffName: isTrainingLike && !isTraining ? promoStaffName : "",
      promoMeansVerification: isTrainingLike && !isTraining ? promoMeansVerification : "",
      promoPhotos: isTrainingLike && !isTraining ? promoPhotos : [],

      calibrationCategory: isCalibration ? calibrationCategory : "PAYING",
      calibrationDate: isCalibration ? calibrationDate : "",
      calibrationTypeOfSample: isCalibration ? calibrationTypeOfSample : "Weighing Scale",
      calibrationTestType: isCalibration ? calibrationTestType : "Mass Calibration",
      calibrationNoOfSample: isCalibration ? calibrationNoOfSample : "",
      calibrationRange: isCalibration ? calibrationRange : "",
      calibrationCost: isCalibration ? calibrationCost : "",
      calibrationFeesCollected: isCalibration ? calibrationFeesCollected : "",
      calibrationMcBreakdown: isCalibration ? calibrationMcBreakdown : [makeCalibrationBreakdownRow()],
      calibrationBarangay: isCalibration ? calibrationBarangay : "",
      calibrationAddress: isCalibration ? calibrationAddress : "",
      calibrationAddressMeta: isCalibration ? calibrationAddressMeta : null,
      calibrationFemale: isCalibration ? calibrationFemale : "",
      calibrationMale: isCalibration ? calibrationMale : "",
      calibrationTotalCustomers: isCalibration ? calibrationTotalCustomers : "",
      calibrationNoOfFirms: isCalibration ? calibrationNoOfFirms : "",
      calibrationNoOfNewFirms: isCalibration ? calibrationNoOfNewFirms : "",
      calibrationAgeRange: isCalibration ? calibrationAgeRange : "",
      calibrationPwd: isCalibration ? calibrationPwd : "",
      calibrationIp: isCalibration ? calibrationIp : "",
      calibrationSc: isCalibration ? calibrationSc : "",
      calibrationFourPs: isCalibration ? calibrationFourPs : "",

      consultancyType: isTacs ? tacsConsultancyType : "",
      dateEngagement: isTacs ? tacsDateEngagement : "",
      expertInstitution: isTacs ? tacsExpertInstitution : "",
      customerName: isTacs ? tacsCustomerName : "",
      customerSex: isTacs ? tacsCustomerSex : "",
      customerAddress: isTacs ? tacsCustomerAddress : "",
      customerAddressMeta: isTacs ? tacsCustomerAddressMeta : null,
      meansVerification: isTacs ? tacsMeansVerification : "",
      noOfAdvice: isTacs ? tacsNoOfAdvice : "",
      tacsPhotos: isTacs ? tacsPhotos : [],
    });
  };

  const deleteIntervention = async (projectId, entryId) => {
    if (!allowDelete) {
      alert("You do not have permission to delete CEST interventions.");
      return;
    }

    if (!(await requestDeleteConfirm("Delete this intervention entry?"))) return;

    try {
      await axios.delete(`${API}/cest-interventions/${entryId}`);

      setSelectedInterventionByProject((prev) => {
        if (prev[projectId] !== entryId) return prev;
        const { [projectId]: _, ...rest } = prev;
        return rest;
      });

      await fetchProjects();
    } catch (err) {
      console.error(err);
      alert("Failed to delete intervention.");
    }
  };

  const saveInterventionDetails = async () => {
    if (!detailFor) return;

    if (detailFor.mode === "edit" && !allowEdit) {
      alert("You do not have permission to edit CEST interventions.");
      return;
    }

    if (detailFor.mode === "add" && !allowAdd) {
      alert("You do not have permission to add CEST interventions.");
      return;
    }

    const type = (detailForm.type || "").trim();
    const isTech = type === "Tech Roll Out";
    const isTraining = type === "Training";
    const isPromoLike = type === "Tech Promo" || type === "S&T Promo";
    const isTrainingLike =
      type === "Training" ||
      type === "Tech Promo" ||
      type === "S&T Promo";
    const isTacs = type === "TACS";
    const isPackaging = type === "Packaging & Labeling";
    const isCalibration = type === "Calibration";

    if (!type) return alert("Missing intervention type");

    if (isTech) {
      const rows = Array.isArray(detailForm.techRows) ? detailForm.techRows : [];
      const firstRow = rows[0] || {};
      const hasValidRow = rows.some(
        (r) =>
          (r?.nameOfTechnologyTransferred || "").trim() ||
          (r?.activityTitle || "").trim() ||
          (r?.institutionName || "").trim()
      );

      if (!hasValidRow) {
        return alert("Required: at least one Tech Roll Out row");
      }

      if (!(firstRow?.quarter || "").trim()) return alert("Required: Quarter");
      if (!(firstRow?.unitCenter || "").trim()) return alert("Required: Unit/Center");
      if (!(firstRow?.nameOfTechnologyTransferred || "").trim()) return alert("Required: Name of Knowledge/Technology Transferred");
      if (!(firstRow?.technologyGenerator || "").trim()) return alert("Required: Technology Generator");
      if (!(firstRow?.modeOfTransfer || "").trim()) return alert("Required: Mode of Transfer");
      if (!(firstRow?.dateTransferred || "").trim()) return alert("Required: Date Transferred");
      if (!(firstRow?.activityTitle || "").trim()) return alert("Required: Activity Title");
      if (!(firstRow?.activityDate || "").trim()) return alert("Required: Activity Date");
      if (!(firstRow?.institutionName || "").trim()) return alert("Required: Institution Name");
      if (!(firstRow?.institutionAddress || "").trim()) return alert("Required: Institution Address");
      if (!(firstRow?.classification || "").trim()) return alert("Required: Classification");
      if (!(firstRow?.representativeName || "").trim()) return alert("Required: Representative Name");
    }

    if (isTraining && !(detailForm.title || "").trim()) {
      return alert("Required: Training Title");
    }
    if (isTraining && !(detailForm.trainingStartDate || "").trim()) {
      return alert("Required: Start Date");
    }
    if (isTraining && !(detailForm.trainingVenueAddress || "").trim()) {
      return alert("Required: Venue/Address");
    }
    if (isPackaging && !(detailForm.packagingQuarter || "").trim()) {
      return alert("Required: Quarter");
    }
    if (isPackaging && !(detailForm.packagingDateCompleted || "").trim()) {
      return alert("Required: Date Completed/Executed");
    }
    if (isPackaging && !(detailForm.packagingTypeOfIntervention || "").trim()) {
      return alert("Required: Type of Intervention");
    }
    if (isPackaging && !(detailForm.packagingSizeVariant || "").trim()) {
      return alert("Required: Size/Variant of Label Design/Type of Packaging Material");
    }
    if (isPackaging && !(detailForm.packagingMaterialsProvided || "").trim()) {
      return alert("Required: No. of Packaging Materials Provided");
    }
    if (isPackaging && !(detailForm.packagingCustomerName || "").trim()) {
      return alert("Required: Name of Customer");
    }
    if (isPackaging && !(detailForm.packagingFirmInstitution || "").trim()) {
      return alert("Required: Name of Firm/Institution");
    }
    if (isPackaging && !(detailForm.packagingAddress || "").trim()) {
      return alert("Required: Venue/Address");
    }
    if (isPromoLike && !(detailForm.promoTechnologyPromoted || "").trim()) {
      return alert(`Required: ${type} - Technology Promoted`);
    }
    if (isPromoLike && !(detailForm.promoTechnologyGenerator || "").trim()) {
      return alert(`Required: ${type} - Technology Generator`);
    }
    if (isPromoLike && !(detailForm.promoActivityTitle || "").trim()) {
      return alert(`Required: ${type} - Activity Title`);
    }
    if (isPromoLike && !(detailForm.promoActivityDate || "").trim()) {
      return alert(`Required: ${type} - Activity Date`);
    }
    if (isPromoLike && !(detailForm.promoActivityVenueAddress || "").trim()) {
      return alert(`Required: ${type} - Activity Venue/Address`);
    }
    if (isPromoLike && !(detailForm.promoCustomerName || "").trim()) {
      return alert(`Required: ${type} - Name of Customer/Participant`);
    }
    if (isPromoLike && !(detailForm.promoCustomerAddress || "").trim()) {
      return alert(`Required: ${type} - Customer/Participant Address`);
    }
    if (isPromoLike && !(detailForm.promoStaffName || "").trim()) {
      return alert(`Required: ${type} - Name of Staff`);
    }
    if (isCalibration) {
      if (!(detailForm.calibrationCategory || "").trim()) {
        return alert("Required: Category");
      }
      if (!(detailForm.calibrationDate || "").trim()) {
        return alert("Required: Date");
      }
      if (!(detailForm.calibrationTypeOfSample || "").trim()) {
        return alert("Required: Type of Samples");
      }
      if (
        !String(detailForm.calibrationNoOfSample).trim() ||
        toNumber(detailForm.calibrationNoOfSample) <= 0
      ) {
        return alert("Required: No. of Sample");
      }

      if (detailForm.calibrationTypeOfSample === "Weighing Scale") {
        const validRows = (detailForm.calibrationMcBreakdown || []).filter(
          (r) => r.range || toNumber(r.noOfSample) > 0 || toNumber(r.cost) > 0
        );
        if (!validRows.length) {
          return alert("Add at least one MC breakdown row.");
        }
        const breakdownTotal = validRows.reduce((sum, r) => sum + toNumber(r.noOfSample), 0);
        if (breakdownTotal > toNumber(detailForm.calibrationNoOfSample)) {
          return alert("MC breakdown total cannot be greater than the main No. of Sample.");
        }
        for (const row of validRows) {
          if (!row.range) return alert("Each MC breakdown row needs a range.");
          if (toNumber(row.noOfSample) <= 0) return alert("Each MC breakdown row needs no. of sample.");
          if (
            detailForm.calibrationCategory === "PAYING" &&
            toNumber(row.cost) <= 0
          ) {
            return alert("Each MC breakdown row needs cost for PAYING.");
          }
        }
        if (breakdownTotal !== toNumber(detailForm.calibrationNoOfSample)) {
          return alert("MC breakdown total samples must match the main No. of Sample.");
        }
      } else {
        if (
          detailForm.calibrationCategory === "PAYING" &&
          toNumber(detailForm.calibrationCost) <= 0
        ) {
          return alert("Required: Cost for PAYING entry");
        }
      }

      if (!(detailForm.calibrationAddress || "").trim()) {
        return alert("Required: Venue/Address");
      }
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
      return alert("Required: Venue/Address of Customer");
    }
    if (
      isTacs &&
      (detailForm.noOfAdvice === "" || Number.isNaN(Number(detailForm.noOfAdvice)))
    ) {
      return alert("Required: No. of Advice / Recommendations");
    }

    const cleanTechRows = (rows) =>
      (Array.isArray(rows) ? rows : []).map((r) => ({
        quarter: (r.quarter || "").trim(),
        unitCenter: (r.unitCenter || "DOST-PANGASINAN").trim(),
        nameOfTechnologyTransferred: (r.nameOfTechnologyTransferred || "").trim(),
        technologyGenerator: (r.technologyGenerator || "").trim(),
        modeOfTransfer: (r.modeOfTransfer || "").trim(),
        isDostDevelopedFunded: Boolean(r.isDostDevelopedFunded),
        dateTransferred: r.dateTransferred || "",
        activityTitle: (r.activityTitle || "").trim(),
        activityDate: r.activityDate || "",
        activityVenue: (r.activityVenue || "").trim(),
        institutionName: (r.institutionName || "").trim(),
        institutionAddress: (r.institutionAddress || "").trim(),
        institutionAddressMeta: r.institutionAddressMeta || null,
        classification: (r.classification || "").trim(),
        representativeName: (r.representativeName || "").trim(),
        representativeDesignation: (r.representativeDesignation || "").trim(),
        sex: (r.sex || "").trim(),
      }));

    const cleanCalibrationBreakdown = (rows) =>
      (Array.isArray(rows) ? rows : [])
        .filter((r) => r.range && toNumber(r.noOfSample) > 0)
        .map((r) => ({
          id: r.id || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          range: r.range,
          noOfSample: toNumber(r.noOfSample),
          cost: toNumber(r.cost),
          feesCollected:
            detailForm.calibrationCategory === "PAYING"
              ? toNumber(r.noOfSample) * toNumber(r.cost)
              : 0,
          autoFilled: Boolean(r.autoFilled),
        }));

    const cleanCalibrationRows = cleanCalibrationBreakdown(
      detailForm.calibrationMcBreakdown
    );
    const calibrationBreakdownTotals = computeCalibrationBreakdownTotals(
      cleanCalibrationRows,
      detailForm.calibrationCategory
    );

    const notesToSave = isTech
      ? JSON.stringify({
        techRollOutRows: cleanTechRows(detailForm.techRows),
        freeText: (detailForm.notes || "").trim(),
      })
      : isTraining
        ? JSON.stringify({
          trainingProgram: (detailForm.trainingProgram || "").trim(),
          trainingProvince: (detailForm.trainingProvince || "PANGASINAN").trim(),
          trainingStartDate: detailForm.trainingStartDate || "",
          trainingEndDate: detailForm.trainingEndDate || "",
          trainingVenueAddress: (detailForm.trainingVenueAddress || "").trim(),
          trainingVenueAddressMeta: detailForm.trainingVenueAddressMeta || null,
          trainingNoOfFirms: detailForm.noOfFirms === "" ? 0 : toNumber(detailForm.noOfFirms),
          trainingParticipantsFemale: toNumber(detailForm.trainingParticipantsFemale),
          trainingParticipantsMale: toNumber(detailForm.trainingParticipantsMale),
          trainingSeniorFemale: toNumber(detailForm.trainingSeniorFemale),
          trainingSeniorMale: toNumber(detailForm.trainingSeniorMale),
          trainingIpFemale: toNumber(detailForm.trainingIpFemale),
          trainingIpMale: toNumber(detailForm.trainingIpMale),
          trainingFourPsFemale: toNumber(detailForm.trainingFourPsFemale),
          trainingFourPsMale: toNumber(detailForm.trainingFourPsMale),
          trainingPwdFemale: toNumber(detailForm.trainingPwdFemale),
          trainingPwdMale: toNumber(detailForm.trainingPwdMale),
          trainingFirmsSucsHeisLgusCount:
            detailForm.trainingFirmsSucsHeisLgusCount === ""
              ? 0
              : toNumber(detailForm.trainingFirmsSucsHeisLgusCount),
          trainingFirmsAssociationsList: (detailForm.trainingFirmsAssociationsList || "").trim(),
          trainingTrainorAffiliation: (detailForm.trainingTrainorAffiliation || "").trim(),
          projectProgramUnit: (detailForm.projectProgramUnit || "").trim(),
          trainingCostDost: toNumber(detailForm.trainingCostDost),
          trainingCostPartnerAgency: toNumber(detailForm.trainingCostPartnerAgency),
          totalFemale: trainingTotalFemale,
          totalMale: trainingTotalMale,
          totalParticipants: trainingTotalParticipants,
          remarks: (detailForm.notes || "").trim(),
        })
        : isPackaging
          ? (detailForm.notes || "").trim()
          : isCalibration
            ? JSON.stringify({
              category: (detailForm.calibrationCategory || "PAYING").trim(),
              date: detailForm.calibrationDate || "",
              typeOfSample: (detailForm.calibrationTypeOfSample || "Weighing Scale").trim(),
              testType: (detailForm.calibrationTestType || "").trim(),
              noOfSample: toNumber(detailForm.calibrationNoOfSample),
              range: (detailForm.calibrationRange || "").trim(),
              cost:
                detailForm.calibrationTypeOfSample === "Bucket"
                  ? toNumber(detailForm.calibrationCost)
                  : 0,
              feesCollected:
                detailForm.calibrationTypeOfSample === "Weighing Scale"
                  ? (detailForm.calibrationCategory === "PAYING"
                    ? calibrationBreakdownTotals.totalFees
                    : 0)
                  : (detailForm.calibrationCategory === "PAYING"
                    ? toNumber(detailForm.calibrationFeesCollected)
                    : 0),
              mcBreakdown:
                detailForm.calibrationTypeOfSample === "Weighing Scale"
                  ? cleanCalibrationRows
                  : [],
              barangay: (detailForm.calibrationBarangay || "").trim(),
              address: (detailForm.calibrationAddress || "").trim(),
              addressMeta: detailForm.calibrationAddressMeta || null,
              female: toNumber(detailForm.calibrationFemale),
              male: toNumber(detailForm.calibrationMale),
              totalCustomers: toNumber(detailForm.calibrationTotalCustomers),
              noOfFirms: toNumber(detailForm.calibrationNoOfFirms),
              noOfNewFirms: toNumber(detailForm.calibrationNoOfNewFirms),
              ageRange: (detailForm.calibrationAgeRange || "").trim(),
              pwd: toNumber(detailForm.calibrationPwd),
              ip: toNumber(detailForm.calibrationIp),
              sc: toNumber(detailForm.calibrationSc),
              fourPs: toNumber(detailForm.calibrationFourPs),
              remarks: (detailForm.notes || "").trim(),
            })
            : isPromoLike
              ? JSON.stringify({
                project: (detailForm.promoProject || "").trim(),
                activityDate: detailForm.promoActivityDate || "",
                technologyPromoted: (detailForm.promoTechnologyPromoted || "").trim(),
                technologyGenerator: (detailForm.promoTechnologyGenerator || "").trim(),
                modeOfPromotion: (detailForm.promoModeOfPromotion || "").trim(),
                activityTitle: (detailForm.promoActivityTitle || "").trim(),
                activityVenueAddress: (detailForm.promoActivityVenueAddress || "").trim(),
                activityVenueMeta: detailForm.promoActivityVenueMeta || null,
                customerParticipantName: (detailForm.promoCustomerName || "").trim(),
                customerParticipantAddress: (detailForm.promoCustomerAddress || "").trim(),
                customerParticipantAddressMeta: detailForm.promoCustomerAddressMeta || null,
                sex: (detailForm.promoSex || "").trim(),
                staffName: (detailForm.promoStaffName || "").trim(),
                meansOfVerification: (detailForm.promoMeansVerification || "").trim(),
                photos: Array.isArray(detailForm.promoPhotos) ? detailForm.promoPhotos : [],
                projectProgramUnit: (detailForm.projectProgramUnit || "").trim(),
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
                  noOfAdvice: detailForm.noOfAdvice === "" ? null : Number(detailForm.noOfAdvice),
                  tacsPhotos: Array.isArray(detailForm.tacsPhotos) ? detailForm.tacsPhotos : [],
                  remarks: (detailForm.notes || "").trim(),
                })
                : (detailForm.notes || "").trim();

    const male = toNumber(detailForm.male);
    const female = toNumber(detailForm.female);
    const totalAuto = male + female;
    const total = detailForm.total !== "" ? toNumber(detailForm.total) : totalAuto;

    const cleanedTechRows = cleanTechRows(detailForm.techRows);
    const primaryTechRow = cleanedTechRows[0] || makeDefaultTechRows()[0];
    const primaryTechAddressMeta = primaryTechRow?.institutionAddressMeta || null;

    const payload = {
      type,
      title: isTech
        ? (
          cleanedTechRows.find(
            (r) => (r.nameOfTechnologyTransferred || "").trim()
          )?.nameOfTechnologyTransferred || type
        )
        : isTraining
          ? (detailForm.title || "").trim()
          : isPackaging
            ? (detailForm.packagingTypeOfIntervention || "").trim()
            : isCalibration
              ? `Calibration - ${(detailForm.calibrationTypeOfSample || "Weighing Scale").trim()}`
              : isPromoLike
                ? ((detailForm.promoActivityTitle || "").trim() || (detailForm.promoTechnologyPromoted || "").trim() || type)
                : isTacs
                  ? (detailForm.consultancyType || "").trim()
                  : type,
      date: isTech
        ? (
          cleanedTechRows.find((r) => r.dateTransferred)?.dateTransferred || ""
        )
        : isTraining
          ? detailForm.trainingStartDate || ""
          : isPackaging
            ? detailForm.packagingDateCompleted || ""
            : isCalibration
              ? detailForm.calibrationDate || ""
              : isPromoLike
                ? detailForm.promoActivityDate || ""
                : isTacs
                  ? detailForm.dateEngagement || ""
                  : "",
      venue: isTech
        ? (
          cleanedTechRows.find(
            (r) => (r.institutionAddress || "").trim()
          )?.institutionAddress || ""
        )
        : isTraining
          ? (detailForm.trainingVenueAddress || "").trim()
          : isPackaging
            ? (detailForm.packagingAddress || "").trim()
            : isCalibration
              ? (detailForm.calibrationAddress || "").trim()
              : isPromoLike
                ? (detailForm.promoActivityVenueAddress || "").trim()
                : isTacs
                  ? (detailForm.customerAddress || "").trim()
                  : "",
      latitude: isTech
        ? (primaryTechAddressMeta?.lat ?? null)
        : isTraining
          ? (detailForm.trainingVenueAddressMeta?.lat ?? null)
          : isPackaging
            ? (detailForm.packagingAddressMeta?.lat ?? null)
            : isCalibration
              ? (detailForm.calibrationAddressMeta?.lat ?? null)
              : isPromoLike
                ? (detailForm.promoActivityVenueMeta?.lat ?? null)
                : isTacs
                  ? (detailForm.customerAddressMeta?.lat ?? null)
                  : null,
      longitude: isTech
        ? (primaryTechAddressMeta?.lng ?? null)
        : isTraining
          ? (detailForm.trainingVenueAddressMeta?.lng ?? null)
          : isPackaging
            ? (detailForm.packagingAddressMeta?.lng ?? null)
            : isCalibration
              ? (detailForm.calibrationAddressMeta?.lng ?? null)
              : isPromoLike
                ? (detailForm.promoActivityVenueMeta?.lng ?? null)
                : isTacs
                  ? (detailForm.customerAddressMeta?.lng ?? null)
                  : null,
      noOfFirms: isTraining
        ? (detailForm.noOfFirms === "" ? 0 : toNumber(detailForm.noOfFirms))
        : isCalibration
          ? toNumber(detailForm.calibrationNoOfFirms)
          : isPromoLike
            ? null
            : null,
      male: isTraining
        ? trainingTotalMale
        : isCalibration
          ? toNumber(detailForm.calibrationMale)
          : isPromoLike
            ? null
            : null,
      female: isTraining
        ? trainingTotalFemale
        : isCalibration
          ? toNumber(detailForm.calibrationFemale)
          : isPromoLike
            ? null
            : null,
      total: isTraining
        ? trainingTotalParticipants
        : isCalibration
          ? toNumber(detailForm.calibrationTotalCustomers)
          : isPromoLike
            ? null
            : null,
      notes: notesToSave,

      packagingQuarter: isPackaging
        ? (detailForm.packagingQuarter === "" ? null : Number(detailForm.packagingQuarter))
        : null,
      packagingProvince: isPackaging
        ? (detailForm.packagingProvince || "Pangasinan").trim()
        : null,
      packagingDateCompleted: isPackaging ? detailForm.packagingDateCompleted || "" : null,
      packagingTypeOfIntervention: isPackaging
        ? (detailForm.packagingTypeOfIntervention || "").trim()
        : null,
      packagingProductName: isPackaging ? (detailForm.packagingProductName || "").trim() : null,
      packagingSizeVariant: isPackaging ? (detailForm.packagingSizeVariant || "").trim() : null,
      packagingMaterialsProvided: isPackaging
        ? (detailForm.packagingMaterialsProvided || "").trim()
        : null,
      packagingCustomerName: isPackaging ? (detailForm.packagingCustomerName || "").trim() : null,
      packagingSex: isPackaging ? (detailForm.packagingSex || "").trim() : null,
      packagingFirmInstitution: isPackaging
        ? (detailForm.packagingFirmInstitution || "").trim()
        : null,
      packagingAddress: isPackaging ? (detailForm.packagingAddress || "").trim() : null,
      packagingAddressMeta: isPackaging ? detailForm.packagingAddressMeta || null : null,
      packagingMeansVerification: isPackaging
        ? (detailForm.packagingMeansVerification || "").trim()
        : null,
      packagingPhotos: isPackaging
        ? (Array.isArray(detailForm.packagingPhotos) ? detailForm.packagingPhotos : [])
        : [],
      packagingRemarks: isPackaging ? (detailForm.notes || "").trim() : null,

      techrollout_quarter: isTech
        ? (primaryTechRow.quarter === "" ? null : Number(primaryTechRow.quarter))
        : null,
      techrollout_unit_center: isTech ? (primaryTechRow.unitCenter || "DOST-PANGASINAN").trim() : null,
      techrollout_name_of_technology_transferred: isTech
        ? (primaryTechRow.nameOfTechnologyTransferred || "").trim()
        : null,
      techrollout_technology_generator: isTech
        ? (primaryTechRow.technologyGenerator || "").trim()
        : null,
      techrollout_mode_of_transfer: isTech
        ? (primaryTechRow.modeOfTransfer || "").trim()
        : null,
      techrollout_is_dost_developed_funded: isTech
        ? (primaryTechRow.isDostDevelopedFunded ? 1 : 0)
        : 0,
      techrollout_date_transferred: isTech ? primaryTechRow.dateTransferred || null : null,
      techrollout_activity_title: isTech ? (primaryTechRow.activityTitle || "").trim() : null,
      techrollout_activity_date: isTech ? primaryTechRow.activityDate || null : null,
      techrollout_activity_venue: isTech ? (primaryTechRow.activityVenue || "").trim() : null,
      techrollout_institution_name: isTech ? (primaryTechRow.institutionName || "").trim() : null,
      techrollout_institution_address: isTech ? (primaryTechRow.institutionAddress || "").trim() : null,
      techrollout_institution_address_meta: isTech ? primaryTechAddressMeta : null,
      techrollout_classification: isTech ? (primaryTechRow.classification || "").trim() : null,
      techrollout_representative_name: isTech ? (primaryTechRow.representativeName || "").trim() : null,
      techrollout_representative_designation: isTech
        ? (primaryTechRow.representativeDesignation || "").trim()
        : null,
      techrollout_sex: isTech ? (primaryTechRow.sex || "").trim() : null,
      address_mode: isTech ? primaryTechAddressMeta?.mode || null : null,
      address_manual_text: isTech ? primaryTechAddressMeta?.manualText || null : null,
      address_display_text: isTech ? primaryTechAddressMeta?.displayText || null : null,
      address_province: isTech ? primaryTechAddressMeta?.province || null : null,
      address_municipality: isTech ? primaryTechAddressMeta?.municipality || null : null,
      address_barangay: isTech ? primaryTechAddressMeta?.barangay || null : null,
      address_lat: isTech ? (primaryTechAddressMeta?.lat ?? null) : null,
      address_lng: isTech ? (primaryTechAddressMeta?.lng ?? null) : null,

      technologiesPromotedTotal: isPromoLike ? 1 : 0,
      promotionalActivitiesPressRelease: isPromoLike ? 1 : 0,
      pwd: "",
      fourPs: "",
      ip: "",
      seniors: "",

      tacsConsultancyType: isTacs ? (detailForm.consultancyType || "").trim() : "",
      tacsDateEngagement: isTacs ? detailForm.dateEngagement || "" : "",
      tacsExpertInstitution: isTacs ? (detailForm.expertInstitution || "").trim() : "",
      tacsCustomerName: isTacs ? (detailForm.customerName || "").trim() : "",
      tacsCustomerSex: isTacs ? (detailForm.customerSex || "").trim() : "",
      tacsCustomerAddress: isTacs ? (detailForm.customerAddress || "").trim() : "",
      tacsCustomerAddressMeta: isTacs ? detailForm.customerAddressMeta || null : null,
      tacsMeansVerification: isTacs ? (detailForm.meansVerification || "").trim() : "",
      tacsNoOfAdvice: isTacs ? (detailForm.noOfAdvice === "" ? null : Number(detailForm.noOfAdvice)) : null,
      tacsPhotos: isTacs
        ? (Array.isArray(detailForm.tacsPhotos) ? detailForm.tacsPhotos : [])
        : [],
      tacsRemarks: isTacs ? (detailForm.notes || "").trim() : "",
    };

    try {
      let savedId = detailFor.entryId || "";

      if (detailFor.mode === "add") {
        const res = await axios.post(
          `${API}/cest/${detailFor.projectId}/interventions`,
          payload
        );
        savedId = res?.data?.id || "";
      } else {
        await axios.put(`${API}/cest-interventions/${detailFor.entryId}`, payload);
        savedId = detailFor.entryId;
      }

      await fetchProjects();

      setSelectedInterventionByProject((prev) => ({
        ...prev,
        [detailFor.projectId]: savedId,
      }));

      setDetailFor(null);
      resetDetailForm("");
    } catch (err) {
      console.error(err);
      alert("Failed to save intervention.");
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

  const getProjectMunicipality = (p) => {
    const m1 = p?.addressMeta?.municipality;
    if (m1) return String(m1).trim();

    const addr = String(p?.address || "").trim();
    if (!addr) return "";

    const parts = addr.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) return parts[parts.length - 2];
    return "";
  };

  const getProjectDateSource = (p) => {
    return (
      p?.dateProjectApproval ||
      p?.date_project_approval ||
      p?.dateApproved ||
      p?.date_approved ||
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

    const projectYears = projects.map((p) => getProjectYear(p)).filter(Boolean);

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
    return [...COMMUNITY_TYPE_OPTIONS];
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(String(tableFilterSearch || "").trim().toLowerCase());
    }, 400);

    return () => clearTimeout(timer);
  }, [tableFilterSearch]);

  const filteredProjects = useMemo(() => {
    return projects;
  }, [projects]);

  const totalPages = Math.max(1, Number(serverTotalPages || 1));

  const paginatedProjects = useMemo(() => {
    return filteredProjects;
  }, [filteredProjects]);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [
    tableFilterYear,
    tableFilterDistrict,
    tableFilterMonth,
    tableFilterMunicipality,
    tableFilterStatus,
    debouncedSearch,
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
    setTableFilterSearch("");
    setCurrentPage(1);
  };

  const filteredPinnedProjects = useMemo(() => {
    return filteredProjects.filter(
      (p) => Number.isFinite(p?.addressMeta?.lat) && Number.isFinite(p?.addressMeta?.lng)
    );
  }, [filteredProjects]);

  const paginatedPinnedProjects = useMemo(() => {
    return paginatedProjects.filter(
      (p) => Number.isFinite(p?.addressMeta?.lat) && Number.isFinite(p?.addressMeta?.lng)
    );
  }, [paginatedProjects]);

  const visiblePinnedProjects = useMemo(() => {
    let arr = paginatedPinnedProjects;

    if (borderMode === "municipality") {
      if (!selectedMunicipality) return arr;
      return arr.filter((p) => getProjectMunicipality(p) === selectedMunicipality);
    }

    if (!selectedDistrict) return arr;
    return arr.filter((p) => selectedDistrictSet.has(getProjectMunicipality(p)));
  }, [paginatedPinnedProjects, borderMode, selectedMunicipality, selectedDistrict, selectedDistrictSet]);

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
      return Number.isFinite(lat) && Number.isFinite(lng) ? `${lat}, ${lng}` : "";
    });
    const [reverseLoading, setReverseLoading] = useState(false);
    const [reverseError, setReverseError] = useState("");
    const [coords, setCoords] = useState(() => {
      const lat = initialMeta?.lat;
      const lng = initialMeta?.lng;
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

      const lat = initialMeta?.lat;
      const lng = initialMeta?.lng;
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
    }, [open, mode, municipality]);

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

    const pangasinanObj = ADDRESS_DATA.find((x) => x.name === "Pangasinan") || null;
    const municipalityList = (pangasinanObj?.municipalities || []).map((m) => m.name);

    const baseAddressText =
      mode === "manual"
        ? manualText.trim()
        : [barangay, municipality, province].filter(Boolean).join(", ");
    const displayText = [venueName.trim(), baseAddressText].filter(Boolean).join(", ");

    const canSave = mode === "manual" ? Boolean(venueName.trim() || manualText.trim() || coords) : Boolean(municipality && barangay);

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
      if (!municipality || !barangay) return alert("Please select Municipality and Barangay first.");
      if (!coords) setCoords({ lat: 15.9167, lng: 120.3333 });
      setStep(3);
    };

    const useMyLocation = () => {
      if (!navigator.geolocation) return alert("Geolocation not supported in this browser.");
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
      <div style={styles.addressFlowBackdrop} onClick={onClose}>
        <div style={styles.addressFlowShell} onClick={(e) => e.stopPropagation()}>
          <div style={styles.modalHeader}>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div>Add Venue/Address</div>
              <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 800 }}>{breadcrumb}</div>
            </div>
            <button style={styles.closeX} onClick={onClose}>
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
                  setManualCoordsText("");
                  setReverseError("");
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
              <div style={styles.label}>Venue</div>
              <input
                style={styles.input}
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
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
                    placeholder="e.g. Allabon, Agno, Pangasinan"
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Coordinates</div>
                  <input
                    style={styles.input}
                    value={manualCoordsText}
                    onChange={(e) => setManualCoordsText(e.target.value)}
                    onBlur={() => {
                      if (manualCoordsText.trim()) lookupManualCoordinates();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        lookupManualCoordinates();
                      }
                    }}
                    placeholder="Optional: 15.123456, 120.123456"
                  />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <button type="button" style={styles.tinyBtn} onClick={lookupManualCoordinates} disabled={!manualCoordsText.trim() || reverseLoading}>
                      {reverseLoading ? "Finding address..." : "Use Coordinates"}
                    </button>
                    {coords ? (
                      <span style={{ fontSize: 12, opacity: 0.8, ...styles.mono }}>
                        {coords.lat}, {coords.lng}
                      </span>
                    ) : null}
                  </div>
                  {reverseError ? <div style={{ fontSize: 12, color: "#b91c1c", fontWeight: 800 }}>{reverseError}</div> : null}
                </div>

                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  Preview: <b>{displayText || "—"}</b>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <button style={styles.btnGhost} onClick={back}>
                    Back
                  </button>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button style={styles.btnGhost} onClick={useMyLocation}>
                      Use My Location
                    </button>
                    <button style={styles.btnDark} onClick={save} disabled={!canSave}>
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

                    <div style={styles.label}>Select Municipality/City (Pangasinan)</div>
                    <div style={styles.list}>
                      {filterList(municipalityList).map((name) => {
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

                    <div style={{ fontSize: 12, opacity: 0.75 }}>
                      Preview: <b>{displayText || "—"}</b>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <button style={styles.btnGhost} onClick={back}>
                        Back
                      </button>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button style={styles.btnGhost} onClick={goToMap} disabled={!canSave}>
                          Pin on Map
                        </button>
                        <button style={styles.btnDark} onClick={save} disabled={!canSave}>
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
                      <div>
                        <b>Selected:</b> {displayText}
                      </div>
                      <div>
                        <b>Coordinates:</b> {coords ? `${coords.lat}, ${coords.lng}` : "—"}
                      </div>
                      {!coords ? (
                        <div style={{ marginTop: 4, opacity: 0.85 }}>
                          * This barangay has no coords in JSON. Please click the map to set a pin.
                        </div>
                      ) : null}
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <button style={styles.btnGhost} onClick={back}>
                        Back
                      </button>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button style={styles.btnGhost} onClick={useMyLocation}>
                          Use My Location
                        </button>
                        <button style={styles.btnDark} onClick={save} disabled={!canSave}>
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

  const applyAddressMetaToDetailForm = (meta) => {
    setDetailForm((prev) => ({
      ...prev,
      customerAddress: meta?.displayText || "",
      customerAddressMeta: meta || null,
    }));
  };

  const applyAddressMetaToCalibrationForm = (meta) => {
    setDetailForm((prev) => ({
      ...prev,
      calibrationBarangay: meta?.barangay || "",
      calibrationAddress: meta?.displayText || "",
      calibrationAddressMeta: meta || null,
    }));
  };

  const applyAddressMetaToTrainingForm = (meta) => {
    setDetailForm((prev) => ({
      ...prev,
      trainingVenueAddress: meta?.displayText || "",
      venue: meta?.displayText || "",
      trainingVenueAddressMeta: meta || null,
    }));
  };

  const applyAddressMetaToPromoVenue = (meta) => {
    setDetailForm((prev) => ({
      ...prev,
      promoActivityVenueAddress: meta?.displayText || "",
      promoActivityVenueMeta: meta || null,
    }));
  };

  const applyAddressMetaToPromoCustomer = (meta) => {
    setDetailForm((prev) => ({
      ...prev,
      promoCustomerAddress: meta?.displayText || "",
      promoCustomerAddressMeta: meta || null,
    }));
  };

  const applyAddressMetaToPackagingForm = (meta) => {
    setDetailForm((prev) => ({
      ...prev,
      packagingAddress: meta?.displayText || "",
      packagingAddressMeta: meta || null,
    }));
  };

  const applyAddressMetaToTechInstitution = (idx, meta) => {
    setDetailForm((prev) => {
      const next = [...(prev.techRows || [])];
      next[idx] = {
        ...(next[idx] || {}),
        institutionAddress: meta?.displayText || "",
        institutionAddressMeta: meta || null,
      };
      return { ...prev, techRows: next };
    });
  };

  function AddressViewModal({ project, onClose }) {
    if (!project) return null;
    const meta = project.addressMeta || null;
    const lat = meta?.lat;
    const lng = meta?.lng;
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

    return (
      <div style={styles.modalBackdrop} className="cest-modal-backdrop" onClick={onClose}>
        <div style={{ ...styles.modal, width: "min(720px, calc(100vw - 24px))", maxWidth: "720px" }} onClick={(e) => e.stopPropagation()}>
          <div style={styles.modalHeader}>
            <div>View Venue/Address — {project.projectTitle}</div>
            <button style={styles.closeX} onClick={onClose}>
              ✕
            </button>
          </div>

          <div style={styles.modalBody}>
            <div style={{ display: "grid", gap: 10 }}>
              <div>
                <div style={styles.label}>Display Venue/Address</div>
                <div style={{ padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 10, background: "#f8fafc" }}>
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
                  <div style={{ ...styles.mono, fontSize: 12 }}>{hasCoords ? `${lat}, ${lng}` : "—"}</div>
                </div>
              </div>

              {hasCoords ? (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} className="cest-inline-actions">
                  <button style={styles.tinyBtn} onClick={() => openGoogleMap(lat, lng)}>
                    Map
                  </button>
                  <button style={styles.tinyBtn} onClick={() => openGoogleDirections(lat, lng)}>
                    Directions
                  </button>
                </div>
              ) : (
                <div style={{ fontSize: 12, opacity: 0.7 }}>* No coordinates saved yet (Pin on Map not used).</div>
              )}
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
  const PAGINATION_SCALE = 0.75;
  // ===== Styles =====
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

    tdRight: {
      border: "2px solid #6b7280",
      padding: "6px 6px",
      fontSize: 11,
      textAlign: "right",
      fontFamily,
      verticalAlign: "top",
      background: "white",
      whiteSpace: "nowrap",
    },

    sectionTitleRow: {
      marginTop: 14,
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 8,
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

    tableHeaderTitle: {
      fontWeight: 800,
      fontSize: 18,
      color: "#123b5d",
      textTransform: "uppercase",
      letterSpacing: 0.4,
      whiteSpace: "nowrap",
      fontFamily,
    },

    tableFilterBar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 6,
      flexWrap: "wrap",
      fontFamily,
      marginLeft: "auto",
    },

    tableFilterSelect: {
      height: 34,
      minWidth: 88,
      padding: "0 10px",
      borderRadius: 9,
      border: "1px solid #cbd5e1",
      background: "#fff",
      fontWeight: 700,
      fontSize: 11,
      fontFamily,
      outline: "none",
      whiteSpace: "nowrap",
    },

    tableSearchInput: {
      height: 34,
      minWidth: 180,
      width: 180,
      padding: "0 10px",
      borderRadius: 9,
      border: "1px solid #cbd5e1",
      background: "#fff",
      fontWeight: 600,
      fontSize: 11,
      fontFamily,
      outline: "none",
    },

    tableClearBtn: {
      height: 34,
      border: "1px solid rgba(15, 23, 42, 0.18)",
      background: "#fff",
      padding: "0 12px",
      borderRadius: 9,
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 11,
      fontFamily,
      boxShadow: "0 2px 0 rgba(2,6,23,0.06)",
      whiteSpace: "nowrap",
    },

    addBtn: {
      height: 34,
      border: "1px solid rgba(15, 23, 42, 0.18)",
      background: "#fff",
      padding: "0 12px",
      borderRadius: 9,
      cursor: "pointer",
      fontWeight: 700,
      fontSize: 11,
      fontFamily,
      boxShadow: "0 2px 0 rgba(2,6,23,0.06)",
      whiteSpace: "nowrap",
    },

    printBtn: {
      height: 34,
      border: "1px solid #0b4ea2",
      background: "#0b4ea2",
      color: "white",
      padding: "0 12px",
      borderRadius: 9,
      cursor: "pointer",
      fontWeight: 800,
      fontSize: 11,
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

    pillBtnActive: {
      border: "1px solid #0b4ea2",
      background: "#dbeafe",
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


    modernPaginationWrap: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 22,
      marginBottom: 10,
      width: "100%",
      transform: `scale(${PAGINATION_SCALE})`,
      transformOrigin: "top center",
    },

    modernPaginationRow: {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      flexWrap: "wrap",
    },

    modernPageBtn: (disabled = false, active = false) => ({
      minWidth: 54,
      height: 54,
      padding: "0 16px",
      border: active ? "2px solid #3b82f6" : "2px solid #e5e7eb",
      borderRadius: 16,
      background: active ? "#3b82f6" : "#ffffff",
      color: disabled ? "#a1a1aa" : active ? "#ffffff" : "#2f3037",
      fontSize: active ? 24 : 22,
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
      padding: 12,
      zIndex: 1000,
      overflowY: "auto",
    },

    modal: {
      width: "min(980px, calc(100vw - 24px))",
      maxWidth: "980px",
      maxHeight: "calc(100vh - 24px)",
      background: "white",
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      fontFamily,
      display: "flex",
      flexDirection: "column",
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
      overflowY: "auto",
      overflowX: "hidden",
      flex: 1,
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
      gap: 10,
    },
    field: { display: "flex", flexDirection: "column", gap: 6 },
    label: { fontSize: 12, fontWeight: 900, color: "#0f172a", fontFamily },
    req: { color: "#dc2626", marginLeft: 2 },

    input: {
      width: "100%",
      boxSizing: "border-box",
      padding: "8px 10px",
      border: "1px solid #cbd5e1",
      borderRadius: 8,
      fontSize: 13,
      outline: "none",
      fontFamily,
    },

    textarea: {
      width: "100%",
      boxSizing: "border-box",
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

    pickModal: {
      width: "min(520px, calc(100vw - 24px))",
      maxWidth: "520px",
      maxHeight: "calc(100vh - 24px)",
      background: "white",
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      fontFamily,
      display: "flex",
      flexDirection: "column",
    },

    pickHeader: {
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

    pickBody: {
      padding: 14,
      display: "grid",
      gap: 10,
      overflowY: "auto",
      overflowX: "hidden",
      flex: 1,
    },

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
      width: "min(980px, calc(100vw - 24px))",
      maxWidth: "980px",
      maxHeight: "calc(100vh - 24px)",
      background: "white",
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      fontFamily,
      display: "flex",
      flexDirection: "column",
    },

    miniTableWrap: { overflowX: "auto", marginTop: 10 },
    miniTable: { width: "100%", borderCollapse: "collapse", minWidth: 980, fontFamily },

    miniTh: {
      border: "1px solid #94a3b8",
      padding: 8,
      background: "#eef2f6",
      fontSize: 12,
      textAlign: "center",
      fontWeight: 800,
      fontFamily,
      whiteSpace: "nowrap",
    },

    miniTd: { border: "1px solid #94a3b8", padding: 8, fontSize: 12, fontFamily },

    dividerTitle: { marginTop: 14, fontWeight: 900, fontSize: 12, color: "#0f172a" },
    dividerLine: { height: 1, background: "#e2e8f0", marginTop: 8, marginBottom: 10 },
    breakdownBox: {
      border: "1px solid #cbd5e1",
      borderRadius: 10,
      padding: 10,
      background: "#f8fafc",
      gridColumn: "1 / -1",
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

    flowShell: {
      width: "min(620px, calc(100vw - 24px))",
      maxWidth: "620px",
      maxHeight: "calc(100vh - 24px)",
      background: "white",
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      fontFamily,
      display: "flex",
      flexDirection: "column",
    },

    addressFlowBackdrop: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.45)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 12,
      zIndex: 4000,
      overflowY: "auto",
    },

    addressFlowShell: {
      width: "min(620px, calc(100vw - 24px))",
      maxWidth: "620px",
      maxHeight: "calc(100vh - 24px)",
      background: "white",
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      fontFamily,
      display: "flex",
      flexDirection: "column",
      position: "relative",
      zIndex: 4001,
    },
    flowBody: {
      padding: 14,
      display: "grid",
      gap: 10,
      overflowY: "auto",
      overflowX: "hidden",
      flex: 1,
    },

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
      fontWeight: 900,
      fontFamily,
      fontSize: 12,
      minWidth: 240,
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

    photoViewerBackdrop: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.75)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 12,
      zIndex: 3000,
    },

    photoViewerModal: {
      width: "min(960px, calc(100vw - 24px))",
      maxWidth: "960px",
      maxHeight: "calc(100vh - 24px)",
      background: "#fff",
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
      display: "flex",
      flexDirection: "column",
    },
  };

  const pickedProject = useMemo(() => projects.find((p) => p.id === pickForId) || null, [projects, pickForId]);

  const detailProject = useMemo(() => {
    if (!detailFor) return null;
    return projects.find((p) => p.id === detailFor.projectId) || null;
  }, [detailFor, projects]);

  const viewProject = useMemo(() => {
    if (!viewProjectId) return null;
    return projects.find((p) => p.id === viewProjectId) || null;
  }, [viewProjectId, projects]);

  const addressViewProject = useMemo(() => {
    if (!addressViewForProjectId) return null;
    return projects.find((p) => p.id === addressViewForProjectId) || null;
  }, [addressViewForProjectId, projects]);

  const [viewPressReleaseInput, setViewPressReleaseInput] = useState("");
  const [viewStartupsAssistedInput, setViewStartupsAssistedInput] = useState("");
  const [viewJobsGeneratedInput, setViewJobsGeneratedInput] = useState("");

  const viewInterventionSums = useMemo(() => {
    if (!viewProject) return { techPromoted: 0, pressRelease: 0 };
    const arr = Array.isArray(viewProject.interventions) ? viewProject.interventions : [];
    return {
      techPromoted: arr.reduce((sum, it) => sum + toNumber(it.technologiesPromotedTotal), 0),
      pressRelease: arr.reduce((sum, it) => sum + toNumber(it.promotionalActivitiesPressRelease), 0),
    };
  }, [viewProject]);


  useEffect(() => {
    if (!viewProjectId || !viewProject) {
      setViewPressReleaseInput("");
      setViewStartupsAssistedInput("");
      setViewJobsGeneratedInput("");
      return;
    }
    setViewPressReleaseInput(toNumber(viewProject.pressRelease) === 0 ? "" : String(toNumber(viewProject.pressRelease)));
    setViewStartupsAssistedInput(String(viewProject.startupsAssisted || "").trim());
    setViewJobsGeneratedInput(
      toNumber(viewProject.jobsGenerated) === 0 ? "" : String(toNumber(viewProject.jobsGenerated))
    );
  }, [viewProjectId, viewProject]);

  const saveViewPressRelease = async () => {
    if (!allowEdit) {
      alert("You do not have permission to edit CEST projects.");
      return;
    }

    if (!viewProject) return;
    try {
      await axios.put(`${API}/cest/${viewProject.id}`, {
        quarter: String(viewProject.quarter || "1"),
        type: (viewProject.type || "New Communities").trim(),
        projectTitle: (viewProject.projectTitle || "").trim(),
        dateProjectApproval: viewProject.dateProjectApproval || "",
        approvedProjectCost: toNumber(viewProject.approvedProjectCost),
        dateFundRelease: viewProject.dateFundRelease || "",
        associationName: (viewProject.associationName || "").trim(),
        address: (viewProject.address || "").trim(),
        addressMeta: viewProject.addressMeta || null,
        lguNumbersOfCommunities: String(viewProject.lguNumbersOfCommunities || "").trim(),
        numberOfMoa: toNumber(viewProject.numberOfMoa),
        projectProponent: (viewProject.projectProponent || "").trim(),
        sex: (viewProject.sex || "").trim(),
        processSystem: (viewProject.processSystem || "").trim(),
        staffName: (viewProject.staffName || "").trim(),
        pressRelease: toNumber(viewPressReleaseInput),
        startupsAssisted: String(viewStartupsAssistedInput || "").trim(),
        jobsGenerated: toNumber(viewJobsGeneratedInput),
        custom_fields: viewProject.customFields || viewProject.custom_fields || {},
        customFields: viewProject.customFields || viewProject.custom_fields || {},
      });

      await fetchProjects();
      setViewProjectId(null);
    } catch (err) {
      console.error(err);
      alert("Failed to save Press Release.");
    }
  };


  const escapeHtml = (value = "") =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const normalizeExportProjectRows = (rows = []) =>
    (Array.isArray(rows) ? rows : []).map((p) => {
      const municipality =
        p?.addressMeta?.municipality ||
        p?.address_municipality ||
        (() => {
          const addr = String(p?.address || "").trim();
          if (!addr) return "";
          const parts = addr.split(",").map((s) => s.trim()).filter(Boolean);
          return parts.length >= 2 ? parts[parts.length - 2] : "";
        })();

      const district =
        PANGASINAN_DISTRICTS.find((d) =>
          d.municipalities.includes(String(municipality || "").trim())
        )?.id || "";

      return {
        id: p.id,
        quarter: String(p.quarter || "1"),
        type: p.type || "New Communities",
        projectTitle: p.projectTitle || p.project_title || "",
        dateProjectApproval: p.dateProjectApproval || p.date_approved || "",
        approvedProjectCost: Number(p.approvedProjectCost ?? p.amount ?? 0),
        dateFundRelease: p.dateFundRelease || p.date_fund_release || "",
        associationName: p.associationName || p.firmName || p.firm_name || "",
        address: p.address || "",
        addressMeta: p.addressMeta || null,
        lguNumbersOfCommunities:
          p.lguNumbersOfCommunities ?? p.lgu_numbers_of_communities ?? "",
        numberOfMoa: Number(p.numberOfMoa ?? p.number_of_moa ?? 0),
        projectProponent: p.projectProponent || "",
        sex: p.sex || "",
        processSystem: p.processSystem || "",
        staffName: p.staffName || p.nameOfStaff || p.staff_name || "",
        communitiesAssisted: Number(p.communitiesAssisted ?? 0),
        technologiesDeployed: Number(p.technologiesDeployed ?? 0),
        beneficiaries: Number(p.beneficiaries ?? 0),
        pressRelease: Number(p.pressRelease ?? p.press_release ?? 0),
        startupsAssisted:
          p.startupsAssisted === null || p.startupsAssisted === undefined
            ? ""
            : String(p.startupsAssisted),
        jobsGenerated: Number(p.jobsGenerated ?? 0),
        district,
        interventions: Array.isArray(p.interventions) ? p.interventions : [],
      };
    });

  const getCestExportParams = (limit = Math.max(serverTotal || 0, filteredProjects.length || 0, 10000)) => {
    const params = { page: 1, limit };
    if (debouncedSearch) params.search = debouncedSearch;
    if (tableFilterYear !== "ALL") params.year = tableFilterYear;
    if (tableFilterDistrict !== "ALL") params.district = tableFilterDistrict;
    if (tableFilterMonth !== "ALL") params.month = tableFilterMonth;
    if (tableFilterMunicipality !== "ALL") params.municipality = tableFilterMunicipality;
    if (tableFilterStatus !== "ALL") params.status = tableFilterStatus;
    return params;
  };

  const loadCestRowsForOutput = async () => {
    try {
      const res = await axios.get(`${API}/cest`, {
        params: getCestExportParams(),
      });
      const payload = res?.data || {};
      const rows = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(res?.data)
          ? res.data
          : [];
      const normalized = normalizeExportProjectRows(rows);
      return normalized.length ? normalized : filteredProjects;
    } catch (err) {
      console.error(err);
      return filteredProjects;
    }
  };

  const buildCestExportRows = (items = []) =>
    (Array.isArray(items) ? items : []).map((p, idx) => ({
      "No.": idx + 1,
      "Type": p?.type || "",
      "Project Title": p?.projectTitle || "",
      "Date of Project Approval": p?.dateProjectApproval || "",
      "Approved Project Cost (in Peso)": toNumber(p?.approvedProjectCost),
      "Name of Association / Cooperative": p?.associationName || "",
      "Venue/Address": p?.address || "",
      "Name of LGU-Communities": p?.lguNumbersOfCommunities || "",
      "Number of MOA": toNumber(p?.numberOfMoa),
      "Name of Project Proponent": p?.projectProponent || "",
      "Sex": p?.sex || "",
      "Name of Staff": p?.staffName || "",
      "Process/System Developed/Improved": p?.processSystem || "",
      "Communities Assisted": toNumber(p?.communitiesAssisted),
      "Technologies Deployed": toNumber(p?.technologiesDeployed),
      "Beneficiaries": toNumber(p?.beneficiaries),
      "Startups Assisted": p?.startupsAssisted || "",
      "Jobs Generated": toNumber(p?.jobsGenerated),
      "S&T Interventions Count": Array.isArray(p?.interventions) ? p.interventions.length : 0,
    }));

  const makeCestExportFilename = (label = "cest_export") =>
    `${String(label || "cest_export").replace(/[^a-z0-9]+/gi, "_")}.xlsx`;

  const exportCestRows = async (items = null, filename = "cest_export.xlsx") => {
    const sourceRows = items || (await loadCestRowsForOutput());
    const rows = buildCestExportRows(sourceRows);
    if (!rows.length) return alert("No records to export.");
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CEST");
    XLSX.writeFile(wb, filename);
  };

  const printCestRows = async (items = null, title = "CEST Report") => {
    const sourceRows = items || (await loadCestRowsForOutput());
    const rows = buildCestExportRows(sourceRows);
    if (!rows.length) return alert("No records to print.");
    const headers = Object.keys(rows[0]);
    const bodyRows = rows
      .map((row) => `<tr>${headers.map((h) => `<td>${escapeHtml(row[h]) || "&nbsp;"}</td>`).join("")}</tr>`)
      .join("");
    const printWindow = window.open("", "_blank", "width=1200,height=800");
    if (!printWindow) return alert("Please allow popups to print this report.");
    printWindow.document.write(`
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #0f172a; }
          h1 { font-size: 20px; margin: 0 0 12px; }
          .meta { font-size: 12px; margin-bottom: 14px; color: #475569; }
          table { width: 100%; border-collapse: collapse; font-size: 10px; }
          th, td { border: 1px solid #64748b; padding: 6px; vertical-align: top; text-align: left; }
          th { background: #e2e8f0; font-weight: 800; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <div class="meta">Generated: ${new Date().toLocaleString()}</div>
        <table>
          <thead><tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </body>
    </html>
  `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };


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

  const getCESTOutputLabel = (row) => row?.projectTitle || row?.associationName || row?.id || "Record";

  const ensureCESTOutputRows = (rows = []) => {
    const clean = Array.isArray(rows) ? rows : [];
    if (clean.length) return clean;
    return [{ "No.": "", Template: "No records found for the current filter." }];
  };

  const downloadCESTBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const sanitizeCESTFilename = (value = "CEST") =>
    String(value || "CEST").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "CEST";

  const getCESTRowsForOutput = async (scope, entryId) => {
    if (scope === "row") {
      const row = projects.find((p) => String(p.id) === String(entryId));
      return row ? [row] : [];
    }
    const rows = (await loadCestRowsForOutput());
    return Array.isArray(rows) ? rows : [];
  };

  const buildCESTObjectRowsForOutput = (sourceRows = []) =>
    ensureCESTOutputRows(buildCestExportRows(sourceRows));

  const exportCESTCSV = (objectRows, filename) => {
    const rows = ensureCESTOutputRows(objectRows);
    const headers = Object.keys(rows[0] || { "No.": "" });
    const csvEscape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [
      headers.map(csvEscape).join(","),
      ...rows.map((row) => headers.map((h) => csvEscape(row[h])).join(",")),
    ].join("\n");
    downloadCESTBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename);
  };

  const exportCESTExcel = (objectRows, filename) => {
    const rows = ensureCESTOutputRows(objectRows);
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CEST");
    XLSX.writeFile(wb, filename);
  };

  const exportCESTPDF = async (objectRows, options = {}) => {
    const rows = ensureCESTOutputRows(objectRows);
    const headers = Object.keys(rows[0] || { "No.": "" });
    const orientation = options.orientation || "landscape";
    const preset = options.preset === "custom" ? [Number(options.customSize?.width || 8.5) * 72, Number(options.customSize?.height || 13) * 72] : (options.preset || "a4");
    const doc = new jsPDF({ orientation, unit: "pt", format: preset });
    doc.setFontSize(14);
    doc.text(options.titleLabel || "CEST Export", 32, 32);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 32, 48);
    autoTable(doc, {
      head: [headers],
      body: rows.map((row) => headers.map((h) => String(row[h] ?? ""))),
      startY: 62,
      styles: { fontSize: 7, cellPadding: 3, overflow: "linebreak" },
      headStyles: { fillColor: [11, 78, 162] },
    });
    doc.save(options.filename || "CEST.pdf");
  };

  const exportCESTDOCX = async (objectRows, options = {}) => {
    const rows = ensureCESTOutputRows(objectRows);
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
          new Paragraph({ children: [new TextRun({ text: "CEST Export", bold: true, size: 28 })] }),
          new Paragraph(`Generated: ${new Date().toLocaleString()}`),
          new DocxTable({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
        ],
      }],
    });
    const blob = await Packer.toBlob(doc);
    downloadCESTBlob(blob, options.filename || "CEST.docx");
  };

  const buildCESTPrintHtml = (objectRows, options = {}) => {
    const rows = ensureCESTOutputRows(objectRows);
    const headers = Object.keys(rows[0] || { "No.": "" });
    const orientation = options.orientation || "landscape";
    const presetLabel = OUTPUT_PRESET_LABEL[options.preset] || "A4";
    const customSize = options.preset === "custom" ? `${options.customSize?.width || 8.5}in ${options.customSize?.height || 13}in` : presetLabel;
    const layout = options.layoutKey || "FORM";
    const escape = (v) => escapeHtml(String(v ?? ""));
    const table = `<table><thead><tr>${headers.map((h) => `<th>${escape(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${headers.map((h) => `<td>${escape(row[h]) || "&nbsp;"}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    const compact = rows.map((row, idx) => `<div class="compact-card"><b>Record ${idx + 1}</b>${headers.map((h) => `<div><b>${escape(h)}:</b> ${escape(row[h]) || "—"}</div>`).join("")}</div>`).join("");
    return `<!doctype html><html><head><meta charset="utf-8" /><title>${escape(options.titleLabel || "CEST Print")}</title><style>
      @page { size: ${customSize} ${orientation}; margin: 10mm; }
      * { box-sizing: border-box; } body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; padding: 12px; }
      h1 { margin: 0 0 4px; font-size: 18px; } .sub { font-size: 11px; color: #475569; font-weight: 700; margin-bottom: 10px; }
      table { width: 100%; border-collapse: collapse; font-size: 9px; table-layout: fixed; } th, td { border: 1px solid #64748b; padding: 5px; vertical-align: top; word-break: break-word; } th { background: #eef2f6; font-weight: 900; }
      .compact-card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; margin-bottom: 8px; font-size: 12px; }
      .tip { margin: 0 0 10px; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 10px; background: #f8fafc; font-weight: 800; font-size: 12px; }
      @media print { .no-print { display:none!important; } body { padding:0; } }
    </style></head><body><div class="tip no-print">Tip: If the Print dialog did not open automatically, press <b>Ctrl+P</b>.</div><h1>${escape(options.titleLabel || "CEST Print")}</h1><div class="sub">${escape(OUTPUT_LAYOUT_LABEL[layout] || "Print")} • Records: ${rows.length} • Generated: ${escape(new Date().toLocaleString())}</div>${layout === "COMPACT" ? compact : table}<script>window.addEventListener('load',function(){setTimeout(function(){try{window.print();}catch(e){}},250);});</script></body></html>`;
  };

  const doCESTPrint = (objectRows, options = {}) => {
    const win = window.open("", "_blank", "width=1200,height=800");
    if (!win) return alert("Popup blocked. Please allow popups for printing.");
    win.document.open();
    win.document.write(buildCESTPrintHtml(objectRows, options));
    win.document.close();
  };

  const openCESTPrintPopupRow = (entryId) => {
    if (!allowExport) {
      alert("You do not have permission to print CEST records.");
      return;
    }

    setPrintModal({ open: true, scope: "row", entryId, layout: "FORM", preset: "a4", orientation: "landscape", customSize: { width: 8.5, height: 13 } });
  };

  const openCESTPrintPopupBulk = () => {
    if (!allowExport) {
      alert("You do not have permission to print CEST records.");
      return;
    }

    setPrintModal({ open: true, scope: "bulk", entryId: null, layout: "FORM", preset: "a4", orientation: "landscape", customSize: { width: 8.5, height: 13 } });
  };

  const openCESTExportPopupRow = (entryId) => {
    if (!allowExport) {
      alert("You do not have permission to export CEST records.");
      return;
    }

    setExportModal({ open: true, scope: "row", entryId, format: "excel", template: "TABLE", preset: "a4", orientation: "landscape", customSize: { width: 8.5, height: 13 } });
  };

  const openCESTExportPopupBulk = () => {
    if (!allowExport) {
      alert("You do not have permission to export CEST records.");
      return;
    }

    setExportModal({ open: true, scope: "bulk", entryId: null, format: "excel", template: "TABLE", preset: "a4", orientation: "landscape", customSize: { width: 8.5, height: 13 } });
  };

  const confirmCESTPrint = async () => {
    if (!allowExport) {
      alert("You do not have permission to print CEST records.");
      return;
    }

    const sourceRows = await getCESTRowsForOutput(printModal.scope, printModal.entryId);
    const objectRows = buildCESTObjectRowsForOutput(sourceRows);
    const titleLabel = printModal.scope === "row"
      ? `Print — ${getCESTOutputLabel(sourceRows[0]) || "Record"}`
      : `Print — Filtered Rows (${objectRows.length})`;
    doCESTPrint(objectRows, { layoutKey: printModal.layout, preset: printModal.preset, orientation: printModal.orientation, customSize: printModal.customSize, titleLabel });
    setPrintModal((p) => ({ ...p, open: false }));
  };

  const confirmCESTExport = async () => {
    if (!allowExport) {
      alert("You do not have permission to export CEST records.");
      return;
    }

    const sourceRows = await getCESTRowsForOutput(exportModal.scope, exportModal.entryId);
    const objectRows = buildCESTObjectRowsForOutput(sourceRows);
    const baseName = exportModal.scope === "row"
      ? sanitizeCESTFilename(`CEST_${getCESTOutputLabel(sourceRows[0]) || "record"}`)
      : sanitizeCESTFilename(`CEST_Filtered_Rows`);
    if (exportModal.format === "csv") exportCESTCSV(objectRows, `${baseName}.csv`);
    else if (exportModal.format === "excel") exportCESTExcel(objectRows, `${baseName}.xlsx`);
    else if (exportModal.format === "pdf") await exportCESTPDF(objectRows, { template: exportModal.template, preset: exportModal.preset, orientation: exportModal.orientation, customSize: exportModal.customSize, titleLabel: exportModal.scope === "row" ? `Export PDF — ${getCESTOutputLabel(sourceRows[0]) || "Record"}` : `Export PDF — Filtered (${objectRows.length})`, filename: `${baseName}.pdf` });
    else if (exportModal.format === "docx") await exportCESTDOCX(objectRows, { orientation: exportModal.orientation, filename: `${baseName}.docx` });
    setExportModal((p) => ({ ...p, open: false }));
  };

  const viewStyles = {
    value: {
      fontWeight: 900,
      fontSize: 16,
      color: "#0f172a",
      marginTop: 4,
    },
    boxValue: {
      marginTop: 4,
      border: "1px solid #cbd5e1",
      background: "#f8fafc",
      borderRadius: 10,
      padding: "10px 12px",
      fontWeight: 900,
      fontSize: 16,
      color: "#0f172a",
    },
  };

  return (
    <div style={styles.page} className="cest-page">

      <style>{`
        .modern-page-btn:hover:not(:disabled):not(.modern-page-active) {
          transform: translateY(-3px);
          border-color: #93c5fd !important;
          box-shadow: 0 12px 24px rgba(37, 99, 235, 0.14) !important;
        }

        .modern-page-btn:active:not(:disabled) {
          transform: scale(0.94);
        }

        .modern-page-active {
          animation: activePagePop 0.28s ease;
        }

        .modern-page-arrow {
          font-size: 36px !important;
          line-height: 1;
        }

        @keyframes activePagePop {
          0% {
            transform: scale(0.88);
          }

          70% {
            transform: scale(1.07);
          }

          100% {
            transform: scale(1);
          }
        }
      `}</style>
      <div style={styles.titleBar}>
        <div>CEST</div>
        <div style={{ fontSize: 12, opacity: 0.95, fontWeight: 800, fontFamily }}>

        </div>
      </div>

      {/* ✅ MAP DASHBOARD */}
      <div style={styles.mapCard} className="cest-map-card">
        <div style={styles.mapHeader} className="cest-map-header">
          <div style={{ display: "flex", flexDirection: "column", gap: 2, width: "100%" }}>
            <div style={styles.mapTitle}>PANGASINAN MAP — CEST Project Pins</div>
            <div style={styles.mapSub}>
              Pins shown: <b>{visiblePinnedProjects.length}</b> / {filteredPinnedProjects.length}
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
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <>
                  <span style={styles.filterLabel}>District:</span>
                  <select style={styles.select} value={selectedDistrict} onChange={(e) => setSelectedDistrict(e.target.value)}>
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

            {visiblePinnedProjects.map((p) => (
              <Marker key={p.id} position={[p.addressMeta.lat, p.addressMeta.lng]} pane="pinPane">
                <Popup>
                  <div style={{ minWidth: 260, fontFamily }}>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>{p.projectTitle}</div>

                    <div style={{ fontSize: 12, marginBottom: 6 }}>
                      <b>Association:</b> {p.associationName || "—"}
                      <br />
                      <b>Proponent:</b> {p.projectProponent || "—"}
                      <br />
                      <b>Municipality:</b> {getProjectMunicipality(p) || "—"}
                    </div>

                    <div style={{ fontSize: 12, marginBottom: 8 }}>
                      <b>Venue/Address:</b> {p.address || "—"}
                      <br />
                      <b>Coordinates:</b> {p.addressMeta.lat}, {p.addressMeta.lng}
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} className="cest-inline-actions">
                      <button style={styles.tinyBtn} onClick={() => setAddressViewForProjectId(p.id)}>
                        Address
                      </button>
                      <button style={styles.tinyBtn} onClick={() => openGoogleMap(p.addressMeta.lat, p.addressMeta.lng)}>
                        Map
                      </button>
                      <button style={styles.tinyBtn} onClick={() => openGoogleDirections(p.addressMeta.lat, p.addressMeta.lng)}>
                        Directions
                      </button>
                      <button
                        style={styles.tinyBtn}
                        onClick={() => {
                          setViewMode("list");
                          setViewProjectId(p.id);
                        }}
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

      <div style={styles.tableHeaderRow} className="cest-table-header-row">
        <div style={styles.tableHeaderTitle}>
          CEST TABLE
          <span style={{ marginLeft: 10, fontSize: 12, opacity: 0.75 }}>
            Showing <b>{paginatedProjects.length}</b> of {serverTotal} / {serverTotal}
          </span>
        </div>

        <div style={styles.tableFilterBar} className="cest-table-filter-bar">
          <input
            type="text"
            style={styles.tableSearchInput}
            value={tableFilterSearch}
            onChange={(e) => setTableFilterSearch(e.target.value)}
            placeholder="Search project / association..."
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

          {allowExport && (
            <button type="button" style={styles.addBtn} onClick={openCESTExportPopupBulk}>
              Export
            </button>
          )}

          {allowExport && (
            <button type="button" style={styles.printBtn} onClick={openCESTPrintPopupBulk}>
              Print
            </button>
          )}

          {allowAdd && (
            <button type="button" style={styles.addBtn} onClick={openAddProject}>
              + Add Project
            </button>
          )}
        </div>
      </div>

      {/* PROJECTS TABLE */}
      <div style={styles.tableWrap} className="cest-table-wrap">
        <table style={{ ...styles.table, minWidth: 1560 }} className="cest-table">
          <colgroup>
            <col style={{ width: "4%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "17%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "10%" }} />
          </colgroup>

          <thead>
            <tr>
              <th style={styles.th}>NO.</th>
              <th style={styles.th}>TYPE</th>
              <th style={styles.th}>PROJECT TITLE</th>
              <th style={styles.th}>DATE OF PROJECT APPROVAL</th>
              <th style={styles.th}>APPROVED PROJECT COST (in Peso)</th>
              <th style={styles.th}>NAME OF ASSOCIATION / COOPERATIVE</th>
              <th style={styles.th}>VENUE/ADDRESS</th>
              <th style={styles.th}>NAME OF LGU-COMMUNITIES</th>
              <th style={styles.th}>NUMBER OF MOA</th>
              <th style={styles.th}>S&amp;T INTERVENTION PROVIDED</th>
              <th style={styles.th}>ACTIONS</th>
            </tr>
          </thead>

          <tbody>
            {paginatedProjects.length === 0 ? (
              <tr>
                <td style={styles.tdCenter} colSpan={11}>
                  {projects.length === 0 ? 'Wala pang entries. Click “Add Project”.' : "No matching projects found."}
                </td>
              </tr>
            ) : (
              paginatedProjects.map((p, idx) => {
                const selectedId = selectedInterventionByProject[p.id] || "";
                const hasCoords = Number.isFinite(p?.addressMeta?.lat) && Number.isFinite(p?.addressMeta?.lng);

                return (
                  <tr key={p.id}>
                    <td style={styles.tdCenter}>{(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                    <td style={styles.tdCenter}>{p.type || "—"}</td>
                    <td style={styles.td}>{p.projectTitle}</td>
                    <td style={styles.tdCenter}>{p.dateProjectApproval || "—"}</td>
                    <td style={styles.tdRight}>{money(p.approvedProjectCost)}</td>
                    <td style={styles.td}>{p.associationName || "—"}</td>

                    <td style={styles.td}>
                      <div style={{ display: "grid", gap: 8 }}>
                        <div style={{ fontSize: 12 }}>{p.address ? p.address : <span style={{ opacity: 0.65 }}>—</span>}</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} className="cest-inline-actions">
                          <button style={styles.tinyBtn} onClick={() => setAddressViewForProjectId(p.id)}>
                            View
                          </button>
                          {hasCoords ? (
                            <>
                              <button style={styles.tinyBtn} onClick={() => openGoogleMap(p.addressMeta.lat, p.addressMeta.lng)}>
                                Map
                              </button>
                              <button style={styles.tinyBtn} onClick={() => openGoogleDirections(p.addressMeta.lat, p.addressMeta.lng)}>
                                Directions
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    <td style={styles.td}>
                      {String(p.lguNumbersOfCommunities || "").trim() || "—"}
                    </td>

                    <td style={styles.tdCenter}>
                      {p.numberOfMoa === "" ||
                        p.numberOfMoa === null ||
                        p.numberOfMoa === undefined
                        ? "—"
                        : toNumber(p.numberOfMoa)}
                    </td>

                    <td style={styles.td}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {Array.isArray(p.interventions) && p.interventions.length > 0 ? (
                          <div style={{ display: "grid", gap: 6 }}>
                            {p.interventions.map((it, i) => {
                              const isSelected = selectedId === it.id;
                              return (
                                <button
                                  key={it.id}
                                  onClick={() => setSelectedInterventionByProject((prev) => ({ ...prev, [p.id]: it.id }))}
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
                                  title={it.type || ""}
                                >
                                  {i + 1}. [{it.type || "—"}] {getInterventionLabel(it)}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={{ fontSize: 11, opacity: 0.6 }}>—</div>
                        )}

                        <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }} className="cest-actions">
                          {allowAdd && (
                            <button style={styles.pillBtn} onClick={() => openInterventionPicker(p.id)}>
                              + Add
                            </button>
                          )}

                          {allowEdit && (
                            <button
                              style={styles.tinyBtn}
                              disabled={!selectedId}
                              onClick={() => openInterventionDetails_Edit(p.id, selectedId)}
                              title={!selectedId ? "Select an intervention first" : "Edit selected"}
                            >
                              Edit
                            </button>
                          )}

                          {allowDelete && (
                            <button
                              style={styles.dangerTiny}
                              disabled={!selectedId}
                              onClick={() => deleteIntervention(p.id, selectedId)}
                              title={!selectedId ? "Select an intervention first" : "Delete selected"}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </td>

                    <td style={styles.tdCenter}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                        <button
                          style={styles.tinyBtn}
                          onClick={() => {
                            setViewMode("list");
                            setViewProjectId(p.id);
                          }}
                        >
                          View
                        </button>
                        {allowEdit && (
                          <button style={styles.tinyBtn} onClick={() => openEditProject(p.id)}>
                            Edit
                          </button>
                        )}
                        {allowExport && (
                          <button style={styles.tinyBtn} onClick={() => openCESTPrintPopupRow(p.id)}>
                            Print
                          </button>
                        )}
                        {allowExport && (
                          <button style={styles.tinyBtn} onClick={() => openCESTExportPopupRow(p.id)}>
                            Export
                          </button>
                        )}
                        {allowDelete && (
                          <button style={styles.dangerBtn} onClick={() => deleteProject(p.id)}>
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div style={styles.modernPaginationWrap}>
        <div style={styles.modernPaginationRow}>
          <button
            type="button"
            className="modern-page-btn modern-page-arrow"
            style={styles.modernPageBtn(pageWindowStart === 1, false)}
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
            title="Previous pages"
          >
            ‹
          </button>

          {visiblePageNumbers.map((page) => {
            const isActive = page === currentPage;

            return (
              <button
                key={page}
                type="button"
                className={`modern-page-btn ${isActive ? "modern-page-active" : ""}`}
                style={styles.modernPageBtn(false, isActive)}
                onClick={() => {
                  setCurrentPage(page);
                }}
                title={`Page ${page}`}
              >
                {page}
              </button>
            );
          })}

          <button
            type="button"
            className="modern-page-btn modern-page-arrow"
            style={styles.modernPageBtn(false, false)}
            onClick={() =>
              setCurrentPage(
                Math.floor((currentPage - 1) / PAGE_NUMBER_WINDOW) * PAGE_NUMBER_WINDOW +
                PAGE_NUMBER_WINDOW +
                1
              )
            }
            disabled={false}
            title="Next pages"
          >
            ›
          </button>
        </div>
      </div>

      {/* ===== ADDRESS VIEW MODAL ===== */}
      {addressViewForProjectId && <AddressViewModal project={addressViewProject} onClose={() => setAddressViewForProjectId(null)} />}

      {/* ===== PICK INTERVENTION MODAL ===== */}
      {pickForId && (
        <div style={styles.modalBackdrop} className="cest-modal-backdrop" onClick={() => setPickForId(null)}>
          <div style={styles.pickModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.pickHeader}>
              <div>
                Add S&amp;T Intervention
                {pickedProject ? <span style={{ opacity: 0.9, fontWeight: 800 }}> — {pickedProject.projectTitle}</span> : null}
              </div>
              <button style={styles.closeX} onClick={() => setPickForId(null)}>
                ✕
              </button>
            </div>

            <div style={styles.pickBody}>
              {INTERVENTION_OPTIONS.map((opt) => (
                <button key={opt} style={styles.optionBtn} onClick={() => openInterventionDetails_Add(pickForId, opt)}>
                  {opt}
                </button>
              ))}
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>* Selecting a type will open the form.</div>
            </div>
          </div>
        </div>
      )}

      {/* ===== INTERVENTION DETAILS MODAL ===== */}
      {detailFor && (
        <div style={{ ...styles.modalBackdrop, zIndex: 2000 }} className="cest-modal-backdrop" onClick={() => setDetailFor(null)}>
          <div style={{ ...styles.detailsModal, position: "relative", zIndex: 2001 }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                {detailForm.type === "Calibration"
                  ? `${detailFor.mode === "edit" ? "Edit" : "Add"} Calibration Entry`
                  : `${detailFor.mode === "edit" ? "Edit" : "Add"} ${detailForm.type} Details`}
                {detailProject ? (
                  <span style={{ opacity: 0.9, fontWeight: 800 }}>
                    {" "}
                    — {detailProject.projectTitle}
                  </span>
                ) : null}
              </div>
              <button style={styles.closeX} onClick={() => setDetailFor(null)}>
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={{ maxWidth: 360 }}>
                <div style={styles.label}>Intervention Type</div>
                <input style={styles.input} value={detailForm.type} disabled />
              </div>

              {detailForm.type === "Calibration" ? (
                <>
                  <div style={{ marginTop: 12, fontWeight: 900, fontSize: 13, color: "#0f172a" }}>
                    Calibration Entry
                  </div>

                  <div style={{ ...styles.grid, marginTop: 10 }}>
                    <div style={styles.field}>
                      <div style={styles.label}>Category<span style={styles.req}>*</span></div>
                      <select
                        style={styles.input}
                        value={detailForm.calibrationCategory}
                        onChange={(e) => updateCalibrationForm("calibrationCategory", e.target.value)}
                      >
                        <option value="PAYING">PAYING</option>
                        <option value="NON-PAYING">NON-PAYING</option>
                      </select>
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Date<span style={styles.req}>*</span></div>
                      <input
                        type="date"
                        style={styles.input}
                        value={detailForm.calibrationDate}
                        onChange={(e) => updateCalibrationForm("calibrationDate", e.target.value)}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Type of Samples<span style={styles.req}>*</span></div>
                      <select
                        style={styles.input}
                        value={detailForm.calibrationTypeOfSample}
                        onChange={(e) => updateCalibrationForm("calibrationTypeOfSample", e.target.value)}
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
                        value={detailForm.calibrationTestType}
                        readOnly
                      />
                    </div>

                    {detailForm.calibrationTypeOfSample === "Weighing Scale" ? (
                      <>
                        <div style={styles.field}>
                          <div style={styles.label}>No. of Sample<span style={styles.req}>*</span></div>
                          <input
                            type="number"
                            min="1"
                            style={styles.input}
                            value={detailForm.calibrationNoOfSample}
                            onChange={(e) => updateCalibrationForm("calibrationNoOfSample", e.target.value)}
                          />
                        </div>

                        <div style={styles.field}>
                          <div style={styles.label}>Fees Collected (PHP)</div>
                          <input
                            type="number"
                            style={{ ...styles.input, background: "#f8fafc" }}
                            value={detailForm.calibrationFeesCollected}
                            readOnly
                          />
                        </div>

                        <div style={styles.breakdownBox}>
                          <div style={styles.breakdownHead}>MC Range Breakdown<span style={styles.req}>*</span></div>
                          <div style={{ fontSize: 12, marginBottom: 8, opacity: 0.8 }}>
                            Tip: when you add a new row, the system auto-fills the next row with the remaining sample count. You can still edit it.
                          </div>
                          {toNumber(detailForm.calibrationNoOfSample) <= 0 ? (
                            <div style={{ fontSize: 12, marginBottom: 8, color: "#b45309", fontWeight: 800 }}>
                              Please enter a value in the main No. of Sample field first before editing the breakdown sample fields.
                            </div>
                          ) : null}

                          {(detailForm.calibrationMcBreakdown || []).map((row, index) => (
                            <div key={row.id} style={styles.breakdownRow}>
                              <div style={styles.field}>
                                <div style={styles.label}>Range<span style={styles.req}>*</span></div>
                                <select
                                  style={styles.input}
                                  value={row.range}
                                  onChange={(e) => updateCalibrationBreakdownRow(row.id, "range", e.target.value)}
                                >
                                  <option value="">Select range</option>
                                  {CALIBRATION_MC_RANGE_OPTIONS.map((r) => (
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
                                    background:
                                      toNumber(detailForm.calibrationNoOfSample) > 0 ? "#fff" : "#f1f5f9",
                                    cursor:
                                      toNumber(detailForm.calibrationNoOfSample) > 0 ? "text" : "not-allowed",
                                  }}
                                  value={row.noOfSample}
                                  onChange={(e) => updateCalibrationBreakdownRow(row.id, "noOfSample", e.target.value)}
                                  disabled={toNumber(detailForm.calibrationNoOfSample) <= 0}
                                  placeholder={
                                    toNumber(detailForm.calibrationNoOfSample) > 0
                                      ? ""
                                      : "Enter main No. of Sample first"
                                  }
                                />
                              </div>

                              <div style={styles.field}>
                                <div style={styles.label}>
                                  Cost{detailForm.calibrationCategory === "PAYING" ? <span style={styles.req}>*</span> : null}
                                </div>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  style={styles.input}
                                  value={row.cost}
                                  onChange={(e) => updateCalibrationBreakdownRow(row.id, "cost", e.target.value)}
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
                                  style={
                                    index === 0 && (detailForm.calibrationMcBreakdown || []).length === 1
                                      ? { ...styles.dangerTiny, opacity: 0.45, cursor: "not-allowed" }
                                      : styles.dangerTiny
                                  }
                                  disabled={index === 0 && (detailForm.calibrationMcBreakdown || []).length === 1}
                                  onClick={() => removeCalibrationBreakdownRow(row.id)}
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ))}

                          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                            <button type="button" style={styles.pillBtn} onClick={addCalibrationBreakdownRow}>
                              + Add MC Range Breakdown
                            </button>

                            <div style={styles.breakdownTotals}>
                              <div>Main No. of Sample: {toNumber(detailForm.calibrationNoOfSample)}</div>
                              <div>Breakdown Total: {calibrationBreakdownTotal}</div>
                              <div>Remaining: {calibrationRemainingSamples}</div>
                              <div>Total Fees: {money(detailForm.calibrationFeesCollected)}</div>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={styles.field}>
                          <div style={styles.label}>No. of Sample<span style={styles.req}>*</span></div>
                          <input
                            type="number"
                            min="1"
                            style={styles.input}
                            value={detailForm.calibrationNoOfSample}
                            onChange={(e) => updateCalibrationForm("calibrationNoOfSample", e.target.value)}
                          />
                        </div>

                        <div style={styles.field}>
                          <div style={styles.label}>Range</div>
                          <input
                            style={styles.input}
                            value={detailForm.calibrationRange}
                            onChange={(e) => updateCalibrationForm("calibrationRange", e.target.value)}
                            placeholder="Optional for VC"
                          />
                        </div>

                        <div style={styles.field}>
                          <div style={styles.label}>
                            Cost{detailForm.calibrationCategory === "PAYING" ? <span style={styles.req}>*</span> : null}
                          </div>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            style={styles.input}
                            value={detailForm.calibrationCost}
                            onChange={(e) => updateCalibrationForm("calibrationCost", e.target.value)}
                          />
                        </div>

                        <div style={styles.field}>
                          <div style={styles.label}>Fees Collected (PHP)</div>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            style={{ ...styles.input, background: "#f8fafc" }}
                            value={detailForm.calibrationFeesCollected}
                            readOnly
                          />
                        </div>
                      </>
                    )}

                    <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                      <div style={styles.label}>Venue/Address<span style={styles.req}>*</span></div>
                      <button
                        type="button"
                        onClick={() => {
                          setAddressFlowTarget("calibration");
                          setAddressFlowOpen(true);
                        }}
                        style={styles.inputButton(Boolean(detailForm.calibrationAddress))}
                      >
                        <span style={{ opacity: detailForm.calibrationAddress ? 1 : 0.6 }}>
                          {detailForm.calibrationAddress || "Click to select venue/address"}
                        </span>
                        <span style={{ fontSize: 11, opacity: 0.65 }}>
                          {detailForm.calibrationAddress ? "Change" : "Select"}
                        </span>
                      </button>

                      {Number.isFinite(detailForm?.calibrationAddressMeta?.lat) &&
                        Number.isFinite(detailForm?.calibrationAddressMeta?.lng) ? (
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} className="cest-inline-actions">
                          <button
                            type="button"
                            style={styles.tinyBtn}
                            onClick={() =>
                              openGoogleMap(
                                detailForm.calibrationAddressMeta.lat,
                                detailForm.calibrationAddressMeta.lng
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
                                detailForm.calibrationAddressMeta.lat,
                                detailForm.calibrationAddressMeta.lng
                              )
                            }
                          >
                            Directions
                          </button>
                          <div style={{ fontSize: 12, opacity: 0.85, alignSelf: "center", ...styles.mono }}>
                            {detailForm.calibrationAddressMeta.lat.toFixed(6)}, {detailForm.calibrationAddressMeta.lng.toFixed(6)}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Female</div>
                      <input
                        type="number"
                        min="0"
                        style={styles.input}
                        value={detailForm.calibrationFemale}
                        onChange={(e) => updateCalibrationForm("calibrationFemale", e.target.value)}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Male</div>
                      <input
                        type="number"
                        min="0"
                        style={styles.input}
                        value={detailForm.calibrationMale}
                        onChange={(e) => updateCalibrationForm("calibrationMale", e.target.value)}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Total Customers</div>
                      <input
                        type="number"
                        style={{ ...styles.input, background: "#f8fafc" }}
                        value={detailForm.calibrationTotalCustomers}
                        readOnly
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>No. of Firms</div>
                      <input
                        type="number"
                        min="0"
                        style={styles.input}
                        value={detailForm.calibrationNoOfFirms}
                        onChange={(e) => updateCalibrationForm("calibrationNoOfFirms", e.target.value)}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>No. of New Firms</div>
                      <input
                        type="number"
                        min="0"
                        style={styles.input}
                        value={detailForm.calibrationNoOfNewFirms}
                        onChange={(e) => updateCalibrationForm("calibrationNoOfNewFirms", e.target.value)}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Age Range</div>
                      <input
                        style={styles.input}
                        value={detailForm.calibrationAgeRange}
                        onChange={(e) => updateCalibrationForm("calibrationAgeRange", e.target.value)}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>PWD</div>
                      <input
                        type="number"
                        min="0"
                        style={styles.input}
                        value={detailForm.calibrationPwd}
                        onChange={(e) => updateCalibrationForm("calibrationPwd", e.target.value)}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>IP</div>
                      <input
                        type="number"
                        min="0"
                        style={styles.input}
                        value={detailForm.calibrationIp}
                        onChange={(e) => updateCalibrationForm("calibrationIp", e.target.value)}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Senior Citizen</div>
                      <input
                        type="number"
                        min="0"
                        style={styles.input}
                        value={detailForm.calibrationSc}
                        onChange={(e) => updateCalibrationForm("calibrationSc", e.target.value)}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>4PS</div>
                      <input
                        type="number"
                        min="0"
                        style={styles.input}
                        value={detailForm.calibrationFourPs}
                        onChange={(e) => updateCalibrationForm("calibrationFourPs", e.target.value)}
                      />
                    </div>
                  </div>
                </>
              ) : detailForm.type === "Training" ? (
                <>
                  <div style={{ marginTop: 12, fontWeight: 900, fontSize: 13, color: "#0f172a" }}>
                    Training Details
                  </div>

                  <div style={{ ...styles.grid, marginTop: 10 }}>
                    <div style={styles.field}>
                      <div style={styles.label}>Program / Training (optional)</div>
                      <input
                        style={styles.input}
                        value={detailForm.trainingProgram}
                        onChange={(e) => setDetailForm((p) => ({ ...p, trainingProgram: e.target.value }))}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Province</div>
                      <input
                        style={styles.input}
                        value={detailForm.trainingProvince}
                        onChange={(e) => setDetailForm((p) => ({ ...p, trainingProvince: e.target.value }))}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Start Date *</div>
                      <input
                        style={styles.input}
                        type="date"
                        value={detailForm.trainingStartDate}
                        onChange={(e) => setDetailForm((p) => ({ ...p, trainingStartDate: e.target.value }))}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>End Date</div>
                      <input
                        style={styles.input}
                        type="date"
                        value={detailForm.trainingEndDate}
                        onChange={(e) => setDetailForm((p) => ({ ...p, trainingEndDate: e.target.value }))}
                      />
                    </div>

                    <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                      <div style={styles.label}>Title *</div>
                      <textarea
                        style={styles.textarea}
                        value={detailForm.title}
                        onChange={(e) => setDetailForm((p) => ({ ...p, title: e.target.value }))}
                      />
                    </div>              <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                      <div style={styles.label}>Venue/Address *</div>
                      <button
                        type="button"
                        onClick={() => {
                          setAddressFlowTarget("training");
                          setAddressFlowOpen(true);
                        }}
                        style={styles.inputButton(Boolean(detailForm.trainingVenueAddress))}
                      >
                        <span style={{ opacity: detailForm.trainingVenueAddress ? 1 : 0.6 }}>
                          {detailForm.trainingVenueAddress || "Click to select venue/address"}
                        </span>
                        <span style={{ fontSize: 11, opacity: 0.65 }}>
                          {detailForm.trainingVenueAddress ? "Change" : "Select"}
                        </span>
                      </button>
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>No. of Firms</div>
                      <input
                        style={styles.input}
                        type="number"
                        value={detailForm.noOfFirms}
                        onChange={(e) => setDetailForm((p) => ({ ...p, noOfFirms: e.target.value }))}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>No. of Firms / SUCs / HEIs / LGUs</div>
                      <input
                        style={styles.input}
                        type="number"
                        value={detailForm.trainingFirmsSucsHeisLgusCount}
                        onChange={(e) => setDetailForm((p) => ({ ...p, trainingFirmsSucsHeisLgusCount: e.target.value }))}
                      />
                    </div>

                    <div style={styles.field}><div style={styles.label}>Participants Female</div><input style={styles.input} type="number" value={detailForm.trainingParticipantsFemale} onChange={(e) => setDetailForm((p) => ({ ...p, trainingParticipantsFemale: e.target.value }))} /></div>
                    <div style={styles.field}><div style={styles.label}>Participants Male</div><input style={styles.input} type="number" value={detailForm.trainingParticipantsMale} onChange={(e) => setDetailForm((p) => ({ ...p, trainingParticipantsMale: e.target.value }))} /></div>
                    <div style={styles.field}><div style={styles.label}>Senior Female</div><input style={styles.input} type="number" value={detailForm.trainingSeniorFemale} onChange={(e) => setDetailForm((p) => ({ ...p, trainingSeniorFemale: e.target.value }))} /></div>
                    <div style={styles.field}><div style={styles.label}>Senior Male</div><input style={styles.input} type="number" value={detailForm.trainingSeniorMale} onChange={(e) => setDetailForm((p) => ({ ...p, trainingSeniorMale: e.target.value }))} /></div>
                    <div style={styles.field}><div style={styles.label}>IPs Female</div><input style={styles.input} type="number" value={detailForm.trainingIpFemale} onChange={(e) => setDetailForm((p) => ({ ...p, trainingIpFemale: e.target.value }))} /></div>
                    <div style={styles.field}><div style={styles.label}>IPs Male</div><input style={styles.input} type="number" value={detailForm.trainingIpMale} onChange={(e) => setDetailForm((p) => ({ ...p, trainingIpMale: e.target.value }))} /></div>
                    <div style={styles.field}><div style={styles.label}>4Ps Female</div><input style={styles.input} type="number" value={detailForm.trainingFourPsFemale} onChange={(e) => setDetailForm((p) => ({ ...p, trainingFourPsFemale: e.target.value }))} /></div>
                    <div style={styles.field}><div style={styles.label}>4Ps Male</div><input style={styles.input} type="number" value={detailForm.trainingFourPsMale} onChange={(e) => setDetailForm((p) => ({ ...p, trainingFourPsMale: e.target.value }))} /></div>
                    <div style={styles.field}><div style={styles.label}>PWD Female</div><input style={styles.input} type="number" value={detailForm.trainingPwdFemale} onChange={(e) => setDetailForm((p) => ({ ...p, trainingPwdFemale: e.target.value }))} /></div>
                    <div style={styles.field}><div style={styles.label}>PWD Male</div><input style={styles.input} type="number" value={detailForm.trainingPwdMale} onChange={(e) => setDetailForm((p) => ({ ...p, trainingPwdMale: e.target.value }))} /></div>

                    <div style={styles.field}><div style={styles.label}>Total Female</div><input style={{ ...styles.input, background: "#f8fafc" }} value={trainingTotalFemale} readOnly /></div>
                    <div style={styles.field}><div style={styles.label}>Total Male</div><input style={{ ...styles.input, background: "#f8fafc" }} value={trainingTotalMale} readOnly /></div>
                    <div style={{ ...styles.field, gridColumn: "1 / -1" }}><div style={styles.label}>Total Participants</div><input style={{ ...styles.input, background: "#f8fafc" }} value={trainingTotalParticipants} readOnly /></div>

                    <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                      <div style={styles.label}>List of Firms / Associations</div>
                      <textarea style={styles.textarea} value={detailForm.trainingFirmsAssociationsList} onChange={(e) => setDetailForm((p) => ({ ...p, trainingFirmsAssociationsList: e.target.value }))} />
                    </div>

                    <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                      <div style={styles.label}>Name of Trainor / Affiliation</div>
                      <textarea style={styles.textarea} value={detailForm.trainingTrainorAffiliation} onChange={(e) => setDetailForm((p) => ({ ...p, trainingTrainorAffiliation: e.target.value }))} />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Name Of Program / Project / Unit</div>
                      <input style={styles.input} value={detailForm.projectProgramUnit} onChange={(e) => setDetailForm((p) => ({ ...p, projectProgramUnit: e.target.value }))} />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>DOST Cost</div>
                      <input style={styles.input} type="number" value={detailForm.trainingCostDost} onChange={(e) => setDetailForm((p) => ({ ...p, trainingCostDost: e.target.value }))} />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Partner Agency Cost</div>
                      <input style={styles.input} type="number" value={detailForm.trainingCostPartnerAgency} onChange={(e) => setDetailForm((p) => ({ ...p, trainingCostPartnerAgency: e.target.value }))} />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Total Cost</div>
                      <input style={{ ...styles.input, background: "#f8fafc" }} value={trainingTotalCost} readOnly />
                    </div>
                  </div>
                </>
              ) : detailForm.type === "Packaging & Labeling" ? (
                <>
                  <div style={{ marginTop: 12, fontWeight: 900, fontSize: 13, color: "#0f172a" }}>
                    Packaging & Labeling Details
                  </div>

                  <div style={{ ...styles.grid, marginTop: 10 }}>
                    <div style={styles.field}>
                      <div style={styles.label}>Quarter <span style={{ color: "#dc2626" }}>*</span></div>
                      <select
                        style={styles.input}
                        value={detailForm.packagingQuarter}
                        onChange={(e) => setDetailForm((p) => ({ ...p, packagingQuarter: e.target.value }))}
                      >
                        <option value="">--</option>
                        <option value="1">1Q</option>
                        <option value="2">2Q</option>
                        <option value="3">3Q</option>
                        <option value="4">4Q</option>
                      </select>
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Province <span style={{ color: "#dc2626" }}>*</span></div>
                      <input
                        style={styles.input}
                        value={detailForm.packagingProvince}
                        onChange={(e) => setDetailForm((p) => ({ ...p, packagingProvince: e.target.value }))}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Date Completed/Executed <span style={{ color: "#dc2626" }}>*</span></div>
                      <input
                        style={styles.input}
                        type="date"
                        value={detailForm.packagingDateCompleted}
                        onChange={(e) => setDetailForm((p) => ({ ...p, packagingDateCompleted: e.target.value }))}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Type of Intervention <span style={{ color: "#dc2626" }}>*</span></div>
                      <select
                        style={styles.input}
                        value={detailForm.packagingTypeOfIntervention}
                        onChange={(e) => setDetailForm((p) => ({ ...p, packagingTypeOfIntervention: e.target.value }))}
                      >
                        <option value="Label Design">Label Design</option>
                        <option value="Packaging Design">Packaging Design</option>
                        <option value="Label Printing">Label Printing</option>
                        <option value="Packaging Material">Packaging Material</option>
                        <option value="Other Packaging Support">Other Packaging Support</option>
                      </select>
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Size/Variant of Label Design/Type of Packaging Material <span style={{ color: "#dc2626" }}>*</span></div>
                      <input
                        style={styles.input}
                        value={detailForm.packagingSizeVariant}
                        onChange={(e) => setDetailForm((p) => ({ ...p, packagingSizeVariant: e.target.value }))}
                        placeholder="e.g. 4x5.6 inches Sticker type"
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>No. of Packaging Materials Provided <span style={{ color: "#dc2626" }}>*</span></div>
                      <input
                        style={styles.input}
                        value={detailForm.packagingMaterialsProvided}
                        onChange={(e) => setDetailForm((p) => ({ ...p, packagingMaterialsProvided: e.target.value }))}
                        placeholder="e.g. N/A or quantity"
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Name of Customer <span style={{ color: "#dc2626" }}>*</span></div>
                      <input
                        style={styles.input}
                        value={detailForm.packagingCustomerName}
                        onChange={(e) => setDetailForm((p) => ({ ...p, packagingCustomerName: e.target.value }))}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Sex (M/F)</div>
                      <select
                        style={styles.input}
                        value={detailForm.packagingSex}
                        onChange={(e) => setDetailForm((p) => ({ ...p, packagingSex: e.target.value }))}
                      >
                        <option value="">--</option>
                        <option value="M">M</option>
                        <option value="F">F</option>
                      </select>
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Product Name</div>
                      <input
                        style={styles.input}
                        value={detailForm.packagingProductName}
                        onChange={(e) => setDetailForm((p) => ({ ...p, packagingProductName: e.target.value }))}
                        placeholder="Optional product name"
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Name of Firm/Institution <span style={{ color: "#dc2626" }}>*</span></div>
                      <input
                        style={styles.input}
                        value={detailForm.packagingFirmInstitution}
                        onChange={(e) => setDetailForm((p) => ({ ...p, packagingFirmInstitution: e.target.value }))}
                        placeholder="e.g. RiceBIS Bayambang Agriculture Cooperative"
                      />
                    </div>

                    <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                      <div style={styles.label}>Venue/Address <span style={{ color: "#dc2626" }}>*</span></div>
                      <button
                        type="button"
                        onClick={() => {
                          setAddressFlowTarget("packaging");
                          setAddressFlowOpen(true);
                        }}
                        style={styles.inputButton(Boolean(detailForm.packagingAddress))}
                      >
                        <span style={{ opacity: detailForm.packagingAddress ? 1 : 0.6 }}>
                          {detailForm.packagingAddress || "Click to select venue/address"}
                        </span>
                        <span style={{ fontSize: 11, opacity: 0.65 }}>
                          {detailForm.packagingAddress ? "Change" : "Select"}
                        </span>
                      </button>
                    </div>

                    <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                      <div style={styles.label}>Means of Verification</div>
                      <textarea
                        style={styles.textarea}
                        value={detailForm.packagingMeansVerification}
                        onChange={(e) => setDetailForm((p) => ({ ...p, packagingMeansVerification: e.target.value }))}
                        placeholder="Design approval sheet / links / OR / AR / report / photos..."
                      />

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
                        <button type="button" style={styles.tinyBtn} onClick={() => openLinkMaybe(detailForm.packagingMeansVerification)}>
                          View Link
                        </button>

                        <button type="button" style={styles.tinyBtn} onClick={triggerAddPackagingPhotos}>
                          Add Photos
                        </button>

                        <button
                          type="button"
                          style={styles.tinyBtn}
                          onClick={() => openPackagingPhotoViewerAt(0)}
                          disabled={!packagingPhotoCount()}
                        >
                          Photos: {packagingPhotoCount()}
                        </button>
                      </div>

                      <input
                        ref={packagingPhotoInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        style={{ display: "none" }}
                        onChange={(e) => onPickPackagingPhotos(e.target.files)}
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
                    * After saving the entry, add the product names from the main table.
                  </div>
                </>
              ) : ["Tech Promo", "S&T Promo"].includes(detailForm.type) ? (
                <>
                  <div
                    style={{
                      marginTop: 12,
                      fontSize: 12,
                      opacity: 0.8,
                      fontWeight: 900,
                      marginBottom: 10,
                    }}
                  >
                    Fields with <span style={{ color: "#dc2626" }}>*</span> are required. (Project is optional.)
                  </div>

                  <div style={{ ...styles.grid, marginTop: 10 }}>
                    <div style={styles.field}>
                      <div style={styles.label}>Project (optional)</div>
                      <input
                        style={{ ...styles.input, background: "#f3f4f6", cursor: "not-allowed" }}
                        value="CEST"
                        readOnly
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Activity Date <span style={{ color: "#dc2626" }}>*</span></div>
                      <input
                        style={styles.input}
                        type="date"
                        value={detailForm.promoActivityDate}
                        onChange={(e) => setDetailForm((p) => ({ ...p, promoActivityDate: e.target.value }))}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Technology Promoted <span style={{ color: "#dc2626" }}>*</span></div>
                      <input
                        style={styles.input}
                        value={detailForm.promoTechnologyPromoted}
                        onChange={(e) => setDetailForm((p) => ({ ...p, promoTechnologyPromoted: e.target.value }))}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Technology Generator <span style={{ color: "#dc2626" }}>*</span></div>
                      <input
                        style={styles.input}
                        value={detailForm.promoTechnologyGenerator}
                        onChange={(e) => setDetailForm((p) => ({ ...p, promoTechnologyGenerator: e.target.value }))}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Mode of Promotion <span style={{ color: "#dc2626" }}>*</span></div>
                      <select
                        style={styles.input}
                        value={detailForm.promoModeOfPromotion}
                        onChange={(e) => setDetailForm((p) => ({ ...p, promoModeOfPromotion: e.target.value }))}
                      >
                        <option value="Social Media">Social Media</option>
                        <option value="Press Release">Press Release</option>
                        <option value="Radio">Radio</option>
                        <option value="TV">TV</option>
                        <option value="Print">Print</option>
                        <option value="Forum / Event">Forum / Event</option>
                        <option value="Exhibit">Exhibit</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Activity Title <span style={{ color: "#dc2626" }}>*</span></div>
                      <input
                        style={styles.input}
                        value={detailForm.promoActivityTitle}
                        onChange={(e) => setDetailForm((p) => ({ ...p, promoActivityTitle: e.target.value }))}
                      />
                    </div>

                    <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                      <div style={styles.label}>Activity Venue/Address <span style={{ color: "#dc2626" }}>*</span></div>
                      <button
                        type="button"
                        onClick={() => {
                          setAddressFlowTarget("promoVenue");
                          setAddressFlowOpen(true);
                        }}
                        style={styles.inputButton(Boolean(detailForm.promoActivityVenueAddress))}
                      >
                        <span style={{ opacity: detailForm.promoActivityVenueAddress ? 1 : 0.6 }}>
                          {detailForm.promoActivityVenueAddress || "Click to select activity venue/address"}
                        </span>
                        <span style={{ fontSize: 11, opacity: 0.65 }}>
                          {detailForm.promoActivityVenueAddress ? "Change" : "Select"}
                        </span>
                      </button>
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Name of Customer/Participant <span style={{ color: "#dc2626" }}>*</span></div>
                      <input
                        style={styles.input}
                        value={detailForm.promoCustomerName}
                        onChange={(e) => setDetailForm((p) => ({ ...p, promoCustomerName: e.target.value }))}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Customer/Participant Address <span style={{ color: "#dc2626" }}>*</span></div>
                      <input
                        style={styles.input}
                        value={detailForm.promoCustomerAddress}
                        onChange={(e) => setDetailForm((p) => ({ ...p, promoCustomerAddress: e.target.value }))}
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Sex (M/F)</div>
                      <select
                        style={styles.input}
                        value={detailForm.promoSex}
                        onChange={(e) => setDetailForm((p) => ({ ...p, promoSex: e.target.value }))}
                      >
                        <option value="N/A">N/A</option>
                        <option value="M">M</option>
                        <option value="F">F</option>
                      </select>
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Name of Staff <span style={{ color: "#dc2626" }}>*</span></div>
                      <input
                        style={styles.input}
                        value={detailForm.promoStaffName}
                        onChange={(e) => setDetailForm((p) => ({ ...p, promoStaffName: e.target.value }))}
                      />
                    </div>

                    <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                      <div style={styles.label}>Means of Verification</div>
                      <textarea
                        style={styles.textarea}
                        value={detailForm.promoMeansVerification}
                        onChange={(e) => setDetailForm((p) => ({ ...p, promoMeansVerification: e.target.value }))}
                        placeholder="Attendance sheet / links to socmed posts / activity reports / photos..."
                      />

                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                          alignItems: "center",
                          marginTop: 8,
                        }}
                      >
                        <button
                          type="button"
                          style={styles.tinyBtn}
                          onClick={() => openLinkMaybe(detailForm.promoMeansVerification)}
                        >
                          View First Link
                        </button>

                        <button
                          type="button"
                          style={styles.tinyBtn}
                          onClick={triggerAddPromoPhotos}
                        >
                          Add Photos
                        </button>

                        <button
                          type="button"
                          style={styles.tinyBtn}
                          onClick={() => openPromoPhotoViewerAt(0)}
                          disabled={!promoPhotoCount()}
                          title={!promoPhotoCount() ? "No photos yet" : "View saved photo(s)"}
                        >
                          Photos: {promoPhotoCount()}
                        </button>

                        <button
                          type="button"
                          style={styles.tinyBtn}
                          onClick={() => openPromoPhotoViewerAt(0)}
                          disabled={!promoPhotoCount()}
                        >
                          View Photos
                        </button>
                      </div>

                      {promoPhotoCount() > 0 ? (
                        <div
                          style={{
                            marginTop: 8,
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          {(detailForm.promoPhotos || []).map((photo, idx) => (
                            <button
                              key={`${photo?.name || "photo"}_${idx}`}
                              type="button"
                              style={styles.tinyBtn}
                              onClick={() => openPromoPhotoViewerAt(idx)}
                            >
                              Photo {idx + 1}
                            </button>
                          ))}
                        </div>
                      ) : null}

                      {extractLinks(detailForm.promoMeansVerification).length > 0 ? (
                        <div
                          style={{
                            marginTop: 8,
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          {extractLinks(detailForm.promoMeansVerification).map((url, idx) => (
                            <button
                              key={`${url}_${idx}`}
                              type="button"
                              style={styles.tinyBtn}
                              onClick={() => openSpecificLink(url)}
                              title={url}
                            >
                              Link {idx + 1}
                            </button>
                          ))}
                        </div>
                      ) : null}

                      <input
                        ref={promoPhotoInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        style={{ display: "none" }}
                        onChange={(e) => onPickPromoPhotos(e.target.files)}
                      />
                    </div>
                  </div>
                </>
              ) : null}
              {detailForm.type === "Tech Roll Out" ? (
                <>
                  <div style={{ ...styles.grid, marginTop: 12 }}>
                    {(() => {
                      const r = (detailForm.techRows || [])[0] || makeDefaultTechRows()[0];
                      return (
                        <>
                          <div style={styles.field}>
                            <div style={styles.label}>Quarter *</div>
                            <select
                              style={styles.input}
                              value={r.quarter || ""}
                              onChange={(e) => updateTechRow(0, "quarter", e.target.value)}
                            >
                              <option value="">--</option>
                              <option value="1">1Q</option>
                              <option value="2">2Q</option>
                              <option value="3">3Q</option>
                              <option value="4">4Q</option>
                            </select>
                          </div>

                          <div style={styles.field}>
                            <div style={styles.label}>Unit/Center *</div>
                            <input
                              style={styles.input}
                              value={r.unitCenter || ""}
                              onChange={(e) => updateTechRow(0, "unitCenter", e.target.value)}
                            />
                          </div>

                          <div style={styles.field}>
                            <div style={styles.label}>Name of Knowledge/Technology Transferred *</div>
                            <input
                              style={styles.input}
                              value={r.nameOfTechnologyTransferred || ""}
                              onChange={(e) => updateTechRow(0, "nameOfTechnologyTransferred", e.target.value)}
                            />
                          </div>

                          <div style={styles.field}>
                            <div style={styles.label}>Technology Generator *</div>
                            <input
                              style={styles.input}
                              value={r.technologyGenerator || ""}
                              onChange={(e) => updateTechRow(0, "technologyGenerator", e.target.value)}
                            />
                          </div>

                          <div style={styles.field}>
                            <div style={styles.label}>Mode of Transfer *</div>
                            <select
                              style={styles.input}
                              value={r.modeOfTransfer || ""}
                              onChange={(e) => updateTechRow(0, "modeOfTransfer", e.target.value)}
                            >
                              <option value="">-- Select --</option>
                              <option value="Commercialization">Commercialization</option>
                              <option value="Extension">Extension</option>
                              <option value="Public Good">Public Good</option>
                              <option value="Technology Adoption">Technology Adoption</option>
                              <option value="Training">Training</option>
                              <option value="Technical Assistance">Technical Assistance</option>
                            </select>
                          </div>

                          <div style={styles.field}>
                            <div style={styles.label}>Date Transferred *</div>
                            <input
                              style={styles.input}
                              type="date"
                              value={r.dateTransferred || ""}
                              onChange={(e) => updateTechRow(0, "dateTransferred", e.target.value)}
                            />
                          </div>

                          <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                            <div style={styles.label}>DOST-developed/funded knowledge/technology</div>
                            <label
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "2px 0 0",
                                fontSize: 13,
                                fontWeight: 700,
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={Boolean(r.isDostDevelopedFunded)}
                                onChange={(e) => updateTechRow(0, "isDostDevelopedFunded", e.target.checked)}
                                style={{ width: 16, height: 16, margin: 0 }}
                              />
                              <span>The transferred knowledge/technology is DOST-developed/funded</span>
                            </label>
                          </div>

                          <div style={styles.field}>
                            <div style={styles.label}>Activity Title *</div>
                            <input
                              style={styles.input}
                              value={r.activityTitle || ""}
                              onChange={(e) => updateTechRow(0, "activityTitle", e.target.value)}
                            />
                          </div>

                          <div style={styles.field}>
                            <div style={styles.label}>Activity Date *</div>
                            <input
                              style={styles.input}
                              type="date"
                              value={r.activityDate || ""}
                              onChange={(e) => updateTechRow(0, "activityDate", e.target.value)}
                            />
                          </div>

                          <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                            <div style={styles.label}>Activity Venue</div>
                            <input
                              style={styles.input}
                              value={r.activityVenue || ""}
                              onChange={(e) => updateTechRow(0, "activityVenue", e.target.value)}
                            />
                          </div>

                          <div style={styles.field}>
                            <div style={styles.label}>Institution Name *</div>
                            <input
                              style={styles.input}
                              value={r.institutionName || ""}
                              onChange={(e) => updateTechRow(0, "institutionName", e.target.value)}
                            />
                          </div>

                          <div style={styles.field}>
                            <div style={styles.label}>Classification *</div>
                            <select
                              style={styles.input}
                              value={r.classification || ""}
                              onChange={(e) => updateTechRow(0, "classification", e.target.value)}
                            >
                              <option value="">-- Select --</option>
                              <option value="Individual">Individual</option>
                              <option value="MSME/Firm">MSME/Firm</option>
                              <option value="Academe">Academe</option>
                              <option value="LGU">LGU</option>
                              <option value="Cooperative/Association">Cooperative/Association</option>
                              <option value="NGO">NGO</option>
                              <option value="National Agency">National Agency</option>
                            </select>
                          </div>

                          <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                            <div style={styles.label}>Institution Address *</div>
                            <button
                              type="button"
                              onClick={() => {
                                setAddressFlowTarget(`techInstitution:0`);
                                setAddressFlowOpen(true);
                              }}
                              style={styles.inputButton(Boolean(r.institutionAddress))}
                            >
                              <span style={{ opacity: r.institutionAddress ? 1 : 0.6 }}>
                                {r.institutionAddress || "Click to select address"}
                              </span>
                              <span style={{ fontSize: 11, opacity: 0.65 }}>
                                {r.institutionAddress ? "Change" : "Select"}
                              </span>
                            </button>
                          </div>

                          <div style={styles.field}>
                            <div style={styles.label}>Representative Name *</div>
                            <input
                              style={styles.input}
                              value={r.representativeName || ""}
                              onChange={(e) => updateTechRow(0, "representativeName", e.target.value)}
                            />
                          </div>

                          <div style={styles.field}>
                            <div style={styles.label}>Representative Designation</div>
                            <input
                              style={styles.input}
                              value={r.representativeDesignation || ""}
                              onChange={(e) => updateTechRow(0, "representativeDesignation", e.target.value)}
                            />
                          </div>

                          <div style={styles.field}>
                            <div style={styles.label}>Sex (M/F)</div>
                            <select
                              style={styles.input}
                              value={r.sex || ""}
                              onChange={(e) => updateTechRow(0, "sex", e.target.value)}
                            >
                              <option value="">--</option>
                              <option value="M">M</option>
                              <option value="F">F</option>
                            </select>
                          </div>
                        </>
                      );
                    })()}
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
                    <div style={styles.field}>
                      <div style={styles.label}>Type of Consultancy *</div>
                      <select
                        style={styles.input}
                        value={detailForm.consultancyType}
                        onChange={(e) =>
                          setDetailForm((p) => ({
                            ...p,
                            consultancyType: e.target.value,
                          }))
                        }
                      >
                        <option value="">-- Select --</option>
                        {TACS_CONSULTANCY_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
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
                      />
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Name of Expert / Institution</div>
                      <textarea
                        style={styles.textarea}
                        value={detailForm.expertInstitution}
                        onChange={(e) =>
                          setDetailForm((p) => ({
                            ...p,
                            expertInstitution: e.target.value,
                          }))
                        }
                        placeholder="e.g. Engr. Arnold C. Santos"
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
                        placeholder="e.g. Mr. Oliver Caasi"
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
                      >
                        <option value="">--</option>
                        <option value="M">M</option>
                        <option value="F">F</option>
                      </select>
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>Address of Customer *</div>
                      <button
                        type="button"
                        onClick={() => {
                          setAddressFlowTarget("tacs");
                          setAddressFlowOpen(true);
                        }}
                        style={styles.inputButton(Boolean(detailForm.customerAddress))}
                      >
                        <span style={{ opacity: detailForm.customerAddress ? 1 : 0.6 }}>
                          {detailForm.customerAddress || "Click to select address of customer"}
                        </span>
                        <span style={{ fontSize: 11, opacity: 0.65 }}>
                          {detailForm.customerAddress ? "Change" : "Select"}
                        </span>
                      </button>
                    </div>

                    <div style={styles.field}>
                      <div style={styles.label}>No. of Advice/Recommendations *</div>
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
                        placeholder="e.g. 1"
                      />
                    </div>

                    <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                      <div style={styles.label}>Means of Verification</div>
                      <textarea
                        style={styles.textarea}
                        value={detailForm.meansVerification}
                        onChange={(e) =>
                          setDetailForm((p) => ({
                            ...p,
                            meansVerification: e.target.value,
                          }))
                        }
                        placeholder="Attendance sheet / links to socmed posts / activity reports / photos..."
                      />

                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                          alignItems: "center",
                          marginTop: 8,
                        }}
                      >
                        <button
                          type="button"
                          style={styles.tinyBtn}
                          onClick={() => openLinkMaybe(detailForm.meansVerification)}
                        >
                          View Link
                        </button>

                        <button
                          type="button"
                          style={styles.tinyBtn}
                          onClick={triggerAddTacsPhotos}
                        >
                          Add Photos
                        </button>

                        <button
                          type="button"
                          style={styles.tinyBtn}
                          onClick={() => openTacsPhotoViewerAt(0)}
                          disabled={!tacsPhotoCount()}
                        >
                          Photos: {tacsPhotoCount()}
                        </button>
                      </div>

                      {tacsPhotoCount() > 0 ? (
                        <div
                          style={{
                            marginTop: 8,
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          {(detailForm.tacsPhotos || []).map((photo, idx) => (
                            <button
                              key={`${photo?.name || "photo"}_${idx}`}
                              type="button"
                              style={styles.tinyBtn}
                              onClick={() => openTacsPhotoViewerAt(idx)}
                            >
                              Photo {idx + 1}
                            </button>
                          ))}
                        </div>
                      ) : null}

                      <input
                        ref={tacsPhotoInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        style={{ display: "none" }}
                        onChange={(e) => onPickTacsPhotos(e.target.files)}
                      />
                    </div>
                  </div>
                </>
              ) : null}

              <div style={{ ...styles.field, marginTop: 12 }}>
                <div style={styles.label}>{detailForm.type === "Calibration" ? "Remarks" : "Notes / Remarks"}</div>
                <textarea
                  style={styles.textarea}
                  value={detailForm.notes}
                  onChange={(e) =>
                    setDetailForm((prev) => ({
                      ...prev,
                      notes: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button
                style={styles.btnGhost}
                onClick={() => {
                  setDetailFor(null);
                  resetDetailForm("");
                }}
              >
                Cancel
              </button>
              {((detailFor.mode === "add" && allowAdd) || (detailFor.mode === "edit" && allowEdit)) && (
                <button style={styles.btnDark} onClick={saveInterventionDetails}>
                  {detailForm.type === "Calibration"
                    ? detailFor.mode === "edit"
                      ? "Update Entry"
                      : "Save Entry"
                    : detailFor.mode === "edit"
                      ? "Update"
                      : "Save"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {promoPhotoViewerIndex >= 0 && Array.isArray(detailForm.promoPhotos) && detailForm.promoPhotos[promoPhotoViewerIndex] ? (
        <div style={styles.photoViewerBackdrop} onClick={closePromoPhotoViewer}>
          <div style={styles.photoViewerModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                View Photo
                <span style={{ opacity: 0.9, fontWeight: 800 }}>
                  {` — ${promoPhotoViewerIndex + 1} of ${detailForm.promoPhotos.length}`}
                </span>
              </div>
              <button style={styles.closeX} onClick={closePromoPhotoViewer}>
                ✕
              </button>
            </div>

            <div
              style={{
                ...styles.modalBody,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#0f172a",
                padding: 12,
              }}
            >
              <img
                src={getPromoPhotoUrl(detailForm.promoPhotos[promoPhotoViewerIndex])}
                alt={detailForm.promoPhotos[promoPhotoViewerIndex]?.name || `Photo ${promoPhotoViewerIndex + 1}`}
                style={{
                  maxWidth: "100%",
                  maxHeight: "70vh",
                  objectFit: "contain",
                  borderRadius: 8,
                  background: "#fff",
                }}
              />
            </div>

            <div style={styles.modalFooter}>
              <button style={styles.btnGhost} onClick={showPrevPromoPhoto}>
                Prev
              </button>
              <button
                style={styles.btnGhost}
                onClick={() => openPromoPhoto(detailForm.promoPhotos[promoPhotoViewerIndex])}
              >
                Open in New Tab
              </button>
              <button style={styles.btnGhost} onClick={showNextPromoPhoto}>
                Next
              </button>
              <button style={styles.btnDark} onClick={closePromoPhotoViewer}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {packagingPhotoViewerIndex >= 0 && Array.isArray(detailForm.packagingPhotos) && detailForm.packagingPhotos[packagingPhotoViewerIndex] ? (
        <div style={styles.photoViewerBackdrop} onClick={closePackagingPhotoViewer}>
          <div style={styles.photoViewerModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                View Packaging Photo
                <span style={{ opacity: 0.9, fontWeight: 800 }}>
                  {` — ${packagingPhotoViewerIndex + 1} of ${detailForm.packagingPhotos.length}`}
                </span>
              </div>
              <button style={styles.closeX} onClick={closePackagingPhotoViewer}>
                ✕
              </button>
            </div>

            <div
              style={{
                ...styles.modalBody,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#0f172a",
                padding: 12,
              }}
            >
              <img
                src={getPackagingPhotoUrl(detailForm.packagingPhotos[packagingPhotoViewerIndex])}
                alt={detailForm.packagingPhotos[packagingPhotoViewerIndex]?.name || `Photo ${packagingPhotoViewerIndex + 1}`}
                style={{
                  maxWidth: "100%",
                  maxHeight: "70vh",
                  objectFit: "contain",
                  borderRadius: 8,
                  background: "#fff",
                }}
              />
            </div>

            <div style={styles.modalFooter}>
              <button style={styles.btnGhost} onClick={showPrevPackagingPhoto}>
                Prev
              </button>
              <button
                style={styles.btnGhost}
                onClick={() => openPackagingPhoto(detailForm.packagingPhotos[packagingPhotoViewerIndex])}
              >
                Open in New Tab
              </button>
              <button style={styles.btnGhost} onClick={showNextPackagingPhoto}>
                Next
              </button>
              <button style={styles.btnDark} onClick={closePackagingPhotoViewer}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}



      {tacsPhotoViewerIndex >= 0 && Array.isArray(detailForm.tacsPhotos) && detailForm.tacsPhotos[tacsPhotoViewerIndex] ? (
        <div style={styles.photoViewerBackdrop} onClick={closeTacsPhotoViewer}>
          <div style={styles.photoViewerModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                View TACS Photo
                <span style={{ opacity: 0.9, fontWeight: 800 }}>
                  {` — ${tacsPhotoViewerIndex + 1} of ${detailForm.tacsPhotos.length}`}
                </span>
              </div>
              <button style={styles.closeX} onClick={closeTacsPhotoViewer}>
                ✕
              </button>
            </div>

            <div
              style={{
                ...styles.modalBody,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#0f172a",
                padding: 12,
              }}
            >
              <img
                src={getTacsPhotoUrl(detailForm.tacsPhotos[tacsPhotoViewerIndex])}
                alt={detailForm.tacsPhotos[tacsPhotoViewerIndex]?.name || `Photo ${tacsPhotoViewerIndex + 1}`}
                style={{
                  maxWidth: "100%",
                  maxHeight: "70vh",
                  objectFit: "contain",
                  borderRadius: 8,
                  background: "#fff",
                }}
              />
            </div>

            <div style={styles.modalFooter}>
              <button style={styles.btnGhost} onClick={showPrevTacsPhoto}>
                Prev
              </button>
              <button
                style={styles.btnGhost}
                onClick={() => openTacsPhoto(detailForm.tacsPhotos[tacsPhotoViewerIndex])}
              >
                Open in New Tab
              </button>
              <button style={styles.btnGhost} onClick={showNextTacsPhoto}>
                Next
              </button>
              <button style={styles.btnDark} onClick={closeTacsPhotoViewer}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {/* ===== VIEW PROJECT MODAL ===== */}
      {viewProjectId && viewProject && (
        <div style={{ ...styles.modalBackdrop, zIndex: 1500 }} onClick={() => setViewProjectId(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              ...styles.modal,
              position: "relative",
              zIndex: 1501,
              width: "min(980px, calc(100vw - 24px))",
              maxWidth: "980px",
              maxHeight: "calc(100vh - 24px)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={styles.modalHeader}>
              <div>View Project</div>
              <button style={styles.closeX} onClick={() => setViewProjectId(null)}>
                ✕
              </button>
            </div>

            <div
              style={{
                ...styles.modalBody,
                overflowY: "auto",
                flex: 1,
                paddingBottom: 24,
              }}
            >
              {/* PROJECT INFORMATION */}
              <div style={{ fontWeight: 900, fontSize: 22, marginBottom: 12 }}>
                Project Information
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: 18,
                  marginBottom: 14,
                }}
              >
                <div>
                  <div style={styles.label}>Project Title</div>
                  <div style={viewStyles.value}>{viewProject.projectTitle || "—"}</div>
                </div>

                <div>
                  <div style={styles.label}>Name of Firm</div>
                  <div style={viewStyles.value}>
                    {viewProject.associationName || "—"}
                  </div>
                </div>

                <div>
                  <div style={styles.label}>Name of Project Proponent</div>
                  <div style={viewStyles.value}>
                    {viewProject.projectProponent || "—"}
                  </div>
                </div>

                <div>
                  <div style={styles.label}>Sex</div>
                  <div style={viewStyles.value}>{viewProject.sex || "—"}</div>
                </div>

                <div>
                  <div style={styles.label}>District</div>
                  <div style={viewStyles.value}>
                    {(() => {
                      const muni =
                        viewProject?.addressMeta?.municipality ||
                        getProjectMunicipality(viewProject);
                      const found = PANGASINAN_DISTRICTS.find((d) =>
                        d.municipalities.includes(muni)
                      );
                      return found?.id || "—";
                    })()}
                  </div>
                </div>

                <div>
                  <div style={styles.label}>Date of Fund Release</div>
                  <div style={viewStyles.value}>
                    {viewProject.dateFundRelease || "—"}
                  </div>
                </div>

                <div>
                  <div style={styles.label}>Amount</div>
                  <div style={viewStyles.value}>
                    {money(viewProject.approvedProjectCost)}
                  </div>
                </div>

                <div>
                  <div style={styles.label}>Status</div>
                  <div style={viewStyles.value}>Ongoing</div>
                </div>

                <div>
                  <div style={styles.label}>Type</div>
                  <div style={viewStyles.value}>
                    {viewProject.type || "—"}
                  </div>
                </div>

                <div>
                  <div style={styles.label}>Date Approved</div>
                  <div style={viewStyles.value}>
                    {viewProject.dateProjectApproval || "—"}
                  </div>
                </div>

                <div>
                  <div style={styles.label}>Name of Staff</div>
                  <div style={viewStyles.value}>{viewProject.staffName || "—"}</div>
                </div>
              </div>

              {/* ADDRESS */}
              <div style={{ marginBottom: 12 }}>
                <div style={styles.label}>Venue/Address</div>
                <div style={viewStyles.boxValue}>
                  {viewProject.address || "—"}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: 18,
                  marginBottom: 8,
                }}
              >
                <div>
                  <div style={styles.label}>Name of LGU-Communities</div>
                  <div style={viewStyles.value}>
                    {viewProject.lguNumbersOfCommunities === "" ||
                      viewProject.lguNumbersOfCommunities === null ||
                      viewProject.lguNumbersOfCommunities === undefined
                      ? "—"
                      : toNumber(viewProject.lguNumbersOfCommunities)}
                  </div>
                </div>

                <div>
                  <div style={styles.label}>Number of MOA</div>
                  <div style={viewStyles.value}>
                    {viewProject.numberOfMoa === "" ||
                      viewProject.numberOfMoa === null ||
                      viewProject.numberOfMoa === undefined
                      ? "—"
                      : toNumber(viewProject.numberOfMoa)}
                  </div>
                </div>

                <div>
                  <div style={styles.label}>Venue/Address Mode</div>
                  <div style={viewStyles.value}>
                    {viewProject?.addressMeta?.mode || "—"}
                  </div>
                </div>

                <div>
                  <div style={styles.label}>Coordinates</div>
                  <div style={viewStyles.value}>
                    {Number.isFinite(viewProject?.addressMeta?.lat) &&
                      Number.isFinite(viewProject?.addressMeta?.lng)
                      ? `${viewProject.addressMeta.lat}, ${viewProject.addressMeta.lng}`
                      : "—"}
                  </div>
                </div>
              </div>

              {Number.isFinite(viewProject?.addressMeta?.lat) &&
                Number.isFinite(viewProject?.addressMeta?.lng) ? (
                <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
                  <button
                    style={styles.tinyBtn}
                    onClick={() =>
                      openGoogleMap(
                        viewProject.addressMeta.lat,
                        viewProject.addressMeta.lng
                      )
                    }
                  >
                    Map
                  </button>
                  <button
                    style={styles.tinyBtn}
                    onClick={() =>
                      openGoogleDirections(
                        viewProject.addressMeta.lat,
                        viewProject.addressMeta.lng
                      )
                    }
                  >
                    Directions
                  </button>
                </div>
              ) : null}

              {/* PROCESS / SYSTEM */}
              <div style={{ marginBottom: 18 }}>
                <div style={styles.label}>Process / System</div>
                <div style={viewStyles.boxValue}>
                  {viewProject.processSystem || "—"}
                </div>
              </div>

              {/* PRESS RELEASE + OUTCOME 4 */}
              <div style={{ marginBottom: 18 }}>
                <div
                  style={{
                    ...styles.dividerTitle,
                    fontWeight: 900,
                    fontSize: 13,
                    color: "#0f172a",
                    marginBottom: 8,
                  }}
                >
                  Other Indication (Outcome 4)
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                    alignItems: "end",
                  }}
                >
                  <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                    <div style={styles.label}>Number of startups assisted</div>
                    <textarea
                      style={styles.textarea}
                      placeholder={"Ilagay ang mga firm na nabigyan ng startup assistance\nHalimbawa:\nABC Foods\nXYZ Enterprise"}
                      value={viewStartupsAssistedInput}
                      onChange={(e) => setViewStartupsAssistedInput(e.target.value)}
                    />
                  </div>

                  <div style={styles.field}>
                    <div style={styles.label}>No. of jobs generated</div>
                    <input
                      type="number"
                      min="0"
                      style={styles.input}
                      value={viewJobsGeneratedInput}
                      onChange={(e) => setViewJobsGeneratedInput(e.target.value)}
                    />
                  </div>

                  <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                    <div style={styles.label}>Press Release</div>
                    <input
                      type="number"
                      min="0"
                      style={styles.input}
                      value={
                        Number(viewPressReleaseInput || 0) === 0
                          ? ""
                          : viewPressReleaseInput
                      }
                      onChange={(e) => setViewPressReleaseInput(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ fontSize: 12, opacity: 0.75, marginTop: 8 }}>
                  * Note: “Technologies promoted” and “Press release activities” are encoded inside each S&amp;T Intervention entry.
                </div>
              </div>

              {/* S&T INTERVENTIONS */}
              <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 10 }}>
                S&amp;T Interventions
              </div>

              <div style={{ ...styles.tableWrap, marginBottom: 18 }}>
                <table style={{ ...styles.table, minWidth: 760 }}>
                  <colgroup>
                    <col style={{ width: "6%" }} />
                    <col style={{ width: "18%" }} />
                    <col style={{ width: "22%" }} />
                    <col style={{ width: "14%" }} />
                    <col style={{ width: "30%" }} />
                    <col style={{ width: "10%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={styles.th}>#</th>
                      <th style={styles.th}>Type</th>
                      <th style={styles.th}>Title / Label</th>
                      <th style={styles.th}>Date</th>
                      <th style={styles.th}>Venue</th>
                      <th style={styles.th}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewProject.interventions || []).length ? (
                      viewProject.interventions.map((it, i) => (
                        <tr key={it.id}>
                          <td style={styles.tdCenter}>{i + 1}</td>
                          <td style={styles.tdCenter}>{it.type || "—"}</td>
                          <td style={styles.td}>{getInterventionLabel(it)}</td>
                          <td style={styles.tdCenter}>{it.date || "—"}</td>
                          <td style={styles.td}>{it.venue || "—"}</td>
                          <td style={styles.tdCenter}>
                            {allowEdit ? (
                              <button
                                style={styles.tinyBtn}
                                onClick={() =>
                                  openInterventionDetails_Edit(viewProject.id, it.id)
                                }
                              >
                                Edit
                              </button>
                            ) : (
                              <span style={{ fontSize: 11, opacity: 0.65 }}>View only</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td style={styles.tdCenter} colSpan={6}>
                          —
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* OTHER INDICATORS */}
              {/* OTHER INDICATORS */}
              <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 10 }}>
                Other Indicators
              </div>

              <div style={styles.tableWrap}>
                <table style={{ ...styles.table, minWidth: 760 }}>
                  <colgroup>
                    <col style={{ width: "86%" }} />
                    <col style={{ width: "14%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th style={styles.th}>Indicator</th>
                      <th style={styles.th}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={styles.td}>Number of technologies deployed to communities</td>
                      <td style={styles.tdCenter}>
                        {
                          Array.isArray(viewProject.interventions)
                            ? viewProject.interventions.filter((it) => it.type === "Tech Roll Out").length
                            : 0
                        }
                      </td>
                    </tr>

                    <tr>
                      <td style={styles.td}>Number of beneficiaries</td>
                      <td style={styles.tdCenter}>
                        {
                          Array.isArray(viewProject.interventions)
                            ? viewProject.interventions
                              .filter((it) => it.type === "Training")
                              .reduce((sum, it) => sum + toNumber(it.total), 0)
                            : 0
                        }
                      </td>
                    </tr>

                    <tr>
                      <td style={styles.td}>Number of S&amp;T Intervention</td>
                      <td style={styles.tdCenter}>
                        {Array.isArray(viewProject.interventions)
                          ? viewProject.interventions.length
                          : 0}
                      </td>
                    </tr>

                    <tr>
                      <td style={styles.td}>No. of technologies promoted (total)</td>
                      <td style={styles.tdCenter}>
                        {toNumber(viewInterventionSums.techPromoted)}
                      </td>
                    </tr>

                    <tr>
                      <td style={styles.td}>
                        No. of S&amp;T promotion activities conducted (total) press release - City/Municipal Level
                      </td>
                      <td style={styles.tdCenter}>
                        {toNumber(viewProject.pressRelease)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>


            {(() => {
              const projectCustomFields =
                typeof (viewProject?.customFields || viewProject?.custom_fields || {}) === "string"
                  ? (() => {
                    try {
                      return JSON.parse(viewProject?.customFields || viewProject?.custom_fields || "{}");
                    } catch {
                      return {};
                    }
                  })()
                  : viewProject?.customFields || viewProject?.custom_fields || {};

              const displayCustomFields =
                cestCustomFields.length > 0
                  ? cestCustomFields
                  : Object.keys(projectCustomFields || {}).map((key) => ({
                    key,
                    fieldKey: key,
                    fieldLabel: key,
                    field_label: key,
                  }));

              return displayCustomFields.length > 0 ? (
                <div
                  style={{
                    padding: "0 16px 16px",
                    borderTop: "1px solid #e5e7eb",
                  }}
                >

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                      gap: 14,
                    }}
                  >
                    {displayCustomFields.map((field) => {
                      const key = field.fieldKey || field.field_key || field.key;
                      const label = field.fieldLabel || field.field_label || field.label || key;
                      const value = projectCustomFields?.[key];

                      return (
                        <div key={key}>
                          <div style={styles.label}>{label}</div>
                          <div
                            style={{
                              minHeight: 42,
                              border: "1px solid #e5e7eb",
                              borderRadius: 12,
                              padding: "10px 12px",
                              background: "#f8fafc",
                              fontWeight: 800,
                            }}
                          >
                            {value === null || value === undefined || value === "" ? "—" : String(value)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null;
            })()}
            <div style={styles.modalFooter}>
              <button style={styles.btnGhost} onClick={() => setViewProjectId(null)}>
                Cancel
              </button>
              {allowEdit && (
                <button style={styles.btnDark} onClick={saveViewPressRelease}>
                  Save
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== ADD/EDIT PROJECT MODAL ===== */}
      {showAdd && (
        <div style={styles.modalBackdrop} onClick={() => setShowAdd(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>{editProjectId ? "Edit Project" : "Add Project"}</div>
              <button style={styles.closeX} onClick={() => setShowAdd(false)}>
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.grid}>
                <div style={styles.field}>
                  <div style={styles.label}>Quarter *</div>
                  <select style={styles.input} value={form.quarter} onChange={(e) => setForm({ ...form, quarter: e.target.value })}>
                    <option value="1">1Q</option>
                    <option value="2">2Q</option>
                    <option value="3">3Q</option>
                    <option value="4">4Q</option>
                  </select>
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Type *</div>
                  <select style={styles.input} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    {COMMUNITY_TYPE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Project Title *</div>
                  <input style={styles.input} value={form.projectTitle} onChange={(e) => setForm({ ...form, projectTitle: e.target.value })} />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Date of Project Approval *</div>
                  <input
                    style={styles.input}
                    type="date"
                    value={form.dateProjectApproval}
                    onChange={(e) => setForm({ ...form, dateProjectApproval: e.target.value })}
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Approved Project Cost (in Peso) *</div>
                  <input
                    style={styles.input}
                    type="number"
                    value={form.approvedProjectCost}
                    onChange={(e) => setForm({ ...form, approvedProjectCost: e.target.value })}
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Date of Fund Release</div>
                  <input
                    style={styles.input}
                    type="date"
                    value={form.dateFundRelease}
                    onChange={(e) => setForm({ ...form, dateFundRelease: e.target.value })}
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Name of Association / Cooperative</div>
                  <input style={styles.input} value={form.associationName} onChange={(e) => setForm({ ...form, associationName: e.target.value })} />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Venue/Address *</div>
                  <button type="button" onClick={() => setAddressFlowOpen(true)} style={styles.inputButton(Boolean(form.address))}>
                    <span style={{ opacity: form.address ? 1 : 0.6 }}>{form.address || "Click to select venue/address"}</span>
                    <span style={{ fontSize: 11, opacity: 0.65 }}>{form.address ? "Change" : "Select"}</span>
                  </button>

                  {Number.isFinite(form?.addressMeta?.lat) && Number.isFinite(form?.addressMeta?.lng) ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }} className="cest-inline-actions">
                      <button type="button" style={styles.tinyBtn} onClick={() => openGoogleMap(form.addressMeta.lat, form.addressMeta.lng)}>
                        Map
                      </button>
                      <button
                        type="button"
                        style={styles.tinyBtn}
                        onClick={() => openGoogleDirections(form.addressMeta.lat, form.addressMeta.lng)}
                      >
                        Directions
                      </button>
                      <div style={{ fontSize: 12, opacity: 0.85, alignSelf: "center", ...styles.mono }}>
                        {form.addressMeta.lat.toFixed(6)}, {form.addressMeta.lng.toFixed(6)}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Name of LGU-Communities</div>
                  <input
                    style={styles.input}
                    type="number"
                    value={form.lguNumbersOfCommunities}
                    onChange={(e) => setForm({ ...form, lguNumbersOfCommunities: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Number of MOA</div>
                  <input
                    style={styles.input}
                    type="number"
                    value={form.numberOfMoa}
                    onChange={(e) => setForm({ ...form, numberOfMoa: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Name of Project Proponent *</div>
                  <input style={styles.input} value={form.projectProponent} onChange={(e) => setForm({ ...form, projectProponent: e.target.value })} />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Sex (M/F)</div>
                  <select style={styles.input} value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })}>
                    <option value="">--</option>
                    <option value="M">M</option>
                    <option value="F">F</option>
                  </select>
                </div>

                <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                  <div style={styles.label}>Name of Staff</div>
                  <input
                    style={styles.input}
                    value={form.staffName}
                    onChange={(e) => setForm({ ...form, staffName: e.target.value })}
                    placeholder="Type name of staff"
                  />
                </div>

                <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                  <div style={styles.label}>Process/System Developed/Improved</div>
                  <textarea
                    style={styles.textarea}
                    value={form.processSystem}
                    onChange={(e) => setForm({ ...form, processSystem: e.target.value })}
                  />
                </div>

                <UnifiedMOVSection
                  value={form.meansOfVerification || ""}
                  photos={form.movPhotos || []}
                  onValueChange={(value) => setForm((p) => ({ ...p, meansOfVerification: value }))}
                  onPhotosChange={(photos) => setForm((p) => ({ ...p, movPhotos: photos }))}
                />
              </div>
            </div>


            {cestCustomFields.length > 0 ? (
              <div
                style={{
                  padding: "0 16px 16px",
                  borderTop: "1px solid #e5e7eb",
                }}
              >

                <div style={styles.grid}>
                  {cestCustomFields.map((field) => {
                    const key = field.fieldKey || field.field_key || field.key;
                    const label = field.fieldLabel || field.field_label || field.label || key;
                    const type = String(field.fieldType || field.field_type || field.type || "Text").toLowerCase();
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

                    if (type.includes("yes/no") || type.includes("radio")) {
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
            ) : null}
            <div style={styles.modalFooter}>
              <button
                style={styles.btnGhost}
                onClick={() => {
                  setShowAdd(false);
                  setEditProjectId(null);
                  resetForm();
                }}
              >
                Cancel
              </button>
              {((editProjectId && allowEdit) || (!editProjectId && allowAdd)) && (
                <button style={styles.btnDark} onClick={saveProject}>
                  {editProjectId ? "Update Project" : "Save Project"}
                </button>
              )}
            </div>
          </div>
        </div>
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
                {printModal.scope === "row" ? `Project: ${getCESTOutputLabel((projects.find((p) => String(p.id) === String(printModal.entryId || exportModal.entryId)))) || "—"}` : "Records: filtered rows"}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
                <div style={styles.field}><div style={styles.label}>Layout</div><select style={styles.input} value={printModal.layout} onChange={(e) => setPrintModal((p) => ({ ...p, layout: e.target.value }))}><option value="FORM">Form-Based Record Sheet</option><option value="TABLE">Table Layout</option><option value="COMPACT">Compact Summary</option></select></div>
                <div style={styles.field}><div style={styles.label}>Orientation</div><select style={styles.input} value={printModal.orientation} onChange={(e) => setPrintModal((p) => ({ ...p, orientation: e.target.value }))}><option value="landscape">Landscape (default)</option><option value="portrait">Portrait</option></select></div>
                <div style={styles.field}><div style={styles.label}>Paper Size</div><select style={styles.input} value={printModal.preset} onChange={(e) => setPrintModal((p) => ({ ...p, preset: e.target.value }))}><option value="a4">A4</option><option value="letter">Letter</option><option value="legal">Legal</option><option value="custom">Custom</option></select></div>
                <div style={styles.field}><div style={styles.label}>Custom Size (inches)</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><input style={styles.input} disabled={printModal.preset !== "custom"} value={printModal.customSize.width} onChange={(e) => setPrintModal((p) => ({ ...p, customSize: { ...p.customSize, width: e.target.value } }))} placeholder="Width" /><input style={styles.input} disabled={printModal.preset !== "custom"} value={printModal.customSize.height} onChange={(e) => setPrintModal((p) => ({ ...p, customSize: { ...p.customSize, height: e.target.value } }))} placeholder="Height" /></div></div>
              </div>
            </div>
            <div style={styles.modalFooter}><button type="button" style={styles.btnGhost} onClick={() => setPrintModal((p) => ({ ...p, open: false }))}>Cancel</button><button type="button" style={styles.btnDark} onClick={confirmCESTPrint}>Print Now</button></div>
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
              <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 10 }}>{exportModal.scope === "row" ? `Project: ${getCESTOutputLabel((projects.find((p) => String(p.id) === String(printModal.entryId || exportModal.entryId)))) || "—"}` : "Records: filtered rows"}</div>
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
            <div style={styles.modalFooter}><button type="button" style={styles.btnGhost} onClick={() => setExportModal((p) => ({ ...p, open: false }))}>Cancel</button><button type="button" style={styles.btnDark} onClick={confirmCESTExport}>Export Now</button></div>
          </div>
        </div>
      ) : null}

      {addressFlowOpen && (
        <AddressFlowModal
          open={addressFlowOpen}
          onClose={() => {
            setAddressFlowOpen(false);
            setAddressFlowTarget("project");
          }}
          onSave={(meta) => {
            if (addressFlowTarget === "tacs") {
              applyAddressMetaToDetailForm(meta);
            } else if (addressFlowTarget === "calibration") {
              applyAddressMetaToCalibrationForm(meta);
            } else if (addressFlowTarget === "training") {
              applyAddressMetaToTrainingForm(meta);
            } else if (addressFlowTarget === "packaging") {
              applyAddressMetaToPackagingForm(meta);
            } else if (addressFlowTarget === "promoVenue") {
              applyAddressMetaToPromoVenue(meta);
            } else if (addressFlowTarget === "promoCustomer") {
              applyAddressMetaToPromoCustomer(meta);
            } else if (String(addressFlowTarget).startsWith("techInstitution:")) {
              const idx = Number(String(addressFlowTarget).split(":")[1]);
              if (Number.isFinite(idx)) applyAddressMetaToTechInstitution(idx, meta);
            } else {
              applyAddressMetaToForm(meta);
            }
          }}
          initialMeta={
            addressFlowTarget === "tacs"
              ? detailForm.customerAddressMeta
              : addressFlowTarget === "calibration"
                ? detailForm.calibrationAddressMeta
                : addressFlowTarget === "training"
                  ? detailForm.trainingVenueAddressMeta
                  : addressFlowTarget === "packaging"
                    ? detailForm.packagingAddressMeta
                    : addressFlowTarget === "promoVenue"
                      ? detailForm.promoActivityVenueMeta
                      : addressFlowTarget === "promoCustomer"
                        ? detailForm.promoCustomerAddressMeta
                        : String(addressFlowTarget).startsWith("techInstitution:")
                          ? detailForm.techRows?.[Number(String(addressFlowTarget).split(":")[1])]?.institutionAddressMeta || null
                          : form.addressMeta
          }
        />
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




