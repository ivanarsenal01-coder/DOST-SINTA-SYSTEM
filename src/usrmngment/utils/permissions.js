export const PAGE_KEYS = {
  dashboard: "dashboard",
  targetSetting: "targetSetting",
  accomplishments: "accomplishments",
  userManagement: "userManagement",
  tableManagement: "tableManagement",

  setup: "setup",
  cest: "cest",
  sscp: "sscp",
  drrm: "drrm",
  specialProject: "specialProject",
  calibration: "calibration",
  packaging: "packaging",
  stPromo: "stPromo",
  tacs: "tacs",
  techPromo: "techPromo",
  techRollout: "techRollout",
  techTraining: "techTraining",
};

export const LEGACY_PAGE_KEY_MAP = {
  technologyTraining: "techTraining",
  training: "techTraining",
  pcl: "packaging",
  packagingLabeling: "packaging",
  promo: "stPromo",
  rollout: "techRollout",
  technologyRollout: "techRollout",
  sillag: "drrm",
  DRRM: "drrm",
  specialReport: "specialProject",

  userMgmt: "userManagement",
  userManagement: "userManagement",
  tableMgmt: "tableManagement",
  tableManagement: "tableManagement",
};

const SUPER_ADMIN_ONLY_PAGE_KEYS = new Set([
  "tableManagement",
]);

const ADMIN_ALLOWED_PAGE_KEYS = new Set([
  "userManagement",
]);

export function normalizeRole(role = "") {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
}

export function normalizePageKey(pageKey) {
  return LEGACY_PAGE_KEY_MAP[pageKey] || pageKey;
}

export function isSuperAdmin(user) {
  return normalizeRole(user?.role) === "superadmin";
}

export function isAdmin(user) {
  return normalizeRole(user?.role) === "admin";
}

export function isStaff(user) {
  return normalizeRole(user?.role) === "staff";
}

export function isSuperAdminOnlyPage(pageKey) {
  const normalizedKey = normalizePageKey(pageKey);
  return SUPER_ADMIN_ONLY_PAGE_KEYS.has(normalizedKey);
}

export function isAdminAllowedPage(pageKey) {
  const normalizedKey = normalizePageKey(pageKey);
  return ADMIN_ALLOWED_PAGE_KEYS.has(normalizedKey);
}

export function getPagePermission(user, pageKey) {
  if (!user) return {};

  const normalizedKey = normalizePageKey(pageKey);
  const pages = user?.permissions?.pages || user?.permissions || {};

  return pages?.[normalizedKey] || pages?.[pageKey] || {};
}

export function canAccess(user, pageKey, action = "view") {
  if (!user) return false;

  const normalizedKey = normalizePageKey(pageKey);

  if (isSuperAdminOnlyPage(normalizedKey)) {
    return isSuperAdmin(user);
  }

  if (isSuperAdmin(user)) return true;

  if (isAdminAllowedPage(normalizedKey) && isAdmin(user)) {
    return true;
  }

  const perms = getPagePermission(user, normalizedKey);
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
  return isSuperAdmin(user) || isAdmin(user);
}

export function canManageDropdowns(user) {
  if (!user) return false;
  return isSuperAdmin(user);
}

export function summarizeEditableModules(user) {
  const pages = user?.permissions?.pages || {};

  return Object.entries(pages)
    .filter(([key, value]) => {
      if (isSuperAdminOnlyPage(key) && !isSuperAdmin(user)) return false;
      if (isAdminAllowedPage(key) && isAdmin(user)) return true;
      return value?.add || value?.edit || value?.delete;
    })
    .map(([key]) => key);
}