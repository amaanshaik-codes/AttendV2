import React, { useState, useContext, useMemo, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { Page, Student, Stat, StudentStat, AttendanceRecord } from '../types';
import {
  APP_NAME, IconLayoutDashboard, IconCalendarCheck, IconUsers, IconSettings, IconLogout,
  IconCopy, IconDownload, IconSun, IconMoon, IconChevronRight, IconTrendingUp, IconTrendingDown, IconInfo, IconMenu
} from '../constants';
import * as Utils from '../lib/utils';
import ShareableImage from './ShareableImage';
// @ts-ignore
import html2canvas from 'html2canvas';

// UI Components
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-all duration-300 ${className}`}>
    {children}
  </div>
);

const StatCard: React.FC<{ stat: Stat }> = ({ stat }) => (
  <Card className="p-5">
    <div className="flex items-start justify-between">
      <div>
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.name}</h3>
        <p className="mt-1 text-2xl font-bold tracking-tight">{stat.value}</p>
        {stat.change && (
          <div className={`mt-1 flex items-center gap-1 text-xs ${stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'}`}>
            {stat.changeType === 'increase' ? <IconTrendingUp className="w-4 h-4" /> : <IconTrendingDown className="w-4 h-4" />}
            <span>{stat.change} vs last week</span>
          </div>
        )}
      </div>
      <div className="p-2 bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-300 rounded-lg">
        {React.cloneElement(stat.icon, { className: 'w-6 h-6' })}
      </div>
    </div>
  </Card>
);

const StudentListCard: React.FC<{ title: string, stats: StudentStat[], icon: React.ReactElement<React.SVGProps<SVGSVGElement>> }> = ({ title, stats, icon }) => (
    <Card className="p-5">
        <div className="flex items-center gap-3 mb-4">
            {React.cloneElement(icon, { className: 'w-5 h-5 text-slate-400' })}
            <h3 className="font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
        </div>
        <div className="space-y-3">
            {stats.length > 0 ? stats.map(({student, value}) => (
                <div key={student.id} className="flex items-center justify-between text-sm">
                    <p className="font-medium text-slate-600 dark:text-slate-300">{student.name}</p>
                    <p className="text-slate-500 dark:text-slate-400">{value}</p>
                </div>
            )) : <p className="text-sm text-slate-400">Not enough data.</p>}
        </div>
    </Card>
);

const BarChart: React.FC<{ data: {date: string; present: number; absent: number}[], totalStudents: number }> = ({ data, totalStudents }) => (
    <Card className="p-5 overflow-hidden">
        <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4">Daily Attendance Trend (Last 30 Days)</h3>
        {data.length > 0 ? (
            <div className="overflow-x-auto pb-2 -mb-2">
                <div className="flex gap-2.5 h-40 items-end min-w-max">
                    {data.map((d, i) => (
                        <div key={i} className="w-6 sm:w-7 flex flex-col items-center gap-1.5 group">
                            <div className="relative w-full h-full flex items-end">
                                <div style={{ height: totalStudents > 0 ? `${(d.present / totalStudents) * 100}%` : '0%' }} className="w-full bg-primary-500 rounded-t-md group-hover:bg-primary-400 transition-colors"></div>
                                 <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-800 text-white text-xs rounded py-1 px-2 z-10 whitespace-nowrap shadow-lg">
                                    {d.present} Present
                                </div>
                            </div>
                            <span className="text-xs text-slate-400">{d.date}</span>
                        </div>
                    ))}
                </div>
            </div>
        ) : <p className="text-sm text-slate-400 h-40 flex items-center justify-center">No trend data available.</p>}
    </Card>
);

