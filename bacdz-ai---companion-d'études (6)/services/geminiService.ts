import { GoogleGenAI } from "@google/genai";
import { AI_MODELS } from "../constants";
import { AIMode } from "../types";

export class GeminiService {
  private static getAI() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("VITE_GEMINI_API_KEY is not defined in environment variables.");
    }
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
    if (mode === 'search') modelId = AI_MODELS.SEARCH;
    if (mode === 'image') modelId = AI_MODELS.IMAGE;
    if (mode === 'analyze' || mode === 'quiz') modelId = AI_MODELS.ANALYZE;

    // Correct way to get the model
    const model = genAI.getGenerativeModel({ model: modelId });

    const systemPrompt = `You are an expert Algerian teacher. 
    The current lesson is: "${lessonTitle}". 
    Context: ${context || 'General educational support'}.
    Rules:
    1. Start explaining the lesson immediately in a clear, pedagogical way.
    2. Use Arabic (Algerian dialect/Standard mix) for explanation.
    3. Use LaTeX for ALL mathematical and physical formulas. Wrap them in $ for inline and $$ for blocks.
    4. Example: Use $E=mc^2$ instead of E=mc2.`;

    const result = await model.generateContent(
        image 
          ? [`${systemPrompt}\n\nUser: ${prompt}`, { inlineData: image }] 
          : [`${systemPrompt}\n\nUser: ${prompt}`]
    );

    const response = await result.response;
    return response.text();
  }
}
