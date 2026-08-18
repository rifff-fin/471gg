import { useEffect, useState } from "react";
import api from "../services/api";

const MyIssuedFines = () => {
  const [fines, setFines] = useState([]);
  const [notice, setNotice] = useState("");
  const [reviewingId, setReviewingId] = useState("");

  useEffect(() => {
    loadFines();
  }, []);

  const loadFines = async () => {
    try {
      const response = await api.get("/fines/issued");

      setFines(response.data.data || []);
    } catch (error) {
      console.log("Failed to load fines", error);
    }
  };

  const reviewDispute = async (fine, decision) => {
    const reviewNote = window.prompt("Optional review note for the citizen:") || "";
    setReviewingId(fine._id);
    try {
      const response = await api.patch(`/fines/${fine._id}/dispute`, { decision, reviewNote });
      setFines((items) => items.map((item) => item._id === fine._id ? response.data.data : item));
      setNotice(response.data.message);
    } catch (error) {
      setNotice(error.response?.data?.message || "Could not review the dispute.");
    } finally { setReviewingId(""); }
  };

  return (
    <div className="page-container fine-page">
      <h1>My Issued Fines</h1>
      {notice && <p className="form-message">{notice}</p>}

      {fines.length === 0 ? (
        <p>No fines issued yet.</p>
      ) : (
        fines.map((fine) => (
          <div key={fine._id} className="fine-card">
            <h3>{fine.violationType}</h3>

            <p>Citizen: {fine.citizen?.name || "N/A"}</p>

            <p>Email: {fine.citizen?.email || "N/A"}</p>

            <p>Amount: ৳{fine.fineAmount}</p>

            <p>Location: {fine.location}</p>

            <p>Status: {fine.status}</p>

            {fine.evidence && <img className="fine-evidence" src={fine.evidence} alt="Issued fine evidence" />}

            {fine.disputeStatus === "Submitted" && (
              <div className="fine-dispute">
                <strong>Citizen dispute</strong>
                <p>{fine.disputeReason}</p>
                {fine.disputeEvidence && <img className="fine-evidence" src={fine.disputeEvidence} alt="Citizen dispute evidence" />}
                <button className="primary-btn" disabled={reviewingId === fine._id} onClick={() => reviewDispute(fine, "accept")}>Accept & cancel fine</button>
                <button className="secondary-btn" disabled={reviewingId === fine._id} onClick={() => reviewDispute(fine, "reject")}>Reject dispute</button>
              </div>
            )}

            <p>Date: {new Date(fine.createdAt).toLocaleDateString()}</p>

            <hr />
          </div>
        ))
      )}
    </div>
  );
};

export default MyIssuedFines;
