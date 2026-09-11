export function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function todayLabel(): string {
  return new Date().toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', weekday: 'long' });
}

export function formatDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00`);
  return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', weekday: 'short' });
}
