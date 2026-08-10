import { Link, useNavigate } from "react-router";
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

        <Link to="/">
          Ekkotro
        </Link>

      </div>




      <div className="nav-links">


        {user ? (

          <>

            <span>
              Hello, {user.name}
            </span>



            <Link to="/">
              Home
            </Link>



            <Link to="/create-complaint">
              Create Complaint
            </Link>



            <Link to="/my-complaints">
              My Complaints
            </Link>



            <Link to="/complaint-map">
              Complaint Map
            </Link>



            <button

              onClick={handleLogout}

              className="logout-btn"

            >

              Logout

            </button>


          </>


        ) : (

          <>

            <Link to="/login">
              Login
            </Link>



            <Link to="/register">
              Register
            </Link>


          </>

        )}


      </div>


    </nav>

  );

};


export default Navbar;