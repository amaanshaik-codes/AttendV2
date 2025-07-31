

import { Student, AttendanceRecord, Stat, StudentStat, AppSettings } from '../types';
import { 
    IconTrendingUp, IconTrendingDown, IconUsers, IconCalendarCheck, 
    IconClock, IconAward, IconZap, IconActivity, IconBarChart, 
    IconAlertTriangle, IconStar
} from '../constants';
import React from 'react';


export const getTodayDateString = () => new Date().toISOString().split('T')[0];

export const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC' // Important to avoid off-by-one day errors
    });
};

export const formatDay = (dateString: string) => {
    // Adding T00:00:00 to ensure the date is interpreted as UTC
    return new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
}

export const formatRelativeTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
}

// --- STATS CALCULATIONS ---

export const calculateOverallAttendance = (records: AttendanceRecord[], students: Student[]) => {
    if (records.length === 0 || students.length === 0) return 0;
    const totalPossibleAttendances = records.length * students.length;
    const totalActualAttendances = records.reduce((sum, record) => sum + record.presentStudentIds.length, 0);
    return totalPossibleAttendances > 0 ? Math.round((totalActualAttendances / totalPossibleAttendances) * 100) : 0;
};

export const getTopStudents = (records: AttendanceRecord[], students: Student[], count: number): StudentStat[] => {
    const attendanceCounts = students.map(student => {
        const count = records.filter(r => r.presentStudentIds.includes(student.id)).length;
        return { student, count };
    });
    attendanceCounts.sort((a, b) => b.count - a.count);
    return attendanceCounts.slice(0, count).map(ac => ({
        student: ac.student,
        value: `${ac.count} days`
    }));
};

