/** Calendar date in the user's local timezone (YYYY-MM-DD). */
export function localDateIso(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function previousLocalDateIso(d = new Date()): string {
  const prev = new Date(d);
  prev.setDate(prev.getDate() - 1);
  return localDateIso(prev);
}
