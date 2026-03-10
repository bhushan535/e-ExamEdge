import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./ExamResults.css";
import Spinner from "../Spinner";

function ExamResults() {
  const { examId } = useParams();
  const navigate = useNavigate();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`http://localhost:5000/api/results/exam/${examId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch results");
        return res.json();
      })
      .then((resData) => {
        setData(resData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [examId]);

  if (loading) return <Spinner text="Loading Exam Results..." />;
  if (error) return <div className="error-msg">{error}</div>;
  if (!data) return null;

  const { exam, results } = data;

  const exportCSV = () => {
    const headers = ["Rank", "Name", "Enrollment", "Score", "Percentage", "Grade", "Status"];
    const rows = results.map((r) => [
      r.rank,
      r.name,
      r.enrollment,
      r.marks,
      r.percentage + "%",
      r.result,
      r.result === "Pass" ? "Pass" : "Fail"
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `exam-results-${examId}.csv`;
    a.click();
  };

  const attempted = results.length;
  const passCount = results.filter((r) => r.result === "Pass").length;
  const passRate = attempted > 0 ? Math.round((passCount / attempted) * 100) : 0;
  const highest = attempted > 0 ? Math.max(...results.map((r) => r.marks)) : 0;
  const lowest = attempted > 0 ? Math.min(...results.map((r) => r.marks)) : 0;
  const avg = attempted > 0 ? Math.round((results.reduce((a, b) => a + b.marks, 0) / attempted) * 100) / 100 : 0;

  return (
    <div className="exam-results-page">
      <div className="header-bar">
        <button className="back-btn" onClick={() => navigate("/Exams")}>
          ← Back to Exams
        </button>
        <h2>📊 Exam Results</h2>
      </div>

      <div className="exam-info-card">
        <h3>{exam.examName} — {exam.subject} ({exam.subCode})</h3>
        <p>
          Subject: {exam.subject} | Branch: {exam.branch} | Semester: {exam.semester} | Total Marks: {exam.totalMarks}
        </p>
      </div>

      <div className="summary-cards">
        <div className="stat-box">
          <span className="stat-val">{attempted}</span>
          <span className="stat-label">Attempted</span>
        </div>
        <div className="stat-box">
          <span className="stat-val">{avg} / {exam.totalMarks}</span>
          <span className="stat-label">Avg Score</span>
        </div>
        <div className="stat-box">
          <span className="stat-val">{highest} / {exam.totalMarks}</span>
          <span className="stat-label">Highest</span>
        </div>
        <div className="stat-box">
          <span className="stat-val">{lowest} / {exam.totalMarks}</span>
          <span className="stat-label">Lowest</span>
        </div>
        <div className="stat-box">
          <span className="stat-val">{passRate}%</span>
          <span className="stat-label">Pass Rate</span>
        </div>
      </div>

      <div className="table-controls">
        <button className="export-btn" onClick={exportCSV}>
          📥 Export CSV
        </button>
      </div>

      <div className="results-table-container">
        {results.length === 0 ? (
          <p className="no-results">No students have submitted this exam yet.</p>
        ) : (
          <table className="results-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Student Name</th>
                <th>Enrollment</th>
                <th>Score</th>
                <th>Percentage</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.enrollment} className={r.result === "Pass" ? "row-pass" : "row-fail"}>
                  <td>{r.rank}</td>
                  <td className="fw-bold">{r.name}</td>
                  <td>{r.enrollment}</td>
                  <td className="fw-bold">{r.marks} / {exam.totalMarks}</td>
                  <td>{r.percentage}%</td>
                  <td>
                    <span className={`grade-badge grade-${r.result.toLowerCase()}`}>{r.result}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default ExamResults;
