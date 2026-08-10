import { useEffect, useState } from "react";
import api from "../services/api";


function OfficerDashboard(){


    const [complaints,setComplaints] = useState([]);

    const [loading,setLoading] = useState(true);



    useEffect(()=>{


        const fetchComplaints = async()=>{


            try{


                const response =
                await api.get("/complaints/all");


                setComplaints(
                    response.data.data
                );


            }catch(error){


                console.error(error);


            }finally{

                setLoading(false);

            }


        };


        fetchComplaints();


    },[]);



    if(loading){

        return <h2>Loading complaints...</h2>;

    }



    return (

        <div>


            <h1>
                Officer Dashboard
            </h1>



            <h3>
                Total Complaints:
                {" "}
                {complaints.length}
            </h3>




            {
                complaints.map((complaint)=>(


                    <div 
                    key={complaint._id}
                    className="complaint-card"
                    >


                        <h3>
                            {complaint.title}
                        </h3>


                        <p>
                            Category:
                            {" "}
                            {complaint.category}
                        </p>


                        <p>
                            Priority:
                            {" "}
                            {complaint.priority}
                        </p>


                        <p>
                            Status:
                            {" "}
                            {complaint.status}
                        </p>


                        <p>
                            Description:
                            {" "}
                            {complaint.description}
                        </p>


                    </div>


                ))
            }



        </div>

    );


}


export default OfficerDashboard;