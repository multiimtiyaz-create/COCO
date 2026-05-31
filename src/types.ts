export type Grade = 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'E' | 'G' | 'TH';

export interface Subject {
  id: string;
  name: string;
  code: string;
  category: 'Wajib' | 'Teras' | 'Elektif' | 'Vokasional';
}

export type ExamType = 'tov' | 'otr1' | 'ar1' | 'otr2' | 'ar2' | 'ppt' | 'etr';

export interface StudentSubjectScore {
  subjectId: string;
  tov: number; // 0-100, -1 for TH (Tidak Hadir)
  otr1?: number; // 0-100, -1 for TH
  ar1?: number; // 0-100, -1 for TH
  otr2?: number; // 0-100, -1 for TH
  ar2?: number; // 0-100, -1 for TH
  ppt: number; // 0-100, -1 for TH
  etr: number; // 0-100, -1 for TH
}

export interface Student {
  id: string; // IC Number / Student ID
  name: string;
  clazz: string;
  scores: StudentSubjectScore[];
  kod?: string;
  jpn?: string;
  ppd?: string;
  kodSekolah?: string;
  jantina?: string;
  sekolah?: string;
  kodNegeri?: string;
}

export interface Teacher {
  name: string;
  school: string;
  role: string;
}

// Map marks to SPM Grade
export function calculateGrade(score: number): Grade {
  if (score === -1) return 'TH';
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'A-';
  if (score >= 65) return 'B+';
  if (score >= 60) return 'B';
  if (score >= 55) return 'C+';
  if (score >= 50) return 'C';
  if (score >= 45) return 'D';
  if (score >= 40) return 'E';
  return 'G';
}

// Map Grade to Grade Points (GP)
// In Malaysia SPM, lower GP is better (A+ = 0, G = 9, TH = 9)
export function getGradePoint(grade: Grade): number {
  switch (grade) {
    case 'A+': return 0;
    case 'A': return 1;
    case 'A-': return 2;
    case 'B+': return 3;
    case 'B': return 4;
    case 'C+': return 5;
    case 'C': return 6;
    case 'D': return 7;
    case 'E': return 8;
    case 'G': return 9;
    case 'TH': return 9;
    default: return 9;
  }
}

// Get qualitative description of grade in English/Malay
export function getGradeDesc(grade: Grade): string {
  switch (grade) {
    case 'A+': return 'Cemerlang Tertinggi';
    case 'A': return 'Cemerlang Tinggi';
    case 'A-': return 'Cemerlang';
    case 'B+': return 'Kepujian Tertinggi';
    case 'B': return 'Kepujian Tinggi';
    case 'C+': return 'Kepujian';
    case 'C': return 'Selesa / Baik';
    case 'D': return 'Lulus Atas';
    case 'E': return 'Lulus';
    case 'G': return 'Gagal';
    case 'TH': return 'Tidak Hadir';
    default: return 'Tiada Nilai';
  }
}

// Get Badge colors for grades
export function getGradeColor(grade: Grade): string {
  switch (grade) {
    case 'A+': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'A': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    case 'A-': return 'bg-teal-50 text-teal-700 border-teal-100';
    case 'B+': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'B': return 'bg-blue-50 text-blue-700 border-blue-100';
    case 'C+': return 'bg-indigo-50 text-indigo-700 border-indigo-100';
    case 'C': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'D': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'E': return 'bg-orange-50 text-orange-700 border-orange-100';
    case 'G': return 'bg-rose-100 text-rose-800 border-rose-200';
    case 'TH': return 'bg-slate-100 text-slate-500 border-slate-200';
    default: return 'bg-gray-100 text-gray-800';
  }
}
