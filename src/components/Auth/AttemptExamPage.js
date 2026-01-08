import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./AttemptExamPage.css";

function AttemptExamPage() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const student = JSON.parse(localStorage.getItem("student"));

  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  /* ========================
     AUTH CHECK
  ======================== */
  useEffect(() => {
    if (!student) {
      alert("Please login again");
      navigate("/student-login");
    }
  }, []);

  /* ========================
     FETCH EXAM + QUESTIONS
  ======================== */
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 🔥 GET ALL EXAMS & FIND ONE (safe)
        const examRes = await fetch("http://localhost:5000/api/exams");
        const exams = await examRes.json();
        const foundExam = exams.find((e) => e._id === examId);

        if (!foundExam) {
          alert("Exam not found");
          navigate("/student-home");
          return;
        }

        setExam(foundExam);
        setTimeLeft(foundExam.duration * 60);

        // QUESTIONS
        const qRes = await fetch(
          `http://localhost:5000/api/questions/${examId}`
        );
        const qData = await qRes.json();
        setQuestions(qData);
      } catch (err) {
        console.error(err);
        alert("Error loading exam");
      }
    };

    fetchData();
  }, [examId]);

  /* ========================
     TIMER
  ======================== */
  useEffect(() => {
    if (timeLeft === null || submitted) return;

    if (timeLeft <= 0) {
      handleSubmitExam(); // AUTO SUBMIT
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, submitted]);

  /* ========================
     HANDLE ANSWERS
  ======================== */
  const handleOptionChange = (qid, option) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [qid]: option,
    }));
  };

  /* ========================
     SUBMIT EXAM
  ======================== */
  const handleSubmitExam = async () => {
    if (submitted) return;

    setSubmitted(true);

    const payload = {
      studentId: student._id,
      examId,
      answers: Object.keys(selectedAnswers).map((qid) => ({
        questionId: qid,
        selected: selectedAnswers[qid],
      })),
    };

    try {
      await fetch("http://localhost:5000/api/results/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      alert("Exam submitted successfully");
      navigate("/student-results");
    } catch (err) {
      console.error(err);
      alert("Submission failed");
    }
  };

  /* ========================
     TIMER FORMAT
  ======================== */
  const minutes = Math.floor((timeLeft || 0) / 60);
  const seconds = (timeLeft || 0) % 60;

  if (!exam) return <p>Loading exam...</p>;

  return (
    <div className="attempt-exam-page">
      <h2>{exam.examName}</h2>

      <div className="timer">
        ⏳ Time Left: {minutes}:{seconds < 10 ? "0" : ""}
        {seconds}
      </div>

      {questions.map((q, index) => (
        <div key={q._id} className="question-box">
          <p>
            <b>Q{index + 1}.</b> {q.questionText}
          </p>

          {q.options.map((op, i) => (
            <label key={i} className="option">
              <input
                type="radio"
                name={q._id}
                checked={selectedAnswers[q._id] === op}
                onChange={() => handleOptionChange(q._id, op)}
              />
              {op}
            </label>
          ))}
        </div>
      ))}

      <button
        className="submit-btn"
        onClick={handleSubmitExam}
        disabled={submitted}
      >
        Submit Exam
      </button>
    </div>
  );
}

export default AttemptExamPage;
