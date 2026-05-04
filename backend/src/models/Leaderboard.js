const mongoose = require('mongoose');

const { Schema } = mongoose;

const leaderboardSchema = new Schema(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    compositeScore: {
      type: Number,
      default: 0,
      index: true,
    },
    completedCourses: {
      type: Number,
      default: 0,
    },
    highestTestScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    approvedProjects: {
      type: Number,
      default: 0,
    },
    rank: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

leaderboardSchema.index({ compositeScore: -1 });

const Leaderboard = mongoose.model('Leaderboard', leaderboardSchema);

module.exports = Leaderboard;
