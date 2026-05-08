import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../usrmngment/auth/AuthContext";
import {
  getAccounts,
  createAccount,
  updateAccount,
  updateUserPermissions,
  activateAccount,
  deactivateAccount,
} from "../usrmngment/services/userManagementService";

const DEFAULT_AVATARS = [
  { id: "shield", label: "Shield", type: "emoji", value: "🛡️", bg: "#1f2937" },
  { id: "briefcase", label: "Briefcase", type: "emoji", value: "💼", bg: "#10b981" },
  { id: "scientist", label: "Scientist", type: "emoji", value: "🧪", bg: "#3b82f6" },
  { id: "person", label: "Person", type: "emoji", value: "🙂", bg: "#8b5cf6" },
  { id: "manager", label: "Manager", type: "emoji", value: "👨‍💼", bg: "#0ea5e9" },
  { id: "staff", label: "Staff", type: "emoji", value: "🧑‍💼", bg: "#22c55e" },
];

const PAGE_KEYS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "targetSetting", label: "Target Setting" },
  { key: "userManagement", label: "User Management" },
  { key: "tableManagement", label: "Table Management" },
  { key: "setup", label: "SETUP" },
  { key: "cest", label: "CEST" },
  { key: "sscp", label: "SSCP" },
  { key: "technologyTraining", label: "Technology Training" },
  { key: "tacs", label: "TACS" },
  { key: "pcl", label: "Packaging & Labeling" },
  { key: "specialReport", label: "Special Report" },
  { key: "promo", label: "S&T PROMO" },
  { key: "calibration", label: "Calibration" },
];

