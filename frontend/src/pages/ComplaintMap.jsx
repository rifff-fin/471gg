import { useEffect, useState } from "react";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup
} from "react-leaflet";

import api from "../services/api";



function ComplaintMap() {


  const [complaints, setComplaints] = useState([]);



  useEffect(() => {


    const fetchComplaints = async () => {


      try {


        const response =
          await api.get("/complaints");


        setComplaints(
          response.data.data || []
        );


      } catch(error) {


        console.error(
          "Failed to load complaints:",
          error
        );


      }


    };


    fetchComplaints();


  }, []);




  return (

    <div>


      <h1>
        Complaint Map
      </h1>



      <MapContainer

        center={[
          23.8103,
          90.4125
        ]}

        zoom={13}

        style={{
          height:"600px",
          width:"100%",
          borderRadius:"15px"
        }}

      >


        <TileLayer

          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"

          attribution="&copy; OpenStreetMap contributors"

        />



        {
          complaints

          .filter(

            complaint =>

              complaint.location &&

              complaint.location.coordinates &&

              complaint.location.coordinates.length === 2

          )


          .map((complaint)=>(


            <Marker


              key={complaint._id}


              position={[


                complaint.location.coordinates[1],


                complaint.location.coordinates[0]


              ]}


            >


              <Popup>


                <h3>

                  {complaint.title}

                </h3>



                <p>

                  {complaint.description}

                </p>



                <p>

                  <strong>
                    Category:
                  </strong>

                  {" "}

                  {complaint.category || "N/A"}

                </p>



                <p>

                  <strong>
                    Priority:
                  </strong>

                  {" "}

                  {complaint.priority || "N/A"}

                </p>



                <p>

                  <strong>
                    Status:
                  </strong>

                  {" "}

                  {complaint.status}

                </p>


              </Popup>


            </Marker>


          ))
        }



      </MapContainer>


    </div>

  );

}


export default ComplaintMap;