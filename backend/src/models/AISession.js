const mongoose = require('mongoose');

const { Schema } = mongoose;

const messageSchema = new Schema(
  {
    role: { type: String, enum: ['system', 'user', 'assistant'], required: true },
    text: { type: String, required: true },
    meta: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: false }
);

const aiSessionSchema = new Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    provider: { type: String, default: process.env.AI_PROVIDER || 'mock' },
    messages: { type: [messageSchema], default: [] },
  },
  { timestamps: true }
);

const AISession = mongoose.model('AISession', aiSessionSchema);

module.exports = AISession;
