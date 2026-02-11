
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AI_MODELS } from "../constants";
import { AIMode, ImageSize } from "../types";

export class GeminiService {
  private static getAI() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  // Update generateResponse to correctly handle different AIModes and set model/config
  static async generateResponse(
    mode: AIMode,
    prompt: string,
    image?: { data: string; mimeType: string },
    imageSize?: ImageSize,
    context?: string
  ): Promise<GenerateContentResponse> {
    const ai = this.getAI();
    let modelToUse = AI_MODELS.FAST;
    const config: any = {};

    // Apply configuration based on the selected mode
    if (mode === 'think') {
      modelToUse = AI_MODELS.THINK;
    } else if (mode === 'analyze') {
      modelToUse = AI_MODELS.ANALYZE;
    } else if (mode === 'search') {
      modelToUse = AI_MODELS.SEARCH;
      config.tools = [{ googleSearch: {} }];
    } else if (mode === 'image') {
      modelToUse = AI_MODELS.IMAGE;
      if (imageSize) {
        config.imageConfig = { imageSize };
      }
    }

    let fullPrompt = prompt;
    if (context) {
        fullPrompt = `بناءً على المحتوى التالي من الملف المرفق:\n\n"""\n${context}\n"""\n\n${prompt}`;
    }

    let contents: any = image ? { parts: [{ inlineData: image }, { text: fullPrompt }] } : fullPrompt;

    return await ai.models.generateContent({
      model: modelToUse,
      contents: contents,
      config: config,
    });
  }

  static async generateExercisesText(lessonTitle: string, subjectName: string, specialty: string, subjectId: string, lessonContent?: string): Promise<string> {
    const ai = this.getAI();
    const isScientific = ['math', 'physics', 'science', 'tech_civil', 'tech_electrical', 'tech_mechanical', 'tech_process', 'accounting', 'economics'].includes(subjectId);
    const mathConstraint = isScientific 
      ? "استخدم LaTeX للرموز الرياضية بين $...$." 
      : "هذه مادة أدبية، تجنب تماماً استخدام أي رموز رياضية أو LaTeX. ركز على جودة اللغة العربية.";

    let contextInstruction = "";
    if (lessonContent) {
        contextInstruction = `اعتمد حصرياً على المحتوى التالي في صياغة التمارين:\n"""\n${lessonContent}\n"""\n`;
    }

    const prompt = `أنت أستاذ خبير ومتميز في البكالوريا الجزائرية. 
    ${contextInstruction}
    قم بكتابة موضوع امتحان نموذجي كامل لدرس "${lessonTitle}" في مادة ${subjectName} لشعبة ${specialty}. 
    1. الموضوع يتكون من 3 تمارين.
    2. لغة عربية فصحى سليمة.
    3. ${mathConstraint}`;

    const response = await ai.models.generateContent({
      model: AI_MODELS.FAST,
      contents: prompt,
      config: {} 
    });

    return response.text || "عذراً، تعذر توليد موضوع التمارين حالياً.";
  }

  static async generateQuiz(lessonTitle: string, subjectName: string, specialty: string, subjectId: string, lessonContent?: string): Promise<any> {
    const ai = this.getAI();
    const isScientific = ['math', 'physics', 'science', 'tech_civil', 'tech_electrical', 'tech_mechanical', 'tech_process', 'accounting', 'economics'].includes(subjectId);
    
    const mathConstraint = isScientific 
      ? "مهم جداً: استخدم تنسيق LaTeX للرموز الرياضية والفيزيائية في الأسئلة والخيارات والشروحات. ضع الصيغ بين علامتي دولار هكذا: `$صيغتي هنا$`." 
      : "هذه مادة أدبية، لا تستخدم LaTeX أو رموزاً رياضية أبداً في هذا الاختبار.";

    let contextInstruction = "";
    if (lessonContent) {
        contextInstruction = `اعتمد حصرياً على المحتوى التالي في صياغة الأسئلة:\n"""\n${lessonContent}\n"""\n`;
    }

    const prompt = `أنت أستاذ خبير ومصحح دقيق في البكالوريا الجزائرية. ${contextInstruction} قم بتوليد اختبار MCQ احترافي مكون من 10 أسئلة دقيقة لدرس "${lessonTitle}" في مادة ${subjectName} لشعبة ${specialty}. 
    يجب أن تكون الأسئلة متنوعة وتحاكي نمط البكالوريا. ${mathConstraint} أجب بتنسيق JSON فقط.`;

    const response = await ai.models.generateContent({
      model: AI_MODELS.FAST,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswerIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING }
                },
                required: ["question", "options", "correctAnswerIndex", "explanation"]
              }
            }
          },
          required: ["title", "questions"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  }

  static async generateSuggestions(lastMessage: string, lessonTitle: string): Promise<string[]> {
    try {
      const ai = this.getAI();
      const prompt = `بناءً على الشرح السابق لدرس "${lessonTitle}"، اقترح 3 أسئلة قصيرة ومهمة. أجب بتنسيق JSON: { "suggestions": ["سؤال 1", "سؤال 2", "سؤال 3"] }`;
      const response = await ai.models.generateContent({
        model: AI_MODELS.FAST,
        contents: prompt,
        config: { 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              suggestions: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["suggestions"]
          }
        }
      });
      const data = JSON.parse(response.text || "{}");
      return data.suggestions || [];
    } catch (e) {
      return ["كيف يطرح هذا في البكالوريا؟", "أعطني مثالاً تطبيقياً آخر", "ما هي أبرز النقاط؟"];
    }
  }
}