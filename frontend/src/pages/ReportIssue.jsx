import { useState } from "react";
import { useNavigate } from "react-router";
import api from "../services/api";
import MapPicker from "../components/MapPicker";

const categories = ["Road & Infrastructure", "Waste Management", "Water Supply", "Electricity", "Public Safety", "Sanitation", "Other"];
const ReportIssue = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: "", category: categories[0], description: "", ward: "", latitude: "", longitude: "" });
  const [files, setFiles] = useState([]); const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const selectMapLocation = ({ lat, lng }) => setForm((current) => ({ ...current, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }));
  const useLocation = () => navigator.geolocation?.getCurrentPosition(({ coords }) => selectMapLocation({ lat: coords.latitude, lng: coords.longitude }), () => setError("Location was unavailable. Enter the coordinates manually."));
  const submit = async (event) => { event.preventDefault(); setSaving(true); setError(""); try { const data = new FormData(); Object.entries(form).forEach(([key, value]) => data.append(key, value)); files.forEach((file) => data.append("attachments", file)); const response = await api.post("/complaints", data); navigate(`/complaints/${response.data.data._id}`); } catch (requestError) { setError(requestError.response?.data?.message || "Could not submit your report."); } finally { setSaving(false); } };
  return <main className="site-shell report-page"><section className="report-intro"><p className="eyebrow">New community report</p><h1>Tell us what needs attention.</h1><p>Pin the issue precisely on the map so it reaches the correct city team.</p></section><form className="report-form" onSubmit={submit}>{error && <div className="notice notice--error">{error}</div>}<label>What is the issue?<input name="title" value={form.title} onChange={update} required /></label><label>Category<select name="category" value={form.category} onChange={update}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label><label className="form-wide">Describe the problem<textarea name="description" value={form.description} onChange={update} rows="6" required /></label><label>Ward or area<input name="ward" value={form.ward} onChange={update} /></label><label>Photo evidence<input type="file" accept="image/*" multiple onChange={(event) => setFiles(Array.from(event.target.files || []))} /></label><div className="form-wide map-picker-field"><span>Click the map to pin the problem</span><MapPicker onLocationSelect={selectMapLocation} /></div><div className="location-fields form-wide"><div><label>Latitude<input type="number" step="any" name="latitude" value={form.latitude} onChange={update} required /></label><label>Longitude<input type="number" step="any" name="longitude" value={form.longitude} onChange={update} required /></label></div><button className="text-button" type="button" onClick={useLocation}>Use my current location</button></div><button className="button button--primary form-submit" disabled={saving}>{saving ? "Submitting…" : "Submit community report"}</button></form></main>;
};
export default ReportIssue;
