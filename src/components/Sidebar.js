import React, { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

const Icon = ({ children }) => <span className="nav-icon">{children}</span>;

const icons = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 13h7V4H4v9Zm0 7h7v-5H4v5Zm9 0h7V11h-7v9Zm0-18v7h7V2h-7Z"
        fill="currentColor"
      />
    </svg>
  ),
  target: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2a10 10 0 1 0 10 10h-2A8 8 0 1 1 12 4V2Zm9 9h-9v9h2v-7h7v-2Z"
        fill="currentColor"
      />
    </svg>
  ),
  report: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 4h16v16H4V4Zm3 4h10v2H7V8Zm0 4h10v2H7v-2Zm0 4h7v2H7v-2Z"
        fill="currentColor"
      />
    </svg>
  ),
  users: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0Zm-4 6c-4.4 0-8 2-8 4v1h16v-1c0-2-3.6-4-8-4Z"
        fill="currentColor"
      />
    </svg>
  ),
  chevron: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

export default function Sidebar({ open, onClose }) {
  const [collapsed, setCollapsed] = useState(false);

  // normal dropdown (expanded)
  const [accOpen, setAccOpen] = useState(true);

  // flyout (collapsed)
  const [accFlyout, setAccFlyout] = useState(false);

  const location = useLocation();

  // Auto-open dropdown kapag nasa accomplishment routes (expanded state)
  useEffect(() => {
    if (location.pathname.startsWith("/accomplishment")) {
      setAccOpen(true);
    }
  }, [location.pathname]);

  const closeAll = () => {
    onClose?.();
    setAccFlyout(false);
  };

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""} ${open ? "open" : ""}`} aria-label="Sidebar navigation">
      <div className="sidebar-inner">
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-mark" aria-hidden="true">◆</div>
            {!collapsed && (
              <div className="logo-text">
                <div className="logo-name">DOST</div>
                <div className="logo-sub">Portal</div>
              </div>
            )}
          </div>

          <button
            className="icon-btn desktop-only"
            onClick={() => {
              setCollapsed((v) => !v);
              setAccFlyout(false);
            }}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <button className="icon-btn mobile-only" onClick={onClose} aria-label="Close sidebar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <nav className="nav">
          {/* Dashboard */}
          <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`} onClick={closeAll}>
            <Icon>{icons.dashboard}</Icon>
            {!collapsed && <span className="nav-label">Dashboard</span>}
          </NavLink>

          {/* Target Setting */}
          <NavLink to="/target-setting" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`} onClick={closeAll}>
            <Icon>{icons.target}</Icon>
            {!collapsed && <span className="nav-label">Target Setting</span>}
          </NavLink>

          {/* Accomplishment (Dropdown + Flyout) */}
          <div
            className="dropdown-wrap"
            onMouseEnter={() => collapsed && setAccFlyout(true)}
            onMouseLeave={() => collapsed && setAccFlyout(false)}
          >
            <button
              type="button"
              className={`nav-collapsible ${accOpen ? "open" : ""} ${collapsed ? "collapsed-btn" : ""}`}
              onClick={() => {
                if (collapsed) setAccFlyout((v) => !v);
                else setAccOpen((v) => !v);
              }}
            >
              <span className="nav-collapsible-left">
                <Icon>{icons.report}</Icon>
                {!collapsed && <span className="nav-label">Accomplishment Reporting</span>}
              </span>
              {!collapsed && <span className="chev">{icons.chevron}</span>}
            </button>

            {/* Submenu (expanded sidebar) */}
            {accOpen && !collapsed && (
              <div className="nav-sub">
                <NavLink to="/accomplishment/setup" className={({ isActive }) => `nav-sub-item ${isActive ? "active" : ""}`} onClick={closeAll}>
                  <span className="dot" /><span>Setup </span>
                </NavLink>
                 <NavLink to="/accomplishment/cest" className={({ isActive }) => `nav-sub-item ${isActive ? "active" : ""}`} onClick={closeAll}>
                  <span className="dot" /><span>CEST</span>
                </NavLink>
                <NavLink to="/accomplishment/sscp" className={({ isActive }) => `nav-sub-item ${isActive ? "active" : ""}`} onClick={closeAll}>
                  <span className="dot" /><span>SSCP</span>
                </NavLink>
                 <NavLink to="/accomplishment/technology rollout" className={({ isActive }) => `nav-sub-item ${isActive ? "active" : ""}`} onClick={closeAll}>
                  <span className="dot" /><span> Technology Roll Out</span>
                </NavLink>
                <NavLink to="/accomplishment/technology training" className={({ isActive }) => `nav-sub-item ${isActive ? "active" : ""}`} onClick={closeAll}>
                  <span className="dot" /><span> Technology Training</span>
                </NavLink>
                <NavLink to="/accomplishment/tacs" className={({ isActive }) => `nav-sub-item ${isActive ? "active" : ""}`} onClick={closeAll}>
                  <span className="dot" /><span>TACS</span>
                </NavLink>
                <NavLink to="/accomplishment/pcl" className={({ isActive }) => `nav-sub-item ${isActive ? "active" : ""}`} onClick={closeAll}>
                  <span className="dot" /><span>Packaging & Labeling</span>
                </NavLink>
                <NavLink to="/accomplishment/special-report" className={({ isActive }) => `nav-sub-item ${isActive ? "active" : ""}`} onClick={closeAll}>
                  <span className="dot" /><span>Special Project</span>
                </NavLink>
                <NavLink to="/accomplishment/sillag" className={({ isActive }) => `nav-sub-item ${isActive ? "active" : ""}`} onClick={closeAll}>
                  <span className="dot" /><span>SILLAG</span>
                </NavLink>
                <NavLink to="/accomplishment/promo" className={({ isActive }) => `nav-sub-item ${isActive ? "active" : ""}`} onClick={closeAll}>
                  <span className="dot" /><span>S&T PROMO</span>
                </NavLink>
                 <NavLink to="/accomplishment/calibration" className={({ isActive }) => `nav-sub-item ${isActive ? "active" : ""}`} onClick={closeAll}>
                  <span className="dot" /><span>Calibration</span>
                </NavLink>
              </div>
            )}

            {/* Flyout submenu (collapsed sidebar) */}
            {collapsed && accFlyout && (
              <div className="flyout">
                <div className="flyout-title">Accomplishment</div>

                <NavLink to="/accomplishment/setup" className="flyout-item" onClick={closeAll}>Setup</NavLink>
                <NavLink to="/accomplishment/cest" className="flyout-item" onClick={closeAll}>CEST</NavLink>
                <NavLink to="/accomplishment/sscp" className="flyout-item" onClick={closeAll}>SSCP</NavLink>
                <NavLink to="/accomplishment/technology rollout" className="flyout-item" onClick={closeAll}>Technology Roll Out</NavLink>
                <NavLink to="/accomplishment/technology training" className="flyout-item" onClick={closeAll}>Technology Training</NavLink>
                <NavLink to="/accomplishment/tacs" className="flyout-item" onClick={closeAll}>TACS</NavLink>
                <NavLink to="/accomplishment/pcl" className="flyout-item" onClick={closeAll}>PCL</NavLink>
                <NavLink to="/accomplishment/special-report" className="flyout-item" onClick={closeAll}>Special Project</NavLink>
                <NavLink to="/accomplishment/sillag" className="flyout-item" onClick={closeAll}>SILLAG</NavLink>
                <NavLink to="/accomplishment/promo" className="flyout-item" onClick={closeAll}> S&T PROMO</NavLink>
                <NavLink to="/accomplishment/calibration" className="flyout-item" onClick={closeAll}> Calibration</NavLink>
              </div>
            )}
          </div>

          {/* User Management */}
          <NavLink to="/user-mgmt" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`} onClick={closeAll}>
            <Icon>{icons.users}</Icon>
            {!collapsed && <span className="nav-label">User Management</span>}
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="user">
            <div className="avatar" aria-hidden="true">A</div>
            {!collapsed && (
              <div className="user-meta">
                <div className="user-name">Admin</div>
                <div className="muted">admin@dost.gov.ph</div>
              </div>
            )}
          </div>
          {!collapsed && <button className="footer-btn">Sign out</button>}
        </div>
      </div>
    </aside>
  );
}