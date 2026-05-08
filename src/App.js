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

        {/* Protected Pages */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/user-mgmt" element={<UserMgmt />} />
          <Route path="/table-management" element={<TableManagement />} />

          <Route path="/target-setting" element={<TargetSetting />} />
          <Route path="/accomplishment" element={<Accomplishment />} />

          <Route path="/accomplishment/setup" element={<Setup />} />
          <Route path="/accomplishment/cest" element={<CEST />} />
          <Route path="/accomplishment/sscp" element={<SSCP />} />

          <Route
            path="/accomplishment/technology_training"
            element={<TechnologyTraining />}
          />

          <Route path="/accomplishment/tacs" element={<TACS />} />

          <Route
            path="/accomplishment/packaging_and_labeling"
            element={<PCL />}
          />

          <Route
            path="/accomplishment/special_report"
            element={<SpecialReport />}
          />

          <Route path="/accomplishment/promo" element={<Promo />} />
          <Route path="/accomplishment/calibration" element={<Calibration />} />

          <Route
            path="/accomplishment/technology_promotion"
            element={<TechnologyPromotion />}
          />

          <Route
            path="/accomplishment/technology_rollout"
            element={<TechnologyRollout />}
          />

          <Route path="/accomplishment/drrm" element={<DRRM />} />

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
