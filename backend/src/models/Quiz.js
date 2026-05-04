const mongoose = require('mongoose');

const { Schema } = mongoose;

const testCaseSchema = new Schema(
  {
    input: { type: String },
    expectedOutput: { type: String },
  },
  { _id: false }
);

const questionSchema = new Schema(
  {
    text: { type: String },
    type: {
      type: String,
      enum: ['multiple-choice', 'coding'],
    },
    options: [{ type: String }],
    correctIndex: { type: Number },
    testCases: [testCaseSchema],
  },
  { _id: false }
);

const quizSchema = new Schema({
  courseId: {
    type: Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
  },
  title: {
    type: String,
    trim: true,
  },
  durationSeconds: {
    type: Number,
    required: true,
  },
  isFinal: {
    type: Boolean,
    default: false,
  },
  questions: [questionSchema],
});

const Quiz = mongoose.model('Quiz', quizSchema);

module.exports = Quiz;
