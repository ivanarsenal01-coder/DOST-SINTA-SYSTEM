import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function ProtectedRoute({
  children,
  pageKey = null,
  action = "view",
}) {
  const { isAuthenticated, authLoading, hasPageAccess, user } = useAuth();
  const location = useLocation();

  if (authLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          color: "#374151",
        }}
      >
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (pageKey && !hasPageAccess(pageKey, action)) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          color: "#111827",
        }}
      >
        <div
          style={{
            maxWidth: 460,
            width: "100%",
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: 16,
            padding: 24,
            boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
            textAlign: "center",
          }}
        >
          <h2 style={{ margin: "0 0 8px", fontSize: 22 }}>
            Access Denied
          </h2>
          <p style={{ margin: 0, color: "#6b7280", lineHeight: 1.5 }}>
            Your account does not have permission to access this page.
          </p>
          <p style={{ margin: "12px 0 0", color: "#9ca3af", fontSize: 13 }}>
            Logged in as: {user?.fullName || user?.username}
          </p>
        </div>
      </div>
    );
  }

  return children;
}