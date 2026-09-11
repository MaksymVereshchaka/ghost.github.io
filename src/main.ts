import './style.css';
import { $ } from './dom';
import { closeConfirm } from './modal';
import {
  goHome,
  renderHome,
  openAddClass,
  backFromAddClass,
  confirmAddClass,
  backToClassHub,
  editClassName,
  openAddLesson,
  confirmAddLesson,
  backFromLesson,
  triggerAlarm,
  standDownClick,
  returnCheckClick,
  openAddStudents,
  backFromAddStudents,
  addStudentsBulk,
  backFromStudentDetail,
  saveStudentName,
  deleteStudentFromDetail,
  exportData,
  triggerImportPicker,
  importDataFromFile,
} from './app';

// --- екран 1: список класів ---
$('btn-add-class').addEventListener('click', openAddClass);
$('btn-export-data').addEventListener('click', exportData);
$('btn-import-data').addEventListener('click', triggerImportPicker);
$<HTMLInputElement>('import-file-input').addEventListener('change', (e) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) importDataFromFile(file);
  input.value = ''; // дозволяє обрати той самий файл повторно наступного разу
});

// --- екран 1б: додавання/редагування класу ---
$('btn-add-class-back').addEventListener('click', backFromAddClass);
$('btn-confirm-add-class').addEventListener('click', confirmAddClass);
$('btn-open-add-students-from-class').addEventListener('click', openAddStudents);

// --- екран 2: хаб класу ---
$('btn-class-back').addEventListener('click', goHome);
$('btn-edit-class').addEventListener('click', editClassName);
$('btn-open-add-lesson').addEventListener('click', openAddLesson);

// --- екран 3: урок — дата/номер (створення або редагування) ---
$('btn-add-lesson-back').addEventListener('click', backToClassHub);
$('btn-confirm-add-lesson').addEventListener('click', confirmAddLesson);

// --- екран 4: урок (відвідуваність) ---
$('btn-lesson-back').addEventListener('click', backFromLesson);
$('btn-trigger-alarm').addEventListener('click', triggerAlarm);

// --- екран 5: тривога ---
$('stand-down-btn').addEventListener('click', standDownClick);

// --- екран 5б: перевірка повернення ---
$('return-check-btn').addEventListener('click', returnCheckClick);

// --- екран 6: додавання дітей ---
$('btn-add-students-back').addEventListener('click', backFromAddStudents);
$('btn-add-students-bulk').addEventListener('click', addStudentsBulk);

// --- екран 7: картка дитини ---
$('btn-student-detail-back').addEventListener('click', backFromStudentDetail);
$('btn-save-student-name').addEventListener('click', saveStudentName);
$('btn-delete-student-detail').addEventListener('click', deleteStudentFromDetail);

// --- модалка підтвердження ---
$('btn-confirm-cancel').addEventListener('click', closeConfirm);

// --- старт ---
renderHome();
