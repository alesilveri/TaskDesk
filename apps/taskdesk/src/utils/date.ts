export function getRomeDateString(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const map = new Map(parts.map((part) => [part.type, part.value]));
  return `${map.get('year')}-${map.get('month')}-${map.get('day')}`;
}
