import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents
} from "react-leaflet";

import { useState } from "react";


const defaultPosition = [
  23.8103,
  90.4125
];



function LocationMarker({ onLocationSelect }) {


  const [position, setPosition] = useState(null);



  useMapEvents({

    click(e) {


      const location = {

        lat: e.latlng.lat,

        lng: e.latlng.lng

      };


      setPosition(location);


      onLocationSelect(location);

    }

  });



  return position ? (

    <Marker
      position={[
        position.lat,
        position.lng
      ]}
    />

  ) : null;

}




function MapPicker({ onLocationSelect }) {


  return (

    <MapContainer

      center={defaultPosition}

      zoom={13}

      style={{
        height:"400px",
        width:"100%",
        borderRadius:"16px"
      }}

    >


      <TileLayer

        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"

        attribution="&copy; OpenStreetMap contributors"

      />


      <LocationMarker
        onLocationSelect={onLocationSelect}
      />


    </MapContainer>

  );

}


export default MapPicker;