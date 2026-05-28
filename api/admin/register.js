import { sql } from '../../lib/db.js';
import { requireAdmin } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }
  if (!requireAdmin(req, res)) return;

  const body = req.body || {};
  const umbrellaNumber = String(body.umbrellaNumber || '').trim();
  const umbrellaName   = String(body.umbrellaName   || '').trim();

  if (!umbrellaNumber) {
    return res.status(400).json({ ok: false, message: '우산 번호를 입력해주세요.' });
  }

  const finalName = umbrellaName || `우산 ${umbrellaNumber}`;

  try {
    await sql`
      INSERT INTO umbrellas (number, name) VALUES (${umbrellaNumber}, ${finalName})
    `;
    return res.json({ ok: true, message: `${umbrellaNumber}번 우산이 등록되었습니다.` });
  } catch (err) {
    if (err && err.code === '23505') {
      return res.json({ ok: false, message: '이미 등록된 우산 번호입니다.' });
    }
    console.error('register error', err);
    return res.status(500).json({ ok: false, message: '오류가 발생했습니다.' });
  }
}
