import { checkAdmin } from '../../lib/auth.js';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }
  return res.json({ ok: checkAdmin(req) });
}
