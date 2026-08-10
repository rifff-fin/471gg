import { useEffect, useState } from "react";
import api from "../services/api";
import ComplaintCard from "../components/ComplaintCard";


function MyComplaints() {


  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);



  const fetchComplaints = async () => {

    try {

      const response = await api.get(
        "/complaints/my"
      );


      setComplaints(
        response.data.data
      );


    } catch(error) {

      console.error(error);

    } finally {

      setLoading(false);

    }

  };



  useEffect(() => {

    fetchComplaints();

  }, []);




  const deleteComplaint = async(id)=>{

    const confirmDelete =
      window.confirm(
        "Are you sure you want to delete this complaint?"
      );


    if(!confirmDelete) return;



    try {

      await api.delete(
        `/complaints/${id}`
      );


      setComplaints(
        complaints.filter(
          complaint =>
          complaint._id !== id
        )
      );


    } catch(error){

      alert(
        error.response?.data?.message ||
        "Delete failed"
      );

    }

  };



  if(loading){

    return (
      <h2>
        Loading complaints...
      </h2>
    );

  }




  return (

    <div>


      <h1>
        My Complaints
      </h1>



      {
        complaints.length === 0 ?

        (

          <div className="complaint-card">

            <p>
              No complaints found
            </p>

          </div>

        )


        :

        complaints.map(
          complaint => (

            <ComplaintCard

              key={complaint._id}

              complaint={complaint}

              onDelete={deleteComplaint}

            />

          )
        )

      }


    </div>

  );

}


export default MyComplaints;