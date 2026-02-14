
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { AI_MODELS } from "../constants";
import { AIMode, ImageSize, Quiz } from "../types";

export class GeminiService {
  private static getAI() {
    // The API key is hardcoded here as per the user's request to fix the application.
    // For production environments, it is strongly recommended to use a more secure method 
    // like environment variables and a proxy server to protect the key.
    const apiKey = "AIzaSyBagbgK4mzdKNlYEQy9i3iAu4pZinlHSRA";
    
    if (!apiKey) {
      throw new Error("An API Key must be set when running in a browser");
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
    if (['think', 'lesson_plan', 'exam_builder', 'exercises'].includes(mode)) modelId = AI_MODELS.THINK;
    if (mode === 'search') modelId = AI_MODELS.SEARCH;
    if (mode === 'image') modelId = AI_MODELS.IMAGE;
    if (mode === 'analyze' || mode === 'quiz') modelId = AI_MODELS.ANALYZE;

    const fullPrompt = context ? `Based on the following lesson context:\n${context}\n\nQuestion: ${prompt}` : prompt;

    const parts: any[] = [{ text: fullPrompt }];
    if (image) {
      parts.push({ inlineData: { data: image.data, mimeType: image.mimeType } });
    }

    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts: parts },
      config: {
        ...(mode === 'think' && { thinkingConfig: { thinkingBudget: 16000 } }),
        ...(mode === 'search' && { tools: [{ googleSearch: {} }] }),
        ...(mode === 'image' && { imageConfig: { imageSize: imageSize || '1K' }})
      },
    });

    return response;
  }

  static async generateQuiz(lessonTitle: string, subjectName: string, specialtyName: string, subjectId: string, lessonContent?: string, teacherProgram?: string | null): Promise<Quiz | null> {
    const ai = this.getAI();
    
    const contextPrompt = `
      You are an expert Algerian educator creating a challenging quiz for a BAC student.
      Subject: ${subjectName}
      Specialty: ${specialtyName}
      Lesson: ${lessonTitle}
      ${lessonContent ? `Lesson Context: ${lessonContent.substring(0, 1000)}...` : ''}
      ${teacherProgram ? `Teacher's Yearly Program Context: ${teacherProgram.substring(0, 1000)}...` : ''}
      
      Generate a challenging 5-question multiple-choice quiz (MCQ).
      - Questions must be relevant to the Algerian BAC exam style for this subject.
      - Each question must have exactly 4 options.
      - Provide a brief but clear explanation for the correct answer.
      - Ensure the correctAnswerIndex is the zero-based index of the correct option in the options array.
    `;

    try {
      const response = await ai.models.generateContent({
        model: AI_MODELS.ANALYZE,
        contents: contextPrompt,
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

      if (response.text) {
        return JSON.parse(response.text) as Quiz;
      }
      return null;
    } catch (error) {
      console.error("Error generating quiz:", error);
      return null;
    }
  }

  static async generateExercisesText(lessonTitle: string, subjectName: string, specialtyName: string, subjectId: string, lessonContent?: string, teacherProgram?: string | null): Promise<string> {
    const ai = this.getAI();
    const prompt = `
      Create a BAC-style exercise sheet (موضوع تمارين) for an Algerian student.
      Subject: ${subjectName}
      Specialty: ${specialtyName}
      Lesson: ${lessonTitle}
      ${lessonContent ? `Lesson Content: ${lessonContent.substring(0, 1000)}...` : ''}
      ${teacherProgram ? `Teacher's Yearly Program Context: ${teacherProgram.substring(0, 1000)}...` : ''}

      The exercise sheet should contain 2-3 challenging exercises that mimic the style and difficulty of the Algerian Baccalaureate exam.
      Ensure the exercises are comprehensive and cover the key aspects of the lesson.
      Format the output using Markdown, clearly separating each exercise.
    `;
    const response = await ai.models.generateContent({
        model: AI_MODELS.THINK,
        contents: prompt,
    });
    return response.text || "Could not generate exercises.";
  }

  static async generateLessonPlan(lessonTitle: string, subjectName: string, specialtyName: string, teacherProgram?: string | null): Promise<string> {
    const ai = this.getAI();
    const prompt = `
        As an expert Algerian teacher, create a detailed lesson plan (مذكرة بيداغوجية) for the following lesson:
        - Subject: ${subjectName}
        - Specialty: ${specialtyName}
        - Lesson Title: ${lessonTitle}
        ${teacherProgram ? `- Context from my yearly program: ${teacherProgram.substring(0, 1500)}` : ''}

        The lesson plan should follow the official Algerian pedagogical structure. Include:
        1. Header: Class, Subject, Unit, Lesson Title, Duration.
        2. Competencies: Specific skills the student should acquire.
        3. Learning Situation (وضعية الانطلاق): A compelling problem or scenario to introduce the lesson.
        4. Lesson Progression: Detailed steps, including teacher/student activities and key concepts.
        5. Formative Assessment (تقويم تكويني): Questions or a short activity to check understanding.
        6. Materials: List of required materials.
        
        Format the output clearly using Markdown.
    `;
    const response = await ai.models.generateContent({
        model: AI_MODELS.THINK,
        contents: prompt,
    });
    return response.text || "Could not generate lesson plan.";
  }
  
  static async generateFullSemesterExam(subjectName: string, specialtyName: string, semester: 1 | 2 | 3, lessonTitles: string[]): Promise<{ examText: string; solutionText: string }> {
    const ai = this.getAI();
    const prompt = `
        Generate a complete, realistic Algerian Baccalaureate trial exam (امتحان بكالوريا تجريبي) for:
        - Subject: ${subjectName}
        - Specialty: ${specialtyName}
        - Semester: ${semester}
        - Covered Lessons: ${lessonTitles.join(', ')}

        The exam should contain multiple parts and exercises that reflect the official exam's structure, duration, and difficulty.
        After generating the full exam text, provide a separate, detailed model solution (تصحيح نموذجي) with a grading scale (سلم التنقيط).
        Return the response as a single valid JSON object with two keys: "exam" and "solution".
    `;

    try {
        const response = await ai.models.generateContent({
            model: AI_MODELS.THINK,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        exam: { type: Type.STRING, description: "The full text of the exam in Markdown." },
                        solution: { type: Type.STRING, description: "The detailed model solution with grading scale in Markdown." }
                    },
                    required: ["exam", "solution"]
                }
            }
        });

        if (response.text) {
            const data = JSON.parse(response.text);
            return { examText: data.exam, solutionText: data.solution };
        }
    } catch (e) {
        console.error("Failed to generate exam", e);
    }
    return { examText: "Error generating exam.", solutionText: "Error generating solution." };
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
