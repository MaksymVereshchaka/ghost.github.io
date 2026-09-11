import type { ClassRecord, Student } from './types';
import {
  loadClasses,
  saveClasses,
  uid,
  getAttendance,
  saveAttendance,
  getShelter,
  saveShelter,
  getReturnCheck,
  saveReturnCheck,
  getPickedUp,
  savePickedUp,
  isAlarmActive,
  setAlarmActive,
  getSessions,
  registerSession,
  removeSessionRegistryEntry,
  purgeClassData,
  purgeSessionData,
  purgeStudentMarks,
  moveSessionData,
  exportAllData,
  importAllData,
} from './storage';
import { sortedClasses, sortedStudents, normName } from './sort';
import { todayKey, todayLabel, formatDate } from './dateUtils';
import { $, escapeHtml, showScreen, animateRowRemoval } from './dom';
import { askConfirm } from './modal';

let classes: ClassRecord[] = loadClasses();
let currentClassId: string | null = null;
let currentDate: string | null = null;
let currentLesson: number | null = null;
/** Якщо не null — екран "клас" працює в режимі редагування вже існуючого класу, а не створення нового. */
let editingClassId: string | null = null;
/** Якщо не null — екран "урок" працює в режимі редагування вже існуючого уроку, а не створення нового. */
let editingLesson: { date: string; lesson: number } | null = null;
/** Дитина, яку зараз показано на екрані картки. */
let currentStudentId: string | null = null;

function persist(): void {
  saveClasses(classes);
}
function getClass(id: string): ClassRecord {
  const cls = classes.find((c) => c.id === id);
  if (!cls) throw new Error(`Клас ${id} не знайдено`);
  return cls;
}

/* ---------- екран: список класів ---------- */
export function goHome(): void {
  currentClassId = null;
  renderHome();
  showScreen('screen-home', 'back');
}

export function renderHome(highlightId?: string): void {
  $('today-label').textContent = todayLabel();
  const list = $('class-list');
  list.innerHTML = '';
  if (classes.length === 0) {
    list.innerHTML = '<div class="empty">Поки немає жодного класу.<br>Додайте перший, щоб почати.</div>';
    return;
  }
  sortedClasses(classes).forEach((c) => {
    const sessionsCount = getSessions(c.id).length;
    const row = document.createElement('div');
    row.className = 'class-row' + (c.id === highlightId ? ' row-anim' : '');
    row.addEventListener('click', () => openClass(c.id));
    row.innerHTML = `
      <div>
        <div class="name">${escapeHtml(c.name)}</div>
        <div class="meta">${c.students.length} дітей · ${sessionsCount} уроків</div>
      </div>
      <div class="row-actions">
        <div class="row-del" data-del-class="${c.id}">✕</div>
        <div class="chev">›</div>
      </div>`;
    row.querySelector<HTMLElement>('[data-del-class]')!.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteClass(c.id, row);
    });
    list.appendChild(row);
  });
}

export function openAddClass(): void {
  editingClassId = null;
  $('add-class-title').textContent = 'Новий клас';
  $<HTMLButtonElement>('btn-confirm-add-class').textContent = 'Додати клас';
  $<HTMLInputElement>('new-class-name').value = '';
  $('class-roster-section').hidden = true;
  showScreen('screen-add-class', 'forward');
}

export function backFromAddClass(): void {
  if (editingClassId) {
    editingClassId = null;
    backToClassHub();
    return;
  }
  showScreen('screen-home', 'back');
}

