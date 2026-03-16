import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import * as XLSX from "xlsx";
import Toast      from "../../Common/Toast";
import useToast   from "../../Common/useToast";
import PopupModal from "../../Common/PopupModal";
import { FaSchool, FaSearch, FaCheckSquare, FaSquare, FaUsers, FaArrowLeft, FaLink, FaCopy, FaFileExport, FaFileAlt, FaFileUpload, FaEdit, FaTrash, FaIdBadge, FaGraduationCap, FaLayerGroup } from "react-icons/fa";
import "./ViewClass.css";
import { BASE_URL } from '../../../config';

function ViewClass() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const [cls, setCls] = useState(null);
  const { toasts, showToast, removeToast } = useToast();
  const [deleteModal, setDeleteModal] = useState({ open: false, targetId: null });

  // Organization Student Search
  const [showOrgAddModal, setShowOrgAddModal] = useState(false);
  const [orgSearchQuery, setOrgSearchQuery] = useState("");
  const [orgStudents, setOrgStudents] = useState([]);
  const [selectedEnrollments, setSelectedEnrollments] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  /* ================= FETCH CLASS ================= */
  const fetchClass = async () => {
    try {
      const res = await fetch(`${BASE_URL}/class/${id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || "Failed to fetch class.", "error");
        return;
      }
      setCls(data);
    } catch (err) {
      showToast("Network error fetching class", "error");
    }
  };

  useEffect(() => {
    if (token) {
        fetchClass();
    }
    // eslint-disable-next-line
  }, [id, token]);

  /* ================= SEARCH ORG STUDENTS ================= */
  const searchOrgStudents = async (q) => {
    setIsSearching(true);
    try {
      const res = await fetch(`${BASE_URL}/class/${id}/org-students?query=${q}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setOrgStudents(data.students);
      }
    } catch (err) {
      showToast("Error searching students", "error");
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (showOrgAddModal) {
      searchOrgStudents(orgSearchQuery);
    }
  }, [orgSearchQuery, showOrgAddModal]);

  if (!cls) return (
    <div className="view-class-loading glass-premium">
        <div className="loader"></div>
        <p>Synchronizing class data...</p>
    </div>
  );
 
  const sortedStudents = Array.isArray(cls.students) ? [...cls.students].sort((a, b) => a.rollNo - b.rollNo) : [];

  /* ================= JOIN LINK (dynamic) ================= */
  const joinLink = `${window.location.origin}/join-class/${id}`;

  /* ================= EXPORT CSV ================= */
  const exportStudents = () => {
    if (sortedStudents.length === 0) {
      showToast("No students to export.", "warning");
      return;
    }

    let csv = "Roll No,Enrollment No,Student Name,Password\n";
    sortedStudents.forEach((s) => {
      csv += `${s.rollNo},${s.enrollment},${s.name},${s.password}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${cls.className}_students.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Student list exported!", "success");
  };

  /* ================= DOWNLOAD TEMPLATE ================= */
  const downloadTemplate = () => {
    const data = [
      { "Roll No": "", "Enrollment Number": "", "Student Name": "", "Password": "" }
    ];
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [{ wch: 10 }, { wch: 22 }, { wch: 30 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "student_import_template.xlsx");
    showToast("Template downloaded!", "success");
  };

  /* ================= IMPORT STUDENTS ================= */
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb   = XLSX.read(evt.target.result, { type: "binary" });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);

        if (!rows.length) {
          showToast("The file is empty.", "warning");
          return;
        }

        // Validate required columns
        const required = ["Roll No", "Enrollment Number", "Student Name", "Password"];
        const missing  = required.filter(k => !Object.keys(rows[0]).includes(k));
        if (missing.length) {
          showToast(`Missing columns: ${missing.join(", ")}. Please use the template.`, "error");
          return;
        }

        const students = rows.map(r => ({
          rollNo:     Number(r["Roll No"]),
          enrollment: String(r["Enrollment Number"]).trim(),
          name:       String(r["Student Name"]).trim(),
          password:   String(r["Password"]).trim(),
        }));

        const res  = await fetch(`${BASE_URL}/class/import-students/${id}`, {
          method:  "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body:    JSON.stringify({ students }),
        });
        const data = await res.json();

        if (data.success) {
          showToast(data.message, "success");
          fetchClass(); // re-fetch class to update student list
        } else {
          showToast(data.message || "Import failed.", "error");
        }
      } catch (err) {
        showToast("Error reading file. Use the downloaded template format.", "error");
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = ""; // reset so same file can be re-imported
  };

  /* ================= DELETE STUDENT ================= */
  const confirmDeleteStudent = async (enrollment) => {
    try {
      const res = await fetch(`${BASE_URL}/class/${id}/student/${enrollment}`, { 
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast("Student removed.", "success");
        fetchClass();
      } else {
        showToast(data.message || "Removal failed", "error");
      }
    } catch (err) {
      showToast("Error removing student", "error");
    }
  };

  /* ================= EDIT STUDENT ================= */
  const editStudent = async (student) => {
    const name = prompt("Enter Student Name", student.name);
    const rollNo = prompt("Enter Roll No", student.rollNo);
    const password = prompt("Enter Password", student.password);

    if (!name || !rollNo || !password) {
      showToast("All fields are required.", "warning");
      return;
    }

    await fetch(`${BASE_URL}/class/${id}/student/${student._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, rollNo, password }),
    });

    fetchClass();
    showToast("Student updated!", "success");
  };

  const toggleStudentSelection = (enrollment) => {
    setSelectedEnrollments(prev => 
      prev.includes(enrollment) 
        ? prev.filter(e => e !== enrollment) 
        : [...prev, enrollment]
    );
  };

  const handleAddOrgStudents = async () => {
    if (selectedEnrollments.length === 0) return;
    try {
      const res = await fetch(`${BASE_URL}/class/${id}/add-org-students`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ studentEnrollments: selectedEnrollments }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, "success");
        setShowOrgAddModal(false);
        setSelectedEnrollments([]);
        setOrgSearchQuery("");
        fetchClass();
      } else {
        showToast(data.message, "error");
      }
    } catch (err) {
      showToast("Error adding students", "error");
    }
  };

  return (
    <div className="vc-premium-overlay animate-fade-in">
      <Toast toasts={toasts} removeToast={removeToast} />
      
      <div className="vc-nav-top">
        <button className="vc-back-btn" onClick={() => window.history.back()}>
            <FaArrowLeft /> Back to Dashboard
        </button>
      </div>

      <div className="vc-premium-container">
        {/* Left column: Class Metadata */}
        <div className="vc-metadata-section glass-premium">
            <div className="vc-header-visual">
                <div className="vc-brand-badge">Class Profile</div>
                <h1>{cls.className}</h1>
                <p className="vc-subtitle">Active Academic Cohort</p>
            </div>

            <div className="vc-info-grid">
                <div className="vc-info-item">
                    <label><FaLayerGroup /> Branch</label>
                    <span>{cls.branch}</span>
                </div>
                <div className="vc-info-item">
                    <label><FaGraduationCap /> Semester</label>
                    <span>{cls.semester}</span>
                </div>
            </div>

            <div className="vc-link-card">
                <div className="link-header">
                    <FaLink /> <span>Student Join Link</span>
                </div>
                <div className="link-input-group">
                    <input value={joinLink} readOnly />
                    <button onClick={() => {
                        navigator.clipboard.writeText(joinLink);
                        showToast("Link copied!", "success");
                    }}><FaCopy /></button>
                </div>
            </div>

            <div className="vc-actions-panel">
                <button className="vc-panel-btn org" onClick={() => setShowOrgAddModal(true)}>
                    <FaSchool /> Add From Institution
                </button>
                <div className="vc-action-row-split">
                    <button className="vc-panel-btn export" onClick={exportStudents}>
                        <FaFileExport /> Export
                    </button>
                    <button className="vc-panel-btn template" onClick={downloadTemplate}>
                        <FaFileAlt /> Template
                    </button>
                </div>
                <label className="vc-panel-btn import">
                    <FaFileUpload /> Import Students
                    <input type="file" accept=".xlsx,.xls" style={{ display: "none" }} onChange={handleImport} />
                </label>
            </div>
        </div>

        {/* Right column: Students Table */}
        <div className="vc-roster-section glass-premium">
            <div className="vc-roster-header">
                <div>
                    <h3><FaUsers /> Student Roster</h3>
                    <p>{sortedStudents.length} Students Enrolled</p>
                </div>
            </div>

            <div className="vc-table-container custom-scrollbar">
                {sortedStudents.length === 0 ? (
                    <div className="vc-empty-roster">
                        <div className="empty-icon"><FaUsers /></div>
                        <p>No students have joined this class section yet.</p>
                        <span className="hint">Share the join link or import students to get started.</span>
                    </div>
                ) : (
                    <table className="vc-roster-table">
                        <thead>
                            <tr>
                                <th>Roll</th>
                                <th>Enrollment</th>
                                <th>Student Name</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedStudents.map((s) => (
                            <tr key={s._id}>
                                <td><span className="roll-pill">{s.rollNo}</span></td>
                                <td className="enroll-txt">{s.enrollment}</td>
                                <td className="name-txt">{s.name}</td>
                                <td className="action-td">
                                    <button className="mini-action-btn edit" onClick={() => editStudent(s)}><FaEdit /></button>
                                    <button className="mini-action-btn delete" onClick={() => setDeleteModal({ open: true, targetId: s.enrollment })}><FaTrash /></button>
                                </td>
                            </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
      </div>
     {/* Delete Student Confirmation */}
      <PopupModal
        isOpen={deleteModal.open}
        type="error"
        title="Remove Student?"
        message="Are you sure you want to remove this student from the class?"
        confirmText="Yes, Remove"
        cancelText="Cancel"
        confirmColor="#dc2626"
        onConfirm={async () => {
          await confirmDeleteStudent(deleteModal.targetId);
          setDeleteModal({ open: false, targetId: null });
        }}
        onCancel={() => setDeleteModal({ open: false, targetId: null })}
      />
      {/* Add From Organization Modal */}
      {showOrgAddModal && (
        <div className="vc-modal-overlay animate-fade-in">
          <div className="vc-modal-content glass-premium">
            <div className="modal-header">
              <h3><FaSchool /> Institutional Pool</h3>
              <p>Select students to synchronize with this class</p>
            </div>
            
            <div className="vc-modal-search">
              <FaSearch />
              <input 
                type="text" 
                placeholder="Search name or enrollment..." 
                value={orgSearchQuery}
                onChange={(e) => setOrgSearchQuery(e.target.value)}
              />
            </div>
 
            <div className="vc-modal-list custom-scrollbar">
              {isSearching ? (
                <div className="vc-loading-state">Synchronizing pool...</div>
              ) : orgStudents.length === 0 ? (
                <div className="vc-empty-state">No eligible students found in the pool.</div>
              ) : (
                orgStudents.map(student => (
                  <div 
                    key={student.enrollmentNo} 
                    className={`vc-student-item ${selectedEnrollments.includes(student.enrollmentNo) ? 'selected' : ''}`}
                    onClick={() => toggleStudentSelection(student.enrollmentNo)}
                  >
                    <div className="vc-check-box">
                      {selectedEnrollments.includes(student.enrollmentNo) ? <FaCheckSquare /> : <FaSquare />}
                    </div>
                    <div className="vc-student-info">
                      <span className="name">{student.userId?.name}</span>
                      <span className="sub">{student.enrollmentNo} • {student.branch}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
 
            <div className="vc-modal-footer">
              <span className="vc-selected-tag">{selectedEnrollments.length} Selected</span>
              <div className="vc-modal-btns">
                <button className="vc-btn-ghost" onClick={() => setShowOrgAddModal(false)}>Cancel</button>
                <button 
                  className="vc-btn-primary" 
                  disabled={selectedEnrollments.length === 0}
                  onClick={handleAddOrgStudents}
                >
                  Sync to Class
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ViewClass;
