// 단순 공유 비밀번호 인증. 학교 내부용 도구라 세션/토큰 없이 헤더 1회 체크.
// 클라이언트는 메모리에 보관한 비밀번호를 모든 관리자 호출의 `x-admin-password` 헤더로 전달.

export function checkAdmin(req) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const got = req.headers['x-admin-password'];
  return typeof got === 'string' && got === expected;
}

export function requireAdmin(req, res) {
  if (checkAdmin(req)) return true;
  res.status(401).json({ ok: false, message: '인증에 실패했습니다.' });
  return false;
}
