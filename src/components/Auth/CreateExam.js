import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./CreateExam.css";

function CreateExam() {
  const navigate = useNavigate();

  // 🔹 Exam fields
  const [examName, setExamName] = useState("");
  const [branch, setBranch] = useState("");
  const [semester, setSemester] = useState("");
  const [subject, setSubject] = useState("");
  const [subCode, setSubCode] = useState("");
  const [examDate, setExamDate] = useState("");
  const [totalQuestions, setTotalQuestions] = useState("");
  const [duration, setDuration] = useState("");
  const [totalMarks, setTotalMarks] = useState("");

  // 🔥 MOST IMPORTANT
  const [classId, setClassId] = useState("");
  const [classes, setClasses] = useState([]);

  /* ================= FETCH CLASSES ================= */
  useEffect(() => {
    fetch("http://localhost:5000/api/classes")
      .then((res) => res.json())
      .then((data) => setClasses(data));
  }, []);

  /* 🔹 Static dropdown data */
  const branchOptions = ["CM", "EJ", "CE", "ME", "EE"];

  const semesterOptions = {
    CM: ["1st Sem", "2nd Sem", "4th Sem", "6th Sem"],
    EJ: ["1st Sem", "2nd Sem", "4th Sem", "6th Sem"],
    CE: ["1st Sem", "2nd Sem", "4th Sem", "6th Sem"],
    ME: ["1st Sem", "2nd Sem", "4th Sem", "6th Sem"],
    EE: ["1st Sem", "2nd Sem", "4th Sem", "6th Sem"],
  };

  const subjectOptions = {
    "1st Sem": [{ name: "BSC", code: "311305" }],
    "2nd Sem": [{ name: "BEE", code: "312302" }],
    "4th Sem": [{ name: "EES", code: "314301" }],
    "6th Sem": [
      { name: "MAN", code: "315301" },
      { name: "ETI", code: "316313" },
    ],
  };

  const handleSubjectChange = (value) => {
    const selected = subjectOptions[semester].find(
      (s) => s.name === value
    );
    setSubject(value);
    setSubCode(selected.code);
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const examData = {
      examName,
      branch,
      semester,
      subject,
      subCode,
      examDate,
      totalQuestions: Number(totalQuestions),
      duration: Number(duration),
      totalMarks: Number(totalMarks),
      classId, // 🔥 VERY IMPORTANT
    };

    const res = await fetch("http://localhost:5000/api/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(examData),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Failed to create exam");
      return;
    }

    alert("Exam Created Successfully");
    navigate("/exams");
  };

  return (
    <div className="create-exam-page">
      <h2>Create Exam</h2>

      <form className="create-exam-form" onSubmit={handleSubmit}>

        {/* 🔥 SELECT CLASS */}
        <label>Select Class</label>
        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          required
        >
          <option value="">Select Class</option>
          {classes.map((c) => (
            <option key={c._id} value={c._id}>
              {c.className} ({c.branch} - {c.semester})
            </option>
          ))}
        </select>

        <label>Exam Name</label>
        <input
          value={examName}
          onChange={(e) => setExamName(e.target.value)}
          required
        />

        <label>Branch</label>
        <select
          value={branch}
          onChange={(e) => {
            setBranch(e.target.value);
            setSemester("");
            setSubject("");
            setSubCode("");
          }}
          required
        >
          <option value="">Select Branch</option>
          {branchOptions.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>

        {branch && (
          <>
            <label>Semester</label>
            <select
              value={semester}
              onChange={(e) => {
                setSemester(e.target.value);
                setSubject("");
                setSubCode("");
              }}
              required
            >
              <option value="">Select Semester</option>
              {semesterOptions[branch].map((sem) => (
                <option key={sem} value={sem}>{sem}</option>
              ))}
            </select>
          </>
        )}

        {semester && (
          <>
            <label>Subject</label>
            <select
              value={subject}
              onChange={(e) => handleSubjectChange(e.target.value)}
              required
            >
              <option value="">Select Subject</option>
              {subjectOptions[semester].map((s) => (
                <option key={s.code} value={s.name}>{s.name}</option>
              ))}
            </select>
          </>
        )}

        {subCode && (
          <>
            <label>Subject Code</label>
            <input value={subCode} readOnly />
          </>
        )}

        <label>Exam Date</label>
        <input
          type="date"
          value={examDate}
          onChange={(e) => setExamDate(e.target.value)}
          required
        />

        <label>No. of Questions</label>
        <input
          type="number"
          value={totalQuestions}
          onChange={(e) => setTotalQuestions(e.target.value)}
          required
        />

        <label>Duration (minutes)</label>
        <input
          type="number"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          required
        />

        <label>Total Marks</label>
        <input
          type="number"
          value={totalMarks}
          onChange={(e) => setTotalMarks(e.target.value)}
          required
        />

        <button type="submit">Create Exam</button>
      </form>
    </div>
  );
}

export default CreateExam;
