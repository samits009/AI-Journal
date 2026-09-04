export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  createdAt: number;
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  preview: string;
  messages: ChatMessage[];
  mood?: string;
  moodSummary?: string;
  createdAt: number;
  updatedAt: number;
}
