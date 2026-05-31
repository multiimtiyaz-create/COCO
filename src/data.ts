import { Subject, Student } from './types';

export const INITIAL_SUBJECTS: Subject[] = [
  { id: '1103', name: 'Bahasa Melayu', code: '1103', category: 'Teras' },
  { id: '1249', name: 'Sejarah', code: '1249', category: 'Teras' },
  { id: '1119', name: 'Bahasa Inggeris', code: '1119', category: 'Teras' },
  { id: '1449', name: 'Mathematics', code: '1449', category: 'Teras' },
  { id: '1511', name: 'Science', code: '1511', category: 'Teras' },
  { id: '1223', name: 'Pendidikan Islam', code: '1223', category: 'Teras' },
  { id: '4531', name: 'Physics', code: '4531', category: 'Elektif' },
  { id: '4541', name: 'Chemistry', code: '4541', category: 'Elektif' },
  { id: '4551', name: 'Biology', code: '4551', category: 'Elektif' },
  { id: '3472', name: 'Additional Mathematics', code: '3472', category: 'Elektif' },
  { id: '3756', name: 'Prinsip Perakaunan', code: '3756', category: 'Elektif' },
  { id: '7401', name: 'Seni Reka Tanda', code: '7401', category: 'Vokasional' }
];

export const INITIAL_STUDENTS: Student[] = [
  {
    id: '020309050419',
    name: 'MOHAMAD ARFA BIN HAIRI',
    clazz: '4 UKM',
    scores: [
      { subjectId: '1103', tov: 71, ppt: 75, etr: 85 }, // BM
      { subjectId: '1249', tov: 65, ppt: 71, etr: 80 }, // SEJ
      { subjectId: '1119', tov: 60, ppt: 65, etr: 75 }, // BI
      { subjectId: '1449', tov: 70, ppt: 72, etr: 85 }, // M3
      { subjectId: '1511', tov: 74, ppt: 78, etr: 88 }, // SN
      { subjectId: '1223', tov: 80, ppt: 82, etr: 90 }, // PI
      { subjectId: '7401', tov: 71, ppt: 76, etr: 88 }  // SRT
    ]
  },
  {
    id: '020118050512',
    name: 'NAJUWAH SHAHFIKAH BT. SHAHRUL RIZAL',
    clazz: '4 UKM',
    scores: [
      { subjectId: '1103', tov: 57, ppt: 60, etr: 72 },
      { subjectId: '1249', tov: 52, ppt: 55, etr: 68 },
      { subjectId: '1119', tov: 50, ppt: 58, etr: 70 },
      { subjectId: '1449', tov: 44, ppt: 48, etr: 60 },
      { subjectId: '1511', tov: 58, ppt: 62, etr: 74 },
      { subjectId: '1223', tov: 62, ppt: 67, etr: 78 },
      { subjectId: '7401', tov: 65, ppt: 70, etr: 82 }
    ]
  },
  {
    id: '020216050065',
    name: 'MUHAMMAD HAFIZULLAH B AIDILFITRI ZA',
    clazz: '4 UKM',
    scores: [
      { subjectId: '1103', tov: 50, ppt: 52, etr: 70 },
      { subjectId: '1249', tov: 42, ppt: 48, etr: 65 },
      { subjectId: '1119', tov: 48, ppt: 50, etr: 65 },
      { subjectId: '1449', tov: 38, ppt: 42, etr: 58 },
      { subjectId: '1223', tov: 55, ppt: 60, etr: 75 },
      { subjectId: '4551', tov: 40, ppt: 45, etr: 60 } // BIO
    ]
  },
  {
    id: '020129050083',
    name: 'AHMAD LUQMAN NURHAKIM B. NORFAIZAL',
    clazz: '4 UKM',
    scores: [
      { subjectId: '1103', tov: 50, ppt: 53, etr: 65 },
      { subjectId: '1249', tov: 48, ppt: 50, etr: 62 },
      { subjectId: '1119', tov: 45, ppt: 46, etr: 60 },
      { subjectId: '1449', tov: 35, ppt: 38, etr: 55 },
      { subjectId: '1223', tov: 50, ppt: 55, etr: 70 }
    ]
  },
  {
    id: '020608050128',
    name: 'TOH YAN TONG',
    clazz: '4 UKM',
    scores: [
      { subjectId: '1103', tov: 46, ppt: 49, etr: 65 },
      { subjectId: '1249', tov: 40, ppt: 43, etr: 60 },
      { subjectId: '1119', tov: 65, ppt: 68, etr: 80 },
      { subjectId: '1449', tov: 56, ppt: 60, etr: 75 },
      { subjectId: '1511', tov: 48, ppt: 52, etr: 68 }
    ]
  },
  {
    id: '020331050263',
    name: 'LOKMAN NUL HAKIM BIN SERI BANUN',
    clazz: '4 UM',
    scores: [
      { subjectId: '1103', tov: 44, ppt: 47, etr: 60 },
      { subjectId: '1249', tov: 35, ppt: 42, etr: 58 },
      { subjectId: '1119', tov: 38, ppt: 40, etr: 55 },
      { subjectId: '1449', tov: 30, ppt: 35, etr: 50 },
      { subjectId: '1223', tov: 45, ppt: 50, etr: 65 }
    ]
  },
  {
    id: '020130050048',
    name: 'KHAIRUNNISA BINTI AZEMAN',
    clazz: '4 UM',
    scores: [
      { subjectId: '1103', tov: 43, ppt: 46, etr: 60 },
      { subjectId: '1249', tov: 38, ppt: 41, etr: 55 },
      { subjectId: '1119', tov: 42, ppt: 45, etr: 60 },
      { subjectId: '1511', tov: 45, ppt: 49, etr: 65 },
      { subjectId: '1223', tov: 52, ppt: 56, etr: 72 }
    ]
  },
  {
    id: '020517050106',
    name: 'NUR SYAFIQAH BT. ABDUL RAHIM',
    clazz: '4 UM',
    scores: [
      { subjectId: '1103', tov: 43, ppt: 45, etr: 58 },
      { subjectId: '1249', tov: 32, ppt: 37, etr: 50 },
      { subjectId: '1119', tov: 35, ppt: 39, etr: 52 },
      { subjectId: '1511', tov: 40, ppt: 44, etr: 58 },
      { subjectId: '1223', tov: 48, ppt: 52, etr: 65 }
    ]
  },
  {
    id: '020806050110',
    name: 'SHARRENI A/P MANI MARAN',
    clazz: '4 UM',
    scores: [
      { subjectId: '1103', tov: 42, ppt: 45, etr: 60 },
      { subjectId: '1249', tov: 35, ppt: 38, etr: 52 },
      { subjectId: '1119', tov: 48, ppt: 52, etr: 65 },
      { subjectId: '1449', tov: 30, ppt: 32, etr: 50 },
      { subjectId: '1511', tov: 41, ppt: 44, etr: 58 }
    ]
  },
  {
    id: '020605050309',
    name: 'MUHAMMAD SAFUAN BIN ROSLAN',
    clazz: '4 USM',
    scores: [
      { subjectId: '1103', tov: 42, ppt: 44, etr: 58 },
      { subjectId: '1249', tov: 30, ppt: 32, etr: 50 },
      { subjectId: '1119', tov: 35, ppt: 38, etr: 50 },
      { subjectId: '1449', tov: 28, ppt: 30, etr: 45 },
      { subjectId: '1223', tov: 44, ppt: 48, etr: 60 }
    ]
  },
  {
    id: '021119050113',
    name: 'MUHAMMAD AFIQ BIN MOHD SALLEH',
    clazz: '4 USM',
    scores: [
      { subjectId: '1103', tov: 42, ppt: 43, etr: 55 },
      { subjectId: '1249', tov: 28, ppt: 30, etr: 45 },
      { subjectId: '1119', tov: 30, ppt: 32, etr: 45 },
      { subjectId: '3756', tov: 32, ppt: 35, etr: 50 } // PA
    ]
  },
  {
    id: '020828050453',
    name: 'SHERAN RAJA PRASAN A/L BALAN',
    clazz: '4 USM',
    scores: [
      { subjectId: '1103', tov: 40, ppt: 42, etr: 52 },
      { subjectId: '1249', tov: 25, ppt: 28, etr: 45 },
      { subjectId: '1119', tov: 32, ppt: 34, etr: 48 },
      { subjectId: '1449', tov: 20, ppt: 24, etr: 40 }
    ]
  },
  {
    id: '010610050013',
    name: 'KELVIN TEONG CHANG HONG',
    clazz: '4 USM',
    scores: [
      { subjectId: '1103', tov: 38, ppt: 40, etr: 50 },
      { subjectId: '1249', tov: 22, ppt: 25, etr: 40 },
      { subjectId: '1119', tov: 28, ppt: 30, etr: 45 },
      { subjectId: '1449', tov: 45, ppt: 48, etr: 60 }
    ]
  },
  {
    id: '020521050328',
    name: 'NOR AIN SYAFIQAH BT. NOR AZNAM',
    clazz: '4 USM',
    scores: [
      { subjectId: '1103', tov: 31, ppt: 35, etr: 50 },
      { subjectId: '1249', tov: 18, ppt: 22, etr: 40 },
      { subjectId: '1119', tov: 25, ppt: 28, etr: 42 },
      { subjectId: '1511', tov: 30, ppt: 33, etr: 45 }
    ]
  },
  {
    id: '020702050319',
    name: 'MUHAMMAD SHARUL HAIKAL BIN RAZALI',
    clazz: '4 USM',
    scores: [
      { subjectId: '1103', tov: -1, ppt: -1, etr: 40 }, // TH
      { subjectId: '1249', tov: -1, ppt: -1, etr: 40 }
    ]
  }
];

export const AVAILABLE_CLASSES = ['Semua Kelas', '4 UKM', '4 UM', '4 USM'];
export const GRADE_THRESHOLDS = [
  { min: 90, max: 100, grade: 'A+' },
  { min: 80, max: 89, grade: 'A' },
  { min: 70, max: 79, grade: 'A-' },
  { min: 65, max: 69, grade: 'B+' },
  { min: 60, max: 64, grade: 'B' },
  { min: 55, max: 59, grade: 'C+' },
  { min: 50, max: 54, grade: 'C' },
  { min: 45, max: 49, grade: 'D' },
  { min: 40, max: 44, grade: 'E' },
  { min: 0, max: 39, grade: 'G' }
];
