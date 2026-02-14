import React, { useState, useEffect, useRef } from 'react';
import { Specialty, Subject, AIMode, Message, Lesson, NavigationStep } from './types';
import { SPECIALTIES, SUBJECTS } from './constants';
import { GeminiService } from './services/geminiService';
import { supabase } from './services/supabaseClient';

// --- UI Components ---

const EduAiLogo: React.FC<{ className?: string }> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg"
         fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M50 10 L95 32 L50 54 L5 32 Z" />
        <path d="M50 55 C 35 55 30 65 35 75 S 40 90 50 90 S 65 85 65 75 S 65 55 50 55" />
    </svg>
);

const App: React.FC = () => {
  // --- Auth State ---
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // --- App State ---
  const [step, setStep] = useState<NavigationStep>('specialty');
  const [selectedSpecialty, setSelectedSpecialty] = useState<Specialty | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [mode, setMode] = useState<AIMode>('fast');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- Auth Logic ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    setAuthLoading(false);
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google' });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setStep('specialty');
  };

  // --- KaTeX & Auto-Start Logic ---
  useEffect(() => {
    if ((window as any).renderMathInElement) {
      (window as any).renderMathInElement(document.body, {
        delimiters: [
          {left: '$$', right: '$$', display: true},
          {left: '$', right: '$', display: false}
        ],
        throwOnError: false
      });
    }
  }, [messages, step]);

  useEffect(() => {
    if (step === 'chat' && messages.length === 0 && selectedLesson) {
      autoStartExplanation();
    }
  }, [step]);

  const autoStartExplanation = async () => {
    setIsLoading(true);
    try {
      const text = await GeminiService.generateResponse(
        mode,
        "ابدأ بشرح الدرس مباشرة بطريقة ممتعة وتفاعلية",
        undefined,
        undefined,
        selectedLesson?.content,
        selectedLesson?.title
      );
      setMessages([{ id: 'init', role: 'assistant', content: text, mode, timestamp: Date.now() }]);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Chat Logic ---
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      mode,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await GeminiService.generateResponse(
        mode, 
        input, 
        undefined, 
        undefined, 
        selectedLesson?.content,
        selectedLesson?.title
      );
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
        mode,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Render Login Logic ---
  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="glass-panel max-w-md w-full p-8 rounded-[2rem] border border-white/10 white-glow">
          <div className="flex flex-col items-center mb-8">
            <EduAiLogo className="w-16 h-16 text-white mb-4" />
            <h1 className="text-3xl font-black text-white text-glow">EduAi</h1>
            <p className="text-slate-400 mt-2">سجل دخولك لتبدأ التعلم</p>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <input 
              type="email" 
              placeholder="البريد الإلكتروني" 
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-right outline-none focus:border-white/40"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input 
              type="password" 
              placeholder="كلمة المرور" 
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-right outline-none focus:border-white/40"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button 
              disabled={authLoading}
              className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-slate-200 transition-all active:scale-95"
            >
              {authLoading ? 'جاري التحميل...' : 'دخول'}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-black text-slate-500">أو عبر</span></div>
          </div>

          <button 
            onClick={handleGoogleLogin}
            className="w-full bg-white/5 border border-white/10 text-white font-bold py-4 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Google الدخول بواسطة
          </button>
        </div>
      </div>
    );
  }

  // --- Main Navigation UI ---
  const currentSubjects = selectedSpecialty ? SUBJECTS.filter(s => s.specialties.includes(selectedSpecialty)) : [];

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <button onClick={handleLogout} className="text-xs text-slate-500 hover:text-white border border-white/10 px-3 py-1 rounded-full transition-colors">خروج</button>
             <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 overflow-hidden">
                {user.user_metadata?.avatar_url && <img src={user.user_metadata.avatar_url} alt="profile" />}
             </div>
          </div>
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => { setStep('specialty'); setSelectedSpecialty(null); setSelectedSubject(null); setMessages([]); }}>
            <span className="text-2xl font-black tracking-tighter text-glow">EduAi</span>
            <EduAiLogo className="w-10 h-10" />
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-40 px-6 max-w-7xl mx-auto">
        {step === 'specialty' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {SPECIALTIES.map((s) => (
              <button key={s.id} onClick={() => { setSelectedSpecialty(s.id); setStep('subject'); }}
                className="glass-panel p-8 rounded-[2.5rem] border border-white/10 hover:border-white/30 transition-all text-right group white-glow-hover">
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">{s.icon}</div>
                <h3 className="text-2xl font-bold">{s.name}</h3>
              </button>
            ))}
          </div>
        )}

        {step === 'subject' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
            {currentSubjects.map((s) => (
              <button key={s.id} onClick={() => { setSelectedSubject(s); setStep('lesson'); }}
                className="glass-panel p-8 rounded-[2.5rem] border border-white/10 hover:border-white/30 transition-all text-right group white-glow-hover">
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">{s.icon}</div>
                <h3 className="text-2xl font-bold">{s.name}</h3>
              </button>
            ))}
          </div>
        )}

        {step === 'lesson' && selectedSubject && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <h2 className="text-3xl font-black text-right mb-12">دروس {selectedSubject.name}</h2>
            {selectedSubject.curriculum?.map((unit) => (
              <div key={unit.id} className="space-y-4">
                <h3 className="text-xl font-bold text-slate-400 text-right px-4">{unit.title}</h3>
                <div className="grid grid-cols-1 gap-3">
                  {unit.lessons.map((lesson) => (
                    <button key={lesson.id} onClick={() => { setSelectedLesson(lesson); setStep('mode'); }}
                      className="glass-panel p-6 rounded-2xl border border-white/5 hover:border-white/20 text-right transition-all flex items-center justify-between group">
                      <span className="opacity-0 group-hover:opacity-100 transition-all">←</span>
                      <span className="font-bold">{lesson.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {step === 'mode' && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500">
            <h2 className="text-3xl font-black text-center mb-12">اختر وضعية الدراسة</h2>
            <div className="grid grid-cols-1 gap-4">
              {[
                { id: 'fast', name: 'شرح ممتع', desc: 'سأشرح لك الدرس بأسلوب بسيط ومباشر' },
                { id: 'think', name: 'تعمق في الفهم', desc: 'شرح مفصل مع الرسوم والتحليل العميق' },
                { id: 'quiz', name: 'تحدي الذكاء', desc: 'لنرى مدى استيعابك عبر أسئلة ذكية' }
              ].map((m) => (
                <button key={m.id} onClick={() => { setMode(m.id as AIMode); setStep('chat'); }}
                  className="glass-panel p-6 rounded-3xl border border-white/10 hover:border-white/40 text-right transition-all group">
                  <h4 className="text-xl font-bold mb-1">{m.name}</h4>
                  <p className="text-slate-500">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'chat' && (
          <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-40 animate-in fade-in duration-700">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] p-6 rounded-[2.5rem] leading-relaxed ${m.role === 'user' ? 'bg-white text-black font-bold' : 'glass-panel border border-white/10 text-white shadow-xl'}`}>
                  {m.content.split('\n').map((line, i) => (
                    <p key={i} className={line.trim() === '' ? 'h-4' : 'mb-2'}>{line}</p>
                  ))}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="glass-panel p-6 rounded-[2rem] border border-white/5 animate-pulse text-slate-500">
                  جاري تحضير الشرح...
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {step === 'chat' && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black to-transparent z-20">
          <div className="max-w-4xl mx-auto flex items-center gap-4 bg-white/5 p-2 rounded-[3rem] border border-white/10 focus-within:border-white/40 shadow-2xl transition-all">
            <textarea 
              value={input} 
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="اسألني أي شيء عن هذا الدرس..."
              className="flex-1 bg-transparent border-none focus:ring-0 text-xl p-4 text-right text-white resize-none outline-none"
              rows={1}
            />
            <button onClick={sendMessage} className="p-5 rounded-full bg-white text-black hover:bg-slate-200 transition-all active:scale-90 flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
