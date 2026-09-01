import { Link, useNavigate } from "react-router";
import { FaFolderOpen, FaMap, FaPlus, FaSignOutAlt } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate("/login");
  };
  return (
    <nav className="navbar">
      <Link className="logo" to="/">
        <img
          className="brand-logo"
          src="/ekotrologo.png"
          alt="Ekotro logo"
        />
        <span>একত্র</span> Ekotro
      </Link>
      <div className="nav-links">
        {user ? (
          <>
            <Link className="nav-report" to="/report">
              <FaPlus /> Report an issue
            </Link>
            <Link to="/map">
              <FaMap /> Map
            </Link>
            <Link to="/my-complaints">
              <FaFolderOpen /> My reports
            </Link>
            {user.role === "citizen" && <Link to="/my-fines">My fines</Link>}
            <Link to="/government-services">Government services</Link>
            <Link to="/official-updates">Community updates</Link>
            {user.role === "field_worker" && (
              <Link to="/field-worker/completion-report">
                Completion report
              </Link>
            )}
            {user.role === "mayor" && (
              <Link to="/mayor-dashboard">Mayor dashboard</Link>
            )}
            {user.role === "admin" && (
              <Link to="/admin-dashboard">Admin analytics</Link>
            )}
            {user.role === "police" && (
              <Link to="/police">Police desk</Link>
            )}
            {["officer", "admin"].includes(user.role) && (
              <Link to="/officer-dashboard">Officer desk</Link>
            )}
            <NotificationBell />
            <span className="nav-greeting">
              {user.name} · {user.role || "citizen"}
            </span>
            <button onClick={handleLogout} className="logout-btn">
              <FaSignOutAlt /> Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Sign in</Link>
            <Link to="/official-updates">Community updates</Link>
            <Link className="nav-report" to="/register">
              Create account
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};
export default Navbar;
