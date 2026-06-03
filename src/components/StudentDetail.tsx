import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { 
  Sparkles, 
  ArrowLeft, 
  User, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Edit3, 
  Save, 
  Plus, 
  Calendar, 
  BookOpen, 
  ListRestart,
  HeartHandshake
} from 'lucide-react';
import { Student, Subject, calculateGrade, getGradeColor, getGradeDesc } from '../types';
import { calculateStudentGPP, checkLayakSijil, getExams } from '../utils';
import ReactMarkdown from 'react-markdown';

interface StudentDetailProps {
  student: Student;
  subjects: Subject[];
  onBack: () => void;
  onUpdateStudent: (updatedStudent: Student) => void;
}

export default function StudentDetail({ student, subjects, onBack, onUpdateStudent }: StudentDetailProps) {
  const [editedScores, setEditedScores] = useState<typeof student.scores>([...student.scores]);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  
  // Score form states
  const [editValues, setEditValues] = useState<Record<string, number>>({});

  // Gemini AI state
  const [aiPlan, setAiPlan] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  // Calculate current computed GPP
  const tempStudent = { ...student, scores: editedScores };
  const currentGppTOV = calculateStudentGPP(tempStudent, 'tov');
  const currentGppPPT = calculateStudentGPP(tempStudent, 'ppt');
  const currentGppETR = calculateStudentGPP(tempStudent, 'etr');
  const certStatus = checkLayakSijil(tempStudent, 'ar1'); // Use AR1 for layak sijil check

  // Subjects dropdown for adding a missing subject score
  const availableSubToAdd = subjects.filter(
    sub => !editedScores.some(s => s.subjectId === sub.id)
  );
  const [subToAddId, setSubToAddId] = useState(availableSubToAdd[0]?.id || '');

  const startEditing = (subId: string, scoreRecord: Record<string, any>) => {
    setEditingSubId(subId);
    const initialVals: Record<string, number> = {};
    getExams().forEach(exam => {
      const val = scoreRecord[exam.id];
      initialVals[exam.id] = (val === undefined || val === null || val === -1) ? 0 : val;
    });
    setEditValues(initialVals);
  };

  const saveRowScores = (subId: string) => {
    const updated = editedScores.map(scoreObj => {
      if (scoreObj.subjectId === subId) {
        const copy: Record<string, any> = { ...scoreObj };
        getExams().forEach(exam => {
          const val = editValues[exam.id];
          copy[exam.id] = val !== undefined ? Math.min(100, Math.max(-1, val)) : null;
        });
        return copy as typeof student.scores[0];
      }
      return scoreObj;
    });
    setEditedScores(updated);
    
    // Save to global state
    onUpdateStudent({
      ...student,
      scores: updated
    });

    setEditingSubId(null);
  };

  const removeRowScore = (subId: string) => {
    const updated = editedScores.filter(s => s.subjectId !== subId);
    setEditedScores(updated);
    onUpdateStudent({
      ...student,
      scores: updated
    });
  };

  const appendNewSubjectScore = () => {
    if (!subToAddId) return;
    const newRow = {
      subjectId: subToAddId,
      tov: 40,
      otr1: 43,
      ar1: 43,
      otr2: 46,
      ar2: 46,
      ppt: 45,
      etr: 55
    };
    const updated = [...editedScores, newRow];
    setEditedScores(updated);
    onUpdateStudent({
      ...student,
      scores: updated
    });
    setSubToAddId('');
  };

  // call local server wrapper for Gemini API
  const generateAIIntervention = async () => {
    setIsAiLoading(true);
    setAiError('');
    setAiPlan('');

    // Prepare subject payloads
    const payloadSubjects = editedScores.map(scoreObj => {
      const s = subjects.find(sub => sub.id === scoreObj.subjectId);
      return {
        name: s?.name || "Sabjek",
        code: s?.code || "",
        tovScore: scoreObj.tov,
        tovGrade: calculateGrade(scoreObj.tov),
        pptScore: scoreObj.ppt,
        pptGrade: calculateGrade(scoreObj.ppt),
        etrScore: scoreObj.etr,
        etrGrade: calculateGrade(scoreObj.etr)
      };
    });

    try {
      const response = await fetch('/api/gemini/intervention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: student.name,
          clazz: student.clazz,
          subjects: payloadSubjects
        })
      });

      if (!response.ok) {
        throw new Error('Ralat tindak balas pelayan.');
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setAiPlan(data.text || 'Tiada cadangan dijana.');
    } catch (err: any) {
      console.error(err);
      // fallback Offline Intervention Plan if API key not validated or network drops
      setAiError(err.message || 'Gagal menghubungi pakar AI.');
      generateOfflineFallbackPlan();
    } finally {
      setIsAiLoading(false);
    }
  };

  const generateOfflineFallbackPlan = () => {
    // Elegant fallback mock plan based on client analytics
    const failedSujects = editedScores.filter(s => s.ppt < 40 && s.ppt !== -1);
    const failedText = failedSujects.map(s => {
      const sub = subjects.find(subObj => subObj.id === s.subjectId);
      return `* **${sub?.name}**: Mempunyai markah semasa **${s.ppt}%** berbanding sasaran ETR **${s.etr}%**.`;
    }).join('\n');

    const offlineAdvice = `
### 📘 PELAN INTERVENSI AKADEMIK (MAKLUMAT DIAGNOSTIK LUAR TALIAN)

*Analisis dijana secara tempatan oleh Sistem Headcount disebabkan ketiadaan sambungan API Gemini aktif.*

#### 1. Status Kelayakan Sijil Terkini
* **Bahasa Melayu & Sejarah**: Keputusan menunjukkan pelajar **${certStatus.passed ? 'LAYAK' : 'BELUM LAYAK'}** mendapat sijil berdasarkan peperiksaan PPT terkini.
* Bahagian wajib lulus memerlukan gred minimum E (>= 40%) bagi kedua-dua komponen Bahasa Melayu dan Sejarah.

#### 2. Ulasan Subjek Sasaran
${failedText || "* Tiada subjek teras dengan gred gagal dikesan secara aktif. Semua subjek sedia ada berada dalam landasan lulus.*"}

#### 3. Cadangan Rangka Tindakan Menjawab
* **Gunakan Teknik Latih Tubi 5 Tahun (Klon SPM)**: Pastikan setiap subjek kritikal disokong latihan kertas soalan peperiksaan sebenar SPM yang lepas.
* **Strategi Pecahan Markah (Kertas 1 dsn Kertas 2)**: Berikan perhatian kepada soalan berunsur KBAT berasaskan kata tugas di skema jawapan rasmi.
* **Mentor-Mentee**: Libatkan pelajar dalam kumpulan ulangkaji berpandu bersama murid cemerlang di kelas.
`;
    setAiPlan(offlineAdvice);
  };

  // Chart data prepare for Student scorecard
  const chartData = editedScores.map(scoreObj => {
    const s = subjects.find(sub => sub.id === scoreObj.subjectId);
    return {
      name: s?.name ? (s.name.length > 15 ? `${s.name.substring(0, 13)}...` : s.name) : 'Subjek',
      'TOV Markah': scoreObj.tov === -1 ? 0 : scoreObj.tov,
      'PPT Markah': scoreObj.ppt === -1 ? 0 : scoreObj.ppt,
      'ETR Markah': scoreObj.etr === -1 ? 0 : scoreObj.etr
    };
  });

  return (
    <div className="space-y-6">
      {/* Back button & Action rail */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 rounded-xl transition flex items-center gap-2"
          id="btn-back-to-db"
        >
          <ArrowLeft size={14} /> Back to Database
        </button>
        <span className="text-xs font-mono text-slate-400">ID IC Calon: {student.id}</span>
      </div>

      {/* Student Profile Header Header Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center font-bold text-blue-600 text-lg">
              <User size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">{student.name}</h2>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 mt-1.5">
                <span className="text-xs bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-lg">Kelas: {student.clazz}</span>
                {student.jantina && (
                  <span className="text-xs bg-sky-50 text-sky-800 border border-sky-100/50 px-2 py-0.5 rounded-lg font-bold">
                    Jantina: {student.jantina === 'L' || student.jantina === 'LELAKI' ? 'LELAKI' : student.jantina === 'P' || student.jantina === 'PEREMPUAN' ? 'PEREMPUAN' : student.jantina}
                  </span>
                )}
                {student.kod && (
                  <span className="text-xs bg-slate-50 text-slate-600 border border-slate-200/60 px-2 py-0.5 rounded-lg font-mono">
                    Kod: {student.kod}
                  </span>
                )}
                {student.kodSekolah && (
                  <span className="text-xs bg-indigo-50 text-indigo-800 border border-indigo-100/50 px-2 py-0.5 rounded-lg font-mono font-medium">
                    Kod Sekolah: {student.kodSekolah}
                  </span>
                )}
                {student.sekolah && (
                  <span className="text-xs bg-sky-50 text-sky-900 border border-sky-100/50 px-2 py-0.5 rounded-lg font-semibold">
                    Sekolah: {student.sekolah}
                  </span>
                )}
                {student.ppd && (
                  <span className="text-xs bg-amber-55 text-amber-800 border border-amber-100/50 px-2 py-0.5 rounded-lg font-semibold">
                    PPD: {student.ppd}
                  </span>
                )}
                {student.jpn && (
                  <span className="text-xs bg-violet-50 text-violet-800 border border-violet-100/50 px-2 py-0.5 rounded-lg font-semibold">
                    JPN: {student.jpn}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats Grid inside */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="p-3 bg-slate-50 border border-slate-200/50 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">GPP (TOV)</span>
              <span className="text-base font-black text-slate-600 font-mono mt-0.5 block">{currentGppTOV}</span>
            </div>
            <div className="p-3 bg-blue-50/50 border border-blue-100/50 rounded-xl text-center">
              <span className="text-[10px] text-slate-550 font-black uppercase tracking-wider block">GPP (PPT)</span>
              <span className="text-base font-black text-blue-650 font-mono mt-0.5 block">{currentGppPPT}</span>
            </div>
            <div className="p-3 bg-emerald-50 border border-emerald-200/50 rounded-xl text-center">
              <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block">GPP (ETR)</span>
              <span className="text-base font-black text-emerald-650 font-mono mt-0.5 block">{currentGppETR}</span>
            </div>
          </div>
        </div>

        {/* Certificate Eligibility Widget */}
        <div className="p-4 rounded-xl border flex flex-col justify-between" style={{
          backgroundColor: certStatus.passed ? 'rgba(16, 185, 129, 0.04)' : 'rgba(239, 68, 68, 0.04)',
          borderColor: certStatus.passed ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'
        }}>
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              {certStatus.passed ? (
                <CheckCircle2 size={18} className="text-emerald-500" />
              ) : (
                <AlertTriangle size={18} className="text-rose-500 animate-pulse" />
              )}
              <span className="text-xs font-black uppercase tracking-wider text-slate-800">Syarat Pensijilan SPM</span>
            </div>
            <p className="text-xs text-slate-600 leading-normal">
              Pelajar ini **{certStatus.passed ? 'layak' : 'belum layak'}** menerima Sijil SPM berdasarkan keputusan peperiksaan PPT semasa.
            </p>
          </div>
          <div className="pt-3 border-t border-slate-200/40 text-[11px] font-semibold text-slate-500 block">
            Sebab: <span className="font-extrabold text-slate-850 block">{certStatus.reason}</span>
          </div>
        </div>
      </div>

      {/* Mark Tracker & Interactive Chart Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Coursework Scorecard Tweak Table (Col span 2) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Ubah Suai Markah & Target Calon</h3>
              <p className="text-xs text-slate-500">Klik "Edit" di baris subjek untuk mensimulasi markah TOV, PPT rujukan dsn ETR.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-extrabold uppercase bg-slate-50/40 text-center">
                    <th className="py-2.5 px-3 text-left">Subjek</th>
                    {getExams().map(exam => {
                      let colorClass = "text-slate-500 font-extrabold";
                      if (exam.id.startsWith('ar')) colorClass = "text-blue-800 font-black";
                      else if (exam.id === 'etr') colorClass = "text-emerald-700 font-black bg-emerald-50/25";
                      else if (exam.id.startsWith('otr')) colorClass = "text-blue-600 font-bold";
                      return (
                        <th key={exam.id} className={`py-2.5 px-2 w-20 ${colorClass}`}>
                          {exam.label}
                        </th>
                      );
                    })}
                    <th className="py-2.5 px-3 text-right w-16">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {editedScores.map(scoreObj => {
                    const sub = subjects.find(s => s.id === scoreObj.subjectId);
                    const isEditing = editingSubId === scoreObj.subjectId;

                    return (
                      <tr key={scoreObj.subjectId} className="hover:bg-slate-50/40 text-center">
                        {/* Subject name & category */}
                        <td className="py-3 px-3 text-left">
                          <span className="font-extrabold text-slate-800 block">{sub?.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{sub?.code ? `Kod: ${sub.code}` : ''} • {sub?.category}</span>
                        </td>

                        {/* Dynamic Score cells */}
                        {getExams().map(exam => {
                          const examVal = scoreObj[exam.id];
                          const isEtr = exam.id === 'etr';
                          const bgClass = exam.id.startsWith('ar') ? 'bg-blue-50/10' : exam.id === 'etr' ? 'bg-emerald-50/5' : '';
                          return (
                            <td key={exam.id} className={`py-3 px-1 ${bgClass}`}>
                              {isEditing ? (
                                <input
                                  type="number"
                                  min={-1}
                                  max={100}
                                  value={editValues[exam.id] !== undefined ? editValues[exam.id] : ''}
                                  onChange={e => setEditValues({
                                    ...editValues,
                                    [exam.id]: parseInt(e.target.value) || 0
                                  })}
                                  className={`w-12 py-1 text-center font-bold border border-slate-300 rounded focus:border-blue-500 ${
                                    exam.id.startsWith('ar') ? 'text-blue-700' : isEtr ? 'text-emerald-800' : 'text-slate-700'
                                  }`}
                                />
                              ) : (
                                <div className="flex flex-col items-center">
                                  <span className={`font-bold ${exam.id.startsWith('ar') ? 'text-blue-700 font-extrabold' : exam.id === 'etr' ? 'text-emerald-600' : 'text-slate-705'}`}>
                                    {examVal === -1 ? 'TH' : (examVal !== undefined && examVal !== null) ? examVal : '-'}
                                  </span>
                                  {examVal !== undefined && examVal !== null && examVal !== -1 && (
                                    <span className={`text-[9px] font-semibold px-1 rounded block mt-0.5 ${getGradeColor(calculateGrade(examVal))}`}>
                                      {calculateGrade(examVal)}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                          );
                        })}

                        {/* Row operation buttons */}
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isEditing ? (
                              <button
                                onClick={() => saveRowScores(scoreObj.subjectId)}
                                className="p-1 px-2.5 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-500 flex items-center gap-1"
                              >
                                <Save size={12} /> Pin
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEditing(scoreObj.subjectId, scoreObj)}
                                  className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded"
                                  title="Edit Markah"
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button
                                  onClick={() => removeRowScore(scoreObj.subjectId)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded"
                                  title="Gugur Subjek"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Quick add missing subjects form section */}
            {availableSubToAdd.length > 0 && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/50 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="font-bold text-slate-600 flex items-center gap-1.5">
                  <Plus size={14} /> Daftar Tambah Subjek Elektif:
                </span>
                <div className="flex gap-2 items-center">
                  <select
                    value={subToAddId}
                    onChange={e => setSubToAddId(e.target.value)}
                    className="p-1.5 px-3 border border-slate-200 bg-white rounded-lg text-slate-700 font-semibold"
                  >
                    <option value="">-- Pilih subjek --</option>
                    {availableSubToAdd.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.name} ({sub.code})</option>
                    ))}
                  </select>
                  <button
                    onClick={appendNewSubjectScore}
                    disabled={!subToAddId}
                    className="p-2 bg-blue-50 text-blue-700 font-extrabold rounded-lg disabled:opacity-40 hover:bg-blue-100 transition"
                  >
                    Tambah Subjek
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Student Single Chart Widget */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Perbandingan Profil Markah</h3>
              <p className="text-xs text-slate-500">Unjuran peningkatan prestasi daripada penanda penanda rujukan</p>
            </div>
            {chartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 0, left: -25, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} />
                    <YAxis domain={[0, 100]} stroke="#64748b" fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} iconType="circle" />
                    <Bar dataKey="TOV Markah" fill="#94a3b8" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="PPT Markah" fill="#2563eb" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="ETR Markah" fill="#10b981" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs">Daftar sekurang-kurangnya satu subjek untuk melukis profil graf.</div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 p-3 bg-blue-50/40 rounded-xl">
            <span className="text-[10px] font-black uppercase text-blue-700 block tracking-widest mb-1">Misi Headcount:</span>
            <p className="text-[11px] text-slate-600 leading-normal">
              Pastikan sasaran **ETR** disusun berperingkat dari TOV. Guru dinasihati membimbing pelajar mengikut pelan intervensi yang dirancang di bawah.
            </p>
          </div>
        </div>
      </div>

      {/* AI Intervention Planner Powered by Gemini Client */}
      <div className="bg-gradient-to-br from-slate-900 to-blue-950 p-6 rounded-2xl border border-blue-500/20 text-white shadow-lg space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/25 rounded-xl border border-blue-400/35 text-blue-300">
              <Sparkles size={22} className="animate-spin-slow" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Intervensi Akademik AI Gemini</h3>
              <p className="text-xs text-blue-250">Menjana pelan tindakan, bimbingan menjawab, dan modul belajar berdasarkan gred.</p>
            </div>
          </div>
          
          <button
            onClick={generateAIIntervention}
            disabled={isAiLoading}
            className="px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-md disabled:opacity-40"
            id="btn-trigger-ai"
          >
            <Sparkles size={14} className="text-blue-600 animate-pulse" />
            {isAiLoading ? 'Menyusun Intervensi...' : 'Jana Rancangan Intervensi'}
          </button>
        </div>

        {/* loader states */}
        {isAiLoading && (
          <div className="p-8 bg-white/5 border border-white/10 rounded-2xl text-center space-y-4">
            <div className="relative inline-block">
              <div className="w-12 h-12 rounded-full border-4 border-slate-700 border-t-white animate-spin"></div>
            </div>
            <div className="space-y-1">
              <span className="text-sm font-semibold text-slate-200 block">Kecerdasan Buatan sedang meneliti headcount...</span>
              <p className="text-[11px] text-blue-300">Menyusun strategi latih tubi, cadangan lulus wajib BM/Sejarah sekolah, dsb.</p>
            </div>
          </div>
        )}

        {/* Display response schema block */}
        {aiPlan && !isAiLoading && (
          <div className="p-6 bg-slate-950/80 border border-blue-900/40 rounded-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="text-xs font-mono text-blue-300 flex items-center gap-1.5 uppercase font-bold">
                <HeartHandshake size={14} /> Pelan Tindakan Dicadangkan:
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(aiPlan);
                    alert('Pelan tindakan disalin ke klipbod!');
                  }}
                  className="p-1.5 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] uppercase font-bold tracking-wider"
                >
                  Salin Pelan
                </button>
                <button
                  onClick={generateAIIntervention}
                  className="p-1.5 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[10px] uppercase font-bold tracking-wider"
                >
                  Jana Semula
                </button>
              </div>
            </div>

            {/* Render with React Markdown */}
            <div className="text-slate-350 text-xs leading-relaxed space-y-2 prose prose-invert max-w-none">
              <ReactMarkdown>{aiPlan}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Offline notice warning banner if fallback was used */}
        {aiError && !isAiLoading && (
          <div className="flex items-start gap-2.5 p-3.5 bg-yellow-500/10 border border-yellow-500/35 rounded-xl text-xs text-yellow-300 leading-normal">
            <AlertTriangle size={15} className="flex-shrink-0 mt-0.5 text-yellow-400" />
            <div>
              <span className="font-bold">Notifikasi:</span> Mengaktifkan pelan intervensi dari repositori tempatan (mod luar talian) sementara menanti persediaan API Gemini dalam Settings.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
