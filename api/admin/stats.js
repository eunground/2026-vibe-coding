import { sql } from '../../lib/db.js';
import { requireAdmin } from '../../lib/auth.js';
import { OVERDUE_HOURS } from '../../lib/utils.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }
  if (!requireAdmin(req, res)) return;

  try {
    const { rows } = await sql`
      SELECT
        (SELECT COUNT(*) FROM umbrellas)::int                                              AS total,
        (SELECT COUNT(*) FROM rentals WHERE status = 'rented')::int                        AS rented,
        (SELECT COUNT(*) FROM rentals
          WHERE status = 'rented'
            AND rented_at <= NOW() - (${OVERDUE_HOURS} * INTERVAL '1 hour'))::int          AS overdue
    `;
    const { total, rented, overdue } = rows[0];
    return res.json({ ok: true, total, available: total - rented, rented, overdue });
  } catch (err) {
    console.error('stats error', err);
    return res.status(500).json({ ok: false, message: '오류가 발생했습니다.' });
  }
}
