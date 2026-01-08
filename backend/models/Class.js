const mongoose = require("mongoose");

const classSchema = new mongoose.Schema(
  {
    className: { type: String, required: true },
    subject: { type: String, required: true },
    semester: { type: String, required: true },
    branch: { type: String, required: true },
    year: { type: String, required: true },

    students: [
      {
        rollNo: { 
          type: Number, 
          required: true 
        }, // ✅ NEW (college decided roll no.)

        enrollment: { 
          type: String, 
          required: true 
        },

        name: { 
          type: String, 
          required: true 
        },

        password: { 
          type: String, 
          required: true 
        }, // plain for now (college project)

        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Class", classSchema);
