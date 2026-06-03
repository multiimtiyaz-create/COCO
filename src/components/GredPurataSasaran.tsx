import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building, 
  TrendingUp, 
  Percent, 
  ArrowLeft, 
  Download, 
  Printer, 
  Search,
  Filter,
  Plus,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  X,
  Info,
  Sparkles,
  Trash2,
  Users,
  PlusCircle,
  RefreshCw
} from 'lucide-react';
import { Student, Subject, Grade, calculateGrade, getGradePoint } from '../types';
import { getExcludedSubjectIds } from '../utils';

interface GredPurataSasaranProps {
  students: Student[];
  subjects: Subject[];
  onBackToMain: () => void;
  onUpdateStudentsAndSubjects: (newStudents: Student[], newSubjects: Subject[]) => void;
}

// RFC 4180 compliant CSV parser that supports both comma and semicolon auto-detection, quotes, and newlines
function parseCSV(text: string): string[][] {
  // Auto-detect delimiter: analyze the first few lines of the text
  let commaCount = 0;
  let semicolonCount = 0;
  let insideQuote = false;
  
  const sampleLength = Math.min(text.length, 3000);
  for (let i = 0; i < sampleLength; i++) {
    const char = text[i];
    if (char === '"') {
      insideQuote = !insideQuote;
    } else if (!insideQuote) {
      if (char === ',') commaCount++;
      else if (char === ';') semicolonCount++;
    }
  }
  
  const delimiter = semicolonCount > commaCount ? ';' : ',';

  const lines: string[][] = [];
  let row: string[] = [];
  let currentInsideQuote = false;
  let entry = '';
  
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    
    if (char === '"') {
      if (currentInsideQuote && nextChar === '"') {
        entry += '"';
        i++; // skip next double quote
      } else {
        currentInsideQuote = !currentInsideQuote;
      }
    } else if (char === delimiter && !currentInsideQuote) {
      row.push(entry.trim());
      entry = '';
    } else if ((char === '\n' || char === '\r') && !currentInsideQuote) {
      if (char === '\r' && nextChar === '\n') {
        i++;
      }
      row.push(entry.trim());
      if (row.length > 1 || row[0] !== '') {
        lines.push(row);
      }
      row = [];
      entry = '';
    } else {
      entry += char;
    }
  }
  
  if (entry || row.length > 0) {
    row.push(entry.trim());
    lines.push(row);
  }
  return lines;
}

// Cleanly maps grade score string to numeric value or null (blank means Not Taken / No data)
function parseScoreValue(valStr: string): number | null {
  const normalized = valStr.trim().toUpperCase().replace(/^"(.*)"$/, '$1'); // strip outer quotes if any
  if (!normalized) {
    return null; // Empty means Not Taken / No data
  }
  if (['TH', 'Y', 'ABS', '-', 'ABSENT', 'TIDAK HADIR'].includes(normalized)) {
    return -1; // -1 represents TH (Tidak Hadir)
  }
  const num = parseInt(normalized);
  if (!isNaN(num)) {
    return Math.max(0, Math.min(100, num));
  }
  
  // Direct Grade-to-Mark approximation
  const gradeScores: Record<string, number> = {
    'A+': 95, 'A': 85, 'A-': 75,
    'B+': 67, 'B': 62,
    'C+': 57, 'C': 52,
    'D': 47, 'E': 42,
    'G': 25, 'F': 25
  };
  if (normalized in gradeScores) {
    return gradeScores[normalized];
  }
  return null; // Fallback, not taken or invalid
}

// Helper function to clean JPN text from numeric prefixes like 12
function cleanJpnText(text: string): string {
  if (!text) return '';
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^\d+\s*[|\-_]\s*/, '');
  cleaned = cleaned.replace(/^\d+\s+/, '');
  return cleaned.trim();
}

// Helper function to resolve Malaysian subject abbreviations
function resolveSubjectInfo(header: string): { name: string, code: string } {
  const norm = header.trim().toUpperCase().replace(/^"(.*)"$/, '$1'); // strip quotes
  const mapper: Record<string, { name: string, code: string }> = {
    'BM': { name: 'Bahasa Melayu', code: '1103' },
    'BI': { name: 'Bahasa Inggeris', code: '1119' },
    'SEJ': { name: 'Sejarah', code: '1249' },
    'MM': { name: 'Mathematics', code: '1449' },
    'SAINS': { name: 'Science', code: '1511' },
    'PAI': { name: 'Pendidikan Islam', code: '1223' },
    'PM': { name: 'Pendidikan Moral', code: '1225' },
    'BIO': { name: 'Biology', code: '4551' },
    'FIZIK': { name: 'Physics', code: '4531' },
    'KIMIA': { name: 'Chemistry', code: '4541' },
    'MT': { name: 'Additional Mathematics', code: '3472' },
    'AKAUN': { name: 'Prinsip Perakaunan', code: '3756' },
    'EKO': { name: 'Ekonomi', code: '3767' },
    'PERNIAGAAN': { name: 'Perniagaan', code: '3766' },
    'GEO': { name: 'Geografi', code: '2280' },
    'PSV': { name: 'Pendidikan Seni Visual', code: '2611' },
    'SSUKAN': { name: 'Sains Sukan', code: '4571' },
    'PERT': { name: 'Pertanian', code: '3729' },
    'SRT': { name: 'Sains Rumah Tangga', code: '3769' },
    'KMK': { name: 'Kesusasteraan Melayu Komunikatif', code: '2215' },
    'TI': { name: 'Tasawwur Islam', code: '5226' },
    'MAK': { name: 'MAK', code: '7405' },
    'PIAK': { name: 'PIAK', code: '7406' },
    'PMAK': { name: 'PMAK', code: '7407' },
    'PMZ': { name: 'PMZ', code: '7408' },
    'PJPK': { name: 'PJPK', code: '7409' }
  };

  if (norm in mapper) {
    return mapper[norm];
  }
  // Generate deterministic code from string to avoid random variation on consecutive calls
  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = (hash << 5) - hash + norm.charCodeAt(i);
    hash |= 0;
  }
  const numericCode = Math.abs(hash % 900) + 100; // 100 to 999
  return { name: norm, code: '8' + numericCode.toString() }; 
}

