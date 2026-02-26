import React, { useMemo, useState, useEffect } from "react";

export default function Setup() {
  const STORAGE_KEY = "setup_accomplishment_rows_v1";

  const defaultRows = [
    { kpi: "No. of S&T interventions provided (total)", annualTarget: "", t1: "", t2: "", t3: "", t4: "", a1: "", a2: "", a3: "", a4: "" },
    { kpi: "No. of customers assisted (total)", annualTarget: "", t1: "", t2: "", t3: "", t4: "", a1: "", a2: "", a3: "", a4: "" },
    { kpi: "No. of Jobs Generated", annualTarget: "", t1: "", t2: "", t3: "", t4: "", a1: "", a2: "", a3: "", a4: "" },
    { kpi: "% increase in jobs generated", annualTarget: "", t1: "", t2: "", t3: "", t4: "", a1: "", a2: "", a3: "", a4: "" },
    { kpi: "% improvement in productivity", annualTarget: "", t1: "", t2: "", t3: "", t4: "", a1: "", a2: "", a3: "", a4: "" },
    { kpi: "Amount of gross sales generated (in Php'000)", annualTarget: "", t1: "", t2: "", t3: "", t4: "", a1: "", a2: "", a3: "", a4: "" },
  ];

  const [rows, setRows] = useState(defaultRows);
  const [saveStatus, setSaveStatus] = useState("");

  // ✅ auto-load saved data on first render
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length) setRows(parsed);
      }
    } catch (e) {
      // ignore corrupt storage
    }
  }, []);

  const toNumber = (v) => {
    if (v === "" || v === null || v === undefined) return 0;
    const n = Number(String(v).replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const updateCell = (idx, key, value) => {
    setRows((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [key]: value }; // keep string so blank stays blank
      return next;
    });
  };

  const totalAccomp = (r) => toNumber(r.a1) + toNumber(r.a2) + toNumber(r.a3) + toNumber(r.a4);

  const percentAnnual = (r) => {
    const target = toNumber(r.annualTarget);
    if (!target) return 0;
    return (totalAccomp(r) / target) * 100;
  };

  const grand = useMemo(() => {
    const annualTarget = rows.reduce((s, r) => s + toNumber(r.annualTarget), 0);
    const a1 = rows.reduce((s, r) => s + toNumber(r.a1), 0);
    const a2 = rows.reduce((s, r) => s + toNumber(r.a2), 0);
    const a3 = rows.reduce((s, r) => s + toNumber(r.a3), 0);
    const a4 = rows.reduce((s, r) => s + toNumber(r.a4), 0);
    const total = a1 + a2 + a3 + a4;
    const percent = annualTarget ? (total / annualTarget) * 100 : 0;
    return { annualTarget, a1, a2, a3, a4, total, percent };
  }, [rows]);

  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
      setSaveStatus("✅ Saved!");
      setTimeout(() => setSaveStatus(""), 2000);
    } catch (e) {
      setSaveStatus("❌ Save failed");
      setTimeout(() => setSaveStatus(""), 2500);
    }
  };

  const handleLoad = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        setSaveStatus("⚠️ No saved data");
        setTimeout(() => setSaveStatus(""), 2000);
        return;
      }
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length) {
        setRows(parsed);
        setSaveStatus("✅ Loaded saved data");
      } else {
        setSaveStatus("⚠️ Saved data invalid");
      }
      setTimeout(() => setSaveStatus(""), 2000);
    } catch (e) {
      setSaveStatus("❌ Load failed");
      setTimeout(() => setSaveStatus(""), 2500);
    }
  };

  const handleClear = () => {
    setRows(defaultRows);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    setSaveStatus("🧹 Cleared");
    setTimeout(() => setSaveStatus(""), 2000);
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
    status: { fontSize: 12, fontWeight: 700, opacity: 0.95 },
    tableWrap: { marginTop: 10, overflowX: "auto" },
    table: { width: "100%", borderCollapse: "collapse", minWidth: 1100 },
    th: { border: "2px solid #6b7280", padding: 8, background: "#eef2f6", fontSize: 12, textAlign: "center" },
    td: { border: "2px solid #6b7280", padding: 8, fontSize: 12 },
    tdCenter: { border: "2px solid #6b7280", padding: 6, fontSize: 12, textAlign: "center" },
    green: { background: "#dff3df" },
    blue: { background: "#dbeafe" },
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
    totalRow: { background: "#f1f5f9", fontWeight: 800 },
  };

  return (
    <div style={styles.page}>
      <div style={styles.titleBar}>
        <div>SETUP</div>

        <div style={styles.btnRow}>
          <button style={styles.btn} onClick={handleSave}>Save</button>
          <button style={styles.btn} onClick={handleLoad}>Load Saved</button>
          <button style={styles.btn} onClick={handleClear}>Clear</button>
          {saveStatus ? <span style={styles.status}>{saveStatus}</span> : null}
        </div>
      </div>

      <div style={styles.tableWrap}>
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
            {rows.map((r, idx) => {
              const total = totalAccomp(r);
              const pct = percentAnnual(r);

              return (
                <tr key={idx}>
                  <td style={styles.td}>{r.kpi}</td>

                  <td style={styles.tdCenter}>
                    <input
                      style={styles.input}
                      type="number"
                      value={r.annualTarget}
                      onChange={(e) => updateCell(idx, "annualTarget", e.target.value)}
                    />
                  </td>

                  {["t1", "t2", "t3", "t4"].map((k) => (
                    <td key={k} style={{ ...styles.tdCenter, ...styles.green }}>
                      <input
                        style={styles.input}
                        type="number"
                        value={r[k]}
                        onChange={(e) => updateCell(idx, k, e.target.value)}
                      />
                    </td>
                  ))}

                  {["a1", "a2", "a3", "a4"].map((k) => (
                    <td key={k} style={{ ...styles.tdCenter, ...styles.blue }}>
                      <input
                        style={styles.input}
                        type="number"
                        value={r[k]}
                        onChange={(e) => updateCell(idx, k, e.target.value)}
                      />
                    </td>
                  ))}

                  <td style={styles.tdCenter}>{total}</td>
                  <td style={styles.tdCenter}>{pct.toFixed(2)}%</td>
                </tr>
              );
            })}

            <tr style={styles.totalRow}>
              <td style={styles.td}>TOTAL</td>
              <td style={styles.tdCenter}>{grand.annualTarget}</td>

              <td style={{ ...styles.tdCenter, ...styles.green }}>-</td>
              <td style={{ ...styles.tdCenter, ...styles.green }}>-</td>
              <td style={{ ...styles.tdCenter, ...styles.green }}>-</td>
              <td style={{ ...styles.tdCenter, ...styles.green }}>-</td>

              <td style={{ ...styles.tdCenter, ...styles.blue }}>{grand.a1}</td>
              <td style={{ ...styles.tdCenter, ...styles.blue }}>{grand.a2}</td>
              <td style={{ ...styles.tdCenter, ...styles.blue }}>{grand.a3}</td>
              <td style={{ ...styles.tdCenter, ...styles.blue }}>{grand.a4}</td>

              <td style={styles.tdCenter}>{grand.total}</td>
              <td style={styles.tdCenter}>{grand.percent.toFixed(2)}%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}