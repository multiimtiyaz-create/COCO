import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  BookOpen, 
  Calendar, 
  Plus, 
  Trash2, 
  Save, 
  AlertCircle, 
  Check, 
  Info, 
  AlertTriangle 
} from 'lucide-react';
import { Subject, Student } from '../types';
import { getExams, saveExams, getExcludedSubjectIds, Exam } from '../utils';

interface SettingsProps {
  subjects: Subject[];
  students: Student[];
  onUpdateStudentsAndSubjects: (students: Student[], subjects: Subject[]) => void;
}

export default function Settings({ subjects, students, onUpdateStudentsAndSubjects }: SettingsProps) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [excludedIds, setExcludedIds] = useState<string[]>([]);
  
  // New exam form state
  const [newExamLabel, setNewExamLabel] = useState('');
  const [newExamId, setNewExamId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    setExams(getExams());
    setExcludedIds(getExcludedSubjectIds());
  }, []);

  const handleToggleSubject = (subjectId: string) => {
    let updated;
    if (excludedIds.includes(subjectId)) {
      updated = excludedIds.filter(id => id !== subjectId);
    } else {
      updated = [...excludedIds, subjectId];
    }
    setExcludedIds(updated);
    localStorage.setItem('spm_headcount_excluded_subjects', JSON.stringify(updated));
    showSuccess('Tetapan pengecualian subjek berjaya disimpan!');
  };

  const handleDeleteSubject = (subjectId: string) => {
    const subToDelete = subjects.find(s => s.id === subjectId);
    if (!subToDelete) return;

    if (!window.confirm(`Adakah anda pasti mahu memadamkan subjek "${subToDelete.name}" sepenuhnya daripada sistem? Semua rekod markah peperiksaan murid bagi subjek ini juga akan dipadamkan.`)) {
      return;
    }

    const filteredSubjects = subjects.filter(sub => sub.id !== subjectId);
    const filteredStudents = students.map(student => ({
      ...student,
      scores: student.scores.filter(sc => sc.subjectId !== subjectId)
    }));

    onUpdateStudentsAndSubjects(filteredStudents, filteredSubjects);
    showSuccess(`Subjek "${subToDelete.name}" berjaya dipadam sepenuhnya dari sistem.`);
  };

  const handleAddExam = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const formattedId = newExamId.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    const label = newExamLabel.trim();

    if (!formattedId || !label) {
      setErrorMsg('Id Peperiksaan dan Label diperlukan.');
      return;
    }

    if (exams.some(exam => exam.id === formattedId)) {
      setErrorMsg(`Id Peperiksaan "${formattedId}" sudah ada dalam sistem.`);
      return;
    }

    const newExam: Exam = {
      id: formattedId,
      label: label,
      isCustom: true
    };

    const updatedExams = [...exams, newExam];
    setExams(updatedExams);
    saveExams(updatedExams);

    // Initialize the score properties for all students to prevent undefined issues
    const updatedStudents = students.map(student => ({
      ...student,
      scores: student.scores.map(score => ({
        ...score,
        [formattedId]: score[formattedId] !== undefined ? score[formattedId] : null
      }))
    }));
    onUpdateStudentsAndSubjects(updatedStudents, subjects);

    setNewExamId('');
    setNewExamLabel('');
    showSuccess(`Peperiksaan "${label}" dikemas kini ke dalam sistem.`);
  };

  const handleDeleteExam = (examId: string) => {
    const examToDelete = exams.find(e => e.id === examId);
    if (!examToDelete) return;

    if (!examToDelete.isCustom) {
      setErrorMsg('Peperiksaan asas sistem tidak boleh dipadamkan.');
      return;
    }

    if (!window.confirm(`Adakah anda pasti mahu memadamkan peperiksaan "${examToDelete.label}"? Semua markah yang diisi akan disingkirkan.`)) {
      return;
    }

    const updatedExams = exams.filter(e => e.id !== examId);
    setExams(updatedExams);
    saveExams(updatedExams);

    // Remove the custom key from all students scores
    const updatedStudents = students.map(student => ({
      ...student,
      scores: student.scores.map(score => {
        const copy = { ...score };
        delete copy[examId];
        return copy;
      })
    }));
    onUpdateStudentsAndSubjects(updatedStudents, subjects);

    showSuccess(`Peperiksaan "${examToDelete.label}" telah dipadam dari sistem.`);
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg('');
    }, 4000);
  };

  return (
    <div className="space-y-6" id="settings-component">
      {/* Header Panel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-3xs flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-slate-800">
            <SettingsIcon className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-black uppercase tracking-tight">Tetapan Sistem & Headcount</h2>
          </div>
          <p className="text-xs text-slate-500">
            Sesuaikan subjek pengiraan Gred Purata Sekolah (GPS) dan tambah rekod peperiksaan custom di sini.
          </p>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-850 p-4 rounded-xl flex items-center gap-3 text-xs font-bold animate-fade-in">
          <Check className="w-5 h-5 text-emerald-500 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-850 p-4 rounded-xl flex items-center gap-3 text-xs font-bold animate-fade-in">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Bento Grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Column 1: Excluded Subjects from GPS */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
              <BookOpen className="w-4 h-4 text-blue-500" />
              <h3 className="text-sm font-black text-slate-900 uppercase">Subjek Pengecualian GPS</h3>
            </div>
            
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Subjek yang diclear tanda semak (dinyahaktif) tidak akan dikira dalam data Gred Purata Murid (GPP) mahupun Gred Purata Sekolah (GPS) di mana-mana paparan scorecard/analisa.
            </p>

            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 divide-y divide-slate-100">
              {students.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <BookOpen className="w-12 h-12 text-slate-300 stroke-[1.2] mb-3" />
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Tiada Data Subjek</span>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[260px] leading-relaxed">
                    Sila muat naik fail data (CSV) pihak sekolah terlebih dahulu. Senarai subjek berdaftar hanya akan muncul setelah data berjaya dimuat naik.
                  </p>
                </div>
              ) : (
                subjects.map((sub) => {
                  const isIncluded = !excludedIds.includes(sub.id);
                  return (
                    <div key={sub.id} className="flex items-center justify-between py-2.5 first:pt-0">
                      <div>
                        <span className="font-extrabold text-slate-905 block text-sm">{sub.name}</span>
                        <span className="text-[10px] text-slate-450 font-mono">ID: {sub.id} • Kod: {sub.code} • {sub.category}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleSubject(sub.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-150 flex items-center gap-1.5 ${
                            isIncluded 
                              ? 'bg-blue-55 text-blue-600 hover:bg-blue-100 border border-blue-200' 
                              : 'bg-slate-100 text-slate-400 hover:bg-slate-200 border border-slate-250'
                          }`}
                        >
                          {isIncluded ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              Dikira GPS
                            </>
                          ) : (
                            <>
                              <Info className="w-3.5 h-3.5" />
                              Dikecualikan
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteSubject(sub.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-xl transition-all duration-150"
                          title="Padam Subjek"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 bg-amber-50/50 p-3 rounded-xl border border-amber-100 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-slate-600 leading-relaxed">
              <strong>Maklumat Khas:</strong> Perubahan tetapan pengecualian subjek akan diaplikasikan serta-merta pada pengiraan statistik di Dashboard Utama dan Analisa Panitia secara dinamik.
            </div>
          </div>
        </div>

        {/* Column 2: Exams Management (Tambah Peperiksaan) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="space-y-5">
            <div>
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
                <Calendar className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-black text-slate-900 uppercase">Daftar & Urus Peperiksaan</h3>
              </div>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                Anda dilayakkan menambah peperiksaan peringkat sekolah yang baru. Medan markah peperiksaan custom akan dibuka dalam profil calon secara automatik.
              </p>
            </div>

            {/* List of current exams */}
            <div className="space-y-2">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase block tracking-wider">Senarai Peperiksaan Berdaftar</span>
              <div className="grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto pr-1">
                {exams.map((exam) => (
                  <div key={exam.id} className="bg-slate-50 px-3 py-2 rounded-xl flex items-center justify-between border border-slate-200/60">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-slate-800">{exam.label}</span>
                      <span className="text-[9px] font-mono font-bold bg-white text-slate-450 px-1.5 py-0.5 rounded border border-slate-100 uppercase">{exam.id}</span>
                      {exam.isCustom && (
                        <span className="text-[8px] bg-indigo-50 text-indigo-700 font-black px-1.5 py-0.5 rounded border border-indigo-150 uppercase tracking-widest leading-none">Custom</span>
                      )}
                    </div>
                    {exam.isCustom && (
                      <button
                        type="button"
                        onClick={() => handleDeleteExam(exam.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Form: Add Custom Exam */}
            <form onSubmit={handleAddExam} className="bg-slate-50/60 p-4 border border-slate-200/85 rounded-2xl space-y-3.5">
              <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider block">Daftar Peperiksaan Baru</span>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-550 block font-bold mb-1 uppercase">Id Unik Peperiksaan</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="Contoh: uat5, ar3"
                    value={newExamId}
                    onChange={(e) => setNewExamId(e.target.value)}
                    className="w-full bg-white px-3 py-2 border border-slate-250 rounded-xl text-xs font-semibold focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                  <span className="text-[9px] text-slate-400 mt-1 block">Aksara abjad & nombor sahaja.</span>
                </div>

                <div>
                  <label className="text-[10px] text-slate-550 block font-bold mb-1 uppercase">Label Peperiksaan</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Akhir Tahun T5"
                    value={newExamLabel}
                    onChange={(e) => setNewExamLabel(e.target.value)}
                    className="w-full bg-white px-3 py-2 border border-slate-250 rounded-xl text-xs font-semibold focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                  <span className="text-[9px] text-slate-400 mt-1 block">Nama paparan di menu utama.</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full p-2.5 bg-blue-600 hover:bg-blue-700 font-extrabold text-xs text-white uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Plus className="w-4 h-4 text-white" />
                Daftar Peperiksaan Ke Sistem
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}
