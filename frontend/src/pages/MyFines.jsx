import { useEffect, useState } from "react";
import api from "../services/api";

const MyFines = () => {
  const [fines, setFines] = useState([]);

  useEffect(() => {
    const loadFines = async () => {
      try {
        const response = await api.get("/fines/my");
        setFines(response.data.data || []);
      } catch (error) {
        console.error("Failed to load fines", error);
      }
    };

    loadFines();
  }, []);

  return (
    <div className="page-container">
      <h1>My Fines</h1>

      {fines.length === 0 ? (
        <p>You have no fines.</p>
      ) : (
        fines.map((fine) => (
          <div key={fine._id} className="fine-card">
            <h3>{fine.violationType}</h3>
            <p>{fine.description}</p>
            <p>Amount: ৳{fine.fineAmount}</p>
            <p>Location: {fine.location}</p>
            <p>Status: {fine.status}</p>
            <p>Issued by: {fine.officer?.name || "N/A"}</p>
            <p>Date: {new Date(fine.createdAt).toLocaleDateString()}</p>
          </div>
        ))
      )}
    </div>
  );
};

export default MyFines;
