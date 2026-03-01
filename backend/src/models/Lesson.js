const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema(
  {
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
      min: 0,
    },
    content: {
      type: String,
      default: '',
      trim: true,
    },
    videoUrl: {
      type: String,
      default: null,
      trim: true,
    },
    duration: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

lessonSchema.index({ courseId: 1, order: 1 });

module.exports = mongoose.model('Lesson', lessonSchema);
