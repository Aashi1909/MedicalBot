const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function run() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent("Summarize this: The patient has a fever and cough for the past 2 days.");
    const response = await result.response;
    console.log("Gemini output:", await response.text());
  } catch (err) {
    console.error("Gemini API Error:", JSON.stringify(err, null, 2));
  }
}

run();
