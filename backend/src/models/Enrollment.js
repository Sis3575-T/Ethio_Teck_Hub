const mongoose = require('mongoose');

const { Schema } = mongoose;

const enrollmentSchema = new Schema({
  studentId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  courseId: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  progressPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  completedLessons: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Lesson',
    },
  ],
  certificateIssued: {
    type: Boolean,
    default: false,
  },
  enrolledAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound unique index: prevents a student from enrolling in the same course twice
enrollmentSchema.index({ studentId: 1, courseId: 1 }, { unique: true });

const Enrollment = mongoose.model('Enrollment', enrollmentSchema);

module.exports = Enrollment;
