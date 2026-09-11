import type { ClassRecord, MarkMap, SessionRef } from './types';

const LS_CLASSES = 'att_classes_v2';

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function loadClasses(): ClassRecord[] {
  return JSON.parse(localStorage.getItem(LS_CLASSES) || '[]') as ClassRecord[];
}

export function saveClasses(classes: ClassRecord[]): void {
  localStorage.setItem(LS_CLASSES, JSON.stringify(classes));
}

function sessKey(classId: string, date: string, lesson: number): string {
  return `${classId}_${date}_${lesson}`;
}
function attKey(classId: string, date: string, lesson: number): string {
  return `att_${sessKey(classId, date, lesson)}`;
}
function shelterKey(classId: string, date: string, lesson: number): string {
  return `shelter_${sessKey(classId, date, lesson)}`;
}
function returnKey(classId: string, date: string, lesson: number): string {
  return `return_${sessKey(classId, date, lesson)}`;
}
function pickupKey(classId: string, date: string, lesson: number): string {
  return `pickup_${sessKey(classId, date, lesson)}`;
}
function alarmFlagKey(classId: string, date: string, lesson: number): string {
  return `alarmflag_${sessKey(classId, date, lesson)}`;
}
function sessionsRegKey(classId: string): string {
  return `sessions_${classId}`;
}

export function getAttendance(classId: string, date: string, lesson: number): MarkMap {
  return JSON.parse(localStorage.getItem(attKey(classId, date, lesson)) || '{}') as MarkMap;
}
export function saveAttendance(classId: string, date: string, lesson: number, data: MarkMap): void {
  localStorage.setItem(attKey(classId, date, lesson), JSON.stringify(data));
  registerSession(classId, date, lesson);
}

export function getShelter(classId: string, date: string, lesson: number): MarkMap {
  return JSON.parse(localStorage.getItem(shelterKey(classId, date, lesson)) || '{}') as MarkMap;
}
export function saveShelter(classId: string, date: string, lesson: number, data: MarkMap): void {
  localStorage.setItem(shelterKey(classId, date, lesson), JSON.stringify(data));
}

export function getReturnCheck(classId: string, date: string, lesson: number): MarkMap {
  return JSON.parse(localStorage.getItem(returnKey(classId, date, lesson)) || '{}') as MarkMap;
}
export function saveReturnCheck(classId: string, date: string, lesson: number, data: MarkMap): void {
  localStorage.setItem(returnKey(classId, date, lesson), JSON.stringify(data));
}

/**
 * Діти, яких протягом ЦЬОГО уроку забрали батьки під розписку (під час тривоги чи опісля).
 * Зберігається окремо від укриття/повернення і НЕ скидається новою тривогою в межах того самого уроку —
 * дитина, яку вже забрали, не з'явиться в жодній наступній тривозі цього уроку.
 */
export function getPickedUp(classId: string, date: string, lesson: number): MarkMap {
  return JSON.parse(localStorage.getItem(pickupKey(classId, date, lesson)) || '{}') as MarkMap;
}
export function savePickedUp(classId: string, date: string, lesson: number, data: MarkMap): void {
  localStorage.setItem(pickupKey(classId, date, lesson), JSON.stringify(data));
}

export function isAlarmActive(classId: string, date: string, lesson: number): boolean {
  return localStorage.getItem(alarmFlagKey(classId, date, lesson)) === '1';
}
export function setAlarmActive(classId: string, date: string, lesson: number, active: boolean): void {
  if (active) {
    localStorage.setItem(alarmFlagKey(classId, date, lesson), '1');
  } else {
    localStorage.removeItem(alarmFlagKey(classId, date, lesson));
  }
}

export function getSessions(classId: string): SessionRef[] {
  return JSON.parse(localStorage.getItem(sessionsRegKey(classId)) || '[]') as SessionRef[];
}
export function registerSession(classId: string, date: string, lesson: number): void {
  const list = getSessions(classId);
  const exists = list.some((s) => s.date === date && s.lesson === lesson);
  if (!exists) {
    list.push({ date, lesson });
    list.sort((a, b) => (a.date === b.date ? b.lesson - a.lesson : a.date < b.date ? 1 : -1));
    localStorage.setItem(sessionsRegKey(classId), JSON.stringify(list));
  }
}
export function removeSessionRegistryEntry(classId: string, date: string, lesson: number): void {
  const remaining = getSessions(classId).filter((s) => !(s.date === date && s.lesson === lesson));
  localStorage.setItem(sessionsRegKey(classId), JSON.stringify(remaining));
}

