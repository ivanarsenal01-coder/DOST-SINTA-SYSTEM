import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import API_BASE from "../../api";

const AuthContext = createContext(null);

const AUTH_API_BASE = API_BASE.replace(/\/$/, "");

function normalizePermissions(rawPermissions = {}) {
  const pages =
    rawPermissions.pages ||
    rawPermissions.permissions ||
    rawPermissions ||
    {};

  const special =
    rawPermissions.special ||
    rawPermissions.specialPermissions ||
    {};

  return {
    pages,
    special: {
      manageDropdowns:
        special.manageDropdowns ??
        special.manage_dropdowns ??
        false,
      manageUsers:
        special.manageUsers ??
        special.manage_users ??
        false,
    },
  };
}

function normalizeUser(rawUser = {}) {
  const permissions = normalizePermissions(rawUser.permissions || {});

  return {
    ...rawUser,
    id: rawUser.id,
    fullName: rawUser.fullName || rawUser.full_name || "",
    username: rawUser.username || "",
    role: rawUser.role || "staff",
    status: rawUser.status || "inactive",
    position: rawUser.position || "",
    office: rawUser.office || "",
    contactNumber: rawUser.contactNumber || rawUser.contact_number || "",
    email: rawUser.email || "",
    permissions,
    specialPermissions:
      rawUser.specialPermissions || permissions.special || {
        manageDropdowns: false,
        manageUsers: false,
      },
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("auth_user");
      if (saved) {
        const parsed = JSON.parse(saved);
        setUser(normalizeUser(parsed));
      }
    } catch (error) {
      console.error("Load saved auth user error:", error);
      localStorage.removeItem("auth_user");
    } finally {
      setAuthLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    try {
      const response = await fetch(`${AUTH_API_BASE}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: String(username || "").trim(),
          password: String(password || "").trim(),
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.success) {
        return {
          success: false,
          message: payload.message || "Invalid username or password.",
        };
      }

      const safeUser = normalizeUser(payload.user);

      setUser(safeUser);
      localStorage.setItem("auth_user", JSON.stringify(safeUser));

      return {
        success: true,
        user: safeUser,
      };
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        message:
          "Cannot connect to backend server. Please check if backend is running.",
      };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("auth_user");
  };

  const hasPageAccess = (pageKey, action = "view") => {
    if (!user) return false;

    const role = String(user.role || "").toLowerCase();
    if (role === "superadmin") return true;

    return Boolean(user?.permissions?.pages?.[pageKey]?.[action]);
  };

  const hasSpecialAccess = (permissionKey) => {
    if (!user) return false;

    const role = String(user.role || "").toLowerCase();
    if (role === "superadmin") return true;

    return Boolean(
      user?.permissions?.special?.[permissionKey] ||
      user?.specialPermissions?.[permissionKey]
    );
  };

  const refreshCurrentUser = async () => {
    if (!user?.id) return null;

    try {
      const response = await fetch(`${AUTH_API_BASE}/users/${user.id}`);
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload) {
        return null;
      }

      const freshUser = normalizeUser(payload);
      setUser(freshUser);
      localStorage.setItem("auth_user", JSON.stringify(freshUser));

      return freshUser;
    } catch (error) {
      console.error("Refresh current user error:", error);
      return null;
    }
  };

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      hasPageAccess,
      hasSpecialAccess,
      refreshCurrentUser,
      isAuthenticated: Boolean(user),
      authLoading,
      apiBase: AUTH_API_BASE,
    }),
    [user, authLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export default AuthContext;