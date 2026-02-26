import React from "react";

export default function Dashboard() {
  return (
    <div className="page">
      <div className="grid">
        <div className="card">
          <div className="card-title">Revenue</div>
          <div className="card-value">$48,920</div>
          <div className="muted">+12.4% vs last month</div>
        </div>
        <div className="card">
          <div className="card-title">Users</div>
          <div className="card-value">14,302</div>
          <div className="muted">+3.1% this week</div>
        </div>
        <div className="card">
          <div className="card-title">Uptime</div>
          <div className="card-value">99.98%</div>
          <div className="muted">Last 30 days</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title">Overview</div>
        <p className="muted" style={{ marginTop: 8 }}>
          This is a lightweight dashboard page. Add charts, tables, and widgets here.
        </p>
      </div>
    </div>
  );
}