export function confirmAddClass(): void {
  const input = $<HTMLInputElement>('new-class-name');
  const trimmed = input.value.trim();
  if (!trimmed) {
    alert('Введіть назву класу.');
    return;
  }

  if (editingClassId) {
    const cls = getClass(editingClassId);
    if (trimmed !== cls.name) {
      const dup = classes.some((c) => c.id !== cls.id && normName(c.name) === normName(trimmed));
      if (dup) {
        alert(`Клас «${trimmed}» вже існує.`);
        return;
      }
      cls.name = trimmed;
      persist();
    }
    editingClassId = null;
    backToClassHub();
    return;
  }

  const dup = classes.some((c) => normName(c.name) === normName(trimmed));
  if (dup) {
    alert(`Клас «${trimmed}» вже існує.`);
    return;
  }
  const newId = uid();
  classes.push({ id: newId, name: trimmed, students: [] });
  persist();
  input.value = '';
  renderHome(newId);
  showScreen('screen-home', 'back');
}

function deleteClass(id: string, rowEl: HTMLElement): void {
  const cls = getClass(id);
  askConfirm(
    'Видалити клас?',
    `«${cls.name}» і всі його уроки та відмітки буде видалено назавжди. Це не можна скасувати.`,
    () => {
      animateRowRemoval(rowEl, () => {
        purgeClassData(id);
        classes = classes.filter((c) => c.id !== id);
        persist();
        renderHome();
      });
    },
  );
}

/* ---------- екран: хаб класу (список уроків) ---------- */
export function openClass(id: string): void {
  currentClassId = id;
  renderClassHub();
  showScreen('screen-class', 'forward');
}

export function backToClassHub(): void {
  renderClassHub();
  showScreen('screen-class', 'back');
}

export function editClassName(): void {
  const cls = getClass(currentClassId!);
  editingClassId = cls.id;
  $('add-class-title').textContent = 'Редагувати клас';
  $<HTMLButtonElement>('btn-confirm-add-class').textContent = 'Зберегти зміни';
  $<HTMLInputElement>('new-class-name').value = cls.name;
  $('class-roster-section').hidden = false;
  renderClassEditorRoster();
  showScreen('screen-add-class', 'forward');
}

function renderClassHub(): void {
  const cls = getClass(currentClassId!);
  $('class-hub-title').textContent = cls.name;
  const sessions = getSessions(cls.id);
  const wrap = $('class-hub-list');
  wrap.innerHTML = '';
  if (sessions.length === 0) {
    wrap.innerHTML =
      '<div class="empty">Тут поки немає жодного уроку.<br>Натисніть «+» вгорі, щоб почати перекличку.</div>';
    return;
  }
  sessions.forEach((s) => {
    const att = getAttendance(cls.id, s.date, s.lesson);
    const presentCount = cls.students.filter((st) => att[st.id]).length;
    const row = document.createElement('div');
    row.className = 'hist-row';
    row.addEventListener('click', () => {
      currentDate = s.date;
      currentLesson = s.lesson;
      enterLesson();
    });
    row.innerHTML = `
      <div>
        <div class="d">${formatDate(s.date)}</div>
        <div class="l">Урок ${s.lesson}</div>
      </div>
      <div class="row-actions">
        <div class="c">${presentCount} з ${cls.students.length}</div>
        <div class="row-del" data-edit-lesson title="Редагувати">✎</div>
        <div class="row-del" data-del-lesson>✕</div>
      </div>`;
    row.querySelector<HTMLElement>('[data-edit-lesson]')!.addEventListener('click', (e) => {
      e.stopPropagation();
      openEditLesson(s.date, s.lesson);
    });
    row.querySelector<HTMLElement>('[data-del-lesson]')!.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteLesson(s.date, s.lesson, row);
    });
    wrap.appendChild(row);
  });
}

function deleteLesson(date: string, lesson: number, rowEl: HTMLElement): void {
  const cls = getClass(currentClassId!);
  askConfirm('Видалити урок?', `Урок ${lesson} за ${formatDate(date)} і всі його відмітки буде видалено назавжди.`, () => {
    animateRowRemoval(rowEl, () => {
      purgeSessionData(cls.id, date, lesson);
      removeSessionRegistryEntry(cls.id, date, lesson);
      renderClassHub();
    });
  });
}

