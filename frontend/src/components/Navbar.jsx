import { Link, useNavigate } from "react-router";


import {
  FaFolderOpen,
  FaMap,
  FaPlus,
  FaSignOutAlt,
  FaShieldAlt,
  FaUserShield,
  FaBell,
  FaClipboardCheck
} from "react-icons/fa";


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



      <Link className="logo" to="/">

        <span>একত্র</span> Ekotro

      </Link>







      <div className="nav-links">



        {user ? <>



          {/* Citizen Menu */}

          {user.role !== "police" &&
           user.role !== "admin" &&
           user.role !== "field_worker" && (

            <>


              <Link
                className="nav-report"
                to="/report"
              >

                <FaPlus />

                Report an issue

              </Link>





              <Link to="/my-complaints">

                <FaFolderOpen />

                My reports

              </Link>





              <Link to="/notifications">

                <FaBell />

                Notifications

              </Link>



            </>

          )}









          {/* Field Worker Menu */}

          {user.role === "field_worker" && (

            <>


              <Link to="/field-worker/completion-report">

                <FaClipboardCheck />

                Completion Report

              </Link>



            </>

          )}









          {/* Common Map */}

          <Link to="/map">

            <FaMap />

            Map

          </Link>









          {/* Police Menu */}

          {user.role === "police" && (

            <Link to="/police">

              <FaShieldAlt />

              Police Dashboard

            </Link>

          )}









          {/* Admin Menu */}

          {user.role === "admin" && (

            <Link to="/admin">

              <FaUserShield />

              Admin Dashboard

            </Link>

          )}









          <span className="nav-greeting">

            {user.name} · {user.role || "citizen"}

          </span>









          <button

            onClick={handleLogout}

            className="logout-btn"

          >

            <FaSignOutAlt />

            Logout

          </button>





        </> : <>





          <Link to="/login">

            Sign in

          </Link>







          <Link

            className="nav-report"

            to="/register"

          >

            Create account

          </Link>





        </>}



      </div>



    </nav>

  );


};



export default Navbar;