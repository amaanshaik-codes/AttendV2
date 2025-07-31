import React from 'react';

export interface Student {
  id: string; // e.g., 'S01'
  name: string;
  createdAt: string; // ISO date string
}

export interface AttendanceRecord {
  date: string; // 'YYYY-MM-DD'
  presentStudentIds: string[];
}

export interface AppSettings {
  password?: string;
  theme: 'light' | 'dark';
  lastLogin?: string; // ISO date string
}

export type Page = 'dashboard' | 'attendance' | 'students' | 'settings';

export interface Stat {
  name: string;
  value: string | number;
  change?: string;
  changeType?: 'increase' | 'decrease';
  description?: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

export interface StudentStat {
  student: Student;
  value: string;
  score?: number;
}
