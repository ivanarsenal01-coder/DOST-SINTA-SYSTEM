import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useAuth } from "../usrmngment/auth/AuthContext";
import API_BASE from "../api";

function unwrapUserResponse(data) {
  return data?.user || data;
}

async function getAccounts() {
  const res = await axios.get(`${API_BASE}/users`);
  return res.data;
}

async function createAccount(payload) {
  const res = await axios.post(`${API_BASE}/users`, payload);
  return unwrapUserResponse(res.data);
}

async function updateAccount(id, payload) {
  const res = await axios.put(`${API_BASE}/users/${id}`, payload);
  return unwrapUserResponse(res.data);
}

async function updateUserPermissions(id, permissions) {
  const res = await axios.put(`${API_BASE}/users/${id}/permissions`, permissions);
  return unwrapUserResponse(res.data);
}

async function activateAccount(id) {
  const res = await axios.put(`${API_BASE}/users/${id}/activate`);
  return unwrapUserResponse(res.data);
}

async function deactivateAccount(id) {
  const res = await axios.put(`${API_BASE}/users/${id}/deactivate`);
  return unwrapUserResponse(res.data);
}

async function deleteAccount(id) {
  const res = await axios.delete(`${API_BASE}/users/${id}`);
  return res.data;
}

const USERS_KEY = "um_accounts_v1";

const DEFAULT_AVATARS = [
  { id: "shield", label: "Shield", type: "emoji", value: "🛡️", bg: "#1f2937" },
  { id: "briefcase", label: "Briefcase", type: "emoji", value: "💼", bg: "#10b981" },
  { id: "scientist", label: "Scientist", type: "emoji", value: "🧪", bg: "#3b82f6" },
  { id: "person", label: "Person", type: "emoji", value: "🙂", bg: "#8b5cf6" },
  { id: "manager", label: "Manager", type: "emoji", value: "👨‍💼", bg: "#0ea5e9" },
  { id: "staff", label: "Staff", type: "emoji", value: "🧑‍💼", bg: "#22c55e" },
];

const PERMISSION_ACTIONS = ["view", "add", "edit", "delete", "export"];

const PAGE_KEYS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "targetSetting", label: "Target Setting" },
  { key: "accomplishments", label: "Accomplishments" },
  { key: "userManagement", label: "User Management" },
  { key: "tableManagement", label: "Table Management" },
  { key: "setup", label: "SETUP" },
  { key: "cest", label: "CEST" },
  { key: "sscp", label: "SSCP" },
  { key: "drrm", label: "DRRM" },
  { key: "specialProject", label: "Special Project" },
  { key: "calibration", label: "Calibration" },
  { key: "packaging", label: "Packaging & Labeling" },
  { key: "stPromo", label: "S&T Promo" },
  { key: "tacs", label: "TACS" },
  { key: "techPromo", label: "Tech Promo" },
  { key: "techRollout", label: "Tech Rollout" },
  { key: "techTraining", label: "Tech Training" },
];

const LEGACY_PAGE_KEY_MAP = {
  technologyTraining: "techTraining",
  training: "techTraining",
  pcl: "packaging",
  packagingLabeling: "packaging",
  promo: "stPromo",
  rollout: "techRollout",
  technologyRollout: "techRollout",
  sillag: "drrm",
};

const ACTIONS_BY_PAGE = {
  dashboard: ["view"],
  targetSetting: ["view", "add", "edit", "delete"],
  accomplishments: ["view"],
  userManagement: ["view", "add", "edit", "delete"],
  tableManagement: ["view", "add", "edit", "delete"],
  setup: ["view", "add", "edit", "delete", "export"],
  cest: ["view", "add", "edit", "delete", "export"],
  sscp: ["view", "add", "edit", "delete", "export"],
  drrm: ["view", "add", "edit", "delete", "export"],
  specialProject: ["view", "add", "edit", "delete", "export"],
  calibration: ["view", "add", "edit", "delete", "export"],
  packaging: ["view", "add", "edit", "delete", "export"],
  stPromo: ["view", "add", "edit", "delete", "export"],
  tacs: ["view", "add", "edit", "delete", "export"],
  techPromo: ["view", "add", "edit", "delete", "export"],
  techRollout: ["view", "add", "edit", "delete", "export"],
  techTraining: ["view", "add", "edit", "delete", "export"],
};

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function safeText(v, fallback = "") {
  return v == null || v === "" ? fallback : String(v);
}

function validatePasswordStrength(password, { required = false } = {}) {
  const value = String(password || "");

  if (!value) {
    return required ? "Password is required." : "";
  }

  if (value.length < 8) {
    return "Password must be at least 8 characters.";
  }

  if (!/[A-Z]/.test(value)) {
    return "Password must contain at least 1 uppercase letter.";
  }

  if (!/[a-z]/.test(value)) {
    return "Password must contain at least 1 lowercase letter.";
  }

  if (!/[0-9]/.test(value)) {
    return "Password must contain at least 1 number.";
  }

  return "";
}

function isActionAllowed(pageKey, action) {
  return (ACTIONS_BY_PAGE[pageKey] || []).includes(action);
}

function cleanPageAccess(pageKey, value = {}) {
  return PERMISSION_ACTIONS.reduce((acc, action) => {
    acc[action] = isActionAllowed(pageKey, action) ? !!value[action] : false;
    return acc;
  }, {});
}

function makeEmptyPermissions() {
  return PAGE_KEYS.reduce((acc, item) => {
    acc[item.key] = cleanPageAccess(item.key, {});
    return acc;
  }, {});
}

const EMPTY_PERMISSIONS = makeEmptyPermissions();

function applyLegacyPermissionKeys(raw = {}) {
  const merged = {};
  Object.entries(raw || {}).forEach(([key, value]) => {
    const mappedKey = LEGACY_PAGE_KEY_MAP[key] || key;
    if (!PAGE_KEYS.some((item) => item.key === mappedKey)) return;

    merged[mappedKey] = {
      ...(merged[mappedKey] || {}),
      ...(value || {}),
    };
  });
  return merged;
}

function normalizePermissions(user) {
  const merged = makeEmptyPermissions();
  const incoming = applyLegacyPermissionKeys(user?.permissions || {});

  Object.keys(incoming).forEach((key) => {
    merged[key] = cleanPageAccess(key, {
      ...merged[key],
      ...(incoming[key] || {}),
    });
  });

  if (user?.role === "superadmin") {
    Object.keys(merged).forEach((key) => {
      merged[key] = cleanPageAccess(
        key,
        PERMISSION_ACTIONS.reduce((acc, action) => {
          acc[action] = true;
          return acc;
        }, {})
      );
    });
  }

  if (user?.role === "admin") {
    merged.tableManagement = cleanPageAccess("tableManagement", {
      view: true,
      add: true,
      edit: true,
      delete: false,
      export: false,
    });
  }

  if (user?.role === "staff") {
    merged.tableManagement = cleanPageAccess("tableManagement", {});
  }

  merged.targetSetting = cleanPageAccess("targetSetting", merged.targetSetting);
  merged.accomplishments = cleanPageAccess("accomplishments", {
    view: !!merged.accomplishments?.view,
  });

  return merged;
}

function fullAccessPermissions() {
  return PAGE_KEYS.reduce((acc, item) => {
    acc[item.key] = cleanPageAccess(
      item.key,
      PERMISSION_ACTIONS.reduce((row, action) => {
        row[action] = true;
        return row;
      }, {})
    );
    return acc;
  }, {});
}

function defaultPermissionsForRole(role) {
  if (role === "superadmin") return fullAccessPermissions();

  if (role === "admin") {
    const full = fullAccessPermissions();

    full.dashboard = cleanPageAccess("dashboard", { view: true });
    full.targetSetting = cleanPageAccess("targetSetting", {
      view: true,
      add: true,
      edit: true,
      delete: false,
      export: false,
    });
    full.accomplishments = cleanPageAccess("accomplishments", { view: true });
    full.tableManagement = cleanPageAccess("tableManagement", {
      view: true,
      add: true,
      edit: true,
      delete: false,
      export: false,
    });

    PAGE_KEYS.forEach((item) => {
      if (item.key === "dashboard" || item.key === "targetSetting" || item.key === "accomplishments" || item.key === "tableManagement") return;
      full[item.key] = cleanPageAccess(item.key, {
        view: true,
        add: true,
        edit: true,
        delete: false,
        export: true,
      });
    });

    return full;
  }

  return {
    ...makeEmptyPermissions(),
    dashboard: cleanPageAccess("dashboard", { view: true }),
    targetSetting: cleanPageAccess("targetSetting", { view: true }),
    accomplishments: cleanPageAccess("accomplishments", { view: true }),
  };
}

function roleLabel(role) {
  if (role === "superadmin") return "Super Admin";
  if (role === "admin") return "Admin";
  return "User/Staff";
}

function roleBadgeStyle(role) {
  if (role === "superadmin") return { color: "#6d28d9", background: "#efe5ff", border: "1px solid #d8b4fe" };
  if (role === "admin") return { color: "#1d4ed8", background: "#dbeafe", border: "1px solid #bfdbfe" };
  return { color: "#374151", background: "#f3f4f6", border: "1px solid #d1d5db" };
}

function statusBadgeStyle(status) {
  return status === "active"
    ? { color: "#047857", background: "#dcfce7", border: "1px solid #86efac" }
    : { color: "#991b1b", background: "#fee2e2", border: "1px solid #fecaca" };
}

function getEditableModulesCount(user) {
  const pages = user?.permissions || {};
  return Object.values(pages).filter((p) => p?.add || p?.edit || p?.delete).length;
}

