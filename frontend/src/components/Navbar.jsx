import { Link, useNavigate } from "react-router";
import { FaFolderOpen, FaPlus, FaSignOutAlt } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate("/login"); };
  return <nav className="navbar">
    <Link className="logo" to="/"><span>একত্র</span> Ekotro</Link>
    <div className="nav-links">{user ? <>
      <Link className="nav-report" to="/report"><FaPlus /> Report an issue</Link>
      <Link to="/my-complaints"><FaFolderOpen /> My reports</Link>
      <span className="nav-greeting">{user.name} · {user.role || "citizen"}</span>
      <button onClick={handleLogout} className="logout-btn"><FaSignOutAlt /> Logout</button>
    </> : <><Link to="/login">Sign in</Link><Link className="nav-report" to="/register">Create account</Link></>}</div>
  </nav>;
};
export default Navbar;
