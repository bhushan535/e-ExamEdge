import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AttemptExam.css";

function AttemptExam() {
  const [exams, setExams] = useState([]);
  const [student, setStudent] = useState(null);
  const navigate = useNavigate();

  // Load student
  useEffect(() => {
    const studentData = localStorage.getItem("student");
    if (!studentData) return;
    setStudent(JSON.parse(studentData));
  }, []);

  // Fetch exams for student's class
  useEffect(() => {
    if (!student || !student.classId) return;

    fetch(`http://localhost:5000/api/exams/student/${student.classId}`)
      .then((res) => res.json())
      .then((data) => setExams(data))
      .catch((err) => console.log(err));
  }, [student]);

  if (!student) {
    return <h2>Please login again</h2>;
  }

  return (
    <div className="attempt-exam-page">
      <h2>Available Exams</h2>

      {exams.length === 0 ? (
        <p>No exams available</p>
      ) : (
        exams.map((exam) => (
          <div className="exam-card" key={exam._id}>
            <h3>{exam.examName}</h3>
            <p><b>Subject:</b> {exam.subject}</p>

            <button
              className="start-btn"
              onClick={() => navigate(`/attempt-exam/${exam._id}`)}
            >
              Start Exam
            </button>
          </div>
        ))
      )}
    </div>
  );
}

export default AttemptExam;
