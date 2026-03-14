import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL } from '../../config';
import Toast from '../Toast';
import useToast from '../useToast';
import BackButton from '../BackButton';
import { FaSearch, FaUserGraduate, FaFilter, FaEdit, FaFileExcel, FaUserCircle, FaGraduationCap, FaCalendarAlt } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import './StudentManagement.css';

const StudentManagement = () => {
  const { token } = useAuth();
  const { toasts, showToast, removeToast } = useToast();
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("");
  const [semester, setSemester] = useState("");

  const fetchStudents = async () => {
    try {
      const query = new URLSearchParams({ search, branch, semester }).toString();
      const res = await fetch(`${BASE_URL}/principal/students?${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setStudents(data.students);
    } catch (err) {
      showToast("Failed to fetch student database", "error");
    }
  };

  useEffect(() => {
    if (token) fetchStudents();
  }, [token, branch, semester]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchStudents();
  };

  const handleExport = () => {
    if (students.length === 0) {
      showToast("Database is empty", "error");
      return;
    }

    const exportData = students.map(s => ({
      'Roll No': s.rollNo,
      'Name': s.userId?.name || 'N/A',
      'Email': s.userId?.email || 'N/A',
      'Branch': s.branch,
      'Current Semester': s.currentSemester,
      'Current Year': s.currentYear,
      'Status': s.status
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, `Student_Registry_${new Date().toLocaleDateString()}.xlsx`);
    showToast("Student registry exported to Excel", "success");
  };

  return (
    <div className="student-mgmt-container">
      <Toast toasts={toasts} removeToast={removeToast} />
      <BackButton to="/TeacherHome" />
      
      <div className="mgmt-header">
        <div className="header-info">
            <h2><FaUserGraduate /> Student Directory</h2>
            <p>Comprehensive registry of all students enrolled in the institution</p>
        </div>
        <button className="export-btn-premium" onClick={handleExport}>
            <FaFileExcel /> Export Spreadsheet
        </button>
      </div>

      <div className="search-filter-belt">
        <form className="search-bar-modern" onSubmit={handleSearch}>
            <FaSearch />
            <input 
                type="text" 
                placeholder="Search by Name, Roll No or Email..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
        </form>

        <div className="filter-actions">
            <div className="filter-select">
                <FaFilter />
                <select value={branch} onChange={(e) => setBranch(e.target.value)}>
                    <option value="">All Disciplines</option>
                    <option value="CSE">Computer Science</option>
                    <option value="ECE">Electronics</option>
                    <option value="MECH">Mechanical</option>
                    <option value="CIVIL">Civil</option>
                </select>
            </div>
            <div className="filter-select">
                <FaCalendarAlt />
                <select value={semester} onChange={(e) => setSemester(e.target.value)}>
                    <option value="">All Semesters</option>
                    {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                </select>
            </div>
        </div>
      </div>

      <div className="students-grid">
        {students.length === 0 ? (
            <div className="no-students">
                <FaUserGraduate />
                <p>No student records found matching your selection.</p>
            </div>
        ) : (
            students.map((s) => (
                <div className="student-card-v2" key={s._id}>
                    <div className="card-accent"></div>
                    <div className="card-top">
                        <div className="student-avatar">
                            {s.userId?.name.charAt(0)}
                        </div>
                        <div className="student-meta">
                            <span className="roll-no">#{s.rollNo}</span>
                            <span className={`status-tag ${s.status}`}>{s.status}</span>
                        </div>
                    </div>
                    
                    <div className="card-center">
                        <h3>{s.userId?.name}</h3>
                        <p className="email">{s.userId?.email}</p>
                    </div>

                    <div className="card-bottom">
                        <div className="info-pill">
                            <FaGraduationCap /> {s.branch}
                        </div>
                        <div className="info-pill">
                            <FaCalendarAlt /> Sem {s.currentSemester}
                        </div>
                    </div>

                    <div className="card-actions">
                        <button className="edit-profile-btn" onClick={() => showToast("Profile editing coming soon", "info")}>
                            <FaEdit /> Manage Profile
                        </button>
                    </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
};

export default StudentManagement;
