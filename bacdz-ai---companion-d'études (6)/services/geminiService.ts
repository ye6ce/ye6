
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AI_MODELS } from "../constants";
import { AIMode, ImageSize, Lesson } from "../types";

export class GeminiService {
  // Guidelines: Obtaining the API key directly from process.env.API_KEY.
  // Guidelines: Create a new GoogleGenAI instance right before making an API call.
  private static getAI() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

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

    if (mode === 'think') {
      modelToUse = AI_MODELS.THINK;
    } else if (mode === 'analyze') {
      modelToUse = AI_MODELS.ANALYZE;
    } else if (mode === 'search') {
      modelToUse = AI_MODELS.SEARCH;
      // Guidelines: Using googleSearch tool correctly.
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

  static async generateFullSemesterExam(subjectName: string, specialty: string, semester: 1 | 2 | 3, lessonTitles: string[]): Promise<{ examText: string; solutionText: string }> {
    const ai = this.getAI();
    const semesterText = semester === 1 ? 'الأول' : semester === 2 ? 'الثاني' : 'الثالث';
    const prompt = `
        بصفتك خبيرًا في تصميم امتحانات البكالوريا الجزائرية، قم ببناء موضوع امتحان شامل للفصل ${semesterText} في مادة "${subjectName}" لشعبة "${specialty}".
        يجب أن يغطي الامتحان جميع الدروس التالية: ${lessonTitles.join('، ')}.
        
        اتبع بدقة المنهجية الرسمية:
        1.  الجزء الأول: تمرينان يختبران المعارف الأساسية والاستدلال.
        2.  الجزء الثاني: وضعية إدماجية مركبة.
        3.  استخدم تنسيق Markdown للعناوين والقوائم. واستخدم LaTeX للرموز العلمية ($...$).
        
        قم بإرجاع الإجابة ككائن JSON واحد فقط يحتوي على مفتاحين:
        - "examText": يحتوي على نص الموضوع كاملاً.
        - "solutionText": يحتوي على التصحيح النموذجي المفصل مع سلم التنقيط (barème).
    `;

    const response = await ai.models.generateContent({
        model: AI_MODELS.THINK,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    examText: { type: Type.STRING },
                    solutionText: { type: Type.STRING }
                },
                required: ["examText", "solutionText"]
            }
        }
    });
    
    const result = JSON.parse(response.text || '{}');
    return {
        examText: result.examText || "لم يتمكن الذكاء الاصطناعي من توليد الموضوع.",
        solutionText: result.solutionText || "لم يتمكن الذكاء الاصطناعي من توليد التصحيح."
    };
  }

  static async generateLessonPlan(lessonTitle: string, subjectName: string, specialty: string, programContext?: string | null): Promise<string> {
    const ai = this.getAI();
    const programInstruction = programContext 
        ? `خذ بعين الاعتبار التوجيهات الرسمية من البرنامج السنوي التالي:\n"""\n${programContext}\n"""\n`
        : "";

    const prompt = `أنت مفتش تربوي خبير في النظام التعليمي الجزائري. ${programInstruction}قم بتوليد "مذكرة بيداغوجية" (Fiche Pédagogique) احترافية وكاملة لدرس "${lessonTitle}" في مادة ${subjectName} لشعبة ${specialty}.
    يجب أن تتضمن المذكرة:
    1. الكفاءة الختامية والمركبات.
    2. مؤشرات الكفاءة.
    3. الوسائل التعليمية.
    4. وضعية الانطلاق (التقويم التشخيصي).
    5. بناء التعلمات (عرض الدرس مع تفصيل المراحل البيداغوجية).
    6. وضعية استثمار المكتسبات (التقويم التحصيلي).
    7. مراجع الأستاذ المعتمدة.
    استخدم لغة تربوية رسمية وتنسيقاً منظماً جداً.`;

    const response = await ai.models.generateContent({
      model: AI_MODELS.THINK,
      contents: prompt
    });
    // Guidelines: Using .text property directly.
    return response.text || "";
  }

  static async generateExamTemplate(subjectName: string, specialty: string, topic: string, programContext?: string | null): Promise<string> {
    const ai = this.getAI();
     const programInstruction = programContext 
        ? `ملاحظة هامة: يجب أن يكون الموضوع متوافقاً تماماً مع التوجيهات المذكورة في البرنامج السنوي هذا:\n"""\n${programContext}\n"""\n`
        : "";
        
    const prompt = `بصفتك أستاذ خبير في تصميم مواضيع البكالوريا الجزائرية، ${programInstruction}صمم موضوع امتحان (فرض أو اختبار) حول موضوع "${topic}" في مادة ${subjectName} لشعبة ${specialty}.
    الموضوع يجب أن يتبع المنهجية الرسمية للوزارة:
    - الجزء الأول: تمرين نظري وتمرين استدلال علمي أو منطقي.
    - الجزء الثاني: وضعية إدماجية أو تمرين مسعى علمي (حسب المادة).
    - أرفق سلم التنقيط المفصل (Barème de notation).
    - استخدم LaTeX للرموز العلمية والرياضية $...$.`;

    const response = await ai.models.generateContent({
      model: AI_MODELS.THINK,
      contents: prompt
    });
    return response.text || "";
  }

  static async generateExercisesText(lessonTitle: string, subjectName: string, specialty: string, subjectId: string, lessonContent?: string, programContext?: string | null): Promise<string> {
    const ai = this.getAI();
    const isScientific = ['math', 'physics', 'science', 'tech_civil', 'tech_electrical', 'tech_mechanical', 'tech_process', 'accounting', 'economics'].includes(subjectId);
    const mathConstraint = isScientific 
      ? "استخدم LaTeX للرموز الرياضية بين $...$." 
      : "هذه مادة أدبية، تجنب تماماً استخدام أي رموز رياضية أو LaTeX. ركز على جودة اللغة العربية.";

    let contextInstruction = "";
    if (programContext) {
        contextInstruction += `استخدم التوجيهات من البرنامج السنوي التالي كمرجع أساسي:\n"""\n${programContext}\n"""\n`;
    }
    if (lessonContent) {
        contextInstruction += `واعتمد على المحتوى التالي من الدرس في صياغة التمارين:\n"""\n${lessonContent}\n"""\n`;
    }

    const prompt = `أنت أستاذ خبير ومتميز في البكالوريا الجزائرية. 
    ${contextInstruction}
    قم بكتابة موضوع امتحان نموذجي كامل لدرس "${lessonTitle}" في مادة ${subjectName} لشعبة ${specialty}. 
    1. الموضوع يتكون من 3 تمارين متدرجة الصعوبة.
    2. لغة عربية فصحى سليمة.
    3. ${mathConstraint}`;

    const response = await ai.models.generateContent({
      model: AI_MODELS.FAST,
      contents: prompt
    });

    return response.text || "عذراً، تعذر توليد موضوع التمارين حالياً.";
  }

  static async generateQuiz(lessonTitle: string, subjectName: string, specialty: string, subjectId: string, lessonContent?: string, programContext?: string | null): Promise<any> {
    const ai = this.getAI();
    const isScientific = ['math', 'physics', 'science', 'tech_civil', 'tech_electrical', 'tech_mechanical', 'tech_process', 'accounting', 'economics'].includes(subjectId);
    
    const mathConstraint = isScientific 
      ? "مهم جداً: استخدم تنسيق LaTeX للرموز الرياضية والفيزيائية في الأسئلة والخيارات والشروحات. ضع الصيغ بين علامتي دولار هكذا: `$صيغتي هنا$`." 
      : "هذه مادة أدبية، لا تستخدم LaTeX أو رموزاً رياضية أبداً في هذا الاختبار.";

    let contextInstruction = "";
     if (programContext) {
        contextInstruction += `استخدم التوجيهات من البرنامج السنوي التالي كمرجع أساسي:\n"""\n${programContext}\n"""\n`;
    }
    if (lessonContent) {
        contextInstruction += `واعتمد على المحتوى التالي من الدرس في صياغة الأسئلة:\n"""\n${lessonContent}\n"""\n`;
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
    
    // FIX: The `text` member on a GenerateContentResponse is a property, not a method.
    // Accessing it as `response.text()` causes a "not callable" error.
    return JSON.parse(response.text || "{}");
  }

  static async generateSuggestions(lastMessage: string, lessonTitle: string): Promise<string[]> {
    try {
      const ai = this.getAI();
      const prompt = `بناءً على الشرح السابق لدرس "${lessonTitle}"، اقترح 3 أسئلة قصيرة ومهمة للطالب. أجب بتنسيق JSON: { "suggestions": ["سؤال 1", "سؤال 2", "سؤال 3"] }`;
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
