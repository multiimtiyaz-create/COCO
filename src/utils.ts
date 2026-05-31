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
export function checkLayakSijil(student: Student, examType: ExamType): { passed: boolean; reason: string } {
  const bmScoreObj = student.scores.find(s => s.subjectId === '1103');
  const sejScoreObj = student.scores.find(s => s.subjectId === '1249');

  const bmScore = bmScoreObj ? (bmScoreObj[examType] ?? -1) : -1;
  const sejScore = sejScoreObj ? (sejScoreObj[examType] ?? -1) : -1;

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
// GPP is the sum of grade points divided by the number of subjects taken
export function calculateStudentGPP(student: Student, examType: ExamType): number {
  const validScores = student.scores.filter(s => (s[examType] ?? -1) !== -1);
  if (validScores.length === 0) return 9.0;

  const totalPoints = validScores.reduce((sum, scoreObj) => {
    const scoreVal = scoreObj[examType] ?? -1;
    const grade = calculateGrade(scoreVal);
    return sum + getGradePoint(grade);
  }, 0);

  return parseFloat((totalPoints / validScores.length).toFixed(2));
}

// Calculate Gred Purata Mata Pelajaran (GPMP) for a subject
// Lesser is better (0.00 is perfect A+, 9.00 is failing G/TH)
export function calculateGPMP(students: Student[], subjectId: string, examType: ExamType): number | null {
  let count = 0;
  let pointsSum = 0;

  students.forEach(student => {
    const scoreObj = student.scores.find(s => s.subjectId === subjectId);
    if (scoreObj && (scoreObj[examType] ?? -1) !== -1) {
      const grade = calculateGrade(scoreObj[examType] ?? -1);
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
  examType: ExamType
): { grade: Grade; count: number }[] {
  const grades: Grade[] = ['A+', 'A', 'A-', 'B+', 'B', 'C+', 'C', 'D', 'E', 'G', 'TH'];
  const dist: Record<Grade, number> = {
    'A+': 0, 'A': 0, 'A-': 0, 'B+': 0, 'B': 0, 'C+': 0, 'C': 0, 'D': 0, 'E': 0, 'G': 0, 'TH': 0
  };

  students.forEach(student => {
    const scoreObj = student.scores.find(s => s.subjectId === subjectId);
    if (scoreObj) {
      const examVal = scoreObj[examType] ?? -1;
      const grade = calculateGrade(examVal);
      dist[grade]++;
    } else {
      dist['TH']++;
    }
  });

  return grades.map(g => ({ grade: g, count: dist[g] }));
}

// Calculate overall school metrics
export function calculateOverallKPIs(students: Student[], examType: ExamType): KPIStats {
  if (students.length === 0) {
    return { totalStudents: 0, avgGPP: 0, layakSijilCount: 0, layakSijilPercent: 0, cemerlangCount: 0, gagalCount: 0 };
  }

  let totalGPP = 0;
  let layakSijil = 0;
  let cemerlang = 0;
  let activeStudentsCount = 0;

  students.forEach(student => {
    // Check if absent in all subjects for this exam
    const hasAnyScore = student.scores.some(s => (s[examType] ?? -1) !== -1);
    if (!hasAnyScore) return;

    activeStudentsCount++;
    const gpp = calculateStudentGPP(student, examType);
    totalGPP += gpp;

    const certStatus = checkLayakSijil(student, examType);
    if (certStatus.passed) layakSijil++;

    // GPA < 3.00 is very good / average B and above
    // Let's define "Cemerlang" as GPP <= 2.0 (Grade A- or better average)
    if (gpp <= 3.0) cemerlang++;
  });

  const countForCalculations = activeStudentsCount || students.length;

  return {
    totalStudents: countForCalculations,
    avgGPP: parseFloat((totalGPP / countForCalculations).toFixed(2)) || 0,
    layakSijilCount: layakSijil,
    layakSijilPercent: parseFloat(((layakSijil / countForCalculations) * 100).toFixed(1)) || 0,
    cemerlangCount: cemerlang,
    gagalCount: countForCalculations - layakSijil
  };
}
