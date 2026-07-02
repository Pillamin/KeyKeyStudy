import { Timestamp } from 'firebase/firestore';
export type UserRole = 'admin' | 'teacher' | 'student';
export type ContentStatus = 'draft' | 'published';
export type QuizType = 'blank' | 'matching';

export interface WhitelistDoc {
  id: string; type: 'whitelist'; role: UserRole; displayName: string; email: string;
  classId?: string; registeredAt: Timestamp; registeredBy?: string; updatedAt?: Timestamp;
  // 교사 필드
  homeroom?: string;
  subject?: string;
  // 학생 필드
  grade?: string;
  classNumber?: string;
  studentNumber?: string;
}
export interface ClassDoc {
  id: string; type: 'class'; className: string; classCode: string;
  createdBy: string; createdByEmail: string; createdAt: Timestamp;
  coTeacherEmails?: string[];
  contentOrder?: string[];
  orderIndex?: number;
}
export interface FolderDoc {
  id: string; type: 'folder'; name: string; createdBy: string; createdAt: Timestamp;
}
export interface TopicDoc {
  id: string; type: 'topic'; parentId: string; name: string; orderIndex?: number; createdAt: Timestamp;
}
export interface Keyword { keyword: string; description: string; }
export interface QuizItem {
  type: QuizType; question: string; options: string[]; answer: number; explanation: string;
}
export interface ContentDoc {
  id: string; type: 'content'; classId?: string; classIds?: string[]; folderId?: string; topicId?: string; subject: string; unit: string; title: string;
  status: ContentStatus; step1_text_list: string[]; step2_keywords_list: Keyword[];
  step3_quiz_list: QuizItem[]; pdfUrl?: string; createdBy: string; createdAt: Timestamp; updatedAt: Timestamp; orderIndex?: number;
}
export interface ScoreDoc {
  id: string; type: 'score'; contentId: string; classId: string; userId: string;
  studentName: string; studentEmail: string;
  step1_wpm?: number; step1_accuracy?: number; step1_score?: number; step1_completedAt?: Timestamp;
  step2_completed?: boolean; step2_completedAt?: Timestamp; step2_score?: number;
  step2_wpm?: number; step2_accuracy?: number;
  step3_correct_count?: number; step3_total_count?: number; step3_time_taken?: number;
  step3_score?: number; step3_completedAt?: Timestamp; 
  total_score?: number; updatedAt: Timestamp;
}
export type AppStoreDoc = WhitelistDoc | ClassDoc | FolderDoc | ContentDoc | ScoreDoc;
