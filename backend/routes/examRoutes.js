const express = require("express");
const router = express.Router();
const Exam = require("../models/Exam");

// console.log("Exam model type:", typeof Exam);
// console.log("Exam keys:", Object.keys(Exam));

/* ======================
   CREATE EXAM
====================== */
router.post("/exams", async (req, res) => {
  try {
    console.log("BODY RECEIVED:", req.body);

    const {
      examName,
      branch,
      year,
      semester,
      subject,
      subCode,
      examDate,
      startTime,
      endTime,
      totalQuestions,
      duration,
      totalMarks,
      classId,
    } = req.body;

    // BASIC VALIDATION
    if (
      !examName ||
      !branch ||
      !year ||
      !semester ||
      !subject ||
      !subCode ||
      !examDate ||
      !startTime ||
      !endTime ||
      !classId
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    // Convert numbers safely
    const safeTotalQuestions = Number(totalQuestions) || 0;
    const safeDuration = Number(duration) || 0;
    const safeTotalMarks = Number(totalMarks) || 0;

    // Convert date safely
    const safeDate = new Date(examDate);

    if (isNaN(safeDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid exam date",
      });
    }

    const exam = new Exam({
      examName,
      branch,
      year,
      semester,
      subject,
      subCode,
      examDate: safeDate,
      startTime,
      endTime,
      totalQuestions: safeTotalQuestions,
      duration: safeDuration,
      totalMarks: safeTotalMarks,
      classId,
      isPublished: false,
    });

    await exam.save();

    res.status(201).json({
      success: true,
      message: "Exam created successfully",
      exam,
    });
  } catch (err) {
    console.error("CREATE EXAM ERROR FULL:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/* ======================
   GET ALL EXAMS
====================== */
router.get("/exams", async (req, res) => {
  try {
    const exams = await Exam.find().sort({ createdAt: -1 });
    res.json(exams);
  } catch (err) {
    console.error("GET EXAMS ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;