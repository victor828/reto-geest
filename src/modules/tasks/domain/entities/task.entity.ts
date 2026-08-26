export type TaskStatusValue = 'open' | 'archived';

export interface TaskEntity {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatusValue;
  createdAt: Date;
  archivedAt: Date | null;
}

export interface TaskAssigneeSummary {
  userId: number;
  name: string;
  lastName: string;
  email: string;
  completed: boolean;
}

export interface TaskDetail extends TaskEntity {
  assignees: TaskAssigneeSummary[];
}

export interface NotificationAttemptSummary {
  attemptNumber: number;
  httpStatus: number | null;
  success: boolean;
  errorMessage: string | null;
  attemptedAt: Date;
}
