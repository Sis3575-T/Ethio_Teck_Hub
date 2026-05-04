const mongoose = require('mongoose');

const { Schema } = mongoose;

const courseSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: [
        'Web Development',
        'Mobile Development',
        'AI/ML',
        'Cybersecurity',
        'UI/UX Design',
        'Database Systems',
      ],
      required: true,
    },
    instructorName: {
      type: String,
      trim: true,
    },
    enrollmentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

const Course = mongoose.model('Course', courseSchema);

module.exports = Course;
