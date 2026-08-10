import { useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";


const Home = () => {


  const { user } = useAuth();

  const navigate = useNavigate();



  return (

    <div className="home-container">


      <h1>
        Welcome to Ekkotro
      </h1>



      <p>
        Report civic issues and track their progress
        transparently.
      </p>



      <div className="user-card">


        <h3>
          Logged in as
        </h3>



        <p>
          <strong>
            Name:
          </strong>{" "}
          {user?.name}
        </p>



        <p>
          <strong>
            Email:
          </strong>{" "}
          {user?.email}
        </p>



        <p>
          <strong>
            Role:
          </strong>{" "}
          {user?.role || "citizen"}
        </p>


      </div>




      <button

        className="primary-btn"

        onClick={() => navigate("/create-complaint")}

      >

        Submit Complaint

      </button>



    </div>

  );

};


export default Home;