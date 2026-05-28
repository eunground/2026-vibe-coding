import { sql } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const body = req.body || {};
  const umbrellaNumber = String(body.umbrellaNumber || '').trim();
  const name      = String(body.name      || '').trim();
  const studentId = String(body.studentId || '').trim();

  if (!umbrellaNumber || !name || !studentId) {
    return res.status(400).json({ ok: false, message: '이름과 학번을 입력해주세요.' });
  }

  try {
    // 대여자 정보가 일치하는 활성 대여만 반납 처리.
    // 매칭이 없으면 → 활성 대여 자체가 없거나, 학생 정보 불일치.
    const { rows } = await sql`
      UPDATE rentals
         SET status = 'returned', returned_at = NOW()
       WHERE umbrella_number = ${umbrellaNumber}
         AND student_name    = ${name}
         AND student_id      = ${studentId}
         AND status          = 'rented'
       RETURNING id
    `;

    if (rows.length === 0) {
      // 어떤 사유인지 판별 (활성 대여 없음 vs 정보 불일치)
      const { rows: active } = await sql`
        SELECT 1 FROM rentals
        WHERE umbrella_number = ${umbrellaNumber} AND status = 'rented' LIMIT 1
      `;
      if (active.length === 0) {
        return res.json({ ok: false, message: '현재 대여 중인 우산이 아닙니다.' });
      }
      return res.json({
        ok: false,
        message: '대여자 정보가 일치하지 않습니다. 이름과 학번을 확인해주세요.',
      });
    }

    return res.json({
      ok: true,
      message: `${umbrellaNumber}번 우산이 반납되었습니다. 감사합니다! 🙏`,
    });
  } catch (err) {
    console.error('return error', err);
    return res.status(500).json({ ok: false, message: '오류가 발생했습니다.' });
  }
}
