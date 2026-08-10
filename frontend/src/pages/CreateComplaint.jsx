import { useState } from "react";
import { useNavigate } from "react-router";
import api from "../services/api";


function CreateComplaint() {


  const navigate = useNavigate();


  const [formData, setFormData] = useState({

    title:"",
    description:"",
    latitude:"",
    longitude:""

  });


  const [loading,setLoading] = useState(false);



  const handleChange=(e)=>{

    setFormData({

      ...formData,

      [e.target.name]:e.target.value

    });

  };



  const handleSubmit=async(e)=>{

    e.preventDefault();


    setLoading(true);



    try {


      await api.post(
        "/complaints",
        {

          title:formData.title,

          description:formData.description,


          location:{

            type:"Point",

            coordinates:[

              Number(formData.longitude),

              Number(formData.latitude)

            ]

          }

        }
      );


      alert(
        "Complaint created successfully"
      );


      navigate(
        "/my-complaints"
      );



    }catch(error){


      alert(

        error.response?.data?.message ||
        "Failed to create complaint"

      );


    }finally{

      setLoading(false);

    }


  };



  return (

    <div className="form-container">


      <h1>
        Create Complaint
      </h1>



      <form onSubmit={handleSubmit}>


        <label>
          Title
        </label>

        <input

          name="title"

          value={formData.title}

          onChange={handleChange}

          required

        />



        <label>
          Description
        </label>

        
        <textarea

          name="description"

          value={formData.description}

          onChange={handleChange}

          required

        />



        <label>
          Latitude
        </label>


        <input

          type="number"

          step="any"

          name="latitude"

          value={formData.latitude}

          onChange={handleChange}

          required

        />



        <label>
          Longitude
        </label>


        <input

          type="number"

          step="any"

          name="longitude"

          value={formData.longitude}

          onChange={handleChange}

          required

        />



        <button
          className="primary-btn"
          disabled={loading}
        >

          {
            loading
            ?
            "Submitting..."
            :
            "Submit Complaint"
          }

        </button>



      </form>


    </div>

  );

}


export default CreateComplaint;