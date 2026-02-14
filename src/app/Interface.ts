export interface Message {
  type: 'user' | 'bot';
  text: string;
  time: string;
  userId?: string;
}

export interface ChatInfo {
  chatId: string;
  title: string;
  messageCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface MessageResponse extends Omit<Message, 'id'> {
  _id: string;
}