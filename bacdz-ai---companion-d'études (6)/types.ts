
export type Specialty = 
  | 'Sciences Expérimentales'
  | 'Mathématiques'
  | 'Technique Mathématique'
  | 'Gestion et Économie'
  | 'Lettres et Philosophie'
  | 'Langues Étrangères'
  | 'Pour ma princesse';

export type UserRole = 'student' | 'teacher';

export interface SpecialtyInfo {
  id: Specialty;
  name: string;
  icon: string;
  color: string;
}

export interface Lesson {
  id: string;
  title: string;
  content?: string;
}

export interface Unit {
  id: string;
  title: string;
  lessons: Lesson[];
  semester: 1 | 2 | 3;
}

export interface Subject {
  id: string;
  name: string;
  specialties: Specialty[];
  icon: string;
  curriculum?: Unit[];
}

export type AIMode = 'fast' | 'think' | 'search' | 'image' | 'analyze' | 'quiz' | 'exercises' | 'lesson_plan' | 'exam_builder';

export type NavigationStep = 
  | 'role_selection' 
  | 'specialty' 
  | 'subject' 
  | 'lesson' 
  | 'mode' 
  | 'chat' 
  | 'exercises' 
  | 'quiz' 
  | 'pdf-upload'
  | 'teacher_dashboard'
  | 'teacher_subject_selection'
  | 'program-upload'
  | 'gradebook'
  | 'exam_builder_flow';

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

export interface StudentGrade {
  id: string;
  name: string;
  marks: { [subjectId: string]: number };
  assessmentMarks: { [subjectId: string]: number };
  assessments: { [subjectId: string]: string };
}
