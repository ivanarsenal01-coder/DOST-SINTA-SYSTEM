import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import API_BASE from "../../api";
import { useAuth } from "../../usrmngment/auth/AuthContext";
import { canAccess } from "../../usrmngment/utils/permissions";

const API = API_BASE;
const TARGET_SETTING_PAGE_KEY = "targetSetting";

const cloneRows = (rows) => rows.map((r) => ({ ...r }));

const extractErrorMessage = (err, fallback) => {
  const msg =
    err?.response?.data?.error ||
    err?.response?.data?.message ||
    err?.message ||
    fallback;
  return String(msg);
};

export default function Setup() {
  const { user } = useAuth();
  const canEditTargets = canAccess(user, TARGET_SETTING_PAGE_KEY, "edit");

  const showTargetEditDenied = () => {
    window.alert(
      "Access Denied\n\nYour account does not have permission to edit Target Settings."
    );
  };

  const defaultRows = [
    {
      kpiKey: "interventions",
      kpi: "No. of S&T interventions provided (total)",
      annualTarget: "",
      t1: "",
      t2: "",
      t3: "",
      t4: "",
    },
    {
      kpiKey: "customers",
      kpi: "No. of customers assisted (total)",
      annualTarget: "",
      t1: "",
      t2: "",
      t3: "",
      t4: "",
    },
    {
      kpiKey: "jobs",
      kpi: "No. of Jobs Generated",
      annualTarget: "",
      t1: "",
      t2: "",
      t3: "",
      t4: "",
    },
    {
      kpiKey: "jobsIncreasePct",
      kpi: "% increase in jobs generated",
      annualTarget: "",
      t1: "",
      t2: "",
      t3: "",
      t4: "",
    },
    {
      kpiKey: "productivityPct",
      kpi: "% improvement in productivity",
      annualTarget: "",
      t1: "",
      t2: "",
      t3: "",
      t4: "",
    },
    {
      kpiKey: "grossSales",
      kpi: "Amount of gross sales generated (in Php'000)",
      annualTarget: "",
      t1: "",
      t2: "",
      t3: "",
      t4: "",
    },
  ];

  const defaultCestRows = [
    {
      kpiKey: "communities",
      kpi: "Number of communities assisted",
      annualTarget: "",
      t1: "",
      t2: "",
      t3: "",
      t4: "",
    },
    {
      kpiKey: "technologies",
      kpi: "Number of technologies deployed to communities",
      annualTarget: "",
      t1: "",
      t2: "",
      t3: "",
      t4: "",
    },
    {
      kpiKey: "beneficiaries",
      kpi: "Number of beneficiaries",
      annualTarget: "",
      t1: "",
      t2: "",
      t3: "",
      t4: "",
    },
    {
      kpiKey: "interventions",
      kpi: "Number of S&T Intervention",
      annualTarget: "",
      t1: "",
      t2: "",
      t3: "",
      t4: "",
    },
    {
      kpiKey: "technologiesPromoted",
      kpi: "No. of technologies promoted (total)",
      annualTarget: "",
      t1: "",
      t2: "",
      t3: "",
      t4: "",
    },
    {
      kpiKey: "promotionalActivitiesPressRelease",
      kpi: "No. of S&T promotional activities conducted (total) press release - City/Municipal Level",
      annualTarget: "",
      t1: "",
      t2: "",
      t3: "",
      t4: "",
    },
  ];

  const defaultSscpRows = [
    {
      kpiKey: "smartCitiesEstablished",
      kpi: "No. of smart cities established",
      annualTarget: "",
      t1: "",
      t2: "",
      t3: "",
      t4: "",
    },
    {
      kpiKey: "communitiesLgusAssisted",
      kpi: "No. of communities / LGUs assisted",
      annualTarget: "",
      t1: "",
      t2: "",
      t3: "",
      t4: "",
    },
    {
      kpiKey: "technologiesPromoted",
      kpi: "No. of technologies promoted",
      annualTarget: "",
      t1: "",
      t2: "",
      t3: "",
      t4: "",
    },
    {
      kpiKey: "technologiesAdopted",
      kpi: "No. of technologies adopted",
      annualTarget: "",
      t1: "",
      t2: "",
      t3: "",
      t4: "",
    },
    {
      kpiKey: "mouMoa",
      kpi: "No. of MOU / MOA",
      annualTarget: "",
      t1: "",
      t2: "",
      t3: "",
      t4: "",
    },
  ];

  const defaultDrrmRows = [
    {
      kpiKey: "drrmMainMeasures",
      kpi: "No. of measures on disaster risk reduction and mitigation implemented / sector-specific learning and development interventions conducted",
      annualTarget: "",
      t1: "",
      t2: "",
      t3: "",
      t4: "",
    },
    {
      kpiKey: "drrmActivities",
      kpi: "a. Activities",
      annualTarget: "",
      t1: "",
      t2: "",
      t3: "",
      t4: "",
    },
    {
      kpiKey: "drrmIecMaterials",
      kpi: "b. IEC materials (unique titles used)",
      annualTarget: "",
      t1: "",
      t2: "",
      t3: "",
      t4: "",
    },
    {
      kpiKey: "drrmCollaborations",
      kpi: "No. of DRRM-related collaborations with stakeholders",
      annualTarget: "",
      t1: "",
      t2: "",
      t3: "",
      t4: "",
    },
  ];

  const defaultTacsRows = [
    {
      kpiKey: "customersAssisted",
      kpi: "No. of customers assisted (total)",
      annualTarget: "",
      t1: "",
      t2: "",
      t3: "",
      t4: "",
    },
    {
      kpiKey: "adviceRecommendations",
      kpi: "No. of advice/recommendations (total)",
      annualTarget: "",
      t1: "",
      t2: "",
      t3: "",
      t4: "",
    },
  ];

  const defaultTechPromoRows = [
    {
      kpiKey: "technologiesPromoted",
      kpi: "No. of technologies promoted (total)",
      annualTarget: "",
      t1: "",
      t2: "",
      t3: "",
      t4: "",
    },
    {
      kpiKey: "promotionalActivities",
      kpi: "No. of S&T promotional activities conducted (total)",
      annualTarget: "",
      t1: "",
      t2: "",
      t3: "",
      t4: "",
    },
  ];

  const defaultTechTrainingRows = [
    {
      kpiKey: "trainingsConducted",
      kpi: "No. of trainings / seminars conducted",
      annualTarget: "",
      t1: "",
      t2: "",
      t3: "",
      t4: "",
    },
    {
      kpiKey: "participantsReached",
      kpi: "No. of participants reached",
      annualTarget: "",
      t1: "",
      t2: "",
      t3: "",
      t4: "",
    },
  ];

  const defaultTechRolloutRows = [
    {
      kpiKey: "kpi2TotalTransferred",
      kpi: "No. of knowledge/technologies transferred by commercialization, extension, public good",
      annualTarget: "",
      t1: "",
      t2: "",
      t3: "",
      t4: "",
    },
    {
      kpiKey: "kpi2DostTransferred",
      kpi: "No. of DOST-developed/funded knowledge/technologies transferred by commercialization, extension, public good",
      annualTarget: "",
      t1: "",
      t2: "",
      t3: "",
      t4: "",
    },
    {
      kpiKey: "kpi3TotalAdopters",
      kpi: "Total No. of technology adopters",
      annualTarget: "",
      t1: "",
      t2: "",
      t3: "",
      t4: "",
    },
    {
      kpiKey: "kpi3DostAdopters",
      kpi: "Total No. of technology adopters for DOST-developed/funded knowledge/technologies",
      annualTarget: "",
      t1: "",
      t2: "",
      t3: "",
      t4: "",
    },
  ];

  const defaultCalibrationRows = [
    {
      kpiKey: "totalCalibratedMC",
      kpi: "Total Calibrated (MC) No. of Samples",
      annualTarget: "",
      t1: "",
      t2: "",
      t3: "",
      t4: "",
    },
    {
      kpiKey: "totalCalibratedVC",
      kpi: "Total Calibrated (VC) No. of Samples",
      annualTarget: "",
      t1: "",
      t2: "",
      t3: "",
      t4: "",
    },
    {
      kpiKey: "totalIncomeGenerated",
      kpi: "Total Income Generated (Paying)",
      annualTarget: "",
      t1: "",
      t2: "",
      t3: "",
      t4: "",
    },
    {
      kpiKey: "totalAmountAssistance",
      kpi: "Total Amount of Assistance (Non-Paying)",
      annualTarget: "",
      t1: "",
      t2: "",
      t3: "",
      t4: "",
    },
    {
      kpiKey: "totalCustomersAll",
      kpi: "Total Customers",
      annualTarget: "",
      t1: "",
      t2: "",
      t3: "",
      t4: "",
    },
  ];

  const defaultStPromoRows = [
    {
      kpiKey: "peopleReachedSocialMedia",
      kpi: "KPI No. 1: No. of Reach (People Reached) of IEC Materials and Information on Social Media",
      annualTarget: "",
      t1: "",
      t2: "",
      t3: "",
      t4: "",
    },
    {
      kpiKey: "promotionalActivitiesOnsite",
      kpi: "KPI No. 2: Total No. of S&T Promotional Activities Conducted (Onsite)",
      annualTarget: "",
      t1: "",
      t2: "",
      t3: "",
      t4: "",
    },
    {
      kpiKey: "engagements",
      kpi: "KPI No. 3: No. of Engagements",
      annualTarget: "",
      t1: "",
      t2: "",
      t3: "",
      t4: "",
    },
  ];

  const defaultPackagingLabelingRows = [
    {
      kpiKey: "trainingsConducted",
      kpi: "No. of trainings / seminars conducted",
      annualTarget: "",
      t1: "",
      t2: "",
      t3: "",
      t4: "",
    },
    {
      kpiKey: "firmsAssisted",
      kpi: "No. of firms assisted",
      annualTarget: "",
      t1: "",
      t2: "",
      t3: "",
      t4: "",
    },
  ];

  const [rows, setRows] = useState(cloneRows(defaultRows));
  const [cestRows, setCestRows] = useState(cloneRows(defaultCestRows));
  const [sscpRows, setSscpRows] = useState(cloneRows(defaultSscpRows));
  const [drrmRows, setDrrmRows] = useState(cloneRows(defaultDrrmRows));
  const [tacsRows, setTacsRows] = useState(cloneRows(defaultTacsRows));
  const [techPromoRows, setTechPromoRows] = useState(cloneRows(defaultTechPromoRows));
  const [techTrainingRows, setTechTrainingRows] = useState(cloneRows(defaultTechTrainingRows));
  const [techRolloutRows, setTechRolloutRows] = useState(cloneRows(defaultTechRolloutRows));
  const [packagingLabelingRows, setPackagingLabelingRows] = useState(
    cloneRows(defaultPackagingLabelingRows)
  );
  const [calibrationRows, setCalibrationRows] = useState(
    cloneRows(defaultCalibrationRows)
  );
  const [stPromoRows, setStPromoRows] = useState(cloneRows(defaultStPromoRows));

  const [saveStatus, setSaveStatus] = useState("");
  const [cestSaveStatus, setCestSaveStatus] = useState("");
  const [sscpSaveStatus, setSscpSaveStatus] = useState("");
  const [drrmSaveStatus, setDrrmSaveStatus] = useState("");
  const [tacsSaveStatus, setTacsSaveStatus] = useState("");
  const [techPromoSaveStatus, setTechPromoSaveStatus] = useState("");
  const [techTrainingSaveStatus, setTechTrainingSaveStatus] = useState("");
  const [techRolloutSaveStatus, setTechRolloutSaveStatus] = useState("");
  const [packagingLabelingSaveStatus, setPackagingLabelingSaveStatus] = useState("");
  const [calibrationSaveStatus, setCalibrationSaveStatus] = useState("");
  const [stPromoSaveStatus, setStPromoSaveStatus] = useState("");

  const currentYear = new Date().getFullYear();
  const [targetYear, setTargetYear] = useState(currentYear);
  const [globalStatus, setGlobalStatus] = useState("");

  const [yearPickerOpen, setYearPickerOpen] = useState(false);
  const [yearDraft, setYearDraft] = useState(String(currentYear));

  const normalizeYear = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return currentYear;
    return Math.trunc(n);
  };

  const YEAR_PICKER_MIN = 1;
  const YEAR_PICKER_MAX = 9999;
  const yearPickerYears = Array.from(
    { length: YEAR_PICKER_MAX - YEAR_PICKER_MIN + 1 },
    (_, i) => YEAR_PICKER_MIN + i
  );

  const toNumber = (v) => {
    if (v === "" || v === null || v === undefined) return 0;
    const n = Number(String(v).replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const isPercentRow = (kpi) =>
    kpi === "% increase in jobs generated" ||
    kpi === "% improvement in productivity";

  const quarterlyTotal = (r) =>
    toNumber(r.t1) + toNumber(r.t2) + toNumber(r.t3) + toNumber(r.t4);

  const normalizeRows = (defaults, loadedRows = []) => {
    const map = new Map(
      (loadedRows || []).map((r) => [r.kpiKey || r.kpi_key, r])
    );

    return defaults.map((d) => {
      const found = map.get(d.kpiKey);
      if (!found) return { ...d };

      const annualValue = found.annualTarget ?? found.annual_target;
      const q1Value = found.t1 ?? found.q1_target;
      const q2Value = found.t2 ?? found.q2_target;
      const q3Value = found.t3 ?? found.q3_target;
      const q4Value = found.t4 ?? found.q4_target;

      const merged = {
        ...d,
        ...found,
        annualTarget:
          annualValue === null || annualValue === undefined
            ? ""
            : String(annualValue),
        t1: q1Value === null || q1Value === undefined ? "" : String(q1Value),
        t2: q2Value === null || q2Value === undefined ? "" : String(q2Value),
        t3: q3Value === null || q3Value === undefined ? "" : String(q3Value),
        t4: q4Value === null || q4Value === undefined ? "" : String(q4Value),
      };

      const total = quarterlyTotal(merged);
      const allBlank = ["t1", "t2", "t3", "t4"].every((k) => merged[k] === "");
      merged.annualTarget = allBlank ? "" : String(total);

      return merged;
    });
  };

  const loadTargetSettings = async (
    moduleName,
    defaults,
    setter,
    setStatus = null,
    year = targetYear
  ) => {
    try {
      const res = await axios.get(
        `${API}/target-settings/${encodeURIComponent(moduleName)}?year=${encodeURIComponent(year)}`
      );
      setter(normalizeRows(defaults, res.data || []));
      if (setStatus) {
        setStatus(`✅ Loaded ${year}`);
        setTimeout(() => setStatus(""), 2000);
      }
    } catch (err) {
      console.error(`Load failed for ${moduleName}:`, err);
      setter(cloneRows(defaults));
      if (setStatus) {
        setStatus(`❌ ${extractErrorMessage(err, "Load failed")}`);
        setTimeout(() => setStatus(""), 3500);
      }
    }
  };

  const buildRowsPayload = (moduleName, rowsData, year = targetYear) => {
    return rowsData.map((r) => ({
      moduleName,
      module_name: moduleName,
      targetYear: Number(year),
      target_year: Number(year),
      year: Number(year),
      kpiKey: r.kpiKey,
      kpi_key: r.kpiKey,
      kpiLabel: r.kpi,
      kpi_label: r.kpi,
      annualTarget: toNumber(r.annualTarget),
      annual_target: toNumber(r.annualTarget),
      t1: toNumber(r.t1),
      t2: toNumber(r.t2),
      t3: toNumber(r.t3),
      t4: toNumber(r.t4),
      q1_target: toNumber(r.t1),
      q2_target: toNumber(r.t2),
      q3_target: toNumber(r.t3),
      q4_target: toNumber(r.t4),
    }));
  };

  const saveTargetSettings = async (
    moduleName,
    rowsData,
    defaults,
    setter,
    setStatus,
    year = targetYear
  ) => {
    if (!canEditTargets) {
      showTargetEditDenied();
      if (setStatus) {
        setStatus("❌ Edit permission required.");
        setTimeout(() => setStatus(""), 3000);
      }
      return;
    }

    try {
      const payloadRows = buildRowsPayload(moduleName, rowsData, year);

      await axios.put(
        `${API}/target-settings/${encodeURIComponent(moduleName)}?year=${encodeURIComponent(year)}`,
        {
          moduleName,
          module_name: moduleName,
          targetYear: Number(year),
          target_year: Number(year),
          year: Number(year),
          rows: payloadRows,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      await loadTargetSettings(moduleName, defaults, setter, null, year);
      setStatus(`✅ Saved and reloaded ${year}`);
      setTimeout(() => setStatus(""), 2500);
    } catch (err) {
      console.error(`Save failed for ${moduleName}:`, err);
      setStatus(`❌ ${extractErrorMessage(err, "Save failed")}`);
      setTimeout(() => setStatus(""), 4000);
    }
  };

  const clearTargetSettings = async (
    moduleName,
    defaults,
    setter,
    setStatus,
    year = targetYear
  ) => {
    if (!canEditTargets) {
      showTargetEditDenied();
      if (setStatus) {
        setStatus("❌ Edit permission required.");
        setTimeout(() => setStatus(""), 3000);
      }
      return;
    }

    try {
      await axios.put(
        `${API}/target-settings/${encodeURIComponent(moduleName)}?year=${encodeURIComponent(year)}`,
        {
          moduleName,
          module_name: moduleName,
          targetYear: Number(year),
          target_year: Number(year),
          year: Number(year),
          rows: [],
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      await loadTargetSettings(moduleName, defaults, setter, null, year);
      setStatus(`🧹 Cleared and reloaded ${year}`);
      setTimeout(() => setStatus(""), 2500);
    } catch (err) {
      console.error(`Clear failed for ${moduleName}:`, err);
      setStatus(`❌ ${extractErrorMessage(err, "Clear failed")}`);
      setTimeout(() => setStatus(""), 4000);
    }
  };

  useEffect(() => {
    setGlobalStatus(`Loading target settings for ${targetYear}...`);

    loadTargetSettings("setup", defaultRows, setRows, null, targetYear);
    loadTargetSettings("cest", defaultCestRows, setCestRows, null, targetYear);
    loadTargetSettings("sscp", defaultSscpRows, setSscpRows, null, targetYear);
    loadTargetSettings("drrm", defaultDrrmRows, setDrrmRows, null, targetYear);
    loadTargetSettings("tacs", defaultTacsRows, setTacsRows, null, targetYear);
    loadTargetSettings(
      "technology_promotion",
      defaultTechPromoRows,
      setTechPromoRows,
      null,
      targetYear
    );
    loadTargetSettings(
      "technology_training",
      defaultTechTrainingRows,
      setTechTrainingRows,
      null,
      targetYear
    );
    loadTargetSettings(
      "technology_rollout",
      defaultTechRolloutRows,
      setTechRolloutRows,
      null,
      targetYear
    );
    loadTargetSettings(
      "packaging_and_labeling",
      defaultPackagingLabelingRows,
      setPackagingLabelingRows,
      null,
      targetYear
    );
    loadTargetSettings(
      "calibration",
      defaultCalibrationRows,
      setCalibrationRows,
      null,
      targetYear
    );
    loadTargetSettings("st_promo", defaultStPromoRows, setStPromoRows, null, targetYear);

    setGlobalStatus(`Showing target settings for ${targetYear}`);
    setTimeout(() => setGlobalStatus(""), 2500);
  }, [targetYear]);

  const updateCellFactory = (setter) => (idx, key, value) => {
    if (!canEditTargets) {
      showTargetEditDenied();
      return;
    }

    setter((prev) => {
      const next = [...prev];
      const updated = { ...next[idx], [key]: value };

      const total = quarterlyTotal(updated);
      const allBlank = ["t1", "t2", "t3", "t4"].every((k) => updated[k] === "");
      updated.annualTarget = allBlank ? "" : String(total);

      next[idx] = updated;
      return next;
    });
  };

  const updateCell = updateCellFactory(setRows);
  const updateCestCell = updateCellFactory(setCestRows);
  const updateSscpCell = updateCellFactory(setSscpRows);
  const updateDrrmCell = updateCellFactory(setDrrmRows);
  const updateTacsCell = updateCellFactory(setTacsRows);
  const updateTechPromoCell = updateCellFactory(setTechPromoRows);
  const updateTechTrainingCell = updateCellFactory(setTechTrainingRows);
  const updateTechRolloutCell = updateCellFactory(setTechRolloutRows);
  const updatePackagingLabelingCell = updateCellFactory(setPackagingLabelingRows);
  const updateCalibrationCell = updateCellFactory(setCalibrationRows);
  const updateStPromoCell = updateCellFactory(setStPromoRows);

  const handleSave = () =>
    saveTargetSettings("setup", rows, defaultRows, setRows, setSaveStatus);
  const handleLoad = () =>
    loadTargetSettings("setup", defaultRows, setRows, setSaveStatus);
  const handleClear = () =>
    clearTargetSettings("setup", defaultRows, setRows, setSaveStatus);

  const handleCestSave = () =>
    saveTargetSettings("cest", cestRows, defaultCestRows, setCestRows, setCestSaveStatus);
  const handleCestLoad = () =>
    loadTargetSettings("cest", defaultCestRows, setCestRows, setCestSaveStatus);
  const handleCestClear = () =>
    clearTargetSettings("cest", defaultCestRows, setCestRows, setCestSaveStatus);

  const handleSscpSave = () =>
    saveTargetSettings("sscp", sscpRows, defaultSscpRows, setSscpRows, setSscpSaveStatus);
  const handleSscpLoad = () =>
    loadTargetSettings("sscp", defaultSscpRows, setSscpRows, setSscpSaveStatus);
  const handleSscpClear = () =>
    clearTargetSettings("sscp", defaultSscpRows, setSscpRows, setSscpSaveStatus);

  const handleDrrmSave = () =>
    saveTargetSettings("drrm", drrmRows, defaultDrrmRows, setDrrmRows, setDrrmSaveStatus);
  const handleDrrmLoad = () =>
    loadTargetSettings("drrm", defaultDrrmRows, setDrrmRows, setDrrmSaveStatus);
  const handleDrrmClear = () =>
    clearTargetSettings("drrm", defaultDrrmRows, setDrrmRows, setDrrmSaveStatus);

  const handleTacsSave = () =>
    saveTargetSettings("tacs", tacsRows, defaultTacsRows, setTacsRows, setTacsSaveStatus);
  const handleTacsLoad = () =>
    loadTargetSettings("tacs", defaultTacsRows, setTacsRows, setTacsSaveStatus);
  const handleTacsClear = () =>
    clearTargetSettings("tacs", defaultTacsRows, setTacsRows, setTacsSaveStatus);

  const handleTechPromoSave = () =>
    saveTargetSettings(
      "technology_promotion",
      techPromoRows,
      defaultTechPromoRows,
      setTechPromoRows,
      setTechPromoSaveStatus
    );
  const handleTechPromoLoad = () =>
    loadTargetSettings(
      "technology_promotion",
      defaultTechPromoRows,
      setTechPromoRows,
      setTechPromoSaveStatus
    );
  const handleTechPromoClear = () =>
    clearTargetSettings(
      "technology_promotion",
      defaultTechPromoRows,
      setTechPromoRows,
      setTechPromoSaveStatus
    );

  const handleTechTrainingSave = () =>
    saveTargetSettings(
      "technology_training",
      techTrainingRows,
      defaultTechTrainingRows,
      setTechTrainingRows,
      setTechTrainingSaveStatus
    );
  const handleTechTrainingLoad = () =>
    loadTargetSettings(
      "technology_training",
      defaultTechTrainingRows,
      setTechTrainingRows,
      setTechTrainingSaveStatus
    );
  const handleTechTrainingClear = () =>
    clearTargetSettings(
      "technology_training",
      defaultTechTrainingRows,
      setTechTrainingRows,
      setTechTrainingSaveStatus
    );

  const handleTechRolloutSave = () =>
    saveTargetSettings(
      "technology_rollout",
      techRolloutRows,
      defaultTechRolloutRows,
      setTechRolloutRows,
      setTechRolloutSaveStatus
    );
  const handleTechRolloutLoad = () =>
    loadTargetSettings(
      "technology_rollout",
      defaultTechRolloutRows,
      setTechRolloutRows,
      setTechRolloutSaveStatus
    );
  const handleTechRolloutClear = () =>
    clearTargetSettings(
      "technology_rollout",
      defaultTechRolloutRows,
      setTechRolloutRows,
      setTechRolloutSaveStatus
    );

  const handlePackagingLabelingSave = () =>
    saveTargetSettings(
      "packaging_and_labeling",
      packagingLabelingRows,
      defaultPackagingLabelingRows,
      setPackagingLabelingRows,
      setPackagingLabelingSaveStatus
    );
  const handlePackagingLabelingLoad = () =>
    loadTargetSettings(
      "packaging_and_labeling",
      defaultPackagingLabelingRows,
      setPackagingLabelingRows,
      setPackagingLabelingSaveStatus
    );
  const handlePackagingLabelingClear = () =>
    clearTargetSettings(
      "packaging_and_labeling",
      defaultPackagingLabelingRows,
      setPackagingLabelingRows,
      setPackagingLabelingSaveStatus
    );

  const handleCalibrationSave = () =>
    saveTargetSettings(
      "calibration",
      calibrationRows,
      defaultCalibrationRows,
      setCalibrationRows,
      setCalibrationSaveStatus
    );
  const handleCalibrationLoad = () =>
    loadTargetSettings(
      "calibration",
      defaultCalibrationRows,
      setCalibrationRows,
      setCalibrationSaveStatus
    );
  const handleCalibrationClear = () =>
    clearTargetSettings(
      "calibration",
      defaultCalibrationRows,
      setCalibrationRows,
      setCalibrationSaveStatus
    );

  const handleStPromoSave = () =>
    saveTargetSettings(
      "st_promo",
      stPromoRows,
      defaultStPromoRows,
      setStPromoRows,
      setStPromoSaveStatus
    );
  const handleStPromoLoad = () =>
    loadTargetSettings(
      "st_promo",
      defaultStPromoRows,
      setStPromoRows,
      setStPromoSaveStatus
    );
  const handleStPromoClear = () =>
    clearTargetSettings(
      "st_promo",
      defaultStPromoRows,
      setStPromoRows,
      setStPromoSaveStatus
    );

  const targetModules = [
    { key: "setup", label: "SETUP", rowsData: rows, defaults: defaultRows, setter: setRows, statusSetter: setSaveStatus },
    { key: "cest", label: "CEST", rowsData: cestRows, defaults: defaultCestRows, setter: setCestRows, statusSetter: setCestSaveStatus },
    { key: "sscp", label: "SSCP", rowsData: sscpRows, defaults: defaultSscpRows, setter: setSscpRows, statusSetter: setSscpSaveStatus },
    { key: "drrm", label: "DRRM", rowsData: drrmRows, defaults: defaultDrrmRows, setter: setDrrmRows, statusSetter: setDrrmSaveStatus },
    { key: "tacs", label: "TACS", rowsData: tacsRows, defaults: defaultTacsRows, setter: setTacsRows, statusSetter: setTacsSaveStatus },
    { key: "technology_promotion", label: "TECHNOLOGY PROMOTION", rowsData: techPromoRows, defaults: defaultTechPromoRows, setter: setTechPromoRows, statusSetter: setTechPromoSaveStatus },
    { key: "technology_training", label: "TECHNOLOGY TRAINING", rowsData: techTrainingRows, defaults: defaultTechTrainingRows, setter: setTechTrainingRows, statusSetter: setTechTrainingSaveStatus },
    { key: "technology_rollout", label: "TECHNOLOGY ROLL OUT", rowsData: techRolloutRows, defaults: defaultTechRolloutRows, setter: setTechRolloutRows, statusSetter: setTechRolloutSaveStatus },
    { key: "packaging_and_labeling", label: "PACKAGING AND LABELING", rowsData: packagingLabelingRows, defaults: defaultPackagingLabelingRows, setter: setPackagingLabelingRows, statusSetter: setPackagingLabelingSaveStatus },
    { key: "calibration", label: "CALIBRATION", rowsData: calibrationRows, defaults: defaultCalibrationRows, setter: setCalibrationRows, statusSetter: setCalibrationSaveStatus },
    { key: "st_promo", label: "S&T PROMO", rowsData: stPromoRows, defaults: defaultStPromoRows, setter: setStPromoRows, statusSetter: setStPromoSaveStatus },
  ];

  const loadAllTargets = async () => {
    setGlobalStatus(`Loading all target settings for ${targetYear}...`);
    for (const m of targetModules) {
      await loadTargetSettings(m.key, m.defaults, m.setter, m.statusSetter, targetYear);
    }
    setGlobalStatus(`✅ Loaded all targets for ${targetYear}`);
    setTimeout(() => setGlobalStatus(""), 3000);
  };

  const saveAllTargets = async () => {
    if (!canEditTargets) {
      showTargetEditDenied();
      setGlobalStatus("❌ Edit permission required.");
      setTimeout(() => setGlobalStatus(""), 3000);
      return;
    }

    setGlobalStatus(`Saving all target settings for ${targetYear}...`);
    for (const m of targetModules) {
      await saveTargetSettings(m.key, m.rowsData, m.defaults, m.setter, m.statusSetter, targetYear);
    }
    setGlobalStatus(`✅ Saved all targets for ${targetYear}`);
    setTimeout(() => setGlobalStatus(""), 3000);
  };

  const clearCurrentYearTargets = async () => {
    if (!canEditTargets) {
      showTargetEditDenied();
      setGlobalStatus("❌ Edit permission required.");
      setTimeout(() => setGlobalStatus(""), 3000);
      return;
    }

    const ok = window.confirm(`Clear all target settings for ${targetYear}?`);
    if (!ok) return;

    setGlobalStatus(`Clearing all target settings for ${targetYear}...`);
    for (const m of targetModules) {
      await clearTargetSettings(m.key, m.defaults, m.setter, m.statusSetter, targetYear);
    }
    setGlobalStatus(`🧹 Cleared all targets for ${targetYear}`);
    setTimeout(() => setGlobalStatus(""), 3000);
  };

  const copyPreviousYearTargets = async () => {
    if (!canEditTargets) {
      showTargetEditDenied();
      setGlobalStatus("❌ Edit permission required.");
      setTimeout(() => setGlobalStatus(""), 3000);
      return;
    }

    const previousYear = Number(targetYear) - 1;
    const ok = window.confirm(`Copy ${previousYear} targets into ${targetYear}? This will only fill the page. Click Save All after reviewing.`);
    if (!ok) return;

    setGlobalStatus(`Copying targets from ${previousYear} to ${targetYear}...`);
    for (const m of targetModules) {
      const res = await axios.get(
        `${API}/target-settings/${encodeURIComponent(m.key)}?year=${encodeURIComponent(previousYear)}`
      );
      m.setter(normalizeRows(m.defaults, res.data || []));
      m.statusSetter(`Copied from ${previousYear}. Review then Save ${targetYear}.`);
    }
    setGlobalStatus(`✅ Copied ${previousYear} targets. Review values, then click Save All for ${targetYear}.`);
  };

  const styles = {
    page: { padding: 16 },
    titleBar: {
      background: "#2f6fd6",
      color: "#fff",
      fontWeight: 800,
      padding: "12px 16px",
      letterSpacing: 1,
      fontSize: 22,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      flexWrap: "wrap",
    },
    btnRow: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },
    btn: {
      border: "1px solid rgba(255,255,255,0.6)",
      background: "rgba(255,255,255,0.12)",
      color: "#fff",
      padding: "7px 10px",
      borderRadius: 8,
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 700,
    },
    status: { fontSize: 12, fontWeight: 700, opacity: 0.95, maxWidth: 420 },
    tableWrap: { marginTop: 10, overflowX: "auto" },
    table: { width: "100%", borderCollapse: "collapse", minWidth: 900 },
    th: {
      border: "2px solid #6b7280",
      padding: 8,
      background: "#eef2f6",
      fontSize: 12,
      textAlign: "center",
    },
    td: { border: "2px solid #6b7280", padding: 8, fontSize: 12 },
    tdCenter: {
      border: "2px solid #6b7280",
      padding: 6,
      fontSize: 12,
      textAlign: "center",
    },
    green: { background: "#dff3df" },
    input: {
      width: "100%",
      padding: "6px 8px",
      fontSize: 12,
      border: "1px solid #c7ced7",
      borderRadius: 6,
      outline: "none",
      boxSizing: "border-box",
      textAlign: "center",
    },
    inputReadonly: {
      width: "100%",
      padding: "6px 8px",
      fontSize: 12,
      border: "1px solid #c7ced7",
      borderRadius: 6,
      outline: "none",
      boxSizing: "border-box",
      textAlign: "center",
      background: "#f3f4f6",
      fontWeight: 800,
    },
    globalPanel: {
      background: "#ffffff",
      border: "1px solid #d1d5db",
      borderRadius: 14,
      padding: 16,
      marginBottom: 18,
      boxShadow: "0 8px 20px rgba(15, 23, 42, 0.08)",
    },
    globalHeader: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      flexWrap: "wrap",
      marginBottom: 12,
    },
    globalTitle: { fontSize: 22, fontWeight: 900, color: "#1e3a8a" },
    globalSub: { fontSize: 12, color: "#64748b", marginTop: 4 },
    filterRow: { display: "flex", gap: 10, alignItems: "end", flexWrap: "wrap" },
    fieldGroup: { display: "flex", flexDirection: "column", gap: 5 },
    label: { fontSize: 11, fontWeight: 800, color: "#475569", textTransform: "uppercase" },
    select: {
      padding: "8px 10px",
      border: "1px solid #cbd5e1",
      borderRadius: 8,
      fontWeight: 800,
      minWidth: 130,
      background: "#fff",
    },
    yearPickerWrap: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
      position: "relative",
    },
    yearInputWrap: {
      position: "relative",
      display: "flex",
      alignItems: "center",
    },
    yearInput: {
      width: 132,
      padding: "10px 38px 10px 12px",
      border: "1px solid #cbd5e1",
      borderRadius: 10,
      fontSize: 18,
      fontWeight: 900,
      textAlign: "center",
      outline: "none",
      background: "#fff",
      boxSizing: "border-box",
    },
    yearDropBtn: {
      position: "absolute",
      right: 6,
      top: "50%",
      transform: "translateY(-50%)",
      border: "none",
      background: "transparent",
      cursor: "pointer",
      fontSize: 16,
      fontWeight: 900,
      color: "#475569",
      padding: "4px 6px",
    },
    yearPopup: {
      position: "absolute",
      top: "calc(100% + 6px)",
      left: 0,
      width: 160,
      maxHeight: 280,
      overflowY: "auto",
      background: "#fff",
      border: "1px solid #94a3b8",
      borderRadius: 10,
      boxShadow: "0 14px 28px rgba(15, 23, 42, 0.18)",
      zIndex: 99999,
      padding: 6,
    },
    yearPopupHeader: {
      position: "sticky",
      top: 0,
      zIndex: 2,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 8,
      padding: "6px 6px 8px",
      background: "#fff",
      borderBottom: "1px solid #e2e8f0",
      marginBottom: 6,
    },
    yearPopupTitle: {
      fontSize: 12,
      fontWeight: 900,
      color: "#0f172a",
    },
    yearPopupCloseBtn: {
      width: 26,
      height: 26,
      border: "1px solid #cbd5e1",
      background: "#f8fafc",
      color: "#334155",
      borderRadius: 8,
      cursor: "pointer",
      fontSize: 14,
      fontWeight: 900,
      lineHeight: 1,
    },
    yearOption: {
      width: "100%",
      display: "block",
      border: "none",
      background: "transparent",
      padding: "8px 10px",
      textAlign: "left",
      cursor: "pointer",
      borderRadius: 8,
      fontWeight: 800,
      fontSize: 13,
      color: "#0f172a",
    },
    yearOptionActive: {
      background: "#2563eb",
      color: "#fff",
    },
    yearStepBtn: {
      border: "1px solid #cbd5e1",
      background: "#fff",
      color: "#1f2937",
      padding: "10px 12px",
      borderRadius: 10,
      cursor: "pointer",
      fontSize: 14,
      fontWeight: 900,
    },
    currentYearBtn: {
      border: "1px solid #cbd5e1",
      background: "#f8fafc",
      color: "#0f172a",
      padding: "10px 12px",
      borderRadius: 10,
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 900,
    },
    globalBtn: {
      border: "1px solid #1d4ed8",
      background: "#2563eb",
      color: "#fff",
      padding: "9px 12px",
      borderRadius: 8,
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 800,
    },
    globalBtnLight: {
      border: "1px solid #cbd5e1",
      background: "#f8fafc",
      color: "#0f172a",
      padding: "9px 12px",
      borderRadius: 8,
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 800,
    },
    globalBtnDanger: {
      border: "1px solid #dc2626",
      background: "#fee2e2",
      color: "#991b1b",
      padding: "9px 12px",
      borderRadius: 8,
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 800,
    },
    yearBadge: {
      background: "#dbeafe",
      color: "#1e40af",
      padding: "4px 8px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 900,
    },
    yearModalBackdrop: {
      position: "fixed",
      inset: 0,
      background: "rgba(15, 23, 42, 0.42)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      zIndex: 999999,
    },
    yearModal: {
      width: "min(440px, 100%)",
      maxHeight: "min(680px, 90vh)",
      background: "#fff",
      borderRadius: 14,
      overflow: "hidden",
      boxShadow: "0 18px 45px rgba(15, 23, 42, 0.28)",
      border: "1px solid #cbd5e1",
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
    yearModalList: {
      maxHeight: 390,
      overflowY: "auto",
      border: "1px solid #e2e8f0",
      borderRadius: 12,
      padding: 8,
      background: "#f8fafc",
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
    sectionGap: {
      marginTop: 28,
    },
  };

  const YearPicker = () => {
    const safeYear = normalizeYear(targetYear);
    const selectedYearRef = useRef(null);

    useEffect(() => {
      if (!yearPickerOpen) return;
      setYearDraft(String(safeYear));
      setTimeout(() => {
        selectedYearRef.current?.scrollIntoView({ block: "center", behavior: "auto" });
      }, 0);
    }, [yearPickerOpen, safeYear]);

    const applyDraftYear = () => {
      const year = normalizeYear(yearDraft);
      setTargetYear(year);
      setYearPickerOpen(false);
    };

    return (
      <div style={styles.yearPickerWrap}>
        <button
          type="button"
          style={styles.yearStepBtn}
          onClick={() => setTargetYear((prev) => normalizeYear(prev) - 1)}
          title="Previous year"
        >
          ◀
        </button>

        <button
          type="button"
          style={{ ...styles.yearInput, cursor: "pointer" }}
          onClick={() => setYearPickerOpen(true)}
          title="Open year picker"
        >
          {targetYear} ▾
        </button>

        <button
          type="button"
          style={styles.yearStepBtn}
          onClick={() => setTargetYear((prev) => normalizeYear(prev) + 1)}
          title="Next year"
        >
          ▶
        </button>

        <button
          type="button"
          style={styles.currentYearBtn}
          onClick={() => {
            setTargetYear(currentYear);
            setYearPickerOpen(false);
          }}
        >
          Current Year
        </button>

        {yearPickerOpen ? (
          <div style={styles.yearModalBackdrop} onMouseDown={() => setYearPickerOpen(false)}>
            <div style={styles.yearModal} onMouseDown={(e) => e.stopPropagation()}>
              <div style={styles.yearModalHeader}>
                <div>
                  <div>Select Year</div>
                  <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 800 }}>
                    Scroll or type any year
                  </div>
                </div>
                <button
                  type="button"
                  style={styles.yearModalClose}
                  onClick={() => setYearPickerOpen(false)}
                >
                  ✕
                </button>
              </div>

              <div style={styles.yearModalBody}>
                <div style={styles.yearModalInputRow}>
                  <input
                    type="number"
                    inputMode="numeric"
                    style={styles.yearModalInput}
                    value={yearDraft}
                    onChange={(e) => setYearDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") applyDraftYear();
                      if (e.key === "Escape") setYearPickerOpen(false);
                    }}
                    placeholder="Type year"
                    autoFocus
                  />
                  <button type="button" style={styles.globalBtn} onClick={applyDraftYear}>
                    Apply
                  </button>
                </div>

                <div style={styles.yearModalList}>
                  {yearPickerYears.map((y) => {
                    const active = Number(y) === Number(safeYear);
                    return (
                      <button
                        type="button"
                        key={y}
                        ref={active ? selectedYearRef : null}
                        style={{
                          ...styles.yearModalOption,
                          ...(active ? styles.yearModalOptionActive : null),
                        }}
                        onClick={() => {
                          setTargetYear(y);
                          setYearPickerOpen(false);
                        }}
                      >
                        {y}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  const renderTable = ({
    title,
    rowsData,
    onChange,
    onSave,
    onLoad,
    onClear,
    status,
  }) => (
    <div style={styles.sectionGap}>
      <div style={styles.titleBar}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span>{title}</span>
          <span style={styles.yearBadge}>Target Year: {targetYear}</span>
        </div>

        <div style={styles.btnRow}>
          {canEditTargets ? (
            <button style={styles.btn} onClick={onSave}>
              Save {targetYear}
            </button>
          ) : null}

          <button style={styles.btn} onClick={onLoad}>
            Load {targetYear}
          </button>

          {canEditTargets ? (
            <button style={styles.btn} onClick={onClear}>
              Clear {targetYear}
            </button>
          ) : null}

          {status ? <span style={styles.status}>{status}</span> : null}
        </div>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th} rowSpan={2}>
                KEY PERFORMANCE INDICATORS
              </th>
              <th style={styles.th} rowSpan={2}>
                ANNUAL TARGET
              </th>
              <th style={{ ...styles.th, ...styles.green }} colSpan={4}>
                QUARTERLY TARGET
              </th>
            </tr>

            <tr>
              <th style={{ ...styles.th, ...styles.green }}>1Q</th>
              <th style={{ ...styles.th, ...styles.green }}>2Q</th>
              <th style={{ ...styles.th, ...styles.green }}>3Q</th>
              <th style={{ ...styles.th, ...styles.green }}>4Q</th>
            </tr>
          </thead>

          <tbody>
            {rowsData.map((r, idx) => {
              const isPct = isPercentRow(r.kpi);
              const step = isPct ? "0.01" : "1";

              return (
                <tr key={r.kpiKey}>
                  <td style={styles.td}>{r.kpi}</td>

                  <td style={styles.tdCenter}>
                    <input
                      style={styles.inputReadonly}
                      type="text"
                      value={r.annualTarget}
                      readOnly
                    />
                  </td>

                  {["t1", "t2", "t3", "t4"].map((k) => (
                    <td key={k} style={{ ...styles.tdCenter, ...styles.green }}>
                      <input
                        style={canEditTargets ? styles.input : styles.inputReadonly}
                        type="number"
                        step={step}
                        value={r[k]}
                        disabled={!canEditTargets}
                        readOnly={!canEditTargets}
                        title={!canEditTargets ? "Edit permission required" : ""}
                        onChange={(e) => onChange(idx, k, e.target.value)}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div style={styles.page}>
      <div style={styles.globalPanel}>
        <div style={styles.globalHeader}>
          <div>
            <div style={styles.globalTitle}>Target Settings</div>
            <div style={styles.globalSub}>
              Set, view, copy, and save annual targets by year. The selected year applies to every target table below.
            </div>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Global Target Year</label>
            <YearPicker />
          </div>
        </div>

        <div style={styles.filterRow}>
          <button style={styles.globalBtnLight} onClick={loadAllTargets}>
            Load All {targetYear}
          </button>

          {canEditTargets ? (
            <button style={styles.globalBtn} onClick={saveAllTargets}>
              Save All {targetYear}
            </button>
          ) : null}

          {canEditTargets ? (
            <button style={styles.globalBtnLight} onClick={copyPreviousYearTargets}>
              Copy from {Number(targetYear) - 1}
            </button>
          ) : null}

          {canEditTargets ? (
            <button style={styles.globalBtnDanger} onClick={clearCurrentYearTargets}>
              Clear Current Year
            </button>
          ) : null}

          {globalStatus ? <span style={{ ...styles.status, color: "#0f172a" }}>{globalStatus}</span> : null}
        </div>
      </div>

      {renderTable({
        title: "SETUP",
        rowsData: rows,
        onChange: updateCell,
        onSave: handleSave,
        onLoad: handleLoad,
        onClear: handleClear,
        status: saveStatus,
      })}

      {renderTable({
        title: "CEST",
        rowsData: cestRows,
        onChange: updateCestCell,
        onSave: handleCestSave,
        onLoad: handleCestLoad,
        onClear: handleCestClear,
        status: cestSaveStatus,
      })}

      {renderTable({
        title: "SSCP",
        rowsData: sscpRows,
        onChange: updateSscpCell,
        onSave: handleSscpSave,
        onLoad: handleSscpLoad,
        onClear: handleSscpClear,
        status: sscpSaveStatus,
      })}

      {renderTable({
        title: "DRRM",
        rowsData: drrmRows,
        onChange: updateDrrmCell,
        onSave: handleDrrmSave,
        onLoad: handleDrrmLoad,
        onClear: handleDrrmClear,
        status: drrmSaveStatus,
      })}

      {renderTable({
        title: "TACS",
        rowsData: tacsRows,
        onChange: updateTacsCell,
        onSave: handleTacsSave,
        onLoad: handleTacsLoad,
        onClear: handleTacsClear,
        status: tacsSaveStatus,
      })}

      {renderTable({
        title: "TECHNOLOGY PROMOTION",
        rowsData: techPromoRows,
        onChange: updateTechPromoCell,
        onSave: handleTechPromoSave,
        onLoad: handleTechPromoLoad,
        onClear: handleTechPromoClear,
        status: techPromoSaveStatus,
      })}

      {renderTable({
        title: "TECHNOLOGY TRAINING",
        rowsData: techTrainingRows,
        onChange: updateTechTrainingCell,
        onSave: handleTechTrainingSave,
        onLoad: handleTechTrainingLoad,
        onClear: handleTechTrainingClear,
        status: techTrainingSaveStatus,
      })}

      {renderTable({
        title: "TECHNOLOGY ROLL OUT",
        rowsData: techRolloutRows,
        onChange: updateTechRolloutCell,
        onSave: handleTechRolloutSave,
        onLoad: handleTechRolloutLoad,
        onClear: handleTechRolloutClear,
        status: techRolloutSaveStatus,
      })}

      {renderTable({
        title: "PACKAGING AND LABELING",
        rowsData: packagingLabelingRows,
        onChange: updatePackagingLabelingCell,
        onSave: handlePackagingLabelingSave,
        onLoad: handlePackagingLabelingLoad,
        onClear: handlePackagingLabelingClear,
        status: packagingLabelingSaveStatus,
      })}

      {renderTable({
        title: "CALIBRATION",
        rowsData: calibrationRows,
        onChange: updateCalibrationCell,
        onSave: handleCalibrationSave,
        onLoad: handleCalibrationLoad,
        onClear: handleCalibrationClear,
        status: calibrationSaveStatus,
      })}

      {renderTable({
        title: "S&T PROMO",
        rowsData: stPromoRows,
        onChange: updateStPromoCell,
        onSave: handleStPromoSave,
        onLoad: handleStPromoLoad,
        onClear: handleStPromoClear,
        status: stPromoSaveStatus,
      })}
    </div>
  );
}