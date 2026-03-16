import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  Brain, 
  MessageSquare, 
  Trophy,
  ChevronRight,
  Search,
  Bell,
  User,
  Flame,
  Star,
  PlayCircle,
  CheckCircle2,
  AlertCircle,
  Send,
  X,
  Languages,
  Book,
  Globe,
  History,
  Map,
  Moon,
  Calculator,
  ArrowLeft,
  Sparkles,
  HelpCircle,
  Calendar,
  Zap,
  Download,
  FileText,
  PenTool,
  Maximize,
  Minimize
} from 'lucide-react';
import { CURRICULUM, Subject, Lesson } from './data/curriculum';
import { philosophyBookContent } from './data/philosophyBookContent';
import { cn } from './lib/utils';
import { explainLesson, suggestQuestions, generateQuiz, getStudyAssistantResponse, generateExam, generateEssay } from './services/gemini';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// --- Components ---

const GlassCard = ({ children, className, glow, onClick }: any) => (
  <div 
    onClick={onClick}
    className={cn(
      "glass-card p-4 md:p-5 transition-all duration-300", 
      glow && "purple-glow", 
      onClick && "cursor-pointer hover:border-brand-purple/40 hover:scale-[1.01]",
      className
    )}
  >
    {children}
  </div>
);

const SubjectIcon = ({ name, size = 24, className }: any) => {
  switch (name) {
    case 'BookOpen': return <BookOpen size={size} className={className} />;
    case 'Brain': return <Brain size={size} className={className} />;
    case 'Languages': return <Languages size={size} className={className} />;
    case 'Book': return <Book size={size} className={className} />;
    case 'Globe': return <Globe size={size} className={className} />;
    case 'History': return <History size={size} className={className} />;
    case 'Map': return <Map size={size} className={className} />;
    case 'Moon': return <Moon size={size} className={className} />;
    case 'Calculator': return <Calculator size={size} className={className} />;
    default: return <BookOpen size={size} className={className} />;
  }
};

// --- Main App ---

export const parseText = (content: string) => {
  let formatted = content;
  formatted = formatted.replace(/<title>(.*?)<\/title>/g, '<h3 class="text-lg font-black text-white mt-4 mb-3 border-r-4 border-brand-purple pr-3 leading-tight">$1</h3>');
  formatted = formatted.replace(/<subtitle>(.*?)<\/subtitle>/g, '<h4 class="text-base font-black text-brand-purple mt-4 mb-2 flex items-center gap-2 before:content-[\'\'] before:w-1.5 before:h-1.5 before:bg-brand-purple before:rounded-full">$1</h4>');
  formatted = formatted.replace(/<highlight>(.*?)<\/highlight>/g, '<span class="bg-brand-purple/20 text-white px-1 py-0.5 rounded-md font-bold border border-brand-purple/20 shadow-sm text-sm">$1</span>');
  formatted = formatted.replace(/<formula>(.*?)<\/formula>/g, '<div class="bg-zinc-950 border border-brand-purple/20 p-3 rounded-xl my-3 font-mono text-center text-brand-purple text-lg shadow-lg shadow-brand-purple/5">$1</div>');
  
  // Handle bullet points - more robustly
  // First, ensure points separated by " - " on the same line are split into new lines
  formatted = formatted.replace(/([^\n])\s*-\s+([^\n])/g, '$1\n- $2');

  // Handle bullet points with bolding for terms before colon
  formatted = formatted.replace(/^[ \t]*[-*•][ \t]+(.*?):[ \t]*(.*)/gm, '<div class="flex items-start gap-2 mb-2 pr-2"><span class="text-brand-purple mt-1.5 font-bold text-[10px] shrink-0">•</span><span class="text-zinc-200 leading-relaxed text-sm"><strong class="text-white font-bold">$1:</strong> $2</span></div>');
  
  // Handle regular bullet points
  formatted = formatted.replace(/^[ \t]*[-*•][ \t]+(.*)/gm, '<div class="flex items-start gap-2 mb-2 pr-2"><span class="text-brand-purple mt-1.5 font-bold text-[10px] shrink-0">•</span><span class="text-zinc-200 leading-relaxed text-sm">$1</span></div>');
  
  // Handle numbered lists with bolding for terms before colon
  formatted = formatted.replace(/^[ \t]*(\d+)\.[ \t]+(.*?):[ \t]*(.*)/gm, '<div class="flex items-start gap-2 mb-2 pr-2"><span class="text-brand-purple mt-0.5 font-black text-[10px] shrink-0">$1.</span><span class="text-zinc-200 leading-relaxed text-sm"><strong class="text-white font-bold">$2:</strong> $3</span></div>');

  // Handle regular numbered lists
  formatted = formatted.replace(/^[ \t]*(\d+)\.[ \t]+(.*)/gm, '<div class="flex items-start gap-2 mb-2 pr-2"><span class="text-brand-purple mt-0.5 font-black text-[10px] shrink-0">$1.</span><span class="text-zinc-200 leading-relaxed text-sm">$2</span></div>');
  
  // Convert remaining newlines to <br /> but only if they are not inside a div we just created
  // Actually, a simpler way is to wrap non-list lines in paragraphs or just use <br />
  const lines = formatted.split('\n');
  formatted = lines.map(line => {
    if (line.startsWith('<div')) return line;
    if (line.trim() === '') return '<div class="h-2"></div>';
    return `<div>${line}</div>`;
  }).join('');

  return formatted;
};

