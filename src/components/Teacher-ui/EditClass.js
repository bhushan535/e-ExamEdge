import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Toast    from "../Toast";
import useToast from "../useToast";
import BackButton from "../BackButton";
import { useAuth } from "../../context/AuthContext";
import { BASE_URL } from '../../config';
import "./EditClass.css";

function EditClass() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { toasts, showToast, removeToast } = useToast();

  const [className, setClassName] = useState("");
  const [branch, setBranch] = useState("");
  const [semester, setSemester] = useState("");
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);

  /* ================= FETCH DATA ================= */
  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      try {
        setLoading(true);
        // 1. Fetch Class Data
        const classRes = await fetch(`${BASE_URL}/class/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const classData = await classRes.json();
        
        // 2. Fetch Org Data (for sync)
        const orgRes = await fetch(`${BASE_URL}/org/details`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const orgData = await orgRes.json();

        if (classData) {
            setClassName(classData.className);
            setBranch(classData.branch);
            setSemester(classData.semester);
        }
        if (orgData.success) {
            setOrg(orgData.organization);
        }
      } catch (err) {
        showToast("Synchronization failed", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, token, showToast]);

  /* ================= UPDATE ================= */
  const handleUpdate = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(`${BASE_URL}/classes/${id}`, {
        method: "PUT",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ className, branch, semester }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || "Update failed", "error");
        return;
      }

      showToast("Class updated successfully! ✅", "success");
      setTimeout(() => navigate("/Classes"), 1500);
    } catch (err) {
      showToast("Network error during update", "error");
    }
  };

  const branches = org?.branches || [];
  const semesters = org?.semesters || [];

  return (
    <div className="edit-class-overlay">
      <Toast toasts={toasts} removeToast={removeToast} />
      <div className="ec-nav">
        <BackButton to="/Classes" />
      </div>

      <div className="ec-container glass-premium">
        <h2>Edit Class Blueprint</h2>
        <p className="ec-subtitle">Update parameters for this academic session</p>

        <form className="edit-class-form" onSubmit={handleUpdate}>
          <div className="ec-input-group">
            <label>Class Identifier</label>
            <input 
                value={className} 
                onChange={(e) => setClassName(e.target.value)} 
                required 
                placeholder="e.g. CS-4A ML"
            />
          </div>

          <div className="ec-grid">
            <div className="ec-input-group">
              <label>Branch / Domain</label>
              <select value={branch} onChange={(e) => setBranch(e.target.value)} required>
                <option value="">Select Branch</option>
                {branches.map((b) => (<option key={b} value={b}>{b}</option>))}
                {!branches.length && <option value={branch}>{branch}</option>}
              </select>
            </div>
          </div>

          <div className="ec-input-group">
            <label>Semester</label>
            <select value={semester} onChange={(e) => setSemester(e.target.value)} required>
              <option value="">Select Semester</option>
              {semesters.map((sem) => (<option key={sem} value={sem}>{sem}</option>))}
              {!semesters.length && <option value={semester}>{semester}</option>}
            </select>
          </div>

          <button type="submit" className="ec-save-btn" disabled={loading}>
            {loading ? "Syncing..." : "Commit Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default EditClass;
