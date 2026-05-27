## Context

앱은 단일 페이지(GAS `HtmlService`)에 4개 탭(`scan`/`status`/`manage`/`history`)을 가진다. GAS에는 서버 세션이 없어 관리자 인증은 스테이트리스다 — `adminLogin(pw)`이 `ADMIN_PASSWORD`와 비교만 하고, 클라이언트가 비밀번호를 메모리(`adminPassword`)에 두고 매 관리자 호출에 인자로 넘긴다. 서버는 `checkAdmin_`로 매번 재검증한다.

기존에는 탭 4개가 항상 노출되어, 학생도 관리자 탭을 보고 누를 수 있었다(누르면 로그인 게이트가 막음). 이 디자인은 **클라이언트 가시성 레이어**에서 학생/관리자 화면을 분리하는 방법을 정한다. 보안 경계는 여전히 서버 검증이다.

## Goals / Non-Goals

**Goals:**
- 미로그인 학생에게는 `scan` 탭 하나만 노출, 관리자 진입은 절제된 푸터 링크 한 곳으로 한정.
- 로그인/로그아웃에 따라 관리자 탭 가시성을 한 곳(상태 클래스)에서 일관되게 전환.
- 서버 인증 계약과 데이터 흐름은 무변경 — 순수 프런트엔드 UX 분리.

**Non-Goals:**
- 탭 숨김을 보안 경계로 삼지 않는다(권한 강제는 `checkAdmin_`가 계속 담당).
- 학생/관리자용 URL·페이지 물리 분리는 하지 않는다(단일 페이지 유지).
- 헤더 히어로화, 하단 탭바 등 추가 UI 개편은 범위 밖(별도 변경).

## Decisions

**1) CSS 상태 클래스(`body.admin-on`) + `.tab.admin-only`로 가시성 제어.**
관리자 탭에 `admin-only` 클래스를 부여하고 기본 `display:none`, `body.admin-on` 하위에서만 노출한다. 로그인/로그아웃 시 JS는 `body` 클래스 하나만 토글하면 되어 가시성 로직이 한 곳에 모인다.
- *대안*: 각 탭 버튼을 JS로 개별 `style.display` 제어 → 진입점이 여러 곳으로 흩어지고 상태 불일치 위험. 기각.
- *대안*: `data-admin="true"` 속성 + JS 토글(초기 PROPOSAL.md 안) → 속성 셀렉터로도 가능하지만 가시성은 CSS 한 줄로 충분하고, 클래스 방식이 `body.admin-on`과 결이 맞음. 클래스 방식 채택.

**2) 관리자 진입점은 푸터의 `btn-text`/underline 링크 단일화.**
탭바가 아닌 푸터에 절제된 "관리자 로그인" 링크를 둔다(DESIGN.md §1-4, §6 버튼 계층의 "최소 노출 동작"). 로그인 후에는 `body.admin-on .admin-entry { display:none }`로 숨긴다(로그아웃은 관리자 바에서 수행).

**3) 방어적 라우팅 유지.**
`switchTab`은 관리자 탭 + 미로그인 조합을 만나면 로그인 화면으로 보낸다. 탭이 숨겨져 있어 평소엔 도달 불가하지만, 직접 호출/엣지 케이스 대비 방어선으로 남긴다.

## Risks / Trade-offs

- **[탭 숨김을 보안으로 오인]** → 가시성은 UX일 뿐. 모든 관리자 서버 함수는 `checkAdmin_(password)`로 재검증하고 실패 시 `{ok:false}` 반환, 클라이언트는 `handleAuthFail`로 학생 모드 복귀. 이 계약을 깨지 않는다.
- **[숨긴 탭이 flex 레이아웃을 깨뜨림]** → `display:none`이면 flex 흐름에서 자동 제외되어 `.tabs` 레이아웃 정상. 로그인 후 노출 시 `display:block`으로 복귀.
- **[로그아웃/인증 실패 시 상태 잔존]** → `doLogout`·`handleAuthFail` 양쪽 모두 `adminPassword=''` + `body.admin-on` 제거 + `switchTab('scan')`를 반드시 함께 수행해 상태를 일관되게 되돌린다.

## Migration Plan

GAS Web App이므로 코드 변경 후 *새 배포 버전*이 있어야 `/exec`에 반영된다. 본 변경은 working tree에 이미 구현돼 있어 추가 코드 작업은 없고, 배포 검증(미로그인 1탭 → 로그인 4탭 → 로그아웃 1탭)만 수행하면 된다. 롤백은 직전 배포 버전으로 되돌리면 된다.
