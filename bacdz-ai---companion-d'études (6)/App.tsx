
import React, { useState, useEffect, useRef } from 'react';
import { Session } from '@supabase/supabase-js';
import { Specialty, Subject, AIMode, Message, Lesson, Quiz, SpecialtyInfo, Unit, NavigationStep, UserRole, StudentGrade, UserProfile } from './types';
import { SPECIALTIES, SUBJECTS } from './constants';
import { GeminiService } from './services/geminiService';
import { SupabaseService } from './services/supabaseService';
import * as pdfjsLib from 'pdfjs-dist';

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  
  interface Window {
    katex: any;
    aistudio?: AIStudio;
  }
}

const pdfjs = (pdfjsLib as any).default ?? pdfjsLib;

if (typeof window !== 'undefined' && pdfjs.GlobalWorkerOptions) {
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

// --- UI Components ---

const EduAiLogo: React.FC<{ className?: string }> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg"
         fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M50 10 L95 32 L50 54 L5 32 Z" />
        <path d="M20 55 C 20 45, 80 45, 80 55" />
        <path d="M20 55 C 20 75, 45 75, 45 55" />
        <path d="M55 55 C 55 75, 80 75, 80 55" />
    </svg>
);

const Logo: React.FC<{ size?: 'small' | 'large' }> = ({ size = 'large' }) => (
  <div className={`flex flex-col items-center ${size === 'large' ? 'mb-8' : 'mb-4'} animate-in fade-in zoom-in duration-1000`}>
    <div className={`relative ${size === 'large' ? 'w-48 h-48 sm:w-64 sm:h-64' : 'w-24 h-24'} flex items-center justify-center group`}>
      <div className="absolute w-2/3 h-2/3 bg-white/10 blur-[80px] rounded-full animate-pulse"></div>
      <EduAiLogo className="w-full h-full text-white drop-shadow-[0_0_35px_rgba(255,255,255,0.6)] z-10" />
    </div>
  </div>
);

