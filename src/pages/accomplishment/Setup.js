import React, { useEffect, useMemo, useState } from "react";

export default function Setup() {
  const STORAGE_KEY = "setup_projects_v6";

  // KPI targets: display-only (0 lahat)
  const TARGETS = {
    interventions: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
    customers: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
    jobs: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
    jobsIncreasePct: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
    productivityPct: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
    grossSales: { annual: 0, q1: 0, q2: 0, q3: 0, q4: 0 },
  };

  const fontFamily =
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"';

  const INTERVENTION_OPTIONS = [
    "Training",
    "Tech Roll Out",
    "TACS",
    "Packaging & Labeling",
    "Calibration",
    "Plant Layout",
    "TNA Report",
  ];

  const [projects, setProjects] = useState([]);

  // Project modals
  const [showAdd, setShowAdd] = useState(false);
  const [editProjectId, setEditProjectId] = useState(null);
  const [viewProjectId, setViewProjectId] = useState(null);

  const [form, setForm] = useState({
    projectTitle: "",
    quarter: "1",
    firmName: "",
    cooperatorName: "",
    sex: "",
    district: "",
    address: "",
    funded: "N",
    amount: "",
    remarks: "",
  });

  // Intervention picker (per row) — for ADD only
  const [pickForId, setPickForId] = useState(null);

  // Selected intervention (per project) for Edit/Delete buttons beside Add
  const [selectedInterventionByProject, setSelectedInterventionByProject] = useState({});

  // Intervention details modal — for ADD/EDIT
  // { projectId, mode: "add"|"edit", entryId?: string }
  const [detailFor, setDetailFor] = useState(null);
  const [detailForm, setDetailForm] = useState({
    type: "",
    title: "",
    date: "",
    venue: "",
    noOfFirms: "",
    male: "",
    female: "",
    total: "",
    notes: "",
  });

  // Load storage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      setProjects(Array.isArray(parsed) ? parsed : []);
    } catch {
      setProjects([]);
    }
  }, []);

  // ESC closes modals
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setPickForId(null);
        setDetailFor(null);
        setShowAdd(false);
        setEditProjectId(null);
        setViewProjectId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

  const saveProjects = (next) => {
    setProjects(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  const resetForm = () => {
    setForm({
      projectTitle: "",
      quarter: "1",
      firmName: "",
      cooperatorName: "",
      sex: "",
      district: "",
      address: "",
      funded: "N",
      amount: "",
      remarks: "",
    });
  };

  const resetDetailForm = (type = "") => {
    setDetailForm({
      type: type || "",
      title: "",
      date: "",
      venue: "",
      noOfFirms: "",
      male: "",
      female: "",
      total: "",
      notes: "",
    });
  };

  // ===== PROJECT CRUD =====
  const openAddProject = () => {
    setEditProjectId(null);
    resetForm();
    setShowAdd(true);
  };

  const openEditProject = (id) => {
    const p = projects.find((x) => x.id === id);
    if (!p) return;
    setEditProjectId(id);
    setForm({
      projectTitle: p.projectTitle || "",
      quarter: String(p.quarter || "1"),
      firmName: p.firmName || "",
      cooperatorName: p.cooperatorName || "",
      sex: p.sex || "",
      district: p.district || "",
      address: p.address || "",
      funded: String(p.funded || "N").toUpperCase(),
      amount: p.amount ?? "",
      remarks: p.remarks || "",
    });
    setShowAdd(true);
  };

  const saveProject = () => {
    if (!form.projectTitle.trim()) return alert("Required: Project Title");
    if (!form.firmName.trim()) return alert("Required: Name of Firm");
    if (!form.cooperatorName.trim()) return alert("Required: Name of Cooperator");
    if (!form.address.trim()) return alert("Required: Address");
    if (form.amount === "" || Number.isNaN(Number(form.amount)))
      return alert("Required: Amount (number)");

    if (!editProjectId) {
      const p = {
        id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
        projectTitle: form.projectTitle.trim(),
        quarter: String(form.quarter || "1"),
        firmName: form.firmName.trim(),
        cooperatorName: form.cooperatorName.trim(),
        sex: form.sex.trim(),
        district: form.district.trim(),
        address: form.address.trim(),
        funded: String(form.funded || "N").toUpperCase(),
        amount: toNumber(form.amount),
        interventions: [],
        remarks: form.remarks.trim(),
      };
      saveProjects([...projects, p]);
    } else {
      const next = projects.map((p) => {
        if (p.id !== editProjectId) return p;
        return {
          ...p,
          projectTitle: form.projectTitle.trim(),
          quarter: String(form.quarter || "1"),
          firmName: form.firmName.trim(),
          cooperatorName: form.cooperatorName.trim(),
          sex: form.sex.trim(),
          district: form.district.trim(),
          address: form.address.trim(),
          funded: String(form.funded || "N").toUpperCase(),
          amount: toNumber(form.amount),
          remarks: form.remarks.trim(),
        };
      });
      saveProjects(next);
    }

    setShowAdd(false);
    setEditProjectId(null);
    resetForm();
  };

  const deleteProject = (id) => {
    if (!window.confirm("Delete this project?")) return;
    saveProjects(projects.filter((p) => p.id !== id));
  };

  // ===== INTERVENTION CRUD =====
  const openInterventionPicker = (projectId) => setPickForId(projectId);

  const openInterventionDetails_Add = (projectId, type) => {
    setPickForId(null);
    resetDetailForm(type);
    setDetailFor({ projectId, mode: "add" });
  };

  const openInterventionDetails_Edit = (projectId, entryId) => {
    const p = projects.find((x) => x.id === projectId);
    const entry = p?.interventions?.find((x) => x.id === entryId);
    if (!p || !entry) return;

    setDetailFor({ projectId, mode: "edit", entryId });
    setDetailForm({
      type: entry.type || "",
      title: entry.title || "",
      date: entry.date || "",
      venue: entry.venue || "",
      noOfFirms: entry.noOfFirms ?? "",
      male: entry.male ?? "",
      female: entry.female ?? "",
      total: entry.total ?? "",
      notes: entry.notes || "",
    });
  };

  const deleteIntervention = (projectId, entryId) => {
    if (!window.confirm("Delete this intervention entry?")) return;
    const next = projects.map((p) => {
      if (p.id !== projectId) return p;
      const arr = Array.isArray(p.interventions) ? p.interventions : [];
      return { ...p, interventions: arr.filter((x) => x.id !== entryId) };
    });

    // clear selection if deleted was selected
    setSelectedInterventionByProject((prev) => {
      if (prev[projectId] !== entryId) return prev;
      const { [projectId]: _, ...rest } = prev;
      return rest;
    });

    saveProjects(next);
  };

  const saveInterventionDetails = () => {
    if (!detailFor) return;

    const type = (detailForm.type || "").trim();
    const title = (detailForm.title || "").trim();
    if (!type) return alert("Missing intervention type");
    if (!title) return alert("Required: Title");

    const male = toNumber(detailForm.male);
    const female = toNumber(detailForm.female);
    const totalAuto = male + female;
    const total = detailForm.total !== "" ? toNumber(detailForm.total) : totalAuto;

    const entry = {
      id:
        detailFor.mode === "edit" && detailFor.entryId
          ? detailFor.entryId
          : `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      type,
      title,
      date: detailForm.date || "",
      venue: (detailForm.venue || "").trim(),
      noOfFirms: detailForm.noOfFirms === "" ? "" : toNumber(detailForm.noOfFirms),
      male: detailForm.male === "" ? "" : male,
      female: detailForm.female === "" ? "" : female,
      total: detailForm.total === "" ? totalAuto : total,
      notes: (detailForm.notes || "").trim(),
    };

    const next = projects.map((p) => {
      if (p.id !== detailFor.projectId) return p;
      const arr = Array.isArray(p.interventions) ? p.interventions : [];

      if (detailFor.mode === "add") {
        return { ...p, interventions: [...arr, entry] };
      }
      return { ...p, interventions: arr.map((x) => (x.id === entry.id ? entry : x)) };
    });

    saveProjects(next);

    // auto-select newly added/edited
    setSelectedInterventionByProject((prev) => ({ ...prev, [detailFor.projectId]: entry.id }));

    setDetailFor(null);
    resetDetailForm("");
  };

  // ===== KPI computations =====
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

    projects.forEach((p) => {
      const qq = Number(p.quarter);
      if (![1, 2, 3, 4].includes(qq)) return;

      const intvCount = Array.isArray(p.interventions) ? p.interventions.length : 0;
      addTo(interventions, qq, intvCount);

      addTo(customers, qq, 1);
      addTo(grossSales, qq, toNumber(p.amount));

      addTo(jobs, qq, 0);
      addTo(jobsIncreasePct, qq, 0);
      addTo(productivityPct, qq, 0);
    });

    return { interventions, customers, jobs, jobsIncreasePct, productivityPct, grossSales };
  }, [projects]);

  const rowTotal = (o) => o.q1 + o.q2 + o.q3 + o.q4;

  const percentAnnual = (total, annualTarget) => {
    const at = toNumber(annualTarget);
    if (!at) return 0;
    return (total / at) * 100;
  };

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
    table: { width: "100%", borderCollapse: "collapse", minWidth: 1200, fontFamily },

    th: {
      border: "2px solid #6b7280",
      padding: 8,
      background: "#eef2f6",
      fontSize: 12,
      textAlign: "center",
      fontFamily,
      fontWeight: 700,
    },
    td: { border: "2px solid #6b7280", padding: 8, fontSize: 12, fontFamily },
    tdCenter: { border: "2px solid #6b7280", padding: 8, fontSize: 12, textAlign: "center", fontFamily },
    tdRight: {
      border: "2px solid #6b7280",
      padding: 8,
      fontSize: 12,
      textAlign: "right",
      whiteSpace: "nowrap",
      fontFamily,
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
    },

    pillBtn: {
      border: "1px solid rgba(15, 23, 42, 0.18)",
      background: "#fff",
      padding: "6px 10px",
      borderRadius: 999,
      cursor: "pointer",
      fontWeight: 800,
      fontSize: 12,
      fontFamily,
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
    },

    modalBackdrop: {
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.4)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      zIndex: 999,
    },

    modal: {
      width: "min(900px, 100%)",
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

    modalBody: { padding: 16 },
    grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
    field: { display: "flex", flexDirection: "column", gap: 6 },
    label: { fontSize: 12, fontWeight: 700, color: "#0f172a", fontFamily },

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
    },

    pickModal: {
      width: "min(520px, 100%)",
      background: "white",
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      fontFamily,
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

    pickBody: { padding: 14, display: "grid", gap: 10 },

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
      width: "min(760px, 100%)",
      background: "white",
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
      fontFamily,
    },

    miniTableWrap: { overflowX: "auto", marginTop: 10 },
    miniTable: { width: "100%", borderCollapse: "collapse", minWidth: 680, fontFamily },

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
  };

  const KpiRow = ({ label, targetKey, accomObj, isMoney = false, isPercent = false }) => {
    const t = TARGETS[targetKey];
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

  const pickedProject = useMemo(
    () => projects.find((p) => p.id === pickForId) || null,
    [projects, pickForId]
  );

  const detailProject = useMemo(() => {
    if (!detailFor) return null;
    return projects.find((p) => p.id === detailFor.projectId) || null;
  }, [detailFor, projects]);

  const viewProject = useMemo(() => {
    if (!viewProjectId) return null;
    return projects.find((p) => p.id === viewProjectId) || null;
  }, [viewProjectId, projects]);

  return (
    <div style={styles.page}>
      <div style={styles.titleBar}>
        <div>SETUP</div>
        <div style={{ fontSize: 12, opacity: 0.95, fontWeight: 800, fontFamily }}>
          Add projects using the Add Project button
        </div>
      </div>

      {/* KPI TABLE */}
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
              <th style={{ ...styles.th, ...styles.blue }} colSpan={4}>
                ACCOMPLISHMENT
              </th>
              <th style={styles.th} rowSpan={2}>
                TOTAL
              </th>
              <th style={styles.th} rowSpan={2}>
                PERCENT ANNUAL ACCOMPLISHMENT
              </th>
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
            <KpiRow
              label="No. of S&T interventions provided (total)"
              targetKey="interventions"
              accomObj={accom.interventions}
            />
            <KpiRow
              label="No. of customers assisted (total)"
              targetKey="customers"
              accomObj={accom.customers}
            />
            <KpiRow label="No. of Jobs Generated" targetKey="jobs" accomObj={accom.jobs} />
            <KpiRow
              label="% increase in jobs generated"
              targetKey="jobsIncreasePct"
              accomObj={accom.jobsIncreasePct}
              isPercent
            />
            <KpiRow
              label="% improvement in productivity"
              targetKey="productivityPct"
              accomObj={accom.productivityPct}
              isPercent
            />
            <KpiRow
              label="Amount of gross sales generated (in Php'000)"
              targetKey="grossSales"
              accomObj={accom.grossSales}
              isMoney
            />
          </tbody>
        </table>
      </div>

      {/* APPROVED PROJECTS HEADER + ADD BUTTON */}
      <div style={styles.sectionTitleRow}>
        <div style={styles.sectionTitle}>2025 APPROVED PROJECTS</div>
        <button style={styles.addBtn} onClick={openAddProject}>
          + Add Project
        </button>
      </div>

      {/* APPROVED PROJECTS TABLE */}
      <div style={styles.tableWrap}>
        <table style={{ ...styles.table, minWidth: 1300 }}>
          <thead>
            <tr>
              <th style={styles.th}>NO.</th>
              <th style={styles.th}>PROJECT TITLE</th>
              <th style={styles.th}>NAME OF FIRM</th>
              <th style={styles.th}>NAME OF COOPERATOR</th>
              <th style={styles.th}>SEX</th>
              <th style={styles.th}>DISTRICT</th>
              <th style={styles.th}>ADDRESS</th>
              <th style={styles.th}>FUNDED</th>
              <th style={styles.th}>AMOUNT</th>
              <th style={styles.th}>S&amp;T INTERVENTION</th>
              <th style={styles.th}>ACTIONS</th>
            </tr>
          </thead>

          <tbody>
            {projects.length === 0 ? (
              <tr>
                <td style={styles.tdCenter} colSpan={11}>
                  Wala pang entries. Click “Add Project”.
                </td>
              </tr>
            ) : (
              projects.map((p, idx) => {
                const selectedId = selectedInterventionByProject[p.id] || "";
                return (
                  <tr key={p.id}>
                    <td style={styles.tdCenter}>{idx + 1}</td>
                    <td style={styles.td}>{p.projectTitle}</td>
                    <td style={styles.td}>{p.firmName}</td>
                    <td style={styles.td}>{p.cooperatorName}</td>
                    <td style={styles.tdCenter}>{p.sex}</td>
                    <td style={styles.tdCenter}>{p.district}</td>
                    <td style={styles.td}>{p.address}</td>
                    <td style={styles.tdCenter}>{String(p.funded).toUpperCase()}</td>
                    <td style={styles.tdRight}>{money(p.amount)}</td>

                    {/* ✅ S&T INTERVENTION: numbered list, select an item, buttons beside Add */}
                    <td style={styles.td}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {Array.isArray(p.interventions) && p.interventions.length > 0 ? (
                          <div style={{ display: "grid", gap: 6 }}>
                            {p.interventions.map((it, i) => {
                              const isSelected = selectedId === it.id;
                              return (
                                <button
                                  key={it.id}
                                  onClick={() =>
                                    setSelectedInterventionByProject((prev) => ({ ...prev, [p.id]: it.id }))
                                  }
                                  style={{
                                    textAlign: "left",
                                    background: isSelected ? "#e0f2fe" : "transparent",
                                    border: isSelected ? "1px solid #38bdf8" : "1px solid transparent",
                                    borderRadius: 8,
                                    padding: "4px 6px",
                                    cursor: "pointer",
                                    fontSize: 12,
                                    fontFamily,
                                  }}
                                  title={it.type || ""}
                                >
                                  {i + 1}. {it.title || it.type}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={{ fontSize: 12, opacity: 0.6 }}>—</div>
                        )}

                        <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                          <button style={styles.pillBtn} onClick={() => openInterventionPicker(p.id)}>
                            + Add
                          </button>

                          <button
                            style={styles.tinyBtn}
                            disabled={!selectedId}
                            onClick={() => openInterventionDetails_Edit(p.id, selectedId)}
                            title={!selectedId ? "Select an intervention first" : "Edit selected"}
                          >
                            Edit
                          </button>

                          <button
                            style={styles.dangerTiny}
                            disabled={!selectedId}
                            onClick={() => deleteIntervention(p.id, selectedId)}
                            title={!selectedId ? "Select an intervention first" : "Delete selected"}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* ✅ ACTIONS: View + Edit + Delete project */}
                    <td style={styles.tdCenter}>
                      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
                        <button style={styles.tinyBtn} onClick={() => setViewProjectId(p.id)}>
                          View
                        </button>
                        <button style={styles.tinyBtn} onClick={() => openEditProject(p.id)}>
                          Edit
                        </button>
                        <button style={styles.dangerBtn} onClick={() => deleteProject(p.id)}>
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

      {/* ===== PICK INTERVENTION MODAL ===== */}
      {pickForId && (
        <div style={styles.modalBackdrop} onClick={() => setPickForId(null)}>
          <div style={styles.pickModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.pickHeader}>
              <div>
                Add S&amp;T Intervention
                {pickedProject ? (
                  <span style={{ opacity: 0.9, fontWeight: 800 }}> — {pickedProject.projectTitle}</span>
                ) : null}
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
                onClick={() => setPickForId(null)}
              >
                ✕
              </button>
            </div>

            <div style={styles.pickBody}>
              {INTERVENTION_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  style={styles.optionBtn}
                  onClick={() => openInterventionDetails_Add(pickForId, opt)}
                >
                  {opt}
                </button>
              ))}
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                * Selecting a type will open the form.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== INTERVENTION DETAILS MODAL (ADD/EDIT) ===== */}
      {detailFor && (
        <div style={styles.modalBackdrop} onClick={() => setDetailFor(null)}>
          <div style={styles.detailsModal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>
                {detailFor.mode === "edit" ? "Edit" : "Add"} {detailForm.type} Details
                {detailProject ? (
                  <span style={{ opacity: 0.9, fontWeight: 800 }}> — {detailProject.projectTitle}</span>
                ) : null}
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
                onClick={() => setDetailFor(null)}
              >
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.grid}>
                <div style={styles.field}>
                  <div style={styles.label}>Intervention Type</div>
                  <input style={styles.input} value={detailForm.type} disabled />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Title *</div>
                  <input
                    style={styles.input}
                    value={detailForm.title}
                    onChange={(e) => setDetailForm({ ...detailForm, title: e.target.value })}
                    placeholder="e.g. Food Processing"
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Date</div>
                  <input
                    style={styles.input}
                    type="date"
                    value={detailForm.date}
                    onChange={(e) => setDetailForm({ ...detailForm, date: e.target.value })}
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Venue</div>
                  <input
                    style={styles.input}
                    value={detailForm.venue}
                    onChange={(e) => setDetailForm({ ...detailForm, venue: e.target.value })}
                  />
                </div>
              </div>

              <div style={styles.miniTableWrap}>
                <table style={styles.miniTable}>
                  <thead>
                    <tr>
                      <th style={styles.miniTh}>No. of Firms</th>
                      <th style={styles.miniTh}>Participants (Male)</th>
                      <th style={styles.miniTh}>Participants (Female)</th>
                      <th style={styles.miniTh}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={styles.miniTd}>
                        <input
                          style={{ ...styles.input, width: "100%" }}
                          type="number"
                          value={detailForm.noOfFirms}
                          onChange={(e) => setDetailForm({ ...detailForm, noOfFirms: e.target.value })}
                        />
                      </td>
                      <td style={styles.miniTd}>
                        <input
                          style={{ ...styles.input, width: "100%" }}
                          type="number"
                          value={detailForm.male}
                          onChange={(e) => setDetailForm({ ...detailForm, male: e.target.value })}
                        />
                      </td>
                      <td style={styles.miniTd}>
                        <input
                          style={{ ...styles.input, width: "100%" }}
                          type="number"
                          value={detailForm.female}
                          onChange={(e) => setDetailForm({ ...detailForm, female: e.target.value })}
                        />
                      </td>
                      <td style={styles.miniTd}>
                        <input
                          style={{ ...styles.input, width: "100%" }}
                          type="number"
                          value={
                            detailForm.total !== ""
                              ? detailForm.total
                              : String(toNumber(detailForm.male) + toNumber(detailForm.female) || "")
                          }
                          onChange={(e) => setDetailForm({ ...detailForm, total: e.target.value })}
                          placeholder="auto"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
                  * If Total is blank, it will auto-compute Male + Female on save.
                </div>
              </div>

              <div style={{ ...styles.field, marginTop: 10 }}>
                <div style={styles.label}>Notes / Remarks</div>
                <textarea
                  style={styles.textarea}
                  value={detailForm.notes}
                  onChange={(e) => setDetailForm({ ...detailForm, notes: e.target.value })}
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
              <button style={styles.btnDark} onClick={saveInterventionDetails}>
                {detailFor.mode === "edit" ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== VIEW PROJECT MODAL ===== */}
      {viewProjectId && viewProject && (
        <div style={styles.modalBackdrop} onClick={() => setViewProjectId(null)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div>View Project — {viewProject.projectTitle}</div>
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
                onClick={() => setViewProjectId(null)}
              >
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
                <div>
                  <b>Quarter:</b> {String(viewProject.quarter || "")}
                </div>
                <div>
                  <b>Firm:</b> {viewProject.firmName}
                </div>
                <div>
                  <b>Cooperator:</b> {viewProject.cooperatorName}
                </div>
                <div>
                  <b>Sex:</b> {viewProject.sex}
                </div>
                <div>
                  <b>District:</b> {viewProject.district}
                </div>
                <div>
                  <b>Address:</b> {viewProject.address}
                </div>
                <div>
                  <b>Funded:</b> {String(viewProject.funded).toUpperCase()}
                </div>
                <div>
                  <b>Amount:</b> {money(viewProject.amount)}
                </div>
                <div>
                  <b>Remarks:</b> {viewProject.remarks || "—"}
                </div>

                <div style={{ marginTop: 8 }}>
                  <b>S&amp;T Interventions:</b>
                  <div style={{ marginTop: 6, display: "grid", gap: 6 }}>
                    {(viewProject.interventions || []).length ? (
                      viewProject.interventions.map((it, i) => (
                        <div key={it.id} style={{ fontSize: 12 }}>
                          {i + 1}. [{it.type}] {it.title}
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: 12, opacity: 0.7 }}>—</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button style={styles.btnDark} onClick={() => setViewProjectId(null)}>
                Close
              </button>
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
                onClick={() => setShowAdd(false)}
              >
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.grid}>
                <div style={styles.field}>
                  <div style={styles.label}>Project Title *</div>
                  <input
                    style={styles.input}
                    value={form.projectTitle}
                    onChange={(e) => setForm({ ...form, projectTitle: e.target.value })}
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Quarter *</div>
                  <select
                    style={styles.input}
                    value={form.quarter}
                    onChange={(e) => setForm({ ...form, quarter: e.target.value })}
                  >
                    <option value="1">1Q</option>
                    <option value="2">2Q</option>
                    <option value="3">3Q</option>
                    <option value="4">4Q</option>
                  </select>
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Name of Firm *</div>
                  <input
                    style={styles.input}
                    value={form.firmName}
                    onChange={(e) => setForm({ ...form, firmName: e.target.value })}
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Name of Cooperator *</div>
                  <input
                    style={styles.input}
                    value={form.cooperatorName}
                    onChange={(e) => setForm({ ...form, cooperatorName: e.target.value })}
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Sex</div>
                  <select
                    style={styles.input}
                    value={form.sex}
                    onChange={(e) => setForm({ ...form, sex: e.target.value })}
                  >
                    <option value="">--</option>
                    <option value="M">M</option>
                    <option value="F">F</option>
                  </select>
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>District</div>
                  <input
                    style={styles.input}
                    value={form.district}
                    onChange={(e) => setForm({ ...form, district: e.target.value })}
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Address *</div>
                  <input
                    style={styles.input}
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                  />
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Funded (Y/N)</div>
                  <select
                    style={styles.input}
                    value={form.funded}
                    onChange={(e) => setForm({ ...form, funded: e.target.value })}
                  >
                    <option value="Y">Y</option>
                    <option value="N">N</option>
                  </select>
                </div>

                <div style={styles.field}>
                  <div style={styles.label}>Amount *</div>
                  <input
                    style={styles.input}
                    type="number"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </div>

                <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
                  <div style={styles.label}>Remarks</div>
                  <textarea
                    style={styles.textarea}
                    value={form.remarks}
                    onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  />
                </div>
              </div>
            </div>

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
              <button style={styles.btnDark} onClick={saveProject}>
                {editProjectId ? "Update Project" : "Save Project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}