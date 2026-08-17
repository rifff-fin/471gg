import { useState } from "react";
import api from "../services/api";

const UploadCompletionReport = () => {
  const [form, setForm] = useState({
    complaint: "",
    description: "",
  });

  const [beforeImage, setBeforeImage] = useState(null);

  const [afterImage, setAfterImage] = useState(null);

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,

      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const data = new FormData();

      data.append("complaint", form.complaint);

      data.append("description", form.description);

      if (beforeImage) {
        data.append("beforeImage", beforeImage);
      }

      if (afterImage) {
        data.append("afterImage", afterImage);
      }

      const response = await api.post(
        "/completion-reports",

        data,

        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      alert(response.data.message);

      setForm({
        complaint: "",
        description: "",
      });

      setBeforeImage(null);

      setAfterImage(null);
    } catch (error) {
      console.log(error);

      alert(
        error.response?.data?.message || "Failed to submit completion report",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <div className="complaint-card">
        <h1>Upload Completion Report</h1>

        <p className="subtitle">
          Submit before and after evidence for completed work.
        </p>

        <form onSubmit={handleSubmit}>
          <label>Complaint Title</label>

          <input
            type="text"
            name="complaint"
            placeholder="Enter complaint Title"
            value={form.complaint}
            onChange={handleChange}
            required
          />

          <label>Before Work Image</label>

          <input
            type="file"
            accept="image/*"
            onChange={(e) => setBeforeImage(e.target.files[0])}
            required
          />

          <label>After Work Image</label>

          <input
            type="file"
            accept="image/*"
            onChange={(e) => setAfterImage(e.target.files[0])}
            required
          />

          <label>Completion Description</label>

          <textarea
            name="description"
            placeholder="Describe completed work"
            value={form.description}
            onChange={handleChange}
            required
          />

          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? "Submitting..." : "Submit Report"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UploadCompletionReport;
