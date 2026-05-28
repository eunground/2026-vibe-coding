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
    const { rows: active } = await sql`
      SELECT 1 FROM rentals
       WHERE umbrella_number = ${umbrellaNumber} AND status = 'rented' LIMIT 1
    `;
    if (active.length > 0) {
      return res.json({
        ok: false,
        message: '대여 중인 우산은 삭제할 수 없습니다. 먼저 반납 처리해주세요.',
      });
    }

    const { rows: deleted } = await sql`
      DELETE FROM umbrellas WHERE number = ${umbrellaNumber} RETURNING number
    `;
    if (deleted.length === 0) {
      return res.json({ ok: false, message: '등록되지 않은 우산입니다.' });
    }
    return res.json({ ok: true, message: `${umbrellaNumber}번 우산이 삭제되었습니다.` });
  } catch (err) {
    // 과거 반납 기록이 FK ON DELETE RESTRICT 로 막을 수 있음
    if (err && err.code === '23503') {
      return res.json({
        ok: false,
        message: '과거 대여 기록이 있어 삭제할 수 없습니다.',
      });
    }
    console.error('delete error', err);
    return res.status(500).json({ ok: false, message: '오류가 발생했습니다.' });
  }
}
