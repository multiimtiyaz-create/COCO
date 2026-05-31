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
  Line,
  AreaChart,
  Area
} from 'recharts';
import { 
  GraduationCap, 
  Users, 
  Award, 
  BadgeAlert, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp,
  BookOpen,
  HelpCircle
} from 'lucide-react';
import { Student, Subject, ExamType } from '../types';
import { calculateOverallKPIs, calculateGPMP, calculateStudentGPP } from '../utils';

interface DashboardProps {
  students: Student[];
  subjects: Subject[];
  onSelectTab: (tab: string) => void;
  onSelectStudent: (student: Student) => void;
}

export default function Dashboard({ students, subjects, onSelectTab, onSelectStudent }: DashboardProps) {
  const [activeSegment, setActiveSegment] = useState<ExamType>('ar1');

  // Calculate KPIs for all phases
  const tovKPI = calculateOverallKPIs(students, 'tov');
  const otr1KPI = calculateOverallKPIs(students, 'otr1');
  const ar1KPI = calculateOverallKPIs(students, 'ar1');
  const otr2KPI = calculateOverallKPIs(students, 'otr2');
  const ar2KPI = calculateOverallKPIs(students, 'ar2');
  const pptKPI = calculateOverallKPIs(students, 'ppt');
  const etrKPI = calculateOverallKPIs(students, 'etr');

  const getKPI = (phase: ExamType) => {
    switch (phase) {
      case 'tov': return tovKPI;
      case 'otr1': return otr1KPI;
      case 'ar1': return ar1KPI;
      case 'otr2': return otr2KPI;
      case 'ar2': return ar2KPI;
      case 'ppt': return pptKPI;
      case 'etr': return etrKPI;
    }
  };

  const activeKPI = getKPI(activeSegment);

  // Prepare chart data for overall grade groups (TOV vs PPT vs ETR)
  // Let's divide students into Categories:
  // Cemerlang (A+, A, A-), Kepujian (B+, B, C+, C), Lulus (D, E), Gagal (G)
  const getGradeGroupData = () => {
    const groups = [
      { name: 'Cemerlang (A+/A/A-)', key: 'A', tov: 0, ppt: 0, etr: 0 },
      { name: 'Kepujian (B/C)', key: 'B_C', tov: 0, ppt: 0, etr: 0 },
      { name: 'Lulus (D/E)', key: 'D_E', tov: 0, ppt: 0, etr: 0 },
      { name: 'Gagal (G)', key: 'G', tov: 0, ppt: 0, etr: 0 },
    ];

    students.forEach(student => {
      ['tov', 'ppt', 'etr'].forEach(phase => {
        const p = phase as 'tov' | 'ppt' | 'etr';
        // Get student GPP
        const hasScore = student.scores.some(s => s[p] !== -1);
        if (!hasScore) return;

        // Count scores
        let gradeAs = 0;
        let gradeBCs = 0;
        let gradeDEs = 0;
        let gradeGs = 0;

        student.scores.forEach(s => {
          const score = s[p];
          if (score === -1) return;
          if (score >= 70) gradeAs++;
          else if (score >= 50) gradeBCs++;
          else if (score >= 40) gradeDEs++;
          else gradeGs++;
        });

        // Add to aggregate counts based on dominant class or just tally overall grades across all students
      });
    });

    // Alternatively, let's tally overall grades for ALL subject papers taken
    let tovTotal = 0, pptTotal = 0, etrTotal = 0;
    const gradesTally = {
      tov: { A: 0, BC: 0, DE: 0, G: 0 },
      ppt: { A: 0, BC: 0, DE: 0, G: 0 },
      etr: { A: 0, BC: 0, DE: 0, G: 0 }
    };

    students.forEach(student => {
      student.scores.forEach(s => {
        ['tov', 'ppt', 'etr'].forEach(phase => {
          const p = phase as 'tov' | 'ppt' | 'etr';
          const score = s[p];
          if (score === -1) return;

          if (score >= 70) {
            gradesTally[p].A++;
          } else if (score >= 50) {
            gradesTally[p].BC++;
          } else if (score >= 40) {
            gradesTally[p].DE++;
          } else {
            gradesTally[p].G++;
          }
        });
      });
    });

    return [
      { name: 'A (Cemerlang)', TOV: gradesTally.tov.A, PPT: gradesTally.ppt.A, ETR: gradesTally.etr.A },
      { name: 'B/C (Kepujian)', TOV: gradesTally.tov.BC, PPT: gradesTally.ppt.BC, ETR: gradesTally.etr.BC },
      { name: 'D/E (Lulus)', TOV: gradesTally.tov.DE, PPT: gradesTally.ppt.DE, ETR: gradesTally.etr.DE },
      { name: 'G (Gagal)', TOV: gradesTally.tov.G, PPT: gradesTally.ppt.G, ETR: gradesTally.etr.G },
    ];
  };

  const gradeGroupData = getGradeGroupData();

  // Prepare chart data for Subject GPMP comparison
  const getSubjectGPMPData = () => {
    return subjects.slice(0, 8).map(sub => {
      const tov = calculateGPMP(students, sub.id, 'tov');
      const ppt = calculateGPMP(students, sub.id, 'ppt');
      const etr = calculateGPMP(students, sub.id, 'etr');
      return {
        name: sub.name,
        TOV: tov === null ? 0 : tov,
        PPT: ppt === null ? 0 : ppt,
        ETR: etr === null ? 0 : etr
      };
    });
  };

  const gpmpData = getSubjectGPMPData();

  // Find students "At Risk" (e.g. failing BM or SEJ in latest PPT)
  const isAtRisk = (student: Student) => {
    const bm = student.scores.find(s => s.subjectId === '1103')?.ppt ?? -1;
    const sej = student.scores.find(s => s.subjectId === '1249')?.ppt ?? -1;
    return (bm !== -1 && bm < 40) || (sej !== -1 && sej < 40);
  };

  const atRiskStudents = students.filter(isAtRisk).slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white rounded-2xl p-6 shadow-md relative overflow-hidden" id="dashboard-welcome-banner">
        <div className="absolute right-0 top-0 opacity-15 transform translate-x-8 -translate-y-8">
          <GraduationCap size={240} className="text-white" />
        </div>
        <div className="relative z-10 space-y-2 max-w-xl">
          <span className="bg-blue-500/30 text-blue-250 text-xs px-3 py-1 rounded-full border border-blue-400/20 font-mono">
            SMK Pasir Panjang • Tingkatan 4
          </span>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl text-slate-100">
            Sistem Headcount Akademik SPM
          </h1>
          <p className="text-slate-300 text-sm leading-relaxed">
            Pantau Take Off Value (TOV) pelajar, kemajuan Peperiksaan Pertengahan Tahun (PPT), dan ukur jurang prestasi ke arah sasaran Expected Target Result (ETR) untuk kelayakan pensijilan SPM.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <button 
              onClick={() => onSelectTab('students')}
              className="bg-white hover:bg-slate-100 text-slate-950 text-sm font-semibold transition px-4 py-2 rounded-xl flex items-center gap-2 shadow-sm"
              id="btn-nav-database"
            >
              <Users size={16} />
              Lihat Database Pelajar
            </button>
            <button 
              onClick={() => onSelectTab('subjects')}
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition px-4 py-2 rounded-xl flex items-center gap-2 border border-blue-500 shadow-sm"
              id="btn-nav-subject"
            >
              <BookOpen size={16} />
              Analisa Panitia Subjek
            </button>
            <button 
              onClick={() => onSelectTab('gred_purata')}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold transition px-4 py-2 rounded-xl flex items-center gap-2 border border-amber-400 shadow-sm animate-pulse-slow"
              id="btn-nav-gred-purata"
            >
              <TrendingUp size={16} />
              Pengiraan Sasaran Gred Purata (GP)
            </button>
          </div>
        </div>
      </div>      {/* Interactive Phase Toggle Tabs */}
      <div className="bg-slate-100/85 p-1 rounded-xl border border-slate-205 w-full flex flex-wrap gap-1">
        {[
          { id: 'tov', label: 'TOV T4' },
          { id: 'otr1', label: 'Sasaran OTR 1' },
          { id: 'ar1', label: 'PPT T5 (AR 1)' },
          { id: 'otr2', label: 'Sasaran OTR 2' },
          { id: 'ar2', label: 'Percubaan (AR 2)' },
          { id: 'ppt', label: 'PPT T4' },
          { id: 'etr', label: 'Sasaran ETR' }
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveSegment(item.id as ExamType)}
            className={`flex-1 min-w-[80px] py-2 text-center text-xs font-black rounded-lg transition-all whitespace-nowrap ${
              activeSegment === item.id
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white/60 text-slate-600 hover:bg-white hover:text-slate-900 border-transparent hover:border-slate-200 border'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI: Total Candidates */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition relative group" id="kpi-total-students">
          <div className="flex items-center justify-between">
            <span className="text-slate-450 text-xs font-bold tracking-wide uppercase">JUMLAH CALON</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Users size={18} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-slate-900">{students.length}</span>
            <span className="text-xs text-slate-500 block mt-1">Calon Terdaftar</span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-[11px] font-mono text-slate-500">
            <span>TOV: <span className="font-bold text-slate-700">{tovKPI.totalStudents}</span></span>
            <span>AR1: <span className="font-bold text-slate-700">{ar1KPI.totalStudents}</span></span>
            <span>ETR: <span className="font-bold text-slate-800">{etrKPI.totalStudents}</span></span>
          </div>
        </div>

        {/* KPI: Gred Purata Sekolah (GPS / GPS-Equivalent) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition relative group" id="kpi-gps">
          <div className="flex items-center justify-between">
            <span className="text-slate-450 text-xs font-bold tracking-wide uppercase">GRED PURATA ({activeSegment.toUpperCase()})</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-bold text-blue-650">
              {activeKPI ? activeKPI.avgGPP : '-'}
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[11px] font-medium text-slate-550">Fasa:</span>
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                activeSegment === 'tov' ? 'bg-slate-100 text-slate-700' :
                activeSegment === 'otr1' ? 'bg-blue-50 text-blue-600 border border-blue-200' :
                activeSegment === 'ar1' ? 'bg-blue-600 text-white font-black' :
                activeSegment === 'otr2' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                activeSegment === 'ar2' ? 'bg-emerald-600 text-white font-black' :
                activeSegment === 'ppt' ? 'bg-indigo-150 text-indigo-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {activeSegment === 'ar1' ? 'AR 1 (PPT T5)' : activeSegment === 'ar2' ? 'AR 2 (Prcb SPM)' : activeSegment.toUpperCase()}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-[11px] font-mono text-slate-550">
            <span>TOV: <span className="font-bold text-slate-750">{tovKPI.avgGPP}</span></span>
            <span>AR1: <span className="font-bold text-blue-600">{ar1KPI.avgGPP}</span></span>
            <span>AR2: <span className="font-bold text-emerald-600">{ar2KPI.avgGPP}</span></span>
            <span>ETR: <span className="font-bold text-slate-800">{etrKPI.avgGPP}</span></span>
          </div>
        </div>

        {/* KPI: % Layak Sijil */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition relative group" id="kpi-layak-sijil">
          <div className="flex items-center justify-between">
            <span className="text-slate-450 text-xs font-bold tracking-wide uppercase">% LAYAK SIJIL</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Award size={18} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-slate-900">
              {activeKPI ? activeKPI.layakSijilPercent : '-'}%
            </span>
            <div className="mt-1 flex items-center gap-1.5 text-xs">
              <span className="text-slate-500">Bilangan Layak:</span>
              <span className="font-bold text-slate-800">
                {activeKPI ? activeKPI.layakSijilCount : '-'} / {students.length}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-[11px] font-mono text-slate-555">
            <span>TOV: <span className="font-bold text-slate-700">{tovKPI.layakSijilPercent}%</span></span>
            <span>AR1: <span className="font-bold text-blue-600">{ar1KPI.layakSijilPercent}%</span></span>
            <span>AR2: <span className="font-bold text-emerald-600">{ar2KPI.layakSijilPercent}%</span></span>
            <span>ETR: <span className="font-bold text-emerald-750">{etrKPI.layakSijilPercent}%</span></span>
          </div>
        </div>

        {/* KPI: Bilangan Berpotensi Cemerlang */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm border-l-4 border-l-amber-400 hover:shadow-md transition relative group" id="kpi-cemerlang">
          <div className="flex items-center justify-between">
            <span className="text-slate-450 text-xs font-bold tracking-wide uppercase">CALON HALUAN A</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-3xl font-black text-slate-900">
              {activeKPI ? activeKPI.cemerlangCount : '-'}
            </span>
            <span className="text-xs text-slate-500 block mt-1">Gred Purata Pelajar ≤ 3.00</span>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-[11px] font-mono text-slate-500">
            <span>TOV: <span className="font-bold text-slate-700">{tovKPI.cemerlangCount}</span></span>
            <span>AR1: <span className="font-bold text-blue-600">{ar1KPI.cemerlangCount}</span></span>
            <span>AR2: <span className="font-bold text-emerald-600">{ar2KPI.cemerlangCount}</span></span>
            <span>ETR: <span className="font-bold text-slate-850">{etrKPI.cemerlangCount}</span></span>
          </div>
        </div>
      </div>

      {/* Main Charts Triptych */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recharts: Grade Tally Chart (Col span 2) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Taburan Gred Subjek (TOV vs PPT vs ETR)</h3>
              <p className="text-xs text-slate-550 mt-0.5">Talian pengagihan keseluruhan gred kertas peperiksaan terkumpul</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={gradeGroupData}
                margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="TOV" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={25} />
                <Bar dataKey="PPT" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={25} />
                <Bar dataKey="ETR" fill="#10b981" radius={[4, 4, 0, 0]} barSize={25} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Audit Kelulusan Sijil BM & Sejarah */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BadgeAlert className="text-rose-500" size={18} />
              <h3 className="text-sm font-bold text-slate-900">Petunjuk Fokus Kelayakan Sijil</h3>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              Calon mesti lulus subjek Bahasa Melayu dan Sejarah (min gred E, markah &gt;= 40) untuk dianugerahkan sijil SPM.
            </p>

            {/* Progress metric bars */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1 font-semibold">
                  <span className="text-slate-700">TOV (Peringkat Awal)</span>
                  <span className="text-slate-550">{(tovKPI.layakSijilPercent)}% Layak</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-slate-400 h-full rounded-full" style={{ width: `${tovKPI.layakSijilPercent}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1 font-bold">
                  <span className="text-slate-800">PPT (Fasa Terkini)</span>
                  <span className="text-blue-600">{(pptKPI.layakSijilPercent)}% Layak</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full" style={{ width: `${pptKPI.layakSijilPercent}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1 font-semibold">
                  <span className="text-slate-800">ETR (Sasaran SPM)</span>
                  <span className="text-emerald-600 font-bold">{(etrKPI.layakSijilPercent)}% Layak</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${etrKPI.layakSijilPercent}%` }}></div>
                </div>
              </div>
            </div>

            <div className="mt-5 p-3.5 bg-amber-50 border border-amber-200/80 rounded-xl flex gap-2 items-start text-xs text-amber-900 leading-normal">
              <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Fokus Intervensi BM &amp; Sejarah:</span> Terdapat <span className="font-bold">{pptKPI.gagalCount} orang pelajar</span> belum lulus syarat sijil pada PPT terkini. Sasaran ETR memerlukan sifar gagal.
              </div>
            </div>
          </div>

          <button 
            onClick={() => onSelectTab('students')}
            className="w-full mt-4 text-center py-2.5 bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 font-semibold rounded-xl text-xs transition"
          >
            Lihat Senarai Calon Berisiko
          </button>
        </div>
      </div>

      {/* Secondary Row: GPMP Subjek & Tindakan At risk */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* GPMP Subject Bar Chart */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Gred Purata Mata Peperiksaan (GPMP) per Subjek</h3>
              <p className="text-xs text-slate-550 mt-0.5">Nilai GPMP (Gred Purata) bagi setiap subjek kertas teras &amp; elektif (Lebih rendah lebih baik)</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={gpmpData}
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} domain={[0, 9]} tickLine={false} reversed />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '11px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="TOV" fill="#b91c1c" fillOpacity={0.4} barSize={14} radius={[2, 2, 0, 0]} />
                <Bar dataKey="PPT" fill="#3b82f6" fillOpacity={0.8} barSize={14} radius={[2, 2, 0, 0]} />
                <Bar dataKey="ETR" fill="#10b981" fillOpacity={0.8} barSize={14} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick List: At Risk Students who need intervention */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Tumpuan Intervensi Segera</h3>
            <p className="text-xs text-slate-550 mb-4">
              Calon di bawah paras lulus (Gred G) bagi BM atau Sejarah pada PPT terkini. Sila rancang pelan tindakan.
            </p>

            {atRiskStudents.length > 0 ? (
              <div className="space-y-3">
                {atRiskStudents.map(student => {
                  const gpp = calculateStudentGPP(student, 'ppt');
                  const bmObj = student.scores.find(s => s.subjectId === '1103');
                  const sejObj = student.scores.find(s => s.subjectId === '1249');
                  return (
                    <div 
                      key={student.id}
                      onClick={() => onSelectStudent(student)}
                      className="p-3 bg-slate-50 hover:bg-blue-50/50 rounded-xl border border-slate-200 cursor-pointer transition flex items-center justify-between"
                    >
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-800 line-clamp-1">{student.name}</span>
                        <div className="flex gap-2 text-[10px] text-slate-500">
                          <span>{student.clazz}</span>
                          <span>•</span>
                          <span>GPP: <span className="font-mono font-bold text-slate-700">{gpp}</span></span>
                        </div>
                      </div>
                      <div className="flex gap-1.5">
                        <div className="flex flex-col items-center">
                          <span className="text-[8px] text-slate-400 font-bold font-mono">BM</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            (bmObj?.ppt ?? 0) >= 40 ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700 font-black'
                          }`}>
                            {bmObj ? bmObj.ppt : 'TH'}
                          </span>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className="text-[8px] text-slate-400 font-bold font-mono">SEJ</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            (sejObj?.ppt ?? 0) >= 40 ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700 font-black'
                          }`}>
                            {sejObj ? sejObj.ppt : 'TH'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center space-y-2">
                <CheckCircle2 size={32} className="text-emerald-500" />
                <span className="text-xs font-bold text-slate-700">Semua Pelajar Lulus</span>
                <span className="text-[10px] text-slate-400">Tiada pelajar dikesan gagal BM atau Sejarah dalam PPT fasa ini. Syabas!</span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-blue-600 font-bold hover:text-blue-800 cursor-pointer" onClick={() => onSelectTab('students')}>
            <span>Urus semua pelajar</span>
            <span>&rarr;</span>
          </div>
        </div>
      </div>
    </div>
  );
}
