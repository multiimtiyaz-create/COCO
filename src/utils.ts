import { Student, calculateGrade, getGradePoint, Grade, ExamType } from './types';

export interface KPIStats {
  totalStudents: number;
  avgGPP: number; // Gred Purata Pelajar
  layakSijilCount: number;
  layakSijilPercent: number;
  cemerlangCount: number; // Students with average GPP < 2.0 (mainly A's)
  gagalCount: number; // Students failing BM or SEJ
}

// Check if student passes BM (1103) & Sejarah (1249) with at least Grade E (score >= 40)
export function checkLayakSijil(student: Student, examType: string): { passed: boolean; reason: string } {
  const bmScoreObj = student.scores.find(s => s.subjectId === '1103');
  const sejScoreObj = student.scores.find(s => s.subjectId === '1249');

  const bmScore = bmScoreObj ? ((bmScoreObj as any)[examType] ?? -1) : -1;
  const sejScore = sejScoreObj ? ((sejScoreObj as any)[examType] ?? -1) : -1;

  // If not taking, or TH
  const bmGrade = calculateGrade(bmScore);
  const sejGrade = calculateGrade(sejScore);

  const bmPassed = bmScore >= 40 && bmGrade !== 'TH';
  const sejPassed = sejScore >= 40 && sejGrade !== 'TH';

  if (bmPassed && sejPassed) {
    return { passed: true, reason: 'Layak Sijil (Lulus Sejarah & BM)' };
  } else if (!bmPassed && !sejPassed) {
    return { passed: false, reason: 'Gagal BM & Sejarah' };
  } else if (!bmPassed) {
    return { passed: false, reason: 'Gagal Bahasa Melayu' };
  } else {
    return { passed: false, reason: 'Gagal Sejarah' };
  }
}

// Calculate Student's GPP (Gred Purata Pelajar)
// GPP is the sum of grade points divided by the number of subjects taken (excluding subjects removed from GPS)
export function calculateStudentGPP(student: Student, examType: string): number {
  const excludedIds = getExcludedSubjectIds();
  const validScores = student.scores.filter(s => !excludedIds.includes(s.subjectId) && ((s as any)[examType] ?? -1) !== -1);
  if (validScores.length === 0) return 9.0;

  const totalPoints = validScores.reduce((sum, scoreObj) => {
    const scoreVal = (scoreObj as any)[examType] ?? -1;
    const grade = calculateGrade(scoreVal);
    return sum + getGradePoint(grade);
  }, 0);

  return parseFloat((totalPoints / validScores.length).toFixed(2));
}

// Calculate Gred Purata Mata Pelajaran (GPMP) for a subject
// Lesser is better (0.00 is perfect A+, 9.00 is failing G/TH)
export function calculateGPMP(students: Student[], subjectId: string, examType: string): number | null {
  let count = 0;
  let pointsSum = 0;

  students.forEach(student => {
    const scoreObj = student.scores.find(s => s.subjectId === subjectId);
    if (scoreObj && ((scoreObj as any)[examType] ?? -1) !== -1) {
      const grade = calculateGrade((scoreObj as any)[examType] ?? -1);
      pointsSum += getGradePoint(grade);
      count++;
    }
  });

  return count === 0 ? null : parseFloat((pointsSum / count).toFixed(2));
}

// Get Grade distribution for a specific subject
export function getSubjectGradeDistribution(
  students: Student[],
  subjectId: string,
  examType: string
): { grade: Grade; count: number }[] {
  const grades: Grade[] = ['A+', 'A', 'A-', 'B+', 'B', 'C+', 'C', 'D', 'E', 'G', 'TH'];
  const dist: Record<Grade, number> = {
    'A+': 0, 'A': 0, 'A-': 0, 'B+': 0, 'B': 0, 'C+': 0, 'C': 0, 'D': 0, 'E': 0, 'G': 0, 'TH': 0, '': 0
  };

  students.forEach(student => {
    const scoreObj = student.scores.find(s => s.subjectId === subjectId);
    if (scoreObj) {
      const examVal = (scoreObj as any)[examType];
      if (examVal !== undefined && examVal !== null) {
        const grade = calculateGrade(examVal);
        dist[grade]++;
      }
    }
  });

  return grades.map(g => ({ grade: g, count: dist[g] }));
}

// Calculate overall school metrics
export function calculateOverallKPIs(students: Student[], examType: string): KPIStats {
  if (students.length === 0) {
    return { totalStudents: 0, avgGPP: 0, layakSijilCount: 0, layakSijilPercent: 0, cemerlangCount: 0, gagalCount: 0 };
  }

  let totalGPP = 0;
  let layakSijil = 0;
  let cemerlang = 0;
  let activeStudentsCount = 0;

  const excludedIds = getExcludedSubjectIds();
  let totalGPSPoints = 0;
  let totalGPSSubjects = 0;

  students.forEach(student => {
    // Check if absent in all subjects for this exam
    const hasAnyScore = student.scores.some(s => ((s as any)[examType] ?? -1) !== -1);
    if (!hasAnyScore) return;

    activeStudentsCount++;
    const gpp = calculateStudentGPP(student, examType);
    totalGPP += gpp;

    const certStatus = checkLayakSijil(student, examType);
    if (certStatus.passed) layakSijil++;

    // GPA < 3.00 is very good / average B and above
    // Let's define "Cemerlang" as GPP <= 2.0 (Grade A- or better average)
    if (gpp <= 3.0) cemerlang++;

    // Aggregate points of all subjects taken by the student for overall GPS
    student.scores.forEach(scoreObj => {
      if (excludedIds.includes(scoreObj.subjectId)) return;
      const val = (scoreObj as any)[examType];
      if (val !== undefined && val !== null && val !== -1) {
        const grade = calculateGrade(val);
        totalGPSPoints += getGradePoint(grade);
        totalGPSSubjects++;
      }
    });
  });

  const countForCalculations = activeStudentsCount || students.length;

  return {
    totalStudents: countForCalculations,
    avgGPP: totalGPSSubjects === 0 ? 0 : parseFloat((totalGPSPoints / totalGPSSubjects).toFixed(2)),
    layakSijilCount: layakSijil,
    layakSijilPercent: parseFloat(((layakSijil / countForCalculations) * 100).toFixed(1)) || 0,
    cemerlangCount: cemerlang,
    gagalCount: countForCalculations - layakSijil
  };
}

export function getExcludedSubjectIds(): string[] {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = localStorage.getItem('spm_headcount_excluded_subjects');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to read excluded subjects:", e);
    }
  }
  return [];
}

export interface Exam {
  id: string;
  label: string;
  isCustom?: boolean;
}

export function getExams(): Exam[] {
  const DEFAULT_EXAMS: Exam[] = [
    { id: 'tov', label: 'TOV T5' },
    { id: 'otr1', label: 'Sasaran OTR 1' },
    { id: 'ar1', label: 'PPT T5 (AR 1)' },
    { id: 'otr2', label: 'Sasaran OTR 2' },
    { id: 'ar2', label: 'Percubaan (AR 2)' },
    { id: 'etr', label: 'Sasaran ETR' }
  ];
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = localStorage.getItem('spm_headcount_exams');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to read exams:", e);
    }
  }
  return DEFAULT_EXAMS;
}

export function saveExams(exams: Exam[]): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem('spm_headcount_exams', JSON.stringify(exams));
  }
}
