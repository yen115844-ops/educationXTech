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
          inputType: {
            type: String,
            enum: ['choice', 'essay', 'code_blank'],
            default: 'choice',
          },
          codeTemplate: { type: String, trim: true, default: '' },
          blanks: {
            type: [
              {
                key: { type: String, trim: true },
                answer: { type: String, trim: true },
                placeholder: { type: String, trim: true, default: '' },
              },
            ],
            default: [],
          },
          options: [String],
          correctAnswer: mongoose.Schema.Types.Mixed,
          caseSensitive: { type: Boolean, default: false },
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