/* ---------- екран: урок — дата/номер (створення або редагування) ---------- */
export function openAddLesson(): void {
  editingLesson = null;
  $('add-lesson-title').textContent = 'Новий урок';
  $<HTMLButtonElement>('btn-confirm-add-lesson').textContent = 'Додати урок';

  const today = todayKey();
  $<HTMLInputElement>('new-lesson-date').value = today;
  const sessionsToday = getSessions(currentClassId!).filter((s) => s.date === today);
  const suggestedLesson = sessionsToday.length ? Math.max(...sessionsToday.map((s) => s.lesson)) + 1 : 1;
  $<HTMLInputElement>('new-lesson-number').value = String(suggestedLesson);
  showScreen('screen-add-lesson', 'forward');
}

export function openEditLesson(date: string, lesson: number): void {
  editingLesson = { date, lesson };
  $('add-lesson-title').textContent = 'Редагувати урок';
  $<HTMLButtonElement>('btn-confirm-add-lesson').textContent = 'Зберегти зміни';

  $<HTMLInputElement>('new-lesson-date').value = date;
  $<HTMLInputElement>('new-lesson-number').value = String(lesson);
  showScreen('screen-add-lesson', 'forward');
}

export function confirmAddLesson(): void {
  const dateVal = $<HTMLInputElement>('new-lesson-date').value;
  let lessonVal = parseInt($<HTMLInputElement>('new-lesson-number').value, 10);
  if (!dateVal) {
    alert('Вкажіть дату уроку.');
    return;
  }
  if (!lessonVal || lessonVal < 1) lessonVal = 1;

  if (editingLesson) {
    const { date: oldDate, lesson: oldLesson } = editingLesson;
    const collides =
      (dateVal !== oldDate || lessonVal !== oldLesson) &&
      getSessions(currentClassId!).some((s) => s.date === dateVal && s.lesson === lessonVal);
    if (collides) {
      alert(`Урок ${lessonVal} за ${formatDate(dateVal)} вже існує. Виберіть іншу дату або номер.`);
      return;
    }
    moveSessionData(currentClassId!, oldDate, oldLesson, dateVal, lessonVal);
    editingLesson = null;
    backToClassHub();
    return;
  }

  const already = getSessions(currentClassId!).some((s) => s.date === dateVal && s.lesson === lessonVal);
  registerSession(currentClassId!, dateVal, lessonVal);
  if (already) {
    alert(`Урок ${lessonVal} за ${formatDate(dateVal)} вже існує.`);
  }
  backToClassHub();
}

/* ---------- екран: урок (відвідуваність) ---------- */
function enterLesson(): void {
  if (isAlarmActive(currentClassId!, currentDate!, currentLesson!)) {
    renderAlarm();
    showScreen('screen-alarm', 'forward');
    return;
  }
  renderLesson();
  showScreen('screen-lesson', 'forward');
}

export function backFromLesson(): void {
  backToClassHub();
}

function renderLesson(): void {
  const cls = getClass(currentClassId!);
  $('lesson-title').textContent = cls.name;
  $<HTMLInputElement>('session-date').value = currentDate!;
  $<HTMLInputElement>('session-lesson').value = String(currentLesson);

  const att = getAttendance(cls.id, currentDate!, currentLesson!);
  const pickedUp = getPickedUp(cls.id, currentDate!, currentLesson!);
  const wrap = $('lesson-list');
  wrap.innerHTML = '';
  if (cls.students.length === 0) {
    wrap.innerHTML = '<div class="empty">У цьому класі поки немає дітей.<br>Поверніться назад і натисніть ☰, щоб додати список.</div>';
  }
  sortedStudents(cls).forEach((s: Student) => {
    const present = !!att[s.id];
    const wasPickedUp = !!pickedUp[s.id];
    const row = document.createElement('div');
    row.className = 'stu-row' + (present ? ' present' : '');
    row.addEventListener('click', () => {
      const a = getAttendance(cls.id, currentDate!, currentLesson!);
      a[s.id] = !a[s.id];
      saveAttendance(cls.id, currentDate!, currentLesson!, a);
      renderLesson();
    });
    const badge = wasPickedUp
      ? `<div class="pickup-badge" data-undo-pickup="${s.id}" title="Скасувати">👪 забрали</div>`
      : '';
    row.innerHTML = `<div class="check">✓</div><div class="nm">${escapeHtml(s.name)}</div>${badge}`;
    if (wasPickedUp) {
      row.querySelector<HTMLElement>('[data-undo-pickup]')!.addEventListener('click', (e) => {
        e.stopPropagation();
        undoPickedUp(s.id);
      });
    }
    wrap.appendChild(row);
  });

  const presentCount = cls.students.filter((st) => att[st.id]).length;
  $('present-count').textContent = String(presentCount);
  $('total-count').textContent = String(cls.students.length);
}

