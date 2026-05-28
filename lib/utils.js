export const OVERDUE_HOURS = 24;
export const TIMEZONE = 'Asia/Seoul';

const dateFmt = new Intl.DateTimeFormat('sv-SE', {
  timeZone: TIMEZONE,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hour12: false,
});

export function formatDate(d) {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return '';
  // sv-SE 포맷: "2026-05-28 14:32"
  return dateFmt.format(dt).replace(',', '');
}

export function hoursSince(rentedAt) {
  if (!rentedAt) return 0;
  const t = new Date(rentedAt).getTime();
  if (isNaN(t)) return 0;
  return Math.floor((Date.now() - t) / 3_600_000);
}

export function isOverdue(rentedAt) {
  return hoursSince(rentedAt) >= OVERDUE_HOURS;
}

// 홍길동 → 홍*동, 김철 → 김*, 박 → 박
export function maskName(name) {
  const s = String(name || '');
  if (s.length <= 1) return s;
  if (s.length === 2) return s[0] + '*';
  return s[0] + '*'.repeat(s.length - 2) + s[s.length - 1];
}

export function deriveStatus(activeRental) {
  if (!activeRental) return 'available';
  return isOverdue(activeRental.rented_at) ? 'overdue' : 'rented';
}

// 클라이언트가 만든 QR 진입 링크의 베이스 URL 추론
export function getBaseUrl(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return host ? `${proto}://${host}` : '';
}
