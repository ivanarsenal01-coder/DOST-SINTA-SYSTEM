import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import API_BASE from "../../api";
import { useAuth } from "../../usrmngment/auth/AuthContext";
import { canAccess } from "../../usrmngment/utils/permissions";

const API = API_BASE;
const CEST_API = `${API_BASE}/cest`;
const SSCP_API = `${API_BASE}/sscp-summary`;
const DRRM_API = `${API_BASE}/drrm`;

// ✅ TECHNOLOGY PROMOTION
const TECH_PROMO_API = `${API_BASE}/technology-promotion`;

// ✅ TECHNOLOGY ROLL OUT
const TECH_ROLLOUT_API = `${API_BASE}/technology-rollout`;

// ✅ PACKAGING AND LABELING
const PACKAGING_LABELING_API = `${API_BASE}/packaging-labeling`;
const CALIBRATION_API = `${API_BASE}/calibration`;
const ST_PROMO_API = `${API_BASE}/st-promo`;

export default function Setup() {
  const { user } = useAuth();

  const canViewSetup = canAccess(user, "setup", "view");
  const canViewCest = canAccess(user, "cest", "view");
  const canViewSscp = canAccess(user, "sscp", "view");
  const canViewDrrm = canAccess(user, "drrm", "view");
  const canViewTacs = canAccess(user, "tacs", "view");
  const canViewTechPromo = canAccess(user, "techPromo", "view");
  const canViewTechRollout = canAccess(user, "techRollout", "view");
  const canViewTechTraining = canAccess(user, "techTraining", "view");
  const canViewPackaging = canAccess(user, "packaging", "view");
  const canViewCalibration = canAccess(user, "calibration", "view");
  const canViewStPromo = canAccess(user, "stPromo", "view");

  const hasAnyVisibleSummary =
    canViewSetup ||
    canViewCest ||
    canViewSscp ||
    canViewDrrm ||
    canViewTacs ||
    canViewTechPromo ||
    canViewTechRollout ||
    canViewTechTraining ||
    canViewPackaging ||
    canViewCalibration ||
    canViewStPromo;

  // ✅ SETUP default fallback targets = 0
  const DEFAULT_TARGETS = {
    interventions: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
    customers: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
    jobs: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
    jobsIncreasePct: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
    productivityPct: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
    grossSales: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
  };

  // ✅ CEST default fallback targets = 0
  const DEFAULT_CEST_TARGETS = {
    communities: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
    technologies: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
    beneficiaries: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
    interventions: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
    technologiesPromoted: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
    promotionalActivitiesPressRelease: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
  };

  // ✅ SSCP default fallback targets = 0
  const DEFAULT_SSCP_TARGETS = {
    smartCitiesEstablished: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
    communitiesLgusAssisted: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
    technologiesPromoted: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
    technologiesAdopted: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
    mouMoa: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
  };

  // ✅ DRRM default fallback targets = 0
  const DEFAULT_DRRM_TARGETS = {
    drrmMainMeasures: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
    drrmActivities: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
    drrmIecMaterials: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
    drrmCollaborations: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
  };

  // ✅ TACS default fallback targets = 0
  const DEFAULT_TACS_TARGETS = {
    customersAssisted: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
    adviceRecommendations: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
  };

  // ✅ TECHNOLOGY PROMOTION default fallback targets = 0
  const DEFAULT_TECH_PROMO_TARGETS = {
    technologiesPromoted: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
    promotionalActivities: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
  };

  // ✅ TECHNOLOGY TRAINING default fallback targets = 0
  const DEFAULT_TECH_TRAINING_TARGETS = {
    trainingsConducted: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
    participantsReached: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
  };

  // ✅ TECHNOLOGY ROLL OUT default fallback targets = 0
  const DEFAULT_TECH_ROLLOUT_TARGETS = {
    kpi2TotalTransferred: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
    kpi2DostTransferred: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
    kpi3TotalAdopters: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
    kpi3DostAdopters: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
  };

  // ✅ PACKAGING AND LABELING default fallback targets = 0
  const DEFAULT_PACKAGING_LABELING_TARGETS = {
    trainingsConducted: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
    firmsAssisted: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
  };

  // ✅ CALIBRATION default fallback targets = 0
  const DEFAULT_CALIBRATION_TARGETS = {
    totalCalibratedMC: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
    totalCalibratedVC: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
    totalIncomeGenerated: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
    totalAmountAssistance: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
    totalCustomersAll: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
  };

  // ✅ S&T PROMO default fallback targets = 0
  const DEFAULT_ST_PROMO_TARGETS = {
    peopleReachedSocialMedia: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
    promotionalActivitiesOnsite: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
    engagements: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
  };

  const fontFamily =
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"';

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // ✅ Year-only picker copied from Target Settings.
  // It opens as a modal, supports scrolling, manual typing, previous/next year,
  // and only auto-centers once per open so scrolling stays freewheel.
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

  const [projects, setProjects] = useState([]);
  const [targets, setTargets] = useState(DEFAULT_TARGETS);

  // ✅ CEST
  const [cestTargets, setCestTargets] = useState(DEFAULT_CEST_TARGETS);
  const [cestProjects, setCestProjects] = useState([]);

  // ✅ SSCP
  const [sscpTargets, setSscpTargets] = useState(DEFAULT_SSCP_TARGETS);
  const [sscpProjects, setSscpProjects] = useState([]);

  // ✅ DRRM
  const [drrmTargets, setDrrmTargets] = useState(DEFAULT_DRRM_TARGETS);
  const [drrmActivities, setDrrmActivities] = useState([]);
  const [drrmIecMaterials, setDrrmIecMaterials] = useState([]);
  const [drrmCollaborations, setDrrmCollaborations] = useState([]);

  // ✅ TACS
  const [tacsTargets, setTacsTargets] = useState(DEFAULT_TACS_TARGETS);
  const [tacsEntries, setTacsEntries] = useState([]);

  // ✅ TECHNOLOGY PROMOTION
  const [techPromoTargets, setTechPromoTargets] = useState(DEFAULT_TECH_PROMO_TARGETS);
  const [techPromoEntries, setTechPromoEntries] = useState([]);

  // ✅ TECHNOLOGY ROLL OUT
  const [techRolloutTargets, setTechRolloutTargets] = useState(DEFAULT_TECH_ROLLOUT_TARGETS);
  const [techRolloutEntries, setTechRolloutEntries] = useState([]);

  // ✅ TECHNOLOGY TRAINING
  const [techTrainingTargets, setTechTrainingTargets] = useState(DEFAULT_TECH_TRAINING_TARGETS);
  const [techTrainingEntries, setTechTrainingEntries] = useState([]);

  // ✅ PACKAGING AND LABELING
  const [packagingLabelingTargets, setPackagingLabelingTargets] = useState(DEFAULT_PACKAGING_LABELING_TARGETS);
  const [packagingLabelingEntries, setPackagingLabelingEntries] = useState([]);

  // ✅ CALIBRATION
  const [calibrationTargets, setCalibrationTargets] = useState(DEFAULT_CALIBRATION_TARGETS);
  const [calibrationEntries, setCalibrationEntries] = useState([]);

  // ✅ S&T PROMO
  const [stPromoTargets, setStPromoTargets] = useState(DEFAULT_ST_PROMO_TARGETS);
  const [stPromoEntries, setStPromoEntries] = useState([]);

  // ✅ Other indicators from DATABASE by projectId
  const [otherIndicatorsByProject, setOtherIndicatorsByProject] = useState({});

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

  const whole = (n) =>
    toNumber(n).toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  const blankQuarterObj = () => ({ q1: 0, q2: 0, q3: 0, q4: 0 });

  const getQuarterFromDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;
    const m = d.getMonth() + 1;
    if (m <= 3) return 1;
    if (m <= 6) return 2;
    if (m <= 9) return 3;
    return 4;
  };

  const extractRowsFromApi = (raw) => {
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.data)) return raw.data;
    if (Array.isArray(raw?.rows)) return raw.rows;
    if (Array.isArray(raw?.value)) return raw.value;
    if (Array.isArray(raw?.result)) return raw.result;
    if (Array.isArray(raw?.items)) return raw.items;
    return [];
  };

  const getYearFromDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;
    return d.getFullYear();
  };

  const getAutoQuarter = (dateStr, fallbackQuarter = 1) => {
    const qFromDate = getQuarterFromDate(dateStr);
    if (qFromDate) return qFromDate;

    const q = Number(fallbackQuarter);
    return [1, 2, 3, 4].includes(q) ? q : 1;
  };

  const pickProjectDate = (p = {}) =>
    p.dateProjectApproval ||
    p.date_project_approval ||
    p.dateApproved ||
    p.date_approved ||
    p.approvedDate ||
    p.approved_date ||
    p.createdAt ||
    p.created_at ||
    "";

  const pickInterventionDate = (it = {}) =>
    it.date ||
    it.activityDate ||
    it.activity_date ||
    it.startDate ||
    it.start_date ||
    it.dateTransferred ||
    it.date_transferred ||
    it.techrolloutDateTransferred ||
    it.techrollout_date_transferred ||
    it.packagingDateCompleted ||
    it.packaging_date_completed ||
    it.createdAt ||
    it.created_at ||
    "";

  const filterRowsByYear = (rows, year, getDateValue) => {
    return (rows || []).filter((row) => {
      const y = getYearFromDate(getDateValue(row));
      return Number(y) === Number(year);
    });
  };

  const getQuarterForProject = (p) => {
    return getAutoQuarter(pickProjectDate(p), p?.quarter);
  };

  const normalizeRolloutEntry = (e) => {
    const effectiveDate =
      e?.activityDate ||
      e?.activity_date ||
      e?.dateTransferred ||
      e?.date_transferred ||
      e?.techrolloutDateTransferred ||
      e?.techrollout_date_transferred ||
      "";

    return {
      id: e?.id ?? Math.random().toString(36).slice(2),
      nameOfTechnologyTransferred:
        e?.nameOfTechnologyTransferred || e?.name_of_technology_transferred || "",
      technologyGenerator: e?.technologyGenerator || e?.technology_generator || "",
      modeOfTransfer: e?.modeOfTransfer || e?.mode_of_transfer || "",
      isDostDevelopedFunded:
        e?.isDostDevelopedFunded ?? e?.is_dost_developed_funded ?? "",
      activityDate: effectiveDate,
      institutionName: e?.institutionName || e?.institution_name || "",
      address:
        e?.address ||
        e?.institutionAddress ||
        e?.institution_address ||
        e?.address_display_text ||
        "",
      quarter:
        e?.quarter ||
        e?.report_quarter ||
        getQuarterFromDate(effectiveDate) ||
        "",
    };
  };

  const normalizePackagingLabelingEntry = (e) => {
    const effectiveDate =
      e?.dateCompleted ||
      e?.date_completed ||
      e?.packagingDateCompleted ||
      e?.packaging_date_completed ||
      e?.date ||
      "";

    return {
      id: e?.id ?? Math.random().toString(36).slice(2),
      quarter:
        e?.quarter ||
        e?.report_quarter ||
        getQuarterFromDate(effectiveDate) ||
        "",
      dateCompleted: effectiveDate,
      typeOfIntervention:
        e?.typeOfIntervention ||
        e?.type_of_intervention ||
        e?.packagingTypeOfIntervention ||
        e?.packaging_type_of_intervention ||
        "",
      firmName:
        e?.firmName ||
        e?.firm_name ||
        e?.packagingFirmInstitution ||
        e?.packaging_firm_institution ||
        "",
      customerName:
        e?.customerName ||
        e?.customer_name ||
        e?.packagingCustomerName ||
        e?.packaging_customer_name ||
        "",
    };
  };

  const normalizeCalibrationEntry = (e) => ({
    id: e?.id ?? Math.random().toString(36).slice(2),
    date: e?.date || e?.calibrationDate || e?.calibration_date || "",
    category: String(e?.category || "").trim().toUpperCase(),
    typeOfSample: e?.typeOfSample || e?.type_of_sample || "",
    noOfSample: toNumber(e?.noOfSample ?? e?.no_of_sample ?? 0),
    cost: toNumber(e?.cost ?? 0),
    feesCollected: toNumber(e?.feesCollected ?? e?.fees_collected ?? 0),
    totalCustomers: toNumber(e?.totalCustomers ?? e?.total_customers ?? e?.total ?? 0),
  });

  const normalizeStPromoEntry = (e) => ({
    id: e?.id ?? Math.random().toString(36).slice(2),
    entryMode: String(e?.entryMode || e?.entry_mode || "").trim().toUpperCase(),
    date: e?.date || "",
    peopleReached: toNumber(e?.peopleReached ?? e?.people_reached ?? 0),
    totalEngagements: toNumber(e?.totalEngagements ?? e?.total_engagements ?? 0),
  });

  const normalizeTechPromoEntry = (e) => ({
    id: e?.id ?? Math.random().toString(36).slice(2),
    activityDate:
      e?.activityDate ||
      e?.activity_date ||
      e?.date ||
      e?.createdAt ||
      e?.created_at ||
      "",
    technologyPromoted:
      e?.technologyPromoted ||
      e?.technology_promoted ||
      e?.nameOfTechnology ||
      e?.name_of_technology ||
      "",
    activityTitle: e?.activityTitle || e?.activity_title || e?.title || "",
    project: e?.project || e?.projectProgramUnit || e?.project_program_unit || "",
  });

  const normalizeCestLikeProjects = (rows) => {
    return (rows || []).map((p) => ({
      id: Number(p.id),
      quarter: String(p.quarter || "1"),
      type: p.type || "",
      projectTitle: p.projectTitle || p.project_title || "",
      dateProjectApproval: pickProjectDate(p),
      associationName: p.associationName || p.firmName || p.firm_name || "",
      address: p.address || "",
      projectProponent: p.projectProponent || p.cooperatorName || p.cooperator_name || "",
      sex: p.sex || "",
      processSystem: p.processSystem || "",
      lguNumbersOfCommunities:
        p.lguNumbersOfCommunities ?? p.lgu_numbers_of_communities ?? "",
      pressRelease: Number(p.pressRelease ?? p.press_release ?? 0),
      communitiesAssisted: Number(p.communitiesAssisted ?? p.communities_assisted ?? 0),
      technologiesDeployed: Number(p.technologiesDeployed ?? p.technologies_deployed ?? 0),
      beneficiaries: Number(p.beneficiaries ?? 0),
      startupsAssisted: p.startupsAssisted ?? p.startups_assisted ?? "",
      jobsGenerated: Number(p.jobsGenerated ?? p.jobs_generated ?? 0),
      smartCitiesEstablished: toNumber(
        p.smartCitiesEstablished ??
        p.smart_cities_established ??
        p.noOfSmartCitiesEstablished ??
        p.no_of_smart_cities_established ??
        p.smartCityEstablished ??
        p.smart_city_established ??
        0
      ),
      communitiesLgusAssisted: toNumber(
        p.communitiesLgusAssisted ??
        p.communities_lgus_assisted ??
        p.lguNumbersOfCommunities ??
        p.lgu_numbers_of_communities ??
        p.communitiesAssisted ??
        p.communities_assisted ??
        0
      ),
      mouMoa: toNumber(
        p.mouMoa ??
        p.mou_moa ??
        p.mouMoaCount ??
        p.mou_moa_count ??
        p.moaMou ??
        p.moa_mou ??
        p.mouCount ??
        p.mou_count ??
        p.moaCount ??
        p.moa_count ??
        0
      ),
      interventions: Array.isArray(p.interventions)
        ? p.interventions.map((it) => ({
          id: Number(it.id),
          type: it.type || "",
          title: it.title || "",
          date: pickInterventionDate(it),
          total: Number(
            it.total ??
            it.totalParticipants ??
            it.total_participants ??
            it.totalParticipantsReached ??
            0
          ),
          technologiesPromotedTotal: Number(
            it.technologiesPromotedTotal ??
            it.technologies_promoted_total ??
            it.technologyPromotedTotal ??
            it.technology_promoted_total ??
            0
          ),
          promotionalActivitiesPressRelease: Number(
            it.promotionalActivitiesPressRelease ??
            it.promotional_activities_press_release ??
            0
          ),
        }))
        : [],
    }));
  };

  const normalizeCestProjects = (rows) => normalizeCestLikeProjects(rows);

  const normalizeSscpProjects = (rows) => {
    // ✅ SSCP output mapping: make SSCP fields available to the SSCP KPI rows.
    const baseRows = normalizeCestLikeProjects(rows);

    return baseRows.map((base, index) => {
      const raw = rows?.[index] || {};
      const interventions = Array.isArray(base.interventions)
        ? base.interventions.map((it) => ({
          ...it,
          technologiesPromotedTotal: toNumber(
            it?.technologiesPromotedTotal ??
            it?.technologies_promoted_total ??
            it?.technologyPromotedTotal ??
            it?.technology_promoted_total ??
            0
          ),
          promotionalActivitiesPressRelease: toNumber(
            it?.promotionalActivitiesPressRelease ??
            it?.promotional_activities_press_release ??
            0
          ),
        }))
        : [];

      return {
        ...base,
        interventions,
        smartCitiesEstablished: toNumber(
          raw?.smartCitiesEstablished ??
          raw?.smart_cities_established ??
          raw?.noOfSmartCitiesEstablished ??
          raw?.no_of_smart_cities_established ??
          raw?.smartCityEstablished ??
          raw?.smart_city_established ??
          0
        ),
        communitiesLgusAssisted: toNumber(
          raw?.communitiesLgusAssisted ??
          raw?.communities_lgus_assisted ??
          raw?.lguNumbersOfCommunities ??
          raw?.lgu_numbers_of_communities ??
          raw?.communitiesAssisted ??
          raw?.communities_assisted ??
          0
        ),
        mouMoa: toNumber(
          raw?.mouMoa ??
          raw?.mou_moa ??
          raw?.mouMoaCount ??
          raw?.mou_moa_count ??
          raw?.moaMou ??
          raw?.moa_mou ??
          raw?.mouCount ??
          raw?.mou_count ??
          raw?.moaCount ??
          raw?.moa_count ??
          0
        ),
      };
    });
  };

  const normalizeDrrmActivity = (e) => ({
    id: e?.id ?? Math.random().toString(36).slice(2),
    dateStart: e?.dateStart || e?.date_start || e?.date || "",
    total: toNumber(e?.total ?? 0),
  });

  const normalizeDrrmIecMaterial = (e) => ({
    id: e?.id ?? Math.random().toString(36).slice(2),
    date: e?.date || e?.date_used || e?.dateUsed || "",
    titles: Array.isArray(e?.titles) ? e.titles : [],
    total: toNumber(e?.total ?? 0),
  });

  const normalizeDrrmCollaboration = (e) => ({
    id: e?.id ?? Math.random().toString(36).slice(2),
    date: e?.date || e?.activity_date || e?.activityDate || "",
    title: e?.title || "",
    stakeholders: Array.isArray(e?.stakeholders)
      ? e.stakeholders
      : Array.isArray(e?.partners)
        ? e.partners
        : e?.stakeholders
          ? String(e.stakeholders).split(",").map((x) => x.trim()).filter(Boolean)
          : e?.partners
            ? String(e.partners).split(",").map((x) => x.trim()).filter(Boolean)
            : e?.stakeholder
              ? [e.stakeholder]
              : e?.partner
                ? [e.partner]
                : e?.nameOfStakeholders
                  ? String(e.nameOfStakeholders).split(",").map((x) => x.trim()).filter(Boolean)
                  : e?.name_of_stakeholders
                    ? String(e.name_of_stakeholders).split(",").map((x) => x.trim()).filter(Boolean)
                    : [],
  });

  // ==========================
  // ✅ OTHER INDICATORS (DB)
  // ==========================
  const mapDbOI = (rowOrNull) => {
    const r = rowOrNull || {};
    return {
      jobsGenerated: {
        q1: toNumber(r.jobs_q1),
        q2: toNumber(r.jobs_q2),
        q3: toNumber(r.jobs_q3),
        q4: toNumber(r.jobs_q4),
      },
      jobsIncreasePct: {
        q1: toNumber(r.jobs_inc_q1),
        q2: toNumber(r.jobs_inc_q2),
        q3: toNumber(r.jobs_inc_q3),
        q4: toNumber(r.jobs_inc_q4),
      },
      productivityPct: {
        q1: toNumber(r.prod_q1),
        q2: toNumber(r.prod_q2),
        q3: toNumber(r.prod_q3),
        q4: toNumber(r.prod_q4),
      },
      grossSales: {
        q1: toNumber(r.gross_q1),
        q2: toNumber(r.gross_q2),
        q3: toNumber(r.gross_q3),
        q4: toNumber(r.gross_q4),
      },
    };
  };

  const fetchOtherIndicatorsForProjects = async (projectIds) => {
    if (!Array.isArray(projectIds) || projectIds.length === 0) {
      setOtherIndicatorsByProject({});
      return;
    }

    try {
      const requests = projectIds.map((id) =>
        axios
          .get(`${API}/projects/${id}/other-indicators`)
          .then((res) => ({ id, data: res.data }))
          .catch(() => ({ id, data: null }))
      );

      const results = await Promise.all(requests);

      setOtherIndicatorsByProject((prev) => {
        const next = { ...prev };
        results.forEach(({ id, data }) => {
          next[id] = mapDbOI(data);
        });
        return next;
      });
    } catch (e) {
      console.error("Failed to load Setup other indicators:", e);
    }
  };

  const getOI = (projectId) => {
    const oi = otherIndicatorsByProject?.[projectId] || {};
    return {
      jobsGenerated: oi.jobsGenerated || blankQuarterObj(),
      jobsIncreasePct: oi.jobsIncreasePct || blankQuarterObj(),
      productivityPct: oi.productivityPct || blankQuarterObj(),
      grossSales: oi.grossSales || blankQuarterObj(),
    };
  };

  const fetchTargetSettings = async (moduleName, defaultShape, keyOrderMap = null, year = selectedYear) => {
    try {
      const res = await axios.get(`${API}/target-settings/${moduleName}`, {
        params: { year },
      });
      const rows = Array.isArray(res.data) ? res.data : [];

      if (!rows.length) return defaultShape;

      const next = { ...defaultShape };

      rows.forEach((r, idx) => {
        const rawKey =
          r.kpiKey ||
          r.kpi_key ||
          r.targetKey ||
          r.key ||
          null;

        const mappedKey =
          rawKey ||
          (Array.isArray(keyOrderMap) ? keyOrderMap[idx] : null);

        if (!mappedKey || !next[mappedKey]) return;

        next[mappedKey] = {
          annual: toNumber(r.annualTarget ?? r.annual_target),
          q1: toNumber(r.t1 ?? r.q1 ?? r.q1_target),
          q2: toNumber(r.t2 ?? r.q2 ?? r.q2_target),
          q3: toNumber(r.t3 ?? r.q3 ?? r.q3_target),
          q4: toNumber(r.t4 ?? r.q4 ?? r.q4_target),
        };
      });

      return next;
    } catch (err) {
      console.error(`Failed to load target settings for ${moduleName}:`, err);
      return defaultShape;
    }
  };

  // ✅ TACS from DATABASE/API
  const fetchTacsEntries = async (year = selectedYear) => {
    try {
      const res = await axios.get(`${API}/tacs`, { params: { year } });
      const rows = extractRowsFromApi(res.data);
      const filteredRows = filterRowsByYear(rows, year, (e) =>
        e?.dateOfEngagement ||
        e?.date_of_engagement ||
        e?.engagementDate ||
        e?.engagement_date ||
        e?.date ||
        e?.createdAt ||
        e?.created_at
      );

      const normalized = filteredRows.map((e) => ({
        id: e?.id ?? Math.random().toString(36).slice(2),
        dateOfEngagement:
          e?.dateOfEngagement ||
          e?.date_of_engagement ||
          e?.engagementDate ||
          e?.engagement_date ||
          e?.date ||
          "",
        adviceCount: toNumber(
          e?.adviceCount ??
          e?.advice_count ??
          e?.recommendationCount ??
          e?.recommendation_count ??
          e?.adviceRecommendations ??
          0
        ),
      }));
      setTacsEntries(normalized);
    } catch (e) {
      console.error("Failed to load TACS entries:", e);
      setTacsEntries([]);
    }
  };

  const normalizeTechTrainingEntry = (e) => ({
    id: e?.id ?? Math.random().toString(36).slice(2),
    startDate:
      e?.startDate ||
      e?.start_date ||
      e?.trainingStartDate ||
      e?.training_start_date ||
      e?.date ||
      "",
    participantsFemale: toNumber(
      e?.participantsFemale ??
      e?.participants_female ??
      e?.trainingParticipantsFemale ??
      e?.training_participants_female ??
      0
    ),
    participantsMale: toNumber(
      e?.participantsMale ??
      e?.participants_male ??
      e?.trainingParticipantsMale ??
      e?.training_participants_male ??
      0
    ),
    totalParticipants: toNumber(
      e?.totalParticipants ??
      e?.total_participants ??
      e?.participantsTotal ??
      e?.participants_total ??
      0
    ),
  });

  // ✅ TECHNOLOGY TRAINING from DATABASE/API
  const fetchTechTrainingEntries = async (year = selectedYear) => {
    try {
      const res = await axios.get(`${API}/technology-training/summary`, {
        params: { year },
      });
      const data = res.data || {};
      setTechTrainingEntries([
        {
          id: "summary",
          summaryMode: true,
          trainingsConducted: data.trainingsConducted || { q1: 0, q2: 0, q3: 0, q4: 0 },
          participantsReached: data.participantsReached || { q1: 0, q2: 0, q3: 0, q4: 0 },
        },
      ]);
    } catch (e) {
      console.error("Failed to load Technology Training entries:", e);
      setTechTrainingEntries([]);
    }
  };

  const fetchTechPromoEntries = async (year = selectedYear) => {
    try {
      const qs = new URLSearchParams();
      qs.set("year", String(year));
      qs.set("project", "ALL");

      const res = await axios.get(`${TECH_PROMO_API}/entries?${qs.toString()}`);
      const rows = extractRowsFromApi(res.data);
      const filteredRows = filterRowsByYear(rows, year, (e) =>
        e?.activityDate ||
        e?.activity_date ||
        e?.date ||
        e?.createdAt ||
        e?.created_at
      );

      setTechPromoEntries(filteredRows.map(normalizeTechPromoEntry));
    } catch (e) {
      console.error("Failed to load Technology Promotion entries:", e);
      setTechPromoEntries([]);
    }
  };

  const fetchTechRolloutEntries = async (year = selectedYear) => {
    try {
      const res = await axios.get(TECH_ROLLOUT_API, { params: { year } });
      const rows = extractRowsFromApi(res.data);
      const filteredRows = filterRowsByYear(rows, year, (e) =>
        e?.activityDate ||
        e?.activity_date ||
        e?.dateTransferred ||
        e?.date_transferred ||
        e?.techrolloutDateTransferred ||
        e?.techrollout_date_transferred ||
        e?.createdAt ||
        e?.created_at
      );

      setTechRolloutEntries(filteredRows.map(normalizeRolloutEntry));
    } catch (e) {
      console.error("Failed to load Technology Rollout entries:", e);
      setTechRolloutEntries([]);
    }
  };

  const fetchPackagingLabelingEntries = async (year = selectedYear) => {
    try {
      const res = await axios.get(PACKAGING_LABELING_API, { params: { year } });
      const rows = extractRowsFromApi(res.data);
      const filteredRows = filterRowsByYear(rows, year, (e) =>
        e?.dateCompleted ||
        e?.date_completed ||
        e?.packagingDateCompleted ||
        e?.packaging_date_completed ||
        e?.date ||
        e?.createdAt ||
        e?.created_at
      );

      setPackagingLabelingEntries(filteredRows.map(normalizePackagingLabelingEntry));
    } catch (e) {
      console.error("Failed to load Packaging and Labeling entries:", e);
      setPackagingLabelingEntries([]);
    }
  };

  const fetchCalibrationEntries = async (year = selectedYear) => {
    try {
      const res = await axios.get(CALIBRATION_API, { params: { year } });
      const rows = extractRowsFromApi(res.data);
      const filteredRows = filterRowsByYear(rows, year, (e) =>
        e?.date ||
        e?.calibrationDate ||
        e?.calibration_date ||
        e?.createdAt ||
        e?.created_at
      );

      setCalibrationEntries(filteredRows.map(normalizeCalibrationEntry));
    } catch (e) {
      console.error("Failed to load Calibration entries:", e);
      setCalibrationEntries([]);
    }
  };

  const fetchStPromoEntries = async (year = selectedYear) => {
    try {
      const res = await axios.get(ST_PROMO_API, { params: { year } });
      const rows = extractRowsFromApi(res.data);
      const filteredRows = filterRowsByYear(rows, year, (e) =>
        e?.date ||
        e?.activityDate ||
        e?.activity_date ||
        e?.createdAt ||
        e?.created_at
      );

      setStPromoEntries(filteredRows.map(normalizeStPromoEntry));
    } catch (e) {
      console.error("Failed to load S&T Promo entries:", e);
      setStPromoEntries([]);
    }
  };

  const fetchCestProjects = async (year = selectedYear) => {
    try {
      const res = await axios.get(CEST_API, { params: { year } });
      const rows = extractRowsFromApi(res.data);
      const filteredRows = filterRowsByYear(rows, year, pickProjectDate);

      setCestProjects(normalizeCestProjects(filteredRows));
    } catch (e) {
      console.error("Failed to load CEST projects:", e);
      setCestProjects([]);
    }
  };

  // ✅ SSCP from DATABASE/API
  //    connected to /sscp endpoint which should read from sscp + sscp_interventions (+ optional sscp_other_indicators)
  const fetchSscpProjects = async (year = selectedYear) => {
    try {
      const res = await axios.get(SSCP_API, { params: { year } });
      const rows = extractRowsFromApi(res.data);
      const filteredRows = filterRowsByYear(rows, year, pickProjectDate);

      setSscpProjects(normalizeSscpProjects(filteredRows));
    } catch (e) {
      console.error("Failed to load SSCP projects:", e);
      setSscpProjects([]);
    }
  };

  const fetchDrrmEntries = async (year = selectedYear) => {
    try {
      const [activitiesRes, iecRes, collaborationsRes] = await Promise.all([
        axios.get(`${DRRM_API}/activities`, { params: { year } }),
        axios.get(`${DRRM_API}/iec-materials`, { params: { year } }),
        axios.get(`${DRRM_API}/collaborations`, { params: { year } }),
      ]);

      const activities = extractRowsFromApi(activitiesRes.data);
      const iecMaterials = extractRowsFromApi(iecRes.data);
      const collaborations = extractRowsFromApi(collaborationsRes.data);

      setDrrmActivities(
        filterRowsByYear(activities, year, (e) =>
          e?.dateStart || e?.date_start || e?.date || e?.createdAt || e?.created_at
        ).map(normalizeDrrmActivity)
      );
      setDrrmIecMaterials(
        filterRowsByYear(iecMaterials, year, (e) =>
          e?.date || e?.date_used || e?.dateUsed || e?.createdAt || e?.created_at
        ).map(normalizeDrrmIecMaterial)
      );
      setDrrmCollaborations(
        filterRowsByYear(collaborations, year, (e) =>
          e?.date || e?.activity_date || e?.activityDate || e?.createdAt || e?.created_at
        ).map(normalizeDrrmCollaboration)
      );
    } catch (e) {
      console.error("Failed to load DRRM entries:", e);
      setDrrmActivities([]);
      setDrrmIecMaterials([]);
      setDrrmCollaborations([]);
    }
  };

  useEffect(() => {
    const init = async () => {
      setTargets(
        await fetchTargetSettings("setup", DEFAULT_TARGETS, [
          "interventions",
          "customers",
          "jobs",
          "jobsIncreasePct",
          "productivityPct",
          "grossSales",
        ], selectedYear)
      );

      setCestTargets(
        await fetchTargetSettings("cest", DEFAULT_CEST_TARGETS, [
          "communities",
          "technologies",
          "beneficiaries",
          "interventions",
          "technologiesPromoted",
          "promotionalActivitiesPressRelease",
        ], selectedYear)
      );

      setSscpTargets(
        await fetchTargetSettings("sscp", DEFAULT_SSCP_TARGETS, [
          "smartCitiesEstablished",
          "communitiesLgusAssisted",
          "technologiesPromoted",
          "technologiesAdopted",
          "mouMoa",
        ], selectedYear)
      );

      setDrrmTargets(
        await fetchTargetSettings("drrm", DEFAULT_DRRM_TARGETS, [
          "drrmMainMeasures",
          "drrmActivities",
          "drrmIecMaterials",
          "drrmCollaborations",
        ], selectedYear)
      );

      setTacsTargets(
        await fetchTargetSettings("tacs", DEFAULT_TACS_TARGETS, [
          "customersAssisted",
          "adviceRecommendations",
        ], selectedYear)
      );

      setTechPromoTargets(
        await fetchTargetSettings("technology_promotion", DEFAULT_TECH_PROMO_TARGETS, [
          "technologiesPromoted",
          "promotionalActivities",
        ], selectedYear)
      );

      setTechTrainingTargets(
        await fetchTargetSettings("technology_training", DEFAULT_TECH_TRAINING_TARGETS, [
          "trainingsConducted",
          "participantsReached",
        ], selectedYear)
      );

      setTechRolloutTargets(
        await fetchTargetSettings("technology_rollout", DEFAULT_TECH_ROLLOUT_TARGETS, [
          "kpi2TotalTransferred",
          "kpi2DostTransferred",
          "kpi3TotalAdopters",
          "kpi3DostAdopters",
        ], selectedYear)
      );

      setPackagingLabelingTargets(
        await fetchTargetSettings("packaging_and_labeling", DEFAULT_PACKAGING_LABELING_TARGETS, [
          "trainingsConducted",
          "firmsAssisted",
        ], selectedYear)
      );

      setCalibrationTargets(
        await fetchTargetSettings("calibration", DEFAULT_CALIBRATION_TARGETS, [
          "totalCalibratedMC",
          "totalCalibratedVC",
          "totalIncomeGenerated",
          "totalAmountAssistance",
          "totalCustomersAll",
        ], selectedYear)
      );

      setStPromoTargets(
        await fetchTargetSettings("st_promo", DEFAULT_ST_PROMO_TARGETS, [
          "peopleReachedSocialMedia",
          "promotionalActivitiesOnsite",
          "engagements",
        ], selectedYear)
      );

      fetchCestProjects(selectedYear);
      fetchSscpProjects(selectedYear);
      fetchDrrmEntries(selectedYear);
      await fetchTacsEntries(selectedYear);
      await fetchTechTrainingEntries(selectedYear);
      fetchTechPromoEntries(selectedYear);
      fetchTechRolloutEntries(selectedYear);
      fetchPackagingLabelingEntries(selectedYear);
      fetchCalibrationEntries(selectedYear);
      fetchStPromoEntries(selectedYear);
    };

    init();

    return () => { };
  }, [selectedYear]);

  const fetchProjects = async (year = selectedYear) => {
    try {
      const res = await axios.get(`${API}/projects`, {
        params: {
          page: 1,
          limit: 100000,
          year: String(year),
          district: "ALL",
          month: "ALL",
          municipality: "ALL",
          status: "ALL",
          search: "",
        },
      });

      const raw = res.data;

      // ✅ Supports old backend response: [...]
      // ✅ Supports new backend pagination response: { data: [...], total, totalPages }
      const rows = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
          ? raw.data
          : [];

      const normalized = rows.map((p) => {
        const dateApproved =
          (p.dateApproved ??
            p.date_approved ??
            p.dateProjectApproval ??
            p.date_project_approval ??
            p.approvedDate ??
            p.approved_date ??
            "") || "";

        const quarterFromDate = getQuarterFromDate(dateApproved);
        const quarter = String(p.quarter ?? quarterFromDate ?? "1");

        return {
          id: Number(p.id),
          projectTitle: p.projectTitle ?? p.project_title ?? "",
          quarter,
          firmName: p.firmName ?? p.firm_name ?? "",
          district: p.district ?? "",
          address: p.address ?? "",
          amount: Number(p.amount ?? 0),
          status: p.status ?? p.stpms_status ?? "",
          type: p.type ?? p.phase ?? "",
          dateApproved,

          interventions: Array.isArray(p.interventions)
            ? p.interventions.map((it) => ({
              id: Number(it.id),
              type: it.type ?? "",
              title: it.title ?? "",
              date: it.date ?? "",
              venue: it.venue ?? "",
              noOfFirms: Number(it.noOfFirms ?? it.no_of_firms ?? 0),
              male: Number(it.male ?? 0),
              female: Number(it.female ?? 0),
              total: Number(it.total ?? 0),
              notes: it.notes ?? "",
            }))
            : [],
        };
      });

      setProjects(normalized);

      const ids = normalized.map((p) => p.id);
      await fetchOtherIndicatorsForProjects(ids);
    } catch (e) {
      console.error("Failed to load SETUP projects from server.", e);
      setProjects([]);
      setOtherIndicatorsByProject({});
    }
  };
  useEffect(() => {
    fetchProjects(selectedYear);
  }, [selectedYear]);

  const accom = useMemo(() => {
    const blank = () => ({ q1: 0, q2: 0, q3: 0, q4: 0 });
    const addTo = (obj, quarter, value) => {
      if (quarter === 1) obj.q1 += value;
      if (quarter === 2) obj.q2 += value;
      if (quarter === 3) obj.q3 += value;
      if (quarter === 4) obj.q4 += value;
    };

    const interventions = blank();
    const customers = blank();
    const jobs = blank();
    const jobsIncreasePct = blank();
    const productivityPct = blank();
    const grossSales = blank();

    const pickQuarterVal = (qObj, q) => {
      if (q === 1) return toNumber(qObj.q1);
      if (q === 2) return toNumber(qObj.q2);
      if (q === 3) return toNumber(qObj.q3);
      if (q === 4) return toNumber(qObj.q4);
      return 0;
    };

    projects.forEach((p) => {
      const qApproved = getQuarterForProject(p);

      addTo(customers, qApproved, 1);

      const list = Array.isArray(p.interventions) ? p.interventions : [];
      list.forEach((it) => {
        const qIntv = getQuarterFromDate(it.date) ?? qApproved;
        addTo(interventions, qIntv, 1);
      });

      const qq = getQuarterForProject(p);
      const oi = getOI(p.id);

      addTo(jobs, qq, pickQuarterVal(oi.jobsGenerated, qq));
      addTo(jobsIncreasePct, qq, pickQuarterVal(oi.jobsIncreasePct, qq));
      addTo(productivityPct, qq, pickQuarterVal(oi.productivityPct, qq));
      addTo(grossSales, qq, pickQuarterVal(oi.grossSales, qq));
    });

    return { interventions, customers, jobs, jobsIncreasePct, productivityPct, grossSales };
  }, [projects, otherIndicatorsByProject]);

  const buildCestLikeAccom = (items) => {
    const blank = () => ({ q1: 0, q2: 0, q3: 0, q4: 0 });
    const addTo = (obj, quarter, value) => {
      if (quarter === 1) obj.q1 += value;
      if (quarter === 2) obj.q2 += value;
      if (quarter === 3) obj.q3 += value;
      if (quarter === 4) obj.q4 += value;
    };

    const communities = blank();
    const technologies = blank();
    const beneficiaries = blank();
    const interventions = blank();
    const technologiesPromoted = blank();
    const promotionalActivitiesPressRelease = blank();

    items.forEach((p) => {
      const projectDate = pickProjectDate(p);
      const projectYear = getYearFromDate(projectDate);
      if (Number(projectYear) !== Number(selectedYear)) return;

      const projectQuarter = getAutoQuarter(projectDate, p?.quarter);
      const intvArr = Array.isArray(p.interventions) ? p.interventions : [];

      addTo(communities, projectQuarter, toNumber(p.lguNumbersOfCommunities));
      addTo(promotionalActivitiesPressRelease, projectQuarter, toNumber(p.pressRelease));

      intvArr.forEach((it) => {
        const intvDate = pickInterventionDate(it);
        const intvYear = getYearFromDate(intvDate);
        if (Number(intvYear) !== Number(selectedYear)) return;

        const intvQuarter = getAutoQuarter(intvDate, projectQuarter);
        const type = String(it.type || "").trim();

        addTo(interventions, intvQuarter, 1);

        if (type === "Tech Roll Out") {
          addTo(technologies, intvQuarter, 1);
        }

        if (type === "Training") {
          addTo(beneficiaries, intvQuarter, toNumber(it.total));
        }

        if (type === "Tech Promo" || type === "S&T Promo") {
          addTo(
            technologiesPromoted,
            intvQuarter,
            toNumber(it.technologiesPromotedTotal) || 1
          );
        }
      });
    });

    return {
      communities,
      technologies,
      beneficiaries,
      interventions,
      technologiesPromoted,
      promotionalActivitiesPressRelease,
    };
  };

  const buildSscpAccom = (items) => {
    const blank = () => ({ q1: 0, q2: 0, q3: 0, q4: 0 });

    const addTo = (obj, quarter, value) => {
      if (quarter === 1) obj.q1 += value;
      if (quarter === 2) obj.q2 += value;
      if (quarter === 3) obj.q3 += value;
      if (quarter === 4) obj.q4 += value;
    };

    const smartCitiesEstablished = blank();
    const communitiesLgusAssisted = blank();
    const technologiesPromoted = blank();
    const technologiesAdopted = blank();
    const mouMoa = blank();

    items.forEach((p) => {
      const projectDate = pickProjectDate(p);
      const projectYear = getYearFromDate(projectDate);
      if (Number(projectYear) !== Number(selectedYear)) return;

      const projectQuarter = getAutoQuarter(projectDate, p?.quarter);
      const intvArr = Array.isArray(p.interventions) ? p.interventions : [];

      addTo(smartCitiesEstablished, projectQuarter, toNumber(p.smartCitiesEstablished));
      addTo(communitiesLgusAssisted, projectQuarter, toNumber(p.communitiesLgusAssisted));
      addTo(mouMoa, projectQuarter, toNumber(p.mouMoa));

      intvArr.forEach((it) => {
        const intvDate = pickInterventionDate(it);
        const intvYear = getYearFromDate(intvDate);
        if (Number(intvYear) !== Number(selectedYear)) return;

        const intvQuarter = getAutoQuarter(intvDate, projectQuarter);
        const type = String(it.type || "").trim();

        if (type === "Tech Promo" || type === "S&T Promo") {
          addTo(
            technologiesPromoted,
            intvQuarter,
            toNumber(it.technologiesPromotedTotal) || 1
          );
        }

        if (type === "Tech Roll Out") {
          addTo(technologiesAdopted, intvQuarter, 1);
        }
      });
    });

    return {
      smartCitiesEstablished,
      communitiesLgusAssisted,
      technologiesPromoted,
      technologiesAdopted,
      mouMoa,
    };
  };

  const cestAccom = useMemo(() => buildCestLikeAccom(cestProjects), [cestProjects, selectedYear]);
  const sscpAccom = useMemo(() => buildSscpAccom(sscpProjects), [sscpProjects, selectedYear]);

  const drrmAccom = useMemo(() => {
    const blank = () => ({ q1: 0, q2: 0, q3: 0, q4: 0 });

    const addTo = (obj, quarter, value) => {
      if (quarter === 1) obj.q1 += value;
      if (quarter === 2) obj.q2 += value;
      if (quarter === 3) obj.q3 += value;
      if (quarter === 4) obj.q4 += value;
    };

    const normalizeText = (value) =>
      String(value || "")
        .trim()
        .toLowerCase();

    const drrmActivitiesCount = blank();
    const drrmIecMaterialsCount = blank();

    const stakeholdersByQuarter = {
      1: new Set(),
      2: new Set(),
      3: new Set(),
      4: new Set(),
    };

    drrmActivities.forEach((entry) => {
      const q = getQuarterFromDate(entry?.dateStart) ?? 1;
      addTo(drrmActivitiesCount, q, 1);
    });

    drrmIecMaterials.forEach((entry) => {
      const q = getQuarterFromDate(entry?.date) ?? 1;
      const titles = Array.isArray(entry?.titles) ? entry.titles : [];
      addTo(drrmIecMaterialsCount, q, titles.length);
    });

    drrmCollaborations.forEach((entry) => {
      const q = getQuarterFromDate(entry?.date) ?? 1;
      const stakeholders = Array.isArray(entry?.stakeholders)
        ? entry.stakeholders
        : [];

      stakeholders.forEach((stakeholder) => {
        const cleanStakeholder = normalizeText(stakeholder);
        if (cleanStakeholder) stakeholdersByQuarter[q].add(cleanStakeholder);
      });
    });

    const drrmCollaborationsCount = {
      q1: stakeholdersByQuarter[1].size,
      q2: stakeholdersByQuarter[2].size,
      q3: stakeholdersByQuarter[3].size,
      q4: stakeholdersByQuarter[4].size,
    };

    return {
      drrmMainMeasures: {
        q1: drrmActivitiesCount.q1 + drrmIecMaterialsCount.q1,
        q2: drrmActivitiesCount.q2 + drrmIecMaterialsCount.q2,
        q3: drrmActivitiesCount.q3 + drrmIecMaterialsCount.q3,
        q4: drrmActivitiesCount.q4 + drrmIecMaterialsCount.q4,
      },
      drrmActivities: drrmActivitiesCount,
      drrmIecMaterials: drrmIecMaterialsCount,
      drrmCollaborations: drrmCollaborationsCount,
    };
  }, [drrmActivities, drrmIecMaterials, drrmCollaborations]);

  const tacsAccom = useMemo(() => {
    const blank = () => ({ q1: 0, q2: 0, q3: 0, q4: 0 });
    const addTo = (obj, quarter, value) => {
      if (quarter === 1) obj.q1 += value;
      if (quarter === 2) obj.q2 += value;
      if (quarter === 3) obj.q3 += value;
      if (quarter === 4) obj.q4 += value;
    };

    const customersAssisted = blank();
    const adviceRecommendations = blank();

    tacsEntries.forEach((e) => {
      const q = getQuarterFromDate(e?.dateOfEngagement) ?? 1;
      addTo(customersAssisted, q, 1);
      addTo(adviceRecommendations, q, toNumber(e?.adviceCount));
    });

    return { customersAssisted, adviceRecommendations };
  }, [tacsEntries]);

  const techPromoAccom = useMemo(() => {
    const blank = () => ({ q1: 0, q2: 0, q3: 0, q4: 0 });
    const addTo = (obj, quarter, value) => {
      if (quarter === 1) obj.q1 += value;
      if (quarter === 2) obj.q2 += value;
      if (quarter === 3) obj.q3 += value;
      if (quarter === 4) obj.q4 += value;
    };

    const technologiesPromoted = blank();
    const promotionalActivities = blank();
    const uniqTechByQ = {
      1: new Set(),
      2: new Set(),
      3: new Set(),
      4: new Set(),
    };

    techPromoEntries.forEach((e) => {
      const q = getQuarterFromDate(e?.activityDate) ?? 1;

      addTo(promotionalActivities, q, 1);

      const tech = String(e?.technologyPromoted || "").trim().toLowerCase();
      if (tech) uniqTechByQ[q].add(tech);
    });

    [1, 2, 3, 4].forEach((q) => {
      addTo(technologiesPromoted, q, uniqTechByQ[q].size);
    });

    return {
      technologiesPromoted,
      promotionalActivities,
    };
  }, [techPromoEntries]);

  const techTrainingAccom = useMemo(() => {
    const blank = () => ({ q1: 0, q2: 0, q3: 0, q4: 0 });
    const addTo = (obj, quarter, value) => {
      if (quarter === 1) obj.q1 += value;
      if (quarter === 2) obj.q2 += value;
      if (quarter === 3) obj.q3 += value;
      if (quarter === 4) obj.q4 += value;
    };

    const trainingsConducted = blank();
    const participantsReached = blank();

    const summary = techTrainingEntries.find((e) => e?.summaryMode);
    if (summary) {
      return {
        trainingsConducted: summary.trainingsConducted || blank(),
        participantsReached: summary.participantsReached || blank(),
      };
    }

    techTrainingEntries.forEach((e) => {
      const q = getQuarterFromDate(e?.startDate) ?? 1;
      const participantsTotal =
        toNumber(e?.totalParticipants) ||
        toNumber(e?.participantsFemale) + toNumber(e?.participantsMale);

      addTo(trainingsConducted, q, 1);
      addTo(participantsReached, q, participantsTotal);
    });

    return {
      trainingsConducted,
      participantsReached,
    };
  }, [techTrainingEntries]);

  const rowTotal = (o) => o.q1 + o.q2 + o.q3 + o.q4;

  const percentAnnual = (total, annualTarget) => {
    const at = toNumber(annualTarget);
    if (!at) return 0;
    return (total / at) * 100;
  };

  const techRolloutAccom = useMemo(() => {
    const summary = {
      kpi2TotalTransferred: { q1: 0, q2: 0, q3: 0, q4: 0 },
      kpi2DostTransferred: { q1: 0, q2: 0, q3: 0, q4: 0 },
      kpi3TotalAdopters: { q1: 0, q2: 0, q3: 0, q4: 0 },
      kpi3DostAdopters: { q1: 0, q2: 0, q3: 0, q4: 0 },
    };

    const adoptersByQuarter = {
      q1: new Set(),
      q2: new Set(),
      q3: new Set(),
      q4: new Set(),
    };

    const dostAdoptersByQuarter = {
      q1: new Set(),
      q2: new Set(),
      q3: new Set(),
      q4: new Set(),
    };

    const isDostDevelopedFunded = (value) => {
      const v = String(value || "").trim().toLowerCase();
      return ["yes", "y", "true", "1", "dost-developed", "dost funded", "dost-developed/funded", "dost developed", "funded"].includes(v);
    };

    techRolloutEntries.forEach((row) => {
      const qRaw = Number(row?.quarter);
      const q = [1, 2, 3, 4].includes(qRaw) ? `q${qRaw}` : null;
      if (!q) return;

      summary.kpi2TotalTransferred[q] += 1;

      const isDost = isDostDevelopedFunded(row?.isDostDevelopedFunded);
      if (isDost) {
        summary.kpi2DostTransferred[q] += 1;
      }

      const adopterKey = [row?.institutionName || "", row?.address || ""]
        .join(" | ")
        .trim();

      if (adopterKey) {
        adoptersByQuarter[q].add(adopterKey);
        if (isDost) {
          dostAdoptersByQuarter[q].add(adopterKey);
        }
      }
    });

    summary.kpi3TotalAdopters = {
      q1: adoptersByQuarter.q1.size,
      q2: adoptersByQuarter.q2.size,
      q3: adoptersByQuarter.q3.size,
      q4: adoptersByQuarter.q4.size,
    };

    summary.kpi3DostAdopters = {
      q1: dostAdoptersByQuarter.q1.size,
      q2: dostAdoptersByQuarter.q2.size,
      q3: dostAdoptersByQuarter.q3.size,
      q4: dostAdoptersByQuarter.q4.size,
    };

    return summary;
  }, [techRolloutEntries]);

  const packagingLabelingAccom = useMemo(() => {
    const blank = () => ({ q1: 0, q2: 0, q3: 0, q4: 0 });
    const addTo = (obj, quarter, value) => {
      if (quarter === 1) obj.q1 += value;
      if (quarter === 2) obj.q2 += value;
      if (quarter === 3) obj.q3 += value;
      if (quarter === 4) obj.q4 += value;
    };

    const trainingsConducted = blank();
    const firmsAssisted = blank();

    const uniqueFirmKeys = {
      1: new Set(),
      2: new Set(),
      3: new Set(),
      4: new Set(),
    };

    const isTrainingOrSeminar = (value) => {
      const v = String(value || "").trim().toLowerCase();
      return (
        v.includes("training") ||
        v.includes("seminar") ||
        v.includes("orientation") ||
        v.includes("workshop")
      );
    };

    packagingLabelingEntries.forEach((entry) => {
      const qRaw =
        Number(entry?.quarter) ||
        getQuarterFromDate(entry?.dateCompleted) ||
        null;

      if (![1, 2, 3, 4].includes(qRaw)) return;

      if (isTrainingOrSeminar(entry?.typeOfIntervention)) {
        addTo(trainingsConducted, qRaw, 1);
      }

      const firmKey = String(entry?.firmName || entry?.customerName || "")
        .trim()
        .toLowerCase();

      if (firmKey && !uniqueFirmKeys[qRaw].has(firmKey)) {
        uniqueFirmKeys[qRaw].add(firmKey);
        addTo(firmsAssisted, qRaw, 1);
      }
    });

    return {
      trainingsConducted,
      firmsAssisted,
    };
  }, [packagingLabelingEntries]);

  const calibrationAccom = useMemo(() => {
    const blank = () => ({ q1: 0, q2: 0, q3: 0, q4: 0 });
    const addTo = (obj, quarter, value) => {
      if (quarter === 1) obj.q1 += value;
      if (quarter === 2) obj.q2 += value;
      if (quarter === 3) obj.q3 += value;
      if (quarter === 4) obj.q4 += value;
    };

    const totalCalibratedMC = blank();
    const totalCalibratedVC = blank();
    const totalIncomeGenerated = blank();
    const totalAmountAssistance = blank();
    const totalCustomersAll = blank();

    calibrationEntries.forEach((entry) => {
      const q = getQuarterFromDate(entry?.date);
      if (![1, 2, 3, 4].includes(q)) return;

      const sampleType = String(entry?.typeOfSample || "").trim().toLowerCase();
      const category = String(entry?.category || "").trim().toUpperCase();

      if (sampleType === "weighing scale") {
        addTo(totalCalibratedMC, q, toNumber(entry?.noOfSample));
      }

      if (sampleType === "bucket") {
        addTo(totalCalibratedVC, q, toNumber(entry?.noOfSample));
      }

      if (category === "PAYING") {
        addTo(totalIncomeGenerated, q, toNumber(entry?.feesCollected));
      }

      if (category === "NON-PAYING") {
        addTo(totalAmountAssistance, q, toNumber(entry?.cost));
      }

      addTo(totalCustomersAll, q, toNumber(entry?.totalCustomers));
    });

    return {
      totalCalibratedMC,
      totalCalibratedVC,
      totalIncomeGenerated,
      totalAmountAssistance,
      totalCustomersAll,
    };
  }, [calibrationEntries]);

  const stPromoAccom = useMemo(() => {
    const blank = () => ({ q1: 0, q2: 0, q3: 0, q4: 0 });
    const addTo = (obj, quarter, value) => {
      if (quarter === 1) obj.q1 += value;
      if (quarter === 2) obj.q2 += value;
      if (quarter === 3) obj.q3 += value;
      if (quarter === 4) obj.q4 += value;
    };

    const peopleReachedSocialMedia = blank();
    const promotionalActivitiesOnsite = blank();
    const engagements = blank();

    stPromoEntries.forEach((entry) => {
      const q = getQuarterFromDate(entry?.date);
      if (![1, 2, 3, 4].includes(q)) return;

      const mode = String(entry?.entryMode || "").trim().toUpperCase();

      if (mode === "ONLINE") {
        addTo(peopleReachedSocialMedia, q, toNumber(entry?.peopleReached));
        addTo(engagements, q, toNumber(entry?.totalEngagements));
      }

      if (mode === "ONSITE") {
        addTo(promotionalActivitiesOnsite, q, 1);
      }
    });

    return {
      peopleReachedSocialMedia,
      promotionalActivitiesOnsite,
      engagements,
    };
  }, [stPromoEntries]);

  const TechRolloutSummaryRow = ({ label, targetObj, accomObj }) => {
    const safeTarget = targetObj || { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 };
    const safeAccom = accomObj || { q1: 0, q2: 0, q3: 0, q4: 0 };
    const total = rowTotal(safeAccom);
    const pct = percentAnnual(total, safeTarget.annual);

    return (
      <tr>
        <td style={styles.td}>{label}</td>
        <td style={styles.tdCenter}>{toNumber(safeTarget.annual)}</td>

        <td style={{ ...styles.tdCenter, ...styles.green }}>{toNumber(safeTarget.q1)}</td>
        <td style={{ ...styles.tdCenter, ...styles.green }}>{toNumber(safeTarget.q2)}</td>
        <td style={{ ...styles.tdCenter, ...styles.green }}>{toNumber(safeTarget.q3)}</td>
        <td style={{ ...styles.tdCenter, ...styles.green }}>{toNumber(safeTarget.q4)}</td>

        <td style={{ ...styles.tdCenter, ...styles.blue }}>{toNumber(safeAccom.q1)}</td>
        <td style={{ ...styles.tdCenter, ...styles.blue }}>{toNumber(safeAccom.q2)}</td>
        <td style={{ ...styles.tdCenter, ...styles.blue }}>{toNumber(safeAccom.q3)}</td>
        <td style={{ ...styles.tdCenter, ...styles.blue }}>{toNumber(safeAccom.q4)}</td>

        <td style={styles.tdCenter}>{toNumber(total)}</td>
        <td style={styles.tdCenter}>{pct.toFixed(2)}%</td>
      </tr>
    );
  };

  const styles = {
    page: { padding: 14, position: "relative", fontFamily },

    titleBar: {
      background: "#2f6fd6",
      color: "#fff",
      fontWeight: 900,
      padding: "10px 14px",
      letterSpacing: 0.5,
      fontSize: 22,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
      flexWrap: "wrap",
      borderRadius: 6,
      fontFamily,
    },

    tableWrap: { marginTop: 8, overflowX: "auto" },
    table: { width: "100%", borderCollapse: "collapse", minWidth: 1200, fontFamily },

    th: {
      border: "2px solid #6b7280",
      padding: 7,
      background: "#eef2f6",
      fontSize: 12,
      textAlign: "center",
      fontFamily,
      fontWeight: 700,
      whiteSpace: "nowrap",
    },
    td: {
      border: "2px solid #6b7280",
      padding: 7,
      fontSize: 12,
      fontFamily,
      verticalAlign: "top",
    },
    tdCenter: {
      border: "2px solid #6b7280",
      padding: 7,
      fontSize: 12,
      textAlign: "center",
      fontFamily,
      verticalAlign: "top",
    },

    green: { background: "#dff3df" },
    blue: { background: "#dbeafe" },
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
    },
    globalTitle: { fontSize: 22, fontWeight: 900, color: "#1e3a8a", fontFamily },
    globalSub: { fontSize: 12, color: "#64748b", marginTop: 4, fontFamily },
    fieldGroup: { display: "flex", flexDirection: "column", gap: 5 },
    label: { fontSize: 11, fontWeight: 800, color: "#475569", textTransform: "uppercase", fontFamily },
    yearPickerWrap: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      flexWrap: "wrap",
      position: "relative",
    },
    yearInput: {
      width: 132,
      padding: "10px 12px",
      border: "1px solid #cbd5e1",
      borderRadius: 10,
      fontSize: 18,
      fontWeight: 900,
      textAlign: "center",
      outline: "none",
      background: "#fff",
      boxSizing: "border-box",
      fontFamily,
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
      fontFamily,
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
      fontFamily,
    },
    yearBadge: {
      background: "#dbeafe",
      color: "#1e40af",
      padding: "4px 8px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 900,
      fontFamily,
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
      fontFamily,
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
      fontFamily,
    },
    yearModalClose: {
      background: "transparent",
      border: "1px solid rgba(255,255,255,0.7)",
      color: "#fff",
      borderRadius: 10,
      padding: "6px 10px",
      cursor: "pointer",
      fontWeight: 900,
      fontFamily,
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
      fontFamily,
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
      fontFamily,
    },
    yearModalOptionActive: {
      background: "#2563eb",
      border: "1px solid #1d4ed8",
      color: "#fff",
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
      fontFamily,
    },
    sectionGap: { marginTop: 28 },
    hidden: { display: "none" },
    accessNotice: {
      background: "#fff7ed",
      border: "1px solid #fed7aa",
      color: "#9a3412",
      borderRadius: 12,
      padding: 14,
      fontSize: 13,
      fontWeight: 800,
      fontFamily,
    },
  };

  const TARGETS = targets;
  const CEST_TARGETS = cestTargets;
  const SSCP_TARGETS = sscpTargets;
  const DRRM_TARGETS = drrmTargets;
  const TACS_TARGETS = tacsTargets;
  const TECH_PROMO_TARGETS = techPromoTargets;
  const TECH_TRAINING_TARGETS = techTrainingTargets;
  const PACKAGING_LABELING_TARGETS = packagingLabelingTargets;
  const CALIBRATION_TARGETS = calibrationTargets;
  const ST_PROMO_TARGETS = stPromoTargets;

  const KpiRow = ({ label, targetKey, accomObj, isMoney = false, isPercent = false }) => {
    const t = TARGETS[targetKey] || DEFAULT_TARGETS[targetKey];
    const total = rowTotal(accomObj);
    const pct = percentAnnual(total, t.annual);

    const showVal = (v) => {
      if (isMoney) return money(v);
      if (isPercent) return `${toNumber(v)}%`;
      return toNumber(v);
    };

    return (
      <tr>
        <td style={styles.td}>{label}</td>
        <td style={styles.tdCenter}>{showVal(t.annual)}</td>

        <td style={{ ...styles.tdCenter, ...styles.green }}>{showVal(t.q1)}</td>
        <td style={{ ...styles.tdCenter, ...styles.green }}>{showVal(t.q2)}</td>
        <td style={{ ...styles.tdCenter, ...styles.green }}>{showVal(t.q3)}</td>
        <td style={{ ...styles.tdCenter, ...styles.green }}>{showVal(t.q4)}</td>

        <td style={{ ...styles.tdCenter, ...styles.blue }}>{showVal(accomObj.q1)}</td>
        <td style={{ ...styles.tdCenter, ...styles.blue }}>{showVal(accomObj.q2)}</td>
        <td style={{ ...styles.tdCenter, ...styles.blue }}>{showVal(accomObj.q3)}</td>
        <td style={{ ...styles.tdCenter, ...styles.blue }}>{showVal(accomObj.q4)}</td>

        <td style={styles.tdCenter}>{showVal(total)}</td>
        <td style={styles.tdCenter}>{pct.toFixed(2)}%</td>
      </tr>
    );
  };

  const CestLikeKpiRow = ({ label, targetSet, defaultSet, targetKey, accomObj }) => {
    const t = targetSet[targetKey] || defaultSet[targetKey];
    const total = rowTotal(accomObj);
    const pct = percentAnnual(total, t.annual);

    const showVal = (v) => toNumber(v);

    return (
      <tr>
        <td style={styles.td}>{label}</td>
        <td style={styles.tdCenter}>{showVal(t.annual)}</td>

        <td style={{ ...styles.tdCenter, ...styles.green }}>{showVal(t.q1)}</td>
        <td style={{ ...styles.tdCenter, ...styles.green }}>{showVal(t.q2)}</td>
        <td style={{ ...styles.tdCenter, ...styles.green }}>{showVal(t.q3)}</td>
        <td style={{ ...styles.tdCenter, ...styles.green }}>{showVal(t.q4)}</td>

        <td style={{ ...styles.tdCenter, ...styles.blue }}>{showVal(accomObj.q1)}</td>
        <td style={{ ...styles.tdCenter, ...styles.blue }}>{showVal(accomObj.q2)}</td>
        <td style={{ ...styles.tdCenter, ...styles.blue }}>{showVal(accomObj.q3)}</td>
        <td style={{ ...styles.tdCenter, ...styles.blue }}>{showVal(accomObj.q4)}</td>

        <td style={styles.tdCenter}>{showVal(total)}</td>
        <td style={styles.tdCenter}>{pct.toFixed(2)}%</td>
      </tr>
    );
  };

  const TacsKpiRow = ({ label, targetKey, accomObj }) => {
    const t = TACS_TARGETS[targetKey] || DEFAULT_TACS_TARGETS[targetKey];
    const total = rowTotal(accomObj);
    const pct = percentAnnual(total, t.annual);

    const showVal = (v) => toNumber(v);

    return (
      <tr>
        <td style={styles.td}>{label}</td>
        <td style={styles.tdCenter}>{showVal(t.annual)}</td>

        <td style={{ ...styles.tdCenter, ...styles.green }}>{showVal(t.q1)}</td>
        <td style={{ ...styles.tdCenter, ...styles.green }}>{showVal(t.q2)}</td>
        <td style={{ ...styles.tdCenter, ...styles.green }}>{showVal(t.q3)}</td>
        <td style={{ ...styles.tdCenter, ...styles.green }}>{showVal(t.q4)}</td>

        <td style={{ ...styles.tdCenter, ...styles.blue }}>{showVal(accomObj.q1)}</td>
        <td style={{ ...styles.tdCenter, ...styles.blue }}>{showVal(accomObj.q2)}</td>
        <td style={{ ...styles.tdCenter, ...styles.blue }}>{showVal(accomObj.q3)}</td>
        <td style={{ ...styles.tdCenter, ...styles.blue }}>{showVal(accomObj.q4)}</td>

        <td style={styles.tdCenter}>{showVal(total)}</td>
        <td style={styles.tdCenter}>{pct.toFixed(2)}%</td>
      </tr>
    );
  };

  const TechPromoKpiRow = ({ label, targetKey, accomObj }) => {
    const t = TECH_PROMO_TARGETS[targetKey] || DEFAULT_TECH_PROMO_TARGETS[targetKey];
    const total = rowTotal(accomObj);
    const pct = percentAnnual(total, t.annual);

    const showVal = (v) => toNumber(v);

    return (
      <tr>
        <td style={styles.td}>{label}</td>
        <td style={styles.tdCenter}>{showVal(t.annual)}</td>

        <td style={{ ...styles.tdCenter, ...styles.green }}>{showVal(t.q1)}</td>
        <td style={{ ...styles.tdCenter, ...styles.green }}>{showVal(t.q2)}</td>
        <td style={{ ...styles.tdCenter, ...styles.green }}>{showVal(t.q3)}</td>
        <td style={{ ...styles.tdCenter, ...styles.green }}>{showVal(t.q4)}</td>

        <td style={{ ...styles.tdCenter, ...styles.blue }}>{showVal(accomObj.q1)}</td>
        <td style={{ ...styles.tdCenter, ...styles.blue }}>{showVal(accomObj.q2)}</td>
        <td style={{ ...styles.tdCenter, ...styles.blue }}>{showVal(accomObj.q3)}</td>
        <td style={{ ...styles.tdCenter, ...styles.blue }}>{showVal(accomObj.q4)}</td>

        <td style={styles.tdCenter}>{showVal(total)}</td>
        <td style={styles.tdCenter}>{pct.toFixed(2)}%</td>
      </tr>
    );
  };

  const TechTrainingKpiRow = ({ label, targetKey, accomObj }) => {
    const t = TECH_TRAINING_TARGETS[targetKey] || DEFAULT_TECH_TRAINING_TARGETS[targetKey];
    const total = rowTotal(accomObj);
    const pct = percentAnnual(total, t.annual);

    const showVal = (v) => toNumber(v);

    return (
      <tr>
        <td style={styles.td}>{label}</td>
        <td style={styles.tdCenter}>{showVal(t.annual)}</td>

        <td style={{ ...styles.tdCenter, ...styles.green }}>{showVal(t.q1)}</td>
        <td style={{ ...styles.tdCenter, ...styles.green }}>{showVal(t.q2)}</td>
        <td style={{ ...styles.tdCenter, ...styles.green }}>{showVal(t.q3)}</td>
        <td style={{ ...styles.tdCenter, ...styles.green }}>{showVal(t.q4)}</td>

        <td style={{ ...styles.tdCenter, ...styles.blue }}>{showVal(accomObj.q1)}</td>
        <td style={{ ...styles.tdCenter, ...styles.blue }}>{showVal(accomObj.q2)}</td>
        <td style={{ ...styles.tdCenter, ...styles.blue }}>{showVal(accomObj.q3)}</td>
        <td style={{ ...styles.tdCenter, ...styles.blue }}>{showVal(accomObj.q4)}</td>

        <td style={styles.tdCenter}>{showVal(total)}</td>
        <td style={styles.tdCenter}>{pct.toFixed(2)}%</td>
      </tr>
    );
  };

  const PackagingLabelingKpiRow = ({ label, targetKey, accomObj }) => {
    const t = PACKAGING_LABELING_TARGETS[targetKey] || DEFAULT_PACKAGING_LABELING_TARGETS[targetKey];
    const total = rowTotal(accomObj);
    const pct = percentAnnual(total, t.annual);

    const showVal = (v) => toNumber(v);

    return (
      <tr>
        <td style={styles.td}>{label}</td>
        <td style={styles.tdCenter}>{showVal(t.annual)}</td>

        <td style={{ ...styles.tdCenter, ...styles.green }}>{showVal(t.q1)}</td>
        <td style={{ ...styles.tdCenter, ...styles.green }}>{showVal(t.q2)}</td>
        <td style={{ ...styles.tdCenter, ...styles.green }}>{showVal(t.q3)}</td>
        <td style={{ ...styles.tdCenter, ...styles.green }}>{showVal(t.q4)}</td>

        <td style={{ ...styles.tdCenter, ...styles.blue }}>{showVal(accomObj.q1)}</td>
        <td style={{ ...styles.tdCenter, ...styles.blue }}>{showVal(accomObj.q2)}</td>
        <td style={{ ...styles.tdCenter, ...styles.blue }}>{showVal(accomObj.q3)}</td>
        <td style={{ ...styles.tdCenter, ...styles.blue }}>{showVal(accomObj.q4)}</td>

        <td style={styles.tdCenter}>{showVal(total)}</td>
        <td style={styles.tdCenter}>{pct.toFixed(2)}%</td>
      </tr>
    );
  };

  const CalibrationKpiRow = ({ label, targetKey, accomObj, isWhole = false }) => {
    const t = CALIBRATION_TARGETS[targetKey] || DEFAULT_CALIBRATION_TARGETS[targetKey];
    const total = rowTotal(accomObj);
    const pct = percentAnnual(total, t.annual);

    const showVal = (v) => (isWhole ? whole(v) : toNumber(v));

    return (
      <tr>
        <td style={styles.td}>{label}</td>
        <td style={styles.tdCenter}>{showVal(t.annual)}</td>

        <td style={{ ...styles.tdCenter, ...styles.green }}>{showVal(t.q1)}</td>
        <td style={{ ...styles.tdCenter, ...styles.green }}>{showVal(t.q2)}</td>
        <td style={{ ...styles.tdCenter, ...styles.green }}>{showVal(t.q3)}</td>
        <td style={{ ...styles.tdCenter, ...styles.green }}>{showVal(t.q4)}</td>

        <td style={{ ...styles.tdCenter, ...styles.blue }}>{showVal(accomObj.q1)}</td>
        <td style={{ ...styles.tdCenter, ...styles.blue }}>{showVal(accomObj.q2)}</td>
        <td style={{ ...styles.tdCenter, ...styles.blue }}>{showVal(accomObj.q3)}</td>
        <td style={{ ...styles.tdCenter, ...styles.blue }}>{showVal(accomObj.q4)}</td>

        <td style={styles.tdCenter}>{showVal(total)}</td>
        <td style={styles.tdCenter}>{pct.toFixed(2)}%</td>
      </tr>
    );
  };

  const StPromoKpiRow = ({ label, targetKey, accomObj }) => {
    const t = ST_PROMO_TARGETS[targetKey] || DEFAULT_ST_PROMO_TARGETS[targetKey];
    const total = rowTotal(accomObj);
    const pct = percentAnnual(total, t.annual);

    const showVal = (v) => toNumber(v);

    return (
      <tr>
        <td style={styles.td}>{label}</td>
        <td style={styles.tdCenter}>{showVal(t.annual)}</td>

        <td style={{ ...styles.tdCenter, ...styles.green }}>{showVal(t.q1)}</td>
        <td style={{ ...styles.tdCenter, ...styles.green }}>{showVal(t.q2)}</td>
        <td style={{ ...styles.tdCenter, ...styles.green }}>{showVal(t.q3)}</td>
        <td style={{ ...styles.tdCenter, ...styles.green }}>{showVal(t.q4)}</td>

        <td style={{ ...styles.tdCenter, ...styles.blue }}>{showVal(accomObj.q1)}</td>
        <td style={{ ...styles.tdCenter, ...styles.blue }}>{showVal(accomObj.q2)}</td>
        <td style={{ ...styles.tdCenter, ...styles.blue }}>{showVal(accomObj.q3)}</td>
        <td style={{ ...styles.tdCenter, ...styles.blue }}>{showVal(accomObj.q4)}</td>

        <td style={styles.tdCenter}>{showVal(total)}</td>
        <td style={styles.tdCenter}>{pct.toFixed(2)}%</td>
      </tr>
    );
  };


  const YearPicker = () => {
    const safeYear = normalizeYear(selectedYear);
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
      setSelectedYear(year);
      setYearPickerOpen(false);
    };

    return (
      <div style={styles.yearPickerWrap}>
        <button
          type="button"
          style={styles.yearStepBtn}
          onClick={() => setSelectedYear((prev) => normalizeYear(prev) - 1)}
          title="Previous year"
        >
          ◀
        </button>

        <button
          type="button"
          style={{ ...styles.yearInput, cursor: "pointer" }}
          onClick={() => {
            setYearPickerOpen(true);
          }}
          title="Open year picker"
        >
          {selectedYear} ▾
        </button>

        <button
          type="button"
          style={styles.yearStepBtn}
          onClick={() => setSelectedYear((prev) => normalizeYear(prev) + 1)}
          title="Next year"
        >
          ▶
        </button>

        <button
          type="button"
          style={styles.currentYearBtn}
          onClick={() => {
            setSelectedYear(currentYear);
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
                          setSelectedYear(y);
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

  return (
    <div style={styles.page}>
      <div style={styles.globalPanel}>
        <div style={styles.globalHeader}>
          <div>
            <div style={styles.globalTitle}>Accomplishment Summary</div>
            <div style={styles.globalSub}>
              View annual targets and computed accomplishments by selected year.
            </div>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Accomplishment Year</label>
            <YearPicker />
          </div>
        </div>
      </div>

      {!hasAnyVisibleSummary ? (
        <div style={styles.accessNotice}>
          Access Denied: Your account has Accomplishment Summary access, but no module summary permission is assigned yet.
        </div>
      ) : null}

      <div style={canViewSetup ? styles.titleBar : styles.hidden}>
        <div>SETUP</div>
        <div style={{ fontSize: 12, opacity: 0.95, fontWeight: 800, fontFamily }}>
          KPI Summary (auto-computed from Projects + Reports)
        </div>
      </div>

      <div style={canViewSetup ? styles.tableWrap : styles.hidden}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th} rowSpan={2}>KEY PERFORMANCE INDICATORS</th>
              <th style={styles.th} rowSpan={2}>ANNUAL TARGET</th>
              <th style={{ ...styles.th, ...styles.green }} colSpan={4}>QUARTERLY TARGET</th>
              <th style={{ ...styles.th, ...styles.blue }} colSpan={4}>ACCOMPLISHMENT</th>
              <th style={styles.th} rowSpan={2}>TOTAL</th>
              <th style={styles.th} rowSpan={2}>PERCENT ANNUAL ACCOMPLISHMENT</th>
            </tr>
            <tr>
              <th style={{ ...styles.th, ...styles.green }}>1Q</th>
              <th style={{ ...styles.th, ...styles.green }}>2Q</th>
              <th style={{ ...styles.th, ...styles.green }}>3Q</th>
              <th style={{ ...styles.th, ...styles.green }}>4Q</th>
              <th style={{ ...styles.th, ...styles.blue }}>1Q</th>
              <th style={{ ...styles.th, ...styles.blue }}>2Q</th>
              <th style={{ ...styles.th, ...styles.blue }}>3Q</th>
              <th style={{ ...styles.th, ...styles.blue }}>4Q</th>
            </tr>
          </thead>
          <tbody>
            <KpiRow label="No. of S&T interventions provided (total)" targetKey="interventions" accomObj={accom.interventions} />
            <KpiRow label="No. of customers assisted (total)" targetKey="customers" accomObj={accom.customers} />
            <KpiRow label="No. of Jobs Generated" targetKey="jobs" accomObj={accom.jobs} />
            <KpiRow label="% increase in jobs generated" targetKey="jobsIncreasePct" accomObj={accom.jobsIncreasePct} isPercent />
            <KpiRow label="% improvement in productivity" targetKey="productivityPct" accomObj={accom.productivityPct} isPercent />
            <KpiRow label="Amount of gross sales generated (in Php'000)" targetKey="grossSales" accomObj={accom.grossSales} isMoney />
          </tbody>
        </table>
      </div>

      <div style={canViewCest ? styles.sectionGap : styles.hidden}>
        <div style={styles.titleBar}>
          <div>CEST</div>
          <div style={{ fontSize: 12, opacity: 0.95, fontWeight: 800, fontFamily }}>
            KPI Summary (auto-computed from CEST Projects)
          </div>
        </div>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th} rowSpan={2}>KPI</th>
                <th style={styles.th} rowSpan={2}>ANNUAL TARGET</th>
                <th style={{ ...styles.th, ...styles.green }} colSpan={4}>QUARTERLY TARGET</th>
                <th style={{ ...styles.th, ...styles.blue }} colSpan={4}>ACCOMPLISHMENT</th>
                <th style={styles.th} rowSpan={2}>TOTAL</th>
                <th style={styles.th} rowSpan={2}>PERCENT ANNUAL ACCOMPLISHMENT</th>
              </tr>
              <tr>
                <th style={{ ...styles.th, ...styles.green }}>1Q</th>
                <th style={{ ...styles.th, ...styles.green }}>2Q</th>
                <th style={{ ...styles.th, ...styles.green }}>3Q</th>
                <th style={{ ...styles.th, ...styles.green }}>4Q</th>
                <th style={{ ...styles.th, ...styles.blue }}>1Q</th>
                <th style={{ ...styles.th, ...styles.blue }}>2Q</th>
                <th style={{ ...styles.th, ...styles.blue }}>3Q</th>
                <th style={{ ...styles.th, ...styles.blue }}>4Q</th>
              </tr>
            </thead>
            <tbody>
              <CestLikeKpiRow label="Number of communities assisted" targetSet={CEST_TARGETS} defaultSet={DEFAULT_CEST_TARGETS} targetKey="communities" accomObj={cestAccom.communities} />
              <CestLikeKpiRow label="Number of technologies deployed to communities" targetSet={CEST_TARGETS} defaultSet={DEFAULT_CEST_TARGETS} targetKey="technologies" accomObj={cestAccom.technologies} />
              <CestLikeKpiRow label="Number of beneficiaries" targetSet={CEST_TARGETS} defaultSet={DEFAULT_CEST_TARGETS} targetKey="beneficiaries" accomObj={cestAccom.beneficiaries} />
              <CestLikeKpiRow label="Number of S&T Intervention" targetSet={CEST_TARGETS} defaultSet={DEFAULT_CEST_TARGETS} targetKey="interventions" accomObj={cestAccom.interventions} />
              <CestLikeKpiRow label="No. of technologies promoted (total)" targetSet={CEST_TARGETS} defaultSet={DEFAULT_CEST_TARGETS} targetKey="technologiesPromoted" accomObj={cestAccom.technologiesPromoted} />
              <CestLikeKpiRow label="No. of S&T promotional activities conducted (total) press release - City/Municipal Level" targetSet={CEST_TARGETS} defaultSet={DEFAULT_CEST_TARGETS} targetKey="promotionalActivitiesPressRelease" accomObj={cestAccom.promotionalActivitiesPressRelease} />
            </tbody>
          </table>
        </div>
      </div>

      <div style={canViewSscp ? styles.sectionGap : styles.hidden}>
        <div style={styles.titleBar}>
          <div>SSCP</div>
          <div style={{ fontSize: 12, opacity: 0.95, fontWeight: 800, fontFamily }}>
            KPI Summary (auto-computed from SSCP Projects)
          </div>
        </div>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th} rowSpan={2}>KPI</th>
                <th style={styles.th} rowSpan={2}>ANNUAL TARGET</th>
                <th style={{ ...styles.th, ...styles.green }} colSpan={4}>QUARTERLY TARGET</th>
                <th style={{ ...styles.th, ...styles.blue }} colSpan={4}>ACCOMPLISHMENT</th>
                <th style={styles.th} rowSpan={2}>TOTAL</th>
                <th style={styles.th} rowSpan={2}>PERCENT ANNUAL ACCOMPLISHMENT</th>
              </tr>
              <tr>
                <th style={{ ...styles.th, ...styles.green }}>1Q</th>
                <th style={{ ...styles.th, ...styles.green }}>2Q</th>
                <th style={{ ...styles.th, ...styles.green }}>3Q</th>
                <th style={{ ...styles.th, ...styles.green }}>4Q</th>
                <th style={{ ...styles.th, ...styles.blue }}>1Q</th>
                <th style={{ ...styles.th, ...styles.blue }}>2Q</th>
                <th style={{ ...styles.th, ...styles.blue }}>3Q</th>
                <th style={{ ...styles.th, ...styles.blue }}>4Q</th>
              </tr>
            </thead>
            <tbody>
              <CestLikeKpiRow label="No. of smart cities established" targetSet={SSCP_TARGETS} defaultSet={DEFAULT_SSCP_TARGETS} targetKey="smartCitiesEstablished" accomObj={sscpAccom.smartCitiesEstablished} />
              <CestLikeKpiRow label="No. of communities / LGUs assisted" targetSet={SSCP_TARGETS} defaultSet={DEFAULT_SSCP_TARGETS} targetKey="communitiesLgusAssisted" accomObj={sscpAccom.communitiesLgusAssisted} />
              <CestLikeKpiRow label="No. of technologies promoted" targetSet={SSCP_TARGETS} defaultSet={DEFAULT_SSCP_TARGETS} targetKey="technologiesPromoted" accomObj={sscpAccom.technologiesPromoted} />
              <CestLikeKpiRow label="No. of technologies adopted" targetSet={SSCP_TARGETS} defaultSet={DEFAULT_SSCP_TARGETS} targetKey="technologiesAdopted" accomObj={sscpAccom.technologiesAdopted} />
              <CestLikeKpiRow label="No. of MOU / MOA" targetSet={SSCP_TARGETS} defaultSet={DEFAULT_SSCP_TARGETS} targetKey="mouMoa" accomObj={sscpAccom.mouMoa} />
            </tbody>
          </table>
        </div>
      </div>

      <div style={canViewDrrm ? styles.sectionGap : styles.hidden}>
        <div style={styles.titleBar}>
          <div>DRRM</div>
          <div style={{ fontSize: 12, opacity: 0.95, fontWeight: 800, fontFamily }}>
            KPI Summary (auto-computed from DRRM Entries)
          </div>
        </div>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th} rowSpan={2}>KPI</th>
                <th style={styles.th} rowSpan={2}>ANNUAL TARGET</th>
                <th style={{ ...styles.th, ...styles.green }} colSpan={4}>QUARTERLY TARGET</th>
                <th style={{ ...styles.th, ...styles.blue }} colSpan={4}>ACCOMPLISHMENT</th>
                <th style={styles.th} rowSpan={2}>TOTAL</th>
                <th style={styles.th} rowSpan={2}>PERCENT ANNUAL ACCOMPLISHMENT</th>
              </tr>
              <tr>
                <th style={{ ...styles.th, ...styles.green }}>1Q</th>
                <th style={{ ...styles.th, ...styles.green }}>2Q</th>
                <th style={{ ...styles.th, ...styles.green }}>3Q</th>
                <th style={{ ...styles.th, ...styles.green }}>4Q</th>
                <th style={{ ...styles.th, ...styles.blue }}>1Q</th>
                <th style={{ ...styles.th, ...styles.blue }}>2Q</th>
                <th style={{ ...styles.th, ...styles.blue }}>3Q</th>
                <th style={{ ...styles.th, ...styles.blue }}>4Q</th>
              </tr>
            </thead>
            <tbody>
              <CestLikeKpiRow label="No. of measures on disaster risk reduction and mitigation implemented / sector-specific learning and development interventions conducted" targetSet={DRRM_TARGETS} defaultSet={DEFAULT_DRRM_TARGETS} targetKey="drrmMainMeasures" accomObj={drrmAccom.drrmMainMeasures} />
              <CestLikeKpiRow label="a. Activities" targetSet={DRRM_TARGETS} defaultSet={DEFAULT_DRRM_TARGETS} targetKey="drrmActivities" accomObj={drrmAccom.drrmActivities} />
              <CestLikeKpiRow label="b. IEC materials used" targetSet={DRRM_TARGETS} defaultSet={DEFAULT_DRRM_TARGETS} targetKey="drrmIecMaterials" accomObj={drrmAccom.drrmIecMaterials} />
              <CestLikeKpiRow label="No. of DRRM-related collaborations with stakeholders" targetSet={DRRM_TARGETS} defaultSet={DEFAULT_DRRM_TARGETS} targetKey="drrmCollaborations" accomObj={drrmAccom.drrmCollaborations} />
            </tbody>
          </table>
        </div>
      </div>

      <div style={canViewTacs ? styles.sectionGap : styles.hidden}>
        <div style={styles.titleBar}>
          <div>TACS</div>
          <div style={{ fontSize: 12, opacity: 0.95, fontWeight: 800, fontFamily }}>
            KPI Summary (auto-computed from TACS Entries)
          </div>
        </div>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th} rowSpan={2}>KPI</th>
                <th style={styles.th} rowSpan={2}>ANNUAL TARGET</th>
                <th style={{ ...styles.th, ...styles.green }} colSpan={4}>QUARTERLY TARGET</th>
                <th style={{ ...styles.th, ...styles.blue }} colSpan={4}>ACCOMPLISHMENT</th>
                <th style={styles.th} rowSpan={2}>TOTAL</th>
                <th style={styles.th} rowSpan={2}>PERCENT ANNUAL ACCOMPLISHMENT</th>
              </tr>
              <tr>
                <th style={{ ...styles.th, ...styles.green }}>1Q</th>
                <th style={{ ...styles.th, ...styles.green }}>2Q</th>
                <th style={{ ...styles.th, ...styles.green }}>3Q</th>
                <th style={{ ...styles.th, ...styles.green }}>4Q</th>
                <th style={{ ...styles.th, ...styles.blue }}>1Q</th>
                <th style={{ ...styles.th, ...styles.blue }}>2Q</th>
                <th style={{ ...styles.th, ...styles.blue }}>3Q</th>
                <th style={{ ...styles.th, ...styles.blue }}>4Q</th>
              </tr>
            </thead>
            <tbody>
              <TacsKpiRow label="No. of customers assisted (total)" targetKey="customersAssisted" accomObj={tacsAccom.customersAssisted} />
              <TacsKpiRow label="No. of advice/recommendations (total)" targetKey="adviceRecommendations" accomObj={tacsAccom.adviceRecommendations} />
            </tbody>
          </table>
        </div>
      </div>

      <div style={canViewTechPromo ? styles.sectionGap : styles.hidden}>
        <div style={styles.titleBar}>
          <div>TECHNOLOGY PROMOTION</div>
          <div style={{ fontSize: 12, opacity: 0.95, fontWeight: 800, fontFamily }}>
            KPI Summary (auto-computed from Technology Promotion Entries)
          </div>
        </div>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th} rowSpan={2}>KPI</th>
                <th style={styles.th} rowSpan={2}>ANNUAL TARGET</th>
                <th style={{ ...styles.th, ...styles.green }} colSpan={4}>QUARTERLY TARGET</th>
                <th style={{ ...styles.th, ...styles.blue }} colSpan={4}>ACCOMPLISHMENT</th>
                <th style={styles.th} rowSpan={2}>TOTAL</th>
                <th style={styles.th} rowSpan={2}>PERCENT ANNUAL ACCOMPLISHMENT</th>
              </tr>
              <tr>
                <th style={{ ...styles.th, ...styles.green }}>1Q</th>
                <th style={{ ...styles.th, ...styles.green }}>2Q</th>
                <th style={{ ...styles.th, ...styles.green }}>3Q</th>
                <th style={{ ...styles.th, ...styles.green }}>4Q</th>
                <th style={{ ...styles.th, ...styles.blue }}>1Q</th>
                <th style={{ ...styles.th, ...styles.blue }}>2Q</th>
                <th style={{ ...styles.th, ...styles.blue }}>3Q</th>
                <th style={{ ...styles.th, ...styles.blue }}>4Q</th>
              </tr>
            </thead>
            <tbody>
              <TechPromoKpiRow label="No. of technologies promoted (total)" targetKey="technologiesPromoted" accomObj={techPromoAccom.technologiesPromoted} />
              <TechPromoKpiRow label="No. of S&T promotional activities conducted (total)" targetKey="promotionalActivities" accomObj={techPromoAccom.promotionalActivities} />
            </tbody>
          </table>
        </div>
      </div>

      <div style={canViewTechRollout ? styles.sectionGap : styles.hidden}>
        <div style={styles.titleBar}>
          <div>TECHNOLOGY ROLL OUT</div>
          <div style={{ fontSize: 12, opacity: 0.95, fontWeight: 800, fontFamily }}>
            KPI Summary
          </div>
        </div>

        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th} rowSpan={2}>KPI</th>
                <th style={styles.th} rowSpan={2}>ANNUAL TARGET</th>
                <th style={{ ...styles.th, ...styles.green }} colSpan={4}>QUARTERLY TARGET</th>
                <th style={{ ...styles.th, ...styles.blue }} colSpan={4}>ACCOMPLISHMENT</th>
                <th style={styles.th} rowSpan={2}>TOTAL</th>
                <th style={styles.th} rowSpan={2}>PERCENT ANNUAL ACCOMPLISHMENT</th>
              </tr>
              <tr>
                <th style={{ ...styles.th, ...styles.green }}>1Q</th>
                <th style={{ ...styles.th, ...styles.green }}>2Q</th>
                <th style={{ ...styles.th, ...styles.green }}>3Q</th>
                <th style={{ ...styles.th, ...styles.green }}>4Q</th>
                <th style={{ ...styles.th, ...styles.blue }}>1Q</th>
                <th style={{ ...styles.th, ...styles.blue }}>2Q</th>
                <th style={{ ...styles.th, ...styles.blue }}>3Q</th>
                <th style={{ ...styles.th, ...styles.blue }}>4Q</th>
              </tr>
            </thead>
            <tbody>
              <TechRolloutSummaryRow
                label="Total No. of knowledge/technologies transferred by commercialization, extension, public good"
                targetObj={techRolloutTargets.kpi2TotalTransferred}
                accomObj={techRolloutAccom.kpi2TotalTransferred}
              />
              <TechRolloutSummaryRow
                label="No. of DOST-developed/funded knowledge/technologies transferred by commercialization, extension, public good"
                targetObj={techRolloutTargets.kpi2DostTransferred}
                accomObj={techRolloutAccom.kpi2DostTransferred}
              />
              <TechRolloutSummaryRow
                label="Total No. of technology adopters"
                targetObj={techRolloutTargets.kpi3TotalAdopters}
                accomObj={techRolloutAccom.kpi3TotalAdopters}
              />
              <TechRolloutSummaryRow
                label="Total No. of technology adopters for DOST-developed/funded knowledge/technologies"
                targetObj={techRolloutTargets.kpi3DostAdopters}
                accomObj={techRolloutAccom.kpi3DostAdopters}
              />
            </tbody>
          </table>
        </div>
      </div>

      <div style={canViewTechTraining ? styles.sectionGap : styles.hidden}>
        <div style={styles.titleBar}>
          <div>TECHNOLOGY TRAINING</div>
          <div style={{ fontSize: 12, opacity: 0.95, fontWeight: 800, fontFamily }}>
            KPI Summary (auto-computed from Technology Training Entries)
          </div>
        </div>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th} rowSpan={2}>KPI</th>
                <th style={styles.th} rowSpan={2}>ANNUAL TARGET</th>
                <th style={{ ...styles.th, ...styles.green }} colSpan={4}>QUARTERLY TARGET</th>
                <th style={{ ...styles.th, ...styles.blue }} colSpan={4}>ACCOMPLISHMENT</th>
                <th style={styles.th} rowSpan={2}>TOTAL</th>
                <th style={styles.th} rowSpan={2}>PERCENT ANNUAL ACCOMPLISHMENT</th>
              </tr>
              <tr>
                <th style={{ ...styles.th, ...styles.green }}>1Q</th>
                <th style={{ ...styles.th, ...styles.green }}>2Q</th>
                <th style={{ ...styles.th, ...styles.green }}>3Q</th>
                <th style={{ ...styles.th, ...styles.green }}>4Q</th>
                <th style={{ ...styles.th, ...styles.blue }}>1Q</th>
                <th style={{ ...styles.th, ...styles.blue }}>2Q</th>
                <th style={{ ...styles.th, ...styles.blue }}>3Q</th>
                <th style={{ ...styles.th, ...styles.blue }}>4Q</th>
              </tr>
            </thead>
            <tbody>
              <TechTrainingKpiRow label="No. of trainings / seminars conducted" targetKey="trainingsConducted" accomObj={techTrainingAccom.trainingsConducted} />
              <TechTrainingKpiRow label="No. of participants reached" targetKey="participantsReached" accomObj={techTrainingAccom.participantsReached} />
            </tbody>
          </table>
        </div>
      </div>

      <div style={canViewPackaging ? styles.sectionGap : styles.hidden}>
        <div style={styles.titleBar}>
          <div>PACKAGING AND LABELING</div>
          <div style={{ fontSize: 12, opacity: 0.95, fontWeight: 800, fontFamily }}>
            KPI Summary (auto-computed from Packaging and Labeling Entries)
          </div>
        </div>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th} rowSpan={2}>KPI</th>
                <th style={styles.th} rowSpan={2}>ANNUAL TARGET</th>
                <th style={{ ...styles.th, ...styles.green }} colSpan={4}>QUARTERLY TARGET</th>
                <th style={{ ...styles.th, ...styles.blue }} colSpan={4}>ACCOMPLISHMENT</th>
                <th style={styles.th} rowSpan={2}>TOTAL</th>
                <th style={styles.th} rowSpan={2}>PERCENT ANNUAL ACCOMPLISHMENT</th>
              </tr>
              <tr>
                <th style={{ ...styles.th, ...styles.green }}>1Q</th>
                <th style={{ ...styles.th, ...styles.green }}>2Q</th>
                <th style={{ ...styles.th, ...styles.green }}>3Q</th>
                <th style={{ ...styles.th, ...styles.green }}>4Q</th>
                <th style={{ ...styles.th, ...styles.blue }}>1Q</th>
                <th style={{ ...styles.th, ...styles.blue }}>2Q</th>
                <th style={{ ...styles.th, ...styles.blue }}>3Q</th>
                <th style={{ ...styles.th, ...styles.blue }}>4Q</th>
              </tr>
            </thead>
            <tbody>
              <PackagingLabelingKpiRow
                label="No. of trainings / seminars conducted"
                targetKey="trainingsConducted"
                accomObj={packagingLabelingAccom.trainingsConducted}
              />
              <PackagingLabelingKpiRow
                label="No. of firms assisted"
                targetKey="firmsAssisted"
                accomObj={packagingLabelingAccom.firmsAssisted}
              />
            </tbody>
          </table>
        </div>
      </div>

      <div style={canViewCalibration ? styles.sectionGap : styles.hidden}>
        <div style={styles.titleBar}>
          <div>CALIBRATION</div>
          <div style={{ fontSize: 12, opacity: 0.95, fontWeight: 800, fontFamily }}>
            KPI Summary (auto-computed from Calibration Entries)
          </div>
        </div>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th} rowSpan={2}>KPI</th>
                <th style={styles.th} rowSpan={2}>ANNUAL TARGET</th>
                <th style={{ ...styles.th, ...styles.green }} colSpan={4}>QUARTERLY TARGET</th>
                <th style={{ ...styles.th, ...styles.blue }} colSpan={4}>ACCOMPLISHMENT</th>
                <th style={styles.th} rowSpan={2}>TOTAL</th>
                <th style={styles.th} rowSpan={2}>PERCENT ANNUAL ACCOMPLISHMENT</th>
              </tr>
              <tr>
                <th style={{ ...styles.th, ...styles.green }}>1Q</th>
                <th style={{ ...styles.th, ...styles.green }}>2Q</th>
                <th style={{ ...styles.th, ...styles.green }}>3Q</th>
                <th style={{ ...styles.th, ...styles.green }}>4Q</th>
                <th style={{ ...styles.th, ...styles.blue }}>1Q</th>
                <th style={{ ...styles.th, ...styles.blue }}>2Q</th>
                <th style={{ ...styles.th, ...styles.blue }}>3Q</th>
                <th style={{ ...styles.th, ...styles.blue }}>4Q</th>
              </tr>
            </thead>
            <tbody>
              <CalibrationKpiRow
                label="Total Calibrated (MC) No. of Samples"
                targetKey="totalCalibratedMC"
                accomObj={calibrationAccom.totalCalibratedMC}
              />
              <CalibrationKpiRow
                label="Total Calibrated (VC) No. of Samples"
                targetKey="totalCalibratedVC"
                accomObj={calibrationAccom.totalCalibratedVC}
              />
              <CalibrationKpiRow
                label="Total Income Generated (Paying)"
                targetKey="totalIncomeGenerated"
                accomObj={calibrationAccom.totalIncomeGenerated}
                isWhole
              />
              <CalibrationKpiRow
                label="Total Amount of Assistance (Non-Paying)"
                targetKey="totalAmountAssistance"
                accomObj={calibrationAccom.totalAmountAssistance}
                isWhole
              />
              <CalibrationKpiRow
                label="Total Customers"
                targetKey="totalCustomersAll"
                accomObj={calibrationAccom.totalCustomersAll}
              />
            </tbody>
          </table>
        </div>
      </div>
      <div style={canViewStPromo ? styles.sectionGap : styles.hidden}>
        <div style={styles.titleBar}>
          <div>S&amp;T PROMO</div>
          <div style={{ fontSize: 12, opacity: 0.95, fontWeight: 800, fontFamily }}>
            KPI Summary (auto-computed from S&amp;T Promo Entries)
          </div>
        </div>
        <div style={styles.tableWrap}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th} rowSpan={2}>KPI</th>
                <th style={styles.th} rowSpan={2}>ANNUAL TARGET</th>
                <th style={{ ...styles.th, ...styles.green }} colSpan={4}>QUARTERLY TARGET</th>
                <th style={{ ...styles.th, ...styles.blue }} colSpan={4}>ACCOMPLISHMENT</th>
                <th style={styles.th} rowSpan={2}>TOTAL</th>
                <th style={styles.th} rowSpan={2}>PERCENT ANNUAL ACCOMPLISHMENT</th>
              </tr>
              <tr>
                <th style={{ ...styles.th, ...styles.green }}>1Q</th>
                <th style={{ ...styles.th, ...styles.green }}>2Q</th>
                <th style={{ ...styles.th, ...styles.green }}>3Q</th>
                <th style={{ ...styles.th, ...styles.green }}>4Q</th>
                <th style={{ ...styles.th, ...styles.blue }}>1Q</th>
                <th style={{ ...styles.th, ...styles.blue }}>2Q</th>
                <th style={{ ...styles.th, ...styles.blue }}>3Q</th>
                <th style={{ ...styles.th, ...styles.blue }}>4Q</th>
              </tr>
            </thead>
            <tbody>
              <StPromoKpiRow
                label="KPI No. 1: No. of Reach (People Reached) of IEC Materials and Information on Social Media"
                targetKey="peopleReachedSocialMedia"
                accomObj={stPromoAccom.peopleReachedSocialMedia}
              />
              <StPromoKpiRow
                label="KPI No. 2: Total No. of S&amp;T Promotional Activities Conducted (Onsite)"
                targetKey="promotionalActivitiesOnsite"
                accomObj={stPromoAccom.promotionalActivitiesOnsite}
              />
              <StPromoKpiRow
                label="KPI No. 3: No. of Engagements"
                targetKey="engagements"
                accomObj={stPromoAccom.engagements}
              />
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
