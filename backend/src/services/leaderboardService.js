const Enrollment = require('../models/Enrollment');
const QuizAttempt = require('../models/QuizAttempt');
const Leaderboard = require('../models/Leaderboard');
const mongoose = require('mongoose');

let Project = null;
try {
  // Project model may not exist yet; keep optional
  // eslint-disable-next-line global-require
  Project = require('../models/Project');
} catch (err) {
  Project = null;
}

/**
 * Recalculate composite score for a student and update leaderboard entry.
 * Composite = 0.4*norm(completedCourses) + 0.4*norm(highestTestScore) + 0.2*norm(approvedProjects)
 */
async function recalculate(studentId) {
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    throw new Error('Invalid studentId');
  }

  // --- Individual metrics ---
  const completedCoursesCount = await Enrollment.countDocuments({
    studentId,
    $or: [{ progressPercent: { $gte: 100 } }, { certificateIssued: true }],
  });

  const highestAttempt = await QuizAttempt.find({ studentId, score: { $ne: null } })
    .sort({ score: -1 })
    .limit(1)
    .select('score')
    .lean();
  const highestTestScore = highestAttempt.length ? highestAttempt[0].score : 0;

  let approvedProjectsCount = 0;
  if (Project) {
    approvedProjectsCount = await Project.countDocuments({ studentId, status: 'approved' });
  }

  // --- Global maxima across students for normalization ---
  const maxCompletedAgg = await Enrollment.aggregate([
    { $match: { $or: [{ progressPercent: { $gte: 100 } }, { certificateIssued: true }] } },
    { $group: { _id: '$studentId', count: { $sum: 1 } } },
    { $group: { _id: null, max: { $max: '$count' } } },
  ]);
  const maxCompleted = (maxCompletedAgg[0] && maxCompletedAgg[0].max) || 0;

  const maxScoreAgg = await QuizAttempt.aggregate([
    { $match: { score: { $ne: null } } },
    { $group: { _id: '$studentId', maxScore: { $max: '$score' } } },
    { $group: { _id: null, max: { $max: '$maxScore' } } },
  ]);
  const maxTestScore = (maxScoreAgg[0] && maxScoreAgg[0].max) || 0;

  let maxProjects = 0;
  if (Project) {
    const maxProjAgg = await Project.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$studentId', count: { $sum: 1 } } },
      { $group: { _id: null, max: { $max: '$count' } } },
    ]);
    maxProjects = (maxProjAgg[0] && maxProjAgg[0].max) || 0;
  }

  // --- Normalization ---
  const norm = (value, max) => (max === 0 ? 0 : value / max);

  const nCourses = norm(completedCoursesCount, maxCompleted);
  const nScore = norm(highestTestScore, maxTestScore);
  const nProjects = norm(approvedProjectsCount, maxProjects);

  const compositeScore = 0.4 * nCourses + 0.4 * nScore + 0.2 * nProjects;

  // --- Upsert leaderboard entry ---
  const entry = await Leaderboard.findOneAndUpdate(
    { studentId },
    {
      studentId,
      completedCourses: completedCoursesCount,
      highestTestScore,
      approvedProjects: approvedProjectsCount,
      compositeScore,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // --- Compute rank: number of students with higher compositeScore + 1 ---
  const higherCount = await Leaderboard.countDocuments({ compositeScore: { $gt: compositeScore } });
  entry.rank = higherCount + 1;
  await entry.save();

  return entry;
}

module.exports = { recalculate };
