const express = require("express");
const router = express.Router();
const Exam = require("../models/Exam");

/* ======================
   CREATE EXAM (Teacher)
====================== */
router.post("/exams", async (req, res) => {
  try {
    const {
      examName,
      branch,
      semester,
      subject,
      subCode,
      examDate,
      totalQuestions,
      duration,
      totalMarks,
      classId, // 🔥 REQUIRED
    } = req.body;

    // ✅ validation (classId compulsory)
    if (
      !examName ||
      !branch ||
      !semester ||
      !subject ||
      !subCode ||
      !examDate ||
      !totalQuestions ||
      !duration ||
      !totalMarks ||
      !classId
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields including class are required",
      });
    }

    const exam = new Exam({
      examName,
      branch,
      semester,
      subject,
      subCode,
      examDate,
      totalQuestions,
      duration,
      totalMarks,
      classId,          // 🔥 LINK WITH CLASS
      isPublished: false,
    });

    await exam.save();

    res.status(201).json({
      success: true,
      message: "Exam created successfully",
      exam,
    });
  } catch (err) {
    console.error("CREATE EXAM ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});

/* ======================
   GET ALL EXAMS (Teacher)
====================== */
router.get("/exams", async (req, res) => {
  try {
    const exams = await Exam.find().sort({ createdAt: -1 });
    res.json(exams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ======================
   UPDATE EXAM
====================== */
router.put("/exams/:id", async (req, res) => {
  try {
    const updatedExam = await Exam.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updatedExam) {
      return res.status(404).json({
        success: false,
        message: "Exam not found",
      });
    }

    res.json({
      success: true,
      message: "Exam updated",
      exam: updatedExam,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ======================
   DELETE EXAM
====================== */
router.delete("/exams/:id", async (req, res) => {
  try {
    await Exam.findByIdAndDelete(req.params.id);
    res.json({
      success: true,
      message: "Exam deleted",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ======================
   SEND / PUBLISH EXAM
====================== */
router.put("/exams/publish/:id", async (req, res) => {
  try {
    await Exam.findByIdAndUpdate(req.params.id, {
      isPublished: true,
    });

    res.json({
      success: true,
      message: "Exam sent to students",
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ======================
   STUDENT – GET EXAMS
   (ONLY PUBLISHED + SAME CLASS)
====================== */
router.get("/exams/student/:classId", async (req, res) => {
  try {
    const exams = await Exam.find({
      classId: req.params.classId,
      isPublished: true,
    });

    res.json(exams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
