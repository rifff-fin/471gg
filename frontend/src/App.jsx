import { Navigate, Route, Routes } from "react-router";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import AppErrorBoundary from "./components/AppErrorBoundary";
import ComplaintDetail from "./pages/ComplaintDetail";
import Feed from "./pages/Feed";
import Login from "./pages/Login";
import MyComplaints from "./pages/MyComplaints";
import Register from "./pages/Register";
import ReportIssue from "./pages/ReportIssue";
import { useAuth } from "./context/AuthContext";

function App() {
  const { user, loading } = useAuth();
  if (loading) return <div className="center-message">Loading Ekotro…</div>;
  return <><Navbar /><AppErrorBoundary><Routes>
    <Route path="/" element={<Feed />} />
    <Route path="/complaints/:id" element={<ComplaintDetail />} />
    <Route path="/report" element={<ProtectedRoute><ReportIssue /></ProtectedRoute>} />
    <Route path="/my-complaints" element={<ProtectedRoute><MyComplaints /></ProtectedRoute>} />
    <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
    <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes></AppErrorBoundary></>;
}
export default App;
