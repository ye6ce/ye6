import { GoogleGenAI, Type } from "@google/genai";
import { philosophyBookContent } from "../data/philosophyBookContent";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function getStudyAssistantResponse(message: string, context: string, isPhilosophy: boolean = false) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are a world-class Algerian Baccalaureate study assistant. 
    The following lesson context is your PRIMARY and AUTHORITATIVE source: ${context}. 
    ${isPhilosophy 
      ? "Use this context to provide EXTREMELY DEEP, DETAILED, and EXHAUSTIVE answers. Expand on every philosophical argument, counter-argument, and quote." 
      : "Use this context to provide clear, helpful, and accurate answers suitable for a Baccalaureate student."}
    Respond in Arabic. Be encouraging, professional, and provide textbook-quality explanations.
    
    SEARCH INSTRUCTIONS:
    - Use Google Search to find additional context, official Algerian educational standards, and common Baccalaureate exam patterns related to this specific lesson.
    - Focus on Algerian educational websites (e.g., .dz domains, official ministry sites).
    
    CRITICAL INSTRUCTIONS:
    1. YOUR ANSWERS MUST BE BASED ON THE PROVIDED CONTEXT. Use search results ONLY to enrich, clarify, and provide official Algerian context to the provided material.
    2. ${isPhilosophy ? "NEVER provide short or superficial answers. Expand on every concept mentioned in the context." : "Provide comprehensive but concise answers that directly address the user's question."}
    3. Provide historical context, examples, and detailed breakdowns for every point.
    4. Aim for comprehensive coverage of the user's question, leaving no stone unturned.
    5. FORMATTING: Use <title> for main titles, <subtitle> for sub-sections, <highlight> for key terms, and <formula> for laws. 
    6. LISTS: Use clear bullet points starting with '-' for every point or item. 
    7. STRICT LINE BREAKS: Every single bullet point MUST start on a NEW LINE. NEVER put two points on the same line. 
    8. NO PARAGRAPH MIXING: Do not group multiple bullet points into a single paragraph block. Each point is its own entity.
    9. DO NOT use Markdown headers (e.g., #, ##).
    
    User message: ${message}`,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });
  return response.text;
}

export async function generateQuiz(lessonTitle: string, content: string, count: number = 5) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a ${count}-question quiz for the lesson: ${lessonTitle}. 
    STRICT REQUIREMENT: All questions and answers MUST be derived directly from the following content: ${content}. 
    Do not use outside information for the quiz.
    Format: JSON array of objects with { question, options: string[], correctAnswerIndex, explanation }.
    Language: Arabic.`,
    config: {
      responseMimeType: "application/json"
    }
  });
  return JSON.parse(response.text || "[]");
}

