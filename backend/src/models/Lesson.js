const mongoose = require('mongoose');

const { Schema } = mongoose;

const lessonSchema = new Schema(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    // Sequential, 1-based ordering within a course
    order: {
      type: Number,
      required: true,
    },
    videoUrl: {
      type: String,
    },
    notes: {
      type: String,
    },
    hasCodingTask: {
      type: Boolean,
      default: false,
    },
    codingTaskDescription: {
      type: String,
    },
  },
  {
    // Only createdAt is needed per spec; disable updatedAt
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Compound index for efficient sequential ordering queries per course
lessonSchema.index({ courseId: 1, order: 1 });

const Lesson = mongoose.model('Lesson', lessonSchema);

module.exports = Lesson;
