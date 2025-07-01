// 移动端页面共享类型定义

export interface Schedule {
  _id: string;
  title: string;
  time: string;
  date: string;
  description?: string;
  type?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Todo {
  _id: string;
  text: string;
  completed: boolean;
  priority?: 'low' | 'medium' | 'high' | 'none';
  dueDate?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  id?: string;
  content?: string;
  tags?: string[];
  startDate?: string;
  timer?: {
    isRunning: boolean;
    totalSeconds: number;
    startTime?: string;
  };
}

export interface User {
  _id: string;
  username: string;
  email: string;
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TagContent {
  _id: string;
  tag: string;
  name: string;
  count: number;
  content: string;
  isGoalEnabled?: boolean;
  targetCount?: number;
  currentCount?: number;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MobileTabProps {
  user: User;
  theme?: string;
  toast?: (options: { title: string; variant?: 'destructive' }) => void;
}

export interface ProfileTabProps extends MobileTabProps {
  toggleTheme: () => void;
  logout: () => void;
}

export interface GoalsTabProps extends MobileTabProps {
}

export interface NotesTabProps extends MobileTabProps {
}

export interface ScheduleTabProps extends MobileTabProps {
  activeTab?: string;
}

export interface TodoTabProps extends MobileTabProps {
}

export interface Note {
  _id: string;
  title: string;
  content: string;
  originalContent?: string;
  date: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  imageUrl?: string;
  images?: string[];
  attachments?: Array<{
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url: string;
  }>;
}