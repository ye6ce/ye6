
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
 * مكون الشعار المتجه (Vector Logo)
 */
const VectorLogo: React.FC<{ className?: string }> = ({ className }) => (
  <>
    <style>{`
      @keyframes twinkle {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.2; transform: scale(0.85); }
      }
    `}</style>
    <svg viewBox="0 0 400 400" className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <ellipse cx="200" cy="310" rx="70" ry="8" fill="rgba(255,255,255,0.15)" filter="url(#glow)" />
      <path 
        d="M200,120 C155,120 120,155 120,205 C120,255 155,290 200,290 C228,290 250,272 260,250 L285,285 L305,265 L275,235 C278,225 280,215 280,205 C280,155 245,120 200,120 Z M200,255 C172,255 155,232 155,205 C155,178 172,155 200,155 C228,155 245,178 245,205 C245,232 228,255 200,255 Z" 
        fill="white" 
        filter="url(#glow)"
      />
      <g transform="translate(190, 95) rotate(-5)">
        <path d="M-55,0 L0,-28 L55,0 L0,28 Z" fill="white" />
        <path d="M-28,15 L-28,28 Q0,38 28,28 L28,15" fill="none" stroke="white" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M-55,0 L-60,25" stroke="white" strokeWidth="2.5" />
        <circle cx="-60" cy="28" r="3.5" fill="white" />
        <path d="M-64,28 L-60,42 L-56,28 Z" fill="white" />
      </g>
      <g transform="translate(270, 210)">
        <path d="M0,0 L25,-5 L45,-30" fill="none" stroke="white" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="45" cy="-30" r="9" fill="white" />
        <line x1="45" y1="-30" x2="75" y2="-70" stroke="white" strokeWidth="3.5" strokeLinecap="round" />
      </g>
      <g transform="translate(290, 75)" style={{ animation: 'twinkle 1.5s infinite ease-in-out' }}>
         <path d="M0,-25 L5,-5 L25,0 L5,5 L0,25 L-5,5 L-25,0 L-5,-5 Z" fill="white" filter="url(#glow)" />
         <circle cx="0" cy="0" r="3" fill="white" />
      </g>
    </svg>
  </>
);

