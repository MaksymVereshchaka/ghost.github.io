import { $ } from './dom';

export function askConfirm(title: string, text: string, onConfirm: () => void, confirmLabel: string = 'Видалити'): void {
  $('confirm-title').textContent = title;
  $('confirm-text').textContent = text;

  const btn = $<HTMLButtonElement>('confirm-danger-btn');
  // клонуємо кнопку, щоб зняти попередні обробники перед підвʼязкою нового
  const freshBtn = btn.cloneNode(true) as HTMLButtonElement;
  freshBtn.textContent = confirmLabel;
  btn.parentNode!.replaceChild(freshBtn, btn);
  freshBtn.addEventListener('click', () => {
    closeConfirm();
    onConfirm();
  });

  $('confirm-modal').classList.add('active');
}

export function closeConfirm(): void {
  $('confirm-modal').classList.remove('active');
}
