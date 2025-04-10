// src/app/Interface.ts
export interface Message {
  type: 'user' | 'bot';
  text: string;
  time: string;
  userId?: string;
}

export interface Feedback {
  satisfaction: number;
  issues: string;
  improvements: string;
  userId?: string;
}

export interface ChatInfo {
  chatId: string;
  title: string;
  summary: string;
  messageCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MessageResponse extends Omit<Message, 'id'> {
  _id: string;
}

export interface FeedbackResponse extends Omit<Feedback, 'id'> {
  _id: string;
}
