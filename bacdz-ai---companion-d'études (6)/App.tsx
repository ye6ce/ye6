import React, { useState, useEffect } from 'react';
import { Specialty, Subject, AIMode, Message, Lesson, NavigationStep } from './types';
import { SPECIALTIES, SUBJECTS } from './constants';
import { GeminiService } from './services/geminiService';
import { supabase } from './services/supabaseClient';

const EduAiLogo: React.FC<{ className?: string }> = ({ className }) => (
    <svg viewBox="0 0 100 100" className={className} xmlns="http://www.w3.org/2000/svg"
         fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M50 10 L95 32 L50 54 L5 32 Z" />
        <path d="M50 55 C 35 55 30 65 35 75 S 40 90 50 90 S 65 85 65 75 S 65 55 50 55" />
    </svg>
);

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [step, setStep] = useState<NavigationStep>('specialty');
  const [selectedSpecialty, setSelectedSpecialty] = useState<Specialty | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [mode, setMode] = useState<AIMode>('fast');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

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
        selectedLesson?.content,
        selectedLesson?.title
      );
      setMessages([{ id: 'init', role: 'assistant', content: text, mode, timestamp: Date.now() }]);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    setAuthLoading(false);
  };

  const handleGoogleLogin = async () => { await supabase.auth.signInWithOAuth({ provider: 'google' }); };
  const handleLogout = async () => { await supabase.auth.signOut(); setStep('specialty'); };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input, mode, timestamp: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const text = await GeminiService.generateResponse(
        mode, 
        input, 
        undefined, 
        selectedLesson?.content,
        selectedLesson?.title
      );
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: text, mode, timestamp: Date.now() }]);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="glass-panel max-w-md w-full p-8 rounded-[2rem] border border-white/10 white-glow">
          <div className="flex flex-col items-center mb-8">
            <EduAiLogo className="w-16 h-16 text-white mb-4" />
            <h1 className="text-3xl font-black text-white text-glow">EduAi</h1>
          </div>
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <input type="email" placeholder="البريد الإلكتروني" className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-right outline-none focus:border-white/40" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input type="password" placeholder="كلمة المرور" className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white text-right outline-none focus:border-white/40" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button disabled={authLoading} className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-slate-200 transition-all">{authLoading ? 'جاري التحميل...' : 'دخول'}</button>
          </form>
          <button onClick={handleGoogleLogin} className="w-full mt-4 bg-white/5 border border-white/10 text-white font-bold py-4 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-3">
            Google الدخول بواسطة
          </button>
        </div>
      </div>
    );
  }

  const currentSubjects = selectedSpecialty ? SUBJECTS.filter(s => s.specialties.includes(selectedSpecialty)) : [];

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 h-20 flex items-center justify-between px-6">
        <button onClick={handleLogout} className="text-xs text-slate-500 border border-white/10 px-3 py-1 rounded-full">خروج</button>
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => { setStep('specialty'); setSelectedSpecialty(null); setSelectedSubject(null); setMessages([]); }}>
          <span className="text-2xl font-black text-glow">EduAi</span>
          <EduAiLogo className="w-10 h-10" />
        </div>
      </nav>

      <main className="pt-32 pb-40 px-6 max-w-7xl mx-auto">
        {step === 'specialty' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {SPECIALTIES.map((s) => (
              <button key={s.id} onClick={() => { setSelectedSpecialty(s.id); setStep('subject'); }} className="glass-panel p-8 rounded-[2.5rem] border border-white/10 text-right hover:border-white/30 transition-all">
                <div className="text-4xl mb-4">{s.icon}</div>
                <h3 className="text-2xl font-bold">{s.name}</h3>
              </button>
            ))}
          </div>
        )}

        {step === 'subject' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {currentSubjects.map((s) => (
              <button key={s.id} onClick={() => { setSelectedSubject(s); setStep('lesson'); }} className="glass-panel p-8 rounded-[2.5rem] border border-white/10 text-right hover:border-white/30 transition-all">
                <div className="text-4xl mb-4">{s.icon}</div>
                <h3 className="text-2xl font-bold">{s.name}</h3>
              </button>
            ))}
          </div>
        )}

        {step === 'lesson' && selectedSubject && (
          <div className="space-y-6">
            <h2 className="text-3xl font-black text-right mb-8">دروس {selectedSubject.name}</h2>
            {selectedSubject.curriculum?.map((unit) => (
              <div key={unit.id} className="space-y-3">
                <h3 className="text-lg text-slate-500 text-right pr-4">{unit.title}</h3>
                {unit.lessons.map((lesson) => (
                  <button key={lesson.id} onClick={() => { setSelectedLesson(lesson); setStep('mode'); }} className="glass-panel w-full p-6 rounded-2xl border border-white/5 hover:border-white/20 text-right">
                    <span className="font-bold">{lesson.title}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        {step === 'mode' && (
          <div className="max-w-xl mx-auto grid gap-4">
            {['fast', 'think', 'quiz'].map((m) => (
              <button key={m} onClick={() => { setMode(m as AIMode); setStep('chat'); }} className="glass-panel p-6 rounded-3xl border border-white/10 text-right">
                <h4 className="text-xl font-bold">{m === 'fast' ? 'شرح ممتع' : m === 'think' ? 'تعمق في الفهم' : 'تحدي الذكاء'}</h4>
              </button>
            ))}
          </div>
        )}

        {step === 'chat' && (
          <div className="flex flex-col gap-6 max-w-4xl mx-auto">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] p-6 rounded-[2.5rem] ${m.role === 'user' ? 'bg-white text-black font-bold' : 'glass-panel border border-white/10 text-white'}`}>
                  {m.content.split('\n').map((line, i) => <p key={i} className="mb-2">{line}</p>)}
                </div>
              </div>
            ))}
            {isLoading && <div className="text-center animate-pulse text-slate-500">جاري التفكير...</div>}
          </div>
        )}
      </main>

      {step === 'chat' && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black to-transparent">
          <div className="max-w-4xl mx-auto flex items-center gap-4 bg-white/5 p-2 rounded-[3rem] border border-white/10">
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="اسألني أي شيء..." className="flex-1 bg-transparent border-none text-xl p-4 text-right text-white resize-none outline-none" rows={1} />
            <button onClick={sendMessage} className="p-5 rounded-full bg-white text-black active:scale-90 transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
