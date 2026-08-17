import {
  FaIdCard,
  FaPassport,
  FaCar
} from "react-icons/fa";


const GovernmentServices = () => {


  const services = [

    {
      title:"National ID (NID) Services",
      description:
      "Access official National ID registration, correction and related services.",
      icon:<FaIdCard />,
      link:"https://services.nidw.gov.bd/nid-pub/"
    },


    {
      title:"e-Passport Services",
      description:
      "Apply for and manage your electronic passport services.",
      icon:<FaPassport />,
      link:"https://www.epassport.gov.bd/onboarding"
    },


    {
      title:"Driving License Services",
      description:
      "Access BRTA driving license forms and related services.",
      icon:<FaCar />,
      link:"https://brta.gov.bd/pages/forms/6922d9e6933eb65569e00eb4"
    }

  ];





  return (

    <div className="page-container">


      <h1>
        Government Services
      </h1>


      <p>
        Access official government service portals from one place.
      </p>





      <div className="service-grid">


        {
          services.map((service,index)=>(


            <div
              key={index}
              className="service-card"
            >


              <div className="service-icon">

                {service.icon}

              </div>



              <h3>

                {service.title}

              </h3>




              <p>

                {service.description}

              </p>




              <a

                href={service.link}

                target="_blank"

                rel="noopener noreferrer"

                className="primary-btn"

              >

                Visit Official Portal

              </a>



            </div>


          ))
        }


      </div>


    </div>

  );

};


export default GovernmentServices;
