import { useEffect, useState } from "react";
import api from "../services/api";


const MyIssuedFines = () => {


  const [fines, setFines] = useState([]);


  useEffect(() => {

    loadFines();

  }, []);



  const loadFines = async () => {

    try {

      const response = await api.get("/fines/issued");

      setFines(response.data.data || []);

    } catch (error) {

      console.log("Failed to load fines", error);

    }

  };



  return (

    <div className="page-container">


      <h1>
        My Issued Fines
      </h1>



      {
        fines.length === 0 ? (

          <p>
            No fines issued yet.
          </p>

        ) : (

          fines.map((fine) => (

            <div
              key={fine._id}
              className="fine-card"
            >

              <h3>
                {fine.violationType}
              </h3>


              <p>
                Citizen:
                {" "}
                {fine.citizen?.name || "N/A"}
              </p>


              <p>
                Email:
                {" "}
                {fine.citizen?.email || "N/A"}
              </p>


              <p>
                Amount:
                {" "}
                ৳{fine.amount}
              </p>


              <p>
                Location:
                {" "}
                {fine.location}
              </p>


              <p>
                Status:
                {" "}
                {fine.status}
              </p>


              <p>
                Date:
                {" "}
                {new Date(fine.createdAt).toLocaleDateString()}
              </p>


              <hr />


            </div>

          ))

        )
      }


    </div>

  );

};


export default MyIssuedFines;