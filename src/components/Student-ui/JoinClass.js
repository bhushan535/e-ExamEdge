import React, { useState } from "react";
import { useParams } from "react-router-dom";
import Toast    from "../Toast";
import useToast from "../useToast";

function JoinClass() {
  const { classId } = useParams();
  const { toasts, showToast, removeToast } = useToast();

  const [rollNo, setRollNo] = useState("");
  const [enrollment, setEnrollment] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const handleJoin = async (e) => {
    e.preventDefault();

    const res = await fetch(
      `http://localhost:5000/api/class/join/${classId}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rollNo: Number(rollNo),
          enrollment,
          name,
          password,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      showToast(data.message || "Failed to join class", "error");
      return;
    }

    if (data.success) {
      localStorage.setItem("joinedClass", JSON.stringify({ classId }));
      showToast("Joined class successfully! 🎉", "success");
    }
  };

  return (
    <div>
      <Toast toasts={toasts} removeToast={removeToast} />
      <h2>Join Class</h2>

      <form onSubmit={handleJoin}>
        <input type="number" placeholder="Roll No." value={rollNo} onChange={(e) => setRollNo(e.target.value)} required />
        <input placeholder="Enrollment Number" value={enrollment} onChange={(e) => setEnrollment(e.target.value)} required />
        <input placeholder="Student Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />

        <button type="submit">Join Class</button>
      </form>
    </div>
  );
}

export default JoinClass;
