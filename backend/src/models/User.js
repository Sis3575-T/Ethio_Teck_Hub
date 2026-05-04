const mongoose = require('mongoose');

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    email: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
      trim: true,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['student', 'admin'],
      default: 'student',
    },
    // Generated from displayName + nanoid at registration time
    portfolioSlug: {
      type: String,
      unique: true,
      sparse: true, // allows multiple null values before slug is assigned
    },
    skills: {
      type: [String],
      default: [],
    },
    githubLink: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Hashed refresh token; set to null after rotation
    refreshToken: {
      type: String,
      default: null,
    },
    // Hashed password-reset token
    resetToken: {
      type: String,
      default: null,
    },
    resetTokenExpiry: {
      type: Date,
      default: null,
    },
    averageFreelanceRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    // Ordered list of approved project ObjectIds for portfolio display
    projectOrder: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Project' }],
      default: [],
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
  }
);

const User = mongoose.model('User', userSchema);

module.exports = User;
