const express = require("express");
const router = express.Router();
const Result = require("../models/Result");
const Exam = require("../models/Exam");

// GET results for a student (student result page)
router.get("/results/student/:studentId", async (req, res) => {
  try {
    const results = await Result.find({ studentId: req.params.studentId })
      .populate("examId", "examName subject subCode examDate totalMarks totalQuestions duration")
      .sort({ submittedAt: -1 });
    res.json(results);
  } catch(err) {
    res.status(500).json({ message: err.message });
  }
});

// GET all student results for one exam (teacher results page)
router.get("/results/exam/:examId", async (req, res) => {
  try {
    const results = await Result.find({ examId: req.params.examId })
      .sort({ score: -1 });
    res.json(results);
  } catch(err) {
    res.status(500).json({ message: err.message });
  }
});

// GET summary stats for teacher
router.get("/results/exam/:examId/summary", async (req, res) => {
  try {
    const results = await Result.find({ examId: req.params.examId });
    if (!results.length) return res.json({ attempted: 0 });

    const scores = results.map(r => r.score);
    const percentages = results.map(r => r.percentage);
    const avg = scores.reduce((a,b) => a+b, 0) / scores.length;
    const passCount = results.filter(r => r.percentage >= 40).length;

    res.json({
      attempted: results.length,
      averageScore: Math.round(avg * 100) / 100,
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores),
      passCount,
      failCount: results.length - passCount,
      passRate: Math.round((passCount / results.length) * 100)
    });
  } catch(err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