/** Видаляє всі відмітки (відвідуваність, укриття, повернення, "забрали батьки", тривогу) для однієї сесії. */
export function purgeSessionData(classId: string, date: string, lesson: number): void {
  localStorage.removeItem(attKey(classId, date, lesson));
  localStorage.removeItem(shelterKey(classId, date, lesson));
  localStorage.removeItem(returnKey(classId, date, lesson));
  localStorage.removeItem(pickupKey(classId, date, lesson));
  localStorage.removeItem(alarmFlagKey(classId, date, lesson));
}

/** Видаляє клас цілком: усі його сесії та реєстр сесій. */
export function purgeClassData(classId: string): void {
  const sessions = getSessions(classId);
  sessions.forEach((s) => purgeSessionData(classId, s.date, s.lesson));
  localStorage.removeItem(sessionsRegKey(classId));
}

/** Прибирає відмітки конкретної дитини з усіх сесій класу (виклик перед фактичним видаленням учня). */
export function purgeStudentMarks(classId: string, studentId: string): void {
  const sessions = getSessions(classId);
  sessions.forEach((s) => {
    const att = getAttendance(classId, s.date, s.lesson);
    if (studentId in att) {
      delete att[studentId];
      localStorage.setItem(attKey(classId, s.date, s.lesson), JSON.stringify(att));
    }
    const shelter = getShelter(classId, s.date, s.lesson);
    if (studentId in shelter) {
      delete shelter[studentId];
      localStorage.setItem(shelterKey(classId, s.date, s.lesson), JSON.stringify(shelter));
    }
    const ret = getReturnCheck(classId, s.date, s.lesson);
    if (studentId in ret) {
      delete ret[studentId];
      localStorage.setItem(returnKey(classId, s.date, s.lesson), JSON.stringify(ret));
    }
    const pu = getPickedUp(classId, s.date, s.lesson);
    if (studentId in pu) {
      delete pu[studentId];
      localStorage.setItem(pickupKey(classId, s.date, s.lesson), JSON.stringify(pu));
    }
  });
}

/**
 * Переносить усі дані сесії (відвідуваність, укриття, прапорець тривоги, запис у реєстрі)
 * зі старих дати/номера на нові — використовується при редагуванні вже створеного уроку.
 */
export function moveSessionData(
  classId: string,
  oldDate: string,
  oldLesson: number,
  newDate: string,
  newLesson: number,
): void {
  if (oldDate === newDate && oldLesson === newLesson) return;

  const att = getAttendance(classId, oldDate, oldLesson);
  const shelter = getShelter(classId, oldDate, oldLesson);
  const ret = getReturnCheck(classId, oldDate, oldLesson);
  const pu = getPickedUp(classId, oldDate, oldLesson);
  const alarmWasActive = isAlarmActive(classId, oldDate, oldLesson);

  localStorage.setItem(attKey(classId, newDate, newLesson), JSON.stringify(att));
  localStorage.setItem(shelterKey(classId, newDate, newLesson), JSON.stringify(shelter));
  localStorage.setItem(returnKey(classId, newDate, newLesson), JSON.stringify(ret));
  localStorage.setItem(pickupKey(classId, newDate, newLesson), JSON.stringify(pu));
  setAlarmActive(classId, newDate, newLesson, alarmWasActive);

  purgeSessionData(classId, oldDate, oldLesson);
  removeSessionRegistryEntry(classId, oldDate, oldLesson);
  registerSession(classId, newDate, newLesson);
}

/* ---------- резервна копія (експорт/імпорт усіх даних) ---------- */
interface BackupFile {
  app: 'perekluchka';
  version: 1;
  exportedAt: string;
  data: Record<string, string>;
}

/** Забирає геть усі ключі застосунку з localStorage і повертає їх як JSON-текст файлу. */
export function exportAllData(): string {
  const data: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key === null) continue;
    data[key] = localStorage.getItem(key) ?? '';
  }
  const backup: BackupFile = {
    app: 'perekluchka',
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
  return JSON.stringify(backup, null, 2);
}

/** Повністю замінює поточні дані вмістом резервної копії. Кидає помилку, якщо файл не схожий на нашу копію. */
export function importAllData(jsonText: string): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error('Файл пошкоджений або це не JSON.');
  }
  const backup = parsed as Partial<BackupFile>;
  if (!backup || backup.app !== 'perekluchka' || typeof backup.data !== 'object' || backup.data === null) {
    throw new Error('Це не файл резервної копії «Перекличка».');
  }
  localStorage.clear();
  Object.entries(backup.data).forEach(([key, value]) => {
    localStorage.setItem(key, value);
  });
}