function accessSummary(user) {
  if (!user) return "—";
  if (user.role === "superadmin") return "Full access based on allowed actions";
  const allowed = PAGE_KEYS.filter((p) => user.permissions?.[p.key]?.view).map((p) => p.label);
  if (!allowed.length) return "No module access";
  return allowed.length > 2 ? `${allowed.slice(0, 2).join(", ")} +${allowed.length - 2}` : allowed.join(", ");
}

function buildFullName({ firstName = "", middleName = "", lastName = "", suffix = "" }) {
  const parts = [safeText(firstName).trim(), safeText(middleName).trim(), safeText(lastName).trim(), safeText(suffix).trim()].filter(Boolean);
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function deriveNameParts(fullName = "") {
  const clean = safeText(fullName).trim().replace(/\s+/g, " ");
  if (!clean) return { firstName: "", middleName: "", lastName: "", suffix: "" };
  const suffixes = ["Jr.", "Sr.", "II", "III", "IV", "V"];
  const rawParts = clean.split(" ");
  let suffix = "";
  if (rawParts.length > 1 && suffixes.includes(rawParts[rawParts.length - 1])) {
    suffix = rawParts.pop();
  }
  const firstName = rawParts[0] || "";
  const lastName = rawParts.length > 1 ? rawParts[rawParts.length - 1] : "";
  const middleName = rawParts.slice(1, rawParts.length > 1 ? -1 : 1).join(" ");
  return { firstName, middleName, lastName, suffix };
}

function normalizeUserShape(user) {
  const parts = deriveNameParts(user?.fullName || "");
  const next = {
    ...user,
    firstName: safeText(user?.firstName, parts.firstName),
    middleName: safeText(user?.middleName, parts.middleName),
    lastName: safeText(user?.lastName, parts.lastName),
    suffix: safeText(user?.suffix, parts.suffix),
  };
  const normalizedRole = safeText(user?.role, "staff");
  return {
    ...next,
    role: normalizedRole,
    fullName: safeText(user?.fullName, buildFullName(next)),
    canManageDropdowns: normalizedRole === "superadmin" || normalizedRole === "admin",
    permissions: normalizePermissions({ ...next, role: normalizedRole }),
  };
}

const SAMPLE_USERS = [
  {
    id: 1,
    fullName: "Super Admin",
    username: "superadmin",
    password: "1234",
    email: "superadmin@dost.gov.ph",
    contactNumber: "09123456789",
    role: "superadmin",
    status: "active",
    position: "System Owner",
    office: "Main Office",
    createdBy: "System Seed",
    createdAt: "2026-03-28 09:00",
    lastLogin: "2026-03-30 14:35",
    canManageDropdowns: true,
    avatar: { ...DEFAULT_AVATARS[0] },
    assigned: 0,
    completed: 0,
    pending: 0,
    editedRecords: 9,
    permissions: defaultPermissionsForRole("superadmin"),
  },
  {
    id: 2,
    fullName: "Main Admin",
    username: "admin",
    password: "1234",
    email: "admin@dost.gov.ph",
    contactNumber: "09120000002",
    role: "admin",
    status: "active",
    position: "Administrator",
    office: "Provincial Office",
    createdBy: "Super Admin",
    createdAt: "2026-03-28 09:20",
    lastLogin: "2026-03-30 15:00",
    canManageDropdowns: true,
    avatar: { ...DEFAULT_AVATARS[4] },
    assigned: 2,
    completed: 1,
    pending: 1,
    editedRecords: 5,
    permissions: defaultPermissionsForRole("admin"),
  },
  {
    id: 3,
    fullName: "Juan Dela Cruz",
    username: "juan",
    password: "1234",
    email: "juan@dost.gov.ph",
    contactNumber: "09190000001",
    role: "staff",
    status: "active",
    position: "Project Staff",
    office: "Operations Unit",
    createdBy: "Main Admin",
    createdAt: "2026-03-28 10:00",
    lastLogin: "2026-03-30 10:18",
    canManageDropdowns: false,
    avatar: { ...DEFAULT_AVATARS[5] },
    assigned: 1,
    completed: 0,
    pending: 0,
    editedRecords: 2,
    permissions: {
      ...defaultPermissionsForRole("staff"),
      setup: cleanPageAccess("setup", { view: true, add: true, edit: true }),
      calibration: cleanPageAccess("calibration", { view: true, add: true }),
    },
  },
];

const SAMPLE_AUDIT_LOGS = [
  { id: 1, actor: "superadmin", actorRole: "superadmin", action: "Created account", target: "Main Admin", module: "User Management", when: "2026-03-28 09:20" },
  { id: 2, actor: "admin", actorRole: "admin", action: "Assigned staff to project", target: "Juan Dela Cruz", module: "SETUP", when: "2026-03-29 08:15" },
  { id: 3, actor: "juan", actorRole: "staff", action: "Edited calibration record", target: "Calibration #12", module: "Calibration", when: "2026-03-30 10:20" },
];

const SAMPLE_DELETED = [
  { id: 1, actor: "superadmin", actorRole: "superadmin", project: "SETUP Project A", deletedBy: "Super Admin", reason: "Duplicate entry", when: "2026-03-30 09:10" },
  { id: 2, actor: "admin", actorRole: "admin", project: "Calibration Project B", deletedBy: "Main Admin", reason: "Wrong project status", when: "2026-03-30 11:00" },
];

const SAMPLE_ASSIGNMENTS = [
  { id: 1, actor: "admin", actorRole: "admin", project: "SETUP Project 1", assignee: "Juan Dela Cruz", action: "Assigned", when: "2026-03-29 08:15" },
  { id: 2, actor: "juan", actorRole: "staff", project: "Calibration Project 12", assignee: "Juan Dela Cruz", action: "Worked on update", when: "2026-03-30 10:20" },
];

function makeNewAccountForm(currentRole = "superadmin") {
  return {
    firstName: "",
    middleName: "",
    lastName: "",
    suffix: "",
    username: "",
    password: "",
    email: "",
    contactNumber: "",
    role: currentRole === "admin" ? "staff" : "staff",
    status: "active",
    position: "",
    office: "",
    avatar: clone(DEFAULT_AVATARS[3]),
  };
}

function fileToCompressedDataUrl(file, maxSize = 420, quality = 0.78) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type?.startsWith("image/")) {
      reject(new Error("Please upload a valid image file."));
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Unable to read image file."));

    reader.onload = () => {
      const img = new Image();

      img.onerror = () => reject(new Error("Unable to load image file."));

      img.onload = () => {
        const ratio = Math.min(1, maxSize / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * ratio));
        const height = Math.max(1, Math.round(img.height * ratio));

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL("image/jpeg", quality));
      };

      img.src = reader.result;
    };

    reader.readAsDataURL(file);
  });
}

function renderAvatar(avatar, size = 72) {
  const boxStyle = {
    width: size,
    height: size,
    borderRadius: "999px",
    overflow: "hidden",
    background: avatar?.bg || "#e5e7eb",
    display: "grid",
    placeItems: "center",
    color: "#fff",
    fontSize: size * 0.42,
    fontWeight: 800,
    boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.35)",
  };
  if (avatar?.type === "upload" && avatar?.value) {
    return <img src={avatar.value} alt="Profile" style={{ ...boxStyle, objectFit: "cover" }} />;
  }
  return <div style={boxStyle}>{avatar?.value || "🙂"}</div>;
}

function EmptyState({ text }) {
  return (
    <div style={{ padding: 18, textAlign: "center", color: "#6b7280", fontSize: 13 }}>
      {text}
    </div>
  );
}

