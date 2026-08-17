import { useEffect, useState } from "react";
import api from "../services/api";


const Notifications = () => {


  const [notifications, setNotifications] = useState([]);



  useEffect(() => {

    loadNotifications();

  }, []);




  const loadNotifications = async()=>{

    try{

      const response = await api.get(
        "/notifications"
      );


      setNotifications(
        response.data.data || []
      );


    }catch(error){

      console.log(
        "Notification error",
        error
      );

    }

  };





  return (

    <div className="page-container">


      <h1>
        Notifications
      </h1>



      {
        notifications.length === 0 ? (

          <p>
            No notifications yet.
          </p>


        ) : (


          notifications.map((item)=>(

            <div
              key={item._id}
              className="fine-card"
            >

              <h3>
                {item.title}
              </h3>


              <p>
                {item.message}
              </p>


              <small>
                {
                  new Date(
                    item.createdAt
                  ).toLocaleString()
                }
              </small>


            </div>

          ))


        )
      }



    </div>

  );


};


export default Notifications;