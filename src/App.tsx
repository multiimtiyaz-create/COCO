import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap, 
  Users, 
  BookOpen, 
  Award, 
  Settings as SettingsIcon, 
  CheckCircle2, 
  X, 
  Briefcase,
  HelpCircle,
  Database,
  Grid,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

import { Student, Subject, Teacher } from './types';
import { INITIAL_STUDENTS, INITIAL_SUBJECTS } from './data';
import Dashboard from './components/Dashboard';
import StudentDatabase from './components/StudentDatabase';
import StudentDetail from './components/StudentDetail';
import SubjectAnalysis from './components/SubjectAnalysis';
import GredPurataSasaran from './components/GredPurataSasaran';
import Settings from './components/Settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // Custom reset DB modal state
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  const [teacher] = useState<Teacher>({
    name: 'Cikgu Aminah binti Hussin',
    school: 'SMK Pasir Panjang',
    role: 'Guru Penyelaras Headcount SPM / Guru Kelas 4 UKM'
  });

  // Load state from local storage on mount
  useEffect(() => {
    const hydrateStudentScores = (studentsLoaded: Student[]): Student[] => {
      return studentsLoaded.map(stud => ({
        ...stud,
        scores: stud.scores.map(s => {
          const tov = s.tov;
          const etr = s.etr;
          const ppt = s.ppt;

          let otr1 = s.otr1;
          let ar1 = s.ar1;
          let otr2 = s.otr2;
          let ar2 = s.ar2;

          const isTovValid = tov !== undefined && tov !== null && tov !== -1;
          const isEtrValid = etr !== undefined && etr !== null && etr !== -1;
          const isPptValid = ppt !== undefined && ppt !== null && ppt !== -1;

          if (otr1 === undefined || otr1 === null) {
            otr1 = (isTovValid && isEtrValid) ? Math.round(tov! + (etr! - tov!) * 0.33) : undefined;
          }
          if (otr2 === undefined || otr2 === null) {
            otr2 = (isTovValid && isEtrValid) ? Math.round(tov! + (etr! - tov!) * 0.67) : undefined;
          }
          if (ar1 === undefined || ar1 === null) {
            ar1 = isPptValid ? ppt : undefined;
          }
          if (ar2 === undefined || ar2 === null) {
            ar2 = undefined;
          }

          return {
            ...s,
            otr1,
            ar1,
            otr2,
            ar2,
            ppt,
            etr
          };
        })
      }));
    };

    const savedStudents = localStorage.getItem('spm_headcount_students');
    if (savedStudents) {
      try {
        const parsed = JSON.parse(savedStudents);
        setStudents(hydrateStudentScores(parsed));
      } catch (err) {
        console.error("Failed to parse saved students:", err);
        setStudents(hydrateStudentScores(INITIAL_STUDENTS));
      }
    } else {
      setStudents(hydrateStudentScores(INITIAL_STUDENTS));
    }

    const savedSubjects = localStorage.getItem('spm_headcount_subjects');
    if (savedSubjects) {
      try {
        setSubjects(JSON.parse(savedSubjects));
      } catch (err) {
        console.error("Failed to parse saved subjects:", err);
        setSubjects(INITIAL_SUBJECTS);
      }
    } else {
      setSubjects(INITIAL_SUBJECTS);
    }
  }, []);

  // Save state to local storage when students change
  const saveStudents = (updatedStudents: Student[]) => {
    setStudents(updatedStudents);
    localStorage.setItem('spm_headcount_students', JSON.stringify(updatedStudents));
  };

  const saveSubjects = (updatedSubjects: Subject[]) => {
    setSubjects(updatedSubjects);
    localStorage.setItem('spm_headcount_subjects', JSON.stringify(updatedSubjects));
  };

  const handleUpdateStudentsAndSubjects = (newStudents: Student[], newSubjects: Subject[]) => {
    saveStudents(newStudents);
    saveSubjects(newSubjects);
  };

  // Add a new student record
  const handleAddStudent = (newStudent: Student) => {
    const updated = [newStudent, ...students];
    saveStudents(updated);
  };

  // Update student records (including scores)
  const handleUpdateStudent = (updatedStudent: Student) => {
    const updated = students.map(s => s.id === updatedStudent.id ? updatedStudent : s);
    saveStudents(updated);
    
    // Also update currently selected student scorecard reference
    if (selectedStudent && selectedStudent.id === updatedStudent.id) {
      setSelectedStudent(updatedStudent);
    }
  };

  // Delete student record
  const handleDeleteStudent = (id: string) => {
    const updated = students.filter(s => s.id !== id);
    saveStudents(updated);
    if (selectedStudent && selectedStudent.id === id) {
      setSelectedStudent(null);
    }
  };

  // Reset database state and clear student data (remove dummy/seed students)
  const handleResetToSeed = () => {
    saveStudents([]);
    saveSubjects(INITIAL_SUBJECTS);
    setSelectedStudent(null);
    setActiveTab('dashboard');
    setShowResetConfirm(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-800" id="app-wrapper">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 flex flex-col shrink-0 border-b border-slate-850 md:border-b-0 md:border-r border-slate-950 shadow-md">
        {/* App Logo branding */}
        <div className="p-6 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white shadow-md shadow-blue-900/30 shrink-0">
              <GraduationCap size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-white font-black tracking-tight text-sm leading-none uppercase">HEADCOUNT PRO</h1>
              <span className="text-[9px] text-emerald-400 font-black block mt-1 tracking-wider uppercase font-mono">
                v2.1 AI SYSTEM
              </span>
            </div>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          <button
            onClick={() => { setActiveTab('dashboard'); setSelectedStudent(null); }}
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 font-bold text-xs uppercase tracking-wider transition-all duration-150 ${
              activeTab === 'dashboard' && !selectedStudent
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20 shadow-2xs font-extrabold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'
            }`}
            id="sidebar-tab-db"
          >
            <Grid size={16} className="shrink-0" />
            Dashboard Utama
          </button>
          <button
            onClick={() => { setActiveTab('students'); setSelectedStudent(null); }}
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 font-bold text-xs uppercase tracking-wider transition-all duration-150 ${
              activeTab === 'students' && !selectedStudent
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20 shadow-2xs font-extrabold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'
            }`}
            id="sidebar-tab-students"
          >
            <Users size={16} className="shrink-0" />
            Database Calon
          </button>
          <button
            onClick={() => { setActiveTab('subjects'); setSelectedStudent(null); }}
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 font-bold text-xs uppercase tracking-wider transition-all duration-150 ${
              activeTab === 'subjects' && !selectedStudent
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20 shadow-2xs font-extrabold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'
            }`}
            id="sidebar-tab-subjects"
          >
            <BookOpen size={16} className="shrink-0" />
            Analisa Panitia
          </button>
          <button
            onClick={() => { setActiveTab('gred_purata'); setSelectedStudent(null); }}
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 font-bold text-xs uppercase tracking-wider transition-all duration-150 ${
              activeTab === 'gred_purata' && !selectedStudent
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20 shadow-2xs font-extrabold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'
            }`}
            id="sidebar-tab-gred-purata"
          >
            <TrendingUp size={16} className="shrink-0" />
            Sasaran Gred Purata
          </button>
          <button
            onClick={() => { setActiveTab('settings'); setSelectedStudent(null); }}
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 font-bold text-xs uppercase tracking-wider transition-all duration-150 ${
              activeTab === 'settings' && !selectedStudent
                ? 'bg-blue-600/15 text-blue-400 border border-blue-500/20 shadow-2xs font-extrabold'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'
            }`}
            id="sidebar-tab-settings"
          >
            <SettingsIcon size={16} className="shrink-0" />
            Tetapan Sistem
          </button>
        </nav>

        {/* Current user context card at sidebar bottom */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/20">
          <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-2.5 font-bold font-mono">Pengguna Semasa</div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-700/80 border border-slate-600/40 flex items-center justify-center font-bold text-[11px] text-slate-200 uppercase shrink-0 shadow-2xs">
              CA
            </div>
            <div className="text-left font-sans overflow-hidden">
              <span className="text-[11px] font-bold text-slate-300 block line-clamp-1">{teacher.name}</span>
              <span className="text-[9px] text-slate-500 block line-clamp-1 font-semibold">{teacher.role}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50 md:h-screen md:overflow-y-auto">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-6 shrink-0 z-10 shadow-3xs">
          <div className="flex items-center gap-4">
          </div>
          
          <div className="flex gap-2">
            {selectedStudent && (
              <button 
                onClick={() => setSelectedStudent(null)} 
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-250 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <X size={13} />
                Kembali
              </button>
            )}
            <button 
              onClick={() => setShowResetConfirm(true)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-250 rounded-lg text-xs font-bold transition-all"
            >
              Set Semula DB
            </button>
          </div>
        </header>

        {/* Primary Workspace container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8" id="app-main-workspace">
          <AnimatePresence mode="wait">
            {selectedStudent ? (
              <motion.div
                key="student-detail"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
              >
                <StudentDetail
                  student={selectedStudent}
                  subjects={subjects}
                  onBack={() => setSelectedStudent(null)}
                  onUpdateStudent={handleUpdateStudent}
                />
              </motion.div>
            ) : (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.18 }}
              >
                {activeTab === 'dashboard' && (
                  <Dashboard
                    students={students}
                    subjects={subjects}
                    onSelectTab={setActiveTab}
                    onSelectStudent={setSelectedStudent}
                  />
                )}
                {activeTab === 'students' && (
                  <StudentDatabase
                    students={students}
                    subjects={subjects}
                    onAddStudent={handleAddStudent}
                    onUpdateStudent={handleUpdateStudent}
                    onDeleteStudent={handleDeleteStudent}
                    onSelectStudent={setSelectedStudent}
                  />
                )}
                {activeTab === 'subjects' && (
                  <SubjectAnalysis
                    students={students}
                    subjects={subjects}
                    onSelectStudent={setSelectedStudent}
                  />
                )}
                {activeTab === 'gred_purata' && (
                  <GredPurataSasaran
                    students={students}
                    subjects={subjects}
                    onBackToMain={() => setActiveTab('dashboard')}
                    onUpdateStudentsAndSubjects={handleUpdateStudentsAndSubjects}
                  />
                )}
                {activeTab === 'settings' && (
                  <Settings
                    subjects={subjects}
                    students={students}
                    onUpdateStudentsAndSubjects={handleUpdateStudentsAndSubjects}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Footer credits inside viewport */}
        <footer className="bg-slate-900 text-slate-400 py-6 border-t border-slate-950 text-xs shrink-0 mt-auto">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center md:text-left">
              <span className="font-extrabold text-slate-200">Sistem Headcount SPM © 2026.</span>
              <p className="text-[10px] text-slate-500">
                Dibangunkan khas untuk pengurusan panitia dan perancangan intervensi akademik mengikut gred rasmi Lembaga Peperiksaan Malaysia.
              </p>
            </div>
            <div className="flex gap-4">
              <a href="https://ai.studio/build" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">Google AI Studio Build</a>
            </div>
          </div>
        </footer>
      </div>

      {/* Custom Reset DB Confirmation Overlay Modal */}
      <AnimatePresence>
        {showResetConfirm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl p-6 relative overflow-hidden"
            >
              <div className="p-3 bg-amber-100 text-amber-850 inline-flex rounded-xl mb-4">
                <AlertCircle size={24} className="text-amber-600" />
              </div>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                Kosongkan Database?
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Adakah anda pasti mahu mengosongkan semua data murid dari database? Semua rekod calon dan markah yang didaftarkan akan dipadamkan sepenuhnya.
              </p>
              
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleResetToSeed}
                  className="flex-1 p-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider transition shadow-sm"
                >
                  Ya, Kosongkan DB
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
