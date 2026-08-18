import { useEffect, useState } from "react";
import api from "../services/api";

const MyFines = () => {
  const [fines, setFines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFine, setActiveFine] = useState("");
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState(null);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const loadFines = async () => {
    try { const response = await api.get("/fines/my"); setFines(response.data.data || []); }
    catch (error) { setNotice(error.response?.data?.message || "Unable to load your fines."); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadFines(); }, []);

  const submitDispute = async (fine) => {
    const data = new FormData();
    data.append("reason", reason);
    if (evidence) data.append("evidence", evidence);
    setSaving(true);
    try {
      const response = await api.post(`/fines/${fine._id}/dispute`, data);
      setFines((items) => items.map((item) => item._id === fine._id ? response.data.data : item));
      setNotice(response.data.message); setActiveFine(""); setReason(""); setEvidence(null);
    } catch (error) { setNotice(error.response?.data?.message || "Unable to submit the dispute."); }
    finally { setSaving(false); }
  };

  return <main className="page-container fine-page">
    <h1>My fines</h1><p>View notices, evidence, and dispute decisions.</p>
    {notice && <p className="form-message">{notice}</p>}
    {loading ? <p>Loading fines...</p> : fines.length === 0 ? <p>You have no fines.</p> : fines.map((fine) => <article className="fine-card" key={fine._id}>
      <h2>{fine.violationType}</h2><p>{fine.description}</p>
      <p><strong>Amount:</strong> ৳{fine.fineAmount} · <strong>Location:</strong> {fine.location}</p>
      <p><strong>Status:</strong> {fine.status} · <strong>Issued:</strong> {new Date(fine.createdAt).toLocaleDateString()}</p>
      {fine.evidence && <img className="fine-evidence" src={fine.evidence} alt="Fine evidence" />}
      <div className="fine-timeline"><span>Issued</span>{fine.disputedAt && <span>Disputed</span>}{fine.reviewedAt && <span>{fine.disputeStatus === "Accepted" ? "Cancelled" : "Reviewed"}</span>}</div>
      {fine.disputeReason && <section className="fine-dispute"><strong>Dispute: {fine.disputeStatus}</strong><p>{fine.disputeReason}</p>{fine.disputeEvidence && <img className="fine-evidence" src={fine.disputeEvidence} alt="Dispute evidence" />}{fine.reviewNote && <p><strong>Police review:</strong> {fine.reviewNote}</p>}</section>}
      {fine.status === "Unpaid" && fine.disputeStatus !== "Submitted" && (activeFine === fine._id ? <form className="fine-dispute" onSubmit={(event) => { event.preventDefault(); submitDispute(fine); }}><label>Reason<textarea value={reason} minLength="10" maxLength="1000" onChange={(event) => setReason(event.target.value)} required /></label><label>Supporting image (optional)<input type="file" accept="image/*" onChange={(event) => setEvidence(event.target.files?.[0] || null)} /></label><button className="primary-btn" disabled={saving}>{saving ? "Submitting..." : "Submit dispute"}</button><button className="secondary-btn" type="button" onClick={() => setActiveFine("")}>Cancel</button></form> : <button className="secondary-btn" onClick={() => setActiveFine(fine._id)}>Dispute this fine</button>)}
    </article>)}
  </main>;
};
export default MyFines;
