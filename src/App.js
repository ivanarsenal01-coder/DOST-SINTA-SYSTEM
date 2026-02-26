import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";

// main pages
import Dashboard from "./pages/Dashboard";
import TargetSetting from "./pages/TargetSetting";
import UserMgmt from "./pages/UserMgmt";

// accomplishment pages (create these files)
import Setup from "./pages/accomplishment/Setup";
import CEST from "./pages/accomplishment/CEST";
import SSCP from "./pages/accomplishment/SSCP";
import TechnologyTraining from "./pages/accomplishment/TechnologyTraining";
import TACS from "./pages/accomplishment/TACS";
import PCL from "./pages/accomplishment/PCL";
import SpecialReport from "./pages/accomplishment/SpecialReport";
import Sillag from "./pages/accomplishment/Sillag";
import Promo from "./pages/accomplishment/Promo";
import Calibration from "./pages/accomplishment/Calibration";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Main */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/target-setting" element={<TargetSetting />} />
        <Route path="/user-mgmt" element={<UserMgmt />} />

        {/* Accomplishment (based on your Sidebar links) */}
        <Route path="/accomplishment/setup" element={<Setup />} />
        <Route path="/accomplishment/cest" element={<CEST />} />
        <Route path="/accomplishment/sscp" element={<SSCP />} />
        <Route path="/accomplishment/technology-training" element={<TechnologyTraining />} />
        <Route path="/accomplishment/tacs" element={<TACS />} />
        <Route path="/accomplishment/pcl" element={<PCL />} />
        <Route path="/accomplishment/special-report" element={<SpecialReport />} />
        <Route path="/accomplishment/sillag" element={<Sillag />} />
        <Route path="/accomplishment/promo" element={<Promo />} />
        <Route path="/accomplishment/calibration" element={<Calibration />} />

        {/* Fallback */}
        <Route path="*" element={<div style={{ padding: 24 }}>Not Found</div>} />
      </Route>
    </Routes>
  );
}

export default App;