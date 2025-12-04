export const USER_ROLES = ['ADMIN', 'MANAGER', 'JUNIOR'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const LEAVE_TYPES = ['SICK', 'VACATION'] as const;
export type LeaveType = (typeof LEAVE_TYPES)[number];

export const LEAVE_STATUS = ['PENDING', 'APPROVED', 'REJECTED', 'AUTO_APPROVED'] as const;
export type LeaveStatus = (typeof LEAVE_STATUS)[number];

export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_TYPES = ['DESIGN', 'TENDER', 'TECHNICAL_OFFICE', 'PROJECTS', 'PROJECT_CONTROL'] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const TASK_STATUS = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'DECLINED', 'OVERDUE'] as const;
export type TaskStatus = (typeof TASK_STATUS)[number];

export const NOTIFICATION_TYPES = ['TASK_ASSIGNED', 'TASK_COMPLETED', 'TASK_DECLINED', 'TASK_OVERDUE', 'LEAVE_UPDATE'] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_CHANNELS = ['IN_APP', 'EMAIL'] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const ATTENDANCE_STATUS = ['ON_TIME', 'LATE', 'MISSED'] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUS)[number];

export interface LocationPayload {
  city?: string;
  ip?: string;
  device?: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  signInAt: Date;
  signOutAt?: Date;
  location?: LocationPayload;
  status: AttendanceStatus;
}

export interface LeaveSummary {
  used: number;
  remaining: number;
  allowance: number;
  type: LeaveType;
}

export interface TaskAssignee {
  id: string;
  name: string;
  role: UserRole;
  department?: string;
}

export interface TaskPayload {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  type: TaskType;
  priority: TaskPriority;
  deadline: string;
  createdBy: TaskAssignee;
  assignee: TaskAssignee;
}

export interface NotificationPayload {
  id: string;
  userId: string;
  type: NotificationType;
  message: string;
  channel: NotificationChannel;
  readAt?: Date;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

