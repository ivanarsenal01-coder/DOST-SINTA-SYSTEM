// src/usrmngment/services/userManagementService.js
// MySQL/API version.
// Backend required routes:
// POST   /api/login
// GET    /api/users
// GET    /api/users/:id
// POST   /api/users
// PUT    /api/users/:id
// PUT    /api/users/:id/permissions
// PUT    /api/users/:id/activate
// PUT    /api/users/:id/deactivate
// PUT    /api/users/:id/reset-password
// DELETE /api/users/:id

import API_BASE_CONFIG from "../../api";

const API_BASE = API_BASE_CONFIG.replace(/\/$/, "");

const MODULE_KEYS = [
  "dashboard",
  "targetSetting",
  "userManagement",
  "tableManagement",
  "setup",
  "cest",
  "sscp",
  "technologyTraining",
  "tacs",
  "pcl",
  "specialReport",
  "promo",
  "calibration",
];

function emptyPageAccess() {
  return { view: true, add: false, edit: false, delete: false, export: false };
}

function fullAccessPage() {
  return { view: true, add: true, edit: true, delete: true, export: true };
}

function makeAllPages(factory) {
  return MODULE_KEYS.reduce((acc, key) => {
    acc[key] = factory(key);
    return acc;
  }, {});
}

export function defaultSuperAdminPermissions() {
  return {
    pages: makeAllPages(() => fullAccessPage()),
    special: {
      manageDropdowns: true,
      manageUsers: true,
    },
  };
}

export function defaultAdminPermissions() {
  return {
    pages: makeAllPages((key) => {
      if (key === "dashboard") {
        return {
          view: true,
          add: false,
          edit: false,
          delete: false,
          export: true,
        };
      }

      if (key === "userManagement") {
        return {
          view: true,
          add: true,
          edit: true,
          delete: false,
          export: true,
        };
      }

      return {
        view: true,
        add: true,
        edit: true,
        delete: false,
        export: true,
      };
    }),
    special: {
      manageDropdowns: true,
      manageUsers: true,
    },
  };
}

export function defaultStaffPermissions(overrides = {}) {
  const basePages = makeAllPages(() => emptyPageAccess());

  Object.entries(overrides).forEach(([pageKey, value]) => {
    if (!basePages[pageKey]) return;
    basePages[pageKey] = {
      ...basePages[pageKey],
      ...value,
      view: true,
    };
  });

  return {
    pages: basePages,
    special: {
      manageDropdowns: false,
      manageUsers: false,
    },
  };
}

function getDefaultPermissionsByRole(role = "staff") {
  const normalized = String(role || "staff").toLowerCase();

  if (normalized === "superadmin") return defaultSuperAdminPermissions();
  if (normalized === "admin") return defaultAdminPermissions();

  return defaultStaffPermissions({
    setup: { add: true, edit: true },
    tacs: { add: true, edit: true },
    calibration: { add: true },
  });
}

function normalizePagePermissions(rawPages = {}) {
  const pages = {};

  MODULE_KEYS.forEach((key) => {
    const raw = rawPages?.[key] || {};
    pages[key] = {
      view: Boolean(raw.view ?? raw.can_view ?? false),
      add: Boolean(raw.add ?? raw.can_add ?? false),
      edit: Boolean(raw.edit ?? raw.can_edit ?? false),
      delete: Boolean(raw.delete ?? raw.can_delete ?? false),
      export: Boolean(raw.export ?? raw.can_export ?? false),
    };
  });

  Object.keys(rawPages || {}).forEach((key) => {
    if (pages[key]) return;

    const raw = rawPages[key] || {};
    pages[key] = {
      view: Boolean(raw.view ?? raw.can_view ?? false),
      add: Boolean(raw.add ?? raw.can_add ?? false),
      edit: Boolean(raw.edit ?? raw.can_edit ?? false),
      delete: Boolean(raw.delete ?? raw.can_delete ?? false),
      export: Boolean(raw.export ?? raw.can_export ?? false),
    };
  });

  return pages;
}

function normalizePermissions(rawPermissions = {}, role = "staff") {
  const defaults = getDefaultPermissionsByRole(role);

  const pagesSource =
    rawPermissions.pages ||
    rawPermissions.permissions ||
    rawPermissions ||
    {};

  const specialSource =
    rawPermissions.special ||
    rawPermissions.specialPermissions ||
    {};

  return {
    pages: {
      ...defaults.pages,
      ...normalizePagePermissions(pagesSource),
    },
    special: {
      ...defaults.special,
      manageDropdowns:
        specialSource.manageDropdowns ??
        specialSource.manage_dropdowns ??
        defaults.special.manageDropdowns,
      manageUsers:
        specialSource.manageUsers ??
        specialSource.manage_users ??
        defaults.special.manageUsers,
    },
  };
}

function normalizeAccount(raw = {}) {
  const role = raw.role || "staff";
  const permissions = normalizePermissions(raw.permissions || {}, role);

  return {
    ...raw,

    id: raw.id,
    firstName: raw.firstName || raw.first_name || "",
    middleName: raw.middleName || raw.middle_name || "",
    lastName: raw.lastName || raw.last_name || "",
    suffix: raw.suffix || "",
    fullName: raw.fullName || raw.full_name || "",
    username: raw.username || "",
    password: raw.password || "",

    email: raw.email || "",
    contactNumber: raw.contactNumber || raw.contact_number || "",

    role,
    status: raw.status || "active",
    position: raw.position || "",
    office: raw.office || "",
    createdBy: raw.createdBy || raw.created_by || "",

    canManageDropdowns:
      raw.canManageDropdowns ??
      raw.can_manage_dropdowns ??
      permissions.special.manageDropdowns,

    createdAt: raw.createdAt || raw.created_at || "",
    lastLogin: raw.lastLogin || raw.last_login || "Never",

    avatar: raw.avatar || null,

    assigned: Number(raw.assigned || 0),
    completed: Number(raw.completed || 0),
    pending: Number(raw.pending || 0),
    editedRecords: Number(raw.editedRecords || raw.edited_records || 0),

    permissions,
    specialPermissions: raw.specialPermissions || permissions.special,

    assignments: Array.isArray(raw.assignments) ? raw.assignments : [],
    accomplishments: Array.isArray(raw.accomplishments) ? raw.accomplishments : [],
  };
}

