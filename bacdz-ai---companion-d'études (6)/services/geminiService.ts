import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AI_MODELS } from "../constants";
import { AIMode, ImageSize, Quiz } from "../types";

export class GeminiService {
private static getAI() {
// Optimized to use Vite environment variables for Netlify deployment
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
throw new Error("VITE_GEMINI_API_KEY is not defined. Please check your environment variables.");
}
return new GoogleGenAI({ apiKey });
}

static async generateResponse(
mode: AIMode,
prompt: string,
image?: { data: string; mimeType: string },
imageSize?: ImageSize,
context?: string
): Promise<GenerateContentResponse> {
const ai = this.getAI();

let modelId = AI_MODELS.FAST;
if (['think', 'exercises'].includes(mode)) modelId = AI_MODELS.THINK;
if (mode === 'search') modelId = AI_MODELS.SEARCH;
if (mode === 'image') modelId = AI_MODELS.IMAGE;
if (mode === 'analyze' || mode === 'quiz') modelId = AI_MODELS.ANALYZE;

const fullPrompt = context ? `Based on the following lesson context:\n${context}\n\nUser Question: ${prompt}` : prompt;

const response = await ai.models.generateContent({
model: modelId,
contents: [{
role: 'user',
parts: image ? [{ text: fullPrompt }, { inlineData: image }] : [{ text: fullPrompt }]
}]
});

return response;
}

static async generateQuiz(lessonTitle: string, context: string): Promise<Quiz> {
const ai = this.getAI();
const prompt = `Create a 5-question multiple choice quiz about "${lessonTitle}" based on this content: ${context}. Return the response strictly as a JSON object matching the Quiz interface.`;

const response = await ai.models.generateContent({
model: AI_MODELS.ANALYZE,
contents: prompt,
config: {
responseMimeType: "application/json"
}
});

return JSON.parse(response.text) as Quiz;
}

static async generateExercises(lessonTitle: string, context: string): Promise<string> {
const ai = this.getAI();
const prompt = `Generate 3 practice exercises with solutions for the lesson "${lessonTitle}" using this context: ${context}. Focus on pedagogical quality.`;

const response = await ai.models.generateContent({
model: AI_MODELS.THINK,
contents: prompt,
});
return response.text || "Could not generate exercises.";
}

static async generateSuggestions(lastMessage: string, lessonTitle: string): Promise<string[]> {
try {
const ai = this.getAI();
const prompt = `Based on the last assistant message about "${lessonTitle}", suggest three relevant, concise follow-up questions a student might ask. The last message was: "${lastMessage.substring(0, 500)}...". Return a JSON object with a "suggestions" key containing an array of three strings.`;

const response = await ai.models.generateContent({
model: AI_MODELS.FAST,
contents: prompt,
config: {
responseMimeType: "application/json",
responseSchema: {
type: Type.OBJECT,
properties: {
suggestions: {
type: Type.ARRAY,
items: { type: Type.STRING }
}
},
required: ["suggestions"]
}
}
});

if (response.text) {
const data = JSON.parse(response.text);
return data.suggestions || [];
}
return ["اشرح لي المزيد", "كيف يطرح هذا في الامتحان؟", "أعطني مثالاً"];
} catch (e) {
console.error("Failed to generate suggestions:", e);
return ["اشرح لي المزيد", "كيف يطرح هذا في الامتحان؟", "أعطني مثالاً"];
}
}
}