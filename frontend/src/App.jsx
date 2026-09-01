import { Navigate, Route, Routes } from "react-router";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import AppErrorBoundary from "./components/AppErrorBoundary";
import ComplaintDetail from "./pages/ComplaintDetail";
import EditComplaint from "./pages/EditComplaint";
import Feed from "./pages/Feed";
import Login from "./pages/Login";
import MyComplaints from "./pages/MyComplaints";
import Register from "./pages/Register";
import ReportIssue from "./pages/ReportIssue";
import Profile from "./pages/Profile";
import ComplaintMap from "./pages/ComplaintMap";
import OfficialUpdates from "./pages/OfficialUpdates";
import GovernmentServices from "./pages/GovernmentServices";
import OfficerDashboard from "./pages/OfficerDashboard";
import NotificationCenter from "./components/NotificationCenter";
import CreateFine from "./pages/CreateFine";
import MyIssuedFines from "./pages/MyIssuedFines";
import MyFines from "./pages/MyFines";
import Notifications from "./pages/Notifications";
import PoliceDashboard from "./pages/PoliceDashboard";
import RoleProtectedRoute from "./components/RoleProtectedRoute";
import UploadCompletionReport from "./pages/UploadCompletionReport";
import MayorDashboard from "./pages/MayorDashboard";
import { useAuth } from "./context/AuthContext";

function App() {
  const { user, loading } = useAuth();
  if (loading) return <div className="center-message">Loading Rifat…</div>;
  return (
    <>
      <Navbar />
      <NotificationCenter />
      <AppErrorBoundary>
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/complaints/:id" element={<ComplaintDetail />} />
          <Route
            path="/report"
            element={
              <ProtectedRoute>
                <ReportIssue />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-complaints"
            element={
              <ProtectedRoute>
                <MyComplaints />
              </ProtectedRoute>
            }
          />
          <Route
            path="/edit-complaint/:id"
            element={
              <ProtectedRoute>
                <EditComplaint />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route path="/profiles/:id" element={<Profile />} />
          <Route path="/map" element={<ComplaintMap />} />
          <Route
            path="/officer-dashboard"
            element={
              <RoleProtectedRoute allowedRoles={["officer", "admin"]}>
                <OfficerDashboard />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/government-services"
            element={
              <ProtectedRoute>
                <GovernmentServices />
              </ProtectedRoute>
            }
          />
          <Route
            path="/field-worker/completion-report"
            element={
              <RoleProtectedRoute allowedRoles={["field_worker"]}>
                <UploadCompletionReport />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/police"
            element={
              <RoleProtectedRoute allowedRoles={["police"]}>
                <PoliceDashboard />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/police/create-fine"
            element={
              <RoleProtectedRoute allowedRoles={["police"]}>
                <CreateFine />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/police/fines"
            element={
              <RoleProtectedRoute allowedRoles={["police"]}>
                <MyIssuedFines />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/my-fines"
            element={
              <RoleProtectedRoute allowedRoles={["citizen"]}>
                <MyFines />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />
          <Route path="/official-updates" element={<OfficialUpdates />} />
          <Route
            path="/mayor-dashboard"
            element={
              <RoleProtectedRoute allowedRoles={["mayor", "admin"]}>
                <MayorDashboard />
              </RoleProtectedRoute>
            }
          />
          <Route
            path="/login"
            element={user ? <Navigate to="/" replace /> : <Login />}
          />
          <Route
            path="/register"
            element={user ? <Navigate to="/" replace /> : <Register />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppErrorBoundary>
    </>
  );
}
export default App;
