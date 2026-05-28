import { sql } from '../../lib/db.js';
import { requireAdmin } from '../../lib/auth.js';
import { formatDate } from '../../lib/utils.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }
  if (!requireAdmin(req, res)) return;

  try {
    const { rows } = await sql`
      SELECT umbrella_number, student_name, student_id, phone,
             rented_at, returned_at, status
        FROM rentals
       ORDER BY rented_at DESC
       LIMIT 500
    `;

    const list = rows.map((r) => ({
      umbrellaNumber: r.umbrella_number,
      name: r.student_name,
      studentId: r.student_id,
      phone: r.phone,
      rentTime: formatDate(r.rented_at),
      returnTime: formatDate(r.returned_at),
      // 프론트가 한글 라벨로 분기 — 기존 코드 호환
      status: r.status === 'rented' ? '대여중' : '반납완료',
    }));

    return res.json({ ok: true, list });
  } catch (err) {
    console.error('history error', err);
    return res.status(500).json({ ok: false, message: '오류가 발생했습니다.' });
  }
}
