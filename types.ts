export interface User {
  id: string;
  email: string;
  full_name?: string;
  created_at?: string;
}


export interface Dream {
  id: string;
  user_id: string;
  title: string;
  content: string;
  interpretation?: string;
  created_at: string;
}


export interface Message {
  id?: string;
  dream_id: string;
  sender: 'user' | 'ai';
  content: string;
  created_at?: string;
}


export interface UserInterpretationData {
  is_subscribed: boolean;
  remaining: number;
  total_used: number;
}


export interface Subscription {
  user_id: string;
  status: 'free' | 'active' | 'cancelled';
  plan_type: string;
  updated_at: string;
}


export interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}