import React, { useMemo } from 'react';
import { Student, AttendanceRecord } from '../types';
import * as Utils from '../lib/utils';
import { APP_NAME } from '../constants';

interface ShareableImageProps {
  students: Student[];
  records: AttendanceRecord[];
}

const ShareableImage: React.FC<ShareableImageProps> = ({ students, records }) => {
  const today = Utils.getTodayDateString();
  const todaysRecord = useMemo(() => records.find(r => r.date === today), [records, today]);

  if (!todaysRecord) {
    return (
      <div id="shareable-image-container" className="w-[500px] h-[700px] p-8 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-800 dark:text-slate-200 font-sans">
        <p>No attendance data for today to generate an image.</p>
      </div>
    );
  }

  const presentCount = todaysRecord.presentStudentIds.length;
  const totalCount = students.length;
  const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
  const topStudents = Utils.getTopStudents(records, students, 3);
  const studentMap = new Map(students.map(s => [s.id, s.name]));

  const presentStudentsList = todaysRecord.presentStudentIds.map(id => studentMap.get(id) || 'Unknown Student');

  return (
    <div id="shareable-image-container" className="w-[500px] p-8 bg-white dark:bg-slate-900 font-sans flex flex-col text-slate-700 dark:text-slate-300">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Daily Attendance Summary</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{Utils.formatDay(today)}, {Utils.formatDate(today)}</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-lg bg-primary-50 dark:bg-slate-800 text-center border border-primary-100 dark:border-slate-700">
          <p className="text-xs text-primary-800 dark:text-primary-300 font-semibold tracking-wider">PRESENT</p>
          <p className="text-3xl font-bold text-primary-600 dark:text-primary-200 mt-1">{presentCount} <span className="text-lg opacity-50">/ {totalCount}</span></p>
        </div>
        <div className="p-4 rounded-lg bg-green-50 dark:bg-slate-800 text-center border border-green-100 dark:border-slate-700">
          <p className="text-xs text-green-800 dark:text-green-300 font-semibold tracking-wider">ATTENDANCE %</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-200 mt-1">{percentage}%</p>
        </div>
      </div>

      <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800 mb-6">
        <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Top Regulars</h2>
        <div className="space-y-1.5">
          {topStudents.map((s, i) => (
            <p key={s.student.id} className="text-sm text-slate-500 dark:text-slate-400">
              <span className="font-bold text-slate-600 dark:text-slate-300">{i + 1}.</span> {s.student.name}
            </p>
          ))}
        </div>
      </div>
      
      <div className="flex-1 p-4 rounded-lg bg-slate-50 dark:bg-slate-800">
        <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Students Present ({presentCount})</h2>
        <div className="columns-2 gap-x-6 text-sm text-slate-500 dark:text-slate-400 overflow-y-auto max-h-[320px] pr-2">
            {presentStudentsList.map((name, i) => (
                <p key={i} className="break-inside-avoid mb-1.5">{i + 1}. {name}</p>
            ))}
        </div>
      </div>

      <div className="mt-auto pt-6 text-center">
        <p className="text-lg font-bold text-primary-600 dark:text-primary-400">{APP_NAME}</p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 tracking-wider">Crafted by Amaan Shaik</p>
      </div>
    </div>
  );
};

export default ShareableImage;