function ModalShell({ title, onClose, children, width = 980, zIndex = 1200 }) {
  return (
    <div style={{ ...styles.overlay, zIndex }}>
      <div style={{ ...styles.modal, maxWidth: width }}>
        <div style={styles.modalHeader}>
          <div style={styles.modalTitle}>{title}</div>
          <button type="button" style={styles.iconCloseBtn} onClick={onClose}>×</button>
        </div>
        <div style={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}

function PermissionMatrix({ permissions, onChange, editable = false, role = "staff" }) {
  function isLocked(pageKey, action) {
    if (!isActionAllowed(pageKey, action)) return true;
    if (role === "admin" && pageKey === "tableManagement" && ["view", "add", "edit"].includes(action)) return true;
    if (role === "staff" && pageKey === "tableManagement") return true;
    return false;
  }

  function checkedValue(pageKey, action) {
    if (role === "admin" && pageKey === "tableManagement") {
      return ["view", "add", "edit"].includes(action);
    }
    if (role === "staff" && pageKey === "tableManagement") return false;
    return !!permissions?.[pageKey]?.[action];
  }

  return (
    <div style={styles.permissionTableWrap}>
      <div style={styles.permissionHeaderRow}>
        <div style={styles.permissionModuleHead}>Module</div>
        {PERMISSION_ACTIONS.map((action) => (
          <div key={action} style={styles.permissionActionHead}>
            {action.charAt(0).toUpperCase() + action.slice(1)}
          </div>
        ))}
      </div>

      {PAGE_KEYS.map((page) => (
        <div key={page.key} style={styles.permissionRow}>
          <div style={styles.permissionModuleName}>
            <div>{page.label}</div>
            {page.key === "targetSetting" ? <span style={styles.permissionNote}>No export / print</span> : null}
            {page.key === "accomplishments" ? <span style={styles.permissionNote}>View only</span> : null}
          </div>

          {PERMISSION_ACTIONS.map((action) => {
            const allowed = isActionAllowed(page.key, action);
            const locked = isLocked(page.key, action);

            return (
              <label
                key={`${page.key}-${action}`}
                style={allowed ? styles.permissionCheckCell : styles.permissionCheckCellDisabled}
                title={!allowed ? "Not available for this module" : locked ? "Locked by role/module rule" : ""}
              >
                {allowed ? (
                  <input
                    type="checkbox"
                    checked={checkedValue(page.key, action)}
                    disabled={!editable || locked}
                    onChange={(e) => {
                      if (!editable || locked) return;
                      onChange?.(page.key, action, e.target.checked);
                    }}
                    style={styles.permissionCheckbox}
                  />
                ) : (
                  <span style={styles.notAllowedMark}>—</span>
                )}
              </label>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default function UserMgmt() {
  const [deleteConfirmState, setDeleteConfirmState] = useState(null);

  const requestDeleteConfirm = (message = "This action cannot be undone.", title = "Confirm Delete", confirmText = "Delete") =>
    new Promise((resolve) => {
      setDeleteConfirmState({ message, title, confirmText, resolve });
    });

  const cancelDeleteConfirm = () => {
    if (deleteConfirmState?.resolve) deleteConfirmState.resolve(false);
    setDeleteConfirmState(null);
  };

  const proceedDeleteConfirm = () => {
    if (deleteConfirmState?.resolve) deleteConfirmState.resolve(true);
    setDeleteConfirmState(null);
  };

  const auth = useAuth();
  const currentUser = auth?.user || null;
  const fileInputRef = useRef(null);
  const addFileInputRef = useRef(null);

  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tab, setTab] = useState("accounts");
  const [logRoleFilter, setLogRoleFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);

  const [viewUser, setViewUser] = useState(null);
  const [visiblePasswordUserId, setVisiblePasswordUserId] = useState(null);
  const [showAllDetails, setShowAllDetails] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [privilegeUser, setPrivilegeUser] = useState(null);
  const [privilegeDraft, setPrivilegeDraft] = useState(null);
  const [imagePreviewUser, setImagePreviewUser] = useState(null);
  const [showAvatarPickerFor, setShowAvatarPickerFor] = useState(null);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [addForm, setAddForm] = useState(() => makeNewAccountForm(currentUser?.role));
  const [addError, setAddError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState("");

  async function loadUsers() {
    setLoading(true);
    setPageError("");
    try {
      const data = await getAccounts();
      const normalized = Array.isArray(data)
        ? data.map((u) => normalizeUserShape(u))
        : [];

      setUsers(normalized);
    } catch (e) {
      console.error("Load user accounts error:", e);
      setPageError(e?.response?.data?.message || e?.message || "Hindi ma-load ang accounts mula sa database.");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  /* Old localStorage seeding disabled. Database is primary; localStorage is fallback only. */
  /*
  useEffect(() => {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) {
          const normalized = parsed.map((u) => normalizeUserShape(u));
          setUsers(normalized);
          localStorage.setItem(USERS_KEY, JSON.stringify(normalized));
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }
    const seeded = SAMPLE_USERS.map((u) => normalizeUserShape(u));
    localStorage.setItem(USERS_KEY, JSON.stringify(seeded));
    setUsers(seeded);
  }, []);
  */

  useEffect(() => {
    if (!currentUser || !users.length) return;
    const match =
      users.find((u) => u.username === currentUser.username) ||
      users.find((u) => u.role === currentUser.role) ||
      users[0];
    setSelectedUser(match || null);
  }, [currentUser, users]);

  const visibleUsers = useMemo(() => {
    const role = currentUser?.role || "superadmin";
    let base = [...users];
    if (role === "admin" || role === "staff") {
      base = base.filter((u) => u.role !== "superadmin");
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      base = base.filter((u) =>
        [u.fullName, u.username, u.role, u.position, u.office, u.email].some((v) =>
          safeText(v).toLowerCase().includes(q)
        )
      );
    }
    if (roleFilter !== "all") base = base.filter((u) => u.role === roleFilter);
    if (statusFilter !== "all") base = base.filter((u) => u.status === statusFilter);
    return base;
  }, [users, search, roleFilter, statusFilter, currentUser]);

  const currentAccount = useMemo(() => {
    if (!currentUser) return selectedUser || users[0] || null;
    return (
      users.find((u) => u.username === currentUser.username) ||
      users.find((u) => u.id === currentUser.id) ||
      selectedUser ||
      users[0] ||
      null
    );
  }, [currentUser, selectedUser, users]);

  const stats = useMemo(() => {
    const role = currentUser?.role || "superadmin";
    const visibleForRole =
      role === "superadmin" ? users : users.filter((u) => u.role !== "superadmin");
    return {
      total: visibleForRole.length,
      active: visibleForRole.filter((u) => u.status === "active").length,
      admins: visibleForRole.filter((u) => u.role === "admin").length,
      staff: visibleForRole.filter((u) => u.role === "staff").length,
    };
  }, [users, currentUser]);

  const scopedAuditLogs = useMemo(() => {
    const role = currentUser?.role || "superadmin";
    let data = [...SAMPLE_AUDIT_LOGS];
    if (role === "staff") data = data.filter((x) => x.actor === currentUser.username);
    if (logRoleFilter !== "all" && role !== "staff") data = data.filter((x) => x.actorRole === logRoleFilter);
    return data;
  }, [currentUser, logRoleFilter]);

  const scopedDeletedLogs = useMemo(() => {
    const role = currentUser?.role || "superadmin";
    let data = [...SAMPLE_DELETED];
    if (role === "staff") data = data.filter((x) => x.actor === currentUser.username);
    if (logRoleFilter !== "all" && role !== "staff") data = data.filter((x) => x.actorRole === logRoleFilter);
    return data;
  }, [currentUser, logRoleFilter]);

  function persistUsers(next) {
    const normalized = next.map((u) => normalizeUserShape(u));
    setUsers(normalized);
  }

  function openProfile(user) {
    setViewUser(user);
    setVisiblePasswordUserId(null);
    setShowAllDetails(false);
  }

  function renderPasswordValue(user) {
    const rawPassword = safeText(user?.password).trim();

    if (!rawPassword) {
      return <span style={styles.passwordEmptyText}>No password set</span>;
    }

    const isVisible = visiblePasswordUserId === user.id;

    return (
      <div style={styles.passwordRevealWrap}>
        <span style={isVisible ? styles.passwordText : styles.passwordMasked}>
          {isVisible ? rawPassword : "••••••••"}
        </span>
        <button
          type="button"
          style={styles.passwordViewBtn}
          onClick={() => setVisiblePasswordUserId(isVisible ? null : user.id)}
        >
          {isVisible ? "Hide Hash" : "View Hash"}
        </button>
      </div>
    );
  }

  function openEdit(user) {
    setViewUser(null);
    setEditingUser(clone(user));
  }

  function openPrivileges(user) {
    setViewUser(null);
    setPrivilegeUser(clone(user));
    setPrivilegeDraft(normalizePermissions(user));
  }

  function closePrivileges() {
    setPrivilegeUser(null);
    setPrivilegeDraft(null);
  }

  async function saveEditUser() {
    if (!editingUser) return;

    const editPasswordError = validatePasswordStrength(editingUser.password, {
      required: false,
    });

    if (editPasswordError) {
      alert(editPasswordError);
      return;
    }

    const nextRole = safeText(editingUser.role, "staff").toLowerCase();
    const updatedUser = normalizeUserShape({
      ...editingUser,
      role: nextRole,
      fullName: buildFullName(editingUser),
      canManageDropdowns: nextRole === "superadmin" || nextRole === "admin",
      permissions: normalizePermissions({ ...editingUser, role: nextRole }),
    });

    setSaving(true);
    try {
      const saved = await updateAccount(updatedUser.id, updatedUser);
      const normalizedSaved = normalizeUserShape(saved || updatedUser);
      setUsers((prev) => {
        const next = prev.map((u) => (u.id === normalizedSaved.id ? normalizedSaved : u));
        return next;
      });
      setEditingUser(null);
    } catch (e) {
      console.error("Update account error:", e);
      alert(e?.response?.data?.message || e?.message || "Hindi na-save ang account sa database.");
    } finally {
      setSaving(false);
    }
  }

  async function savePrivileges() {
    if (!privilegeUser || !privilegeDraft) return;
    const nextPermissions = normalizePermissions({
      ...privilegeUser,
      permissions: privilegeDraft,
    });

    setSaving(true);
    try {
      const saved = await updateUserPermissions(privilegeUser.id, {
        pages: nextPermissions,
        special: {
          manageDropdowns: privilegeUser.role === "superadmin" || privilegeUser.role === "admin",
          manageUsers: privilegeUser.role === "superadmin" || privilegeUser.role === "admin",
        },
      });
      const normalizedSaved = normalizeUserShape(saved || { ...privilegeUser, permissions: nextPermissions });
      setUsers((prev) => {
        const next = prev.map((u) => (u.id === privilegeUser.id ? normalizedSaved : u));
        return next;
      });
      closePrivileges();
    } catch (e) {
      console.error("Update privileges error:", e);
      alert(e?.response?.data?.message || e?.message || "Hindi na-save ang privileges sa database.");
    } finally {
      setSaving(false);
    }
  }

  function selectAllPrivileges() {
    if (!privilegeUser) return;
    setPrivilegeDraft(
      normalizePermissions({
        ...privilegeUser,
        permissions: fullAccessPermissions(),
      })
    );
  }

  function clearAllPrivileges() {
    if (!privilegeUser) return;
    setPrivilegeDraft(
      normalizePermissions({
        ...privilegeUser,
        permissions: makeEmptyPermissions(),
      })
    );
  }

  async function updateTopProfilePicture(updatedAvatar) {
    if (!currentAccount) return;

    const updatedAccount = normalizeUserShape({
      ...currentAccount,
      avatar: clone(updatedAvatar),
    });

    setSaving(true);
    try {
      const saved = await updateAccount(updatedAccount.id, updatedAccount);
      const normalizedSaved = normalizeUserShape(saved || updatedAccount);

      setUsers((prev) =>
        prev.map((u) => (u.id === normalizedSaved.id ? normalizedSaved : u))
      );
      setSelectedUser((prev) =>
        prev?.id === normalizedSaved.id ? normalizedSaved : prev
      );
      setShowAvatarPickerFor(null);
    } catch (e) {
      console.error("Update profile photo error:", e);
      alert(e?.response?.data?.message || e?.message || "Hindi na-save ang profile photo sa database.");
    } finally {
      setSaving(false);
    }
  }

  async function onUploadForUser(event, userTarget, mode = "edit") {
    const file = event.target.files?.[0];
    if (!file || !userTarget) return;

    try {
      const compressedDataUrl = await fileToCompressedDataUrl(file);
      const avatar = {
        id: `upload_${Date.now()}`,
        label: "Uploaded Photo",
        type: "upload",
        value: compressedDataUrl,
        bg: "#111827",
      };

      if (mode === "top") {
        updateTopProfilePicture(avatar);
        return;
      }

      if (mode === "edit") {
        setEditingUser((prev) => (prev && prev.id === userTarget.id ? { ...prev, avatar } : prev));
      }
    } catch (e) {
      alert(e?.message || "Hindi ma-process ang profile photo.");
    } finally {
      event.target.value = "";
    }
  }

  function canStaffViewSensitive(target) {
    if (!currentAccount) return false;
    if (currentAccount.role !== "staff") return true;
    return target?.id === currentAccount.id;
  }

  function canViewPasswordInfo(target) {
    if (!currentAccount || !target) return false;
    if (currentAccount.role === "superadmin") return true;
    if (currentAccount.role === "admin") return target.role !== "superadmin";
    return false;
  }

  async function deleteUserAccount(target) {
    if (!target) return;

    if (target.id === currentAccount?.id) {
      alert("You cannot delete your own active account.");
      return;
    }

    if (currentAccount?.role === "admin" && target.role !== "staff") {
      alert("Admin can only delete User/Staff accounts.");
      return;
    }

    if (currentAccount?.role !== "superadmin" && currentAccount?.role !== "admin") {
      alert("You do not have permission to delete accounts.");
      return;
    }

    const confirmed = await requestDeleteConfirm(
      `Delete account for ${target.fullName || target.username}? This will remove the account from the database.`,
      "Confirm Delete",
      "Delete"
    );

    if (!confirmed) return;

    setSaving(true);
    try {
      await deleteAccount(target.id);
      setUsers((prev) => {
        const next = prev.filter((u) => u.id !== target.id);
        return next;
      });

      if (viewUser?.id === target.id) setViewUser(null);
      if (editingUser?.id === target.id) setEditingUser(null);
      if (privilegeUser?.id === target.id) closePrivileges();
    } catch (e) {
      console.error("Delete account error:", e);
      alert(e?.response?.data?.message || e?.message || "Hindi na-delete ang account sa database.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleUserStatus(target) {
    if (!target) return;

    if (target.id === currentAccount?.id) {
      alert("You cannot deactivate your own account while you are logged in.");
      return;
    }

    if (currentAccount?.role === "admin" && target.role !== "staff") {
      alert("Admin can only activate or deactivate User/Staff accounts.");
      return;
    }

    if (currentUser?.role !== "superadmin" && currentUser?.role !== "admin") {
      alert("You do not have permission to change account status.");
      return;
    }

    const nextStatus = target.status === "active" ? "inactive" : "active";
    const actionLabel = nextStatus === "active" ? "activate" : "deactivate";

    const confirmed = await requestDeleteConfirm(
      `Do you want to ${actionLabel} the account for ${target.fullName || target.username}?`,
      "Confirm Action",
      actionLabel === "activate" ? "Activate" : "Deactivate"
    );

    if (!confirmed) return;

    setSaving(true);
    try {
      const saved = nextStatus === "active"
        ? await activateAccount(target.id)
        : await deactivateAccount(target.id);
      const normalizedSaved = normalizeUserShape(saved || { ...target, status: nextStatus });

      setUsers((prev) => {
        const next = prev.map((u) => (u.id === target.id ? normalizedSaved : u));
        return next;
      });

      if (viewUser?.id === target.id) setViewUser(normalizedSaved);
      if (editingUser?.id === target.id) setEditingUser(normalizedSaved);
      if (selectedUser?.id === target.id) setSelectedUser(normalizedSaved);
    } catch (e) {
      console.error("Toggle user status error:", e);
      alert(e?.response?.data?.message || e?.message || "Hindi napalitan ang status sa database.");
    } finally {
      setSaving(false);
    }
  }


  async function retrieveDeletedProject(row) {
    if (!row) return;
    const confirmed = await requestDeleteConfirm(
      `Retrieve deleted project "${row.project}"? This is a temporary UI action for now.`,
      "Confirm Restore",
      "Retrieve"
    );
    if (!confirmed) return;

    alert(`Project "${row.project}" marked for retrieve. Later, this can be connected to the real database restore function.`);
  }



  function openAddAccount() {
    setAddError("");
    setAddForm(makeNewAccountForm(currentUser?.role));
    setShowAddAccount(true);
  }

  function updateAddForm(key, value) {
    setAddForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateEditNameField(key, value) {
    setEditingUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [key]: value };
      next.fullName = buildFullName(next);
      return next;
    });
  }

  async function saveAddAccount() {
    const firstName = safeText(addForm.firstName).trim();
    const middleName = safeText(addForm.middleName).trim();
    const lastName = safeText(addForm.lastName).trim();
    const suffix = safeText(addForm.suffix).trim();
    const username = safeText(addForm.username).trim();

    if (!firstName || !lastName) {
      setAddError("First Name and Last Name are required.");
      return;
    }
    if (!username) {
      setAddError("Username is required.");
      return;
    }

    const passwordError = validatePasswordStrength(addForm.password, {
      required: true,
    });

    if (passwordError) {
      setAddError(passwordError);
      return;
    }

    if (users.some((u) => safeText(u.username).toLowerCase() === username.toLowerCase())) {
      setAddError("Username already exists.");
      return;
    }
    if (currentUser?.role === "admin" && addForm.role !== "staff") {
      setAddError("Admin can only create User/Staff accounts.");
      return;
    }

    const fullName = buildFullName({ firstName, middleName, lastName, suffix });
    const newUser = normalizeUserShape({
      firstName,
      middleName,
      lastName,
      suffix,
      fullName,
      username,
      password: safeText(addForm.password),
      email: safeText(addForm.email),
      contactNumber: safeText(addForm.contactNumber),
      role: addForm.role,
      status: addForm.status,
      position: safeText(addForm.position),
      office: safeText(addForm.office),
      createdBy: currentAccount?.fullName || roleLabel(currentUser?.role),
      lastLogin: "Never",
      canManageDropdowns: addForm.role !== "staff",
      avatar: clone(addForm.avatar || DEFAULT_AVATARS[3]),
      assigned: 0,
      completed: 0,
      pending: 0,
      editedRecords: 0,
      permissions: defaultPermissionsForRole(addForm.role),
    });

    setSaving(true);
    try {
      const saved = await createAccount(newUser);
      const normalizedSaved = normalizeUserShape(saved || newUser);
      setUsers((prev) => {
        const next = [...prev, normalizedSaved];
        return next;
      });
      setShowAddAccount(false);
      setAddForm(makeNewAccountForm(currentUser?.role));
      setAddError("");
    } catch (e) {
      console.error("Create account error:", e);
      setAddError(e?.response?.data?.message || e?.message || "Hindi na-create ang account sa database.");
    } finally {
      setSaving(false);
    }
  }

  const tabs = [
    { key: "accounts", label: "Accounts Directory" },
    { key: "audit", label: "Audit Logs" },
    { key: "deleted", label: "Deleted Projects" },
  ];

  return (
    <div style={styles.pageWrap}>
      <div style={styles.hero}>
        <div>
          <div style={styles.heroTitle}>User Management</div>
          <div style={styles.heroSub}>Manage accounts, review privileges, inspect logs, and prepare project history/recycle-bin workflows.</div>
        </div>
        <div style={styles.rolePill}>{roleLabel(currentUser?.role || currentAccount?.role || "staff")}</div>
      </div>

      {pageError ? (
        <div style={styles.errorBanner || { marginTop: 12, marginBottom: 12, padding: 12, borderRadius: 12, background: "#fef2f2", color: "#991b1b", border: "1px solid #fecaca", fontWeight: 700 }}>
          Database warning: {pageError}
          <button type="button" style={{ ...styles.smallBtn, marginLeft: 10 }} onClick={loadUsers}>Retry</button>
        </div>
      ) : null}

      {currentAccount && (
        <div style={styles.topProfileGrid}>
          <div style={styles.topProfileCard}>
            <div style={{ cursor: "pointer" }} onClick={() => setImagePreviewUser(currentAccount)}>
              {renderAvatar(currentAccount.avatar, 86)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={styles.topProfileName}>{currentAccount.fullName}</div>
              <div style={styles.topProfileMeta}>{currentAccount.email || "No email address"}</div>
              <div style={{ fontSize: 15, fontWeight: 800, marginTop: 2 }}>
                {currentAccount.contactNumber || "No contact number"}
              </div>
              <div style={styles.badgeRow}>
                <span style={{ ...styles.badge, ...roleBadgeStyle(currentAccount.role) }}>{roleLabel(currentAccount.role)}</span>
                <span style={{ ...styles.badge, ...statusBadgeStyle(currentAccount.status) }}>{safeText(currentAccount.status, "inactive")}</span>
                {currentAccount.canManageDropdowns ? (
                  <span style={{ ...styles.badge, color: "#b45309", background: "#fef3c7", border: "1px solid #fcd34d" }}>
                    Can Manage Dropdowns
                  </span>
                ) : null}
              </div>
            </div>
            <div style={{ display: "grid", gap: 8, alignSelf: "start" }}>
              <button type="button" style={styles.smallBtn} onClick={() => openEdit(currentAccount)}>Edit Profile</button>
              <button type="button" style={styles.smallBtn} onClick={() => setImagePreviewUser(currentAccount)}>View Profile</button>
              <button type="button" style={styles.smallBtn} onClick={() => setShowAvatarPickerFor({ mode: "top", user: currentAccount })}>Change Photo</button>
            </div>
          </div>

          <div style={styles.topInfoCard}>
            <div style={styles.infoRow}><strong>Position:</strong> {safeText(currentAccount.position, "—")}</div>
            <div style={styles.infoRow}><strong>Office:</strong> {safeText(currentAccount.office, "—")}</div>
            <div style={styles.infoRow}><strong>Created At:</strong> {safeText(currentAccount.createdAt, "—")}</div>
            <div style={styles.infoRow}><strong>Last Login:</strong> {safeText(currentAccount.lastLogin, "Never")}</div>
          </div>
        </div>
      )}

      <div style={styles.statGrid}>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{stats.total}</div>
          <div style={styles.statLabel}>TOTAL ACCOUNTS</div>
          <div style={styles.statSub}>Accounts visible to your role</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{stats.active}</div>
          <div style={styles.statLabel}>ACTIVE ACCOUNTS</div>
          <div style={styles.statSub}>Based on current scope</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{stats.admins}</div>
          <div style={styles.statLabel}>ADMINS</div>
          <div style={styles.statSub}>Visible admin-level accounts</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statNumber}>{stats.staff}</div>
          <div style={styles.statLabel}>STAFF</div>
          <div style={styles.statSub}>Visible staff accounts</div>
        </div>
      </div>

      <div style={styles.tabRow}>
        {tabs.map((item) => (
          <button
            type="button"
            key={item.key}
            onClick={() => setTab(item.key)}
            style={{
              ...styles.tabBtn,
              ...(tab === item.key ? styles.tabBtnActive : {}),
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div style={styles.panel}>
        {tab === "accounts" && (
          <>
            <div style={styles.panelHeader}>
              <div>
                <div style={styles.sectionTitle}>Accounts Directory</div>
                <div style={styles.sectionSub}>Search accounts, open profile snapshots, and manage role-based actions.</div>
              </div>
              <div style={styles.filterWrap}>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={styles.searchInput}
                  placeholder="Search name, username, office, email..."
                />
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={styles.select}>
                  <option value="all">All Roles</option>
                  {currentUser?.role === "superadmin" ? <option value="superadmin">Super Admin</option> : null}
                  <option value="admin">Admin</option>
                  <option value="staff">User/Staff</option>
                </select>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={styles.select}>
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                {currentUser?.role !== "staff" ? (
                  <button type="button" style={styles.primaryBtn} onClick={openAddAccount}>+ Add Account</button>
                ) : null}
              </div>
            </div>

            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Profile</th>
                    <th style={styles.th}>Username</th>
                    <th style={styles.th}>Role</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Position / Office</th>
                    <th style={styles.th}>Access Summary</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {!visibleUsers.length ? (
                    <tr>
                      <td colSpan={7}><EmptyState text="No accounts found." /></td>
                    </tr>
                  ) : visibleUsers.map((u) => {
                    const staffRestricted = currentAccount?.role === "staff" && u.id !== currentAccount?.id;
                    const adminRestricted = currentAccount?.role === "admin" && u.role === "admin" && u.id !== currentAccount?.id;
                    return (
                      <tr key={u.id}>
                        <td style={styles.td}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div onClick={() => setImagePreviewUser(u)} style={{ cursor: "pointer" }}>
                              {renderAvatar(u.avatar, 40)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 800 }}>{u.fullName}</div>
                              <div style={styles.mutedSmall}>{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td style={styles.td}>{u.username}</td>
                        <td style={styles.td}>
                          <span style={{ ...styles.badge, ...roleBadgeStyle(u.role) }}>{roleLabel(u.role)}</span>
                        </td>
                        <td style={styles.td}>
                          <span style={{ ...styles.badge, ...statusBadgeStyle(u.status) }}>{u.status}</span>
                        </td>
                        <td style={styles.td}>
                          <div>{u.position}</div>
                          <div style={styles.mutedSmall}>{u.office}</div>
                        </td>
                        <td style={styles.td}>{accessSummary(u)}</td>
                        <td style={styles.td}>
                          <div style={styles.actionWrap}>
                            <button type="button" style={styles.smallBtn} onClick={() => openProfile(u)}>View</button>
                            {!staffRestricted && !adminRestricted && currentUser?.role !== "staff" ? (
                              <>
                                <button type="button" style={styles.smallBtn} onClick={() => openEdit(u)}>Edit</button>
                                <button type="button" style={styles.smallBtn} onClick={() => openPrivileges(u)}>Privileges</button>
                              </>
                            ) : null}
                            {currentUser?.role !== "staff" && !staffRestricted && !adminRestricted ? (
                              <>
                                <button type="button" style={styles.smallDangerBtn} onClick={() => toggleUserStatus(u)}>
                                  {u.status === "active" ? "Deactivate" : "Activate"}
                                </button>
                                <button type="button" style={styles.smallDeleteBtn} onClick={() => deleteUserAccount(u)}>
                                  Delete
                                </button>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab !== "accounts" && currentUser?.role !== "staff" ? (
          <div style={{ marginBottom: 12 }}>
            <select value={logRoleFilter} onChange={(e) => setLogRoleFilter(e.target.value)} style={styles.select}>
              <option value="all">All Roles</option>
              <option value="superadmin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="staff">User/Staff</option>
            </select>
          </div>
        ) : null}

        {tab === "audit" && (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Actor</th>
                  <th style={styles.th}>Role</th>
                  <th style={styles.th}>Action</th>
                  <th style={styles.th}>Target</th>
                  <th style={styles.th}>Module</th>
                  <th style={styles.th}>Date/Time</th>
                </tr>
              </thead>
              <tbody>
                {!scopedAuditLogs.length ? <tr><td colSpan={6}><EmptyState text="No audit logs found." /></td></tr> :
                  scopedAuditLogs.map((row) => (
                    <tr key={row.id}>
                      <td style={styles.td}>{row.actor}</td>
                      <td style={styles.td}><span style={{ ...styles.badge, ...roleBadgeStyle(row.actorRole) }}>{roleLabel(row.actorRole)}</span></td>
                      <td style={styles.td}>{row.action}</td>
                      <td style={styles.td}>{row.target}</td>
                      <td style={styles.td}>{row.module}</td>
                      <td style={styles.td}>{row.when}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "deleted" && (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Project</th>
                  <th style={styles.th}>Deleted By</th>
                  <th style={styles.th}>Role</th>
                  <th style={styles.th}>Reason</th>
                  <th style={styles.th}>Date/Time</th>
                  <th style={styles.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {!scopedDeletedLogs.length ? <tr><td colSpan={6}><EmptyState text="No deleted project logs found." /></td></tr> :
                  scopedDeletedLogs.map((row) => (
                    <tr key={row.id}>
                      <td style={styles.td}>{row.project}</td>
                      <td style={styles.td}>{row.deletedBy}</td>
                      <td style={styles.td}><span style={{ ...styles.badge, ...roleBadgeStyle(row.actorRole) }}>{roleLabel(row.actorRole)}</span></td>
                      <td style={styles.td}>{row.reason}</td>
                      <td style={styles.td}>{row.when}</td>
                      <td style={styles.td}>
                        <button type="button" style={styles.smallBtn} onClick={() => retrieveDeletedProject(row)}>
                          Retrieve
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddAccount && (
        <ModalShell title="Add Account" onClose={() => setShowAddAccount(false)} width={860} zIndex={1450}>
          <div style={styles.editGrid}>
            <div style={styles.cardBox}>
              <div style={styles.cardTitle}>New Account Details</div>
              <div style={styles.formGrid}>
                {[
                  ["First Name", "firstName", true],
                  ["Middle Name", "middleName", false],
                  ["Last Name", "lastName", true],
                  ["Suffix", "suffix", false],
                  ["Username", "username", true],
                  ["Password", "password", false],
                  ["Email", "email", false],
                  ["Contact Number", "contactNumber", false],
                  ["Position", "position", false],
                  ["Office", "office", false],
                ].map(([label, key, required]) => (
                  <label key={key} style={styles.field}>
                    <span style={styles.fieldLabel}>{label}{required ? " *" : ""}</span>
                    <input
                      style={styles.input}
                      value={safeText(addForm[key])}
                      onChange={(e) => updateAddForm(key, e.target.value)}
                      placeholder={key === "password" ? "Min. 8 chars, uppercase, lowercase, number" : ""}
                    />
                  </label>
                ))}

                <label style={styles.field}>
                  <span style={styles.fieldLabel}>Role</span>
                  <select
                    style={styles.input}
                    value={addForm.role}
                    onChange={(e) => updateAddForm("role", e.target.value)}
                  >
                    {currentUser?.role === "superadmin" ? <option value="superadmin">Super Admin</option> : null}
                    {currentUser?.role === "superadmin" ? <option value="admin">Admin</option> : null}
                    <option value="staff">User/Staff</option>
                  </select>
                </label>

                <label style={styles.field}>
                  <span style={styles.fieldLabel}>Status</span>
                  <select
                    style={styles.input}
                    value={addForm.status}
                    onChange={(e) => updateAddForm("status", e.target.value)}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>

                <label style={{ ...styles.field, gridColumn: "1 / -1" }}>
                  <span style={styles.fieldLabel}>Auto-generated Display Name</span>
                  <input style={{ ...styles.input, background: "#f8fafc" }} value={buildFullName(addForm)} readOnly />
                </label>
              </div>
              {addError ? <div style={styles.errorText}>{addError}</div> : null}
            </div>

            <div style={styles.cardBox}>
              <div style={styles.cardTitle}>Default Profile Picture</div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", marginBottom: 14 }}>
                {renderAvatar(addForm.avatar, 92)}
                <div style={{ display: "grid", gap: 8 }}>
                  <button type="button" style={styles.smallBtn} onClick={() => setShowAvatarPickerFor({ mode: "add" })}>Choose Default Avatar</button>
                  <button type="button" style={styles.smallBtn} onClick={() => addFileInputRef.current?.click()}>Upload from Device</button>
                  <input
                    ref={addFileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      try {
                        const compressedDataUrl = await fileToCompressedDataUrl(file);
                        updateAddForm("avatar", {
                          id: `upload_${Date.now()}`,
                          label: "Uploaded Photo",
                          type: "upload",
                          value: compressedDataUrl,
                          bg: "#111827",
                        });
                      } catch (err) {
                        alert(err?.message || "Hindi ma-process ang profile photo.");
                      } finally {
                        e.target.value = "";
                      }
                    }}
                  />
                </div>
              </div>
              <div style={styles.mutedSmall}>System ID is database-generated later, so it is not shown in the form. Name fields are separated for cleaner assignments, mentions, and future reports.</div>
            </div>
          </div>

          <div style={styles.modalFooter}>
            <button type="button" style={styles.smallBtn} onClick={() => setShowAddAccount(false)}>Cancel</button>
            <button type="button" style={styles.primaryBtn} onClick={saveAddAccount}>Save Account</button>
          </div>
        </ModalShell>
      )}

      {viewUser && (
        <ModalShell title="Account Profile" onClose={() => { setViewUser(null); setVisiblePasswordUserId(null); }} width={980} zIndex={1500}>
          <div style={styles.profileHero}>
            <div style={{ cursor: "pointer" }} onClick={() => setImagePreviewUser(viewUser)}>
              {renderAvatar(viewUser.avatar, 86)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#111827" }}>{viewUser.fullName}</div>
              <div style={styles.mutedSmall}>@{viewUser.username} • {viewUser.position} • {viewUser.office}</div>
              <div style={styles.badgeRow}>
                <span style={{ ...styles.badge, ...roleBadgeStyle(viewUser.role) }}>{roleLabel(viewUser.role)}</span>
                <span style={{ ...styles.badge, ...statusBadgeStyle(viewUser.status) }}>{viewUser.status}</span>
                {viewUser.canManageDropdowns ? (
                  <span style={{ ...styles.badge, color: "#b45309", background: "#fef3c7", border: "1px solid #fcd34d" }}>
                    Can Manage Dropdowns
                  </span>
                ) : null}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button type="button" style={styles.smallBtn} onClick={() => setImagePreviewUser(viewUser)}>View Profile Picture</button>
              {(currentUser?.role !== "staff") ? <button type="button" style={styles.smallBtn} onClick={() => openEdit(viewUser)}>Edit Account</button> : null}
              {(currentUser?.role !== "staff" && !(currentUser?.role === "admin" && viewUser.role === "admin" && currentUser?.username !== viewUser.username)) ? (
                <button type="button" style={styles.smallBtn} onClick={() => openPrivileges(viewUser)}>Privileges</button>
              ) : null}
              {currentUser?.role !== "staff" &&
              viewUser.id !== currentAccount?.id &&
              !(currentUser?.role === "admin" && viewUser.role !== "staff") ? (
                <button type="button" style={styles.smallDangerBtn} onClick={() => toggleUserStatus(viewUser)}>
                  {viewUser.status === "active" ? "Deactivate Account" : "Activate Account"}
                </button>
              ) : null}
              {currentUser?.role !== "staff" &&
              viewUser.id !== currentAccount?.id &&
              !(currentUser?.role === "admin" && viewUser.role !== "staff") ? (
                <button type="button" style={styles.smallDeleteBtn} onClick={() => deleteUserAccount(viewUser)}>Delete Account</button>
              ) : null}
              <button type="button" style={styles.primaryBtn} onClick={() => setShowAllDetails((v) => !v)}>
                {showAllDetails ? "Hide Details" : "View All Details"}
              </button>
            </div>
          </div>

          <div style={styles.profileGrid}>
            <div style={styles.cardBox}>
              <div style={styles.cardTitle}>Profile Snapshot</div>
              <div style={styles.snapshotList}>
                {[
                  ["Full Name", viewUser.fullName],
                  ["Username", viewUser.username],
                  ...(canViewPasswordInfo(viewUser)
                    ? [["Password Hash", renderPasswordValue(viewUser)]]
                    : []),
                  ["Role", roleLabel(viewUser.role)],
                  ["Status", viewUser.status],
                  ["Position", viewUser.position],
                  ["Office", viewUser.office],
                  ["Contact Number", viewUser.contactNumber || "—"],
                  ["Email", viewUser.email || "—"],
                  ["Created By", viewUser.createdBy || "—"],
                  ["Created At", viewUser.createdAt || "—"],
                  ["Last Login", viewUser.lastLogin || "—"],
                ].map(([label, value]) => (
                  <div key={label} style={styles.snapshotRow}>
                    <div style={styles.snapshotLabel}>{label}</div>
                    <div>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.cardBox}>
              <div style={styles.cardTitle}>Quick Work Summary</div>
              <div style={styles.quickGrid}>
                <div style={styles.quickCard}><div style={styles.quickNumber}>{viewUser.assigned || 0}</div><div style={styles.quickText}>Assigned Projects</div></div>
                <div style={styles.quickCard}><div style={styles.quickNumber}>{viewUser.completed || 0}</div><div style={styles.quickText}>Completed</div></div>
                <div style={styles.quickCard}><div style={styles.quickNumber}>{viewUser.pending || 0}</div><div style={styles.quickText}>Pending</div></div>
                <div style={styles.quickCard}><div style={styles.quickNumber}>{getEditableModulesCount(viewUser)}</div><div style={styles.quickText}>Editable Modules</div></div>
              </div>
            </div>
          </div>

          {showAllDetails && (
            <>
              <div style={styles.cardBox}>
                <div style={styles.cardTitle}>Full Privileges</div>
                {!canStaffViewSensitive(viewUser) ? (
                  <EmptyState text="Limited view only. Detailed privileges are hidden for this account." />
                ) : (
                  <PermissionMatrix permissions={viewUser.permissions} role={viewUser.role} />
                )}
              </div>

              <div style={styles.profileGrid}>
                <div style={styles.cardBox}>
                  <div style={styles.cardTitle}>Recent Activity Logs</div>
                  {!canStaffViewSensitive(viewUser) ? (
                    <EmptyState text="Only your own activity logs are visible in detailed mode." />
                  ) : (
                    <div style={styles.logList}>
                      {SAMPLE_AUDIT_LOGS.filter((x) => x.actor === viewUser.username).length
                        ? SAMPLE_AUDIT_LOGS.filter((x) => x.actor === viewUser.username).map((x) => (
                            <div key={x.id} style={styles.logItem}>
                              <div style={{ fontWeight: 700 }}>{x.action}</div>
                              <div style={styles.mutedSmall}>{x.module} • {x.target}</div>
                              <div style={styles.mutedSmall}>{x.when}</div>
                            </div>
                          ))
                        : <EmptyState text="No recent activity logs yet." />}
                    </div>
                  )}
                </div>

                <div style={styles.cardBox}>
                  <div style={styles.cardTitle}>Deleted / Restored Logs</div>
                  {!canStaffViewSensitive(viewUser) ? (
                    <EmptyState text="Only your own deleted/restored entries are visible in detailed mode." />
                  ) : (
                    <div style={styles.logList}>
                      {SAMPLE_DELETED.filter((x) => x.actor === viewUser.username).length
                        ? SAMPLE_DELETED.filter((x) => x.actor === viewUser.username).map((x) => (
                            <div key={x.id} style={styles.logItem}>
                              <div style={{ fontWeight: 700 }}>{x.project}</div>
                              <div style={styles.mutedSmall}>Deleted by {x.deletedBy}</div>
                              <div style={styles.mutedSmall}>{x.reason} • {x.when}</div>
                            </div>
                          ))
                        : <EmptyState text="No deleted or restored project logs yet." />}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </ModalShell>
      )}

      {editingUser && (
        <ModalShell title="Edit Account" onClose={() => setEditingUser(null)} width={820} zIndex={1600}>
          <div style={styles.editGrid}>
            <div style={styles.cardBox}>
              <div style={styles.cardTitle}>Profile Photo</div>
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <div style={{ cursor: "pointer" }} onClick={() => setImagePreviewUser(editingUser)}>
                  {renderAvatar(editingUser.avatar, 92)}
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  <button type="button" style={styles.smallBtn} onClick={() => setImagePreviewUser(editingUser)}>View Profile Picture</button>
                  <button type="button" style={styles.smallBtn} onClick={() => setShowAvatarPickerFor({ mode: "edit", user: editingUser })}>Choose Default Avatar</button>
                  <button type="button" style={styles.smallBtn} onClick={() => fileInputRef.current?.click()}>Upload from Device</button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => onUploadForUser(e, editingUser, "edit")}
                  />
                </div>
              </div>
            </div>

            <div style={styles.cardBox}>
              <div style={styles.formGrid}>
                {[
                  ["First Name", "firstName", true],
                  ["Middle Name", "middleName", false],
                  ["Last Name", "lastName", true],
                  ["Suffix", "suffix", false],
                  ["Username", "username", false],
                  ["Password", "password", false],
                  ["Email", "email", false],
                  ["Contact Number", "contactNumber", false],
                  ["Position", "position", false],
                  ["Office", "office", false],
                ].map(([label, key, isNameField]) => (
                  <label key={key} style={styles.field}>
                    <span style={styles.fieldLabel}>{label}</span>
                    <input
                      style={styles.input}
                      value={safeText(editingUser[key])}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (isNameField) {
                          updateEditNameField(key, value);
                        } else {
                          setEditingUser((prev) => ({ ...prev, [key]: value }));
                        }
                      }}
                    />
                  </label>
                ))}
                <label style={{ ...styles.field, gridColumn: "1 / -1" }}>
                  <span style={styles.fieldLabel}>Auto-generated Display Name</span>
                  <input style={{ ...styles.input, background: "#f8fafc" }} value={safeText(editingUser.fullName)} readOnly />
                </label>
                <label style={styles.field}>
                  <span style={styles.fieldLabel}>Role</span>
                  <select
                    style={styles.input}
                    value={editingUser.role}
                    onChange={(e) => setEditingUser((prev) => ({ ...prev, role: e.target.value, permissions: defaultPermissionsForRole(e.target.value) }))}
                    disabled={currentUser?.role !== "superadmin"}
                  >
                    <option value="superadmin">Super Admin</option>
                    <option value="admin">Admin</option>
                    <option value="staff">User/Staff</option>
                  </select>
                </label>
                <label style={styles.field}>
                  <span style={styles.fieldLabel}>Status</span>
                  <select
                    style={styles.input}
                    value={editingUser.status}
                    onChange={(e) => setEditingUser((prev) => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </label>
              </div>
            </div>
          </div>

          <div style={styles.modalFooter}>
            <button type="button" style={styles.smallBtn} onClick={() => setEditingUser(null)}>Cancel</button>
            <button type="button" style={styles.primaryBtn} onClick={saveEditUser}>Save Changes</button>
          </div>
        </ModalShell>
      )}

      {privilegeUser && privilegeDraft && (
        <ModalShell title="Edit Privileges" onClose={closePrivileges} width={1120} zIndex={1650}>
          <div style={styles.privilegeIntro}>
            <div>
              <div style={styles.cardTitle}>Privilege Access Matrix</div>
              <div style={styles.mutedSmall}>
                Target Setting has no Export/Print. Accomplishments is view-only. SILLAG has been removed/replaced by DRRM.
              </div>
            </div>

            <div style={styles.privilegeTopActions}>
              <span style={{ ...styles.badge, ...roleBadgeStyle(privilegeUser.role) }}>{roleLabel(privilegeUser.role)}</span>
              <button type="button" style={styles.smallBtn} onClick={selectAllPrivileges}>
                Select All
              </button>
              <button type="button" style={styles.smallBtn} onClick={clearAllPrivileges}>
                Clear All
              </button>
            </div>
          </div>

          <PermissionMatrix
            permissions={privilegeDraft}
            role={privilegeUser.role}
            editable={true}
            onChange={(pageKey, action, checked) =>
              setPrivilegeDraft((prev) => ({
                ...prev,
                [pageKey]: cleanPageAccess(pageKey, {
                  ...prev?.[pageKey],
                  [action]: checked,
                }),
              }))
            }
          />

          <div style={styles.modalFooter}>
            <button type="button" style={styles.smallBtn} onClick={closePrivileges}>Cancel</button>
            <button type="button" style={styles.primaryBtn} onClick={savePrivileges}>Save Privileges</button>
          </div>
        </ModalShell>
      )}

      {showAvatarPickerFor && (
        <ModalShell
          title={showAvatarPickerFor.mode === "top" ? "Change Profile Photo" : showAvatarPickerFor.mode === "add" ? "Choose Default Avatar" : "Choose Profile Picture"}
          onClose={() => setShowAvatarPickerFor(null)}
          width={760}
          zIndex={1700}
        >
          <div style={styles.avatarPickerGrid}>
            {DEFAULT_AVATARS.map((avatar) => (
              <button
                type="button"
                key={avatar.id}
                style={styles.avatarChoiceBtn}
                onClick={() => {
                  if (showAvatarPickerFor.mode === "top") {
                    updateTopProfilePicture(avatar);
                  } else if (showAvatarPickerFor.mode === "add") {
                    setAddForm((prev) => ({ ...prev, avatar: clone(avatar) }));
                    setShowAvatarPickerFor(null);
                  } else {
                    setEditingUser((prev) => (prev ? { ...prev, avatar: clone(avatar) } : prev));
                    setShowAvatarPickerFor(null);
                  }
                }}
              >
                {renderAvatar(avatar, 72)}
                <div style={{ fontWeight: 700, color: "#111827" }}>{avatar.label}</div>
              </button>
            ))}
          </div>

          {showAvatarPickerFor.mode === "top" ? (
            <div style={styles.modalFooter}>
              <button type="button" style={styles.smallBtn} onClick={() => setShowAvatarPickerFor(null)}>Close</button>
            </div>
          ) : null}
        </ModalShell>
      )}

      {imagePreviewUser && (
        <div style={{ ...styles.overlay, zIndex: 1800 }} onClick={() => setImagePreviewUser(null)}>
          <div style={styles.imagePreviewWrap} onClick={(e) => e.stopPropagation()}>
            <button type="button" style={styles.imageCloseBtn} onClick={() => setImagePreviewUser(null)}>×</button>
            <div style={styles.imagePreviewInner}>
              {imagePreviewUser.avatar?.type === "upload" ? (
                <img src={imagePreviewUser.avatar?.value} alt={imagePreviewUser.fullName} style={styles.imagePreviewImg} />
              ) : (
                <div style={styles.imagePreviewFallback}>
                  {renderAvatar(imagePreviewUser.avatar, 220)}
                  <div style={{ marginTop: 18, fontSize: 22, fontWeight: 800 }}>{imagePreviewUser.fullName}</div>
                  <div style={{ fontSize: 15, color: "#e5e7eb" }}>{roleLabel(imagePreviewUser.role)}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {deleteConfirmState && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.42)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 99999,
            fontFamily: "inherit",
          }}
          onClick={cancelDeleteConfirm}
        >
          <div
            style={{
              width: "min(430px, 100%)",
              background: "#fff",
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: "0 18px 45px rgba(15,23,42,0.28)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                background: "#0b4ea2",
                color: "#fff",
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                fontWeight: 900,
              }}
            >
              <span>{deleteConfirmState.title || "Confirm Delete"}</span>
              <button
                type="button"
                onClick={cancelDeleteConfirm}
                style={{
                  border: "1px solid rgba(255,255,255,0.75)",
                  background: "#fff",
                  color: "#0f172a",
                  borderRadius: 10,
                  padding: "6px 10px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ fontWeight: 900, fontSize: 14, marginBottom: 6, color: "#0f172a" }}>
                Are you sure you want to continue?
              </div>
              <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.4 }}>
                {deleteConfirmState.message || "This action cannot be undone."}
              </div>
            </div>
            <div
              style={{
                padding: 14,
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                borderTop: "1px solid #e2e8f0",
              }}
            >
              <button
                type="button"
                onClick={cancelDeleteConfirm}
                style={{
                  background: "#fff",
                  border: "1px solid #cbd5e1",
                  color: "#0f172a",
                  padding: "9px 12px",
                  borderRadius: 10,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={proceedDeleteConfirm}
                style={{
                  background: "#0b4ea2",
                  border: "1px solid #0b4ea2",
                  color: "#fff",
                  padding: "9px 12px",
                  borderRadius: 10,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {deleteConfirmState.confirmText || "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const styles = {
  pageWrap: {
    padding: 18,
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  hero: {
    background: "#3a73d5",
    color: "#fff",
    borderRadius: 20,
    padding: "18px 16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    marginBottom: 12,
    border: "1px solid #7fa5ea",
  },
  heroTitle: { fontSize: 20, fontWeight: 800, marginBottom: 4 },
  heroSub: { fontSize: 13, opacity: 0.95 },
  rolePill: {
    background: "#eef4ff",
    color: "#1d4ed8",
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 800,
    whiteSpace: "nowrap",
  },
  topProfileGrid: {
    display: "grid",
    gridTemplateColumns: "1.05fr 1fr",
    gap: 12,
    marginBottom: 12,
  },
  topProfileCard: {
    borderRadius: 20,
    border: "1px solid #111827",
    background: "#f8fafc",
    padding: 18,
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  topInfoCard: {
    borderRadius: 20,
    border: "1px solid #111827",
    background: "#f8fafc",
    padding: 18,
    display: "grid",
    gap: 12,
    alignContent: "start",
  },
  topProfileName: { fontSize: 22, fontWeight: 800, color: "#111827" },
  topProfileMeta: { color: "#374151", marginTop: 2, fontSize: 15 },
  infoRow: { fontSize: 16, color: "#111827" },
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0,1fr))",
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    background: "#fff",
    border: "1px solid #d7e2f3",
    borderRadius: 18,
    padding: 14,
  },
  statNumber: { fontSize: 18, fontWeight: 900, color: "#111827" },
  statLabel: { fontSize: 12, fontWeight: 800, color: "#334155", marginTop: 2 },
  statSub: { fontSize: 12, color: "#64748b", marginTop: 4 },
  tabRow: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 },
  tabBtn: {
    border: "1px solid #d5dce8",
    background: "#fff",
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 700,
    color: "#111827",
    cursor: "pointer",
  },
  tabBtnActive: { background: "#e8f0ff", color: "#1d4ed8", border: "1px solid #9cb8f0" },
  panel: {
    background: "#fff",
    border: "1px solid #d7e2f3",
    borderRadius: 18,
    padding: 10,
  },
  panelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "start",
    gap: 14,
    padding: 8,
    flexWrap: "wrap",
  },
  sectionTitle: { fontSize: 15, fontWeight: 900, color: "#111827" },
  sectionSub: { fontSize: 12, color: "#64748b", marginTop: 3 },
  filterWrap: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" },
  searchInput: {
    height: 36,
    minWidth: 260,
    padding: "0 12px",
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    fontSize: 13,
    outline: "none",
  },
  select: {
    height: 36,
    padding: "0 12px",
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    fontSize: 13,
    outline: "none",
    background: "#fff",
  },
  primaryBtn: {
    height: 40,
    borderRadius: 12,
    border: "none",
    background: "#356fdd",
    color: "#fff",
    fontWeight: 800,
    padding: "0 14px",
    cursor: "pointer",
  },
  smallBtn: {
    height: 34,
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#111827",
    fontWeight: 700,
    padding: "0 12px",
    cursor: "pointer",
  },
  smallDangerBtn: {
    height: 34,
    borderRadius: 10,
    border: "1px solid #fecaca",
    background: "#fff5f5",
    color: "#dc2626",
    fontWeight: 700,
    padding: "0 12px",
    cursor: "pointer",
  },
  smallDeleteBtn: {
    height: 34,
    borderRadius: 10,
    border: "1px solid #b91c1c",
    background: "#dc2626",
    color: "#ffffff",
    fontWeight: 800,
    padding: "0 12px",
    cursor: "pointer",
  },
  tableWrap: {
    width: "100%",
    overflowX: "auto",
    border: "1px solid #e2e8f0",
    borderRadius: 14,
    marginTop: 8,
  },
  table: { width: "100%", borderCollapse: "collapse", tableLayout: "fixed" },
  th: {
    textAlign: "left",
    fontSize: 12,
    fontWeight: 800,
    color: "#334155",
    padding: "10px 12px",
    borderBottom: "1px solid #e2e8f0",
    background: "#f8fafc",
  },
  td: {
    verticalAlign: "top",
    fontSize: 13,
    color: "#111827",
    padding: "12px",
    borderBottom: "1px solid #eef2f7",
    overflowWrap: "anywhere",
  },
  mutedSmall: { fontSize: 12, color: "#6b7280" },
  badgeRow: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 },
  badge: {
    fontSize: 12,
    fontWeight: 800,
    borderRadius: 999,
    padding: "5px 10px",
    display: "inline-flex",
    alignItems: "center",
    lineHeight: 1,
  },
  actionWrap: { display: "flex", gap: 8, flexWrap: "wrap" },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.52)",
    display: "grid",
    placeItems: "center",
    padding: 18,
  },
  modal: {
    width: "100%",
    background: "#fff",
    borderRadius: 22,
    overflow: "hidden",
    border: "1px solid #d6deea",
    boxShadow: "0 28px 80px rgba(15,23,42,0.30)",
    maxHeight: "92vh",
    display: "grid",
    gridTemplateRows: "auto 1fr",
  },
  modalHeader: {
    padding: "14px 16px",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: { fontSize: 18, fontWeight: 900, color: "#111827" },
  errorText: { marginTop: 12, color: "#b91c1c", fontSize: 13, fontWeight: 700 },
  iconCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#111827",
    fontSize: 24,
    lineHeight: 1,
    cursor: "pointer",
  },
  modalBody: {
    padding: 16,
    overflow: "auto",
    display: "grid",
    gap: 14,
  },
  profileHero: {
    border: "1px solid #d7e2f3",
    borderRadius: 20,
    padding: 14,
    display: "flex",
    alignItems: "center",
    gap: 14,
    flexWrap: "wrap",
  },
  profileGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  cardBox: {
    border: "1px solid #d7e2f3",
    borderRadius: 18,
    background: "#fff",
    padding: 14,
  },
  cardTitle: { fontSize: 16, fontWeight: 900, color: "#111827", marginBottom: 10 },
  snapshotList: { display: "grid" },
  snapshotRow: {
    display: "grid",
    gridTemplateColumns: "140px 1fr",
    gap: 10,
    padding: "10px 0",
    borderBottom: "1px dashed #d7dee9",
    fontSize: 14,
  },
  snapshotLabel: { fontWeight: 800, color: "#475569" },
  passwordRevealWrap: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    width: "100%",
  },
  passwordText: {
    minHeight: 32,
    minWidth: 130,
    borderRadius: 10,
    border: "1px solid #c7d2fe",
    background: "#eef2ff",
    color: "#111827",
    fontWeight: 900,
    letterSpacing: "0.04em",
    padding: "7px 10px",
    display: "inline-flex",
    alignItems: "center",
    overflowWrap: "anywhere",
  },
  passwordMasked: {
    minHeight: 32,
    minWidth: 130,
    borderRadius: 10,
    border: "1px solid #d7dee9",
    background: "#f8fafc",
    color: "#334155",
    fontWeight: 900,
    letterSpacing: "0.18em",
    padding: "7px 10px",
    display: "inline-flex",
    alignItems: "center",
  },
  passwordViewBtn: {
    height: 32,
    borderRadius: 10,
    border: "1px solid #93c5fd",
    background: "#eff6ff",
    color: "#1d4ed8",
    fontWeight: 900,
    padding: "0 12px",
    cursor: "pointer",
  },
  passwordEmptyText: {
    color: "#64748b",
    fontWeight: 700,
  },
  quickGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  quickCard: {
    border: "1px solid #d7e2f3",
    borderRadius: 18,
    padding: 14,
    background: "#fff",
  },
  quickNumber: { fontSize: 20, fontWeight: 900, color: "#111827" },
  quickText: { fontSize: 14, color: "#334155", fontWeight: 700, marginTop: 4 },
  logList: { display: "grid", gap: 10 },
  logItem: {
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 12,
    background: "#fbfdff",
  },
  editGrid: { display: "grid", gap: 14 },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  field: { display: "grid", gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: 800, color: "#334155" },
  input: {
    height: 38,
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    padding: "0 12px",
    fontSize: 14,
    outline: "none",
    background: "#fff",
  },
  modalFooter: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 4,
  },
  avatarPickerGrid: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12 },
  avatarChoiceBtn: {
    border: "1px solid #d7e2f3",
    borderRadius: 16,
    background: "#fff",
    padding: 14,
    display: "grid",
    placeItems: "center",
    gap: 10,
    cursor: "pointer",
  },
  privilegeIntro: {
    border: "1px solid #d7e2f3",
    borderRadius: 18,
    padding: 14,
    background: "#f8fafc",
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  privilegeTopActions: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    flexWrap: "wrap",
  },
  permissionTableWrap: {
    border: "1px solid #cbd5e1",
    borderRadius: 16,
    overflow: "auto",
    background: "#fff",
    maxHeight: "60vh",
  },
  permissionHeaderRow: {
    display: "grid",
    gridTemplateColumns: "minmax(245px, 1.6fr) repeat(5, minmax(88px, 0.6fr))",
    background: "#f1f5f9",
    borderBottom: "1px solid #cbd5e1",
    fontWeight: 900,
    fontSize: 13,
    color: "#0f172a",
    minWidth: 720,
    position: "sticky",
    top: 0,
    zIndex: 1,
  },
  permissionModuleHead: {
    padding: "12px 14px",
    borderRight: "1px solid #cbd5e1",
  },
  permissionActionHead: {
    padding: "12px 10px",
    textAlign: "center",
    borderRight: "1px solid #cbd5e1",
  },
  permissionRow: {
    display: "grid",
    gridTemplateColumns: "minmax(245px, 1.6fr) repeat(5, minmax(88px, 0.6fr))",
    borderBottom: "1px solid #e2e8f0",
    alignItems: "stretch",
    minHeight: 54,
    minWidth: 720,
  },
  permissionModuleName: {
    padding: "10px 14px",
    fontWeight: 800,
    color: "#0f172a",
    borderRight: "1px solid #e2e8f0",
    display: "grid",
    alignContent: "center",
    gap: 4,
  },
  permissionNote: {
    display: "inline-flex",
    width: "fit-content",
    fontSize: 11,
    fontWeight: 800,
    color: "#1d4ed8",
    background: "#eff6ff",
    border: "1px solid #bfdbfe",
    borderRadius: 999,
    padding: "3px 8px",
  },
  permissionCheckCell: {
    minHeight: 54,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRight: "1px solid #e2e8f0",
    cursor: "pointer",
  },
  permissionCheckCellDisabled: {
    minHeight: 54,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRight: "1px solid #e2e8f0",
    background: "#f8fafc",
    color: "#94a3b8",
  },
  permissionCheckbox: {
    width: 18,
    height: 18,
    cursor: "pointer",
  },
  notAllowedMark: {
    fontWeight: 900,
    color: "#94a3b8",
  },
  imagePreviewWrap: {
    width: "min(92vw, 1100px)",
    height: "min(90vh, 760px)",
    borderRadius: 24,
    background: "#0f172a",
    position: "relative",
    overflow: "hidden",
    boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
  },
  imageCloseBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    width: 40,
    height: 40,
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,0.35)",
    background: "rgba(15,23,42,0.65)",
    color: "#fff",
    fontSize: 28,
    lineHeight: 1,
    cursor: "pointer",
    zIndex: 2,
  },
  imagePreviewInner: {
    width: "100%",
    height: "100%",
    display: "grid",
    placeItems: "center",
    padding: 20,
  },
  imagePreviewImg: {
    maxWidth: "100%",
    maxHeight: "100%",
    objectFit: "contain",
    borderRadius: 18,
  },
  imagePreviewFallback: {
    display: "grid",
    placeItems: "center",
    color: "#fff",
    textAlign: "center",
  },
};
