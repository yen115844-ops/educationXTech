const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    price: {
      type: Number,
      default: 0,
      min: 0,
    },
    thumbnail: {
      type: String,
      default: null,
      trim: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

courseSchema.index({ instructorId: 1 });
courseSchema.index({ isPublished: 1 });

module.exports = mongoose.model('Course', courseSchema);
