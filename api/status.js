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
    const parsed = {};
    for (const k of ['DATABASE_URL', 'POSTGRES_URL', 'PRISMA_DATABASE_URL']) {
      const raw = process.env[k];
      if (!raw) { parsed[k] = null; continue; }
      try {
        const u = new URL(raw);
        parsed[k] = {
          protocol: u.protocol,
          host: u.host,
          pathname: u.pathname,
          searchParams: Object.fromEntries(u.searchParams),
          totalLen: raw.length,
        };
      } catch (e) {
        parsed[k] = { parseError: e.message, totalLen: raw.length, head: raw.slice(0, 50) };
      }
    }
    return res.status(500).json({
      ok: false,
      message: '오류가 발생했습니다.',
      _debug: {
        errMessage: err && err.message,
        urls: parsed,
      },
    });
  }
}
