export interface Student {
  id: string;
  name: string;
}

export interface ClassRecord {
  id: string;
  name: string;
  students: Student[];
}

export interface SessionRef {
  date: string;    // YYYY-MM-DD
  lesson: number;
}

/** studentId -> present/verified */
export type MarkMap = Record<string, boolean>;
