import React, { useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";

const pageMeta = [
  {
    path: "/dashboard",
    title: "Dashboard",
    subtitle: "Overview of the system",
  },
  {
    path: "/target-setting",
    title: "Target Setting",
    subtitle: "Manage targets and expected outputs",
  },
  {
    path: "/accomplishment",
    title: "Accomplishment",
    subtitle: "View accomplishment summary",
    exact: true,
  },
  {
    path: "/accomplishment/setup",
    title: "SETUP",
    subtitle: "SETUP accomplishment records",
  },
  {
    path: "/accomplishment/cest",
    title: "CEST",
    subtitle: "CEST accomplishment records",
  },
  {
    path: "/accomplishment/sscp",
    title: "SSCP",
    subtitle: "SSCP accomplishment records",
  },
  {
    path: "/accomplishment/technology_rollout",
    title: "Technology Roll Out",
    subtitle: "Technology transfer records",
  },
  {
    path: "/accomplishment/technology_training",
    title: "Technology Training",
    subtitle: "Training records and participants",
  },
  {
    path: "/accomplishment/tacs",
    title: "TACS",
    subtitle: "Technical assistance and consultancy services",
  },
  {
    path: "/accomplishment/packaging_and_labeling",
    title: "Packaging & Labeling",
    subtitle: "Packaging support records",
  },
  {
    path: "/accomplishment/special_report",
    title: "Special Project",
    subtitle: "Special project records",
  },
  {
    path: "/accomplishment/promo",
    title: "S&T PROMO",
    subtitle: "Science and technology promotion records",
  },
  {
    path: "/accomplishment/technology_promotion",
    title: "Technology Promotion",
    subtitle: "Technology promotion activities",
  },
  {
    path: "/accomplishment/calibration",
    title: "Calibration",
    subtitle: "Calibration service records",
  },
  {
    path: "/accomplishment/drrm",
    title: "DRRM",
    subtitle: "Disaster Risk Reduction and Management records",
  },
  {
    path: "/user-mgmt",
    title: "User Management",
    subtitle: "Manage user accounts and access",
  },
  {
    path: "/table-management",
    title: "Table Management",
    subtitle: "Manage system dropdowns and table fields",
  },
   {
    path: "/about",
    title: "About",
    subtitle: "Information about the application",
  },
];

function getPageMeta(pathname) {
  const normalizedPathname = String(pathname || "").toLowerCase();

  for (const item of pageMeta) {
    const itemPath = String(item.path || "").toLowerCase();

    if (item.exact) {
      if (normalizedPathname === itemPath) return item;
    } else if (normalizedPathname.startsWith(itemPath)) {
      return item;
    }
  }

  return {
    title: "Page",
    subtitle: "Responsive layout with collapsible sidebar",
  };
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const currentPage = useMemo(
    () => getPageMeta(location.pathname),
    [location.pathname]
  );

  return (
    <div className="app-shell">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main">
        <header className="topbar">
          <button
            className="icon-btn mobile-only"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
            type="button"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <div className="topbar-title">
            <h1>{currentPage.title}</h1>
            <p className="muted">{currentPage.subtitle}</p>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}