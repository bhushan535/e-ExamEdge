const mongoose = require("mongoose");

const examSchema = new mongoose.Schema(
  {
    examName: { type: String, required: true },
    branch: { type: String, required: true },
    year: { type: String, required: true },
    semester: { type: String, required: true },
    subject: { type: String, required: true },
    subCode: { type: String, required: true },
    examDate: { type: Date, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    startDateTime: { type: Date },
    endDateTime: { type: Date },
    totalQuestions: { type: Number, required: true },
    duration: { type: Number, required: true },
    totalMarks: { type: Number, required: true },
    classId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// SAFE DateTime Generation
examSchema.pre("save", function (next) {
  if (this.examDate && this.startTime && this.endTime) {
    const dateStr = new Date(this.examDate)
      .toISOString()
      .split("T")[0];

    this.startDateTime = new Date(`${dateStr}T${this.startTime}`);
    this.endDateTime = new Date(`${dateStr}T${this.endTime}`);
  }
  next();
});

module.exports = mongoose.model("Exam", examSchema);