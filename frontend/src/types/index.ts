export interface Task {
  id: number;
  title: string;
  startDate: Date | null;
  endDate: Date | null;
  progress: number;
  assignee: string;
  completed: boolean;
}

export interface Board {
  id: number;
  name: string;
  color: string;
  collapsed: boolean;
  tasks: Task[];
}

export interface User {
  id: number;
  email: string;
  name?: string; // nameをオプショナルに変更
}