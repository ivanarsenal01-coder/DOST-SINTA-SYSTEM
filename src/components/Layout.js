import React, { useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";

const pageTitles = {
  "/dashboard": "Dashboard",
  "/home": "Home",
  "/about": "About",
  "/services": "Services",
  "/contact": "Contact",
};

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const title = useMemo(() => pageTitles[location.pathname] ?? "Page", [location.pathname]);

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main">
        <header className="topbar">
          <button
            className="icon-btn mobile-only"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>

          <div className="topbar-title">
            <h1>{title}</h1>
            <p className="muted">Responsive layout with collapsible sidebar</p>
          </div>

          <div className="topbar-actions">
            <button className="pill">Settings</button>
            <button className="pill primary">New</button>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>

      <div
        className={`backdrop ${sidebarOpen ? "show" : ""}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden={!sidebarOpen}
      />
    </div>
  );
}