const AttendanceCalendar: React.FC<{studentId: string; records: AttendanceRecord[]}> = ({ studentId, records }) => {
    const calendarDays = useMemo(() => Utils.generateCalendarDays(studentId, records, 2), [studentId, records]);
    
    const dayColor: Record<string, string> = {
        present: 'bg-green-500',
        absent: 'bg-red-500',
        'no-record': 'bg-slate-200 dark:bg-slate-700',
        future: 'bg-transparent',
        empty: 'bg-transparent'
    };

    return (
        <Card className="p-5 mt-6">
            <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4">Attendance Heatmap (Last 3 months)</h3>
            <div className="flex gap-4 text-xs text-slate-500">
                <div className="grid grid-rows-7 grid-flow-col gap-1.5">
                    {calendarDays.map((day, i) => (
                        <div key={i} className="group relative w-4 h-4 rounded-sm" title={day.status !== 'empty' && day.status !== 'future' ? `${day.date}: ${day.status}` : undefined}>
                            <div className={`w-full h-full ${dayColor[day.status]}`}></div>
                        </div>
                    ))}
                </div>
            </div>
             <div className="flex justify-end items-center gap-4 mt-4 text-xs text-slate-500">
                <span>Less</span>
                <div className="w-3 h-3 rounded-sm bg-slate-200 dark:bg-slate-700"></div>
                <div className="w-3 h-3 rounded-sm bg-red-500"></div>
                <div className="w-3 h-3 rounded-sm bg-green-500"></div>
                <span>More</span>
            </div>
        </Card>
    );
};


