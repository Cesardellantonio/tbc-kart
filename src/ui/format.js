// Time formatting for timing displays (pure).

// 83.4567 → "1:23.457"; null → "-:--.---"
export function formatTime(seconds) {
  if (seconds == null || !Number.isFinite(seconds)) return '-:--.---';
  const ms = Math.max(0, Math.round(seconds * 1000));
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${String(s).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
}

// -0.2314 → "−0.231", 1.5 → "+1.500"; null → ""
export function formatDelta(seconds) {
  if (seconds == null || !Number.isFinite(seconds)) return '';
  return `${seconds < 0 ? '−' : '+'}${Math.abs(seconds).toFixed(3)}`;
}
