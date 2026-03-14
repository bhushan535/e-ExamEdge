import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext"; // Added useAuth
import Toast    from "../Toast";
import useToast from "../useToast";
import { FaGraduationCap, FaBook, FaCalendarAlt, FaClock, FaCheckCircle, FaLock, FaGlobeAmericas, FaShieldAlt, FaTrash, FaPlus, FaCheck, FaSearch } from 'react-icons/fa';
import BackButton from '../BackButton';
import SearchableDropdown from './SearchableDropdown'; // Added SearchableDropdown
import "./CreateExam.css";
import { BASE_URL } from '../../config';

function CreateExam() {
const { token, user } = useAuth(); // Get token and user
const navigate = useNavigate();
const { toasts, showToast, removeToast } = useToast();

const today = new Date().toISOString().split("T")[0];

/* EXAM FIELDS */
const [examName,setExamName] = useState("");
const [subject,setSubject] = useState("");
const [subCode,setSubCode] = useState("");
const [examDate,setExamDate] = useState("");
const [totalQuestions,setTotalQuestions] = useState("");
const [duration,setDuration] = useState("");
const [marksPerQuestion,setMarksPerQuestion] = useState("");
const [visibility, setVisibility] = useState("private");

/* PROCTORING CONFIG */
const [proctoringConfig, setProctoringConfig] = useState({
  enabled: true,
  autoSubmitLimit: 0,
  requireFullScreen: false,
  disableTabSwitching: false,
  warningLimit: 3
});

/* CLASS DATA */
const [classId,setClassId] = useState("");
const [branch,setBranch] = useState("");
const [year,setYear] = useState("");
const [semester,setSemester] = useState("");

const [classes,setClasses] = useState([]);
const [orgSubjects, setOrgSubjects] = useState([]); // Dynamic subjects

/* FETCHING DATA */
useEffect(()=>{
  if (token) {
    // Fetch classes
    fetch(`${BASE_URL}/classes`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res=>res.json())
    .then(data=>setClasses(Array.isArray(data) ? data : []));

    // Fetch organization subjects if in organization mode
    if (user?.mode === 'organization') {
        fetch(`${BASE_URL}/principal/organization`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(data => {
            if (data.success && data.organization.subjects) {
                setOrgSubjects(data.organization.subjects);
            }
        });
    }
  }
},[token, user]);

/* CLASS SELECT */
const handleClassChange = (id)=>{
  setClassId(id);
  const selectedClass = classes.find(c=>c._id === id);
  if(!selectedClass) return;

  setBranch(selectedClass.branch);
  setYear(selectedClass.year);
  setSemester(selectedClass.semester);

  // Auto-reset subject when class changes
  setSubject("");
  setSubCode("");
};

/* SUBJECT SELECT */
const handleSubjectSelect = (selected) => {
    setSubject(selected.name || selected);
    setSubCode(selected.code || "");
};

/* SUBMIT */
const handleSubmit = async(e)=>{
  e.preventDefault();

  const examData = {
    examName,
    classId,
    branch,
    year,
    semester,
    subject,
    subCode,
    examDate,
    totalQuestions:Number(totalQuestions),
    duration:Number(duration),
    marksPerQuestion:Number(marksPerQuestion),
    totalMarks:Number(totalQuestions) * Number(marksPerQuestion),
    visibility,
    proctoringConfig
  };

  const res = await fetch(`${BASE_URL}/exams`,{
    method:"POST",
    headers:{ 
        "Content-Type":"application/json",
        "Authorization": `Bearer ${token}` // Added Authorization
    },
    body:JSON.stringify(examData)
  });

  const data = await res.json();

  if (!res.ok) {
    showToast(data.message || "Failed to initialize assessment. Check connectivity.", "error");
    return;
  }

  showToast("Deep-scan assessment initialized! 🚀", "success");
  setTimeout(() => navigate("/Exams"), 1500);
};

return (

<div className="create-exam-container">
<BackButton to="/Exams" />
<Toast toasts={toasts} removeToast={removeToast} />

<div className="ce-header">
    <div className="ce-badge"><FaPlus /> Deployment Console</div>
    <h1>Initialize New Assessment</h1>
    <p>Configure academic evaluation parameters and proctoring protocols.</p>
</div>

<form className="ce-form-v2" onSubmit={handleSubmit}>
    <div className="ce-form-grid">
        {/* Left Column: Basic Info */}
        <div className="ce-section glass-v2">
            <div className="section-head">
                <FaBook />
                <h3>Academic Context</h3>
            </div>
            
            <div className="ce-input-row">
                <div className="ce-group full">
                    <label>Target Cohort / Class</label>
                    <div className="ce-select-wrapper">
                        <select
                            value={classId}
                            onChange={(e)=>handleClassChange(e.target.value)}
                            required
                        >
                            <option value="">Select Target Class...</option>
                            {classes.map((c)=>(
                                <option key={c._id} value={c._id}>
                                    {c.className} ({c.branch} - {c.semester})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="ce-input-row three-col">
                <div className="ce-group">
                    <label>Department</label>
                    <input value={branch || "---"} readOnly className="readonly-input" />
                </div>
                <div className="ce-group">
                    <label>Year</label>
                    <input value={year || "---"} readOnly className="readonly-input" />
                </div>
                <div className="ce-group">
                    <label>Semester</label>
                    <input value={semester || "---"} readOnly className="readonly-input" />
                </div>
            </div>

            {(semester || user?.mode === 'solo') && (
                <div className="ce-group">
                    <label>Assigned Subject</label>
                    <SearchableDropdown 
                        options={user?.mode === 'organization' 
                            ? orgSubjects.filter(s => (!s.branch || s.branch === branch) && (!s.semester || s.semester === semester))
                            : []
                        }
                        placeholder="Search or type subject..."
                        value={subject}
                        onSelect={handleSubjectSelect}
                        required
                    />
                </div>
            )}

            <div className="ce-group">
                <label>Subject Protocol Code</label>
                <input 
                    placeholder="e.g. 316313"
                    value={subCode} 
                    onChange={(e) => setSubCode(e.target.value)}
                    className={`highlight ${!subCode ? 'manual-entry' : ''}`} 
                    readOnly={user?.mode === 'organization' && !!orgSubjects.find(s => s.name === subject)}
                />
            </div>
        </div>

        {/* Middle Column: Exam Details */}
        <div className="ce-section glass-v2">
            <div className="section-head">
                <FaCalendarAlt />
                <h3>Evaluation Specs</h3>
            </div>

            <div className="ce-group">
                <label>Assessment Identity (Exam Name)</label>
                <input
                    placeholder="e.g. Unit Test I - Advanced Algorithms"
                    value={examName}
                    onChange={(e)=>setExamName(e.target.value)}
                    required
                />
            </div>

            <div className="ce-input-row">
                <div className="ce-group">
                    <label>Deployment Date</label>
                    <div className="input-with-icon-v2">
                        <FaClock />
                        <input
                            type="date"
                            value={examDate}
                            min={today}
                            onChange={(e)=>setExamDate(e.target.value)}
                            required
                        />
                    </div>
                </div>
                <div className="ce-group">
                    <label>Visibility Protocol</label>
                    <div className="ce-select-wrapper">
                        <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
                            <option value="private">Private Access</option>
                            <option value="organization">Institutional Shared</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="ce-input-row three-col">
                <div className="ce-group">
                    <label>Q-Count</label>
                    <input
                        type="number"
                        placeholder="0"
                        value={totalQuestions}
                        onChange={(e)=>setTotalQuestions(e.target.value)}
                        required
                    />
                </div>
                <div className="ce-group">
                    <label>Duration (m)</label>
                    <input
                        type="number"
                        placeholder="Min"
                        value={duration}
                        onChange={(e)=>setDuration(e.target.value)}
                        required
                    />
                </div>
                <div className="ce-group">
                    <label>Mark/Q</label>
                    <input
                        type="number"
                        placeholder="Val"
                        value={marksPerQuestion}
                        onChange={(e)=>setMarksPerQuestion(e.target.value)}
                        required
                    />
                </div>
            </div>

            <div className="marks-summary-card">
                <div className="summary-label">Projected Total Score</div>
                <div className="summary-value">
                    {(Number(totalQuestions) && Number(marksPerQuestion)) ? Number(totalQuestions) * Number(marksPerQuestion) : 0}
                    <span>pts</span>
                </div>
            </div>
        </div>

        {/* Right Column: Proctoring */}
        <div className="ce-section glass-v2 proctoring-highlights">
            <div className="section-head">
                <FaShieldAlt />
                <h3>AI Proctoring Matrix</h3>
            </div>

            <div className="proctoring-toggle-belt">
                <span>Enable Autonomous Supervision</span>
                <label className="ce-switch">
                    <input 
                        type="checkbox" 
                        checked={proctoringConfig.enabled}
                        onChange={(e) => setProctoringConfig({...proctoringConfig, enabled: e.target.checked})}
                    />
                    <span className="ce-slider"></span>
                </label>
            </div>

            <div className={`proctor-fields-grid ${!proctoringConfig.enabled ? 'dimmed' : ''}`}>
                <div className="p-check-item">
                    <input 
                        type="checkbox" 
                        id="fs-req"
                        checked={proctoringConfig.requireFullScreen}
                        disabled={!proctoringConfig.enabled}
                        onChange={(e) => setProctoringConfig({...proctoringConfig, requireFullScreen: e.target.checked})}
                    />
                    <label htmlFor="fs-req">Enforce Full Screen Mode</label>
                </div>
                <div className="p-check-item">
                    <input 
                        type="checkbox" 
                        id="ts-dis"
                        checked={proctoringConfig.disableTabSwitching}
                        disabled={!proctoringConfig.enabled}
                        onChange={(e) => setProctoringConfig({...proctoringConfig, disableTabSwitching: e.target.checked})}
                    />
                    <label htmlFor="ts-dis">Detect Multi-Tab activity</label>
                </div>

                <div className="ce-group p-counter">
                    <label>Warning System Threshold</label>
                    <input 
                        type="number" 
                        value={proctoringConfig.warningLimit}
                        disabled={!proctoringConfig.enabled}
                        onChange={(e) => setProctoringConfig({...proctoringConfig, warningLimit: Number(e.target.value)})}
                    />
                    <small>Maximum violations until lockout</small>
                </div>

                <div className="ce-group p-counter">
                    <label>Autonomous Termination</label>
                    <input 
                        type="number" 
                        value={proctoringConfig.autoSubmitLimit}
                        disabled={!proctoringConfig.enabled}
                        onChange={(e) => setProctoringConfig({...proctoringConfig, autoSubmitLimit: Number(e.target.value)})}
                    />
                    <small>Violations until auto-submit (0 to disable)</small>
                </div>
            </div>
            
            <div className="proctoring-info-footer">
                <FaShieldAlt />
                <p>Advanced heuristics used to detect tab-switching, focus loss, and anomalous browser behavior.</p>
            </div>
        </div>
    </div>

    <div className="ce-actions">
        <button type="submit" className="ce-submit-btn">
            <FaCheckCircle /> Initialize Assessment Protocol
        </button>
        <p className="ce-disclaimer">By initializing, you agree to the institution's digital assessment guidelines.</p>
    </div>
</form>

</div>

);

}

export default CreateExam;