// Page Components
const Dashboard: React.FC<{showToast: (message: string, type?: 'success' | 'error') => void}> = ({ showToast }) => {
    const context = useContext(AppContext);
    const { students, attendanceRecords, settings } = context!;
    
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);

    const dashboardStats = useMemo(() => Utils.getDashboardStats(attendanceRecords, students, settings), [attendanceRecords, students, settings]);
    const topStudents = useMemo(() => Utils.getTopStudents(attendanceRecords, students, 5), [attendanceRecords, students]);
    const advancedStats = useMemo(() => Utils.getAdvancedStats(attendanceRecords, students), [attendanceRecords, students]);
    const dailyTrend = useMemo(() => Utils.getDailyTrend(attendanceRecords, students), [attendanceRecords, students]);
    
    const todaysRecord = attendanceRecords.find(r => r.date === Utils.getTodayDateString());

    const handleCopySummary = () => {
        const summary = Utils.generateAttendanceSummaryText(attendanceRecords, students);
        navigator.clipboard.writeText(summary);
        showToast('Copied to clipboard!');
    };

    const handleGenerateImage = () => {
        setIsGeneratingImage(true);
        const node = document.getElementById('shareable-image-container');
        if (node) {
            html2canvas(node, { 
                backgroundColor: settings.theme === 'dark' ? '#101010' : '#ffffff',
                useCORS: true,
                scale: 2,
            }).then(canvas => {
                const link = document.createElement('a');
                link.download = `attendance_summary_${Utils.getTodayDateString()}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
                setIsGeneratingImage(false);
                showToast('Image downloaded successfully!');
            }).catch(e => {
                console.error('oops, something went wrong!', e);
                setIsGeneratingImage(false);
                showToast('Failed to generate image.', 'error');
            });
        }
    };


    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                {todaysRecord && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <button onClick={handleCopySummary} className="button-secondary flex items-center gap-2"><IconCopy className="w-4 h-4" /> Copy Summary</button>
                        <button onClick={handleGenerateImage} disabled={isGeneratingImage} className="button-primary flex items-center gap-2 disabled:opacity-50"><IconDownload className="w-4 h-4" /> {isGeneratingImage ? 'Generating...' : 'Share Image'}</button>
                    </div>
                )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {dashboardStats.map(stat => <StatCard key={stat.name} stat={stat} />)}
            </div>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2">
                    <BarChart data={dailyTrend} totalStudents={students.length}/>
                </div>
                <StudentListCard title="Top 5 Regular Students" stats={topStudents} icon={<IconTrendingUp />} />
            </div>

            <h2 className="text-2xl font-bold tracking-tight mt-8 mb-4">Advanced Stats</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <StudentListCard title={advancedStats.longestInactiveStreaks.title} stats={advancedStats.longestInactiveStreaks.data} icon={advancedStats.longestInactiveStreaks.icon} />
                 <Card className="p-5">
                    <div className="flex items-center gap-3 mb-4">
                        {React.cloneElement(advancedStats.mostCommonDropoutDay.icon, { className: 'w-5 h-5 text-slate-400' })}
                        <h3 className="font-semibold text-slate-700 dark:text-slate-200">{advancedStats.mostCommonDropoutDay.title}</h3>
                    </div>
                    <p className="text-2xl font-bold tracking-tight">{advancedStats.mostCommonDropoutDay.value}</p>
                </Card>
                {advancedStats.studentOfTheWeek.data ? (
                    <Card className="p-5">
                        <div className="flex items-center gap-3 mb-4">
                            {React.cloneElement(advancedStats.studentOfTheWeek.icon, { className: 'w-5 h-5 text-slate-400' })}
                            <h3 className="font-semibold text-slate-700 dark:text-slate-200">{advancedStats.studentOfTheWeek.title}</h3>
                        </div>
                        <p className="text-2xl font-bold tracking-tight">{advancedStats.studentOfTheWeek.data.student.name}</p>
                    </Card>
                ) : (
                   <Card className="p-5">
                        <div className="flex items-center gap-3 mb-4">
                           {React.cloneElement(advancedStats.studentOfTheWeek.icon, { className: 'w-5 h-5 text-slate-400' })}
                           <h3 className="font-semibold text-slate-700 dark:text-slate-200">{advancedStats.studentOfTheWeek.title}</h3>
                        </div>
                        <p className="text-sm text-slate-400">Not enough data.</p>
                    </Card>
                )}
            </div>
            
            <div id="shareable-image-wrapper" className="absolute -left-[9999px] top-0">
                <ShareableImage students={students} records={attendanceRecords} />
            </div>
        </div>
    );
};

const Attendance: React.FC<{showToast: (message: string, type?: 'success' | 'error') => void}> = ({ showToast }) => {
    const context = useContext(AppContext);
    const { students, attendanceRecords, submitAttendance } = context!;
    
    const [selectedDate, setSelectedDate] = useState(Utils.getTodayDateString());
    const [presentIds, setPresentIds] = useState<Set<string>>(new Set());

    const recordForSelectedDate = useMemo(() => attendanceRecords.find(r => r.date === selectedDate), [attendanceRecords, selectedDate]);

    useEffect(() => {
        setPresentIds(new Set(recordForSelectedDate?.presentStudentIds || []));
    }, [recordForSelectedDate, selectedDate]);

    const handleToggle = (studentId: string) => {
        setPresentIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(studentId)) {
                newSet.delete(studentId);
            } else {
                newSet.add(studentId);
            }
            return newSet;
        });
    };

    const handleSubmit = () => {
        submitAttendance(Array.from(presentIds), selectedDate);
        showToast(`Attendance for ${Utils.formatDate(selectedDate)} submitted!`);
    };

    return (
        <div>
            <h1 className="text-3xl font-bold tracking-tight mb-6">Mark Attendance</h1>
            <Card className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{Utils.formatDate(selectedDate)}</h2>
                        <p className="text-sm text-slate-500">{Utils.formatDay(selectedDate)}</p>
                    </div>
                    <div>
                        <label htmlFor="date-picker" className="sr-only">Select Date</label>
                        <input
                            id="date-picker"
                            type="date"
                            value={selectedDate}
                            max={Utils.getTodayDateString()}
                            onChange={e => setSelectedDate(e.target.value)}
                            className="input w-full"
                        />
                    </div>
                </div>

                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 -mr-2">
                    {students.map(student => (
                        <div
                            key={student.id}
                            className={`flex items-center justify-between p-3.5 rounded-lg transition-all duration-200 cursor-pointer ${
                                presentIds.has(student.id)
                                    ? 'bg-primary-50 dark:bg-primary-950'
                                    : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                             onClick={() => handleToggle(student.id)}
                        >
                            <div>
                                <p className="font-medium text-slate-700 dark:text-slate-200">{student.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{student.id}</p>
                            </div>
                           <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" readOnly checked={presentIds.has(student.id)} className="sr-only peer" />
                                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-primary-600"></div>
                            </label>
                        </div>
                    ))}
                </div>

                <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        Present: {presentIds.size} / {students.length}
                    </p>
                    <button onClick={handleSubmit} className="button-primary w-full sm:w-auto">
                        Submit Attendance
                    </button>
                </div>
            </Card>
        </div>
    );
};

const Students: React.FC = () => {
    const context = useContext(AppContext);
    const { students, attendanceRecords, addStudent, updateStudent, deleteStudent } = context!;
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [studentName, setStudentName] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

    useEffect(() => {
        if (!isModalOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsModalOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isModalOpen]);

    const IconEdit = (props: React.SVGProps<SVGSVGElement>) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path><path d="m15 5 4 4"></path></svg>
    );

    const IconTrash = (props: React.SVGProps<SVGSVGElement>) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" x2="10" y1="11" y2="17"></line><line x1="14" x2="14" y1="11" y2="17"></line></svg>
    );

    const handleAddClick = () => {
        setEditingStudent(null);
        setStudentName('');
        setIsModalOpen(true);
    };

    const handleEditClick = (student: Student) => {
        setEditingStudent(student);
        setStudentName(student.name);
        setIsModalOpen(true);
    };
    
    const handleSaveStudent = (e: React.FormEvent) => {
        e.preventDefault();
        if (studentName.trim() === '') return;
        if (editingStudent) {
            updateStudent(editingStudent.id, studentName.trim());
        } else {
            addStudent(studentName.trim());
        }
        setIsModalOpen(false);
        setStudentName('');
    };
    
    const studentStats = useMemo(() => {
        if (!selectedStudent) return null;
        return Utils.getStudentStats(selectedStudent.id, attendanceRecords);
    }, [selectedStudent, attendanceRecords]);

    if (selectedStudent && studentStats) {
        return (
            <div>
                 <button onClick={() => setSelectedStudent(null)} className="mb-4 text-sm font-medium text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-200 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                    Back to Student List
                </button>
                <h1 className="text-3xl font-bold tracking-tight mb-1">{selectedStudent.name} <span className="text-slate-400">({selectedStudent.id})</span></h1>
                <p className="text-sm text-slate-500 mb-6 sm:mb-8">Joined on {Utils.formatDate(selectedStudent.createdAt)}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    <Card className="p-5 text-center flex flex-col justify-center"><p className="text-sm text-slate-500">Total Days Attended</p><p className="text-4xl font-bold tracking-tight">{studentStats.totalDaysAttended}</p></Card>
                    <Card className="p-5 text-center flex flex-col justify-center"><p className="text-sm text-slate-500">Current Streak</p><p className="text-4xl font-bold tracking-tight">{studentStats.currentStreak}</p></Card>
                    <Card className="p-5 text-center flex flex-col justify-center"><p className="text-sm text-slate-500">Longest Streak</p><p className="text-4xl font-bold tracking-tight">{studentStats.longestStreak}</p></Card>
                    <Card className="p-5 text-center flex flex-col justify-center"><p className="text-sm text-slate-500">Favorite Day</p><p className="text-4xl font-bold tracking-tight">{studentStats.dayMostOftenPresent}</p></Card>
                </div>
                <AttendanceCalendar studentId={selectedStudent.id} records={attendanceRecords} />
            </div>
        )
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Manage Students</h1>
                <button onClick={handleAddClick} className="button-primary w-full sm:w-auto">Add Student</button>
            </div>
            <Card>
                <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                    {students.map(student => (
                        <li key={student.id} className="p-3 sm:p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors duration-200 group">
                           <button className="flex-1 text-left cursor-pointer mr-4" onClick={() => setSelectedStudent(student)}>
                                <p className="font-medium truncate text-slate-700 dark:text-slate-200">{student.name}</p>
                                <p className="text-sm text-slate-500">{student.id}</p>
                            </button>
                            <div className="flex items-center gap-1 sm:gap-2">
                                <button onClick={() => handleEditClick(student)} className="p-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-primary-600 transition-colors">
                                    <IconEdit />
                                </button>
                                <button onClick={() => deleteStudent(student.id)} className="p-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-red-600 transition-colors">
                                    <IconTrash />
                                </button>
                                <IconChevronRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </li>
                    ))}
                </ul>
            </Card>

            {isModalOpen && (
                 <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-bold mb-4">{editingStudent ? 'Edit Student' : 'Add Student'}</h2>
                        <form onSubmit={handleSaveStudent}>
                            <label htmlFor="student-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Student Name</label>
                            <input
                                id="student-name"
                                type="text"
                                value={studentName}
                                autoFocus
                                onChange={e => setStudentName(e.target.value)}
                                required
                                className="mt-1 w-full input"
                            />
                            <div className="mt-6 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="button-secondary">Cancel</button>
                                <button type="submit" className="button-primary">Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const Settings: React.FC<{showToast: (message: string, type?: 'success' | 'error') => void}> = ({ showToast }) => {
    const context = useContext(AppContext);
    const { settings, updateSettings, students, attendanceRecords } = context!;
    
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handlePasswordChange = (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            showToast('Passwords do not match.', 'error');
            return;
        }
        if(password.length < 6) {
            showToast('Password must be at least 6 characters long.', 'error');
            return;
        }
        updateSettings({ password });
        showToast('Password updated successfully!');
        setPassword('');
        setConfirmPassword('');
    };

    const toggleTheme = () => {
        updateSettings({ theme: settings.theme === 'light' ? 'dark' : 'light' });
    };

    return (
        <div>
            <h1 className="text-3xl font-bold tracking-tight mb-6">Settings</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Card className="p-6">
                    <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-100">Change Password</h2>
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">New Password</label>
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="mt-1 w-full input"/>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Confirm New Password</label>
                            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="mt-1 w-full input"/>
                        </div>
                        <button type="submit" className="w-full button-primary">Update Password</button>
                    </form>
                </Card>

                <div className="space-y-8">
                    <Card className="p-6">
                        <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-100">Appearance</h2>
                        <div className="flex items-center justify-between">
                            <p>Theme</p>
                            <button onClick={toggleTheme} className="p-2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                                {settings.theme === 'light' ? <IconMoon className="w-5 h-5"/> : <IconSun className="w-5 h-5"/>}
                            </button>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <h2 className="text-lg font-semibold mb-4 text-slate-800 dark:text-slate-100">Data Export</h2>
                        <div className="space-y-3">
                           <button onClick={() => Utils.exportStudentsToCSV(students)} className="w-full button-secondary flex items-center justify-center gap-2"> <IconDownload className="w-4 h-4"/> Export Student List (.csv)</button>
                           <button onClick={() => Utils.exportAttendanceToCSV(attendanceRecords, students)} className="w-full button-secondary flex items-center justify-center gap-2"> <IconDownload className="w-4 h-4"/> Export Attendance History (.csv)</button>
                        </div>
                    </Card>

                    <Card className="p-4 text-center">
                        <p className="font-semibold text-slate-700 dark:text-slate-200">Attend V.2</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Crafted by Amaan Shaik</p>
                    </Card>
                </div>
            </div>
        </div>
    );
};

const Toast: React.FC<{message: string; type: 'success' | 'error'; onDismiss: () => void}> = ({ message, type, onDismiss }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onDismiss();
        }, 3000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    return (
        <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 px-4 py-2 rounded-md text-sm font-medium text-white shadow-lg transition-all duration-300 animate-fade-in-up
            ${type === 'success' ? 'bg-slate-700' : 'bg-red-600'}`}>
            {message}
        </div>
    );
}

const pageComponents: Record<Page, React.FC<{showToast: (message: string, type?: 'success' | 'error') => void}>> = {
    dashboard: Dashboard,
    attendance: Attendance,
    students: Students,
    settings: Settings
};


// Main Component
const MainPage: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toast, setToast] = useState<{message: string; type: 'success' | 'error'} | null>(null);
  const context = useContext(AppContext);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
      setToast({ message, type });
  };

  const navItems: { id: Page; name: string; icon: React.FC<any> }[] = [
    { id: 'dashboard', name: 'Dashboard', icon: IconLayoutDashboard },
    { id: 'attendance', name: 'Attendance', icon: IconCalendarCheck },
    { id: 'students', name: 'Students', icon: IconUsers },
    { id: 'settings', name: 'Settings', icon: IconSettings },
  ];
  
  const handlePageChange = (page: Page) => {
    setActivePage(page);
    if (window.innerWidth < 768) { // md breakpoint in Tailwind
        setIsSidebarOpen(false);
    }
  };

  const ActiveComponent = pageComponents[activePage];
  const currentPageName = navItems.find(item => item.id === activePage)?.name || APP_NAME;

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
        {/* Overlay for mobile */}
       {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setIsSidebarOpen(false)} />}
      
      {/* Sidebar */}
      <aside className={`w-64 flex-col bg-white dark:bg-slate-900 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800
                       fixed inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0
                       ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex`}>
        <div className="px-6 py-4 flex items-center gap-3 border-b border-slate-200 dark:border-slate-800">
          <div className="p-2 bg-primary-600 text-white rounded-lg shadow-md">
            <IconCalendarCheck className="w-6 h-6"/>
          </div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{APP_NAME}</h1>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => handlePageChange(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                activePage === item.id 
                  ? 'bg-primary-600 text-white shadow' 
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <item.icon className="w-5 h-5"/>
              <span>{item.name}</span>
            </button>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-slate-200 dark:border-slate-800">
          <button
            onClick={context?.logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100"
          >
            <IconLogout className="w-5 h-5"/>
            <span>Logout</span>
          </button>
        </div>
      </aside>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="md:hidden flex items-center justify-between p-4 bg-white dark:bg-slate-900 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
            <button onClick={() => setIsSidebarOpen(true)} className="text-slate-600 dark:text-slate-300 p-2 -ml-2">
                <IconMenu className="w-6 h-6"/>
            </button>
            <h2 className="text-lg font-semibold">{currentPageName}</h2>
            <div className="w-6"/>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
            <ActiveComponent showToast={showToast} />
        </main>
      </div>
      
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

      <style>{`
        .input {
            width: 100%;
            padding: 0.5rem 0.75rem;
            color: #0f172a; 
            background-color: #f1f5f9;
            border: 1px solid #cbd5e1;
            border-radius: 0.5rem;
            box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
            transition: border-color .2s ease, box-shadow .2s ease;
        }
        .dark .input {
             color: #f1f5f9;
             background-color: #1A1A1A;
             border-color: #333333;
        }
        .input:focus, .input:focus-visible {
            outline: none;
            border-color: #4f46e5;
            box-shadow: 0 0 0 2px #c7d2fe;
        }
        .button-primary {
            padding: 0.625rem 1rem;
            font-size: 0.875rem;
            line-height: 1.25rem;
            font-weight: 600;
            color: white;
            background-color: #4f46e5;
            border-radius: 0.5rem;
            border: 1px solid transparent;
            box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
            transition: all .2s ease;
        }
        .button-primary:hover {
            background-color: #4338ca;
        }
        .button-primary:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }
        .button-secondary {
            padding: 0.625rem 1rem;
            font-size: 0.875rem;
            line-height: 1.25rem;
            font-weight: 600;
            color: #334155;
            background-color: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 0.5rem;
            box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
            transition: all .2s ease;
        }
        .dark .button-secondary {
            color: #cbd5e1;
            background-color: #1A1A1A;
            border-color: #333333;
        }
        .button-secondary:hover {
            border-color: #94a3b8;
            color: #1e293b;
        }
        .dark .button-secondary:hover {
            background-color: #333333;
            border-color: #475569;
            color: #e2e8f0;
        }
        /* Scrollbar styles */
        .overflow-y-auto::-webkit-scrollbar { width: 6px; }
        .overflow-y-auto::-webkit-scrollbar-track { background: transparent; }
        .overflow-y-auto::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
        .dark .overflow-y-auto::-webkit-scrollbar-thumb { background-color: #475569; }
        .overflow-x-auto::-webkit-scrollbar { height: 6px; }
        .overflow-x-auto::-webkit-scrollbar-track { background: transparent; }
        .overflow-x-auto::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
        .dark .overflow-x-auto::-webkit-scrollbar-thumb { background-color: #475569; }
        
        @keyframes fade-in-up {
            from { opacity: 0; transform: translate(-50%, 10px); }
            to { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-fade-in-up {
            animation: fade-in-up 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default MainPage;