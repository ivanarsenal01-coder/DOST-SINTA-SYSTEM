// src/utils/permissions.js

export const PAGE_KEYS = {
  dashboard: "dashboard",
  targetSetting: "targetSetting",
  userManagement: "userManagement",
  tableManagement: "tableManagement",

  setup: "setup",
  cest: "cest",
  sscp: "sscp",
  technologyTraining: "technologyTraining",
  tacs: "tacs",
  pcl: "pcl",
  specialReport: "specialReport",
  promo: "promo",
  calibration: "calibration",

  // optional / future modules
  sillag: "sillag",
  DRRM: "DRRM",
};

export function isSuperAdmin(user) {
  return String(user?.role || "").toLowerCase() === "superadmin";
}

export function isAdmin(user) {
  return String(user?.role || "").toLowerCase() === "admin";
}

export function isStaff(user) {
  return String(user?.role || "").toLowerCase() === "staff";
}

export function canAccess(user, pageKey, action = "view") {
  if (!user) return false;

  if (isSuperAdmin(user)) return true;

  const perms = user?.permissions?.pages?.[pageKey];

  return Boolean(perms?.[action]);
}

export function canView(user, pageKey) {
  return canAccess(user, pageKey, "view");
}

export function canAdd(user, pageKey) {
  return canAccess(user, pageKey, "add");
}

export function canEdit(user, pageKey) {
  return canAccess(user, pageKey, "edit");
}

export function canDelete(user, pageKey) {
  return canAccess(user, pageKey, "delete");
}

export function canExport(user, pageKey) {
  return canAccess(user, pageKey, "export");
}

export function canManageUsers(user) {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;

  return Boolean(
    user?.permissions?.special?.manageUsers ||
      user?.specialPermissions?.manageUsers
  );
}

export function canManageDropdowns(user) {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;

  return Boolean(
    user?.permissions?.special?.manageDropdowns ||
      user?.specialPermissions?.manageDropdowns
  );
}

export function summarizeEditableModules(user) {
  const pages = user?.permissions?.pages || {};

  return Object.entries(pages)
    .filter(([, value]) => value?.add || value?.edit || value?.delete)
    .map(([key]) => key);
}