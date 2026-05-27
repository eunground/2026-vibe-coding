# Tasks

> 이 변경은 working tree에 **이미 구현 완료**된 동작을 소급 기록한 것이다. 아래 항목은 현재 코드에서 충족된 상태를 가리킨다(파일·행 번호는 작성 시점 기준).

## 1. 마크업 (Index.html)

- [x] 1.1 관리자 탭 3개(`status`·`manage`·`history`)에 `admin-only` 클래스 부여 (Index.html 25–27)
- [x] 1.2 푸터에 관리자 진입 버튼 `#adminEntry` "관리자 로그인" 추가 (Index.html 138)

## 2. 가시성 스타일 (Stylesheet.html)

- [x] 2.1 `.tab.admin-only { display:none }` 기본 숨김 + `body.admin-on .tab.admin-only { display:block }` 노출 규칙 (Stylesheet.html 77–79)
- [x] 2.2 푸터 진입 링크 `.admin-entry` 절제된 스타일 + `body.admin-on .admin-entry { display:none }` (Stylesheet.html 274–280)

## 3. 상태 전환 로직 (JavaScript.html)

- [x] 3.1 푸터 진입 링크 클릭 → `showAdminLogin()` 바인딩 및 로그인 화면 표시 (JavaScript.html 56–64, 416)
- [x] 3.2 로그인 성공 시 `body.admin-on` 추가 + `status` 탭 이동 (`doLogin`, JavaScript.html 206–212)
- [x] 3.3 로그아웃 시 `body.admin-on` 제거 + `scan` 탭 복귀 + 비밀번호 제거 (`doLogout`, JavaScript.html 221–226)
- [x] 3.4 인증 실패 시 학생 모드 복귀 (`handleAuthFail`, JavaScript.html 397–402)
- [x] 3.5 관리자 탭 + 미로그인 조합에 대한 방어적 라우팅 유지 (`switchTab`, JavaScript.html 42–45)

## 4. 검증 (배포 후)

- [ ] 4.1 새 배포 버전 게시 후 미로그인 상태에서 `scan` 탭 1개 + 푸터 링크만 보이는지 확인
- [ ] 4.2 관리자 로그인 후 탭 4개 전부 노출 + 푸터 링크 숨김 확인
- [ ] 4.3 로그아웃 시 탭이 다시 1개로 복귀하고 푸터 링크가 다시 보이는지 확인
- [ ] 4.4 유효 비밀번호 없이 관리자 함수 호출이 `{ok:false}`로 막히고 학생 모드로 복귀하는지 확인
