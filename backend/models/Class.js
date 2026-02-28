const mongoose = require("mongoose");

const classSchema = new mongoose.Schema(
  {
    className: {
      type: String,
      required: true,
      trim: true,
    },

    branch: {
      type: String,
      required: true,
      trim: true,
    },

    year: {
      type: String,
      required: true,
      trim: true,
    },

    semester: {
      type: String,
      required: true,
      trim: true,
    },

    // 🔥 Students Array (NO required inside)
    students: [
      {
        rollNo: {
          type: Number,
        },

        enrollment: {
          type: String,
        },

        name: {
          type: String,
        },

        password: {
          type: String,
        },

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