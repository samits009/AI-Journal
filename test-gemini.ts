import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  const models = [
    'gemini-3.6-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
    'gemini-3.7-flash'
  ];
  for (const model of models) {
    try {
      console.log(`Trying ${model}...`);
      await ai.models.generateContent({
        model,
        contents: [{role: 'user', parts: [{text: 'hello'}]}]
      });
      console.log(`${model} succeeded!`);
      return;
    } catch (e: any) {
      console.error(`Error with ${model}:`, e.message, 'Status:', e.status || e.response?.status);
    }
  }
}
run();
