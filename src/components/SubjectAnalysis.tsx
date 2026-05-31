import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  BookOpen, 
  TrendingDown, 
  TrendingUp, 
  Award, 
  Users, 
  ListOrdered,
  Sparkles,
  ClipboardList
} from 'lucide-react';
import { Student, Subject, ExamType, calculateGrade, getGradeColor } from '../types';
import { calculateGPMP, getSubjectGradeDistribution } from '../utils';

interface SubjectAnalysisProps {
  students: Student[];
  subjects: Subject[];
  onSelectStudent: (student: Student) => void;
}

export default function SubjectAnalysis({ students, subjects, onSelectStudent }: SubjectAnalysisProps) {
  const [selectedSubId, setSelectedSubId] = useState(subjects[0]?.id || '1103');
  const [examPhase, setExamPhase] = useState<ExamType>('ar1');

  const activeSubject = subjects.find(s => s.id === selectedSubId) || subjects[0];

  // Subject statistics
  const formatGPMP = (val: number | null) => (val === null ? '-' : val.toFixed(2));
  const gpmpTOV = formatGPMP(calculateGPMP(students, selectedSubId, 'tov'));
  const gpmpOTR1 = formatGPMP(calculateGPMP(students, selectedSubId, 'otr1'));
  const gpmpAR1 = formatGPMP(calculateGPMP(students, selectedSubId, 'ar1'));
  const gpmpOTR2 = formatGPMP(calculateGPMP(students, selectedSubId, 'otr2'));
  const gpmpAR2 = formatGPMP(calculateGPMP(students, selectedSubId, 'ar2'));
  const gpmpPPT = formatGPMP(calculateGPMP(students, selectedSubId, 'ppt'));
  const gpmpETR = formatGPMP(calculateGPMP(students, selectedSubId, 'etr'));

  // Distribution chart data
  const chartData = getSubjectGradeDistribution(students, selectedSubId, 'ppt').map(item => {
    // Tally other phases for complete view
    const tovList = getSubjectGradeDistribution(students, selectedSubId, 'tov');
    const ar1List = getSubjectGradeDistribution(students, selectedSubId, 'ar1');
    const ar2List = getSubjectGradeDistribution(students, selectedSubId, 'ar2');
    const etrList = getSubjectGradeDistribution(students, selectedSubId, 'etr');
    
    return {
      grade: item.grade,
      TOV: tovList.find(i => i.grade === item.grade)?.count || 0,
      PPT: item.count,
      AR1: ar1List.find(i => i.grade === item.grade)?.count || 0,
      AR2: ar2List.find(i => i.grade === item.grade)?.count || 0,
      ETR: etrList.find(i => i.grade === item.grade)?.count || 0
    };
  });

  // Calculate subject-specific counters
  const studentSubjectList = students.filter(student => 
    student.scores.some(s => s.subjectId === selectedSubId)
  );

  const getTally = (phase: ExamType) => {
    let lulus = 0;
    let gagal = 0;
    let absent = 0;
    let cemerlang = 0;

    studentSubjectList.forEach(student => {
      const scoreObj = student.scores.find(s => s.subjectId === selectedSubId);
      if (scoreObj) {
        const score = scoreObj[phase];
        if (score === -1) absent++;
        else if (score >= 40) {
          lulus++;
          if (score >= 70) cemerlang++;
        } else {
          gagal++;
        }
      } else {
        absent++;
      }
    });

    return { lulus, gagal, absent, cemerlang };
  };

  const tallyTOV = getTally('tov');
  const tallyOTR1 = getTally('otr1');
  const tallyAR1 = getTally('ar1');
  const tallyOTR2 = getTally('otr2');
  const tallyAR2 = getTally('ar2');
  const tallyPPT = getTally('ppt');
  const tallyETR = getTally('etr');

  const getActiveTally = () => {
    switch (examPhase) {
      case 'tov': return tallyTOV;
      case 'otr1': return tallyOTR1;
      case 'ar1': return tallyAR1;
      case 'otr2': return tallyOTR2;
      case 'ar2': return tallyAR2;
      case 'ppt': return tallyPPT;
      case 'etr': return tallyETR;
    }
  };

  const activeTally = getActiveTally();

  // Student ranking list for the active subject
  const studentsRanked = studentSubjectList
    .map(student => {
      const scoreObj = student.scores.find(s => s.subjectId === selectedSubId);
      const val = scoreObj ? (scoreObj[examPhase] ?? -1) : -1;
      return {
        student,
        score: val,
        grade: calculateGrade(val)
      };
    })
    .sort((a, b) => b.score - a.score);

  return (
    <div className="space-y-6">
      {/* Subject Controller */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900">Analisa Prestasi Panitia Subjek</h2>
          <p className="text-xs text-slate-500">Pilih subjek kurikulum untuk meninjau GPMP semasa, taburan gred bertingkat, dan senarai kedudukan markah.</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold whitespace-nowrap">
            <BookOpen size={14} className="text-blue-600" /> Subjek:
          </div>
          <select
            value={selectedSubId}
            onChange={e => setSelectedSubId(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-250 py-2.5 px-3.5 rounded-xl font-bold text-slate-800"
          >
            {subjects.map(sub => (
              <option key={sub.id} value={sub.id}>{sub.name} ({sub.code})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid: GPMP & Phase stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card: GPMP comparisons */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between" id="gpmp-compare-card">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 text-[10px] font-black uppercase tracking-wider">PRESTASI GPMP SUBJEK</span>
              <span className="text-[10px] font-bold text-slate-450">Sasaran Akhir: {gpmpETR}</span>
            </div>
            
            {/* Display Gred Purata */}
            <div className="flex items-baseline gap-2.5 pt-2">
              <span className="text-3xl font-black text-blue-650">
                {examPhase === 'tov' ? gpmpTOV :
                 examPhase === 'otr1' ? gpmpOTR1 :
                 examPhase === 'ar1' ? gpmpAR1 :
                 examPhase === 'otr2' ? gpmpOTR2 :
                 examPhase === 'ar2' ? gpmpAR2 :
                 examPhase === 'ppt' ? gpmpPPT : gpmpETR}
              </span>
              <span className="text-xs font-bold text-slate-500">GPMP ({examPhase.toUpperCase()})</span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 grid grid-cols-4 gap-1 text-[10px] font-mono text-slate-500">
            <span>TOV: <strong className="text-slate-700">{gpmpTOV}</strong></span>
            <span>AR1: <strong className="text-blue-600">{gpmpAR1}</strong></span>
            <span>AR2: <strong className="text-emerald-600">{gpmpAR2}</strong></span>
            <span>ETR: <strong className="text-emerald-700">{gpmpETR}</strong></span>
          </div>
        </div>

        {/* Card: Tally Lulus Gagal */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between" id="subject-passing-card">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-1 flex-wrap">
              <span className="text-slate-500 text-[10px] font-black uppercase tracking-wider text-slate-700">TALLY KELULUSAN</span>
              
              {/* Exam Phase switcher */}
              <div className="bg-slate-100 p-0.5 rounded-lg flex flex-wrap gap-0.5">
                {([
                  { id: 'tov', label: 'TOV' },
                  { id: 'otr1', label: 'OTR1' },
                  { id: 'ar1', label: 'AR1 (PPT T5)' },
                  { id: 'otr2', label: 'OTR2' },
                  { id: 'ar2', label: 'AR2 (Prc)' },
                  { id: 'ppt', label: 'PPT T4' },
                  { id: 'etr', label: 'ETR' }
                ]).map(p => (
                  <button
                    key={p.id}
                    onClick={() => setExamPhase(p.id as ExamType)}
                    className={`px-1.5 py-0.5 rounded text-[8px] uppercase font-mono font-black transition-all ${
                      examPhase === p.id ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-baseline gap-3 pt-2">
              <span className="text-3xl font-black text-slate-900">{activeTally.lulus}</span>
              <span className="text-xs text-slate-550">Calon Lulus (Gred A-E)</span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-[11px] font-mono text-slate-500">
            <span>Gagal: <span className="font-extrabold text-rose-600">{activeTally.gagal}</span></span>
            <span>Semua Calon: <span className="font-extrabold text-slate-700">{studentSubjectList.length}</span></span>
            <span>TH: <span className="font-extrabold text-slate-700">{activeTally.absent}</span></span>
          </div>
        </div>

        {/* Card: Passing rate visual percentage representation */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="space-y-2">
            <span className="text-slate-500 text-[10px] font-black uppercase tracking-wider text-slate-700">% PERATUS LULUS</span>
            
            <div className="flex items-baseline gap-2 pt-2">
              <span className="text-3xl font-black text-blue-655">
                {studentSubjectList.length > 0 
                  ? parseFloat(((activeTally.lulus / studentSubjectList.length) * 100).toFixed(1))
                  : 0}%
              </span>
              <span className="text-xs text-slate-500">Kadar Lulus Terkumpul ({examPhase.toUpperCase()})</span>
            </div>
          </div>

          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                examPhase === 'tov' ? 'bg-slate-400' :
                examPhase === 'ar1' ? 'bg-indigo-600' :
                examPhase === 'ar2' ? 'bg-amber-500' :
                examPhase === 'etr' ? 'bg-emerald-500' : 'bg-blue-600'
              }`}
              style={{ 
                width: `${studentSubjectList.length > 0 ? (activeTally.lulus / studentSubjectList.length) * 100 : 0}%` 
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Visual Tally Breakdowns & Grade Tally Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recharts chart comparing grades in selected subject */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs lg:col-span-2 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Perbandingan Taburan Gred - {activeSubject.name}</h3>
            <p className="text-xs text-slate-500">Unjuran anjakan bilangan calon mengikut gred mengikut fasa headcount</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="grade" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="TOV" name="TOV" fill="#94a3b8" radius={[2, 2, 0, 0]} />
                <Bar dataKey="PPT" name="PPT T4" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                <Bar dataKey="AR1" name="AR 1 (PPT T5)" fill="#6366f1" radius={[2, 2, 0, 0]} />
                <Bar dataKey="AR2" name="AR 2 (Trial)" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                <Bar dataKey="ETR" name="ETR Sasaran" fill="#10b981" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Student Ranking List in selected subject */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Kedudukan Markah Calon ({examPhase})</h3>
              <p className="text-xs text-slate-500">Senarai pelajar diurutkan mengikut markah tinggi ke rendah bagi subjek rujukan</p>
            </div>

            <div className="space-y-2 overflow-y-auto max-h-72 pr-1">
              {studentsRanked.map((item, idx) => (
                <div
                  key={item.student.id}
                  onClick={() => onSelectStudent(item.student)}
                  className="p-2.5 bg-slate-50 hover:bg-blue-50/50 rounded-xl border border-slate-200/60 transition cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 w-4">{idx + 1}</span>
                    <span className="text-xs font-bold text-slate-700 line-clamp-1">{item.student.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-slate-800">{item.score === -1 ? 'TH' : `${item.score}%`}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded leading-none ${getGradeColor(item.grade)}`}>
                      {item.grade}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-blue-600 font-bold hover:text-blue-800" onClick={() => onSelectStudent(studentsRanked[0]?.student)}>
            <span>Urus profil calon pertama</span>
            <span>&rarr;</span>
          </div>
        </div>
      </div>
    </div>
  );
}
