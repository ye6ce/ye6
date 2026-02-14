import React, { useState, useEffect, useRef } from 'react';
import { Specialty, Subject, AIMode, Message, Lesson, NavigationStep } from './types';
import { SPECIALTIES, SUBJECTS } from './constants';
import { GeminiService } from './services/geminiService';
import { supabase } from './services/supabaseClient';

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [step, setStep] = useState<NavigationStep>('specialty');
  const [selectedSpecialty, setSelectedSpecialty] = useState<Specialty | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [mode, setMode] = useState<AIMode>('fast');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Auth Listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  // KaTeX Auto-render whenever messages change
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
  }, [messages]);

  // NEW: Trigger explanation automatically when entering chat
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
        "ابدأ بشرح الدرس مباشرة بطريقة ممتعة",
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

  const sendMessage = async (customInput?: string) => {
    const textToSend = customInput || input;
    if (!textToSend.trim() || isLoading) return;
    
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: textToSend, mode, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await GeminiService.generateResponse(
        mode, 
        textToSend, 
        undefined, 
        undefined, 
        selectedLesson?.content,
        selectedLesson?.title
      );
      const botMsg: Message = { id: (Date.now()+1).toString(), role: 'assistant', content: responseText, mode, timestamp: Date.now() };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return <LoginScreen />; // (Assume LoginScreen uses your UI from previous code)

  const currentSubjects = selectedSpecialty ? SUBJECTS.filter(s => s.specialties.includes(selectedSpecialty)) : [];

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      {/* Navbar omitted for brevity, same as your original */}
      <main className="pt-32 pb-40 px-6 max-w-7xl mx-auto">
        {step === 'specialty' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SPECIALTIES.map((s) => (
              <button key={s.id} onClick={() => { setSelectedSpecialty(s.id); setStep('subject'); }} className="glass-panel p-8 rounded-[2.5rem] border border-white/10 text-right group white-glow-hover">
                <div className="text-4xl mb-4">{s.icon}</div>
                <h3 className="text-2xl font-bold">{s.name}</h3>
              </button>
            ))}
          </div>
        )}

        {step === 'subject' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentSubjects.map((s) => (
              <button key={s.id} onClick={() => { setSelectedSubject(s); setStep('lesson'); }} className="glass-panel p-8 rounded-[2.5rem] border border-white/10 text-right group white-glow-hover">
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
                  <button key={lesson.id} onClick={() => { setSelectedLesson(lesson); setStep('mode'); }} className="glass-panel w-full p-6 rounded-2xl border border-white/5 hover:border-white/20 text-right transition-all">
                    <span className="font-bold text-lg">{lesson.title}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        {step === 'mode' && (
          <div className="max-w-xl mx-auto grid gap-4">
            <h2 className="text-3xl font-black text-center mb-8">اختر الطريقة</h2>
            <button onClick={() => { setMode('fast'); setStep('chat'); }} className="glass-panel p-6 rounded-3xl border border-white/10 text-right">
              <h4 className="text-xl font-bold">شرح ممتع</h4>
              <p className="text-slate-500">سأشرح لك الدرس بأسلوب بسيط</p>
            </button>
            <button onClick={() => { setMode('quiz'); setStep('chat'); }} className="glass-panel p-6 rounded-3xl border border-white/10 text-right">
              <h4 className="text-xl font-bold">تحدي الذكاء</h4>
              <p className="text-slate-500">اختبر معلوماتك في هذا الدرس</p>
            </button>
          </div>
        )}

        {step === 'chat' && (
          <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-20">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] p-6 rounded-[2rem] leading-relaxed ${m.role === 'user' ? 'bg-white text-black font-bold' : 'glass-panel border border-white/10 text-white shadow-xl'}`}>
                  {m.content.split('\n').map((line, i) => <p key={i} className="mb-2">{line}</p>)}
                </div>
              </div>
            ))}
            {isLoading && <div className="text-center animate-pulse text-slate-500">جاري الكتابة...</div>}
          </div>
        )}
      </main>

      {step === 'chat' && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black to-transparent">
          <div className="max-w-4xl mx-auto flex items-center gap-4 bg-white/5 p-2 rounded-[3rem] border border-white/10">
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="اسألني أي شيء..." className="flex-1 bg-transparent border-none text-xl p-4 text-right text-white resize-none outline-none" rows={1} />
            <button onClick={() => sendMessage()} className="p-5 rounded-full bg-white text-black active:scale-90 transition-all">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ... Include the LoginScreen component here with your previous UI code ...
export default App;
