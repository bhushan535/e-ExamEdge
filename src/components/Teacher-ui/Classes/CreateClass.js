import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Toast from "../../Common/Toast";
import useToast from "../../Common/useToast";
import BackButton from "../../Common/BackButton";
import { FaPlusCircle, FaBook, FaLayerGroup, FaCalendarAlt, FaGraduationCap, FaChevronRight } from "react-icons/fa";
import { useAuth } from "../../../context/AuthContext";
import "./CreateClass.css";
import { BASE_URL } from '../../../config';

function CreateClass() {
  const navigate = useNavigate();
  const { user, token, teacherProfile, org } = useAuth();
  const { toasts, showToast, removeToast } = useToast();

  const [className, setClassName] = useState("");
  const [branch, setBranch] = useState("");
  const [year, setYear] = useState("");
  const [semester, setSemester] = useState("");
  const [enrollmentList, setEnrollmentList] = useState(""); // Added enrollmentList state
  const [loading, setLoading] = useState(false); // Changed initial loading state as local fetch is removed

  // Auto-set branch for Teachers in Org mode
  useEffect(() => {
    if (user?.role === 'teacher' && user?.mode === 'organization' && teacherProfile?.department) {
        setBranch(teacherProfile.department);
    }
  }, [user, teacherProfile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = { className, branch, semester, year };

    try {
      const res = await fetch(`${BASE_URL}/classes`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || "Failed to create class", "error");
        return;
      }

      showToast("Class blueprint initialized! 🎉", "success");
      setTimeout(() => navigate("/Classes"), 1500);
    } catch (err) {
      showToast("Network protocol error", "error");
    }
  };

  const branches = org?.branches || [];
  const years = org?.academicYears || [];
  const semesters = org?.semesters || [];

  return (
    <div className="cc-premium-overlay">
      <Toast toasts={toasts} removeToast={removeToast} />
      <div className="cc-nav-top">
        <BackButton to="/TeacherHome" />
      </div>
      
      <div className="cc-premium-container">
        <div className="cc-visual-sidebar">
            <div className="cc-sidebar-content">
                <div className="cc-brand-badge">Class Management Hub</div>
                <h1>Create New <br/><span>Class Section</span></h1>
                <p>Define the structure for your new class. All settings are synced with the principal's academic configuration.</p>
                
                <div className="cc-steps">
                    <div className={`cc-step ${className ? 'active' : ''}`}>
                        <div className="step-num">01</div>
                        <div className="step-label">Identify Class</div>
                    </div>
                    <div className={`cc-step ${branch && semester ? 'active' : ''}`}>
                        <div className="step-num 02">02</div>
                        <div className="step-label">Set Structure</div>
                    </div>
                </div>
            </div>
        </div>

        <div className="cc-form-section glass-premium animate-fade-in">
          <div className="cc-form-header">
            <div className="pulse-icon"><FaPlusCircle /></div>
            <h2>Class Details</h2>
            <p>Enter the required information to initialize the class.</p>
          </div>

          <form onSubmit={handleSubmit} className="cc-premium-form">
            <div className="cc-input-wrapper">
              <label><FaBook /> Class Identifier</label>
              <div className="input-with-icon">
                <input
                  type="text"
                  placeholder="e.g. CS-4A Machine Learning"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="cc-grid-row">
                <div className="cc-input-wrapper">
                  <label><FaLayerGroup /> Branch / Domain</label>
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    required
                    disabled={user?.role === 'teacher' && user?.mode === 'organization'}
                  >
                    <option value="">Select Branch</option>
                    {branches.map((b) => <option key={b} value={b}>{b}</option>)}
                    {!branches.length && <option value={branch}>{branch || "Loading..."}</option>}
                  </select>
                </div>
                <div className="cc-input-wrapper">
                  <label><FaCalendarAlt /> Academic Year</label>
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    required
                  >
                    <option value="">Select Year</option>
                    {years.map((y) => <option key={y} value={y}>{y}</option>)}
                    {!years.length && <option value={year}>{year}</option>}
                  </select>
                </div>
            </div>

            <div className="cc-input-wrapper">
              <label><FaGraduationCap /> Target Semester</label>
              <select value={semester} onChange={(e) => setSemester(e.target.value)} required>
                <option value="">Select Semester</option>
                {semesters.length > 0 ? (
                    semesters.map((sem) => <option key={sem} value={sem}>{sem}</option>)
                ) : (
                    <option disabled>No semesters defined by Principal</option>
                )}
              </select>
            </div>

            <button type="submit" className="cc-launch-btn" disabled={loading}>
                {loading ? "Syncing..." : <>Create Class <FaChevronRight /></>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateClass;
