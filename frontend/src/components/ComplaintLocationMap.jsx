import { MapContainer, Marker, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const ComplaintLocationMap = ({ location }) => {
  const coordinates = location?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length !== 2) return null;
  const position = [Number(coordinates[1]), Number(coordinates[0])];
  if (!position.every(Number.isFinite)) return null;
  return <section className="complaint-location-map"><p className="eyebrow">Issue location</p><MapContainer center={position} zoom={16} scrollWheelZoom={false}><TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" /><Marker position={position} /></MapContainer></section>;
};
export default ComplaintLocationMap;
