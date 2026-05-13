import React, { useEffect, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { canAccess } from "../utils/permissions";

export default function ProtectedRoute({
  children,
  pageKey = null,
  action = "view",
}) {
  const { isAuthenticated, authLoading, user } = useAuth();
  const location = useLocation();
  const alertShownRef = useRef(false);

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

  if (pageKey && !canAccess(user, pageKey, action)) {
    if (!alertShownRef.current) {
      alertShownRef.current = true;

      setTimeout(() => {
        window.alert(
          `Access Denied\n\n${
            user?.fullName || user?.username || "Your account"
          } does not have permission to access this page.`
        );
      }, 0);
    }

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
          background: "#f8fafc",
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
          <div
            style={{
              width: 54,
              height: 54,
              borderRadius: "999px",
              background: "#fee2e2",
              color: "#991b1b",
              display: "grid",
              placeItems: "center",
              margin: "0 auto 14px",
              fontSize: 26,
              fontWeight: 900,
            }}
          >
            !
          </div>

          <h2 style={{ margin: "0 0 8px", fontSize: 22 }}>
            Access Denied
          </h2>

          <p style={{ margin: 0, color: "#6b7280", lineHeight: 1.5 }}>
            Your account does not have permission to access this page.
          </p>

          <p style={{ margin: "12px 0 0", color: "#9ca3af", fontSize: 13 }}>
            Logged in as: {user?.fullName || user?.username || "Unknown user"}
          </p>

          <button
            type="button"
            onClick={() => window.history.back()}
            style={{
              marginTop: 18,
              border: "1px solid #d1d5db",
              background: "#ffffff",
              color: "#374151",
              borderRadius: 999,
              padding: "9px 16px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return children;
}