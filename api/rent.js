import { sql } from '../lib/db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const body = req.body || {};
  const umbrellaNumber = String(body.umbrellaNumber || '').trim();
  const name      = String(body.name      || '').trim();
  const studentId = String(body.studentId || '').trim();
  const phone     = String(body.phone     || '').trim();

  if (!umbrellaNumber || !name || !studentId || !phone) {
    return res.status(400).json({ ok: false, message: '모든 항목을 입력해주세요.' });
  }
  if (!/^[0-9\-]{9,13}$/.test(phone)) {
    return res.status(400).json({
      ok: false,
      message: '전화번호 형식을 확인해주세요. (예: 010-1234-5678)',
    });
  }

  try {
    const { rows: umb } = await sql`
      SELECT number FROM umbrellas WHERE number = ${umbrellaNumber}
    `;
    if (umb.length === 0) {
      return res.json({ ok: false, message: '등록되지 않은 우산입니다.' });
    }

    // 부분 unique 인덱스 두 개가 race를 막아준다:
    //   - idx_one_active_per_umbrella (우산 1개 ↔ 활성 대여 1개)
    //   - idx_one_active_per_student  (학생 1명 ↔ 활성 대여 1개)
    // 경합 시 Postgres가 23505로 reject → 어느 쪽이 충돌인지는 별도 SELECT로 구분.
    await sql`
      INSERT INTO rentals (umbrella_number, student_name, student_id, phone, status)
      VALUES (${umbrellaNumber}, ${name}, ${studentId}, ${phone}, 'rented')
    `;

    return res.json({
      ok: true,
      message: `${umbrellaNumber}번 우산 대여가 완료되었습니다. 비 조심히 가세요! ☔`,
    });
  } catch (err) {
    if (err && err.code === '23505') {
      // 어느 unique index가 깨졌는지 별도 조회로 판별
      const { rows: byUmb } = await sql`
        SELECT 1 FROM rentals
        WHERE umbrella_number = ${umbrellaNumber} AND status = 'rented' LIMIT 1
      `;
      if (byUmb.length > 0) {
        return res.json({ ok: false, message: '이미 대여 중인 우산입니다.' });
      }
      const { rows: byStu } = await sql`
        SELECT umbrella_number FROM rentals
        WHERE student_id = ${studentId} AND status = 'rented' LIMIT 1
      `;
      if (byStu.length > 0) {
        return res.json({
          ok: false,
          message: `이미 대여 중인 우산(${byStu[0].umbrella_number}번)이 있습니다. 반납 후 이용해주세요.`,
        });
      }
    }
    console.error('rent error', err);
    return res.status(500).json({ ok: false, message: '오류가 발생했습니다.' });
  }
}
