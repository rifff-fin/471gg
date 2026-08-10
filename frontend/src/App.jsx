import { Navigate, Route, Routes } from "react-router";

import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";

import CreateComplaint from "./pages/CreateComplaint";
import MyComplaints from "./pages/MyComplaints";
import EditComplaint from "./pages/EditComplaint";
import ComplaintMap from "./pages/ComplaintMap";

import { useAuth } from "./context/AuthContext";


function App() {


  const { user, loading } = useAuth();



  if (loading) {

    return <div>Loading Ekkotro...</div>;

  }



  return (

    <>


      <Navbar />


      <Routes>



        {/* Home */}

        <Route

          path="/"

          element={

            <ProtectedRoute>

              <Home />

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




        {/* Complaint Map */}

        <Route

          path="/complaint-map"

          element={

            <ProtectedRoute>

              <ComplaintMap />

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




        {/* Edit Complaint */}

        <Route

          path="/edit-complaint/:id"

          element={

            <ProtectedRoute>

              <EditComplaint />

            </ProtectedRoute>

          }

        />




        {/* Login */}

        <Route

          path="/login"

          element={

            user

            ?

            <Navigate to="/" replace />

            :

            <Login />

          }

        />




        {/* Register */}

        <Route

          path="/register"

          element={

            user

            ?

            <Navigate to="/" replace />

            :

            <Register />

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


    </>

  );

}


export default App;