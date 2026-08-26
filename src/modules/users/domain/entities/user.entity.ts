export interface UserEntity {
  id: number;
  name: string;
  lastName: string;
  email: string;
  createdAt: Date;
}

export interface PendingTaskSummary {
  id: number;
  title: string;
}

export interface UserWithPendingTasks extends UserEntity {
  pendingTasks: PendingTaskSummary[];
}

export interface UserTaskSummary {
  id: number;
  title: string;
  description: string | null;
  status: string;
  completed: boolean;
}
