import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AI_MODELS } from "../constants";
import { AIMode, ImageSize, Quiz } from "../types";

export class GeminiService {
  private static getAI() {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("VITE_GEMINI_API_KEY is not defined.");
    }
    return new GoogleGenAI({ apiKey });
  }

  static async generateResponse(
    mode: AIMode,
    prompt: string,
    image?: { data: string; mimeType: string },
    imageSize?: ImageSize,
    context?: string,
    lessonTitle?: string
  ): Promise<string> {
    const ai = this.getAI();
    
    let modelId = AI_MODELS.FAST;
    if (['think', 'exercises'].includes(mode)) modelId = AI_MODELS.THINK;
    if (mode === 'search') modelId = AI_MODELS.SEARCH;
    if (mode === 'image') modelId = AI_MODELS.IMAGE;
    if (mode === 'analyze' || mode === 'quiz') modelId = AI_MODELS.ANALYZE;

    const model = ai.getGenerativeModel({ model: modelId });

    // System instruction to ensure it explains immediately and uses LaTeX
    const systemPrompt = `You are an expert Algerian teacher. 
    The current lesson is: "${lessonTitle}". 
    Context: ${context || 'General educational support'}.
    Rules:
    1. Start explaining the lesson immediately in a clear, pedagogical way.
    2. Use Arabic (Algerian dialect/Standard mix) for explanation.
    3. Use LaTeX for ALL mathematical and physical formulas. Wrap them in $ for inline and $$ for blocks.
    4. Example: Use $E=mc^2$ instead of E=mc2.`;

    const result = await model.generateContent({
        contents: [{
            role: 'user',
            parts: image 
              ? [{ text: `${systemPrompt}\n\nUser: ${prompt}` }, { inlineData: image }] 
              : [{ text: `${systemPrompt}\n\nUser: ${prompt}` }]
        }]
    });

    const response = await result.response;
    // FIX: .text() is a function, not a property. 
    return response.text(); 
  }

  // ... other methods remain the same but use the new getAI() logic
}