function undoPickedUp(sid: string): void {
  askConfirm(
    'Скасувати відмітку?',
    'Дитина знову з’явиться в перевірках тривоги на цьому уроці.',
    () => {
      const pu = getPickedUp(currentClassId!, currentDate!, currentLesson!);
      delete pu[sid];
      savePickedUp(currentClassId!, currentDate!, currentLesson!, pu);
      renderLesson();
    },
    'Скасувати',
  );
}

/* ---------- тривога ---------- */
export function triggerAlarm(): void {
  const cls = getClass(currentClassId!);
  const att = getAttendance(cls.id, currentDate!, currentLesson!);
  const pickedUp = getPickedUp(cls.id, currentDate!, currentLesson!);
  const presentIds = Object.keys(att).filter((id) => att[id] && !pickedUp[id]);
  if (presentIds.length === 0) {
    if (!confirm('Жодна дитина не відмічена присутньою на цьому уроці. Все одно почати перевірку укриття?')) return;
  }
  saveShelter(cls.id, currentDate!, currentLesson!, {});
  setAlarmActive(cls.id, currentDate!, currentLesson!, true);
  if (navigator.vibrate) navigator.vibrate([200, 80, 200, 80, 200]);
  renderAlarm();
  showScreen('screen-alarm', 'forward');
}

function renderAlarm(): void {
  const cls = getClass(currentClassId!);
  const att = getAttendance(cls.id, currentDate!, currentLesson!);
  const shelter = getShelter(cls.id, currentDate!, currentLesson!);
  const pickedUp = getPickedUp(cls.id, currentDate!, currentLesson!);
  const presentStudents = sortedStudents(cls).filter((s) => att[s.id] && !pickedUp[s.id]);

  const wrap = $('alarm-list');
  wrap.innerHTML = '';
  if (presentStudents.length === 0) {
    wrap.innerHTML = '<div class="empty">Немає дітей, відмічених присутніми на цьому уроці.</div>';
  }
  presentStudents.forEach((s) => {
    const verified = !!shelter[s.id];
    const row = document.createElement('div');
    row.className = 'stu-row shelter-mode' + (verified ? ' verified' : '');
    row.addEventListener('click', () => {
      const sh = getShelter(cls.id, currentDate!, currentLesson!);
      sh[s.id] = !sh[s.id];
      saveShelter(cls.id, currentDate!, currentLesson!, sh);
      renderAlarm();
    });
    row.innerHTML = `<div class="check">✓</div><div class="nm">${escapeHtml(s.name)}</div><button class="pickup-btn" data-pickup="${s.id}">👪 Забрали батьки</button>`;
    row.querySelector<HTMLElement>('[data-pickup]')!.addEventListener('click', (e) => {
      e.stopPropagation();
      markPickedUp(s.id, row, 'alarm');
    });
    wrap.appendChild(row);
  });

  const verifiedCount = Object.values(shelter).filter(Boolean).length;
  $('shelter-count').textContent = String(verifiedCount);
  $('shelter-total').textContent = String(presentStudents.length);

  const allFound = presentStudents.length > 0 && verifiedCount === presentStudents.length;
  const btn = $<HTMLButtonElement>('stand-down-btn');
  btn.textContent = allFound ? 'Усіх знайдено — відбій' : 'Зняти тривогу вручну';
  btn.classList.toggle('all-clear', allFound);
  $('alarm-sub').textContent = allFound
    ? 'Усіх дітей знайдено. Можна зняти тривогу.'
    : 'Відмічайте кожну дитину, коли побачите її в укритті';
}

