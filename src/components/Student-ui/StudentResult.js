import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./StudentResult.css";
import Spinner from "../Spinner";

function StudentResult() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [studentId, setStudentId] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const student = JSON.parse(localStorage.getItem("student"));
    if (student) {
      setStudentId(student.enrollment);
    } else {
      setError("Not logged in");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!studentId) return;

    fetch(`http://localhost:5000/api/results/student/${studentId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch results");
        return res.json();
      })
      .then((data) => {
        setResults(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [studentId]);

  if (loading) return <Spinner text="Loading your results..." />;
  if (error) return <div className="error-msg">{error}</div>;

  return (
    <div className="student-results-page">
      <div className="header-bar">
        <button className="back-btn" onClick={() => navigate("/StudentHome")}>
          ← Back to Dashboard
        </button>
        <h2>📄 My Exam Results</h2>
      </div>

      <div className="results-grid">
        {results.length === 0 ? (
          <p className="no-results">You have not completed any exams yet.</p>
        ) : (
          results.map((r) => (
            <div className="result-card" key={r._id}>
              <div className="r-card-header">
                <h3>{r.examName || (r.examId && r.examId.examName) || "Unknown Exam"}</h3>
                <span className={`badge-grade grade-${r.result?.toLowerCase() || (r.percentage >= 40 ? "pass" : "fail")}`}>
                  {r.result || (r.percentage >= 40 ? "Pass" : "Fail")}
                </span>
              </div>
              <div className="r-card-body">
                <div className="score-ring">
                  <svg viewBox="0 0 36 36" className="circular-chart blue">
                    <path
                      className="circle-bg"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="circle"
                      strokeDasharray={`${r.percentage}, 100`}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <text x="18" y="20.35" className="percentage">
                      {r.percentage}%
                    </text>
                  </svg>
                </div>
                <div className="score-details">
                  <p><b>Score:</b> {r.marks} / {r.totalMarks || (r.examId && r.examId.totalMarks)}</p>
                  <p><b>Date:</b> {new Date(r.submittedAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default StudentResult;
