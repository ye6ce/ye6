import { GoogleGenAI } from "@google/genai";
import { AI_MODELS } from "../constants";
import { AIMode } from "../types";

export class GeminiService {
  private static getAI() {
    // Check both Vite-style and process.env for maximum compatibility
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error("Missing API Key. Please set VITE_GEMINI_API_KEY in your Netlify Environment Variables.");
    }
    // Correct initialization: pass the string directly
    return new GoogleGenAI(apiKey);
  }

  static async generateResponse(
    mode: AIMode,
    prompt: string,
    image?: { data: string; mimeType: string },
    context?: string,
    lessonTitle?: string
  ): Promise<string> {
    const genAI = this.getAI();
    
    let modelId = AI_MODELS.FAST;
    if (['think', 'exercises'].includes(mode)) modelId = AI_MODELS.THINK;
    if (mode === 'quiz') modelId = AI_MODELS.ANALYZE;

    const model = genAI.getGenerativeModel({ model: modelId });

    const systemPrompt = `You are an Algerian expert teacher. 
    Subject: ${lessonTitle}. 
    Context: ${context || ''}.
    Instructions:
    - Explain immediately and clearly in Arabic (Standard/Algerian mix).
    - Use LaTeX for ALL formulas. Wrap them in $ for inline and $$ for blocks.
    - Be pedagogical and encouraging.`;

    const result = await model.generateContent(
      image 
        ? [`${systemPrompt}\n\nUser: ${prompt}`, { inlineData: image }]
        : [`${systemPrompt}\n\nUser: ${prompt}`]
    );

    const response = await result.response;
    return response.text();
  }
}
