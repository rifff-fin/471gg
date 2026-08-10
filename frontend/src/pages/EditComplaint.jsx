import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import api from "../services/api";


function EditComplaint(){


  const {id}=useParams();

  const navigate=useNavigate();



  const [formData,setFormData]=useState({

    title:"",
    description:""

  });



  const [loading,setLoading]=useState(true);



  useEffect(()=>{


    const loadComplaint=async()=>{


      try{


        const response =
          await api.get(
            `/complaints/${id}`
          );


        const complaint =
          response.data.data;



        setFormData({

          title:complaint.title,

          description:complaint.description

        });



      }catch(error){


        alert(
          "Failed to load complaint"
        );


      }finally{

        setLoading(false);

      }


    };


    loadComplaint();


  },[id]);




  const handleChange=(e)=>{


    setFormData({

      ...formData,

      [e.target.name]:e.target.value

    });


  };




  const handleSubmit=async(e)=>{


    e.preventDefault();


    try{


      await api.put(

        `/complaints/${id}`,

        formData

      );



      alert(
        "Complaint updated successfully"
      );


      navigate(
        "/my-complaints"
      );



    }catch(error){


      alert(

        error.response?.data?.message ||
        "Update failed"

      );


    }


  };



  if(loading){

    return <h2>Loading...</h2>;

  }




  return (

    <div className="form-container">


      <h1>
        Edit Complaint
      </h1>



      <form onSubmit={handleSubmit}>


        <label>
          Title
        </label>


        <input

          name="title"

          value={formData.title}

          onChange={handleChange}

        />



        <label>
          Description
        </label>


        <textarea

          name="description"

          value={formData.description}

          onChange={handleChange}

        />



        <button
          className="primary-btn"
        >
          Update Complaint
        </button>


      </form>


    </div>

  );


}


export default EditComplaint;