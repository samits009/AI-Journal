import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  try {
    await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [{role: 'user', parts: [{text: 'hello'}]}]
    });
  } catch (e: any) {
    console.error(`Status:`, e.status || e.response?.status);
    console.error(`Message:`, e.message);
  }
}
run();
