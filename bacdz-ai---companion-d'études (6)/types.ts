
export type Specialty = 
  | 'Sciences Expérimentales'
  | 'Mathématiques'
  | 'Technique Mathématique'
  | 'Gestion et Économie'
  | 'Lettres et Philosophie'
  | 'Langues Étrangères';

export interface SpecialtyInfo {
  id: Specialty;
  name: string;
  icon: string;
  color: string;
}

export interface Lesson {
  id: string;
  title: string;
}

export interface Unit {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface Subject {
  id: string;
  name: string;
  specialties: Specialty[];
  icon: string;
  curriculum?: Unit[];
}

export type AIMode = 'fast' | 'think' | 'search' | 'image' | 'analyze' | 'quiz' | 'exercises';

export type NavigationStep = 'specialty' | 'subject' | 'lesson' | 'mode' | 'chat' | 'exercises' | 'quiz';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mode: AIMode;
  timestamp: number;
  imageUrl?: string;
  groundingLinks?: { title: string; uri: string }[];
  suggestions?: string[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface Quiz {
  title: string;
  questions: QuizQuestion[];
}

export type ImageSize = '1K' | '2K' | '4K';