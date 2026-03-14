import React, { useEffect, useState } from "react";
import "./Exams.css";
import { FaBookOpen, FaEdit, FaTrash, FaPlus, FaSearch, FaCogs, FaCopy, FaChartBar, FaGlobe, FaLock } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Toast      from "../Toast";
import useToast   from "../useToast";
import PopupModal from "../PopupModal";
import BackButton from "../BackButton";
import { BASE_URL } from '../../config';

function Exams(){
const { token, user } = useAuth();
const [exams,setExams] = useState([]);
const [activeTab, setActiveTab] = useState("my"); // "my" or "org"
const [search,setSearch] = useState("");
const [showCodes,setShowCodes] = useState(false);
const [codes,setCodes] = useState([]);

const [deleteModal, setDeleteModal] = useState({ open: false, targetId: null });

const { toasts, showToast, removeToast } = useToast();

const navigate = useNavigate();
const location = useLocation();

/* FETCH EXAMS */

const fetchExams = async()=>{
try{
const res = await fetch(`${BASE_URL}/exams`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const data = await res.json();

if(Array.isArray(data)){
setExams(data);
}
else if(Array.isArray(data.exams)){
setExams(data.exams);
}
else{
setExams([]);
}

}
catch(err){
console.error(err);
setExams([]);
}

};

useEffect(()=>{
if (token) fetchExams();

const interval = setInterval(()=>{
if (token) fetchExams();
},30000);

return ()=>clearInterval(interval);

},[token]);

/* STATUS */

const getStatus = (exam)=>{

if(!exam.isPublished) return "DRAFT";

const now = new Date();
const examDay = new Date(exam.examDate);

if(now.toDateString() === examDay.toDateString()){
return "AVAILABLE";
}

if(now < examDay){
return "UPCOMING";
}

return "ENDED";

};

const confirmDeleteExam = async (id) => {
  await fetch(`${BASE_URL}/exams/${id}`, { 
    method: "DELETE",
    headers: { 'Authorization': `Bearer ${token}` }
  });
  fetchExams();
  showToast("Exam removed from records.", "info");
};

const togglePublish = async(exam)=>{
try{
const res = await fetch(`${BASE_URL}/exams/toggle-publish/${exam._id}`,{
method:"PUT",
headers: { 'Authorization': `Bearer ${token}` }
});

const data = await res.json();

if(res.ok){
showToast(data.message || "Visibility updated!", "success");
fetchExams();
}
else{
showToast(data.message || "Action failed", "error");
}

}
catch(err){
console.error(err);
showToast("Network error", "error");
}

};

const handleClone = async (examId) => {
  try {
    const res = await fetch(`${BASE_URL}/exams/clone/${examId}`, {
      method: "POST",
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (data.success) {
      showToast("Exam duplicated to your library.", "success");
      fetchExams();
      setActiveTab("my");
    } else {
      showToast(data.message, "error");
    }
  } catch (err) {
    showToast("Duplicate failed", "error");
  }
};

const generateCodes = async(exam)=>{
try{
const res = await fetch(
`${BASE_URL}/exams/generate-codes/${exam._id}`,
{
method:"POST",
headers:{
"Content-Type":"application/json",
"Authorization": `Bearer ${token}`
},
body:JSON.stringify({
classId:exam.classId
})
}
);

const data = await res.json();

if(Array.isArray(data)){
setCodes(data);
}
else{
setCodes([]);
}
setShowCodes(true);

}
catch(err){
console.error(err);
setCodes([]);
showToast("Failed to generate security codes", "error");
}

};

const filteredExams = exams.filter((exam) => {
  const matchesSearch = exam.examName.toLowerCase().includes(search.toLowerCase()) || 
                      exam.subject.toLowerCase().includes(search.toLowerCase());
  
  if (activeTab === "my") {
    return matchesSearch && exam.createdBy === (user?._id || user?.id);
  } else {
    return matchesSearch && exam.createdBy !== (user?._id || user?.id) && exam.visibility === 'organization';
  }
});

const total = exams.length;
const available = exams.filter(e=>getStatus(e)==="AVAILABLE").length;
const draft = exams.filter(e=>getStatus(e)==="DRAFT").length;
const ended = exams.filter(e=>getStatus(e)==="ENDED").length;

return(
<div className="exams-container">
    <Toast toasts={toasts} removeToast={removeToast} />
    <BackButton to="/TeacherHome" />
    
    <div className="exams-header">
        <div className="header-text">
            <h2><FaBookOpen /> Exam Management</h2>
            <p>Design, deploy, and monitor institutional assessments</p>
        </div>
        <div className="header-actions">
           <button className="dashboard-btn" onClick={() => navigate("/TeacherHome")}>Dashboard</button>
           <button className="create-exam-btn" onClick={() => navigate("/CreateExam")}>
             <FaPlus /> Create New Exam
           </button>
        </div>
    </div>

    <div className="exams-layout">
        {/* Sidebar Stats */}
        <aside className="exams-sidebar">
            <div className="stats-glass">
                <div className="mini-stat">
                    <span>Total Exams</span>
                    <h4>{total}</h4>
                </div>
                <div className="mini-stat live">
                    <span>Available</span>
                    <h4>{available}</h4>
                </div>
                <div className="mini-stat draft">
                    <span>Drafts</span>
                    <h4>{draft}</h4>
                </div>
                <div className="mini-stat ended">
                    <span>Completed</span>
                    <h4>{ended}</h4>
                </div>
            </div>

            <div className="tag-filters">
                <h5>Filter by Status</h5>
                <button className={search === "" ? "active" : ""} onClick={()=>setSearch("")}>All Assessments</button>
                <button className={search === "AVAILABLE" ? "active" : ""} onClick={()=>setSearch("AVAILABLE")}>Live Now</button>
                <button className={search === "DRAFT" ? "active" : ""} onClick={()=>setSearch("DRAFT")}>Drafts Only</button>
                <button className={search === "ENDED" ? "active" : ""} onClick={()=>setSearch("ENDED")}>Past Exams</button>
            </div>
        </aside>

        {/* Main Content */}
        <main className="exams-main">
            <div className="content-filters">
                <div className="tab-switcher">
                    <button 
                        className={activeTab === 'my' ? 'active' : ''} 
                        onClick={() => setActiveTab('my')}
                    >
                        My Assessments
                    </button>
                    <button 
                        className={activeTab === 'org' ? 'active' : ''} 
                        onClick={() => setActiveTab('org')}
                    >
                        Organization Library
                    </button>
                </div>
                <div className="search-bar-modern">
                    <FaSearch />
                    <input
                        type="text"
                        placeholder="Search by name or subject..."
                        value={search}
                        onChange={(e)=>setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="exams-grid-modern">
                {filteredExams.length === 0 ? (
                    <div className="empty-exams">
                        <p>No examinations found matching your criteria.</p>
                    </div>
                ) : (
                    filteredExams.map((exam) => {
                        const status = getStatus(exam);
                        return (
                            <div className={`exam-card-v2 status-${status.toLowerCase()}`} key={exam._id}>
                                <div className="card-top">
                                    <div className="status-indicator">{status}</div>
                                    <div className="visibility-icon">
                                        {exam.visibility === 'organization' ? <FaGlobe title="Public to Org" /> : <FaLock title="Private" />}
                                    </div>
                                </div>
                                
                                <div className="card-body">
                                    <h3>{exam.examName}</h3>
                                    <p className="subject">{exam.subject}</p>
                                    
                                    <div className="exam-meta-grid">
                                        <div className="meta-item">
                                            <span>Date</span>
                                            <p>{new Date(exam.examDate).toLocaleDateString("en-IN")}</p>
                                        </div>
                                        <div className="meta-item">
                                            <span>Duration</span>
                                            <p>{exam.duration}m</p>
                                        </div>
                                        <div className="meta-item">
                                            <span>Total Marks</span>
                                            <p>{exam.totalMarks}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="card-footer-actions">
                                    {activeTab === "my" ? (
                                        <>
                                            <button className="btn-icon edit" title="Edit Properties" onClick={() => navigate(`/edit-exam/${exam._id}`)}>
                                                <FaEdit />
                                            </button>
                                            <button className="btn-icon add" title="Questions" onClick={() => navigate(`/add-question/${exam._id}`)}>
                                                <FaPlus />
                                            </button>
                                            <button className={`btn-text ${exam.isPublished ? 'unpublish' : 'publish'}`} onClick={() => togglePublish(exam)}>
                                                {exam.isPublished ? "Unpublish" : "Publish"}
                                            </button>
                                            <button className="btn-text secondary" onClick={() => generateCodes(exam)}>Codes</button>
                                            <button className="btn-icon clone" title="Duplicate" onClick={() => handleClone(exam._id)}>
                                                <FaCopy />
                                            </button>
                                            <button className="btn-icon results" title="Analytics" onClick={() => navigate(`/student-results/${exam._id}`)}>
                                                <FaChartBar />
                                            </button>
                                            <button className="btn-icon delete" title="Remove" onClick={() => setDeleteModal({ open: false, targetId: exam._id })}>
                                                <FaTrash />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button className="btn-full clone" onClick={() => handleClone(exam._id)}>
                                                <FaCopy /> Clone to My Library
                                            </button>
                                            <button className="btn-full results" onClick={() => navigate(`/student-results/${exam._id}`)}>
                                                <FaChartBar /> View Performance
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </main>
    </div>

    {/* Security Code Popup */}
    {showCodes && (
        <div className="code-overlay">
            <div className="code-modal">
                <div className="modal-header">
                   <h3>Student Security Codes</h3>
                   <button className="close-btn" onClick={()=>setShowCodes(false)}>&times;</button>
                </div>
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Student Name</th>
                                <th>Access Code</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Array.isArray(codes) && codes.map((c,index)=>(
                                <tr key={index}>
                                    <td>{c.studentName}</td>
                                    <td className="code-cell"><code>{c.code}</code></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )}

    <PopupModal
        isOpen={deleteModal.open}
        type="error"
        title="Permanently Delete Exam?"
        message="All associated questions, student access codes, and existing results will be lost forever."
        confirmText="Confirm Deletion"
        cancelText="Cancel"
        onConfirm={async () => {
            await confirmDeleteExam(deleteModal.targetId);
            setDeleteModal({ open: false, targetId: null });
        }}
        onCancel={() => setDeleteModal({ open: false, targetId: null })}
    />
</div>
);
}

export default Exams;
