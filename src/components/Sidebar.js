import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../usrmngment/auth/AuthContext";
import "./Sidebar.css";
import logoMark from "../assets/logo/dost_sinta_logo_mark.png";

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
      <path
        d="M9 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

export default function Sidebar({ open, onClose }) {
  const [collapsed, setCollapsed] = useState(false);

  const [taOpen, setTaOpen] = useState(true);
  const [taFlyout, setTaFlyout] = useState(false);

  const [accOpen, setAccOpen] = useState(true);
  const [accFlyout, setAccFlyout] = useState(false);

  const [mgmtOpen, setMgmtOpen] = useState(false);
  const [mgmtFlyout, setMgmtFlyout] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const auth = useAuth();
  const user = auth?.user || null;
  const logout = auth?.logout;

  const isAdmin = user?.role === "admin";
  const isSuperAdmin = user?.role === "superadmin";
  const isStaff = user?.role === "staff";
  const canSeeManagementDropdown = isSuperAdmin || isAdmin;

  useEffect(() => {
    if (location.pathname.startsWith("/accomplishment/")) {
      setAccOpen(true);
    }

    if (
      location.pathname.startsWith("/target-setting") ||
      location.pathname === "/accomplishment"
    ) {
      setTaOpen(true);
    }

    if (
      location.pathname.startsWith("/user-mgmt") ||
      location.pathname.startsWith("/table-management")
    ) {
      setMgmtOpen(true);
    }
  }, [location.pathname]);

  const isTargetSectionActive = useMemo(() => {
    return (
      location.pathname.startsWith("/target-setting") ||
      location.pathname === "/accomplishment"
    );
  }, [location.pathname]);

  const isAccomplishmentSectionActive = useMemo(() => {
    return location.pathname.startsWith("/accomplishment/");
  }, [location.pathname]);

  const isManagementActive = useMemo(() => {
    return (
      location.pathname.startsWith("/user-mgmt") ||
      location.pathname.startsWith("/table-management")
    );
  }, [location.pathname]);

  const closeAll = () => {
    onClose?.();
    setTaFlyout(false);
    setAccFlyout(false);
    setMgmtFlyout(false);
  };

  const handleSignOut = () => {
    if (typeof logout === "function") {
      logout();
    }

    closeAll();
    navigate("/login", { replace: true });
  };

  const roleLabel = isSuperAdmin
    ? "Super Admin"
    : isAdmin
    ? "Admin"
    : isStaff
    ? "User/Staff"
    : "User";

  const displayInitial =
    user?.fullName?.trim?.()?.charAt(0)?.toUpperCase() ||
    user?.username?.trim?.()?.charAt(0)?.toUpperCase() ||
    "A";

  return (
    <aside
      className={`sidebar ${collapsed ? "collapsed" : ""} ${open ? "open" : ""}`}
      aria-label="Sidebar navigation"
    >
      <div className="sidebar-inner">
        <div className="sidebar-header">
          {!collapsed && (
            <div className="logo">
              <img src={logoMark} alt="DOST SINTA logo" className="logo-image" />

              <div className="logo-text">
                <div className="logo-name">SINTA</div>
              </div>
            </div>
          )}

          <button
            className="icon-btn desktop-only"
            type="button"
            onClick={() => {
              setCollapsed((v) => !v);
              setTaFlyout(false);
              setAccFlyout(false);
              setMgmtFlyout(false);
            }}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M15 18l-6-6 6-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div className="sidebar-scroll">
          <nav className="nav">
            <NavLink
              to="/dashboard"
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
              onClick={closeAll}
            >
              <Icon>{icons.dashboard}</Icon>
              {!collapsed && <span className="nav-label">Dashboard</span>}
            </NavLink>

            <div
              className="dropdown-wrap"
              onMouseEnter={() => collapsed && setTaFlyout(true)}
              onMouseLeave={() => collapsed && setTaFlyout(false)}
            >
              <button
                type="button"
                className={`nav-collapsible ${taOpen ? "open" : ""} ${
                  collapsed ? "collapsed-btn" : ""
                } ${isTargetSectionActive ? "section-active" : ""}`}
                onClick={() => {
                  if (collapsed) setTaFlyout((v) => !v);
                  else setTaOpen((v) => !v);
                }}
              >
                <span className="nav-collapsible-left">
                  <Icon>{icons.target}</Icon>
                  {!collapsed && (
                    <span className="nav-label">Target and Accomplishment</span>
                  )}
                </span>
                {!collapsed && <span className="chev">{icons.chevron}</span>}
              </button>

              {taOpen && !collapsed && (
                <div className="nav-sub">
                  <NavLink
                    to="/target-setting"
                    className={({ isActive }) =>
                      `nav-sub-item ${isActive ? "active" : ""}`
                    }
                    onClick={closeAll}
                  >
                    <span className="dot" />
                    <span>Target Setting</span>
                  </NavLink>

                  <NavLink
                    to="/accomplishment"
                    end
                    className={({ isActive }) =>
                      `nav-sub-item ${isActive ? "active" : ""}`
                    }
                    onClick={closeAll}
                  >
                    <span className="dot" />
                    <span>Accomplishment</span>
                  </NavLink>
                </div>
              )}

              {collapsed && taFlyout && (
                <div className="flyout">
                  <div className="flyout-title">Target &amp; Accomplishment</div>

                  <NavLink
                    to="/target-setting"
                    className="flyout-item"
                    onClick={closeAll}
                  >
                    Target Setting
                  </NavLink>

                  <NavLink
                    to="/accomplishment"
                    end
                    className="flyout-item"
                    onClick={closeAll}
                  >
                    Accomplishment
                  </NavLink>
                </div>
              )}
            </div>

            <div
              className="dropdown-wrap"
              onMouseEnter={() => collapsed && setAccFlyout(true)}
              onMouseLeave={() => collapsed && setAccFlyout(false)}
            >
              <button
                type="button"
                className={`nav-collapsible ${accOpen ? "open" : ""} ${
                  collapsed ? "collapsed-btn" : ""
                } ${isAccomplishmentSectionActive ? "section-active" : ""}`}
                onClick={() => {
                  if (collapsed) setAccFlyout((v) => !v);
                  else setAccOpen((v) => !v);
                }}
              >
                <span className="nav-collapsible-left">
                  <Icon>{icons.report}</Icon>
                  {!collapsed && (
                    <span className="nav-label">Accomplishment Reporting</span>
                  )}
                </span>
                {!collapsed && <span className="chev">{icons.chevron}</span>}
              </button>

              {accOpen && !collapsed && (
                <div className="nav-sub">
                  
                  <NavLink
                    to="/accomplishment/setup"
                    className={({ isActive }) =>
                      `nav-sub-item ${isActive ? "active" : ""}`
                    }
                    onClick={closeAll}
                  >
                    <span className="dot" />
                    <span>SETUP</span>
                  </NavLink>

                  <NavLink
                    to="/accomplishment/cest"
                    className={({ isActive }) =>
                      `nav-sub-item ${isActive ? "active" : ""}`
                    }
                    onClick={closeAll}
                  >
                    <span className="dot" />
                    <span>CEST</span>
                  </NavLink>

                  <NavLink
                    to="/accomplishment/sscp"
                    className={({ isActive }) =>
                      `nav-sub-item ${isActive ? "active" : ""}`
                    }
                    onClick={closeAll}
                  >
                    <span className="dot" />
                    <span>SSCP</span>
                  </NavLink>

                  <NavLink
                    to="/accomplishment/drrm"
                    className={({ isActive }) =>
                      `nav-sub-item ${isActive ? "active" : ""}`
                    }
                    onClick={closeAll}
                  >
                    <span className="dot" />
                    <span>DRRM</span>
                  </NavLink>

                  <NavLink
                    to="/accomplishment/special_report"
                    className={({ isActive }) =>
                      `nav-sub-item ${isActive ? "active" : ""}`
                    }
                    onClick={closeAll}
                  >
                    <span className="dot" />
                    <span>Special Project</span>
                  </NavLink>

                  <NavLink
                    to="/accomplishment/calibration"
                    className={({ isActive }) =>
                      `nav-sub-item ${isActive ? "active" : ""}`
                    }
                    onClick={closeAll}
                  >
                    <span className="dot" />
                    <span>Calibration</span>
                  </NavLink>

                  <NavLink
                    to="/accomplishment/packaging_and_labeling"
                    className={({ isActive }) =>
                      `nav-sub-item ${isActive ? "active" : ""}`
                    }
                    onClick={closeAll}
                  >
                    <span className="dot" />
                    <span>Packaging &amp; Labeling</span>
                  </NavLink>

                  <NavLink
                    to="/accomplishment/promo"
                    className={({ isActive }) =>
                      `nav-sub-item ${isActive ? "active" : ""}`
                    }
                    onClick={closeAll}
                  >
                    <span className="dot" />
                    <span>S&amp;T PROMO</span>
                  </NavLink>

                  <NavLink
                    to="/accomplishment/tacs"
                    className={({ isActive }) =>
                      `nav-sub-item ${isActive ? "active" : ""}`
                    }
                    onClick={closeAll}
                  >
                    <span className="dot" />
                    <span>TACS</span>
                  </NavLink>

                  <NavLink
                    to="/accomplishment/technology_promotion"
                    className={({ isActive }) =>
                      `nav-sub-item ${isActive ? "active" : ""}`
                    }
                    onClick={closeAll}
                  >
                    <span className="dot" />
                    <span>Technology Promotion</span>
                  </NavLink>

                  <NavLink
                    to="/accomplishment/technology_rollout"
                    className={({ isActive }) =>
                      `nav-sub-item ${isActive ? "active" : ""}`
                    }
                    onClick={closeAll}
                  >
                    <span className="dot" />
                    <span>Technology Roll Out</span>
                  </NavLink>

                  <NavLink
                    to="/accomplishment/technology_training"
                    className={({ isActive }) =>
                      `nav-sub-item ${isActive ? "active" : ""}`
                    }
                    onClick={closeAll}
                  >
                    <span className="dot" />
                    <span>Technology Training</span>
                  </NavLink>
                </div>
              )}

              {collapsed && accFlyout && (
                <div className="flyout">
                  <div className="flyout-title">Accomplishment</div>

                  
                  <NavLink
                    to="/accomplishment/setup"
                    className="flyout-item"
                    onClick={closeAll}
                  >
                    SETUP
                  </NavLink>

                  <NavLink
                    to="/accomplishment/cest"
                    className="flyout-item"
                    onClick={closeAll}
                  >
                    CEST
                  </NavLink>

                  <NavLink
                    to="/accomplishment/sscp"
                    className="flyout-item"
                    onClick={closeAll}
                  >
                    SSCP
                  </NavLink>

                  <NavLink
                    to="/accomplishment/drrm"
                    className="flyout-item"
                    onClick={closeAll}
                  >
                    DRRM
                  </NavLink>

                  <NavLink
                    to="/accomplishment/special_report"
                    className="flyout-item"
                    onClick={closeAll}
                  >
                    Special Project
                  </NavLink>

                  <NavLink
                    to="/accomplishment/calibration"
                    className="flyout-item"
                    onClick={closeAll}
                  >
                    Calibration
                  </NavLink>

                  <NavLink
                    to="/accomplishment/packaging_and_labeling"
                    className="flyout-item"
                    onClick={closeAll}
                  >
                    Packaging &amp; Labeling
                  </NavLink>

                  <NavLink
                    to="/accomplishment/promo"
                    className="flyout-item"
                    onClick={closeAll}
                  >
                    S&amp;T PROMO
                  </NavLink>

                  <NavLink
                    to="/accomplishment/tacs"
                    className="flyout-item"
                    onClick={closeAll}
                  >
                    TACS
                  </NavLink>

                  <NavLink
                    to="/accomplishment/technology_promotion"
                    className="flyout-item"
                    onClick={closeAll}
                  >
                    Technology Promotion
                  </NavLink>

                  <NavLink
                    to="/accomplishment/technology_rollout"
                    className="flyout-item"
                    onClick={closeAll}
                  >
                    Technology Roll Out
                  </NavLink>

                  <NavLink
                    to="/accomplishment/technology_training"
                    className="flyout-item"
                    onClick={closeAll}
                  >
                    Technology Training
                  </NavLink>
                </div>
              )}
            </div>

            {canSeeManagementDropdown ? (
              <div
                className="dropdown-wrap"
                onMouseEnter={() => collapsed && setMgmtFlyout(true)}
                onMouseLeave={() => collapsed && setMgmtFlyout(false)}
              >
                <button
                  type="button"
                  className={`nav-collapsible ${mgmtOpen ? "open" : ""} ${
                    collapsed ? "collapsed-btn" : ""
                  } ${isManagementActive ? "section-active" : ""}`}
                  onClick={() => {
                    if (collapsed) setMgmtFlyout((v) => !v);
                    else setMgmtOpen((v) => !v);
                  }}
                >
                  <span className="nav-collapsible-left">
                    <Icon>{icons.users}</Icon>
                    {!collapsed && <span className="nav-label">Management</span>}
                  </span>
                  {!collapsed && <span className="chev">{icons.chevron}</span>}
                </button>

                {mgmtOpen && !collapsed && (
                  <div className="nav-sub">
                    <NavLink
                      to="/user-mgmt"
                      className={({ isActive }) =>
                        `nav-sub-item ${isActive ? "active" : ""}`
                      }
                      onClick={closeAll}
                    >
                      <span className="dot" />
                      <span>User Management</span>
                    </NavLink>

                    <NavLink
                      to="/table-management"
                      className={({ isActive }) =>
                        `nav-sub-item ${isActive ? "active" : ""}`
                      }
                      onClick={closeAll}
                    >
                      <span className="dot" />
                      <span>Table Management</span>
                    </NavLink>
                  </div>
                )}

                {collapsed && mgmtFlyout && (
                  <div className="flyout">
                    <div className="flyout-title">Management</div>

                    <NavLink
                      to="/user-mgmt"
                      className="flyout-item"
                      onClick={closeAll}
                    >
                      User Management
                    </NavLink>

                    <NavLink
                      to="/table-management"
                      className="flyout-item"
                      onClick={closeAll}
                    >
                      Table Management
                    </NavLink>
                  </div>
                )}
              </div>
            ) : (
              <NavLink
                to="/user-mgmt"
                className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
                onClick={closeAll}
              >
                <Icon>{icons.users}</Icon>
                {!collapsed && <span className="nav-label">User Management</span>}
              </NavLink>
            )}
          </nav>

          <div className="sidebar-footer">
            <div className="user">
              <div className="avatar" aria-hidden="true">
                {displayInitial}
              </div>

              {!collapsed && (
                <div className="user-meta">
                  <div className="user-name">{user?.fullName || "Admin"}</div>
                  <div className="muted">
                    {user?.username
                      ? `${user.username} • ${roleLabel}`
                      : "admin@dost.gov.ph"}
                  </div>
                </div>
              )}
            </div>

            {!collapsed && (
              <button className="footer-btn" type="button" onClick={handleSignOut}>
                Sign out
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