const Logo: React.FC = () => (
  <div className="flex flex-col items-center mb-12 animate-in fade-in zoom-in duration-1000">
    <div className="relative w-72 h-72 sm:w-96 sm:h-96 flex items-center justify-center group">
      <div className="absolute w-2/3 h-2/3 bg-white/5 blur-[80px] rounded-full animate-pulse"></div>
      <VectorLogo className="w-full h-full drop-shadow-[0_0_35px_rgba(255,255,255,0.6)] z-10" />
    </div>
  </div>
);

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
          const sizeClass = 
            level === 1 ? 'text-2xl sm:text-3xl lg:text-4xl font-black mb-6 text-white text-glow' : 
            level === 2 ? 'text-xl sm:text-2xl lg:text-3xl font-bold mb-4 text-white text-glow' : 
            'text-lg sm:text-xl font-bold mb-3 text-white text-glow';
          return <h3 key={index} className={`${sizeClass} border-r-4 border-white pr-4 sm:pr-6 mt-10 sm:mt-14 leading-tight`}>{renderMixedText(textOnly)}</h3>;
        }

        if (line.trim().startsWith('- ') || line.trim().startsWith('* ') || /^\d+\./.test(line.trim())) {
          const isOrdered = /^\d+\./.test(line.trim());
          const textOnly = isOrdered ? line.trim().replace(/^\d+\.\s*/, '') : line.trim().substring(2);
          return (
            <div key={index} className="flex items-start gap-3 sm:gap-4 pr-3 sm:pr-6 py-2">
              {isOrdered ? (
                <span className="font-black text-white min-w-[1.5rem] text-lg text-glow">{line.trim().match(/^\d+\./)?.[0]}</span>
              ) : (
                <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-white mt-3 flex-shrink-0 shadow-[0_0_10px_white]"></span>
              )}
              <span className="flex-1 text-slate-300 text-base sm:text-lg lg:text-xl leading-relaxed">{renderMixedText(textOnly)}</span>
            </div>
          );
        }

        if (line.includes('التمرين') || line.includes('الجزء') || line.includes('قاعدة')) {
          return (
            <div key={index} className="bg-white/5 p-5 sm:p-7 rounded-2xl border border-white/10 border-r-4 border-r-white my-6 sm:my-10 shadow-lg backdrop-blur-sm">
              <span className="text-lg sm:text-2xl font-black text-white text-glow">{renderMixedText(line)}</span>
            </div>
          );
        }

        if (!line.trim()) return <div key={index} className="h-2 sm:h-4"></div>;

        return <p key={index} className="leading-relaxed text-base sm:text-lg lg:text-xl text-slate-300 font-medium">{renderMixedText(line)}</p>;
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
          return <span key={i} className="math-rendered mx-1 scale-110 sm:scale-125 inline-block text-white font-bold" dangerouslySetInnerHTML={{ __html: html }} />;
        }
      } catch (e) {
        return (
          <span key={i} className="math-rendered mx-1 scale-110 sm:scale-125 inline-block bg-red-900/50 text-red-200 rounded px-1">
            {math}
          </span>
        );
      }
    }

    const boldParts = part.split(/(\*\*.*?\*\*)/g);
    return boldParts.map((subPart, j) => {
      if (subPart.startsWith('**') && subPart.endsWith('**')) {
        return <strong key={`${i}-${j}`} className="font-black text-white text-glow">{subPart.slice(2, -2)}</strong>;
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
  const [quizError, setQuizError] = useState<string | null>(null);
  const [showQuizReview, setShowQuizReview] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const filteredCurriculum = (subject: Subject): Unit[] => {
    if (!subject.curriculum || !selectedSpecialty) return [];
    const specId = selectedSpecialty.id;
    const isSci = ['Sciences Expérimentales', 'Mathématiques', 'Technique Mathématique'].includes(specId);
    const isLit = ['Lettres et Philosophie', 'Langues Étrangères'].includes(specId);
    const isGestion = specId === 'Gestion et Économie';
    const isMathTech = ['Mathématiques', 'Technique Mathématique'].includes(specId);
    const isLang = specId === 'Langues Étrangères';

    if (subject.id === 'math') {
        return subject.curriculum.filter(unit => {
            if (unit.id.startsWith('m_adab_')) return isLit;
            if (unit.id.startsWith('m_gest_')) return isGestion;
            if (unit.id.startsWith('m_sci_')) return isSci;
            if (unit.id === 'm_math_arith') return isMathTech;
            return false;
        }).map(unit => {
            if (unit.id === 'm_sci_3') {
                 return { ...unit, lessons: unit.lessons.filter(l => l.id !== 'm_sci_l11' || isMathTech) };
            }
            return unit;
        });
    }

    if (subject.id === 'philosophy') {
        return subject.curriculum.filter(unit => {
             if (unit.id.startsWith('ph_lit_')) return specId === 'Lettres et Philosophie';
             if (unit.id === 'ph_sci') return isSci || isGestion;
             if (unit.id === 'ph_lang') return isLang;
             return false;
        });
    }

    if (subject.id === 'arabic') {
        return subject.curriculum.map(unit => {
            const lessons = unit.lessons.filter(l => {
                if (l.id.includes('_lit') && !isLit) return false;
                if (l.id.includes('_sci') && !isSci) return false;
                return true;
            });
            return { ...unit, lessons };
        }).filter(u => u.lessons.length > 0);
    }

    if (subject.id === 'french') {
        return subject.curriculum.filter(unit => {
            if (unit.id === 'fr_fantasy') return isLang;
            return true;
        });
    }

    if (subject.id === 'english') {
        return subject.curriculum.filter(unit => {
             if (unit.id === 'en_civ' || unit.id === 'en_edu' || unit.id === 'en_feelings') return isLit || isLang;
             if (unit.id === 'en_safety' || unit.id === 'en_astronomy') return isSci || isGestion;
             if (unit.id === 'en_ethics') return true; 
             return false;
        });
    }

    if (subject.id === 'science') {
         return subject.curriculum.filter(unit => {
             if (specId === 'Mathématiques') return unit.id === 's_protein';
             return true;
         });
    }

    if (subject.id === 'physics') {
         return subject.curriculum.filter(unit => {
             if (unit.id.includes('_vib') && specId === 'Sciences Expérimentales') return false;
             if (unit.id.includes('_waves') && specId === 'Sciences Expérimentales') return false;
             return true;
         });
    }

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
    setQuizError(null);
    setShowQuizReview(false);
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

      const isScientific = ['math', 'physics', 'science', 'tech_civil', 'tech_electrical', 'tech_mechanical', 'tech_process', 'accounting', 'economics'].includes(selectedSubject.id);
      
      const mathInstruction = isScientific 
        ? "مهم جداً: استخدم تنسيق LaTeX للرموز الرياضية والفيزيائية بدقة عالية. ضع جميع الصيغ بين علامتي دولار هكذا: `$صيغتي هنا$`. استخدم أمثلة مثل `$f(x)=x^2$` و `$\\sum_{i=1}^n i$`." 
        : "ملاحظة: هذه مادة أدبية/لغوية، تجنب استخدام الرموز الرياضية أو تنسيق LaTeX تماماً. ركز على النصوص العربية الواضحة والمنسقة والأسلوب الأدبي الرصين.";

      const prompt = `أنت أستاذ جزائري خبير ومتميز. اشرح لي درس "${selectedLesson.title}" في مادة ${selectedSubject.name} لشعبة ${selectedSpecialty.name} بأسلوب مبسط وشيق جداً.
      ${mathInstruction}
      استخدم لغة سهلة الفهم، وقسم الشرح إلى فقرات واضحة ومنظمة. ${['spanish', 'english', 'french', 'german', 'italian'].includes(selectedSubject.id) ? "أضف ترجمة للعربية لكل فقرة ومصطلح مهم." : ""}`;
      
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
    setQuizError(null);
    setShowQuizReview(false);

    try {
      const quiz = await GeminiService.generateQuiz(selectedLesson.title, selectedSubject.name, selectedSpecialty.name, selectedSubject.id);
      if (quiz && quiz.questions && quiz.questions.length > 0) {
        setActiveQuiz(quiz);
      } else {
        setQuizError("عذراً، لم نتمكن من توليد اختبار صالح. حاول مرة أخرى.");
      }
    } catch (e: any) {
      console.error("Error generating quiz:", e);
      setQuizError("عذراً، حدث خطأ أثناء توليد الاختبار.");
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
      const text = await GeminiService.generateExercisesText(selectedLesson.title, selectedSubject.name, selectedSpecialty.name, selectedSubject.id);
      setExerciseText(text);

      const isScientific = ['math', 'physics', 'science', 'tech_civil', 'tech_electrical', 'tech_mechanical', 'tech_process', 'accounting', 'economics'].includes(selectedSubject.id);
      const mathHelp = isScientific ? "استخدم LaTeX للرياضيات $...$." : "تجنب تماماً استخدام الرموز الرياضية أو LaTeX.";

      const solPrompt = `أنت أستاذ مصحح متمكن في البكالوريا الجزائرية. قدم الحل النموذجي المفصل والمنهجي لموضوع التمارين التالي حول درس "${selectedLesson.title}". 
      ${mathHelp} \n\n${text}`;
      const solResponse = await GeminiService.generateResponse('fast', solPrompt);
      setExerciseSolution(solResponse.text || "عذراً، تعذر توليد الحل.");
    } catch (error: any) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (overrideInput?: string, lessonContext?: string) => {
    const textToSend = overrideInput || input;
    if (!textToSend) return;
    if (!selectedLesson || !selectedSubject || !selectedSpecialty) return;

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
      let textContent = response.text || "";
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
      console.error("Error sending message:", error);
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
      <div className="min-h-screen flex flex-col items-center justify-center p-6 sm:p-10 bg-black text-white relative overflow-hidden">
        <div className="absolute top-[-30%] left-[-20%] w-[100%] h-[100%] bg-white/[0.03] blur-[200px] rounded-full pointer-events-none"></div>
        <div className="text-center mb-16 sm:mb-24 z-10 px-4">
          <Logo />
          <p className="text-lg sm:text-2xl lg:text-3xl font-light text-slate-400 max-w-3xl mx-auto leading-relaxed mt-4 tracking-wide opacity-70">
            بوابتك الذكية والاحترافية للتفوق والنجاح في البكالوريا
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-10 max-w-7xl w-full z-10 px-4">
          {SPECIALTIES.map((spec) => (
            <button key={spec.id} onClick={() => { setSelectedSpecialty(spec); setStep('subject'); }} 
              className="group relative overflow-hidden bg-white/5 backdrop-blur-xl p-8 sm:p-14 rounded-[2.5rem] border border-white/10 hover:border-white/50 transition-all hover:scale-[1.03] shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] flex flex-col items-center gap-6 sm:gap-10 text-center active:scale-95 duration-500"
            >
              <div className="w-20 h-20 sm:w-28 sm:h-28 bg-white/5 rounded-[2rem] flex items-center justify-center text-5xl sm:text-7xl group-hover:scale-110 transition-all duration-500 shadow-xl border border-white/5">{spec.icon}</div>
              <div className="flex flex-col gap-2">
                <span className="text-2xl sm:text-3xl font-black tracking-tight text-white text-glow transition-all">{spec.name}</span>
                <span className="text-[10px] sm:text-xs font-bold opacity-30 uppercase tracking-[0.4em] text-white">Academic Branch</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === 'subject') {
    return (
      <div className="min-h-screen bg-black p-6 sm:p-12 lg:p-16 flex flex-col items-center relative overflow-hidden">
        <div className="max-w-6xl w-full flex flex-col sm:flex-row justify-between items-center mb-12 sm:mb-20 gap-8 relative z-10">
          <button onClick={() => setStep('specialty')} className="w-full sm:w-auto bg-white/5 backdrop-blur-md px-8 py-4 rounded-2xl border border-white/10 text-white font-black hover:bg-white/10 transition-all flex items-center justify-center gap-3 active:scale-95 text-lg group">
            ⏎ العودة للشعب
          </button>
          <div className="text-center sm:text-right">
            <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight text-glow">اختر المادة الدراسية</h2>
            <div className="flex items-center justify-center sm:justify-end gap-3 mt-3">
              <span className="text-slate-400 font-black uppercase tracking-widest text-xs sm:text-base">{selectedSpecialty?.name}</span>
              <span className="text-2xl sm:text-4xl">{selectedSpecialty?.icon}</span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6 sm:gap-10 max-w-7xl w-full pb-16 px-4 relative z-10">
          {SUBJECTS.filter(s => s.specialties.includes(selectedSpecialty!.id)).map(s => (
            <button key={s.id} onClick={() => { setSelectedSubject(s); setStep('lesson'); }} 
              className="bg-white/5 backdrop-blur-md p-8 sm:p-12 lg:p-14 rounded-[3rem] shadow-[0_0_15px_rgba(255,255,255,0.05)] hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] transition-all hover:-translate-y-2 flex flex-col items-center gap-5 sm:gap-8 group border border-white/10 active:scale-95 hover:border-white/30 duration-500"
            >
              <span className="text-6xl sm:text-8xl lg:text-9xl group-hover:scale-110 transition-transform duration-500 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">{s.icon}</span>
              <span className="text-lg sm:text-2xl lg:text-3xl font-black text-white text-center leading-tight text-glow transition-all">{s.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === 'lesson') {
    return (
      <div className="min-h-screen bg-black p-6 sm:p-12 lg:p-16 flex flex-col items-center relative overflow-hidden">
        <div className="max-w-5xl w-full flex flex-col sm:flex-row justify-between items-center mb-12 sm:mb-20 gap-8 relative z-10">
          <button onClick={() => setStep('subject')} className="w-full sm:w-auto bg-white/5 backdrop-blur-md px-8 py-4 rounded-2xl border border-white/10 text-white font-black hover:bg-white/10 transition-all flex items-center justify-center gap-3 active:scale-95 text-lg group">
            ⏎ العودة للمواد
          </button>
          <div className="flex items-center gap-4">
            <h2 className="text-3xl sm:text-5xl font-black text-white text-glow">{selectedSubject?.name}</h2>
            <span className="text-5xl drop-shadow-lg">{selectedSubject?.icon}</span>
          </div>
        </div>
        <div className="max-w-5xl w-full space-y-8 sm:space-y-12 pb-20 px-4 relative z-10">
          {selectedSubject && filteredCurriculum(selectedSubject).map(unit => (
            <div key={unit.id} className="bg-white/5 backdrop-blur-lg rounded-[3rem] shadow-2xl border border-white/10 overflow-hidden hover:border-white/20 transition-colors">
              <div className="bg-white/5 p-6 sm:p-10 font-black text-white text-right text-lg sm:text-2xl border-b border-white/10 flex items-center gap-3">
                <span className="opacity-40 text-3xl">#</span>
                <span className="text-glow">{unit.title}</span>
              </div>
              <div className="p-4 sm:p-8 grid grid-cols-1 gap-3 sm:gap-5">
                {unit.lessons.map(l => (
                  <button key={l.id} onClick={() => { setSelectedLesson(l); setStep('mode'); }} 
                    className="w-full p-6 sm:p-10 text-right font-black text-slate-200 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/20 rounded-[2rem] transition-all flex items-center justify-between group active:scale-[0.98] duration-300"
                  >
                    <span className="text-white opacity-0 group-hover:opacity-100 group-hover:translate-x-[-10px] transition-all text-sm sm:text-lg font-black hidden sm:inline-flex items-center gap-2 text-glow">عرض تفاصيل الدرس ←</span>
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
      <div className="min-h-screen bg-black flex flex-col p-6 sm:p-10 text-white text-center relative overflow-hidden">
        <div className="w-full max-w-7xl mx-auto flex justify-end mb-10 sm:mb-16 relative z-20">
          <button onClick={() => setStep('lesson')} className="w-full sm:w-auto bg-white/5 border border-white/10 px-10 py-4 rounded-2xl hover:bg-white/10 transition-all font-black flex items-center justify-center gap-3 active:scale-95 text-lg group">
            ⏎ رجوع لقائمة الدروس
          </button>
        </div>
        <div className="z-10 animate-in slide-in-from-bottom-12 duration-700 w-full max-w-7xl mx-auto flex-1 flex flex-col justify-center">
          <h2 className="text-4xl sm:text-7xl lg:text-8xl font-black mb-8 sm:mb-12 leading-tight px-4 drop-shadow-[0_0_20px_rgba(255,255,255,0.3)] text-white text-glow">
            {selectedLesson?.title}
          </h2>
          <p className="text-xl sm:text-3xl lg:text-4xl text-slate-400 font-bold mb-14 sm:mb-24 px-6 leading-relaxed">
            اختر أسلوب المراجعة المفضل لديك الآن
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12 lg:gap-16 px-4 pb-20">
            {[
              { id: 'fast', label: 'شرح مفصل', icon: '📚', desc: 'تبسيط شامل للمفاهيم' },
              { id: 'quiz', label: 'اختبار ذكي', icon: '🎯', desc: 'تحدي العشر أسئلة' },
              { id: 'exercises', label: 'تمارين مقترحة', icon: '📝', desc: 'وفق المنهجية الرسمية' }
            ].map(m => (
              <button key={m.id} onClick={() => handleModeSelect(m.id as AIMode)} 
                className="group relative bg-white/5 border border-white/10 p-10 sm:p-16 lg:p-24 rounded-[4rem] hover:bg-white/10 transition-all hover:scale-[1.05] hover:border-white/30 flex flex-col items-center gap-6 sm:gap-10 shadow-[0_0_20px_rgba(0,0,0,0.5)] overflow-hidden active:scale-95 duration-500"
              >
                <span className="text-7xl sm:text-9xl lg:text-[10rem] group-hover:rotate-12 transition-all duration-500 drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">{m.icon}</span>
                <div className="flex flex-col gap-2 sm:gap-4 relative z-10">
                  <div className="text-2xl sm:text-4xl lg:text-5xl font-black text-white text-glow transition-all">{m.label}</div>
                  <p className="text-xs sm:text-base lg:text-xl text-slate-400 font-black uppercase tracking-widest">{m.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-black text-white font-['Tajawal'] relative">
      {isSidebarOpen && <div className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-md" onClick={() => setIsSidebarOpen(false)} />}
      <aside className={`fixed md:relative inset-y-0 right-0 z-50 w-72 sm:w-80 lg:w-96 bg-[#050505] border-l border-white/10 flex flex-col shadow-2xl transition-transform duration-500 ease-in-out ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
        <div className="p-8 sm:p-12 bg-white/5 text-white flex flex-col gap-6 border-b border-white/5">
           <div className="flex items-center justify-between">
              <h2 className="text-2xl sm:text-3xl font-black leading-tight truncate ml-3 text-glow">{selectedSubject?.name}</h2>
              <span className="text-4xl sm:text-5xl flex-shrink-0 drop-shadow-md">{selectedSubject?.icon}</span>
           </div>
           <p className="text-[10px] sm:text-xs font-black opacity-50 uppercase tracking-[0.3em] leading-relaxed text-slate-300">{selectedLesson?.title}</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
           <button onClick={() => resetTo('specialty')} className="w-full text-right p-6 rounded-2xl bg-white/5 hover:bg-white/10 transition-all font-black text-sm sm:text-lg flex items-center justify-between group active:scale-95 border border-white/5 hover:border-white/20">🎓<span>تغيير الشعبة</span></button>
           <button onClick={() => resetTo('subject')} className="w-full text-right p-6 rounded-2xl bg-white/5 hover:bg-white/10 transition-all font-black text-sm sm:text-lg flex items-center justify-between group active:scale-95 border border-white/5 hover:border-white/20">📐<span>تغيير المادة</span></button>
           <button onClick={() => setStep('mode')} className="w-full text-right p-6 rounded-2xl bg-white/10 hover:bg-white/20 transition-all font-black text-sm sm:text-lg flex items-center justify-between group active:scale-95 border border-white/10 hover:border-white/30">⚙️<span>تغيير النمط</span></button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full bg-black overflow-hidden relative">
         <header className="h-16 sm:h-20 bg-black/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-4 sm:px-12 shadow-lg shrink-0 z-30">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden p-2.5 bg-white/10 rounded-xl active:scale-90 transition-all border border-white/10 hover:bg-white/20">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 6h16M4 12h16m-7 6h7" /></svg>
            </button>
            <h1 className="font-black text-base sm:text-2xl text-white text-center flex-1 sm:flex-none truncate px-4 leading-tight text-glow">{selectedLesson?.title}</h1>
            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-black flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.2)] border border-white/20 shrink-0 overflow-hidden">
              <VectorLogo className="w-full h-full scale-125" />
            </div>
         </header>

         {step === 'exercises' ? (
           <div className="flex-1 overflow-y-auto p-4 sm:p-10 lg:p-16 bg-[#050505]">
              <div className="max-w-5xl mx-auto w-full pb-10">
                {isLoading && !exerciseText ? (
                  <div className="bg-white/5 backdrop-blur-md rounded-[3rem] p-20 text-center shadow-2xl animate-pulse border border-white/10">
                     <div className="w-20 h-20 border-8 border-white border-t-transparent rounded-full animate-spin mx-auto mb-10 shadow-[0_0_20px_white]"></div>
                     <h2 className="text-3xl font-black text-white text-glow">جاري صياغة موضوع احترافي...</h2>
                  </div>
                ) : (
                  <div className="bg-[#0a0a0a] rounded-[2rem] sm:rounded-[4rem] shadow-2xl p-8 sm:p-16 border border-white/10 relative">
                     <div className="text-center mb-12 pb-10 border-b-2 border-white/10">
                        <p className="text-lg sm:text-2xl font-black mb-8 text-white text-glow">امتحان البكالوريا التجريبي المقترح</p>
                        <div className="flex flex-col sm:flex-row justify-between items-center text-lg sm:text-2xl font-black gap-4 bg-white/5 p-6 rounded-3xl border border-white/10 text-slate-200">
                          <span>المادة: {selectedSubject?.name}</span>
                          <span>الشعبة: {selectedSpecialty?.name}</span>
                        </div>
                     </div>
                     {exerciseText && <FormattedText text={exerciseText} />}
                     <div className="mt-20 pt-16 border-t border-dashed border-white/20 flex flex-col gap-10">
                        <button onClick={() => generateExercises()} className="py-6 bg-white/5 rounded-3xl font-black text-xl hover:bg-white/10 border border-white/10">توليد موضوع جديد 🔄</button>
                        <button onClick={() => setShowSolution(!showSolution)} className={`py-6 rounded-3xl font-black text-2xl lg:text-3xl transition-all shadow-lg active:scale-95 ${showSolution ? 'bg-white text-black' : 'bg-white/10 text-white border border-white/20'}`}>
                          {showSolution ? 'إخفاء الحل 🙈' : 'كشف التصحيح النموذجي 💡'}
                        </button>
                        {showSolution && exerciseSolution && <div className="bg-white/5 p-10 sm:p-16 rounded-[3rem] border border-white/20 shadow-inner animate-in slide-in-from-top-10 duration-700"><FormattedText text={exerciseSolution} /></div>}
                     </div>
                  </div>
                )}
              </div>
           </div>
         ) : step === 'quiz' ? (
           <div className="flex-1 overflow-y-auto p-4 sm:p-10 lg:p-16 bg-[#050505]">
             <div className="max-w-4xl mx-auto w-full pb-10">
               {isLoading ? (
                 <div className="text-center py-40">
                    <div className="text-9xl mb-12 animate-bounce grayscale">🎯</div>
                    <h2 className="text-4xl font-black text-white text-glow">نجهز لك 10 أسئلة دقيقة...</h2>
                 </div>
               ) : activeQuiz && !showQuizResult && !showQuizReview ? (
                 <div className="bg-[#0a0a0a] text-white rounded-[4rem] p-10 sm:p-20 shadow-2xl border border-white/10 relative overflow-hidden">
                    <div className="absolute top-0 left-0 h-2 bg-white transition-all duration-700" style={{ width: `${((quizStep + 1) / activeQuiz.questions.length) * 100}%` }}></div>
                    <div className="mb-12"><span className="bg-white/10 text-white px-8 py-3 rounded-full text-lg font-black border border-white/10">سؤال {quizStep + 1} / {activeQuiz.questions.length}</span></div>
                    <div className="text-2xl sm:text-4xl lg:text-5xl font-black mb-16 text-right leading-snug text-glow">
                      {renderMixedText(activeQuiz.questions[quizStep].question)}
                    </div>
                    <div className="grid grid-cols-1 gap-6">
                       {activeQuiz.questions[quizStep].options.map((opt, idx) => (
                         <button key={idx} onClick={() => {
                           const newAnswers = [...userAnswers]; newAnswers[quizStep] = idx; setUserAnswers(newAnswers);
                           if (quizStep < activeQuiz.questions.length - 1) setQuizStep(quizStep + 1); else setShowQuizResult(true);
                         }} className="p-8 sm:p-10 rounded-[2.5rem] text-right font-black text-xl sm:text-3xl bg-white/5 hover:bg-white hover:text-black transition-all flex items-center justify-between border border-white/10 hover:border-white active:scale-95 duration-300">
                            <span className="w-14 h-14 rounded-2xl border-2 border-white/20 flex items-center justify-center text-xl font-bold">{String.fromCharCode(65 + idx)}</span>
                            <span className="flex-1 mr-8">{renderMixedText(opt)}</span>
                         </button>
                       ))}
                    </div>
                 </div>
               ) : showQuizResult && activeQuiz && !showQuizReview ? (
                 <div className="bg-[#0a0a0a] text-white rounded-[4rem] p-10 sm:p-20 text-center border border-white/10 animate-in zoom-in duration-700">
                    <h2 className="text-3xl sm:text-5xl font-black mb-10 text-white text-glow">نتيجتك النهائية</h2>
                    <div className="text-7xl sm:text-9xl font-black text-white mb-16" dir="ltr">
                       {userAnswers.filter((ans, i) => ans === activeQuiz.questions[i].correctAnswerIndex).length} / {activeQuiz.questions.length}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-6 justify-center">
                       <button onClick={() => setShowQuizReview(true)} className="bg-white text-black px-12 py-6 rounded-3xl font-black text-2xl active:scale-95">مراجعة الإجابات 📝</button>
                       <button onClick={loadQuiz} className="bg-white/10 text-white px-12 py-6 rounded-3xl font-black text-2xl active:scale-95 border border-white/10">إعادة الاختبار 🔄</button>
                    </div>
                 </div>
               ) : showQuizReview && activeQuiz ? (
                 <div className="bg-[#0a0a0a] text-white rounded-[4rem] p-10 sm:p-20 shadow-2xl border border-white/10 animate-in slide-in-from-bottom-10 duration-700">
                   <h2 className="text-3xl sm:text-5xl font-black mb-12 text-center text-glow">مراجعة إجاباتك</h2>
                   {activeQuiz.questions.map((q, qIdx) => {
                     const userAnswerIndex = userAnswers[qIdx];
                     const isCorrect = userAnswerIndex === q.correctAnswerIndex;
                     return (
                       <div key={qIdx} className="mb-12 p-8 border-b border-white/10">
                         <h4 className="text-xl sm:text-3xl font-black mb-6 text-right leading-snug">
                           <span className="bg-white/10 px-4 py-1 rounded-full text-base sm:text-xl ml-4">سؤال {qIdx + 1}</span>
                           {renderMixedText(q.question)}
                         </h4>
                         <div className="grid grid-cols-1 gap-4 mb-6">
                           {q.options.map((opt, optIdx) => (
                             <div key={optIdx} className={`p-6 rounded-2xl text-right font-black text-lg sm:text-xl flex items-center justify-between border ${optIdx === q.correctAnswerIndex ? 'bg-emerald-900/40 text-emerald-200 border-emerald-500/50' : optIdx === userAnswerIndex && !isCorrect ? 'bg-red-900/40 text-red-200 border-red-500/50' : 'bg-white/5 border-white/10'}`}>
                               <span className="w-12 h-12 rounded-xl flex items-center justify-center font-bold bg-white/10">{String.fromCharCode(65 + optIdx)}</span>
                               <span className="flex-1 mr-8">{renderMixedText(opt)}</span>
                             </div>
                           ))}
                         </div>
                         <div className="bg-white/5 p-6 rounded-2xl border border-white/10 text-right"><FormattedText text={`**الشرح:** ${q.explanation}`} /></div>
                       </div>
                     );
                   })}
                   <div className="mt-16 flex justify-center"><button onClick={loadQuiz} className="bg-white text-black px-12 py-6 rounded-3xl font-black text-2xl active:scale-95">إعادة الاختبار 🔄</button></div>
                 </div>
               ) : null}
             </div>
           </div>
         ) : (
           <>
            <div className="flex-1 overflow-y-auto p-4 sm:p-10 lg:p-16 space-y-12 sm:space-y-16 bg-[#050505]">
                {messages.length === 0 && !isLoading && (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-60 pb-20">
                    <span className="text-8xl sm:text-[10rem] mb-12 animate-pulse grayscale">📘</span>
                    <p className="text-2xl sm:text-4xl font-black text-center px-10 max-w-4xl leading-relaxed text-slate-400">مرحباً بك! أنا أستاذك الذكي. اطرح أي سؤال حول الدرس وسأشرحه لك بدقة عالية.</p>
                  </div>
                )}
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start items-start gap-3 sm:gap-4'}`}>
                    {msg.role === 'assistant' && (
                      <div className="flex-shrink-0 w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-black flex items-center justify-center shadow-lg border border-white/20 overflow-hidden mt-2"><VectorLogo className="w-full h-full scale-125" /></div>
                    )}
                    <div className={`max-w-[85%] sm:max-w-[80%] rounded-[3rem] p-6 sm:p-10 shadow-2xl relative animate-in fade-in slide-in-from-bottom-5 duration-700 ${msg.role === 'user' ? 'bg-white text-black rounded-tr-none' : 'bg-[#0a0a0a] border border-white/10 rounded-tl-none text-white'}`}>
                      {msg.role === 'assistant' ? <FormattedText text={msg.content} /> : <div className="text-xl sm:text-3xl lg:text-4xl font-black leading-snug">{msg.content}</div>}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-end animate-pulse">
                    <div className="bg-[#0a0a0a] p-5 sm:p-8 rounded-[2.5rem] rounded-tl-none shadow-xl flex items-center gap-6 border border-white/10">
                      <span className="text-xs sm:text-base font-black text-slate-400 uppercase tracking-widest">جاري التفكير بعمق...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
            </div>
            <div className="p-4 sm:p-10 bg-black border-t border-white/10 shrink-0 z-20">
                <div className="max-w-6xl mx-auto flex items-center gap-3 sm:gap-6 bg-white/5 p-2 sm:p-4 rounded-[2rem] sm:rounded-[3.5rem] border border-white/10 focus-within:border-white/40 transition-all">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                    placeholder="اطلب شرحاً مفصلاً أو اطرح سؤالاً..."
                    className="flex-1 bg-transparent border-none focus:ring-0 text-lg sm:text-2xl lg:text-3xl font-black resize-none py-3 sm:py-6 px-4 sm:px-10 max-h-32 sm:max-h-52 text-right text-white"
                    style={{ direction: 'rtl' }}
                  />
                  <button onClick={() => sendMessage()} disabled={isLoading || !input.trim()} className="p-5 sm:p-9 rounded-[1.8rem] sm:rounded-[3rem] transition-all bg-white/10 text-white hover:bg-white/20 border border-white/20 flex-shrink-0">
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
