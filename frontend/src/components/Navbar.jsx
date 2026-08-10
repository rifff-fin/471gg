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



            {
              user.role === "citizen" && (

                <>

                  <Link to="/create-complaint">
                    Create Complaint
                  </Link>


                  <Link to="/my-complaints">
                    My Complaints
                  </Link>


                  <Link to="/complaint-map">
                    Complaint Map
                  </Link>

                </>

              )
            }




            {
              user.role === "officer" && (

                <Link to="/officer-dashboard">
                  Officer Dashboard
                </Link>

              )
            }




            {
              user.role === "admin" && (

                <Link to="/admin-dashboard">
                  Admin Dashboard
                </Link>

              )
            }




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