export async function explainLesson(lessonId: string, lessonTitleAr: string, lessonContent: string, isPhilosophy: boolean = false) {
  if (philosophyBookContent[lessonId]) {
    return {
      explanation: philosophyBookContent[lessonId],
      vocabulary: [],
      dates: []
    };
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are a world-class Algerian Baccalaureate teacher with decades of experience. 
    The following is a lesson topic/summary from the official curriculum. 
    Your task is to generate a ${isPhilosophy ? "EXTREMELY DETAILED, COMPREHENSIVE, and EXHAUSTIVE" : "clear and comprehensive"} lesson breakdown in JSON format.
    
    SEARCH INSTRUCTIONS:
    - Use Google Search to find official Algerian Baccalaureate resources, past exam questions, and detailed pedagogical explanations from Algerian educational sites for this exact lesson.
    - Ensure the explanation aligns perfectly with the current Algerian Ministry of Education standards.
    
    CRITICAL INSTRUCTIONS FOR THE 'explanation' FIELD:
    1. THE PROVIDED 'Topic Summary' IS YOUR PRIMARY AND AUTHORITATIVE SOURCE. Your explanation MUST be strictly based on this content. 
    2. Use Google Search and your deep internal knowledge to expand on, explain, and clarify the concepts found in the summary, ensuring they match the Algerian Baccalaureate requirements.
    3. Cover EVERY single detail, concept, sub-topic, and nuance found in the provided content.
    4. ${isPhilosophy 
      ? "The explanation MUST be EXTREMELY LONG, DETAILED, and THOROUGH (aim for 2000+ words). You MUST expand on every single bullet point and subtitle provided in the Topic Summary. For every 'Problem' (المشكلة), provide a deep analysis of the arguments, counter-arguments (Thesis, Antithesis), and the Synthesis (التركيب). Include numerous quotes from relevant philosophers and provide concrete real-world examples." 
      : "The explanation should be thorough and clear, covering all main points of the lesson in a way that is easy for a student to understand. Aim for a standard textbook length (approx 500-800 words)."}
    5. Use clear, professional, and educational Arabic suitable for a Baccalaureate student.
    6. Break the content into many logical sections with descriptive subtitles.
    7. FORMATTING: Use <title> for the main title, <subtitle> for sub-sections, <highlight> for key terms/names/dates, and <formula> for laws/rules. 
    8. LISTS: Use clear bullet points starting with '-' for every point or item. 
    9. STRICT LINE BREAKS: Every single bullet point MUST start on a NEW LINE. NEVER put two points on the same line. 
    10. NO PARAGRAPH MIXING: Do not group multiple bullet points into a single paragraph block. Each point is its own entity.
    11. ${isPhilosophy ? "NEVER summarize. Always expand. If the summary mentions a concept, explain it in depth." : "Ensure the explanation is balanced and covers all aspects of the provided summary."}
    
    CRITICAL INSTRUCTIONS FOR OTHER FIELDS:
    - 'vocabulary': Extract a comprehensive list of ALL technical terms and difficult words found in your generated explanation, with their meanings in Arabic.
    - 'dates': Extract ALL important historical dates and events mentioned in your generated explanation.
    
    Lesson Title: ${lessonTitleAr}
    Topic Summary: ${lessonContent}`,
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          explanation: { type: Type.STRING },
          vocabulary: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                meaning: { type: Type.STRING }
              }
            }
          },
          dates: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                date: { type: Type.STRING },
                event: { type: Type.STRING }
              }
            }
          }
        }
      }
    }
  });
  
  try {
    return JSON.parse(response.text);
  } catch (e) {
    return { explanation: response.text, vocabulary: [], dates: [] };
  }
}

export async function suggestQuestions(lessonTitleAr: string, lessonContent: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Based STRICTLY on the provided lesson content for "${lessonTitleAr}", suggest 3 thought-provoking questions that a student might ask to deepen their understanding of THIS SPECIFIC MATERIAL.
    Content: ${lessonContent}
    Format: JSON array of strings.
    Language: Arabic.`,
    config: {
      responseMimeType: "application/json"
    }
  });
  return JSON.parse(response.text || "[]");
}

export async function generateEssay(lessonTitle: string, content: string, essayType: string, topic: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are an expert Algerian Baccalaureate Philosophy teacher.
    Generate a complete, high-quality philosophical essay (مقالة فلسفية) for the lesson: "${lessonTitle}".
    
    CRITICAL INSTRUCTIONS:
    1. The essay MUST be based on the following lesson content: ${content}.
    2. The user has requested to write the essay using the following methodology (الطريقة): "${essayType}".
    3. The specific topic/question is: "${topic}".
    4. Format the essay strictly according to the chosen Algerian Baccalaureate methodology (e.g., Introduction, Development, Conclusion with their specific sub-parts like Thesis, Antithesis, Synthesis for Dialectic).
    5. Language: Arabic.
    6. FORMATTING: Use <title> for main titles, <subtitle> for sub-sections (e.g., طرح المشكلة, محاولة حل المشكلة, حل المشكلة), <highlight> for key philosophers and quotes. Use bullet points starting with '-' for lists if necessary, but prefer cohesive paragraphs for the essay body. DO NOT use Markdown headers (e.g., #, ##).
    7. LENGTH AND DETAIL: The essay MUST be EXTREMELY LONG and DETAILED. Expand on every argument, provide multiple examples, and include relevant quotes from philosophers. Aim for a comprehensive, full-length exam essay (1500+ words).
    `,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });
  return response.text;
}

export async function generateExam(lessonTitle: string, content: string, focusPoints: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `You are an expert Algerian Baccalaureate exam creator.
    Generate a formal exam subject (موضوع اختبار) for the lesson: "${lessonTitle}".
    
    CRITICAL INSTRUCTIONS:
    1. The exam MUST be based ONLY on the following lesson content: ${content}.
    2. The user has requested to focus specifically on these points: "${focusPoints}". Ensure these points are heavily featured in the questions.
    3. Format the exam like a real Algerian Baccalaureate exam (e.g., Part 1, Part 2, Situation Integration, etc., depending on the subject).
    4. Provide the exam questions first, followed by a clear separation, and then provide the detailed typical correction (التصحيح النموذجي) with grading scale if possible.
    5. Language: Arabic.
    6. FORMATTING: Use <title> for main titles, <subtitle> for sub-sections, <highlight> for key terms. Use bullet points starting with '-' for lists. DO NOT use Markdown headers (e.g., #, ##).
    `,
    config: {
      tools: [{ googleSearch: {} }]
    }
  });
  return response.text;
}