const AIChatMessage = ({ text, role, isFirst }: { text: string, role: string, isFirst?: boolean }) => {
  const messageRef = useRef<HTMLDivElement>(null);

  const downloadAsPDF = async () => {
    if (!messageRef.current) return;
    
    try {
      const canvas = await html2canvas(messageRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#18181b', // Match zinc-900
        ignoreElements: (element) => element.classList.contains('pdf-exclude')
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`dzbac-lesson-${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn("flex", role === 'user' ? "justify-end" : "justify-start")}
    >
      <div 
        ref={messageRef}
        className={cn(
          "p-3 md:p-4 rounded-2xl ai-message-text shadow-lg leading-relaxed text-sm md:text-base relative group",
          role === 'user' 
            ? "max-w-[85%] bg-brand-purple text-black rounded-tr-none shadow-brand-purple/20 font-medium ml-auto" 
            : "max-w-[95%] bg-zinc-800/95 text-zinc-100 rounded-tl-none border border-white/5 mr-auto"
        )} dir="rtl">
        {role === 'assistant' && (
          <div className="flex items-center justify-between gap-2 mb-3 border-b border-white/5 pb-2 pdf-exclude">
            <div className="flex items-center gap-2 text-brand-purple font-bold text-xs">
              {isFirst ? <Sparkles size={14} /> : <Brain size={14} />}
              {isFirst ? "المعلم الذكي" : "توضيح إضافي"}
            </div>
            <button 
              onClick={downloadAsPDF}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white group/btn"
              title="تحميل كـ PDF"
            >
              <Download size={14} />
            </button>
          </div>
        )}
        <div 
          className="space-y-2"
          dangerouslySetInnerHTML={{ __html: parseText(text) }} 
        />
      </div>
    </motion.div>
  );
};

export default function App() {
  const [view, setView] = useState<'subjects' | 'lessons' | 'study'>('subjects');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  
  // User Stats
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [lessonProgress, setLessonProgress] = useState(0);
  
  // Study State
  const [messages, setMessages] = useState<any[]>([]);
  const [currentExplanation, setCurrentExplanation] = useState<string>('');
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [suggestedQuestionsList, setSuggestedQuestionsList] = useState<string[]>([]);
  const [extractedVocabulary, setExtractedVocabulary] = useState<{word: string, meaning: string}[]>([]);
  const [extractedDates, setExtractedDates] = useState<{date: string, event: string}[]>([]);
  const [quizMode, setQuizMode] = useState(false);
  const [quizData, setQuizData] = useState<any[]>([]);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [quizQuestionCount, setQuizQuestionCount] = useState(5);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [showReferences, setShowReferences] = useState(false);
  
  const [examMode, setExamMode] = useState(false);
  const [examFocusPoints, setExamFocusPoints] = useState('');
  const [loadingExam, setLoadingExam] = useState(false);
  const [generatedExam, setGeneratedExam] = useState('');

  const [showMethodologies, setShowMethodologies] = useState(false);
  const [essayMode, setEssayMode] = useState(false);
  const [generatedEssay, setGeneratedEssay] = useState('');
  const [essayTopic, setEssayTopic] = useState('');
  const [essayType, setEssayType] = useState('الجدل');
  const [loadingEssay, setLoadingEssay] = useState(false);
  const [isFullScreenChat, setIsFullScreenChat] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const examRef = useRef<HTMLDivElement>(null);
  const essayRef = useRef<HTMLDivElement>(null);

  const downloadEssayAsPDF = async () => {
    if (!essayRef.current) return;
    
    try {
      const canvas = await html2canvas(essayRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#18181b',
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`dzbac-essay-${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
    }
  };

  const downloadExamAsPDF = async () => {
    if (!examRef.current) return;
    
    try {
      const canvas = await html2canvas(examRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#18181b', // Match zinc-900
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      pdf.save(`dzbac-exam-${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // XP and Level Logic
  useEffect(() => {
    const nextLevelXp = level * 100;
    if (xp >= nextLevelXp) {
      setLevel(prev => prev + 1);
      setXp(prev => prev - nextLevelXp);
    }
  }, [xp, level]);

  const handleSelectSubject = (subject: Subject) => {
    setSelectedSubject(subject);
    setView('lessons');
  };

  const handleSelectLesson = async (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setView('study');
    setIsFullScreenChat(false);
    setMessages([]);
    setExtractedVocabulary([]);
    setExtractedDates([]);
    setIsTyping(true);
    setSuggestedQuestionsList([]);
    setQuizMode(false);
    setExamMode(false);
    setGeneratedExam('');
    setExamFocusPoints('');
    setLessonProgress(0); // Start at 0

    try {
      // 1. Get AI Explanation
      const contentToExplain = (selectedSubject?.id === 'philosophy' && philosophyBookContent[lesson.id]) 
        ? philosophyBookContent[lesson.id] 
        : lesson.content;
      const result = await explainLesson(lesson.id, lesson.titleAr, contentToExplain, selectedSubject?.id === 'philosophy');
      setCurrentExplanation(result.explanation);
      setMessages([{ role: 'assistant', text: result.explanation }]);
      
      // Store extracted data
      setExtractedVocabulary(result.vocabulary || []);
      setExtractedDates(result.dates || []);

      setLessonProgress(25); // Initial explanation gives 25% progress
      setXp(prev => prev + 10);
      
      // 2. Get Suggested Questions
      const questions = await suggestQuestions(lesson.titleAr, contentToExplain);
      setSuggestedQuestionsList(questions);
    } catch (e) {
      setMessages([{ role: 'assistant', text: "عذراً، حدث خطأ أثناء تحميل الشرح. حاول مرة أخرى." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSend = async (text?: string) => {
    const msg = text || input;
    if (!msg.trim() || !selectedLesson) return;
    
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setIsTyping(true);
    setSuggestedQuestionsList([]);
    
    // Increase progress slightly on interaction
    setLessonProgress(prev => Math.min(prev + 5, 100));
    setXp(prev => prev + 5);

    try {
      const response = await getStudyAssistantResponse(msg, `Lesson: ${selectedLesson.titleAr}. Content: ${currentExplanation || selectedLesson.content}`, selectedSubject?.id === 'philosophy');
      setMessages(prev => [...prev, { role: 'assistant', text: response }]);
      
      // Fetch new suggestions after AI response
      const newQuestions = await suggestQuestions(selectedLesson.titleAr, selectedLesson.content + "\nRecent conversation: " + msg);
      setSuggestedQuestionsList(newQuestions);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', text: "عذراً، لم أستطع معالجة طلبك." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleStartQuiz = async () => {
    if (!selectedLesson) return;
    setLoadingQuiz(true);
    setQuizMode(true);
    setQuizSubmitted(false);
    setUserAnswers([]);
    try {
      const data = await generateQuiz(selectedLesson.titleAr, currentExplanation || selectedLesson.content, quizQuestionCount);
      setQuizData(data);
      setLessonProgress(prev => Math.min(prev + 10, 100));
      setXp(prev => prev + 20);
    } catch (e) {
      console.error(e);
      setQuizMode(false);
    } finally {
      setLoadingQuiz(false);
    }
  };

  const handleSelectAnswer = (questionIndex: number, answerIndex: number) => {
    if (quizSubmitted) return;
    const newAnswers = [...userAnswers];
    newAnswers[questionIndex] = answerIndex;
    setUserAnswers(newAnswers);
  };

  const handleSubmitQuiz = () => {
    setQuizSubmitted(true);
    // Calculate score and add XP
    const score = quizData.reduce((acc, q, i) => acc + (userAnswers[i] === q.correctAnswerIndex ? 1 : 0), 0);
    setXp(prev => prev + (score * 5));
  };

  const handleStartExam = async () => {
    if (!selectedLesson || !examFocusPoints.trim()) return;
    setLoadingExam(true);
    try {
      const data = await generateExam(selectedLesson.titleAr, currentExplanation || selectedLesson.content, examFocusPoints);
      setGeneratedExam(data);
      setLessonProgress(prev => Math.min(prev + 15, 100));
      setXp(prev => prev + 30);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingExam(false);
    }
  };

  const handleStartEssay = async () => {
    if (!selectedLesson || !essayTopic.trim()) return;
    setLoadingEssay(true);
    try {
      const data = await generateEssay(selectedLesson.titleAr, currentExplanation || selectedLesson.content, essayType, essayTopic);
      setGeneratedEssay(data);
      setLessonProgress(prev => Math.min(prev + 20, 100));
      setXp(prev => prev + 40);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingEssay(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 font-sans selection:bg-brand-purple/30">
      {/* Header */}
      <header className="h-16 border-b border-white/5 flex items-center justify-between px-4 md:px-8 sticky top-0 bg-black/80 backdrop-blur-xl z-50">
        {/* Header content removed per user request */}
      </header>

      <main className={cn(
        "max-w-7xl mx-auto w-full",
        view === 'study' ? "p-2 md:p-4 pt-0 md:pt-0" : "p-3 md:p-6"
      )}>
        <AnimatePresence mode="wait">
          {/* View 1: Subjects Grid */}
          {view === 'subjects' && (
            <motion.div 
              key="subjects"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="text-center space-y-6">
                {/* Title removed per user request */}
                <p className="text-zinc-400 max-w-2xl mx-auto text-lg leading-relaxed">
                  استكشف جميع المواد المقررة لشعبة اللغات الأجنبية مع شروحات ذكية مدعومة بالذكاء الاصطناعي واختبارات تفاعلية مخصصة.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {CURRICULUM.map((subject) => (
                  <GlassCard 
                    key={subject.id} 
                    glow 
                    onClick={() => handleSelectSubject(subject)}
                    className="group relative overflow-hidden"
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <div className={cn("p-4 rounded-2xl bg-zinc-800 transition-all duration-500 group-hover:bg-brand-purple group-hover:text-black group-hover:scale-110 group-hover:rotate-3")}>
                        <SubjectIcon name={subject.icon} size={32} />
                      </div>
                      <div>
                        <h3 className="text-xl font-extrabold text-white">{subject.nameAr}</h3>
                        <p className="text-sm text-zinc-500 font-medium">{subject.name}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-zinc-400">{subject.units.length} وحدات دراسية</span>
                      <div className="flex items-center gap-1.5 text-brand-purple opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                        <span>ابدأ الآن</span>
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            </motion.div>
          )}

          {/* View 2: Lessons List */}
          {view === 'lessons' && selectedSubject && (
            <motion.div 
              key="lessons"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 md:space-y-8"
            >
              <button 
                onClick={() => setView('subjects')}
                className="flex items-center gap-2 text-zinc-400 hover:text-white transition-all font-bold group text-sm md:text-base"
              >
                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> العودة إلى قائمة المواد
              </button>

              <div className="flex items-center gap-4 md:gap-6">
                <div className="p-3 md:p-4 rounded-2xl bg-zinc-800 text-brand-purple shadow-xl">
                  <SubjectIcon name={selectedSubject.icon} size={28} />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-black text-white">{selectedSubject.nameAr}</h1>
                  <p className="text-sm text-zinc-500 font-bold mt-1">اختر درساً للبدء في المراجعة الذكية</p>
                </div>
              </div>

              <div className="space-y-6 md:space-y-8">
                {selectedSubject.units.map((unit) => (
                  <div key={unit.id} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-6 w-1.5 bg-brand-purple rounded-full" />
                      <h2 className="text-xl font-black text-zinc-200">{unit.titleAr}</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      {unit.lessons.map((lesson) => (
                        <GlassCard 
                          key={lesson.id} 
                          onClick={() => handleSelectLesson(lesson)}
                          className="flex items-center justify-between p-4 group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center text-brand-purple group-hover:bg-brand-purple group-hover:text-black transition-all">
                              <PlayCircle size={18} />
                            </div>
                            <span className="font-bold text-sm md:text-base">{lesson.titleAr}</span>
                          </div>
                          <ChevronRight size={18} className="text-zinc-600 group-hover:text-white transition-colors" />
                        </GlassCard>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* View 3: Study Chat */}
          {view === 'study' && selectedLesson && (
            <motion.div 
              key="study"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] flex flex-col gap-2"
            >
              <div className="flex flex-col md:flex-row items-center justify-between gap-2 bg-zinc-900/50 p-2 rounded-xl border border-white/5 shrink-0">
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <button 
                    onClick={() => {
                      setView('lessons');
                      setIsFullScreenChat(false);
                    }}
                    className="flex items-center gap-1 text-zinc-400 hover:text-white transition-all font-bold group bg-zinc-800/50 px-2 py-1 rounded-lg border border-white/5 text-xs"
                  >
                    <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> العودة
                  </button>
                  
                  <div className="min-w-0">
                    <h2 className="text-xs md:text-sm font-black text-white truncate">{selectedLesson.titleAr}</h2>
                    <div className="flex items-center gap-1.5">
                      <p className="text-[9px] text-brand-purple font-black uppercase tracking-wider">{selectedSubject?.nameAr}</p>
                      <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                      <p className="text-[9px] text-zinc-500 font-black">تقدمك: {lessonProgress}%</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 w-full md:w-auto justify-end overflow-x-auto pb-1 md:pb-0 hide-scrollbar">
                  <div className="flex items-center gap-0.5 bg-zinc-800/50 p-0.5 rounded-lg border border-white/5 shrink-0 mr-1">
                    {[5, 10, 15, 20, 25].map(count => (
                      <button
                        key={count}
                        onClick={() => setQuizQuestionCount(count)}
                        className={cn(
                          "px-1.5 py-0.5 rounded-md text-[9px] font-bold transition-all",
                          quizQuestionCount === count ? "bg-brand-purple text-black" : "text-zinc-500 hover:text-zinc-300"
                        )}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                  <button 
                    onClick={() => setShowReferences(true)}
                    className="shrink-0 flex items-center justify-center gap-1 bg-brand-purple/10 text-brand-purple px-2 py-1 rounded-lg font-bold text-[10px] md:text-xs hover:bg-brand-purple/20 transition-all border border-brand-purple/20 active:scale-95"
                  >
                    المفردات <Star size={12} />
                  </button>
                  <button 
                    onClick={() => {
                      setExamMode(true);
                      setGeneratedExam('');
                      setExamFocusPoints('');
                    }}
                    className="shrink-0 flex items-center justify-center gap-1 bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded-lg font-bold text-[10px] md:text-xs hover:bg-emerald-500/20 transition-all border border-emerald-500/20 active:scale-95"
                  >
                    موضوع <FileText size={12} />
                  </button>
                  {selectedSubject?.id === 'philosophy' && (
                    <>
                      <button 
                        onClick={() => setShowMethodologies(true)}
                        className="shrink-0 flex items-center justify-center gap-1 bg-blue-500/10 text-blue-400 px-2 py-1 rounded-lg font-bold text-[10px] md:text-xs hover:bg-blue-500/20 transition-all border border-blue-500/20 active:scale-95"
                      >
                        المنهجيات <BookOpen size={12} />
                      </button>
                      <button 
                        onClick={() => {
                          setEssayMode(true);
                          setGeneratedEssay('');
                          setEssayTopic('');
                          setEssayType(selectedLesson?.methodologies?.[0] || 'الجدل');
                        }}
                        className="shrink-0 flex items-center justify-center gap-1 bg-amber-500/10 text-amber-400 px-2 py-1 rounded-lg font-bold text-[10px] md:text-xs hover:bg-amber-500/20 transition-all border border-amber-500/20 active:scale-95"
                      >
                        إنتاج مقالة <PenTool size={12} />
                      </button>
                    </>
                  )}
                  <button 
                    onClick={handleStartQuiz}
                    disabled={loadingQuiz}
                    className="shrink-0 flex items-center justify-center gap-1 bg-white text-black px-2 py-1 rounded-lg font-bold text-[10px] md:text-xs hover:bg-zinc-200 transition-all shadow-lg shadow-white/5 disabled:opacity-50 active:scale-95"
                  >
                    {loadingQuiz ? "..." : "اختبار"} <Brain size={12} />
                  </button>
                </div>
              </div>

              <div className="flex-1 flex flex-col min-h-0">
                {/* Chat Panel - Now Full Width */}
                <GlassCard 
                  className={cn(
                    "flex flex-col p-0 overflow-hidden relative border-white/5 transition-all duration-300",
                    isFullScreenChat 
                      ? "fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl rounded-none max-w-none w-full h-full" 
                      : "flex-1 max-w-5xl mx-auto w-full"
                  )} 
                  glow
                >
                  {/* Full Screen Toggle Button */}
                  <div 
                    className={cn(
                      "absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-3 transition-all",
                      isFullScreenChat ? "bg-zinc-900/80 backdrop-blur-md border-b border-white/5" : "bg-transparent pointer-events-none"
                    )}
                    dir="rtl"
                  >
                    {isFullScreenChat ? (
                      <div className="flex items-center gap-2 text-white font-bold text-sm">
                        <Sparkles size={16} className="text-brand-purple" />
                        المساعد الذكي - {selectedLesson?.titleAr}
                      </div>
                    ) : <div />}
                    
                    <button
                      onClick={() => setIsFullScreenChat(!isFullScreenChat)}
                      className="p-2 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg backdrop-blur-md transition-all border border-white/10 shadow-lg pointer-events-auto"
                      title={isFullScreenChat ? "تصغير" : "تكبير"}
                    >
                      {isFullScreenChat ? <Minimize size={16} /> : <Maximize size={16} />}
                    </button>
                  </div>

                  <div className={cn("flex-1 overflow-y-auto p-3 md:p-4", isFullScreenChat ? "pt-16" : "pt-12")}>
                    <div className="max-w-5xl mx-auto space-y-3">
                      {messages.map((msg, i) => (
                        <AIChatMessage key={i} text={msg.text} role={msg.role} isFirst={i === 0} />
                      ))}
                      
                      {/* Suggested Questions inside Chat */}
                      {messages.length > 0 && messages[messages.length - 1].role === 'assistant' && suggestedQuestionsList.length > 0 && !isTyping && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex flex-wrap gap-1.5 justify-start"
                          dir="rtl"
                        >
                          {suggestedQuestionsList.map((q, i) => (
                            <button
                              key={i}
                              onClick={() => handleSend(q)}
                              className="text-[10px] md:text-xs bg-brand-purple/10 hover:bg-brand-purple/20 text-brand-purple border border-brand-purple/10 px-2.5 py-1.5 rounded-full transition-all active:scale-95 text-right"
                            >
                              {q}
                            </button>
                          ))}
                        </motion.div>
                      )}

                      {isTyping && (
                        <div className="flex justify-start">
                          <div className="bg-zinc-800/90 p-3 rounded-2xl rounded-tl-none flex flex-col gap-2 border border-white/5 shadow-lg">
                            <div className="flex items-center gap-2 text-brand-purple font-bold text-[10px]">
                              <Sparkles size={12} className="animate-pulse" />
                              جاري التحضير...
                            </div>
                            <div className="flex gap-1">
                              <div className="w-1.5 h-1.5 bg-brand-purple rounded-full animate-bounce" />
                              <div className="w-1.5 h-1.5 bg-brand-purple rounded-full animate-bounce [animation-delay:0.2s]" />
                              <div className="w-1.5 h-1.5 bg-brand-purple rounded-full animate-bounce [animation-delay:0.4s]" />
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                  </div>

                  {/* Input Area */}
                  <div className="p-2 md:p-3 bg-zinc-900/90 border-t border-white/5 backdrop-blur-2xl shrink-0">
                    <div className="relative max-w-5xl mx-auto">
                      <input 
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="اسأل أي سؤال..."
                        className="w-full bg-zinc-800/50 border border-white/5 rounded-xl py-2.5 px-4 pr-10 focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple/30 transition-all text-right text-xs md:text-sm font-medium"
                        dir="rtl"
                      />
                      <button 
                        onClick={() => handleSend()}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-brand-purple text-black rounded-lg hover:bg-brand-purple/80 transition-all shadow-md shadow-brand-purple/20 active:scale-90"
                      >
                        <Send size={14} />
                      </button>
                    </div>
                  </div>
                </GlassCard>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* References Modal */}
      <AnimatePresence>
        {showReferences && selectedLesson && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-6"
          >
            <GlassCard className="max-w-2xl w-full p-5 md:p-6 relative max-h-[85vh] overflow-y-auto flex flex-col" glow>
              <button 
                onClick={() => setShowReferences(false)} 
                className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors z-10"
              >
                <X size={20} />
              </button>
              
              <div className="text-center mb-6 shrink-0">
                <div className="w-12 h-12 bg-brand-purple/20 rounded-2xl flex items-center justify-center mx-auto mb-3 text-brand-purple">
                  <Star size={24} />
                </div>
                <h2 className="text-xl md:text-2xl font-bold">المفردات والتواريخ</h2>
                <p className="text-xs md:text-sm text-zinc-500 mt-1">{selectedLesson.titleAr}</p>
              </div>

              <div className="space-y-6 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                {/* Progress in Modal */}
                <div className="bg-white/5 p-4 md:p-5 rounded-2xl border border-white/5">
                  <div className="flex justify-between text-xs md:text-sm font-black mb-3">
                    <span className="text-zinc-500">مستوى الاستيعاب</span>
                    <span className="text-brand-purple">{lessonProgress}%</span>
                  </div>
                  <div className="h-2 md:h-3 bg-zinc-800 rounded-full overflow-hidden shadow-inner">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${lessonProgress}%` }}
                      className="h-full bg-brand-purple rounded-full shadow-[0_0_20px_rgba(139,92,246,0.5)]" 
                    />
                  </div>
                </div>

                {/* Quick Reference Content */}
                {(selectedLesson.dates || extractedDates.length > 0) && (
                  <div className="space-y-3">
                    <h4 className="text-base md:text-lg font-black text-white flex items-center gap-2" dir="rtl">
                      <Calendar size={18} className="text-brand-purple" /> التواريخ والأحداث
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {[...(selectedLesson.dates || []), ...extractedDates].map((d, i) => (
                        <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5" dir="rtl">
                          <span className="font-black text-brand-purple text-sm md:text-base">{d.date}</span>
                          <span className="text-zinc-300 font-bold text-xs md:text-sm">{d.event}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(selectedLesson.vocabulary || extractedVocabulary.length > 0) && (
                  <div className="space-y-3">
                    <h4 className="text-base md:text-lg font-black text-white flex items-center gap-2" dir="rtl">
                      <BookOpen size={18} className="text-emerald-400" /> المفردات والمصطلحات
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {[...(selectedLesson.vocabulary || []), ...extractedVocabulary].map((v, i) => (
                        <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/5" dir="rtl">
                          <span className="font-black text-emerald-400 text-sm md:text-base">{v.word}</span>
                          <span className="text-zinc-300 font-bold text-xs md:text-sm">{v.meaning}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedLesson.laws && (
                  <div className="space-y-3">
                    <h4 className="text-base md:text-lg font-black text-white flex items-center gap-2" dir="rtl">
                      <Zap size={18} className="text-amber-400" /> القوانين والقواعد
                    </h4>
                    <div className="space-y-2">
                      {selectedLesson.laws.map((l, i) => (
                        <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2" dir="rtl">
                          <div className="font-black text-amber-400 text-sm md:text-base">{l.name}</div>
                          <div className="font-mono text-zinc-300 bg-black/30 p-3 rounded-xl text-center text-lg md:text-xl border border-white/5">{l.formula}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quiz Modal */}
      <AnimatePresence>
        {quizMode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-6"
          >
            <GlassCard className="max-w-2xl w-full p-6 md:p-8 relative max-h-[90vh] overflow-y-auto flex flex-col" glow>
              <button 
                onClick={() => setQuizMode(false)} 
                className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors z-10"
              >
                <X size={20} />
              </button>
              
              <div className="text-center mb-6 shrink-0">
                <div className="w-12 h-12 bg-brand-purple/20 rounded-2xl flex items-center justify-center mx-auto mb-3 text-brand-purple">
                  <Brain size={24} />
                </div>
                <h2 className="text-xl md:text-2xl font-bold">اختبار سريع</h2>
                <p className="text-xs md:text-sm text-zinc-500 mt-1">{selectedLesson?.titleAr}</p>
              </div>

              {loadingQuiz ? (
                <div className="py-10 md:py-20 text-center space-y-3">
                  <div className="w-8 h-8 md:w-10 md:h-10 border-4 border-brand-purple border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs md:text-sm text-zinc-400 font-medium">جاري توليد {quizQuestionCount} أسئلة مخصصة...</p>
                </div>
              ) : (
                <div className="space-y-6 md:space-y-8 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                  {quizData.map((q, i) => (
                    <div key={i} className="space-y-3 text-right" dir="rtl">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-bold text-sm md:text-base text-zinc-200 leading-snug">{i + 1}. {q.question}</p>
                        {quizSubmitted && (
                          userAnswers[i] === q.correctAnswerIndex ? (
                            <CheckCircle2 className="text-emerald-400 shrink-0 mt-0.5" size={16} />
                          ) : (
                            <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={16} />
                          )
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {q.options.map((opt: string, j: number) => {
                          const isSelected = userAnswers[i] === j;
                          const isCorrect = q.correctAnswerIndex === j;
                          const showResult = quizSubmitted;
                          
                          return (
                            <button 
                              key={j} 
                              onClick={() => handleSelectAnswer(i, j)}
                              disabled={quizSubmitted}
                              className={cn(
                                "p-3 rounded-xl border transition-all text-right text-xs md:text-sm relative overflow-hidden group",
                                !showResult && isSelected && "border-brand-purple bg-brand-purple/10",
                                !showResult && !isSelected && "bg-zinc-800/50 border-white/5 hover:border-brand-purple/40",
                                showResult && isCorrect && "border-emerald-500 bg-emerald-500/10",
                                showResult && isSelected && !isCorrect && "border-red-500 bg-red-500/10",
                                showResult && !isSelected && !isCorrect && "bg-zinc-800/30 border-white/5 opacity-60"
                              )}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className={cn(
                                  "w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black shrink-0",
                                  isSelected ? "bg-brand-purple text-black" : "bg-zinc-700 text-zinc-400"
                                )}>
                                  {String.fromCharCode(65 + j)}
                                </span>
                                <span className="flex-1 leading-snug">{opt}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      {quizSubmitted && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className={cn(
                            "p-3 rounded-xl text-xs md:text-sm leading-relaxed",
                            userAnswers[i] === q.correctAnswerIndex ? "bg-emerald-500/5 text-emerald-200/80" : "bg-red-500/5 text-red-200/80"
                          )}
                        >
                          <div className="font-bold mb-1 flex items-center gap-1.5">
                            <HelpCircle size={12} /> التفسير:
                          </div>
                          {q.explanation}
                        </motion.div>
                      )}
                    </div>
                  ))}
                  
                  {!quizSubmitted ? (
                    <button 
                      onClick={handleSubmitQuiz}
                      disabled={userAnswers.length < quizData.length || userAnswers.includes(undefined as any)}
                      className="w-full bg-brand-purple text-black py-3 rounded-xl font-bold text-sm shadow-xl shadow-brand-purple/20 hover:bg-brand-purple/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                    >
                      تصحيح الاختبار
                    </button>
                  ) : (
                    <div className="space-y-3 mt-4">
                      <div className="p-4 rounded-xl bg-zinc-900 border border-white/5 text-center">
                        <div className="text-xs text-zinc-500 font-bold mb-1">نتيجتك النهائية</div>
                        <div className="text-2xl md:text-3xl font-black text-white">
                          {quizData.reduce((acc, q, i) => acc + (userAnswers[i] === q.correctAnswerIndex ? 1 : 0), 0)} / {quizData.length}
                        </div>
                      </div>
                      <button 
                        onClick={() => setQuizMode(false)}
                        className="w-full bg-zinc-800 text-white py-3 rounded-xl text-sm font-bold hover:bg-zinc-700 transition-all"
                      >
                        إغلاق
                      </button>
                    </div>
                  )}
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Exam Modal */}
      <AnimatePresence>
        {examMode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-6"
          >
            <GlassCard 
              className={cn(
                "w-full relative flex flex-col transition-all duration-500",
                generatedExam ? "max-w-5xl p-4 md:p-6 h-[95vh]" : "max-w-xl p-5 md:p-6 max-h-[90vh] overflow-y-auto"
              )} 
              glow
            >
              <button 
                onClick={() => setExamMode(false)} 
                className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors z-10"
              >
                <X size={20} />
              </button>
              
              {!generatedExam && (
                <div className="text-center shrink-0 mb-6">
                  <div className="bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto text-emerald-400 w-12 h-12 mb-3">
                    <FileText size={24} />
                  </div>
                  <h2 className="font-bold text-xl md:text-2xl">إعداد موضوع اختبار</h2>
                  <p className="text-xs md:text-sm text-zinc-500 mt-1">{selectedLesson?.titleAr}</p>
                </div>
              )}

              {!generatedExam && !loadingExam ? (
                <div className="space-y-4 flex-1 flex flex-col justify-center w-full">
                  <div className="space-y-2 text-right" dir="rtl">
                    <label className="text-sm md:text-base font-bold text-zinc-200">ما هي النقاط التي تريد التركيز عليها في هذا الموضوع؟</label>
                    <p className="text-xs text-zinc-400">مثال: ركز على أسباب الحرب الباردة، أو أريد أسئلة حول الشخصيات والتواريخ فقط.</p>
                    <textarea 
                      value={examFocusPoints}
                      onChange={(e) => setExamFocusPoints(e.target.value)}
                      className="w-full h-24 md:h-32 bg-zinc-800/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 resize-none"
                      placeholder="اكتب النقاط هنا..."
                    />
                  </div>
                  <button 
                    onClick={handleStartExam}
                    disabled={!examFocusPoints.trim()}
                    className="w-full bg-emerald-500 text-white py-3 rounded-xl font-bold text-sm shadow-xl shadow-emerald-500/20 hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    توليد الموضوع
                  </button>
                </div>
              ) : loadingExam ? (
                <div className="py-10 md:py-20 text-center space-y-3 flex-1 flex flex-col items-center justify-center">
                  <div className="w-8 h-8 md:w-10 md:h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs md:text-sm text-zinc-400 font-medium">جاري إعداد موضوع الاختبار بناءً على طلبك...</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col min-h-0 relative">
                  <div className="absolute top-0 left-0 z-10">
                    <button 
                      onClick={downloadExamAsPDF}
                      className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg transition-all border border-white/10 text-xs font-bold shadow-lg"
                    >
                      <Download size={14} /> تحميل PDF
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto pr-1 md:pr-2 custom-scrollbar bg-zinc-900/50 rounded-xl border border-white/5 p-4 md:p-6 mt-1" dir="rtl">
                    <div 
                      ref={examRef}
                      className="space-y-2 text-zinc-200 leading-relaxed text-sm md:text-base bg-zinc-900/50 p-3 md:p-4 rounded-xl"
                      dangerouslySetInnerHTML={{ __html: parseText(generatedExam) }} 
                    />
                  </div>
                  <div className="pt-3 shrink-0">
                    <button 
                      onClick={() => {
                        setGeneratedExam('');
                        setExamFocusPoints('');
                      }}
                      className="w-full bg-zinc-800 text-white py-3 rounded-xl text-sm font-bold hover:bg-zinc-700 transition-all"
                    >
                      إعداد موضوع آخر
                    </button>
                  </div>
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Essay Modal */}
      <AnimatePresence>
        {essayMode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-6"
          >
            <GlassCard 
              className={cn(
                "w-full relative flex flex-col transition-all duration-500",
                generatedEssay ? "max-w-5xl p-4 md:p-6 h-[95vh]" : "max-w-xl p-5 md:p-6 max-h-[90vh] overflow-y-auto"
              )} 
              glow
            >
              <button 
                onClick={() => setEssayMode(false)} 
                className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors z-10"
              >
                <X size={20} />
              </button>
              
              {!generatedEssay && (
                <div className="text-center shrink-0 mb-6">
                  <div className="bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto text-amber-400 w-12 h-12 mb-3">
                    <PenTool size={24} />
                  </div>
                  <h2 className="font-bold text-xl md:text-2xl">إنتاج مقالة فلسفية</h2>
                  <p className="text-xs md:text-sm text-zinc-500 mt-1">{selectedLesson?.titleAr}</p>
                </div>
              )}

              {!generatedEssay && !loadingEssay ? (
                <div className="space-y-4 flex-1 flex flex-col justify-center w-full">
                  <div className="space-y-4 text-right" dir="rtl">
                    <div className="space-y-2">
                      <label className="text-sm md:text-base font-bold text-zinc-200">اختر المنهجية:</label>
                      <select 
                        value={essayType}
                        onChange={(e) => setEssayType(e.target.value)}
                        className="w-full bg-zinc-800/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                      >
                        <option value="الجدل">الطريقة الجدلية</option>
                        <option value="الاستقصاء بالوضع">الاستقصاء بالوضع</option>
                        <option value="الاستقصاء بالرفع">الاستقصاء بالرفع</option>
                        <option value="مقارنة">طريقة المقارنة</option>
                        <option value="تحليل نص">تحليل نص فلسفي</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm md:text-base font-bold text-zinc-200">اكتب نص السؤال أو الموضوع:</label>
                      <textarea 
                        value={essayTopic}
                        onChange={(e) => setEssayTopic(e.target.value)}
                        className="w-full h-24 md:h-32 bg-zinc-800/50 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none"
                        placeholder="مثال: هل الإدراك يعود إلى العوامل الذاتية أم الموضوعية؟"
                      />
                    </div>
                  </div>
                  <button 
                    onClick={handleStartEssay}
                    disabled={!essayTopic.trim()}
                    className="w-full bg-amber-500 text-black py-3 rounded-xl font-bold text-sm shadow-xl shadow-amber-500/20 hover:bg-amber-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    توليد المقالة
                  </button>
                </div>
              ) : loadingEssay ? (
                <div className="py-10 md:py-20 text-center space-y-3 flex-1 flex flex-col items-center justify-center">
                  <div className="w-8 h-8 md:w-10 md:h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs md:text-sm text-zinc-400 font-medium">جاري كتابة المقالة الفلسفية...</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col min-h-0 relative">
                  <div className="absolute top-0 left-0 z-10">
                    <button 
                      onClick={downloadEssayAsPDF}
                      className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg transition-all border border-white/10 text-xs font-bold shadow-lg"
                    >
                      <Download size={14} /> تحميل PDF
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto pr-1 md:pr-2 custom-scrollbar bg-zinc-900/50 rounded-xl border border-white/5 p-4 md:p-6 mt-1" dir="rtl">
                    <div 
                      ref={essayRef}
                      className="space-y-2 text-zinc-200 leading-relaxed text-sm md:text-base bg-zinc-900/50 p-3 md:p-4 rounded-xl"
                      dangerouslySetInnerHTML={{ __html: parseText(generatedEssay) }} 
                    />
                  </div>
                  <div className="pt-3 shrink-0">
                    <button 
                      onClick={() => {
                        setGeneratedEssay('');
                        setEssayTopic('');
                      }}
                      className="w-full bg-zinc-800 text-white py-3 rounded-xl text-sm font-bold hover:bg-zinc-700 transition-all"
                    >
                      إنتاج مقالة أخرى
                    </button>
                  </div>
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Methodologies Modal */}
      <AnimatePresence>
        {showMethodologies && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-6"
          >
            <GlassCard className="max-w-2xl w-full p-5 md:p-6 relative max-h-[85vh] overflow-y-auto flex flex-col" glow>
              <button 
                onClick={() => setShowMethodologies(false)} 
                className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors z-10"
              >
                <X size={20} />
              </button>
              
              <div className="text-center mb-6 shrink-0">
                <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3 text-blue-400">
                  <BookOpen size={24} />
                </div>
                <h2 className="text-xl md:text-2xl font-bold">المنهجيات الفلسفية</h2>
                <p className="text-xs md:text-sm text-zinc-500 mt-1">دليل كتابة المقالات الفلسفية</p>
              </div>

              <div className="space-y-4 flex-1 overflow-y-auto pr-1 custom-scrollbar" dir="rtl">
                <div className={cn(
                  "p-4 rounded-xl border transition-all",
                  selectedLesson?.methodologies?.includes("الجدل") 
                    ? "bg-emerald-500/10 border-emerald-500/20" 
                    : "bg-white/5 border-white/10"
                )}>
                  <h3 className={cn("font-bold text-lg mb-2", selectedLesson?.methodologies?.includes("الجدل") ? "text-emerald-400" : "text-blue-400")}>الطريقة الجدلية</h3>
                  <p className="text-sm text-zinc-300 leading-relaxed mb-2">تستخدم عندما يكون هناك موقفان متعارضان حول قضية واحدة (هل...؟).</p>
                  <ul className="text-xs text-zinc-400 space-y-1 list-disc list-inside">
                    <li><strong className="text-white">طرح المشكلة:</strong> تمهيد، إبراز العناد الفلسفي، طرح السؤال.</li>
                    <li><strong className="text-white">محاولة حل المشكلة:</strong>
                      <ul className="pr-4 mt-1 space-y-1">
                        <li>- الموقف الأول (الحجج والنقد)</li>
                        <li>- الموقف الثاني (الحجج والنقد)</li>
                        <li>- التركيب (تغليب، توفيق، أو تجاوز)</li>
                      </ul>
                    </li>
                    <li><strong className="text-white">حل المشكلة:</strong> استنتاج نهائي وإجابة عن السؤال.</li>
                  </ul>
                </div>

                <div className={cn(
                  "p-4 rounded-xl border transition-all",
                  selectedLesson?.methodologies?.includes("الاستقصاء بالوضع") 
                    ? "bg-emerald-500/10 border-emerald-500/20" 
                    : "bg-white/5 border-white/10"
                )}>
                  <h3 className={cn("font-bold text-lg mb-2", selectedLesson?.methodologies?.includes("الاستقصاء بالوضع") ? "text-emerald-400" : "text-blue-400")}>الاستقصاء بالوضع</h3>
                  <p className="text-sm text-zinc-300 leading-relaxed mb-2">تستخدم للدفاع عن أطروحة تبدو خاطئة (دافع عن الأطروحة القائلة...).</p>
                  <ul className="text-xs text-zinc-400 space-y-1 list-disc list-inside">
                    <li><strong className="text-white">طرح المشكلة:</strong> تمهيد، الفكرة الشائعة، الفكرة النقيض (الأطروحة)، طرح السؤال.</li>
                    <li><strong className="text-white">محاولة حل المشكلة:</strong>
                      <ul className="pr-4 mt-1 space-y-1">
                        <li>- عرض منطق الأطروحة</li>
                        <li>- الدفاع عنها بحجج شخصية جديدة</li>
                        <li>- نقد خصوم الأطروحة</li>
                      </ul>
                    </li>
                    <li><strong className="text-white">حل المشكلة:</strong> التأكيد على مشروعية الدفاع وصحة الأطروحة.</li>
                  </ul>
                </div>

                <div className={cn(
                  "p-4 rounded-xl border transition-all",
                  selectedLesson?.methodologies?.includes("مقارنة") 
                    ? "bg-emerald-500/10 border-emerald-500/20" 
                    : "bg-white/5 border-white/10"
                )}>
                  <h3 className={cn("font-bold text-lg mb-2", selectedLesson?.methodologies?.includes("مقارنة") ? "text-emerald-400" : "text-blue-400")}>طريقة المقارنة</h3>
                  <p className="text-sm text-zinc-300 leading-relaxed mb-2">تستخدم لبيان العلاقة بين مفهومين (قارن بين... و...).</p>
                  <ul className="text-xs text-zinc-400 space-y-1 list-disc list-inside">
                    <li><strong className="text-white">طرح المشكلة:</strong> تمهيد، الحذر من المظاهر، طرح السؤال.</li>
                    <li><strong className="text-white">محاولة حل المشكلة:</strong>
                      <ul className="pr-4 mt-1 space-y-1">
                        <li>- أوجه الاختلاف</li>
                        <li>- أوجه التشابه</li>
                        <li>- أوجه التداخل (طبيعة العلاقة)</li>
                      </ul>
                    </li>
                    <li><strong className="text-white">حل المشكلة:</strong> استنتاج يبرز نسبة الترابط بين المفهومين.</li>
                  </ul>
                </div>
                
                <div className={cn(
                  "p-4 rounded-xl border transition-all",
                  selectedLesson?.methodologies?.includes("تحليل نص") 
                    ? "bg-emerald-500/10 border-emerald-500/20" 
                    : "bg-white/5 border-white/10"
                )}>
                  <h3 className={cn("font-bold text-lg mb-2", selectedLesson?.methodologies?.includes("تحليل نص") ? "text-emerald-400" : "text-blue-400")}>تحليل نص فلسفي</h3>
                  <p className="text-sm text-zinc-300 leading-relaxed mb-2">تستخدم لاستخراج أفكار نص فلسفي ومناقشتها.</p>
                  <ul className="text-xs text-zinc-400 space-y-1 list-disc list-inside">
                    <li><strong className="text-white">طرح المشكلة:</strong> تمهيد، الإطار الفلسفي للنص، الدوافع، طرح السؤال.</li>
                    <li><strong className="text-white">محاولة حل المشكلة:</strong>
                      <ul className="pr-4 mt-1 space-y-1">
                        <li>- موقف صاحب النص</li>
                        <li>- الحجج المعتمدة في النص</li>
                        <li>- المناقشة والتقييم (نقد موقف صاحب النص)</li>
                      </ul>
                    </li>
                    <li><strong className="text-white">حل المشكلة:</strong> استنتاج نهائي حول قيمة النص.</li>
                  </ul>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
