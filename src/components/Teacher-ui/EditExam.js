import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Toast    from "../Toast";
import useToast from "../useToast";
import { FaEdit, FaBook, FaCalendarAlt, FaClock, FaCheckCircle, FaLock, FaGlobeAmericas, FaShieldAlt, FaTrash, FaExclamationTriangle } from 'react-icons/fa';
import BackButton from '../BackButton';
import "./CreateExam.css"; // Shared styling
import { BASE_URL } from '../../config';

function EditExam() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toasts, showToast, removeToast } = useToast();

  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    examName: "", subject: "", semester: "",
    examDate: "", startTime: "", endTime: "",
    totalMarks: "", duration: "", totalQuestions: "",
    visibility: "private",
    proctoringConfig: {
      enabled: true,
      autoSubmitLimit: 0,
      requireFullScreen: false,
      disableTabSwitching: false,
      warningLimit: 3
    }
  });

  const [status, setStatus] = useState("");

  /* ================= FETCH EXAM ================= */
  useEffect(() => {
    fetch(`${BASE_URL}/exams/${id}`)
      .then((res) => res.json())
      .then((exam) => {
        if (!exam || exam.success === false) {
          showToast("Assessment not found. Access denied.", "error");
          setTimeout(() => navigate("/Exams"), 1500);
          return;
        }

        const now = new Date();
        const start = new Date(exam.startDateTime);
        const end = new Date(exam.endDateTime);

        let currentStatus = "UPCOMING";
        if (now >= start && now <= end) currentStatus = "LIVE";
        if (now > end) currentStatus = "ENDED";

        setStatus(currentStatus);

        setForm({
          examName: exam.examName,
          subject: exam.subject,
          semester: exam.semester,
          examDate: exam.examDate?.slice(0, 10),
          startTime: exam.startTime,
          endTime: exam.endTime,
          totalMarks: exam.totalMarks,
          duration: exam.duration,
          totalQuestions: exam.totalQuestions,
          visibility: exam.visibility || "private",
          proctoringConfig: exam.proctoringConfig || {
            enabled: true,
            autoSubmitLimit: 0,
            requireFullScreen: false,
            disableTabSwitching: false,
            warningLimit: 3
          }
        });
      });
  }, [id, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name.startsWith("proctoring.")) {
      const field = name.split(".")[1];
      setForm({
        ...form,
        proctoringConfig: {
          ...form.proctoringConfig,
          [field]: type === "checkbox" ? checked : (type === "number" ? Number(value) : value)
        }
      });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.startTime >= form.endTime && form.startTime && form.endTime) {
      showToast("Chronological error: End time must follow start time.", "warning");
      return;
    }

    const res = await fetch(`${BASE_URL}/exams/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (!res.ok) {
      showToast("Modification rejected by server. Ensure integrity.", "error");
      return;
    }

    showToast("Assessment parameters updated! ✅", "success");
    setTimeout(() => navigate("/Exams"), 1500);
  };

  const isLocked = status === "LIVE" || status === "ENDED";

  return (
    <div className="create-exam-container">
      <BackButton to="/Exams" />
      <Toast toasts={toasts} removeToast={removeToast} />

      <div className="ce-header">
        <div className="ce-badge"><FaEdit /> Modification Console</div>
        <h1>Adjust Assessment Matrix</h1>
        <p>Refine evaluation parameters for {form.examName || "this assessment"}.</p>
      </div>

      {isLocked && (
        <div className="ce-lock-banner animate-pulse">
          <FaExclamationTriangle />
          <span>Evaluation Immutable: Status is {status}. Parameters are now locked for integrity.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="ce-form-v2">
        <div className="ce-form-grid">
            {/* Context */}
            <div className="ce-section glass-v2">
                <div className="section-head">
                    <FaBook />
                    <h3>Academic Core</h3>
                </div>
                <div className="ce-group">
                    <label>Assessment Identity</label>
                    <input name="examName" value={form.examName} onChange={handleChange} disabled={isLocked} placeholder="Exam Name" />
                </div>
                <div className="ce-group">
                    <label>Assigned Subject</label>
                    <input name="subject" value={form.subject} onChange={handleChange} disabled={isLocked} placeholder="Subject" />
                </div>
                <div className="ce-group">
                    <label>Cohort Semester</label>
                    <input name="semester" value={form.semester} onChange={handleChange} disabled={isLocked} placeholder="Semester" />
                </div>
            </div>

            {/* Logistics */}
            <div className="ce-section glass-v2">
                <div className="section-head">
                    <FaCalendarAlt />
                    <h3>Deployment Specs</h3>
                </div>
                <div className="ce-group">
                    <label>Scheduled Date</label>
                    <div className="input-with-icon-v2">
                        <FaClock />
                        <input type="date" name="examDate" min={today} value={form.examDate} onChange={handleChange} disabled={isLocked} />
                    </div>
                </div>
                <div className="ce-input-row">
                    <div className="ce-group">
                        <label>Start</label>
                        <input type="time" name="startTime" value={form.startTime} onChange={handleChange} disabled={isLocked} />
                    </div>
                    <div className="ce-group">
                        <label>End</label>
                        <input type="time" name="endTime" value={form.endTime} onChange={handleChange} disabled={isLocked} />
                    </div>
                </div>
                <div className="ce-input-row three-col">
                    <div className="ce-group">
                        <label>Points</label>
                        <input type="number" name="totalMarks" value={form.totalMarks} onChange={handleChange} disabled={isLocked} />
                    </div>
                    <div className="ce-group">
                        <label>Duration</label>
                        <input type="number" name="duration" value={form.duration} onChange={handleChange} disabled={isLocked} />
                    </div>
                    <div className="ce-group">
                        <label>Q-Count</label>
                        <input type="number" name="totalQuestions" value={form.totalQuestions} onChange={handleChange} disabled={isLocked} />
                    </div>
                </div>
                <div className="ce-group">
                    <label>Visibility Protocol</label>
                    <div className="ce-select-wrapper">
                        <select name="visibility" value={form.visibility} onChange={handleChange} disabled={isLocked}>
                            <option value="private">Private Access</option>
                            <option value="organization">Institutional Shared</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Proctoring */}
            <div className={`ce-section glass-v2 proctoring-highlights ${isLocked ? 'dimmed' : ''}`}>
                <div className="section-head">
                    <FaShieldAlt />
                    <h3>Integrity Protocols</h3>
                </div>
                <div className="proctoring-toggle-belt">
                    <span>Autonomous Supervision</span>
                    <label className="ce-switch">
                        <input 
                            type="checkbox" 
                            name="proctoring.enabled"
                            checked={form.proctoringConfig.enabled}
                            onChange={handleChange}
                            disabled={isLocked}
                        />
                        <span className="ce-slider"></span>
                    </label>
                </div>
                <div className="proctor-fields-grid">
                    <div className="p-check-item">
                        <input 
                            type="checkbox" 
                            id="fs-req"
                            name="proctoring.requireFullScreen"
                            checked={form.proctoringConfig.requireFullScreen}
                            onChange={handleChange}
                            disabled={isLocked || !form.proctoringConfig.enabled}
                        />
                        <label htmlFor="fs-req">Strict Full-Screen</label>
                    </div>
                    <div className="p-check-item">
                        <input 
                            type="checkbox" 
                            id="ts-dis"
                            name="proctoring.disableTabSwitching"
                            checked={form.proctoringConfig.disableTabSwitching}
                            onChange={handleChange}
                            disabled={isLocked || !form.proctoringConfig.enabled}
                        />
                        <label htmlFor="ts-dis">Focus Tracking</label>
                    </div>
                    <div className="ce-group p-counter">
                        <label>Warning System Limit</label>
                        <input 
                            type="number" 
                            name="proctoring.warningLimit"
                            value={form.proctoringConfig.warningLimit}
                            onChange={handleChange}
                            disabled={isLocked || !form.proctoringConfig.enabled}
                        />
                    </div>
                    <div className="ce-group p-counter">
                        <label>Kill-Switch Limit</label>
                        <input 
                            type="number" 
                            name="proctoring.autoSubmitLimit"
                            value={form.proctoringConfig.autoSubmitLimit}
                            onChange={handleChange}
                            disabled={isLocked || !form.proctoringConfig.enabled}
                        />
                    </div>
                </div>
            </div>
        </div>

        {!isLocked && (
            <div className="ce-actions">
                <button type="submit" className="ce-submit-btn">
                    <FaCheckCircle /> Synchronize Assessment Updates
                </button>
            </div>
        )}
      </form>
    </div>
  );
}

export default EditExam;
