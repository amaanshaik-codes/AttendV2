
import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Student, AttendanceRecord, AppSettings } from '../types';

interface AppContextType {
  students: Student[];
  attendanceRecords: AttendanceRecord[];
  settings: AppSettings;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
  addStudent: (name: string) => Promise<void>;
  updateStudent: (id: string, newName: string) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  submitAttendance: (presentStudentIds: string[], date: string) => Promise<void>;
  updateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
}

// Create a safe, non-null default context value
const defaultAppContext: AppContextType = {
  students: [],
  attendanceRecords: [],
  settings: { theme: 'light' },
  isAuthenticated: false,
  isLoading: true,
  login: async () => false,
  logout: () => {},
  addStudent: async () => {},
  updateStudent: async () => {},
  deleteStudent: async () => {},
  submitAttendance: async () => {},
  updateSettings: async () => {},
};

export const AppContext = createContext<AppContextType>(defaultAppContext);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings>({ theme: 'light' });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch initial data from the backend
  const initializeApp = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/bootstrap');
      if (!response.ok) throw new Error('Failed to fetch initial data');
      const data = await response.json();
      setStudents(data.students || []);
      setAttendanceRecords(data.attendanceRecords || []);
      
      const localTheme = localStorage.getItem('attend-theme') as 'light' | 'dark' | null;
      const serverSettings = data.settings || {};
      setSettings({ ...serverSettings, theme: localTheme || serverSettings.theme || 'light' });
      
    } catch (error) {
      console.error("Could not initialize app:", error);
      // Even on error, we stop loading and the app can show a login or error state.
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeApp();
  }, [initializeApp]);

  const login = async (password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (data.success) {
        setIsAuthenticated(true);
        // Optimistically update lastLogin time
        setSettings(s => ({...s, lastLogin: new Date().toISOString()}));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  const addStudent = async (name: string) => {
    try {
      const response = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const newStudent = await response.json();
      setStudents(prev => [...prev, newStudent]);
    } catch (error) {
      console.error('Failed to add student:', error);
    }
  };

  const updateStudent = async (id: string, newName: string) => {
    try {
        await fetch('/api/students', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, newName }),
        });
        setStudents(prev => prev.map(s => s.id === id ? { ...s, name: newName } : s));
    } catch(e) {
        console.error("Failed to update student", e)
    }
  };

  const deleteStudent = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this student? This will also remove them from all past attendance records.')) {
        try {
            await fetch('/api/students', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            setStudents(prev => prev.filter(s => s.id !== id));
            setAttendanceRecords(prev => prev.map(record => ({
                ...record,
                presentStudentIds: record.presentStudentIds.filter(studentId => studentId !== id)
            })));
        } catch(e) {
            console.error("Failed to delete student", e);
        }
    }
  };

  const submitAttendance = async (presentStudentIds: string[], date: string) => {
    try {
        const response = await fetch('/api/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, presentStudentIds }),
        });
        const newRecord = await response.json();
        setAttendanceRecords(prev => {
            const otherRecords = prev.filter(r => r.date !== date);
            return [...otherRecords, newRecord].sort((a,b) => a.date.localeCompare(b.date));
        });
    } catch (error) {
        console.error('Failed to submit attendance:', error);
    }
  };

  const updateSettings = async (newSettings: Partial<AppSettings>) => {
    try {
        // Optimistic UI update
        const oldSettings = settings;
        setSettings(prev => ({ ...prev, ...newSettings }));
        if(newSettings.theme) {
            localStorage.setItem('attend-theme', newSettings.theme);
        }

        const response = await fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newSettings),
        });
        if(!response.ok) {
            setSettings(oldSettings); // Rollback on failure
            console.error("Failed to update settings");
        }
    } catch (error) {
        console.error('Failed to update settings:', error);
    }
  };

  const value: AppContextType = {
    students,
    attendanceRecords,
    settings,
    isAuthenticated,
    isLoading,
    login,
    logout,
    addStudent,
    updateStudent,
    deleteStudent,
    submitAttendance,
    updateSettings,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
