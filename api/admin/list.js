import { sql } from '../../lib/db.js';
import { requireAdmin } from '../../lib/auth.js';
import { formatDate, deriveStatus, getBaseUrl } from '../../lib/utils.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }
  if (!requireAdmin(req, res)) return;

  try {
    // umbrellas LEFT JOIN active rental — 활성 대여가 없으면 NULL
    const { rows } = await sql`
      SELECT u.number, u.name, u.registered_at, r.rented_at
        FROM umbrellas u
        LEFT JOIN LATERAL (
          SELECT rented_at FROM rentals
           WHERE umbrella_number = u.number AND status = 'rented'
           LIMIT 1
        ) r ON true
       ORDER BY u.number ASC
    `;

    const baseUrl = getBaseUrl(req);
    const list = rows.map((r) => {
      const status = deriveStatus(r.rented_at ? { rented_at: r.rented_at } : null);
      const link = baseUrl ? `${baseUrl}/?umbrella=${encodeURIComponent(r.number)}` : '';
      const qrUrl = link
        ? `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&data=${encodeURIComponent(link)}`
        : '';
      return {
        umbrellaNumber: r.number,
        umbrellaName: r.name,
        regDate: formatDate(r.registered_at),
        status,
        link,
        qrUrl,
      };
    });

    return res.json({ ok: true, list, baseUrl });
  } catch (err) {
    console.error('list error', err);
    return res.status(500).json({ ok: false, message: '오류가 발생했습니다.' });
  }
}