function normalizeAccountPayload(payload = {}) {
  const role = String(payload.role || "staff").toLowerCase();
  const permissions = payload.permissions || getDefaultPermissionsByRole(role);

  return {
    ...payload,

    firstName: payload.firstName || payload.first_name || "",
    middleName: payload.middleName || payload.middle_name || "",
    lastName: payload.lastName || payload.last_name || "",
    suffix: payload.suffix || "",
    fullName:
      payload.fullName ||
      payload.full_name ||
      [
        payload.firstName || payload.first_name,
        payload.middleName || payload.middle_name,
        payload.lastName || payload.last_name,
        payload.suffix,
      ]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),

    username: payload.username || "",
    password: payload.password || "1234",

    email: payload.email || "",
    contactNumber: payload.contactNumber || payload.contact_number || "",

    role,
    status: payload.status || "active",
    position: payload.position || "",
    office: payload.office || "",
    createdBy: payload.createdBy || payload.created_by || "",

    canManageDropdowns:
      payload.canManageDropdowns ??
      payload.can_manage_dropdowns ??
      permissions?.special?.manageDropdowns ??
      role !== "staff",

    avatar: payload.avatar || null,
    permissions,
    specialPermissions:
      payload.specialPermissions ||
      permissions.special ||
      {
        manageDropdowns: false,
        manageUsers: false,
      },
  };
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let payload = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!response.ok) {
    const message =
      payload?.message ||
      payload?.error ||
      `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return payload;
}

// Kept for compatibility with old imports.
// This no longer seeds localStorage.
export function seedAccounts() {
  return [
    {
      id: 1,
      fullName: "Super Admin",
      username: "superadmin",
      role: "superadmin",
      status: "active",
      position: "System Owner",
      office: "Provincial Office",
      contactNumber: "09170000001",
      email: "superadmin@dost.gov.ph",
      permissions: defaultSuperAdminPermissions(),
      assignments: [],
      accomplishments: [],
    },
    {
      id: 2,
      fullName: "Main Admin",
      username: "admin",
      role: "admin",
      status: "active",
      position: "Administrator",
      office: "Provincial Office",
      contactNumber: "09170000002",
      email: "admin@dost.gov.ph",
      permissions: defaultAdminPermissions(),
      assignments: [],
      accomplishments: [],
    },
    {
      id: 3,
      fullName: "Juan Dela Cruz",
      username: "juan",
      role: "staff",
      status: "active",
      position: "Project Staff",
      office: "Operations Unit",
      contactNumber: "09170000003",
      email: "juan@dost.gov.ph",
      permissions: defaultStaffPermissions({
        setup: { add: true, edit: true },
        tacs: { add: true, edit: true },
        calibration: { add: true },
      }),
      assignments: [],
      accomplishments: [],
    },
  ];
}

export async function getAccounts() {
  const payload = await request("/users");
  return Array.isArray(payload) ? payload.map(normalizeAccount) : [];
}

export async function saveAccounts(accounts) {
  return accounts;
}

export async function getAccountById(id) {
  if (!id) return null;
  const payload = await request(`/users/${id}`);
  return payload ? normalizeAccount(payload) : null;
}

export async function getAccountByUsername(username) {
  const accounts = await getAccounts();
  return (
    accounts.find(
      (item) =>
        item.username?.trim?.().toLowerCase() ===
        String(username || "").trim().toLowerCase()
    ) || null
  );
}

export async function createAccount(payload) {
  const body = normalizeAccountPayload(payload);

  const result = await request("/users", {
    method: "POST",
    body: JSON.stringify(body),
  });

  return normalizeAccount(result.user || result);
}

export async function updateAccount(id, payload) {
  const body = normalizeAccountPayload(payload);

  const result = await request(`/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

  return normalizeAccount(result.user || result);
}

export async function updateUserPermissions(id, permissions) {
  const result = await request(`/users/${id}/permissions`, {
    method: "PUT",
    body: JSON.stringify({
      permissions: permissions.pages ? permissions.pages : permissions,
      specialPermissions:
        permissions.special ||
        permissions.specialPermissions ||
        {
          manageDropdowns: false,
          manageUsers: false,
        },
    }),
  });

  return normalizeAccount(result.user || result);
}

export async function deactivateAccount(id) {
  const result = await request(`/users/${id}/deactivate`, {
    method: "PUT",
    body: JSON.stringify({}),
  });

  return normalizeAccount(result.user || result);
}

export async function activateAccount(id) {
  const result = await request(`/users/${id}/activate`, {
    method: "PUT",
    body: JSON.stringify({}),
  });

  return normalizeAccount(result.user || result);
}

export async function resetPassword(id, newPassword = "1234") {
  const result = await request(`/users/${id}/reset-password`, {
    method: "PUT",
    body: JSON.stringify({ password: newPassword }),
  });

  return result;
}

export async function deleteAccount(id) {
  const result = await request(`/users/${id}`, {
    method: "DELETE",
  });

  return result;
}

export async function updateLastLogin(id) {
  return getAccountById(id);
}

export function getStorageKey() {
  return "mysql_api_user_management";
}

export function getApiBase() {
  return API_BASE;
}