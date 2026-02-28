import React, { useEffect, useState } from "react";
import "./Exams.css";
import { FaBookOpen, FaEdit, FaTrash, FaPlus } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

function Exams() {
  const [exams, setExams] = useState([]);
  const navigate = useNavigate();

  /* ================= FETCH ================= */
  const fetchExams = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/exams");
      const data = await res.json();

      // ✅ FIX: handle object or array
      if (Array.isArray(data)) {
        setExams(data);
      } else if (Array.isArray(data.exams)) {
        setExams(data.exams);
      } else {
        setExams([]);
      }
    } catch (err) {
      console.error("Fetch Exams Error:", err);
      setExams([]);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  /* ================= STATUS ================= */
  const getStatus = (exam) => {
    if (!exam.isPublished) return "DRAFT";

    const now = new Date();
    const start = new Date(exam.startDateTime);
    const end = new Date(exam.endDateTime);

    if (now < start) return "UPCOMING";
    if (now >= start && now <= end) return "LIVE";
    return "ENDED";
  };

  /* ================= DELETE ================= */
  const deleteExam = async (id) => {
    const confirm = window.confirm(
      "Are you sure you want to delete this exam?"
    );
    if (!confirm) return;

    await fetch(`http://localhost:5000/api/exams/${id}`, {
      method: "DELETE",
    });

    fetchExams();
  };

  /* ================= PUBLISH ================= */
  const sendExam = async (exam) => {
    const now = new Date();
    const end = new Date(exam.endDateTime);

    if (now > end) {
      alert("Cannot publish expired exam");
      return;
    }

    await fetch(`http://localhost:5000/api/exams/publish/${exam._id}`, {
      method: "PUT",
    });

    alert("Exam published successfully");
    fetchExams();
  };

  return (
    <div className="exam-page">
      <h2 className="exam-title">
        <FaBookOpen /> All Exams
      </h2>

      <div className="exam-grid">
        {!Array.isArray(exams) || exams.length === 0 ? (
          <p className="no-exam">No exams created yet</p>
        ) : (
          exams.map((exam) => {
            const status = getStatus(exam);

            return (
              <div className="exam-card" key={exam._id}>
                <div className={`status-badge ${status.toLowerCase()}`}>
                  {status}
                </div>

                <h3>{exam.examName}</h3>

                <p><b>Subject:</b> {exam.subject}</p>

                <p>
                  <b>Date:</b>{" "}
                  {new Date(exam.examDate).toLocaleDateString("en-IN")}
                </p>

                <p>
                  <b>Time:</b> {exam.startTime} - {exam.endTime}
                </p>

                <p>
                  <b>Total Marks:</b> {exam.totalMarks}
                </p>

                <div className="exam-btns">

                  <button
                    className="edit-btn"
                    disabled={status === "LIVE" || status === "ENDED"}
                    onClick={() =>
                      navigate(`/edit-exam/${exam._id}`)
                    }
                  >
                    <FaEdit /> Edit
                  </button>

                  <button
                    className="delete-btn"
                    disabled={status === "LIVE"}
                    onClick={() => deleteExam(exam._id)}
                  >
                    <FaTrash /> Delete
                  </button>

                  <button
                    className="add-btn"
                    disabled={status !== "DRAFT"}
                    onClick={() =>
                      navigate(`/add-question/${exam._id}`)
                    }
                  >
                    <FaPlus /> Add Questions
                  </button>

                  <button
                    className="send-btn"
                    disabled={exam.isPublished || status === "ENDED"}
                    onClick={() => sendExam(exam)}
                  >
                    {exam.isPublished ? "Published" : "Publish Exam"}
                  </button>

                  <button
                    className="result-btn"
                    onClick={() =>
                      navigate(`/student-results/${exam._id}`)
                    }
                  >
                    View Results
                  </button>

                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default Exams;