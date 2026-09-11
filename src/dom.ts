export function $<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Елемент #${id} не знайдено в DOM`);
  return el as T;
}

export function escapeHtml(str: string): string {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

export type NavDirection = 'forward' | 'back';

export function showScreen(id: string, direction: NavDirection = 'forward'): void {
  const next = $(id);
  const current = document.querySelector<HTMLElement>('.screen.active');
  if (current === next) return;

  next.classList.remove('leaving-back', 'leaving-forward');
  next.style.transition = 'none';
  next.style.transform = direction === 'back' ? 'translateX(-100%)' : 'translateX(100%)';
  next.style.visibility = 'visible';
  // force reflow so the browser applies the starting position before animating
  void next.offsetHeight;
  next.style.transition = '';

  requestAnimationFrame(() => {
    if (current) {
      current.classList.remove('active');
      current.classList.add(direction === 'back' ? 'leaving-back' : 'leaving-forward');
    }
    next.classList.add('active');
    next.style.transform = '';
  });

const cleanup = (e: TransitionEvent) => {
    if (e.propertyName !== 'transform' || e.target !== next) return;
    if (current) {
      current.classList.remove('leaving-back', 'leaving-forward');
      current.style.visibility = 'hidden';
    }
    next.removeEventListener('transitionend', cleanup);
  };
  next.addEventListener('transitionend', cleanup);
}

/**
 * Плавно "згортає" рядок списку (висота, відступи, прозорість) і лише потім
 * викликає onDone — там вже можна безпечно міняти дані й перерендерювати список.
 */
export function animateRowRemoval(row: HTMLElement, onDone: () => void): void {
  const height = row.getBoundingClientRect().height;
  row.style.maxHeight = `${height}px`;
  row.style.overflow = 'hidden';
  void row.offsetHeight; // reflow, щоб стартова висота застосувалась до транзишена
  row.classList.add('row-removing');

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    onDone();
  };
  row.addEventListener('transitionend', finish, { once: true });
  setTimeout(finish, 260); // запобіжник, якщо transitionend з якоїсь причини не спрацює
}
