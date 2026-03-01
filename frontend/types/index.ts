export type UserRole = 'admin' | 'instructor' | 'student';

export interface User {
  _id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string | null;
  createdAt?: string;
}

export interface Course {
  _id: string;
  title: string;
  description: string;
  instructorId: User | string;
  price: number;
  thumbnail?: string | null;
  isPublished: boolean;
  createdAt?: string;
}

export interface Lesson {
  _id: string;
  courseId: string;
  title: string;
  order: number;
  content: string;
  videoUrl?: string | null;
  duration: number;
}

export interface Exercise {
  _id: string;
  courseId: string;
  lessonId?: string | null;
  title: string;
  type: 'quiz' | 'coding' | 'text';
  questions: Array<{ question: string; options?: string[]; correctAnswer?: unknown; points?: number }>;
  deadline?: string | null;
}

export interface Enrollment {
  _id: string;
  userId: string;
  courseId: Course;
  progress: number;
  completedLessons: string[];
}

export interface Payment {
  _id: string;
  userId: string | User;
  courseId: Course;
  amount: number;
  method: string;
  status: string;
  transactionId?: string | null;
  paidAt?: string | null;
  createdAt?: string;
}

export interface Post {
  _id: string;
  userId: User;
  courseId?: { title: string } | null;
  title: string;
  content: string;
  type: 'question' | 'share';
  createdAt: string;
}

export interface Comment {
  _id: string;
  postId: string;
  userId: User;
  content: string;
  createdAt: string;
}

export interface Submission {
  _id: string;
  userId: string | User;
  exerciseId: string | Exercise;
  courseId: string;
  answers: Array<{ questionIndex: number; answer: unknown }>;
  score: number;
  totalPoints: number;
  percentage: number;
  submittedAt: string;
  createdAt?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  code?: string;
}
