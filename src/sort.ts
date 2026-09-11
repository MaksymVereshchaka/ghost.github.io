import type { ClassRecord, Student } from './types';

interface ParsedClassName {
  num: number;
  letter: string;
}

export function parseClassName(name: string): ParsedClassName | null {
  const m = name.trim().match(/^(\d+)\s*-?\s*([A-Za-zА-Яа-яҐґЄєІіЇїʼ']?)/);
  if (m) {
    return { num: parseInt(m[1], 10), letter: (m[2] || '').toLowerCase() };
  }
  return null;
}

export function compareClasses(a: ClassRecord, b: ClassRecord): number {
  const pa = parseClassName(a.name);
  const pb = parseClassName(b.name);
  if (pa && pb) {
    if (pa.num !== pb.num) return pa.num - pb.num;
    return pa.letter.localeCompare(pb.letter, 'uk');
  }
  if (pa && !pb) return -1;
  if (!pa && pb) return 1;
  return a.name.localeCompare(b.name, 'uk');
}

export function sortedClasses(classes: ClassRecord[]): ClassRecord[] {
  return [...classes].sort(compareClasses);
}

export function sortedStudents(cls: ClassRecord): Student[] {
  return [...cls.students].sort((a, b) => a.name.localeCompare(b.name, 'uk'));
}

export function normName(s: string): string {
  return s.trim().toLowerCase();
}
