import { sql } from '../../lib/db.js';
import { requireAdmin } from '../../lib/auth.js';
import { formatDate, hoursSince, isOverdue } from '../../lib/utils.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }
  if (!requireAdmin(req, res)) return;

  try {
    const { rows } = await sql`
      SELECT umbrella_number, student_name, student_id, phone, rented_at
        FROM rentals
       WHERE status = 'rented'
       ORDER BY rented_at ASC
    `;

    const list = rows.map((r) => ({
      umbrellaNumber: r.umbrella_number,
      name: r.student_name,
      studentId: r.student_id,
      phone: r.phone,
      rentTime: formatDate(r.rented_at),
      hours: hoursSince(r.rented_at),
      overdue: isOverdue(r.rented_at),
    }));

    // 연체 우선, 그 다음 오래된 순
    list.sort((a, b) => (b.overdue - a.overdue) || (b.hours - a.hours));

    return res.json({ ok: true, list });
  } catch (err) {
    console.error('active error', err);
    return res.status(500).json({ ok: false, message: '오류가 발생했습니다.' });
  }
}
