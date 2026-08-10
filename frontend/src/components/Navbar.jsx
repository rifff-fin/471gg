import { Link, useNavigate } from "react-router";
import { FaHome, FaPlusCircle, FaFolderOpen, FaSignOutAlt } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <Link to="/">Ekkotro</Link>
      </div>

      <div className="nav-links">
        {user ? (
          <>
            <Link to="/">
              <FaHome /> Home
            </Link>
            <Link to="/create-complaint">
              <FaPlusCircle /> Create
            </Link>
            <Link to="/my-complaints">
              <FaFolderOpen /> My Cases
            </Link>
            <span className="nav-greeting">{user.name} · {user.role || "citizen"}</span>
            <button onClick={handleLogout} className="logout-btn">
              <FaSignOutAlt /> Logout
            </button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;