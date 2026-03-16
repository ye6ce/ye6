import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Sparkles, CornerDownLeft, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface AIInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (text?: string) => void;
  suggestions?: string[];
  placeholder?: string;
  isTyping?: boolean;
}

export const AIInput: React.FC<AIInputProps> = ({
  value,
  onChange,
  onSend,
  suggestions = [],
  placeholder = "اسأل أي سؤال...",
  isTyping = false
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4">
      <div className="relative bg-zinc-900/50 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden focus-within:border-brand-purple/50 focus-within:ring-1 focus-within:ring-brand-purple/20 transition-all shadow-2xl">
        <div className="p-4 flex flex-col gap-3">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={1}
              dir="rtl"
              className="w-full bg-transparent border-none focus:ring-0 text-zinc-100 placeholder:text-zinc-500 resize-none min-h-[44px] max-h-[200px] text-sm md:text-base font-medium leading-relaxed py-1 pr-7 pl-10"
            />
            {!value && (
              <div className="absolute right-1 top-2 pointer-events-none text-brand-purple/40">
                <Sparkles size={16} />
              </div>
            )}
            {value && (
              <button
                onClick={() => onChange('')}
                className="absolute left-0 top-1.5 p-1.5 text-zinc-500 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-2 border-t border-white/5">
            <div className="flex flex-wrap gap-1.5 w-full md:w-auto" dir="rtl">
              <AnimatePresence>
                {suggestions.map((suggestion, idx) => (
                  <motion.button
                    key={idx}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => onSend(suggestion)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] md:text-xs font-bold text-zinc-400 hover:text-white transition-all active:scale-95 whitespace-nowrap"
                  >
                    <Sparkles size={12} className="text-brand-purple" />
                    {suggestion}
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <span className="text-[10px] text-zinc-500 font-medium hidden md:block">
                Shift + Enter للسطر الجديد
              </span>
              {isTyping ? (
                <button
                  onClick={() => {/* Stop logic if implemented */}}
                  className="p-2.5 rounded-xl bg-zinc-800 text-white hover:bg-zinc-700 transition-all active:scale-90 flex items-center gap-2 border border-white/5"
                >
                  <div className="w-2 h-2 bg-white rounded-sm animate-pulse" />
                  <span className="text-xs font-bold">إيقاف</span>
                </button>
              ) : (
                <button
                  onClick={() => onSend()}
                  disabled={!value.trim()}
                  className={cn(
                    "p-2.5 rounded-xl transition-all active:scale-90 flex items-center gap-2",
                    value.trim() 
                      ? "bg-brand-purple text-white shadow-lg shadow-brand-purple/20 hover:bg-brand-purple/80" 
                      : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                  )}
                >
                  <span className="text-xs font-bold hidden sm:block">إرسال</span>
                  <Send size={18} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