export const getDashboardStats = (records: AttendanceRecord[], students: Student[], settings: AppSettings): Stat[] => {
    const today = getTodayDateString();
    const todaysRecord = records.find(r => r.date === today);

    const overallAttendance = calculateOverallAttendance(records, students);
    const last7DaysRecords = records.filter(r => new Date(r.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    const prev7DaysRecords = records.filter(r => {
        const recordDate = new Date(r.date);
        const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return recordDate > fourteenDaysAgo && recordDate <= sevenDaysAgo;
    });

    const weeklyAttendance = calculateOverallAttendance(last7DaysRecords, students);
    const prevWeeklyAttendance = calculateOverallAttendance(prev7DaysRecords, students);
    const weeklyChange = weeklyAttendance - prevWeeklyAttendance;

    const classEngagementIndex = last7DaysRecords.length > 0 ? weeklyAttendance : 0;
    
    const dayCounts: {[key: string]: number} = {};
    records.forEach(r => {
        const day = formatDay(r.date);
        dayCounts[day] = (dayCounts[day] || 0) + r.presentStudentIds.length;
    });
    const mostActiveDay = Object.keys(dayCounts).length > 0 ? Object.keys(dayCounts).reduce((a, b) => dayCounts[a] > dayCounts[b] ? a : b) : 'N/A';

    const longestStreak = students.length > 0 ? Math.max(...students.map(s => getStudentStats(s.id, records).longestStreak)) : 0;
    
    return [
        { name: "Today's Attendance", value: todaysRecord ? `${todaysRecord.presentStudentIds.length} / ${students.length}` : 'Not Taken', icon: IconUsers },
        { name: "Overall Attendance %", value: `${overallAttendance}%`, icon: IconCalendarCheck },
        { name: "Class Engagement (7d)", value: `${classEngagementIndex}%`, change: `${weeklyChange.toFixed(0)}%`, changeType: weeklyChange >= 0 ? 'increase' : 'decrease', icon: IconZap },
        { name: "Most Active Day", value: mostActiveDay, icon: IconActivity },
        { name: "Longest Class Streak", value: `${longestStreak} days`, icon: IconAward },
        { name: "Last Login", value: settings.lastLogin ? formatRelativeTime(settings.lastLogin) : 'N/A', icon: IconClock },
    ];
};

export const getStudentStats = (studentId: string, records: AttendanceRecord[]) => {
    if (records.length === 0) {
        return { totalDaysAttended: 0, currentStreak: 0, longestStreak: 0, dayMostOftenPresent: 'N/A' };
    }

    const sortedRecords = [...records].sort((a, b) => a.date.localeCompare(b.date));
    const uniqueRecordDates = [...new Map(sortedRecords.map(r => [r.date, r])).keys()];
    
    const dayCounts: { [key: string]: number } = { 'Mondays': 0, 'Tuesdays': 0, 'Wednesdays': 0, 'Thursdays': 0, 'Fridays': 0, 'Saturdays': 0, 'Sundays': 0 };
    let totalDaysAttended = 0;

    const presenceOnRecordDays: boolean[] = [];
    const recordMap = new Map(records.map(r => [r.date, r]));

    uniqueRecordDates.forEach(date => {
        const record = recordMap.get(date)!;
        const isPresent = record.presentStudentIds.includes(studentId);
        presenceOnRecordDays.push(isPresent);
        if (isPresent) {
            totalDaysAttended++;
            const dayName = formatDay(date);
            dayCounts[dayName]++;
        }
    });

    const dayMostOftenPresent = Object.values(dayCounts).some(v => v > 0) ? Object.keys(dayCounts).reduce((a, b) => dayCounts[a] > dayCounts[b] ? a : b) : 'N/A';

    let longestStreak = 0;
    let currentStreak = 0;
    for (const isPresent of presenceOnRecordDays) {
        if (isPresent) {
            currentStreak++;
        } else {
            longestStreak = Math.max(longestStreak, currentStreak);
            currentStreak = 0;
        }
    }
    longestStreak = Math.max(longestStreak, currentStreak);

    currentStreak = 0;
    for (let i = presenceOnRecordDays.length - 1; i >= 0; i--) {
        if (presenceOnRecordDays[i]) {
            currentStreak++;
        } else {
            break;
        }
    }

    return { totalDaysAttended, currentStreak, longestStreak, dayMostOftenPresent };
};

export const getAdvancedStats = (records: AttendanceRecord[], students: Student[]) => {
    if (students.length === 0 || records.length < 2) {
        return {
            longestInactiveStreaks: { title: "Longest Inactive Streaks", icon: IconAlertTriangle, data: [] as StudentStat[] },
            mostCommonDropoutDay: { title: "Most Common Dropout Day", icon: IconBarChart, value: 'N/A' },
            studentOfTheWeek: { title: "Student of the Week", icon: IconStar, data: null }
        };
    }

    // Longest Inactive Streak
    const inactiveStreaks: StudentStat[] = students.map(student => {
        const sortedRecords = [...records].sort((a, b) => a.date.localeCompare(b.date));
        const absenceOnRecordDays: boolean[] = sortedRecords.map(r => !r.presentStudentIds.includes(student.id));

        let longestStreak = 0;
        let currentStreak = 0;
        for (const isAbsent of absenceOnRecordDays) {
            if (isAbsent) {
                currentStreak++;
            } else {
                longestStreak = Math.max(longestStreak, currentStreak);
                currentStreak = 0;
            }
        }
        longestStreak = Math.max(longestStreak, currentStreak);
        
        return { student, value: `${longestStreak} days`, score: longestStreak };
    }).sort((a,b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 5);
    
    // Most Common Dropout Day
    const dayAbsenceCounts: {[key:string]: number} = {};
    records.forEach(r => {
        const day = formatDay(r.date);
        const absentCount = students.length - r.presentStudentIds.length;
        dayAbsenceCounts[day] = (dayAbsenceCounts[day] || 0) + absentCount;
    });
    const mostCommonDropoutDay = Object.keys(dayAbsenceCounts).length > 0 ? Object.keys(dayAbsenceCounts).reduce((a,b) => dayAbsenceCounts[a] > dayAbsenceCounts[b] ? a : b) : 'N/A';

    // Student of the Week
    const lastWeekRecords = records.filter(r => new Date(r.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    if (lastWeekRecords.length > 0) {
        const studentScores = students.map(s => {
            const attendanceCount = lastWeekRecords.filter(r => r.presentStudentIds.includes(s.id)).length;
            const consistency = getStudentStats(s.id, lastWeekRecords).currentStreak;
            return { student: s, score: attendanceCount + consistency };
        });
        const studentOfTheWeek = studentScores.sort((a,b) => b.score - a.score)[0] || null;

        return {
            longestInactiveStreaks: { title: "Longest Inactive Streaks", icon: IconAlertTriangle, data: inactiveStreaks },
            mostCommonDropoutDay: { title: "Most Common Dropout Day", icon: IconBarChart, value: mostCommonDropoutDay },
            studentOfTheWeek: { title: "Student of the Week", icon: IconStar, data: studentOfTheWeek ? {student: studentOfTheWeek.student, value: ''} : null }
        };
    }

    // Default return if no records in the last week
    return {
        longestInactiveStreaks: { title: "Longest Inactive Streaks", icon: IconAlertTriangle, data: inactiveStreaks },
        mostCommonDropoutDay: { title: "Most Common Dropout Day", icon: IconBarChart, value: mostCommonDropoutDay },
        studentOfTheWeek: { title: "Student of the Week", icon: IconStar, data: null }
    };
};


export const getDailyTrend = (records: AttendanceRecord[], students: Student[]) => {
    const last30Days = records.slice(-30);
    return last30Days.map(r => ({
        date: r.date.substring(5), // MM-DD
        present: r.presentStudentIds.length,
        absent: students.length - r.presentStudentIds.length,
    }));
};

// --- Calendar Heatmap Utility ---
export const generateCalendarDays = (studentId: string, records: AttendanceRecord[], monthsAgo: number) => {
    const recordsMap = new Map(records.map(r => [r.date, r]));
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const startDate = new Date(today);
    startDate.setUTCMonth(today.getUTCMonth() - monthsAgo);
    startDate.setUTCDate(1);

    const dayOfWeek = startDate.getUTCDay();
    startDate.setUTCDate(startDate.getUTCDate() - dayOfWeek);

    const days = [];
    let currentDate = new Date(startDate);

    // Ensure we generate enough cells to fill complete weeks
    const endDate = new Date(today);
    endDate.setUTCDate(endDate.getUTCDate() + (6 - endDate.getUTCDay()));


    while (currentDate <= endDate) {
        const dateString = currentDate.toISOString().split('T')[0];
        const record = recordsMap.get(dateString);
        
        let status: 'present' | 'absent' | 'no-record' | 'future' | 'empty' = 'future';
        
        // This logic seems a bit off, let's correct it to handle month boundaries better.
        const startMonth = new Date(today);
        startMonth.setUTCMonth(today.getUTCMonth() - monthsAgo);
        startMonth.setUTCDate(1);

        if (currentDate < startMonth && currentDate.getUTCMonth() !== startMonth.getUTCMonth()) {
            status = 'empty';
        } else if (currentDate > today) {
            status = 'future';
        }
        else if (record) {
            status = record.presentStudentIds.includes(studentId) ? 'present' : 'absent';
        } else {
            status = 'no-record';
        }
        
        days.push({
            date: dateString,
            status: status,
        });
        
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
    }

    return days;
};


// --- CSV EXPORT ---
const convertToCSV = (data: object[]) => {
    if (data.length === 0) return '';
    const header = Object.keys(data[0]).join(',');
    const rows = data.map(row => 
        Object.values(row).map(value => {
            const strValue = String(value);
            // Escape commas and quotes
            if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
                return `"${strValue.replace(/"/g, '""')}"`;
            }
            return strValue;
        }).join(',')
    );
    return [header, ...rows].join('\n');
};

const downloadCSV = (csvData: string, filename: string) => {
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const exportStudentsToCSV = (students: Student[]) => {
    const csvData = convertToCSV(students);
    downloadCSV(csvData, 'students.csv');
};

export const exportAttendanceToCSV = (records: AttendanceRecord[], students: Student[]) => {
    const studentMap = new Map(students.map(s => [s.id, s.name]));
    const data = records.map(record => ({
        date: record.date,
        present_count: record.presentStudentIds.length,
        absent_count: students.length - record.presentStudentIds.length,
        present_students: record.presentStudentIds.map(id => studentMap.get(id) || id).join('; ')
    }));
    const csvData = convertToCSV(data);
    downloadCSV(csvData, 'attendance_history.csv');
};


// --- SHAREABLE CONTENT ---
export const generateAttendanceSummaryText = (records: AttendanceRecord[], students: Student[]) => {
    const today = getTodayDateString();
    const todaysRecord = records.find(r => r.date === today);
    if (!todaysRecord) return "No attendance data for today.";

    const presentCount = todaysRecord.presentStudentIds.length;
    const totalCount = students.length;
    const percentage = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
    
    const topStudents = getTopStudents(records, students, 3);
    const studentMap = new Map(students.map(s => [s.id, s.name]));

    const presentStudentsList = todaysRecord.presentStudentIds
        .map((id, index) => `${index + 1}. ${studentMap.get(id) || 'Unknown Student'}`)
        .join('\n');

    return `📅 ${formatDay(today)}, ${formatDate(today)}
🧾 Daily Attendance Summary
✅ Present: ${presentCount} / ${totalCount} (${percentage}%)

📈 Most Consistent Students:
${topStudents.map((s, i) => `${i + 1}. ${s.student.name}`).join('\n')}

🟢 Students Present:
${presentStudentsList}`;
};