/** Батьки забрали дитину під розписку: лишається присутньою на уроці, але зникає з перевірок тривоги/повернення. */
function markPickedUp(sid: string, rowEl: HTMLElement, context: 'alarm' | 'return'): void {
  const cls = getClass(currentClassId!);
  const stu = cls.students.find((s) => s.id === sid);
  askConfirm(
    'Батьки забрали дитину?',
    `«${stu ? stu.name : ''}» буде позначено як таку, що пішла з батьками під розписку. Дитина лишиться відміченою присутньою на уроці, але зникне з перевірки тривоги та повернення до кінця цього уроку.`,
    () => {
      animateRowRemoval(rowEl, () => {
        const pu = getPickedUp(cls.id, currentDate!, currentLesson!);
        pu[sid] = true;
        savePickedUp(cls.id, currentDate!, currentLesson!, pu);

        const sh = getShelter(cls.id, currentDate!, currentLesson!);
        if (sid in sh) {
          delete sh[sid];
          saveShelter(cls.id, currentDate!, currentLesson!, sh);
        }
        const rc = getReturnCheck(cls.id, currentDate!, currentLesson!);
        if (sid in rc) {
          delete rc[sid];
          saveReturnCheck(cls.id, currentDate!, currentLesson!, rc);
        }

        if (context === 'alarm') renderAlarm();
        else renderReturnCheck();
      });
    },
    'Підтвердити',
  );
}

export function standDownClick(): void {
  const cls = getClass(currentClassId!);
  const att = getAttendance(cls.id, currentDate!, currentLesson!);
  const shelter = getShelter(cls.id, currentDate!, currentLesson!);
  const pickedUp = getPickedUp(cls.id, currentDate!, currentLesson!);
  const presentCount = cls.students.filter((s) => att[s.id] && !pickedUp[s.id]).length;
  const verifiedCount = Object.values(shelter).filter(Boolean).length;
  const allFound = presentCount > 0 && verifiedCount === presentCount;
  standDown(!allFound);
}
function standDown(manual: boolean): void {
  if (manual) {
    if (!confirm('Зняти тривогу вручну, хоча не всі діти відмічені знайденими?')) return;
  }
  setAlarmActive(currentClassId!, currentDate!, currentLesson!, false);

  const cls = getClass(currentClassId!);
  const att = getAttendance(cls.id, currentDate!, currentLesson!);
  const pickedUp = getPickedUp(cls.id, currentDate!, currentLesson!);
  const presentCount = cls.students.filter((s) => att[s.id] && !pickedUp[s.id]).length;

  if (presentCount === 0) {
    // нема кого перевіряти на повернення — одразу назад до уроку
    renderLesson();
    showScreen('screen-lesson', 'back');
    return;
  }

  saveReturnCheck(cls.id, currentDate!, currentLesson!, {});
  renderReturnCheck();
  showScreen('screen-return-check', 'forward');
}