export default function GredPurataSasaran({ students, subjects, onBackToMain, onUpdateStudentsAndSubjects }: GredPurataSasaranProps) {
  const [selectedClass, setSelectedClass] = useState<string>('Semua');
  const [subjectSearch, setSubjectSearch] = useState<string>('');
  
  // Custom metadata for display
  const [region, setRegion] = useState<string>('');
  const [schoolLabel, setSchoolLabel] = useState<string>('');
  const [formLabel, setFormLabel] = useState<string>('');

  // Extra school/negeri metadata states from CSV
  const [ppd, setPpd] = useState<string>('');
  const [kodSekolah, setKodSekolah] = useState<string>('');
  const [jpn, setJpn] = useState<string>('');
  const [kodNegeri, setKodNegeri] = useState<string>('');

  useEffect(() => {
    const existingSchool = students.find(s => s.sekolah)?.sekolah || '';
    const existingJpn = students.find(s => s.jpn)?.jpn || '';
    const existingPpd = students.find(s => s.ppd)?.ppd || '';
    const existingKodSekolah = students.find(s => s.kodSekolah)?.kodSekolah || '';
    const existingKodNegeri = students.find(s => s.kodNegeri)?.kodNegeri || '';

    if (!existingSchool && !existingJpn && !existingPpd && !existingKodSekolah && !existingKodNegeri) {
      setRegion('');
      setSchoolLabel('');
      setPpd('');
      setKodSekolah('');
      setJpn('');
      setKodNegeri('');
      setFormLabel('');
    } else {
      setRegion(cleanJpnText(existingJpn).toUpperCase());
      setSchoolLabel(existingSchool.toUpperCase());
      setPpd(existingPpd.toUpperCase());
      
      let finalKodSekolah = existingKodSekolah;
      if (!finalKodSekolah && existingSchool) {
        const match = existingSchool.match(/\b([A-Z]{3}\d{4})\b/i);
        if (match) {
          finalKodSekolah = match[1].toUpperCase();
        }
      }
      setKodSekolah(finalKodSekolah.toUpperCase());
      setJpn(cleanJpnText(existingJpn).toUpperCase());
      setKodNegeri(existingKodNegeri.toUpperCase());

      // Auto-detect form label
      const firstClass = students.find(s => s.clazz)?.clazz || '';
      let detectedForm = '';
      if (firstClass) {
        const formMatch = firstClass.match(/^[45]\b/); // Matches "4" or "5"
        if (formMatch) {
          detectedForm = `TINGKATAN ${formMatch[0]}`;
        } else if (firstClass.toUpperCase().includes('TINGKATAN')) {
          detectedForm = firstClass.toUpperCase();
        } else {
          detectedForm = firstClass;
        }
      }
      if (detectedForm) {
        setFormLabel(detectedForm);
      } else {
        setFormLabel('TINGKATAN 4');
      }
    }
  }, [students]);

  // CSV states
  const [showUploadPanel, setShowUploadPanel] = useState<boolean>(false);
  const [csvText, setCsvText] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [importMode, setImportMode] = useState<'merge' | 'overwrite'>('merge');
  const [defaultPhase, setDefaultPhase] = useState<'auto' | 'tov' | 'ppt' | 'ar2' | 'etr'>('auto');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);
  const [activeTemplateTab, setActiveTemplateTab] = useState<'wide' | 'long'>('wide');
  
  // Filter peperiksaan untuk paparan jadual
  const [selectedExamFilter, setSelectedExamFilter] = useState<'all' | 'tov' | 'ppt' | 'ar2' | 'etr'>('all');
  
  // Custom dialog confirmation state
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  // State to hold manually edited ETR grade count modifications
  // Format: { [subjectId]: { [Grade]: count } }
  const [editedEtrCounts, setEditedEtrCounts] = useState<Record<string, Record<Grade, number | string>>>({});

  // State to hold the active generation result for display
  const [generationResult, setGenerationResult] = useState<{
    subject: Subject;
    students: {
      id: string;
      name: string;
      tov: number;
      oldEtr: number | null;
      newEtr: number;
      targetGrade: Grade;
    }[];
  } | null>(null);

  const getMinScoreForGrade = (g: Grade): number => {
    switch (g) {
      case 'A+': return 90;
      case 'A': return 80;
      case 'A-': return 70;
      case 'B+': return 65;
      case 'B': return 60;
      case 'C+': return 55;
      case 'C': return 50;
      case 'D': return 45;
      case 'E': return 40;
      case 'G': return 0;
      default: return 0;
    }
  };

  const handleUpdateEtrCount = (subjectId: string, grade: Grade, value: number | string) => {
    setEditedEtrCounts(prev => {
      const subPrev = prev[subjectId] || {} as Record<Grade, number | string>;
      const updatedCounts = {
        ...subPrev,
        [grade]: value
      } as Record<Grade, number | string>;
      return {
        ...prev,
        [subjectId]: updatedCounts
      };
    });
  };

  const handleGenerateEtr = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;

    // Get current target counts (either edited or current ETR counts)
    const sub_stats = getSubjectStats(subjectId, 'etr');
    const counts = { ...sub_stats.counts };
    if (editedEtrCounts[subjectId]) {
      GRADES.forEach(g => {
        if (editedEtrCounts[subjectId][g] !== undefined) {
          const val = editedEtrCounts[subjectId][g];
          counts[g] = typeof val === 'string' ? (parseInt(val) || 0) : val;
        }
      });
    }

    // Get all students matching the selected class (or all classes if 'Semua')
    const candidates = filteredStudents.map(student => {
      const scoreObj = student.scores.find(sc => sc.subjectId === subjectId);
      return {
        student,
        scoreObj,
        tovScore: scoreObj && scoreObj.tov !== null && scoreObj.tov !== undefined ? scoreObj.tov : -1
      };
    })
    .filter(item => item.scoreObj && item.tovScore !== -1) // must take the subject & have a valid TOV
    .sort((a, b) => b.tovScore - a.tovScore); // Sort descending by TOV score

    const allocatedStudents: {
      id: string;
      name: string;
      tov: number;
      oldEtr: number | null;
      newEtr: number;
      targetGrade: Grade;
    }[] = [];
    let candidateIdx = 0;

    // We process each grade in GRADES descending order ('A+', 'A', 'A-', 'B+', 'B', 'C+', 'C', 'D', 'E', 'G')
    for (const grade of GRADES) {
      if (grade === 'TH') continue;
      const targetCount = counts[grade] || 0;
      for (let i = 0; i < targetCount; i++) {
        if (candidateIdx < candidates.length) {
          const cand = candidates[candidateIdx];
          const tov = cand.tovScore;
          
          let newEtr = 0;
          if (tov < 30) {
            newEtr = 40; // auto jump to 40
          } else {
            newEtr = Math.max(tov + 10, getMinScoreForGrade(grade));
          }
          // Cap score at 100
          newEtr = Math.min(100, newEtr);

          allocatedStudents.push({
            id: cand.student.id,
            name: cand.student.name,
            tov,
            oldEtr: cand.scoreObj!.etr,
            newEtr,
            targetGrade: grade
          });
          candidateIdx++;
        }
      }
    }

    // Leftover candidates who didn't get allocated a specific target grade slot
    while (candidateIdx < candidates.length) {
      const cand = candidates[candidateIdx];
      const tov = cand.tovScore;
      let newEtr = 0;
      if (tov < 30) {
        newEtr = 40;
      } else {
        newEtr = Math.min(100, tov + 10);
      }
      const targetGrade = calculateGrade(newEtr);
      allocatedStudents.push({
        id: cand.student.id,
        name: cand.student.name,
        tov,
        oldEtr: cand.scoreObj!.etr,
        newEtr,
        targetGrade
      });
      candidateIdx++;
    }

    setGenerationResult({
      subject,
      students: allocatedStudents
    });
  };

  const handleApplyGeneration = () => {
    if (!generationResult) return;
    
    const { subject, students: genStudents } = generationResult;
    const subjectId = subject.id;
    
    // Build a map of updated ETR scores for fast lookup
    const etrMap = new Map<string, number>();
    genStudents.forEach(s => {
      etrMap.set(s.id, s.newEtr);
    });
    
    // Update the students' state
    const updatedStudents = students.map(student => {
      if (etrMap.has(student.id)) {
        const newEtr = etrMap.get(student.id)!;
        const updatedScores = student.scores.map(sc => {
          if (sc.subjectId === subjectId) {
            return {
              ...sc,
              etr: newEtr
            };
          }
          return sc;
        });
        return {
          ...student,
          scores: updatedScores
        };
      }
      return student;
    });
    
    onUpdateStudentsAndSubjects(updatedStudents, subjects);
    
    // Update the editedEtrCounts state so that the input fields reflect what was generated!
    const finalCounts: Record<Grade, number> = {
      'A+': 0, 'A': 0, 'A-': 0, 'B+': 0, 'B': 0, 'C+': 0, 'C': 0, 'D': 0, 'E': 0, 'G': 0, 'TH': 0, '': 0
    };
    genStudents.forEach(s => {
      const g = calculateGrade(s.newEtr);
      if (g in finalCounts) {
        finalCounts[g]++;
      }
    });
    
    setEditedEtrCounts(prev => ({
      ...prev,
      [subjectId]: finalCounts
    }));

    setGenerationResult(null);
    setSuccessMessage(`Sasaran ETR bagi subjek ${subject.name} telah berjaya dijana dan disimpan untuk ${genStudents.length} murid.`);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  // Bersih dan padam data dalam sistem
  const handleClearDatabaseData = () => {
    onUpdateStudentsAndSubjects([], []);
    setParsedStats(null);
    setCsvText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setSuccessMessage("Sistem telah dikosongkan sepenuhnya! Sila muat naik fail CSV baru.");
    setShowClearConfirm(false);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [parsedStats, setParsedStats] = useState<{
    studentsCount: number;
    subjectsCount: number;
    scoresCount: number;
    invalidRows: number;
    parsedStudents: Student[];
    parsedSubjects: Subject[];
    detectedSchool?: string | null;
    detectedNegeri?: string | null;
    detectedPpd?: string | null;
    detectedKodSekolah?: string | null;
    detectedJpn?: string | null;
    detectedKodNegeri?: string | null;
  } | null>(null);

  // Dynamic grade breakdown helper for uploaded CSV data
  const parsedGradesBreakdown = parsedStats ? (() => {
    const breakdown = {
      tov: { 'A+': 0, 'A': 0, 'A-': 0, 'B+': 0, 'B': 0, 'C+': 0, 'C': 0, 'D': 0, 'E': 0, 'G': 0, 'TH': 0 },
      ppt: { 'A+': 0, 'A': 0, 'A-': 0, 'B+': 0, 'B': 0, 'C+': 0, 'C': 0, 'D': 0, 'E': 0, 'G': 0, 'TH': 0 },
      ar2: { 'A+': 0, 'A': 0, 'A-': 0, 'B+': 0, 'B': 0, 'C+': 0, 'C': 0, 'D': 0, 'E': 0, 'G': 0, 'TH': 0 },
      etr: { 'A+': 0, 'A': 0, 'A-': 0, 'B+': 0, 'B': 0, 'C+': 0, 'C': 0, 'D': 0, 'E': 0, 'G': 0, 'TH': 0 },
    };

    parsedStats.parsedStudents.forEach(st => {
      st.scores.forEach(sc => {
        if (sc.tov !== null && sc.tov !== undefined) {
          const g = calculateGrade(sc.tov);
          if (g in breakdown.tov) breakdown.tov[g as keyof typeof breakdown.tov]++;
        }
        if (sc.ppt !== null && sc.ppt !== undefined) {
          const g = calculateGrade(sc.ppt);
          if (g in breakdown.ppt) breakdown.ppt[g as keyof typeof breakdown.ppt]++;
        }
        if (sc.ar2 !== null && sc.ar2 !== undefined) {
          const g = calculateGrade(sc.ar2);
          if (g in breakdown.ar2) breakdown.ar2[g as keyof typeof breakdown.ar2]++;
        }
        if (sc.etr !== null && sc.etr !== undefined) {
          const g = calculateGrade(sc.etr);
          if (g in breakdown.etr) breakdown.etr[g as keyof typeof breakdown.etr]++;
        }
      });
    });

    return breakdown;
  })() : null;

  // Dynamic changes preview helper for comparing TOV with the incoming CSV
  const changesPreview = parsedStats ? (() => {
    const currentDefaultPhase = defaultPhase;
    const isPptOrEtrImport = currentDefaultPhase === 'ppt' || currentDefaultPhase === 'ar2' || currentDefaultPhase === 'etr' || 
                             parsedStats.parsedStudents.some(s => s.scores && s.scores.some((sc: any) => sc.ppt !== null && sc.ppt !== undefined || sc.ar2 !== null && sc.ar2 !== undefined));

    const existingStudentsMap = new Map<string, Student>();
    const existingByName = new Map<string, Student>();
    students.forEach(s => {
      existingStudentsMap.set(s.id, s);
      const normName = s.name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (normName) {
        existingByName.set(normName, s);
      }
    });

    const addedList: { name: string; clazz: string }[] = [];
    const mergedList: { name: string; clazz: string; hasTov: boolean }[] = [];
    const matchedExistingIds = new Set<string>();

    parsedStats.parsedStudents.forEach(imported => {
      const key = imported.id;
      const normImportedName = imported.name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      
      let existing = existingStudentsMap.get(key);
      if (!existing && normImportedName) {
        existing = existingByName.get(normImportedName);
      }

      if (existing) {
        matchedExistingIds.add(existing.id);
        const hasTov = existing.scores.some(sc => sc.tov !== null && sc.tov !== undefined);
        mergedList.push({
          name: imported.name,
          clazz: imported.clazz || existing.clazz,
          hasTov
        });
      } else {
        addedList.push({
          name: imported.name,
          clazz: imported.clazz || '4 TERAS'
        });
      }
    });

    const removedList: { name: string; clazz: string; hasTov: boolean }[] = [];
    if (isPptOrEtrImport && importMode === 'merge') {
      students.forEach(s => {
        if (!matchedExistingIds.has(s.id)) {
          const hasTov = s.scores.some(sc => sc.tov !== null && sc.tov !== undefined);
          removedList.push({
            name: s.name,
            clazz: s.clazz,
            hasTov
          });
        }
      });
    }

    return { addedList, mergedList, removedList, isPptOrEtrImport };
  })() : null;

  // Available classes in dataset
  const classes = ['Semua', ...Array.from(new Set(students.map(s => s.clazz)))];

  // Helper to filter students based on selected class
  const filteredStudents = selectedClass === 'Semua' 
    ? students 
    : students.filter(s => s.clazz === selectedClass);

  const GRADES: Grade[] = ['A+', 'A', 'A-', 'B+', 'B', 'C+', 'C', 'D', 'E', 'G'];

  // Helper function to compute subject statistics for an exam phase
  const getSubjectStats = (subjectId: string, phase: 'tov' | 'ppt' | 'ar2' | 'etr') => {
    const counts: Record<Grade, number> = {
      'A+': 0, 'A': 0, 'A-': 0, 'B+': 0, 'B': 0, 'C+': 0, 'C': 0, 'D': 0, 'E': 0, 'G': 0, 'TH': 0, '': 0
    };
    let totalPresent = 0;
    let totalPoints = 0;
    let totalCount = 0;
    let absentCount = 0;

    filteredStudents.forEach(student => {
      const scoreObj = student.scores.find(s => s.subjectId === subjectId);
      if (scoreObj) {
        const val = scoreObj[phase];
        if (val !== undefined && val !== null) {
          totalCount++;
          if (val === -1) {
            absentCount++;
            counts['TH']++;
          } else {
            const grade = calculateGrade(val);
            if (grade in counts) {
              counts[grade]++;
            }
            totalPresent++;
            totalPoints += getGradePoint(grade);
          }
        }
      }
    });

    const gpmp = totalPresent === 0 ? null : parseFloat((totalPoints / totalPresent).toFixed(2));

    return {
      counts,
      calon: totalPresent + absentCount,
      total: totalCount,
      absent: absentCount,
      gpmp
    };
  };

  // Helper function to compute overall school school metrics (aggregated over all papers)
  const getOverallStats = (phase: 'tov' | 'ppt' | 'ar2' | 'etr') => {
    const counts: Record<Grade, number> = {
      'A+': 0, 'A': 0, 'A-': 0, 'B+': 0, 'B': 0, 'C+': 0, 'C': 0, 'D': 0, 'E': 0, 'G': 0, 'TH': 0, '': 0
    };
    let totalPresent = 0;
    let totalPoints = 0;
    let totalCount = 0;
    let absentCount = 0;

    const excludedIds = getExcludedSubjectIds();

    filteredStudents.forEach(student => {
      student.scores.forEach(scoreObj => {
        if (excludedIds.includes(scoreObj.subjectId)) return;
        const val = scoreObj[phase];
        if (val !== undefined && val !== null) {
          totalCount++;
          if (val === -1) {
            absentCount++;
            counts['TH']++;
          } else {
            const grade = calculateGrade(val);
            if (grade in counts) {
              counts[grade]++;
            }
            totalPresent++;
            totalPoints += getGradePoint(grade);
          }
        }
      });
    });

    const gps = totalPresent === 0 ? null : parseFloat((totalPoints / totalPresent).toFixed(2));

    return {
      counts,
      calon: totalPresent + absentCount,
      total: totalCount,
      absent: absentCount,
      gps
    };
  };

  // Compute Overall Stats for TOV, PPT, Percubaan (ar2), and ETR
  const overallTOV = getOverallStats('tov');
  const overallPPT = getOverallStats('ppt');
  const overallPercubaan = getOverallStats('ar2');
  const overallETR = getOverallStats('etr');

  // Compute overall ETR stats dynamically aggregating manual edits
  const overallETR_display = (() => {
    const aggregatedCounts: Record<Grade, number> = {
      'A+': 0, 'A': 0, 'A-': 0, 'B+': 0, 'B': 0, 'C+': 0, 'C': 0, 'D': 0, 'E': 0, 'G': 0, 'TH': 0, '': 0
    };
    
    const excludedIds = getExcludedSubjectIds();

    // Go through all subjects
    subjects.forEach(sub => {
      if (excludedIds.includes(sub.id)) return;
      const sub_stats = getSubjectStats(sub.id, 'etr');
      GRADES.forEach(g => {
        const rawVal = editedEtrCounts[sub.id]?.[g] !== undefined 
          ? editedEtrCounts[sub.id][g] 
          : (sub_stats.counts[g] || 0);
        const cnt = typeof rawVal === 'string' ? (parseInt(rawVal) || 0) : rawVal;
        aggregatedCounts[g] += cnt;
      });
      // Aggregate TH
      aggregatedCounts['TH'] += sub_stats.absent;
    });
    
    let totalPresent = 0;
    let totalPoints = 0;
    GRADES.forEach(g => {
      const count = aggregatedCounts[g];
      totalPresent += count;
      totalPoints += count * getGradePoint(g);
    });
    
    const gps = totalPresent === 0 ? null : (totalPoints / totalPresent);
    const finalGps = gps === null ? null : parseFloat(gps.toFixed(2));
    
    return {
      counts: aggregatedCounts,
      calon: totalPresent + (aggregatedCounts['TH'] || 0),
      gps: finalGps,
      absent: overallETR.absent
    };
  })();

  // Calculate top ribbon parameters
  const tovGPS = overallTOV.gps;
  const etrGPS = overallETR_display.gps;
  const gpBeza = (tovGPS !== null && etrGPS !== null) ? parseFloat((tovGPS - etrGPS).toFixed(2)) : 0;
  const gpBezaPercent = (tovGPS !== null && tovGPS !== 0 && etrGPS !== null) ? parseFloat(((gpBeza / tovGPS) * 100).toFixed(2)) : 0;

  const renderGP = (gp: number | null) => {
    if (gp === null) return '-';
    return gp.toFixed(2);
  };

  // Determine Grade average cell color-coding matching standard Malaysian GP metrics
  // GP represents average: 1.0 is near-perfect, 9.0 is failing. Lower is better.
  const getGredPurataColor = (gp: number | null) => {
    if (gp === null) return 'bg-slate-100 text-slate-400 font-normal';
    if (gp === 0) return 'bg-emerald-600 text-white font-black'; // Perfect score!
    if (gp <= 3.00) return 'bg-emerald-500 text-white font-black'; // Cemerlang (Excel/Green)
    if (gp <= 5.00) return 'bg-amber-400 text-slate-900 font-bold'; // Kepujian (Yellow)
    if (gp <= 6.50) return 'bg-orange-500 text-white font-bold'; // Sederhana (Orange)
    return 'bg-rose-600 text-white font-black'; // Kritikal (Red)
  };

  // Handle printing
  const handlePrint = () => {
    window.print();
  };

  // List of active subjects sorted
  const sortedSubjects = [...subjects]
    .filter(sub => {
      if (!subjectSearch) return true;
      return sub.name.toLowerCase().includes(subjectSearch.toLowerCase()) || 
             sub.code.includes(subjectSearch);
    });

  // Templates to Copy
  const WIDE_TEMPLATE = `ID_Murid,Nama,Kelas,Bahasa Melayu (TOV),Bahasa Melayu (PPT),Bahasa Melayu (Percubaan SPM),Bahasa Melayu (ETR),Sejarah (TOV),Sejarah (PPT),Sejarah (Percubaan SPM),Sejarah (ETR),Mathematics (TOV),Mathematics (PPT),Mathematics (Percubaan SPM),Mathematics (ETR)
"050309050419","MOHAMAD ARFA BIN HAIRI","4 UKM",71,75,80,85,65,71,75,80,70,72,80,85
"050118050512","NAJUWAH SHAHFIKAH BT. SHAHRUL RIZAL","4 UKM",57,60,65,72,52,55,60,68,44,48,55,60
"050216050065","MUHAMMAD HAFIZULLAH B AIDILFITRI","4 UM",50,52,60,70,42,48,55,65,38,TH,45,58`;

  const LONG_TEMPLATE = `ID_Murid,Nama,Kelas,Kod_Subjek,Nama_Subjek,TOV,PPT,Percubaan SPM,ETR
"050309050419","MOHAMAD ARFA BIN HAIRI","4 UKM","1103","Bahasa Melayu",71,75,80,85
"050309050419","MOHAMAD ARFA BIN HAIRI","4 UKM","1249","Sejarah",65,71,75,80
"050118050512","NAJUWAH SHAHFIKAH BT. SHAHRUL RIZAL","4 UKM","1103","Bahasa Melayu",57,60,65,72
"050118050512","NAJUWAH SHAHFIKAH BT. SHAHRUL RIZAL","4 UKM","1449","Mathematics",44,48,55,60`;

  const handleCopyTemplate = (text: string, type: 'wide' | 'long') => {
    navigator.clipboard.writeText(text);
    setCopiedTemplate(type);
    setTimeout(() => setCopiedTemplate(null), 2000);
  };

  // CSV Drag and drop handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      readAndProcessFile(file);
      // Reset physical input so that selecting the same file again triggers onChange
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      readAndProcessFile(file);
    }
  };

  const readAndProcessFile = (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setErrorMessage('Hanya fail teks berformat kontena kelayakan (.csv atau .txt) dibenarkan selaku lembaran data.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text);

      // Auto-detect exam phase from the filename to prevent PPT files from falling back to TOV and overwriting 
      let detectedPhase: 'tov' | 'ppt' | 'ar2' | 'etr' | 'auto' = 'auto';
      const lowercaseName = file.name.toLowerCase();
      if (lowercaseName.includes('ppt') || lowercaseName.includes('pertengahan') || lowercaseName.includes('tengah')) {
        detectedPhase = 'ppt';
      } else if (lowercaseName.includes('percubaan') || lowercaseName.includes('trial')) {
        detectedPhase = 'ar2';
      } else if (lowercaseName.includes('etr') || lowercaseName.includes('sasaran')) {
        detectedPhase = 'etr';
      } else if (lowercaseName.includes('tov') || lowercaseName.includes('mula') || lowercaseName.includes('take off') || lowercaseName.includes('take-off')) {
        detectedPhase = 'tov';
      }

      if (detectedPhase !== 'auto') {
        setDefaultPhase(detectedPhase);
        processCSVData(text, detectedPhase);
      } else {
        processCSVData(text);
      }
    };
    reader.onerror = () => {
      setErrorMessage('Gagal memuat naik dan membaca fail CSV tersebut.');
    };
    reader.readAsText(file);
  };

  // The comprehensive parser engine that parses wide or long formats
  const processCSVData = (text: string, activePhaseOverride?: 'auto' | 'tov' | 'ppt' | 'ar2' | 'etr') => {
    try {
      setErrorMessage(null);
      setParsedStats(null);
      
      const parsedRows = parseCSV(text);
      if (parsedRows.length < 2) {
        throw new Error('Tajuk lajur (header) tidak lengkap atau fail CSV kosong.');
      }

      const headers = parsedRows[0].map(h => h.trim().toLowerCase().replace(/^"(.*)"$/, '$1').trim());
      
      // Look for columns
      const nameIdx = headers.findIndex(h => h.includes('nama') || h.includes('name') || h.includes('murid') || h.includes('pelajar'));
      
      // Prioritize MyKad / IC / No. KP and ignore database row identifiers like ID Individu
      let icIdx = headers.findIndex(h => 
        h === 'kp' || h.includes('mykad') || h.includes('nokp') || h.includes('no. kp') || h.includes('no kp') || h.includes('kp_no') || h.includes('ic') || h.includes('kad')
      );
      if (icIdx === -1) {
        icIdx = headers.findIndex(h => h.includes('id') && !h.includes('individu'));
      }
      if (icIdx === -1) {
        icIdx = headers.findIndex(h => h.includes('id'));
      }

      // Prioritize Class name over standard level (Tingkatan)
      let classIdx = headers.findIndex(h => h.includes('kelas') || h.includes('class') || h.includes('clazz') || h.includes('aliran'));
      if (classIdx === -1) {
        classIdx = headers.findIndex(h => h.includes('tingkatan') || h.includes('form'));
      }

      // Look for location / school / demographics columns
      const kodIdx = headers.findIndex(h => 
        h === 'kod' || h === 'code' || h === 'kod_murid' || h === 'kod murid' || h === 'id_murid' || h === 'id murid' || h === 'student_id' || h === 'student id' || h === 'kod_calon' || h === 'kod calon' || h.includes('kod')
      );
      const jpnIdx = headers.findIndex(h => 
        h === 'jpn' || h === 'negeri' || h === 'state' || h === 'jabatan' || h.includes('jpn') || h.includes('negeri') || h.includes('jabatan pendidikan')
      );
      const ppdIdx = headers.findIndex(h => 
        h === 'ppd' || h === 'daerah' || h === 'district' || h.includes('ppd') || h.includes('daerah') || h.includes('pejabat pendidikan')
      );
      const kodSekolahIdx = headers.findIndex(h => 
        h === 'kod sekolah' || h === 'kod_sekolah' || h === 'school_code' || h === 'school code' || h === 'kodsek' || h === 'schoolcode' || h.includes('kod sekolah') || h.includes('kod_sekolah') || h.includes('kodsek')
      );
      const sekolahIdx = headers.findIndex(h => 
        h === 'sekolah' || h === 'nama sekolah' || h === 'nama_sekolah' || h === 'school' || h === 'school_name' || h === 'school name' || h.includes('nama sekolah') || h.includes('nama_sekolah') || h.includes('sekolah')
      );
      const jantinaIdx = headers.findIndex(h => 
        h === 'jantina' || h === 'gender' || h === 'sex' || h === 'jant' || h.includes('jantina') || h.includes('gender')
      );
      const kodNegeriIdx = headers.findIndex(h => 
        h === 'kod negeri' || h === 'kod_negeri' || h === 'state_code' || h === 'state code' || h.includes('kod negeri') || h.includes('kod_negeri') || h.includes('kodneg')
      );

      if (nameIdx === -1) {
        throw new Error('ID / Tajuk lajur Nama tidak dijumpai. Pastikan fail mengandungi pengepala "Nama" atau "Name".');
      }

      const currentDefaultPhase = activePhaseOverride || defaultPhase;

      // Smart Auto-detection of overall Phase to prevent overwrites
      let inferredDefaultPhase: 'tov' | 'ppt' | 'ar2' | 'etr' = 'tov';
      
      const hasExistingTov = students.some(s => s.scores && s.scores.some(sc => sc.tov !== undefined && sc.tov !== null));
      const hasExistingPpt = students.some(s => s.scores && s.scores.some(sc => sc.ppt !== undefined && sc.ppt !== null));
      const hasExistingAr2 = students.some(s => s.scores && s.scores.some(sc => sc.ar2 !== undefined && sc.ar2 !== null));
      const hasExistingEtr = students.some(s => s.scores && s.scores.some(sc => sc.etr !== undefined && sc.etr !== null));

      if (hasExistingTov && !hasExistingPpt) {
        inferredDefaultPhase = 'ppt';
      } else if (hasExistingTov && hasExistingPpt && !hasExistingAr2) {
        inferredDefaultPhase = 'ar2';
      } else if (hasExistingTov && hasExistingPpt && hasExistingAr2 && !hasExistingEtr) {
        inferredDefaultPhase = 'etr';
      }

      const cleanLowerText = text.toLowerCase();
      if (cleanLowerText.includes('peperiksaan pertengahan') || cleanLowerText.includes('pentaksiran pertengahan') || cleanLowerText.includes('tengah tahun') || cleanLowerText.includes('ppt')) {
        inferredDefaultPhase = 'ppt';
      } else if (cleanLowerText.includes('percubaan spm') || cleanLowerText.includes('trial spm') || cleanLowerText.includes('percubaan') || cleanLowerText.includes('trial')) {
        inferredDefaultPhase = 'ar2';
      } else if (cleanLowerText.includes('etr') || cleanLowerText.includes('sasaran')) {
        inferredDefaultPhase = 'etr';
      } else if (cleanLowerText.includes('tov') || cleanLowerText.includes('take off') || cleanLowerText.includes('take-off') || cleanLowerText.includes('nilai mula')) {
        inferredDefaultPhase = 'tov';
      }

      // Check if it's the Long Format (has explicit subject columns)
      const subjectCodeIdx = headers.findIndex(h => 
        (h.includes('subjek') || h.includes('subject') || h.includes('mata pelajaran') || h.includes('matapelajaran') || h.includes('mp') || h === 'kp_sasaran_mp' || h === 'mp_code' || h === 'kodmp') && 
        (h.includes('kod') || h.includes('code' ) || h.includes('id'))
      );
      const subjectNameIdx = headers.findIndex(h => 
        h === 'mp' || h === 'mata pelajaran' || h === 'matapelajaran' || h === 'subject' || h === 'subjek' || 
        h.includes('nama mp') || h.includes('nama m/p') || h.includes('nama subjek') || h.includes('nama subject') || h.includes('mata_pelajaran') || h.includes('subjek/mp') ||
        (h.includes('subjek') && (h.includes('nama') || h.includes('name'))) ||
        (h.includes('subject') && (h.includes('nama') || h.includes('name'))) ||
        (h.includes('mata pelajaran') && (h.includes('nama') || h.includes('name')))
      );
      
      const isLongFormat = subjectCodeIdx !== -1 || subjectNameIdx !== -1;

      const detectedStudentsMap = new Map<string, any>();
      const detectedSubjectsMap = new Map<string, Subject>();

      const existingSubjectsMap = new Map<string, Subject>();
      subjects.forEach(sub => {
        existingSubjectsMap.set(sub.id, sub);
        existingSubjectsMap.set(sub.code, sub);
        existingSubjectsMap.set(sub.name.toLowerCase(), sub);
      });

      let invalidRowsCount = 0;

      if (isLongFormat) {
        // --- PARSE LONG FORMAT ---
        const tovIdx = headers.findIndex(h => h === 'tov' || h.includes('tov'));
        const pptIdx = headers.findIndex(h => h === 'ppt' || h.includes('ppt') || h.includes('tengah'));
        const ar2Idx = headers.findIndex(h => h.includes('percubaan') || h.includes('trial'));
        const etrIdx = headers.findIndex(h => h === 'etr' || h.includes('sasaran'));

        // Look for an activity/exam name column and a single score-carrying column
        const activityColIdx = headers.findIndex(h => 
          h.includes('aktiviti') || h.includes('peperiksaan') || h.includes('pentaksiran') || h.includes('jenis ujian') || h.includes('fasa') || h.includes('exam') || h.includes('ujian')
        );
        const singleScoreColIdx = headers.findIndex(h => 
          h === 'markah' || h === 'mark' || h === 'skor' || h === 'score' || h.includes('markah') || h.includes('skor') || h.includes('score') || h.includes('mark/grade')
        );

        for (let r = 1; r < parsedRows.length; r++) {
          const row = parsedRows[r];
          if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;

          const rawName = (row[nameIdx] || '').replace(/^"(.*)"$/, '$1').trim();
          if (!rawName) {
            invalidRowsCount++;
            continue;
          }

          const rawIc = icIdx !== -1 ? (row[icIdx] || '').replace(/^"(.*)"$/, '$1').replace(/[^0-9A-Za-z]/g, '').trim() : '';
          const ic = rawIc || `GEN-${rawName.toUpperCase().replace(/\s+/g, '').substring(0, 8)}-${r}`;
          const clazz = classIdx !== -1 ? (row[classIdx] || '4 TERAS').replace(/^"(.*)"$/, '$1').trim().toUpperCase() : '4 TERAS';

          const kodVal = kodIdx !== -1 ? (row[kodIdx] || '').replace(/^"(.*)"$/, '$1').trim() : undefined;
          let jpnVal = jpnIdx !== -1 ? (row[jpnIdx] || '').replace(/^"(.*)"$/, '$1').trim() : undefined;
          if (jpnVal) {
            jpnVal = cleanJpnText(jpnVal);
          }
          const ppdVal = ppdIdx !== -1 ? (row[ppdIdx] || '').replace(/^"(.*)"$/, '$1').trim() : undefined;
          let kodSekolahVal = kodSekolahIdx !== -1 ? (row[kodSekolahIdx] || '').replace(/^"(.*)"$/, '$1').trim() : undefined;
          const sekolahVal = sekolahIdx !== -1 ? (row[sekolahIdx] || '').replace(/^"(.*)"$/, '$1').trim() : undefined;
          
          if (!kodSekolahVal && sekolahVal) {
            const match = sekolahVal.match(/\b([A-Z]{3}\d{4})\b/i);
            if (match) {
              kodSekolahVal = match[1].toUpperCase();
            }
          }
          
          const jantinaVal = jantinaIdx !== -1 ? (row[jantinaIdx] || '').replace(/^"(.*)"$/, '$1').trim().toUpperCase() : undefined;
          const kodNegeriVal = kodNegeriIdx !== -1 ? (row[kodNegeriIdx] || '').replace(/^"(.*)"$/, '$1').trim() : undefined;

          const rawSubCode = subjectCodeIdx !== -1 ? (row[subjectCodeIdx] || '').replace(/^"(.*)"$/, '$1').trim() : '';
          const rawSubName = subjectNameIdx !== -1 ? (row[subjectNameIdx] || '').replace(/^"(.*)"$/, '$1').trim() : '';

          if (!rawSubCode && !rawSubName) {
            invalidRowsCount++;
            continue;
          }

          let subId = rawSubCode || rawSubName.replace(/\s+/g, '-').toLowerCase();
          let subName = rawSubName || `Subjek ${rawSubCode}`;
          let subCode = rawSubCode || '9999';

          const subInfo = resolveSubjectInfo(rawSubName || rawSubCode);
          const matchedSubject = existingSubjectsMap.get(subId) || existingSubjectsMap.get(subCode) || existingSubjectsMap.get(subName.toLowerCase()) || existingSubjectsMap.get(subInfo.code);
          if (matchedSubject) {
            subId = matchedSubject.id;
            subCode = matchedSubject.code;
            subName = matchedSubject.name;
          } else {
            subId = subInfo.code;
            subCode = subInfo.code;
            subName = subInfo.name;
          }

          if (!detectedSubjectsMap.has(subId)) {
            let category: 'Wajib' | 'Teras' | 'Elektif' | 'Vokasional' = 'Elektif';
            const catLower = subName.toLowerCase();
            if (catLower.includes('melayu') || catLower.includes('sejarah') || catLower.includes('inggeris') || catLower.includes('math') || catLower.includes('science') || catLower.includes('islam') || catLower.includes('moral')) {
              category = 'Teras';
            }
            detectedSubjectsMap.set(subId, { id: subId, name: subName, code: subCode, category });
          }

          let tovValue: number | null = null;
          let pptValue: number | null = null;
          let ar2Value: number | null = null;
          let etrValue: number | null = null;

          if (singleScoreColIdx !== -1) {
            const scoreVal = parseScoreValue(row[singleScoreColIdx] || '');
            let rowPhase: 'tov' | 'ppt' | 'ar2' | 'etr' | null = null;

            if (currentDefaultPhase !== 'auto') {
              rowPhase = currentDefaultPhase;
            } else if (activityColIdx !== -1) {
              const actStr = (row[activityColIdx] || '').trim().toLowerCase();
              if (
                actStr.includes('peperiksaan akhir sesi akademik') || 
                actStr.includes('pentaksiran akhir sesi akademik') || 
                actStr.includes('ujian akhir sesi akademik') || 
                actStr.includes('akhir sesi akademik') || 
                actStr.includes('uasa') || 
                actStr.includes('pasa') ||
                actStr.includes('tov') ||
                actStr.includes('take-off') ||
                actStr.includes('take off')
              ) {
                rowPhase = 'tov';
              } else if (
                actStr.includes('pertengahan') || 
                actStr.includes('ppt') || 
                actStr.includes('tengah tahun')
              ) {
                rowPhase = 'ppt';
              } else if (
                actStr.includes('percubaan') || 
                actStr.includes('trial')
              ) {
                rowPhase = 'ar2';
              } else if (
                actStr.includes('sasaran') || 
                actStr.includes('etr') || 
                actStr.includes('spm')
              ) {
                rowPhase = 'etr';
              } else {
                rowPhase = inferredDefaultPhase; // Smart default!
              }
            } else {
              rowPhase = inferredDefaultPhase; // Smart default!
            }

            if (rowPhase === 'tov') tovValue = scoreVal;
            else if (rowPhase === 'ppt') pptValue = scoreVal;
            else if (rowPhase === 'ar2') ar2Value = scoreVal;
            else if (rowPhase === 'etr') etrValue = scoreVal;
          } else {
            tovValue = tovIdx !== -1 ? parseScoreValue(row[tovIdx] || '') : null;
            pptValue = pptIdx !== -1 ? parseScoreValue(row[pptIdx] || '') : null;
            ar2Value = ar2Idx !== -1 ? parseScoreValue(row[ar2Idx] || '') : null;
            etrValue = etrIdx !== -1 ? parseScoreValue(row[etrIdx] || '') : null;
          }

          let student = detectedStudentsMap.get(ic);
          if (!student) {
            student = { 
              id: ic, 
              name: rawName.toUpperCase(), 
              clazz, 
              scores: [],
              kod: kodVal || undefined,
              jpn: jpnVal || undefined,
              ppd: ppdVal || undefined,
              kodSekolah: kodSekolahVal || undefined,
              jantina: jantinaVal || undefined,
              sekolah: sekolahVal || undefined,
              kodNegeri: kodNegeriVal || undefined
            };
            detectedStudentsMap.set(ic, student);
          }

          const existingScoreIdx = student.scores.findIndex((s: any) => s.subjectId === subId);
          if (existingScoreIdx !== -1) {
            if (tovValue !== null) student.scores[existingScoreIdx].tov = tovValue;
            if (pptValue !== null) student.scores[existingScoreIdx].ppt = pptValue;
            if (ar2Value !== null) student.scores[existingScoreIdx].ar2 = ar2Value;
            if (etrValue !== null) student.scores[existingScoreIdx].etr = etrValue;
          } else {
            student.scores.push({ subjectId: subId, tov: tovValue, ppt: pptValue, ar2: ar2Value, etr: etrValue });
          }
        }
      } else {
        // --- PARSE WIDE FORMAT ---
        const subjectColumns: Array<{
          headerIdx: number;
          subjectName: string;
          subjectCode: string;
          phase: 'tov' | 'ppt' | 'ar2' | 'etr';
        }> = [];

        const EXCLUDED_HEADERS = [
          'no', 'bil', 'number', 'index', 'id', 'ic', 'kp', 'mykad', 'kad', 'kp_no', 'nokp', 'kp_nombor',
          'nama', 'name', 'student', 'pelajar', 'murid',
          'kelas', 'class', 'clazz', 'tingkatan', 'form', 'aliran', 'group', 'kumpulan',
          'jantina', 'gender', 'sex', 'kaum', 'race', 'bangsa', 'agama', 'religion',
          'no_matrik', 'matrik', 'status', 'bilangan', 'tt', 'tandatangan', 'catatan', 'remarks',
          'ppd', 'kod', 'jpn', 'kod | jpn', 'kod | sekolah', 'sekolah', 'id individu', 'tahun', 
          'sesi', 'sesi persekolahan', 'aktiviti', 'aktiviti pentaksiran', 'pentaksiran', 'perangkatan'
        ];

        headers.forEach((header, idx) => {
          if (idx === nameIdx || idx === icIdx || idx === classIdx) return;

          // Check if it matches any excluded metadata helper headers
          const cleanHeader = header.trim().toLowerCase();
          if (EXCLUDED_HEADERS.some(ex => cleanHeader === ex || cleanHeader.startsWith(ex + ' ') || cleanHeader.search(new RegExp(`\\b${ex}\\b`)) !== -1)) {
            return;
          }

          // If a header starts with 'g' and the remaining part matches a standard subject or is present in headers, skip as it's a grade column
          if (cleanHeader.startsWith('g')) {
            const potentialSubAbbr = cleanHeader.substring(1);
            if (headers.includes(potentialSubAbbr) || resolveSubjectInfo(potentialSubAbbr).code !== '8000') {
               return; // skip grade columns
            }
          }

          const hasTov = cleanHeader.includes('tov') || 
            cleanHeader.includes('peperiksaan akhir sesi akademik') || 
            cleanHeader.includes('pentaksiran akhir sesi akademik') || 
            cleanHeader.includes('ujian akhir sesi akademik') || 
            cleanHeader.includes('akhir sesi akademik') || 
            cleanHeader.includes('uasa') || 
            cleanHeader.includes('pasa') ||
            cleanHeader.includes('take-off') ||
            cleanHeader.includes('take off');

          const hasPpt = cleanHeader.includes('ppt') || cleanHeader.includes('pertengahan') || cleanHeader.includes('tengah');
          const hasPrcb = cleanHeader.includes('percubaan') || cleanHeader.includes('trial');
          const hasEtr = cleanHeader.includes('etr') || cleanHeader.includes('sasaran');

          let phase: 'tov' | 'ppt' | 'ar2' | 'etr' | null = null;
          if (currentDefaultPhase !== 'auto') {
            phase = currentDefaultPhase;
          } else {
            if (hasTov) phase = 'tov';
            else if (hasPpt) phase = 'ppt';
            else if (hasPrcb) phase = 'ar2';
            else if (hasEtr) phase = 'etr';
            else {
              // Fallback to the smart inferred default phase to prevent accidental overwrites
              phase = inferredDefaultPhase;
            }
          }

          let cleanSubName = parsedRows[0][idx]
            .replace(/\(tov\)/i, '')
            .replace(/\[tov\]/i, '')
            .replace(/\btov\b/i, '')
            .replace(/\(ppt\)/i, '')
            .replace(/\[ppt\]/i, '')
            .replace(/\bppt\b/i, '')
            .replace(/\(etr\)/i, '')
            .replace(/\[etr\]/i, '')
            .replace(/\betr\b/i, '')
            .replace(/\(percubaan spm\)/i, '')
            .replace(/\[percubaan spm\]/i, '')
            .replace(/\bpercubaan spm\b/i, '')
            .replace(/\(percubaan\)/i, '')
            .replace(/\[percubaan\]/i, '')
            .replace(/\bpercubaan\b/i, '')
            .replace(/\(sasaran\)/i, '')
            .replace(/\[sasaran\]/i, '')
            .replace(/\bsasaran\b/i, '')
            .replace(/\(peperiksaan akhir sesi akademik\)/i, '')
            .replace(/\[peperiksaan akhir sesi akademik\]/i, '')
            .replace(/\bpeperiksaan akhir sesi akademik\b/i, '')
            .replace(/\(pentaksiran akhir sesi akademik\)/i, '')
            .replace(/\[pentaksiran akhir sesi akademik\]/i, '')
            .replace(/\bpentaksiran akhir sesi akademik\b/i, '')
            .replace(/\(ujian akhir sesi akademik\)/i, '')
            .replace(/\[ujian akhir sesi akademik\]/i, '')
            .replace(/\bujian akhir sesi akademik\b/i, '')
            .replace(/\(uasa\)/i, '')
            .replace(/\[uasa\]/i, '')
            .replace(/\buasa\b/i, '')
            .replace(/\(pasa\)/i, '')
            .replace(/\[pasa\]/i, '')
            .replace(/\bpasa\b/i, '')
            .trim();
          
          cleanSubName = cleanSubName.replace(/^[-_\s()\[\]{}]+|[-_\s()\[\]{}]+$/g, '').trim();

          const subInfo = resolveSubjectInfo(cleanSubName);
          const finalSubName = subInfo.name;
          const finalSubCode = subInfo.code;

          if (finalSubName && phase) {
            subjectColumns.push({ 
              headerIdx: idx, 
              subjectName: finalSubName, 
              subjectCode: finalSubCode,
              phase 
            });
          }
        });

        if (subjectColumns.length === 0) {
          throw new Error('Tiada pengepala lajur subjek dikesan dalam fail CSV.');
        }

        for (let r = 1; r < parsedRows.length; r++) {
          const row = parsedRows[r];
          if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;

          const rawName = (row[nameIdx] || '').replace(/^"(.*)"$/, '$1').trim();
          if (!rawName) {
            invalidRowsCount++;
            continue;
          }

          const rawIc = icIdx !== -1 ? (row[icIdx] || '').replace(/^"(.*)"$/, '$1').replace(/[^0-9A-Za-z]/g, '').trim() : '';
          const ic = rawIc || `GEN-${rawName.toUpperCase().replace(/\s+/g, '').substring(0, 8)}-${r}`;
          const clazz = classIdx !== -1 ? (row[classIdx] || '4 TERAS').replace(/^"(.*)"$/, '$1').trim().toUpperCase() : '4 TERAS';

          const kodVal = kodIdx !== -1 ? (row[kodIdx] || '').replace(/^"(.*)"$/, '$1').trim() : undefined;
          let jpnVal = jpnIdx !== -1 ? (row[jpnIdx] || '').replace(/^"(.*)"$/, '$1').trim() : undefined;
          if (jpnVal) {
            jpnVal = cleanJpnText(jpnVal);
          }
          const ppdVal = ppdIdx !== -1 ? (row[ppdIdx] || '').replace(/^"(.*)"$/, '$1').trim() : undefined;
          let kodSekolahVal = kodSekolahIdx !== -1 ? (row[kodSekolahIdx] || '').replace(/^"(.*)"$/, '$1').trim() : undefined;
          const sekolahVal = sekolahIdx !== -1 ? (row[sekolahIdx] || '').replace(/^"(.*)"$/, '$1').trim() : undefined;
          
          if (!kodSekolahVal && sekolahVal) {
            const match = sekolahVal.match(/\b([A-Z]{3}\d{4})\b/i);
            if (match) {
              kodSekolahVal = match[1].toUpperCase();
            }
          }
          
          const jantinaVal = jantinaIdx !== -1 ? (row[jantinaIdx] || '').replace(/^"(.*)"$/, '$1').trim().toUpperCase() : undefined;
          const kodNegeriVal = kodNegeriIdx !== -1 ? (row[kodNegeriIdx] || '').replace(/^"(.*)"$/, '$1').trim() : undefined;

          const studentScoresMap = new Map<string, { tov: number | null, ppt: number | null, ar2: number | null, etr: number | null }>();

          subjectColumns.forEach(({ headerIdx, subjectName, subjectCode, phase }) => {
            const valStr = row[headerIdx] || '';
            const val = parseScoreValue(valStr);

            let matchedSubject = existingSubjectsMap.get(subjectCode) || existingSubjectsMap.get(subjectName.toLowerCase());
            let subId = matchedSubject ? matchedSubject.id : subjectCode;
            let subName = matchedSubject ? matchedSubject.name : subjectName;
            let subCode = matchedSubject ? matchedSubject.code : subjectCode;

            if (!detectedSubjectsMap.has(subId)) {
              let category: 'Wajib' | 'Teras' | 'Elektif' | 'Vokasional' = 'Elektif';
              const catLower = subName.toLowerCase();
              if (catLower.includes('melayu') || catLower.includes('sejarah') || catLower.includes('inggeris') || catLower.includes('math') || catLower.includes('science') || catLower.includes('islam') || catLower.includes('moral')) {
                category = 'Teras';
              }
              detectedSubjectsMap.set(subId, { id: subId, name: subName, code: subCode, category });
            }

            let sc = studentScoresMap.get(subId);
            if (!sc) {
              sc = { tov: null, ppt: null, ar2: null, etr: null };
              studentScoresMap.set(subId, sc);
            }
            if (val !== null) {
              sc[phase] = val;
            }
          });

          // Build a clean scores list, filtering out subjects that are never taken (all phases are null)
          const scoresList: any[] = [];
          studentScoresMap.forEach((sc, subId) => {
            if (sc.tov !== null || sc.ppt !== null || sc.ar2 !== null || sc.etr !== null) {
              scoresList.push({
                subjectId: subId,
                tov: sc.tov,
                ppt: sc.ppt,
                ar2: sc.ar2,
                etr: sc.etr
              });
            }
          });

          detectedStudentsMap.set(ic, { 
            id: ic, 
            name: rawName.toUpperCase(), 
            clazz, 
            scores: scoresList,
            kod: kodVal || undefined,
            jpn: jpnVal || undefined,
            ppd: ppdVal || undefined,
            kodSekolah: kodSekolahVal || undefined,
            jantina: jantinaVal || undefined,
            sekolah: sekolahVal || undefined,
            kodNegeri: kodNegeriVal || undefined
          });
        }
      }

      const parsedStudents = Array.from(detectedStudentsMap.values());
      const parsedSubjects = Array.from(detectedSubjectsMap.values());
      const scoresCount = parsedStudents.reduce((acc, curr) => acc + curr.scores.length, 0);

      if (parsedStudents.length === 0) {
        throw new Error('Tiada data pelajar yang sah ditemui.');
      }

      // Try to detect overall school and region metadata from parsed students
      let detectedSchool: string | null = null;
      let detectedNegeri: string | null = null;
      let detectedPpd: string | null = null;
      let detectedKodSekolah: string | null = null;
      let detectedJpn: string | null = null;
      let detectedKodNegeri: string | null = null;

      for (const st of parsedStudents) {
        if (!detectedSchool && st.sekolah) detectedSchool = st.sekolah;
        if (!detectedNegeri && st.jpn) detectedNegeri = st.jpn;
        if (!detectedJpn && st.jpn) detectedJpn = st.jpn;
        if (!detectedPpd && st.ppd) detectedPpd = st.ppd;
        if (!detectedKodSekolah && st.kodSekolah) detectedKodSekolah = st.kodSekolah;
        if (!detectedKodNegeri && st.kodNegeri) detectedKodNegeri = st.kodNegeri;
        if (detectedSchool && detectedJpn && detectedPpd && detectedKodSekolah && detectedKodNegeri) break;
      }

      setParsedStats({
        studentsCount: parsedStudents.length,
        subjectsCount: parsedSubjects.length,
        scoresCount,
        invalidRows: invalidRowsCount,
        parsedStudents,
        parsedSubjects,
        detectedSchool,
        detectedNegeri: detectedNegeri || detectedJpn,
        detectedPpd,
        detectedKodSekolah,
        detectedJpn,
        detectedKodNegeri
      });

    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Gagal memproses fail CSV. Hubungi penyelaras ICT atau semak format template.');
    }
  };

  // Commits import into database
  const commitImport = () => {
    if (!parsedStats) return;

    let finalStudents: Student[] = [];
    let finalSubjects: Subject[] = parsedStats.parsedSubjects;
    const finalSubjectIds = new Set(finalSubjects.map(s => s.id));

    if (importMode === 'overwrite') {
      finalStudents = parsedStats.parsedStudents.map(imported => ({
        id: imported.id,
        name: imported.name,
        clazz: imported.clazz,
        scores: imported.scores
          .filter((sc: any) => finalSubjectIds.has(sc.subjectId))
          .map((sc: any) => ({
            subjectId: sc.subjectId,
            tov: (sc.tov !== null && sc.tov !== undefined) ? sc.tov : undefined,
            ppt: (sc.ppt !== null && sc.ppt !== undefined) ? sc.ppt : undefined,
            ar2: (sc.ar2 !== null && sc.ar2 !== undefined) ? sc.ar2 : undefined,
            etr: (sc.etr !== null && sc.etr !== undefined) ? sc.etr : undefined
          })),
        kod: imported.kod,
        jpn: imported.jpn,
        ppd: imported.ppd,
        kodSekolah: imported.kodSekolah,
        jantina: imported.jantina,
        sekolah: imported.sekolah,
        kodNegeri: imported.kodNegeri
      }));
    } else {
      const studentsMap = new Map<string, Student>();
      const studentsByName = new Map<string, Student>();
      const matchedExistingIds = new Set<string>();
      
      students.forEach(s => {
        const studentCopy = {
          ...s,
          scores: s.scores.filter(sc => finalSubjectIds.has(sc.subjectId)).map(sc => ({ ...sc }))
        };
        studentsMap.set(s.id, studentCopy);
        const normName = s.name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (normName) {
          studentsByName.set(normName, studentCopy);
        }
      });

      parsedStats.parsedStudents.forEach(importedStudent => {
        const key = importedStudent.id;
        const normImportedName = importedStudent.name.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        
        let existing = studentsMap.get(key);
        if (!existing && normImportedName) {
          existing = studentsByName.get(normImportedName);
          if (existing) {
            // Remove from the old key to prevent duplicate items in Array.from(values)
            studentsMap.delete(existing.id);
            // Update the id of the existing student to the new key
            existing.id = key;
            // Add under the new key
            studentsMap.set(key, existing);
          }
        }

        if (existing) {
          matchedExistingIds.add(existing.id);
          importedStudent.scores.forEach((importedScore: any) => {
            if (!finalSubjectIds.has(importedScore.subjectId)) return;
            const idx = existing.scores.findIndex(sc => sc.subjectId === importedScore.subjectId);
            if (idx !== -1) {
              if (importedScore.tov !== null && importedScore.tov !== undefined) {
                existing.scores[idx].tov = importedScore.tov;
              }
              if (importedScore.ppt !== null && importedScore.ppt !== undefined) {
                existing.scores[idx].ppt = importedScore.ppt;
              }
              if (importedScore.ar2 !== null && importedScore.ar2 !== undefined) {
                existing.scores[idx].ar2 = importedScore.ar2;
              }
              if (importedScore.etr !== null && importedScore.etr !== undefined) {
                existing.scores[idx].etr = importedScore.etr;
              }
            } else {
              existing.scores.push({
                subjectId: importedScore.subjectId,
                tov: (importedScore.tov !== null && importedScore.tov !== undefined) ? importedScore.tov : undefined,
                ppt: (importedScore.ppt !== null && importedScore.ppt !== undefined) ? importedScore.ppt : undefined,
                ar2: (importedScore.ar2 !== null && importedScore.ar2 !== undefined) ? importedScore.ar2 : undefined,
                etr: (importedScore.etr !== null && importedScore.etr !== undefined) ? importedScore.etr : undefined
              });
            }
          });
          existing.name = importedStudent.name;
          if (importedStudent.clazz) {
            existing.clazz = importedStudent.clazz;
          }
          if (importedStudent.kod) existing.kod = importedStudent.kod;
          if (importedStudent.jpn) existing.jpn = importedStudent.jpn;
          if (importedStudent.ppd) existing.ppd = importedStudent.ppd;
          if (importedStudent.kodSekolah) existing.kodSekolah = importedStudent.kodSekolah;
          if (importedStudent.jantina) existing.jantina = importedStudent.jantina;
          if (importedStudent.sekolah) existing.sekolah = importedStudent.sekolah;
          if (importedStudent.kodNegeri) existing.kodNegeri = importedStudent.kodNegeri;
        } else {
          studentsMap.set(key, {
            id: importedStudent.id,
            name: importedStudent.name,
            clazz: importedStudent.clazz,
            scores: importedStudent.scores
              .filter((sc: any) => finalSubjectIds.has(sc.subjectId))
              .map((sc: any) => ({
                subjectId: sc.subjectId,
                tov: (sc.tov !== null && sc.tov !== undefined) ? sc.tov : undefined,
                ppt: (sc.ppt !== null && sc.ppt !== undefined) ? sc.ppt : undefined,
                ar2: (sc.ar2 !== null && sc.ar2 !== undefined) ? sc.ar2 : undefined,
                etr: (sc.etr !== null && sc.etr !== undefined) ? sc.etr : undefined
              })),
            kod: importedStudent.kod,
            jpn: importedStudent.jpn,
            ppd: importedStudent.ppd,
            kodSekolah: importedStudent.kodSekolah,
            jantina: importedStudent.jantina,
            sekolah: importedStudent.sekolah,
            kodNegeri: importedStudent.kodNegeri
          });
        }
      });

      // Remove any student originally in TOV but NOT present in the PPT-containing imported file
      const currentDefaultPhase = defaultPhase;
      const isPptOrEtrImport = currentDefaultPhase === 'ppt' || currentDefaultPhase === 'ar2' || currentDefaultPhase === 'etr' || 
                              parsedStats.parsedStudents.some(s => s.scores && s.scores.some((sc: any) => sc.ppt !== null && sc.ppt !== undefined || sc.ar2 !== null && sc.ar2 !== undefined));

      if (isPptOrEtrImport) {
        students.forEach(s => {
          if (!matchedExistingIds.has(s.id)) {
            studentsMap.delete(s.id);
          }
        });
      }

      finalStudents = Array.from(studentsMap.values());
    }

    if (parsedStats.detectedSchool) {
      setSchoolLabel(parsedStats.detectedSchool.toUpperCase());
    }
    if (parsedStats.detectedNegeri) {
      setRegion(cleanJpnText(parsedStats.detectedNegeri).toUpperCase());
    }
    if (parsedStats.detectedPpd) {
      setPpd(parsedStats.detectedPpd.toUpperCase());
    }
    
    // Resolve school code from school name as fallback
    let finalKodSekolah = parsedStats.detectedKodSekolah;
    if (!finalKodSekolah && parsedStats.detectedSchool) {
      const match = parsedStats.detectedSchool.match(/\b([A-Z]{3}\d{4})\b/i);
      if (match) {
        finalKodSekolah = match[1].toUpperCase();
      }
    }
    if (finalKodSekolah) {
      setKodSekolah(finalKodSekolah.toUpperCase());
    }

    if (parsedStats.detectedJpn) {
      setJpn(cleanJpnText(parsedStats.detectedJpn).toUpperCase());
    }
    if (parsedStats.detectedKodNegeri) {
      setKodNegeri(parsedStats.detectedKodNegeri.toUpperCase());
    }

    onUpdateStudentsAndSubjects(finalStudents, finalSubjects);

    setSuccessMessage(`Data berjaya disimpan! Memuatkan ${parsedStats.studentsCount} murid dan ${parsedStats.scoresCount} rekod markah peperiksaan (TOV, PPT, Percubaan SPM).`);
    setParsedStats(null);
    setCsvText('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    setTimeout(() => {
      setShowUploadPanel(false);
      setSuccessMessage(null);
    }, 3000);
  };

  return (
    <div className="space-y-6" id="gp-targeting-view">
      {/* Top Banner exactly based on spreadsheet reference */}
      <div className="bg-[#e4e9f2] rounded-xl border border-slate-300 shadow-sm overflow-hidden" id="gp-sheet-banner">
        {/* Main Ribbon */}
        <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          
          {/* Section: Negeri / State Identifier */}
          <div className="lg:col-span-4 bg-[#f8fafc] border border-slate-300/80 rounded-lg p-3 flex flex-col justify-center min-h-[70px]">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">KOD / NEGERI</span>
            <input 
              type="text" 
              value={region} 
              onChange={e => setRegion(e.target.value.toUpperCase())}
              className="text-lg font-black text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:outline-hidden py-0.5 uppercase"
              placeholder="TIADA"
            />
          </div>

          {/* KPI columns */}
          <div className="lg:col-span-6 grid grid-cols-4 gap-2">
            
            {/* Box 1: Reference (TOV Gred Purata) */}
            <div className="bg-[#f8fafc] border border-slate-300/80 rounded-lg p-2.5 text-center flex flex-col justify-between h-[75px]">
              <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">PURATA TOV</span>
              <span className="text-xl font-bold font-mono text-slate-900">{renderGP(tovGPS)}</span>
            </div>

            {/* Box 2: Target (ETR Gred Purata) */}
            <div className="bg-[#1e293b] text-white border border-slate-700 rounded-lg p-2.5 text-center flex flex-col justify-between h-[75px] shadow-xs">
              <span className="text-[9px] uppercase font-black text-slate-300 tracking-wider">SASARAN ETR</span>
              <span className="text-xl font-black font-mono text-emerald-450">{renderGP(etrGPS)}</span>
            </div>

            {/* Box 3: Beza (Difference) */}
            <div className="bg-[#f8fafc] border border-slate-300/80 rounded-lg p-2.5 text-center flex flex-col justify-between h-[75px]">
              <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">BEZA GP</span>
              <span className={`text-xl font-bold font-mono ${gpBeza >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {gpBeza >= 0 ? `+${gpBeza.toFixed(2)}` : gpBeza.toFixed(2)}
              </span>
            </div>

            {/* Box 4: % Beza */}
            <div className="bg-[#f8fafc] border border-slate-300/80 rounded-lg p-2.5 text-center flex flex-col justify-between h-[75px]">
              <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">% BEZA</span>
              <span className={`text-xl font-bold font-mono ${gpBezaPercent >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {gpBezaPercent >= 0 ? `+${gpBezaPercent.toFixed(2)}%` : `${gpBezaPercent.toFixed(2)}%`}
              </span>
            </div>

          </div>

          {/* Section: Navigation / Laman Utama Button */}
          <div className="lg:col-span-2 flex justify-end">
            <button
              onClick={onBackToMain}
              className="w-full lg:w-auto bg-[#ffffff] hover:bg-slate-50 text-slate-800 border border-slate-300 transition py-3 px-6 rounded-xl font-black text-xs uppercase tracking-widest text-center shadow-xs flex items-center justify-center gap-2"
              id="gp-btn-home"
            >
              <ArrowLeft size={14} />
              Laman Utama
            </button>
          </div>

        </div>

        {/* Orange horizontal divider accent */}
        <div className="h-1.5 bg-[#ea580c] w-full"></div>
      </div>

      {/* Control panel & School title */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex flex-col gap-1 text-center md:text-left w-full md:w-auto">
          <div className="flex items-center gap-2 justify-center md:justify-start">
            <Building className="text-blue-600 shrink-0" size={18} />
            <input 
              type="text" 
              value={schoolLabel} 
              onChange={e => setSchoolLabel(e.target.value.toUpperCase())}
              className="text-base font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-250 focus:border-blue-500 focus:outline-hidden py-0.5 uppercase tracking-wide min-w-[200px]"
              placeholder="TIADA"
            />
          </div>
          <div className="flex items-center gap-2 justify-center md:justify-start text-xs text-slate-500">
            <span>Kohort Semasa:</span>
            <input 
              type="text" 
              value={formLabel} 
              onChange={e => setFormLabel(e.target.value.toUpperCase())}
              className="font-mono font-bold text-slate-700 bg-transparent border-b border-transparent hover:border-slate-250 focus:border-blue-500 focus:outline-hidden py-0 font-bold uppercase w-28"
              placeholder="TIADA"
            />
          </div>
          
          {/* Metadata badges for JPN, PPD, and Kod Sekolah */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 mt-2 justify-center md:justify-start">
            <div className="flex items-center gap-1.5 text-[11px] bg-indigo-50 border border-indigo-150 rounded px-2 py-0.5 shrink-0" title="Kod Sekolah">
              <span className="text-[9px] text-indigo-400 font-extrabold uppercase">KOD SEKOLAH:</span>
              <input 
                type="text" 
                value={kodSekolah} 
                onChange={e => setKodSekolah(e.target.value.toUpperCase())}
                className="font-mono font-bold text-indigo-700 bg-transparent border-none focus:outline-hidden p-0 uppercase w-20"
                placeholder="TIADA"
              />
            </div>
            <div className="flex items-center gap-1.5 text-[11px] bg-amber-50 border border-amber-150 rounded px-2 py-0.5 shrink-0" title="Pejabat Pendidikan Daerah">
              <span className="text-[9px] text-amber-500 font-extrabold uppercase">PPD:</span>
              <input 
                type="text" 
                value={ppd} 
                onChange={e => setPpd(e.target.value.toUpperCase())}
                className="font-semibold text-amber-800 bg-transparent border-none focus:outline-hidden p-0 uppercase w-36"
                placeholder="TIADA"
              />
            </div>
            <div className="flex items-center gap-1.5 text-[11px] bg-violet-50 border border-violet-150 rounded px-2 py-0.5 shrink-0" title="Jabatan Pendidikan Negeri">
              <span className="text-[9px] text-violet-400 font-extrabold uppercase">JPN:</span>
              <input 
                type="text" 
                value={jpn} 
                onChange={e => setJpn(e.target.value.toUpperCase())}
                className="font-semibold text-violet-800 bg-transparent border-none focus:outline-hidden p-0 uppercase w-60"
                placeholder="TIADA"
              />
            </div>
          </div>
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Class filter */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-250 rounded-lg px-2.5 py-1.5 text-xs text-slate-600 font-bold">
            <Filter size={13} className="text-slate-400" />
            <span className="hidden sm:inline mr-1 text-slate-450 font-medium">Kelas:</span>
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="bg-transparent border-none outline-hidden text-slate-755 font-bold cursor-pointer"
            >
              {classes.map(cl => (
                <option key={cl} value={cl}>
                  {cl === 'Semua' ? 'Semua Kelas' : cl}
                </option>
              ))}
            </select>
          </div>

          {/* Search sub */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 text-slate-450" size={13} />
            <input 
              type="text"
              value={subjectSearch}
              onChange={e => setSubjectSearch(e.target.value)}
              placeholder="Cari subjek..."
              className="pl-8 pr-3 py-1.5 w-40 text-xs rounded-lg border border-slate-250 bg-white placeholder-slate-400 text-slate-700 focus:outline-hidden focus:border-blue-500 font-semibold"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 bg-amber-50/90 border border-amber-200 rounded-lg px-2.5 py-1.5 text-xs text-amber-900 font-bold shadow-3xs" id="exam-phase-filter">
            <Sparkles size={13} className="text-amber-700 shrink-0" />
            <span className="hidden sm:inline mr-1 text-amber-800 font-medium">Fasa:</span>
            <select
              value={selectedExamFilter}
              onChange={e => setSelectedExamFilter(e.target.value as 'all' | 'tov' | 'ppt' | 'ar2' | 'etr')}
              className="bg-transparent border-none outline-hidden text-amber-955 font-extrabold cursor-pointer"
            >
              <option value="all">Semua Peperiksaan</option>
              <option value="tov">TOV (Take-off Value)</option>
              <option value="ppt">Pertengahan Tahun (PPT)</option>
              <option value="ar2">Percubaan SPM</option>
              <option value="etr">Sasaran SPM (ETR)</option>
            </select>
          </div>

          <button 
            onClick={() => setShowUploadPanel(!showUploadPanel)}
            className={`p-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border inline-flex ${
              showUploadPanel 
                ? 'bg-blue-600 text-white border-blue-500 shadow-sm' 
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-850 border-emerald-250 shadow-3xs font-extrabold'
            }`}
            title="Muat Naik Fail CSV Data Murid & Markah"
          >
            <Upload size={14} />
            Muat Naik CSV
          </button>

          <button 
            onClick={() => setShowClearConfirm(true)}
            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-3xs"
            title="Padam Semua Markah & Calon dari Sistem"
          >
            <Trash2 size={14} className="text-rose-600 shrink-0" />
            <span>Kosongkan Data</span>
          </button>

          <button 
            onClick={handlePrint}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-indigo-750 border border-slate-250 rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-3xs"
            title="Sediakan Lembaran Cetak"
          >
            <Printer size={14} />
            <span className="hidden md:inline">Cetak</span>
          </button>
        </div>
      </div>

      {/* Hidden file input for manual select trigger */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept=".csv,.txt" 
        className="hidden" 
      />

      {/* CSV Expandable Workspace Container */}
      <AnimatePresence>
        {showUploadPanel && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden bg-white rounded-xl border border-slate-250 shadow-sm"
          >
            <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="text-emerald-700" size={18} />
                  Sistem Import Data Calon & Pemarkahan Peperiksaan (CSV)
                </h3>
                <p className="text-[11px] text-slate-500 mt-1 max-w-2xl font-medium leading-relaxed">
                  Masukkan data TOV, PPT, dan SASARAN SPM (ETR / Percubaan SPM) secara sekaligus. Sistem akan mengira Gred Purata Mata Pelajaran (GPMP) dan pencapaian sasaran sekolah secara dinamik.
                </p>
              </div>
              <button 
                onClick={() => setShowUploadPanel(false)}
                className="p-1 px-2.5 rounded-lg hover:bg-slate-200 text-slate-600 text-xs font-bold transition flex items-center gap-1"
              >
                <X size={14} /> Tutup
              </button>
            </div>

            <div className="p-6 space-y-6">
              
              {/* If Success Message is shown */}
              {successMessage && (
                <div className="p-4 bg-emerald-50 border border-emerald-250 rounded-xl text-emerald-900 text-xs flex items-start gap-3">
                  <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={16} />
                  <div className="font-semibold leading-relaxed">{successMessage}</div>
                </div>
              )}

              {/* If Error Message is shown */}
              {errorMessage && (
                <div className="p-4 bg-rose-50 border border-rose-250 rounded-xl text-rose-900 text-xs flex items-start gap-3">
                  <AlertCircle className="text-rose-600 shrink-0 mt-0.5" size={16} />
                  <div className="font-semibold leading-relaxed">{errorMessage}</div>
                </div>
              )}

              {/* Step 1: Upload Instructions & Copy-able Templates */}
              {!parsedStats && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Left Column: Dropzone and raw input */}
                  <div className="lg:col-span-7 space-y-4">
                    <div 
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition p-6 text-center select-none ${
                        isDragging 
                          ? 'border-emerald-600 bg-emerald-50/25' 
                          : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50 bg-white'
                      }`}
                    >
                      <div className="p-3 bg-[#e2f0d9]/60 rounded-full text-emerald-800 mb-3 shadow-xs">
                        <Upload size={30} className="text-emerald-600 animate-pulse" />
                      </div>
                      <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        Seret &amp; Lepas Fail CSV Di Sini
                      </span>
                      <span className="text-[11px] text-slate-500 mt-1 font-semibold">
                        atau klik untuk memilih fail daripada pemacu komputer (.csv, .txt)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="h-px bg-slate-200 flex-1"></div>
                      <span className="text-[10px] text-slate-450 uppercase font-black font-mono">ATAU TAMPAL DATA CSV</span>
                      <div className="h-px bg-slate-200 flex-1"></div>
                    </div>

                    {/* Setting for default exam phase when no key is matched: TOV / PPT / ETR */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-3">
                      <div>
                        <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                          <Filter size={13} className="text-emerald-700 shrink-0" />
                          FAVOR FILTER PEPERIKSAAN (HALAAN DATA KEMASUKAN)
                        </h4>
                        <p className="text-[10px] text-slate-500 leading-normal mt-0.5">
                          Tentukan peperiksaan khusus untuk melabelkan dan memasukkan semua markah daripada borang CSV (seperti lembaran SAPS JPN/PPD).
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                        {/* Option Auto */}
                        <button
                          type="button"
                          onClick={() => {
                            setDefaultPhase('auto');
                            if (csvText.trim()) processCSVData(csvText, 'auto');
                          }}
                          className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between gap-1 shadow-3xs ${
                            defaultPhase === 'auto'
                              ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/10'
                              : 'bg-white hover:bg-slate-52 border-slate-250 text-slate-700'
                          }`}
                        >
                          <span className="text-[10px] font-black uppercase tracking-wide block">Autokesan</span>
                          <span className="text-[9px] text-slate-500 font-medium leading-tight">Ikuti nama lajur</span>
                        </button>

                        {/* Option TOV */}
                        <button
                          type="button"
                          onClick={() => {
                            setDefaultPhase('tov');
                            if (csvText.trim()) processCSVData(csvText, 'tov');
                          }}
                          className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between gap-1 shadow-3xs ${
                            defaultPhase === 'tov'
                              ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-500/10'
                              : 'bg-white hover:bg-slate-52 border-slate-250 text-slate-700'
                          }`}
                        >
                          <span className="text-[10px] font-black uppercase tracking-wide block">TOV (Take-off)</span>
                          <span className="text-[9px] text-slate-500 font-medium leading-tight">Nilai mula murid</span>
                        </button>

                        {/* Option PPT */}
                        <button
                          type="button"
                          onClick={() => {
                            setDefaultPhase('ppt');
                            if (csvText.trim()) processCSVData(csvText, 'ppt');
                          }}
                          className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between gap-1 shadow-3xs ${
                            defaultPhase === 'ppt'
                              ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-550/10'
                              : 'bg-white hover:bg-slate-52 border-slate-250 text-slate-700'
                          }`}
                        >
                          <span className="text-[10px] font-black uppercase tracking-wide block">PPT (Tengah Tahun)</span>
                          <span className="text-[9px] text-slate-500 font-medium leading-tight">Peperiksaan tengah</span>
                        </button>

                        {/* Option Percubaan SPM */}
                        <button
                          type="button"
                          onClick={() => {
                            setDefaultPhase('ar2');
                            if (csvText.trim()) processCSVData(csvText, 'ar2');
                          }}
                          className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between gap-1 shadow-3xs ${
                            defaultPhase === 'ar2'
                              ? 'bg-amber-50 border-orange-500 text-orange-950 ring-2 ring-orange-550/10'
                              : 'bg-white hover:bg-slate-52 border-slate-250 text-slate-700'
                          }`}
                        >
                          <span className="text-[10px] font-black uppercase tracking-wide block">Percubaan SPM</span>
                          <span className="text-[9px] text-slate-500 font-medium leading-tight">Peperiksaan percubaan</span>
                        </button>

                        {/* Option ETR */}
                        <button
                          type="button"
                          onClick={() => {
                            setDefaultPhase('etr');
                            if (csvText.trim()) processCSVData(csvText, 'etr');
                          }}
                          className={`p-2.5 rounded-lg border text-left transition flex flex-col justify-between gap-1 shadow-3xs ${
                            defaultPhase === 'etr'
                              ? 'bg-rose-50 border-rose-500 text-rose-900 ring-2 ring-rose-550/10'
                              : 'bg-white hover:bg-slate-52 border-slate-250 text-slate-700'
                          }`}
                        >
                          <span className="text-[10px] font-black uppercase tracking-wide block">Sasaran SPM / ETR</span>
                          <span className="text-[9px] text-slate-500 font-medium leading-tight">Sasaran &amp; Akhir SPM</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <textarea
                        value={csvText}
                        onChange={(e) => {
                          setCsvText(e.target.value);
                          if (e.target.value.trim()) {
                            processCSVData(e.target.value);
                          }
                        }}
                        placeholder='ID_Murid,Nama,Kelas,"Bahasa Melayu (TOV)","Bahasa Melayu (PPT)","Bahasa Melayu (Percubaan SPM)"...'
                        className="w-full h-32 p-3 font-mono text-[10.5px] border border-slate-250 rounded-xl focus:outline-hidden focus:border-blue-500 placeholder-slate-400 resize-none leading-relaxed bg-slate-50/50 text-slate-850"
                      />
                    </div>
                  </div>

                  {/* Right Column: Copyable helpers */}
                  <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 flex flex-col">
                    <div className="flex items-center gap-2">
                      <Sparkles className="text-amber-500 animate-pulse" size={15} />
                      <h4 className="text-xs uppercase font-black text-slate-800 tracking-wider">Format Templat Contoh</h4>
                    </div>

                    {/* Template Tab selections */}
                    <div className="flex gap-1 border-b border-slate-200 self-start w-full">
                      <button
                        onClick={() => setActiveTemplateTab('wide')}
                        className={`pb-2 px-3 text-xs font-extrabold transition-all border-b-2 leading-none uppercase tracking-wide ${
                          activeTemplateTab === 'wide' 
                            ? 'border-emerald-600 text-emerald-700' 
                            : 'border-transparent text-slate-450 hover:text-slate-700'
                        }`}
                      >
                        Format Lebar (Lajur Murid)
                      </button>
                      <button
                        onClick={() => setActiveTemplateTab('long')}
                        className={`pb-2 px-3 text-xs font-extrabold transition-all border-b-2 leading-none uppercase tracking-wide ${
                          activeTemplateTab === 'long' 
                            ? 'border-emerald-600 text-emerald-700' 
                            : 'border-transparent text-slate-450 hover:text-slate-700'
                        }`}
                      >
                        Format Panjang (Satu Skor Sebaris)
                      </button>
                    </div>

                    <div className="flex-1 flex flex-col justify-between">
                      {activeTemplateTab === 'wide' ? (
                        <div className="space-y-2">
                          <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                            Sesuai jika anda mempunyai borang markah kelas. Setiap baris mewakili <strong className="font-bold text-slate-700">seorang murid</strong>, dan markah subjek diasingkan mengikut tiang berkembar TOV, PPT &amp; Percubaan.
                          </p>
                          <div className="relative group/copy mt-1.5 flex-1">
                            <pre className="p-3 bg-slate-900 text-white rounded-lg text-[9px] overflow-x-auto max-h-[140px] font-mono leading-relaxed select-all">
                              {WIDE_TEMPLATE}
                            </pre>
                            <button
                              onClick={() => handleCopyTemplate(WIDE_TEMPLATE, 'wide')}
                              className="absolute top-2 right-2 p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition shadow-xs flex items-center gap-1 text-[9px] font-bold"
                            >
                              {copiedTemplate === 'wide' ? (
                                <>
                                  <Check size={10} className="text-emerald-400 font-black" /> Berjaya Disalin
                                </>
                              ) : (
                                <>
                                  <Copy size={10} /> Salin Templat
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                            Murid berulang setiap kali mereka mempunyai subjek baru. Lajur wajib adalah <strong className="font-bold text-slate-700">Kod_Subjek, Nama_Subjek, TOV, PPT, Percubaan SPM</strong>. Sesuai untuk sistem pangkalan data berpusat.
                          </p>
                          <div className="relative group/copy mt-1.5 flex-1">
                            <pre className="p-3 bg-slate-900 text-white rounded-lg text-[9px] overflow-x-auto max-h-[140px] font-mono leading-relaxed select-all">
                              {LONG_TEMPLATE}
                            </pre>
                            <button
                              onClick={() => handleCopyTemplate(LONG_TEMPLATE, 'long')}
                              className="absolute top-2 right-2 p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition shadow-xs flex items-center gap-1 text-[9px] font-bold"
                            >
                              {copiedTemplate === 'long' ? (
                                <>
                                  <Check size={10} className="text-emerald-400 font-black" /> Berjaya Disalin
                                </>
                              ) : (
                                <>
                                  <Copy size={10} /> Salin Templat
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 flex items-start gap-2 text-[10px] text-amber-900 leading-normal mt-3 font-semibold">
                        <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">
                          Petunjuk SPM: Markah sah mestilah bernilai nombor <strong className="font-bold">0 sehingga 100</strong>. Isikan <strong className="font-bold">TH</strong> atau <strong className="font-bold">th</strong> di dalam kotak skor sekiranya calon tidak hadir peperiksaan.
                        </span>
                      </div>
                    </div>

                  </div>

                </div>
              )}

              {/* Step 2: Statistics reports / review parsed details & controls */}
              {parsedStats && (
                <div className="space-y-6">
                  
                  {/* Reporting panels summary layout */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-center">
                      <span className="text-[10px] uppercase text-slate-400 font-bold block">Calon Dikesan</span>
                      <strong className="text-xl font-black text-slate-850 font-mono block mt-1">{parsedStats.studentsCount}</strong>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-center">
                      <span className="text-[10px] uppercase text-slate-400 font-bold block">Subjek Dikesan</span>
                      <strong className="text-xl font-black text-slate-850 font-mono block mt-1">{parsedStats.subjectsCount}</strong>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-center">
                      <span className="text-[10px] uppercase text-slate-400 font-bold block">Kotak Markah Sedia</span>
                      <strong className="text-xl font-black text-slate-850 font-mono block mt-1">{parsedStats.scoresCount}</strong>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-center">
                      <span className="text-[10px] uppercase text-rose-400 font-bold block">Baris Abai/Ralat</span>
                      <strong className="text-xl font-black text-rose-600 font-mono block mt-1">{parsedStats.invalidRows}</strong>
                    </div>
                  </div> 

                  {/* Dynamic Grade Frequency Distribution Breakdown */}
                  {parsedGradesBreakdown && (
                    <div className="bg-white rounded-xl border border-slate-250 p-4 space-y-3 shadow-3xs" id="parsed-grade-breakdown-section">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                          <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                          <span>TABURAN FREKUENSI GRED KESELURUHAN (DIKESAN DARIPADA CSV)</span>
                        </h4>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-[10.5px] text-emerald-800 border border-emerald-150 font-bold">
                          Rumusan Sedia
                        </span>
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="w-full text-center text-[11px] border-collapse min-w-[700px]">
                          <thead>
                            <tr className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                              <th className="p-2 border-r border-slate-200 text-left uppercase pl-3" style={{ width: '180px' }}>Fasa Peperiksaan</th>
                              {['A+', 'A', 'A-', 'B+', 'B', 'C+', 'C', 'D', 'E', 'G', 'TH'].map(g => (
                                <th key={g} className="p-2 border-r border-slate-200 uppercase">{g}</th>
                              ))}
                              <th className="p-2 font-black uppercase bg-slate-100 text-slate-800">JUMLAH</th>
                            </tr>
                          </thead>
                          <tbody>
                            {/* TOV */}
                            <tr className="border-b border-slate-200 hover:bg-slate-50/50">
                              <td className="p-2 border-r border-slate-200 text-left font-bold text-slate-700 pl-3">TOV (Take-off Value)</td>
                              {['A+', 'A', 'A-', 'B+', 'B', 'C+', 'C', 'D', 'E', 'G', 'TH'].map(g => {
                                const count = parsedGradesBreakdown.tov[g as keyof typeof parsedGradesBreakdown.tov] || 0;
                                return (
                                  <td key={g} className={`p-2 border-r border-slate-200 font-bold font-mono ${count > 0 ? 'text-slate-900 font-extrabold bg-[#e2f0d9]/25' : 'text-slate-300'}`}>
                                    {count}
                                  </td>
                                );
                              })}
                              <td className="p-2 font-black font-mono bg-slate-50 text-slate-800">
                                {Object.values(parsedGradesBreakdown.tov).reduce((a, b) => a + b, 0)}
                              </td>
                            </tr>
                            
                            {/* PPT */}
                            <tr className="border-b border-slate-200 hover:bg-slate-50/50">
                              <td className="p-2 border-r border-slate-200 text-left font-bold text-slate-700 pl-3">PPT (Tengah Tahun)</td>
                              {['A+', 'A', 'A-', 'B+', 'B', 'C+', 'C', 'D', 'E', 'G', 'TH'].map(g => {
                                const count = parsedGradesBreakdown.ppt[g as keyof typeof parsedGradesBreakdown.ppt] || 0;
                                return (
                                  <td key={g} className={`p-2 border-r border-slate-200 font-bold font-mono ${count > 0 ? 'text-slate-900 font-extrabold bg-blue-50/20' : 'text-slate-300'}`}>
                                    {count}
                                  </td>
                                );
                              })}
                              <td className="p-2 font-black font-mono bg-slate-50 text-slate-800">
                                {Object.values(parsedGradesBreakdown.ppt).reduce((a, b) => a + b, 0)}
                              </td>
                            </tr>

                            {/* Percubaan SPM */}
                            <tr className="border-b border-slate-200 hover:bg-slate-50/50">
                              <td className="p-2 border-r border-slate-200 text-left font-bold text-slate-700 pl-3">Percubaan SPM</td>
                              {['A+', 'A', 'A-', 'B+', 'B', 'C+', 'C', 'D', 'E', 'G', 'TH'].map(g => {
                                const count = parsedGradesBreakdown.ar2[g as keyof typeof parsedGradesBreakdown.ar2] || 0;
                                return (
                                  <td key={g} className={`p-2 border-r border-slate-200 font-bold font-mono ${count > 0 ? 'text-slate-900 font-extrabold bg-amber-50/20' : 'text-slate-300'}`}>
                                    {count}
                                  </td>
                                );
                              })}
                              <td className="p-2 font-black font-mono bg-slate-50 text-slate-800">
                                {Object.values(parsedGradesBreakdown.ar2).reduce((a, b) => a + b, 0)}
                              </td>
                            </tr>

                            {/* ETR */}
                            <tr className="hover:bg-slate-50/50">
                              <td className="p-2 border-r border-slate-200 text-left font-bold text-slate-700 pl-3">SASARAN SPM (ETR)</td>
                              {['A+', 'A', 'A-', 'B+', 'B', 'C+', 'C', 'D', 'E', 'G', 'TH'].map(g => {
                                const count = parsedGradesBreakdown.etr[g as keyof typeof parsedGradesBreakdown.etr] || 0;
                                return (
                                  <td key={g} className={`p-2 border-r border-slate-200 font-bold font-mono ${count > 0 ? 'text-slate-900 font-extrabold bg-rose-50/20' : 'text-slate-300'}`}>
                                    {count}
                                  </td>
                                );
                              })}
                              <td className="p-2 font-black font-mono bg-slate-50 text-slate-800">
                                {Object.values(parsedGradesBreakdown.etr).reduce((a, b) => a + b, 0)}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )} 

                  {/* Dynamic Changes Comparison visualizer for TOV and PPT (Interactive list) */}
                  {changesPreview && (
                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-4" id="gp-import-changes-preview">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                          <Users size={15} className="text-indigo-600 shrink-0" />
                          <span>ANALISIS PERBANDINGAN &amp; ALIRAN DRAF DATA CALON ({importMode === 'merge' ? 'GABUNGAN' : 'GANTIAN'})</span>
                        </h4>
                        <span className="text-[9px] text-indigo-750 bg-indigo-50 border border-indigo-150 font-bold px-2 py-0.5 rounded-lg uppercase tracking-wider">
                          DRAF AUTOMATIK
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        
                        {/* 1. Added Students (New Students) */}
                        <div className="bg-white border border-slate-200/80 rounded-lg p-3 flex flex-col space-y-2 h-full">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase text-emerald-600 font-extrabold flex items-center gap-1.5">
                              <PlusCircle size={13} />
                              Murid Baru (Tiada TOV)
                            </span>
                            <span className="text-[11px] font-black bg-emerald-50 text-emerald-800 border border-emerald-150 px-1.5 py-0.2 rounded-md font-mono">
                              +{changesPreview.addedList.length}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 leading-snug">
                            Pelajar baru ditemui dalam fail PPT sedia untuk dimasukkan automatik ke sistem.
                          </span>
                          <div className="max-h-28 overflow-y-auto border border-slate-100 rounded-md p-1.5 bg-slate-50/50 space-y-1 text-[11px]">
                            {changesPreview.addedList.length === 0 ? (
                              <span className="text-slate-400 italic block text-center py-2">Tiada murid baru</span>
                            ) : (
                              changesPreview.addedList.map((st, i) => (
                                <div key={i} className="flex justify-between items-center bg-white border border-slate-150 p-1 rounded-sm shadow-2xs">
                                  <span className="font-semibold text-slate-700 truncate max-w-[120px]">{st.name}</span>
                                  <span className="text-[9px] font-bold bg-slate-100 text-slate-650 px-1 py-0.2 rounded-sm shrink-0 font-mono">{st.clazz}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* 2. Merged Students */}
                        <div className="bg-white border border-slate-200/80 rounded-lg p-3 flex flex-col space-y-2 h-full">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase text-blue-600 font-extrabold flex items-center gap-1.5">
                              <RefreshCw size={12} className="animate-spin" style={{ animationDuration: '6s' }} />
                              Kekal &amp; Digabungkan
                            </span>
                            <span className="text-[11px] font-black bg-blue-50 text-blue-800 border border-blue-150 px-1.5 py-0.2 rounded-md font-mono">
                              {changesPreview.mergedList.length}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 leading-snug">
                            Murid sedia ada yang ditemui dalam kedua-dua rekod. Markah PPT akan digabungkan ke TOV.
                          </span>
                          <div className="max-h-28 overflow-y-auto border border-slate-100 rounded-md p-1.5 bg-slate-50/50 space-y-1 text-[11px]">
                            {changesPreview.mergedList.length === 0 ? (
                              <span className="text-slate-400 italic block text-center py-2">Tiada murid sedia ada</span>
                            ) : (
                              changesPreview.mergedList.map((st, i) => (
                                <div key={i} className="flex justify-between items-center bg-white border border-slate-150 p-1 rounded-sm shadow-2xs">
                                  <span className="font-semibold text-slate-700 truncate max-w-[120px]">{st.name}</span>
                                  <span className="text-[9px] font-bold bg-slate-100 text-slate-650 px-1 py-0.2 rounded-sm shrink-0 font-mono">{st.clazz}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        {/* 3. Removed Students */}
                        <div className="bg-white border border-slate-200/80 rounded-lg p-3 flex flex-col space-y-2 h-full">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase text-rose-600 font-extrabold flex items-center gap-1.5">
                              <Trash2 size={12} />
                              Murid Dipadam (Tiada PPT)
                            </span>
                            <span className="text-[11px] font-black bg-rose-50 text-rose-800 border border-rose-150 px-1.5 py-0.2 rounded-md font-mono">
                              {changesPreview.isPptOrEtrImport && importMode === 'merge' ? `-${changesPreview.removedList.length}` : '0'}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 leading-snug">
                            {changesPreview.isPptOrEtrImport 
                              ? "Murid lama (TOV) yang tidak hadir dalam fail markah PPT terkini. Sistem akan memadamkannya secara bersih."
                              : "Hanya terpakai apabila mengimport data PPT / ETR sedia ada."}
                          </span>
                          <div className="max-h-28 overflow-y-auto border border-slate-100 rounded-md p-1.5 bg-slate-50/50 space-y-1 text-[11px]">
                            {importMode !== 'merge' ? (
                              <span className="text-amber-600 font-medium text-center py-2 block">Dalam mode "Ganti Semua", semua murid lama sedia ada dibuang!</span>
                            ) : !changesPreview.isPptOrEtrImport ? (
                              <span className="text-slate-400 italic block text-center py-2">Bukan fail PPT/ETR (Tiada pemadaman murid)</span>
                            ) : changesPreview.removedList.length === 0 ? (
                              <span className="text-slate-400 italic block text-center py-2 font-medium">Semua murid TOV hadir di PPT</span>
                            ) : (
                              changesPreview.removedList.map((st, i) => (
                                <div key={i} className="flex justify-between items-center bg-rose-50 border border-rose-150 p-1 rounded-sm shadow-2xs">
                                  <span className="font-semibold text-rose-700 truncate max-w-[120px]">{st.name}</span>
                                  <span className="text-[9px] font-bold bg-rose-100 text-rose-650 px-1 py-0.2 rounded-sm shrink-0 font-mono">{st.clazz}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                  {/* Active target fasa feedback information */}
                  <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-800">
                    <div className="flex items-center gap-2">
                      <Sparkles className="text-emerald-600 shrink-0" size={16} />
                      <div>
                        <span className="font-bold block text-slate-850">Fasa Peperiksaan Sasaran Aktif:</span>
                        <span className="text-[10px] text-slate-500 font-medium leading-tight block">Semua markah subjek yang ditemui dalam fail CSV diletakkan ke dalam ruangan peperiksaan sasaran ini</span>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-white font-black uppercase rounded-lg border border-emerald-250 text-emerald-950 tracking-wider text-[10px] font-mono shadow-3xs self-start sm:self-auto shrink-0">
                      {defaultPhase === 'auto' ? '🔍 AUTOKESAN (Nama Lajur)' : 
                       defaultPhase === 'tov' ? '📈 TOV (Nilai Mula)' : 
                       defaultPhase === 'ppt' ? '📊 PPT (Tengah Tahun)' : 
                       '🎯 Percubaan SPM / ETR'}
                    </span>
                  </div>

                  {/* Mode configurations selector */}
                  <div className="p-4 bg-blue-50/50 border border-blue-150 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1 col-span-3">
                      <h4 className="text-xs font-bold text-slate-850 uppercase tracking-wide flex items-center gap-1.5">
                        <Sparkles className="text-indigo-500 animate-pulse" size={14} />
                        PILIH KAEDAH PENYIMPANAN
                      </h4>
                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed max-w-xl">
                        Tentukan sama ada data diimport ini digabungkan secara serasi bersama pangkalan data sedia ada atau mahu menggantikan pangkalan data keseluruhan pelajar untuk gred purata yang berasingan.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setImportMode('merge')}
                        className={`px-4 py-2 border rounded-lg text-xs font-bold transition-all ${
                          importMode === 'merge' 
                            ? 'bg-blue-600 text-white border-blue-550 shadow-xs ring-2 ring-blue-500/10' 
                            : 'bg-white text-slate-650 hover:bg-slate-50 border-slate-250'
                        }`}
                      >
                        Gabung Dengan Data Sedia Ada
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportMode('overwrite')}
                        className={`px-4 py-2 border rounded-lg text-xs font-bold transition-all ${
                          importMode === 'overwrite' 
                            ? 'bg-rose-600 text-white border-rose-550 shadow-xs ring-2 ring-rose-500/10' 
                            : 'bg-white text-slate-650 hover:bg-slate-50 border-slate-250'
                        }`}
                      >
                        Set Semula &amp; Ganti Semua
                      </button>
                    </div>
                  </div>

                  {/* Smart Tips Info Alert to raise awareness of correct import flow */}
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[10.5px] text-amber-900 leading-relaxed font-semibold flex items-start gap-2.5">
                    <Info size={15} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold block text-slate-800 uppercase tracking-wide text-[9px] mb-0.5">Panduan Mengelak Data PPT Bertindih Ganti TOV:</span>
                      Sekiranya anda mengimport fail markah PPT secara berasingan selepas memuat naik fail TOV, sila pastikan:
                      <ul className="list-disc list-inside mt-1 space-y-0.5 pl-1">
                        <li>Gunakan kaedah <strong className="font-bold text-slate-800">"Gabung Dengan Data Sedia Ada"</strong> supaya rekod asal tidak terpadam.</li>
                        <li>Sila pastikan ruangan <strong className="font-bold text-slate-800">Fasa Peperiksaan Sasaran Aktif</strong> memaparkan <strong className="font-bold text-slate-800">PPT (Tengah Tahun)</strong> sebelum menyimpan, agar markah tersebut tidak diletakkan ke dalam ruangan TOV.</li>
                      </ul>
                    </div>
                  </div>

                  {/* Commit action trigger buttons */}
                  <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                    <button
                      onClick={() => {
                        setParsedStats(null);
                        setCsvText('');
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-250 rounded-lg text-xs font-bold text-slate-600 transition"
                    >
                      Batal &amp; Mula Semula
                    </button>
                    <button
                      onClick={commitImport}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-650 rounded-lg text-xs font-black transition flex items-center gap-1.5 shadow-sm"
                    >
                      <CheckCircle2 size={14} />
                      Sahkan &amp; Import Data Calon
                    </button>
                  </div>

                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Excel-Style Grid Sheet */}
      <div className="bg-white rounded-xl border border-slate-250 shadow-sm overflow-hidden overflow-x-auto" id="gp-excel-sheet-container">
        <table className="w-full border-collapse text-left text-xs min-w-[1000px]" id="gp-excel-sheet-table">
          <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
            <tr>
              <th className="p-2 border-r border-slate-250 font-black tracking-wide text-center uppercase" style={{ width: '45px' }}>BIL</th>
              <th className="p-2 border-r border-slate-250 font-black tracking-wide text-left uppercase" style={{ width: '220px' }}>SUBJEK / PEPERIKSAAN</th>
              <th className="p-2 border-r border-slate-250 font-black tracking-wide text-center uppercase bg-blue-50/50" style={{ width: '70px' }}>CALON</th>
              {GRADES.map(g => (
                <th key={g} className="p-2 border-r border-slate-250 font-black tracking-wide text-center uppercase" style={{ width: '45px' }}>{g}</th>
              ))}
              <th className="p-2 border-r border-slate-250 font-black tracking-wide text-center uppercase bg-slate-200/50" style={{ width: '90px' }}>GRED PURATA</th>
              <th className="p-2 border-r border-slate-250 font-black tracking-wide text-center uppercase" style={{ width: '90px' }}>SASARAN GP</th>
              <th className="p-2 font-black tracking-wide text-center uppercase bg-rose-50/50" style={{ width: '80px' }}>TH</th>
            </tr>
          </thead>
          <tbody>
            {/* PART 1: OVERALL COMPREHENSIVE SCHOOL PERFORMANCE (PPT vs ETR vs TOV) */}
            
            {/* Row 1: PPT */}
            {(selectedExamFilter === 'all' || selectedExamFilter === 'ppt') && (
              <tr className="bg-slate-100 border-b border-slate-300">
                <td 
                  rowSpan={selectedExamFilter === 'all' ? 3 : 1} 
                  className="p-3 border-r border-slate-300 font-bold text-center text-slate-600 bg-slate-200/40"
                >
                  #
                </td>
                <td className="p-2.5 border-r border-slate-300 font-black text-slate-800 bg-slate-200/20">
                  PEPERIKSAAN PERTENGAHAN TAHUN T5 (PPT)
                </td>
                <td className="p-2 border-r border-slate-300 text-center font-bold bg-blue-50/70 text-slate-800">
                  {overallPPT.calon}
                </td>
                {GRADES.map(g => (
                  <td key={`overall-ppt-${g}`} className="p-2 border-r border-slate-300 text-center font-bold text-slate-750 bg-slate-50/50">
                    {overallPPT.counts[g] || 0}
                  </td>
                ))}
                <td className={`p-2 border-r border-slate-300 text-center font-black ${getGredPurataColor(overallPPT.gps)}`}>
                  {renderGP(overallPPT.gps)}
                </td>
                <td className="p-2 border-r border-slate-300 text-center font-normal text-slate-400 font-mono">-</td>
                <td className="p-2 text-center font-bold bg-rose-50/70 text-rose-800">
                  {overallPPT.absent}
                </td>
              </tr>
            )}

            {/* Row 2: ETR */}
            {(selectedExamFilter === 'all' || selectedExamFilter === 'etr') && (
              <tr className="bg-slate-100 border-b border-slate-300">
                {selectedExamFilter !== 'all' && (
                  <td className="p-3 border-r border-slate-300 font-bold text-center text-slate-600 bg-slate-200/40">#</td>
                )}
                <td className="p-2.5 border-r border-slate-300 font-black text-emerald-850 bg-emerald-50/25">
                  SASARAN SPM (ETR)
                </td>
                <td className="p-2 border-r border-slate-300 text-center font-bold bg-blue-50/70 text-slate-800">
                  {overallETR_display.calon}
                </td>
                {GRADES.map(g => (
                  <td key={`overall-etr-${g}`} className="p-2 border-r border-slate-300 text-center font-bold text-slate-750 bg-slate-50/50">
                    {overallETR_display.counts[g] || 0}
                  </td>
                ))}
                <td className="p-2 border-r border-slate-300 text-center font-normal text-slate-400 font-mono">-</td>
                <td className={`p-2 border-r border-slate-300 text-center font-black ${getGredPurataColor(overallETR_display.gps)}`}>
                  {renderGP(overallETR_display.gps)}
                </td>
                <td className="p-2 text-center font-bold bg-rose-50/70 text-rose-800">{overallETR_display.absent}</td>
              </tr>
            )}

            {/* Row 3: TOV */}
            {(selectedExamFilter === 'all' || selectedExamFilter === 'tov') && (
              <tr className="bg-slate-100 border-b-2 border-slate-410">
                {selectedExamFilter !== 'all' && (
                  <td className="p-3 border-r border-slate-300 font-bold text-center text-slate-600 bg-slate-200/40">#</td>
                )}
                <td className="p-2.5 border-r border-slate-300 font-black text-slate-700 bg-slate-200/10">
                  TARAF SEDIA ADA (TOV)
                </td>
                <td className="p-2 border-r border-slate-300 text-center font-bold bg-blue-50/70 text-slate-800">
                  {overallTOV.calon}
                </td>
                {GRADES.map(g => (
                  <td key={`overall-tov-${g}`} className="p-2 border-r border-slate-300 text-center font-medium text-slate-600 bg-slate-50/50">
                    {overallTOV.counts[g] || 0}
                  </td>
                ))}
                <td className={`p-2 border-r border-slate-300 text-center font-black ${getGredPurataColor(overallTOV.gps)}`}>
                  {renderGP(overallTOV.gps)}
                </td>
                <td className="p-2 border-r border-slate-300 text-center font-normal text-slate-400 font-mono">-</td>
                <td className="p-2 text-center font-bold bg-rose-50/70 text-rose-800">{overallTOV.absent}</td>
              </tr>
            )}

            {/* SPACER LABEL ROW */}
            <tr className="bg-[#ea580c]/5 border-y border-orange-200">
              <td colSpan={16} className="p-2 px-4 uppercase font-bold text-[#c2410c] text-[10px] tracking-widest text-left select-none">
                PENGAGIHAN BEZA GRED DAN GPMP MENGIKUT MATA PELAJARAN
              </td>
            </tr>

            {/* PART 2: INDIVIDUAL SUBJECT HEADCOUNTS */}
            {sortedSubjects.length === 0 ? (
              <tr>
                <td colSpan={16} className="p-12 text-center text-slate-500 font-semibold bg-slate-50">
                  Tiada subjek sepadan dengan carian anda.
                </td>
              </tr>
            ) : (
              sortedSubjects.map((sub, index) => {
                const subPPT = getSubjectStats(sub.id, 'ppt');
                const subETR = getSubjectStats(sub.id, 'etr');
                const subTOV = getSubjectStats(sub.id, 'tov');

                // Dynamic ETR based on manual edits
                const subETR_display = (() => {
                  const counts = { ...subETR.counts };
                  GRADES.forEach(g => {
                    if (editedEtrCounts[sub.id]?.[g] !== undefined) {
                      const val = editedEtrCounts[sub.id][g];
                      counts[g] = typeof val === 'string' ? (parseInt(val) || 0) : val;
                    }
                  });
                  let totalPresent = 0;
                  let totalPoints = 0;
                  GRADES.forEach(g => {
                    const count = counts[g] || 0;
                    totalPresent += count;
                    totalPoints += count * getGradePoint(g);
                  });
                  const gpmp = totalPresent === 0 ? 0 : parseFloat((totalPoints / totalPresent).toFixed(2));
                  return {
                    counts,
                    calon: totalPresent + (subETR.absent || 0),
                    gpmp,
                    absent: subETR.absent
                  };
                })();

                return (
                  <React.Fragment key={sub.id}>
                    {/* Row 1: Subject name with PPT */}
                    {(selectedExamFilter === 'all' || selectedExamFilter === 'ppt') && (
                      <tr className="border-b border-slate-200">
                        <td 
                          rowSpan={selectedExamFilter === 'all' ? 3 : 1} 
                          className="p-3 border-r border-slate-250 font-mono font-bold text-center text-slate-700 bg-slate-50/80"
                        >
                          {index + 1}
                        </td>
                        <td className="p-2.5 border-r border-slate-250 text-left font-bold text-slate-800 bg-slate-50/40">
                          <div className="flex flex-col">
                            <span className="font-extrabold text-blue-700 font-sans tracking-tight flex items-center flex-wrap gap-1.5">
                              {sub.name}
                              {getExcludedSubjectIds().includes(sub.id) && (
                                <span className="inline-block px-1.5 py-0.5 bg-red-50 text-red-600 text-[8px] rounded uppercase font-black tracking-wide border border-red-200">
                                  Dikecualikan GPS
                                </span>
                              )}
                            </span>
                            <span className="text-[9px] font-mono font-bold text-slate-450 uppercase">{sub.code} • PPT T5</span>
                          </div>
                        </td>
                        <td className="p-2 border-r border-slate-250 text-center font-bold bg-blue-50/25 text-slate-700">
                          {subPPT.calon}
                        </td>
                        {GRADES.map(g => (
                          <td key={`${sub.id}-ppt-${g}`} className="p-2 border-r border-slate-250 text-center font-medium text-slate-700 bg-white">
                            {subPPT.counts[g] || 0}
                          </td>
                        ))}
                        <td className={`p-2 border-r border-slate-250 text-center font-black ${getGredPurataColor(subPPT.gpmp)}`}>
                          {renderGP(subPPT.gpmp)}
                        </td>
                        <td className="p-2 border-r border-slate-250 text-center text-slate-400 font-mono">-</td>
                        <td className="p-2 text-center font-bold text-rose-700 bg-rose-50/20">
                          {subPPT.absent}
                        </td>
                      </tr>
                    )}

                    {/* Row 2: ETR for Subject */}
                    {(selectedExamFilter === 'all' || selectedExamFilter === 'etr') && (
                      <tr className="border-b border-slate-200 bg-emerald-50/10">
                        {selectedExamFilter !== 'all' && (
                          <td className="p-3 border-r border-slate-250 font-mono font-bold text-center text-slate-700 bg-slate-50/80">
                            {index + 1}
                          </td>
                        )}
                        <td className="p-2.5 border-r border-slate-250 text-left font-bold text-slate-850">
                          {selectedExamFilter === 'all' ? (
                            <div className="flex items-center justify-between gap-1 w-full">
                              <span className="text-[10px] font-bold text-emerald-800">↪ SASARAN SPM (ETR)</span>
                              <button
                                onClick={() => handleGenerateEtr(sub.id)}
                                className="flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-black tracking-wider uppercase text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-xs active:scale-95 transition"
                                title="Jana Sasaran ETR berdasarkan TOV & Kuantiti Gred di atas"
                              >
                                <Sparkles size={8} className="animate-pulse" />
                                Jana
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-2 w-full">
                              <div className="flex flex-col">
                                <span className="font-extrabold text-emerald-700 font-sans tracking-tight">{sub.name}</span>
                                <span className="text-[9px] font-mono font-bold text-slate-450 uppercase">{sub.code} • SASARAN SPM (ETR)</span>
                              </div>
                              <button
                                onClick={() => handleGenerateEtr(sub.id)}
                                className="flex items-center gap-1 px-2 py-0.5 text-[9px] font-black tracking-wider uppercase text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-xs active:scale-95 transition whitespace-nowrap lg:mr-2"
                                title="Jana Sasaran ETR berdasarkan TOV & Kuantiti Gred di atas"
                              >
                                <Sparkles size={8} className="animate-pulse" />
                                Jana ETR
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="p-2 border-r border-slate-250 text-center font-bold bg-blue-50/25 text-slate-700">
                          {subETR_display.calon}
                        </td>
                        {GRADES.map(g => {
                          const rawVal = editedEtrCounts[sub.id]?.[g] !== undefined 
                            ? editedEtrCounts[sub.id][g] 
                            : (subETR.counts[g] || 0);
                          return (
                            <td key={`${sub.id}-etr-${g}`} className="p-2 border-r border-slate-250 text-center font-bold text-emerald-800 bg-emerald-50/5">
                              <input
                                type="number"
                                min={0}
                                value={rawVal}
                                onChange={e => {
                                  const valStr = e.target.value;
                                  if (valStr === '') {
                                    handleUpdateEtrCount(sub.id, g, '');
                                  } else {
                                    const val = Math.max(0, parseInt(valStr) || 0);
                                    handleUpdateEtrCount(sub.id, g, val);
                                  }
                                }}
                                className="w-10 text-center font-bold text-emerald-955 bg-transparent border-b border-dashed border-emerald-300 focus:border-emerald-600 focus:bg-white focus:outline-hidden py-0.5 rounded transition"
                              />
                            </td>
                          );
                        })}
                        <td className="p-2 border-r border-slate-250 text-center text-slate-400 font-mono">-</td>
                        <td className={`p-2 border-r border-[#2563eb]/20 text-center font-black ${getGredPurataColor(subETR_display.gpmp)}`}>
                          {renderGP(subETR_display.gpmp)}
                        </td>
                        <td className="p-2 text-center font-bold text-rose-705 bg-rose-50/10">{subETR_display.absent}</td>
                      </tr>
                    )}

                    {/* Row 3: TOV for Subject */}
                    {(selectedExamFilter === 'all' || selectedExamFilter === 'tov') && (
                      <tr className="border-b-2 border-slate-300 bg-slate-50/40">
                        {selectedExamFilter !== 'all' && (
                          <td className="p-3 border-r border-slate-250 font-mono font-bold text-center text-slate-700 bg-slate-50/80">
                            {index + 1}
                          </td>
                        )}
                        <td className="p-2.5 border-r border-slate-250 text-left font-bold text-slate-750">
                          {selectedExamFilter === 'all' ? (
                            <span className="text-[10px] font-semibold text-slate-550">↪ TARAF SEDIA ADA (TOV)</span>
                          ) : (
                            <div className="flex flex-col">
                              <span className="font-extrabold text-slate-700 font-sans tracking-tight">{sub.name}</span>
                              <span className="text-[9px] font-mono font-bold text-slate-450 uppercase">{sub.code} • TARAF SEDIA ADA (TOV)</span>
                            </div>
                          )}
                        </td>
                        <td className="p-2 border-r border-slate-250 text-center font-bold bg-blue-50/25 text-slate-700">
                          {subTOV.calon}
                        </td>
                        {GRADES.map(g => (
                          <td key={`${sub.id}-tov-${g}`} className="p-2 border-r border-slate-250 text-center text-slate-500 bg-slate-50/20">
                            {subTOV.counts[g] || 0}
                          </td>
                        ))}
                        <td className={`p-2 border-r border-slate-250 text-center font-bold ${getGredPurataColor(subTOV.gpmp)}`}>
                          {renderGP(subTOV.gpmp)}
                        </td>
                        <td className="p-2 border-r border-slate-250 text-center text-slate-400 font-mono">-</td>
                        <td className="p-2 text-center font-medium text-slate-400 bg-rose-50/5">{subTOV.absent}</td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Helpful Legend Notes */}
      <div className="bg-[#f8fafc] p-4 rounded-xl border border-slate-250 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-600 font-medium">
        <div className="space-y-1 text-center md:text-left">
          <span className="font-extrabold text-slate-800">Nota Formula Gred Purata Mata Pelajaran (GPMP/GPS):</span>
          <p className="text-[11px] leading-relaxed text-slate-500">
            GPMP dihitung dari jumlah wajaran mata pelajaran: <strong className="font-bold">A+=0, A=1, A-=2, B+=3, B=4, C+=5, C=6, D=7, E=8, G=9</strong> dibahagi bilangan calon hadir. Nilai yang lebih rendah menunjukkan keputusan yang lebih cemerlang.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap justify-center font-bold text-[10px]">
          <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-emerald-500 border border-emerald-600 block"></span> Cemerlang (≤3.00)</div>
          <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-amber-400 border border-amber-500 block"></span> Kepujian (≤5.00)</div>
          <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-orange-500 border border-orange-600 block"></span> Memuaskan (≤6.50)</div>
          <div className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 rounded bg-rose-600 border border-rose-700 block"></span> Kritikal (&gt;6.50)</div>
        </div>
      </div>

      {/* Custom Confirmation Modal for Deleting/Clearing All Data */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-255 rounded-2xl max-w-md w-full shadow-2xl p-6 relative overflow-hidden"
            >
              <div className="p-3 bg-rose-100 text-rose-750 inline-flex rounded-xl mb-4">
                <AlertCircle size={24} className="text-rose-600" />
              </div>
              <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                Padam Semua Murid &amp; Markah?
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                <span className="font-bold text-rose-600 block mb-1">PERINGATAN KRITIKAL:</span>
                Tindakan ini akan memadam seluruh rekod murid dan semua markah peperiksaan dalam sistem secara kekal daripada storan pelayar anda. Anda akan mendapat lembaran database kosong.
              </p>
              
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 p-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleClearDatabaseData}
                  className="flex-1 p-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-xs uppercase tracking-wider transition shadow-sm"
                >
                  Sahkan Padam
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Target Students Modal after ETR Generation */}
      <AnimatePresence>
        {generationResult && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full shadow-2xl p-6 relative overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="flex justify-between items-start border-b border-slate-100 pb-2 mb-4 shrink-0">
                <div className="pr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="p-1 px-2.5 bg-emerald-100 text-emerald-850 font-black rounded-lg text-[9px] tracking-wide uppercase">MODUL JANAAN SASARAN ETR</span>
                  </div>
                  <h3 className="text-base font-black text-slate-800">
                    Senarai Murid Sasaran - {generationResult.subject.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    Sasaran ETR telah dijana berdasarkan wajaran TOV (tambah +10 markah, &lt; 30 auto-naik ke 40) untuk dipadankan mengikut kuota gred pilihan anda di atas.
                  </p>
                </div>
                <button
                  onClick={() => setGenerationResult(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Student Cards Grid/Table (Scrollable) */}
              <div className="overflow-y-auto pr-1 flex-1 min-h-[300px] border border-slate-200 rounded-xl bg-slate-50/40 p-2">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 font-extrabold uppercase tracking-wider text-[9px] bg-slate-100">
                      <th className="py-2 px-3">BIL</th>
                      <th className="py-2 px-3">NAMA MURID</th>
                      <th className="py-2 px-3 text-center">TOV SCORE (GRED)</th>
                      <th className="py-2 px-3 text-center bg-emerald-50 text-emerald-950">ETR SASARAN (GRED)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {generationResult.students.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-slate-500 font-semibold bg-white rounded-lg">
                          Tiada murid yang terdaftar mengambil subjek ini. Sila daftar sekurang-kurangnya 1 murid di Database.
                        </td>
                      </tr>
                    ) : (
                      generationResult.students.map((stud, idx) => {
                        const tovGrade = calculateGrade(stud.tov);
                        const etrGrade = calculateGrade(stud.newEtr);
                        return (
                          <tr key={stud.id} className="border-b border-slate-100 bg-white hover:bg-emerald-50/10 transition">
                            <td className="py-2 px-3 font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-2 px-3 font-extrabold text-slate-800 uppercase">{stud.name}</td>
                            <td className="py-2 px-3 text-center font-bold text-slate-600">
                              {stud.tov} ({tovGrade})
                            </td>
                            <td className="py-2 px-3 text-center font-black bg-emerald-50/40 text-emerald-850">
                              {stud.newEtr} ({etrGrade})
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Actions Footer */}
              <div className="mt-4 border-t border-slate-100 pt-3 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setGenerationResult(null)}
                  className="flex-1 p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-600 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={generationResult.students.length === 0}
                  onClick={handleApplyGeneration}
                  className="flex-1 p-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-wider transition shadow-md flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 size={13} />
                  Simpan Ke Database
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
