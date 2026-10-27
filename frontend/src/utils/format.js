export const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

export const fmtTime = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

export const fmtDateTime = (d) => `${fmtDate(d)}, ${fmtTime(d)}`;

export const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export const fmtDuration = (mins) => (mins ? `${Math.floor(mins / 60)}h ${mins % 60}m` : '');

const pad = (n) => String(n).padStart(2, '0');

export const toDateKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
};

// Start and end of a local calendar day, sent to the API as ISO strings
export const dayBounds = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return { from: new Date(y, m - 1, d).toISOString(), to: new Date(y, m - 1, d + 1).toISOString() };
};

export const nextDays = (count = 5) =>
  Array.from({ length: count }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return toDateKey(d);
  });

export const dayLabel = (key) => {
  const today = toDateKey(new Date());
  const tomorrow = toDateKey(new Date(Date.now() + 86400000));
  if (key === today) return 'Today';
  if (key === tomorrow) return 'Tomorrow';
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
};

// Value for <input type="datetime-local">
export const toLocalInput = (d) => {
  const x = new Date(d);
  return `${toDateKey(x)}T${pad(x.getHours())}:${pad(x.getMinutes())}`;
};
