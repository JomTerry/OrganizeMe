export interface User {
  user_id: number;
  name: string;
  email: string;
  password: string;
  birthday: string;
  phone_number: string;
}

export interface Task {
  task_id: number;
  user_id: number;
  title: string;
  description: string;
  due_date: string;
  importance: 'High' | 'Medium' | 'Low';
  reminder_enabled: boolean;
  reminder_time?: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Reminder {
  reminder_id: number;
  task_id: number;
  remind_at: string;
  sent: boolean;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: Omit<User, 'user_id'>) => Promise<boolean>;
  logout: () => void;
}

export type ViewMode = 'priority' | 'dueDate';

export type RootStackParamList = {
  Welcome: undefined;
  SignUp: undefined;
  Login: undefined;
  Home: undefined;
  AddTask: { task?: Task };
  Settings: undefined;
};