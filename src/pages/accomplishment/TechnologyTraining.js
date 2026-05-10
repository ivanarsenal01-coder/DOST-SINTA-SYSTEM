import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import API_BASE from "../../api";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, PageOrientation } from "docx";

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

export default function TechnologyTraining() {
  // =========================
  // API
  // =========================
  const TRAINING_API = `${API_BASE}/technology-training`;
  const PROGRAM_ADD = "__ADD_PROGRAM__";

  const parseTechTrainingCustomFields = (value) => {
    if (!value) return {};
    if (typeof value === "object") return value;
    try {
      return JSON.parse(value || "{}");
    } catch {
      return {};
    }
  };

  const cleanTechTrainingCustomLabel = (value) =>
    String(value || "")
      .replace(/^#+/, "")
      .replace(/_/g, " ")
      .trim()
      .replace(/\b\w/g, (m) => m.toUpperCase());

  const fontFamily =
    '"Poppins", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"';

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
  // =========================
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

  // =========================
  // Helpers
  // =========================
  const toNumber = (v) => {
    if (v === "" || v === null || v === undefined) return 0;
    const n = Number(String(v).replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const peso = (v) =>
    `₱${toNumber(v).toLocaleString("en-PH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return "—";
    const d = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(d.getTime())) return dateStr;
    return dateStr;
  };

  const formatDateRange = (start, end) => {
    if (!start && !end) return "—";
    if (start && !end) return formatDateDisplay(start);
    if (!start && end) return formatDateDisplay(end);
    if (start === end) return formatDateDisplay(start);
    return `${formatDateDisplay(start)} to ${formatDateDisplay(end)}`;
  };

  const isSyncedFromIntervention = (e) =>
    e?.interventionId !== null && e?.interventionId !== undefined && e?.interventionId !== "";

  // =========================
  // Defaults
  // =========================
  const DEFAULT_PROGRAM_OPTIONS = [
    "Waste Analysis and Characterization Study (WACS)",
    "Good Manufacturing Practices (cGMP)",
    "Food Safety",
    "Bread and Fruit Processing",
    "Environmental Protection and Conservation",
    "Disaster Risk Reduction and Management",
    "Association Management",
  ];

  // =========================
  // State
  // =========================
  const [entries, setEntries] = useState([]);
  const [techTrainingCustomFields, setTechTrainingCustomFields] = useState([]);

  const [programOptions, setProgramOptions] = useState(DEFAULT_PROGRAM_OPTIONS);
  const [programModalOpen, setProgramModalOpen] = useState(false);
  const [newProgramName, setNewProgramName] = useState("");

  const [entryModal, setEntryModal] = useState(null);
  const [entryForm, setEntryForm] = useState({
    program: "",
    province: "PANGASINAN",
    startDate: "",
    endDate: "",
    title: "",
    venueMeta: null,
    venueAddress: "",
    noOfFirms: "",

    participantsFemale: "",
    participantsMale: "",

    seniorFemale: "",
    seniorMale: "",

    ipFemale: "",
    ipMale: "",

    fourPsFemale: "",
    fourPsMale: "",

    pwdFemale: "",
    pwdMale: "",

    firmsSucsHeisLgusCount: "",
    firmsAssociationsList: "",
    trainorAffiliation: "",
    programProjectUnit: "",

    costDost: "",
    costPartnerAgency: "",
    staffName: "",
    customFields: {},
  });

  const [venueFlowOpen, setVenueFlowOpen] = useState(false);

  const [venueViewEntryId, setVenueViewEntryId] = useState(null);
  const venueViewEntry = useMemo(
    () => entries.find((x) => x.id === venueViewEntryId) || null,
    [entries, venueViewEntryId]
  );

  const [viewEntryId, setViewEntryId] = useState(null);
  const [viewMode, setViewMode] = useState("list");
  const viewEntry = useMemo(
    () => enrichEntry(entries.find((x) => x.id === viewEntryId) || null),
    [entries, viewEntryId]
  );

  const [filterYear, setFilterYear] = useState("");
  const [filterDistrict, setFilterDistrict] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterMunicipality, setFilterMunicipality] = useState("");
  const [filterView, setFilterView] = useState("overall");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [serverTotalRows, setServerTotalRows] = useState(0);
  const [serverTotalPages, setServerTotalPages] = useState(1);

  const [printModal, setPrintModal] = useState({ open: false, scope: "bulk", entryId: null, layout: "FORM", preset: "a4", orientation: "landscape", customSize: { width: 8.5, height: 13 } });
  const [exportModal, setExportModal] = useState({ open: false, scope: "bulk", entryId: null, format: "excel", template: "TABLE", preset: "a4", orientation: "landscape", customSize: { width: 8.5, height: 13 } });


  useEffect(() => {
    let cancelled = false;

    const fixedKeys = new Set([
      "no",
      "actions",
      "program",
      "province",
      "startDate",
      "start_date",
      "endDate",
      "end_date",
      "title",
      "venueAddress",
      "venue_address",
      "venueMeta",
      "venue_meta",
      "latitude",
      "longitude",
      "noOfFirms",
      "no_of_firms",
      "participantsFemale",
      "participants_female",
      "participantsMale",
      "participants_male",
      "seniorFemale",
      "senior_female",
      "seniorMale",
      "senior_male",
      "ipFemale",
      "ip_female",
      "ipMale",
      "ip_male",
      "fourPsFemale",
      "fourps_female",
      "fourPsMale",
      "fourps_male",
      "pwdFemale",
      "pwd_female",
      "pwdMale",
      "pwd_male",
      "totalFemale",
      "total_female",
      "totalMale",
      "total_male",
      "totalParticipants",
      "total_participants",
      "firmsSucsHeisLgusCount",
      "firms_sucs_heis_lgus_count",
      "firmsAssociationsList",
      "firms_associations_list",
      "trainorAffiliation",
      "trainor_affiliation",
      "programProjectUnit",
      "program_project_unit",
      "costDost",
      "cost_dost",
      "costPartnerAgency",
      "cost_partner_agency",
      "staffName",
      "staff_name",
      "nameOfStaff",
      "name_of_staff"
    ]);

    async function loadTechTrainingCustomFields() {
      try {
        const res = await axios.get(`${API_BASE}/table-management/config`);
        const modules = Array.isArray(res.data) ? res.data : [];

        const mod = modules.find((m) => {
          const name = String(m.moduleName || m.module_name || m.name || "").toLowerCase();
          return (
            name === "technology training" ||
            name === "technology trainings" ||
            name === "tech training" ||
            name.includes("technology training") ||
            name.includes("tech training")
          );
        });

        const table =
          (mod?.tables || []).find((t) => {
            const name = String(t.tableName || t.table_name || t.name || "").toLowerCase();
            return name === "main" || name.includes("training");
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

        if (!cancelled) setTechTrainingCustomFields(finalCustomFields);
      } catch (err) {
        console.error("Failed to load Technology Training custom fields:", err);
        if (!cancelled) {
          setTechTrainingCustomFields([
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

    loadTechTrainingCustomFields();

    return () => {
      cancelled = true;
    };
  }, []);
  // =========================
  // API LOAD
  // =========================
  const fetchEntries = async (pageArg = currentPage) => {
    try {
      const requestedPage = Math.max(1, Number(pageArg || 1));
      const res = await axios.get(`${TRAINING_API}/entries`, {
        params: {
          page: requestedPage,
          limit: rowsPerPage,
          search: debouncedSearch.trim(),
          year: filterYear || "ALL",
          district: filterDistrict || "ALL",
          month: filterMonth || "ALL",
          municipality: filterMunicipality || "ALL",
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

      const total = Number(
        payload?.total ??
        payload?.totalRows ??
        payload?.count ??
        rows.length ??
        0
      );

      const totalPages = Math.max(
        1,
        Number(
          payload?.totalPages ??
          Math.ceil(total / rowsPerPage) ??
          1
        ) || 1
      );

      setEntries(rows);
      setServerTotalRows(total);
      setServerTotalPages(totalPages);
      setCurrentPage(requestedPage);
    } catch (err) {
      console.error("Failed to load training entries:", err);
      setEntries([]);
      setServerTotalRows(0);
      setServerTotalPages(1);
    }
  };

  const fetchPrograms = async () => {
    try {
      const res = await axios.get(`${TRAINING_API}/programs`);
      const fromDb = Array.isArray(res.data)
        ? res.data.map((x) => String(x.name || "").trim())
        : [];
      const normalized = Array.from(new Set(fromDb.filter(Boolean)));
      setProgramOptions(normalized.length ? normalized : DEFAULT_PROGRAM_OPTIONS);
    } catch (err) {
      console.error("Failed to load training programs:", err);
      setProgramOptions(DEFAULT_PROGRAM_OPTIONS);
    }
  };

  useEffect(() => {
    fetchPrograms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 350);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, filterYear, filterDistrict, filterMonth, filterMunicipality]);

  useEffect(() => {
    fetchEntries(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, debouncedSearch, filterYear, filterDistrict, filterMonth, filterMunicipality]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setEntryModal(null);
        setProgramModalOpen(false);
        setVenueFlowOpen(false);
        setViewEntryId(null);
        setVenueViewEntryId(null);
        setPrintModal((p) => ({ ...p, open: false }));
        setExportModal((p) => ({ ...p, open: false }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // =========================
  // Computed totals
  // =========================
  function enrichEntry(e) {
    if (!e) return null;
    const participantsTotal = toNumber(e.participantsFemale) + toNumber(e.participantsMale);
    const seniorTotal = toNumber(e.seniorFemale) + toNumber(e.seniorMale);
    const ipTotal = toNumber(e.ipFemale) + toNumber(e.ipMale);
    const fourPsTotal = toNumber(e.fourPsFemale) + toNumber(e.fourPsMale);
    const pwdTotal = toNumber(e.pwdFemale) + toNumber(e.pwdMale);
    const costTotal = toNumber(e.costDost) + toNumber(e.costPartnerAgency);

    return {
      ...e,
      participantsTotal,
      seniorTotal,
      ipTotal,
      fourPsTotal,
      pwdTotal,
      costTotal,
      syncedFromIntervention: isSyncedFromIntervention(e),
    };
  }

  const enrichedEntries = useMemo(() => {
    const arr = entries.map(enrichEntry);

    return [...arr].sort((a, b) => {
      const aFromIntervention =
        a?.interventionId !== null &&
          a?.interventionId !== undefined &&
          a?.interventionId !== ""
          ? 1
          : 0;

      const bFromIntervention =
        b?.interventionId !== null &&
          b?.interventionId !== undefined &&
          b?.interventionId !== ""
          ? 1
          : 0;

      if (aFromIntervention !== bFromIntervention) {
        return aFromIntervention - bFromIntervention;
      }

      const aDate = new Date(a?.startDate || 0).getTime();
      const bDate = new Date(b?.startDate || 0).getTime();

      if (aDate !== bDate) return bDate - aDate;

      return Number(b?.id || 0) - Number(a?.id || 0);
    });
  }, [entries]);

  const totalFemale = useMemo(
    () =>
      toNumber(entryForm.participantsFemale) +
      toNumber(entryForm.seniorFemale) +
      toNumber(entryForm.ipFemale) +
      toNumber(entryForm.fourPsFemale) +
      toNumber(entryForm.pwdFemale),
    [
      entryForm.participantsFemale,
      entryForm.seniorFemale,
      entryForm.ipFemale,
      entryForm.fourPsFemale,
      entryForm.pwdFemale,
    ]
  );

  const totalMale = useMemo(
    () =>
      toNumber(entryForm.participantsMale) +
      toNumber(entryForm.seniorMale) +
      toNumber(entryForm.ipMale) +
      toNumber(entryForm.fourPsMale) +
      toNumber(entryForm.pwdMale),
    [
      entryForm.participantsMale,
      entryForm.seniorMale,
      entryForm.ipMale,
      entryForm.fourPsMale,
      entryForm.pwdMale,
    ]
  );

  const totalParticipants = useMemo(
    () => totalFemale + totalMale,
    [totalFemale, totalMale]
  );

  const getToolbarDistrict = (entry) => {
    const municipality =
      String(entry?.municipality || entry?.venueMeta?.municipality || "").trim();

    if (!municipality) return "";

    const found = PANGASINAN_DISTRICTS.find((d) =>
      d.municipalities.some((m) => m.toLowerCase() === municipality.toLowerCase())
    );

    return found?.id || "";
  };

  const getToolbarMunicipality = (entry) => {
    const venueMunicipality = String(entry?.venueMeta?.municipality || "").trim();
    if (venueMunicipality) return venueMunicipality;

    const addr = String(entry?.venueAddress || "").trim();
    if (!addr) return "";

    const parts = addr
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (parts.length >= 2) {
      return parts[parts.length - 2];
    }

    return "";
  };

  const availableYears = useMemo(() => {
    return Array.from({ length: 81 }, (_, index) => String(2050 - index));
  }, []);

  const filteredEntries = useMemo(() => {
    if (filterView === "manual") {
      return enrichedEntries.filter((entry) => !entry?.syncedFromIntervention);
    }

    if (filterView === "synced") {
      return enrichedEntries.filter((entry) => !!entry?.syncedFromIntervention);
    }

    return enrichedEntries;
  }, [enrichedEntries, filterView]);

  const clearFilters = () => {
    setSearch("");
    setFilterYear("");
    setFilterDistrict("");
    setFilterMonth("");
    setFilterMunicipality("");
    setFilterView("overall");
    setCurrentPage(1);
  };

  const exportFilteredToCSV = () => {
    const rows = filteredEntries.map((e, i) => ({
      No: i + 1,
      Province: e.province || "",
      Date: formatDateRange(e.startDate, e.endDate),
      VenueAddress: venueAddressText(e),
      Title: e.title || "",
      FirmsSucsHeisLgus: toNumber(e.firmsSucsHeisLgusCount),
      FirmsAssociations: e.firmsAssociationsList || "",
      TrainorAffiliation: e.trainorAffiliation || "",
      ProgramProjectUnit: e.programProjectUnit || "",
    }));

    const headers = [
      "No",
      "Province",
      "Date",
      "VenueAddress",
      "Title",
      "FirmsSucsHeisLgus",
      "FirmsAssociations",
      "TrainorAffiliation",
      "ProgramProjectUnit",
    ];

    const escapeCSV = (value) => {
      const s = String(value ?? "");
      return `"${s.replace(/"/g, '""')}"`;
    };

    const csv = [
      headers.join(","),
      ...rows.map((row) => headers.map((h) => escapeCSV(row[h])).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "technology_training.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const municipalityFilterOptions = useMemo(() => {
    return [...PANGASINAN_LGUS].sort((a, b) => a.localeCompare(b));
  }, [PANGASINAN_LGUS]);

  const PAGE_NUMBER_WINDOW = 10;
  const totalPages = Math.max(1, Number(serverTotalPages || 1));
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



  // =========================
  // Export / Print popup actions
  // =========================
  const escapeHtml = (value = "") => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  const downloadBlob = (blob, filename) => { const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url); };
  const trainingColumns = ["No.", "Program", "Province", "Date", "Venue/Address", "Coordinates", "Title", "No. of Firms", "Female", "Male", "Total Participants", "Name of Staff", "Trainor/Affiliation", "Program/Project/Unit", "DOST Cost", "Partner Cost", "Total Cost"];
  const buildTrainingRows = (scope = "bulk", entryId = null) => {
    const source = scope === "row" && entryId ? filteredEntries.filter((e) => e.id === entryId) : filteredEntries;
    return source.map((e, i) => {
      const enriched = enrichEntry(e);
      return {
        "No.": i + 1,
        Program: enriched?.program || "",
        Province: enriched?.province || "PANGASINAN",
        Date: formatDateRange(enriched?.startDate, enriched?.endDate),
        "Venue/Address": venueAddressText(enriched),
        Coordinates: venueCoordText(enriched),
        Title: enriched?.title || "",
        "No. of Firms": enriched?.noOfFirms || "",
        Female: enriched?.totalFemale ?? (toNumber(enriched?.participantsFemale) + toNumber(enriched?.seniorFemale) + toNumber(enriched?.ipFemale) + toNumber(enriched?.fourPsFemale) + toNumber(enriched?.pwdFemale)),
        Male: enriched?.totalMale ?? (toNumber(enriched?.participantsMale) + toNumber(enriched?.seniorMale) + toNumber(enriched?.ipMale) + toNumber(enriched?.fourPsMale) + toNumber(enriched?.pwdMale)),
        "Total Participants": enriched?.participantsTotal || 0,
        "Name of Staff": enriched?.staffName || enriched?.nameOfStaff || "",
        "Trainor/Affiliation": enriched?.trainorAffiliation || "",
        "Program/Project/Unit": enriched?.programProjectUnit || "",
        "DOST Cost": enriched?.costDost || "",
        "Partner Cost": enriched?.costPartnerAgency || "",
        "Total Cost": enriched?.costTotal || 0,
      };
    });
  };
  const openPrintPopupRow = (entryId) => setPrintModal((p) => ({ ...p, open: true, scope: "row", entryId, layout: "FORM" }));
  const openPrintPopupBulk = () => setPrintModal((p) => ({ ...p, open: true, scope: "bulk", entryId: null, layout: "FORM" }));
  const openExportPopupRow = (entryId) => setExportModal((p) => ({ ...p, open: true, scope: "row", entryId, format: "excel" }));
  const openExportPopupBulk = () => setExportModal((p) => ({ ...p, open: true, scope: "bulk", entryId: null, format: "excel" }));
  const confirmExport = async () => {
    const rows = buildTrainingRows(exportModal.scope, exportModal.entryId);
    const base = exportModal.scope === "row" ? `technology_training_${exportModal.entryId || "row"}` : "technology_training_filtered";
    if (exportModal.format === "csv") {
      const csv = [trainingColumns.join(","), ...rows.map((r) => trainingColumns.map((c) => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
      downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `${base}.csv`);
    } else if (exportModal.format === "pdf") {
      const doc = new jsPDF({ orientation: exportModal.orientation === "portrait" ? "p" : "l", unit: "pt", format: exportModal.preset === "legal" ? "legal" : exportModal.preset === "letter" ? "letter" : "a4" });
      doc.setFontSize(14); doc.text("Technology Training Export", 40, 38);
      autoTable(doc, { head: [trainingColumns], body: rows.map((r) => trainingColumns.map((c) => String(r[c] ?? ""))), startY: 55, styles: { fontSize: 7, cellPadding: 3, overflow: "linebreak" }, headStyles: { fillColor: [11, 78, 162] } });
      doc.save(`${base}.pdf`);
    } else if (exportModal.format === "docx") {
      const tableRows = [new TableRow({ children: trainingColumns.map((c) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: c, bold: true })] })] })) }), ...rows.map((r) => new TableRow({ children: trainingColumns.map((c) => new TableCell({ children: [new Paragraph(String(r[c] ?? ""))] })) }))];
      const doc = new Document({ sections: [{ properties: { page: { size: { orientation: exportModal.orientation === "portrait" ? PageOrientation.PORTRAIT : PageOrientation.LANDSCAPE } } }, children: [new Paragraph({ children: [new TextRun({ text: "Technology Training Export", bold: true, size: 28 })] }), new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } })] }] });
      downloadBlob(await Packer.toBlob(doc), `${base}.docx`);
    } else {
      const ws = XLSX.utils.json_to_sheet(rows); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Training"); XLSX.writeFile(wb, `${base}.xlsx`);
    }
    setExportModal((p) => ({ ...p, open: false }));
  };
  const confirmPrint = () => {
    const rows = buildTrainingRows(printModal.scope, printModal.entryId);
    const body = printModal.layout === "TABLE" ? `<table><thead><tr>${trainingColumns.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr></thead><tbody>${rows.length ? rows.map((r) => `<tr>${trainingColumns.map((c) => `<td>${escapeHtml(r[c])}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${trainingColumns.length}">No data available. Template/header only.</td></tr>`}</tbody></table>` : `${rows.length ? rows.map((r) => `<div class="card">${trainingColumns.map((c) => `<div><b>${escapeHtml(c)}:</b> ${escapeHtml(r[c])}</div>`).join("")}</div>`).join("") : `<div class="card">No data available. Template/header only.</div>`}`;
    const win = window.open("", "_blank", "width=1200,height=900"); if (!win) return alert("Popup blocked. Please allow popups for printing.");
    win.document.write(`<!doctype html><html><head><title>Technology Training Print</title><style>@page{size:${printModal.preset || "a4"} ${printModal.orientation || "landscape"};margin:10mm;}body{font-family:Arial;padding:12px;color:#0f172a}h1{font-size:18px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #94a3b8;padding:6px;font-size:11px;vertical-align:top}th{background:#e2e8f0}.card{border:1px solid #94a3b8;border-radius:8px;padding:10px;margin-bottom:10px;display:grid;gap:4px;font-size:12px}</style></head><body><h1>Technology Training Print</h1>${body}<script>setTimeout(()=>window.print(),250)</script></body></html>`); win.document.close(); win.focus();
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
      overflowX: "visible",
      fontFamily,
    },
    sectionTitle: {
      fontWeight: 900,
      fontSize: 13,
      color: "#0f172a",
      fontFamily,
      whiteSpace: "nowrap",
      flex: "0 0 auto",
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
    tableToolbarWrap: {
      display: "flex",
      justifyContent: "flex-end",
      alignItems: "center",
      marginBottom: 0,
      overflowX: "auto",
      flex: "1 1 auto",
    },
    tableToolbarBox: {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "flex-end",
      gap: 6,
      flexWrap: "nowrap",
      padding: 0,
      border: "none",
      borderRadius: 0,
      background: "transparent",
      boxShadow: "none",
      minWidth: "max-content",
    },
    toolbarSelect: {
      height: 26,
      padding: "2px 8px",
      borderRadius: 7,
      border: "1px solid #bfc7d2",
      background: "#fff",
      fontWeight: 800,
      fontFamily,
      fontSize: 11,
      minWidth: 110,
      cursor: "pointer",
      outline: "none",
    },
    toolbarBtn: {
      height: 26,
      border: "1px solid #bfc7d2",
      background: "#fff",
      padding: "2px 10px",
      borderRadius: 7,
      cursor: "pointer",
      fontWeight: 800,
      fontSize: 11,
      fontFamily,
      whiteSpace: "nowrap",
    },
    toolbarPrimaryBtn: {
      height: 26,
      border: "1px solid #bfc7d2",
      background: "#fff",
      color: "#111827",
      padding: "2px 10px",
      borderRadius: 7,
      cursor: "pointer",
      fontWeight: 800,
      fontSize: 11,
      fontFamily,
      whiteSpace: "nowrap",
    },
    toolbarBadge: {
      height: 26,
      border: "1px solid #bfc7d2",
      background: "#fff",
      padding: "2px 10px",
      borderRadius: 7,
      fontWeight: 800,
      fontSize: 11,
      fontFamily,
      whiteSpace: "nowrap",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
    },
    toolbarSearch: {
      height: 26,
      padding: "2px 10px",
      borderRadius: 7,
      border: "1px solid #bfc7d2",
      background: "#fff",
      fontWeight: 700,
      fontFamily,
      fontSize: 11,
      width: 210,
      minWidth: 170,
      outline: "none",
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
      minWidth: 240,
    },

    modalBackdrop: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      zIndex: 1000,
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
    modalBody: { padding: 16, maxHeight: "70vh", overflow: "auto" },
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
    required: { color: "#ef4444", fontWeight: 900 },

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
    filterRow: { display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginTop: 8 },
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
    mapBox: { height: 340, borderRadius: 12, overflow: "hidden", border: "1px solid #e2e8f0" },

    pillBtn: (active) => ({
      border: active ? "1px solid #0b4ea2" : "1px solid rgba(15, 23, 42, 0.18)",
      background: active ? "#dbeafe" : "#fff",
      padding: "6px 10px",
      borderRadius: 999,
      cursor: "pointer",
      fontWeight: 900,
      fontSize: 12,
      fontFamily,
    }),

    pill: {
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 999,
      border: "1px solid #cbd5e1",
      background: "#f8fafc",
      fontSize: 11,
      fontWeight: 900,
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
  };


  const getTechTrainingCustomPairs = (entry = {}) => {
    const values = parseTechTrainingCustomFields(entry.customFields || entry.custom_fields);

    return (techTrainingCustomFields || []).map((field) => {
      const key = field.fieldKey || field.field_key || field.key;
      const rawLabel = field.fieldLabel || field.field_label || field.label || key;
      const value = values?.[key];

      return {
        key,
        label: cleanTechTrainingCustomLabel(rawLabel),
        value: value === null || value === undefined || value === "" ? "—" : String(value),
      };
    });
  };

  const renderTechTrainingCustomInputs = () => {
    if (!techTrainingCustomFields.length) return null;

    return (
      <>
        {techTrainingCustomFields.map((field) => {
          const key = field.fieldKey || field.field_key || field.key;
          const rawLabel = field.fieldLabel || field.field_label || field.label || key;
          const label = cleanTechTrainingCustomLabel(rawLabel);
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

  const renderTechTrainingCustomViewFields = (entry) => {
    const pairs = getTechTrainingCustomPairs(entry);
    if (!pairs.length) return null;

    return pairs.map((item) => (
      <div key={`techtraining-custom-view-${item.key}`}>
        <div style={styles.label}>{item.label}</div>
        <div style={{ fontWeight: 800 }}>{item.value}</div>
      </div>
    ));
  };
  // =========================
  // Program add flow
  // =========================
  const handleProgramChange = (val) => {
    if (val === PROGRAM_ADD) return setProgramModalOpen(true);
    setEntryForm((prev) => ({ ...prev, program: val }));
  };

  const commitAddProgram = async () => {
    const name = String(newProgramName || "").trim();
    if (!name) return alert("Please type a program/training name.");

    try {
      await axios.post(`${TRAINING_API}/programs`, { name });
      await fetchPrograms();
      setEntryForm((prev) => ({ ...prev, program: name }));
      setNewProgramName("");
      setProgramModalOpen(false);
    } catch (err) {
      console.error(err);
      if (err?.response?.status === 409) {
        alert("Program already exists.");
      } else {
        alert("Failed to save program.");
      }
    }
  };

  // =========================
  // Entry CRUD
  // =========================
  const resetEntryForm = () => {
    setEntryForm({
      program: "",
      province: "PANGASINAN",
      startDate: "",
      endDate: "",
      title: "",
      venueMeta: null,
      venueAddress: "",
      noOfFirms: "",

      participantsFemale: "",
      participantsMale: "",

      seniorFemale: "",
      seniorMale: "",

      ipFemale: "",
      ipMale: "",

      fourPsFemale: "",
      fourPsMale: "",

      pwdFemale: "",
      pwdMale: "",

      firmsSucsHeisLgusCount: "",
      firmsAssociationsList: "",
      trainorAffiliation: "",
      programProjectUnit: "",

      costDost: "",
      costPartnerAgency: "",
      staffName: "",
      customFields: {},
    });
    setNewProgramName("");
  };

  const openAddEntry = () => {
    resetEntryForm();
    setEntryModal({ mode: "add" });
  };

  const openEditEntry = (entryId) => {
    const e = entries.find((x) => x.id === entryId);
    if (!e) return;

    setEntryForm({
      program: e.program || "",
      province: e.province || "PANGASINAN",
      startDate: e.startDate || "",
      endDate: e.endDate || "",
      title: e.title || "",
      venueMeta: e.venueMeta || null,
      venueAddress: e.venueAddress || e.venueMeta?.displayText || "",
      noOfFirms: e.noOfFirms ?? "",

      participantsFemale: e.participantsFemale ?? "",
      participantsMale: e.participantsMale ?? "",

      seniorFemale: e.seniorFemale ?? "",
      seniorMale: e.seniorMale ?? "",

      ipFemale: e.ipFemale ?? "",
      ipMale: e.ipMale ?? "",

      fourPsFemale: e.fourPsFemale ?? "",
      fourPsMale: e.fourPsMale ?? "",

      pwdFemale: e.pwdFemale ?? "",
      pwdMale: e.pwdMale ?? "",

      firmsSucsHeisLgusCount: e.firmsSucsHeisLgusCount ?? "",
      firmsAssociationsList: e.firmsAssociationsList || "",
      trainorAffiliation: e.trainorAffiliation || "",
      programProjectUnit: e.programProjectUnit || "",

      costDost: e.costDost ?? "",
      costPartnerAgency: e.costPartnerAgency ?? "",
      staffName: e.staffName || e.nameOfStaff || e.staff_name || "",
      customFields: parseTechTrainingCustomFields(e.customFields || e.custom_fields),
    });

    setEntryModal({ mode: "edit", entryId });
  };

  const deleteEntry = async (entryId) => {
    if (!window.confirm("Delete this entry?")) return;

    try {
      await axios.delete(`${API_BASE}/entries/${entryId}`);
      await fetchEntries(currentPage);
    } catch (err) {
      console.error(err);
      alert("Failed to delete entry.");
    }
  };

  const validateEntry = () => {
    if (!String(entryForm.startDate || "").trim()) return "Required: Start Date";
    if (!String(entryForm.title || "").trim()) return "Required: Title";
    if (!String(entryForm.venueAddress || "").trim()) return "Required: Venue/Address";
    return "";
  };

  const saveEntry = async () => {
    const err = validateEntry();
    if (err) return alert(err);

    const payload = {
      program: String(entryForm.program || "").trim(),
      province: String(entryForm.province || "PANGASINAN").trim(),
      startDate: String(entryForm.startDate || "").trim(),
      endDate: String(entryForm.endDate || "").trim(),
      title: String(entryForm.title || "").trim(),

      venueAddress: String(entryForm.venueAddress || "").trim(),
      venueMeta: entryForm.venueMeta || null,
      latitude:
        entryForm.venueMeta?.lat ??
        entryForm.venueMeta?.latitude ??
        null,
      longitude:
        entryForm.venueMeta?.lng ??
        entryForm.venueMeta?.longitude ??
        null,

      noOfFirms: toNumber(entryForm.noOfFirms),

      participantsFemale: toNumber(entryForm.participantsFemale),
      participantsMale: toNumber(entryForm.participantsMale),

      seniorFemale: toNumber(entryForm.seniorFemale),
      seniorMale: toNumber(entryForm.seniorMale),

      ipFemale: toNumber(entryForm.ipFemale),
      ipMale: toNumber(entryForm.ipMale),

      fourPsFemale: toNumber(entryForm.fourPsFemale),
      fourPsMale: toNumber(entryForm.fourPsMale),

      pwdFemale: toNumber(entryForm.pwdFemale),
      pwdMale: toNumber(entryForm.pwdMale),

      totalFemale,
      totalMale,
      totalParticipants,

      firmsSucsHeisLgusCount: toNumber(entryForm.firmsSucsHeisLgusCount),
      firmsAssociationsList: String(entryForm.firmsAssociationsList || "").trim(),
      trainorAffiliation: String(entryForm.trainorAffiliation || "").trim(),
      programProjectUnit: String(entryForm.programProjectUnit || "").trim(),

      costDost: toNumber(entryForm.costDost),
      costPartnerAgency: toNumber(entryForm.costPartnerAgency),
      staffName: String(entryForm.staffName || "").trim(),
      nameOfStaff: String(entryForm.staffName || "").trim(),
      name_of_staff: String(entryForm.staffName || "").trim(),
      custom_fields: entryForm.customFields || {},
      customFields: entryForm.customFields || {},
    };

    try {
      if (entryModal.mode === "add") {
        await axios.post(`${TRAINING_API}/entries`, payload);
      } else {
        await axios.put(`${TRAINING_API}/entries/${entryModal.entryId}`, payload);
      }

      await fetchEntries(currentPage);
      setEntryModal(null);
    } catch (error) {
      console.error(error);
      alert(error?.response?.data?.message || "Failed to save entry.");
    }
  };

  // =========================
  // Venue formatting
  // =========================
  const venueAddressText = (e) =>
    String(e?.venueAddress || e?.venueMeta?.displayText || "").trim() || "—";

  const getEntryLatitude = (e) => {
    const lat =
      e?.latitude ??
      e?.lat ??
      e?.venueMeta?.lat ??
      e?.venueMeta?.latitude ??
      null;
    return Number.isFinite(Number(lat)) ? Number(lat) : null;
  };

  const getEntryLongitude = (e) => {
    const lng =
      e?.longitude ??
      e?.lng ??
      e?.venueMeta?.lng ??
      e?.venueMeta?.longitude ??
      null;
    return Number.isFinite(Number(lng)) ? Number(lng) : null;
  };

  const venueCoordText = (e) => {
    const lat = getEntryLatitude(e);
    const lng = getEntryLongitude(e);
    return lat !== null && lng !== null ? `${lat}, ${lng}` : "—";
  };

  const entryLabel = (e) => String(e?.title || "").trim() || "Training Entry";

  // =========================
  // Google map helpers
  // =========================
  const openGoogleMap = (lat, lng) =>
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, "_blank");

  const openGoogleDirections = (lat, lng) =>
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`,
      "_blank"
    );

  // =========================
  // Address Flow Modal
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

    const displayText =
      mode === "manual"
        ? manualText.trim()
        : [barangay, municipality, province].filter(Boolean).join(", ");

    const canSave =
      mode === "manual" ? manualText.trim().length >= 3 : Boolean(municipality && barangay);

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
      if (!municipality || !barangay)
        return alert("Please select Municipality and Barangay first.");
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
              <div>Add Venue/Address</div>
              <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 800 }}>{breadcrumb}</div>
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
                        placeholder={
                          barangayLoading ? "Loading..." : "Type to search barangays..."
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
                          <span style={styles.mono}>public/data/pangasinan_barangays.json</span>
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
                                  const lat = typeof b === "string" ? null : b.lat;
                                  const lng = typeof b === "string" ? null : b.lng;
                                  if (Number.isFinite(lat) && Number.isFinite(lng))
                                    setCoords({ lat, lng });
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

  const applyVenueMetaToEntryForm = (meta) => {
    setEntryForm((prev) => ({
      ...prev,
      venueMeta: meta || null,
      venueAddress: meta?.displayText || "",
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
  }, [municipalGeo, borderMode, selectedMunicipality, selectedDistrict, selectedDistrictSet]);

  const allPinnedEntries = useMemo(
    () =>
      enrichedEntries.filter((e) => {
        const lat = getEntryLatitude(e);
        const lng = getEntryLongitude(e);
        return lat !== null && lng !== null;
      }),
    [enrichedEntries]
  );

  const getEntryMunicipality = (e) => {
    const m = e?.venueMeta?.municipality;
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
      return arr.filter((e) => getEntryMunicipality(e) === selectedMunicipality);
    }

    if (!selectedDistrict) return arr;
    return arr.filter((e) => selectedDistrictSet.has(getEntryMunicipality(e)));
  }, [allPinnedEntries, borderMode, selectedMunicipality, selectedDistrict, selectedDistrictSet]);

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

  // =========================
  // Venue View Modal
  // =========================
  function VenueViewModal({ entry, onClose }) {
    if (!entry) return null;
    const addr = venueAddressText(entry);
    const coords = venueCoordText(entry);
    const lat = getEntryLatitude(entry);
    const lng = getEntryLongitude(entry);
    const hasCoords = lat !== null && lng !== null;

    return (
      <div style={styles.modalBackdrop} onClick={onClose}>
        <div
          style={{ ...styles.modal, width: "min(720px, 100%)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={styles.modalHeader}>
            <div>View Venue/Address — {entryLabel(entry)}</div>
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
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                  <button style={styles.tinyBtn} onClick={() => openGoogleMap(lat, lng)}>
                    Map
                  </button>
                  <button style={styles.tinyBtn} onClick={() => openGoogleDirections(lat, lng)}>
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
  return (
    <div style={styles.page}>
      <div style={styles.titleBar}>
        <div>TECHNOLOGY TRAININGS / SEMINARS</div>
        <div style={{ fontSize: 12, opacity: 0.95, fontWeight: 800, fontFamily }}>
          Same style as SETUP / CEST / SSCP
        </div>
      </div>

      {/* MAP DASHBOARD */}
      <div style={styles.mapCard}>
        <div style={styles.mapHeader}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, width: "100%" }}>
            <div style={styles.mapTitle}>PANGASINAN MAP — Technology Trainings / Seminars</div>
            <div style={styles.mapSub}>
              Pins shown: <b>{visiblePinnedEntries.length}</b> / {allPinnedEntries.length}
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

            {maskLatLngs ? (
              <Polygon positions={maskLatLngs} pathOptions={maskPathOptions} pane="maskPane" />
            ) : null}
            {outlineGeo?.features?.length ? (
              <GeoJSON data={outlineGeo} style={pangasinanOutlineStyle} pane="borderPane" />
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

            {visiblePinnedEntries.map((e) => {
              const lat = getEntryLatitude(e);
              const lng = getEntryLongitude(e);
              return (
                <Marker key={e.id} position={[lat, lng]} pane="pinPane">
                  <Popup>
                    <div style={{ minWidth: 280, fontFamily }}>
                      <div style={{ fontWeight: 900, marginBottom: 6 }}>{e.title || "—"}</div>
                      <div style={{ fontSize: 12, marginBottom: 6 }}>
                        <b>Date:</b> {formatDateRange(e.startDate, e.endDate)}
                        <br />
                        <b>Province:</b> {e.province || "—"}
                        <br />
                        <b>Participants:</b> {toNumber(e.participantsTotal)}
                      </div>

                      <div style={{ fontSize: 12, marginBottom: 8 }}>
                        <b>Address:</b> {venueAddressText(e)}
                        <br />
                        <b>Coordinates:</b> {venueCoordText(e)}
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button style={styles.tinyBtn} onClick={() => setVenueViewEntryId(e.id)}>
                          View
                        </button>
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
                        <button style={styles.tinyBtn} onClick={() => setViewEntryId(e.id)}>
                          Full Details
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>

      {/* HEADER */}
      <div style={styles.sectionTitleRow}>
        <div style={styles.sectionTitle}>
          TECHNOLOGY TRAININGS / SEMINARS — {filterYear ? `CY ${filterYear}` : "All Years"}
          <span style={{ marginLeft: 8, fontSize: 11, color: "#475569", fontWeight: 900 }}>
            Showing {filteredEntries.length} of {serverTotalRows} / {serverTotalRows}
          </span>
        </div>

        <div style={styles.tableToolbarWrap}>
          <div style={styles.tableToolbarBox}>
            <input
              style={styles.toolbarSearch}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search title or address"
            />

            <select style={styles.toolbarSelect} value={filterYear} onChange={(e) => setFilterYear(e.target.value)}>
              <option value="">All Years</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <select style={styles.toolbarSelect} value={filterDistrict} onChange={(e) => setFilterDistrict(e.target.value)}>
              <option value="">All Districts</option>
              {PANGASINAN_DISTRICTS.map((district) => (
                <option key={district.id} value={district.id}>
                  {district.id}
                </option>
              ))}
            </select>

            <select style={styles.toolbarSelect} value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)}>
              <option value="">All Months</option>
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
              ].map((month, index) => (
                <option key={month} value={String(index + 1)}>
                  {month}
                </option>
              ))}
            </select>

            <select style={styles.toolbarSelect} value={filterMunicipality} onChange={(e) => setFilterMunicipality(e.target.value)}>
              <option value="">All Municipalities</option>
              {municipalityFilterOptions.map((municipality) => (
                <option key={municipality} value={municipality}>
                  {municipality}
                </option>
              ))}
            </select>

            <select style={styles.toolbarSelect} value={filterView} onChange={(e) => setFilterView(e.target.value)}>
              <option value="overall">Overall</option>
              <option value="manual">Manual</option>
              <option value="synced">Synced</option>
            </select>

            <button style={styles.toolbarBtn} onClick={clearFilters}>
              Clear Filters
            </button>

            <button style={styles.toolbarBtn} onClick={openExportPopupBulk}>
              Export
            </button>

            <button style={styles.btnDark} onClick={openPrintPopupBulk}>
              Print
            </button>

            <button style={styles.toolbarPrimaryBtn} onClick={openAddEntry}>
              + Add Project
            </button>
          </div>
        </div>
      </div>

      {/* MAIN TABLE REDUCED */}
      <div style={styles.tableWrap}>
        <table style={{ ...styles.table, minWidth: 1650 }}>
          <colgroup>
            <col style={{ width: "3%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "11%" }} />
          </colgroup>

          <thead>
            <tr>
              <th style={styles.th}>NO.</th>
              <th style={styles.th}>PROVINCE</th>
              <th style={styles.th}>DATE</th>
              <th style={styles.th}>VENUE/ADDRESS</th>
              <th style={styles.th}>TITLE</th>
              <th style={styles.th}>NO. OF FIRMS / SUCs / HEIs / LGUs</th>
              <th style={styles.th}>LIST OF FIRMS / ASSOCIATIONS</th>
              <th style={styles.th}>NAME OF TRAINOR / AFFILIATION</th>
              <th style={styles.th}>NAME OF PROGRAM / PROJECT / UNIT</th>
              <th style={styles.th}>ACTIONS</th>
            </tr>
          </thead>

          <tbody>
            {filteredEntries.length === 0 ? (
              <tr>
                <td style={styles.tdCenter} colSpan={10}>
                  Wala pang entries. Click “Add Entry”.
                </td>
              </tr>
            ) : (
              filteredEntries.map((e, i) => {
                const lat = getEntryLatitude(e);
                const lng = getEntryLongitude(e);
                const hasCoords = lat !== null && lng !== null;

                return (
                  <tr key={e.id}>
                    <td style={styles.tdCenter}>{(effectivePage - 1) * rowsPerPage + i + 1}</td>
                    <td style={styles.tdCenter}>{e.province || "—"}</td>
                    <td style={styles.tdCenter}>{formatDateRange(e.startDate, e.endDate)}</td>

                    <td style={styles.td}>
                      <div style={{ display: "grid", gap: 8 }}>
                        <div style={{ fontSize: 12 }}>{venueAddressText(e)}</div>

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button style={styles.tinyBtn} onClick={() => setVenueViewEntryId(e.id)}>
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

                    <td style={styles.td}>{e.title || "—"}</td>
                    <td style={styles.tdCenter}>{toNumber(e.firmsSucsHeisLgusCount)}</td>
                    <td style={styles.td}>{e.firmsAssociationsList || "—"}</td>
                    <td style={styles.td}>{e.trainorAffiliation || "—"}</td>
                    <td style={styles.td}>{e.programProjectUnit || "—"}</td>

                    <td style={styles.tdCenter}>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          justifyContent: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <button style={styles.tinyBtn} onClick={() => setViewEntryId(e.id)}>
                          View
                        </button>
                        <button style={styles.tinyBtn} onClick={() => openPrintPopupRow(e.id)}>
                          Print
                        </button>
                        <button style={styles.tinyBtn} onClick={() => openExportPopupRow(e.id)}>
                          Export
                        </button>
                        <button
                          style={{
                            ...styles.tinyBtn,
                            opacity: e.syncedFromIntervention ? 0.6 : 1,
                            cursor: e.syncedFromIntervention ? "not-allowed" : "pointer",
                          }}
                          onClick={() => {
                            if (e.syncedFromIntervention) {
                              alert("This entry is synced from S&T Intervention. Edit it from the source module.");
                              return;
                            }
                            openEditEntry(e.id);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          style={{
                            ...styles.dangerTiny,
                            opacity: e.syncedFromIntervention ? 0.6 : 1,
                            cursor: e.syncedFromIntervention ? "not-allowed" : "pointer",
                          }}
                          onClick={() => {
                            if (e.syncedFromIntervention) {
                              alert("This entry is synced from S&T Intervention. Delete it from the source module.");
                              return;
                            }
                            deleteEntry(e.id);
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
            onClick={() => setCurrentPage((prev) => Math.max(1, pageWindowStart - PAGE_NUMBER_WINDOW))}
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
            onClick={() => setCurrentPage((prev) => pageWindowStart + PAGE_NUMBER_WINDOW)}
          >
            Next
          </button>
        </div>
      </div>

      {/* Venue quick view modal */}
      {venueViewEntryId && (
        <VenueViewModal
          entry={enrichEntry(venueViewEntry)}
          onClose={() => setVenueViewEntryId(null)}
        />
      )}

      {/* ENTRY MODAL */}
      {entryModal && (
        <div style={styles.modalBackdrop} onClick={() => setEntryModal(null)}>
          <div
            style={{ ...styles.modal, width: "min(1180px, 100%)" }}
            onClick={(ev) => ev.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <div>{entryModal.mode === "edit" ? "Edit" : "Add"} Technology Training Entry</div>
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
              <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900, marginBottom: 10 }}>
                Fields with <span style={styles.required}>*</span> are required.
              </div>

              <div style={styles.grid}>
                <div style={styles.field}>
                  <div style={styles.label}>Program / Training (optional)</div>
                  <select
                    style={styles.input}
                    value={entryForm.program}
                    onChange={(e) => handleProgramChange(e.target.value)}
                  >
                    <option value="">(None)</option>
                    {programOptions.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                    <option value={PROGRAM_ADD}>+ Add program...</option>
                  </select>
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Province</div>
                  <input
                    style={styles.input}
                    value={entryForm.province}
                    onChange={(e) => setEntryForm({ ...entryForm, province: e.target.value })}
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>
                    Start Date <span style={styles.required}>*</span>
                  </div>
                  <input
                    style={styles.input}
                    type="date"
                    value={entryForm.startDate}
                    onChange={(e) => setEntryForm({ ...entryForm, startDate: e.target.value })}
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>End Date</div>
                  <input
                    style={styles.input}
                    type="date"
                    value={entryForm.endDate}
                    onChange={(e) => setEntryForm({ ...entryForm, endDate: e.target.value })}
                  />
                </div>

                <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                  <div style={styles.label}>
                    Title <span style={styles.required}>*</span>
                  </div>
                  <textarea
                    style={styles.textarea}
                    value={entryForm.title}
                    onChange={(e) => setEntryForm({ ...entryForm, title: e.target.value })}
                  />
                </div>

                <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                  <div style={styles.label}>
                    Venue/Address <span style={styles.required}>*</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setVenueFlowOpen(true)}
                    style={styles.inputButton(Boolean(entryForm.venueAddress))}
                  >
                    <span style={{ opacity: entryForm.venueAddress ? 1 : 0.6 }}>
                      {entryForm.venueAddress || "Click to select venue/address"}
                    </span>
                    <span style={{ fontSize: 11, opacity: 0.65 }}>
                      {entryForm.venueAddress ? "Change" : "Select"}
                    </span>
                  </button>

                  {getEntryLatitude(entryForm) !== null && getEntryLongitude(entryForm) !== null ? (
                    <div style={{ fontSize: 12, opacity: 0.85 }}>
                      <b>Coordinates:</b> {getEntryLatitude(entryForm)}, {getEntryLongitude(entryForm)}
                    </div>
                  ) : null}
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>No. of Firms</div>
                  <input
                    style={styles.input}
                    type="number"
                    value={entryForm.noOfFirms}
                    onChange={(e) => setEntryForm({ ...entryForm, noOfFirms: e.target.value })}
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>No. of Firms / SUCs / HEIs / LGUs</div>
                  <input
                    style={styles.input}
                    type="number"
                    value={entryForm.firmsSucsHeisLgusCount}
                    onChange={(e) =>
                      setEntryForm({
                        ...entryForm,
                        firmsSucsHeisLgusCount: e.target.value,
                      })
                    }
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Participants Female</div>
                  <input
                    style={styles.input}
                    type="number"
                    value={entryForm.participantsFemale}
                    onChange={(e) =>
                      setEntryForm({
                        ...entryForm,
                        participantsFemale: e.target.value,
                      })
                    }
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Participants Male</div>
                  <input
                    style={styles.input}
                    type="number"
                    value={entryForm.participantsMale}
                    onChange={(e) =>
                      setEntryForm({ ...entryForm, participantsMale: e.target.value })
                    }
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Senior Female</div>
                  <input
                    style={styles.input}
                    type="number"
                    value={entryForm.seniorFemale}
                    onChange={(e) =>
                      setEntryForm({ ...entryForm, seniorFemale: e.target.value })
                    }
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Senior Male</div>
                  <input
                    style={styles.input}
                    type="number"
                    value={entryForm.seniorMale}
                    onChange={(e) =>
                      setEntryForm({ ...entryForm, seniorMale: e.target.value })
                    }
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>IPs Female</div>
                  <input
                    style={styles.input}
                    type="number"
                    value={entryForm.ipFemale}
                    onChange={(e) => setEntryForm({ ...entryForm, ipFemale: e.target.value })}
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>IPs Male</div>
                  <input
                    style={styles.input}
                    type="number"
                    value={entryForm.ipMale}
                    onChange={(e) => setEntryForm({ ...entryForm, ipMale: e.target.value })}
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>4Ps Female</div>
                  <input
                    style={styles.input}
                    type="number"
                    value={entryForm.fourPsFemale}
                    onChange={(e) =>
                      setEntryForm({ ...entryForm, fourPsFemale: e.target.value })
                    }
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>4Ps Male</div>
                  <input
                    style={styles.input}
                    type="number"
                    value={entryForm.fourPsMale}
                    onChange={(e) => setEntryForm({ ...entryForm, fourPsMale: e.target.value })}
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>PWD Female</div>
                  <input
                    style={styles.input}
                    type="number"
                    value={entryForm.pwdFemale}
                    onChange={(e) => setEntryForm({ ...entryForm, pwdFemale: e.target.value })}
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>PWD Male</div>
                  <input
                    style={styles.input}
                    type="number"
                    value={entryForm.pwdMale}
                    onChange={(e) => setEntryForm({ ...entryForm, pwdMale: e.target.value })}
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Total Female</div>
                  <input
                    style={{ ...styles.input, background: "#f8fafc" }}
                    value={
                      [
                        entryForm.participantsFemale,
                        entryForm.seniorFemale,
                        entryForm.ipFemale,
                        entryForm.fourPsFemale,
                        entryForm.pwdFemale,
                      ].every((v) => v === "" || v === null || v === undefined)
                        ? ""
                        : totalFemale
                    }
                    readOnly
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Total Male</div>
                  <input
                    style={{ ...styles.input, background: "#f8fafc" }}
                    value={
                      [
                        entryForm.participantsMale,
                        entryForm.seniorMale,
                        entryForm.ipMale,
                        entryForm.fourPsMale,
                        entryForm.pwdMale,
                      ].every((v) => v === "" || v === null || v === undefined)
                        ? ""
                        : totalMale
                    }
                    readOnly
                  />
                </div>

                <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                  <div style={styles.label}>Total Participants</div>
                  <input
                    style={{ ...styles.input, background: "#f8fafc" }}
                    value={
                      [
                        entryForm.participantsFemale,
                        entryForm.seniorFemale,
                        entryForm.ipFemale,
                        entryForm.fourPsFemale,
                        entryForm.pwdFemale,
                        entryForm.participantsMale,
                        entryForm.seniorMale,
                        entryForm.ipMale,
                        entryForm.fourPsMale,
                        entryForm.pwdMale,
                      ].every((v) => v === "" || v === null || v === undefined)
                        ? ""
                        : totalParticipants
                    }
                    readOnly
                  />
                </div>

                <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                  <div style={styles.label}>List of Firms / Associations</div>
                  <textarea
                    style={styles.textarea}
                    value={entryForm.firmsAssociationsList}
                    onChange={(e) =>
                      setEntryForm({
                        ...entryForm,
                        firmsAssociationsList: e.target.value,
                      })
                    }
                  />
                </div>

                <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                  <div style={styles.label}>Name of Trainor / Affiliation</div>
                  <textarea
                    style={styles.textarea}
                    value={entryForm.trainorAffiliation}
                    onChange={(e) =>
                      setEntryForm({
                        ...entryForm,
                        trainorAffiliation: e.target.value,
                      })
                    }
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Name of Staff</div>
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

                {renderTechTrainingCustomInputs()}

                <div style={styles.field}>
                  <div style={styles.label}>Name Of Program / Project / Unit</div>
                  <input
                    style={styles.input}
                    value={entryForm.programProjectUnit}
                    onChange={(e) =>
                      setEntryForm({
                        ...entryForm,
                        programProjectUnit: e.target.value,
                      })
                    }
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>DOST Cost</div>
                  <input
                    style={styles.input}
                    type="number"
                    value={entryForm.costDost}
                    onChange={(e) => setEntryForm({ ...entryForm, costDost: e.target.value })}
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Partner Agency Cost</div>
                  <input
                    style={styles.input}
                    type="number"
                    value={entryForm.costPartnerAgency}
                    onChange={(e) =>
                      setEntryForm({
                        ...entryForm,
                        costPartnerAgency: e.target.value,
                      })
                    }
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Total Cost</div>
                  <input
                    style={{ ...styles.input, background: "#f8fafc" }}
                    value={
                      entryForm.costDost === "" && entryForm.costPartnerAgency === ""
                        ? ""
                        : peso(
                          toNumber(entryForm.costDost) + toNumber(entryForm.costPartnerAgency)
                        )
                    }
                    readOnly
                  />
                </div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button style={styles.btnGhost} onClick={() => setEntryModal(null)}>
                Cancel
              </button>
              <button style={styles.btnDark} onClick={saveEntry}>
                {entryModal.mode === "edit" ? "Update" : "Save"}
              </button>
            </div>
          </div>

          <AddressFlowModal
            open={venueFlowOpen}
            onClose={() => setVenueFlowOpen(false)}
            onSave={applyVenueMetaToEntryForm}
            initialMeta={entryForm.venueMeta}
          />
        </div>
      )}

      {/* ADD PROGRAM MODAL */}
      {programModalOpen && (
        <div style={styles.modalBackdrop} onClick={() => setProgramModalOpen(false)}>
          <div
            style={{ ...styles.modal, width: "min(560px, 100%)" }}
            onClick={(ev) => ev.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <div>Add Program / Training</div>
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
                onClick={() => setProgramModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.field}>
                <div style={styles.label}>New program / training name</div>
                <input
                  style={styles.input}
                  value={newProgramName}
                  onChange={(e) => setNewProgramName(e.target.value)}
                  placeholder='e.g., "Cleaner Production Training"'
                />
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button style={styles.btnGhost} onClick={() => setProgramModalOpen(false)}>
                Cancel
              </button>
              <button style={styles.btnDark} onClick={commitAddProgram}>
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW ENTRY MODAL */}
      {viewEntryId && viewEntry && (
        <div style={styles.modalBackdrop} onClick={() => setViewEntryId(null)}>
          <div
            style={{ ...styles.modal, width: "min(1400px, 100%)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={styles.modalHeader}>
              <div>View Project</div>
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
                  style={styles.pillBtn(viewMode === "list")}
                  onClick={() => setViewMode("list")}
                >
                  List View
                </button>
                <button
                  style={styles.pillBtn(viewMode === "table")}
                  onClick={() => setViewMode("table")}
                >
                  Table View
                </button>
              </div>

              {viewMode === "list" ? (
                <div style={{ display: "grid", gap: 12, fontSize: 13 }}>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 900,
                      color: "#111827",
                    }}
                  >
                    Project Information
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, minmax(220px, 1fr))",
                      gap: 14,
                    }}
                  >
                    <div>
                      <div style={styles.label}>Name of Knowledge / Technology Transferred</div>
                      <div style={{ fontWeight: 800 }}>{viewEntry.title || "—"}</div>
                    </div>

                    <div>
                      <div style={styles.label}>Technology Generator</div>
                      <div style={{ fontWeight: 800 }}>{viewEntry.trainorAffiliation || "—"}</div>
                    </div>

                    <div>
                      <div style={styles.label}>Representative Name</div>
                      <div style={{ fontWeight: 800 }}>{viewEntry.programProjectUnit || "—"}</div>
                    </div>

                    <div>
                      <div style={styles.label}>Sex</div>
                      <div style={{ fontWeight: 800 }}>—</div>
                    </div>

                    <div>
                      <div style={styles.label}>Classification</div>
                      <div style={{ fontWeight: 800 }}>
                        {String(viewEntry.program || "").trim() ? viewEntry.program : "—"}
                      </div>
                    </div>

                    <div>
                      <div style={styles.label}>DOST-developed / funded</div>
                      <div style={{ fontWeight: 800 }}>Yes</div>
                    </div>

                    <div>
                      <div style={styles.label}>Mode of Transfer</div>
                      <div style={{ fontWeight: 800 }}>Extension</div>
                    </div>

                    <div>
                      <div style={styles.label}>Quarter</div>
                      <div style={{ fontWeight: 800 }}>
                        {viewEntry.startDate
                          ? `Q${Math.floor(new Date(`${viewEntry.startDate}T00:00:00`).getMonth() / 3) + 1}`
                          : "—"}
                      </div>
                    </div>

                    <div>
                      <div style={styles.label}>Unit / Center</div>
                      <div style={{ fontWeight: 800 }}>DOST-PANGASINAN</div>
                    </div>

                    {renderTechTrainingCustomViewFields(viewEntry)}

                    <div>
                      <div style={styles.label}>Date Transferred</div>
                      <div style={{ fontWeight: 800 }}>
                        {formatDateRange(viewEntry.startDate, viewEntry.endDate)}
                      </div>
                    </div>

                    <div>
                      <div style={styles.label}>Activity Title</div>
                      <div style={{ fontWeight: 800 }}>{viewEntry.title || "—"}</div>
                    </div>

                    <div>
                      <div style={styles.label}>Activity Date / Venue</div>
                      <div style={{ fontWeight: 800 }}>
                        {formatDateRange(viewEntry.startDate, viewEntry.endDate)} / {entryLabel(viewEntry)}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div style={styles.label}>Institution Name</div>
                    <div
                      style={{
                        border: "1px solid #cbd5e1",
                        borderRadius: 8,
                        background: "#f8fafc",
                        padding: "8px 10px",
                        fontWeight: 800,
                      }}
                    >
                      {viewEntry.firmsAssociationsList || "—"}
                    </div>
                  </div>

                  <div>
                    <div style={styles.label}>Institution Address</div>
                    <div
                      style={{
                        border: "1px solid #cbd5e1",
                        borderRadius: 8,
                        background: "#f8fafc",
                        padding: "8px 10px",
                        fontWeight: 800,
                      }}
                    >
                      {venueAddressText(viewEntry)}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(220px, 1fr))",
                      gap: 14,
                      alignItems: "start",
                    }}
                  >
                    <div>
                      <div style={styles.label}>Municipality</div>
                      <div style={{ fontWeight: 800 }}>
                        {viewEntry.municipality || viewEntry.venueMeta?.municipality || "—"}
                      </div>

                      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                        <button type="button" style={styles.btnGhost}>
                          Map
                        </button>
                        <button type="button" style={styles.btnGhost}>
                          Directions
                        </button>
                      </div>
                    </div>

                    <div>
                      <div style={styles.label}>Coordinates</div>
                      <div style={{ fontWeight: 800 }}>{venueCoordText(viewEntry)}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={styles.tableWrap}>
                  <table style={{ ...styles.table, minWidth: 3000 }}>
                    <thead>
                      <tr>
                        <th style={styles.th}>PROVINCE</th>
                        <th style={styles.th}>DATE</th>
                        <th style={styles.th}>TITLE</th>
                        <th style={styles.th}>VENUE/ADDRESS</th>
                        <th style={styles.th}>NO. OF FIRMS</th>
                        <th style={styles.th}>PARTICIPANTS</th>
                        <th style={styles.th}>SENIOR CITIZENS</th>
                        <th style={styles.th}>IPs</th>
                        <th style={styles.th}>4Ps</th>
                        <th style={styles.th}>PWD</th>
                        <th style={styles.th}>TOTAL FEMALE</th>
                        <th style={styles.th}>TOTAL MALE</th>
                        <th style={styles.th}>TOTAL PARTICIPANTS</th>
                        <th style={styles.th}>NO. OF FIRMS / SUCs / HEIs / LGUs</th>
                        <th style={styles.th}>LIST OF FIRMS / ASSOCIATIONS</th>
                        <th style={styles.th}>NAME OF TRAINOR / AFFILIATION</th>
                        <th style={styles.th}>NAME OF PROGRAM / PROJECT / UNIT</th>
                        <th style={styles.th}>DOST COST</th>
                        <th style={styles.th}>PARTNER AGENCY COST</th>
                        <th style={styles.th}>TOTAL COST</th>
                        <th style={styles.th}>PROGRAM</th>
                      </tr>
                    </thead>

                    <tbody>
                      <tr>
                        <td style={styles.td}>{viewEntry.province || "—"}</td>
                        <td style={styles.tdCenter}>
                          {formatDateRange(viewEntry.startDate, viewEntry.endDate)}
                        </td>
                        <td style={styles.td}>{viewEntry.title || "—"}</td>
                        <td style={styles.td}>
                          <div style={{ display: "grid", gap: 6 }}>
                            <div>
                              <b>Address:</b> {venueAddressText(viewEntry)}
                            </div>
                            <div>
                              <b>Coordinates:</b> {venueCoordText(viewEntry)}
                            </div>
                          </div>
                        </td>
                        <td style={styles.tdCenter}>{toNumber(viewEntry.noOfFirms)}</td>
                        <td style={styles.td}>
                          F: {toNumber(viewEntry.participantsFemale)} | M:{" "}
                          {toNumber(viewEntry.participantsMale)} | Total:{" "}
                          {toNumber(viewEntry.participantsTotal)}
                        </td>
                        <td style={styles.td}>
                          F: {toNumber(viewEntry.seniorFemale)} | M:{" "}
                          {toNumber(viewEntry.seniorMale)} | Total:{" "}
                          {toNumber(viewEntry.seniorTotal)}
                        </td>
                        <td style={styles.td}>
                          F: {toNumber(viewEntry.ipFemale)} | M: {toNumber(viewEntry.ipMale)} |
                          Total: {toNumber(viewEntry.ipTotal)}
                        </td>
                        <td style={styles.td}>
                          F: {toNumber(viewEntry.fourPsFemale)} | M:{" "}
                          {toNumber(viewEntry.fourPsMale)} | Total:{" "}
                          {toNumber(viewEntry.fourPsTotal)}
                        </td>
                        <td style={styles.td}>
                          F: {toNumber(viewEntry.pwdFemale)} | M: {toNumber(viewEntry.pwdMale)} |
                          Total: {toNumber(viewEntry.pwdTotal)}
                        </td>
                        <td style={styles.tdCenter}>
                          {toNumber(viewEntry.participantsFemale) + toNumber(viewEntry.seniorFemale) + toNumber(viewEntry.ipFemale) + toNumber(viewEntry.fourPsFemale) + toNumber(viewEntry.pwdFemale)}
                        </td>
                        <td style={styles.tdCenter}>
                          {toNumber(viewEntry.participantsMale) + toNumber(viewEntry.seniorMale) + toNumber(viewEntry.ipMale) + toNumber(viewEntry.fourPsMale) + toNumber(viewEntry.pwdMale)}
                        </td>
                        <td style={styles.tdCenter}>
                          {toNumber(viewEntry.participantsFemale) + toNumber(viewEntry.seniorFemale) + toNumber(viewEntry.ipFemale) + toNumber(viewEntry.fourPsFemale) + toNumber(viewEntry.pwdFemale) + toNumber(viewEntry.participantsMale) + toNumber(viewEntry.seniorMale) + toNumber(viewEntry.ipMale) + toNumber(viewEntry.fourPsMale) + toNumber(viewEntry.pwdMale)}
                        </td>
                        <td style={styles.tdCenter}>
                          {toNumber(viewEntry.firmsSucsHeisLgusCount)}
                        </td>
                        <td style={styles.td}>{viewEntry.firmsAssociationsList || "—"}</td>
                        <td style={styles.td}>{viewEntry.trainorAffiliation || "—"}</td>
                        <td style={styles.td}>{viewEntry.programProjectUnit || "—"}</td>
                        <td style={styles.tdCenter}>{peso(viewEntry.costDost)}</td>
                        <td style={styles.tdCenter}>{peso(viewEntry.costPartnerAgency)}</td>
                        <td style={styles.tdCenter}>{peso(viewEntry.costTotal)}</td>
                        <td style={styles.tdCenter}>
                          {String(viewEntry.program || "").trim() ? viewEntry.program : "—"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={styles.modalFooter}>
              <button style={styles.btnGhost} onClick={() => setViewEntryId(null)}>
                Close
              </button>
              <button
                style={{
                  ...styles.btnDark,
                  opacity: viewEntry.syncedFromIntervention ? 0.6 : 1,
                  cursor: viewEntry.syncedFromIntervention ? "not-allowed" : "pointer",
                }}
                onClick={() => {
                  if (viewEntry.syncedFromIntervention) {
                    alert("This entry is synced from S&T Intervention. Edit it from the source module.");
                    return;
                  }
                  setViewEntryId(null);
                  openEditEntry(viewEntry.id);
                }}
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {printModal.open && (
        <div style={{ ...styles.modalBackdrop, zIndex: 3600 }} onClick={() => setPrintModal((p) => ({ ...p, open: false }))}>
          <div style={{ ...styles.modal, width: "min(720px, 100%)", position: "relative", zIndex: 3601 }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}><div>{printModal.scope === "row" ? "Print (This Row)" : "Print (Filtered Rows)"}</div><button style={styles.closeX} onClick={() => setPrintModal((p) => ({ ...p, open: false }))}>✕</button></div>
            <div style={styles.modalBody}><div style={styles.grid}>
              <div style={styles.field}><div style={styles.label}>Layout</div><select style={styles.input} value={printModal.layout} onChange={(e) => setPrintModal((p) => ({ ...p, layout: e.target.value }))}><option value="FORM">Form-Based</option><option value="TABLE">Table</option><option value="COMPACT">Compact</option></select></div>
              <div style={styles.field}><div style={styles.label}>Orientation</div><select style={styles.input} value={printModal.orientation} onChange={(e) => setPrintModal((p) => ({ ...p, orientation: e.target.value }))}><option value="landscape">Landscape</option><option value="portrait">Portrait</option></select></div>
              <div style={styles.field}><div style={styles.label}>Paper Size</div><select style={styles.input} value={printModal.preset} onChange={(e) => setPrintModal((p) => ({ ...p, preset: e.target.value }))}><option value="a4">A4</option><option value="letter">Letter</option><option value="legal">Legal</option><option value="custom">Custom</option></select></div>
            </div></div>
            <div style={styles.modalFooter}><button style={styles.btnGhost} onClick={() => setPrintModal((p) => ({ ...p, open: false }))}>Cancel</button><button style={styles.btnDark} onClick={confirmPrint}>Print Now</button></div>
          </div>
        </div>
      )}

      {exportModal.open && (
        <div style={{ ...styles.modalBackdrop, zIndex: 3600 }} onClick={() => setExportModal((p) => ({ ...p, open: false }))}>
          <div style={{ ...styles.modal, width: "min(720px, 100%)", position: "relative", zIndex: 3601 }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}><div>{exportModal.scope === "row" ? "Export (This Row)" : "Export (Filtered Rows)"}</div><button style={styles.closeX} onClick={() => setExportModal((p) => ({ ...p, open: false }))}>✕</button></div>
            <div style={styles.modalBody}><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{["excel", "csv", "pdf", "docx"].map((f) => <button key={f} type="button" style={exportModal.format === f ? styles.btnDark : styles.btnGhost} onClick={() => setExportModal((p) => ({ ...p, format: f }))}>{f.toUpperCase()}</button>)}</div></div>
            <div style={styles.modalFooter}><button style={styles.btnGhost} onClick={() => setExportModal((p) => ({ ...p, open: false }))}>Cancel</button><button style={styles.btnDark} onClick={confirmExport}>Export Now</button></div>
          </div>
        </div>
      )}

    </div>
  );
}

