import { sql } from '../lib/db.js';
import { formatDate, hoursSince, deriveStatus, maskName } from '../lib/utils.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const umbrellaNumber = String(req.query.umbrella || '').trim();
  if (!umbrellaNumber) {
    return res.status(400).json({ ok: false, message: '우산 번호를 입력해주세요.' });
  }

  try {
    const { rows: umb } = await sql`
      SELECT number, name FROM umbrellas WHERE number = ${umbrellaNumber}
    `;
    if (umb.length === 0) {
      return res.json({ ok: true, registered: false, umbrellaNumber });
    }

    const { rows: active } = await sql`
      SELECT student_name, rented_at FROM rentals
      WHERE umbrella_number = ${umbrellaNumber} AND status = 'rented'
      LIMIT 1
    `;

    if (active.length === 0) {
      return res.json({
        ok: true,
        registered: true,
        umbrellaNumber,
        umbrellaName: umb[0].name,
        status: 'available',
      });
    }

    const rental = active[0];
    return res.json({
      ok: true,
      registered: true,
      umbrellaNumber,
      umbrellaName: umb[0].name,
      status: deriveStatus(rental),
      hours: hoursSince(rental.rented_at),
      renter: {
        name: maskName(rental.student_name),
        rentTime: formatDate(rental.rented_at),
      },
    });
  } catch (err) {
    console.error('status error', err);
    // DEBUG: 실제 에러 메시지 노출 (확인 후 원복 예정)
    return res.status(500).json({
      ok: false,
      message: '오류가 발생했습니다.',
      _debug: {
        name: err && err.name,
        code: err && err.code,
        message: err && err.message,
        hasPostgresUrl: !!process.env.POSTGRES_URL,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        envKeys: Object.keys(process.env).filter(k => /POSTGRES|DATABASE|NEON/i.test(k)),
      },
    });
  }
}
