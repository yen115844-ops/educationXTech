const mongoose = require('mongoose');

const exerciseSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    lessonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Lesson',
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['quiz', 'coding', 'text'],
      default: 'quiz',
    },
    questions: {
      type: [
        {
          question: { type: String, trim: true },
          options: [String],
          correctAnswer: mongoose.Schema.Types.Mixed,
          points: { type: Number, default: 1, min: 0 },
        },
      ],
      default: [],
    },
    deadline: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

exerciseSchema.index({ courseId: 1 });
exerciseSchema.index({ lessonId: 1 });

module.exports = mongoose.model('Exercise', exerciseSchema);
