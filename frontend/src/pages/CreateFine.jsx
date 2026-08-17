import { useState } from "react";
import api from "../services/api";


const CreateFine = () => {


  const [form, setForm] = useState({

    citizenEmail: "",
    violationType: "",
    description: "",
    fineAmount: 0,
    location: ""

  });



  const [loading, setLoading] = useState(false);




  const handleChange = (e) => {

    setForm({

      ...form,

      [e.target.name]: e.target.value

    });

  };





  const handleSubmit = async (e) => {

    e.preventDefault();


    try {


      setLoading(true);



      const fineData = {

        citizenEmail: form.citizenEmail.trim(),

        violationType: form.violationType,

        description: form.description,

        fineAmount: Number(form.fineAmount),

        location: form.location

      };



      console.log(
        "Sending Fine Data:",
        fineData
      );




      const response = await api.post(

        "/fines",

        fineData

      );




      console.log(
        "Fine Created:",
        response.data
      );



      alert(
        response.data.message
      );



      setForm({

        citizenEmail: "",

        violationType: "",

        description: "",

        fineAmount: 0,

        location: ""

      });



    } catch(error) {


      console.error(
        "Fine Error:",
        error
      );



      alert(

        error.response?.data?.message ||

        "Failed to issue fine"

      );



    } finally {


      setLoading(false);


    }


  };






  return (

    <div className="form-container">


      <div className="complaint-card">



        <h1>
          Issue Digital Fine
        </h1>



        <p className="subtitle">
          Record traffic violations and issue official digital fines.
        </p>





        <form onSubmit={handleSubmit}>


          <label>
            Citizen Email
          </label>


          <input

            type="email"

            name="citizenEmail"

            placeholder="Enter citizen email"

            value={form.citizenEmail}

            onChange={handleChange}

            required

          />







          <label>
            Violation Type
          </label>



          <select

            name="violationType"

            value={form.violationType}

            onChange={handleChange}

            required

          >


            <option value="">
              Select violation
            </option>


            <option value="Illegal Parking">
              Illegal Parking
            </option>


            <option value="Speeding">
              Speeding
            </option>


            <option value="Traffic Signal Violation">
              Traffic Signal Violation
            </option>


            <option value="Driving Without License">
              Driving Without License
            </option>


            <option value="Illegal U-Turn">
              Illegal U-Turn
            </option>


            <option value="Noise Pollution">
              Noise Pollution
            </option>


            <option value="Other">
              Other
            </option>


          </select>







          <label>
            Violation Description
          </label>


          <textarea

            name="description"

            placeholder="Describe the violation"

            value={form.description}

            onChange={handleChange}

            required

          />








          <label>
            Fine Amount (৳)
          </label>


          <input

            type="number"

            name="fineAmount"

            min="0"

            value={form.fineAmount}

            onChange={handleChange}

            required

          />








          <label>
            Incident Location
          </label>


          <input

            type="text"

            name="location"

            placeholder="Enter incident location"

            value={form.location}

            onChange={handleChange}

            required

          />







          <button

            type="submit"

            className="primary-btn"

            disabled={loading}

          >

            {

              loading

              ? "Issuing Fine..."

              : "Issue Fine"

            }


          </button>



        </form>


      </div>


    </div>

  );


};



export default CreateFine;