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
const [quizError, setQuizError] = useState<string | null>(null);
const [showQuizReview, setShowQuizReview] = useState(false);

const chatEndRef = useRef<HTMLDivElement>(null);

useEffect(() => {
chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages, isLoading]);

const filteredCurriculum = (subject: Subject): Unit[] => {
if (!subject.curriculum || !selectedSpecialty) return [];
const specId = selectedSpecialty.id;

if (subject.id === 'philosophy') {
if (specId === 'Lettres et Philosophie') return subject.curriculum;
return subject.curriculum.filter(unit => unit.id !== 'ph4');
}

if (subject.id === 'math') {
if (specId === 'Mathématiques' || specId === 'Technique Mathématique') return subject.curriculum;
return subject.curriculum.filter(unit => unit.id !== 'm6');
}

if (subject.id === 'french') {
if (specId === 'Langues Étrangères') return subject.curriculum;
return subject.curriculum.map(unit => {
if (unit.id === 'fr1') {
return { ...unit, lessons: unit.lessons.filter(lesson => lesson.id !== 'frl4') };
}
return unit;
});
}

return subject.curriculum;
};

const resetTo = (targetStep: NavigationStep) => {
setStep(targetStep);
if (targetStep === 'specialty') {
setSelectedSpecialty(null); setSelectedSubject(null); setSelectedLesson(null); setMessages([]);
} else if (targetStep === 'subject') {
setSelectedSubject(null); setSelectedLesson(null); setMessages([]);
} else if (targetStep === 'lesson') {
setSelectedLesson(null); setMessages([]);
}
setActiveQuiz(null); setExerciseText(null); setExerciseSolution(null);
setShowSolution(false); setIsSidebarOpen(false); setQuizError(null); setShowQuizReview(false);
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
const prompt = `أنت أستاذ جزائري خبير ومتميز. اشرح لي درس "${selectedLesson.title}" في مادة ${selectedSubject.name} لشعبة ${selectedSpecialty.name} بأسلوب مبسط وشيق جداً. استخدم LaTeX للرموز الرياضية $...$.`;
await sendMessage(prompt, selectedLesson.title);
}
};

const loadQuiz = async () => {
if (!selectedLesson || !selectedSubject || !selectedSpecialty) return;
setIsLoading(true); setActiveQuiz(null); setShowQuizResult(false); setQuizStep(0); setUserAnswers([]); setQuizError(null); setShowQuizReview(false);

try {
// ✅ Using Vite Environment Variable
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const quiz = await GeminiService.generateQuiz(selectedLesson.title, selectedSubject.name, selectedSpecialty.name, apiKey);
if (quiz && quiz.questions && quiz.questions.length > 0) setActiveQuiz(quiz);
else setQuizError("عذراً، لم نتمكن من توليد اختبار صالح.");
} catch (e: any) {
setQuizError("عذراً، حدث خطأ أثناء توليد الاختبار.");
} finally {
setIsLoading(false);
}
};

const generateExercises = async () => {
if (!selectedLesson || !selectedSubject || !selectedSpecialty) return;
setIsLoading(true); setExerciseText(null); setExerciseSolution(null); setShowSolution(false);
try {
// ✅ Using Vite Environment Variable
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const text = await GeminiService.generateExercisesText(selectedLesson.title, selectedSubject.name, selectedSpecialty.name, apiKey);
setExerciseText(text);
const solPrompt = `أنت أستاذ مصحح متمكن في البكالوريا الجزائرية. قدم الحل النموذجي لـ: \n\n${text}`;
const solResponse = await GeminiService.generateResponse('fast', solPrompt, apiKey);
setExerciseSolution(solResponse.text || "عذراً، تعذر توليد الحل.");
} catch (error: any) {
console.error(error);
} finally {
setIsLoading(false);
}
};

const sendMessage = async (overrideInput?: string, lessonContext?: string) => {
const textToSend = overrideInput || input;
if (!textToSend || !selectedLesson || !selectedSubject || !selectedSpecialty) return;

const userMsg: Message = { id: Date.now().toString(), role: 'user', content: textToSend, mode: mode, timestamp: Date.now() };
if (!overrideInput) { setMessages(prev => [...prev, userMsg]); setInput(''); }

setIsLoading(true);

try {
// ✅ Passing the Vite API Key to the Service
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const response = await GeminiService.generateResponse(mode, textToSend, apiKey);
let textContent = response.text || "";

const suggestions = await GeminiService.generateSuggestions(textContent, lessonContext || selectedLesson.title, apiKey);
const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: textContent, mode: mode, timestamp: Date.now(), suggestions: suggestions };
setMessages(prev => [...prev, aiMsg]);
} catch (error: any) {
setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "عذراً، حدث خطأ في النظام.", mode: mode, timestamp: Date.now() }]);
} finally {
setIsLoading(false);
}
};

// ... (Rest of the JSX rendering logic for steps: specialty, subject, lesson, mode, chat)
// [Clipped for brevity - ensure your original UI code follows here]

return (
// Your existing return block...
<div>Check UI Logic In Original File</div>
);
};

export default App;