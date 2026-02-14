import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AIMode, ImageSize } from "./types";

// Mocking AI_MODELS if not imported
const AI_MODELS = { FAST: "gemini-1.5-flash" };

export class GeminiService {
private static getAI() {
const key = import.meta.env.VITE_GEMINI_API_KEY;

if (!key) {
console.error("Gemini API Key is missing in Netlify settings!");
}

return new GoogleGenAI(key || '');
}

static async generateResponse(
mode: AIMode,
prompt: string,
image?: { data: string; mimeType: string },
imageSize?: ImageSize
): Promise<GenerateContentResponse> {
const ai = this.getAI();
const modelToUse = AI_MODELS.FAST;

let contents: any;
if (image) {
contents = { parts: [{ inlineData: image }, { text: prompt }] };
} else {
contents = prompt;
}

return await ai.getGenerativeModel({ model: modelToUse }).generateContent(contents);
}

static async generateExercisesText(lessonTitle: string, subjectName: string, specialty: string): Promise<string> {
const ai = this.getAI();
const prompt = `أنت أستاذ خبير في البكالوريا الجزائرية. اكتب 3 تمارين لدرس "${lessonTitle}" في ${subjectName} لشعبة ${specialty}.`;

const result = await ai.getGenerativeModel({ model: AI_MODELS.FAST }).generateContent(prompt);
const response = await result.response;
return response.text() || "تعذر توليد التمارين.";
}
}