const FormattedText: React.FC<{ text: string }> = ({ text }) => {
  if (!text) return null;
  let cleanText = text.replace(/<br\s*\/?>/gi, '\n');
  const lines = cleanText.split('\n');
  return (
    <div className="space-y-4 text-right overflow-hidden">
      {lines.map((line, index) => {
        if (line.startsWith('#')) {
          const level = line.match(/^#+/)?.[0].length || 1;
          const textOnly = line.replace(/^#+\s*/, '');
          const sizeClass = 
            level === 1 ? 'text-2xl sm:text-3xl font-black mb-6 text-white text-glow' : 
            level === 2 ? 'text-xl sm:text-2xl font-bold mb-4 text-white text-glow' : 
            'text-lg sm:text-xl font-bold mb-3 text-white text-glow';
          return <h3 key={index} className={`${sizeClass} border-r-4 border-white pr-4 mt-8 leading-tight`}>{renderMixedText(textOnly)}</h3>;
        }
        if (line.trim().startsWith('- ') || line.trim().startsWith('* ') || /^\d+\./.test(line.trim())) {
          const isOrdered = /^\d+\./.test(line.trim());
          const textOnly = isOrdered ? line.trim().replace(/^\d+\.\s*/, '') : line.trim().substring(2);
          return (
            <div key={index} className="flex items-start gap-3 pr-3 py-1">
              {isOrdered ? (
                <span className="font-black text-white min-w-[1.5rem] text-lg text-glow">{line.trim().match(/^\d+\./)?.[0]}</span>
              ) : (
                <span className="w-2 h-2 rounded-full bg-white mt-3 flex-shrink-0 shadow-[0_0_10px_white]"></span>
              )}
              <span className="flex-1 text-slate-300 text-base sm:text-lg leading-relaxed">{renderMixedText(textOnly)}</span>
            </div>
          );
        }
        if (!line.trim()) return <div key={index} className="h-4"></div>;
        return <p key={index} className="leading-relaxed text-base sm:text-lg text-slate-300 font-medium">{renderMixedText(line)}</p>;
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
          return <span key={i} className="math-rendered mx-1 scale-110 inline-block font-bold" dangerouslySetInnerHTML={{ __html: html }} />;
        }
      } catch (e) { return <span key={i} className="math-rendered bg-red-900/50 text-red-200 rounded px-1">{math}</span>; }
    }
    const boldParts = part.split(/(\*\*.*?\*\*)/g);
    return boldParts.map((subPart, j) => {
      if (subPart.startsWith('**') && subPart.endsWith('**')) {
        return <strong key={`${i}-${j}`} className="font-black text-glow">{subPart.slice(2, -2)}</strong>;
      }
      return subPart;
    });
  });
}

const LoadingScreen: React.FC = () => (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <div className="w-24 h-24 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
    </div>
);

// --- Helper Functions ---
const mapAuthError = (message: string): string => {
  if (!message) return 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
  if (message.includes('Invalid login credentials')) {
    return 'البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى.';
  }
  if (message.includes('User already registered') || message.includes('already exists')) {
    return 'هذا الحساب مسجل بالفعل. يرجى تسجيل الدخول أو استخدام بريد إلكتروني آخر.';
  }
  if (message.includes('Email not confirmed')) {
    return 'لم يتم تفعيل الحساب. يرجى التحقق من بريدك الإلكتروني والنقر على رابط التفعيل.';
  }
  if (message.includes('Password should be at least 6 characters')) {
    return 'يجب أن تتكون كلمة المرور من 6 أحرف على الأقل.';
  }
  return 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
};


// --- Main App Component ---

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [step, setStep] = useState<NavigationStep>('auth');
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

  const [examText, setExamText] = useState<string | null>(null);
  const [examSolution, setExamSolution] = useState<string | null>(null);
  const [showExamSolution, setShowExamSolution] = useState(false);

  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [quizStep, setQuizStep] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [showQuizResult, setShowQuizResult] = useState(false);

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [programText, setProgramText] = useState<string | null>(null);
  const [isUploadingProgram, setIsUploadingProgram] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const checkSession = async () => {
        const currentSession = await SupabaseService.getSession();
        setSession(currentSession);
        if (currentSession) {
            const userProfile = await SupabaseService.getProfile(currentSession.user.id);
            setProfile(userProfile);
        }
        setAuthLoading(false);
    };
    checkSession();

    const subscription = SupabaseService.onAuthStateChange(async (_event, session) => {
        setSession(session);
        if (session) {
            const userProfile = await SupabaseService.getProfile(session.user.id);
            setProfile(userProfile);
        } else {
            setProfile(null);
            setStep('auth');
        }
    });

    return () => {
        subscription?.unsubscribe();
    };
  }, []);
  
  useEffect(() => {
    if (!authLoading) {
        if (session && profile) {
            if (profile.role === 'student') {
                setStep('specialty');
            } else if (profile.role === 'teacher') {
                setProgramText(profile.program_text || null);
                setStep('teacher_dashboard');
            } else {
                setStep('role_selection');
            }
        } else if (session && !profile) {
            setStep('role_selection');
        } else {
            setStep('auth');
        }
    }
  }, [session, profile, authLoading]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSignOut = async () => {
    await SupabaseService.signOut();
  };

  const filteredCurriculum = (subject: Subject): Unit[] => {
    if (!subject.curriculum) return [];
    if (!selectedSpecialty) return subject.curriculum;
    return subject.curriculum;
  };

  const resetTo = (targetStep: NavigationStep) => {
    setStep(targetStep);
    if (targetStep === 'specialty') {
      setSelectedSubject(null);
      setSelectedLesson(null);
    } else if (targetStep === 'subject') {
      setSelectedLesson(null);
    }
    setActiveQuiz(null);
    setExerciseText(null);
    setExerciseSolution(null);
    setShowSolution(false);
    setIsSidebarOpen(false);
    setExamText(null);
    setExamSolution(null);
    setShowExamSolution(false);
  };
  
  // --- PDF & File Handling ---
  const extractTextFromPdf = async (file: File): Promise<string> => {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += pageText + '\n\n';
      }
      return fullText;
  };

  const handlePdfUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      setPdfFile(file);
      setIsLoading(true);
      setUploadProgress(10);
      try {
          const text = await extractTextFromPdf(file);
          setUploadProgress(50);
          const customLesson: Lesson = { id: 'custom_lesson', title: file.name.replace('.pdf', ''), content: text };
          setSelectedSubject({ id: 'custom_pdf', name: 'ملف خاص', specialties: ['Pour ma princesse'], icon: '📄' });
          setSelectedLesson(customLesson);
          setUploadProgress(100);
          setStep('chat');
          setIsLoading(true);
          const prompt = "اشرح لي محتوى هذا الملف بالتفصيل الممل وبطريقة سهلة جداً للفهم، وكأني طالب مبتدئ. قسم الشرح إلى نقاط واضحة ومفصلة. بعد الشرح، اقترح علي أسئلة لأختبر فهمي.";
          const response = await GeminiService.generateResponse('fast', prompt, undefined, undefined, text);
          const aiText = response.text || "تم استيعاب الملف بنجاح.";
          const suggestions = await GeminiService.generateSuggestions(aiText, file.name);
          setMessages([{ id: 'init', role: 'assistant', content: aiText, mode: 'fast', timestamp: Date.now(), suggestions: suggestions }]);
      } catch (error) { alert("حدث خطأ أثناء قراءة ملف PDF."); } finally { setIsLoading(false); }
  };
  
  const handleProgramUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !session) return;
      setIsUploadingProgram(true);
      try {
          const text = await extractTextFromPdf(file);
          await SupabaseService.upsertProfile(session.user.id, { program_text: text });
          setProgramText(text);
          alert("تم تحميل البرنامج السنوي وحفظه بنجاح!");
      } catch (error) {
          alert("حدث خطأ أثناء قراءة وحفظ ملف البرنامج.");
      } finally {
          setIsUploadingProgram(false);
      }
  };

  const handleDeleteProgram = async () => {
      if (window.confirm("هل أنت متأكد من حذف البرنامج السنوي؟ سيتم حذفه نهائياً.") && session) {
          await SupabaseService.upsertProfile(session.user.id, { program_text: null });
          setProgramText(null);
      }
  };

  // --- AI Interaction ---
  const handleModeSelect = async (selectedMode: AIMode) => {
    if (!selectedLesson || !selectedSubject || !selectedSpecialty) return;
    setMode(selectedMode);
    if (selectedMode === 'exercises') { setStep('exercises'); generateExercises(); }
    else if (selectedMode === 'quiz') { setStep('quiz'); loadQuiz(); }
    else if (selectedMode === 'lesson_plan') {
      setStep('chat');
      setIsLoading(true);
      const plan = await GeminiService.generateLessonPlan(selectedLesson.title, selectedSubject.name, selectedSpecialty.name, programText);
      setMessages([{ id: `plan-${Date.now()}`, role: 'assistant', content: plan, mode: 'lesson_plan', timestamp: Date.now() }]);
      setIsLoading(false);
    }
    else if (selectedMode === 'exam_builder') {
      setStep('exam_builder_flow');
    }
    else {
      setStep('chat');
      if (selectedMode !== 'image') {
        setIsLoading(true);
        const prompt = `أنت أستاذ جزائري خبير. اشرح لي درس "${selectedLesson.title}" في مادة ${selectedSubject.name} لشعبة ${selectedSpecialty.name} بأسلوب مبسط وشيق جداً.`;
        await sendMessage(prompt, selectedLesson.title);
      } else {
        setMessages([{
          id: 'init-image',
          role: 'assistant',
          content: 'لقد قمت بتفعيل وضع توليد الصور. يرجى كتابة وصف للصورة التي تريد إنشائها.',
          mode: 'image',
          timestamp: Date.now()
        }]);
      }
    }
  };

  const loadQuiz = async () => {
    if (!selectedLesson || !selectedSubject || !selectedSpecialty) return;
    setIsLoading(true);
    setActiveQuiz(null);
    setShowQuizResult(false);
    setQuizStep(0);
    setUserAnswers([]);
    try {
      const quiz = await GeminiService.generateQuiz(selectedLesson.title, selectedSubject.name, selectedSpecialty.name, selectedSubject.id, selectedLesson.content, programText);
      if (quiz && quiz.questions) setActiveQuiz(quiz);
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };

  const generateExercises = async () => {
    if (!selectedLesson || !selectedSubject || !selectedSpecialty) return;
    setIsLoading(true);
    setExerciseText(null);
    setExerciseSolution(null);
    setShowSolution(false);
    try {
      const text = await GeminiService.generateExercisesText(selectedLesson.title, selectedSubject.name, selectedSpecialty.name, selectedSubject.id, selectedLesson.content, programText);
      setExerciseText(text);
      const solPrompt = `قدم الحل النموذجى المفصل لموضوع التمارين التالي: \n\n${text}`;
      const solResponse = await GeminiService.generateResponse('fast', solPrompt);
      setExerciseSolution(solResponse.text || "");
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  };
  
  const handleGenerateFullExam = async (semester: 1 | 2 | 3) => {
    if (!selectedSubject || !selectedSpecialty) return;
    
    setIsLoading(true);
    setExamText(null);
    setExamSolution(null);
    setShowExamSolution(false);

    const lessonsForSemester = selectedSubject.curriculum
        ?.filter(unit => unit.semester === semester)
        .flatMap(unit => unit.lessons.map(lesson => lesson.title)) || [];

    if (lessonsForSemester.length === 0) {
        alert(`لا توجد دروس محددة للفصل ${semester} في هذه المادة.`);
        setIsLoading(false);
        return;
    }

    try {
        const { examText, solutionText } = await GeminiService.generateFullSemesterExam(
            selectedSubject.name,
            selectedSpecialty.name,
            semester,
            lessonsForSemester
        );
        setExamText(examText);
        setExamSolution(solutionText);
    } catch (e) {
        console.error(e);
        alert("حدث خطأ أثناء توليد الامتحان.");
    } finally {
        setIsLoading(false);
    }
  };

  const sendMessage = async (overrideInput?: string, lessonContext?: string) => {
    const textToSend = overrideInput || input;
    if (!textToSend || !selectedLesson) return;

    if (mode === 'image') {
      try {
        if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
          await window.aistudio.openSelectKey();
        }
      } catch (error) {
        console.error("API Key selection prompt failed", error);
      }
    }

    if (!overrideInput) {
      setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: 'user', content: textToSend, mode: mode, timestamp: Date.now() }]);
      setInput('');
    }
    setIsLoading(true);
    try {
      const response = await GeminiService.generateResponse(mode, textToSend, undefined, undefined, selectedLesson.content);
      const aiText = response.text || "";
      
      let imageUrl: string | undefined = undefined;
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            imageUrl = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      const suggestions = await GeminiService.generateSuggestions(aiText, lessonContext || selectedLesson.title);
      setMessages(prev => [...prev, { 
        id: `assistant-${Date.now()}`, 
        role: 'assistant', 
        content: aiText, 
        mode: mode, 
        timestamp: Date.now(), 
        suggestions: suggestions,
        imageUrl: imageUrl 
      }]);
    } catch (e) { 
      if (e instanceof Error && e.message.includes("Requested entity was not found.") && window.aistudio) {
        await window.aistudio.openSelectKey();
      }
      console.error(e); 
    } finally { setIsLoading(false); }
  };
  
  // --- Screen Components ---

  const AuthScreen: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
    
    const handleEmailSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        const { error } = authMode === 'signin'
            ? await SupabaseService.signIn(email, password)
            : await SupabaseService.signUp(email, password);
        
        if (error) {
            setError(mapAuthError(error.message));
        } else if (authMode === 'signup') {
            setError('تم إنشاء الحساب بنجاح! يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب.');
        }
        setIsLoading(false);
    };

    const handleGoogleSignIn = async () => {
      setIsLoading(true);
      setError('');
      const { error } = await SupabaseService.signInWithGoogle();
      if (error) {
        setError(mapAuthError(error.message));
        setIsLoading(false);
      }
      // On success, Supabase redirects, so no need to set loading to false.
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-black text-white relative overflow-hidden">
            <div className="text-center mb-10 z-10 px-4">
                <Logo size="large" />
                <h1 className="text-4xl sm:text-7xl font-black mb-4 text-glow tracking-tight">EduAi</h1>
                <p className="text-xl sm:text-2xl text-slate-400 mb-2 font-medium">بوابتك الذكية للتميز الدراسي في الجزائر</p>
            </div>
            <div className="w-full max-w-md p-10 bg-white/5 border border-white/10 rounded-[3rem] shadow-2xl z-10">
                <form onSubmit={handleEmailSubmit} className="space-y-6">
                    <div>
                        <label className="text-lg font-bold text-slate-400 block mb-3 text-right">البريد الإلكتروني</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required 
                               className="w-full p-5 bg-white/5 border-2 border-white/10 rounded-2xl text-white text-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all text-right" />
                    </div>
                    <div>
                        <label className="text-lg font-bold text-slate-400 block mb-3 text-right">كلمة المرور</label>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required 
                               className="w-full p-5 bg-white/5 border-2 border-white/10 rounded-2xl text-white text-lg focus:ring-2 focus:ring-white/50 focus:border-white/50 transition-all text-right" />
                    </div>
                    {error && <p className="text-center text-yellow-300 font-bold bg-yellow-900/50 p-4 rounded-xl">{error}</p>}
                    <div className="flex flex-col gap-4 pt-2">
                        <button type="submit" disabled={isLoading} 
                                className="w-full p-6 bg-white text-black font-black text-2xl rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-white/10 disabled:opacity-50">
                            {isLoading ? 'جاري...' : (authMode === 'signin' ? 'تسجيل الدخول' : 'إنشاء حساب جديد')}
                        </button>
                        <button type="button" onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                                className="w-full p-4 text-slate-400 font-bold hover:text-white transition-colors">
                            {authMode === 'signin' ? 'لا تملك حساباً؟ أنشئ واحداً' : 'تملك حساباً بالفعل؟ سجل الدخول'}
                        </button>
                    </div>
                </form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-white/20" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-black/50 px-4 text-sm font-medium text-slate-400 backdrop-blur-sm">أو</span>
                  </div>
                </div>

                <button 
                  type="button" 
                  onClick={handleGoogleSignIn} 
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-4 p-5 bg-white text-black font-bold text-xl rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-white/10 disabled:opacity-50"
                >
                  <svg className="w-6 h-6" viewBox="0 0 48 48">
                    <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
                    <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
                    <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
                    <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.022,35.02,44,30.038,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
                  </svg>
                  <span>المتابعة باستخدام جوجل</span>
                </button>
            </div>
        </div>
    );
  };
  
  const RoleSelectionScreen: React.FC = () => {
    const handleSelectRole = async (role: UserRole) => {
        if (!session) return;
        setIsLoading(true);
        await SupabaseService.upsertProfile(session.user.id, { role });
        const userProfile = await SupabaseService.getProfile(session.user.id);
        setProfile(userProfile);
        setIsLoading(false);
    };
    
    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white text-center">
            <h1 className="text-4xl sm:text-6xl font-black mb-8 text-glow">مرحباً بك في EduAi</h1>
            <p className="text-xl sm:text-2xl text-slate-400 mb-16 max-w-2xl">اختر دورك للبدء. سيتم تخصيص تجربتك بناءً على اختيارك.</p>
            <div className="flex flex-col sm:flex-row gap-10">
                <button onClick={() => handleSelectRole('student')} disabled={isLoading}
                        className="group p-14 rounded-[4rem] bg-white/5 border border-white/10 hover:border-white/50 transition-all hover:scale-105 flex flex-col items-center gap-8 shadow-2xl min-w-[300px]">
                    <span className="text-8xl group-hover:scale-110 transition-transform">🎓</span>
                    <span className="text-3xl font-black block">أنا تلميذ</span>
                </button>
                <button onClick={() => handleSelectRole('teacher')} disabled={isLoading}
                        className="group p-14 rounded-[4rem] bg-white/5 border border-white/10 hover:border-white/50 transition-all hover:scale-105 flex flex-col items-center gap-8 shadow-2xl min-w-[300px]">
                    <span className="text-8xl group-hover:scale-110 transition-transform">🧑‍🏫</span>
                    <span className="text-3xl font-black block">أنا أستاذ</span>
                </button>
            </div>
            {isLoading && <p className="mt-8 text-lg animate-pulse">جاري حفظ اختيارك...</p>}
        </div>
    );
  };

  if (authLoading) return <LoadingScreen />;

  if (step === 'auth') return <AuthScreen />;
  if (step === 'role_selection') return <RoleSelectionScreen />;
  
  if (step === 'teacher_dashboard') {
     return (
        <div className="min-h-screen bg-black flex flex-col items-center p-6 sm:p-12 text-white">
            <header className="w-full max-w-6xl flex justify-between items-center mb-16">
                 <h1 className="text-4xl sm:text-5xl font-black text-glow">لوحة تحكم الأستاذ</h1>
                 <button onClick={handleSignOut} className="bg-red-500/20 text-red-300 px-6 py-3 rounded-xl font-bold hover:bg-red-500/40 transition-all">تسجيل الخروج</button>
            </header>
            <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="bg-white/5 p-10 rounded-[3rem] border border-white/10">
                    <h2 className="text-3xl font-black mb-8 text-center">البرنامج السنوي</h2>
                    {programText ? (
                        <div className="space-y-6">
                            <div className="h-96 bg-black/30 p-6 rounded-2xl overflow-y-auto border border-white/10 text-slate-300">
                                <pre className="whitespace-pre-wrap font-sans text-lg">{programText}</pre>
                            </div>
                            <button onClick={handleDeleteProgram} className="w-full bg-red-800/50 py-4 rounded-2xl font-bold text-lg hover:bg-red-700/70 transition-all">حذف البرنامج الحالي</button>
                        </div>
                    ) : (
                        <label className="relative flex flex-col items-center justify-center w-full h-96 bg-[#0a0a0a] border-2 border-dashed border-white/20 rounded-2xl cursor-pointer hover:border-white/40 transition-all group">
                             <div className="flex flex-col items-center justify-center">
                                {isUploadingProgram ? (
                                    <>
                                        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4"></div>
                                        <p className="text-lg font-bold">جاري الرفع...</p>
                                    </>
                                ) : (
                                     <>
                                        <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">📤</div>
                                        <p className="mb-2 text-xl font-bold">ارفع البرنامج السنوي (PDF)</p>
                                        <p className="text-sm text-gray-500">سيتم استخدامه كمرجع لتوليد المحتوى</p>
                                    </>
                                )}
                             </div>
                             <input type="file" className="hidden" accept=".pdf" onChange={handleProgramUpload} disabled={isUploadingProgram} />
                         </label>
                    )}
                </div>

                <div className="bg-white/5 p-10 rounded-[3rem] border border-white/10 flex flex-col items-center justify-center text-center">
                    <span className="text-8xl mb-8">🛠️</span>
                    <h2 className="text-3xl font-black mb-4">أدوات الأستاذ</h2>
                    <p className="text-slate-400 text-lg mb-8">اختر شعبة ومادة للبدء في توليد الامتحانات، مذكرات الدروس، والتمارين المخصصة.</p>
                    <button onClick={() => setStep('specialty')} className="bg-white text-black px-12 py-6 rounded-2xl font-black text-2xl shadow-lg shadow-white/10 hover:scale-105 transition-transform active:scale-95">
                        ابدأ الآن ←
                    </button>
                </div>
            </div>
        </div>
     );
  }


  if (step === 'specialty') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-black text-white relative overflow-hidden">
        <div className="absolute top-8 right-8 z-20">
            <button onClick={handleSignOut} className="bg-red-500/20 text-red-300 px-6 py-3 rounded-xl font-bold hover:bg-red-500/40 transition-all">تسجيل الخروج</button>
        </div>
        <div className="text-center mb-16 z-10 px-4">
          <Logo size="large" />
           <h1 className="text-4xl sm:text-7xl font-black mb-4 text-glow tracking-tight">EduAi</h1>
           <p className="text-xl sm:text-2xl text-slate-400 mb-2 font-medium">بوابتك الذكية للتميز الدراسي في الجزائر</p>
          <p className="text-2xl font-light text-slate-400 max-w-3xl mx-auto leading-relaxed mt-4 opacity-70">
            اختر شعبتك الدراسية لتبدأ المراجعة
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl w-full z-10 px-4">
          {SPECIALTIES.map((spec) => (
            <button key={spec.id} onClick={() => { setSelectedSpecialty(spec); setStep(spec.id === 'Pour ma princesse' ? 'pdf-upload' : 'subject'); }} 
              className={`group p-10 rounded-[3rem] bg-white/5 border border-white/10 hover:border-white/50 transition-all hover:scale-[1.03] flex flex-col items-center gap-6 text-center active:scale-95 duration-500`}
            >
              <div className="w-20 h-20 bg-white/5 rounded-2xl flex items-center justify-center text-6xl group-hover:scale-110 transition-transform">{spec.icon}</div>
              <span className="text-2xl font-black text-white text-glow">{spec.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === 'pdf-upload') {
      return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white relative overflow-hidden">
            <button onClick={() => setStep('specialty')} className="absolute top-8 right-8 bg-white/10 px-6 py-3 rounded-xl hover:bg-white/20 transition-all">رجوع</button>
            <div className="max-w-3xl w-full text-center z-10">
                <div className="text-8xl mb-8 animate-bounce">👑</div>
                <h2 className="text-4xl sm:text-6xl font-black mb-8 text-glow">مرحباً أميرتي</h2>
                <p className="text-xl text-slate-400 mb-12 leading-relaxed">ارفعي ملف الدرس (PDF) وسأقوم بشرحه وتجهيز التمارين والأسئلة لكِ فوراً بكل حب.</p>
                <label className="relative flex flex-col items-center justify-center w-full h-80 bg-[#0a0a0a] border-2 border-dashed border-pink-500/30 rounded-[3.5rem] cursor-pointer hover:border-pink-500 transition-all group">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {isLoading ? (
                            <div className="flex flex-col items-center gap-4">
                                <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                                <p className="text-lg font-bold">جاري تحليل الملف... {uploadProgress}%</p>
                            </div>
                        ) : (
                            <>
                                <div className="text-6xl mb-4 group-hover:scale-110 transition-transform">📂</div>
                                <p className="mb-2 text-2xl font-bold text-gray-300">اضغطي هنا لرفع الملف</p>
                                <p className="text-sm text-gray-500">سأقوم بقراءة المحتوى وتحويله لشرح تفصيلي</p>
                            </>
                        )}
                    </div>
                    <input type="file" className="hidden" accept=".pdf" onChange={handlePdfUpload} disabled={isLoading} />
                </label>
            </div>
        </div>
      );
  }

  if (step === 'subject') {
    return (
      <div className="min-h-screen bg-black p-6 sm:p-12 flex flex-col items-center overflow-hidden">
        <div className="max-w-6xl w-full flex flex-col sm:flex-row justify-between items-center mb-16 gap-8">
          <button onClick={() => setStep(profile?.role === 'teacher' ? 'teacher_dashboard' : 'specialty')} className="w-full sm:w-auto bg-white/5 px-10 py-5 rounded-2xl border border-white/10 hover:bg-white/10 transition-all font-bold">⏎ العودة</button>
          <div className="text-center sm:text-right">
            <h2 className="text-3xl sm:text-4xl font-black text-white text-glow mb-1">اختر المادة</h2>
            <p className="text-slate-500 text-lg">{selectedSpecialty?.name}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 w-full max-w-7xl">
          {SUBJECTS.filter(s => s.specialties.includes(selectedSpecialty!.id)).map(s => (
            <button key={s.id} onClick={() => { setSelectedSubject(s); setStep('lesson'); }} className="group bg-white/5 p-12 rounded-[3.5rem] border border-white/10 hover:scale-105 transition-all flex flex-col items-center gap-6 shadow-xl">
              <span className="text-7xl group-hover:rotate-12 transition-transform">{s.icon}</span>
              <span className="text-2xl font-black text-white">{s.name}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === 'lesson') {
    return (
      <div className="min-h-screen bg-black p-6 sm:p-12 flex flex-col items-center">
        <header className="max-w-5xl w-full flex justify-between items-center mb-16">
          <button onClick={() => setStep('subject')} className="bg-white/5 px-8 py-4 rounded-2xl border border-white/10 font-bold hover:bg-white/10 transition-all">⏎ رجوع</button>
          <div className="text-right">
            <h2 className="text-3xl font-black text-glow">{selectedSubject?.name}</h2>
            <p className="text-slate-500">قائمة الوحدات والدروس المقررة</p>
          </div>
        </header>
        <div className="max-w-5xl w-full space-y-10">
          {selectedSubject && filteredCurriculum(selectedSubject).map(unit => (
            <div key={unit.id} className="bg-white/5 rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl">
              <div className="bg-white/10 p-8 font-black text-right text-2xl border-b border-white/5 flex items-center justify-end gap-3">
                 <span>{unit.title}</span>
                 <span className="opacity-30">#</span>
              </div>
              <div className="p-6 space-y-4">
                {unit.lessons.map(l => (
                  <button key={l.id} onClick={() => { setSelectedLesson(l); setStep('mode'); }} className="group w-full p-8 text-right font-bold bg-white/5 rounded-2xl hover:bg-white/10 transition-all flex justify-between items-center active:scale-[0.98]">
                    <span className="opacity-0 group-hover:opacity-100 transition-all text-blue-400 font-black">تحضير وإكمال ←</span>
                    <span className="text-2xl">{l.title}</span>
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
    const studentModes = [
      { id: 'fast', label: 'شرح مفصل', icon: '📚' },
      { id: 'quiz', label: 'اختبار ذكي', icon: '🎯' },
      { id: 'exercises', label: 'تمارين مقترحة', icon: '📝' }
    ];
    
    const teacherModes = [
        { id: 'lesson_plan', label: 'مذكرة الدرس', icon: '📋' },
        { id: 'quiz', label: 'توليد اختبار', icon: '🎯' },
        { id: 'exercises', label: 'توليد تمارين', icon: '📝' },
        { id: 'exam_builder', label: 'امتحان فصلي', icon: '🏆' }
    ];

    const modesToShow = profile?.role === 'teacher' ? teacherModes : studentModes;

    return (
      <div className="min-h-screen bg-black flex flex-col p-6 sm:p-12 text-white text-center">
        <div className="max-w-7xl mx-auto w-full flex justify-end mb-20">
          <button onClick={() => setStep('lesson')} className="bg-white/5 px-10 py-5 rounded-2xl border border-white/10 font-bold hover:bg-white/10 transition-all">⏎ رجوع للدروس</button>
        </div>
        <div className="flex-1 flex flex-col justify-center max-w-7xl mx-auto w-full">
          <h2 className="text-4xl sm:text-7xl font-black mb-10 text-glow leading-tight">{selectedLesson?.title}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {modesToShow.map(m => (
              <button key={m.id} onClick={() => handleModeSelect(m.id as AIMode)} className="group p-14 rounded-[4rem] bg-white/5 border border-white/10 hover:border-white/50 transition-all hover:scale-105 flex flex-col items-center gap-8 shadow-2xl">
                <span className="text-8xl group-hover:scale-110 transition-transform">{m.icon}</span>
                <span className="text-3xl font-black block mb-2">{m.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (step === 'exam_builder_flow') {
    return (
      <div className="flex-1 flex flex-col h-full bg-[#050505] overflow-hidden">
        <header className="h-24 bg-black/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-8 z-30 shadow-xl">
          <button onClick={() => setStep('mode')} className="bg-white/5 px-8 py-4 rounded-2xl border border-white/10 font-bold hover:bg-white/10 transition-all">⏎ رجوع</button>
          <h1 className="font-black text-3xl text-glow">بناء امتحان فصلي</h1>
        </header>
        <div className="flex-1 overflow-y-auto p-6 sm:p-16">
          <div className="max-w-5xl mx-auto w-full pb-20">
            {isLoading ? (
              <div className="p-24 text-center animate-pulse">
                <div className="w-20 h-20 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-10"></div>
                <h2 className="text-4xl font-black">جاري بناء امتحان شامل...</h2>
              </div>
            ) : !examText ? (
              <div className="text-center">
                <h2 className="text-4xl sm:text-5xl font-black mb-12 text-glow">اختر الفصل الدراسي</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                  <button onClick={() => handleGenerateFullExam(1)} className="p-16 rounded-[4rem] bg-white/5 border border-white/10 hover:border-blue-500 transition-all hover:scale-105 flex flex-col items-center gap-8 shadow-2xl group">
                    <span className="text-8xl group-hover:scale-110 transition-transform">1️⃣</span>
                    <span className="text-3xl font-black block">الفصل الأول</span>
                  </button>
                  <button onClick={() => handleGenerateFullExam(2)} className="p-16 rounded-[4rem] bg-white/5 border border-white/10 hover:border-blue-500 transition-all hover:scale-105 flex flex-col items-center gap-8 shadow-2xl group">
                    <span className="text-8xl group-hover:scale-110 transition-transform">2️⃣</span>
                    <span className="text-3xl font-black block">الفصل الثاني</span>
                  </button>
                  <button onClick={() => handleGenerateFullExam(3)} className="p-16 rounded-[4rem] bg-white/5 border border-white/10 hover:border-blue-500 transition-all hover:scale-105 flex flex-col items-center gap-8 shadow-2xl group">
                    <span className="text-8xl group-hover:scale-110 transition-transform">3️⃣</span>
                    <span className="text-3xl font-black block">الفصل الثالث</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-[#0a0a0a] rounded-[4rem] p-10 sm:p-20 border border-white/10 shadow-2xl relative">
                <div className="text-center mb-16 pb-12 border-b border-white/10">
                  <p className="text-3xl font-black text-glow">امتحان البكالوريا التجريبي المقترح</p>
                </div>
                <FormattedText text={examText} />
                <div className="mt-20 pt-16 border-t border-dashed border-white/20 flex flex-col gap-8">
                  <button onClick={() => setShowExamSolution(!showExamSolution)} className={`py-8 rounded-[2.5rem] font-black text-3xl transition-all shadow-xl ${showExamSolution ? 'bg-white text-black' : 'bg-white/10 border border-white/20 text-white'}`}>
                    {showExamSolution ? 'إخفاء الحل 🙈' : 'كشف التصحيح النموذجي 💡'}
                  </button>
                  {showExamSolution && examSolution && <div className="bg-white/5 p-12 rounded-[3rem] border border-white/20 shadow-inner animate-in slide-in-from-top-10 duration-700"><FormattedText text={examSolution} /></div>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-black text-white font-['Tajawal'] relative">
      {isSidebarOpen && <div className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />}
      <aside className={`fixed md:relative inset-y-0 right-0 z-50 w-80 lg:w-96 bg-[#050505] border-l border-white/10 flex flex-col shadow-2xl transition-transform duration-500 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
        <div className="p-8 sm:p-12 bg-white/5 flex flex-col gap-6 border-b border-white/5">
           <h2 className="text-3xl font-black truncate text-glow">{selectedSubject?.name || 'EduAi'}</h2>
           <p className="text-xs font-black opacity-50 uppercase tracking-[0.4em] leading-relaxed">{selectedLesson?.title || 'لوحة التحكم'}</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
           <button onClick={() => resetTo('specialty')} className="w-full text-right p-6 rounded-2xl bg-white/5 hover:bg-white/10 transition-all font-black flex justify-between items-center group">
              <span>تغيير الشعبة</span>
              <span className="opacity-30">#</span>
           </button>
           <button onClick={() => resetTo('subject')} className="w-full text-right p-6 rounded-2xl bg-white/5 hover:bg-white/10 transition-all font-black flex justify-between items-center group">
              <span>تغيير المادة</span>
              <span className="opacity-30">#</span>
           </button>
           <button onClick={() => setStep('mode')} className="w-full text-right p-6 rounded-2xl bg-white/10 hover:bg-white/20 transition-all font-black flex justify-between items-center group">
              <span>تغيير النمط</span>
              <span className="opacity-30">#</span>
           </button>
        </div>
        <div className="p-4 border-t border-white/5">
            <button onClick={handleSignOut} className="w-full bg-red-500/20 text-red-300 p-6 rounded-2xl font-bold text-lg hover:bg-red-500/40 transition-all">تسجيل الخروج</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full bg-black overflow-hidden relative">
         <header className="h-16 sm:h-24 bg-black/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-8 z-30 shadow-xl">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden p-3 bg-white/10 rounded-xl">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 6h16M4 12h16m-7 6h7" /></svg>
            </button>
            <h1 className="font-black text-xl sm:text-3xl truncate px-4 text-glow">{selectedLesson?.title}</h1>
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-black border border-white/20 flex items-center justify-center">
              <EduAiLogo className="w-full h-full p-2" />
            </div>
         </header>

         {step === 'exercises' ? (
           <div className="flex-1 overflow-y-auto p-6 sm:p-16 bg-[#050505]">
              <div className="max-w-5xl mx-auto w-full pb-20">
                {isLoading && !exerciseText ? (
                  <div className="p-24 text-center animate-pulse"><div className="w-20 h-20 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-10"></div><h2 className="text-4xl font-black">جاري صياغة موضوع احترافي...</h2></div>
                ) : (
                  <div className="bg-[#0a0a0a] rounded-[4rem] p-10 sm:p-20 border border-white/10 shadow-2xl relative">
                     <div className="text-center mb-16 pb-12 border-b border-white/10">
                        <p className="text-3xl font-black text-glow">امتحان البكالوريا التجريبي المقترح</p>
                     </div>
                     {exerciseText && <FormattedText text={exerciseText} />}
                     <div className="mt-20 pt-16 border-t border-dashed border-white/20 flex flex-col gap-8">
                        <button onClick={() => setShowSolution(!showSolution)} className={`py-8 rounded-[2.5rem] font-black text-3xl transition-all shadow-xl ${showSolution ? 'bg-white text-black' : 'bg-white/10 border border-white/20 text-white'}`}>
                          {showSolution ? 'إخفاء الحل 🙈' : 'كشف التصحيح النموذجي 💡'}
                        </button>
                        {showSolution && exerciseSolution && <div className="bg-white/5 p-12 rounded-[3rem] border border-white/20 shadow-inner animate-in slide-in-from-top-10 duration-700"><FormattedText text={exerciseSolution} /></div>}
                     </div>
                  </div>
                )}
              </div>
           </div>
         ) : step === 'quiz' ? (
           <div className="flex-1 overflow-y-auto p-6 sm:p-16 bg-[#050505]">
             <div className="max-w-4xl mx-auto w-full pb-20">
               {isLoading ? (
                 <div className="text-center py-48"><h2 className="text-5xl font-black mb-10 text-glow">نجهز لك 10 أسئلة دقيقة...</h2></div>
               ) : activeQuiz && !showQuizResult ? (
                 <div className="bg-[#0a0a0a] rounded-[4rem] p-12 sm:p-24 shadow-2xl border border-white/10 relative">
                    <div className="mb-16"><span className="bg-white/10 px-10 py-4 rounded-full text-xl font-black border border-white/10">سؤال {quizStep + 1} / {activeQuiz.questions.length}</span></div>
                    <div className="text-3xl sm:text-5xl font-black mb-20 text-right leading-tight text-glow">{renderMixedText(activeQuiz.questions[quizStep].question)}</div>
                    <div className="grid grid-cols-1 gap-6">
                       {activeQuiz.questions[quizStep].options.map((opt, idx) => (
                         <button key={idx} onClick={() => { const newAnswers = [...userAnswers]; newAnswers[quizStep] = idx; setUserAnswers(newAnswers); if (quizStep < activeQuiz.questions.length - 1) setQuizStep(quizStep + 1); else setShowQuizResult(true); }} className="group p-10 rounded-[2.5rem] text-right font-black text-2xl bg-white/5 hover:bg-white hover:text-black transition-all border border-white/10 hover:border-white active:scale-[0.98] duration-300">
                            {renderMixedText(opt)}
                         </button>
                       ))}
                    </div>
                 </div>
               ) : showQuizResult && activeQuiz ? (
                 <div className="bg-[#0a0a0a] rounded-[5rem] p-12 sm:p-20 text-center border border-white/10 shadow-2xl animate-in zoom-in duration-700">
                    <h2 className="text-5xl sm:text-6xl font-black mb-6 text-glow">النتيجة والتصحيح</h2>
                    <div className="text-7xl sm:text-9xl font-black my-12 leading-none" dir="ltr">
                        {userAnswers.filter((ans, i) => ans === activeQuiz.questions[i].correctAnswerIndex).length} / {activeQuiz.questions.length}
                    </div>
                    
                    <div className="text-right space-y-12 my-16">
                        {activeQuiz.questions.map((q, index) => {
                            const userAnswerIndex = userAnswers[index];
                            const correctAnswerIndex = q.correctAnswerIndex;
                            const isCorrect = userAnswerIndex === correctAnswerIndex;

                            return (
                                <div key={index} className={`p-8 rounded-3xl border-2 ${isCorrect ? 'border-green-500/50 bg-green-500/10' : 'border-red-500/50 bg-red-500/10'}`}>
                                    <h3 className="text-xl sm:text-2xl font-bold mb-6 text-white text-glow flex items-start gap-4">
                                        <span className="font-bold text-slate-400">{index + 1}.</span>
                                        <span>{renderMixedText(q.question)}</span>
                                    </h3>
                                    <div className="space-y-4 mb-6 pr-8">
                                        {q.options.map((option, optIndex) => {
                                            let style = "border-transparent bg-white/5 text-slate-200";
                                            if (optIndex === correctAnswerIndex) {
                                                style = "border-green-500 bg-green-500/20 font-bold";
                                            }
                                            if (optIndex === userAnswerIndex && !isCorrect) {
                                                style = "border-red-500 bg-red-500/20 line-through decoration-2";
                                            }
                                            return (
                                                <div key={optIndex} className={`p-4 rounded-xl border-2 text-lg sm:text-xl text-right transition-all ${style}`}>
                                                    {renderMixedText(option)}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="bg-black/20 p-6 rounded-xl text-slate-300 text-right">
                                       <p className="text-base sm:text-lg"><strong className="text-white ml-2">الشرح:</strong> {renderMixedText(q.explanation)}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <button onClick={loadQuiz} className="bg-white text-black px-16 py-8 rounded-[2.5rem] font-black text-3xl shadow-2xl active:scale-95 transition-all">إعادة الاختبار 🔄</button>
                 </div>
               ) : null}
             </div>
           </div>
         ) : (
           <>
            <div className="flex-1 overflow-y-auto p-6 sm:p-12 lg:p-20 space-y-16 bg-[#050505]">
                {messages.length === 0 && !isLoading && (
                  <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-60 pb-20">
                    <span className="text-[10rem] mb-12 grayscale animate-pulse">📘</span>
                    <p className="text-4xl font-black text-center max-w-3xl leading-relaxed text-slate-400">مرحباً بك! أنا أستاذك الذكي. اطرح أي سؤال وسأقوم بمساعدتك فوراً بدقة عالية.</p>
                  </div>
                )}
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start items-start gap-6'}`}>
                    {msg.role === 'assistant' && (
                      <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-black border border-white/20 flex items-center justify-center mt-2 shadow-lg">
                        <EduAiLogo className="w-full h-full p-2" />
                      </div>
                    )}
                    <div className={`max-w-[85%] rounded-[3.5rem] p-8 sm:p-12 shadow-2xl relative animate-in fade-in slide-in-from-bottom-5 duration-700 ${msg.role === 'user' ? 'bg-white text-black rounded-tr-none' : 'bg-[#0a0a0a] border border-white/10 rounded-tl-none text-white'}`}>
                      {msg.role === 'assistant' ? (
                        <>
                          <FormattedText text={msg.content} />
                          {msg.imageUrl && (
                            <div className="mt-8 rounded-[2.5rem] overflow-hidden border border-white/10 shadow-2xl group relative">
                              <img src={msg.imageUrl} alt="AI Generated" className="w-full h-auto transition-transform duration-700 group-hover:scale-105" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                                <span className="text-white font-black text-sm">تم التوليد بواسطة Gemini 3 Pro Image</span>
                              </div>
                            </div>
                          )}
                        </>
                      ) : <div className="text-2xl sm:text-3xl font-black leading-tight">{msg.content}</div>}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start items-start gap-6 animate-pulse">
                    <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-black border border-white/20 flex items-center justify-center mt-2 shadow-lg">
                        <EduAiLogo className="w-full h-full p-2" />
                    </div>
                    <div className="bg-[#0a0a0a] p-8 rounded-[2.5rem] rounded-tl-none border border-white/10 shadow-xl">
                      <span className="text-xl font-black text-slate-400">يفكر...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
            </div>
            <div className="p-8 sm:p-12 bg-black border-t border-white/10 shrink-0 z-20">
                <div className="max-w-6xl mx-auto flex items-center gap-6 bg-white/5 p-4 rounded-[4rem] border border-white/10 focus-within:border-white/40 shadow-inner transition-all">
                  <textarea 
                    value={input} 
                    onChange={(e) => setInput(e.target.value)} 
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} 
                    placeholder={"اطرح سؤالاً، اطلب شرحاً، أو استفسر عن أي نقطة..."} 
                    className="flex-1 bg-transparent border-none focus:ring-0 text-xl sm:text-3xl font-bold resize-none py-6 px-10 text-right text-white placeholder-slate-600" 
                  />
                  <button onClick={() => sendMessage()} disabled={isLoading || !input.trim()} className="p-8 rounded-full transition-all bg-white/10 text-white hover:bg-white/20 border border-white/10 active:scale-90 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
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
