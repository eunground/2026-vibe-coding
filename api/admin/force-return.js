import { sql } from '../../lib/db.js';
import { requireAdmin } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }
  if (!requireAdmin(req, res)) return;

  const body = req.body || {};
  const umbrellaNumber = String(body.umbrellaNumber || '').trim();
  if (!umbrellaNumber) {
    return res.status(400).json({ ok: false, message: '우산 번호가 필요합니다.' });
  }

  try {
    const { rows } = await sql`
      UPDATE rentals
         SET status = 'returned', returned_at = NOW()
       WHERE umbrella_number = ${umbrellaNumber} AND status = 'rented'
       RETURNING id
    `;
    if (rows.length === 0) {
      return res.json({ ok: false, message: '대여 중인 우산이 아닙니다.' });
    }
    return res.json({
      ok: true,
      message: `${umbrellaNumber}번 우산을 강제 반납 처리했습니다.`,
    });
  } catch (err) {
    console.error('force-return error', err);
    return res.status(500).json({ ok: false, message: '오류가 발생했습니다.' });
  }
}
