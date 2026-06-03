import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  UserPlus, 
  Filter, 
  CheckCircle, 
  XCircle, 
  BookOpen, 
  User,
  Hash,
  Sparkles,
  ClipboardList,
  AlertCircle
} from 'lucide-react';
import { Student, Subject } from '../types';
import { calculateStudentGPP, checkLayakSijil, getExams } from '../utils';

interface StudentDatabaseProps {
  students: Student[];
  subjects: Subject[];
  onAddStudent: (newStudent: Student) => void;
  onUpdateStudent: (updatedStudent: Student) => void;
  onDeleteStudent: (id: string) => void;
  onSelectStudent: (student: Student) => void;
}

export default function StudentDatabase({ 
  students, 
  subjects, 
  onAddStudent, 
  onUpdateStudent, 
  onDeleteStudent,
  onSelectStudent 
}: StudentDatabaseProps) {
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('Semua');
  const [selectedFilter, setSelectedFilter] = useState<'semua' | 'layak' | 'gagal' | 'cemerlang'>('semua');
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id || '');
  
  // Registration state
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIC, setNewIC] = useState('');
  const [newClass, setNewClass] = useState('');

  // Deletion state
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  // Filter students
  const filteredStudents = students.filter(student => {
    // Search match
    const nameMatch = student.name.toLowerCase().includes(searchTerm.toLowerCase());
    const icMatch = student.id.includes(searchTerm);
    const matchesSearch = nameMatch || icMatch;

    // Class match
    const matchesClass = selectedClass === 'Semua' || student.clazz === selectedClass;

    // Status match
    const cert = checkLayakSijil(student, 'ppt');
    const gpp = calculateStudentGPP(student, 'ppt');
    let matchesStatus = true;
    if (selectedFilter === 'layak') {
      matchesStatus = cert.passed;
    } else if (selectedFilter === 'gagal') {
      matchesStatus = !cert.passed;
    } else if (selectedFilter === 'cemerlang') {
      matchesStatus = gpp <= 3.0; // average of B/A
    }

    return matchesSearch && matchesClass && matchesStatus;
  });

  const uniqueClasses = [
    'Semua',
    ...Array.from(new Set(students.map(s => s.clazz).filter(Boolean))).sort()
  ];

  const formClasses = uniqueClasses.filter(c => c !== 'Semua');
  const availableClassesForRegistration = formClasses.length > 0 ? formClasses : ['4 UKM', '4 UM', '4 USM'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newIC.trim()) {
      alert('Sila isi nama pelajar dan nombor Kad Pengenalan dengan betul.');
      return;
    }

    // Initialize default scores for the student across core subjects
    const defaultScores = subjects.map(sub => ({
      subjectId: sub.id,
      tov: 40, // default TOV
      ppt: 45, // default PPT
      etr: 55  // default ETR target
    }));

    const finalClassForNewStudent = newClass || availableClassesForRegistration[0] || '4 UKM';
    const newStudent: Student = {
      id: newIC.replace(/[^0-9]/g, ''), // clean IC
      name: newName.trim().toUpperCase(),
      clazz: finalClassForNewStudent,
      scores: defaultScores
    };

    onAddStudent(newStudent);
    setIsAdding(false);
    setNewName('');
    setNewIC('');
  };

  return (
    <div className="space-y-6">
      {/* Title Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Database Calon SPM</h2>
          <p className="text-xs text-slate-500">Urus profil calon, tetapkan kelas, dan pantau markah pencapaian TOV, PPT, dan ETR.</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm self-start"
          id="btn-register-student"
        >
          <UserPlus size={16} />
          {isAdding ? "Tutup Borang" : "Daftar Calon Baru"}
        </button>
      </div>

      {/* Quick Add Form Pane */}
      {isAdding && (
        <form onSubmit={handleSubmit} className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 shadow-xs max-w-xl space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
            <Sparkles className="text-amber-500" size={16} />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Borang Pendaftaran Calon SPM</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Nama Pelajar</label>
              <input
                type="text"
                placeholder="CONTOH: AHMAD RAYYAN B. AMIN"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-blue-500 text-slate-800"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">No. Kad Pengenalan (IC)</label>
              <input
                type="text"
                placeholder="CONTOH: 020512101416"
                value={newIC}
                onChange={e => setNewIC(e.target.value)}
                maxLength={14}
                className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-blue-500 text-slate-800 font-mono"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Kelas</label>
              <select
                value={newClass || availableClassesForRegistration[0] || ''}
                onChange={e => setNewClass(e.target.value)}
                className="w-full text-sm px-3.5 py-2 rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:border-blue-500 text-slate-800 font-semibold"
              >
                {availableClassesForRegistration.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition rounded-xl flex items-center justify-center gap-2 shadow-sm"
              >
                <Plus size={16} />
                Sahkan Pendaftaran
              </button>
            </div>
          </div>
          <p className="text-[10px] text-slate-400">
            * Nota: Selepas berdaftar, subjek teras akan diisi secara automatik dengan markah permulaan (TOV: 40, PPT: 45, ETR: 55). Anda boleh menukar markah terperinci bagi subjek elektif dsb di profil pelajar.
          </p>
        </form>
      )}

      {/* Advanced Filter Rail */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          {/* Search bar input */}
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-2.5 text-slate-450">
              <Search size={16} />
            </span>
            <input
              type="text"
              placeholder="Cari nama atau No. IC pelajar..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9.5 pr-4 py-2 w-full text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Class Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
              <Filter size={14} /> Kelas:
            </span>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-250 py-2 px-3 rounded-lg font-bold text-slate-700"
            >
              {uniqueClasses.map(cls => (
                <option key={cls} value={cls}>{cls === 'Semua' ? 'Semua Kelas' : cls}</option>
              ))}
            </select>
          </div>

          {/* Subject Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5 whitespace-nowrap">
              <BookOpen size={14} className="text-blue-500" /> Subjek:
            </span>
            <select
              value={selectedSubjectId}
              onChange={e => setSelectedSubjectId(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-250 py-2 px-3 rounded-lg font-bold text-slate-700 font-sans"
            >
              {subjects.map(sub => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedFilter('semua')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
              selectedFilter === 'semua' ? 'bg-slate-900 text-white' : 'bg-slate-55 text-slate-650 hover:bg-slate-100 hover:text-slate-800'
            }`}
          >
            Semua Murid ({students.length})
          </button>
          <button
            onClick={() => setSelectedFilter('layak')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition border flex items-center gap-1.5 ${
              selectedFilter === 'layak' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-250' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <CheckCircle size={14} className="text-emerald-500" /> Layak Sijil
          </button>
          <button
            onClick={() => setSelectedFilter('gagal')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition border flex items-center gap-1.5 ${
              selectedFilter === 'gagal' 
                ? 'bg-rose-50 text-rose-800 border-rose-250' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <XCircle size={14} className="text-rose-500" /> Gagal BM/SEJ
          </button>
          <button
            onClick={() => setSelectedFilter('cemerlang')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition border flex items-center gap-1.5 ${
              selectedFilter === 'cemerlang' 
                ? 'bg-blue-50 text-blue-800 border-blue-250' 
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <ClipboardList size={14} className="text-blue-500" /> Haluan A
          </button>
        </div>
      </div>

      {/* Main Student Directory Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/60 border-b border-slate-200/60 flex items-center justify-between">
          <span className="text-xs font-black text-slate-800 uppercase tracking-widest">Talian Rekod Calon ({filteredStudents.length} padanan)</span>
          <span className="text-[10px] font-mono text-slate-400 bg-white border border-slate-200 px-2 py-0.5 rounded-md">Status PPT digunakan sebagai perbandingan asas</span>
        </div>

        {filteredStudents.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest bg-slate-50/40">
                  <th className="py-3 px-4">Nama Murid</th>
                  <th className="py-3 px-4">Kelas</th>
                  {getExams().map(exam => {
                    let colorClass = "text-slate-500 font-extrabold";
                    if (exam.id.startsWith('ar')) colorClass = "text-blue-800 font-black";
                    else if (exam.id === 'etr') colorClass = "text-emerald-600 font-black";
                    else if (exam.id.startsWith('otr')) colorClass = "text-blue-500 font-bold";
                    return (
                      <th key={exam.id} className={`py-3 px-3 text-center ${colorClass}`}>
                        {exam.label}
                      </th>
                    );
                  })}
                  <th className="py-3 px-4 text-center">Syarat Sijil T5 (AR1)</th>
                  <th className="py-3 px-4 text-right">Tindakan Pelan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredStudents.map((student, idx) => {
                  // Cert based on AR1 (PPT T5) or TOV if AR1 not set
                  const hasAr1 = student.scores.find(s => s.subjectId === '1103')?.ar1 !== undefined;
                  const cert = checkLayakSijil(student, hasAr1 ? 'ar1' : 'tov');
                  
                  const formatScore = (val: number | undefined | null, isPptOrEtr = false) => {
                    if (val === undefined || val === null) return '';
                    if (val === -1) return isPptOrEtr ? '' : 'TH';
                    return val.toString();
                  };

                  const scoreEntry = student.scores.find(s => s.subjectId === selectedSubjectId);

                  const renderCell = (val: string, colorClass: string = "text-slate-800") => {
                    if (val === '') return null;
                    if (val === 'TH') {
                      return <span className="text-rose-600 font-black bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded text-[10px]">TH</span>;
                    }
                    return <span className={`${colorClass} font-mono text-sm`}>{val}</span>;
                  };

                  return (
                    <tr 
                      key={student.id}
                      className="hover:bg-slate-50/50 transition cursor-pointer"
                      onClick={() => onSelectStudent(student)}
                    >
                      {/* Name & Identity */}
                      <td className="py-3.5 px-4 animate-fade-in">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-650 font-mono">
                            {idx + 1}
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-800 block leading-tight">{student.name}</span>
                          </div>
                        </div>
                      </td>

                      {/* Class */}
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg">
                          {student.clazz}
                        </span>
                      </td>

                      {/* Dynamic Score values */}
                      {getExams().map(exam => {
                        const scoreVal = scoreEntry ? formatScore(scoreEntry[exam.id], exam.id !== 'tov') : '';
                        let colorClass = "text-slate-500 font-semibold";
                        if (exam.id.startsWith('ar')) colorClass = "text-blue-800 font-extrabold";
                        if (exam.id === 'etr') colorClass = "text-emerald-600 font-black";
                        else if (exam.id.startsWith('otr')) colorClass = "text-blue-500 font-semibold";
                        const bgClass = exam.id.startsWith('ar') ? 'bg-blue-50/10' : exam.id === 'etr' ? 'bg-emerald-50/5' : '';
                        return (
                          <td key={exam.id} className={`py-3.5 px-3 text-center ${bgClass}`}>
                            {renderCell(scoreVal, colorClass)}
                          </td>
                        );
                      })}

                      {/* Certificate status */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center justify-center">
                          {cert.passed ? (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Layak
                            </span>
                          ) : (
                            <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> {cert.reason}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Quick actions code */}
                      <td className="py-3.5 px-4 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelectStudent(student)}
                            className="p-1 px-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-250 hover:border-blue-300 text-slate-700 hover:text-blue-750 text-xs rounded-lg transition font-semibold"
                          >
                            Urus Scorecard
                          </button>
                          <button
                            onClick={() => setStudentToDelete(student)}
                            className="p-1.5 bg-slate-55 hover:bg-rose-100 hover:text-rose-600 border border-slate-200 text-slate-400 rounded-lg transition"
                            title="Padam Rekod"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center">
            <ClipboardList className="mx-auto text-slate-300 mb-2" size={40} />
            <h3 className="text-sm font-bold text-slate-700">Tiada Pelajar Ditemui</h3>
            <p className="text-xs text-slate-450 max-w-sm mx-auto mt-1">Sila periksa kata carian atau penapis filter yang dipilih. Tiada rekod padanan ditemui.</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedClass('Semua');
                setSelectedFilter('semua');
              }}
              className="mt-4 text-xs font-semibold px-3 py-1.5 bg-blue-50 text-blue-750 rounded-lg border border-blue-200 hover:bg-blue-100"
            >
              Reset Semua Penapis
            </button>
          </div>
        )}
      </div>

      {/* Custom student deletion overlay confirmation modal */}
      <AnimatePresence>
        {studentToDelete && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl p-6 relative overflow-hidden text-left"
            >
              <div className="p-3 bg-rose-100 text-rose-750 inline-flex rounded-xl mb-4">
                <AlertCircle size={24} className="text-rose-600" />
              </div>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                Padam Rekod Pelajar?
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Adakah anda pasti mahu memadam semua rekod dan markah peperiksaan untuk pelajar <strong className="font-extrabold text-slate-800">{studentToDelete.name}</strong>? Tindakan ini tidak boleh diundurkan.
              </p>
              
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setStudentToDelete(null)}
                  className="flex-1 p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteStudent(studentToDelete.id);
                    setStudentToDelete(null);
                  }}
                  className="flex-1 p-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition shadow-sm"
                >
                  Sahkan Padam
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
