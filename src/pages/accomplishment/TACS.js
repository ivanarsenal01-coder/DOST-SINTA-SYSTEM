// TACS.js (FULL UPDATED - AXIOS + DATABASE CONNECTED)
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import API_BASE from "../../api";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Document, Packer, Paragraph, TextRun, Table as DocxTable, TableRow, TableCell, WidthType, PageOrientation } from "docx";

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

export default function TACS() {
  // =========================
  // API
  // =========================
  const API = API_BASE;
  const TYPE_ADD = "__ADD_TYPE__";

  // =========================
  // Fonts
  // =========================
  const fontFamily =
    '"Poppins", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"';

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
  const uid = () => `${Date.now()}_${Math.random().toString(16).slice(2)}`;

  const toNumber = (v) => {
    if (v === "" || v === null || v === undefined) return 0;
    const n = Number(String(v).replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const parseMaybeJSON = (value, fallback = null) => {
    if (value === null || value === undefined || value === "") return fallback;
    if (typeof value === "object") return value;
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  };
  const parseTacsCustomFields = (value) => {
    if (!value) return {};
    if (typeof value === "object") return value;
    try {
      return JSON.parse(value || "{}");
    } catch {
      return {};
    }
  };

  const cleanTacsCustomLabel = (value) =>
    String(value || "")
      .replace(/^#+/, "")
      .replace(/_/g, " ")
      .trim()
      .replace(/\b\w/g, (m) => m.toUpperCase());

  const normalizeEntryFromApi = (row) => ({
    ...row,
    customerAddressMeta: parseMaybeJSON(row?.customerAddressMeta, null),
    photos: Array.isArray(row?.photos) ? row.photos : parseMaybeJSON(row?.photos, []),
    adviceCount: row?.adviceCount ?? "",
    staffName: row?.staffName || row?.nameOfStaff || row?.staff_name || "",
    nameOfStaff: row?.nameOfStaff || row?.staffName || row?.staff_name || "",
    customFields: parseTacsCustomFields(row?.customFields || row?.custom_fields),
    custom_fields: parseTacsCustomFields(row?.custom_fields || row?.customFields),
  });

  const formatDateShort = (iso) => {
    if (!iso) return "—";
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    const day = String(d.getDate()).padStart(2, "0");
    const mon = d.toLocaleString("en-US", { month: "short" });
    const yy = String(d.getFullYear()).slice(-2);
    return `${mon}-${day}-${yy}`;
  };

  const openLinkMaybe = (text) => {
    const t = String(text || "").trim();
    if (!t) return alert("No Means of Verification saved.");
    const match = t.match(/https?:\/\/[^\s]+/i);
    const url = match ? match[0] : null;
    if (!url) return alert("No URL found in Means of Verification.");
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const openGoogleMap = (lat, lng) => window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, "_blank");
  const openGoogleDirections = (lat, lng) =>
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`, "_blank");

  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ""));
      r.onerror = reject;
      r.readAsDataURL(file);
    });

  // =========================
  // Defaults (Type dropdown)
  // =========================
  const DEFAULT_TYPE_OPTIONS = useMemo(
    () => ["Plant Layout", "Simple TACS", "Food Safety Assessment", "Cleaner Production", "Energy Audit"],
    []
  );

  // =========================
  // State
  // =========================
  const [entries, setEntries] = useState([]);
  const [tacsCustomFields, setTacsCustomFields] = useState([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [serverTotalRows, setServerTotalRows] = useState(0);
  const [serverTotalPages, setServerTotalPages] = useState(1);

  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedToolbarDistrict, setSelectedToolbarDistrict] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedToolbarMunicipality, setSelectedToolbarMunicipality] = useState("all");
  const [selectedOverall, setSelectedOverall] = useState("overall");

  const [typeOptions, setTypeOptions] = useState(DEFAULT_TYPE_OPTIONS);
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");

  const [entryModal, setEntryModal] = useState(null); // {mode:'add'|'edit', entryId?}
  const [form, setForm] = useState({
    typeOfConsultancy: "",
    dateOfEngagement: "",
    expertInstitution: "",
    customerName: "",
    sex: "",
    customerAddressMeta: null,
    customerAddressText: "",
    adviceCount: "",
    meansOfVerification: "",
    staffName: "",
    customFields: {},
    photos: [],
  });

  // Address flow modal
  const [addressFlowOpen, setAddressFlowOpen] = useState(false);

  // Quick Address View modal (small)
  const [addressViewEntryId, setAddressViewEntryId] = useState(null);
  const addressViewEntry = useMemo(() => entries.find((x) => x.id === addressViewEntryId) || null, [entries, addressViewEntryId]);

  // Full details view modal (like Tech Promo)
  const [viewEntryId, setViewEntryId] = useState(null);
  const [viewMode, setViewMode] = useState("list"); // list/table
  const viewEntry = useMemo(() => entries.find((x) => x.id === viewEntryId) || null, [entries, viewEntryId]);

  // Photos viewer
  const photoInputRef = useRef(null);
  const [photoViewer, setPhotoViewer] = useState(null); // {photos, title}
  const [photoIndex, setPhotoIndex] = useState(0);

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

  // =========================
  // Database Loaders
  // =========================
  async function loadEntries() {
    try {
      const res = await axios.get(`${API}/tacs`, {
        params: {
          page: currentPage,
          limit: rowsPerPage,
          search: debouncedSearch.trim(),
          year: selectedYear,
          district: selectedToolbarDistrict,
          month: selectedMonth,
          municipality: selectedToolbarMunicipality,
          overall: selectedOverall,
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

      setEntries(rows.map(normalizeEntryFromApi));
      setServerTotalRows(Number(payload?.total || rows.length || 0));
      setServerTotalPages(Math.max(1, Number(payload?.totalPages || 1)));
    } catch (err) {
      console.error("loadEntries error:", err);
      setEntries([]);
      setServerTotalRows(0);
      setServerTotalPages(1);
    }
  }

  async function loadTypes() {
    try {
      const res = await axios.get(`${API}/tacs-types`);
      const names = Array.isArray(res.data)
        ? res.data
            .map((item) => {
              if (typeof item === "string") return item.trim();
              return String(item?.name || "").trim();
            })
            .filter(Boolean)
        : [];

      const normalized = Array.from(new Set(names));
      setTypeOptions(normalized.length ? normalized : DEFAULT_TYPE_OPTIONS);
    } catch (err) {
      console.error("loadTypes error:", err);
      setTypeOptions(DEFAULT_TYPE_OPTIONS);
    }
  }

  // =========================
  // Loaders / effects
  // =========================
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    loadTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    let cancelled = false;

    const fixedKeys = new Set([
      "no",
      "actions",
      "typeOfConsultancy",
      "type_of_consultancy",
      "dateOfEngagement",
      "date_of_engagement",
      "expertInstitution",
      "expert_institution",
      "customerName",
      "customer_name",
      "sex",
      "customerAddressText",
      "customer_address_text",
      "customerAddressMeta",
      "customer_address_meta",
      "adviceCount",
      "advice_count",
      "meansOfVerification",
      "means_of_verification",
      "staffName",
      "staff_name",
      "nameOfStaff",
      "name_of_staff",
      "photos"
    ]);

    async function loadTacsCustomFields() {
      try {
        const res = await axios.get(`${API}/table-management/config`);
        const modules = Array.isArray(res.data) ? res.data : [];

        const mod = modules.find((m) => {
          const name = String(m.moduleName || m.module_name || m.name || "").toLowerCase();
          return name === "tacs" || name.includes("tacs");
        });

        const table =
          (mod?.tables || []).find((t) => {
            const name = String(t.tableName || t.table_name || t.name || "").toLowerCase();
            return name === "main" || name.includes("tacs");
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

        if (!cancelled) setTacsCustomFields(finalCustomFields);
      } catch (err) {
        console.error("Failed to load TACS custom fields:", err);
        if (!cancelled) {
          setTacsCustomFields([
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

    loadTacsCustomFields();

    return () => {
      cancelled = true;
    };
  }, []);


  useEffect(() => {
    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentPage,
    rowsPerPage,
    debouncedSearch,
    selectedYear,
    selectedToolbarDistrict,
    selectedMonth,
    selectedToolbarMunicipality,
    selectedOverall,
  ]);

  // ESC closes
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setEntryModal(null);
        setTypeModalOpen(false);
        setAddressFlowOpen(false);
        setViewEntryId(null);
        setAddressViewEntryId(null);
        setPhotoViewer(null);
        setPrintModal((p) => ({ ...p, open: false }));
        setExportModal((p) => ({ ...p, open: false }));
      }
      if (e.key === "ArrowRight" && photoViewer) nextPhoto();
      if (e.key === "ArrowLeft" && photoViewer) prevPhoto();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoViewer, photoIndex]);

  // =========================
  // Type add flow (dropdown last option)
  // =========================
  const handleTypeChange = (val) => {
    if (val === TYPE_ADD) return setTypeModalOpen(true);
    setForm((prev) => ({ ...prev, typeOfConsultancy: val }));
  };

  const commitAddType = async () => {
    const name = String(newTypeName || "").trim();
    if (!name) return alert("Please type a type of consultancy.");

    try {
      await axios.post(`${API}/tacs-types`, { name });
      await loadTypes();
      setForm((prev) => ({ ...prev, typeOfConsultancy: name }));
      setNewTypeName("");
      setTypeModalOpen(false);
    } catch (err) {
      console.error("commitAddType error:", err);
      alert(err.response?.data?.message || "Failed to save type.");
    }
  };

  // =========================
  // Photos (Means of Verification section)
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

      if (converted.length === 0) return alert("No valid image files selected.");
      setForm((prev) => ({ ...prev, photos: [...(prev.photos || []), ...converted] }));
    } catch {
      alert("Failed to add photos.");
    }
  };

  const removePhotoAt = (idx) => {
    setForm((prev) => ({ ...prev, photos: (prev.photos || []).filter((_, i) => i !== idx) }));
  };

  const photoCount = (obj) => (Array.isArray(obj?.photos) ? obj.photos.length : 0);

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

  // =========================
  // Entry CRUD
  // =========================
  const resetForm = () => {
    setForm({
      typeOfConsultancy: "",
      dateOfEngagement: "",
      expertInstitution: "",
      customerName: "",
      sex: "",
      customerAddressMeta: null,
      customerAddressText: "",
      adviceCount: "",
      meansOfVerification: "",
      staffName: "",
      customFields: {},
      photos: [],
    });
    setNewTypeName("");
  };

  const openAddEntry = () => {
    resetForm();
    setEntryModal({ mode: "add" });
  };

  const openEditEntry = (entryId) => {
    const e = entries.find((x) => x.id === entryId);
    if (!e) return;

    setForm({
      typeOfConsultancy: e.typeOfConsultancy || "",
      dateOfEngagement: e.dateOfEngagement || "",
      expertInstitution: e.expertInstitution || "",
      customerName: e.customerName || "",
      sex: e.sex || "",
      customerAddressMeta: e.customerAddressMeta || null,
      customerAddressText: e.customerAddressText || e.customerAddressMeta?.displayText || "",
      adviceCount: e.adviceCount ?? "",
      meansOfVerification: e.meansOfVerification || "",
      staffName: e.staffName || e.nameOfStaff || e.staff_name || "",
      customFields: parseTacsCustomFields(e.customFields || e.custom_fields),
      photos: Array.isArray(e.photos) ? e.photos : [],
    });

    setEntryModal({ mode: "edit", entryId });
  };

  const deleteEntry = async (entryId) => {
    if (!window.confirm("Delete this TACS entry?")) return;

    try {
      await axios.delete(`${API}/tacs/${entryId}`);
      await loadEntries();
    } catch (err) {
      console.error("deleteEntry error:", err);
      alert(err.response?.data?.message || "Failed to delete entry.");
    }
  };


  const getTacsCustomPairs = (entry = {}) => {
    const values = parseTacsCustomFields(entry.customFields || entry.custom_fields);

    return (tacsCustomFields || []).map((field) => {
      const key = field.fieldKey || field.field_key || field.key;
      const rawLabel = field.fieldLabel || field.field_label || field.label || key;
      const value = values?.[key];

      return {
        key,
        label: cleanTacsCustomLabel(rawLabel),
        value: value === null || value === undefined || value === "" ? "—" : String(value),
      };
    });
  };

  const renderTacsCustomInputs = () => {
    if (!tacsCustomFields.length) return null;

    return (
      <>
        {tacsCustomFields.map((field) => {
          const key = field.fieldKey || field.field_key || field.key;
          const rawLabel = field.fieldLabel || field.field_label || field.label || key;
          const label = cleanTacsCustomLabel(rawLabel);
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

  const renderTacsCustomViewFields = (entry) => {
    const pairs = getTacsCustomPairs(entry);
    if (!pairs.length) return null;

    return pairs.map((item) => (
      <div key={`tacs-custom-view-${item.key}`} style={{ marginTop: 14 }}>
        <div style={styles.viewInfoLabel}>{item.label}</div>
        <div style={styles.viewBoxValue}>{item.value}</div>
      </div>
    ));
  };
  const validate = () => {
    if (!String(form.typeOfConsultancy || "").trim() || form.typeOfConsultancy === TYPE_ADD) return "Required: Type of Consultancy";
    if (!String(form.dateOfEngagement || "").trim()) return "Required: Date of Engagement";
    if (!String(form.customerName || "").trim()) return "Required: Name of Customer";
    if (!String(form.customerAddressText || "").trim()) return "Required: Address of Customer";
    if (form.adviceCount === "" || Number.isNaN(Number(form.adviceCount))) return "Required: No. of Advice (number)";
    return "";
  };

  const saveEntry = async () => {
    const err = validate();
    if (err) return alert(err);

    const payload = {
      id: entryModal?.mode === "edit" ? entryModal.entryId : uid(),
      typeOfConsultancy: String(form.typeOfConsultancy || "").trim(),
      dateOfEngagement: String(form.dateOfEngagement || "").trim(),
      expertInstitution: String(form.expertInstitution || "").trim(),
      customerName: String(form.customerName || "").trim(),
      sex: String(form.sex || "").trim(),
      customerAddressText: String(form.customerAddressText || "").trim(),
      customerAddressMeta: form.customerAddressMeta || null,
      adviceCount: toNumber(form.adviceCount),
      meansOfVerification: String(form.meansOfVerification || "").trim(),
      staffName: String(form.staffName || "").trim(),
      nameOfStaff: String(form.staffName || "").trim(),
      custom_fields: form.customFields || {},
      customFields: form.customFields || {},
      photos: Array.isArray(form.photos) ? form.photos : [],
    };

    try {
      if (entryModal?.mode === "edit") {
        await axios.put(`${API}/tacs/${entryModal.entryId}`, payload);
      } else {
        await axios.post(`${API}/tacs`, payload);
      }

      await loadEntries();
      setEntryModal(null);
      resetForm();
    } catch (err) {
      console.error("saveEntry error:", err);
      alert(err.response?.data?.message || "Failed to save entry.");
    }
  };


  // =========================
  // Export / Print helpers (Special Project-style modal flow)
  // =========================
  const escapeHtml = (value = "") =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const getTacsExportColumns = () => [
    ["no", "NO."],
    ["typeOfConsultancy", "TYPE OF CONSULTANCY"],
    ["dateOfEngagement", "DATE OF ENGAGEMENT"],
    ["expertInstitution", "NAME OF EXPERT/INSTITUTION"],
    ["customerName", "NAME OF CUSTOMER"],
    ["sex", "SEX"],
    ["customerAddressText", "VENUE/VENUE/ADDRESS OF CUSTOMER"],
    ["coordinates", "COORDINATES"],
    ["adviceCount", "NO. OF ADVICE"],
    ["meansOfVerification", "MEANS OF VERIFICATION"],
    ["staffName", "NAME OF STAFF"],
  ];

  const buildExportRows = (scope = "bulk", entryId = null) => {
    const source = scope === "row" && entryId
      ? entries.filter((entry) => entry.id === entryId)
      : entries;

    return source.map((entry, idx) => ({
      no: scope === "row" ? 1 : (currentPage - 1) * rowsPerPage + idx + 1,
      typeOfConsultancy: entry.typeOfConsultancy || "",
      dateOfEngagement: entry.dateOfEngagement || "",
      expertInstitution: entry.expertInstitution || "",
      customerName: entry.customerName || "",
      sex: entry.sex || "",
      customerAddressText: entryAddressText(entry),
      coordinates:
        Number.isFinite(entry?.customerAddressMeta?.lat) && Number.isFinite(entry?.customerAddressMeta?.lng)
          ? `${entry.customerAddressMeta.lat}, ${entry.customerAddressMeta.lng}`
          : "",
      adviceCount: toNumber(entry.adviceCount),
      meansOfVerification: entry.meansOfVerification || "",
      staffName: entry.staffName || entry.nameOfStaff || "",
    }));
  };

  const getExportTitle = (scope = "bulk") =>
    scope === "row" ? "TACS Entry" : "TACS Table";

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

  const exportCsv = (rows, columns, filename) => {
    const csvRows = [
      columns.map(([, label]) => `"${String(label).replace(/"/g, '""')}"`).join(","),
      ...rows.map((row) =>
        columns
          .map(([key]) => `"${String(row[key] ?? "").replace(/"/g, '""')}"`)
          .join(",")
      ),
    ];
    downloadBlob(new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" }), filename);
  };

  const exportExcel = (rows, columns, filename) => {
    const ws = XLSX.utils.json_to_sheet(
      rows.map((row) =>
        columns.reduce((acc, [key, label]) => {
          acc[label] = row[key] ?? "";
          return acc;
        }, {})
      ),
      { header: columns.map(([, label]) => label) }
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "TACS");
    XLSX.writeFile(wb, filename);
  };

  const exportPdf = (rows, columns, filename, options = {}) => {
    const orientation = options.orientation === "portrait" ? "p" : "l";
    const doc = new jsPDF({ orientation, unit: "pt", format: options.preset === "legal" ? "legal" : options.preset === "letter" ? "letter" : "a4" });
    doc.setFontSize(14);
    doc.text(getExportTitle(options.scope), 40, 38);
    autoTable(doc, {
      head: [columns.map(([, label]) => label)],
      body: rows.map((row) => columns.map(([key]) => String(row[key] ?? ""))),
      startY: 55,
      styles: { fontSize: 7, cellPadding: 3, overflow: "linebreak" },
      headStyles: { fillColor: [11, 78, 162] },
    });
    doc.save(filename);
  };

  const exportDocx = async (rows, columns, filename, options = {}) => {
    const tableRows = [
      new TableRow({
        children: columns.map(([, label]) =>
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })] })],
          })
        ),
      }),
      ...rows.map((row) =>
        new TableRow({
          children: columns.map(([key]) =>
            new TableCell({
              children: [new Paragraph(String(row[key] ?? ""))],
            })
          ),
        })
      ),
    ];

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              size: {
                orientation: options.orientation === "portrait" ? PageOrientation.PORTRAIT : PageOrientation.LANDSCAPE,
              },
            },
          },
          children: [
            new Paragraph({ children: [new TextRun({ text: getExportTitle(options.scope), bold: true, size: 28 })] }),
            new Paragraph(" "),
            new DocxTable({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } }),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    downloadBlob(blob, filename);
  };

  const confirmExportModal = async () => {
    const rows = buildExportRows(exportModal.scope, exportModal.entryId);
    const columns = getTacsExportColumns();
    const baseName = exportModal.scope === "row" ? `tacs-entry-${exportModal.entryId || "row"}` : "tacs-table";

    if (exportModal.format === "csv") exportCsv(rows, columns, `${baseName}.csv`);
    else if (exportModal.format === "pdf") exportPdf(rows, columns, `${baseName}.pdf`, exportModal);
    else if (exportModal.format === "docx") await exportDocx(rows, columns, `${baseName}.docx`, exportModal);
    else exportExcel(rows, columns, `${baseName}.xlsx`);

    setExportModal((p) => ({ ...p, open: false }));
  };

  const getPaperCss = (modal) => {
    if (modal.preset === "custom") {
      const w = Number(modal.customSize?.width || 8.5);
      const h = Number(modal.customSize?.height || 13);
      return `${w}in ${h}in`;
    }
    return modal.preset || "a4";
  };

  const confirmPrintModal = () => {
    const rows = buildExportRows(printModal.scope, printModal.entryId);
    const columns = getTacsExportColumns();
    const title = getExportTitle(printModal.scope);
    const paper = getPaperCss(printModal);
    const orientation = printModal.orientation || "landscape";

    const tableHtml = `
      <table>
        <thead><tr>${columns.map(([, label]) => `<th>${escapeHtml(label)}</th>`).join("")}</tr></thead>
        <tbody>
          ${rows.length ? rows.map((row) => `<tr>${columns.map(([key]) => `<td>${escapeHtml(row[key] ?? "")}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${columns.length}">No data available. Template/header only.</td></tr>`}
        </tbody>
      </table>`;

    const formHtml = rows.length
      ? rows.map((row, idx) => `
          <div class="form-card">
            <h3>${title} ${rows.length > 1 ? `#${idx + 1}` : ""}</h3>
            ${columns.map(([key, label]) => `<div class="field"><b>${escapeHtml(label)}:</b><span>${escapeHtml(row[key] ?? "—")}</span></div>`).join("")}
          </div>`).join("")
      : `<div class="form-card"><h3>${title}</h3><p>No data available. Template/header only.</p>${columns.map(([, label]) => `<div class="field"><b>${escapeHtml(label)}:</b><span></span></div>`).join("")}</div>`;

    const compactHtml = rows.length
      ? rows.map((row, idx) => `<p><b>${idx + 1}.</b> ${escapeHtml(row.customerName || "—")} — ${escapeHtml(row.typeOfConsultancy || "—")} — ${escapeHtml(row.customerAddressText || "—")}</p>`).join("")
      : `<p>No data available. Template/header only.</p>`;

    const bodyHtml = printModal.layout === "TABLE" ? tableHtml : printModal.layout === "COMPACT" ? compactHtml : formHtml;

    const win = window.open("", "_blank", "width=1200,height=800");
    if (!win) return alert("Popup blocked. Please allow popups to print.");
    win.document.write(`<!doctype html>
      <html>
        <head>
          <title>${escapeHtml(title)}</title>
          <style>
            @page { size: ${paper} ${orientation}; margin: 12mm; }
            body { font-family: Arial, sans-serif; color: #0f172a; }
            h1 { font-size: 18px; margin: 0 0 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; }
            th, td { border: 1px solid #475569; padding: 5px; vertical-align: top; word-break: break-word; }
            th { background: #e2e8f0; }
            .form-card { border: 1px solid #94a3b8; border-radius: 8px; padding: 12px; margin-bottom: 12px; page-break-inside: avoid; }
            .field { display: grid; grid-template-columns: 220px 1fr; gap: 8px; border-bottom: 1px solid #e2e8f0; padding: 6px 0; font-size: 12px; }
            p { font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>${escapeHtml(title)}</h1>
          ${bodyHtml}
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>`);
    win.document.close();
    setPrintModal((p) => ({ ...p, open: false }));
  };

  const openExportModal = (scope = "bulk", entryId = null) =>
    setExportModal((p) => ({ ...p, open: true, scope, entryId }));

  const openPrintModal = (scope = "bulk", entryId = null) =>
    setPrintModal((p) => ({ ...p, open: true, scope, entryId }));

  // =========================
  // Map dashboard (pins: customer address coords)
  // =========================
  const [outlineGeo, setOutlineGeo] = useState(null);
  const [municipalGeo, setMunicipalGeo] = useState(null);
  const [geoError, setGeoError] = useState("");

  const [borderMode, setBorderMode] = useState("municipality"); // municipality | district
  const [selectedMunicipality, setSelectedMunicipality] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setGeoError("");
      try {
        const [oRes, mRes] = await Promise.all([fetch("/geo/pangasinan_outline.geojson"), fetch("/geo/pangasinan_municipalities.geojson")]);
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
      return { type: "FeatureCollection", features: feats.filter((f) => String(getFeatureName(f) || "") === selectedMunicipality) };
    }

    if (borderMode === "district") {
      if (!selectedDistrict) return municipalGeo;
      const feats = municipalGeo?.features || [];
      return { type: "FeatureCollection", features: feats.filter((f) => selectedDistrictSet.has(String(getFeatureName(f) || ""))) };
    }

    return municipalGeo;
  }, [municipalGeo, borderMode, selectedMunicipality, selectedDistrict, selectedDistrictSet]);

  const entryAddressText = (e) => String(e?.customerAddressText || e?.customerAddressMeta?.displayText || "").trim() || "—";

  const getEntryMunicipality = (e) => {
    const m = e?.customerAddressMeta?.municipality;
    if (m) return String(m).trim();

    const addr = entryAddressText(e);
    if (!addr || addr === "—") return "";
    const parts = addr.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) return parts[parts.length - 2];
    return "";
  };

  const allPinnedEntries = useMemo(
    () => entries.filter((e) => Number.isFinite(e?.customerAddressMeta?.lat) && Number.isFinite(e?.customerAddressMeta?.lng)),
    [entries]
  );

  const yearOptions = useMemo(() => {
    const years = [];
    for (let year = 2050; year >= 1970; year -= 1) {
      years.push(String(year));
    }
    return years;
  }, []);

  const monthOptions = useMemo(
    () => [
      { value: "01", label: "January" },
      { value: "02", label: "February" },
      { value: "03", label: "March" },
      { value: "04", label: "April" },
      { value: "05", label: "May" },
      { value: "06", label: "June" },
      { value: "07", label: "July" },
      { value: "08", label: "August" },
      { value: "09", label: "September" },
      { value: "10", label: "October" },
      { value: "11", label: "November" },
      { value: "12", label: "December" },
    ],
    []
  );

  const toolbarDistrictOptions = useMemo(() => PANGASINAN_DISTRICTS.map((d) => d.id), []);

  const toolbarMunicipalityOptions = useMemo(() => {
    if (selectedToolbarDistrict === "all") return PANGASINAN_LGUS;
    const found = PANGASINAN_DISTRICTS.find((d) => d.id === selectedToolbarDistrict);
    return found ? [...found.municipalities].sort((a, b) => a.localeCompare(b)) : PANGASINAN_LGUS;
  }, [selectedToolbarDistrict]);

  const passesToolbarFilters = (entry) => {
    const rawDate = String(entry?.dateOfEngagement || "").trim();
    const entryYear = rawDate.slice(0, 4);
    const entryMonth = rawDate.length >= 7 ? rawDate.slice(5, 7) : "";
    const entryMunicipality = getEntryMunicipality(entry);
    const hasCoords = Number.isFinite(entry?.customerAddressMeta?.lat) && Number.isFinite(entry?.customerAddressMeta?.lng);

    if (selectedYear !== "all" && entryYear !== selectedYear) return false;
    if (selectedMonth !== "all" && entryMonth !== selectedMonth) return false;
    if (selectedToolbarDistrict !== "all") {
      const found = PANGASINAN_DISTRICTS.find((d) => d.id === selectedToolbarDistrict);
      if (!found || !found.municipalities.includes(entryMunicipality)) return false;
    }
    if (selectedToolbarMunicipality !== "all" && entryMunicipality !== selectedToolbarMunicipality) return false;
    if (selectedOverall === "with-coordinates" && !hasCoords) return false;
    if (selectedOverall === "without-coordinates" && hasCoords) return false;
    return true;
  };

  const filteredEntries = useMemo(() => entries, [entries]);

  const visiblePinnedEntries = useMemo(() => {
    let arr = allPinnedEntries;

    if (borderMode === "municipality") {
      if (!selectedMunicipality) return arr;
      return arr.filter((e) => getEntryMunicipality(e) === selectedMunicipality);
    }

    if (!selectedDistrict) return arr;
    return arr.filter((e) => selectedDistrictSet.has(getEntryMunicipality(e)));
  }, [allPinnedEntries, borderMode, selectedMunicipality, selectedDistrict, selectedDistrictSet]);

  const clearToolbarFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setCurrentPage(1);
    setSelectedYear("all");
    setSelectedToolbarDistrict("all");
    setSelectedMonth("all");
    setSelectedToolbarMunicipality("all");
    setSelectedOverall("overall");
  };

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

  const maskPathOptions = {
    color: "transparent",
    weight: 0,
    fillColor: "#ffffff",
    fillOpacity: 1,
  };

  // =========================
  // Address Flow
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
    const [venueName, setVenueName] = useState(initialMeta?.venueName || initialMeta?.venue || "");
    const [manualText, setManualText] = useState(initialMeta?.manualText || "");
    const [coordsText, setCoordsText] = useState(() => {
      const lat = Number(initialMeta?.lat);
      const lng = Number(initialMeta?.lng);
      return Number.isFinite(lat) && Number.isFinite(lng) ? `${lat}, ${lng}` : "";
    });
    const [reverseLoading, setReverseLoading] = useState(false);
    const [reverseError, setReverseError] = useState("");

    const province = "Pangasinan";
    const [municipality, setMunicipality] = useState(initialMeta?.municipality || "");
    const [barangay, setBarangay] = useState(initialMeta?.barangay || "");

    const [barangayOptions, setBarangayOptions] = useState([]);
    const [barangayLoading, setBarangayLoading] = useState(false);
    const [barangayError, setBarangayError] = useState("");
    const [search, setSearch] = useState("");

    const [coords, setCoords] = useState(() => {
      const lat = Number(initialMeta?.lat);
      const lng = Number(initialMeta?.lng);
      return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
    });

    useEffect(() => {
      if (!open) return;
      const initMode = initialMeta?.mode || "hierarchical";
      setMode(initMode);
      setVenueName(initialMeta?.venueName || initialMeta?.venue || "");
      setManualText(initialMeta?.manualText || "");
      setMunicipality(initialMeta?.municipality || "");
      setBarangay(initialMeta?.barangay || "");

      const lat = Number(initialMeta?.lat);
      const lng = Number(initialMeta?.lng);
      const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
      setCoords(hasCoords ? { lat, lng } : null);
      setCoordsText(hasCoords ? `${lat}, ${lng}` : "");
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
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, mode, municipality]);

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
      if (!parsed) {
        setReverseError("Invalid coordinates. Use format: 15.123456, 120.123456");
        return;
      }
      setCoords(parsed);
      setReverseLoading(true);
      setReverseError("");
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${parsed.lat}&lon=${parsed.lng}`);
        if (!res.ok) throw new Error("Reverse geocoding failed");
        const data = await res.json();
        const nextAddress = compactReverseAddress(data);
        if (nextAddress) setManualText(nextAddress);
      } catch {
        setReverseError("Coordinates saved, but auto-address lookup failed. You can type the address manually.");
      } finally {
        setReverseLoading(false);
      }
    };

    const addressOnlyText =
      mode === "manual" ? manualText.trim() : [barangay, municipality, province].filter(Boolean).join(", ");
    const displayText = [venueName.trim(), addressOnlyText].filter(Boolean).join(",\n");

    const canSave =
      mode === "manual"
        ? Boolean(venueName.trim() || manualText.trim() || coords)
        : Boolean((municipality && barangay) || venueName.trim() || coords);

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
      if (!coords) setCoords({ lat: 15.9167, lng: 120.3333 });
      setStep(3);
    };

    const useMyLocation = () => {
      if (!navigator.geolocation) return alert("Geolocation not supported in this browser.");
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCoords(next);
          setCoordsText(`${next.lat}, ${next.lng}`);
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
              venue: venueName.trim(),
              manualText: manualText.trim(),
              addressOnlyText,
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
              venue: venueName.trim(),
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
              <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 800 }}>{breadcrumb}</div>
            </div>
            <button style={styles.closeX} onClick={onClose}>✕</button>
          </div>

          <div style={styles.flowBody}>
            <div style={styles.tabsRow}>
              <button style={styles.tabBtn(mode === "hierarchical")} onClick={() => { setMode("hierarchical"); setStep(1); setManualText(""); setSearch(""); }}>
                Hierarchical
              </button>
              <button style={styles.tabBtn(mode === "manual")} onClick={() => { setMode("manual"); setStep(1); setMunicipality(""); setBarangay(""); setBarangayOptions([]); setBarangayError(""); setSearch(""); }}>
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
                  <textarea style={styles.textarea} value={manualText} onChange={(e) => setManualText(e.target.value)} placeholder="Optional: Bldg/Street, Barangay, City/Municipality, Pangasinan" />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Coordinates</div>
                  <input
                    style={styles.input}
                    value={coordsText}
                    onChange={(e) => setCoordsText(e.target.value)}
                    onBlur={() => { if (coordsText.trim()) handleUseCoordinates(); }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleUseCoordinates(); } }}
                    placeholder="Optional: 15.123456, 120.123456"
                  />
                  <button type="button" style={{ ...styles.btnGhost, alignSelf: "flex-start", padding: "6px 10px" }} onClick={handleUseCoordinates} disabled={!coordsText.trim() || reverseLoading}>
                    {reverseLoading ? "Finding address..." : "Use Coordinates"}
                  </button>
                  {reverseError ? <div style={{ fontSize: 12, color: "#b91c1c", fontWeight: 800 }}>{reverseError}</div> : null}
                </div>

                <div style={{ fontSize: 12, opacity: 0.75, whiteSpace: "pre-wrap" }}>Preview: <b>{displayText || "—"}</b></div>

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
                      <div style={styles.label}>Search Municipality/City</div>
                      <input style={styles.input} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Type to search..." />
                    </div>
                    <div style={styles.label}>Select Municipality/City (Pangasinan)</div>
                    <div style={styles.list}>
                      {filterList(PANGASINAN_LGUS).map((name) => {
                        const active = name === municipality;
                        return (
                          <button key={name} style={{ ...styles.listBtn, ...(active ? styles.listBtnActive : null) }} onClick={() => { setMunicipality(name); setBarangay(""); setCoords(null); setSearch(""); setStep(2); }}>
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
                      <input style={styles.input} value={search} onChange={(e) => setSearch(e.target.value)} placeholder={barangayLoading ? "Loading..." : "Type to search barangays..."} disabled={barangayLoading} />
                    </div>
                    {barangayLoading ? (
                      <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 800 }}>Loading barangays...</div>
                    ) : barangayError ? (
                      <div style={styles.warn}>⚠ {barangayError}<div style={{ marginTop: 6, opacity: 0.9 }}>Make sure file exists: <span style={styles.mono}>public/data/pangasinan_barangays.json</span></div></div>
                    ) : (
                      <>
                        <div style={styles.label}>Select Barangay</div>
                        <div style={styles.list}>
                          {filterList(barangayOptions).map((b) => {
                            const name = typeof b === "string" ? b : b.name;
                            const active = name === barangay;
                            return (
                              <button key={name} style={{ ...styles.listBtn, ...(active ? styles.listBtnActive : null) }} onClick={() => { setBarangay(name); const lat = typeof b === "string" ? null : b.lat; const lng = typeof b === "string" ? null : b.lng; if (Number.isFinite(lat) && Number.isFinite(lng)) { setCoords({ lat, lng }); setCoordsText(`${lat}, ${lng}`); } else { setCoords(null); setCoordsText(""); } }}>
                                {name}
                              </button>
                            );
                          })}
                          {barangayOptions.length === 0 ? <div style={{ padding: 10, fontSize: 12, opacity: 0.75 }}>No barangays found for this municipality in the JSON file.</div> : null}
                        </div>
                      </>
                    )}
                    <div style={{ fontSize: 12, opacity: 0.75, whiteSpace: "pre-wrap" }}>Preview: <b>{displayText || "—"}</b></div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <button style={styles.btnGhost} onClick={back}>Back</button>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button style={styles.btnGhost} onClick={goToMap}>Pin on Map</button>
                        <button style={styles.btnDark} onClick={save} disabled={!canSave}>Save</button>
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
                          <LayersControl.BaseLayer name="Satellite (Esri)"><TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution="Tiles &copy; Esri" opacity={0.9} /></LayersControl.BaseLayer>
                        </LayersControl>
                        <FlyToCenter coords={coords} zoom={16} />
                        <ClickToMoveMarker onPick={(point) => { setCoords(point); setCoordsText(`${point.lat}, ${point.lng}`); }} />
                        {coords && <Marker position={[coords.lat, coords.lng]} draggable eventHandlers={{ dragend: (e) => { const p = e.target.getLatLng(); setCoords({ lat: p.lat, lng: p.lng }); setCoordsText(`${p.lat}, ${p.lng}`); } }} />}
                      </MapContainer>
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.8, whiteSpace: "pre-wrap" }}><div><b>Selected:</b> {displayText}</div><div><b>Coordinates:</b> {coords ? `${coords.lat}, ${coords.lng}` : "—"}</div></div>
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

  const applyCustomerAddressMetaToForm = (meta) => {
    setForm((prev) => ({
      ...prev,
      customerAddressMeta: meta || null,
      customerAddressText: meta?.displayText || "",
    }));
  };

  // =========================
  // Small address view modal
  // =========================
  function AddressViewModal({ entry, onClose }) {
    if (!entry) return null;

    const addr = entryAddressText(entry);
    const lat = entry?.customerAddressMeta?.lat;
    const lng = entry?.customerAddressMeta?.lng;
    const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);
    const coordText = hasCoords ? `${lat}, ${lng}` : "—";

    return (
      <div style={{ ...styles.modalBackdrop, zIndex: 3200 }} onClick={onClose}>
        <div style={{ ...styles.modal, position: "relative", zIndex: 3201, width: "min(720px, 100%)" }} onClick={(e) => e.stopPropagation()}>
          <div style={styles.modalHeader}>
            <div>View Address — {entry.customerName || "Customer"}</div>
            <button style={styles.closeX} onClick={onClose}>
              ✕
            </button>
          </div>

          <div style={styles.modalBody}>
            <div style={{ display: "grid", gap: 8, fontSize: 14 }}>
              <div>
                <b>Address:</b> {addr}
              </div>
              <div>
                <b>Coordinates:</b> {coordText}
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

    sectionTitleRow: {
      marginTop: 14,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      flexWrap: "nowrap",
      overflowX: "auto",
      fontFamily,
    },

    sectionHeaderInline: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      flexWrap: "nowrap",
      whiteSpace: "nowrap",
      minWidth: "max-content",
      marginLeft: "auto",
      justifyContent: "flex-end",
    },

    sectionTitle: {
      fontWeight: 900,
      fontSize: 13,
      color: "#0f172a",
      fontFamily,
      whiteSpace: "nowrap",
      flexShrink: 0,
      marginRight: 6,
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

    pill: {
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 999,
      border: "1px solid #cbd5e1",
      background: "#f8fafc",
      fontSize: 11,
      fontWeight: 900,
    },

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
    toolbarCard: {
      display: "flex",
      gap: 8,
      alignItems: "center",
      flexWrap: "nowrap",
      whiteSpace: "nowrap",
      flexShrink: 0,
    },
    toolbarSelect: {
      height: 30,
      minWidth: 108,
      padding: "0 10px",
      borderRadius: 8,
      border: "1px solid #cbd5e1",
      background: "#fff",
      fontWeight: "bold",
      fontFamily,
      fontSize: 12,
      cursor: "pointer",
      outline: "none",
    },
    toolbarSearch: {
      height: 30,
      minWidth: 180,
      padding: "0 10px",
      borderRadius: 8,
      border: "1px solid #cbd5e1",
      background: "#fff",
      fontWeight: "bold",
      fontFamily,
      fontSize: 12,
      outline: "none",
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
    toolbarBtn: {
      height: 30,
      minWidth: 84,
      padding: "0 10px",
      borderRadius: 8,
      border: "1px solid #cbd5e1",
      background: "#fff",
      fontWeight: "bold",
      fontFamily,
      fontSize: 12,
      cursor: "pointer",
      whiteSpace: "nowrap",
    },
    toolbarPrintBtn: {
      height: 30,
      minWidth: 84,
      padding: "0 10px",
      borderRadius: 8,
      border: "1px solid #0b4ea2",
      background: "#0b4ea2",
      color: "#fff",
      fontWeight: "bold",
      fontFamily,
      fontSize: 12,
      cursor: "pointer",
      whiteSpace: "nowrap",
    },
    toolbarPrimaryBtn: {
      height: 30,
      minWidth: 98,
      padding: "0 10px",
      borderRadius: 8,
      border: "1px solid #111827",
      background: "#fff",
      fontWeight: "bold",
      fontFamily,
      fontSize: 12,
      cursor: "pointer",
      whiteSpace: "nowrap",
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

    viewTopTabs: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 },
    viewSectionTitle: { fontSize: 22, fontWeight: 900, color: "#0f172a", marginBottom: 10, fontFamily },
    viewInfoGrid: { display: "grid", gridTemplateColumns: "repeat(3, minmax(220px, 1fr))", gap: 14, alignItems: "start" },
    viewCoordRow: { display: "grid", gridTemplateColumns: "repeat(2, minmax(220px, 1fr))", gap: 14, marginTop: 12 },
    viewInfoItem: { display: "flex", flexDirection: "column", gap: 4 },
    viewInfoLabel: { fontSize: 12, fontWeight: 900, color: "#0f172a", fontFamily },
    viewInfoValue: { fontSize: 13, fontWeight: 800, color: "#111827", lineHeight: 1.35, fontFamily },
    viewFullRow: { marginTop: 12, display: "grid", gap: 6 },
    viewBoxValue: { padding: "8px 10px", border: "1px solid #b6c2d2", borderRadius: 6, background: "#f8fafc", fontSize: 13, fontWeight: 800, color: "#111827", minHeight: 26, display: "flex", alignItems: "center", fontFamily },
    mapBox: { height: 340, borderRadius: 12, overflow: "hidden", border: "1px solid #e2e8f0" },
  };

  // =========================
  // RENDER
  // =========================
  return (
    <div style={styles.page}>
      <div style={styles.titleBar}>
        <div>TACS</div>
        <div style={{ fontSize: 12, opacity: 0.95, fontWeight: 800, fontFamily }}>
         
        </div>
      </div>

      {/* ✅ MAP DASHBOARD */}
      <div style={styles.mapCard}>
        <div style={styles.mapHeader}>
          <div style={{ display: "flex", flexDirection: "column", gap: 2, width: "100%" }}>
            <div style={styles.mapTitle}>PANGASINAN MAP — TACS Customer Pins</div>
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

            {visiblePinnedEntries.map((e) => (
              <Marker key={e.id} position={[e.customerAddressMeta.lat, e.customerAddressMeta.lng]} pane="pinPane">
                <Popup>
                  <div style={{ minWidth: 260, fontFamily }}>
                    <div style={{ fontWeight: 900, marginBottom: 6 }}>{e.customerName || "—"}</div>
                    <div style={{ fontSize: 12, marginBottom: 6 }}>
                      <b>Date:</b> {formatDateShort(e.dateOfEngagement)}
                      <br />
                      <b>Type:</b> {e.typeOfConsultancy || "—"}
                      <br />
                      <b>No. Advice:</b> {toNumber(e.adviceCount)}
                    </div>

                    <div style={{ fontSize: 12, marginBottom: 8 }}>
                      <b>Address:</b> {entryAddressText(e)}
                      <br />
                      <b>Coordinates:</b> {e.customerAddressMeta.lat}, {e.customerAddressMeta.lng}
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button style={styles.tinyBtn} onClick={() => setAddressViewEntryId(e.id)}>
                        View
                      </button>
                      <button style={styles.tinyBtn} onClick={() => openGoogleMap(e.customerAddressMeta.lat, e.customerAddressMeta.lng)}>
                        Map
                      </button>
                      <button style={styles.tinyBtn} onClick={() => openGoogleDirections(e.customerAddressMeta.lat, e.customerAddressMeta.lng)}>
                        Directions
                      </button>
                      <button style={styles.tinyBtn} onClick={() => setViewEntryId(e.id)}>
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

      {/* HEADER + FILTER TOOLBAR */}
      <div style={styles.sectionTitleRow}>
        <div style={styles.sectionTitle}>
          TACS TABLE
          <span style={{ marginLeft: 8, fontSize: 11, color: "#475569", fontWeight: 900 }}>
            Showing {filteredEntries.length} of {serverTotalRows} / {serverTotalRows}
          </span>
        </div>

        <div style={styles.sectionHeaderInline}>
          <div style={styles.toolbarCard}>
            <input
              style={styles.toolbarSearch}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer..."
            />

            <select
              style={styles.toolbarSelect}
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Years</option>
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <select
              style={styles.toolbarSelect}
              value={selectedToolbarDistrict}
              onChange={(e) => {
                setSelectedToolbarDistrict(e.target.value);
                setSelectedToolbarMunicipality("all");
                setCurrentPage(1);
              }}
            >
              <option value="all">All Districts</option>
              {toolbarDistrictOptions.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>

            <select
              style={styles.toolbarSelect}
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Months</option>
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>

            <select
              style={styles.toolbarSelect}
              value={selectedToolbarMunicipality}
              onChange={(e) => {
                setSelectedToolbarMunicipality(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">All Municipalities</option>
              {toolbarMunicipalityOptions.map((municipality) => (
                <option key={municipality} value={municipality}>
                  {municipality}
                </option>
              ))}
            </select>

            <select
              style={styles.toolbarSelect}
              value={selectedOverall}
              onChange={(e) => {
                setSelectedOverall(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="overall">Overall</option>
              <option value="with-coordinates">With Coordinates</option>
              <option value="without-coordinates">Without Coordinates</option>
            </select>

            <button style={styles.toolbarBtn} onClick={() => openExportModal("bulk", null)}>
              Export
            </button>

            <button style={styles.toolbarPrintBtn} onClick={() => openPrintModal("bulk", null)}>
              Print
            </button>

            <button style={styles.toolbarBtn} onClick={clearToolbarFilters}>
              Clear Filters
            </button>

            <button style={styles.toolbarPrimaryBtn} onClick={openAddEntry}>
              + Add Project
            </button>
          </div>
        </div>

      </div>

      {/* MAIN TABLE */}
      <div style={styles.tableWrap}>
        <table style={{ ...styles.table, minWidth: 1500 }}>
          <colgroup>
            <col style={{ width: "4%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "14%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "6%" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "13%" }} />
          </colgroup>

          <thead>
            <tr>
              <th style={styles.th}>NO.</th>
              <th style={styles.th}>TYPE OF CONSULTANCY*</th>
              <th style={styles.th}>DATE OF ENGAGEMENT (mm/dd/yy)</th>
              <th style={styles.th}>NAME OF EXPERT/INSTITUTION</th>
              <th style={styles.th}>NAME OF CUSTOMER</th>
              <th style={styles.th}>SEX (M/F)</th>
              <th style={styles.th}>VENUE/ADDRESS OF CUSTOMER</th>
              <th style={styles.th}>NO. OF ADVICE</th>
              <th style={styles.th}>ACTIONS</th>
            </tr>
          </thead>

          <tbody>
            {filteredEntries.length === 0 ? (
              <tr>
                <td style={styles.tdCenter} colSpan={9}>
                  No matching entries found. Adjust the filters or click “+ Add Project”.
                </td>
              </tr>
            ) : (
              filteredEntries.map((e, idx) => {
                const lat = e?.customerAddressMeta?.lat;
                const lng = e?.customerAddressMeta?.lng;
                const hasCoords = Number.isFinite(lat) && Number.isFinite(lng);

                return (
                  <tr key={e.id}>
                    <td style={styles.tdCenter}>{(effectivePage - 1) * rowsPerPage + idx + 1}</td>
                    <td style={styles.td}>{e.typeOfConsultancy || "—"}</td>
                    <td style={styles.tdCenter}>{formatDateShort(e.dateOfEngagement)}</td>
                    <td style={styles.td}>{e.expertInstitution || "—"}</td>
                    <td style={styles.td}>{e.customerName || "—"}</td>
                    <td style={styles.tdCenter}>{e.sex || "—"}</td>

                    <td style={styles.td}>
                      <div style={{ display: "grid", gap: 8 }}>
                        <div style={{ fontSize: 12 }}>{entryAddressText(e)}</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button style={styles.tinyBtn} onClick={() => setAddressViewEntryId(e.id)}>
                            View
                          </button>
                          {hasCoords ? (
                            <>
                              <button style={styles.tinyBtn} onClick={() => openGoogleMap(lat, lng)}>
                                Map
                              </button>
                              <button style={styles.tinyBtn} onClick={() => openGoogleDirections(lat, lng)}>
                                Directions
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    <td style={styles.tdCenter}>{toNumber(e.adviceCount)}</td>

                    <td style={styles.tdCenter}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                        <button style={styles.tinyBtn} onClick={() => setViewEntryId(e.id)}>
                          View
                        </button>
                        <button style={styles.tinyBtn} onClick={() => openEditEntry(e.id)}>
                          Edit
                        </button>
                        <button style={styles.tinyBtn} onClick={() => openExportModal("row", e.id)}>
                          Export
                        </button>
                        <button style={styles.tinyBtn} onClick={() => openPrintModal("row", e.id)}>
                          Print
                        </button>
                        <button style={styles.dangerTiny} onClick={() => deleteEntry(e.id)}>
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
            onClick={() =>
              setCurrentPage(() => Math.max(1, pageWindowStart - PAGE_NUMBER_WINDOW))
            }
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
            onClick={() => setCurrentPage(() => pageWindowStart + PAGE_NUMBER_WINDOW)}
          >
            Next
          </button>
        </div>
      </div>

      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75, fontFamily }}>
        * Scientific/technical/expert advice or recommendation rendered in any manner, either directly or indirectly to customers
        <br />
        ** Should be supported with a documented recommendation and acceptance report
      </div>

      {/* ADDRESS QUICK VIEW MODAL */}
      {addressViewEntryId && <AddressViewModal entry={addressViewEntry} onClose={() => setAddressViewEntryId(null)} />}

      {/* ADD / EDIT ENTRY MODAL */}
      {entryModal && (
        <div style={{ ...styles.modalBackdrop, zIndex: 1200 }} onClick={() => setEntryModal(null)}>
          <div style={{ ...styles.modal, position: "relative", zIndex: 1201 }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>{entryModal.mode === "edit" ? "Edit" : "Add"} TACS Entry</div>
              <button style={styles.closeX} onClick={() => setEntryModal(null)}>
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.grid}>
                <div style={styles.field}>
                  <div style={styles.label}>Type of Consultancy *</div>
                  <select style={styles.input} value={form.typeOfConsultancy} onChange={(e) => handleTypeChange(e.target.value)}>
                    <option value="">-- Select --</option>
                    {typeOptions.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                    <option value={TYPE_ADD}>+ Add type of consultancy...</option>
                  </select>
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Date of Engagement *</div>
                  <input
                    style={styles.input}
                    type="date"
                    value={form.dateOfEngagement}
                    onChange={(e) => setForm((p) => ({ ...p, dateOfEngagement: e.target.value }))}
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Name of Expert / Institution</div>
                  <textarea
                    style={styles.textarea}
                    value={form.expertInstitution}
                    onChange={(e) => setForm((p) => ({ ...p, expertInstitution: e.target.value }))}
                    placeholder="e.g. Engr. Arnold C. Santos"
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Name of Customer *</div>
                  <input
                    style={styles.input}
                    value={form.customerName}
                    onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))}
                    placeholder="e.g. Mr. Oliver Caasi"
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Sex (M/F)</div>
                  <select style={styles.input} value={form.sex} onChange={(e) => setForm((p) => ({ ...p, sex: e.target.value }))}>
                    <option value="">--</option>
                    <option value="M">M</option>
                    <option value="F">F</option>
                  </select>
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Address of Customer *</div>

                  <button type="button" onClick={() => setAddressFlowOpen(true)} style={styles.inputButton(Boolean(form.customerAddressText))}>
                    <span style={{ opacity: form.customerAddressText ? 1 : 0.6 }}>
                      {form.customerAddressText || "Click to select address of customer"}
                    </span>
                    <span style={{ fontSize: 11, opacity: 0.65 }}>{form.customerAddressText ? "Change" : "Select"}</span>
                  </button>

                  {Number.isFinite(form?.customerAddressMeta?.lat) && Number.isFinite(form?.customerAddressMeta?.lng) ? (
                    <div style={{ fontSize: 12, opacity: 0.85 }}>
                      <b>Coordinates:</b>{" "}
                      <span style={styles.mono}>
                        {form.customerAddressMeta.lat}, {form.customerAddressMeta.lng}
                      </span>
                    </div>
                  ) : null}
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>No. of Advice/Recommendations *</div>
                  <input
                    style={styles.input}
                    type="number"
                    value={form.adviceCount}
                    onChange={(e) => setForm((p) => ({ ...p, adviceCount: e.target.value }))}
                    placeholder="e.g. 1"
                  />
                </div>

                <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                  <div style={styles.label}>Name of Staff</div>
                  <input
                    style={styles.input}
                    value={form.staffName || ""}
                    onChange={(e) => setForm((p) => ({ ...p, staffName: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>

                {renderTacsCustomInputs()}

                <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                  <div style={styles.label}>Means of Verification</div>
                  <textarea
                    style={styles.textarea}
                    value={form.meansOfVerification}
                    onChange={(e) => setForm((p) => ({ ...p, meansOfVerification: e.target.value }))}
                    placeholder="Attendance sheet / links to socmed posts / activity reports / photos..."
                  />

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <button type="button" style={styles.tinyBtn} onClick={() => openLinkMaybe(form.meansOfVerification)}>
                      View Link
                    </button>

                    <button type="button" style={styles.tinyBtn} onClick={triggerAddPhotos}>
                      Add Photos
                    </button>

                    <span style={styles.pill}>Photos: {photoCount(form)}</span>
                  </div>

                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: "none" }}
                    onChange={(e) => onPickPhotos(e.target.files)}
                  />

                  {Array.isArray(form.photos) && form.photos.length > 0 ? (
                    <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                      {form.photos.map((p, idx) => (
                        <div
                          key={`${p.name}_${idx}`}
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
                            src={p.dataUrl}
                            alt={p.name}
                            style={{ width: 54, height: 54, objectFit: "cover", borderRadius: 8, border: "1px solid #e2e8f0" }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 900, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {p.name}
                            </div>
                            <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 900 }}>{p.type}</div>
                          </div>
                          <button type="button" style={styles.dangerTiny} onClick={() => removePhotoAt(idx)}>
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
              <button style={styles.btnGhost} onClick={() => setEntryModal(null)}>
                Cancel
              </button>
              <button style={styles.btnDark} onClick={saveEntry}>
                {entryModal.mode === "edit" ? "Update" : "Save"}
              </button>
            </div>
          </div>

          <AddressFlowModal
            open={addressFlowOpen}
            onClose={() => setAddressFlowOpen(false)}
            onSave={applyCustomerAddressMetaToForm}
            initialMeta={form.customerAddressMeta}
          />
        </div>
      )}

      {/* ADD TYPE MODAL */}
      {typeModalOpen && (
        <div style={{ ...styles.modalBackdrop, zIndex: 3400 }} onClick={() => setTypeModalOpen(false)}>
          <div style={{ ...styles.modal, position: "relative", zIndex: 3401, width: "min(560px, 100%)" }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>Add Type of Consultancy</div>
              <button style={styles.closeX} onClick={() => setTypeModalOpen(false)}>
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.field}>
                <div style={styles.label}>New type name</div>
                <input
                  style={styles.input}
                  value={newTypeName}
                  onChange={(e) => setNewTypeName(e.target.value)}
                  placeholder='e.g., "Machine Consultation"'
                />
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button style={styles.btnGhost} onClick={() => setTypeModalOpen(false)}>
                Cancel
              </button>
              <button style={styles.btnDark} onClick={commitAddType}>
                Add
              </button>
            </div>
          </div>
        </div>
      )}
      {/* VIEW ENTRY MODAL */}
      {viewEntryId && viewEntry && (
        <div style={{ ...styles.modalBackdrop, zIndex: 1500 }} onClick={() => setViewEntryId(null)}>
          <div style={{ ...styles.modal, position: "relative", zIndex: 1501, width: "min(1180px, 100%)" }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>View Entry</div>
              <button style={styles.closeX} onClick={() => setViewEntryId(null)}>
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.viewTopTabs}>
                <button style={styles.pillBtn(viewMode === "list")} onClick={() => setViewMode("list")}>
                  List View
                </button>
                <button style={styles.pillBtn(viewMode === "table")} onClick={() => setViewMode("table")}>
                  Table View
                </button>
                <span style={styles.pill}>Photos: {photoCount(viewEntry)}</span>
                {photoCount(viewEntry) ? (
                  <button style={styles.tinyBtn} onClick={() => openPhotos(viewEntry.photos, `Photos — ${viewEntry.customerName || "TACS"}`)}>
                    View Photos
                  </button>
                ) : null}
              </div>

              {viewMode === "list" ? (
                <>
                  <div style={styles.viewSectionTitle}>Entry Information</div>

                  <div style={styles.viewInfoGrid}>
                    <div style={styles.viewInfoItem}>
                      <div style={styles.viewInfoLabel}>Type of Consultancy</div>
                      <div style={styles.viewInfoValue}>{viewEntry.typeOfConsultancy || "—"}</div>
                    </div>

                    <div style={styles.viewInfoItem}>
                      <div style={styles.viewInfoLabel}>Date of Engagement</div>
                      <div style={styles.viewInfoValue}>{formatDateShort(viewEntry.dateOfEngagement)}</div>
                    </div>

                    <div style={styles.viewInfoItem}>
                      <div style={styles.viewInfoLabel}>Name of Expert/Institution</div>
                      <div style={styles.viewInfoValue}>{viewEntry.expertInstitution || "—"}</div>
                    </div>

                    <div style={styles.viewInfoItem}>
                      <div style={styles.viewInfoLabel}>Name of Customer</div>
                      <div style={styles.viewInfoValue}>{viewEntry.customerName || "—"}</div>
                    </div>

                    <div style={styles.viewInfoItem}>
                      <div style={styles.viewInfoLabel}>Sex (M/F)</div>
                      <div style={styles.viewInfoValue}>{viewEntry.sex || "—"}</div>
                    </div>

                    <div style={styles.viewInfoItem}>
                      <div style={styles.viewInfoLabel}>No. of Advice</div>
                      <div style={styles.viewInfoValue}>{toNumber(viewEntry.adviceCount)}</div>
                    </div>
                  </div>

                  <div style={styles.viewFullRow}>
                    <div style={styles.viewInfoLabel}>Address</div>
                    <div style={styles.viewBoxValue}>{entryAddressText(viewEntry)}</div>
                  </div>

                  <div style={styles.viewCoordRow}>
                    <div style={styles.viewInfoItem}>
                      <div style={styles.viewInfoLabel}>Municipality</div>
                      <div style={styles.viewInfoValue}>{getEntryMunicipality(viewEntry) || "—"}</div>
                    </div>

                    <div style={styles.viewInfoItem}>
                      <div style={styles.viewInfoLabel}>Coordinates</div>
                      <div style={styles.viewInfoValue}>
                        {Number.isFinite(viewEntry?.customerAddressMeta?.lat) && Number.isFinite(viewEntry?.customerAddressMeta?.lng)
                          ? `${viewEntry.customerAddressMeta.lat}, ${viewEntry.customerAddressMeta.lng}`
                          : "—"}
                      </div>
                    </div>
                  </div>

                  {Number.isFinite(viewEntry?.customerAddressMeta?.lat) && Number.isFinite(viewEntry?.customerAddressMeta?.lng) ? (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                      <button style={styles.tinyBtn} onClick={() => openGoogleMap(viewEntry.customerAddressMeta.lat, viewEntry.customerAddressMeta.lng)}>
                        Map
                      </button>
                      <button style={styles.tinyBtn} onClick={() => openGoogleDirections(viewEntry.customerAddressMeta.lat, viewEntry.customerAddressMeta.lng)}>
                        Directions
                      </button>
                    </div>
                  ) : null}

                  <div style={{ marginTop: 14 }}>
                    <div style={styles.viewInfoLabel}>Name of Staff</div>
                    <div style={styles.viewBoxValue}>{viewEntry.staffName || viewEntry.nameOfStaff || "—"}</div>
                  </div>

                  {renderTacsCustomViewFields(viewEntry)}

                  <div style={{ marginTop: 14 }}>
                    <div style={styles.viewInfoLabel}>Means of Verification</div>
                    <div style={styles.viewBoxValue}>{String(viewEntry.meansOfVerification || "").trim() ? viewEntry.meansOfVerification : "—"}</div>
                    <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <button style={styles.tinyBtn} onClick={() => openLinkMaybe(viewEntry.meansOfVerification)}>
                        View Link
                      </button>
                      <span style={styles.pill}>Photos: {photoCount(viewEntry)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div style={styles.tableWrap}>
                  <table style={{ ...styles.table, minWidth: 1700 }}>
                    <colgroup>
                      <col style={{ width: "12%" }} />
                      <col style={{ width: "9%" }} />
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "12%" }} />
                      <col style={{ width: "6%" }} />
                      <col style={{ width: "18%" }} />
                      <col style={{ width: "8%" }} />
                      <col style={{ width: "21%" }} />
                    </colgroup>

                    <thead>
                      <tr>
                        <th style={styles.th}>TYPE OF CONSULTANCY</th>
                        <th style={styles.th}>DATE</th>
                        <th style={styles.th}>EXPERT/INSTITUTION</th>
                        <th style={styles.th}>CUSTOMER</th>
                        <th style={styles.th}>SEX</th>
                        <th style={styles.th}>ADDRESS (Address + Coordinates)</th>
                        <th style={styles.th}>NO. OF ADVICE</th>
                        <th style={styles.th}>MEANS OF VERIFICATION (Link + Photos)</th>
                      </tr>
                    </thead>

                    <tbody>
                      <tr>
                        <td style={styles.td}>{viewEntry.typeOfConsultancy || "—"}</td>
                        <td style={styles.tdCenter}>{formatDateShort(viewEntry.dateOfEngagement)}</td>
                        <td style={styles.td}>{viewEntry.expertInstitution || "—"}</td>
                        <td style={styles.td}>{viewEntry.customerName || "—"}</td>
                        <td style={styles.tdCenter}>{viewEntry.sex || "—"}</td>

                        <td style={styles.td}>
                          <div style={{ display: "grid", gap: 6 }}>
                            <div>
                              <b>Address:</b> {entryAddressText(viewEntry)}
                            </div>
                            <div>
                              <b>Coordinates:</b>{" "}
                              {Number.isFinite(viewEntry?.customerAddressMeta?.lat) && Number.isFinite(viewEntry?.customerAddressMeta?.lng)
                                ? `${viewEntry.customerAddressMeta.lat}, ${viewEntry.customerAddressMeta.lng}`
                                : "—"}
                            </div>
                          </div>
                        </td>

                        <td style={styles.tdCenter}>{toNumber(viewEntry.adviceCount)}</td>

                        <td style={styles.td}>
                          <div style={{ display: "grid", gap: 8 }}>
                            <div>{String(viewEntry.meansOfVerification || "").trim() ? viewEntry.meansOfVerification : "—"}</div>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                              <button style={styles.tinyBtn} onClick={() => openLinkMaybe(viewEntry.meansOfVerification)}>
                                View Link
                              </button>
                              <span style={styles.pill}>Photos: {photoCount(viewEntry)}</span>
                              {photoCount(viewEntry) ? (
                                <button style={styles.tinyBtn} onClick={() => openPhotos(viewEntry.photos, `Photos — ${viewEntry.customerName || "TACS"}`)}>
                                  View Photos
                                </button>
                              ) : null}
                            </div>
                          </div>
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
                style={styles.btnDark}
                onClick={() => {
                  const id = viewEntry.id;
                  setViewEntryId(null);
                  openEditEntry(id);
                }}
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PHOTO VIEWER MODAL */}
      {photoViewer && (
        <div style={{ ...styles.modalBackdrop, zIndex: 4200 }} onClick={() => setPhotoViewer(null)}>
          <div style={{ ...styles.modal, position: "relative", zIndex: 4201, width: "min(980px, 100%)" }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                {photoViewer.title} — {photoIndex + 1}/{photoViewer.photos.length}
              </div>
              <button style={styles.closeX} onClick={() => setPhotoViewer(null)}>
                ✕
              </button>
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
                <button type="button" style={styles.tinyBtn} onClick={prevPhoto}>
                  ◀ Prev
                </button>
                <button type="button" style={styles.tinyBtn} onClick={nextPhoto}>
                  Next ▶
                </button>
              </div>

              <div style={{ marginTop: 10, fontSize: 12, fontWeight: 900, opacity: 0.85, textAlign: "center" }}>
                {photoViewer.photos[photoIndex].name}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EXPORT MODAL */}
      {exportModal.open && (
        <div style={{ ...styles.modalBackdrop, zIndex: 3600 }} onClick={() => setExportModal((p) => ({ ...p, open: false }))}>
          <div style={{ ...styles.modal, position: "relative", zIndex: 3601, width: "min(640px, 100%)" }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>Export {exportModal.scope === "row" ? "Selected Entry" : "TACS Table"}</div>
              <button style={styles.closeX} onClick={() => setExportModal((p) => ({ ...p, open: false }))}>✕</button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.grid}>
                <div style={styles.field}>
                  <div style={styles.label}>File Format</div>
                  <select style={styles.input} value={exportModal.format} onChange={(e) => setExportModal((p) => ({ ...p, format: e.target.value }))}>
                    <option value="excel">Excel (.xlsx)</option>
                    <option value="csv">CSV (.csv)</option>
                    <option value="pdf">PDF (.pdf)</option>
                    <option value="docx">DOCX (.docx)</option>
                  </select>
                </div>
                <div style={styles.field}>
                  <div style={styles.label}>Template</div>
                  <select style={styles.input} value={exportModal.template} onChange={(e) => setExportModal((p) => ({ ...p, template: e.target.value }))}>
                    <option value="TABLE">Table</option>
                    <option value="FORM">Form-Based</option>
                    <option value="COMPACT">Compact</option>
                  </select>
                </div>
                <div style={styles.field}>
                  <div style={styles.label}>Orientation</div>
                  <select style={styles.input} value={exportModal.orientation} onChange={(e) => setExportModal((p) => ({ ...p, orientation: e.target.value }))}>
                    <option value="landscape">Landscape</option>
                    <option value="portrait">Portrait</option>
                  </select>
                </div>
                <div style={styles.field}>
                  <div style={styles.label}>Paper Size</div>
                  <select style={styles.input} value={exportModal.preset} onChange={(e) => setExportModal((p) => ({ ...p, preset: e.target.value }))}>
                    <option value="a4">A4</option>
                    <option value="letter">Letter</option>
                    <option value="legal">Legal</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
                {exportModal.preset === "custom" ? (
                  <>
                    <div style={styles.field}>
                      <div style={styles.label}>Width (in)</div>
                      <input style={styles.input} type="number" value={exportModal.customSize.width} onChange={(e) => setExportModal((p) => ({ ...p, customSize: { ...p.customSize, width: e.target.value } }))} />
                    </div>
                    <div style={styles.field}>
                      <div style={styles.label}>Height (in)</div>
                      <input style={styles.input} type="number" value={exportModal.customSize.height} onChange={(e) => setExportModal((p) => ({ ...p, customSize: { ...p.customSize, height: e.target.value } }))} />
                    </div>
                  </>
                ) : null}
              </div>
              <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
                Export is clickable even without data. Empty results will export a header/template.
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.btnGhost} onClick={() => setExportModal((p) => ({ ...p, open: false }))}>Cancel</button>
              <button style={styles.btnDark} onClick={confirmExportModal}>Export</button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT MODAL */}
      {printModal.open && (
        <div style={{ ...styles.modalBackdrop, zIndex: 3600 }} onClick={() => setPrintModal((p) => ({ ...p, open: false }))}>
          <div style={{ ...styles.modal, position: "relative", zIndex: 3601, width: "min(640px, 100%)" }} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>Print {printModal.scope === "row" ? "Selected Entry" : "TACS Table"}</div>
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
                {printModal.preset === "custom" ? (
                  <>
                    <div style={styles.field}>
                      <div style={styles.label}>Width (in)</div>
                      <input style={styles.input} type="number" value={printModal.customSize.width} onChange={(e) => setPrintModal((p) => ({ ...p, customSize: { ...p.customSize, width: e.target.value } }))} />
                    </div>
                    <div style={styles.field}>
                      <div style={styles.label}>Height (in)</div>
                      <input style={styles.input} type="number" value={printModal.customSize.height} onChange={(e) => setPrintModal((p) => ({ ...p, customSize: { ...p.customSize, height: e.target.value } }))} />
                    </div>
                  </>
                ) : null}
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button style={styles.btnGhost} onClick={() => setPrintModal((p) => ({ ...p, open: false }))}>Cancel</button>
              <button style={styles.btnDark} onClick={confirmPrintModal}>Print</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

