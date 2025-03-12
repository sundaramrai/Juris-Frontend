// src/app/Interface.ts
export interface Message {
  type: 'user' | 'bot';
  text: string;
  time: string;
  userId?: string; // Added to match API
}

export interface Feedback {
  satisfaction: number;
  issues: string;
  improvements: string;
  userId?: string; // Added to match API
}

export interface MessageResponse extends Omit<Message, 'id'> {
  _id: string; // MongoDB ID
}

export interface FeedbackResponse extends Omit<Feedback, 'id'> {
  _id: string; // MongoDB ID
}
