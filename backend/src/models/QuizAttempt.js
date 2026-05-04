const mongoose = require('mongoose');

const { Schema } = mongoose;

const quizAttemptSchema = new Schema({
  studentId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  quizId: {
    type: Schema.Types.ObjectId,
    ref: 'Quiz',
    required: true,
  },
  score: {
    type: Number,
    min: 0,
    max: 100,
  },
  timeTakenSeconds: {
    type: Number,
  },
  answers: [{ type: Schema.Types.Mixed }],
  submittedAt: {
    type: Date,
    default: Date.now,
  },
});

const QuizAttempt = mongoose.model('QuizAttempt', quizAttemptSchema);

module.exports = QuizAttempt;
