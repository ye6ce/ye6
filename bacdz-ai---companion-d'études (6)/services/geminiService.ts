
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AI_MODELS } from "../constants";
import { AIMode, ImageSize } from "../types";

export class GeminiService {
  private static getAI() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  static async generateResponse(
    mode: AIMode,
    prompt: string,
    image?: { data: string; mimeType: string },
    imageSize?: ImageSize
  ): Promise<GenerateContentResponse> {
    const ai = this.getAI();
    
    // توحيد النموذج لجميع الأوضاع إلى AI_MODELS.FAST بناءً على طلب المستخدم
    const modelToUse = AI_MODELS.FAST; 
    let config: any = {};

    switch (mode) {
      case 'fast':
      case 'exercises':
      case 'think':
        // لا حاجة لـ thinkingConfig مع نموذج الفلاش ما لم يكن هناك متطلبات محددة جداً
        // ويمكن أن يعيق الاستجابة إذا كانت maxOutputTokens صغيرة جداً
        config = {}; 
        break;
      case 'image':
        // استخدام AI_MODELS.FAST لتوليد الصور بناءً على طلب المستخدم، 
        // مع العلم أن هذا قد يؤثر على جودة الصورة مقارنة بنماذج الصور المتخصصة.
        config = {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: imageSize || "1K"
          }
        };
        break;
      default:
        config = {};
        break;
    }

    // بناء المحتويات للطلب
    let contents: any;
    if (image) {
      contents = { parts: [{ inlineData: image }, { text: prompt }] };
    } else {
      contents = prompt;
    }

    return await ai.models.generateContent({
      model: modelToUse,
      contents: contents,
      config: config,
    });
  }

  static async generateExercisesText(lessonTitle: string, subjectName: string, specialty: string): Promise<string> {
    const ai = this.getAI();
    const prompt = `أنت أستاذ خبير ومتميز في البكالوريا الجزائرية. 
    قم بكتابة موضوع امتحان نموذجي كامل واحترافي لدرس "${lessonTitle}" في مادة ${subjectName} لشعبة ${specialty}. 
    
    شروط الكتابة:
    1. الموضوع يجب أن يتكون من 3 تمارين (التمرين الأول، التمرين الثاني، التمرين الثالث).
    2. استخدم لغة عربية فصحى سليمة وواضحة جداً.
    3. التنسيق: استخدم العناوين الواضحة والترقيم.
    4. ممنوع استخدام أي وسوم HTML مثل <br> أو <div>. استخدم فقط السطور الجديدة العادية.
    5. اجعل الموضوع يبدو تماماً مثل أوراق الامتحان الرسمية من حيث المنهجية والصعوبة.`;

    const response = await ai.models.generateContent({
      model: AI_MODELS.FAST, // تم التغيير إلى AI_MODELS.FAST
      contents: prompt,
      // لا حاجة لـ thinkingConfig مع نموذج الفلاش ما لم يكن هناك متطلبات محددة جداً
      config: {} 
    });

    return response.text || "عذراً، تعذر توليد موضوع التمارين حالياً.";
  }

  static async generateQuiz(lessonTitle: string, subjectName: string, specialty: string): Promise<any> {
    const ai = this.getAI();
    // تم تعديل الموجه للتأكيد على دقة المعلومات وصحة الإجابات
    const prompt = `أنت أستاذ خبير ومصحح دقيق في البكالوريا الجزائرية. قم بتوليد اختبار MCQ احترافي مكون من 10 أسئلة دقيقة لدرس "${lessonTitle}" في مادة ${subjectName} لشعبة ${specialty}. 
    يجب أن تكون الأسئلة متنوعة، واضحة، وخالية تماماً من الأخطاء الإملائية أو العلمية، وتحاكي نمط البكالوريا. الأهم هو دقة المعلومات وصحة الإجابات المقدمة في الخيارات. أجب بتنسيق JSON فقط.`;

    const response = await ai.models.generateContent({
      model: AI_MODELS.FAST, // تم التغيير إلى AI_MODELS.FAST
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
      const prompt = `بناءً على الشرح السابق لدرس "${lessonTitle}"، اقترح 3 أسئلة قصيرة ومهمة جداً قد يطرحها الطالب ليفهم الدرس بشكل أعمق. أجب بتنسيق JSON: { "suggestions": ["سؤال 1", "سؤال 2", "سؤال 3"] }`;
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
      const data = JSON.parse(response.text || "{}");
      return data.suggestions || [];
    } catch (e) {
      console.error("Error generating suggestions:", e);
      return ["كيف يطرح هذا في البكالوريا؟", "أعطني مثالاً تطبيقياً آخر", "ما هي أبرز النقاط؟"];
    }
  }
}
