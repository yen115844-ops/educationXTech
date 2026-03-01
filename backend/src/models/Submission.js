const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    exerciseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise', required: true },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    answers: {
      type: [
        {
          questionIndex: { type: Number, required: true },
          answer: mongoose.Schema.Types.Mixed,
        },
      ],
      default: [],
    },
    score: { type: Number, default: 0, min: 0 },
    totalPoints: { type: Number, default: 0, min: 0 },
    percentage: { type: Number, default: 0, min: 0, max: 100 },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

submissionSchema.index({ userId: 1, exerciseId: 1 });
submissionSchema.index({ userId: 1, courseId: 1 });
submissionSchema.index({ exerciseId: 1 });

module.exports = mongoose.model('Submission', submissionSchema);