/* ---------- перевірка повернення дітей у клас після тривоги ---------- */
function renderReturnCheck(): void {
  const cls = getClass(currentClassId!);
  const att = getAttendance(cls.id, currentDate!, currentLesson!);
  const ret = getReturnCheck(cls.id, currentDate!, currentLesson!);
  const pickedUp = getPickedUp(cls.id, currentDate!, currentLesson!);
  const presentStudents = sortedStudents(cls).filter((s) => att[s.id] && !pickedUp[s.id]);

  const wrap = $('return-list');
  wrap.innerHTML = '';
  presentStudents.forEach((s) => {
    const returned = !!ret[s.id];
    const row = document.createElement('div');
    row.className = 'stu-row' + (returned ? ' present' : '');
    row.addEventListener('click', () => {
      const r = getReturnCheck(cls.id, currentDate!, currentLesson!);
      r[s.id] = !r[s.id];
      saveReturnCheck(cls.id, currentDate!, currentLesson!, r);
      renderReturnCheck();
    });
    row.innerHTML = `<div class="check">✓</div><div class="nm">${escapeHtml(s.name)}</div><button class="pickup-btn" data-pickup="${s.id}">👪 Забрали батьки</button>`;
    row.querySelector<HTMLElement>('[data-pickup]')!.addEventListener('click', (e) => {
      e.stopPropagation();
      markPickedUp(s.id, row, 'return');
    });
    wrap.appendChild(row);
  });

  const returnedCount = Object.values(ret).filter(Boolean).length;
  $('return-count').textContent = String(returnedCount);
  $('return-total').textContent = String(presentStudents.length);

  const allReturned = presentStudents.length > 0 && returnedCount === presentStudents.length;
  const btn = $<HTMLButtonElement>('return-check-btn');
  btn.textContent = allReturned ? 'Усі повернулися — продовжити урок' : 'Продовжити вручну';
  btn.classList.toggle('all-clear', allReturned);
  $('return-sub').textContent = allReturned
    ? 'Усі діти повернулися до класу. Можна продовжити урок.'
    : 'Відмічайте кожну дитину, коли вона повернеться з укриття';
}

export function returnCheckClick(): void {
  const cls = getClass(currentClassId!);
  const att = getAttendance(cls.id, currentDate!, currentLesson!);
  const ret = getReturnCheck(cls.id, currentDate!, currentLesson!);
  const pickedUp = getPickedUp(cls.id, currentDate!, currentLesson!);
  const presentCount = cls.students.filter((s) => att[s.id] && !pickedUp[s.id]).length;
  const returnedCount = Object.values(ret).filter(Boolean).length;
  const allReturned = presentCount > 0 && returnedCount === presentCount;

  const proceed = () => {
    renderLesson();
    showScreen('screen-lesson', 'back');
  };

  if (allReturned) {
    proceed();
    return;
  }
  if (!confirm('Продовжити урок, хоча не всі діти відмічені такими, що повернулися?')) return;
  proceed();
}

/* ---------- список дітей (усередині екрана редагування класу) ---------- */
function renderClassEditorRoster(highlightIds?: Set<string>): void {
  const cls = getClass(currentClassId!);
  const wrap = $('class-editor-roster-list');
  wrap.innerHTML = '';
  if (cls.students.length === 0) {
    wrap.innerHTML = '<div class="empty">Додайте дітей кнопкою «+» вгорі.</div>';
  }
  sortedStudents(cls).forEach((s) => {
    const row = document.createElement('div');
    row.className = 'stu-row' + (highlightIds?.has(s.id) ? ' row-anim' : '');
    row.addEventListener('click', () => openStudentDetail(s.id));
    row.innerHTML = `<div class="nm">${escapeHtml(s.name)}</div><div class="del" data-del-student="${s.id}">✕</div>`;
    row.querySelector<HTMLElement>('[data-del-student]')!.addEventListener('click', (e) => {
      e.stopPropagation();
      removeStudent(s.id, row);
    });
    wrap.appendChild(row);
  });
}

/* ---------- екран: додавання дітей ---------- */
export function openAddStudents(): void {
  $<HTMLTextAreaElement>('bulk-student-names').value = '';
  showScreen('screen-add-students', 'forward');
}

export function backFromAddStudents(): void {
  showScreen('screen-add-class', 'back');
}

