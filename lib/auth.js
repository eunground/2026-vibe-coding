// 단순 공유 비밀번호 인증. 학교 내부용 도구라 세션/토큰 없이 헤더 1회 체크.
// 클라이언트는 메모리에 보관한 비밀번호를 모든 관리자 호출의 `x-admin-password` 헤더로 전달.
//
// ⚠️ 비밀번호 변경 시: 이 파일에서 ADMIN_PASSWORD 값만 수정 후 git push.
// repo가 private 임을 전제로 한 하드코딩입니다 — public 으로 바꾸지 마세요.
const ADMIN_PASSWORD = 'admin1234';

export function checkAdmin(req) {
  const got = req.headers['x-admin-password'];
  return typeof got === 'string' && got === ADMIN_PASSWORD;
}

export function requireAdmin(req, res) {
  if (checkAdmin(req)) return true;
  res.status(401).json({ ok: false, message: '인증에 실패했습니다.' });
  return false;
}
