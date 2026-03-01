const mongoose = require('mongoose');

const chatbotLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    sessionId: {
      type: String,
      required: true,
    },
    messages: [
      {
        role: { type: String, enum: ['user', 'assistant'] },
        content: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

chatbotLogSchema.index({ sessionId: 1 });
chatbotLogSchema.index({ userId: 1 });

module.exports = mongoose.model('ChatbotLog', chatbotLogSchema);
