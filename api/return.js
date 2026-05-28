import { sql } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const body = req.body || {};
  const name      = String(body.name      || '').trim();
  const studentId = String(body.studentId || '').trim();

  if (!name || !studentId) {
    return res.status(400).json({ ok: false, message: '이름과 학번을 입력해주세요.' });
  }

  try {
    // 학번 + 이름 일치하는 활성 대여를 반납 처리.
    // idx_one_active_per_student 가 학생당 활성 1개를 보장하므로 단일 행.
    const { rows } = await sql`
      UPDATE rentals
         SET status = 'returned', returned_at = NOW()
       WHERE student_id   = ${studentId}
         AND student_name = ${name}
         AND status       = 'rented'
       RETURNING umbrella_number
    `;

    if (rows.length === 0) {
      // 학번으로는 활성 대여 있지만 이름 불일치 vs 학번 자체가 활성 없음 — 구분해서 안내
      const { rows: byStu } = await sql`
        SELECT 1 FROM rentals
        WHERE student_id = ${studentId} AND status = 'rented' LIMIT 1
      `;
      if (byStu.length > 0) {
        return res.json({
          ok: false,
          message: '대여자 정보가 일치하지 않습니다. 이름과 학번을 확인해주세요.',
        });
      }
      return res.json({ ok: false, message: '현재 대여 중인 우산이 없습니다.' });
    }

    const umbrellaNumber = rows[0].umbrella_number;
    return res.json({
      ok: true,
      umbrellaNumber,
      message: `${umbrellaNumber}번 우산이 반납되었습니다. 감사합니다! 🙏`,
    });
  } catch (err) {
    console.error('return error', err);
    return res.status(500).json({ ok: false, message: '오류가 발생했습니다.' });
  }
}
