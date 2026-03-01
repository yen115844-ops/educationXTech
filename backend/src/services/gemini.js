/**
 * Gemini AI Service — wrapper gọi Google Gemini API
 * Cần GEMINI_API_KEY trong .env
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;
let model = null;

function getModel() {
  if (model) return model;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  genAI = new GoogleGenerativeAI(apiKey);
  model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
  return model;
}

/**
 * Gọi Gemini để trả lời câu hỏi
 * @param {string} systemPrompt – system instruction
 * @param {Array<{role: string, parts: [{text: string}]}>} history – conversation history
 * @param {string} userMessage – tin nhắn mới
 * @returns {Promise<string>} reply text
 */
async function askGemini(systemPrompt, history, userMessage) {
  const geminiModel = getModel();
  if (!geminiModel) {
    throw new Error('GEMINI_API_KEY chưa được cấu hình');
  }

  const chat = geminiModel.startChat({
    systemInstruction: {
      role: 'user',
      parts: [{ text: systemPrompt }],
    },
    history: history || [],
  });

  const result = await chat.sendMessage(userMessage);
  return result.response.text();
}

module.exports = { askGemini, getModel };
