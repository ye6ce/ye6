
import React, { useState, useEffect, useRef } from 'react';
import { Specialty, Subject, AIMode, Message, Lesson, Quiz, SpecialtyInfo, Unit, NavigationStep } from './types';
import { SPECIALTIES, SUBJECTS } from './constants';
import { GeminiService } from './services/geminiService';

declare global {
  interface Window {
    katex: any;
  }
}

/**
 * مكون لعرض النصوص الرياضية والمنسقة بشكل احترافي
 */
const FormattedText: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;

  let cleanText = text.replace(/<br\s*\/?>/gi, '\n');
  const lines = cleanText.split('\n');

  return (
    <div className="space-y-4 sm:space-y-6 text-right overflow-hidden">
      {lines.map((line, index) => {
        if (line.startsWith('#')) {
          const level = line.match(/^#+/)?.[0].length || 1;
          const textOnly = line.replace(/^#+\s*/, '');
          const sizeClass = level === 1 ? 'text-2xl sm:text-3xl lg:text-4xl font-black mb-6' : level === 2 ? 'text-xl sm:text-2xl lg:text-3xl font-bold mb-4' : 'text-lg sm:text-xl font-bold mb-3';
          return <h3 key={index} className={`${sizeClass} text-indigo-950 border-r-8 border-indigo-600 pr-4 sm:pr-6 mt-10 sm:mt-14 leading-tight`}>{renderMixedText(textOnly)}</h3>;
        }

        if (line.trim().startsWith('- ') || line.trim().startsWith('* ') || /^\d+\./.test(line.trim())) {
          const isOrdered = /^\d+\./.test(line.trim());
          const textOnly = isOrdered ? line.trim().replace(/^\d+\.\s*/, '') : line.trim().substring(2);
          return (
            <div key={index} className="flex items-start gap-3 sm:gap-4 pr-3 sm:pr-6 py-2">
              {isOrdered ? (
                <span className="font-black text-indigo-600 min-w-[1.5rem] text-lg">{line.trim().match(/^\d+\./)?.[0]}</span>
              ) : (
                <span className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full bg-indigo-500 mt-2.5 flex-shrink-0 shadow-sm"></span>
              )}
              <span className="flex-1 text-slate-800 text-base sm:text-lg lg:text-xl leading-relaxed">{renderMixedText(textOnly)}</span>
            </div>
          );
        }

        if (line.includes('التمرين') || line.includes('الجزء') || line.includes('قاعدة')) {
          return (
            <div key={index} className="bg-slate-100 p-5 sm:p-7 rounded-2xl border-r-8 border-slate-900 my-6 sm:my-10 shadow-md">
              <span className="text-lg sm:text-2xl font-black text-slate-900">{renderMixedText(line)}</span>
            </div>
          );
        }

        if (!line.trim()) return <div key={index} className="h-2 sm:h-4"></div>;

        return <p key={index} className="leading-relaxed text-base sm:text-lg lg:text-xl text-slate-800 font-medium">{renderMixedText(line)}</p>;
      })}
    </div>
  );
};

function renderMixedText(text: string) {
  const mathParts = text.split(/(\$.*?\$)/g);

  return mathParts.map((part, i) => {
    if (part.startsWith('$') && part.endsWith('$')) {
      const math = part.slice(1, -1);
      try {
        if (window.katex) {
          const html = window.katex.renderToString(math, { throwOnError: false, displayMode: false });
          return <span key={i} className="math-rendered mx-1 scale-110 sm:scale-125 inline-block" dangerouslySetInnerHTML={{ __html: html }} />;
        }
      } catch (e) {
        // عرض الصيغة الرياضية كنص عادي مع تلوين وتلميح عند الفشل، بدلاً من وسم <code> أو النص الخام
        console.warn("KaTeX rendering failed for:", math, e);
        return (
          <span
            key={i}
            className="math-rendered mx-1 scale-110 sm:scale-125 inline-block bg-red-50 text-red-800 rounded px-1"
            title={`فشل عرض الصيغة الرياضية. يرجى مراجعة الصيغة: ${math}`}
          >
            {math}
          </span>
        );
      }
    }

    const boldParts = part.split(/(\*\*.*?\*\*)/g);
    return boldParts.map((subPart, j) => {
      if (subPart.startsWith('**') && subPart.endsWith('**')) {
        return <strong key={`${i}-${j}`} className="font-black text-indigo-900">{subPart.slice(2, -2)}</strong>;
      }
      return subPart;
    });
  });
}

const App: React.FC = () => {
  const [step, setStep] = useState<NavigationStep>('specialty');
  const [selectedSpecialty, setSelectedSpecialty] = useState<SpecialtyInfo | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<AIMode>('fast');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [exerciseText, setExerciseText] = useState<string | null>(null);
  const [exerciseSolution, setExerciseSolution] = useState<string | null>(null);
  const [showSolution, setShowSolution] = useState(false);

  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [quizStep, setQuizStep] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [showQuizResult, setShowQuizResult] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null); // حالة جديدة لخطأ الاختبار
  const [showQuizReview, setShowQuizReview] = useState(false); // حالة جديدة لمراجعة الاختبار

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  /**
   * تصفية المنهج الدراسي بدقة حسب التخصص المختار
   */
  const filteredCurriculum = (subject: Subject): Unit[] => {
    if (!subject.curriculum || !selectedSpecialty) return [];
    const specId = selectedSpecialty.id;

    // Special filtering for Philosophy
    if (subject.id === 'philosophy') {
      if (specId === 'Lettres et Philosophie') {
        return subject.curriculum;
      } else {
        // Exclude 'ph4' (Fann wa Tasawwuf) for scientific/other branches
        return subject.curriculum.filter(unit => unit.id !== 'ph4');
      }
    }

    // Special filtering for Math
    if (subject.id === 'math') {
      if (specId === 'Mathématiques' || specId === 'Technique Mathématique') {
        return subject.curriculum;
      } else {
        // Exclude 'm6' (specific to Math/Tech Math) for others
        return subject.curriculum.filter(unit => unit.id !== 'm6');
      }
    }

    // Special filtering for French
    if (subject.id === 'french') {
        if (specId === 'Langues Étrangères') {
            return subject.curriculum;
        } else {
            // Filter out 'La nouvelle fantastique (خاص بلغات)' (frl4) for non-language specialties
            return subject.curriculum.map(unit => {
                if (unit.id === 'fr1') { // Assuming frl4 is in fr1 unit based on constants.ts
                    return {
                        ...unit,
                        lessons: unit.lessons.filter(lesson => lesson.id !== 'frl4')
                    };
                }
                return unit;
            });
        }
    }

    // For all other subjects, return the full curriculum
    return subject.curriculum;
  };

  const resetTo = (targetStep: NavigationStep) => {
    setStep(targetStep);
    if (targetStep === 'specialty') {
      setSelectedSpecialty(null);
      setSelectedSubject(null);
      setSelectedLesson(null);
      setMessages([]);
    } else if (targetStep === 'subject') {
      setSelectedSubject(null);
      setSelectedLesson(null);
      setMessages([]);
    } else if (targetStep === 'lesson') {
      setSelectedLesson(null);
      setMessages([]);
    }
    setActiveQuiz(null);
    setExerciseText(null);
    setExerciseSolution(null);
    setShowSolution(false);
    setIsSidebarOpen(false);
    setQuizError(null); // مسح خطأ الاختبار عند الرجوع
    setShowQuizReview(false); // مسح حالة مراجعة الاختبار
  };

  const handleModeSelect = async (selectedMode: AIMode) => {
    if (!selectedLesson || !selectedSubject || !selectedSpecialty) return;
    setMode(selectedMode);

    if (selectedMode === 'exercises') {
      setStep('exercises');
      generateExercises();
    } else if (selectedMode === 'quiz') {
      setStep('quiz');
      loadQuiz();
    } else {
      setStep('chat');
      setIsLoading(true);
      // تم تعزيز الموجه لتوجيه الذكاء الاصطناعي نحو استخدام صيغ LaTeX صحيحة
      const prompt = `أنت أستاذ جزائري خبير ومتميز. اشرح لي درس "${selectedLesson.title}" في مادة ${selectedSubject.name} لشعبة ${selectedSpecialty.name} بأسلوب مبسط وشيق جداً. 
      مهم جداً: استخدم تنسيق LaTeX للرموز الرياضية والفيزيائية بدقة عالية. ضع جميع الصيغ الرياضية والفيزيائية بين علامتي دولار هكذا: \`$صيغتي هنا$\`.
      أمثلة لصيغ LaTeX صحيحة للمتتاليات والدوال: \`$\\sum_{i=1}^n i$\`, \`$f'(x) = \\lim_{h \\to 0} \\frac{f(x+h)-f(x)}{h}$\`, \`$\\int_a^b f(x) dx$\`.
      تجنب الأخطاء الشائعة في كتابة LaTeX مثل استخدام "_lim" بدلاً من "\\lim".
      استخدم لغة سهلة الفهم، وقسم الشرح إلى فقرات واضحة ومنظمة. ${['spanish', 'english', 'french'].includes(selectedSubject.id) ? "أضف ترجمة للعربية لكل فقرة ومصطلح مهم." : ""}`;
      await sendMessage(prompt, selectedLesson.title);
    }
  };

  const loadQuiz = async () => {
    if (!selectedLesson || !selectedSubject || !selectedSpecialty) return;
    setIsLoading(true);
    setActiveQuiz(null);
    setShowQuizResult(false);
    setQuizStep(0);
    setUserAnswers([]);
    setQuizError(null); // مسح أي أخطاء سابقة قبل محاولة جديدة
    setShowQuizReview(false); // مسح حالة مراجعة الاختبار

    try {
      const quiz = await GeminiService.generateQuiz(selectedLesson.title, selectedSubject.name, selectedSpecialty.name);
      if (quiz && quiz.questions && quiz.questions.length > 0) {
        setActiveQuiz(quiz);
      } else {
        setQuizError("عذراً، لم نتمكن من توليد اختبار صالح. قد تكون المشكلة في النموذج أو اتصالك بالإنترنت. حاول مرة أخرى.");
      }
    } catch (e: any) {
      console.error("Error generating quiz:", e);
      setQuizError("عذراً، حدث خطأ أثناء توليد الاختبار. يرجى التأكد من اتصالك بالإنترنت والمحاولة مجدداً.");
    } finally {
      setIsLoading(false);
    }
  };

  const generateExercises = async () => {
    if (!selectedLesson || !selectedSubject || !selectedSpecialty) return;
    setIsLoading(true);
    setExerciseText(null);
    setExerciseSolution(null);
    setShowSolution(false);
    try {
      const text = await GeminiService.generateExercisesText(selectedLesson.title, selectedSubject.name, selectedSpecialty.name);
      setExerciseText(text);

      const solPrompt = `أنت أستاذ مصحح متمكن في البكالوريا الجزائرية. قدم الحل النموذجي المفصل والمنهجي لموضوع التمارين التالي حول درس "${selectedLesson.title}". 
      استخدم LaTeX للرياضيات $...$: \n\n${text}`;
      const solResponse = await GeminiService.generateResponse('fast', solPrompt); // استخدام نموذج fast هنا أيضاً
      setExerciseSolution(solResponse.text || "عذراً، تعذر توليد الحل.");
    } catch (error: any) {
      console.error(error);
      // تم إزالة رسالة الخطأ هذه من سجل المحادثات حيث يتم التعامل مع الأخطاء بشكل أفضل في واجهة المستخدم
      /* setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: "عذراً، حدث خطأ في توليد التمارين أو حلها. حاول مرة أخرى.",
        mode: 'exercises',
        timestamp: Date.now()
      }]); */
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (overrideInput?: string, lessonContext?: string) => {
    const textToSend = overrideInput || input;
    if (!textToSend) return;
    if (!selectedLesson || !selectedSubject || !selectedSpecialty) return; // Ensure context is available

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      mode: mode,
      timestamp: Date.now(),
    };

    if (!overrideInput) {
      setMessages(prev => [...prev, userMsg]);
      setInput('');
    }
    
    setIsLoading(true);

    try {
      const response = await GeminiService.generateResponse(mode, textToSend);
      
      let imageUrl = undefined;
      let textContent = response.text || "";

      // Iterate through parts to find the image part as per Gemini API guidelines
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          }
          // Only update textContent if it's currently empty, or if this part's text is substantial
          // to ensure image parts are handled without overriding text content unnecessarily.
          else if (part.text && textContent === "") {
            textContent = part.text;
          }
        }
      }

      const suggestions = await GeminiService.generateSuggestions(textContent, lessonContext || selectedLesson.title);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: textContent,
        mode: mode,
        timestamp: Date.now(),
        suggestions: suggestions
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (error: any) {
      console.error("Error sending message to GeminiService:", error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: "عذراً، حدث خطأ في النظام. حاول مجدداً.",
        mode: mode,
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'specialty') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 sm:p-10 bg-[#0a0a0c] text-white relative overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-indigo-600/15 blur-[180px] rounded-full"></div>
        <div className="text-center mb-12 sm:mb-20 z-10 animate-in fade-in slide-in-from-top-12 duration-1000 px-4">
          <h1 className="text-5xl sm:text-7xl lg:text-9xl font-black mb-6 tracking-tighter drop-shadow-2xl">BacDz AI 🇩🇿</h1>
          <p className="text-lg sm:text-2xl lg:text-3xl font-medium text-slate-400 max-w-3xl mx-auto leading-relaxed">بوابتك الذكية والاحترافية للتفوق والنجاح في البكالوريا</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10 max-w-7xl w-full z-10 px-4">
          {SPECIALTIES.map((spec) => (
            <button key={spec.id} onClick={() => { setSelectedSpecialty(spec); setStep('subject'); }} 
              className={`group relative overflow-hidden bg-white/5 backdrop-blur-2xl p-8 sm:p-14 rounded-[3rem] border border-white/10 hover:border-white/40 transition-all hover:scale-[1.04] shadow-2xl flex flex-col items-center gap-6 sm:gap-10 text-center active:scale-95`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${spec.color} opacity-0 group-hover:opacity-15 transition-opacity duration-500`}></div>
              <div className="w-20 h-20 sm:w-28 sm:h-28 lg:w-32 lg:h-32 bg-white/5 rounded-[2rem] sm:rounded-[3rem] flex items-center justify-center text-5xl sm:text-7xl lg:text-8xl group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-xl">{spec.icon}</div>
              <div className="flex flex-col gap-2">
                <span className="text-2xl sm:text-3xl lg:text-4xl font-black">{spec.name}</span>
                <span className="text-xs sm:text-sm font-black opacity-30 uppercase tracking-[0.3em] text-indigo-400">Bachelor Specialty</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === 'subject') {
    return (
      <div className="min-h-screen bg-slate-50 p-6 sm:p-12 lg:p-16 flex flex-col items-center">
        <div className="max-w-6xl w-full flex flex-col sm:flex-row justify-between items-center mb-12 sm:mb-20 gap-8">
          <button onClick={() => setStep('specialty')} className="w-full sm:w-auto bg-white px-8 py-4 rounded-2xl shadow-lg border border-slate-200 text-indigo-700 font-black hover:bg-slate-100 transition-all flex items-center justify-center gap-3 active:scale-95 text-lg">
            <span className="text-2xl">⏎</span> العودة للشعب
          </button>
          <div className="text-center sm:text-right">
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 leading-tight">اختر المادة الدراسية</h2>
            <div className="flex items-center justify-center sm:justify-end gap-3 mt-3">
              <span className="text-slate-500 font-black uppercase tracking-widest text-xs sm:text-base">{selectedSpecialty?.name}</span>
              <span className="text-2xl sm:text-4xl">{selectedSpecialty?.icon}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-10 max-w-7xl w-full pb-16 px-4">
          {SUBJECTS.filter(s => s.specialties.includes(selectedSpecialty!.id)).map(s => (
            <button key={s.id} onClick={() => { setSelectedSubject(s); setStep('lesson'); }} 
              className="bg-white p-8 sm:p-12 lg:p-14 rounded-[3rem] shadow-xl hover:shadow-2xl transition-all hover:-translate-y-2 flex flex-col items-center gap-5 sm:gap-8 group border border-slate-100 active:scale-95"
            >
              <span className="text-6xl sm:text-8xl lg:text-9xl group-hover:scale-110 transition-transform duration-500 drop-shadow-md">{s.icon}</span>
              <span className="text-lg sm:text-2xl lg:text-3xl font-black text-slate-900 text-center leading-tight">{s.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === 'lesson') {
    return (
      <div className="min-h-screen bg-slate-50 p-6 sm:p-12 lg:p-16 flex flex-col items-center">
        <div className="max-w-5xl w-full flex flex-col sm:flex-row justify-between items-center mb-12 sm:mb-20 gap-8">
          <button onClick={() => setStep('subject')} className="w-full sm:w-auto bg-white px-8 py-4 rounded-2xl shadow-lg border border-slate-200 text-indigo-700 font-black hover:bg-slate-100 transition-all flex items-center justify-center gap-3 active:scale-95 text-lg">
            <span className="text-2xl">⏎</span> العودة للمواد
          </button>
          <div className="flex items-center gap-4">
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900">{selectedSubject?.name}</h2>
            <span className="text-5xl">{selectedSubject?.icon}</span>
          </div>
        </div>
        <div className="max-w-5xl w-full space-y-8 sm:space-y-12 pb-20 px-4">
          {selectedSubject && filteredCurriculum(selectedSubject).map(unit => (
            <div key={unit.id} className="bg-white rounded-[3rem] shadow-lg border border-slate-200 overflow-hidden">
              <div className="bg-indigo-50/70 p-6 sm:p-10 font-black text-indigo-700 text-right text-lg sm:text-2xl border-b-2 border-indigo-100/50 flex items-center gap-3">
                <span className="opacity-40 text-3xl">#</span>
                {unit.title}
              </div>
              <div className="p-4 sm:p-8 grid grid-cols-1 gap-3 sm:gap-5">
                {unit.lessons.map(l => (
                  <button key={l.id} onClick={() => { setSelectedLesson(l); setStep('mode'); }} 
                    className="w-full p-6 sm:p-10 text-right font-black text-slate-800 hover:bg-slate-50 border-2 border-transparent hover:border-indigo-100 rounded-[2rem] transition-all flex items-center justify-between group active:scale-[0.98]"
                  >
                    <span className="text-indigo-600 opacity-0 group-hover:opacity-100 group-hover:translate-x-[-10px] transition-all text-sm sm:text-lg font-black hidden sm:inline-flex items-center gap-2">عرض تفاصيل الدرس <span className="text-2xl">←</span></span>
                    <span className="text-xl sm:text-3xl lg:text-4xl">{l.title}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (step === 'mode') {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex flex-col p-6 sm:p-10 text-white text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[70%] h-[70%] bg-indigo-600/15 blur-[200px] rounded-full pointer-events-none"></div>
        <div className="w-full max-w-7xl mx-auto flex justify-end mb-10 sm:mb-16 relative z-20">
          <button 
            onClick={() => setStep('lesson')} 
            className="w-full sm:w-auto bg-white/5 border-2 border-white/10 px-10 py-4 rounded-2xl hover:bg-white/10 transition-all font-black flex items-center justify-center gap-3 active:scale-95 text-lg"
          >
            <span className="text-2xl">⏎</span> رجوع لقائمة الدروس
          </button>
        </div>
        <div className="z-10 animate-in slide-in-from-bottom-12 duration-700 w-full max-w-7xl mx-auto flex-1 flex flex-col justify-center">
          <h2 className="text-4xl sm:text-7xl lg:text-8xl font-black mb-8 sm:mb-12 leading-tight px-4 drop-shadow-2xl">
            {selectedLesson?.title}
          </h2>
          <p className="text-xl sm:text-3xl lg:text-4xl text-slate-400 font-bold mb-14 sm:mb-24 px-6 leading-relaxed">
            اختر أسلوب المراجعة المفضل لديك الآن
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12 lg:gap-16 px-4 pb-20">
            {[
              { id: 'fast', label: 'شرح مفصل', icon: '📚', desc: 'تبسيط شامل للمفاهيم', color: 'from-blue-600 to-indigo-700' },
              { id: 'quiz', label: 'اختبار ذكي', icon: '🎯', desc: 'تحدي العشر أسئلة', color: 'from-purple-600 to-pink-700' },
              { id: 'exercises', label: 'تمارين مقترحة', icon: '📝', desc: 'وفق المنهجية الرسمية', color: 'from-emerald-600 to-teal-700' }
            ].map(m => (
              <button key={m.id} onClick={() => handleModeSelect(m.id as AIMode)} 
                className="group relative bg-white/5 border-2 border-white/10 p-10 sm:p-16 lg:p-24 rounded-[4rem] hover:bg-white/10 transition-all hover:scale-[1.05] flex flex-col items-center gap-6 sm:gap-10 shadow-2xl overflow-hidden active:scale-95"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${m.color} opacity-0 group-hover:opacity-20 transition-opacity duration-500`}></div>
                <span className="text-7xl sm:text-9xl lg:text-[10rem] group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 drop-shadow-2xl">{m.icon}</span>
                <div className="flex flex-col gap-2 sm:gap-4 relative z-10">
                  <div className="text-2xl sm:text-4xl lg:text-5xl font-black">{m.label}</div>
                  <p className="text-xs sm:text-base lg:text-xl text-indigo-300 font-black uppercase tracking-widest">{m.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 font-['Tajawal'] relative">
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-md"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`fixed md:relative inset-y-0 right-0 z-50 w-72 sm:w-80 lg:w-96 bg-white border-l-2 border-slate-200 flex flex-col shadow-2xl transition-transform duration-500 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
        <div className="p-8 sm:p-12 bg-indigo-950 text-white flex flex-col gap-6">
           <div className="flex items-center justify-between">
              <h2 className="text-2xl sm:text-3xl font-black leading-tight truncate ml-3">{selectedSubject?.name}</h2>
              <span className="text-4xl sm:text-5xl flex-shrink-0">{selectedSubject?.icon}</span>
           </div>
           <p className="text-[10px] sm:text-xs font-black opacity-50 uppercase tracking-[0.3em] leading-relaxed">{selectedLesson?.title}</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
           <button onClick={() => resetTo('specialty')} className="w-full text-right p-6 rounded-2xl bg-slate-50 hover:bg-indigo-50 transition-all font-black text-sm sm:text-lg flex items-center justify-between group active:scale-95 border border-slate-100">
              <span className="text-2xl">🎓</span>
              <span>تغيير الشعبة</span>
           </button>
           <button onClick={() => resetTo('subject')} className="w-full text-right p-6 rounded-2xl bg-slate-50 hover:bg-indigo-50 transition-all font-black text-sm sm:text-lg flex items-center justify-between group active:scale-95 border border-slate-100">
              <span className="text-2xl">📐</span>
              <span>تغيير المادة</span>
           </button>
           <button onClick={() => setStep('mode')} className="w-full text-right p-6 rounded-2xl bg-indigo-50 hover:bg-indigo-100 transition-all font-black text-sm sm:text-lg flex items-center justify-between group active:scale-95 border border-indigo-100">
              <span className="text-2xl">⚙️</span>
              <span>تغيير النمط</span>
           </button>
        </div>
        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
           <div className="text-[10px] text-slate-400 font-black text-center uppercase tracking-[0.4em]">BacDz AI Professional 🇩🇿</div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full bg-[#fcfcfc] overflow-hidden relative">
         <header className="h-16 sm:h-20 bg-white border-b-2 border-slate-200 flex items-center justify-between px-4 sm:px-12 shadow-md shrink-0 z-30">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden p-2.5 bg-slate-100 rounded-xl active:scale-90 transition-all border border-slate-200">
              <svg className="w-6 h-6 text-indigo-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M4 6h16M4 12h16m-7 6h7" /></svg>
            </button>
            <h1 className="font-black text-base sm:text-2xl text-slate-900 text-center flex-1 sm:flex-none truncate px-4 leading-tight">{selectedLesson?.title}</h1>
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-indigo-700 flex items-center justify-center shadow-xl text-white font-black text-xs sm:text-base shrink-0">BDz</div>
         </header>

         {step === 'exercises' ? (
           <div className="flex-1 overflow-y-auto p-4 sm:p-10 lg:p-16 bg-slate-200 bg-[url('https://www.transparenttextures.com/patterns/notebook.png')]">
              <div className="max-w-5xl mx-auto w-full pb-10">
                {isLoading && !exerciseText ? (
                  <div className="bg-white rounded-[3rem] p-20 text-center shadow-2xl animate-pulse">
                     <div className="w-20 h-20 border-8 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-10"></div>
                     <h2 className="text-3xl font-black text-slate-800">جاري صياغة موضوع احترافي...</h2>
                  </div>
                ) : (
                  <div className="bg-white rounded-[2rem] sm:rounded-[4rem] shadow-2xl p-8 sm:p-16 lg:p-24 border-2 border-slate-300 relative">
                     <div className="text-center mb-12 pb-10 border-b-8 border-slate-900">
                        <p className="text-lg sm:text-2xl font-black mb-2">الجمهورية الجزائرية الديمقراطية الشعبية</p>
                        <p className="text-lg sm:text-2xl font-black mb-8 text-indigo-700">امتحان البكالوريا التجريبي المقترح</p>
                        <div className="flex flex-col sm:flex-row justify-between items-center text-lg sm:text-2xl font-black gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-200">
                          <span>المادة: {selectedSubject?.name}</span>
                          <span>الشعبة: {selectedSpecialty?.name}</span>
                        </div>
                     </div>
                     {exerciseText && <FormattedText text={exerciseText} />}
                     <div className="mt-20 pt-16 border-t-4 border-dashed border-slate-300 flex flex-col gap-10">
                        <div className="flex flex-col sm:flex-row gap-6">
                           <button onClick={() => generateExercises()} className="flex-1 py-6 bg-slate-100 rounded-3xl font-black text-xl hover:bg-slate-200 transition-all border-2 border-slate-300 active:scale-95 shadow-lg">توليد موضوع جديد 🔄</button>
                           <button onClick={() => setShowSolution(!showSolution)} className={`flex-[2] py-6 rounded-3xl font-black text-2xl lg:text-3xl transition-all shadow-2xl active:scale-95 ${showSolution ? 'bg-slate-900 text-white' : 'bg-indigo-700 text-white hover:bg-indigo-800'}`}>
                             {showSolution ? 'إخفاء الحل 🙈' : 'كشف التصحيح النموذجي 💡'}
                           </button>
                        </div>
                        {showSolution && exerciseSolution && (
                          <div className="bg-indigo-50/70 p-10 sm:p-16 rounded-[3rem] border-4 border-indigo-200 shadow-inner animate-in slide-in-from-top-10 duration-700">
                             <h4 className="text-2xl sm:text-4xl font-black text-indigo-900 mb-10 pb-6 border-b-4 border-indigo-200 flex items-center gap-4"><span>✨</span> التصحيح المنهجي والحل المفصل</h4>
                             <FormattedText text={exerciseSolution} />
                          </div>
                        )}
                     </div>
                  </div>
                )}
              </div>
           </div>
         ) : step === 'quiz' ? (
           <div className="flex-1 overflow-y-auto p-4 sm:p-10 lg:p-16 bg-[#0a0a0c]">
             <div className="max-w-4xl mx-auto w-full pb-10">
               {isLoading ? (
                 <div className="text-center py-40">
                    <div className="text-9xl mb-12 animate-bounce">🎯</div>
                    <h2 className="text-4xl font-black text-white">نجهز لك 10 أسئلة دقيقة...</h2>
                 </div>
               ) : activeQuiz && !showQuizResult && !showQuizReview ? (
                 <div className="bg-white text-slate-900 rounded-[4rem] p-10 sm:p-20 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 h-4 bg-indigo-600 transition-all duration-700" style={{ width: `${((quizStep + 1) / activeQuiz.questions.length) * 100}%` }}></div>
                    <div className="mb-12"><span className="bg-indigo-100 text-indigo-700 px-8 py-3 rounded-full text-lg font-black uppercase">سؤال {quizStep + 1} / {activeQuiz.questions.length}</span></div>
                    <h3 className="text-2xl sm:text-4xl lg:text-5xl font-black mb-16 text-right leading-snug">{activeQuiz.questions[quizStep].question}</h3>
                    <div className="grid grid-cols-1 gap-6">
                       {activeQuiz.questions[quizStep].options.map((opt, idx) => (
                         <button key={idx} onClick={() => {
                           const newAnswers = [...userAnswers]; newAnswers[quizStep] = idx; setUserAnswers(newAnswers);
                           if (quizStep < activeQuiz.questions.length - 1) setQuizStep(quizStep + 1); else setShowQuizResult(true);
                         }} className="p-8 sm:p-10 rounded-[2.5rem] text-right font-black text-xl sm:text-3xl bg-slate-50 hover:bg-indigo-700 hover:text-white transition-all flex items-center justify-between group border-2 border-slate-100 active:scale-95 shadow-sm">
                            <span className="w-14 h-14 rounded-2xl border-4 border-slate-200 flex items-center justify-center text-xl group-hover:border-white">{String.fromCharCode(65 + idx)}</span>
                            <span className="flex-1 mr-8">{opt}</span>
                         </button>
                       ))}
                    </div>
                 </div>
               ) : quizError && !isLoading ? ( // عرض رسالة الخطأ المخصصة للاختبار
                 <div className="bg-white text-slate-900 rounded-[4rem] p-10 sm:p-20 text-center shadow-2xl animate-in zoom-in duration-700">
                    <div className="text-8xl mb-6">⚠️</div>
                    <h2 className="text-3xl sm:text-5xl font-black mb-10 text-red-700">حدث خطأ في الاختبار</h2>
                    <p className="text-lg sm:text-xl font-medium text-slate-700 mb-12">{quizError}</p>
                    <div className="flex flex-col sm:flex-row gap-6 justify-center">
                       <button onClick={loadQuiz} className="bg-slate-100 text-indigo-700 px-12 py-6 rounded-3xl font-black text-2xl active:scale-95 shadow-lg">إعادة المحاولة 🔄</button>
                       <button onClick={() => setStep('mode')} className="bg-indigo-700 text-white px-12 py-6 rounded-3xl font-black text-2xl active:scale-95 shadow-xl">العودة للدرس</button>
                    </div>
                 </div>
               ) : showQuizResult && activeQuiz && !showQuizReview ? ( // شاشة عرض النتيجة الإجمالية
                 <div className="bg-white text-slate-900 rounded-[4rem] p-10 sm:p-20 text-center shadow-2xl animate-in zoom-in duration-700">
                    <div className="text-8xl mb-6">🏆</div>
                    <h2 className="text-3xl sm:text-5xl font-black mb-10 text-indigo-900">نتيجتك النهائية</h2>
                    <div className="text-7xl sm:text-9xl font-black text-indigo-700 mb-16" dir="ltr">
                       {userAnswers.filter((ans, i) => ans === activeQuiz.questions[i].correctAnswerIndex).length} / {activeQuiz.questions.length}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-6 justify-center">
                       <button onClick={() => setShowQuizReview(true)} className="bg-indigo-600 text-white px-12 py-6 rounded-3xl font-black text-2xl active:scale-95 shadow-xl hover:bg-indigo-700 transition-colors">مراجعة الإجابات 📝</button>
                       <button onClick={loadQuiz} className="bg-slate-100 text-indigo-700 px-12 py-6 rounded-3xl font-black text-2xl active:scale-95 shadow-lg">إعادة الاختبار 🔄</button>
                       <button onClick={() => setStep('mode')} className="bg-transparent border-2 border-slate-300 text-slate-700 px-12 py-6 rounded-3xl font-black text-2xl active:scale-95 shadow-lg hover:bg-slate-100 transition-colors">العودة للدرس</button>
                    </div>
                 </div>
               ) : showQuizReview && activeQuiz ? ( // شاشة مراجعة الإجابات
                 <div className="bg-white text-slate-900 rounded-[4rem] p-10 sm:p-20 shadow-2xl animate-in slide-in-from-bottom-10 duration-700 overflow-y-auto">
                   <h2 className="text-3xl sm:text-5xl font-black mb-12 text-indigo-900 text-center">مراجعة إجاباتك</h2>
                   {activeQuiz.questions.map((q, qIdx) => {
                     const userAnswerIndex = userAnswers[qIdx];
                     const isCorrect = userAnswerIndex === q.correctAnswerIndex;
                     return (
                       <div key={qIdx} className="mb-12 p-8 sm:p-10 border-b-4 border-slate-100 last:border-b-0">
                         <h4 className="text-xl sm:text-3xl font-black mb-6 text-right leading-snug">
                           <span className="bg-indigo-50 text-indigo-700 px-4 py-1 rounded-full text-base sm:text-xl font-bold ml-4">سؤال {qIdx + 1}</span>
                           {q.question}
                         </h4>
                         <div className="grid grid-cols-1 gap-4 mb-6">
                           {q.options.map((opt, optIdx) => (
                             <div
                               key={optIdx}
                               className={`p-6 rounded-2xl text-right font-black text-lg sm:text-xl flex items-center justify-between group
                                 ${optIdx === q.correctAnswerIndex ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-300' : ''}
                                 ${optIdx === userAnswerIndex && !isCorrect ? 'bg-red-100 text-red-800 border-2 border-red-300' : ''}
                                 ${optIdx === userAnswerIndex && isCorrect ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-300' : ''}
                                 ${optIdx !== q.correctAnswerIndex && optIdx !== userAnswerIndex ? 'bg-slate-50 text-slate-800 border-2 border-slate-100' : ''}
                               `}
                             >
                               <span className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg sm:text-xl font-bold
                                 ${optIdx === q.correctAnswerIndex ? 'bg-emerald-500 text-white' : ''}
                                 ${optIdx === userAnswerIndex && !isCorrect ? 'bg-red-500 text-white' : ''}
                                 ${optIdx !== q.correctAnswerIndex && optIdx !== userAnswerIndex ? 'bg-slate-200 text-slate-700' : ''}
                               `}>{String.fromCharCode(65 + optIdx)}</span>
                               <span className="flex-1 mr-8">{opt}</span>
                             </div>
                           ))}
                         </div>
                         <div className="bg-indigo-50 p-6 sm:p-8 rounded-2xl border-2 border-indigo-200 text-right text-base sm:text-lg text-indigo-900 leading-relaxed shadow-inner">
                           <h5 className="font-black text-xl sm:text-2xl mb-4 text-indigo-800">الشرح:</h5>
                           <FormattedText text={q.explanation} />
                         </div>
                       </div>
                     );
                   })}
                   <div className="mt-16 flex flex-col sm:flex-row gap-6 justify-center">
                       <button onClick={loadQuiz} className="bg-indigo-600 text-white px-12 py-6 rounded-3xl font-black text-2xl active:scale-95 shadow-xl hover:bg-indigo-700 transition-colors">إعادة الاختبار 🔄</button>
                       <button onClick={() => setStep('mode')} className="bg-transparent border-2 border-slate-300 text-slate-700 px-12 py-6 rounded-3xl font-black text-2xl active:scale-95 shadow-lg hover:bg-slate-100 transition-colors">العودة للدرس</button>
                   </div>
                 </div>
               ) : null}
             </div>
           </div>
         ) : (
           <>
            <div className="flex-1 overflow-y-auto p-4 sm:p-10 lg:p-16 space-y-12 sm:space-y-16 custom-scrollbar bg-fixed bg-[url('https://www.transparenttextures.com/patterns/graphy.png')]">
                {messages.length === 0 && !isLoading && (
                  <div className="flex flex-col items-center justify-center h-full text-slate-300 opacity-50 pb-20">
                    <span className="text-8xl sm:text-[10rem] mb-12 animate-bounce">📘</span>
                    <p className="text-2xl sm:text-4xl font-black text-center px-10 max-w-4xl leading-relaxed text-indigo-900/40">مرحباً بك! أنا أستاذك الذكي. اطرح أي سؤال حول الدرس وسأشرحه لك بدقة عالية.</p>
                  </div>
                )}
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-start' : 'items-end'}`}>
                    <div className={`max-w-[98%] sm:max-w-[90%] lg:max-w-[85%] rounded-[3rem] p-6 sm:p-10 lg:p-12 shadow-2xl relative animate-in fade-in slide-in-from-bottom-5 duration-700 ${msg.role === 'user' ? 'bg-indigo-700 text-white rounded-tr-none border-b-8 border-indigo-900' : 'bg-white border-2 border-slate-100 rounded-tl-none text-slate-900 shadow-indigo-100'}`}>
                      {msg.role === 'assistant' ? <FormattedText text={msg.content} /> : <div className="text-xl sm:text-3xl lg:text-4xl font-black leading-snug">{msg.content}</div>}
                      <div className={`mt-6 text-xs font-black opacity-30 uppercase tracking-[0.3em] ${msg.role === 'user' ? 'text-left' : 'text-right'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    {msg.suggestions && !isLoading && (
                      <div className="mt-6 flex flex-wrap justify-end gap-3 max-w-[90%]">
                        {msg.suggestions.map((s, idx) => (
                          <button key={idx} onClick={() => sendMessage(s)} className="bg-white hover:bg-indigo-700 hover:text-white text-indigo-700 px-6 py-3 rounded-full text-sm sm:text-lg font-black border-2 border-indigo-100 transition-all shadow-xl active:scale-95">{s}</button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-end animate-pulse">
                    <div className="bg-white p-5 sm:p-8 rounded-[2.5rem] rounded-tl-none shadow-xl flex items-center gap-6 border-2 border-slate-100">
                      <div className="flex gap-2">
                        <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce"></div>
                        <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      </div>
                      <span className="text-xs sm:text-base font-black text-slate-400 uppercase tracking-widest">جاري التفكير بعمق...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
            </div>

            <div className="p-4 sm:p-10 bg-white border-t-4 border-slate-100 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] z-20">
                <div className="max-w-6xl mx-auto flex items-center gap-3 sm:gap-6 bg-slate-100 p-2 sm:p-4 rounded-[2rem] sm:rounded-[3.5rem] shadow-inner border-4 border-transparent focus-within:border-indigo-600/30 transition-all group">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="اطلب شرحاً مفصلاً أو اطرح سؤالاً..."
                    className="flex-1 bg-transparent border-none focus:ring-0 text-lg sm:text-2xl lg:text-3xl font-black resize-none py-3 sm:py-6 px-4 sm:px-10 max-h-32 sm:max-h-52 text-right custom-scrollbar placeholder:text-slate-300 placeholder:font-bold"
                    style={{ direction: 'rtl' }}
                  />
                  <button 
                    onClick={() => sendMessage()} 
                    disabled={isLoading || !input.trim()} 
                    className={`p-5 sm:p-9 lg:p-10 rounded-[1.8rem] sm:rounded-[3rem] transition-all transform active:scale-90 shadow-2xl flex-shrink-0 ${isLoading || !input.trim() ? 'bg-slate-300 text-slate-500' : 'bg-indigo-700 text-white hover:bg-indigo-800'}`}
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 sm:h-10 sm:w-10 transform rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  </button>
                </div>
            </div>
           </>
         )}
      </main>
    </div>
  );
};

export default App;