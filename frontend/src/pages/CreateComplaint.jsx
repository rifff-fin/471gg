import { useState } from "react";
import { useNavigate } from "react-router";
import api from "../services/api";
import MapPicker from "../components/MapPicker";


function CreateComplaint() {

  const navigate = useNavigate();


  const [formData, setFormData] = useState({

    title: "",
    category: "",
    priority: "Medium",
    description: ""

  });


  const [location, setLocation] = useState(null);


  const [loading, setLoading] = useState(false);



  const handleChange = (e) => {

    setFormData({

      ...formData,

      [e.target.name]: e.target.value

    });

  };



  const handleSubmit = async (e) => {

    e.preventDefault();



    if (!location) {

      alert("Please select complaint location on map");

      return;

    }



    setLoading(true);



    try {


      const response = await api.post(

        "/complaints",

        {

          title: formData.title,

          category: formData.category,

          priority: formData.priority,

          description: formData.description,


          location: {

            type: "Point",

            coordinates: [

              location.lng,

              location.lat

            ]

          }

        }

      );



      console.log(
        "Created complaint:",
        response.data
      );



      alert(
        "Complaint created successfully"
      );


      navigate("/my-complaints");



    } catch(error) {


      console.error(
        error.response?.data || error
      );


      alert(

        error.response?.data?.message ||

        "Failed to create complaint"

      );


    } finally {

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
          Category
        </label>


        <select

          name="category"

          value={formData.category}

          onChange={handleChange}

          required

        >

          <option value="">
            Select Category
          </option>

          <option value="Road">
            Road Issue
          </option>

          <option value="Electricity">
            Electricity
          </option>

          <option value="Water">
            Water Supply
          </option>

          <option value="Garbage">
            Garbage
          </option>

          <option value="Other">
            Other
          </option>


        </select>



        <label>
          Priority
        </label>


        <select

          name="priority"

          value={formData.priority}

          onChange={handleChange}

        >

          <option value="Low">
            Low
          </option>

          <option value="Medium">
            Medium
          </option>

          <option value="High">
            High
          </option>


        </select>



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
          Select Complaint Location
        </label>


        <MapPicker

          onLocationSelect={setLocation}

        />



        {
          location && (

            <p>

              Selected Location:

              <br />

              Latitude:
              {location.lat}

              <br />

              Longitude:
              {location.lng}

            </p>

          )
        }



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