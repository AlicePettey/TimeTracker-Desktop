// Type definitions for the Time Tracker application

export interface Project {
  id: string;
  name: string;
  color: string;
  hourlyRate?: number;
  tasks: Task[];
  createdAt: Date;
  isArchived: boolean;
}

export interface Task {
  id: string;
  projectId: string;
  name: string;
  subtasks?: SubTask[];
}

export interface SubTask {
  id: string;
  taskId: string;
  name: string;
}

export interface Activity {
  id: string;
  applicationName: string;
  windowTitle: string;
  startTime: Date;
  endTime: Date;
  duration: number; // in seconds
  projectId?: string;
  taskId?: string;
  subtaskId?: string;
  isCoded: boolean;
  isIdle: boolean;
  categoryId?: string; // Auto-assigned or manual category
  categoryAutoAssigned?: boolean; // Whether category was auto-assigned
}


export interface TimeEntry {
  id: string;
  projectId: string;
  taskId: string;
  subtaskId?: string;
  date: Date;
  duration: number; // in seconds
  description?: string;
  activities: string[]; // activity IDs
}

export interface TimesheetReport {
  startDate: Date;
  endDate: Date;
  entries: TimesheetEntry[];
  totalHours: number;
}

export interface TimesheetEntry {
  projectName: string;
  projectColor: string;
  taskName: string;
  subtaskName?: string;
  totalSeconds: number;
  dailyBreakdown: { date: string; seconds: number }[];
  percentage: number;
}

export interface DailySummary {
  date: Date;
  totalTracked: number;
  totalCoded: number;
  totalUncoded: number;
  projectBreakdown: { projectId: string; seconds: number }[];
}

export type ExportFormat = 'csv' | 'excel' | 'pdf';
export type ReportPeriod = 7 | 14 | 28;
export type Theme = 'light' | 'dark';
export type ActivitySource = 'browser' | 'desktop' | 'manual';

// Desktop app specific types
export interface DesktopActivity extends Activity {
  source: ActivitySource;
  processPath?: string;
}

export interface ConnectedDevice {
  id: string;
  name: string;
  platform: 'win32' | 'darwin' | 'linux';
  lastSync: Date | null;
  pendingCount: number;
  isOnline: boolean;
}

export interface SyncPayload {
  activities: DesktopActivity[];
  deviceId: string;
  timestamp: string;
}