const EMPTY_PERMISSIONS = PAGE_KEYS.reduce((acc, item) => {
  acc[item.key] = { view: false, add: false, edit: false, delete: false, export: false };
  return acc;
}, {});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function safeText(value, fallback = "") {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

function buildFullName({ firstName = "", middleName = "", lastName = "", suffix = "" }) {
  return [firstName, middleName, lastName, suffix]
    .map((x) => safeText(x).trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function deriveNameParts(fullName = "") {
  const clean = safeText(fullName).trim().replace(/\s+/g, " ");
  if (!clean) return { firstName: "", middleName: "", lastName: "", suffix: "" };

  const suffixes = ["Jr.", "Sr.", "II", "III", "IV", "V"];
  const parts = clean.split(" ");
  let suffix = "";

  if (parts.length > 1 && suffixes.includes(parts[parts.length - 1])) {
    suffix = parts.pop();
  }

  return {
    firstName: parts[0] || "",
    middleName: parts.length > 2 ? parts.slice(1, -1).join(" ") : "",
    lastName: parts.length > 1 ? parts[parts.length - 1] : "",
    suffix,
  };
}

function makeAllPages(factory) {
  return PAGE_KEYS.reduce((acc, item) => {
    acc[item.key] = factory(item.key);
    return acc;
  }, {});
}

function defaultPermissionsForRole(role = "staff") {
  const normalized = String(role || "staff").toLowerCase();

  if (normalized === "superadmin") {
    return {
      pages: makeAllPages(() => ({ view: true, add: true, edit: true, delete: true, export: true })),
      special: { manageDropdowns: true, manageUsers: true },
    };
  }

  if (normalized === "admin") {
    return {
      pages: makeAllPages((key) => ({
        view: true,
        add: key !== "dashboard",
        edit: key !== "dashboard",
        delete: false,
        export: true,
      })),
      special: { manageDropdowns: true, manageUsers: true },
    };
  }

  return {
    pages: {
      ...clone(EMPTY_PERMISSIONS),
      dashboard: { view: true, add: false, edit: false, delete: false, export: false },
      targetSetting: { view: true, add: false, edit: false, delete: false, export: false },
      userManagement: { view: true, add: false, edit: false, delete: false, export: false },
      setup: { view: true, add: true, edit: true, delete: false, export: false },
      tacs: { view: true, add: true, edit: true, delete: false, export: false },
      calibration: { view: true, add: true, edit: false, delete: false, export: false },
    },
    special: { manageDropdowns: false, manageUsers: false },
  };
}

function normalizePages(rawPages = {}, role = "staff") {
  const defaults = defaultPermissionsForRole(role).pages;
  const result = clone(defaults);

  Object.keys(rawPages || {}).forEach((key) => {
    const raw = rawPages[key] || {};
    result[key] = {
      view: Boolean(raw.view ?? raw.can_view ?? false),
      add: Boolean(raw.add ?? raw.can_add ?? false),
      edit: Boolean(raw.edit ?? raw.can_edit ?? false),
      delete: Boolean(raw.delete ?? raw.can_delete ?? false),
      export: Boolean(raw.export ?? raw.can_export ?? false),
    };
  });

  if (role === "superadmin") {
    Object.keys(result).forEach((key) => {
      result[key] = { view: true, add: true, edit: true, delete: true, export: true };
    });
  }

  if (role === "admin") {
    result.tableManagement = { view: true, add: true, edit: true, delete: false, export: true };
  }

  if (role === "staff") {
    result.tableManagement = { view: false, add: false, edit: false, delete: false, export: false };
  }

  return result;
}

function normalizeUserShape(raw = {}) {
  const parts = deriveNameParts(raw.fullName || raw.full_name || "");
  const role = safeText(raw.role, "staff").toLowerCase();
  const permissionsSource = raw.permissions?.pages || raw.permissions || {};
  const specialSource = raw.permissions?.special || raw.specialPermissions || {};

  const firstName = safeText(raw.firstName || raw.first_name, parts.firstName);
  const middleName = safeText(raw.middleName || raw.middle_name, parts.middleName);
  const lastName = safeText(raw.lastName || raw.last_name, parts.lastName);
  const suffix = safeText(raw.suffix, parts.suffix);
  const fullName = safeText(raw.fullName || raw.full_name, buildFullName({ firstName, middleName, lastName, suffix }));

  return {
    ...raw,
    id: raw.id,
    firstName,
    middleName,
    lastName,
    suffix,
    fullName,
    username: safeText(raw.username),
    password: safeText(raw.password),
    email: safeText(raw.email),
    contactNumber: safeText(raw.contactNumber || raw.contact_number),
    role,
    status: safeText(raw.status, "active"),
    position: safeText(raw.position),
    office: safeText(raw.office),
    createdBy: safeText(raw.createdBy || raw.created_by),
    createdAt: safeText(raw.createdAt || raw.created_at),
    lastLogin: safeText(raw.lastLogin || raw.last_login, "Never"),
    canManageDropdowns: Boolean(
      raw.canManageDropdowns ??
        raw.can_manage_dropdowns ??
        specialSource.manageDropdowns ??
        specialSource.manage_dropdowns ??
        role !== "staff"
    ),
    avatar: raw.avatar || raw.avatar_json || DEFAULT_AVATARS[3],
    assigned: Number(raw.assigned || 0),
    completed: Number(raw.completed || 0),
    pending: Number(raw.pending || 0),
    editedRecords: Number(raw.editedRecords || raw.edited_records || 0),
    permissions: {
      pages: normalizePages(permissionsSource, role),
      special: {
        manageDropdowns: Boolean(specialSource.manageDropdowns ?? specialSource.manage_dropdowns ?? role !== "staff"),
        manageUsers: Boolean(specialSource.manageUsers ?? specialSource.manage_users ?? role !== "staff"),
      },
    },
  };
}

function makeNewAccountForm(currentRole = "superadmin") {
  return {
    firstName: "",
    middleName: "",
    lastName: "",
    suffix: "",
    username: "",
    password: "1234",
    email: "",
    contactNumber: "",
    role: currentRole === "admin" ? "staff" : "staff",
    status: "active",
    position: "",
    office: "",
    avatar: clone(DEFAULT_AVATARS[3]),
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

function pageAccessSummary(user) {
  if (!user) return "—";
  if (user.role === "superadmin") return "Full access to all modules";

  const pages = user.permissions?.pages || {};
  const allowed = PAGE_KEYS.filter((item) => pages[item.key]?.view).map((item) => item.label);

  if (!allowed.length) return "No module access";
  return allowed.length > 2 ? `${allowed.slice(0, 2).join(", ")} +${allowed.length - 2}` : allowed.join(", ");
}

function renderAvatar(avatar, size = 72) {
  let parsed = avatar;
  if (typeof avatar === "string") {
    try {
      parsed = JSON.parse(avatar);
    } catch {
      parsed = null;
    }
  }

  const boxStyle = {
    width: size,
    height: size,
    borderRadius: "999px",
    overflow: "hidden",
    background: parsed?.bg || "#e5e7eb",
    display: "grid",
    placeItems: "center",
    color: "#fff",
    fontSize: size * 0.42,
    fontWeight: 800,
    boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.35)",
    flexShrink: 0,
  };

  if (parsed?.type === "upload" && parsed?.value) {
    return <img src={parsed.value} alt="Profile" style={{ ...boxStyle, objectFit: "cover" }} />;
  }

  return <div style={boxStyle}>{parsed?.value || "🙂"}</div>;
}

function EmptyState({ text }) {
  return <div style={styles.emptyState}>{text}</div>;
}

function ModalShell({ title, onClose, children, width = 920, zIndex = 1400 }) {
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

export default function UserMgmt() {
  const auth = useAuth();
  const currentUser = auth?.user || null;
  const fileInputRef = useRef(null);
  const addFileInputRef = useRef(null);

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState("");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);

  const [viewUser, setViewUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [privilegeUser, setPrivilegeUser] = useState(null);
  const [privilegeDraft, setPrivilegeDraft] = useState(null);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [addForm, setAddForm] = useState(() => makeNewAccountForm(currentUser?.role));
  const [addError, setAddError] = useState("");
  const [showAvatarPickerFor, setShowAvatarPickerFor] = useState(null);
  const [imagePreviewUser, setImagePreviewUser] = useState(null);

  async function loadUsers() {
    setLoading(true);
    setPageError("");

    try {
      const accounts = await getAccounts();
      const normalized = accounts.map((item) => normalizeUserShape(item));
      setUsers(normalized);
    } catch (error) {
      console.error("Load users from database error:", error);
      setPageError(error.message || "Hindi ma-load ang users mula sa database.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (!users.length) return;

    const match =
      users.find((u) => String(u.id) === String(currentUser?.id)) ||
      users.find((u) => u.username === currentUser?.username) ||
      users.find((u) => u.role === currentUser?.role) ||
      users[0];

    setSelectedUser(match || null);
  }, [currentUser, users]);

  const currentAccount = useMemo(() => {
    return (
      users.find((u) => String(u.id) === String(currentUser?.id)) ||
      users.find((u) => u.username === currentUser?.username) ||
      selectedUser ||
      users[0] ||
      null
    );
  }, [currentUser, selectedUser, users]);

  const visibleUsers = useMemo(() => {
    const currentRole = currentUser?.role || "superadmin";
    let base = [...users];

    if (currentRole === "admin" || currentRole === "staff") {
      base = base.filter((u) => u.role !== "superadmin");
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      base = base.filter((u) =>
        [u.fullName, u.username, u.email, u.role, u.position, u.office]
          .some((value) => safeText(value).toLowerCase().includes(q))
      );
    }

    if (roleFilter !== "all") base = base.filter((u) => u.role === roleFilter);
    if (statusFilter !== "all") base = base.filter((u) => u.status === statusFilter);

    return base;
  }, [users, search, roleFilter, statusFilter, currentUser]);

  const stats = useMemo(() => {
    const visibleForRole =
      currentUser?.role === "superadmin"
        ? users
        : users.filter((u) => u.role !== "superadmin");

    return {
      total: visibleForRole.length,
      active: visibleForRole.filter((u) => u.status === "active").length,
      admins: visibleForRole.filter((u) => u.role === "admin").length,
      staff: visibleForRole.filter((u) => u.role === "staff").length,
    };
  }, [users, currentUser]);

  function openAddAccount() {
    setAddError("");
    setAddForm(makeNewAccountForm(currentUser?.role));
    setShowAddAccount(true);
  }

  function updateAddForm(key, value) {
    setAddForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateEditField(key, value) {
    setEditingUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, [key]: value };
      if (["firstName", "middleName", "lastName", "suffix"].includes(key)) {
        next.fullName = buildFullName(next);
      }
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

    if (users.some((u) => safeText(u.username).toLowerCase() === username.toLowerCase())) {
      setAddError("Username already exists.");
      return;
    }

    if (currentUser?.role === "admin" && addForm.role !== "staff") {
      setAddError("Admin can only create User/Staff accounts.");
      return;
    }

    const role = safeText(addForm.role, "staff").toLowerCase();
    const permissions = defaultPermissionsForRole(role);

    const payload = {
      firstName,
      middleName,
      lastName,
      suffix,
      fullName: buildFullName({ firstName, middleName, lastName, suffix }),
      username,
      password: safeText(addForm.password, "1234"),
      email: safeText(addForm.email),
      contactNumber: safeText(addForm.contactNumber),
      role,
      status: safeText(addForm.status, "active"),
      position: safeText(addForm.position),
      office: safeText(addForm.office),
      createdBy: currentAccount?.fullName || currentUser?.fullName || roleLabel(currentUser?.role),
      canManageDropdowns: role !== "staff",
      avatar: addForm.avatar || DEFAULT_AVATARS[3],
      permissions,
      specialPermissions: permissions.special,
    };

    setSaving(true);
    setAddError("");

    try {
      const saved = await createAccount(payload);
      setUsers((prev) => [...prev, normalizeUserShape(saved)]);
      setShowAddAccount(false);
      setAddForm(makeNewAccountForm(currentUser?.role));
    } catch (error) {
      console.error("Create account error:", error);
      setAddError(error.message || "Hindi na-save ang account sa database.");
    } finally {
      setSaving(false);
    }
  }

  async function saveEditUser() {
    if (!editingUser) return;

    const fullName = buildFullName(editingUser);
    const role = safeText(editingUser.role, "staff").toLowerCase();
    const permissions = {
      pages: normalizePages(editingUser.permissions?.pages || {}, role),
      special: {
        manageDropdowns: role !== "staff",
        manageUsers: role !== "staff",
      },
    };

    const payload = {
      ...editingUser,
      fullName,
      role,
      contactNumber: editingUser.contactNumber,
      canManageDropdowns: role !== "staff",
      permissions,
      specialPermissions: permissions.special,
    };

    setSaving(true);

    try {
      const saved = await updateAccount(editingUser.id, payload);
      setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? normalizeUserShape(saved) : u)));
      setEditingUser(null);
    } catch (error) {
      console.error("Update account error:", error);
      alert(error.message || "Hindi na-update ang account sa database.");
    } finally {
      setSaving(false);
    }
  }

  function openPrivileges(user) {
    const normalized = normalizeUserShape(user);
    setPrivilegeUser(normalized);
    setPrivilegeDraft(clone(normalized.permissions?.pages || EMPTY_PERMISSIONS));
    setViewUser(null);
  }

  async function savePrivileges() {
    if (!privilegeUser || !privilegeDraft) return;

    const role = privilegeUser.role;
    const pages = normalizePages(privilegeDraft, role);
    const special = {
      manageDropdowns: role !== "staff",
      manageUsers: role !== "staff",
    };

    setSaving(true);

    try {
      const saved = await updateUserPermissions(privilegeUser.id, { pages, special });
      setUsers((prev) => prev.map((u) => (u.id === privilegeUser.id ? normalizeUserShape(saved) : u)));
      setPrivilegeUser(null);
      setPrivilegeDraft(null);
    } catch (error) {
      console.error("Update permissions error:", error);
      alert(error.message || "Hindi na-save ang privileges sa database.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(user) {
    setSaving(true);

    try {
      const saved = user.status === "active"
        ? await deactivateAccount(user.id)
        : await activateAccount(user.id);

      setUsers((prev) => prev.map((u) => (u.id === user.id ? normalizeUserShape(saved) : u)));
    } catch (error) {
      console.error("Toggle status error:", error);
      alert(error.message || "Hindi napalitan ang status sa database.");
    } finally {
      setSaving(false);
    }
  }

  function onUploadAvatar(event, target = "add") {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const avatar = {
        id: `upload_${Date.now()}`,
        label: "Uploaded Photo",
        type: "upload",
        value: reader.result,
        bg: "#111827",
      };

      if (target === "add") {
        setAddForm((prev) => ({ ...prev, avatar }));
      } else {
        setEditingUser((prev) => (prev ? { ...prev, avatar } : prev));
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div style={styles.pageWrap}>
      <div style={styles.hero}>
        <div>
          <div style={styles.heroTitle}>User Management</div>
          <div style={styles.heroSub}>Database-connected accounts from MySQL user_accounts table.</div>
        </div>
        <div style={styles.rolePill}>{roleLabel(currentUser?.role || currentAccount?.role || "staff")}</div>
      </div>

      {pageError ? (
        <div style={styles.errorBanner}>
          <strong>Database error:</strong> {pageError}
          <button type="button" style={styles.smallBtn} onClick={loadUsers}>Retry</button>
        </div>
      ) : null}

      {currentAccount ? (
        <div style={styles.topProfileGrid}>
          <div style={styles.topProfileCard}>
            <button type="button" style={styles.avatarButton} onClick={() => setImagePreviewUser(currentAccount)}>
              {renderAvatar(currentAccount.avatar, 86)}
            </button>
            <div style={{ flex: 1 }}>
              <div style={styles.topProfileName}>{currentAccount.fullName}</div>
              <div style={styles.topProfileMeta}>{currentAccount.email || "No email address"}</div>
              <div style={styles.badgeRow}>
                <span style={{ ...styles.badge, ...roleBadgeStyle(currentAccount.role) }}>{roleLabel(currentAccount.role)}</span>
                <span style={{ ...styles.badge, ...statusBadgeStyle(currentAccount.status) }}>{currentAccount.status}</span>
              </div>
            </div>
            <button type="button" style={styles.smallBtn} onClick={() => setEditingUser(clone(currentAccount))}>Edit Profile</button>
          </div>

          <div style={styles.topInfoCard}>
            <div><strong>Position:</strong> {currentAccount.position || "—"}</div>
            <div><strong>Office:</strong> {currentAccount.office || "—"}</div>
            <div><strong>Created At:</strong> {currentAccount.createdAt || "—"}</div>
            <div><strong>Last Login:</strong> {currentAccount.lastLogin || "Never"}</div>
          </div>
        </div>
      ) : null}

      <div style={styles.statGrid}>
        <div style={styles.statCard}><div style={styles.statNumber}>{stats.total}</div><div style={styles.statLabel}>TOTAL ACCOUNTS</div></div>
        <div style={styles.statCard}><div style={styles.statNumber}>{stats.active}</div><div style={styles.statLabel}>ACTIVE ACCOUNTS</div></div>
        <div style={styles.statCard}><div style={styles.statNumber}>{stats.admins}</div><div style={styles.statLabel}>ADMINS</div></div>
        <div style={styles.statCard}><div style={styles.statNumber}>{stats.staff}</div><div style={styles.statLabel}>STAFF</div></div>
      </div>

      <div style={styles.panel}>
        <div style={styles.panelHeader}>
          <div>
            <div style={styles.sectionTitle}>Accounts Directory</div>
            <div style={styles.sectionSub}>Add, edit, activate/deactivate, and manage permissions through the backend API.</div>
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
            <button type="button" style={styles.smallBtn} onClick={loadUsers} disabled={loading}>Refresh</button>
            {currentUser?.role !== "staff" ? (
              <button type="button" style={styles.primaryBtn} onClick={openAddAccount} disabled={saving}>+ Add Account</button>
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
              {loading ? (
                <tr><td colSpan={7}><EmptyState text="Loading users from database..." /></td></tr>
              ) : !visibleUsers.length ? (
                <tr><td colSpan={7}><EmptyState text="No accounts found." /></td></tr>
              ) : visibleUsers.map((u) => {
                const staffRestricted = currentAccount?.role === "staff" && u.id !== currentAccount?.id;
                const adminRestricted = currentAccount?.role === "admin" && u.role === "admin" && u.id !== currentAccount?.id;
                const canModify = currentUser?.role !== "staff" && !staffRestricted && !adminRestricted;

                return (
                  <tr key={u.id}>
                    <td style={styles.td}>
                      <div style={styles.profileCell}>
                        <button type="button" style={styles.avatarButton} onClick={() => setImagePreviewUser(u)}>
                          {renderAvatar(u.avatar, 40)}
                        </button>
                        <div>
                          <div style={{ fontWeight: 800 }}>{u.fullName || "—"}</div>
                          <div style={styles.mutedSmall}>{u.email || "No email"}</div>
                        </div>
                      </div>
                    </td>
                    <td style={styles.td}>{u.username}</td>
                    <td style={styles.td}><span style={{ ...styles.badge, ...roleBadgeStyle(u.role) }}>{roleLabel(u.role)}</span></td>
                    <td style={styles.td}><span style={{ ...styles.badge, ...statusBadgeStyle(u.status) }}>{u.status}</span></td>
                    <td style={styles.td}>
                      <div>{u.position || "—"}</div>
                      <div style={styles.mutedSmall}>{u.office || "—"}</div>
                    </td>
                    <td style={styles.td}>{pageAccessSummary(u)}</td>
                    <td style={styles.td}>
                      <div style={styles.actionWrap}>
                        <button type="button" style={styles.smallBtn} onClick={() => setViewUser(u)}>View</button>
                        {canModify ? <button type="button" style={styles.smallBtn} onClick={() => setEditingUser(clone(u))}>Edit</button> : null}
                        {canModify ? <button type="button" style={styles.smallBtn} onClick={() => openPrivileges(u)}>Privileges</button> : null}
                        {canModify ? (
                          <button type="button" style={styles.smallDangerBtn} onClick={() => toggleStatus(u)} disabled={saving}>
                            {u.status === "active" ? "Deactivate" : "Activate"}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showAddAccount && (
        <ModalShell title="Add Account" onClose={() => setShowAddAccount(false)} width={900}>
          <AccountForm
            form={addForm}
            setForm={setAddForm}
            currentUser={currentUser}
            error={addError}
            fileInputRef={addFileInputRef}
            onUpload={(e) => onUploadAvatar(e, "add")}
            onChooseAvatar={() => setShowAvatarPickerFor({ mode: "add" })}
          />
          <div style={styles.modalFooter}>
            <button type="button" style={styles.smallBtn} onClick={() => setShowAddAccount(false)}>Cancel</button>
            <button type="button" style={styles.primaryBtn} onClick={saveAddAccount} disabled={saving}>
              {saving ? "Saving..." : "Save Account"}
            </button>
          </div>
        </ModalShell>
      )}

      {editingUser && (
        <ModalShell title="Edit Account" onClose={() => setEditingUser(null)} width={900} zIndex={1500}>
          <EditForm
            user={editingUser}
            currentUser={currentUser}
            onChange={updateEditField}
            fileInputRef={fileInputRef}
            onUpload={(e) => onUploadAvatar(e, "edit")}
            onChooseAvatar={() => setShowAvatarPickerFor({ mode: "edit" })}
          />
          <div style={styles.modalFooter}>
            <button type="button" style={styles.smallBtn} onClick={() => setEditingUser(null)}>Cancel</button>
            <button type="button" style={styles.primaryBtn} onClick={saveEditUser} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </ModalShell>
      )}

      {viewUser && (
        <ModalShell title="Account Profile" onClose={() => setViewUser(null)} width={980} zIndex={1450}>
          <div style={styles.profileHero}>
            <button type="button" style={styles.avatarButton} onClick={() => setImagePreviewUser(viewUser)}>
              {renderAvatar(viewUser.avatar, 86)}
            </button>
            <div style={{ flex: 1 }}>
              <div style={styles.profileName}>{viewUser.fullName}</div>
              <div style={styles.mutedSmall}>@{viewUser.username} • {viewUser.position || "—"} • {viewUser.office || "—"}</div>
              <div style={styles.badgeRow}>
                <span style={{ ...styles.badge, ...roleBadgeStyle(viewUser.role) }}>{roleLabel(viewUser.role)}</span>
                <span style={{ ...styles.badge, ...statusBadgeStyle(viewUser.status) }}>{viewUser.status}</span>
              </div>
            </div>
          </div>

          <div style={styles.profileGrid}>
            <InfoCard title="Profile Snapshot" rows={[
              ["Full Name", viewUser.fullName],
              ["Username", viewUser.username],
              ["Email", viewUser.email || "—"],
              ["Contact Number", viewUser.contactNumber || "—"],
              ["Role", roleLabel(viewUser.role)],
              ["Status", viewUser.status],
              ["Position", viewUser.position || "—"],
              ["Office", viewUser.office || "—"],
              ["Created By", viewUser.createdBy || "—"],
              ["Created At", viewUser.createdAt || "—"],
              ["Last Login", viewUser.lastLogin || "Never"],
            ]} />

            <InfoCard title="Work Summary" rows={[
              ["Assigned", viewUser.assigned || 0],
              ["Completed", viewUser.completed || 0],
              ["Pending", viewUser.pending || 0],
              ["Edited Records", viewUser.editedRecords || 0],
              ["Access", pageAccessSummary(viewUser)],
            ]} />
          </div>
        </ModalShell>
      )}

      {privilegeUser && privilegeDraft && (
        <ModalShell title="Edit Privileges" onClose={() => { setPrivilegeUser(null); setPrivilegeDraft(null); }} width={1040} zIndex={1600}>
          <div style={styles.permissionsGrid}>
            {PAGE_KEYS.map((page) => {
              const p = privilegeDraft?.[page.key] || {};
              const locked = page.key === "tableManagement" && ["admin", "staff"].includes(privilegeUser.role);

              return (
                <div key={page.key} style={styles.permCard}>
                  <div style={styles.permTitle}>{page.label}</div>
                  {["view", "add", "edit", "delete", "export"].map((action) => {
                    const forcedChecked =
                      page.key === "tableManagement" && privilegeUser.role === "admin"
                        ? ["view", "add", "edit", "export"].includes(action)
                        : page.key === "tableManagement" && privilegeUser.role === "staff"
                        ? false
                        : Boolean(p[action]);

                    return (
                      <label key={action} style={styles.checkboxRow}>
                        <input
                          type="checkbox"
                          checked={forcedChecked}
                          disabled={locked || privilegeUser.role === "superadmin"}
                          onChange={(e) => {
                            setPrivilegeDraft((prev) => ({
                              ...prev,
                              [page.key]: {
                                ...(prev?.[page.key] || {}),
                                [action]: e.target.checked,
                              },
                            }));
                          }}
                        />
                        <span>{action.charAt(0).toUpperCase() + action.slice(1)}</span>
                      </label>
                    );
                  })}
                </div>
              );
            })}
          </div>

          <div style={styles.modalFooter}>
            <button type="button" style={styles.smallBtn} onClick={() => { setPrivilegeUser(null); setPrivilegeDraft(null); }}>Cancel</button>
            <button type="button" style={styles.primaryBtn} onClick={savePrivileges} disabled={saving}>
              {saving ? "Saving..." : "Save Privileges"}
            </button>
          </div>
        </ModalShell>
      )}

      {showAvatarPickerFor && (
        <ModalShell title="Choose Profile Picture" onClose={() => setShowAvatarPickerFor(null)} width={720} zIndex={1700}>
          <div style={styles.avatarPickerGrid}>
            {DEFAULT_AVATARS.map((avatar) => (
              <button
                type="button"
                key={avatar.id}
                style={styles.avatarChoiceBtn}
                onClick={() => {
                  if (showAvatarPickerFor.mode === "add") {
                    setAddForm((prev) => ({ ...prev, avatar: clone(avatar) }));
                  } else {
                    setEditingUser((prev) => (prev ? { ...prev, avatar: clone(avatar) } : prev));
                  }
                  setShowAvatarPickerFor(null);
                }}
              >
                {renderAvatar(avatar, 72)}
                <div style={{ fontWeight: 800 }}>{avatar.label}</div>
              </button>
            ))}
          </div>
        </ModalShell>
      )}

      {imagePreviewUser && (
        <div style={{ ...styles.overlay, zIndex: 1800 }} onClick={() => setImagePreviewUser(null)}>
          <div style={styles.imagePreviewWrap} onClick={(e) => e.stopPropagation()}>
            <button type="button" style={styles.imageCloseBtn} onClick={() => setImagePreviewUser(null)}>×</button>
            <div style={styles.imagePreviewInner}>
              {renderAvatar(imagePreviewUser.avatar, 220)}
              <div style={{ marginTop: 18, fontSize: 22, fontWeight: 900, color: "#fff" }}>{imagePreviewUser.fullName}</div>
              <div style={{ color: "#d1d5db" }}>{roleLabel(imagePreviewUser.role)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AccountForm({ form, setForm, currentUser, error, fileInputRef, onUpload, onChooseAvatar }) {
  const fields = [
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
  ];

  return (
    <div style={styles.editGrid}>
      <div style={styles.cardBox}>
        <div style={styles.cardTitle}>New Account Details</div>
        <div style={styles.formGrid}>
          {fields.map(([label, key, required]) => (
            <label key={key} style={styles.field}>
              <span style={styles.fieldLabel}>{label}{required ? " *" : ""}</span>
              <input
                style={styles.input}
                value={safeText(form[key])}
                onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder={key === "password" ? "Default: 1234" : ""}
              />
            </label>
          ))}

          <label style={styles.field}>
            <span style={styles.fieldLabel}>Role</span>
            <select
              style={styles.input}
              value={form.role}
              onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
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
              value={form.status}
              onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>

          <label style={{ ...styles.field, gridColumn: "1 / -1" }}>
            <span style={styles.fieldLabel}>Auto-generated Display Name</span>
            <input style={{ ...styles.input, background: "#f8fafc" }} value={buildFullName(form)} readOnly />
          </label>
        </div>
        {error ? <div style={styles.errorText}>{error}</div> : null}
      </div>

      <AvatarEditor avatar={form.avatar} fileInputRef={fileInputRef} onUpload={onUpload} onChooseAvatar={onChooseAvatar} />
    </div>
  );
}

function EditForm({ user, currentUser, onChange, fileInputRef, onUpload, onChooseAvatar }) {
  const fields = [
    ["First Name", "firstName"],
    ["Middle Name", "middleName"],
    ["Last Name", "lastName"],
    ["Suffix", "suffix"],
    ["Username", "username"],
    ["Email", "email"],
    ["Contact Number", "contactNumber"],
    ["Position", "position"],
    ["Office", "office"],
  ];

  return (
    <div style={styles.editGrid}>
      <AvatarEditor avatar={user.avatar} fileInputRef={fileInputRef} onUpload={onUpload} onChooseAvatar={onChooseAvatar} />

      <div style={styles.cardBox}>
        <div style={styles.cardTitle}>Account Details</div>
        <div style={styles.formGrid}>
          {fields.map(([label, key]) => (
            <label key={key} style={styles.field}>
              <span style={styles.fieldLabel}>{label}</span>
              <input style={styles.input} value={safeText(user[key])} onChange={(e) => onChange(key, e.target.value)} />
            </label>
          ))}

          <label style={{ ...styles.field, gridColumn: "1 / -1" }}>
            <span style={styles.fieldLabel}>Auto-generated Display Name</span>
            <input style={{ ...styles.input, background: "#f8fafc" }} value={safeText(user.fullName)} readOnly />
          </label>

          <label style={styles.field}>
            <span style={styles.fieldLabel}>Role</span>
            <select
              style={styles.input}
              value={user.role}
              onChange={(e) => onChange("role", e.target.value)}
              disabled={currentUser?.role !== "superadmin"}
            >
              <option value="superadmin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="staff">User/Staff</option>
            </select>
          </label>

          <label style={styles.field}>
            <span style={styles.fieldLabel}>Status</span>
            <select style={styles.input} value={user.status} onChange={(e) => onChange("status", e.target.value)}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  );
}

function AvatarEditor({ avatar, fileInputRef, onUpload, onChooseAvatar }) {
  return (
    <div style={styles.cardBox}>
      <div style={styles.cardTitle}>Profile Picture</div>
      <div style={styles.avatarEditRow}>
        {renderAvatar(avatar, 92)}
        <div style={{ display: "grid", gap: 8 }}>
          <button type="button" style={styles.smallBtn} onClick={onChooseAvatar}>Choose Default Avatar</button>
          <button type="button" style={styles.smallBtn} onClick={() => fileInputRef.current?.click()}>Upload from Device</button>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onUpload} />
        </div>
      </div>
    </div>
  );
}

function InfoCard({ title, rows }) {
  return (
    <div style={styles.cardBox}>
      <div style={styles.cardTitle}>{title}</div>
      <div style={styles.snapshotList}>
        {rows.map(([label, value]) => (
          <div key={label} style={styles.snapshotRow}>
            <div style={styles.snapshotLabel}>{label}</div>
            <div>{value}</div>
          </div>
        ))}
      </div>
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
  heroTitle: { fontSize: 20, fontWeight: 900, marginBottom: 4 },
  heroSub: { fontSize: 13, opacity: 0.95 },
  rolePill: {
    background: "#eef4ff",
    color: "#1d4ed8",
    borderRadius: 999,
    padding: "8px 12px",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
  },
  errorBanner: {
    background: "#fef2f2",
    color: "#991b1b",
    border: "1px solid #fecaca",
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
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
  topProfileName: { fontSize: 22, fontWeight: 900, color: "#111827" },
  topProfileMeta: { color: "#374151", marginTop: 2, fontSize: 15 },
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
  statNumber: { fontSize: 20, fontWeight: 900, color: "#111827" },
  statLabel: { fontSize: 12, fontWeight: 900, color: "#334155", marginTop: 2 },
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
    fontWeight: 900,
    padding: "0 14px",
    cursor: "pointer",
  },
  smallBtn: {
    height: 34,
    borderRadius: 10,
    border: "1px solid #cbd5e1",
    background: "#fff",
    color: "#111827",
    fontWeight: 800,
    padding: "0 12px",
    cursor: "pointer",
  },
  smallDangerBtn: {
    height: 34,
    borderRadius: 10,
    border: "1px solid #fecaca",
    background: "#fff5f5",
    color: "#dc2626",
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
    fontWeight: 900,
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
    fontWeight: 900,
    borderRadius: 999,
    padding: "5px 10px",
    display: "inline-flex",
    alignItems: "center",
    lineHeight: 1,
  },
  actionWrap: { display: "flex", gap: 8, flexWrap: "wrap" },
  profileCell: { display: "flex", alignItems: "center", gap: 10 },
  avatarButton: { border: "none", background: "transparent", padding: 0, cursor: "pointer" },
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
  modalBody: { padding: 16, overflow: "auto", display: "grid", gap: 14 },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 },
  cardBox: { border: "1px solid #d7e2f3", borderRadius: 18, background: "#fff", padding: 14 },
  cardTitle: { fontSize: 16, fontWeight: 900, color: "#111827", marginBottom: 10 },
  editGrid: { display: "grid", gap: 14 },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  field: { display: "grid", gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: 900, color: "#334155" },
  input: {
    height: 38,
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    padding: "0 12px",
    fontSize: 14,
    outline: "none",
    background: "#fff",
  },
  errorText: { marginTop: 12, color: "#b91c1c", fontSize: 13, fontWeight: 800 },
  avatarEditRow: { display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" },
  profileHero: {
    border: "1px solid #d7e2f3",
    borderRadius: 20,
    padding: 14,
    display: "flex",
    alignItems: "center",
    gap: 14,
    flexWrap: "wrap",
  },
  profileName: { fontSize: 20, fontWeight: 900, color: "#111827" },
  profileGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  snapshotList: { display: "grid" },
  snapshotRow: {
    display: "grid",
    gridTemplateColumns: "140px 1fr",
    gap: 10,
    padding: "10px 0",
    borderBottom: "1px dashed #d7dee9",
    fontSize: 14,
  },
  snapshotLabel: { fontWeight: 900, color: "#475569" },
  permissionsGrid: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 12 },
  permCard: { border: "1px solid #d7e2f3", borderRadius: 16, padding: 12, background: "#fff" },
  permTitle: { fontWeight: 900, marginBottom: 8, color: "#111827" },
  checkboxRow: { display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 13, color: "#334155" },
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
  emptyState: { padding: 18, textAlign: "center", color: "#6b7280", fontSize: 13 },
  imagePreviewWrap: {
    width: "min(92vw, 760px)",
    height: "min(90vh, 620px)",
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
  imagePreviewInner: { width: "100%", height: "100%", display: "grid", placeItems: "center", alignContent: "center", padding: 20 },
};
