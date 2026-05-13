import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Main Layout ng system mo
import Layout from "./components/Layout";

// User Management Auth
import { AuthProvider } from "./usrmngment/auth/AuthContext";
import ProtectedRoute from "./usrmngment/auth/ProtectedRoute";

// Public page
import LoginPage from "./pages/LoginPage";

// Main pages
import Dashboard from "./pages/Dashboard";
import UserMgmt from "./pages/UserMgmt";
import TableManagement from "./pages/TableManagement";
import About from "./pages/About";

// Target and Accomplishment pages
import TargetSetting from "./pages/Target and Accomplishment/TargetSetting";
import Accomplishment from "./pages/Target and Accomplishment/Accomplishment";

// Accomplishment pages
import Setup from "./pages/accomplishment/Setup";
import CEST from "./pages/accomplishment/CEST";
import SSCP from "./pages/accomplishment/SSCP";
import TechnologyTraining from "./pages/accomplishment/TechnologyTraining";
import TACS from "./pages/accomplishment/TACS";
import PCL from "./pages/accomplishment/PCL";
import SpecialReport from "./pages/accomplishment/SpecialReport";
import Promo from "./pages/accomplishment/Promo";
import Calibration from "./pages/accomplishment/Calibration";
import TechnologyPromotion from "./pages/accomplishment/Technology Promotion";
import TechnologyRollout from "./pages/accomplishment/TechnologyRollout";
import DRRM from "./pages/accomplishment/DRRM";

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Login Page */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected Layout */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute pageKey="dashboard" action="view">
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* Super Admin only via AuthContext.js */}
          <Route
            path="/user-mgmt"
            element={
              <ProtectedRoute pageKey="userManagement" action="view">
                <UserMgmt />
              </ProtectedRoute>
            }
          />

          {/* Super Admin only via AuthContext.js */}
          <Route
            path="/table-management"
            element={
              <ProtectedRoute pageKey="tableManagement" action="view">
                <TableManagement />
              </ProtectedRoute>
            }
          />

          <Route path="/about" element={<About />} />

          <Route
            path="/target-setting"
            element={
              <ProtectedRoute pageKey="targetSetting" action="view">
                <TargetSetting />
              </ProtectedRoute>
            }
          />

          <Route
            path="/accomplishment"
            element={
              <ProtectedRoute pageKey="accomplishments" action="view">
                <Accomplishment />
              </ProtectedRoute>
            }
          />

          <Route
            path="/accomplishment/setup"
            element={
              <ProtectedRoute pageKey="setup" action="view">
                <Setup />
              </ProtectedRoute>
            }
          />

          <Route
            path="/accomplishment/cest"
            element={
              <ProtectedRoute pageKey="cest" action="view">
                <CEST />
              </ProtectedRoute>
            }
          />

          <Route
            path="/accomplishment/sscp"
            element={
              <ProtectedRoute pageKey="sscp" action="view">
                <SSCP />
              </ProtectedRoute>
            }
          />

          <Route
            path="/accomplishment/technology_training"
            element={
              <ProtectedRoute pageKey="techTraining" action="view">
                <TechnologyTraining />
              </ProtectedRoute>
            }
          />

          <Route
            path="/accomplishment/tacs"
            element={
              <ProtectedRoute pageKey="tacs" action="view">
                <TACS />
              </ProtectedRoute>
            }
          />

          <Route
            path="/accomplishment/packaging_and_labeling"
            element={
              <ProtectedRoute pageKey="packaging" action="view">
                <PCL />
              </ProtectedRoute>
            }
          />

          <Route
            path="/accomplishment/special_report"
            element={
              <ProtectedRoute pageKey="specialProject" action="view">
                <SpecialReport />
              </ProtectedRoute>
            }
          />

          <Route
            path="/accomplishment/promo"
            element={
              <ProtectedRoute pageKey="stPromo" action="view">
                <Promo />
              </ProtectedRoute>
            }
          />

          <Route
            path="/accomplishment/calibration"
            element={
              <ProtectedRoute pageKey="calibration" action="view">
                <Calibration />
              </ProtectedRoute>
            }
          />

          <Route
            path="/accomplishment/technology_promotion"
            element={
              <ProtectedRoute pageKey="techPromo" action="view">
                <TechnologyPromotion />
              </ProtectedRoute>
            }
          />

          <Route
            path="/accomplishment/technology_rollout"
            element={
              <ProtectedRoute pageKey="techRollout" action="view">
                <TechnologyRollout />
              </ProtectedRoute>
            }
          />

          <Route
            path="/accomplishment/drrm"
            element={
              <ProtectedRoute pageKey="drrm" action="view">
                <DRRM />
              </ProtectedRoute>
            }
          />

          <Route
            path="*"
            element={<div style={{ padding: 24 }}>Not Found</div>}
          />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;