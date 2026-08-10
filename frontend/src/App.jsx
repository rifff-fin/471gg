import { Navigate, Route, Routes } from "react-router";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

import EditComplaint from "./pages/EditComplaint";
import MyComplaints from "./pages/MyComplaints";
import CreateComplaint from "./pages/CreateComplaint";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";

import { useAuth } from "./context/AuthContext";


function App() {

  const { user, loading } = useAuth();


  if (loading) {
    return <div>Loading Ekkotro...</div>;
  }


  return (
    <>

      <Navbar />


      <div className="page-container">

        <Routes>


          {/* Edit Complaint */}
          <Route
            path="/edit-complaint/:id"
            element={
              <ProtectedRoute>
                <EditComplaint />
              </ProtectedRoute>
            }
          />


          {/* Create Complaint */}
          <Route
            path="/create-complaint"
            element={
              <ProtectedRoute>
                <CreateComplaint />
              </ProtectedRoute>
            }
          />


          {/* My Complaints */}
          <Route
            path="/my-complaints"
            element={
              <ProtectedRoute>
                <MyComplaints />
              </ProtectedRoute>
            }
          />


          {/* Home */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />


          {/* Login */}
          <Route
            path="/login"
            element={
              user
                ? <Navigate to="/" replace />
                : <Login />
            }
          />


          {/* Register */}
          <Route
            path="/register"
            element={
              user
                ? <Navigate to="/" replace />
                : <Register />
            }
          />


          {/* Fallback */}
          <Route
            path="*"
            element={
              <Navigate to="/" replace />
            }
          />


        </Routes>

      </div>

    </>
  );
}


export default App;