export function addStudentsBulk(): void {
  const textarea = $<HTMLTextAreaElement>('bulk-student-names');
  const lines = textarea.value
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return;

  const cls = getClass(currentClassId!);
  const existing = new Set(cls.students.map((s) => normName(s.name)));
  const addedThisBatch = new Set<string>();
  const addedIds = new Set<string>();
  const skipped: string[] = [];

  lines.forEach((name) => {
    const key = normName(name);
    if (existing.has(key) || addedThisBatch.has(key)) {
      skipped.push(name);
      return;
    }
    const newId = uid();
    cls.students.push({ id: newId, name });
    addedThisBatch.add(key);
    addedIds.add(newId);
  });

  persist();
  textarea.value = '';
  renderClassEditorRoster(addedIds);
  showScreen('screen-add-class', 'back');
  if (skipped.length) {
    alert('Уже є в списку, пропущено:\n' + skipped.join('\n'));
  }
}

function removeStudent(sid: string, rowEl: HTMLElement): void {
  const cls = getClass(currentClassId!);
  const stu = cls.students.find((s) => s.id === sid);
  askConfirm('Видалити дитину?', `«${stu ? stu.name : ''}» буде видалено зі списку класу разом з її відмітками в усіх уроках.`, () => {
    animateRowRemoval(rowEl, () => {
      cls.students = cls.students.filter((s) => s.id !== sid);
      persist();
      purgeStudentMarks(cls.id, sid);
      renderClassEditorRoster();
    });
  });
}

/* ---------- екран: картка дитини ---------- */
export function openStudentDetail(sid: string): void {
  const cls = getClass(currentClassId!);
  const stu = cls.students.find((s) => s.id === sid);
  if (!stu) return;
  currentStudentId = sid;
  $<HTMLInputElement>('student-detail-name').value = stu.name;
  showScreen('screen-student-detail', 'forward');
}

export function backFromStudentDetail(): void {
  showScreen('screen-add-class', 'back');
  renderClassEditorRoster();
}

export function saveStudentName(): void {
  const cls = getClass(currentClassId!);
  const stu = cls.students.find((s) => s.id === currentStudentId);
  if (!stu) return;
  const name = $<HTMLInputElement>('student-detail-name').value.trim();
  if (!name) {
    alert("Ім'я не може бути порожнім.");
    return;
  }
  const dup = cls.students.some((s) => s.id !== stu.id && normName(s.name) === normName(name));
  if (dup) {
    alert(`«${name}» вже є в цьому класі.`);
    return;
  }
  stu.name = name;
  persist();
  showScreen('screen-add-class', 'back');
  renderClassEditorRoster();
}

export function deleteStudentFromDetail(): void {
  const cls = getClass(currentClassId!);
  const stu = cls.students.find((s) => s.id === currentStudentId);
  if (!stu) return;
  askConfirm('Видалити дитину?', `«${stu.name}» буде видалено зі списку класу разом з її відмітками в усіх уроках.`, () => {
    cls.students = cls.students.filter((s) => s.id !== stu.id);
    persist();
    purgeStudentMarks(cls.id, stu.id);
    showScreen('screen-add-class', 'back');
    renderClassEditorRoster();
  });
}

/* ---------- резервна копія ---------- */
export function exportData(): void {
  const json = exportAllData();
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const stamp = todayKey();
  const a = document.createElement('a');
  a.href = url;
  a.download = `perekluchka-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function triggerImportPicker(): void {
  $<HTMLInputElement>('import-file-input').click();
}

export function importDataFromFile(file: File): void {
  const reader = new FileReader();
  reader.onload = () => {
    const text = String(reader.result ?? '');
    askConfirm(
      'Імпортувати резервну копію?',
      'Усі поточні класи, уроки та відмітки на цьому пристрої буде замінено вмістом файлу. Це не можна скасувати.',
      () => {
        try {
          importAllData(text);
          classes = loadClasses();
          currentClassId = null;
          renderHome();
          showScreen('screen-home', 'back');
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Не вдалося імпортувати файл.');
        }
      },
      'Імпортувати',
    );
  };
  reader.onerror = () => alert('Не вдалося прочитати файл.');
  reader.readAsText(file);
}
