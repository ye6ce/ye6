import { GoogleGenAI } from "@google/genai";
import { AI_MODELS } from "../constants";
import { AIMode } from "../types";

export class GeminiService {
  private static getAI() {
    // 1. Try Vite's standard way
    // 2. Try the defined process.env from your vite.config.ts
    // 3. Try a window-level fallback
    const apiKey = 
      import.meta.env.VITE_GEMINI_API_KEY || 
      (window as any).process?.env?.GEMINI_API_KEY ||
      (window as any).process?.env?.API_KEY;

    if (!apiKey) {
      console.error("DEBUG: API Key check failed. Values:", {
        vite: !!import.meta.env.VITE_GEMINI_API_KEY,
        process: !!(window as any).process?.env?.GEMINI_API_KEY
      });
      throw new Error("API Key not found. Please check Netlify Environment Variables.");
    }

    // IMPORTANT: Some versions of the SDK take the string directly, 
    // others take an object. This syntax is the most universally compatible:
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
    if (mode === 'think') modelId = AI_MODELS.THINK;
    if (mode === 'quiz') modelId = AI_MODELS.ANALYZE;

    // Use the model instance
    const model = genAI.getGenerativeModel({ model: modelId });

    const systemPrompt = `You are an expert Algerian teacher explaining "${lessonTitle}". 
    Context: ${context || ''}.
    Rules:
    - Language: Arabic/Algerian.
    - Math: Use LaTeX ($..$ for inline, $$..$$ for blocks).
    - Start explaining the lesson immediately.`;

    // Standard array-based content generation for maximum compatibility
    const parts = image 
      ? [{ text: `${systemPrompt}\n\nUser: ${prompt}` }, { inlineData: image }] 
      : [{ text: `${systemPrompt}\n\nUser: ${prompt}` }];

    const result = await model.generateContent({
      contents: [{ role: 'user', parts }]
    });

    const response = await result.response;
    return response.text();
  }
}
