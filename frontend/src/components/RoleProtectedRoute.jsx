import { Navigate } from "react-router";
import { useAuth } from "../context/AuthContext";


const RoleProtectedRoute = ({ children, allowedRoles }) => {

  const { user, loading } = useAuth();


  if (loading) {
    return <div className="center-message">
      Loading...
    </div>;
  }


  if (!user) {
    return <Navigate to="/login" replace />;
  }


  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }


  return children;
};


export default RoleProtectedRoute;